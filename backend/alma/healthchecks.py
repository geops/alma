import json
import logging
import time
from datetime import datetime
from typing import Any
from urllib.parse import urljoin

import httpx2
from sqlalchemy import select, sql
from sqlalchemy.orm import Session

from alma.keycloak import get_keycloak_client
from alma.models.report import Report
from alma.models.task_status import TaskCategory
from alma.models.vflz import Vflz
from alma.monitoring import monitor_task_status
from alma.search.export import SearchExport, delete_search_export
from alma.settings import settings

logger = logging.getLogger(__name__)


def height_api_health_check(session: Session):
    with monitor_task_status(session, "height_api", TaskCategory.APPLICATION):
        response = httpx2.get(
            f"{settings.height_api}?easting=2600000&northing=1200000", timeout=10
        )
        response.raise_for_status()


def graphql_health_check(session: Session):
    with monitor_task_status(session, "graphql", TaskCategory.APPLICATION):
        response = httpx2.post(
            url=str(settings.monitoring_settings.graphql_service_url),
            json={"query": "{ latestVflz { vflzId } }"},
            headers={"Authorization": settings.monitoring_settings.api_key or ""},
        )
        response.raise_for_status()

        result = json.loads(response.content)
        if errors := result.get("errors", None):
            raise RuntimeError(",".join([e["message"] for e in errors]))
        elif (data := result.get("data", None)) and len(data["latestVflz"]) == 0:
            raise RuntimeError("No Vflz could be found.")


def screenshot_health_check(session: Session):
    with monitor_task_status(session, "screenshot", TaskCategory.APPLICATION):
        first_vflz = session.scalars(
            select(Vflz).order_by(Vflz.vflz_id).limit(1)
        ).one_or_none()
        if not first_vflz:
            return
        screenshot_url = urljoin(
            str(settings.monitoring_settings.nginx_service_url),
            f"/vflz/{first_vflz.vflz_id}/",
        )
        url = urljoin(
            str(settings.monitoring_settings.screenshot_service_url),
            f"/screenshot?selector=%23rendercomplete&width=1000&height=1000&wait_for_timeout=30000&url={screenshot_url}",
        )
        response = httpx2.get(url, timeout=22.0)
        response.raise_for_status()


def report_health_check(session: Session):
    with monitor_task_status(session, "reports", TaskCategory.APPLICATION):
        report_configuration = session.scalars(
            select(Report).order_by(Report.report_id).limit(1)
        ).one_or_none()
        vflz = session.scalars(
            select(Vflz).order_by(Vflz.vflz_id).limit(1)
        ).one_or_none()
        if not report_configuration or not vflz:
            return

        url = urljoin(
            str(settings.monitoring_settings.nginx_service_url),
            f"/api/report/{report_configuration.report_id}?language=de&vflz_id={vflz.vflz_id}&date={datetime.now().isoformat()}",
        )
        response = httpx2.get(
            url,
            headers={"Authorization": settings.monitoring_settings.api_key or ""},
            timeout=22.0,
        )
        response.raise_for_status()


def internal_wfs_health_check(session: Session):
    with monitor_task_status(session, "internal_wfs", TaskCategory.APPLICATION):
        vflz = session.scalars(
            select(Vflz).order_by(Vflz.vflz_id).limit(1)
        ).one_or_none()
        if not vflz:
            return

        url = urljoin(
            str(settings.monitoring_settings.nginx_service_url),
            f"/vflz/{vflz.vflz_id}/map?layers=parzellen&baselayer=aerial",
        )
        response = httpx2.get(
            url, headers={"Authorization": settings.monitoring_settings.api_key or ""}
        )
        response.raise_for_status()


def search_export_health_check(session: Session):
    with monitor_task_status(session, "search_export", TaskCategory.APPLICATION):
        mutation = """
        mutation m($data: ExportSearchInput!) {
            exportSearch(data: $data)
        }
        """
        variables: dict[str, dict[str, Any]] = {
            "data": {
                "query": settings.monitoring_settings.search_export_query,
                "fields": "VFLZ_ID",
                "sortBy": [],
                "format": "EXCEL",
                "lang": "DE",
            }
        }
        export_search_id: str | None = None
        try:
            response = httpx2.post(
                url=str(settings.monitoring_settings.graphql_service_url),
                json={"operationName": "m", "query": mutation, "variables": variables},
                headers={"Authorization": settings.monitoring_settings.api_key or ""},
            )
            response.raise_for_status()

            result = json.loads(response.content)
            export_search_id = str(result["data"]["exportSearch"])

            time.sleep(7)

            query = """
            query q($searchExportID: ID!) {
                searchExports(exportId: $searchExportID) {
                    status
                    downloadUrl
                }
            }
            """

            response = httpx2.post(
                url=str(settings.monitoring_settings.graphql_service_url),
                json={
                    "operationName": "q",
                    "query": query,
                    "variables": {"searchExportID": export_search_id},
                },
                headers={"Authorization": settings.monitoring_settings.api_key or ""},
            )
            result = json.loads(response.content)

            if errors := result.get("errors", None):
                raise RuntimeError(",".join([e["message"] for e in errors]))
            elif (data := result.get("data", None)) and len(data["searchExports"]) == 0:
                raise RuntimeError("No search export could be found.")
            if (status := result["data"]["searchExports"][0]["status"]) and (
                status != "SUCCESS"
            ):
                raise RuntimeError(
                    f"Search export took longer than 7 seconds. Current Status is {status}"
                )

            download_url = result["data"]["searchExports"][0]["downloadUrl"]
            response = httpx2.get(
                url=urljoin(
                    str(settings.monitoring_settings.nginx_service_url), download_url
                ),
                headers={"Authorization": settings.monitoring_settings.api_key or ""},
            )
            response.raise_for_status()
        finally:
            if export_search_id is not None:
                try:
                    search_export = session.scalars(
                        select(SearchExport).where(
                            SearchExport.export_id == export_search_id
                        )
                    ).one_or_none()
                    if search_export:
                        delete_search_export(session, search_export)
                        session.commit()
                except Exception:
                    session.rollback()
                    logger.exception(
                        "Failed to clean up monitoring search export %s",
                        export_search_id,
                    )
                    raise


def keycloak_health_check(session: Session):
    with (
        monitor_task_status(session, "keycloak", TaskCategory.APPLICATION),
        get_keycloak_client() as keycloak_client,
    ):
        response = keycloak_client.get(url="http://keycloak:8080/auth/admin/realms")
        response.raise_for_status()


def geoportal_ne_v_health_check(session: Session):
    with monitor_task_status(session, "geoportal_ne_v", TaskCategory.APPLICATION):
        set_geoportal_ro_role_query = sql.text("set role geoportal_ro;")
        set_alma_role_query = sql.text("set role alma;")
        query = sql.text("select * from alma_export.geoportal_ne_v;")
        session.execute(set_geoportal_ro_role_query)
        session.execute(query)
        session.execute(set_alma_role_query)
