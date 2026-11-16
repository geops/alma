import json
import math
from datetime import date
from typing import Annotated, Any

import strawberry
import strawberry.field_extensions
from business_workflow_manager import models as wf_models
from geoalchemy2 import functions
from sqlalchemy import String, and_, cast, desc, func, or_, select
from sqlalchemy.exc import InternalError
from strawberry.scalars import JSON
from strawberry.types import has_object_definition

import alma.search
import alma.search.translation
from alma.exceptions import CombinedIdError
from alma.search import FIELD_CONFIG
from alma.search.advanced import TranslatedExpression
from alma.search.execution import check_field_permissions
from alma.workflow_integration import is_applicable

from .. import constants
from ..codelisten import MAPPING_CODE_LISTS_TRANSLATED
from ..combined_id import (
    generate_new_combined_id,
    generate_new_teilstandort_combined_id,
)
from ..models import admin as admin_models
from ..models import auth as auth_models
from ..models import cache as cache_models
from ..models import codes as code_models
from ..models import flugplatz as fp_models
from ..models import gem as gem_models
from ..models import report as report_models
from ..models import search as search_models
from ..models import subj as subj_models
from ..models import translations as translation_models
from ..models import vflz as vflz_models
from ..models.base import Language
from ..permissions import Permission, get_permission_class
from ..settings import CombinedIdFactoryName, settings
from ..wfs_cache import wfs_update_is_active
from .mutation import Mutation
from .scalars import GeoJSONLineString, GeoJSONMultiPolygon, JSONTranslation
from .types.admin import InstanceSetting
from .types.auth import RequiredPermissions, User
from .types.codes import Code, CodeList, KbsInfo, PaginatedCodeListResult
from .types.gem import Gemeinde
from .types.problems import Problem, ProblemCode, ProblemGroup
from .types.report import ReportConfigurationType, ReportContext
from .types.search import (
    AutoSuggestItem,
    FieldCategory,
    FieldInfo,
    FieldType,
    GeoSearchResult,
    GraphSearchResult,
    SavedSearch,
    SearchExport,
    SearchField,
    SearchFieldName,
    SearchFilter,
    SearchResult,
    SortItemInput,
    TabularSearchResult,
)
from .types.statistic import (
    BeurteilungStatistic,
    DashboardStatistic,
    GeschaefteStatistic,
    StandortTypenStatistic,
)
from .types.subj import PaginatedSubjektResult, Subjekt
from .types.translations import TranslationTable
from .types.vflz import Language as GraphqlLang
from .types.vflz import (
    PaginatedPoolResult,
    PaginatedVflzResult,
    Pool,
    ValidateCreateTeilstandortInput,
    ValidateCreateVflzInput,
    ValidatedCreateVflzData,
    ValidatedPoolFolgeschrittData,
    ValidatedVflzData,
    Vflz,
)
from .types.workflow import (
    GeschaefteFilter,
    PaginatedTaskResult,
    SortTasks,
    Task,
    TaskOption,
    TaskType,
    ValidatePoolFolgeschrittInput,
)
from .utils.geschaefte import get_paginated_task_result
from .utils.pagination import validate_per_page
from .utils.schema import Info, to_id


@strawberry.type
class Query:
    @strawberry.field
    def current_user(self, info: Info) -> User:
        db_user = info.context.user
        return User.from_db(db_user)

    @strawberry.field(permission_classes=[get_permission_class(Permission.EDIT_USER)])
    def users(self, info: Info) -> list[User]:
        db_users = info.context.db.scalars(
            select(auth_models.User)
            .where(~auth_models.User.is_system_user)
            .order_by(auth_models.User.email)
        ).all()
        return [User.from_db(db_user) for db_user in db_users]

    @strawberry.field
    def gemeinden(self, info: Info) -> list[Gemeinde]:
        objects = info.context.db.scalars(
            select(gem_models.Gemeinde).order_by(gem_models.Gemeinde.h_gem_id)
        ).all()
        return [Gemeinde.from_db(obj) for obj in objects]

    # Dummy query for prototype dashboard - see ALMABASE-116
    @strawberry.field(permission_classes=[get_permission_class(Permission.VIEW_VFL)])
    def latest_vflz(self, info: Info) -> list[Vflz]:
        objects = info.context.db.scalars(
            select(vflz_models.Vflz)
            .where(vflz_models.Vflz.is_current)
            .order_by(vflz_models.Vflz.vflz_id.desc())
            .limit(10)
        ).all()
        return [Vflz.from_db(obj) for obj in objects]

    @strawberry.field(permission_classes=[get_permission_class(Permission.VIEW_VFL)])
    def vflz(self, info: Info, vflz_id: strawberry.ID) -> Vflz:
        obj = info.context.db.get_one(vflz_models.Vflz, int(vflz_id))
        return Vflz.from_db(obj)

    @strawberry.field(permission_classes=[get_permission_class(Permission.VIEW_VFL)])
    def vflz_by_vfl_ids(self, info: Info, vfl_ids: list[strawberry.ID]) -> list[Vflz]:
        objs = info.context.db.scalars(
            select(vflz_models.Vflz)
            .where(
                vflz_models.Vflz.vfl_id.in_([int(vfl_id) for vfl_id in vfl_ids]),
                vflz_models.Vflz.is_current,
            )
            .order_by(
                *[
                    vflz_models.Vflz.vfl_id == int(vfl_id)
                    for vfl_id in reversed(vfl_ids)
                ]
            )
        ).all()
        return [Vflz.from_db(obj) for obj in objs]

    @strawberry.field(permission_classes=[get_permission_class(Permission.VIEW_VFL)])
    def pool(self, info: Info, pool_id: strawberry.ID) -> Pool:
        obj = info.context.db.get_one(vflz_models.Pool, int(pool_id))
        return Pool.from_db(obj)

    @strawberry.field(permission_classes=[get_permission_class(Permission.VIEW_VFL)])
    def pools(
        self,
        info: Info,
        page: int = 1,
        per_page: int = 20,
        filter_bezeichnung: str | None = None,
        vflz_id: strawberry.ID | None = None,
    ) -> PaginatedPoolResult:
        session = info.context.db
        validate_per_page(per_page)
        query = select(vflz_models.Pool)
        if vflz_id:
            query = (
                query.join(vflz_models.VflPool)
                .join(
                    vflz_models.Vflz,
                    vflz_models.VflPool.vfl_id == vflz_models.Vflz.vfl_id,
                )
                .where(vflz_models.Vflz.vflz_id == int(vflz_id))
            )
        if filter_bezeichnung:
            query = query.filter(
                vflz_models.Pool.bezeichnung.icontains(filter_bezeichnung)
            )

        num_pools_query = select(func.count()).select_from(query.subquery())
        num_pools = session.execute(num_pools_query).scalar_one()
        num_pages = math.ceil(num_pools / per_page)
        query = (
            query.offset((page - 1) * per_page)
            .limit(per_page)
            .order_by(vflz_models.Pool.bezeichnung)
        )
        objs = session.scalars(query).all()
        return PaginatedPoolResult(
            num_pages=num_pages,
            num_results_total=num_pools,
            results=[Pool.from_db(obj) for obj in objs],
            page=page,
            per_page=per_page,
        )

    @strawberry.field
    def code_lists(
        self,
        info: Info,
        cli_ids: list[strawberry.ID] | None = None,
        filter_: Annotated[str | None, strawberry.argument(name="filter")] = None,
        lang: Language = Language.DE,
        page: int = 1,
        per_page: int = 20,
    ) -> PaginatedCodeListResult:
        session = info.context.db
        validate_per_page(per_page)
        query = select(code_models.CodeListe).join(
            translation_models.Translation,
            and_(
                translation_models.Translation.key
                == func.concat("codelist:", code_models.CodeListe.c_cli_id),
                translation_models.Translation.locale == lang,
            ),
        )

        if filter_:
            query = query.where(
                or_(
                    translation_models.Translation.value.icontains(filter_),
                    cast(code_models.CodeListe.c_cli_id, String).icontains(filter_),
                ),
            )

        if cli_ids:
            query = query.where(
                code_models.CodeListe.c_cli_id.in_(
                    [int(c_cli_id) for c_cli_id in cli_ids]
                )
            )
        query = query.where(
            code_models.CodeListe.c_cli_id.in_([e.value for e in constants.CodeListe])
        )
        num_code_lists_query = select(func.count()).select_from(query.subquery())
        num_code_lists = session.execute(num_code_lists_query).scalar_one()
        num_pages = math.ceil(num_code_lists / per_page)

        query = (
            query.offset((page - 1) * per_page)
            .limit(per_page)
            .order_by(translation_models.Translation.value)
        )
        code_lists = info.context.db.scalars(query).all()

        return PaginatedCodeListResult(
            num_pages=num_pages,
            num_results_total=num_code_lists,
            results=[CodeList.from_db(code_list) for code_list in code_lists],
            page=page,
            per_page=per_page,
        )

    @strawberry.field
    def mapping_codelisten(self, info: Info) -> JSON:
        return JSON(MAPPING_CODE_LISTS_TRANSLATED)

    @strawberry.field
    def translations(self, info: Info) -> TranslationTable:
        translations_stmt = select(translation_models.Translation)
        de_translations = info.context.db.scalars(
            translations_stmt.where(
                translation_models.Translation.locale == Language.DE
            )
        ).all()

        fr_translations = info.context.db.scalars(
            translations_stmt.where(
                translation_models.Translation.locale == Language.FR
            )
        ).all()

        it_translations = info.context.db.scalars(
            translations_stmt.where(
                translation_models.Translation.locale == Language.IT
            )
        ).all()
        return TranslationTable(
            de=JSONTranslation(translation_models.to_formatted_dict(de_translations)),
            fr=JSONTranslation(translation_models.to_formatted_dict(fr_translations)),
            it=JSONTranslation(translation_models.to_formatted_dict(it_translations)),
        )

    @strawberry.field
    def query_permissions(self, info: Info) -> list[RequiredPermissions]:
        assert has_object_definition(Query)
        return RequiredPermissions.get_for_type(Query, info.context.user)

    @strawberry.field
    def mutation_permissions(self, info: Info) -> list[RequiredPermissions]:
        assert has_object_definition(Mutation)
        return RequiredPermissions.get_for_type(Mutation, info.context.user)

    @strawberry.field
    def instance_settings(self, info: Info) -> list[InstanceSetting]:
        settings = info.context.db.scalars(select(admin_models.InstanceSetting)).all()
        return [InstanceSetting.from_db(s) for s in settings]

    @strawberry.field
    def search(
        self,
        info: Info,
        query: str,
        advanced: bool = False,
        filters: list[SearchFilter] | None = None,
        fields: list[SearchField] | None = None,
        sort_by: list[SortItemInput] | None = None,
        lang: GraphqlLang = GraphqlLang.DE,
        page: int = 1,
        per_page: int = 20,
    ) -> SearchResult:
        validate_per_page(per_page)
        sort_by = sort_by or []
        filters = filters or []
        fields = fields or []

        user = info.context.user
        if not user.has_permission(Permission.VIEW_PROCESS) and any(
            f for f in fields if FIELD_CONFIG[f].category == FieldCategory.GESCHAEFT
        ):
            raise PermissionError("error.Permissions.SearchQuery")

        vflz_ids, direct_match = alma.search.get_search_results(
            info.context.db,
            user=user,
            search=query,
            advanced=advanced,
            filters=[(item.field, item.value) for item in filters],
            lang=lang,
        )

        def get_tabular_result() -> TabularSearchResult:
            result_page = alma.search.get_result_page(
                info.context.db,
                vflz_ids,
                fields=fields,
                sort_by=[(item.field, item.reverse) for item in sort_by],
                lang=lang,
                page=page,
                per_page=per_page,
            )
            return TabularSearchResult(
                num_pages=result_page.num_pages,
                num_results_total=result_page.num_results_total,
                results=[JSON(row) for row in result_page.results],
            )

        def get_graph_result() -> GraphSearchResult:
            hits_query = select(vflz_models.Vflz).where(
                vflz_models.Vflz.vflz_id.in_(vflz_ids)
            )
            combined_id_match = func.lower(vflz_models.Vflz.combined_id).contains(
                func.lower(query)
            )
            bezeichnung_match = func.lower(vflz_models.Vflz.bezeichnung).contains(
                func.lower(query)
            )
            hits_query = hits_query.order_by(
                desc(combined_id_match),
                desc(bezeichnung_match),
                vflz_models.Vflz.combined_id,
                vflz_models.Vflz.bezeichnung,
            )
            hits_query = hits_query.limit(per_page).offset(per_page * (page - 1))
            hits = info.context.db.scalars(hits_query).all()
            return GraphSearchResult(
                num_pages=math.ceil(len(vflz_ids) / per_page),
                num_results_total=len(vflz_ids),
                results=[Vflz.from_db(vflz) for vflz in hits],
            )

        def get_geo_result(
            extent: tuple[float, float, float, float] | None = None,
        ) -> GeoSearchResult:
            _get_vflgeo = lambda: alma.search.get_features_vflgeo(
                info.context.db, vflz_ids, extent
            )
            _get_zentroid = lambda: alma.search.get_features_zentroid(
                info.context.db, vflz_ids, extent
            )

            return GeoSearchResult(
                num_results_total=len(vflz_ids),
                _get_vflgeo=_get_vflgeo,
                _get_zentroid=_get_zentroid,
            )

        return SearchResult(
            page=page,
            per_page=per_page,
            direct_match=direct_match,
            _get_tabular_result=get_tabular_result,
            _get_graph_result=get_graph_result,
            _get_geo_result=get_geo_result,
        )

    @strawberry.field
    def search_fields(self, info: Info) -> list[FieldInfo]:
        user = info.context.user
        search_field_items = alma.search.FIELD_CONFIG.items()
        if not user.has_permission(Permission.VIEW_PROCESS):
            search_field_items = [
                (key, config)
                for key, config in search_field_items
                if config.category != FieldCategory.GESCHAEFT
            ]
        return [
            FieldInfo(
                field=SearchField(key), name=key.value, type=FieldType(config.type)
            )
            for key, config in search_field_items
        ]

    @strawberry.field
    def search_field_names(self, info: Info, lang: Language) -> list[SearchFieldName]:
        session = info.context.db
        user = info.context.user
        translated_fields = alma.search.translation.get_translated_fields(
            session, prefix="", lang=lang
        )
        if not user.has_permission(Permission.VIEW_PROCESS):
            translated_fields = [
                (field, category, name)
                for field, category, name in translated_fields
                if category != FieldCategory.GESCHAEFT
            ]
        return [
            SearchFieldName(
                field=field,
                category=category,
                name=name,
            )
            for field, category, name in translated_fields
        ]

    @strawberry.field
    def subjekt(self, info: Info, subj_id: strawberry.ID) -> Subjekt:
        obj = info.context.db.get_one(subj_models.Subjekt, int(subj_id))
        return Subjekt.from_db(obj)

    @strawberry.field
    def subjekte(
        self,
        info: Info,
        page: int = 1,
        per_page: int = 20,
        filter: str | None = None,
        is_sachbearbeiter: bool = False,
    ) -> PaginatedSubjektResult:
        session = info.context.db
        validate_per_page(per_page)
        query = select(subj_models.Subjekt).order_by(
            subj_models.Subjekt.search_key(), subj_models.Subjekt.subj_id
        )
        if filter:
            for word in filter.split():
                query = query.filter(subj_models.Subjekt.search_key().icontains(word))
        if is_sachbearbeiter:
            query = query.join(auth_models.User).where(
                auth_models.User.is_sachbearbeitung,
                ~auth_models.User.is_system_user,
            )

        num_subjekte_query = select(func.count()).select_from(query.subquery())
        num_subjekte = session.execute(num_subjekte_query).scalar_one()
        num_pages = math.ceil(num_subjekte / per_page)

        query = query.offset((page - 1) * per_page).limit(per_page)
        subjekte = session.scalars(query).all()
        return PaginatedSubjektResult(
            num_pages=num_pages,
            num_results_total=num_subjekte,
            results=[Subjekt.from_db(obj) for obj in subjekte],
            page=page,
            per_page=per_page,
        )

    @strawberry.field
    def kbs_infos(self, info: Info) -> list[KbsInfo]:
        query = select(code_models.KbsInfo).order_by(code_models.KbsInfo.cod_kbsinfo_id)
        kbs_infos = info.context.db.scalars(query).all()
        return [KbsInfo.from_db(kbs_info) for kbs_info in kbs_infos]

    @strawberry.field
    def validate_vflz_data(
        self, info: Info, vflz_id: strawberry.ID
    ) -> ValidatedVflzData | ProblemGroup:
        session = info.context.db
        last_wfs_update = session.get(cache_models.WfsUpdate, int(vflz_id))
        if wfs_update_is_active(last_wfs_update):
            return ProblemGroup(
                problems=[
                    Problem(
                        message="WFS update ongoing.",
                        field="",
                        problem_code=ProblemCode.BUSY,
                    )
                ]
            )

        vflgeo = session.scalars(
            select(vflz_models.VflGeo).where(vflz_models.VflGeo.vflz_id == int(vflz_id))
        ).one_or_none()
        if not vflgeo:
            return ValidatedVflzData.from_cache(session, [])

        query = (
            select(cache_models.WfsCache)
            .distinct(
                cache_models.WfsCache.postleitzahl,
                cache_models.WfsCache.ort,
                cache_models.WfsCache.h_gem_id,
                cache_models.WfsCache.gemeinde_name,
                cache_models.WfsCache.bfs_nummer,
                cache_models.WfsCache.h_nb_id,
                cache_models.WfsCache.egrid,
                cache_models.WfsCache.gb_nummer,
                cache_models.WfsCache.gws_zone,
                cache_models.WfsCache.gws_bereich,
            )
            .where(
                functions.ST_Intersects(
                    vflgeo.buffered_wkb_geometry, cache_models.WfsCache.wkb_geometry
                )
            )
        )
        cached_values = session.scalars(query).all()

        validated_vflz_data = ValidatedVflzData.from_cache(session, cached_values)
        validated_vflz_data.flugplatz = [
            Code.from_db(fp.bezeichnung)
            for fp in fp_models.from_geom(
                session, json.loads(vflgeo.wkb_geometry_geojson)
            )
        ]
        return validated_vflz_data

    @strawberry.field
    def validate_create_vflz(
        self, info: Info, data: ValidateCreateVflzInput
    ) -> ValidatedCreateVflzData | ProblemGroup:
        session = info.context.db
        if (
            data.combined_id
            and session.scalars(
                select(vflz_models.Vflz).where(
                    vflz_models.Vflz.combined_id == data.combined_id
                )
            ).one_or_none()
        ):
            data.combined_id = None

        res_data: dict[str, Any] = {
            "combined_id": [],
            "gemeinde": [],
            "flugplatz": [],
        }

        try:
            db_gems: dict[str, gem_models.Gemeinde] = {
                str(db_gem.h_gem_id): db_gem
                for db_gem in gem_models.from_geom(session, data.geometry)
            }
        except InternalError as e:
            return ProblemGroup(
                problems=[
                    Problem(
                        message=str(e),
                        problem_code=ProblemCode.VALIDATION,
                        field="geometry",
                    )
                ]
            )

        res_data["gemeinde"] = [Gemeinde.from_db(val) for _, val in db_gems.items()]

        # we allow to override flugplatz
        if data.flugplatz:
            res_data["flugplatz"] = [
                code_models.FlugplatzBezeichnung.from_db(session, data.flugplatz)
            ]
        else:
            res_data["flugplatz"] = [
                db_fp.bezeichnung
                for db_fp in fp_models.from_geom(session, data.geometry)
            ]

        if data.gemeinde and (data.gemeinde.h_gem_id in db_gems):
            res_data["gemeinde"] = [Gemeinde.from_db(db_gems[data.gemeinde.h_gem_id])]

        try:
            if not data.combined_id and data.vftyp:
                vftyp = code_models.Code.from_db(session, data.vftyp)

                match settings.combined_id_factory:
                    case CombinedIdFactoryName.FLUGPLATZ_DIUS_LFD_UNDERSCORE:
                        if data.flugplatz:
                            flugplatz = session.scalars(
                                select(fp_models.Flugplatz).where(
                                    fp_models.Flugplatz.bezeichnung
                                    == res_data["flugplatz"][0]
                                )
                            ).one()
                            res_data["combined_id"] = [
                                generate_new_combined_id(
                                    session=session,
                                    factory_name=settings.combined_id_factory,
                                    vftyp=vftyp,
                                    flugplatz=flugplatz,
                                )
                            ]
                    case CombinedIdFactoryName.ABUB_KTU:
                        if data.ktu:
                            ktu_code = code_models.Code.from_db(session, data.ktu)
                            ktu = session.scalars(
                                select(vflz_models.KTU).where(
                                    vflz_models.KTU.ktu == ktu_code
                                )
                            ).one()
                            res_data["combined_id"] = [
                                generate_new_combined_id(
                                    session=session,
                                    factory_name=settings.combined_id_factory,
                                    vftyp=vftyp,
                                    ktu=ktu,
                                )
                            ]
                    case _:
                        if data.gemeinde and (data.gemeinde.h_gem_id in db_gems):
                            res_data["combined_id"] = [
                                generate_new_combined_id(
                                    session=session,
                                    factory_name=settings.combined_id_factory,
                                    vftyp=vftyp,
                                    gemeinde=db_gems[data.gemeinde.h_gem_id],
                                )
                            ]
        except CombinedIdError as e:
            return ProblemGroup(
                problems=[
                    Problem(
                        message=str(e),
                        problem_code=ProblemCode.VALIDATION,
                        field="combined_id",
                    )
                ]
            )
        return ValidatedCreateVflzData(**res_data)

    @strawberry.field
    def validate_create_teilstandort(
        self, info: Info, data: ValidateCreateTeilstandortInput
    ) -> ValidatedCreateVflzData | ProblemGroup:
        session = info.context.db
        if (
            data.combined_id
            and session.scalars(
                select(vflz_models.Vflz).where(
                    vflz_models.Vflz.combined_id == data.combined_id
                )
            ).one_or_none()
        ):
            data.combined_id = None

        res_data: dict[str, Any] = {
            "combined_id": [],
            "gemeinde": [],
        }
        try:
            db_gems: dict[str, gem_models.Gemeinde] = {
                str(db_gem.h_gem_id): db_gem
                for db_gem in gem_models.from_geom(session, data.geometry)
            }
        except InternalError as e:
            return ProblemGroup(
                problems=[
                    Problem(
                        message=str(e),
                        problem_code=ProblemCode.VALIDATION,
                        field="geometry",
                    )
                ]
            )

        res_data["gemeinde"] = [Gemeinde.from_db(val) for _, val in db_gems.items()]
        if data.gemeinde and (data.gemeinde.h_gem_id in db_gems):
            res_data["gemeinde"] = [Gemeinde.from_db(db_gems[data.gemeinde.h_gem_id])]
            res_data["combined_id"] = [
                generate_new_teilstandort_combined_id(
                    session,
                    settings.teilstandort_combined_id_factory,
                    data.parent_combined_id,
                )
            ]
        res_data["flugplatz"] = [
            Code.from_db(fp.bezeichnung)
            for fp in fp_models.from_geom(session, data.geometry)
        ]
        return ValidatedCreateVflzData(**res_data)

    @strawberry.field(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def geo_union(
        self, info: Info, geo_a: GeoJSONMultiPolygon, geo_b: GeoJSONMultiPolygon
    ) -> GeoJSONMultiPolygon:
        return info.context.db.execute(
            functions.ST_AsGeoJSON(
                functions.ST_Multi(
                    functions.ST_Union(
                        functions.ST_GeomFromGeoJSON(json.dumps(geo_a)),
                        functions.ST_GeomFromGeoJSON(json.dumps(geo_b)),
                    )
                )
            )
        ).scalar_one()

    @strawberry.field(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def geo_intersection(
        self, info: Info, geo_a: GeoJSONMultiPolygon, geo_b: GeoJSONMultiPolygon
    ) -> GeoJSONMultiPolygon:
        return info.context.db.execute(
            functions.ST_AsGeoJSON(
                functions.ST_Multi(
                    functions.ST_Intersection(
                        functions.ST_GeomFromGeoJSON(json.dumps(geo_a)),
                        functions.ST_GeomFromGeoJSON(json.dumps(geo_b)),
                    )
                )
            )
        ).scalar_one()

    @strawberry.field(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def geo_difference(
        self, info: Info, geo_a: GeoJSONMultiPolygon, geo_b: GeoJSONMultiPolygon
    ) -> GeoJSONMultiPolygon:
        return info.context.db.execute(
            functions.ST_AsGeoJSON(
                functions.ST_Multi(
                    functions.ST_Difference(
                        functions.ST_GeomFromGeoJSON(json.dumps(geo_a)),
                        functions.ST_GeomFromGeoJSON(json.dumps(geo_b)),
                    )
                )
            )
        ).scalar_one()

    @strawberry.field(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def geo_split(
        self, info: Info, geo: GeoJSONMultiPolygon, blade: GeoJSONLineString
    ) -> GeoJSONMultiPolygon:
        return info.context.db.execute(
            functions.ST_AsGeoJSON(
                functions.ST_CollectionExtract(
                    functions.ST_Split(
                        functions.ST_GeomFromGeoJSON(json.dumps(geo)),
                        functions.ST_GeomFromGeoJSON(json.dumps(blade)),
                    )
                )
            )
        ).scalar_one()

    @strawberry.field(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def geo_make_valid(
        self, info: Info, geo: GeoJSONMultiPolygon
    ) -> GeoJSONMultiPolygon:
        return info.context.db.execute(
            functions.ST_AsGeoJSON(
                functions.ST_CollectionExtract(
                    functions.ST_MakeValid(
                        functions.ST_GeomFromGeoJSON(json.dumps(geo))
                    )
                )
            )
        ).scalar_one()

    @strawberry.field
    def validate_search_query(self, info: Info, query: str) -> Problem | None:
        session = info.context.db
        try:
            alma.search.validate_query(session, query)
        except alma.search.ValidationError as e:
            return Problem(
                message=str(e),
                problem_code=ProblemCode.VALIDATION,
                field="query",
                message_code=f"search.validation.{e.message_code}",
                message_args=JSON(e.message_args),
            )

    @strawberry.field
    def autosuggest_search_query(
        self,
        info: Info,
        input: str,
        pos: int = -1,
        lang: GraphqlLang = GraphqlLang.DE,
    ) -> list[AutoSuggestItem]:
        user = info.context.user
        session = info.context.db
        input = input[:pos]
        items = alma.search.autosuggest(session, input, lang=lang)
        if not user.has_permission(Permission.VIEW_PROCESS):
            items = [item for item in items if item.category != FieldCategory.GESCHAEFT]
        return [AutoSuggestItem.from_obj(item) for item in items]

    @strawberry.field
    def report_configurations(
        self, info: Info, context: ReportContext
    ) -> list[ReportConfigurationType]:
        session = info.context.db
        report_configurations = session.scalars(
            select(report_models.Report).where(
                report_models.Report.context == str(context),
                report_models.Report.is_active,
            )
        ).all()
        return [ReportConfigurationType.from_db(obj) for obj in report_configurations]

    @strawberry.field(
        permission_classes=[get_permission_class(Permission.VIEW_PROCESS)]
    )
    def geschaefte(
        self,
        info: Info,
        filter: GeschaefteFilter | None = None,
        page: int = 1,
        per_page: int = 20,
        task_id: strawberry.ID | None = None,
        as_tree: bool = True,
        sort_by: SortTasks = SortTasks.StartDatum,
        reverse: bool = False,
    ) -> PaginatedTaskResult:
        session = info.context.db
        validate_per_page(per_page)

        return get_paginated_task_result(
            session,
            user=info.context.user,
            filter_=filter,
            page=page,
            per_page=per_page,
            task_id=int(task_id) if task_id is not None else None,
            sort_by=sort_by,
            reverse=reverse,
            as_tree=as_tree,
        )

    @strawberry.field(
        permission_classes=[get_permission_class(Permission.VIEW_PROCESS)]
    )
    def task(self, info: Info, task_id: strawberry.ID) -> Task:
        session = info.context.db
        node: wf_models.Node = session.get_one(wf_models.Node, int(task_id))
        return Task.from_db_node(node)

    @strawberry.field(
        permission_classes=[get_permission_class(Permission.VIEW_PROCESS)]
    )
    def prozesse(self, info: Info) -> list[TaskOption]:
        session = info.context.db

        workflows = session.scalars(
            select(wf_models.Workflow).order_by(
                wf_models.Workflow.title, wf_models.Workflow.wf_config_id
            )
        ).all()

        return [
            TaskOption(
                option_id=to_id(workflow.wf_config_id),
                title=workflow.title,
                type=TaskType(workflow.type),
            )
            for workflow in workflows
        ]

    @strawberry.field(
        permission_classes=[get_permission_class(Permission.VIEW_PROCESS)]
    )
    def validate_pool_folgeschritt(
        self,
        info: Info,
        data: ValidatePoolFolgeschrittInput,
        valid_page: int = 1,
        valid_per_page: int = 20,
        invalid_page: int = 1,
        invalid_per_page: int = 20,
    ) -> ValidatedPoolFolgeschrittData:
        session = info.context.db
        mgr = info.context.workflow_manager

        valid_vflzs: list[vflz_models.Vflz] = []
        invalid_vflzs: list[vflz_models.Vflz] = []
        pool = session.get_one(vflz_models.Pool, int(data.pool_id))
        pool_vflzs = list(pool.get_current_vflzs(session))

        if data.option_id is None:
            valid_vflzs = pool_vflzs
        else:
            wf_config = session.get_one(wf_models.WorkflowConfig, int(data.option_id))

            for vflz_obj in pool_vflzs:
                if isinstance(wf_config, wf_models.Workflow):
                    # Starting a new process: mirror the is_applicable check used by Vflz.prozesse
                    can_start = is_applicable(session, wf_config, str(vflz_obj.vflz_id))
                else:
                    # Folgeschritt (Task / Form / Document): check leaf nodes
                    all_vflz_ids = session.scalars(
                        select(vflz_models.Vflz.vflz_id).where(
                            vflz_models.Vflz.vfl_id == vflz_obj.vfl_id
                        )
                    ).all()

                    last_workflow_nodes = session.scalars(
                        select(wf_models.Node).where(
                            wf_models.Node.entity_id.in_(all_vflz_ids),
                            ~wf_models.Node.wf_config_id.is_(None),
                            wf_models.Node.next_node_id.is_(None),
                        )
                    ).all()

                    can_start = any(
                        int(data.option_id)
                        in [
                            s.wf_config_id
                            for s in mgr.get_next_steps(
                                node.wf_node_id
                            ).available_options
                        ]
                        for node in last_workflow_nodes
                    )

                if can_start:
                    valid_vflzs.append(vflz_obj)
                else:
                    invalid_vflzs.append(vflz_obj)

        return ValidatedPoolFolgeschrittData(
            valid_standorte=PaginatedVflzResult(
                num_pages=math.ceil(len(valid_vflzs) / valid_per_page),
                num_results_total=len(valid_vflzs),
                results=[
                    Vflz.from_db(v)
                    for v in valid_vflzs[
                        (valid_page - 1) * valid_per_page : valid_page * valid_per_page
                    ]
                ],
                page=valid_page,
                per_page=valid_per_page,
            ),
            invalid_standorte=PaginatedVflzResult(
                num_pages=math.ceil(len(invalid_vflzs) / invalid_per_page),
                num_results_total=len(invalid_vflzs),
                results=[
                    Vflz.from_db(v)
                    for v in invalid_vflzs[
                        (invalid_page - 1) * invalid_per_page : invalid_page
                        * invalid_per_page
                    ]
                ],
                page=invalid_page,
                per_page=invalid_per_page,
            ),
        )

    @strawberry.field(permission_classes=[get_permission_class(Permission.VIEW_VFL)])
    def saved_searches(self, info: Info) -> list[SavedSearch]:
        session = info.context.db
        user = info.context.user
        query = (
            select(search_models.Search)
            .where(~search_models.Search.is_temporary)
            .where(
                or_(
                    search_models.Search.user_id == user.id,
                    search_models.Search.is_shared,
                )
            )
            .order_by(search_models.Search.name)
        )

        allowed_saved_searches: list[SavedSearch] = []
        db_saved_searches = session.scalars(query).all()

        for obj in db_saved_searches:
            saved_search = SavedSearch.from_db(obj)
            filter_fields = [
                expr.name
                for expr in saved_search.parsed_query
                if isinstance(expr, TranslatedExpression)
            ]
            output_fields = [SearchField(f) for f in obj.fields]
            try:
                check_field_permissions(filter_fields, user)
                check_field_permissions(output_fields, user)
            except PermissionError:
                continue

            allowed_saved_searches.append(saved_search)

        return allowed_saved_searches

    @strawberry.field(permission_classes=[get_permission_class(Permission.VIEW_VFL)])
    def search_exports(
        self, info: Info, export_id: strawberry.ID | None = None
    ) -> list[SearchExport]:
        query = select(search_models.SearchExport).where(
            search_models.SearchExport.user == info.context.user
        )
        if export_id is not None:
            query = query.where(search_models.SearchExport.export_id == str(export_id))

        search_exports = info.context.db.scalars(query).all()
        return [SearchExport.from_db(export) for export in search_exports]

    @strawberry.field(permission_classes=[get_permission_class(Permission.VIEW_VFL)])
    def dashboard_statistic(self, info: Info, stichtag: date) -> DashboardStatistic:
        session = info.context.db
        ds_stat = DashboardStatistic()
        ds_stat.standort_typen = StandortTypenStatistic.from_db(session, stichtag)
        ds_stat.geschaefte = GeschaefteStatistic.from_db(session, stichtag)
        ds_stat.beurteilungen = BeurteilungStatistic.from_db(session, stichtag)
        return ds_stat
