from datetime import date, datetime, timedelta
from enum import Enum
from typing import TYPE_CHECKING, Annotated, Any, Self, TypedDict
from uuid import UUID

import strawberry
import strawberry.scalars
from business_workflow_manager import models as wf_models
from business_workflow_manager.types import NodeStatus, NodeType
from sqlalchemy import (
    BinaryExpression,
    ColumnElement,
    Integer,
    and_,
    cast,
    false,
    or_,
    select,
    true,
)
from sqlalchemy.orm import Session

import alma.models.vflz as vflz_models
from alma.constants import CodeListe
from alma.models import auth as auth_models
from alma.models import events as event_models
from alma.models import subj as subj_models
from alma.models import workflow as alma_wf_models
from alma.models.translations import Translation

from ..scalars import FormularEingaben, FormularFelder
from ..utils.schema import Info, to_id
from .codes import Code, CodeInput
from .problems import Problem, ProblemCode
from .subj import Subjekt

if TYPE_CHECKING:
    from .vflz import Vflz


# Enums are translated between internal (generic) names and alma-specific names.


@strawberry.enum
class TaskType(Enum):
    PROZESS = NodeType.WORKFLOW
    AUFGABE = NodeType.TASK
    FORMULAR = NodeType.FORM
    DOKUMENT = NodeType.DOCUMENT
    NOTIZ = NodeType.NOTE


@strawberry.enum
class TaskStatus(Enum):
    OFFEN = NodeStatus.STARTED
    ABGESCHLOSSEN = NodeStatus.FINISHED
    UEBERSPRUNGEN = NodeStatus.SKIPPED
    RUHEND = NodeStatus.INACTIVE


@strawberry.enum
class SortTasks(Enum):
    StartDatum = "StartDatum"
    Faelligkeit = "Faelligkeit"


@strawberry.enum
class FaelligkeitStatus(Enum):
    UEBERFAELLIG = "Ueberfaellig"
    FAELLIG_NAECHSTE_WOCHE = "Faellig naechste Woche"
    FAELLIG_SPAETER = "Spaetere Faelligkeit"
    RUHEND = "Ruhend"

    @staticmethod
    def from_datetime(deadline: datetime | None) -> "FaelligkeitStatus":
        if deadline is None:
            return FaelligkeitStatus.RUHEND
        elif deadline < datetime.now():
            return FaelligkeitStatus.UEBERFAELLIG
        elif deadline < (datetime.now() + timedelta(weeks=4)):
            return FaelligkeitStatus.FAELLIG_NAECHSTE_WOCHE
        else:
            return FaelligkeitStatus.FAELLIG_SPAETER


@strawberry.type
class BeteiligterGeschaeft:
    bet_task_id: strawberry.ID
    subjekt: Subjekt

    @classmethod
    def from_db(cls, beteiligter: alma_wf_models.BeteiligterGeschaeft) -> Self:
        return cls(
            bet_task_id=to_id(beteiligter.bet_task_id),
            subjekt=Subjekt.from_db(beteiligter.subjekt),
        )


@strawberry.input
class BeteiligterGeschaeftInput:
    bet_task_id: strawberry.ID | None
    subj_id: strawberry.ID


@strawberry.type
class StandortHistorisieren:
    value: None  # GraphQL requires each type to have at least one field


@strawberry.type
class UntersuchungsStandSetzen:
    code: Code


@strawberry.type
class BearbeitungsstandSetzen:
    code: Code


@strawberry.type
class ProzessStarten:
    title: str


@strawberry.type
class Publizieren:
    value: None


EventTrigger = Annotated[
    StandortHistorisieren
    | UntersuchungsStandSetzen
    | BearbeitungsstandSetzen
    | ProzessStarten
    | Publizieren,
    strawberry.union("EventTrigger"),
]


def make_trigger(session: Session, type: str, value: Any) -> EventTrigger:
    match type:
        case "StandortHistorisieren":
            return StandortHistorisieren(value=None)
        case "UntersuchungsStandSetzen":
            return UntersuchungsStandSetzen(code=Code(value))
        case "BearbeitungsstandSetzen":
            return BearbeitungsstandSetzen(code=Code(value))
        case "ProzessStarten":
            wf_config = session.scalars(
                select(wf_models.Workflow).where(wf_models.Workflow.key == UUID(value))
            ).one()
            return ProzessStarten(title=wf_config.title)
        case "Publizieren":
            return Publizieren(value=None)
        case _:
            raise RuntimeError(f"Unknown trigger type: {type}")


@strawberry.interface
class EventInterface:
    timestamp: datetime
    vflz_id: strawberry.ID


@strawberry.type
class StandortHistorisiert(EventInterface):
    new_vflz_id: strawberry.ID


@strawberry.type
class UntersuchungsStandGesetzt(EventInterface):
    code: Code


@strawberry.type
class BearbeitungsstandGesetzt(EventInterface):
    code: Code


@strawberry.type
class ProzessGestartet(EventInterface):
    title: str
    task_id: strawberry.ID


@strawberry.type
class InKbsEingetragen(EventInterface):
    pass


@strawberry.type
class AusKbsGeloescht(EventInterface):
    pass


Event = Annotated[
    StandortHistorisiert
    | UntersuchungsStandGesetzt
    | BearbeitungsstandGesetzt
    | ProzessGestartet
    | InKbsEingetragen
    | AusKbsGeloescht,
    strawberry.union("Event"),
]


def event_from_db(e: event_models.Event) -> Event:
    match e.event_type:
        case "StandortHistorisiert":
            return StandortHistorisiert(
                timestamp=e.event_timestamp,
                vflz_id=to_id(e.vflz_id),
                new_vflz_id=to_id(e.event_data["new_vflz_id"]),
            )
        case "UntersuchungsStandGesetzt":
            return UntersuchungsStandGesetzt(
                timestamp=e.event_timestamp,
                code=Code(e.event_data["code"]),
                vflz_id=to_id(e.vflz_id),
            )
        case "BearbeitungsstandGesetzt":
            return BearbeitungsstandGesetzt(
                timestamp=e.event_timestamp,
                code=Code(e.event_data["code"]),
                vflz_id=to_id(e.vflz_id),
            )
        case "ProzessGestartet":
            return ProzessGestartet(
                timestamp=e.event_timestamp,
                title=e.event_data["title"],
                task_id=e.event_data["wf_node_id"],
                vflz_id=to_id(e.vflz_id),
            )
        case "InKbsEingetragen":
            return InKbsEingetragen(
                timestamp=e.event_timestamp,
                vflz_id=to_id(e.vflz_id),
            )
        case "AusKbsGeloescht":
            return AusKbsGeloescht(
                timestamp=e.event_timestamp,
                vflz_id=to_id(e.vflz_id),
            )
        case _:
            raise RuntimeError(f"Unknown event type: {e.event_type}")


# dict type to represent fields common between all types of Task
class TaskParams(TypedDict):
    _node: wf_models.Node
    task_id: strawberry.ID
    parent_id: strawberry.ID | None
    title: str
    type: TaskType
    status: TaskStatus
    start_datum: date
    end_datum: date | None
    faelligkeits_datum: date | None
    faelligkeits_status: FaelligkeitStatus
    vflz_id: strawberry.ID
    notiz: str | None
    read_only: bool
    deletable: bool
    kategorie: Code | None
    oeffentlich: bool
    triggers: list[EventTrigger]
    events: list[Event]


@strawberry.type
class TaskOption:
    option_id: strawberry.ID
    title: str
    type: TaskType


# Note: all subclasses of this interfaces need to be registered with the schema explicitly,
# or they won't be included in the schema, as long as all queries only return the interface type.
# See `alma.graphql.schema`.
@strawberry.interface
class Task:
    _node: strawberry.Private[wf_models.Node]
    task_id: strawberry.ID
    parent_id: strawberry.ID | None
    title: str
    type: TaskType
    status: TaskStatus
    start_datum: date
    end_datum: date | None
    faelligkeits_datum: date | None
    faelligkeits_status: FaelligkeitStatus
    vflz_id: strawberry.Private[strawberry.ID]
    notiz: str | None
    read_only: bool
    deletable: bool
    kategorie: Code | None
    oeffentlich: bool
    triggers: list[EventTrigger]
    events: list[Event]

    @strawberry.field
    def vflz(self, info: Info) -> Annotated["Vflz", strawberry.lazy(".vflz")]:
        from .vflz import Vflz

        session = info.context.db
        vflz_obj = session.get_one(vflz_models.Vflz, int(self._node.entity_id))
        return Vflz.from_db(vflz_obj)

    @strawberry.field
    def sachbearbeitung(self, info: Info) -> list[BeteiligterGeschaeft]:
        session = info.context.db
        sachbearbeitung = session.scalars(
            select(alma_wf_models.BeteiligterGeschaeft)
            .where(
                alma_wf_models.BeteiligterGeschaeft.wf_node_id == self._node.wf_node_id,
                alma_wf_models.BeteiligterGeschaeft.h_bez_art
                == CodeListe.BeziehungsartSachbearbeitung,
            )
            .order_by(alma_wf_models.BeteiligterGeschaeft.bet_task_id)
        ).all()
        return [BeteiligterGeschaeft.from_db(sb) for sb in sachbearbeitung]

    @strawberry.field
    def sonstige_beteiligte(self, info: Info) -> list[BeteiligterGeschaeft]:
        session = info.context.db
        beteiligte = session.scalars(
            select(alma_wf_models.BeteiligterGeschaeft)
            .where(
                alma_wf_models.BeteiligterGeschaeft.wf_node_id == self._node.wf_node_id,
                alma_wf_models.BeteiligterGeschaeft.h_bez_art
                == CodeListe.BeziehungsartGeschaefte,
            )
            .order_by(alma_wf_models.BeteiligterGeschaeft.bet_task_id)
        ).all()
        return [BeteiligterGeschaeft.from_db(b) for b in beteiligte]

    @staticmethod
    def get_task_params(node: wf_models.Node) -> TaskParams:
        # Hack to get the session which is needed for make_trigger() below
        session = Session.object_session(node)
        assert session
        return {
            "_node": node,
            "task_id": to_id(node.wf_node_id),
            "parent_id": to_id(node.parent_id) if node.parent_id is not None else None,
            "title": node.title,
            "type": TaskType(node.type),
            "status": TaskStatus(node.status),
            "start_datum": date(
                node.started_at.year, node.started_at.month, node.started_at.day
            ),
            "end_datum": node.finished_at.date() if node.finished_at else None,
            "faelligkeits_datum": node.deadline.date() if node.deadline else None,
            "faelligkeits_status": FaelligkeitStatus.from_datetime(node.deadline),
            "vflz_id": to_id(int(node.entity_id)),
            "notiz": node.note,
            "read_only": node.is_readonly,
            "deletable": node.is_deletable,
            "kategorie": Code.from_db(node.kategorie.kategorie)  # pyright: ignore
            if node.kategorie  # pyright: ignore
            else None,
            "oeffentlich": node.is_public,
            "triggers": [make_trigger(session, **t) for t in node.config.triggers or []]
            if node.config and not node.events_triggered
            else [],
            "events": [event_from_db(e) for e in node.events],  # pyright: ignore
        }

    @staticmethod
    def from_db_node(node: wf_models.Node) -> "Task":
        match node:
            case wf_models.WorkflowNode():
                return Prozess.from_db(node)
            case wf_models.TaskNode():
                return Aufgabe.from_db(node)
            case wf_models.FormNode():
                return Formular.from_db(node)
            case wf_models.DocumentNode():
                return Dokument.from_db(node)
            case wf_models.NoteNode():
                return Notiz.from_db(node)
            case _:
                raise ValueError("Unhandled node type: {type(node)}")

    @strawberry.field
    def folgeschritte(self, info: Info) -> list[TaskOption]:
        mgr = info.context.workflow_manager

        return [
            TaskOption(
                option_id=to_id(item.wf_config_id),
                title=item.title,
                type=TaskType(item.type),
            )
            for item in mgr.get_next_steps(self._node.wf_node_id)
        ]


@strawberry.type
class Prozess(Task):
    @classmethod
    def from_db(cls, node: wf_models.WorkflowNode) -> Self:
        return cls(**cls.get_task_params(node))


@strawberry.type
class Aufgabe(Task):
    @classmethod
    def from_db(cls, node: wf_models.TaskNode) -> Self:
        return cls(**cls.get_task_params(node))


@strawberry.type
class Dokument(Task):
    dokument: str | None
    url: str | None

    @classmethod
    def from_db(cls, node: wf_models.DocumentNode) -> Self:
        return cls(
            dokument=node.document_ref, url=node.url, **cls.get_task_params(node)
        )


@strawberry.type
class Formular(Task):
    felder: FormularFelder
    eingaben: FormularEingaben

    @classmethod
    def from_db(cls, node: wf_models.FormNode) -> Self:
        return cls(
            felder=node.form_config.get("fields", []),
            eingaben=node.form_data,
            **cls.get_task_params(node),
        )


@strawberry.type
class Notiz(Task):
    url: str | None

    @classmethod
    def from_db(cls, node: wf_models.NoteNode) -> Self:
        return cls(url=node.url, **cls.get_task_params(node))


@strawberry.input
class UpdateProzessInput:
    task_id: strawberry.ID
    title: str
    start_datum: date
    faelligkeits_datum: date | None
    end_datum: date | None
    status: TaskStatus
    notiz: str | None
    sachbearbeitung: list[BeteiligterGeschaeftInput]
    sonstige_beteiligte: list[BeteiligterGeschaeftInput]

    def validate(self) -> list[Problem]:
        problems: list[Problem] = []
        if (
            self.end_datum
            and (self.start_datum > self.end_datum)
            or (self.faelligkeits_datum and self.status == TaskStatus.RUHEND)
            or (self.end_datum and self.status == TaskStatus.OFFEN)
        ):
            problems.append(
                Problem(
                    message="Invalid timestamp values.",
                    problem_code=ProblemCode.VALIDATION,
                    field="",
                )
            )
        return problems


@strawberry.input
class UpdateAufgabeInput:
    task_id: strawberry.ID
    title: str
    start_datum: date
    faelligkeits_datum: date | None
    end_datum: date | None
    status: TaskStatus
    notiz: str | None
    sachbearbeitung: list[BeteiligterGeschaeftInput]
    sonstige_beteiligte: list[BeteiligterGeschaeftInput]

    def validate(self) -> list[Problem]:
        problems: list[Problem] = []
        if (
            self.end_datum
            and self.start_datum > self.end_datum
            or (self.faelligkeits_datum and self.status == TaskStatus.RUHEND)
            or (self.end_datum and self.status == TaskStatus.OFFEN)
        ):
            problems.append(
                Problem(
                    message="Invalid timestamp values.",
                    problem_code=ProblemCode.VALIDATION,
                    field="",
                )
            )
        return problems


@strawberry.input
class UpdateDokumentInput:
    task_id: strawberry.ID
    title: str
    dokument: str | None
    start_datum: date
    notiz: str | None
    sachbearbeitung: list[BeteiligterGeschaeftInput]
    sonstige_beteiligte: list[BeteiligterGeschaeftInput]
    kategorie: CodeInput | None
    oeffentlich: bool
    url: str | None = None


@strawberry.input
class UpdateNotizInput:
    task_id: strawberry.ID
    title: str
    start_datum: date
    notiz: str | None
    sachbearbeitung: list[BeteiligterGeschaeftInput]
    sonstige_beteiligte: list[BeteiligterGeschaeftInput]
    kategorie: CodeInput | None
    oeffentlich: bool
    url: str | None = None


@strawberry.input
class UpdateFormularInput:
    task_id: strawberry.ID
    title: str
    start_datum: date
    notiz: str | None
    eingaben: FormularEingaben | None
    sachbearbeitung: list[BeteiligterGeschaeftInput]
    sonstige_beteiligte: list[BeteiligterGeschaeftInput]

    def validate(self, session: Session) -> list[Problem]:
        if self.eingaben is None:
            return []

        def validate_type(field_type: str, field_data: str) -> bool:
            try:
                if field_type == "str":
                    str(field_data)
                if field_type == "int":
                    int(field_data)
                if field_type == "datetime":
                    datetime.fromisoformat(field_data)
            except ValueError:
                return False
            return True

        problems: list[Problem] = []

        form_node = session.get_one(wf_models.FormNode, int(self.task_id))

        field_definitions = {
            f["name"]: f for f in form_node.form_config.get("fields", [])
        }

        if set(self.eingaben.keys()) != set(field_definitions.keys()):
            return [
                Problem(
                    problem_code=ProblemCode.VALIDATION,
                    message="Form fields to be set do not match form configuration.",
                    field="eingaben",
                )
            ]

        for name, value in self.eingaben.items():
            if field_definition := field_definitions.get(name):  # noqa: SIM102
                if not validate_type(field_definition["type"], value):
                    problems.append(
                        Problem(
                            problem_code=ProblemCode.VALIDATION,
                            message="Field value not allowed",
                            field=name,
                        )
                    )
                    continue

                if choices := field_definition.get("choices"):  # noqa: SIM102
                    if value not in [c["value"] for c in choices]:
                        problems.append(
                            Problem(
                                problem_code=ProblemCode.VALIDATION,
                                message=f"Choice value {value} not found in choices values.",
                                field=name,
                            )
                        )

        return problems


@strawberry.type
class PaginatedTaskResult:
    num_pages: int
    num_results_total: int
    results: list[Task]
    page: int
    per_page: int


@strawberry.input
class StartProzessInput:
    vflz_id: strawberry.ID
    option_id: strawberry.ID


@strawberry.type
class StartProzessResult:
    prozess: Prozess


@strawberry.input
class StartTaskInput:
    task_id: strawberry.ID
    option_id: strawberry.ID


@strawberry.type
class StartTaskResult:
    task: Task


@strawberry.input
class CreateNotizInput:
    title: str
    start_datum: date
    vflz_id: strawberry.ID
    notiz: str
    task_id: strawberry.ID | None = None
    kategorie: CodeInput | None
    oeffentlich: bool
    url: str | None = None


@strawberry.input
class CreateDokumentInput:
    title: str
    start_datum: date
    vflz_id: strawberry.ID
    dokument: str
    notiz: str
    task_id: strawberry.ID | None = None
    kategorie: CodeInput | None
    oeffentlich: bool
    url: str | None = None


@strawberry.input
class CreateAufgabeInput:
    title: str
    start_datum: date
    faelligkeits_datum: date
    vflz_id: strawberry.ID
    notiz: str | None
    task_id: strawberry.ID | None = None


@strawberry.input
class GeschaefteFilter:
    status: list[TaskStatus] | None
    eigene: bool | None
    faelligkeit: list[FaelligkeitStatus] | None
    teilflaechen: list[str] | None
    task_typ: list[TaskType] | None
    titel: str | None

    def gen_filter_clause(
        self, model_cls: type[wf_models.Node], user: auth_models.User
    ) -> ColumnElement[bool] | BinaryExpression[bool]:
        """Generates a SQL-Filter clause to filter `model_cls` given the filter."""
        filter_clause = true()
        if self.status:
            status_values: list[NodeStatus] = [s.value for s in self.status]
            filter_clause = and_(
                filter_clause,
                model_cls.status.in_(status_values),
            )
        if self.faelligkeit:
            filter_faelligkeit_clause = false()
            for faelligkeit in self.faelligkeit:
                match faelligkeit:
                    case FaelligkeitStatus.UEBERFAELLIG:
                        filter_faelligkeit_clause = or_(
                            filter_faelligkeit_clause,
                            model_cls.deadline < datetime.now(),
                        )
                    case FaelligkeitStatus.FAELLIG_NAECHSTE_WOCHE:
                        filter_faelligkeit_clause = or_(
                            filter_faelligkeit_clause,
                            and_(
                                model_cls.deadline
                                < (datetime.now() + timedelta(weeks=4)),
                                model_cls.deadline > datetime.now(),
                            ),
                        )
                    case FaelligkeitStatus.FAELLIG_SPAETER:
                        filter_faelligkeit_clause = or_(
                            filter_faelligkeit_clause,
                            and_(
                                ~model_cls.deadline.is_(None),
                                model_cls.deadline
                                >= (datetime.now() + timedelta(weeks=4)),
                            ),
                        )
                    case FaelligkeitStatus.RUHEND:
                        filter_faelligkeit_clause = or_(
                            filter_faelligkeit_clause,
                            model_cls.deadline.is_(None),
                        )
            filter_clause = and_(filter_clause, filter_faelligkeit_clause)
        if self.teilflaechen:
            vflz_ids = (
                select(vflz_models.Vflz.vflz_id)
                .where(vflz_models.Vflz.combined_id.in_(self.teilflaechen))
                .subquery()
            )
            filter_clause = and_(
                filter_clause,
                cast(model_cls.entity_id, Integer).in_(select(vflz_ids)),
            )
        if self.eigene:
            eigene_wf_node_ids = (
                select(model_cls.wf_node_id)
                .join(
                    alma_wf_models.BeteiligterGeschaeft,
                    alma_wf_models.BeteiligterGeschaeft.wf_node_id
                    == model_cls.wf_node_id,
                )
                .join(subj_models.Subjekt)
                .where(subj_models.Subjekt.user == user)
                .subquery()
            )
            filter_clause = and_(
                filter_clause, model_cls.wf_node_id.in_(select(eigene_wf_node_ids))
            )
        if self.task_typ:
            filter_clause = and_(
                filter_clause, model_cls.type.in_([t.value for t in self.task_typ])
            )
        if self.titel:
            # `model_cls.title` is either a literal, freely entered title, or a
            # translation key (msgid) referencing the `translations` table
            # (used for titles coming from workflow templates). We need to
            # match on either the literal title or any of its translations.
            translation_match = (
                select(Translation.key)
                .where(
                    Translation.key == model_cls.title,
                    Translation.value.icontains(self.titel),
                )
                .exists()
            )
            filter_clause = and_(
                filter_clause,
                or_(model_cls.title.icontains(self.titel), translation_match),
            )
        return filter_clause


@strawberry.type
class WorkflowProblemGroup:
    problems: list[Problem]
    faelligkeits_datum_problem_tasks: list[Task]
    status_problem_tasks: list[Task]
    open_events_problem_tasks: list[Task]
