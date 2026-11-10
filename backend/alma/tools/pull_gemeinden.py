#!/usr/bin/env python3
"""
Update h_gem and h_ort from a central WFS

Code is mainly copied from ALtlast4web with some adaptions to newer python version
and updated alma db schema.
"""

import psycopg2
from psycopg2.extensions import connection

from alma.db import get_session
from alma.models.auth import User  # type: ignore[reportUnusedImport]  # noqa: F401
from alma.models.subj import Subjekt  # type: ignore[reportUnusedImport]  # noqa: F401
from alma.models.task_status import TaskCategory
from alma.monitoring import monitor_task_status
from alma.settings import settings
from alma.tools.wfs import feature_iterator

SRID = 2056  # LV95


def main() -> None:
    kantone = (
        [k.upper() for k in settings.gemeinde_service.kantone]
        if settings.gemeinde_service.kantone
        else None
    )
    with (
        get_session() as session,
        monitor_task_status(session, "gemeinde_service", TaskCategory.IMPORT),
    ):
        conn: connection = psycopg2.connect(settings.database.url)
        assert conn
        conn.set_client_encoding("utf8")
        import_gemeinden(conn, kantone=kantone)
        import_orte(conn, kantone=kantone)
        session.commit()


def get_kanton_nummern(db: connection, kantone: list[str]) -> list[str]:
    cursor = db.cursor()
    sql = "select ktnr from alma._kantone where upper(gdekt) = any(%s)"
    cursor.execute(sql, (kantone,))
    rows = cursor.fetchall()
    cursor.close()
    if not rows:
        raise ValueError(f"Unknown kanton(s): {kantone}")
    kantone_nummern = [str(row[0]) for row in rows]
    if "" in kantone:
        kantone_nummern.append("")
    return kantone_nummern


def wfs_row_matches_kantone(
    row: dict[str, str], kanton_nummern: list[str] | None
) -> bool:
    return kanton_nummern is None or row["kanton_nummer"] in kanton_nummern


def import_gemeinden(db: connection, kantone: list[str] | None = None) -> None:
    kanton_nummern = get_kanton_nummern(db, kantone) if kantone is not None else None
    cursor = db.cursor()
    if kantone is not None:
        cursor.execute("delete from alma.h_gem")

    touched_h_gem_ids: list[int] = []
    for row in feature_iterator(
        settings.gemeinde_service.wfs_url,
        "ch_gemeinde",
        settings.gemeinde_service.proxy_url,
    ):
        if not wfs_row_matches_kantone(row, kanton_nummern):
            continue

        touched_h_gem_ids.append(int(row["bfs_nummer"]))
        if row["kanton_nummer"] == "":
            cursor.execute(
                """update alma.h_gem set
                    bfs_nummer = %(bfs_nummer)s,
                    h_gem_id = %(bfs_nummer)s,
                    gemeinde = %(name)s,
                    c_kanton = %(kanton_nummer)s
                    where h_gem_id=%(bfs_nummer)s""",
                row,
            )
        else:
            cursor.execute(
                """update alma.h_gem set
                        bfs_nummer = %(bfs_nummer)s,
                        h_gem_id = %(bfs_nummer)s,
                        gemeinde = %(name)s,
                        c_kanton = gdekt
                        from alma._kantone where ktnr =%(kanton_nummer)s::int
                        and %(kanton_nummer)s != ''
                        and h_gem_id=%(bfs_nummer)s""",
                row,
            )
        if cursor.rowcount < 1:
            if row["kanton_nummer"] == "":
                cursor.execute(
                    """insert into alma.h_gem (bfs_nummer, h_gem_id, gemeinde, c_kanton)
                    values (%(bfs_nummer)s::int, %(bfs_nummer)s::int, %(name)s, %(kanton_nummer)s)""",
                    row,
                )
            else:
                cursor.execute(
                    """insert into alma.h_gem (bfs_nummer, h_gem_id, gemeinde, c_kanton)
                    select %(bfs_nummer)s::int, %(bfs_nummer)s::int, %(name)s, gdekt
                    from alma._kantone where ktnr = %(kanton_nummer)s::int""",
                    row,
                )

        wkb = psycopg2.Binary(row["_geom_"].ExportToWkb())
        cursor.execute(
            "update alma.h_gem set wkb_geometry = st_transform(st_setsrid(ST_GeomFromEWKB(%s), %s), %s) where bfs_nummer=%s",
            (wkb, row["_srid_"], SRID, row["bfs_nummer"]),
        )
        if cursor.rowcount < 1:
            cursor.execute(
                "insert into alma.h_gem (h_gem_id, bfs_nummer, gemeinde, wkb_geometry) select %s, %s, %s, st_transform(st_setsrid(ST_GeomFromEWKB(%s), %s), %s)",
                (
                    row["bfs_nummer"],
                    row["bfs_nummer"],
                    row["name"],
                    wkb,
                    row["_srid_"],
                    SRID,
                ),
            )

    # remove entries which do not exist anymore
    if touched_h_gem_ids and kantone is None:
        cursor.execute(
            "delete from alma.h_gem where not (h_gem_id = any(%s::integer[]))",
            (touched_h_gem_ids,),
        )
        cursor.execute(
            "delete from alma.h_gem where not (bfs_nummer = any(%s::integer[]))",
            (touched_h_gem_ids,),
        )

    cursor.close()
    db.commit()


def import_orte(db: connection, kantone: list[str] | None = None) -> None:
    """download and import the orte and their plz. should run after import_gemeinden"""
    cursor = db.cursor()

    # purge the existing tables
    if kantone is None:
        cursor.execute("delete from alma.h_ort")
    else:
        cursor.execute(
            """delete from alma.h_ort ort
            where exists (
                select 1
                from alma.h_gem gem
                where gem.c_kanton = any(%s)
                and ST_Intersects(ort.wkb_geometry, gem.wkb_geometry)
            )""",
            (kantone,),
        )
    # cursor.execute("delete from alma.h_plz")

    for row in feature_iterator(
        settings.gemeinde_service.wfs_url,
        "ch_plz_ortschaft",
        settings.gemeinde_service.proxy_url,
    ):
        wkb = psycopg2.Binary(row["_geom_"].ExportToWkb())

        # update h_ort
        if kantone is None:
            cursor.execute(
                """insert into alma.h_ort
                                (h_ort_id, postleitzahl, ortsname, wkb_geometry)
                                select coalesce(max(h_ort_id)+1, 1), %s, %s,
                                    st_transform(st_setsrid(ST_GeomFromEWKB(%s), %s), %s)
                                from alma.h_ort""",
                (row["plz"], row["name"], wkb, row["_srid_"], SRID),
            )
        else:
            cursor.execute(
                """insert into alma.h_ort
                                (h_ort_id, postleitzahl, ortsname, wkb_geometry)
                                select next_id.h_ort_id, %s, %s,
                                    ort.wkb_geometry
                                from (
                                    select coalesce(max(h_ort_id)+1, 1) as h_ort_id
                                    from alma.h_ort
                                ) next_id
                                cross join (
                                    select st_transform(st_setsrid(ST_GeomFromEWKB(%s), %s), %s) as wkb_geometry
                                ) ort
                                where exists (
                                    select 1
                                    from alma.h_gem gem
                                    where gem.c_kanton = any(%s)
                                    and ST_Intersects(ort.wkb_geometry, gem.wkb_geometry)
                                )""",
                (row["plz"], row["name"], wkb, row["_srid_"], SRID, kantone),
            )

    cursor.close()
    db.commit()


if __name__ == "__main__":
    main()
