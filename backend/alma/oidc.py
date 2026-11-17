# pyright: basic
import logging
from datetime import UTC, datetime
from json import dumps, loads
from secrets import compare_digest
from typing import Annotated, cast
from urllib.parse import parse_qsl, urlencode, urlparse

from anyio.to_thread import run_sync
from authlib.integrations.starlette_client import OAuth, OAuthError
from authlib.integrations.starlette_client.apps import (
    StarletteOAuth2App,
)
from authlib.oidc.core import UserInfo
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware
from typing_extensions import TypedDict

from .dependencies import get_session
from .models.auth import OIDCSession, User
from .models.subj import Subjekt
from .settings import settings

logger = logging.getLogger(__name__)

SESSION_COOKIE_NAME = "session"

oauth = OAuth()
auth_router = APIRouter()


class SessionUserinfo(TypedDict):
    sub: str


class SessionToken(TypedDict):
    refresh_token: str | None
    id_token: str
    expires_at: int
    userinfo: SessionUserinfo


class IsAuthenticatedResponse(TypedDict):
    is_authenticated: bool


def init_app(app: FastAPI) -> None:
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.secret_key,
        session_cookie=SESSION_COOKIE_NAME,
        max_age=None,
        https_only=True,  # set Secure flag (i.e. only accept localhost or https)
    )
    oauth.register(
        name="oidc",
        client_id=settings.oidc.client_id,
        client_secret=settings.oidc.client_secret,
        server_metadata_url=settings.oidc.keycloak_url(settings.oidc.config_path),
        client_kwargs={
            "scope": settings.oidc.scope,
        },
    )
    app.include_router(auth_router, tags=["auth"], prefix="/api/auth")


async def get_sso() -> StarletteOAuth2App:
    assert isinstance(oauth.oidc, StarletteOAuth2App)
    await oauth.oidc.load_server_metadata()
    return oauth.oidc


def _get_oidc_session(db: Session, request: Request) -> OIDCSession | None:
    if session_key := request.session.get("key"):
        return (
            db.query(OIDCSession)
            .filter(OIDCSession.session_key == session_key)
            .one_or_none()
        )
    return None


def _delete_oidc_session(db: Session, request: Request) -> None:
    if session := _get_oidc_session(db, request):
        db.delete(session)
        db.commit()
    request.session.clear()


async def _refresh_session(
    sso: StarletteOAuth2App, db: Session, request: Request, oidc_session: OIDCSession
) -> OIDCSession:
    # see https://docs.authlib.org/en/latest/client/httpx.html#auto-update-token
    # see also https://github.com/lepture/authlib/issues/548 and linked issues
    session_token = cast(SessionToken, loads(oidc_session.token))

    if not session_token.get("refresh_token"):
        raise KeyError("No refresh token available")

    client = sso._get_oauth_client(token=session_token)
    update_token = await client.refresh_token(sso.server_metadata["token_endpoint"])
    session_token["refresh_token"] = update_token["refresh_token"]
    session_token["expires_at"] = update_token["expires_at"]
    userinfo = await sso.userinfo(token=update_token)
    assert userinfo["sub"] == session_token["userinfo"]["sub"]
    oidc_session = await run_sync(
        update_or_create_user_session, db, session_token, userinfo, oidc_session
    )
    logger.debug(
        "Refreshed token and user for %s at %s",
        session_token["userinfo"]["sub"],
    )
    return oidc_session


async def get_valid_session(
    db: Annotated[Session, Depends(get_session)],
    request: Request,
    sso: Annotated[StarletteOAuth2App, Depends(get_sso)],
) -> OIDCSession | None:
    """Return a valid OIDCSession if the user is authenticated

    This function will also refresh the session if it is expired and a refresh
    token is available. Invalid sessions will be deleted.

    This function should be the exclusive source of OIDCSession objects in the
    application (apart from the authentication logic in this module).
    """
    if oidc_session := await run_sync(_get_oidc_session, db, request):
        if oidc_session.expires_at > datetime.now(tz=UTC):
            return oidc_session  # Success: session is still valid
        else:
            try:
                # Success: session was expired but can be refreshed
                return await _refresh_session(sso, db, request, oidc_session)
            except (OAuthError, KeyError) as e:
                # Refresh failed, delete session
                logger.info(
                    "Failed to refresh token for %s at %s: %s",
                    oidc_session.user.sub,
                    e,
                )
                await run_sync(_delete_oidc_session, db, request)
    return None


@auth_router.get("/-/is_authenticated/", include_in_schema=False)
async def is_authenticated_view(
    is_authenticated: OIDCSession | None = Depends(get_valid_session),
) -> IsAuthenticatedResponse:
    """Check if the user is authenticated"""
    return {"is_authenticated": is_authenticated is not None}


@auth_router.get("/logout/")
async def logout(
    request: Request,
    sso: Annotated[StarletteOAuth2App, Depends(get_sso)],
    db: Annotated[Session, Depends(get_session)],
) -> RedirectResponse:
    """Logout user"""
    session = await run_sync(_get_oidc_session, db, request)
    if not session:  # already logged out
        return RedirectResponse(
            url="/", headers={"Clear-Site-Data": '"cache", "storage", "cookies"'}
        )

    redirect_uri = request.base_url.replace(path="/")
    id_token = loads(session.token)["id_token"]
    await run_sync(_delete_oidc_session, db, request)
    return RedirectResponse(
        url=f"{sso.server_metadata['end_session_endpoint']}?post_logout_redirect_uri={redirect_uri}&id_token_hint={id_token}",
        status_code=302,
        headers={"Clear-Site-Data": '"cache", "storage", "cookies"'},
    )


@auth_router.get("/authorize/", status_code=302, response_class=RedirectResponse)
async def authorize(
    request: Request,
    sso: Annotated[StarletteOAuth2App, Depends(get_sso)],
    next: str = "/",
) -> RedirectResponse:
    """Login user and redirect to next

    Only local paths are allowed for next.

    This page must be loaded in the main window since user interaction may be
    required.
    """
    if not next.startswith("/"):
        raise ValueError("next must be an absolute path on the same origin")
    request.session["next"] = next
    redirect_uri = request.url_for("callback")
    try:
        redirect = await sso.authorize_redirect(
            request,
            redirect_uri,
        )
        assert isinstance(redirect, RedirectResponse)
        return redirect
    except Exception as e:
        raise RuntimeError("Failed to redirect to SSO") from e


def _append_query_prams(url: str, **params: str) -> str:
    parsed = urlparse(url)
    query = parse_qsl(parsed.query)
    query.extend(params.items())
    return parsed._replace(query=urlencode(query)).geturl()


@auth_router.get("/callback/")
async def callback(
    request: Request,
    sso: Annotated[StarletteOAuth2App, Depends(get_sso)],
    db: Annotated[Session, Depends(get_session)],
    error: str = "",
    error_description: str = "",
) -> RedirectResponse:
    """Callback endpoint for ID providers

    Use this as redirect URI for the ID provider configuration.
    """
    next_: str = request.session.pop("next", "/")  # in session we trust
    try:
        token = await sso.authorize_access_token(request)
        assert token["userinfo"]["aud"] == settings.oidc.client_id, (
            "Got a token for a different application"
        )  # this should not be possible hence the assert
    except OAuthError as e:
        logger.warning("Login request got aborted: %s", e, exc_info=True)
        if error:
            next_ = _append_query_prams(
                next_, error=error, error_description=error_description
            )
        response = RedirectResponse(next_, status_code=302)
        response.delete_cookie(SESSION_COOKIE_NAME)
        return response
    else:
        userinfo = await sso.userinfo(token=token)
        session_token: SessionToken = {
            "refresh_token": token.get("refresh_token"),
            "id_token": token["id_token"],
            "expires_at": token["expires_at"],
            "userinfo": {
                "sub": token["userinfo"]["sub"],
            },
        }
        session = await run_sync(
            update_or_create_user_session, db, session_token, userinfo
        )
        request.session["key"] = session.session_key
        return RedirectResponse(next_, status_code=302)


def _update_user_values(user: User, userinfo: UserInfo):
    user.username = userinfo["preferred_username"]
    user.email = userinfo["email"]
    user.first_name = userinfo.get("given_name", "")
    user.last_name = userinfo.get("family_name", "")
    if subjekt := user.subjekt:
        subjekt.vorname = user.first_name
        subjekt.name = user.last_name
    logger.info("Updating user with sub %r", user.sub)


def update_or_create_user_session(
    db: Session,
    token: SessionToken,
    userinfo: UserInfo,
    oidc_session: OIDCSession | None = None,
) -> OIDCSession:
    """Update or create a user from the session token"""
    sub = token["userinfo"]["sub"]
    expires_at = datetime.fromtimestamp(token["expires_at"], tz=UTC)
    token_str = dumps(token)

    if expires_at < datetime.now(tz=UTC):
        raise OAuthError("Token expired")

    if oidc_session:
        user = oidc_session.user
        if user.sub != sub:
            raise OAuthError("User mismatch")
        oidc_session.expires_at = expires_at
        oidc_session.token = token_str
        _update_user_values(user, userinfo)
    else:
        if user := db.scalars(select(User).where(User.sub == sub)).one_or_none():
            _update_user_values(user, userinfo)
        else:
            user = User(
                sub=sub,
                username=userinfo["preferred_username"],
                email=userinfo["email"],
                first_name=userinfo.get("given_name", ""),
                last_name=userinfo.get("family_name", ""),
            )
            subjekt = Subjekt()
            subjekt.vorname = user.first_name
            subjekt.name = user.last_name
            user.subjekt = subjekt
            db.add(user)
            user.assign_initial_settings()
            logger.info("Creating user %r with sub %r", user.username, sub)
        oidc_session = OIDCSession(
            token=token_str,
            expires_at=expires_at,
            user=user,
        )
        db.add(oidc_session)
    db.commit()
    return oidc_session


def get_current_user(
    db: Annotated[Session, Depends(get_session)],
    request: Request,
    is_authenticated: Annotated[OIDCSession | None, Depends(get_valid_session)],
) -> User:
    """Get user for the session token"""
    if settings.debug.enable_e2e_test_user:
        if user_identifier := request.headers.get("alma-e2e-test-user", None):
            username = user_identifier
        else:
            raise HTTPException(
                status_code=401, detail="Provided e2e user does not exist."
            )
        try:
            user = db.scalars(
                select(User).where(
                    User.username == username,
                )
            ).one()
        except NoResultFound:
            raise HTTPException(status_code=401, detail="User does not exist")
    elif (
        (api_key := request.headers.get("Authorization", None))
        and settings.screenshot_api_key
        and (compare_digest(api_key, settings.screenshot_api_key))
    ):
        user = db.scalars(
            select(User).where(User.sub == settings.screenshot_user_sub)
        ).one_or_none()

        if not user:
            raise HTTPException(status_code=401, detail="User does not exist")
        return user
    elif (
        (api_key := request.headers.get("Authorization", None))
        and settings.monitoring_settings.api_key
        and (compare_digest(api_key, settings.monitoring_settings.api_key))
    ):
        user = db.scalars(
            select(User).where(User.sub == settings.monitoring_settings.user_sub)
        ).one_or_none()

        if not user:
            raise HTTPException(status_code=401, detail="User does not exist")
        return user
    elif (
        (api_key := request.headers.get("Authorization", None))
        and settings.system_user_api_key
        and (compare_digest(api_key, settings.system_user_api_key))
    ):
        user = db.scalars(
            select(User).where(User.sub == settings.system_user_sub)
        ).one_or_none()

        if not user:
            raise HTTPException(status_code=401, detail="User does not exist")
        return user
    else:
        if not is_authenticated:
            raise HTTPException(status_code=401, detail="Authentication required")

        assert "key" in request.session, (
            "user without session key cannot be authenticated"
        )
        user = is_authenticated.user

    if not user.role:
        raise HTTPException(status_code=403, detail="User does not have a role")
    return user
