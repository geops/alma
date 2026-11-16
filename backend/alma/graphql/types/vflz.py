import math
import warnings
from collections.abc import Sequence
from dataclasses import field
from datetime import date, datetime
from logging import getLogger
from typing import TYPE_CHECKING, Self, cast

import strawberry
from business_workflow_manager import models as wf_models
from sqlalchemy import func, select, true
from sqlalchemy.exc import SAWarning
from sqlalchemy.orm import Session

from alma import constants
from alma import protocols as alma_protocols
from alma.models import cache as cache_models
from alma.models import codes as code_models
from alma.models import gem as gem_models
from alma.models import grun as grun_models
from alma.models import subj as subj_models
from alma.models import vflz as vflz_models
from alma.permissions import Permission, get_permission_class
from alma.settings import settings

from ..scalars import GeoJSONPoint, GeoJSONPointOrMultiPolygon
from ..utils.eigentum import get_eigentum
from ..utils.geschaefte import get_paginated_task_result
from ..utils.pagination import validate_per_page
from ..utils.schema import Info, to_id
from . import umwelt as umwelt_types
from .bem import Bemerkung, BemerkungInput
from .bet import (
    Beteiligter,
    BeteiligterStandort,
    SachbearbeiterStandort,
)
from .codes import Code, CodeInput, KbsInfo
from .gem import Gemeinde, GemeindeInput
from .grun import Eigentum, GemeindeNummerierungsbereich, Nummerierungsbereich, Parzelle
from .misc import ErfassungMutation
from .problems import Problem, ProblemCode
from .workflow import (
    GeschaefteFilter,
    PaginatedTaskResult,
    SortTasks,
    TaskOption,
    TaskType,
)

# See https://github.com/strawberry-graphql/strawberry/issues/3543
if TYPE_CHECKING:
    Language = constants.Language
    StandortTyp = constants.StandortTyp
else:
    Language = strawberry.enum(constants.Language)
    StandortTyp = strawberry.enum(constants.StandortTyp)

logger = getLogger(__name__)


@strawberry.type
class Objekt:
    obje_id: strawberry.ID
    erfassung_mutation: ErfassungMutation

    @classmethod
    def from_db(cls, obje: vflz_models.Objekt) -> Self:
        return cls(
            obje_id=to_id(obje.obje_id),
            erfassung_mutation=ErfassungMutation.from_db(obje),
        )


@strawberry.interface
class BasisZeitraum:
    von: date | None
    bis: date | None
    vonjahr: bool
    bisjahr: bool
    bisheute: bool

    @classmethod
    def _from_db(cls, db_obj: alma_protocols.ZeitraumProtocol) -> Self:
        return cls(
            von=db_obj.zeitraum_von,
            bis=db_obj.zeitraum_bis,
            vonjahr=db_obj.zeitraum_vonjahr,
            bisjahr=db_obj.zeitraum_bisjahr,
            bisheute=db_obj.zeitraum_bisheute,
        )


@strawberry.type
class Zeitraum(BasisZeitraum):
    @classmethod
    def from_db(cls, db_obj: alma_protocols.ZeitraumProtocol) -> Self:
        return super()._from_db(db_obj)


@strawberry.type
class ZeitraumMitGenauigkeit(BasisZeitraum):
    genauigkeit_von: Code | None = None
    genauigkeit_bis: Code | None = None

    @classmethod
    def from_db(cls, db_obj: alma_protocols.ZeitraumMitGenauigkeitProtocol) -> Self:
        obj = super()._from_db(db_obj)
        obj.genauigkeit_von = Code.from_db_or_none(db_obj.genauigkeit_von)
        obj.genauigkeit_bis = Code.from_db_or_none(db_obj.genauigkeit_bis)
        return obj


@strawberry.input
class ZeitraumInput:
    von: date | None
    bis: date | None
    vonjahr: bool | None
    bisjahr: bool | None
    bisheute: bool | None


@strawberry.input
class ZeitraumMitGenauigkeitInput(ZeitraumInput):
    genauigkeit_von: CodeInput | None
    genauigkeit_bis: CodeInput | None


@strawberry.type
class KompartimentStoffgruppe:
    kksg_id: strawberry.ID
    stoffgruppe: Code | None

    teilvol: float | None
    erfassung_mutation: ErfassungMutation

    @classmethod
    def from_db(
        cls, kompartiment_stoffgruppe: vflz_models.KompartimentStoffgruppe
    ) -> Self:
        return cls(
            kksg_id=to_id(kompartiment_stoffgruppe.kksg_id),
            stoffgruppe=Code.from_db_or_none(kompartiment_stoffgruppe.stoffgruppe),
            teilvol=kompartiment_stoffgruppe.teilvol,
            erfassung_mutation=ErfassungMutation.from_db(kompartiment_stoffgruppe),
        )


@strawberry.input
class KompartimentStoffgruppeInput:
    kksg_id: strawberry.ID | None
    stoffgruppe: CodeInput | None
    teilvol: float | None


@strawberry.type
class KompartimentStoffklasse:
    kksk_id: strawberry.ID
    stoffklasse: Code | None
    teilvol: float | None
    zeitraum: ZeitraumMitGenauigkeit | None
    kompartiment_stoffgruppen: list[KompartimentStoffgruppe] = field(
        default_factory=list
    )
    erfassung_mutation: ErfassungMutation

    @classmethod
    def from_db(
        cls, kompartiment_stoffklasse: vflz_models.KompartimentStoffklasse
    ) -> Self:
        return cls(
            kksk_id=to_id(kompartiment_stoffklasse.kksk_id),
            stoffklasse=Code.from_db_or_none(kompartiment_stoffklasse.stoffklasse),
            teilvol=kompartiment_stoffklasse.teilvol,
            zeitraum=ZeitraumMitGenauigkeit.from_db(kompartiment_stoffklasse),
            kompartiment_stoffgruppen=[
                KompartimentStoffgruppe.from_db(s)
                for s in kompartiment_stoffklasse.kompartiment_stoffgruppen
            ],
            erfassung_mutation=ErfassungMutation.from_db(kompartiment_stoffklasse),
        )


@strawberry.input
class KompartimentStoffklasseInput:
    kksk_id: strawberry.ID | None
    stoffklasse: CodeInput | None
    teilvol: float | None
    zeitraum: ZeitraumMitGenauigkeitInput | None
    kompartiment_stoffgruppen: list[KompartimentStoffgruppeInput] = field(
        default_factory=list
    )


@strawberry.type
class Ablagerung:
    _ablagerung: strawberry.Private[vflz_models.Ablagerung]
    inta_id: strawberry.ID
    vol_kompartiment: float | None
    tiefe: str | None
    zeitraum: Zeitraum | None

    kompartiment_stoffklassen: list[KompartimentStoffklasse] = field(
        default_factory=list
    )
    erfassung_mutation: ErfassungMutation

    @classmethod
    def from_db(cls, ablagerung: vflz_models.Ablagerung) -> Self:
        return cls(
            _ablagerung=ablagerung,
            inta_id=to_id(ablagerung.inta_id),
            vol_kompartiment=ablagerung.vol_kompartiment,
            tiefe=ablagerung.tiefe,
            kompartiment_stoffklassen=[
                KompartimentStoffklasse.from_db(s)
                for s in ablagerung.kompartiment_stoffklassen
            ],
            zeitraum=Zeitraum.from_db(ablagerung),
            erfassung_mutation=ErfassungMutation.from_db(ablagerung),
        )

    @strawberry.field
    def bemerkung(self, info: Info) -> Bemerkung | None:
        if bemerkung := self._ablagerung.bemerkung:
            return Bemerkung.from_db(bemerkung)

    @strawberry.field
    def bemerkung_datenimport(self, info: Info) -> Bemerkung | None:
        if bemerkung_datenimport := self._ablagerung.bemerkung_datenimport:
            return Bemerkung.from_db(bemerkung_datenimport)


@strawberry.input
class AblagerungInput:
    inta_id: strawberry.ID | None
    vol_kompartiment: float | None
    tiefe: str | None
    zeitraum: ZeitraumInput | None
    kompartiment_stoffklassen: list[KompartimentStoffklasseInput] = field(
        default_factory=list
    )
    bemerkung: BemerkungInput | None
    bemerkung_datenimport: BemerkungInput | None


@strawberry.interface
class BasisBetrieb:
    _betrieb: strawberry.Private[vflz_models.BasisBetrieb]
    intb_id: strawberry.ID
    branche_asw: Code | None
    branche_noga: Code | None
    untersuchungs_stand: Code | None
    beurteilung: Code | None
    firma_name: str | None
    firma_strasse: str | None
    firma_plz: str | None
    firma_ort: str | None
    groesse: int | None
    eva: str | None
    zeitraum: ZeitraumMitGenauigkeit | None
    relevant: bool | None
    mobile_stoffe: bool | None
    erfassung_mutation: ErfassungMutation | None
    zentroid: GeoJSONPoint | None

    @strawberry.field
    def bemerkung(self, info: Info) -> Bemerkung | None:
        if bemerkung := self._betrieb.bemerkung:
            return Bemerkung.from_db(bemerkung)

    @strawberry.field
    def begruendung_bewertung(self, info: Info) -> Bemerkung | None:
        if begruendung_bewertung := self._betrieb.begruendung_bewertung:
            return Bemerkung.from_db(begruendung_bewertung)

    @classmethod
    def _from_db(cls, betrieb: vflz_models.BasisBetrieb) -> Self:
        return cls(
            _betrieb=betrieb,
            intb_id=to_id(betrieb.intb_id),
            branche_asw=Code.from_db_or_none(betrieb.branche_asw),
            branche_noga=Code.from_db_or_none(betrieb.branche_noga),
            untersuchungs_stand=Code.from_db_or_none(betrieb.untersuchungs_stand),
            beurteilung=Code.from_db_or_none(betrieb.beurteilung),
            zeitraum=ZeitraumMitGenauigkeit.from_db(betrieb),
            firma_name=betrieb.firma_name,
            firma_strasse=betrieb.firma_strasse,
            firma_plz=betrieb.firma_plz,
            firma_ort=betrieb.firma_ort,
            groesse=betrieb.groesse,
            eva=betrieb.eva,
            zentroid=cast(GeoJSONPoint | None, betrieb.zentroid_geojson),
            relevant=betrieb.relevant,
            mobile_stoffe=betrieb.mobile_stoffe,
            erfassung_mutation=ErfassungMutation.from_db(betrieb),
        )


@strawberry.type
class Betrieb(BasisBetrieb):
    bemerkung_datenimport: Bemerkung | None = None

    @classmethod
    def from_db(cls, betrieb: vflz_models.Betrieb) -> Self:
        obj = super()._from_db(betrieb)
        obj.bemerkung_datenimport = (
            Bemerkung.from_db(betrieb.bemerkung_datenimport)
            if betrieb.bemerkung_datenimport
            else None
        )
        return obj


@strawberry.input
class BetriebInput:
    intb_id: strawberry.ID | None
    branche_asw: CodeInput | None
    branche_noga: CodeInput | None
    untersuchungs_stand: CodeInput | None
    beurteilung: CodeInput | None
    firma_name: str | None
    firma_strasse: str | None
    firma_plz: str | None
    firma_ort: str | None
    groesse: int | None
    eva: str | None
    zeitraum: ZeitraumMitGenauigkeitInput | None
    relevant: bool | None
    mobile_stoffe: bool | None
    zentroid: GeoJSONPoint | None
    bemerkung: BemerkungInput | None
    bemerkung_datenimport: BemerkungInput | None
    begruendung_bewertung: BemerkungInput | None


@strawberry.type
class Schiessanlage(BasisBetrieb):
    typ: Code | None = None
    schusszahl: int | None = None
    scheibenzahl: int | None = None
    hat_kugelfang: bool | None = None
    bemerkung_datenimport: Bemerkung | None = None

    @classmethod
    def from_db(cls, schiessanlage: vflz_models.Schiessanlage) -> Self:
        obj = super()._from_db(schiessanlage)
        obj.typ = Code.from_db_or_none(schiessanlage.typ)
        obj.schusszahl = schiessanlage.schusszahl
        obj.scheibenzahl = schiessanlage.scheibenzahl
        obj.hat_kugelfang = schiessanlage.hat_kugelfang
        obj.bemerkung_datenimport = (
            Bemerkung.from_db(schiessanlage.bemerkung_datenimport)
            if schiessanlage.bemerkung_datenimport
            else None
        )
        return obj


@strawberry.input
class SchiessanlageInput(BetriebInput):
    typ: CodeInput | None
    schusszahl: int | None
    scheibenzahl: int | None
    hat_kugelfang: bool | None
    bemerkung_datenimport: BemerkungInput | None


@strawberry.type
class Unfall:
    _unfall: strawberry.Private[vflz_models.Unfall]
    intu_id: strawberry.ID
    genauigkeit_zeitpunkt: Code | None
    name: str | None
    zeitpunkt: date | None
    zeitpunktjahr: bool

    unfallstoffe: list["Unfallstoff"] = field(default_factory=list)

    erfassung_mutation: ErfassungMutation

    @classmethod
    def from_db(cls, unfall: vflz_models.Unfall) -> Self:
        return cls(
            _unfall=unfall,
            intu_id=to_id(unfall.intu_id),
            genauigkeit_zeitpunkt=Code.from_db_or_none(unfall.genauigkeit_zeitpunkt),
            name=unfall.name,
            zeitpunkt=unfall.zeitpunkt,
            zeitpunktjahr=unfall.zeitpunkt_jahr,
            unfallstoffe=[Unfallstoff.from_db(u) for u in unfall.unfallstoffe],
            erfassung_mutation=ErfassungMutation.from_db(unfall),
        )

    @strawberry.field
    def bemerkung(self, info: Info) -> Bemerkung | None:
        if bemerkung := self._unfall.bemerkung:
            return Bemerkung.from_db(bemerkung)

    @strawberry.field
    def bemerkung_datenimport(self, info: Info) -> Bemerkung | None:
        if bemerkung := self._unfall.bemerkung_datenimport:
            return Bemerkung.from_db(bemerkung)


@strawberry.input
class UnfallInput:
    intu_id: strawberry.ID | None
    genauigkeit_zeitpunkt: CodeInput | None
    name: str | None
    zeitpunkt: date | None
    zeitpunktjahr: bool | None
    unfallstoffe: list["UnfallstoffInput"] = field(default_factory=list)
    bemerkung: BemerkungInput | None
    bemerkung_datenimport: BemerkungInput | None


@strawberry.type
class Unfallstoff:
    inum_id: strawberry.ID
    stoff: Code | None
    stoffmng: float | None
    ausgelaufen: float | None
    zurueckgewonnen: float | None
    erfassung_mutation: ErfassungMutation

    @classmethod
    def from_db(cls, unfallstoff: vflz_models.Unfallstoff) -> Self:
        return cls(
            inum_id=to_id(unfallstoff.inum_id),
            stoff=Code.from_db_or_none(unfallstoff.stoff),
            stoffmng=unfallstoff.stoffmng,
            ausgelaufen=unfallstoff.ausgelaufen,
            zurueckgewonnen=unfallstoff.zurueckgewonnen,
            erfassung_mutation=ErfassungMutation.from_db(unfallstoff),
        )


@strawberry.input
class UnfallstoffInput:
    inum_id: strawberry.ID | None
    stoff: CodeInput | None
    stoffmng: float | None
    ausgelaufen: float | None
    zurueckgewonnen: float | None


@strawberry.type
class LoeschschaumEinsatz:
    intp_loeschschaum_einsatz_id: strawberry.ID
    loeschschaum_einsatz: Code
    haeufigkeit_nutzung: Code | None

    @classmethod
    def from_db(cls, loeschschaum_einsatz: vflz_models.LoeschschaumEinsatz) -> Self:
        return cls(
            intp_loeschschaum_einsatz_id=to_id(
                loeschschaum_einsatz.intp_loeschschaum_einsatz_id
            ),
            loeschschaum_einsatz=Code.from_db(
                loeschschaum_einsatz.loeschschaum_einsatz
            ),
            haeufigkeit_nutzung=Code.from_db_or_none(
                loeschschaum_einsatz.haeufigkeit_nutzung
            ),
        )


@strawberry.input
class LoeschschaumEinsatzInput:
    intp_loeschschaum_einsatz_id: strawberry.ID | None
    loeschschaum_einsatz: CodeInput
    haeufigkeit_nutzung: CodeInput | None


@strawberry.type
class PFAS:
    _pfas: strawberry.Private[vflz_models.PFAS]
    intp_id: strawberry.ID
    untersuchungs_stand: Code | None
    beurteilung: Code | None
    branche: Code | None
    pfas_typ: Code | None
    pfas_haltige_loeschmittel: list[Code] = field(default_factory=list)
    pfas_freie_loeschmittel: list[Code] = field(default_factory=list)
    loeschschaum_einsatz: list[LoeschschaumEinsatz] = field(default_factory=list)

    name: str | None
    strasse: str | None
    plz: str | None
    ort: str | None
    eva: str | None

    zeitraum: ZeitraumMitGenauigkeit | None

    erfassung_mutation: ErfassungMutation
    pfas_loeschmittel: bool | None
    relevant: bool | None
    menge_schaumgemisch: int | None
    menge_konzentrat: int | None
    beschreibungen_detail: str | None

    zentroid: GeoJSONPoint | None

    @strawberry.field
    def bemerkung(self, info: Info) -> Bemerkung | None:
        if bemerkung := self._pfas.bemerkung:
            return Bemerkung.from_db(bemerkung)

    @strawberry.field
    def bemerkung_datenimport(self, info: Info) -> Bemerkung | None:
        if bemerkung_datenimport := self._pfas.bemerkung_datenimport:
            return Bemerkung.from_db(bemerkung_datenimport)

    @strawberry.field
    def begruendung_bewertung(self, info: Info) -> Bemerkung | None:
        if begruendung_bewertung := self._pfas.begruendung_bewertung:
            return Bemerkung.from_db(begruendung_bewertung)

    @classmethod
    def from_db(cls, pfas: vflz_models.PFAS) -> Self:
        return cls(
            _pfas=pfas,
            intp_id=to_id(pfas.intp_id),
            untersuchungs_stand=Code.from_db_or_none(pfas.untersuchungs_stand),
            beurteilung=Code.from_db_or_none(pfas.beurteilung),
            branche=Code.from_db_or_none(pfas.branche),
            pfas_typ=Code.from_db_or_none(pfas.pfas_typ),
            pfas_haltige_loeschmittel=[
                Code.from_db(code) for code in pfas.pfas_haltige_loeschmittel
            ],
            pfas_freie_loeschmittel=[
                Code.from_db(code) for code in pfas.pfas_freie_loeschmittel
            ],
            loeschschaum_einsatz=[
                LoeschschaumEinsatz.from_db(le) for le in pfas.loeschschaum_einsatz
            ],
            name=pfas.name,
            strasse=pfas.strasse,
            plz=pfas.plz,
            ort=pfas.ort,
            eva=pfas.eva,
            zeitraum=ZeitraumMitGenauigkeit.from_db(pfas),
            erfassung_mutation=ErfassungMutation.from_db(pfas),
            pfas_loeschmittel=pfas.pfas_loeschmittel,
            relevant=pfas.relevant,
            menge_schaumgemisch=pfas.menge_schaumgemisch,
            menge_konzentrat=pfas.menge_konzentrat,
            beschreibungen_detail=pfas.beschreibungen_detail,
            zentroid=cast(GeoJSONPoint | None, pfas.zentroid_geojson),
        )


@strawberry.input
class PFASInput:
    intp_id: strawberry.ID | None
    untersuchungs_stand: CodeInput | None
    beurteilung: CodeInput | None
    branche: CodeInput | None
    pfas_typ: CodeInput | None
    pfas_haltige_loeschmittel: list[CodeInput] = field(default_factory=list)
    pfas_freie_loeschmittel: list[CodeInput] = field(default_factory=list)
    loeschschaum_einsatz: list[LoeschschaumEinsatzInput] = field(default_factory=list)

    bemerkung: BemerkungInput | None
    bemerkung_datenimport: BemerkungInput | None
    begruendung_bewertung: BemerkungInput | None

    name: str | None
    strasse: str | None
    plz: str | None
    ort: str | None
    eva: str | None

    zeitraum: ZeitraumMitGenauigkeitInput | None

    pfas_loeschmittel: bool | None
    relevant: bool | None
    menge_schaumgemisch: int | None
    menge_konzentrat: int | None
    beschreibungen_detail: str | None

    zentroid: GeoJSONPoint | None


@strawberry.type
class KinderspielplatzGruenflaeche:
    _kinderspielplatz: strawberry.Private[vflz_models.KinderspielplatzGruenflaeche]
    intk_id: strawberry.ID
    kinderspielplatz_gruenflache_typ: Code | None
    eigentumsform: Code | None
    beurteilung: Code | None
    untersuchungs_stand: Code | None
    name: str | None
    strasse: str | None
    plz: str | None
    ort: str | None
    eva: str | None
    zeitraum: ZeitraumMitGenauigkeit | None
    relevant: bool | None
    belastung_ueber_sanierungswert: bool | None
    zentroid: GeoJSONPoint | None
    altersstufen_kinder: list[Code] = field(default_factory=list)
    erfassung_mutation: ErfassungMutation

    @strawberry.field
    def bemerkung(self, info: Info) -> Bemerkung | None:
        if bemerkung := self._kinderspielplatz.bemerkung:
            return Bemerkung.from_db(bemerkung)

    @strawberry.field
    def bemerkung_datenimport(self, info: Info) -> Bemerkung | None:
        if bemerkung_datenimport := self._kinderspielplatz.bemerkung_datenimport:
            return Bemerkung.from_db(bemerkung_datenimport)

    @strawberry.field
    def begruendung_bewertung(self, info: Info) -> Bemerkung | None:
        if begruendung_bewertung := self._kinderspielplatz.begruendung_bewertung:
            return Bemerkung.from_db(begruendung_bewertung)

    @classmethod
    def from_db(cls, intk: vflz_models.KinderspielplatzGruenflaeche) -> Self:
        return cls(
            _kinderspielplatz=intk,
            intk_id=to_id(intk.intk_id),
            kinderspielplatz_gruenflache_typ=Code.from_db_or_none(
                intk.kinderspielplatz_gruenflache_typ
            ),
            eigentumsform=Code.from_db_or_none(intk.eigentumsform),
            beurteilung=Code.from_db_or_none(intk.beurteilung),
            untersuchungs_stand=Code.from_db_or_none(intk.untersuchungs_stand),
            name=intk.name,
            strasse=intk.strasse,
            plz=intk.plz,
            ort=intk.ort,
            eva=intk.eva,
            zeitraum=ZeitraumMitGenauigkeit.from_db(intk),
            relevant=intk.relevant,
            belastung_ueber_sanierungswert=intk.belastung_ueber_sanierungswert,
            zentroid=cast(GeoJSONPoint | None, intk.zentroid_geojson),
            altersstufen_kinder=[Code.from_db(c) for c in intk.altersstufen_kinder],
            erfassung_mutation=ErfassungMutation.from_db(intk),
        )


@strawberry.input
class KinderspielplatzGruenflaecheInput:
    intk_id: strawberry.ID | None
    kinderspielplatz_gruenflache_typ: CodeInput | None
    eigentumsform: CodeInput | None
    beurteilung: CodeInput | None
    untersuchungs_stand: CodeInput | None
    name: str | None
    strasse: str | None
    plz: str | None
    ort: str | None
    eva: str | None
    zeitraum: ZeitraumMitGenauigkeitInput | None
    relevant: bool | None
    belastung_ueber_sanierungswert: bool | None
    zentroid: GeoJSONPoint | None
    altersstufen_kinder: list[CodeInput] = field(default_factory=list)
    bemerkung: BemerkungInput | None
    bemerkung_datenimport: BemerkungInput | None
    begruendung_bewertung: BemerkungInput | None


@strawberry.type
class Beurteilung:
    _beurteilung: strawberry.Private[vflz_models.Beurteilung]
    vflz_id: strawberry.ID
    beurteilung: Code | None
    rechtlicher_bezug: Code | None
    handlungsbedarf: Code | None
    prio_untersuch: Code | None
    prio_sanier: Code | None
    erfassung_mutation: ErfassungMutation

    @classmethod
    def from_db(cls, beurteilung: vflz_models.Beurteilung) -> Self:
        return cls(
            _beurteilung=beurteilung,
            vflz_id=to_id(beurteilung.vflz_id),
            beurteilung=Code.from_db_or_none(beurteilung.beurteilung),
            rechtlicher_bezug=Code.from_db_or_none(beurteilung.rechtlicher_bezug),
            handlungsbedarf=Code.from_db_or_none(beurteilung.handlungsbedarf),
            prio_untersuch=Code.from_db_or_none(beurteilung.prio_untersuch),
            prio_sanier=Code.from_db_or_none(beurteilung.prio_sanier),
            erfassung_mutation=ErfassungMutation.from_db(beurteilung),
        )

    @strawberry.field
    def kbs_info(self, info: Info) -> KbsInfo | None:
        if kbs_info := self._beurteilung.kbs_info:
            return KbsInfo.from_db(kbs_info)


@strawberry.input
class BeurteilungInput:
    beurteilung: CodeInput | None
    prio_untersuch: CodeInput | None
    prio_sanier: CodeInput | None


@strawberry.type
class Massnahme:
    _massnahme: strawberry.Private[vflz_models.Massnahme]
    mass_id: strawberry.ID
    massnahme: Code | None
    dat_massnahme: date | None
    ang_massnahme: date | None
    erfassung_mutation: ErfassungMutation

    @classmethod
    def from_db(cls, massnahme: vflz_models.Massnahme) -> Self:
        return cls(
            _massnahme=massnahme,
            mass_id=to_id(massnahme.mass_id),
            massnahme=Code.from_db_or_none(massnahme.massnahme),
            dat_massnahme=massnahme.dat_massnahme,
            ang_massnahme=massnahme.ang_massnahme,
            erfassung_mutation=ErfassungMutation.from_db(massnahme),
        )

    @strawberry.field
    def bemerkung(self, info: Info) -> Bemerkung | None:
        if bemerkung := self._massnahme.bemerkung:
            return Bemerkung.from_db(bemerkung)


@strawberry.input
class MassnahmeInput:
    mass_id: strawberry.ID | None
    massnahme: CodeInput | None
    dat_massnahme: date | None
    ang_massnahme: date | None
    bemerkung: BemerkungInput | None


@strawberry.type
class Sanierungsziel:
    _sanierungsziel: strawberry.Private[vflz_models.Sanierungsziel]
    sani_id: strawberry.ID
    sanierungsziel: Code | None
    erfassung_mutation: ErfassungMutation

    @classmethod
    def from_db(cls, sanierungsziel: vflz_models.Sanierungsziel) -> Self:
        return cls(
            _sanierungsziel=sanierungsziel,
            sani_id=to_id(sanierungsziel.sani_id),
            sanierungsziel=Code.from_db_or_none(sanierungsziel.sanierungsziel),
            erfassung_mutation=ErfassungMutation.from_db(sanierungsziel),
        )

    @strawberry.field
    def bemerkung(self, info: Info) -> Bemerkung | None:
        if bemerkung := self._sanierungsziel.bemerkung:
            return Bemerkung.from_db(bemerkung)


@strawberry.input
class SanierungszielInput:
    sani_id: strawberry.ID | None
    sanierungsziel: CodeInput | None
    bemerkung: BemerkungInput | None


@strawberry.type
class VflGeo:
    geometry: GeoJSONPointOrMultiPolygon | None
    erfassung_mutation: ErfassungMutation | None

    @classmethod
    def from_db(cls, vflgeo: vflz_models.VflGeo) -> Self:
        return cls(
            geometry=cast(
                GeoJSONPointOrMultiPolygon | None, vflgeo.wkb_geometry_geojson
            ),
            erfassung_mutation=ErfassungMutation.from_db(vflgeo),
        )


@strawberry.input
class VflGeoInput:
    geometry: GeoJSONPointOrMultiPolygon


@strawberry.type
class ValidatedParzelle:
    gemeinde: Gemeinde | None = None
    nummerierungsbereich: str | None = None
    egrid: str | None = None
    gb_nummer: str


@strawberry.type
class ValidatedVflzData:
    ort: list[str]
    postleitzahl: list[str]
    gemeinde: list[Gemeinde]
    parzelle: list[ValidatedParzelle]
    gws_bereich: list[Code]
    gws_zone: list[Code]
    flugplatz: list[Code]

    @classmethod
    def from_cache(
        cls, session: Session, cached_data: Sequence[cache_models.WfsCache]
    ) -> Self:
        validated_vflz_data = cls(
            ort=[],
            postleitzahl=[],
            gemeinde=[],
            gws_bereich=[],
            gws_zone=[],
            parzelle=[],
            flugplatz=[],
        )
        seen_gem_ids: set[int] = set()
        seen_parzellen: set[tuple[str | None, str | None]] = set()
        seen_orte: set[str] = set()
        seen_plz: set[str] = set()
        seen_gws_bereich: set[str] = set()
        seen_gws_zone: set[str] = set()

        for row in cached_data:
            if row.ort is not None and row.ort not in seen_orte:
                seen_orte.add(row.ort)
                validated_vflz_data.ort.append(row.ort)
            if row.postleitzahl is not None and row.postleitzahl not in seen_plz:
                seen_plz.add(row.postleitzahl)
                validated_vflz_data.postleitzahl.append(row.postleitzahl)
            if row.h_gem_id is not None and row.h_gem_id not in seen_gem_ids:
                seen_gem_ids.add(row.h_gem_id)
                gemeinde = session.get_one(gem_models.Gemeinde, row.h_gem_id)
                validated_vflz_data.gemeinde.append(Gemeinde.from_db(gemeinde))
            if row.gb_nummer is not None:
                parzelle_key = (row.egrid, row.gb_nummer)
                if parzelle_key not in seen_parzellen:
                    seen_parzellen.add(parzelle_key)
                    validated_parzelle = ValidatedParzelle(
                        gb_nummer=row.gb_nummer,
                        nummerierungsbereich=row.h_nb_id,
                        egrid=row.egrid,
                        gemeinde=Gemeinde.from_db(
                            session.get_one(gem_models.Gemeinde, row.bfs_nummer)
                        )
                        if row.bfs_nummer
                        else None,
                    )
                    validated_vflz_data.parzelle.append(validated_parzelle)
            if row.gws_bereich is not None and row.gws_bereich not in seen_gws_bereich:
                seen_gws_bereich.add(row.gws_bereich)
                validated_vflz_data.gws_bereich.append(Code(row.gws_bereich))
            if row.gws_zone is not None and row.gws_zone not in seen_gws_zone:
                seen_gws_zone.add(row.gws_zone)
                validated_vflz_data.gws_zone.append(Code(row.gws_zone))

        if not validated_vflz_data.gws_zone:
            keine_gws_zone_code = session.scalars(
                select(code_models.Code).where(
                    code_models.Code.c_cli_id
                    == constants.CodeListe.Gewaesserschutzzonen,
                    code_models.Code.is_null_code,
                )
            ).one_or_none()
            if keine_gws_zone_code:
                validated_vflz_data.gws_zone.append(Code(keine_gws_zone_code))

        if not validated_vflz_data.gws_bereich:
            keine_gws_bereich_code = session.scalars(
                select(code_models.Code).where(
                    code_models.Code.c_cli_id
                    == constants.CodeListe.Gewaesserschutzbereiche,
                    code_models.Code.is_null_code,
                )
            ).one_or_none()
            if keine_gws_bereich_code:
                validated_vflz_data.gws_bereich.append(Code(keine_gws_bereich_code))
        return validated_vflz_data


@strawberry.type
class StatusPublikation:
    dat_publizieren: date | None
    belastet: bool | None

    @classmethod
    def from_db_or_none(
        cls, status: vflz_models.VflzStatusPublikation | None
    ) -> Self | None:
        if status is None:
            return None
        return cls(
            dat_publizieren=status.dat_publizieren,
            belastet=status.belastet,
        )


@strawberry.type
class Vollzug:
    vflnr_id: strawberry.ID
    aktiv: bool
    combined_id: str
    behoerde: Code
    erfassung_mutation: ErfassungMutation | None
    is_deleteable: bool

    @classmethod
    def from_db(cls, obj: vflz_models.Vollzug) -> Self:
        return cls(
            vflnr_id=to_id(obj.vflnr_id),
            aktiv=obj.aktiv,
            combined_id=obj.combined_id,
            behoerde=Code.from_db(obj.behoerde),
            erfassung_mutation=ErfassungMutation.from_db(obj),
            is_deleteable=obj.behoerde.code != settings.behoerde,
        )


@strawberry.input
class VollzugInput:
    vflnr_id: strawberry.ID | None
    aktiv: bool
    combined_id: str
    behoerde: CodeInput


@strawberry.input
class UpdateVflzVollzugInput:
    vflz_id: strawberry.ID
    vollzug: list[VollzugInput]

    def validate(self) -> list[Problem]:
        problems: list[Problem] = []
        no_active = 0
        duplicate_behoerde = False
        instance_behoerde_seen = False
        behoerden_seen: list[CodeInput] = []

        for v in self.vollzug:
            if v.aktiv:
                no_active += 1
            if v.behoerde in behoerden_seen:
                duplicate_behoerde = True
            if (
                v.behoerde
                == f"code:{constants.CodeListe.BehoerdenKuerzel}:{settings.behoerde}"
            ):
                instance_behoerde_seen = True
            behoerden_seen.append(v.behoerde)

        if duplicate_behoerde:
            problems.append(
                Problem(
                    message="Duplicate behoerde in vollzug",
                    problem_code=ProblemCode.VALIDATION,
                    field="vollzug.behoerde",
                )
            )

        if no_active != 1:
            problems.append(
                Problem(
                    message="Exactly one vollzug has to be active",
                    problem_code=ProblemCode.VALIDATION,
                    field="vollzug.aktiv",
                )
            )
        if not instance_behoerde_seen:
            problems.append(
                Problem(
                    message="Instance behoerde is not part of vollzug data.",
                    problem_code=ProblemCode.VALIDATION,
                    field="vollzug.behoerde",
                )
            )
        return problems


@strawberry.type(description="Gibt den Status zur Beurteilung und Publikation wieder.")
class EvaluationStatus:
    belastet: bool = strawberry.field(
        default=False, description="Standortversion ist belastet."
    )
    rechtskraft: bool = strawberry.field(
        default=False, description="Rechtskraft wurde oder ist gesetzt."
    )
    vfl_published: bool = strawberry.field(
        default=False, description="Standort ist im KbS eingetragen."
    )
    publish_now: bool = strawberry.field(
        default=False, description="Standortversion wird publiziert."
    )
    vfl_deleted: bool = strawberry.field(
        default=False, description="Standort ist aus dem KbS entfernt worden."
    )
    delete_now: bool = strawberry.field(
        default=False, description="Standortversion soll aus dem KbS"
    )
    dat_rechtskraft: date | None = strawberry.field(
        default=None, description="Datum der Rechtskraft."
    )
    vfl_dat_publizieren: date | None = strawberry.field(
        default=None, description="Publikationsdatum des Standorts"
    )
    published_previously: bool = strawberry.field(
        default=False, description="Frühere Standortversion wurde in KbS eingetragen."
    )
    deleted_previously: bool = strawberry.field(
        default=False, description="Frühere Standortversion wurde aus dem KbS gelöscht."
    )

    @classmethod
    def from_vflz(cls, session: Session, vflz: vflz_models.Vflz) -> Self:
        evaluation_status_data = vflz_models.EvaluationStatusData.from_vflz(
            session, vflz
        )
        return cls(
            belastet=evaluation_status_data.belastet,
            rechtskraft=evaluation_status_data.rechtskraft,
            vfl_published=evaluation_status_data.vfl_published,
            publish_now=evaluation_status_data.publish_now,
            vfl_deleted=evaluation_status_data.vfl_deleted,
            delete_now=evaluation_status_data.delete_now,
            dat_rechtskraft=evaluation_status_data.dat_rechtskraft,
            vfl_dat_publizieren=evaluation_status_data.vfl_dat_publizieren,
            published_previously=evaluation_status_data.published_previously,
            deleted_previously=evaluation_status_data.deleted_previously,
        )


@strawberry.type
class Vflz:
    _vflz: strawberry.Private[vflz_models.Vflz]

    vflz_id: strawberry.ID
    vfl_id: strawberry.ID
    combined_id: str
    vftyp: Code
    vftyp_enum: StandortTyp
    objekt: Objekt
    bezeichnung: str | None

    # Verortung
    flurname: str | None
    strasse: str | None
    postleitzahl: str | None
    ort: str | None
    zentroid: GeoJSONPoint | None

    dat_rechtskraft: date | None
    dat_publizieren: date | None
    rechtskraft: bool | None
    publizieren: bool | None
    bearbeitungs_stand: str | None
    untersuchungs_stand: str | None
    lang: Language
    status_publikation: StatusPublikation | None
    deponietyp: Code | None
    gws_bereich: Code | None
    gws_zone: Code | None
    durchlaessigkeit: Code | None
    karstgeb: Code | None
    ktu: Code | None
    flugplatz: Code | None

    erfassung_mutation: ErfassungMutation
    vflz_created_date: datetime | None

    in_betrieb: bool | None
    nachsorge: bool | None
    is_current: bool
    message: str

    @strawberry.field
    def latest_vflz_id(self, info: Info) -> strawberry.ID:
        return to_id(self._vflz.get_current(info.context.db).vflz_id)

    @strawberry.field
    def parzellen(self, info: Info) -> list[Parzelle]:
        session = info.context.db
        if not self._vflz.vflgeo:
            return []
        query = select(grun_models.Parzelle).where(
            func.ST_Intersects(
                self._vflz.vflgeo.wkb_geometry, grun_models.Parzelle.wkb_geometry
            )
        )
        return [Parzelle.from_db(p) for p in session.scalars(query).all()]

    @strawberry.field
    def zeitraum(self, info: Info) -> Zeitraum | None:
        return Zeitraum.from_db(self._vflz)

    @strawberry.field
    def gemeinde(self, info: Info) -> Gemeinde | None:
        if gemeinde := self._vflz.gemeinde:
            return Gemeinde.from_db(gemeinde)

    @strawberry.field
    def ablagerungen(self, info: Info) -> list[Ablagerung]:
        return [Ablagerung.from_db(a) for a in self._vflz.ablagerungen]

    @strawberry.field
    def betriebe(self, info: Info) -> list[Betrieb]:
        return [Betrieb.from_db(b) for b in self._vflz.betriebe]

    @strawberry.field
    def schiessanlagen(self, info: Info) -> list[Schiessanlage]:
        return [Schiessanlage.from_db(s) for s in self._vflz.schiessanlagen]

    @strawberry.field
    def unfaelle(self, info: Info) -> list[Unfall]:
        return [Unfall.from_db(u) for u in self._vflz.unfaelle]

    @strawberry.field
    def pfas(self, info: Info) -> list[PFAS]:
        return [PFAS.from_db(p) for p in self._vflz.pfas]

    @strawberry.field
    def kinderspielplaetze_gruenflaechen(
        self, info: Info
    ) -> list[KinderspielplatzGruenflaeche]:
        return [
            KinderspielplatzGruenflaeche.from_db(k)
            for k in self._vflz.kinderspielplaetze_gruenflaechen
        ]

    @strawberry.field
    def grundwasser(self, info: Info) -> list[umwelt_types.Grundwasser]:
        return [umwelt_types.Grundwasser.from_db(gw) for gw in self._vflz.grundwasser]

    @strawberry.field
    def oberflaechen_gewaesser(
        self, info: Info
    ) -> list[umwelt_types.OberflaechenGewaesser]:
        return [
            umwelt_types.OberflaechenGewaesser.from_db(ogw)
            for ogw in self._vflz.oberflaechen_gewaesser
        ]

    @strawberry.field
    def nutzungen_boden(self, info: Info) -> list[umwelt_types.NutzungBoden]:
        return [
            umwelt_types.NutzungBoden.from_db(n) for n in self._vflz.nutzungen_boden
        ]

    @strawberry.field
    def umwelt_stoffe(self, info: Info) -> list[umwelt_types.UmweltStoff]:
        return [umwelt_types.UmweltStoff.from_db(s) for s in self._vflz.umwelt_stoffe]

    @strawberry.field
    def umweltschaeden(self, info: Info) -> list[umwelt_types.Umweltschaden]:
        return [
            umwelt_types.Umweltschaden.from_db(u) for u in self._vflz.umweltschaeden
        ]

    @strawberry.field
    def einzelereignisse(self, info: Info) -> list[umwelt_types.Einzelereignis]:
        return [
            umwelt_types.Einzelereignis.from_db(e) for e in self._vflz.einzelereignisse
        ]

    @strawberry.field
    def beurteilung(self, info: Info) -> Beurteilung | None:
        if beurteilung := self._vflz.beurteilung:
            return Beurteilung.from_db(beurteilung)

    @strawberry.field
    def massnahmen(self, info: Info) -> list[Massnahme]:
        return [Massnahme.from_db(m) for m in self._vflz.massnahmen]

    @strawberry.field
    def sanierungsziele(self, info: Info) -> list[Sanierungsziel]:
        return [Sanierungsziel.from_db(s) for s in self._vflz.sanierungsziele]

    @strawberry.field
    def bemerkung_standort(self, info: Info) -> Bemerkung | None:
        if bemerkung := self._vflz.bemerkung_standort:
            return Bemerkung.from_db(bemerkung)

    @strawberry.field
    def bemerkung_umwelt(self, info: Info) -> Bemerkung | None:
        if bemerkung := self._vflz.bemerkung_umwelt:
            return Bemerkung.from_db(bemerkung)

    @strawberry.field
    def bemerkung_datenimport(self, info: Info) -> Bemerkung | None:
        if bemerkung := self._vflz.bemerkung_datenimport:
            return Bemerkung.from_db(bemerkung)

    @strawberry.field
    def bemerkungen_intern(self, info: Info) -> list[Bemerkung]:
        return [Bemerkung.from_db(b) for b in self._vflz.bemerkungen_intern]

    @strawberry.field
    def begruendung_bewertung(self, info: Info) -> Bemerkung | None:
        if bemerkung := self._vflz.begruendung_bewertung:
            return Bemerkung.from_db(bemerkung)

    @strawberry.field
    def begruendung_prio_untersuchungsbedarf(self, info: Info) -> Bemerkung | None:
        if bemerkung := self._vflz.begruendung_prio_untersuchungsbedarf:
            return Bemerkung.from_db(bemerkung)

    @strawberry.field
    def begruendung_prio_sanierungsbedarf(self, info: Info) -> Bemerkung | None:
        if bemerkung := self._vflz.begruendung_prio_sanierungsbedarf:
            return Bemerkung.from_db(bemerkung)

    @strawberry.field
    def versionen(self, info: Info) -> list[Self]:
        query = (
            select(vflz_models.Vflz)
            .where(vflz_models.Vflz.vfl_id == self._vflz.vfl_id)
            .order_by(vflz_models.Vflz.vflz_id.desc())
        )
        objects = info.context.db.scalars(query).all()
        return [type(self).from_db(obj) for obj in objects]

    @strawberry.field
    def teilstandorte(self, info: Info) -> list[Self]:
        query = (
            select(vflz_models.Vflz)
            .where(
                vflz_models.Vflz.obje_id == self._vflz.obje_id,
                vflz_models.Vflz.is_current == true(),
            )
            .order_by(
                *alma_protocols.order_by_start_date_criteria(
                    vflz_models.Vflz, vflz_models.Vflz.vflz_id.desc()
                ),
            )
        )
        objects = info.context.db.scalars(query).all()
        return [type(self).from_db(obj) for obj in objects]

    @strawberry.field
    def vflgeo(self, info: Info) -> VflGeo | None:
        if vflgeo := self._vflz.vflgeo:
            return VflGeo.from_db(vflgeo)

    @strawberry.field
    def pools(self, info: Info) -> list["Pool"]:
        query = (
            select(vflz_models.Pool)
            .join(vflz_models.VflPool)
            .where(vflz_models.VflPool.vfl_id == self.vfl_id)
            .order_by(vflz_models.Pool.pool_id)
        )
        objects = info.context.db.scalars(query).all()
        return [Pool.from_db(obj) for obj in objects]

    @strawberry.field
    def beteiligte(self, info: Info) -> list[Beteiligter]:
        query = select(subj_models.Beteiligter).where(
            subj_models.Beteiligter.vflz_id == self._vflz.vflz_id
        )
        beteiligte = info.context.db.scalars(query).all()
        return [Beteiligter.from_db(b) for b in beteiligte]

    @strawberry.field
    def sachbearbeitung(self, info: Info) -> list[SachbearbeiterStandort]:
        query = (
            select(subj_models.BeteiligterStandort)
            .join(subj_models.Beteiligter)
            .where(
                subj_models.Beteiligter.vflz_id == self._vflz.vflz_id,
                subj_models.BeteiligterStandort.h_bez_art
                == constants.CodeListe.BeziehungsartSachbearbeitung,
            )
            .order_by(subj_models.BeteiligterStandort.bet_art_id)
        )
        beteiligte = info.context.db.scalars(query).all()
        return [SachbearbeiterStandort.from_db(b) for b in beteiligte]

    @strawberry.field
    def eigentum(self, info: Info) -> list[Eigentum]:
        session = info.context.db
        eigentum = get_eigentum(session, self._vflz.vflz_id)

        return Eigentum.apply_grouping(eigentum)

    @strawberry.field
    def sonstige_beteiligte(self, info: Info) -> list[BeteiligterStandort]:
        query = (
            select(subj_models.BeteiligterStandort)
            .join(subj_models.Beteiligter)
            .where(
                subj_models.Beteiligter.vflz_id == self._vflz.vflz_id,
                subj_models.BeteiligterStandort.h_bez_art
                == constants.CodeListe.BeziehungsartSonstige,
            )
            .order_by(subj_models.BeteiligterStandort.bet_art_id)
        )
        beteiligte = info.context.db.scalars(query).all()
        return [BeteiligterStandort.from_db(b) for b in beteiligte]

    @strawberry.field
    def beteiligte_standort(self, info: Info) -> list[BeteiligterStandort]:
        query = (
            select(subj_models.BeteiligterStandort)
            .join(subj_models.Beteiligter)
            .where(
                subj_models.Beteiligter.vflz_id == self._vflz.vflz_id,
                subj_models.BeteiligterStandort.grun_id.is_(None),
            )
        )
        beteiligte_standort = info.context.db.scalars(query).all()
        return [BeteiligterStandort.from_db(bs) for bs in beteiligte_standort]

    @strawberry.field
    def beteiligte_parzellen(self, info: Info) -> list[BeteiligterStandort]:
        query = (
            select(subj_models.BeteiligterStandort)
            .join(subj_models.Beteiligter)
            .where(
                subj_models.Beteiligter.vflz_id == self._vflz.vflz_id,
                subj_models.BeteiligterStandort.grun_id.is_not(None),
            )
        )
        beteiligte_parzellen = info.context.db.scalars(query).all()
        return [BeteiligterStandort.from_db(bp) for bp in beteiligte_parzellen]

    @strawberry.field
    def gemeinden_und_nummerierungsbereiche(
        self, info: Info
    ) -> list[GemeindeNummerierungsbereich]:
        # Return combinations of (gemeinde, nummerierungsbereich) pairs where:
        # 1. Gemeinde intersects vflgeo
        # 2. Nummerierungsbereich intersects vflgeo
        # 3. Gemeinde intersects Nummerierungsbereich
        session = info.context.db
        results: list[GemeindeNummerierungsbereich] = []

        # We want to perform a cartesian join as we want to get all possible combinations.
        # Therefore, the warning is ignored.
        if vflgeo := self._vflz.vflgeo:
            gem_nb_query = select(
                gem_models.Gemeinde, grun_models.Nummerierungsbereich
            ).where(
                func.ST_Intersects(
                    gem_models.Gemeinde.wkb_geometry, vflgeo.wkb_geometry
                ),
                func.ST_Intersects(
                    grun_models.Nummerierungsbereich.wkb_geometry, vflgeo.wkb_geometry
                ),
                func.ST_Intersects(
                    gem_models.Gemeinde.wkb_geometry,
                    grun_models.Nummerierungsbereich.wkb_geometry,
                ),
            )
            gem_query = select(gem_models.Gemeinde).where(
                func.ST_Intersects(
                    gem_models.Gemeinde.wkb_geometry, vflgeo.wkb_geometry
                )
            )
            nb_query = select(grun_models.Nummerierungsbereich).where(
                func.ST_Intersects(
                    grun_models.Nummerierungsbereich.wkb_geometry, vflgeo.wkb_geometry
                )
            )

            with warnings.catch_warnings():
                warnings.simplefilter("ignore", category=SAWarning)
                gem_nb_result = session.execute(gem_nb_query).all()
                if gem_nb_result:
                    for gemeinde, nb in gem_nb_result:
                        results.append(
                            GemeindeNummerierungsbereich(
                                gemeinde=Gemeinde.from_db(gemeinde),
                                nummerierungsbereich=Nummerierungsbereich.from_db(nb),
                            )
                        )
                else:
                    gems = session.scalars(gem_query).all()
                    nbs = session.scalars(nb_query).all()

                    if gems:
                        results = [
                            GemeindeNummerierungsbereich(
                                gemeinde=Gemeinde.from_db(gemeinde),
                                nummerierungsbereich=None,
                            )
                            for gemeinde in gems
                        ]
                    if nbs:
                        results = [
                            GemeindeNummerierungsbereich(
                                gemeinde=None,
                                nummerierungsbereich=Nummerierungsbereich.from_db(nb),
                            )
                            for nb in nbs
                        ]

        return results

    @strawberry.field
    def flaeche(self, info: Info) -> int | None:
        if vflgeo := self._vflz.vflgeo:
            return int(vflgeo.flaeche)

    @strawberry.field
    def vollzug(self, info: Info) -> list[Vollzug]:
        return [Vollzug.from_db(v) for v in self._vflz.vollzug]

    @strawberry.field
    def read_only(self, info: Info) -> bool:
        return vflz_models.is_read_only(info.context.db, self._vflz)

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
        validate_per_page(per_page)
        session = info.context.db

        vflz_ids = session.scalars(
            select(vflz_models.Vflz.vflz_id.distinct())
            .where(vflz_models.Vflz.obje_id == int(self.objekt.obje_id))
            .order_by(vflz_models.Vflz.vflz_id)
        ).all()

        if task_id is not None:
            node = session.get_one(wf_models.Node, task_id)
            if int(node.entity_id) not in vflz_ids:
                raise ValueError(
                    "Invalid task_id: Task is associated with an unrelated Vflz."
                )

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
            where_clause=wf_models.Node.entity_id.in_([str(id) for id in vflz_ids]),
        )

    @strawberry.field
    def evaluation_status(self, info: Info) -> EvaluationStatus:
        return EvaluationStatus.from_vflz(info.context.db, self._vflz)

    @classmethod
    def from_db(cls, vflz: vflz_models.Vflz) -> Self:
        return cls(
            _vflz=vflz,
            vflz_id=to_id(vflz.vflz_id),
            vfl_id=to_id(vflz.vfl_id),
            combined_id=vflz.combined_id,
            vftyp=Code.from_db(vflz.vftyp),
            vftyp_enum=StandortTyp(vflz.vftyp.code),
            objekt=Objekt.from_db(vflz.objekt),
            bezeichnung=vflz.bezeichnung,
            flurname=vflz.flurname,
            strasse=vflz.strasse,
            postleitzahl=vflz.postleitzahl,
            ort=vflz.ort,
            dat_rechtskraft=vflz.dat_rechtskraft,
            dat_publizieren=vflz.dat_publizieren,
            rechtskraft=vflz.rechtskraft,
            publizieren=vflz.publizieren,
            lang=vflz.lang,
            status_publikation=StatusPublikation.from_db_or_none(
                vflz.status_publikation
            ),
            deponietyp=Code.from_db_or_none(vflz.deponietyp),
            gws_bereich=Code.from_db_or_none(vflz.gws_bereich),
            gws_zone=Code.from_db_or_none(vflz.gws_zone),
            durchlaessigkeit=Code.from_db_or_none(vflz.durchlaessigkeit),
            karstgeb=Code.from_db_or_none(vflz.karstgeb),
            ktu=Code.from_db(vflz.ktu.ktu) if vflz.ktu else None,
            zentroid=cast(GeoJSONPoint | None, vflz.zentroid_geojson),
            in_betrieb=vflz.in_betrieb,
            nachsorge=vflz.nachsorge,
            is_current=vflz.is_current,
            message=vflz.message,
            erfassung_mutation=ErfassungMutation.from_db(vflz),
            bearbeitungs_stand=Code.from_db_or_none(vflz.bearbeitungs_stand),
            untersuchungs_stand=Code.from_db_or_none(vflz.untersuchungs_stand),
            vflz_created_date=vflz.vflz_created_date,
            flugplatz=Code.from_db(vflz.flugplatz.bezeichnung)
            if vflz.flugplatz
            else None,
        )

    @strawberry.field(
        permission_classes=[get_permission_class(Permission.VIEW_PROCESS)]
    )
    def prozesse(self, info: Info) -> list[TaskOption]:
        session = info.context.db
        mgr = info.context.workflow_manager

        vflz = session.get_one(vflz_models.Vflz, self.vflz_id)

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
            if mgr.engine.is_applicable(workflow, str(vflz.vflz_id))
        ]


@strawberry.input
class UpdateVflzDataInput:
    vflz_id: strawberry.ID
    bezeichnung: str | None

    # Verortung
    flurname: str | None
    strasse: str | None
    postleitzahl: str | None
    ort: str | None

    lang: Language | None

    deponietyp: CodeInput | None
    gws_bereich: CodeInput | None
    gws_zone: CodeInput | None
    durchlaessigkeit: CodeInput | None
    karstgeb: CodeInput | None
    ktu: CodeInput | None

    in_betrieb: bool | None
    nachsorge: bool | None

    ablagerungen: list[AblagerungInput] = field(default_factory=list)
    betriebe: list[BetriebInput] = field(default_factory=list)
    schiessanlagen: list[SchiessanlageInput] = field(default_factory=list)
    unfaelle: list[UnfallInput] = field(default_factory=list)
    pfas: list[PFASInput] = field(default_factory=list)
    kinderspielplaetze_gruenflaechen: list[KinderspielplatzGruenflaecheInput] = field(
        default_factory=list
    )

    grundwasser: list[umwelt_types.GrundwasserInput] = field(default_factory=list)
    oberflaechen_gewaesser: list[umwelt_types.OberflaechenGewaesserInput] = field(
        default_factory=list
    )
    nutzungen_boden: list[umwelt_types.NutzungBodenInput] = field(default_factory=list)
    umwelt_stoffe: list[umwelt_types.UmweltStoffInput] = field(default_factory=list)
    einzelereignisse: list[umwelt_types.EinzelereignisInput] = field(
        default_factory=list
    )
    umweltschaeden: list[umwelt_types.UmweltschadenInput] = field(default_factory=list)
    gemeinde: GemeindeInput | None
    flugplatz: CodeInput | None

    # Bemerkungen
    bemerkung_standort: BemerkungInput | None
    bemerkung_umwelt: BemerkungInput | None
    bemerkung_datenimport: BemerkungInput | None


@strawberry.input
class HistorizeVflzInput:
    vflz_id: strawberry.ID
    message: str

    def validate(self) -> list[Problem]:
        problems: list[Problem] = []
        if not self.message.strip():
            problems.append(
                Problem(
                    message="message can not be empty",
                    problem_code=ProblemCode.VALIDATION,
                    field="message",
                )
            )
        return problems


@strawberry.type
class Pool:
    pool_id: strawberry.ID
    bezeichnung: str | None
    bemerkungen: str | None
    erfassung_mutation: ErfassungMutation | None

    @strawberry.field
    def standorte(
        self, info: Info, page: int = 1, per_page: int = 20
    ) -> "PaginatedVflzResult":
        validate_per_page(per_page)
        session = info.context.db
        query = (
            select(vflz_models.Vflz)
            .join(
                vflz_models.VflPool,
                vflz_models.VflPool.vfl_id == vflz_models.Vflz.vfl_id,
            )
            .where(
                vflz_models.VflPool.pool_id == self.pool_id,
                vflz_models.Vflz.is_current == true(),
            )
        )
        num_standorte_query = select(func.count()).select_from(query.subquery())
        num_standorte = session.execute(num_standorte_query).scalar_one()
        num_pages = math.ceil(num_standorte / per_page)
        query = (
            query.offset((page - 1) * per_page)
            .limit(per_page)
            .order_by(
                vflz_models.Vflz.combined_id,
                vflz_models.Vflz.bezeichnung,
                vflz_models.Vflz.vflz_id,
            )
        )
        return PaginatedVflzResult(
            num_pages=num_pages,
            num_results_total=num_standorte,
            results=[Vflz.from_db(obj) for obj in session.scalars(query).all()],
            page=page,
            per_page=per_page,
        )

    @classmethod
    def from_db(cls, pool: vflz_models.Pool) -> Self:
        return cls(
            pool_id=to_id(pool.pool_id),
            bezeichnung=pool.bezeichnung,
            bemerkungen=pool.bemerkungen,
            erfassung_mutation=ErfassungMutation.from_db(pool),
        )


@strawberry.type
class PaginatedVflzResult:
    num_pages: int
    num_results_total: int
    results: list[Vflz]
    page: int
    per_page: int


@strawberry.type
class ValidatedPoolFolgeschrittData:
    valid_standorte: PaginatedVflzResult
    invalid_standorte: PaginatedVflzResult


@strawberry.type
class PaginatedPoolResult:
    num_pages: int
    num_results_total: int
    results: list[Pool]
    page: int
    per_page: int


@strawberry.input
class CreatePoolInput:
    bezeichnung: str
    bemerkungen: str | None

    def validate(self, session: Session) -> list[Problem]:
        problems: list[Problem] = []

        stmt = select(vflz_models.Pool).where(
            vflz_models.Pool.bezeichnung == self.bezeichnung
        )
        result = session.execute(stmt).scalar_one_or_none()
        if result:
            problems.append(
                Problem(
                    message="bezeichnung already exists",
                    problem_code=ProblemCode.EXISTS,
                    field="bezeichnung",
                )
            )
        return problems


@strawberry.input
class UpdatePoolInfoInput:
    pool_id: strawberry.ID
    bezeichnung: str
    bemerkungen: str | None

    def validate(self, session: Session) -> list[Problem]:
        problems: list[Problem] = []

        stmt = select(vflz_models.Pool).where(
            vflz_models.Pool.bezeichnung == self.bezeichnung,
            vflz_models.Pool.pool_id != self.pool_id,
        )
        result = session.execute(stmt).scalar_one_or_none()
        if result:
            problems.append(
                Problem(
                    message="bezeichnung already exists",
                    problem_code=ProblemCode.EXISTS,
                    field="bezeichnung",
                )
            )
        return problems


@strawberry.input
class UpdateVflzEvaluationInput:
    vflz_id: strawberry.ID
    beurteilung: BeurteilungInput | None
    massnahmen: list[MassnahmeInput]
    sanierungsziele: list[SanierungszielInput]
    dat_rechtskraft: date | None
    dat_publizieren: date | None
    rechtskraft: bool
    publizieren: bool
    begruendung_bewertung: BemerkungInput | None
    begruendung_prio_untersuchungsbedarf: BemerkungInput | None
    begruendung_prio_sanierungsbedarf: BemerkungInput | None
    bearbeitungs_stand: CodeInput | None
    untersuchungs_stand: CodeInput | None

    def validate(self, session: Session) -> list[Problem]:
        problems: list[Problem] = []
        # Fallbacks for dates. Also set by frontend.
        if self.publizieren:
            self.dat_publizieren = (
                self.dat_publizieren if self.dat_publizieren else datetime.now()
            )
        if self.rechtskraft:
            self.dat_rechtskraft = (
                self.dat_rechtskraft if self.dat_rechtskraft else datetime.now()
            )

        vflz = session.get_one(vflz_models.Vflz, int(self.vflz_id))
        current_status = EvaluationStatus.from_vflz(session, vflz)
        db_beurteilung = (
            code_models.Beurteilung.from_db_or_none(
                session, self.beurteilung.beurteilung
            )
            if self.beurteilung
            else None
        )
        current_status.belastet = (
            db_beurteilung.kbs_info.belastet
            if (db_beurteilung and db_beurteilung.kbs_info)
            else False
        )

        if not self.rechtskraft and current_status.rechtskraft:
            return [
                Problem(
                    message="Rechtskraft ist bereits gesetzt und darf nicht mehr geändert werden.",
                    problem_code=ProblemCode.VALIDATION,
                    field="rechtskraft",
                )
            ]

        if (
            self.rechtskraft
            and not current_status.belastet
            and not current_status.rechtskraft
        ):
            return [
                Problem(
                    message="Rechtskraft darf nur bei belasteten Standorten gesetzt sein.",
                    problem_code=ProblemCode.VALIDATION,
                    field="rechtskraft",
                )
            ]

        current_status.rechtskraft = self.rechtskraft
        if self.publizieren:
            if not current_status.belastet and (
                not current_status.vfl_deleted and not current_status.vfl_published
            ):
                return [
                    Problem(
                        message="Kein publizierter Eintrag im KbS.",
                        problem_code=ProblemCode.VALIDATION,
                        field="publizieren",
                    )
                ]
            if (
                not current_status.belastet
                and current_status.vfl_deleted
                and self.dat_publizieren == current_status.vfl_dat_publizieren
            ):
                return [
                    Problem(
                        message="Kein publizierter Eintrag im KbS.",
                        problem_code=ProblemCode.VALIDATION,
                        field="publizieren",
                    )
                ]
            if not current_status.rechtskraft:
                return [
                    Problem(
                        message="Rechtskraft muss bei Publikation gesetzt sein.",
                        problem_code=ProblemCode.VALIDATION,
                        field="rechtskraft",
                    )
                ]
        return problems


@strawberry.input
class UpdateVflzGeoInput:
    vflz_id: strawberry.ID
    zentroid: GeoJSONPoint | None
    geometry: GeoJSONPointOrMultiPolygon


@strawberry.type
class ValidatedCreateVflzData:
    combined_id: list[str]
    gemeinde: list[Gemeinde]
    flugplatz: list[Code]


@strawberry.input
class CreateVflzInput:
    zentroid: GeoJSONPoint | None
    geometry: GeoJSONPointOrMultiPolygon
    vftyp: CodeInput
    gemeinde: GemeindeInput
    combined_id: str
    bezeichnung: str
    flugplatz: CodeInput | None
    ktu: CodeInput | None


@strawberry.input
class ValidateCreateVflzInput:
    geometry: GeoJSONPointOrMultiPolygon
    vftyp: CodeInput | None
    gemeinde: GemeindeInput | None
    combined_id: str | None
    flugplatz: CodeInput | None
    ktu: CodeInput | None


@strawberry.input
class CreateTeilstandortInput:
    parent_geometry: GeoJSONPointOrMultiPolygon
    parent_zentroid: GeoJSONPoint | None
    geometry: GeoJSONPointOrMultiPolygon
    zentroid: GeoJSONPoint | None
    parent_vflz_id: strawberry.ID
    gemeinde: GemeindeInput
    combined_id: str
    bezeichnung: str
    flugplatz: CodeInput | None
    ktu: CodeInput | None


@strawberry.input
class ValidateCreateTeilstandortInput:
    geometry: GeoJSONPointOrMultiPolygon
    parent_combined_id: str
    combined_id: str | None
    gemeinde: GemeindeInput | None
