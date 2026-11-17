import contextlib
import mimetypes
import os
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from logging import getLogger
from pathlib import Path
from typing import Annotated, Any, Literal
from urllib.parse import urlsplit, urlunsplit

from anyio import open_file
from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
)
from fastapi.responses import FileResponse
from httpx2 import AsyncClient
from preview_generator.exception import (  # pyright: ignore[reportMissingTypeStubs]
    BuilderDependencyNotFound,
    PreviewGeneratorException,
)
from preview_generator.manager import (  # pyright: ignore[reportMissingTypeStubs]
    PreviewManager,
)
from pydantic import UUID4, BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from alma.reports import convert_param, render_report
from alma.search.export import ExportFormat

from . import graphql, oidc
from .dependencies import get_http_client, get_preview_manager, get_session
from .models.auth import User
from .models.documents import Asset
from .models.report import Report, ReportExportFormat
from .models.search import SearchExport
from .settings import settings

if settings.sentry.dsn:
    from importlib.metadata import PackageNotFoundError, version

    import sentry_sdk
    from sentry_sdk.integrations.strawberry import StrawberryIntegration

    try:
        release = version("alma-backend")
    except PackageNotFoundError:
        release = None

    sentry_sdk.init(
        dsn=settings.sentry.dsn,
        environment=settings.sentry.environment,
        traces_sample_rate=settings.sentry.trace_sample_rate,
        release=release,
        integrations=[StrawberryIntegration(async_execution=True)],
    )

    if not release:
        sentry_sdk.capture_message("Sentry release not set")

logger = getLogger(__name__)


app = FastAPI()


@app.middleware("http")
async def no_cache_sensitive_responses(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """Prevent browsers and proxies from caching sensitive responses."""
    response = await call_next(request)
    if request.url.path == "/graphql":
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


oidc.init_app(app)
graphql.init_app(app)


class DocumentMetaData(BaseModel):
    file_size: int | None
    file_type: str
    title: str | None
    created_at: datetime | None
    modified_at: datetime | None


@app.get("/-/status")
def status() -> Literal[b"OK"]:
    """Return a simple 200 OK response to indicate that the service is up."""
    return b"OK"


@app.get("/", include_in_schema=False)
def root() -> Response:
    """Display a 200 OK with a simple HTML page at the root.

    The error message is intended for end-users looking at a misconfigured
    reverse proxy. It should not be exposed to the public.
    """
    return Response(
        content=(
            "<head><title>Alma Backend</title></head>"
            "<body><p>Something went wrong. That's all I know.</p></body>"
        ),
        media_type="text/html",
    )


# IMPORTANT: This endpoint must never be async!
# We use weasyprint for taking screenshots for the the reports which performs calls sync.
# This leads to a server block and the screenshot will never be taken.
@app.get("/api/report/{report_id}")
def report(
    report_id: int,
    language: str,
    request: Request,
    user: Annotated[User, Depends(oidc.get_current_user)],
    session: Annotated[Session, Depends(get_session)],
):
    report = session.get_one(Report, report_id)
    parsed_query_params: dict[str, Any] = {}
    for param in report.parameters:
        query_value = ""  # avoid unbound type linter error
        try:
            query_value = request.query_params[param.name]
            value = convert_param(query_value, param)
            parsed_query_params[param.name] = value

            if param.name == "language":
                parsed_query_params["language"] = convert_param(query_value, param)
        except ValueError:
            return HTTPException(
                status_code=400,
                detail={
                    "error": f"Could not convert parameter {param.name} with value {query_value} into type {param.type}."
                },
            )
        except KeyError:
            return HTTPException(
                status_code=400,
                detail={
                    "error": f"Parameter {param.name} is configured for this report, but not found in query parameters."
                },
            )

    match report.export_format:
        case ReportExportFormat.PDF:
            media_type = "application/pdf"
            extension = "pdf"
        case ReportExportFormat.XLSX:
            media_type = (
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            extension = "xlsx"

    return Response(
        render_report(session, report, language, parsed_query_params),
        media_type=media_type,
        headers={"Content-Disposition": f"inline; filename={report.title}.{extension}"},
    )


@app.post("/api/documents/")
async def upload_document(
    preview_manager: Annotated[PreviewManager, Depends(get_preview_manager)],
    user: Annotated[User, Depends(oidc.get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    file: Annotated[UploadFile, File()],
    title: Annotated[str | None, Form()],
    created_at: Annotated[datetime | None, Form()] = None,
    modified_at: Annotated[datetime | None, Form()] = None,
) -> Response:
    asset = Asset()

    def get_extension(filename: str):
        _, ext = os.path.splitext(filename)
        assert ext.startswith(".")
        return ext.lower()

    def get_path(filename: str | None, asset_uuid: uuid.UUID) -> str:
        ext = get_extension(filename) if filename else ""
        return f"{asset_uuid.hex}{ext}"

    asset_uuid = uuid.uuid4()
    asset.file_path = get_path(file.filename, asset_uuid)
    asset.uuid = asset_uuid
    absolute_asset_file_path = Path(settings.documents_path) / asset.file_path
    async with await open_file(str(absolute_asset_file_path), "wb") as f:
        await f.write(await file.read())

    # we use a4 as aspect ratio
    with contextlib.suppress(PreviewGeneratorException, BuilderDependencyNotFound):
        asset.preview_path = preview_manager.get_jpeg_preview(
            str(absolute_asset_file_path),
            page=0,
            width=450,
            height=int(450 * 1.4),
        )
    asset.file_size = file.size
    asset.file_type = (
        mimetypes.guess_type(file.filename)[0] or "" if file.filename else ""
    )
    asset.title = title if title else ""
    asset.original_file_name = file.filename if file.filename else ""
    asset.created_at = created_at if created_at else datetime.now(tz=UTC)
    asset.modified_at = modified_at if modified_at else datetime.now(tz=UTC)
    session.add(asset)
    session.commit()
    return Response(content=str(asset.uuid), media_type="application/text")


@app.get("/api/documents/{document_ref}/file")
async def download_document(
    document_ref: UUID4,
    session: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(oidc.get_current_user)],
) -> FileResponse:
    asset = session.scalars(
        select(Asset).where(Asset.uuid == document_ref)
    ).one_or_none()
    if not asset:
        raise HTTPException(
            status_code=404,
            detail={"error": f"Could not find document with ref {document_ref}"},
        )
    file_path = Path(settings.documents_path) / asset.file_path
    return FileResponse(str(file_path))


@app.get("/api/documents/{document_ref}/preview")
async def document_preview(
    document_ref: UUID4,
    session: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(oidc.get_current_user)],
) -> FileResponse:
    asset = session.scalars(
        select(Asset).where(Asset.uuid == document_ref)
    ).one_or_none()
    if not asset:
        raise HTTPException(
            status_code=404,
            detail={"error": f"Could not find document with ref {document_ref}"},
        )

    if asset.preview_path:
        return FileResponse(asset.preview_path)
    else:
        raise HTTPException(status_code=404, detail={"error": "preview does not exist"})


@app.get("/api/documents/{document_ref}")
async def get_document_metadata(
    document_ref: UUID4,
    session: Annotated[Session, Depends(get_session)],
    user: Annotated[User, Depends(oidc.get_current_user)],
) -> DocumentMetaData:
    asset = session.scalars(select(Asset).where(Asset.uuid == document_ref)).one()
    return DocumentMetaData(
        file_size=asset.file_size,
        file_type=asset.file_type,
        title=asset.title,
        created_at=asset.created_at,
        modified_at=asset.modified_at,
    )


@app.get("/api/exports/search/{export_id}")
async def download_search_export(
    export_id: str,
    user: Annotated[User, Depends(oidc.get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> FileResponse:
    export = session.scalars(
        select(SearchExport).where(
            SearchExport.user == user, SearchExport.export_id == export_id
        )
    ).one_or_none()
    if not export:
        raise HTTPException(status_code=404, detail="Export not found")
    if not (export.path and Path(export.path).exists()):
        raise HTTPException(status_code=404, detail="File not found")
    match ExportFormat(export.format):
        case ExportFormat.GEOPACKAGE:
            media_type = "application/geopackage+sqlite3"
        case ExportFormat.SHAPEFILE:
            media_type = "application/zip"
        case ExportFormat.EXCEL:
            media_type = (
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )

    filename = Path(export.path).name
    return FileResponse(export.path, media_type=media_type, filename=filename)


@app.get("/api/wfs_proxy/{service_name}")
async def wfs_proxy(
    service_name: str,
    user: Annotated[User, Depends(oidc.get_current_user)],
    request: Request,
    client: Annotated[AsyncClient, Depends(get_http_client)],
) -> Response:
    """
    Proxy request to an external WFS service.
    """
    service = settings.wfs_proxy.get(service_name)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not configured")

    service_url_parts = urlsplit(service.url)
    request_url_parts = urlsplit(str(request.url))

    request_url = urlunsplit(
        service_url_parts._replace(
            query="&".join([service_url_parts.query, request_url_parts.query])
        )
    )
    response = await client.get(request_url, headers=service.auth_headers)
    return Response(
        content=response.content,
        status_code=response.status_code,
        headers={"content-type": response.headers.get("content-type", "text/plain")},
    )
