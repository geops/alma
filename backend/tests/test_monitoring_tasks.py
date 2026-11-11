from unittest.mock import patch

import httpx2
import pytest
from freezegun import freeze_time
from psycopg2 import ProgrammingError
from pydantic import HttpUrl
from sqlalchemy import exc, select, sql
from utils import make_report, make_saved_search, make_user, make_vflz

from alma import wfs_cache
from alma.constants import Language
from alma.healthchecks import (
    graphql_health_check,
    height_api_health_check,
    internal_wfs_health_check,
    keycloak_health_check,
    report_health_check,
    screenshot_health_check,
    search_export_health_check,
)
from alma.models.report import ReportContext
from alma.models.search import Search, SearchExport
from alma.models.task_status import TaskCategory, TaskStatus, TaskStatusEnum
from alma.search.export import ExportFormat
from alma.settings import settings
from alma.task_queue.schedules import update_all_reports, update_bafu_export
from alma.tools.pull_gemeinden import main as pull_gemeinden

pytestmark = [
    # Fixture required by all tests in this module
    pytest.mark.usefixtures("generate_codes"),
]


@freeze_time("2021-02-02")
def test_height_api_error_updates_task_status(session, test_settings, httpx2_mock):
    settings.height_api = HttpUrl("https://api3.geo.admin.ch/rest/services/height")
    assert not session.scalars(
        select(TaskStatus).where(TaskStatus.name == "height_api")
    ).one_or_none()

    httpx2_mock.add_response(
        url=f"{settings.height_api}?easting=2600000&northing=1200000", status_code=404
    )
    with pytest.raises(httpx2.HTTPStatusError):
        height_api_health_check(session)

    task_status = session.scalars(
        select(TaskStatus).where(TaskStatus.name == "height_api")
    ).one_or_none()
    assert task_status.category == TaskCategory.APPLICATION
    assert task_status.detail.startswith("Client error '404 Not Found'")
    assert task_status.status == TaskStatusEnum.ERROR
    assert task_status.last_update.isoformat() == "2021-02-02T00:00:00+00:00"
    settings.height_api = None


@freeze_time("2021-02-02")
def test_graphql_raises_error(session, httpx2_mock):
    httpx2_mock.add_response(json={"errors": [{"message": "an error occurred"}]})

    with pytest.raises(RuntimeError):
        graphql_health_check(session)

    task_status = session.scalars(
        select(TaskStatus).where(TaskStatus.name == "graphql")
    ).one_or_none()
    assert task_status.category == TaskCategory.APPLICATION
    assert task_status.detail == "an error occurred"
    assert task_status.status == TaskStatusEnum.ERROR
    assert task_status.last_update.isoformat() == "2021-02-02T00:00:00+00:00"


@freeze_time("2021-02-02")
def test_graphql_does_not_return_any_ids(session, httpx2_mock):
    httpx2_mock.add_response(json={"data": {"latestVflz": []}})

    with pytest.raises(RuntimeError):
        graphql_health_check(session)

    task_status = session.scalars(
        select(TaskStatus).where(TaskStatus.name == "graphql")
    ).one_or_none()
    assert task_status.category == TaskCategory.APPLICATION
    assert task_status.detail == "No Vflz could be found."
    assert task_status.status == TaskStatusEnum.ERROR
    assert task_status.last_update.isoformat() == "2021-02-02T00:00:00+00:00"


@freeze_time("2021-02-02")
def test_screenshot_health_check(session, httpx2_mock):
    make_vflz(session, "My Site")
    httpx2_mock.add_response(status_code=404)

    with pytest.raises(httpx2.HTTPStatusError):
        screenshot_health_check(session)

    task_status = session.scalars(
        select(TaskStatus).where(TaskStatus.name == "screenshot")
    ).one_or_none()
    assert task_status.category == TaskCategory.APPLICATION
    assert task_status.detail.startswith("Client error '404 Not Found'")
    assert task_status.status == TaskStatusEnum.ERROR
    assert task_status.last_update.isoformat() == "2021-02-02T00:00:00+00:00"


def test_wfs_refresh(session, test_settings, monkeypatch):
    settings.wfs_config = {"my-dummy-wfs": None}  # type: ignore

    def raise_error(session, wfs_service_name):
        raise ValueError("Dummy value error")

    monkeypatch.setattr(wfs_cache, "refresh_wfs", raise_error)

    with pytest.raises(ValueError):
        wfs_cache.refresh_all(session)

    task_status = session.scalars(
        select(TaskStatus).where(TaskStatus.name == "wfs_cache_my-dummy-wfs")
    ).one_or_none()
    assert task_status.status == TaskStatusEnum.ERROR
    assert task_status.detail == "Dummy value error"
    settings.load_wfs_config()


def test_pull_gemeinde_service(session, test_settings):
    settings.database.url = "i do not exist"

    with pytest.raises(ProgrammingError):
        pull_gemeinden()

    task_status = session.scalars(
        select(TaskStatus).where(TaskStatus.name == "gemeinde_service")
    ).one_or_none()
    assert task_status.status == TaskStatusEnum.ERROR
    assert task_status.detail.startswith("invalid dsn")
    settings.database.url = settings.database.test_url


def test_report_health_check(session, httpx2_mock, test_settings):
    settings.monitoring_settings.api_key = (
        "monitoring-api-key"  # checkov:skip=CKV_SECRET_4 ignore credentials
    )

    make_report(session, ReportContext.STANDORT)
    make_vflz(session, "My Site")

    assert not session.scalars(
        select(TaskStatus).where(TaskStatus.name == "reports")
    ).one_or_none()

    httpx2_mock.add_response(status_code=404)

    with pytest.raises(httpx2.HTTPStatusError):
        report_health_check(session)

    task_status = session.scalars(
        select(TaskStatus).where(TaskStatus.name == "reports")
    ).one()
    assert task_status.status == TaskStatusEnum.ERROR
    assert task_status.detail.startswith("Client error '404 Not Found'")
    settings.monitoring_settings.api_key = None


def test_update_bafu_export(session, test_settings, monkeypatch):
    def raise_error(stmt):
        raise ValueError("an error occurred")

    monkeypatch.setattr(sql, "text", raise_error)

    with pytest.raises(ValueError):
        update_bafu_export(0)

    task_status = session.scalars(
        select(TaskStatus).where(TaskStatus.name == "update_bafu_export")
    ).one()
    assert task_status.status == TaskStatusEnum.ERROR
    assert task_status.detail == "an error occurred"


def test_internal_wfs_health_check(session, httpx2_mock):
    make_vflz(session, "My Site")
    httpx2_mock.add_response(status_code=404)

    with pytest.raises(httpx2.HTTPStatusError):
        internal_wfs_health_check(session)

    task_status = session.scalars(
        select(TaskStatus).where(TaskStatus.name == "internal_wfs")
    ).one_or_none()
    assert task_status.category == TaskCategory.APPLICATION
    assert task_status.detail.startswith("Client error '404 Not Found'")
    assert task_status.status == TaskStatusEnum.ERROR


@patch("time.sleep", return_value=None)
def test_search_export_took_longer_than_5_seconds(
    patched_time_sleep, session, tmp_path, httpx2_mock
):
    settings.monitoring_settings.nginx_service_url = HttpUrl("http://nginx")
    settings.search_export_path = str(tmp_path)

    httpx2_mock.add_response(json={"data": {"exportSearch": 3}})
    httpx2_mock.add_response(
        json={"data": {"searchExports": [{"status": "STARTED", "downloadUrl": ""}]}}
    )

    # Simulate DB entries and file created by a prior exportSearch mutation run
    user = make_user(session)
    search = make_saved_search(session, query=[], user=user, is_temporary=True)
    export = SearchExport(
        export_id="3",
        search=search,
        user=user,
        format=ExportFormat.EXCEL,
        lang=Language.DE,
    )
    session.add(export)

    # A pre-existing unrelated export that should survive the health check cleanup
    other_search = make_saved_search(
        session, query=[], user=user, name="other-search", is_temporary=True
    )
    other_export = SearchExport(
        export_id="99",
        search=other_search,
        user=user,
        format=ExportFormat.EXCEL,
        lang=Language.DE,
    )
    session.add(other_export)
    session.commit()

    export_dir = tmp_path / "3"
    export_dir.mkdir()
    (export_dir / "alma_search_test.xlsx").touch()

    assert (
        session.scalars(
            select(SearchExport).where(SearchExport.export_id == "3")
        ).one_or_none()
        is not None
    )
    assert (
        session.scalars(
            select(SearchExport).where(SearchExport.export_id == "99")
        ).one_or_none()
        is not None
    )
    assert (tmp_path / "3").exists()

    with pytest.raises(RuntimeError):
        search_export_health_check(session)

    assert (
        session.scalars(
            select(SearchExport).where(SearchExport.export_id == "3")
        ).one_or_none()
        is None
    )
    assert (
        session.scalars(
            select(Search).where(Search.search_id == search.search_id)
        ).one_or_none()
        is None
    )
    assert not (tmp_path / "3").exists()
    assert (
        session.scalars(
            select(SearchExport).where(SearchExport.export_id == "99")
        ).one_or_none()
        is not None
    )

    task_status = session.scalars(
        select(TaskStatus).where(TaskStatus.name == "search_export")
    ).one_or_none()
    assert task_status.category == TaskCategory.APPLICATION
    assert task_status.detail.startswith("Search export took longer than 7 seconds.")
    assert task_status.status == TaskStatusEnum.ERROR


@patch("time.sleep", return_value=None)
def test_search_export_with_successful_download_url_returns_ok(
    patched_time_sleep, session, tmp_path, monkeypatch, httpx2_mock
):
    settings.monitoring_settings.nginx_service_url = HttpUrl("http://nginx")
    settings.search_export_path = str(tmp_path)
    download_path = "/api/exports/search/3"

    httpx2_mock.add_response(json={"data": {"exportSearch": 3}})
    httpx2_mock.add_response(
        json={
            "data": {
                "searchExports": [{"status": "SUCCESS", "downloadUrl": download_path}]
            }
        }
    )
    httpx2_mock.add_response(url="http://nginx/api/exports/search/3")

    # Simulate DB entries and file created by a prior exportSearch mutation run
    user = make_user(session)
    search = make_saved_search(session, query=[], user=user, is_temporary=True)
    export = SearchExport(
        export_id="3",
        search=search,
        user=user,
        format=ExportFormat.EXCEL,
        lang=Language.DE,
    )
    session.add(export)

    # A pre-existing unrelated export that should survive the health check cleanup
    other_search = make_saved_search(
        session, query=[], user=user, name="other-search", is_temporary=True
    )
    other_export = SearchExport(
        export_id="99",
        search=other_search,
        user=user,
        format=ExportFormat.EXCEL,
        lang=Language.DE,
    )
    session.add(other_export)
    session.commit()

    export_dir = tmp_path / "3"
    export_dir.mkdir()
    (export_dir / "alma_search_test.xlsx").touch()

    assert (
        session.scalars(
            select(SearchExport).where(SearchExport.export_id == "3")
        ).one_or_none()
        is not None
    )
    assert (
        session.scalars(
            select(SearchExport).where(SearchExport.export_id == "99")
        ).one_or_none()
        is not None
    )
    assert (tmp_path / "3").exists()

    search_export_health_check(session)

    assert (
        session.scalars(
            select(SearchExport).where(SearchExport.export_id == "3")
        ).one_or_none()
        is None
    )
    assert (
        session.scalars(
            select(Search).where(Search.search_id == search.search_id)
        ).one_or_none()
        is None
    )
    assert not (tmp_path / "3").exists()
    assert (
        session.scalars(
            select(SearchExport).where(SearchExport.export_id == "99")
        ).one_or_none()
        is not None
    )

    task_status = session.scalars(
        select(TaskStatus).where(TaskStatus.name == "search_export")
    ).one_or_none()
    assert task_status.category == TaskCategory.APPLICATION
    assert task_status.status == TaskStatusEnum.OK


@freeze_time("2021-02-02")
@pytest.mark.parametrize(
    "base_url",
    # plaintext (default) and TLS mode (ALTLAGA-10)
    ["http://keycloak:8080/auth", "https://keycloak:8443/auth"],
)
def test_keycloak_raises_error(session, httpx2_mock, monkeypatch, base_url):
    monkeypatch.setattr(settings.oidc, "base_url", base_url)
    httpx2_mock.add_response(method="POST", json={"access_token": "dummy-token"})
    httpx2_mock.add_response(
        method="GET", url=f"{base_url}/admin/realms", status_code=404
    )

    with pytest.raises(httpx2.HTTPStatusError):
        keycloak_health_check(session)

    task_status = session.scalars(
        select(TaskStatus).where(TaskStatus.name == "keycloak")
    ).one_or_none()
    assert task_status.category == TaskCategory.APPLICATION
    assert task_status.detail.startswith("Client error '404 Not Found'")
    assert task_status.status == TaskStatusEnum.ERROR
    assert task_status.last_update.isoformat() == "2021-02-02T00:00:00+00:00"


@freeze_time("2021-02-02")
def test_update_all_reports(session, test_settings):
    settings.report_export_settings.report_id = 1

    with pytest.raises(exc.NoResultFound):
        update_all_reports(0)

    task_status = session.scalars(
        select(TaskStatus).where(TaskStatus.name == "update_all_reports")
    ).one()

    assert task_status.category == TaskCategory.EXPORT
    assert task_status.detail == "No row was found when one was required"
    assert task_status.status == TaskStatusEnum.ERROR
    assert task_status.last_update.isoformat() == "2021-02-02T00:00:00+00:00"
