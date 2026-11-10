import logging
import subprocess
import sys

from sqlalchemy import sql

from alma import wfs_cache
from alma.db import get_session
from alma.healthchecks import (
    geoportal_ne_v_health_check,
    graphql_health_check,
    height_api_health_check,
    internal_wfs_health_check,
    keycloak_health_check,
    report_health_check,
    screenshot_health_check,
    search_export_health_check,
)
from alma.models.task_status import TaskCategory
from alma.monitoring import monitor_task_status, send_task_status
from alma.settings import settings
from alma.task_queue.sync_with_wfs import (
    delete_dangling_grun,
    sync_gws_bereich_with_cache,
    sync_gws_zone_with_cache,
    update_grun_status,
)

from .app import app
from .tasks import update_all_reports

logger = logging.getLogger(__name__)


@app.task()
def debug(timestamp: int) -> None:
    logger.info("Running debug task")


@app.task(lock="update_wfs_cache")
def update_wfs_cache(timestamp: int) -> None:
    with get_session() as session:
        wfs_cache.refresh_all(session)


@app.task(lock="interlis_export")
def interlis_export(timestamp: int) -> None:
    call_args = ["--local", "--icinga"]
    if settings.interlis_export_settings and settings.interlis_export_settings.upload:
        call_args = ["--upload", "--icinga"]
    subprocess.check_call(
        [sys.executable, "-m", "alma.tools.interlis_export"] + call_args
    )


@app.task(lock="update_bafu_export")
def update_bafu_export(timestamp: int) -> None:
    with (
        get_session() as session,
        monitor_task_status(session, "update_bafu_export", TaskCategory.IMPORT),
    ):
        session.execute(sql.text("select alma_export.bafu_update_data();"))
        session.commit()


@app.task(lock="update_geportal")
def update_geoportal(timestamp: int) -> None:
    with (
        get_session() as session,
        monitor_task_status(session, "update_geoportal", TaskCategory.IMPORT),
    ):
        session.execute(sql.text("select alma_export.geoportal_fr_update_data()"))
        session.commit()


@app.task(lock="monitoring")
def monitoring(timestamp: int) -> None:
    with get_session() as session:
        send_task_status(session)


@app.task(lock="healthchecks")
def healthchecks(timestamp: int) -> None:
    with get_session() as session:
        screenshot_health_check(session)
        height_api_health_check(session)
        graphql_health_check(session)
        internal_wfs_health_check(session)
        search_export_health_check(session)
        keycloak_health_check(session)
        report_health_check(session)


@app.task(lock="sync_grun_wfs")
def sync_grun_wfs(timestamp: int) -> None:
    with get_session() as session:
        update_grun_status(session)
        delete_dangling_grun(session)
        session.commit()


@app.task(lock="sync_gws_zone_wfs")
def sync_gws_zone_wfs(timestamp: int) -> None:
    with get_session() as session:
        sync_gws_zone_with_cache(session)
        session.commit()


@app.task(lock="sync_gws_bereich_wfs")
def sync_gws_bereich_wfs(timestamp: int):
    with get_session() as session:
        sync_gws_bereich_with_cache(session)
        session.commit()


@app.task(lock="geoportal_healthchecks")
def geoportal_healthchecks(timestamp: int) -> None:
    with get_session() as session:
        geoportal_ne_v_health_check(session)
        session.commit()


TASKS = {
    "debug": debug,
    "update_wfs_cache": update_wfs_cache,
    "interlis_export": interlis_export,
    "update_bafu_export": update_bafu_export,
    "update_all_reports": update_all_reports,
    "update_geoportal": update_geoportal,
    "monitoring": monitoring,
    "healthchecks": healthchecks,
    "sync_grun_wfs": sync_grun_wfs,
    "sync_gws_bereich_wfs": sync_gws_bereich_wfs,
    "sync_gws_zone_wfs": sync_gws_zone_wfs,
    "geoportal_healthchecks": geoportal_healthchecks,
}

# Set up periodic tasks based on settings.
for scheduled_task in settings.scheduled_tasks:
    task = TASKS[scheduled_task.name]
    app.periodic(
        cron=scheduled_task.schedule,
        queue="cron",
    )(task)
