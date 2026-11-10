from base64 import b64encode
from enum import StrEnum
from functools import cached_property
from logging import getLogger
from secrets import token_urlsafe
from typing import Any
from urllib.parse import urljoin

import yaml
from pydantic import BaseModel, Field, HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = getLogger(__name__)


def get_secret_key() -> str:
    logger.warning(
        "Generating random secret key, this will lead to authentication errors"
        " with multiple instances."
    )
    return token_urlsafe(32)


class SentrySettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="sentry_")

    dsn: str = ""
    environment: str = "unknown"
    trace_sample_rate: float = 0.0


class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="db_")

    # checkov:skip=CKV_SECRET_4 ignore credentials
    url: str = "postgresql://alma:alma@db/alma"
    # checkov:skip=CKV_SECRET_4 ignore credentials
    test_url: str = "postgresql://alma:alma@localhost:5435/alma_test"
    """Unittests expect a migrated but empty database"""
    echo: bool = False


class KeycloakOIDCSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="oidc_")

    base_url: str = "http://keycloak:8080/auth"
    config_path: str = "/realms/alma/.well-known/openid-configuration"
    client_id: str = "alma-backend"
    scope: str = "openid profile email roles"
    client_secret: str = ""

    keycloak_admin_user: str = Field(
        alias="KC_BOOTSTRAP_ADMIN_USERNAME", default="admin"
    )
    keycloak_admin_password: str = Field(
        alias="KC_BOOTSTRAP_ADMIN_PASSWORD", default=""
    )

    def keycloak_url(self, path: str) -> str:
        return urljoin(f"{self.base_url}/", path.lstrip("/"))


class DebugSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="debug_")

    enable_e2e_test_user: bool = False
    graphql_ide: bool = False


class FieldMapping(BaseModel):
    wfs: str
    cache_table: str
    code_mappings: dict[str, str] = {}


class BasicCredentials(BaseModel):
    user: str
    password: str


class AuthSettings(BaseModel):
    basic: BasicCredentials | None = None
    headers: dict[str, Any] | None = {}


class WfsSettings(BaseModel):
    url: str
    version: str = "2.0.0"
    layers: list[str] = []
    is_proxy: bool = True
    is_cache: bool = True
    field_mappings: list[FieldMapping] = []
    code_mappings: dict[str, str] = {}
    auth: AuthSettings | None = None

    @cached_property
    def field_mappings_lut(self) -> dict[str, str]:
        lut: dict[str, str] = {}
        for mapping in self.field_mappings:
            lut[mapping.wfs] = mapping.cache_table
        return lut

    @cached_property
    def wfs_fields(self) -> list[str]:
        return list(self.field_mappings_lut.keys())

    @cached_property
    def cached_table_fields(self) -> list[str]:
        return [mapping.cache_table for mapping in self.field_mappings]

    @cached_property
    def auth_headers(self) -> dict[str, str]:
        headers: dict[str, str] = {}
        if self.auth:
            if self.auth.basic:
                credentials = f"{self.auth.basic.user}:{self.auth.basic.password}"
                headers["Authorization"] = (
                    f"Basic {b64encode(credentials.encode()).decode()}"
                )
            if self.auth.headers:
                headers.update(self.auth.headers)
        return headers


class ScheduledTask(BaseModel, frozen=True):
    name: str  # name of the task in alma.tasks.TASK
    schedule: str  # cron expresssion


class GemeindeServiceSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="gemeinde_service_")
    wfs_url: str = "https://units.geops.io/"
    ignore_certs: bool = False
    proxy_url: HttpUrl | None = None
    kantone: list[str] | None = None

    @staticmethod
    def _set_gdal_proxy_config(url: HttpUrl):
        # Silence type checker. Type checker support of GDAL appears to be suboptimal.
        from osgeo import gdal  # type: ignore

        gdal.SetConfigOption("GDAL_PROXY_AUTH", "NTLM")  # type: ignore
        gdal.SetConfigOption("GDAL_HTTP_PROXY", f"{url.scheme}://{url.host}:{url.port}")  # type: ignore
        gdal.SetConfigOption(  # type: ignore
            "GDAL_HTTP_PROXYUSERPWD", f"{url.username or ''}:{url.password or ' '}"
        )

    def model_post_init(self, __context: Any) -> None:
        if self.proxy_url is not None:
            self._set_gdal_proxy_config(self.proxy_url)


class ProxySettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="wfs_proxy_")
    url: HttpUrl | None = None
    ignore_certs: bool = False

    @staticmethod
    def _set_gdal_proxy_config(url: HttpUrl):
        # Silence type checker. Type checker support of GDAL appears to be suboptimal.
        from osgeo import gdal  # type: ignore

        gdal.SetConfigOption("GDAL_PROXY_AUTH", "NTLM")  # type: ignore
        gdal.SetConfigOption("GDAL_HTTP_PROXY", f"{url.scheme}://{url.host}:{url.port}")  # type: ignore
        gdal.SetConfigOption(  # type: ignore
            "GDAL_HTTP_PROXYUSERPWD", f"{url.username or ''}:{url.password or ' '}"
        )

    def model_post_init(self, __context: Any) -> None:
        if self.url is not None:
            self._set_gdal_proxy_config(self.url)


class InterlisExportSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")
    enabled_interlis_export_list: str | None = None
    debug_dir: str | None = None
    s3_key: str | None = None
    s3_secretkey: str | None = None
    s3_bucket: str | None = None
    s3_region: str | None = None
    additional_files: str | None = None
    oereb_v2_0_name: str | None = None
    kbs_v1_5_name: str | None = None
    be_name: str | None = None
    vd_name: str | None = None
    so_name: str | None = None
    so_restricted_name: str | None = None
    lu_name: str | None = None
    oereb_v2_0_directory: str | None = None
    kbs_v1_5_directory: str | None = None
    be_directory: str | None = None
    vd_directory: str | None = None
    so_directory: str | None = None
    so_restricted_directory: str | None = None
    lu_directory: str | None = None

    ftp_lv95_ftp_server: str | None = None
    ftp_lv95_username: str | None = None
    ftp_lv95_password: str | None = None
    ftp_lv95_directory: str | None = None

    oereb_v2_0_query: str | None = None
    kbs_v1_5_query: str | None = None
    be_query: str | None = None
    vd_query: str | None = None
    so_query: str | None = None
    so_restricted_query: str | None = None
    lu_query: str | None = None

    check_java: str | None = None
    check_ilivalidator_oereb_v2_0: bool | None = None
    check_ilivalidator_kbs_v1_5: bool | None = None
    check_ilivalidator_be: bool | None = None
    check_ilivalidator_vd: bool | None = None
    check_ilivalidator_so: bool | None = None
    check_ilivalidator_so_restricted: bool | None = None
    check_ilivalidator_lu: bool | None = None
    upload: bool = False


class IcingaSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="icinga_")
    url: str | None = None
    password: str | None = None
    ca_cert: str | None = None
    additional_info: str | None = None
    proxy_url: str | None = None
    ignore_certs: bool = True


class MonitoringSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="monitoring_")
    api_key: str | None = Field(default=None)
    graphql_service_url: HttpUrl = HttpUrl("http://nginx/graphql")
    screenshot_service_url: HttpUrl = HttpUrl("http://shootme:8002")
    nginx_service_url: HttpUrl = HttpUrl("http://nginx")
    search_export_query: str = ""
    user_sub: str | None = None
    min_update_interval_in_days: int = Field(default=7, ge=1)


class ReportExportType(StrEnum):
    PUBLISHED = "published"


class ReportExportSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="report_export_")
    delay_in_hours: int = 0
    batch_size: int | None = None
    report_id: int | None = None
    type: ReportExportType = ReportExportType.PUBLISHED
    export_path: str = "/app/exports/kbs/"


class CombinedIdFactoryName(StrEnum):
    INTERNAL_BFS_ABUS_LFD_UNDERSCORE = "internal_bfs_abus_lfd_underscore"
    INTERNAL_BFS_ABUS_LFD_UNDERSCORE_TWICE = "internal_bfs_abus_lfd_underscore_twice"
    BFS_ZERO_ONE_THREE_TWO_LFDR_HYPHEN = "bfs_zero_one_three_two_lfd_hyphen"
    ABUB_KTU = "abub_ktu"
    FLUGPLATZ_DIUS_LFD_UNDERSCORE = "flugplatz_dius_lfd_underscore"
    BFS_DBUS_LFD_WHITESPACES = "bfs_dbus_lfd_whitespaces"
    D_INTERNAL_BFS_DOT_LFD = "d_internal_bfs_dot_lfd"
    CANTON_INTERNAL_BFS_LFD_ABUB_DOT = "canton_internal_bfs_lfd_abub_dot"
    BFS_DEAE_LFD_HYPHEN = "bfs_deae_lfd_hyphen"
    BFS_LFD = "bfs_lfd"
    AA_BFS_LFD_DOT = "aa_bfs_lfd_dot"
    BFS_ABUS_LFD = "bfs_abus_lfd"


class TeilstandortCombinedIdFactoryName(StrEnum):
    DOT_NUMBER = "dot_number"
    HYPHEN_NUMBER = "hyphen_number"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="alma_", env_parse_none_str="None")

    oidc: KeycloakOIDCSettings = KeycloakOIDCSettings()
    database: DatabaseSettings = DatabaseSettings()
    debug: DebugSettings = DebugSettings()
    sentry: SentrySettings = SentrySettings()
    secret_key: str = Field(default_factory=get_secret_key, min_length=32)
    """Session cookie signing key

    Set this explicitly to avoid invalidating existing sessions on restart
    """

    gemeinde_service: GemeindeServiceSettings = GemeindeServiceSettings()
    wfs_config: dict[str, WfsSettings] = Field(default_factory=dict)
    wfs_proxy: dict[str, WfsSettings] = Field(default_factory=dict)
    wfs_update_batch_size: int = 100
    wfs_max_update_interval_in_seconds: float = 10.0
    proxy: ProxySettings = ProxySettings()
    scheduled_tasks: list[ScheduledTask] = Field(default_factory=list)
    combined_id_factory: CombinedIdFactoryName = (
        CombinedIdFactoryName.BFS_DBUS_LFD_WHITESPACES
    )
    teilstandort_combined_id_factory: TeilstandortCombinedIdFactoryName = (
        TeilstandortCombinedIdFactoryName.DOT_NUMBER
    )
    height_api: HttpUrl | None = HttpUrl(
        "https://api3.geo.admin.ch/rest/services/height"
    )

    behoerde: str | None = None
    customer: str = "demo"
    screenshot_user_sub: str | None = None
    screenshot_api_key: str | None = Field(default=None)
    templates_base_dir: str = "."
    interlis_export_settings: InterlisExportSettings | None = None
    report_export_settings: ReportExportSettings = ReportExportSettings()
    documents_path: str = "/app/documents/"
    search_export_path: str = "/app/exports/search/"
    icinga_settings: IcingaSettings = IcingaSettings()
    monitoring_settings: MonitoringSettings = MonitoringSettings()
    system_user_sub: str | None = None
    system_user_api_key: str | None = Field(default=None)

    # config file paths
    wfs_config_path: str | None = None
    wfs_service_parzelle_name: str = "parzelle"
    interlis_export_settings_path: str | None = None
    scheduled_tasks_path: str | None = None

    def load_interlis_export_settings(self) -> None:
        if self.interlis_export_settings_path:
            self.interlis_export_settings = InterlisExportSettings(
                _env_file=self.interlis_export_settings_path  # pyright: ignore[reportCallIssue]
            )

    def load_wfs_config(self) -> None:
        if self.wfs_config_path:
            with open(self.wfs_config_path) as f:
                document = yaml.safe_load(f)
                for wfs_service_name, wfs_settings in document.items():
                    if wfs_settings.get("is_proxy", True):
                        self.wfs_proxy[wfs_service_name] = WfsSettings.model_validate(
                            wfs_settings
                        )
                    if wfs_settings.get("is_cache", True):
                        self.wfs_config[wfs_service_name] = WfsSettings.model_validate(
                            wfs_settings
                        )

    def load_scheduled_tasks(self) -> None:
        if self.scheduled_tasks_path:
            with open(self.scheduled_tasks_path) as f:
                document = yaml.safe_load(f)
                self.scheduled_tasks = [
                    ScheduledTask(name=item["name"], schedule=item["schedule"])
                    for item in document
                ]

    def model_post_init(self, __context: Any) -> None:
        self.load_wfs_config()
        self.load_scheduled_tasks()
        self.load_interlis_export_settings()


settings = Settings()
