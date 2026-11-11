import os
from datetime import datetime
from io import BytesIO
from logging import getLogger
from typing import Any

import pandas as pd  # pyright: ignore[reportMissingTypeStubs]
from jinja2 import Environment, FileSystemLoader, TemplateNotFound
from sqlalchemy import sql
from sqlalchemy.orm import Session
from weasyprint import CSS, HTML  # pyright: ignore[reportMissingTypeStubs]

from alma.models.report import (
    ParamType,
    Report,
    ReportContext,
    ReportExportFormat,
    ReportParam,
)
from alma.settings import settings

logger = getLogger(__name__)


def format_thousands(value: Any) -> str:
    return f"{int(value):,}".replace(",", "'")


def create_report_environment(template_dir: str) -> Environment:
    env = Environment(loader=FileSystemLoader(template_dir), autoescape=True)
    env.filters["format_thousands"] = format_thousands  # pyright: ignore[reportUnknownMemberType]
    # Internal service URLs used by map templates (screenshot of the vflz map).
    env.globals["screenshot_service_url"] = str(  # pyright: ignore[reportUnknownMemberType]
        settings.monitoring_settings.screenshot_service_url
    ).rstrip("/")
    env.globals["screenshot_target_url"] = str(  # pyright: ignore[reportUnknownMemberType]
        settings.monitoring_settings.screenshot_target_url
    ).rstrip("/")
    return env


def get_data(
    session: Session, report: Report, params: dict[str, Any]
) -> dict[str, Any]:
    query_data: dict[str, Any] = {}
    for query in [q for q in report.queries if not q.is_translation_query]:
        logger.warning("Executing report query: %s", query.name)
        query_data[query.name] = [
            dict(row)
            for row in session.execute(sql.text(query.query), params=params)
            .mappings()
            .all()
        ]

    translation_data: dict[str, str] = {}
    for query in [q for q in report.queries if q.is_translation_query]:
        translation_data.update(
            {
                row["msgid"]: row["msgstr"]
                for row in session.execute(sql.text(query.query), params=params)
                .mappings()
                .all()
            }
        )

    query_data.update({"translations": translation_data})
    query_data["query_params"] = [params]
    return query_data


def render_report(
    session: Session, report: Report, language: str, params: dict[str, Any]
) -> bytes | None:
    template_dir = settings.templates_base_dir
    report_bytes: bytes | None = None
    match (report.context, report.export_format):
        case (ReportContext.STANDORT, ReportExportFormat.PDF):
            env = create_report_environment(template_dir)
            try:
                template = env.get_template(report.template)
            except TemplateNotFound:
                logger.warning(
                    "Template %s not found in %s, trying fallback language directory %s",
                    report.template,
                    template_dir,
                    os.path.join(template_dir, language),
                )
                template_dir = os.path.join(template_dir, language)

                env = create_report_environment(template_dir)
                template = env.get_template(report.template)

            rendered_html = template.render(**get_data(session, report, params))

            report_bytes = HTML(  # type: ignore
                string=rendered_html, base_url=os.path.join(template_dir, "elements")
            ).write_pdf(
                stylesheets=[
                    CSS(
                        filename=os.path.join(
                            settings.templates_base_dir, "styles", report.style
                        )
                    )
                ]
            )
        case (ReportContext.DASHBOARD, ReportExportFormat.XLSX):
            template_path = os.path.join(template_dir, report.template)
            report_byte_stream = BytesIO()

            # we create a in-memory copy of the template file
            with open(template_path, "rb") as f:
                report_byte_stream.write(f.read())
            report_byte_stream.seek(0)

            # Lots of errors of pyright are ignored.
            # The documentation is in contrast to the provided types in the stubs.
            # However, we sticked to the type annotations in the documentation.
            with pd.ExcelWriter(
                report_byte_stream,
                mode="a",
                if_sheet_exists="replace",
                engine="openpyxl",
            ) as excel_writer:  # type: ignore[reportUnknownVariableType]
                for query in report.queries:
                    assert query.worksheet_name
                    data = pd.read_sql_query(  # type: ignore[reportUnknownMemberType]
                        sql.text(query.query), session.connection(), params=params
                    )
                    data.to_excel(  # type: ignore[reportUnknownMemberType]
                        excel_writer, sheet_name=query.worksheet_name, index=False
                    )
            report_bytes = report_byte_stream.getvalue()
        case _:
            raise NotImplementedError(
                f"Combination ({report.context}, {report.export_format}) not supported."
            )
    return report_bytes


def convert_param(value: str, report_param: ReportParam) -> Any:
    match report_param.type:
        case ParamType.INTEGER:
            return int(value)
        case ParamType.BOOL:
            return value.lower() == "true"
        case ParamType.TEXT:
            return str(value)
        case ParamType.DATE:
            return datetime.fromisoformat(value)
