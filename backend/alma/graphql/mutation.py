import contextlib
import dataclasses
import datetime
import json
import re
from collections.abc import Callable
from functools import partial
from logging import getLogger
from typing import Any, NamedTuple, TypeVar, cast
from uuid import uuid4

import jsonschema
import jsonschema.exceptions
import shapely
import strawberry
from business_workflow_manager import models as wf_models
from business_workflow_manager.exceptions import (
    CascadeConflict,
    InvalidWorkflowStep,
    WorkflowException,
)
from business_workflow_manager.types import NodeStatus as WmNodeStatus
from geoalchemy2 import functions
from procrastinate.exceptions import AlreadyEnqueued
from psycopg2.errors import ExclusionViolation
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.sql import functions as sql_functions
from strawberry.types.base import (
    StrawberryList,
    StrawberryOptional,
    get_object_definition,
    has_object_definition,
)

import alma.search
import alma.task_queue
import alma.task_queue.tasks
from alma import protocols as alma_protocols
from alma import wfs_cache
from alma.models import admin as admin_models
from alma.models import auth as auth_models
from alma.models import bem as bem_models
from alma.models import codes as code_models
from alma.models import flugplatz as fp_models
from alma.models import gem as gem_models
from alma.models import grun as grun_models
from alma.models import search as search_models
from alma.models import subj as subj_models
from alma.models import translations as translations_models
from alma.models import umwelt as umwelt_models
from alma.models import vflz as vflz_models
from alma.models import workflow as alma_wf_models
from alma.permissions import (
    Permission,
    error_class,
    error_message,
    get_permission_class,
)
from alma.search import validate_query
from alma.search.constants import DASHBOARD_SAVED_SEARCH_SETTINGS_KEY
from alma.search.serialization import serialize_query
from alma.settings import settings
from alma.workflow_integration import is_applicable, set_current_vflz

from ..constants import CodeListe, Language
from .scalars import GeoJSONPointOrMultiPolygon
from .types import umwelt as umwelt_types
from .types.admin import InstanceSetting, SettingCategory, UpdateInstanceSettingInput
from .types.auth import (
    CreateUserInput,
    UpdateCurrentUserInput,
    UpdateCurrentUserPasswordInput,
    UpdateUserInput,
    UpdateUserSettingInput,
    User,
    UserSetting,
)
from .types.bet import (
    BeteiligterStandortInput,
    CreateBeteiligterInput,
    SachbearbeitungInput,
    UpdateVflzBeteiligteInput,
)
from .types.codes import (
    CodeInput,
    CodeList,
    CodeListEntry,
    CreateCodeListEntryInput,
    UpdateCodeListEntryInput,
    UpdateCodeListInput,
)
from .types.gem import GemeindeInput
from .types.grun import Eigentum, EigentumInput, EigentumStatus
from .types.problems import Problem, ProblemCode, ProblemGroup
from .types.search import (
    AddSearchResultsToPoolInput,
    CreateSavedSearchInput,
    ExportSearchInput,
    SavedSearch,
    UpdateSavedSearchInput,
)
from .types.subj import (
    CreateSubjektInput,
    KontaktInput,
    Subjekt,
    UpdateSubjektInput,
    UpdateSubjektResult,
)
from .types.translations import UpdateTranslationInput
from .types.vflz import (
    AblagerungInput,
    BemerkungInput,
    BetriebInput,
    BeurteilungInput,
    CreatePoolInput,
    CreateTeilstandortInput,
    CreateVflzInput,
    HistorizeVflzInput,
    KinderspielplatzGruenflaecheInput,
    KompartimentStoffgruppeInput,
    KompartimentStoffklasseInput,
    LoeschschaumEinsatzInput,
    MassnahmeInput,
    PFASInput,
    Pool,
    SanierungszielInput,
    SchiessanlageInput,
    UnfallInput,
    UnfallstoffInput,
    UpdatePoolInfoInput,
    UpdateVflzDataInput,
    UpdateVflzEvaluationInput,
    UpdateVflzGeoInput,
    UpdateVflzVollzugInput,
    Vflz,
    VollzugInput,
    ZeitraumInput,
    ZeitraumMitGenauigkeitInput,
)
from .types.workflow import (
    Aufgabe,
    BeteiligterGeschaeftInput,
    CreatePoolAufgabeInput,
    CreatePoolDokumentInput,
    CreatePoolNotizInput,
    CreateStandortAufgabeInput,
    CreateStandortDokumentInput,
    CreateStandortNotizInput,
    Dokument,
    Formular,
    Notiz,
    Prozess,
    StartPoolFolgeschrittInput,
    StartPoolFolgeschrittResult,
    StartPoolProzessInput,
    StartPoolProzessResult,
    StartStandortFolgeschrittInput,
    StartStandortFolgeschrittResult,
    StartStandortProzessInput,
    StartStandortProzessResult,
    Task,
    TaskStatus,
    UpdateAufgabeInput,
    UpdateDokumentInput,
    UpdateFormularInput,
    UpdateNotizInput,
    UpdateProzessInput,
    WorkflowProblemGroup,
)
from .utils.eigentum import get_eigentum
from .utils.schema import Info

logger = getLogger(__name__)


class ValidationError(Exception):
    pass


class EigentumKey(NamedTuple):
    subj_id: int | None
    beziehungsart: str | None  # as serialized value ("code:{c_cli_id}:{code}")
    h_gem_id: int | None
    h_nb_id: str | None
    gb_nummer: str

    def to_parzelle_key(self) -> grun_models.ParzelleKey:
        return grun_models.ParzelleKey(
            h_gem_id=self.h_gem_id,
            gb_nummer=self.gb_nummer,
            h_nb_id=self.h_nb_id,
            egrid=None,
            wkb_geometry=None,
        )


def _add_search_to_dashboard(
    session: Session, user: auth_models.User, saved_search: search_models.Search
) -> None:
    if user_setting := session.scalars(
        select(auth_models.UserSetting).where(
            auth_models.UserSetting.key == DASHBOARD_SAVED_SEARCH_SETTINGS_KEY,
            auth_models.UserSetting.user_id == user.id,
        )
    ).one_or_none():
        # Make sure to create a new object so the change gets persisted.
        if saved_search.search_id not in user_setting.value:
            user_setting.value = user_setting.value + [saved_search.search_id]
    else:
        user_setting = auth_models.UserSetting(
            key=DASHBOARD_SAVED_SEARCH_SETTINGS_KEY,
            user_id=user.id,
            value=[saved_search.search_id],
        )
        session.add(user_setting)


def _remove_search_from_dasbhoard(
    session: Session, user: auth_models.User, saved_search: search_models.Search
) -> None:
    if (
        user_setting := session.scalars(
            select(auth_models.UserSetting).where(
                auth_models.UserSetting.key == DASHBOARD_SAVED_SEARCH_SETTINGS_KEY,
                auth_models.UserSetting.user_id == user.id,
            )
        ).one_or_none()
    ) is not None and saved_search.search_id in user_setting.value:
        # Make sure to create a new object so the change gets persisted.
        search_ids_on_dashboard = list(user_setting.value)
        search_ids_on_dashboard.remove(saved_search.search_id)
        user_setting.value = search_ids_on_dashboard


def _assign_default_saved_searches(session: Session, user: auth_models.User):
    if not settings.system_user_sub:
        return
    system_user = session.scalars(
        select(auth_models.User).where(auth_models.User.sub == settings.system_user_sub)
    ).one_or_none()
    if system_user is None:
        logger.warning(
            "Skipping default saved searches because system user %r was not found",
            settings.system_user_sub,
        )
        return

    system_user_searches = session.scalars(
        select(search_models.Search)
        .where(search_models.Search.user == system_user, search_models.Search.is_shared)
        .order_by(search_models.Search.name)
    ).all()

    for s in system_user_searches:
        saved_search = search_models.Search(
            user=user,
            name=s.name,
            query=s.query,
            fields=s.fields,
            sort_by=s.sort_by,
            is_grouped=s.is_grouped,
            is_shared=False,
        )
        session.add(saved_search)
        _add_search_to_dashboard(session, user, saved_search)


def _to_datetime(date: datetime.date) -> datetime.datetime:
    return datetime.datetime.combine(date, datetime.time(0))


def _to_wm_status(task_status: "TaskStatus") -> WmNodeStatus:
    """Convert GraphQL TaskStatus to business_workflow_manager NodeStatus."""
    return WmNodeStatus(task_status.value)


def _make_cascade_problem_group(
    session: Session,
    problems: list[Problem],
    e: CascadeConflict,
) -> "WorkflowProblemGroup":
    """Map a wm CascadeConflict to alma's WorkflowProblemGroup."""
    faelligkeit_nodes: list[Task] = []
    status_nodes: list[Task] = []
    open_events_nodes: list[Task] = []

    for ni in e.deadline_conflicts:
        node = session.get(wf_models.Node, ni.wf_node_id)
        if node and isinstance(node, wf_models.TaskNode | wf_models.WorkflowNode):
            faelligkeit_nodes.append(Task.from_db_node(node))

    for ni in e.status_conflicts:
        node = session.get(wf_models.Node, ni.wf_node_id)
        if node and isinstance(node, wf_models.TaskNode | wf_models.WorkflowNode):
            status_nodes.append(Task.from_db_node(node))

    for ni in e.pending_trigger_conflicts:
        node = session.get(wf_models.Node, ni.wf_node_id)
        if node and isinstance(node, wf_models.TaskNode | wf_models.WorkflowNode):
            open_events_nodes.append(Task.from_db_node(node))

    return WorkflowProblemGroup(
        problems=problems,
        faelligkeits_datum_problem_tasks=faelligkeit_nodes,
        status_problem_tasks=status_nodes,
        open_events_problem_tasks=open_events_nodes,
    )


def check_for_empty_objects(obj: Any) -> None:
    """
    Recursively check for empty graphql input objects

    An object is empty if all of its non-required fields are None.

    Raises ValidationError if an empty object was found.
    """
    assert has_object_definition(obj)
    optional_fields = [
        f
        for f in get_object_definition(obj, strict=True).fields
        if isinstance(f.type, StrawberryOptional | StrawberryList)
    ]
    if not optional_fields:
        return

    is_empty = True
    for field in optional_fields:
        if isinstance(field.type, StrawberryList):
            values = getattr(obj, field.name)
        else:
            values = [getattr(obj, field.name)]

        for item in values:
            if has_object_definition(item):
                check_for_empty_objects(item)
                is_empty = False
            else:
                if item is not None:
                    is_empty = False

    if is_empty:
        raise ValidationError(f"All fields of object are empty: {obj!r}")


def set_zeitraum(obj: alma_protocols.ZeitraumProtocol, zeitraum: ZeitraumInput | None):
    if zeitraum:
        if zeitraum.von:
            obj.zeitraum_von = zeitraum.von
        if zeitraum.bis:
            obj.zeitraum_bis = zeitraum.bis
        if zeitraum.vonjahr is not None:
            obj.zeitraum_vonjahr = zeitraum.vonjahr
        if zeitraum.bisjahr is not None:
            obj.zeitraum_bisjahr = zeitraum.bisjahr
        if zeitraum.bisheute is not None:
            obj.zeitraum_bisheute = zeitraum.bisheute


def set_zeitraum_mit_genauigkeit(
    session: Session,
    obj: alma_protocols.ZeitraumMitGenauigkeitProtocol,
    zeitraum_mit_genauigkeit: ZeitraumMitGenauigkeitInput | None,
):
    data = zeitraum_mit_genauigkeit
    set_zeitraum(obj, data)

    if data:
        obj.genauigkeit_von = code_models.Genauigkeit.from_db_or_none(
            session, data.genauigkeit_von
        )
        obj.genauigkeit_bis = code_models.Genauigkeit.from_db_or_none(
            session, data.genauigkeit_bis
        )


def update_vflz_fields(
    session: Session, vflz: vflz_models.Vflz, data: UpdateVflzDataInput
):
    vflz.deponietyp = code_models.DeponieTyp.from_db_or_none(session, data.deponietyp)
    vflz.gws_bereich = code_models.Gewaesserschutzbereich.from_db_or_none(
        session, data.gws_bereich
    )
    vflz.gws_zone = code_models.Gewaesserschutzzone.from_db_or_none(
        session, data.gws_zone
    )
    vflz.durchlaessigkeit = code_models.Durchlaessigkeit.from_db_or_none(
        session, data.durchlaessigkeit
    )
    vflz.karstgeb = code_models.JaNeinUnbekannt.from_db_or_none(session, data.karstgeb)
    if data.ktu:
        ktu_code = code_models.KTU.from_db(session, data.ktu)
        vflz.ktu = session.scalars(
            select(vflz_models.KTU).where(vflz_models.KTU.ktu == ktu_code)
        ).one()
    else:
        vflz.ktu = None

    vflz.in_betrieb = data.in_betrieb
    vflz.nachsorge = data.nachsorge

    vflz.bezeichnung = data.bezeichnung
    vflz.flurname = data.flurname
    vflz.strasse = data.strasse
    vflz.postleitzahl = data.postleitzahl
    vflz.ort = data.ort
    vflz.lang = data.lang if data.lang else Language.DE


T_input = TypeVar("T_input")
T_model = TypeVar("T_model")


def update_collection(
    inputs: list[T_input],
    models: list[T_model],
    pk_name: str,
    update_fn: Callable[[T_input, T_model | None], T_model],
) -> list[T_model]:
    """
    Update a collection of related objects based on a list of inputs.

    Args:
        inputs: List of inputs.
        models: Current contents of the collection.
        pk_name: Field name of the primary key (must be the same for input and model).
        update_fn: Callback to update or create a model instance based on an input.

    Returns:
        The new value of the collection.
    """

    def key(obj: object) -> int | None:
        value = getattr(obj, pk_name)
        return int(value) if value is not None else None

    input_ids = set([key(obj) for obj in inputs if key(obj) is not None])
    models = [m for m in models if key(m) in input_ids]
    model_by_id = {key(m): m for m in models}

    updates: list[tuple[T_input, T_model | None]] = []
    for obj in inputs:
        input_id = key(obj)
        if input_id is None:
            updates.append((obj, None))
        else:
            updates.append((obj, model_by_id[input_id]))
    return [update_fn(obj, m) for obj, m in updates]


def update_scalar(
    input: T_input | None,
    model: T_model | None,
    update_fn: Callable[[T_input, T_model | None], T_model],
) -> T_model | None:
    """
    Update a related object based on an input.

    Args:
        input: Input object or `None`.
        models: The current field value.
        update_fn: Callback to update or create the model instance based on the input.

    Returns:
        The new field value.
    """
    if input:
        return update_fn(input, model) if model else update_fn(input, None)
    else:
        return None


T_bem = TypeVar("T_bem", bound=bem_models.BasisBemerkung)


def _update_bemerkung(
    bemerkung_cls: type[T_bem], bemerkung_data: BemerkungInput, bemerkung: T_bem | None
) -> T_bem:
    """
    Helper function to update a BasisBemerkung field.
    """
    if bemerkung is None:
        bemerkung = bemerkung_cls(bem=bemerkung_data.bem)
    bemerkung.bem = bemerkung_data.bem
    return bemerkung


def update_kompartiment_stoffklassen(
    session: Session,
    ablagerung: vflz_models.Ablagerung,
    data: list[KompartimentStoffklasseInput],
):
    def _update_kompartiment_stoffklasse(
        kksk_data: KompartimentStoffklasseInput,
        kksk: vflz_models.KompartimentStoffklasse | None,
    ) -> vflz_models.KompartimentStoffklasse:
        if kksk is None:
            kksk = vflz_models.KompartimentStoffklasse()

        update_kompartiment_stoffgruppen(
            session, kksk, kksk_data.kompartiment_stoffgruppen
        )
        kksk.stoffklasse = code_models.Stoffklasse.from_db_or_none(
            session, kksk_data.stoffklasse
        )

        set_zeitraum_mit_genauigkeit(session, kksk, kksk_data.zeitraum)
        kksk.teilvol = kksk_data.teilvol
        return kksk

    ablagerung.kompartiment_stoffklassen = update_collection(
        data,
        ablagerung.kompartiment_stoffklassen,
        "kksk_id",
        _update_kompartiment_stoffklasse,
    )


def update_kompartiment_stoffgruppen(
    session: Session,
    kksk: vflz_models.KompartimentStoffklasse,
    data: list[KompartimentStoffgruppeInput],
):
    def _update_kompartiment_stoffgruppe(
        kksg_data: KompartimentStoffgruppeInput,
        kksg: vflz_models.KompartimentStoffgruppe | None,
    ) -> vflz_models.KompartimentStoffgruppe:
        if kksg is None:
            kksg = vflz_models.KompartimentStoffgruppe()

        kksg.stoffgruppe = code_models.StoffgruppeVariante.from_db_or_none(
            session, kksg_data.stoffgruppe
        )
        kksg.teilvol = kksg_data.teilvol
        return kksg

    kksk.kompartiment_stoffgruppen = update_collection(
        data,
        kksk.kompartiment_stoffgruppen,
        "kksg_id",
        _update_kompartiment_stoffgruppe,
    )


def update_ablagerungen(
    session: Session, vflz: vflz_models.Vflz, data: list[AblagerungInput]
):
    def _update_ablagerung(
        ablagerung_data: AblagerungInput, ablagerung: vflz_models.Ablagerung | None
    ) -> vflz_models.Ablagerung:
        if ablagerung is None:
            ablagerung = vflz_models.Ablagerung()

        update_kompartiment_stoffklassen(
            session, ablagerung, ablagerung_data.kompartiment_stoffklassen
        )

        ablagerung.bemerkung = update_scalar(
            ablagerung_data.bemerkung,
            ablagerung.bemerkung,
            partial(_update_bemerkung, bem_models.BemerkungAblagerung),
        )
        ablagerung.bemerkung_datenimport = update_scalar(
            ablagerung_data.bemerkung_datenimport,
            ablagerung.bemerkung_datenimport,
            partial(_update_bemerkung, bem_models.BemerkungDatenimportAblagerung),
        )

        set_zeitraum(ablagerung, ablagerung_data.zeitraum)

        ablagerung.vol_kompartiment = ablagerung_data.vol_kompartiment
        ablagerung.tiefe = ablagerung_data.tiefe

        return ablagerung

    vflz.ablagerungen = update_collection(
        data, vflz.ablagerungen, "inta_id", _update_ablagerung
    )


def update_betrieb_fields(
    session: Session,
    obj: vflz_models.Betrieb | vflz_models.Schiessanlage,
    data: BetriebInput | SchiessanlageInput,
):
    obj.branche_asw = code_models.BrancheASW.from_db_or_none(session, data.branche_asw)
    obj.branche_noga = code_models.BrancheNOGA.from_db_or_none(
        session, data.branche_noga
    )
    obj.beurteilung = code_models.Beurteilung.from_db_or_none(session, data.beurteilung)
    obj.untersuchungs_stand = code_models.UntersuchungsStand.from_db_or_none(
        session, data.untersuchungs_stand
    )
    set_zeitraum_mit_genauigkeit(session, obj, data.zeitraum)

    obj.firma_name = data.firma_name
    obj.firma_strasse = data.firma_strasse
    obj.firma_plz = data.firma_plz
    obj.firma_ort = data.firma_ort
    obj.groesse = data.groesse
    obj.eva = data.eva
    obj.relevant = data.relevant
    obj.mobile_stoffe = data.mobile_stoffe
    if data.zentroid:
        obj.set_zentroid(data.zentroid)


def update_loeschschaum_einsatz(
    session: Session, pfas: vflz_models.PFAS, data: list[LoeschschaumEinsatzInput]
):
    def _update_loeschschaum_einsatz(
        loeschschaum_einsatz_data: LoeschschaumEinsatzInput,
        loeschschaum_einsatz: vflz_models.LoeschschaumEinsatz | None,
    ) -> vflz_models.LoeschschaumEinsatz:
        loeschschaum_einsatz_code = code_models.LoeschschaumEinsatz.from_db(
            session, loeschschaum_einsatz_data.loeschschaum_einsatz
        )
        if loeschschaum_einsatz is None:
            loeschschaum_einsatz = vflz_models.LoeschschaumEinsatz(
                loeschschaum_einsatz=loeschschaum_einsatz_code
            )
        loeschschaum_einsatz.haeufigkeit_nutzung = (
            code_models.HaeufigkeitNutzungVariante.from_db_or_none(
                session, loeschschaum_einsatz_data.haeufigkeit_nutzung
            )
        )
        return loeschschaum_einsatz

    pfas.loeschschaum_einsatz = update_collection(
        data,
        pfas.loeschschaum_einsatz,
        "intp_loeschschaum_einsatz_id",
        _update_loeschschaum_einsatz,
    )


def update_pfas(session: Session, vflz: vflz_models.Vflz, data: list[PFASInput]):
    def _update_pfas(
        pfas_data: PFASInput, pfas: vflz_models.PFAS | None
    ) -> vflz_models.PFAS:
        if pfas is None:
            pfas = vflz_models.PFAS()
        pfas.untersuchungs_stand = code_models.UntersuchungsStand.from_db_or_none(
            session, pfas_data.untersuchungs_stand
        )
        pfas.beurteilung = code_models.Beurteilung.from_db_or_none(
            session, pfas_data.beurteilung
        )
        pfas.branche = code_models.BranchePFAS.from_db_or_none(
            session, pfas_data.branche
        )
        pfas.pfas_typ = code_models.PFASTyp.from_db_or_none(session, pfas_data.pfas_typ)
        pfas.pfas_haltige_loeschmittel = [
            code_models.LoeschmittelPFASHaltig.from_db(session, code)
            for code in pfas_data.pfas_haltige_loeschmittel
        ]
        pfas.pfas_freie_loeschmittel = [
            code_models.LoeschmittelPFASFrei.from_db(session, code)
            for code in pfas_data.pfas_freie_loeschmittel
        ]
        update_loeschschaum_einsatz(session, pfas, pfas_data.loeschschaum_einsatz)

        pfas.bemerkung = update_scalar(
            pfas_data.bemerkung,
            pfas.bemerkung,
            partial(_update_bemerkung, bem_models.BemerkungPFAS),
        )
        pfas.bemerkung_datenimport = update_scalar(
            pfas_data.bemerkung_datenimport,
            pfas.bemerkung_datenimport,
            partial(_update_bemerkung, bem_models.BemerkungDatenimportPFAS),
        )
        pfas.begruendung_bewertung = update_scalar(
            pfas_data.begruendung_bewertung,
            pfas.begruendung_bewertung,
            partial(_update_bemerkung, bem_models.BegruendungBewertungPFAS),
        )

        pfas.name = pfas_data.name
        pfas.strasse = pfas_data.strasse
        pfas.plz = pfas_data.plz
        pfas.ort = pfas_data.ort
        pfas.eva = pfas_data.eva

        set_zeitraum_mit_genauigkeit(session, pfas, pfas_data.zeitraum)
        pfas.pfas_loeschmittel = pfas_data.pfas_loeschmittel
        pfas.relevant = pfas_data.relevant
        pfas.menge_schaumgemisch = pfas_data.menge_schaumgemisch
        pfas.menge_konzentrat = pfas_data.menge_konzentrat
        pfas.beschreibungen_detail = pfas_data.beschreibungen_detail

        if pfas_data.zentroid:
            pfas.set_zentroid(pfas_data.zentroid)
        return pfas

    vflz.pfas = update_collection(data, vflz.pfas, "intp_id", _update_pfas)


def update_betriebe(session: Session, vflz: vflz_models.Vflz, data: list[BetriebInput]):
    def _update_betrieb(
        betrieb_data: BetriebInput, betrieb: vflz_models.Betrieb | None
    ) -> vflz_models.Betrieb:
        if betrieb is None:
            betrieb = vflz_models.Betrieb()
        update_betrieb_fields(session, betrieb, betrieb_data)

        betrieb.bemerkung = update_scalar(
            betrieb_data.bemerkung,
            betrieb.bemerkung,
            partial(_update_bemerkung, bem_models.BemerkungBetrieb),
        )

        betrieb.bemerkung_datenimport = update_scalar(
            betrieb_data.bemerkung_datenimport,
            betrieb.bemerkung_datenimport,
            partial(_update_bemerkung, bem_models.BemerkungDatenimportBetrieb),
        )

        betrieb.begruendung_bewertung = update_scalar(
            betrieb_data.begruendung_bewertung,
            betrieb.begruendung_bewertung,
            partial(_update_bemerkung, bem_models.BegruendungBewertungBetrieb),
        )

        return betrieb

    vflz.betriebe = update_collection(data, vflz.betriebe, "intb_id", _update_betrieb)


def update_kinderspielplaetze_gruenflaechen(
    session: Session,
    vflz: vflz_models.Vflz,
    data: list[KinderspielplatzGruenflaecheInput],
):
    def _update_kinderspielplatz_gruenflaeche(
        kinderspielplatz_data: KinderspielplatzGruenflaecheInput,
        kinderspielplatz: vflz_models.KinderspielplatzGruenflaeche | None,
    ) -> vflz_models.KinderspielplatzGruenflaeche:
        if kinderspielplatz is None:
            kinderspielplatz = vflz_models.KinderspielplatzGruenflaeche()

        kinderspielplatz.kinderspielplatz_gruenflache_typ = (
            code_models.KinderspielplatzGruenflaecheTyp.from_db_or_none(
                session, kinderspielplatz_data.kinderspielplatz_gruenflache_typ
            )
        )
        kinderspielplatz.eigentumsform = code_models.Eigentumsform.from_db_or_none(
            session, kinderspielplatz_data.eigentumsform
        )
        kinderspielplatz.beurteilung = code_models.Beurteilung.from_db_or_none(
            session, kinderspielplatz_data.beurteilung
        )
        kinderspielplatz.untersuchungs_stand = (
            code_models.UntersuchungsStand.from_db_or_none(
                session, kinderspielplatz_data.untersuchungs_stand
            )
        )
        kinderspielplatz.bemerkung = update_scalar(
            kinderspielplatz_data.bemerkung,
            kinderspielplatz.bemerkung,
            partial(
                _update_bemerkung, bem_models.BemerkungKinderspielplatzGruenflaeche
            ),
        )
        kinderspielplatz.bemerkung_datenimport = update_scalar(
            kinderspielplatz_data.bemerkung_datenimport,
            kinderspielplatz.bemerkung_datenimport,
            partial(
                _update_bemerkung,
                bem_models.BemerkungDatenimportKinderspielplatzGruenflaeche,
            ),
        )
        kinderspielplatz.begruendung_bewertung = update_scalar(
            kinderspielplatz_data.begruendung_bewertung,
            kinderspielplatz.begruendung_bewertung,
            partial(
                _update_bemerkung,
                bem_models.BegruendungBewertungKinderspielplatzGruenflaeche,
            ),
        )
        kinderspielplatz.altersstufen_kinder = [
            code_models.AltersstufeKinder.from_db(session, code)
            for code in kinderspielplatz_data.altersstufen_kinder
        ]
        kinderspielplatz.name = kinderspielplatz_data.name
        kinderspielplatz.strasse = kinderspielplatz_data.strasse
        kinderspielplatz.plz = kinderspielplatz_data.plz
        kinderspielplatz.ort = kinderspielplatz_data.ort
        kinderspielplatz.eva = kinderspielplatz_data.eva

        set_zeitraum_mit_genauigkeit(
            session, kinderspielplatz, kinderspielplatz_data.zeitraum
        )

        kinderspielplatz.relevant = kinderspielplatz_data.relevant
        kinderspielplatz.belastung_ueber_sanierungswert = (
            kinderspielplatz_data.belastung_ueber_sanierungswert
        )
        if kinderspielplatz_data.zentroid:
            kinderspielplatz.set_zentroid(kinderspielplatz_data.zentroid)
        return kinderspielplatz

    vflz.kinderspielplaetze_gruenflaechen = update_collection(
        data,
        vflz.kinderspielplaetze_gruenflaechen,
        "intk_id",
        _update_kinderspielplatz_gruenflaeche,
    )


def update_schiessanlagen(
    session: Session, vflz: vflz_models.Vflz, data: list[SchiessanlageInput]
):
    def _update_schiessanlage(
        schiessanlage_data: SchiessanlageInput,
        schiessanlage: vflz_models.Schiessanlage | None,
    ) -> vflz_models.Schiessanlage:
        if schiessanlage is None:
            schiessanlage = vflz_models.Schiessanlage()
        update_betrieb_fields(session, schiessanlage, schiessanlage_data)

        schiessanlage.bemerkung = update_scalar(
            schiessanlage_data.bemerkung,
            schiessanlage.bemerkung,
            partial(_update_bemerkung, bem_models.BemerkungBetrieb),
        )
        schiessanlage.bemerkung_datenimport = update_scalar(
            schiessanlage_data.bemerkung_datenimport,
            schiessanlage.bemerkung_datenimport,
            partial(_update_bemerkung, bem_models.BemerkungDatenimportSchiessanlage),
        )
        schiessanlage.begruendung_bewertung = update_scalar(
            schiessanlage_data.begruendung_bewertung,
            schiessanlage.begruendung_bewertung,
            partial(_update_bemerkung, bem_models.BegruendungBewertungBetrieb),
        )

        schiessanlage.typ = code_models.SchiessanlageTyp.from_db_or_none(
            session, schiessanlage_data.typ
        )

        schiessanlage.schusszahl = schiessanlage_data.schusszahl
        schiessanlage.scheibenzahl = schiessanlage_data.scheibenzahl
        schiessanlage.hat_kugelfang = schiessanlage_data.hat_kugelfang
        return schiessanlage

    vflz.schiessanlagen = update_collection(
        data, vflz.schiessanlagen, "intb_id", _update_schiessanlage
    )


def update_unfallstoffe(
    session: Session, unfall: vflz_models.Unfall, data: list[UnfallstoffInput]
):
    def _update_unfallstoffe(
        unfallstoff_data: UnfallstoffInput, unfallstoff: vflz_models.Unfallstoff | None
    ) -> vflz_models.Unfallstoff:
        if unfallstoff is None:
            unfallstoff = vflz_models.Unfallstoff()
        unfallstoff.stoff = code_models.Stoff.from_db_or_none(
            session, unfallstoff_data.stoff
        )

        unfallstoff.stoffmng = unfallstoff_data.stoffmng
        unfallstoff.ausgelaufen = unfallstoff_data.ausgelaufen
        unfallstoff.zurueckgewonnen = unfallstoff_data.zurueckgewonnen
        return unfallstoff

    unfall.unfallstoffe = update_collection(
        data, unfall.unfallstoffe, "inum_id", _update_unfallstoffe
    )


def update_unfaelle(session: Session, vflz: vflz_models.Vflz, data: list[UnfallInput]):
    def _update_unfaelle(
        unfall_data: UnfallInput, unfall: vflz_models.Unfall | None
    ) -> vflz_models.Unfall:
        if unfall is None:
            unfall = vflz_models.Unfall()
        update_unfallstoffe(session, unfall, unfall_data.unfallstoffe)

        unfall.bemerkung = update_scalar(
            unfall_data.bemerkung,
            unfall.bemerkung,
            partial(_update_bemerkung, bem_models.BemerkungUnfall),
        )
        unfall.bemerkung_datenimport = update_scalar(
            unfall_data.bemerkung_datenimport,
            unfall.bemerkung_datenimport,
            partial(_update_bemerkung, bem_models.BemerkungDatenimportUnfall),
        )

        unfall.genauigkeit_zeitpunkt = code_models.Genauigkeit.from_db_or_none(
            session, unfall_data.genauigkeit_zeitpunkt
        )
        unfall.zeitpunkt = unfall_data.zeitpunkt
        unfall.name = unfall_data.name
        unfall.zeitpunkt_jahr = (
            unfall_data.zeitpunktjahr
            if unfall_data.zeitpunktjahr is not None
            else False
        )
        return unfall

    vflz.unfaelle = update_collection(data, vflz.unfaelle, "intu_id", _update_unfaelle)


def update_nutzungen_boden(
    session: Session,
    vflz: vflz_models.Vflz,
    data: list[umwelt_types.NutzungBodenInput],
):
    def _update_nutzung_boden(
        nutzung_boden_data: umwelt_types.NutzungBodenInput,
        nutzung_boden: umwelt_models.NutzungBoden | None,
    ) -> umwelt_models.NutzungBoden:
        if nutzung_boden is None:
            nutzung_boden = umwelt_models.NutzungBoden()

        nutzung_boden.nutzungsart = code_models.Flaechennutzung.from_db_or_none(
            session, nutzung_boden_data.nutzungsart
        )
        nutzung_boden.aktuelle_nutzung = (
            code_models.FlaechennutzungVariante.from_db_or_none(
                session, nutzung_boden_data.aktuelle_nutzung
            )
        )
        return nutzung_boden

    vflz.nutzungen_boden = update_collection(
        data, vflz.nutzungen_boden, "nubo_id", _update_nutzung_boden
    )


def update_grundwasser(
    session: Session,
    vflz: vflz_models.Vflz,
    data: list[umwelt_types.GrundwasserInput],
):
    def _update_grundwasser(
        grundwasser_data: umwelt_types.GrundwasserInput,
        grundwasser: umwelt_models.Grundwasser | None,
    ) -> umwelt_models.Grundwasser:
        if grundwasser is None:
            grundwasser = umwelt_models.Grundwasser()
        grundwasser.relative_lage = code_models.RelativeLageGrundwasser.from_db_or_none(
            session, grundwasser_data.relative_lage
        )
        grundwasser.flurabstand = grundwasser_data.flurabstand
        grundwasser.nutzung = code_models.NutzungGrundwasserAbstrom.from_db_or_none(
            session, grundwasser_data.nutzung
        )
        grundwasser.distanz = grundwasser_data.distanz
        return grundwasser

    vflz.grundwasser = update_collection(
        data, vflz.grundwasser, "gwas_id", _update_grundwasser
    )


def update_oberflaechen_gewaser(
    session: Session,
    vflz: vflz_models.Vflz,
    data: list[umwelt_types.OberflaechenGewaesserInput],
):
    def _update_ogw(
        ogw_data: umwelt_types.OberflaechenGewaesserInput,
        ogw: umwelt_models.OberflaechenGewaesser | None,
    ) -> umwelt_models.OberflaechenGewaesser:
        if ogw is None:
            ogw = umwelt_models.OberflaechenGewaesser()
        ogw.art_gewaesser = code_models.GewaesserArt.from_db_or_none(
            session, ogw_data.art_gewaesser
        )
        ogw.bau_gewaesser = code_models.GewaesserBau.from_db_or_none(
            session, ogw_data.bau_gewaesser
        )
        ogw.relative_lage = (
            code_models.RelativeLageOberflaechenGewaesser.from_db_or_none(
                session, ogw_data.relative_lage
            )
        )
        ogw.distanz = ogw_data.distanz
        ogw.name = ogw_data.name
        return ogw

    vflz.oberflaechen_gewaesser = update_collection(
        data, vflz.oberflaechen_gewaesser, "ogw_id", _update_ogw
    )


def update_vollzug(session: Session, vflz: vflz_models.Vflz, data: list[VollzugInput]):
    def _update_vollzug(
        vollzug_data: VollzugInput, vollzug: vflz_models.Vollzug | None
    ) -> vflz_models.Vollzug:
        behoerde = code_models.BehoerdenKuerzel.from_db(session, vollzug_data.behoerde)
        if vollzug is None:
            vollzug = vflz_models.Vollzug(
                behoerde=behoerde,
                combined_id=vollzug_data.combined_id,
            )
        vollzug.combined_id = vollzug_data.combined_id
        vollzug.behoerde = behoerde
        vollzug.aktiv = vollzug_data.aktiv
        return vollzug

    vflz.vollzug = update_collection(data, vflz.vollzug, "vflnr_id", _update_vollzug)


def update_umweltstoffe(
    session: Session, vflz: vflz_models.Vflz, data: list[umwelt_types.UmweltStoffInput]
):
    def _update_umweltstoff(
        umwelt_stoff_data: umwelt_types.UmweltStoffInput,
        umwelt_stoff: umwelt_models.UmweltStoff | None,
    ) -> umwelt_models.UmweltStoff:
        if umwelt_stoff is None:
            umwelt_stoff = umwelt_models.UmweltStoff()
        umwelt_stoff.gefaehrdete_bereiche = (
            code_models.GefaehrdeteUmweltbereiche.from_db_or_none(
                session, umwelt_stoff_data.gefaehrdete_bereiche
            )
        )
        umwelt_stoff.stoff_gruppe = code_models.UmweltStoffgruppe.from_db_or_none(
            session, umwelt_stoff_data.stoff_gruppe
        )
        umwelt_stoff.stoff = code_models.UmweltStoffgruppeVariante.from_db_or_none(
            session, umwelt_stoff_data.stoff
        )
        umwelt_stoff.beurteilung = code_models.UmweltStoffBeurteilung.from_db_or_none(
            session, umwelt_stoff_data.beurteilung
        )
        return umwelt_stoff

    vflz.umwelt_stoffe = update_collection(
        data, vflz.umwelt_stoffe, "stoffe_id", _update_umweltstoff
    )


def update_einzelereignisse(
    session: Session,
    vflz: vflz_models.Vflz,
    data: list[umwelt_types.EinzelereignisInput],
):
    def _update_einzelereignis(
        einzelereignis_data: umwelt_types.EinzelereignisInput,
        einzelereignis: umwelt_models.Einzelereignis | None,
    ) -> umwelt_models.Einzelereignis:
        if einzelereignis is None:
            einzelereignis = umwelt_models.Einzelereignis()

        einzelereignis.bemerkung = update_scalar(
            einzelereignis_data.bemerkung,
            einzelereignis.bemerkung,
            partial(_update_bemerkung, bem_models.BemerkungEinzelereignis),
        )

        einzelereignis.einzelereignis = code_models.Einzelereignis.from_db_or_none(
            session, einzelereignis_data.einzelereignis
        )
        einzelereignis.datum = einzelereignis_data.datum
        return einzelereignis

    vflz.einzelereignisse = update_collection(
        data, vflz.einzelereignisse, "veen_id", _update_einzelereignis
    )


def update_umweltschaden(
    session: Session,
    vflz: vflz_models.Vflz,
    data: list[umwelt_types.UmweltschadenInput],
):
    def _update_umweltschaden(
        umweltschaden_data: umwelt_types.UmweltschadenInput,
        umweltschaden: umwelt_models.Umweltschaden | None,
    ) -> umwelt_models.Umweltschaden:
        if umweltschaden is None:
            umweltschaden = umwelt_models.Umweltschaden()

        umweltschaden.bemerkung = update_scalar(
            umweltschaden_data.bemerkung,
            umweltschaden.bemerkung,
            partial(_update_bemerkung, bem_models.BemerkungUmweltschaden),
        )

        umweltschaden.art_schaden = code_models.Umweltbereich.from_db_or_none(
            session, umweltschaden_data.art_schaden
        )
        umweltschaden.schaeden = code_models.UmweltschaedenVariante.from_db_or_none(
            session, umweltschaden_data.schaeden
        )
        return umweltschaden

    vflz.umweltschaeden = update_collection(
        data, vflz.umweltschaeden, "vfus_id", _update_umweltschaden
    )


def update_massnahmen(
    session: Session, vflz: vflz_models.Vflz, data: list[MassnahmeInput]
):
    def _update_massnahme(
        massnahme_data: MassnahmeInput, massnahme: vflz_models.Massnahme | None
    ) -> vflz_models.Massnahme:
        if massnahme is None:
            massnahme = vflz_models.Massnahme()
        massnahme.massnahme = code_models.Massnahme.from_db_or_none(
            session, massnahme_data.massnahme
        )

        massnahme.bemerkung = update_scalar(
            massnahme_data.bemerkung,
            massnahme.bemerkung,
            partial(_update_bemerkung, bem_models.BemerkungMassnahme),
        )

        massnahme.dat_massnahme = massnahme_data.dat_massnahme
        massnahme.ang_massnahme = massnahme_data.ang_massnahme
        return massnahme

    vflz.massnahmen = update_collection(
        data, vflz.massnahmen, "mass_id", _update_massnahme
    )


def update_sanierungsziele(
    session: Session, vflz: vflz_models.Vflz, data: list[SanierungszielInput]
):
    def _update_sanierungsziel(
        sanierungsziel_data: SanierungszielInput,
        sanierungsziel: vflz_models.Sanierungsziel | None,
    ) -> vflz_models.Sanierungsziel:
        if sanierungsziel is None:
            sanierungsziel = vflz_models.Sanierungsziel()
        sanierungsziel.sanierungsziel = code_models.Sanierungsziel.from_db_or_none(
            session, sanierungsziel_data.sanierungsziel
        )

        sanierungsziel.bemerkung = update_scalar(
            sanierungsziel_data.bemerkung,
            sanierungsziel.bemerkung,
            partial(_update_bemerkung, bem_models.BemerkungSanierung),
        )

        return sanierungsziel

    vflz.sanierungsziele = update_collection(
        data, vflz.sanierungsziele, "sani_id", _update_sanierungsziel
    )


def update_beurteilung(
    session: Session, vflz: vflz_models.Vflz, data: BeurteilungInput | None
):
    def _update_beurteilung(
        beurteilung_data: BeurteilungInput, beurteilung: vflz_models.Beurteilung | None
    ) -> vflz_models.Beurteilung:
        if beurteilung is None:
            beurteilung = vflz_models.Beurteilung()
        beurteilung.beurteilung = code_models.Beurteilung.from_db_or_none(
            session, beurteilung_data.beurteilung
        )
        beurteilung.prio_untersuch = code_models.PrioUntersuchung.from_db_or_none(
            session, beurteilung_data.prio_untersuch
        )
        beurteilung.prio_sanier = code_models.PrioSanierung.from_db_or_none(
            session, beurteilung_data.prio_sanier
        )
        return beurteilung

    vflz.beurteilung = update_scalar(data, vflz.beurteilung, _update_beurteilung)


def update_kontakte(
    session: Session, subj: subj_models.Subjekt, data: list[KontaktInput]
):
    def _update_kontakt(
        kontakt_data: KontaktInput, kontakt: subj_models.Kontakt | None
    ) -> subj_models.Kontakt:
        if kontakt is None:
            kontakt = subj_models.Kontakt()
        kontakt.kontakt_typ = code_models.KontaktTyp.from_db(
            session, kontakt_data.kontakt_typ
        )
        kontakt.kontakt = kontakt_data.kontakt
        return kontakt

    subj.kontakte = update_collection(
        data, subj.kontakte, "kontakt_id", _update_kontakt
    )


def update_gemeinde(
    session: Session, vflz: vflz_models.Vflz, data: GemeindeInput | None
):
    if data:
        gemeinde = session.get_one(gem_models.Gemeinde, int(data.h_gem_id))
        vflz.gemeinde = gemeinde


def update_flugplatz(session: Session, vflz: vflz_models.Vflz, data: CodeInput | None):
    if data:
        bezeichnug_code = code_models.FlugplatzBezeichnung.from_db(session, data)
        vflz.flugplatz = session.scalars(
            select(fp_models.Flugplatz).where(
                fp_models.Flugplatz.bezeichnung == bezeichnug_code
            )
        ).one()
    else:
        vflz.flugplatz = None


def geom_change_triggers_historization(
    session: Session, vflz: vflz_models.Vflz, new_geom: dict[str, Any]
) -> bool:
    if new_geom and not vflz.vflgeo:
        return True

    new_geom_area = shapely.from_geojson(  # type: ignore[reportUnknownMemberType]
        geometry=json.dumps(new_geom)
    ).area

    vflz_geom_area = shapely.from_geojson(vflz.vflgeo.wkb_geometry_geojson).area  # type: ignore[reportUnknownMemberType]
    return abs(new_geom_area - vflz_geom_area) > 25


def is_valid_geometry(session: Session, geometry: GeoJSONPointOrMultiPolygon) -> bool:
    geom_is_valid = cast(
        bool,
        session.execute(
            select(
                functions.ST_IsValid(functions.ST_GeomFromGeoJSON(json.dumps(geometry)))
            )  # type: ignore
        ).scalar_one(),
    )
    return geom_is_valid


def update_subjekt(
    session: Session,
    subj: subj_models.Subjekt,
    data: UpdateSubjektInput | CreateSubjektInput,
):
    subj.name = data.name if data.name else ""
    subj.vorname = data.vorname if data.vorname else ""
    subj.taetigkeit = data.taetigkeit if data.taetigkeit else ""
    subj.kuerzel = data.kuerzel
    subj.kategorien = [
        code_models.SubjektKategorie.from_db(session, code) for code in data.kategorien
    ]
    subj.ort = data.ort if data.ort else ""
    subj.postleitzahl = data.postleitzahl if data.postleitzahl else ""
    subj.strasse = data.strasse if data.strasse else ""
    subj.anrede = (
        code_models.Anrede.from_db(session, data.anrede) if data.anrede else None
    )
    subj.land = code_models.Land.from_db(session, data.land) if data.land else None

    subj.bemerkung = update_scalar(
        data.bemerkung,
        subj.bemerkung,
        partial(_update_bemerkung, bem_models.BemerkungSubjekt),
    )

    update_kontakte(session, subj, data.kontakte)


def create_beteiligter(
    session: Session,
    data: CreateBeteiligterInput,
) -> subj_models.BeteiligterStandort:
    query = select(subj_models.Beteiligter).where(
        subj_models.Beteiligter.vflz_id == int(data.vflz_id),
        subj_models.Beteiligter.subj_id == int(data.subj_id),
    )
    beteiligter = session.scalars(query).one_or_none()
    # FIXME restrict to specific code list?
    beziehungsart_code = code_models.BeziehungsartVariante.from_db(
        session, data.beziehungsart
    )
    if not beteiligter:
        beteiligter = subj_models.Beteiligter()
        beteiligter.vflz_id = int(data.vflz_id)
        beteiligter.subj_id = int(data.subj_id)
        session.add(beteiligter)

    beteiligter_standort = subj_models.BeteiligterStandort(
        beziehungsart=beziehungsart_code
    )
    if data.grun_id:
        parzelle = session.get_one(grun_models.Parzelle, data.grun_id)
        beteiligter_standort.parzelle = parzelle

    beteiligter_standort.beteiligter = beteiligter
    session.add(beteiligter_standort)
    return beteiligter_standort


def get_or_create_beteiligter(
    session: Session, vflz: vflz_models.Vflz, subj: subj_models.Subjekt
) -> subj_models.Beteiligter:
    bet = session.scalars(
        select(subj_models.Beteiligter).where(
            subj_models.Beteiligter.vflz_id == vflz.vflz_id,
            subj_models.Beteiligter.subj_id == subj.subj_id,
        )
    ).one_or_none()
    if bet is None:
        bet = subj_models.Beteiligter()
        bet.subjekt = subj
        bet.vflz_id = vflz.vflz_id
        session.add(bet)
        session.flush()  # make sure bet_id is populated
    return bet


def update_sachbearbeitung(
    session: Session, vflz: vflz_models.Vflz, data: list[SachbearbeitungInput]
):
    code_sachbearbeitung = session.scalars(
        select(code_models.BeziehungsartSachbearbeitung).where(
            code_models.BeziehungsartSachbearbeitung.code == "sachbearbeitung"
        )
    ).one()
    existing_sachbearbeitung = session.scalars(
        select(subj_models.BeteiligterStandort)
        .join(subj_models.Beteiligter)
        .where(
            subj_models.Beteiligter.vflz_id == vflz.vflz_id,
            subj_models.BeteiligterStandort.h_bez_art
            == CodeListe.BeziehungsartSachbearbeitung,
        )
    ).all()
    existing_sachbearbeitung_by_id = {
        sb.bet_art_id: sb for sb in existing_sachbearbeitung
    }
    bet_art_ids = {int(obj.bet_art_id) for obj in data if obj.bet_art_id is not None}
    sachbearbeitung_to_delete = [
        sb for sb in existing_sachbearbeitung if sb.bet_art_id not in bet_art_ids
    ]
    for sb in sachbearbeitung_to_delete:
        session.delete(sb)
        update_beteiligter(session, sb.beteiligter)

    # Update subjekt
    for sb in data:
        if sb.bet_art_id:
            instance = existing_sachbearbeitung_by_id[int(sb.bet_art_id)]
            if sb.subj_id != instance.beteiligter.subj_id:
                subj = session.get_one(subj_models.Subjekt, sb.subj_id)
                instance.beteiligter = get_or_create_beteiligter(session, vflz, subj)
                update_beteiligter(session, instance.beteiligter)

    new_sachbearbeitung = [obj for obj in data if obj.bet_art_id is None]
    for sb in new_sachbearbeitung:
        subj = session.get_one(subj_models.Subjekt, sb.subj_id)
        if not subj.user:
            raise ValueError(
                "Subjekt can not be added as Sachbearbeitung since it is not associated with a user account: {subj}"
            )
        bet = get_or_create_beteiligter(session, vflz, subj)
        sb = subj_models.BeteiligterStandort(beziehungsart=code_sachbearbeitung)
        sb.beteiligter = bet
        session.add(sb)
        update_beteiligter(session, bet)


def update_sonstige_beteiligte(
    session: Session, vflz: vflz_models.Vflz, data: list[BeteiligterStandortInput]
):
    existing_beteiligte = session.scalars(
        select(subj_models.BeteiligterStandort)
        .join(subj_models.Beteiligter)
        .where(
            subj_models.Beteiligter.vflz_id == vflz.vflz_id,
            subj_models.BeteiligterStandort.h_bez_art
            == CodeListe.BeziehungsartSonstige,
        )
    ).all()
    existing_beteiligte_by_id = {sb.bet_art_id: sb for sb in existing_beteiligte}
    bet_art_ids = {int(obj.bet_art_id) for obj in data if obj.bet_art_id is not None}
    beteiligte_to_delete = [
        sb for sb in existing_beteiligte if sb.bet_art_id not in bet_art_ids
    ]
    for sb in beteiligte_to_delete:
        session.delete(sb)
        update_beteiligter(session, sb.beteiligter)

    # Update beziehungsart and/or subjekt
    for sb in data:
        if sb.bet_art_id:
            instance = existing_beteiligte_by_id[int(sb.bet_art_id)]
            instance.beziehungsart = code_models.BeziehungsartSonstige.from_db(
                session, sb.beziehungsart
            )
            if sb.subj_id != instance.beteiligter.subj_id:
                subj = session.get_one(subj_models.Subjekt, sb.subj_id)
                instance.beteiligter = get_or_create_beteiligter(session, vflz, subj)
                update_beteiligter(session, instance.beteiligter)

    new_beteiligte = [obj for obj in data if obj.bet_art_id is None]
    for sb in new_beteiligte:
        code_beziehungsart = code_models.BeziehungsartSonstige.from_db(
            session, sb.beziehungsart
        )
        subj = session.get_one(subj_models.Subjekt, sb.subj_id)
        bet = get_or_create_beteiligter(session, vflz, subj)
        sb = subj_models.BeteiligterStandort(beziehungsart=code_beziehungsart)
        sb.beteiligter = bet
        session.add(sb)
        update_beteiligter(session, bet)


def update_eigentum(
    session: Session, vflz: vflz_models.Vflz, data: list[EigentumInput]
) -> list[Problem]:
    prev_eigentum = get_eigentum(session, vflz.vflz_id)
    eigentum_input: list[EigentumInput] = []
    problems: list[Problem] = []

    # Ungroup eigentum inputs to contain only one parzelle per row
    for i_eigentum, obj in enumerate(data):
        for i_parzelle, parzelle in enumerate(obj.parzellen):
            if not parzelle.strip():  # Empty input
                problems.append(
                    Problem(
                        message="Parzelle value can not be empty",
                        problem_code=ProblemCode.VALIDATION,
                        field=f"eigentum[{i_eigentum}].parzellen[{i_parzelle}]",
                    )
                )
                continue
            eigentum_input.append(dataclasses.replace(obj, parzellen=[parzelle]))

    # TODO define valid row transitions (must be enforced by frontend):
    # - add parzelle:
    #   from: status fehlend
    #   to: status zugeordnet, all fields must be set (h_nb_id may be null,
    #       but must not be changed)
    # TODO Add query for valid gemeinde/h_nb_id combinations given a vflz_id
    # (requires that we have geometries for both)

    prev_eigentum_by_parzelle: dict[EigentumKey, Eigentum] = {}
    for eigentum in prev_eigentum:
        [parzelle] = eigentum.parzellen
        key = EigentumKey(
            subj_id=int(eigentum.subjekt.subj_id) if eigentum.subjekt else None,
            beziehungsart=str(eigentum.beziehungsart)
            if eigentum.beziehungsart
            else None,
            h_gem_id=int(eigentum.gemeinde.h_gem_id) if eigentum.gemeinde else None,
            h_nb_id=eigentum.nummerierungsbereich.h_nb_id
            if eigentum.nummerierungsbereich
            else None,
            gb_nummer=parzelle,
        )
        prev_eigentum_by_parzelle[key] = eigentum

    new_eigentum_by_parzelle: dict[EigentumKey, tuple[int, EigentumInput]] = {}
    for i, obj in enumerate(eigentum_input):
        [parzelle] = obj.parzellen
        key = EigentumKey(
            subj_id=int(obj.subj_id) if obj.subj_id else None,
            beziehungsart=str(obj.beziehungsart) if obj.beziehungsart else None,
            h_gem_id=int(obj.h_gem_id) if obj.h_gem_id else None,
            h_nb_id=obj.h_nb_id,
            gb_nummer=parzelle,
        )
        new_eigentum_by_parzelle[key] = (i, obj)

    # FIXME idx will be wrong because eigentum has already been ungrouped!
    for key, (idx, obj) in new_eigentum_by_parzelle.items():
        match obj.status:
            case EigentumStatus.ZUGEORDNET | EigentumStatus.UEBERZAEHLIG:
                if (
                    key not in prev_eigentum_by_parzelle
                    or prev_eigentum_by_parzelle[key].status is EigentumStatus.FEHLEND
                ):
                    # validate input
                    if not obj.subj_id:
                        problems.append(
                            Problem(
                                message="SubjId is required for EigentumStatus.ZUGEORDNET",
                                problem_code=ProblemCode.VALIDATION,
                                field=f"eigentum[{idx}].subjId",
                            )
                        )
                        continue
                    if not obj.beziehungsart:
                        problems.append(
                            Problem(
                                message="beziehungsart is required for EigentumStatus.ZUGEORDNET",
                                problem_code=ProblemCode.VALIDATION,
                                field=f"eigentum[{idx}].beziehungsart",
                            )
                        )
                        continue
                else:
                    continue

                # Create new association between subj and parzelle, update bet if required
                subj = session.get_one(subj_models.Subjekt, obj.subj_id)
                bez_art = code_models.BeziehungsartEigentum.from_db(
                    session, obj.beziehungsart
                )
                parzelle = grun_models.get_or_create_parzelle(
                    session, key.to_parzelle_key()
                )
                bet = get_or_create_beteiligter(session, vflz, subj)
                eigentuemer = subj_models.BeteiligterStandort(beziehungsart=bez_art)
                eigentuemer.beteiligter = bet
                eigentuemer.parzelle = parzelle
                session.add(eigentuemer)

                update_beteiligter(session, bet)
            case _:
                pass

    # handle removed entries
    for key, eigentum in prev_eigentum_by_parzelle.items():
        match eigentum.status:
            case EigentumStatus.ZUGEORDNET | EigentumStatus.UEBERZAEHLIG:
                if key not in new_eigentum_by_parzelle:
                    assert eigentum.subjekt
                    bet = session.scalars(
                        select(subj_models.Beteiligter).where(
                            subj_models.Beteiligter.vflz_id == vflz.vflz_id,
                            subj_models.Beteiligter.subj_id
                            == int(eigentum.subjekt.subj_id),
                        )
                    ).one()
                    parzelle = grun_models.get_parzelle(session, key.to_parzelle_key())
                    assert parzelle
                    assert key.beziehungsart
                    bez_art_code = code_models.BeziehungsartEigentum.from_db(
                        session, key.beziehungsart
                    )
                    eigentuemer = session.scalars(
                        select(subj_models.BeteiligterStandort).where(
                            subj_models.BeteiligterStandort.bet_id == bet.bet_id,
                            subj_models.BeteiligterStandort.grun_id == parzelle.grun_id,
                            subj_models.BeteiligterStandort.beziehungsart
                            == bez_art_code,
                        )
                    ).one()
                    session.delete(eigentuemer)
                    update_beteiligter(session, bet)
            case _:
                pass

    return problems


def update_beteiligter(session: Session, beteiligter: subj_models.Beteiligter):
    beteiligte_standort = session.scalars(
        select(subj_models.BeteiligterStandort).where(
            subj_models.BeteiligterStandort.bet_id == beteiligter.bet_id
        )
    ).all()

    if not beteiligte_standort:
        session.delete(beteiligter)
    else:
        beteiligter.is_sachbearbeiter = any(
            bs.h_bez_art == CodeListe.BeziehungsartSachbearbeitung
            for bs in beteiligte_standort
        )
        beteiligter.is_eigentuemer = any(
            bs.h_bez_art == CodeListe.BeziehungsartEigentum
            for bs in beteiligte_standort
        )


def update_sachbearbeitung_task(
    session: Session,
    node: wf_models.Node,
    data: list[BeteiligterGeschaeftInput],
):
    existing_sachbearbeitung = session.scalars(
        select(alma_wf_models.BeteiligterGeschaeft).where(
            alma_wf_models.BeteiligterGeschaeft.wf_node_id == node.wf_node_id,
            alma_wf_models.BeteiligterGeschaeft.h_bez_art
            == CodeListe.BeziehungsartSachbearbeitung,
        )
    ).all()

    bet_task_ids = {int(sb.bet_task_id) for sb in data if sb.bet_task_id is not None}

    for sb in existing_sachbearbeitung:
        if sb.bet_task_id not in bet_task_ids:
            session.delete(sb)

    for sb in data:
        if sb.bet_task_id is None:
            subj = session.get_one(subj_models.Subjekt, sb.subj_id)
            vflz = session.get_one(vflz_models.Vflz, int(node.entity_id))
            code_sachbearbeitung = session.scalars(
                select(code_models.BeziehungsartSachbearbeitung).where(
                    code_models.BeziehungsartSachbearbeitung.code == "sachbearbeitung"
                )
            ).one()
            new_sb = alma_wf_models.BeteiligterGeschaeft(
                vfl_id=vflz.vfl_id,
                subjekt=subj,
                node=node,
                beziehungsart=code_sachbearbeitung,
            )
            session.add(new_sb)


def update_sonstige_beteiligte_task(
    session: Session,
    node: wf_models.Node,
    data: list[BeteiligterGeschaeftInput],
):
    existing_beteiligte = session.scalars(
        select(alma_wf_models.BeteiligterGeschaeft).where(
            alma_wf_models.BeteiligterGeschaeft.wf_node_id == node.wf_node_id,
            alma_wf_models.BeteiligterGeschaeft.h_bez_art
            == CodeListe.BeziehungsartGeschaefte,
        )
    ).all()

    bet_task_ids = {int(b.bet_task_id) for b in data if b.bet_task_id is not None}

    for b in existing_beteiligte:
        if b.bet_task_id not in bet_task_ids:
            session.delete(b)

    for b in data:
        if b.bet_task_id is None:
            subj = session.get_one(subj_models.Subjekt, b.subj_id)
            vflz = session.get_one(vflz_models.Vflz, int(node.entity_id))
            code_beziehungsart_geschaefte = session.scalars(
                select(code_models.BeziehungsartGeschaefte).where(
                    code_models.BeziehungsartGeschaefte.code == "geschaefte"
                )
            ).one()
            new_sb = alma_wf_models.BeteiligterGeschaeft(
                vfl_id=vflz.vfl_id,
                subjekt=subj,
                node=node,
                beziehungsart=code_beziehungsart_geschaefte,
            )
            session.add(new_sb)


def update_node_kategorie(
    session: Session,
    node: wf_models.NoteNode | wf_models.DocumentNode,
    data: CodeInput | None,
):
    def _update_node_kategorie(
        node_kategorie_data: CodeInput,
        node_kategorie: alma_wf_models.NodeKategorie | None,
    ) -> alma_wf_models.NodeKategorie:
        kategorie_code = code_models.TaskKategorie.from_db(session, node_kategorie_data)
        if node_kategorie is None:
            node_kategorie = alma_wf_models.NodeKategorie()
        node_kategorie.kategorie = kategorie_code
        return node_kategorie

    node.kategorie = update_scalar(data, node.kategorie, _update_node_kategorie)  # pyright: ignore


def enforce_read_only(session: Session, vflz: vflz_models.Vflz):
    if vflz_models.is_read_only(session, vflz):
        raise error_class(error_message)


def enqueue_vflz_datasheet_update(vflz: vflz_models.Vflz):
    with alma.task_queue.open_client(), contextlib.suppress(AlreadyEnqueued):
        if not settings.report_export_settings.report_id:
            logger.warning(
                "Requested to update report for vflz with id %s, but no report id provided. Doing nothing.",
                vflz.vflz_id,
            )
            return
        alma.task_queue.tasks.update_report.configure(
            schedule_in={
                "hours": settings.report_export_settings.delay_in_hours,
            },
            queueing_lock=f"update_report_vflz_{vflz.vflz_id}",
        ).defer(vflz_id=vflz.vflz_id)


@strawberry.type
class Mutation:
    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_USER)]
    )
    def create_user(self, info: Info, data: CreateUserInput) -> User | ProblemGroup:
        session = info.context.db

        email_exists = (
            session.scalars(
                select(auth_models.User).where(auth_models.User.email == data.email)
            ).one_or_none()
            is not None
        )
        if email_exists:
            return ProblemGroup(
                problems=[
                    Problem(
                        message="User with email already exists.",
                        problem_code=ProblemCode.EXISTS,
                        field="email",
                    )
                ]
            )

        with info.context.keycloak_maker() as kc:
            user = auth_models.User.create(
                db=session,
                keycloak_client=kc,
                username=data.email,
                email=data.email,
                first_name=data.first_name,
                last_name=data.last_name,
                role_name=data.role_name,
                password=data.password,
            )
        user.is_sachbearbeitung = data.is_sachbearbeitung
        _assign_default_saved_searches(session, user)
        user.assign_initial_settings()

        subj = subj_models.Subjekt()
        subj.name = data.last_name
        subj.vorname = data.first_name
        subj.user = user
        session.add(subj)
        session.commit()
        return User.from_db(user)

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_USER)]
    )
    def update_user(self, info: Info, data: UpdateUserInput) -> User | ProblemGroup:
        """Update email and role of a user

        Users without role will not be able to access the graphql api.
        """
        session = info.context.db

        email_exists = (
            session.scalars(
                select(auth_models.User).where(
                    auth_models.User.email == data.email,
                    auth_models.User.id != int(data.id),
                )
            ).one_or_none()
            is not None
        )
        if email_exists:
            return ProblemGroup(
                problems=[
                    Problem(
                        message="User with email already exists.",
                        problem_code=ProblemCode.EXISTS,
                        field="email",
                    )
                ]
            )

        user = session.get_one(auth_models.User, int(data.id))
        with info.context.keycloak_maker() as kc:
            user.update(
                keycloak_client=kc,
                db=session,
                role_name=(
                    data.role_name
                    if data.role_name is not strawberry.UNSET
                    else (user.role.name if user.role else None)
                ),
                email=data.email,
                first_name=data.first_name,
                last_name=data.last_name,
            )
        logger.info("User %s updated by %s", user, info.context.user)
        user.is_sachbearbeitung = data.is_sachbearbeitung
        session.commit()
        return User.from_db(user)

    @strawberry.mutation()
    def update_current_user(
        self, info: Info, data: UpdateCurrentUserInput
    ) -> User | ProblemGroup:
        session = info.context.db
        user = info.context.user

        with info.context.keycloak_maker() as kc:
            user.update(
                keycloak_client=kc,
                db=info.context.db,
                role_name=user.role.name if user.role else None,
                email=user.email,
                first_name=data.first_name,
                last_name=data.last_name,
            )
        logger.info("User %s updated by themselves", user)
        session.commit()
        return User.from_db(user)

    @strawberry.mutation()
    def update_current_user_password(
        self, info: Info, data: UpdateCurrentUserPasswordInput
    ) -> ProblemGroup | None:
        user = info.context.user

        with info.context.keycloak_maker() as kc:
            resp = kc.put(
                settings.oidc.keycloak_url(
                    f"admin/realms/alma/users/{user.sub}/reset-password"
                ),
                json={"type": "password", "value": data.password},
            )
            if resp.status_code == 400:
                return ProblemGroup(
                    problems=[
                        Problem(
                            message=resp.json()["error_description"],
                            problem_code=ProblemCode.VALIDATION,
                            field="password",
                        )
                    ]
                )
            resp.raise_for_status()
        logger.info("Password reset for %s", info.context.user)

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_USER)]
    )
    def send_password_reset_email(self, info: Info, user_id: int) -> User:
        user = info.context.db.get_one(auth_models.User, user_id)

        if request := info.context.request:
            redirect_uri = str(request.url_for("callback"))
        else:
            redirect_uri = None
        with info.context.keycloak_maker() as kc:
            user.send_password_reset_email(
                keycloak_client=kc, redirect_uri=redirect_uri
            )
        logger.info(
            "Password reset email initiated by %s for %s", info.context.user, user
        )
        return User.from_db(user)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def update_vflz_data(
        self, info: Info, data: UpdateVflzDataInput
    ) -> Vflz | ProblemGroup:
        check_for_empty_objects(data)
        session = info.context.db

        vflz = session.get_one(vflz_models.Vflz, int(data.vflz_id))
        enforce_read_only(session, vflz)

        update_vflz_fields(session, vflz, data)
        update_ablagerungen(session, vflz, data.ablagerungen)
        update_betriebe(session, vflz, data.betriebe)
        update_schiessanlagen(session, vflz, data.schiessanlagen)
        update_unfaelle(session, vflz, data.unfaelle)
        update_pfas(session, vflz, data.pfas)
        update_kinderspielplaetze_gruenflaechen(
            session, vflz, data.kinderspielplaetze_gruenflaechen
        )
        update_grundwasser(session, vflz, data.grundwasser)
        update_oberflaechen_gewaser(session, vflz, data.oberflaechen_gewaesser)
        update_nutzungen_boden(session, vflz, data.nutzungen_boden)
        update_umweltstoffe(session, vflz, data.umwelt_stoffe)
        update_einzelereignisse(session, vflz, data.einzelereignisse)
        update_umweltschaden(session, vflz, data.umweltschaeden)
        update_gemeinde(session, vflz, data.gemeinde)
        update_flugplatz(session, vflz, data.flugplatz)

        vflz.bemerkung_standort = update_scalar(
            data.bemerkung_standort,
            vflz.bemerkung_standort,
            partial(_update_bemerkung, bem_models.BemerkungStandort),
        )

        vflz.bemerkung_umwelt = update_scalar(
            data.bemerkung_umwelt,
            vflz.bemerkung_umwelt,
            partial(_update_bemerkung, bem_models.BemerkungUmwelt),
        )

        vflz.bemerkung_datenimport = update_scalar(
            data.bemerkung_datenimport,
            vflz.bemerkung_datenimport,
            partial(_update_bemerkung, bem_models.BemerkungDatenimportStandort),
        )

        vflz.update_zeitraum()
        session.commit()

        enqueue_vflz_datasheet_update(vflz)
        return Vflz.from_db(vflz)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def historize_vflz(
        self, info: Info, data: HistorizeVflzInput
    ) -> Vflz | ProblemGroup:
        session = info.context.db

        if problems := data.validate():
            return ProblemGroup(problems=problems)

        vflz = session.get_one(vflz_models.Vflz, int(data.vflz_id))
        enforce_read_only(session, vflz)

        vflz.historize(data.message)
        session.commit()
        return Vflz.from_db(vflz)

    @strawberry.mutation
    def update_instance_setting(
        self, info: Info, data: UpdateInstanceSettingInput
    ) -> InstanceSetting | ProblemGroup:
        session = info.context.db
        user = info.context.user

        if (
            data.category in [SettingCategory.ADMIN, SettingCategory.USER_INITIAL]
            and not user.has_permission(Permission.EDIT_SETTINGS)
            or data.category == SettingCategory.GENERAL
            and not user.has_edit_permission()
        ):
            raise error_class(error_message)

        db_setting = session.scalars(
            select(admin_models.InstanceSetting).where(
                admin_models.InstanceSetting.key == data.key,
                admin_models.InstanceSetting.category == data.category,
            )
        ).one()
        try:
            jsonschema.validate(instance=data.value, schema=db_setting.value_schema)
        except jsonschema.exceptions.ValidationError:
            return ProblemGroup(
                problems=[
                    Problem(
                        message="Invalid type",
                        problem_code=ProblemCode.VALIDATION,
                        field="value",
                    )
                ]
            )
        db_setting.value = data.value

        session.commit()
        return InstanceSetting.from_db(db_setting=db_setting)

    @strawberry.mutation
    def update_user_setting(
        self, info: Info, data: UpdateUserSettingInput
    ) -> UserSetting:
        session = info.context.db

        user_setting = session.scalars(
            select(auth_models.UserSetting).where(
                auth_models.UserSetting.key == data.key,
                auth_models.UserSetting.user_id == info.context.user.id,
            )
        ).one_or_none()
        if not user_setting:
            user_setting = auth_models.UserSetting(
                key=data.key, value=data.value, user_id=info.context.user.id
            )
            session.add(user_setting)
        else:
            user_setting.value = data.value
        session.commit()
        return UserSetting.from_db(db_setting=user_setting)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def create_pool(self, info: Info, data: CreatePoolInput) -> Pool | ProblemGroup:
        session = info.context.db

        if problems := data.validate(session):
            return ProblemGroup(problems=problems)

        pool = vflz_models.Pool(
            bezeichnung=data.bezeichnung, bemerkungen=data.bemerkungen
        )
        session.add(pool)
        session.commit()
        return Pool.from_db(pool)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def update_pool_info(
        self, info: Info, data: UpdatePoolInfoInput
    ) -> Pool | ProblemGroup:
        session = info.context.db

        if problems := data.validate(session):
            return ProblemGroup(problems=problems)

        pool = session.get_one(vflz_models.Pool, data.pool_id)
        pool.bezeichnung = data.bezeichnung
        pool.bemerkungen = data.bemerkungen
        session.commit()
        return Pool.from_db(pool)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def add_to_pool(
        self, info: Info, vfl_id: strawberry.ID, pool_id: strawberry.ID
    ) -> Pool:
        session = info.context.db

        pool = session.get_one(vflz_models.Pool, int(pool_id))
        pool.add_vfl(int(vfl_id))
        session.commit()

        return Pool.from_db(pool=pool)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def remove_from_pool(
        self, info: Info, vfl_id: strawberry.ID, pool_id: strawberry.ID
    ) -> Pool:
        session = info.context.db

        pool = session.get_one(vflz_models.Pool, int(pool_id))
        pool.remove_vfl(int(vfl_id))
        session.commit()
        return Pool.from_db(pool=pool)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def copy_pool(self, info: Info, pool_id: strawberry.ID, bezeichnung: str) -> Pool:
        session = info.context.db

        pool = session.get_one(vflz_models.Pool, int(pool_id))
        copy = pool.copy(bezeichnung)
        session.add(copy)
        session.commit()

        return Pool.from_db(copy)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def delete_pool(self, info: Info, pool_id: strawberry.ID) -> strawberry.ID:
        session = info.context.db

        pool = session.get_one(vflz_models.Pool, int(pool_id))
        session.delete(pool)
        session.commit()

        return strawberry.ID(str(pool.pool_id))

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def update_vflz_evaluation(
        self, info: Info, data: UpdateVflzEvaluationInput
    ) -> Vflz | ProblemGroup:
        session = info.context.db

        vflz = session.get_one(vflz_models.Vflz, int(data.vflz_id))
        enforce_read_only(session, vflz)

        if problems := data.validate(session):
            return ProblemGroup(problems=problems)

        # If Beurteilung changes, the version is supposed to be historized
        historize = False
        match (data.beurteilung, vflz.beurteilung):
            # Both are present
            case (
                BeurteilungInput(beurteilung=beurteilung_input),
                vflz_models.Beurteilung(beurteilung=beurteilung_vflz),
            ):
                historize = str(beurteilung_input) != str(beurteilung_vflz)
            # Both are missing
            case (None, None):
                historize = False
            # Only one is present
            case _:
                historize = True

        if historize:
            vflz.historize(message="vflz.historization.beurteilungChanged")
            # Massnahmen and Sanierungsziele need to be recreated since we perform the historization
            # BEFORE update is performed. However, we do not know the IDs beforehand.
            for data_mass in data.massnahmen:
                data_mass.mass_id = None

            for data_sani in data.sanierungsziele:
                data_sani.sani_id = None

        vflz.dat_rechtskraft = data.dat_rechtskraft
        vflz.dat_publizieren = data.dat_publizieren
        vflz.publizieren = data.publizieren
        vflz.rechtskraft = data.rechtskraft

        update_beurteilung(session, vflz, data.beurteilung)
        update_massnahmen(session, vflz, data.massnahmen)
        update_sanierungsziele(session, vflz, data.sanierungsziele)

        vflz.bearbeitungs_stand = code_models.Bearbeitungsstand.from_db_or_none(
            session, data.bearbeitungs_stand
        )
        vflz.untersuchungs_stand = code_models.UntersuchungsStand.from_db_or_none(
            session, data.untersuchungs_stand
        )

        vflz.begruendung_bewertung = update_scalar(
            data.begruendung_bewertung,
            vflz.begruendung_bewertung,
            partial(_update_bemerkung, bem_models.BegruendungBewertung),
        )

        vflz.begruendung_prio_untersuchungsbedarf = update_scalar(
            data.begruendung_prio_untersuchungsbedarf,
            vflz.begruendung_prio_untersuchungsbedarf,
            partial(_update_bemerkung, bem_models.BegruendungPrioUntersuchungsbedarf),
        )

        vflz.begruendung_prio_sanierungsbedarf = update_scalar(
            data.begruendung_prio_sanierungsbedarf,
            vflz.begruendung_prio_sanierungsbedarf,
            partial(_update_bemerkung, bem_models.BegruendungPrioSanierungsbedarf),
        )
        session.commit()

        enqueue_vflz_datasheet_update(vflz)
        return Vflz.from_db(vflz)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def update_vflz_geo(
        self, info: Info, data: UpdateVflzGeoInput
    ) -> Vflz | ProblemGroup:
        session = info.context.db

        vflz = session.get_one(vflz_models.Vflz, int(data.vflz_id))
        enforce_read_only(session, vflz)

        if "coordinates" not in data.geometry:
            raise ValueError("Geometry must be provided.")

        if data.geometry["type"] not in ["MultiPolygon", "Point"]:
            raise ValueError("Geometry type must be either MultiPolygon or Point.")

        if data.geometry["type"] == "MultiPolygon":
            for polygon in data.geometry["coordinates"]:
                for linear_ring in polygon:
                    if any(point == [] for point in linear_ring):
                        raise ValueError("There must be no empty coordinates.")

        if not is_valid_geometry(session, data.geometry):
            return ProblemGroup(
                problems=[
                    Problem(
                        message="Invalid geometry",
                        problem_code=ProblemCode.VALIDATION_GEOM,
                        field="geometry",
                    )
                ]
            )

        if geom_change_triggers_historization(session, vflz, data.geometry):
            vflz.historize("vflz.historization.geometryChanged")

        vflz.set_geometry(data.zentroid, data.geometry)
        session.commit()

        wfs_cache.update_for_vflz(session, vflz)
        session.commit()

        enqueue_vflz_datasheet_update(vflz)
        return Vflz.from_db(vflz)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def create_vflz(self, info: Info, data: CreateVflzInput) -> Vflz | ProblemGroup:
        session = info.context.db

        data.combined_id = data.combined_id.strip()
        if (
            data.combined_id
            and session.scalars(
                select(vflz_models.Vflz).where(
                    vflz_models.Vflz.combined_id == data.combined_id
                )
            ).first()
        ):
            return ProblemGroup(
                problems=[
                    Problem(
                        message="Standortnummer already exists.",
                        problem_code=ProblemCode.EXISTS,
                        field="combinedId",
                    )
                ]
            )
        highest_vfl_id = (
            session.execute(select(sql_functions.max(vflz_models.Vflz.vfl_id))).one()[0]
            or 0
        )
        standort_typ = cast(
            code_models.StandortTyp, code_models.Code.from_db(session, data.vftyp)
        )
        gemeinde = session.get_one(gem_models.Gemeinde, int(data.gemeinde.h_gem_id))
        behoerde = session.scalars(
            select(code_models.BehoerdenKuerzel).where(
                code_models.BehoerdenKuerzel.code == settings.behoerde
            )
        ).one()

        if not is_valid_geometry(session, data.geometry):
            return ProblemGroup(
                problems=[
                    Problem(
                        message="Invalid geometry",
                        problem_code=ProblemCode.VALIDATION_GEOM,
                        field="geometry",
                    )
                ]
            )

        vflz = vflz_models.Vflz(
            bezeichnung=data.bezeichnung,
            vfl_id=highest_vfl_id + 1,
            combined_id=data.combined_id,
            behoerde=behoerde,
            objekt=vflz_models.Objekt(),
            vftyp=standort_typ,
        )
        session.add(vflz)

        vflz.set_geometry(data.zentroid, data.geometry)
        vflz.vflz_created_date = datetime.datetime.now()
        vflz.gemeinde = gemeinde
        vflz.message = "Initial version"
        if data.ktu:
            ktu_code = code_models.KTU.from_db(session, data.ktu)
            vflz.ktu = session.scalars(
                select(vflz_models.KTU).where(vflz_models.KTU.ktu == ktu_code)
            ).one()

        update_flugplatz(session, vflz, data.flugplatz)
        session.commit()

        wfs_cache.update_for_vflz(session, vflz)
        session.commit()

        enqueue_vflz_datasheet_update(vflz)
        return Vflz.from_db(vflz)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def create_teilstandort(
        self, info: Info, data: CreateTeilstandortInput
    ) -> Vflz | ProblemGroup:
        session = info.context.db

        vflz = session.get_one(vflz_models.Vflz, int(data.parent_vflz_id))
        enforce_read_only(session, vflz)
        data.combined_id = data.combined_id.strip()
        problems: list[Problem] = []

        if (
            data.combined_id
            and session.scalars(
                select(vflz_models.Vflz).where(
                    vflz_models.Vflz.combined_id == data.combined_id,
                )
            ).first()
        ):
            problems.append(
                Problem(
                    message="Standortnummer already exists.",
                    problem_code=ProblemCode.EXISTS,
                    field="combinedId",
                )
            )
        if not is_valid_geometry(session, data.geometry):
            problems.append(
                Problem(
                    message="Invalid geometry",
                    problem_code=ProblemCode.VALIDATION_GEOM,
                    field="geometry",
                )
            )
        if not is_valid_geometry(session, data.parent_geometry):
            problems.append(
                Problem(
                    message="Invalid geometry",
                    problem_code=ProblemCode.VALIDATION_GEOM,
                    field="parentGeometry",
                )
            )

        if problems:
            return ProblemGroup(problems=problems)

        gemeinde = session.get_one(gem_models.Gemeinde, int(data.gemeinde.h_gem_id))

        vflz.create_teilstandort(
            combined_id=data.combined_id,
            gemeinde=gemeinde,
            bezeichnung=data.bezeichnung,
            parent_geometry=data.parent_geometry,
            parent_zentroid=data.parent_zentroid,
            teilstandort_geometry=data.geometry,
            teilstandort_zentroid=data.zentroid,
        )

        update_flugplatz(session, vflz, data.flugplatz)

        if data.ktu:
            ktu_code = code_models.KTU.from_db(session, data.ktu)
            vflz.ktu = session.scalars(
                select(vflz_models.KTU).where(vflz_models.KTU.ktu == ktu_code)
            ).one()

        session.commit()

        enqueue_vflz_datasheet_update(vflz)
        return Vflz.from_db(vflz)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def create_subjekt(
        self, info: Info, data: CreateSubjektInput
    ) -> UpdateSubjektResult:
        session = info.context.db

        subj = subj_models.Subjekt()
        session.add(subj)
        update_subjekt(session, subj, data)
        session.commit()
        return UpdateSubjektResult(
            subjekt=Subjekt.from_db(subj),
            problem_group=ProblemGroup(problems=data.validate(session)),
        )

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def update_subjekt(
        self, info: Info, data: UpdateSubjektInput
    ) -> UpdateSubjektResult:
        session = info.context.db

        subj = session.get_one(subj_models.Subjekt, int(data.subj_id))
        update_subjekt(session, subj, data)
        session.commit()
        return UpdateSubjektResult(
            subjekt=Subjekt.from_db(subj),
            problem_group=ProblemGroup(problems=data.validate(session)),
        )

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def delete_subjekt(self, info: Info, subj_id: strawberry.ID) -> strawberry.ID:
        session = info.context.db

        subj = session.get_one(subj_models.Subjekt, int(subj_id))
        session.delete(subj)
        session.commit()
        return strawberry.ID(str(subj.subj_id))

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def update_vflz_vollzug(
        self, info: Info, data: UpdateVflzVollzugInput
    ) -> Vflz | ProblemGroup:
        """Read-only vflzs may be mutated with respect to vollzug. This is to avoid, e.g., that a
        Vollzug is (erroneously) assigned to another behoerde and you want to revoke it."""
        session = info.context.db

        problems: list[Problem] = []
        vflz = session.get_one(vflz_models.Vflz, int(data.vflz_id))

        if problems := data.validate():
            return ProblemGroup(problems=problems)

        combined_id = vflz.combined_id
        behoerde = vflz.behoerde

        for vollzug_data in data.vollzug:
            vollzug_behoerde = code_models.BehoerdenKuerzel.from_db(
                session, vollzug_data.behoerde
            )
            if vollzug_data.aktiv:
                behoerde = code_models.BehoerdenKuerzel.from_db(
                    session, vollzug_data.behoerde
                )
            if vollzug_behoerde.code == settings.behoerde:
                combined_id = vollzug_data.combined_id

        update_vollzug(session, vflz, data.vollzug)

        vflz.combined_id = combined_id
        vflz.behoerde = behoerde

        session.commit()
        return Vflz.from_db(vflz)

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_PROCESS)]
    )
    def update_aufgabe(
        self, info: Info, data: UpdateAufgabeInput, update_parent_tasks: bool = False
    ) -> Aufgabe | WorkflowProblemGroup:
        session = info.context.db
        mgr = info.context.workflow_manager

        if problems := data.validate():
            return WorkflowProblemGroup(
                problems=problems,
                faelligkeits_datum_problem_tasks=[],
                status_problem_tasks=[],
                open_events_problem_tasks=[],
            )

        try:
            mgr.update_task_node(
                int(data.task_id),
                title=data.title,
                status=_to_wm_status(data.status),
                started_at=_to_datetime(data.start_datum),
                finished_at=_to_datetime(data.end_datum) if data.end_datum else None,
                deadline=(
                    _to_datetime(data.faelligkeits_datum)
                    if data.faelligkeits_datum
                    else None
                ),
                note=data.notiz,
                cascade=update_parent_tasks,
            )
        except CascadeConflict as e:
            return _make_cascade_problem_group(session, data.validate(), e)

        node = session.get_one(wf_models.TaskNode, int(data.task_id))
        update_sachbearbeitung_task(session, node, data.sachbearbeitung)
        update_sonstige_beteiligte_task(session, node, data.sonstige_beteiligte)

        session.commit()
        return Aufgabe.from_db(node)

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_PROCESS)]
    )
    def update_prozess(
        self, info: Info, data: UpdateProzessInput, update_child_tasks: bool = False
    ) -> Prozess | WorkflowProblemGroup:
        session = info.context.db
        mgr = info.context.workflow_manager

        if problems := data.validate():
            return WorkflowProblemGroup(
                problems=problems,
                faelligkeits_datum_problem_tasks=[],
                status_problem_tasks=[],
                open_events_problem_tasks=[],
            )

        try:
            mgr.update_workflow_node(
                int(data.task_id),
                title=data.title,
                status=_to_wm_status(data.status),
                started_at=_to_datetime(data.start_datum),
                finished_at=_to_datetime(data.end_datum) if data.end_datum else None,
                deadline=(
                    _to_datetime(data.faelligkeits_datum)
                    if data.faelligkeits_datum
                    else None
                ),
                note=data.notiz,
                cascade=update_child_tasks,
            )
        except CascadeConflict as e:
            return _make_cascade_problem_group(session, data.validate(), e)

        node = session.get_one(wf_models.WorkflowNode, int(data.task_id))
        update_sachbearbeitung_task(session, node, data.sachbearbeitung)
        update_sonstige_beteiligte_task(session, node, data.sonstige_beteiligte)

        session.commit()
        return Prozess.from_db(node)

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_PROCESS)]
    )
    def update_dokument(self, info: Info, data: UpdateDokumentInput) -> Dokument:
        session = info.context.db
        mgr = info.context.workflow_manager

        mgr.update_document_node(
            int(data.task_id),
            title=data.title,
            started_at=_to_datetime(data.start_datum),
            note=data.notiz,
            url=data.url,
            document_ref=data.dokument if data.dokument else "",
            is_public=data.oeffentlich,
        )

        node = session.get_one(wf_models.DocumentNode, int(data.task_id))
        update_sachbearbeitung_task(session, node, data.sachbearbeitung)
        update_sonstige_beteiligte_task(session, node, data.sonstige_beteiligte)
        update_node_kategorie(session, node, data.kategorie)

        session.commit()
        return Dokument.from_db(node)

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_PROCESS)]
    )
    def update_notiz(self, info: Info, data: UpdateNotizInput) -> Notiz:
        session = info.context.db
        mgr = info.context.workflow_manager

        mgr.update_note_node(
            int(data.task_id),
            title=data.title,
            started_at=_to_datetime(data.start_datum),
            note=data.notiz,
            url=data.url,
            is_public=data.oeffentlich,
        )

        node = session.get_one(wf_models.NoteNode, int(data.task_id))
        update_sachbearbeitung_task(session, node, data.sachbearbeitung)
        update_sonstige_beteiligte_task(session, node, data.sonstige_beteiligte)
        update_node_kategorie(session, node, data.kategorie)

        session.commit()
        return Notiz.from_db(node)

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_PROCESS)]
    )
    def update_formular(
        self, info: Info, data: UpdateFormularInput
    ) -> Formular | ProblemGroup:
        session = info.context.db
        mgr = info.context.workflow_manager

        if data.eingaben and (problems := data.validate(session)):
            return ProblemGroup(problems=problems)

        mgr.update_form_node(
            int(data.task_id),
            title=data.title,
            started_at=_to_datetime(data.start_datum),
            form_data=data.eingaben,
            note=data.notiz,
        )

        node = session.get_one(wf_models.FormNode, int(data.task_id))
        update_sachbearbeitung_task(session, node, data.sachbearbeitung)
        update_sonstige_beteiligte_task(session, node, data.sonstige_beteiligte)

        session.commit()
        return Formular.from_db(node)

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_PROCESS)]
    )
    def start_standort_prozess(
        self, info: Info, data: StartStandortProzessInput
    ) -> StartStandortProzessResult:
        session = info.context.db
        user = info.context.user
        mgr = info.context.workflow_manager

        try:
            node_info = mgr.start_workflow(int(data.option_id), str(data.vflz_id))
        except WorkflowException as e:
            raise ValueError(f"Cannot start workflow: ({e})") from e

        # Load alma node to set up sachbearbeitung and build the GraphQL response
        workflow_node = session.get_one(wf_models.WorkflowNode, node_info.wf_node_id)
        alma_wf_models.setup_initial_sachbearbeitung(session, workflow_node, user)

        session.commit()

        return StartStandortProzessResult(prozess=Prozess.from_db(workflow_node))

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_PROCESS)]
    )
    def start_pool_prozess(
        self, info: Info, data: StartPoolProzessInput
    ) -> StartPoolProzessResult:
        session = info.context.db
        user = info.context.user
        mgr = info.context.workflow_manager

        pool = session.get_one(vflz_models.Pool, int(data.pool_id))
        prozesse: list[Prozess] = []
        workflow = session.get_one(wf_models.Workflow, int(data.option_id))

        for vflz in pool.get_current_vflzs(session):
            if is_applicable(session, workflow, str(vflz.vflz_id)):
                workflow_node_info = mgr.start_workflow(
                    int(data.option_id), str(vflz.vflz_id)
                )
                workflow_node = session.get_one(
                    wf_models.WorkflowNode, workflow_node_info.wf_node_id
                )
                alma_wf_models.setup_initial_sachbearbeitung(
                    session, workflow_node, user
                )
                prozesse.append(Prozess.from_db(workflow_node))
        session.commit()
        return StartPoolProzessResult(prozesse=prozesse)

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_PROCESS)]
    )
    def start_standort_folgeschritt(
        self, info: Info, data: StartStandortFolgeschrittInput
    ) -> StartStandortFolgeschrittResult:
        session = info.context.db
        mgr = info.context.workflow_manager

        node_info = mgr.start_next_step(int(data.task_id), int(data.option_id))
        set_current_vflz(session, node_info.wf_node_id)

        # Load alma node to set up sachbearbeitung and build the GraphQL response
        next_node = session.get_one(wf_models.Node, node_info.wf_node_id)
        alma_wf_models.setup_initial_sachbearbeitung(
            session, next_node, info.context.user
        )

        session.commit()

        return StartStandortFolgeschrittResult(task=Task.from_db_node(next_node))

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_PROCESS)]
    )
    def start_pool_folgeschritt(
        self, info: Info, data: StartPoolFolgeschrittInput
    ) -> StartPoolFolgeschrittResult:
        session = info.context.db
        user = info.context.user
        mgr = info.context.workflow_manager

        wf_config = session.get_one(wf_models.WorkflowConfig, int(data.option_id))
        task = session.get_one(wf_models.Node, int(data.task_id))

        tasks: list[Task] = []
        pool = session.get_one(vflz_models.Pool, int(data.pool_id))

        for vflz in pool.get_current_vflzs(session):
            # Folgeschritt (Task / Form / Document): find the leaf node to act on
            all_vflz_ids = session.scalars(
                select(vflz_models.Vflz.vflz_id).where(
                    vflz_models.Vflz.vfl_id == vflz.vfl_id
                )
            ).all()

            last_workflow_nodes = session.scalars(
                select(wf_models.Node).where(
                    wf_models.Node.entity_id.in_(all_vflz_ids),
                    wf_models.Node.wf_config_id == task.wf_config_id,
                    wf_models.Node.next_node_id.is_(None),
                )
            ).all()

            for n in last_workflow_nodes:
                try:
                    next_node_info = mgr.start_next_step(
                        n.wf_node_id, wf_config.wf_config_id
                    )
                    set_current_vflz(session, next_node_info.wf_node_id)
                    next_node = session.get_one(
                        wf_models.Node, next_node_info.wf_node_id
                    )
                    alma_wf_models.setup_initial_sachbearbeitung(
                        session, next_node, user
                    )
                    tasks.append(Task.from_db_node(next_node))
                except InvalidWorkflowStep:
                    pass

        session.commit()
        return StartPoolFolgeschrittResult(tasks=tasks)

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_PROCESS)]
    )
    def create_standort_notiz(
        self, info: Info, data: CreateStandortNotizInput
    ) -> Notiz:
        session = info.context.db
        user = info.context.user
        mgr = info.context.workflow_manager

        note_info = mgr.create_note_node(
            entity_id=str(data.vflz_id),
            title=data.title,
            started_at=_to_datetime(data.start_datum),
            note=data.notiz,
            url=data.url,
            is_public=data.oeffentlich,
            parent_id=int(data.task_id) if data.task_id is not None else None,
        )

        node = session.get_one(wf_models.NoteNode, note_info.wf_node_id)
        alma_wf_models.setup_initial_sachbearbeitung(session, node, user)
        update_node_kategorie(session, node, data.kategorie)

        session.commit()
        return Notiz.from_db(node)

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_PROCESS)]
    )
    def create_pool_notiz(self, info: Info, data: CreatePoolNotizInput) -> list[Notiz]:
        session = info.context.db
        user = info.context.user
        mgr = info.context.workflow_manager

        pool = session.get_one(vflz_models.Pool, int(data.pool_id))
        notizen: list[Notiz] = []

        for vflz in pool.get_current_vflzs(session):
            try:
                note_info = mgr.create_note_node(
                    entity_id=str(vflz.vflz_id),
                    title=data.title,
                    started_at=_to_datetime(data.start_datum),
                    note=data.notiz,
                    url=data.url,
                    is_public=data.oeffentlich,
                    parent_id=None,
                )
                node = session.get_one(wf_models.NoteNode, note_info.wf_node_id)
                alma_wf_models.setup_initial_sachbearbeitung(session, node, user)
                update_node_kategorie(session, node, data.kategorie)
                session.commit()
                notizen.append(Notiz.from_db(node))
            except Exception:
                logger.exception(
                    "Failed to create Notiz for vfl_id=%s in pool_id=%s",
                    vflz.vfl_id,
                    data.pool_id,
                )
                session.rollback()

        return notizen

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_PROCESS)]
    )
    def create_standort_dokument(
        self, info: Info, data: CreateStandortDokumentInput
    ) -> Dokument:
        session = info.context.db
        user = info.context.user
        mgr = info.context.workflow_manager

        vflz = session.get_one(vflz_models.Vflz, int(data.vflz_id))
        doc_info = mgr.create_document_node(
            entity_id=str(vflz.vflz_id),
            title=data.title,
            started_at=_to_datetime(data.start_datum),
            document_ref=data.dokument if data.dokument else "",
            note=data.notiz,
            url=data.url,
            is_public=data.oeffentlich,
            parent_id=int(data.task_id) if data.task_id is not None else None,
        )

        node = session.get_one(wf_models.DocumentNode, doc_info.wf_node_id)
        alma_wf_models.setup_initial_sachbearbeitung(session, node, user)
        update_node_kategorie(session, node, data.kategorie)

        session.commit()
        return Dokument.from_db(node)

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_PROCESS)]
    )
    def create_pool_dokument(
        self, info: Info, data: CreatePoolDokumentInput
    ) -> list[Dokument]:
        session = info.context.db
        user = info.context.user
        mgr = info.context.workflow_manager

        pool = session.get_one(vflz_models.Pool, int(data.pool_id))
        dokumente: list[Dokument] = []

        for vflz in pool.get_current_vflzs(session):
            try:
                node_info = mgr.create_document_node(
                    entity_id=str(vflz.vflz_id),
                    title=data.title,
                    started_at=_to_datetime(data.start_datum),
                    document_ref=data.dokument if data.dokument else "",
                    note=data.notiz,
                    url=data.url,
                    is_public=data.oeffentlich,
                    parent_id=None,
                )
                node = session.get_one(wf_models.DocumentNode, node_info.wf_node_id)
                alma_wf_models.setup_initial_sachbearbeitung(session, node, user)
                update_node_kategorie(session, node, data.kategorie)
                session.commit()
                dokumente.append(Dokument.from_db(node))
            except Exception:
                logger.exception(
                    "Failed to create Dokument for vfl_id=%s in pool_id=%s",
                    vflz.vfl_id,
                    data.pool_id,
                )
                session.rollback()

        return dokumente

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_PROCESS)]
    )
    def create_standort_aufgabe(
        self, info: Info, data: CreateStandortAufgabeInput
    ) -> Aufgabe:
        session = info.context.db
        user = info.context.user
        mgr = info.context.workflow_manager

        vflz = session.get_one(vflz_models.Vflz, int(data.vflz_id))
        task_info = mgr.create_task_node(
            entity_id=str(vflz.vflz_id),
            title=data.title,
            started_at=_to_datetime(data.start_datum),
            deadline=_to_datetime(data.faelligkeits_datum),
            note=data.notiz,
            url=None,
            parent_id=int(data.task_id) if data.task_id is not None else None,
        )

        node = session.get_one(wf_models.TaskNode, task_info.wf_node_id)
        alma_wf_models.setup_initial_sachbearbeitung(session, node, user)

        session.commit()
        return Aufgabe.from_db(node)

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_PROCESS)]
    )
    def create_pool_aufgabe(
        self, info: Info, data: CreatePoolAufgabeInput
    ) -> list[Aufgabe]:
        session = info.context.db
        user = info.context.user
        mgr = info.context.workflow_manager

        pool = session.get_one(vflz_models.Pool, int(data.pool_id))
        aufgaben: list[Aufgabe] = []

        for vflz in pool.get_current_vflzs(session):
            try:
                node = mgr.create_task_node(
                    entity_id=str(vflz.vflz_id),
                    title=data.title,
                    started_at=_to_datetime(data.start_datum),
                    deadline=_to_datetime(data.faelligkeits_datum),
                    note=data.notiz,
                    url=None,
                    parent_id=None,
                )
                node = session.get_one(wf_models.TaskNode, node.wf_node_id)
                alma_wf_models.setup_initial_sachbearbeitung(session, node, user)
                session.commit()
                aufgaben.append(Aufgabe.from_db(node))
            except Exception:
                logger.exception(
                    "Failed to create Aufgabe for vfl_id=%s in pool_id=%s",
                    vflz.vfl_id,
                    data.pool_id,
                )
                session.rollback()

        return aufgaben

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_PROCESS)]
    )
    def delete_task(self, info: Info, task_id: strawberry.ID) -> strawberry.ID:
        session = info.context.db
        mgr = info.context.workflow_manager

        task = session.get_one(wf_models.Node, int(task_id))

        # Clear beteiligte before deletion (not handled by wm)
        update_sachbearbeitung_task(session, task, [])
        update_sonstige_beteiligte_task(session, task, [])

        try:
            # Delete via wm manager (validates no children / not readonly)
            mgr.delete_node(int(task_id))
        except WorkflowException as e:
            session.rollback()
            raise PermissionError(
                "Cannot delete task since there are children assigned or there is a next node."
            ) from e

        session.commit()
        return strawberry.ID(str(task_id))

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def update_vflz_beteiligte(
        self, info: Info, data: UpdateVflzBeteiligteInput
    ) -> Vflz | ProblemGroup:
        session = info.context.db

        vflz = session.get_one(vflz_models.Vflz, data.vflz_id)
        update_sachbearbeitung(session, vflz, data.sachbearbeitung)
        update_sonstige_beteiligte(session, vflz, data.sonstige_beteiligte)
        problems = update_eigentum(session, vflz, data.eigentum)

        if problems:
            return ProblemGroup(problems=problems)

        session.commit()

        enqueue_vflz_datasheet_update(vflz)
        return Vflz.from_db(vflz)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.VIEW_VFL)])
    def create_saved_search(
        self, info: Info, data: CreateSavedSearchInput
    ) -> SavedSearch | ProblemGroup:
        session = info.context.db

        query = select(search_models.Search.search_id).where(
            search_models.Search.name == data.name,
            search_models.Search.user == info.context.user,
        )

        if session.scalars(query).one_or_none():
            return ProblemGroup(
                problems=[
                    Problem(
                        message="Name for saved search must be unique for each user",
                        problem_code=ProblemCode.EXISTS,
                        field="name",
                    )
                ]
            )

        if data.query:
            serialized_query = serialize_query(validate_query(session, data.query))
        else:
            serialized_query = []

        saved_search = search_models.Search(
            user=info.context.user,
            name=data.name,
            query=serialized_query,
            fields=[f.value for f in data.fields],
            sort_by=[
                {"field": sb.field.value, "reverse": sb.reverse} for sb in data.sort_by
            ],
            is_grouped=data.is_grouped,
            is_shared=data.is_shared,
        )

        session.add(saved_search)
        session.flush()

        if data.show_on_dashboard:
            _add_search_to_dashboard(session, info.context.user, saved_search)

        session.commit()
        return SavedSearch.from_db(saved_search)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.EDIT_VFL)])
    def add_search_results_to_pool(
        self, info: Info, data: AddSearchResultsToPoolInput
    ) -> Pool:
        session = info.context.db
        user = info.context.user

        pool = session.get_one(vflz_models.Pool, int(data.pool_id))

        vflz_ids, _ = alma.search.get_search_results(
            info.context.db,
            user=user,
            search=data.query,
            advanced=True,
            filters=[],
            lang=Language.DE,
        )

        vfl_ids = session.scalars(
            select(vflz_models.Vflz.vfl_id)
            .where(vflz_models.Vflz.vflz_id.in_(vflz_ids))
            .distinct()
        ).all()
        vfl_ids_in_pool = session.scalars(
            select(vflz_models.VflPool.vfl_id).where(
                vflz_models.VflPool.pool_id == pool.pool_id
            )
        ).all()

        for vfl_id in vfl_ids:
            if vfl_id not in vfl_ids_in_pool:
                pool.add_vfl(vfl_id)
        session.commit()
        return Pool.from_db(pool=pool)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.VIEW_VFL)])
    def export_search(self, info: Info, data: ExportSearchInput) -> strawberry.ID:
        session = info.context.db

        export_id = uuid4().hex
        if data.query:
            serialized_query = serialize_query(validate_query(session, data.query))
        else:
            serialized_query = []

        saved_search = search_models.Search(
            user=info.context.user,
            name=export_id,
            is_temporary=True,
            query=serialized_query,
            fields=[f.value for f in data.fields],
            sort_by=[
                {"field": sb.field.value, "reverse": sb.reverse} for sb in data.sort_by
            ],
        )
        search_export = search_models.SearchExport(
            export_id=export_id,
            user=info.context.user,
            search=saved_search,
            format=data.format,
            lang=data.lang,
        )

        session.add(search_export)
        session.commit()
        with alma.task_queue.open_client():
            alma.task_queue.tasks.export_search.defer(
                search_export_id=search_export.search_export_id
            )

        return strawberry.ID(export_id)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.VIEW_VFL)])
    def update_saved_search(
        self, info: Info, data: UpdateSavedSearchInput
    ) -> SavedSearch | ProblemGroup:
        session = info.context.db

        query = select(search_models.Search.search_id).where(
            search_models.Search.name == data.name,
            search_models.Search.user == info.context.user,
            search_models.Search.search_id != int(data.saved_search_id),
        )
        if session.scalars(query).one_or_none():
            return ProblemGroup(
                problems=[
                    Problem(
                        message="Name for saved search must be unique for each user",
                        problem_code=ProblemCode.EXISTS,
                        field="name",
                    )
                ]
            )

        saved_search = session.get_one(search_models.Search, int(data.saved_search_id))
        saved_search.name = data.name
        saved_search.is_shared = data.is_shared

        if data.show_on_dashboard:
            _add_search_to_dashboard(session, info.context.user, saved_search)
        elif not data.show_on_dashboard:
            _remove_search_from_dasbhoard(session, info.context.user, saved_search)

        session.commit()
        return SavedSearch.from_db(saved_search)

    @strawberry.mutation(permission_classes=[get_permission_class(Permission.VIEW_VFL)])
    def delete_saved_search(
        self, info: Info, saved_search_id: strawberry.ID
    ) -> strawberry.ID:
        session = info.context.db

        saved_search = session.get_one(search_models.Search, int(saved_search_id))
        if saved_search.user != info.context.user:
            raise PermissionError(
                "You are not allowed to delete this search as you did not create it."
            )

        session.delete(saved_search)
        session.commit()
        return strawberry.ID(str(saved_search.search_id))

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_SETTINGS)]
    )
    def create_code_list_entry(
        self, info: Info, data: CreateCodeListEntryInput
    ) -> CodeListEntry | ProblemGroup:
        session = info.context.db

        codeliste = session.get_one(code_models.CodeListe, int(data.cli_id))
        if codeliste.read_only:
            raise PermissionError("Code list is read only.")

        if session.scalars(
            select(code_models.Code).where(
                code_models.Code.c_cli_id == data.cli_id,
                code_models.Code.code == data.code,
            )
        ).all():
            return ProblemGroup(
                problems=[
                    Problem(
                        message="Code exists already.",
                        problem_code=ProblemCode.EXISTS,
                        field="code",
                    )
                ]
            )

        code = code_models.Code(code=data.code, codeliste=codeliste)
        code.sort_key = data.sort_key
        code.is_active = data.is_active

        msg_id = f"code:{codeliste.c_cli_id}:{data.code}"

        try:
            de_translation = translations_models.Translation(
                key=msg_id, value=data.bezeichnung.de, locale=Language.DE
            )
            fr_translation = translations_models.Translation(
                key=msg_id, value=data.bezeichnung.fr, locale=Language.FR
            )
            it_translation = translations_models.Translation(
                key=msg_id, value=data.bezeichnung.it, locale=Language.IT
            )

            session.add_all([code, de_translation, fr_translation, it_translation])
            session.commit()
        except IntegrityError as e:
            if (
                isinstance(e.orig, ExclusionViolation)
                and e.orig.diag.message_primary
                and "lang" in e.orig.diag.message_primary
            ):
                params_string = str(e.params)
                match = re.search(r"'locale'\s*:\s*'([^']+)'", params_string)
                locale_value = ""
                problems: list[Problem] = []
                if match:
                    locale_value = match.group(1)
                    problems.append(
                        Problem(
                            message="Error occurred updating translation",
                            problem_code=ProblemCode.EXISTS,
                            field=f"bezeichnung.{locale_value}",
                        )
                    )
                else:
                    for locale_value in [lang.value for lang in Language]:
                        problems.append(
                            Problem(
                                message="Error occurred updating translation",
                                problem_code=ProblemCode.EXISTS,
                                field=f"bezeichnung.{locale_value}",
                            )
                        )
                return ProblemGroup(problems=problems)
            else:
                raise
        return CodeListEntry.from_db(code)

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_SETTINGS)]
    )
    def update_code_list_entry(
        self, info: Info, data: UpdateCodeListEntryInput
    ) -> CodeListEntry | ProblemGroup:
        session = info.context.db

        code = code_models.Code.from_db(session, data.code)
        if not data.is_active and code.codeliste.read_only:
            raise PermissionError("Code list is read only.")
        code.sort_key = data.sort_key
        code.is_active = data.is_active

        try:
            de_translation = session.scalars(
                select(translations_models.Translation).where(
                    translations_models.Translation.key == str(code),
                    translations_models.Translation.locale == Language.DE,
                )
            ).one_or_none()
            if not de_translation:
                de_translation = translations_models.Translation(
                    key=str(code), locale=Language.DE, value=data.bezeichnung.de
                )
                session.add(de_translation)
            else:
                de_translation.value = data.bezeichnung.de

            fr_translation = session.scalars(
                select(translations_models.Translation).where(
                    translations_models.Translation.key == str(code),
                    translations_models.Translation.locale == Language.FR,
                )
            ).one_or_none()
            if not fr_translation:
                fr_translation = translations_models.Translation(
                    key=str(code), locale=Language.FR, value=data.bezeichnung.fr
                )
                session.add(fr_translation)
            else:
                fr_translation.value = data.bezeichnung.fr

            it_translation = session.scalars(
                select(translations_models.Translation).where(
                    translations_models.Translation.key == str(code),
                    translations_models.Translation.locale == Language.IT,
                )
            ).one_or_none()
            if not it_translation:
                it_translation = translations_models.Translation(
                    key=str(code), locale=Language.IT, value=data.bezeichnung.it
                )
                session.add(it_translation)
            else:
                it_translation.value = data.bezeichnung.it

            session.commit()
        except IntegrityError as e:
            if (
                isinstance(e.orig, ExclusionViolation)
                and e.orig.diag.message_primary
                and "lang" in e.orig.diag.message_primary
            ):
                params_string = str(e.params)
                match = re.search(r"'locale'\s*:\s*'([^']+)'", params_string)
                locale_value = ""
                problems: list[Problem] = []
                if match:
                    locale_value = match.group(1)
                    problems.append(
                        Problem(
                            message="Error occurred updating translation",
                            problem_code=ProblemCode.EXISTS,
                            field=f"bezeichnung.{locale_value}",
                        )
                    )
                else:
                    for locale_value in [lang.value for lang in Language]:
                        problems.append(
                            Problem(
                                message="Error occurred updating translation",
                                problem_code=ProblemCode.EXISTS,
                                field=f"bezeichnung.{locale_value}",
                            )
                        )
                return ProblemGroup(problems=problems)
            else:
                raise
        return CodeListEntry.from_db(code)

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_SETTINGS)]
    )
    def update_translation(self, info: Info, data: UpdateTranslationInput) -> str:
        session = info.context.db

        de_translation = session.scalars(
            select(translations_models.Translation).where(
                translations_models.Translation.key == data.key,
                translations_models.Translation.locale == Language.DE,
            )
        ).one_or_none()
        if not de_translation:
            de_translation = translations_models.Translation(
                key=data.key, value=data.translation.de, locale=Language.DE
            )
            session.add(de_translation)
        else:
            de_translation.value = data.translation.de

        fr_translation = session.scalars(
            select(translations_models.Translation).where(
                translations_models.Translation.key == data.key,
                translations_models.Translation.locale == Language.FR,
            )
        ).one_or_none()
        if not fr_translation:
            fr_translation = translations_models.Translation(
                key=data.key, value=data.translation.fr, locale=Language.FR
            )
            session.add(fr_translation)
        else:
            fr_translation.value = data.translation.fr

        it_translation = session.scalars(
            select(translations_models.Translation).where(
                translations_models.Translation.key == data.key,
                translations_models.Translation.locale == Language.IT,
            )
        ).one_or_none()
        if not it_translation:
            it_translation = translations_models.Translation(
                key=data.key, value=data.translation.it, locale=Language.IT
            )
            session.add(it_translation)
        else:
            it_translation.value = data.translation.it

        session.commit()
        return de_translation.key

    @strawberry.mutation(
        permission_classes=[get_permission_class(Permission.EDIT_SETTINGS)]
    )
    def update_code_list(self, info: Info, data: UpdateCodeListInput) -> CodeList:
        session = info.context.db

        code_liste = session.get_one(code_models.CodeListe, int(data.cli_id))
        msg_id = f"codelist:{data.cli_id}"

        de_translation = session.scalars(
            select(translations_models.Translation).where(
                translations_models.Translation.key == msg_id,
                translations_models.Translation.locale == Language.DE,
            )
        ).one_or_none()
        if not de_translation:
            de_translation = translations_models.Translation(
                key=msg_id, value=data.bezeichnung.de, locale=Language.DE
            )
            session.add(de_translation)
        else:
            de_translation.value = data.bezeichnung.de

        fr_translation = session.scalars(
            select(translations_models.Translation).where(
                translations_models.Translation.key == msg_id,
                translations_models.Translation.locale == Language.FR,
            )
        ).one_or_none()
        if not fr_translation:
            fr_translation = translations_models.Translation(
                key=msg_id, value=data.bezeichnung.fr, locale=Language.FR
            )
            session.add(fr_translation)
        else:
            fr_translation.value = data.bezeichnung.fr

        it_translation = session.scalars(
            select(translations_models.Translation).where(
                translations_models.Translation.key == msg_id,
                translations_models.Translation.locale == Language.IT,
            )
        ).one_or_none()
        if not it_translation:
            it_translation = translations_models.Translation(
                key=msg_id, value=data.bezeichnung.it, locale=Language.IT
            )
            session.add(it_translation)
        else:
            it_translation.value = data.bezeichnung.it

        session.commit()
        return CodeList.from_db(code_liste)
