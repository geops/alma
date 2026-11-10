import argparse
import ftplib
import hashlib
import io
import logging
import os
import re
import shutil
import subprocess
import tempfile
import time
import zipfile
from functools import reduce
from logging import getLogger

import boto.s3
import psycopg2
from boto.s3.connection import OrdinaryCallingFormat
from boto.s3.key import Key
from psycopg2.extensions import connection

from alma.db import get_session
from alma.models.auth import User  # noqa: F401
from alma.models.subj import Subjekt  # noqa: F401
from alma.models.task_status import TaskCategory
from alma.monitoring import monitor_task_status
from alma.settings import settings

A4WROOTDIR = os.path.join(os.path.dirname(os.path.realpath(__file__)), "interlis")


XML_DECL = '<?xml version="1.0" encoding="UTF-8"?>'
RICSC_JAR = os.path.join(A4WROOTDIR, "ricsc.jar")
ILIVALIDATOR_JAR = os.path.join(A4WROOTDIR, "ilivalidator-latest.jar")
# How long to keep *_YYYYMMDD.md5.txt files created for each export, in seconds.
# Files older than this are deleted (only affects export to local directory).
MD5_TXT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

logger = getLogger(__name__)
logger.setLevel(logging.WARN)

logging.getLogger("boto").setLevel(logging.DEBUG)


def get_s3_connection():
    region = settings.interlis_export_settings.s3_region
    if "http_proxy" in os.environ or "https_proxy" in os.environ:
        return boto.s3.connect_to_region(
            region,
            aws_access_key_id=settings.interlis_export_settings.s3_key,
            aws_secret_access_key=settings.interlis_export_settings.s3_secretkey,
            calling_format=OrdinaryCallingFormat(),
            is_secure=False,  # only supports unencrypted proxy connections because of https://github.com/boto/boto/issues/3561
        )
    else:
        return boto.s3.connect_to_region(
            region,
            aws_access_key_id=settings.interlis_export_settings.s3_key,
            aws_secret_access_key=settings.interlis_export_settings.s3_secretkey,
            calling_format=OrdinaryCallingFormat(),
        )


class InvalidXmlError(Exception):
    pass


class CheckServiceError(Exception):
    pass


class IlivalidatorError(Exception):
    pass


class InvalidInterlisError(Exception):
    pass


def get_xml(conn, query):
    cur = conn.cursor()
    cur.execute("set client_encoding to 'utf8'")
    cur.execute(query)
    row = cur.fetchone()
    return format_xml(XML_DECL + row[0])


def format_xml(xmlstr):
    """format the given xml string if xmllint is installed"""
    try:
        p = subprocess.Popen(
            ["xmllint", "--format", "--nowarning", "-"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
        )
        p.stdin.write(xmlstr.encode("utf8"))
        (out, err) = p.communicate()
        if p.returncode != 0:
            raise InvalidXmlError(out)
        return out
    except (OSError, subprocess.CalledProcessError):
        # unable to format anything
        return xmlstr.encode("utf8")


def make_export_files(zip_contents, xtf_files):
    readme = make_zip_readme(zip_contents, filename="data.zip")
    export_files = {
        "data.zip": zip_contents,
        "readme.txt": readme,
    }
    for name, contents in xtf_files.items():
        md5sum = hashlib.md5(contents).hexdigest()
        filename = name + ".md5.txt"
        filename_with_date = name + "_" + time.strftime("%Y%m%d") + ".md5.txt"
        export_files[filename] = md5sum
        export_files[filename_with_date] = md5sum
    return export_files


def add_check_service_log(zip_contents, log_filename, log_contents):
    # Re-open zipfile and append check service log
    fh = io.BytesIO(zip_contents)
    zf = zipfile.ZipFile(fh, "a", zipfile.ZIP_DEFLATED)
    log_filename = os.path.basename(log_filename)
    assert log_filename not in zf.namelist()
    zf.writestr(log_filename, log_contents)
    zf.close()
    return fh.getvalue()


def upload_s3(export_files, directory):
    bucket = settings.interlis_export_settings.s3_bucket
    s3conn = get_s3_connection()
    for name, contents in sorted(export_files.items()):
        s3_upload(s3conn, bucket, os.path.join(directory, name), contents)


def upload_local(export_files, directory):
    if not os.path.exists(directory):
        os.makedirs(name=directory)
    for name, contents in sorted(export_files.items()):
        filename = os.path.join(directory, name)
        with open(filename, "wb") as f:
            if isinstance(contents, bytes):
                f.write(contents)
            else:
                f.write(contents.encode("utf8"))

    # Clean up old '*_YYYYMMDD.md5.txt.' files
    try:
        for entry in os.listdir(directory):
            path = os.path.join(directory, entry)
            if os.path.isfile(path) and re.search(r"_\d{8}.md5.txt$", entry):
                stat = os.stat(path)
                if time.time() - stat.st_mtime > MD5_TXT_MAX_AGE_SECONDS:
                    os.unlink(path)
    except Exception as e:
        msg = "Error cleaning old .md5.txt files: %s" % e
        print(msg)
        logger.warning(msg)


def export(
    export_type,
    upload=True,
    upload_to_ftp=True,
    local=False,
    local_ignore_errors=False,
    debug=False,
):
    export_type = export_type.lower()
    # new export_types must also be added in class InterlisExportSettings
    if export_type not in ["kbs_v1_5", "oereb_v2_0", "be", "vd", "lu", "so", "so_restricted"]:
        logger.error('Export type "%s" is not implemented.', export_type)

    query = getattr(settings.interlis_export_settings, f"{export_type}_query")
    name = getattr(settings.interlis_export_settings, f"{export_type}_name")
    include_dir = settings.interlis_export_settings.additional_files

    log_name = name.replace("/", ".")
    log_name = log_name + "_" + time.strftime("%Y%m%d") + ".log"

    include_dir = os.path.join(include_dir, export_type)
    if not include_dir:
        logger.error('Include directory "%s" does not exist.', include_dir)

    xtf_basename = name.replace("/", ".")
    xtf_files = get_xtf_files(xtf_basename, query, projs=None)
    zip_contents = make_zip_file(xtf_files, include_dir=include_dir)
    # Set full Tag <OeREBKRMtrsfr_V2_0.Transferstruktur.EigentumsbeschraenkungLegende>
    # (Not set iin SQL because of Byte limitation)
    for name, xtf in xtf_files.items():
        string = xtf
        xtf = string.replace(
            b"OeREBKRMtrsfr_V2_0.Transferstruktur.EigentumsbeschraenkungLegen>",
            b"OeREBKRMtrsfr_V2_0.Transferstruktur.EigentumsbeschraenkungLegende>",
        )
        string = xtf
        xtf = string.replace(b"model_bl", b"ch_bl_aue_kbs_intern_v1_0")
        if export_type == "so":
            string = xtf
            xtf = string.replace(b"model_so", b"SO_AFU_KbS_Publikation__20230104")
        if export_type == "so_restricted":
            string = xtf
            xtf = string.replace(
                b"model_so", b"SO_AFU_KbS_Publikation_restricted_20221209"
            )

        xtf_files.update({name: xtf})

    # Check for interlis errors before finalizing zip file
    export_has_errors = False

    if getattr(settings.interlis_export_settings, f"check_ilivalidator_{export_type}"):
        for name, xtf in xtf_files.items():
            retcode, log_contents = get_ilivalidator_errors(name, xtf)
            log_name = name + "_" + time.strftime("%Y%m%d") + ".log"
            zip_contents = add_check_service_log(zip_contents, log_name, log_contents)
            export_has_errors = retcode != 0

    else:
        msg = (
            "No INTERLIS validation method is configured "
            f"in the config file for the export type {export_type}. Set either "
            f'"check_service_{export_type}" or "check_ilivalidator_{export_type}" '
            "to avoid this warning."
        )
        logger.warning(msg)
        print(msg)

    export_files = make_export_files(zip_contents, xtf_files)

    if debug:
        export_debug_dir = os.path.join(
            settings.interlis_export_settings.debug_dir, export_type
        )
        if not os.path.exists(export_debug_dir):
            os.makedirs(name=export_debug_dir)
        upload_local(export_files, export_debug_dir)
        os.chmod(export_debug_dir, 755)
        logger.error("%s export saved to %s", export_type, export_debug_dir)

    if local_ignore_errors:
        directory = getattr(
            settings.interlis_export_settings, f"{export_type}_directory"
        )
        upload_local(export_files, directory)

    # Don't upload if there are Interlis errors
    if export_has_errors:
        raise InvalidInterlisError("INTERLIS check returned errors.")

    if upload:
        upload_s3(export_files, name)

    if upload_to_ftp and export_type == "geoig_v1_5":
        upload_ftp(xtf_files)

    if local:
        directory = getattr(
            settings.interlis_export_settings, f"{export_type}_directory"
        )
        upload_local(export_files, directory)


def get_xtf_files(basename, query, projs=None):
    db: connection = psycopg2.connect(settings.database.url)
    assert db
    xtf_files = {}
    xtf_files[basename] = get_xml(db, query)
    return xtf_files


def make_zip_file(xtf_files, include_dir=None):
    fh = io.BytesIO()
    zf = zipfile.ZipFile(fh, "w", zipfile.ZIP_DEFLATED)
    for name, xtf in xtf_files.items():
        string = xtf
        xtf = string.replace(
            b"OeREBKRMtrsfr_V2_0.Transferstruktur.EigentumsbeschraenkungLegen>",
            b"OeREBKRMtrsfr_V2_0.Transferstruktur.EigentumsbeschraenkungLegende>",
        )
        string = xtf
        xtf = string.replace(b"model_bl", b"ch_bl_aue_kbs_intern_v1_0")
        if name == b"SO_AFU_KbS_Publikation__20230104":
            string = xtf
            xtf = string.replace(b"model_so", b"SO_AFU_KbS_Publikation__20230104")
        if name == b"SO_AFU_KbS_Publikation_restricted_20221209":
            string = xtf
            xtf = string.replace(
                b"model_so", b"SO_AFU_KbS_Publikation_restricted_20221209"
            )

        xtf_files.update({name: xtf})
    for name, contents in sorted(xtf_files.items()):
        name = name + "_" + time.strftime("%Y%m%d")
        zf.writestr(name + ".xtf", contents)
        zf.writestr(name + ".md5.txt", hashlib.md5(contents).hexdigest())

    if include_dir and os.path.isdir(include_dir):
        include_dir = os.path.normpath(include_dir)
        prefix_len = len(include_dir) + 1
        for base, dirs, files in os.walk(include_dir):
            for f in files:
                filename = os.path.join(base, f)
                zf.write(filename, filename[prefix_len:])

    zf.close()
    return fh.getvalue()


def s3_upload(conn, bucket, path, contents):
    # do not validate, as this will fetch all key names of the bucket and we
    # do not have permissions for that. we may only access keys starting with ch.bav
    # this is what 2 hours of debugging look like
    bucket = conn.get_bucket(bucket, validate=False)
    key = Key(bucket)
    key.key = path

    ext = os.path.splitext(path)[1].lower()
    content_type = None
    if ext == ".zip":
        content_type = "application/zip"
    elif ext == ".txt":
        content_type = "text/plain"

    if content_type:
        key.metadata.update({"Content-Type": content_type})

    key.delete()  # remove old file
    key.set_contents_from_string(contents)


def upload_ftp(xtf_files):
    # get ftp details from config file
    server = settings.interlis_export_settings.ftp_lv95_ftp_server
    username = settings.interlis_export_settings.ftp_lv95_username
    password = settings.interlis_export_settings.ftp_lv95_password
    # start ftp session and upload lv95 xtf
    session = ftplib.FTP(server, username, password)
    for name, contents in sorted(xtf_files.items()):
        f = io.BytesIO()
        f.write(contents)
        f.seek(0)
        session.storbinary("STOR KBS_Aargau.xtf", f)
    session.quit()


def make_zip_readme(contents, filename):
    """create a readme listing the contents of the given zip file according to the output format
    of some random windows zip program"""
    compressed_size = len(contents)
    fh = io.BytesIO(contents)
    zf = zipfile.ZipFile(fh, "r")

    def formated_zi_date(zi_datetime):
        if zi_datetime and len(zi_datetime) == 6:
            return "{2:0>2}.{1:0>2}.{0:0>4} {3:0>2}:{4:0>2}:{5:0>2}".format(
                *zi_datetime
            )
        return ""

    def formated_zi_size(size):
        # python 2.7 would support the follwoing, but bav uses python 2.6
        # return "{0:0,d}".format(size)
        result = ""
        while size >= 1000:
            size, r = divmod(size, 1000)
            result = ",%03d%s" % (r, result)
        return "%d%s" % (size, result)

    # create the lines for the content list
    field_names = ("FILE NAME", "DATE", "PACKED SIZE", "SIZE", "PATH")
    field_spacing = 2
    entries = []
    size_decompressed = 0
    for zi in sorted(zf.infolist(), key=lambda x: x.orig_filename):
        if os.path.basename(zi.filename) != "":  # directories
            entries.append(
                (
                    os.path.basename(zi.filename),
                    formated_zi_date(zi.date_time),
                    formated_zi_size(zi.compress_size),
                    formated_zi_size(zi.file_size),
                    os.path.dirname(zi.filename),
                )
            )
        size_decompressed += zi.file_size

    # calculate field widths
    field_widths = len(field_names) * [
        0,
    ]
    for i in range(len(field_names)):
        field_widths[i] = len(field_names[i])
    for entry in entries:
        for i in range(len(entry)):
            if len(entry[i]) > field_widths[i]:
                field_widths[i] = len(entry[i])

    lines = []
    lines.append(
        f"Content of Archive: {filename}, Archive Size: {formated_zi_size(compressed_size)} Decompressed Size: {formated_zi_size(size_decompressed)} Total {len(entries)} Files."
    )
    lines.append("")

    spacer = "=" * reduce(lambda x, y: x + y + field_spacing, field_widths)
    lines.append(spacer)

    # build the format string for the rows
    format_string = ""
    for i in range(len(field_widths)):
        format_string += "{%d:<%d}" % (i, field_widths[i])
        if i < len(field_widths) + 1:
            format_string += " " * field_spacing

    lines.append(format_string.format(*field_names))
    lines.append(spacer)
    lines.append("")
    for entry in entries:
        lines.append(format_string.format(*entry))
    lines.append("")
    lines.append(spacer)
    lines.append("")

    lines.append("MD5Checksum:" + hashlib.md5(contents).hexdigest())

    # use windows linebreaks
    return "\r\n".join(lines)


def get_ilivalidator_errors(xtf_name, xtf_data):
    """Submit the contents of a xtf file to the ilivalidator jar binary.
    Return the exitcode and any errors found in a logfile.

    Returns a tuple (exitcode, log_content) of the result of the
    ilivalidator call.
    """
    tmpdir = tempfile.mkdtemp(prefix="ilivalidator_check.")
    java_dir = settings.interlis_export_settings.check_java
    xtf_path = os.path.join(tmpdir, "%s.xtf" % xtf_name)
    with open(xtf_path, "wb") as f:
        f.write(xtf_data)

    ilivalidator_cmd = [java_dir, "-jar", ILIVALIDATOR_JAR, xtf_path]
    p = subprocess.Popen(
        ilivalidator_cmd, cwd=tmpdir, stdout=subprocess.PIPE, stderr=subprocess.STDOUT
    )
    out, _ = p.communicate()

    shutil.rmtree(tmpdir)
    return p.returncode, out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-u",
        "--upload",
        default=False,
        action="store_true",
        help="Upload files to Amazon S3",
    )
    parser.add_argument(
        "-ftp",
        "--upload_ftp",
        default=False,
        action="store_true",
        help="Upload xtf for lv95 to ftp server",
    )
    parser.add_argument(
        "-l",
        "--local",
        default=False,
        action="store_true",
        help="Save files to local export directory",
    )
    parser.add_argument(
        "-li",
        "--local-ignore-errors",
        default=False,
        action="store_true",
        help="Save files to local export directory even if the interlis validation failed with errors",
    )
    parser.add_argument(
        "-d",
        "--debug",
        default=False,
        action="store_true",
        help="Save files to a temporary directory, even if they have errors",
    )
    parser.add_argument(
        "--icinga", default=False, action="store_true", help="Update icinga state"
    )
    args = parser.parse_args()

    interlist_exports = settings.interlis_export_settings.enabled_interlis_export_list

    with get_session() as session:
        for export_type in [et.strip() for et in interlist_exports.split(",")]:
            with monitor_task_status(
                session, f"interlis_{export_type}", TaskCategory.EXPORT
            ):
                try:
                    export(
                        export_type,
                        upload=args.upload,
                        upload_to_ftp=args.upload_ftp,
                        local=args.local,
                        local_ignore_errors=args.local_ignore_errors,
                        debug=args.debug,
                    )
                except Exception as error:
                    raise Exception(
                        "Error while using the interlis check service: " + str(error)
                    ) from error
                session.commit()


if __name__ == "__main__":
    main()
