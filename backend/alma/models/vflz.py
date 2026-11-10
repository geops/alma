import json
from dataclasses import asdict, dataclass
from datetime import date, datetime
from logging import getLogger
from typing import Any, Self

import httpx2
from geoalchemy2 import Geometry, WKBElement, functions
from sqlalchemy import Column, ForeignKey, Integer, String, Table, case, func, select
from sqlalchemy.orm import (
    Mapped,
    Session,
    column_property,
    foreign,
    mapped_column,
    relationship,
    validates,
)
from sqlalchemy.sql import functions as sql_functions

from alma.protocols import merge, order_by_start_date_criteria
from alma.settings import settings

from .. import constants
from . import admin, bem, codes, gem, subj
from . import umwelt as um
from .base import Base, CodeForeignKeyConstraint, Lang
from .flugplatz import Flugplatz
from .mixins import ErfassungMutationMixin
from .snapshots import SupportsSnapshots

logger = getLogger(__name__)


def fetch_height(x: int, y: int) -> int:
    """Fetches height from API for specific coordinates."""
    try:
        response = httpx2.get(
            f"{settings.height_api}?easting={x}&northing={y}", timeout=10
        )
        if response.status_code != 200:
            logger.error("API Error for %s: %s", settings.height_api, response.text)
            return 0
        else:
            return int(float(response.json()["height"]))
    except Exception as e:
        logger.error("Exception occurred while fetching height: %s", e)
        return 0


class Objekt(Base, ErfassungMutationMixin):
    """Standort"""

    __tablename__ = "obje"
    __table_args__ = {"schema": "alma"}

    obje_id: Mapped[int] = mapped_column(primary_key=True, init=False)


class KompartimentStoffgruppe(Base, SupportsSnapshots, ErfassungMutationMixin):
    __tablename__ = "kksg"
    __table_args__ = (
        CodeForeignKeyConstraint(["h_kksg_stoffgrp", "c_kksg_stoffgrp"]),
        {"schema": "alma"},
    )
    # Primary keys
    kksg_id: Mapped[int] = mapped_column(primary_key=True, init=False)

    # Foreign keys
    kksk_id: Mapped[int] = mapped_column(ForeignKey("alma.kksk.kksk_id"), init=False)

    # Codewerte
    h_kksg_stoffgrp: Mapped[int | None] = mapped_column(init=False)
    c_kksg_stoffgrp: Mapped[str | None] = mapped_column(init=False)

    # relationships
    stoffgruppe: Mapped[codes.StoffgruppeVariante | None] = relationship(
        codes.StoffgruppeVariante,
        foreign_keys=[h_kksg_stoffgrp, c_kksg_stoffgrp],
        lazy="joined",
        default=None,
    )

    # Actual fields
    teilvol: Mapped[float | None] = mapped_column("kksg_teilvol", default=None)


class KompartimentStoffklasse(Base, SupportsSnapshots, ErfassungMutationMixin):
    __tablename__ = "kksk"
    __table_args__ = (
        CodeForeignKeyConstraint(["h_kksk_stoffkl", "c_kksk_stoffkl"]),
        CodeForeignKeyConstraint(["h_kksk_infg_ablag_von", "c_kksk_infg_ablag_von"]),
        CodeForeignKeyConstraint(["h_kksk_infg_ablag_bis", "c_kksk_infg_ablag_bis"]),
        {"schema": "alma"},
    )

    # Primary keys
    kksk_id: Mapped[int] = mapped_column(primary_key=True, init=False)

    # Foreign Keys
    inta_id: Mapped[int] = mapped_column(ForeignKey("alma.inta.inta_id"), init=False)

    # Codewerte
    h_kksk_stoffkl: Mapped[int | None] = mapped_column(init=False)
    c_kksk_stoffkl: Mapped[str | None] = mapped_column(init=False)

    h_kksk_infg_ablag_von: Mapped[int | None] = mapped_column(init=False)
    c_kksk_infg_ablag_von: Mapped[str | None] = mapped_column(init=False)

    h_kksk_infg_ablag_bis: Mapped[int | None] = mapped_column(init=False)
    c_kksk_infg_ablag_bis: Mapped[str | None] = mapped_column(init=False)

    # Relationships
    stoffklasse: Mapped[codes.Stoffklasse | None] = relationship(
        codes.Stoffklasse,
        foreign_keys=[h_kksk_stoffkl, c_kksk_stoffkl],
        lazy="joined",
        default=None,
    )
    genauigkeit_von: Mapped[codes.Genauigkeit | None] = relationship(
        codes.Genauigkeit,
        foreign_keys=[h_kksk_infg_ablag_von, c_kksk_infg_ablag_von],
        lazy="joined",
        default=None,
    )
    genauigkeit_bis: Mapped[codes.Genauigkeit | None] = relationship(
        codes.Genauigkeit,
        foreign_keys=[h_kksk_infg_ablag_bis, c_kksk_infg_ablag_bis],
        lazy="joined",
        default=None,
    )
    kompartiment_stoffgruppen: Mapped[list[KompartimentStoffgruppe]] = relationship(
        KompartimentStoffgruppe,
        init=False,
        cascade="all, delete-orphan",
        order_by=KompartimentStoffgruppe.kksg_id,
    )

    # Actual fields
    teilvol: Mapped[float | None] = mapped_column("kksk_teilvol", default=None)
    zeitraum_von: Mapped[date | None] = mapped_column("kksk_ablag_von", default=None)
    zeitraum_bis: Mapped[date | None] = mapped_column("kksk_ablag_bis", default=None)
    zeitraum_vonjahr: Mapped[bool] = mapped_column(default=False)
    zeitraum_bisjahr: Mapped[bool] = mapped_column(default=False)
    zeitraum_bisheute: Mapped[bool] = mapped_column(default=False)


class Ablagerung(Base, SupportsSnapshots, ErfassungMutationMixin):
    """Ablagerungen."""

    __tablename__ = "inta"
    __table_args__ = ({"schema": "alma"},)

    # Primary keys
    inta_id: Mapped[int] = mapped_column(primary_key=True, init=False)

    # Foreign keys
    vflz_id: Mapped[int] = mapped_column(ForeignKey("alma.vflz.vflz_id"), init=False)

    # Relationships
    kompartiment_stoffklassen: Mapped[list[KompartimentStoffklasse]] = relationship(
        KompartimentStoffklasse,
        init=False,
        cascade="all, delete-orphan",
        order_by=order_by_start_date_criteria(
            KompartimentStoffklasse, KompartimentStoffklasse.kksk_id
        ),
    )
    bemerkung: Mapped[bem.BemerkungAblagerung | None] = relationship(
        bem.BemerkungAblagerung,
        primaryjoin=foreign(bem.BemerkungAblagerung.key_value) == inta_id,
        init=False,
    )
    bemerkung_datenimport: Mapped[bem.BemerkungDatenimportAblagerung | None] = (
        relationship(
            bem.BemerkungDatenimportAblagerung,
            primaryjoin=foreign(bem.BemerkungDatenimportAblagerung.key_value)
            == inta_id,
            init=False,
        )
    )

    # Acutal fields
    vol_kompartiment: Mapped[float | None] = mapped_column(
        "inta_vol_kompartiment", default=None
    )
    tiefe: Mapped[str | None] = mapped_column("inta_tiefe", default=None)

    zeitraum_von: Mapped[date | None] = mapped_column("inta_ablag_von", default=None)
    zeitraum_bis: Mapped[date | None] = mapped_column("inta_ablag_bis", default=None)
    zeitraum_vonjahr: Mapped[bool] = mapped_column(default=False)
    zeitraum_bisjahr: Mapped[bool] = mapped_column(default=False)
    zeitraum_bisheute: Mapped[bool] = mapped_column(default=False)

    def update_zeitraum(self):
        merged_zeitraum_kksk = merge([self] + self.kompartiment_stoffklassen)
        if self.zeitraum_von is None and merged_zeitraum_kksk:
            self.zeitraum_von = merged_zeitraum_kksk.zeitraum_von

        if self.zeitraum_bis is None and merged_zeitraum_kksk:
            self.zeitraum_bis = merged_zeitraum_kksk.zeitraum_bis


class BasisBetrieb(Base, SupportsSnapshots, ErfassungMutationMixin):
    __tablename__ = "intb"
    __table_args__ = (
        CodeForeignKeyConstraint(["h_intb_bran", "c_intb_bran"]),
        CodeForeignKeyConstraint(["h_intb_bran_noga", "c_intb_bran_noga"]),
        CodeForeignKeyConstraint(["h_intb_unterstand", "c_intb_unterstand"]),
        CodeForeignKeyConstraint(["h_intb_res_abwbewe", "c_intb_res_abwbewe"]),
        CodeForeignKeyConstraint(
            ["h_intb_schiessanlage_typ", "c_intb_schiessanlage_typ"]
        ),
        CodeForeignKeyConstraint(["h_intb_infg_vonbetrieb", "c_intb_infg_vonbetrieb"]),
        CodeForeignKeyConstraint(["h_intb_infg_bisbetrieb", "c_intb_infg_bisbetrieb"]),
        {"schema": "alma"},
    )
    __mapper_args__ = {
        "polymorphic_on": "intb_typ",
        "polymorphic_abstract": True,
    }

    # pimary keys
    intb_id: Mapped[int] = mapped_column(primary_key=True, init=False)

    # Foreign keys
    vflz_id: Mapped[int] = mapped_column(ForeignKey("alma.vflz.vflz_id"), init=False)

    # Codewerte
    h_intb_bran: Mapped[int | None] = mapped_column(init=False)
    c_intb_bran: Mapped[str | None] = mapped_column(init=False)

    h_intb_bran_noga: Mapped[int | None] = mapped_column(init=False)
    c_intb_bran_noga: Mapped[str | None] = mapped_column(init=False)

    h_intb_unterstand: Mapped[int | None] = mapped_column(init=False)
    c_intb_unterstand: Mapped[str | None] = mapped_column(init=False)

    h_intb_res_abwbewe: Mapped[int | None] = mapped_column(init=False)
    c_intb_res_abwbewe: Mapped[str | None] = mapped_column(init=False)

    h_intb_schiessanlage_typ: Mapped[int | None] = mapped_column(init=False)
    c_intb_schiessanlage_typ: Mapped[str | None] = mapped_column(init=False)

    h_intb_infg_vonbetrieb: Mapped[int | None] = mapped_column(init=False)
    c_intb_infg_vonbetrieb: Mapped[str | None] = mapped_column(init=False)

    h_intb_infg_bisbetrieb: Mapped[int | None] = mapped_column(init=False)
    c_intb_infg_bisbetrieb: Mapped[str | None] = mapped_column(init=False)

    # relationships
    branche_asw: Mapped[codes.BrancheASW | None] = relationship(
        codes.BrancheASW,
        foreign_keys=[h_intb_bran, c_intb_bran],
        lazy="joined",
        default=None,
    )
    branche_noga: Mapped[codes.BrancheNOGA | None] = relationship(
        codes.BrancheNOGA,
        foreign_keys=[h_intb_bran_noga, c_intb_bran_noga],
        lazy="joined",
        default=None,
    )
    untersuchungs_stand: Mapped[codes.UntersuchungsStand | None] = relationship(
        codes.UntersuchungsStand,
        foreign_keys=[h_intb_unterstand, c_intb_unterstand],
        lazy="joined",
        default=None,
    )
    beurteilung: Mapped[codes.Beurteilung | None] = relationship(
        codes.Beurteilung,
        foreign_keys=[h_intb_res_abwbewe, c_intb_res_abwbewe],
        lazy="joined",
        default=None,
    )
    bemerkung: Mapped[bem.BemerkungBetrieb | None] = relationship(
        bem.BemerkungBetrieb,
        primaryjoin=foreign(bem.BemerkungBetrieb.key_value) == intb_id,
        init=False,
    )
    genauigkeit_von: Mapped[codes.Genauigkeit | None] = relationship(
        codes.Genauigkeit,
        foreign_keys=[h_intb_infg_vonbetrieb, c_intb_infg_vonbetrieb],
        lazy="joined",
        default=None,
    )
    genauigkeit_bis: Mapped[codes.Genauigkeit | None] = relationship(
        codes.Genauigkeit,
        foreign_keys=[h_intb_infg_bisbetrieb, c_intb_infg_bisbetrieb],
        lazy="joined",
        default=None,
    )
    begruendung_bewertung: Mapped[bem.BegruendungBewertungBetrieb | None] = (
        relationship(
            bem.BegruendungBewertungBetrieb,
            primaryjoin=foreign(bem.BegruendungBewertungBetrieb.key_value) == intb_id,
            init=False,
            cascade="all, delete-orphan",
        )
    )

    intb_typ: Mapped[str] = mapped_column(init=False)

    # actual fields
    firma_name: Mapped[str | None] = mapped_column("intb_firma_name", default=None)
    firma_strasse: Mapped[str | None] = mapped_column(
        "intb_firma_strasse", default=None
    )
    firma_plz: Mapped[str | None] = mapped_column("intb_firma_plz", default=None)
    firma_ort: Mapped[str | None] = mapped_column("intb_firma_ort", default=None)
    groesse: Mapped[int | None] = mapped_column("intb_groesse", default=None)
    eva: Mapped[str | None] = mapped_column("intb_eva", default=None)

    zeitraum_von: Mapped[date | None] = mapped_column("intb_vonbetrieb", default=None)
    zeitraum_bis: Mapped[date | None] = mapped_column("intb_bisbetrieb", default=None)
    zeitraum_vonjahr: Mapped[bool] = mapped_column(default=False)
    zeitraum_bisjahr: Mapped[bool] = mapped_column(default=False)
    zeitraum_bisheute: Mapped[bool] = mapped_column(default=False)

    relevant: Mapped[bool | None] = mapped_column(default=None)
    mobile_stoffe: Mapped[bool | None] = mapped_column(
        "intb_mobile_stoffe", default=None
    )

    zentroid: Mapped[WKBElement | None] = mapped_column(
        Geometry("POINT", srid=constants.LV_95_SRID), default=None, init=False
    )
    zentroid_geojson: Mapped[str | None] = column_property(
        functions.ST_AsGeoJSON(zentroid)
    )

    def set_zentroid(self, geojson: dict[str, Any]):
        self.zentroid = functions.ST_GeomFromGeoJSON(json.dumps(geojson))
        self.zentroid = functions.ST_SetSRID(self.zentroid, constants.LV_95_SRID)


class Betrieb(BasisBetrieb, kw_only=True):
    __mapper_args__ = {
        "polymorphic_identity": constants.StandortTyp.BETRIEB,
        "polymorphic_load": "inline",
    }
    bemerkung_datenimport: Mapped[bem.BemerkungDatenimportBetrieb | None] = (
        relationship(
            bem.BemerkungDatenimportBetrieb,
            primaryjoin=foreign(bem.BemerkungDatenimportBetrieb.key_value)
            == BasisBetrieb.intb_id,
            init=False,
        )
    )


class Schiessanlage(BasisBetrieb, kw_only=True):
    __mapper_args__ = {
        "polymorphic_identity": constants.StandortTyp.SCHIESSANLAGE,
        # See https://docs.sqlalchemy.org/en/20/orm/queryguide/inheritance.html#optimizing-attribute-loads-for-single-inheritance
        "polymorphic_load": "inline",
    }

    # Relationships
    typ: Mapped[codes.SchiessanlageTyp | None] = relationship(
        codes.SchiessanlageTyp,
        foreign_keys="[Schiessanlage.h_intb_schiessanlage_typ, Schiessanlage.c_intb_schiessanlage_typ]",
        lazy="joined",
        default=None,
    )

    # actual fields
    schusszahl: Mapped[int | None] = mapped_column(
        "intb_schiessanlage_schusszahl", default=None
    )
    scheibenzahl: Mapped[int | None] = mapped_column(
        "intb_schiessanlage_scheibenzahl", default=None
    )
    hat_kugelfang: Mapped[bool | None] = mapped_column(
        "intb_schiessanlage_hat_kugelfang", default=False
    )
    bemerkung_datenimport: Mapped[bem.BemerkungDatenimportSchiessanlage | None] = (
        relationship(
            bem.BemerkungDatenimportSchiessanlage,
            primaryjoin=foreign(bem.BemerkungDatenimportSchiessanlage.key_value)
            == BasisBetrieb.intb_id,
            init=False,
        )
    )


class Unfallstoff(Base, SupportsSnapshots, ErfassungMutationMixin):
    __tablename__ = "inum"
    __table_args__ = (
        CodeForeignKeyConstraint(["h_inum_stoffe", "c_inum_stoffe"]),
        {"schema": "alma"},
    )
    # Primary Keys
    inum_id: Mapped[int] = mapped_column(primary_key=True, init=False)

    # Foreign keys
    intu_id: Mapped[int] = mapped_column(ForeignKey("alma.intu.intu_id"), init=False)

    # Codewerte
    h_inum_stoffe: Mapped[int | None] = mapped_column(init=False)
    c_inum_stoffe: Mapped[str | None] = mapped_column(init=False)

    # Relationships
    stoff: Mapped[codes.Stoff | None] = relationship(
        codes.Stoff,
        foreign_keys=[h_inum_stoffe, c_inum_stoffe],
        lazy="joined",
        default=None,
    )

    # Actual fields
    stoffmng: Mapped[float | None] = mapped_column("inum_stoffmng", default=None)
    ausgelaufen: Mapped[float | None] = mapped_column("inum_ausgelaufen", default=None)
    zurueckgewonnen: Mapped[float | None] = mapped_column(
        "inum_zurueckgewonnen", default=None
    )


class Unfall(Base, SupportsSnapshots, ErfassungMutationMixin):
    __tablename__ = "intu"
    __table_args__ = (
        CodeForeignKeyConstraint(["h_intu_infg_unfallvon", "c_intu_infg_unfallvon"]),
        {"schema": "alma"},
    )
    # Primary keys
    intu_id: Mapped[int] = mapped_column(primary_key=True, init=False)

    # Foreign keys
    vflz_id: Mapped[int] = mapped_column(ForeignKey("alma.vflz.vflz_id"), init=False)

    # Codewerte
    h_intu_infg_unfallvon: Mapped[int | None] = mapped_column(init=False)
    c_intu_infg_unfallvon: Mapped[str | None] = mapped_column(init=False)

    # Relationships
    genauigkeit_zeitpunkt: Mapped[codes.Genauigkeit | None] = relationship(
        codes.Genauigkeit,
        foreign_keys=[h_intu_infg_unfallvon, c_intu_infg_unfallvon],
        lazy="joined",
        default=None,
    )
    unfallstoffe: Mapped[list[Unfallstoff]] = relationship(
        Unfallstoff,
        init=False,
        cascade="all, delete-orphan",
        order_by=Unfallstoff.inum_id,
    )
    bemerkung: Mapped[bem.BemerkungUnfall | None] = relationship(
        bem.BemerkungUnfall,
        primaryjoin=foreign(bem.BemerkungUnfall.key_value) == intu_id,
        init=False,
    )
    bemerkung_datenimport: Mapped[bem.BemerkungDatenimportUnfall | None] = relationship(
        bem.BemerkungDatenimportUnfall,
        primaryjoin=foreign(bem.BemerkungDatenimportUnfall.key_value) == intu_id,
        init=False,
    )

    # Actual fields
    name: Mapped[str | None] = mapped_column("intu_name", default=None)
    zeitpunkt: Mapped[date | None] = mapped_column("intu_unfallvon", default=None)
    zeitpunkt_jahr: Mapped[bool] = mapped_column("zeitraum_jahr", default=False)


pfas_haltige_loeschmittel_mapping = Table(
    "intp_pfas_haltige_loeschmittel",
    Base.metadata,
    Column("intp_pfas_haltige_loeschmittel_id", Integer, primary_key=True),
    Column("intp_id", Integer, ForeignKey("alma.intp.intp_id")),
    Column("h_loeschmittel_pfas_haltig", Integer),
    Column("c_loeschmittel_pfas_haltig", String),
    CodeForeignKeyConstraint(
        ["h_loeschmittel_pfas_haltig", "c_loeschmittel_pfas_haltig"]
    ),
)
pfas_haltige_loeschmittel_mapping.schema = "alma"


pfas_freie_loeschmittel_mapping = Table(
    "intp_pfas_freie_loeschmittel",
    Base.metadata,
    Column("intp_pfas_freie_loeschmittel_id", Integer, primary_key=True),
    Column("intp_id", Integer, ForeignKey("alma.intp.intp_id")),
    Column("h_loeschmittel_pfas_frei", Integer),
    Column("c_loeschmittel_pfas_frei", String),
    CodeForeignKeyConstraint(["h_loeschmittel_pfas_frei", "c_loeschmittel_pfas_frei"]),
)
pfas_freie_loeschmittel_mapping.schema = "alma"


class LoeschschaumEinsatz(Base, SupportsSnapshots, ErfassungMutationMixin):
    __tablename__ = "intp_loeschschaum_einsatz"
    __table_args__ = (
        CodeForeignKeyConstraint(["h_loeschschaum_einsatz", "c_loeschschaum_einsatz"]),
        CodeForeignKeyConstraint(["h_haeufigkeit_nutzung", "c_haeufigkeit_nutzung"]),
        {"schema": "alma"},
    )

    # Primary keys / foreign keys
    intp_loeschschaum_einsatz_id: Mapped[int] = mapped_column(
        primary_key=True, init=False
    )
    intp_id: Mapped[int] = mapped_column(ForeignKey("alma.intp.intp_id"), init=False)

    # Codewerte
    h_loeschschaum_einsatz: Mapped[int] = mapped_column(init=False)
    c_loeschschaum_einsatz: Mapped[str] = mapped_column(init=False)

    h_haeufigkeit_nutzung: Mapped[int | None] = mapped_column(init=False)
    c_haeufigkeit_nutzung: Mapped[str | None] = mapped_column(init=False)

    # Relationships
    loeschschaum_einsatz: Mapped[codes.LoeschschaumEinsatz] = relationship(
        codes.LoeschschaumEinsatz,
        foreign_keys=[h_loeschschaum_einsatz, c_loeschschaum_einsatz],
        lazy="joined",
    )
    haeufigkeit_nutzung: Mapped[codes.HaeufigkeitNutzungVariante | None] = relationship(
        codes.HaeufigkeitNutzungVariante,
        foreign_keys=[h_haeufigkeit_nutzung, c_haeufigkeit_nutzung],
        lazy="joined",
        default=None,
    )


class PFAS(Base, SupportsSnapshots, ErfassungMutationMixin):
    __tablename__ = "intp"
    __table_args__ = (
        CodeForeignKeyConstraint(["h_untersuchungsstand", "c_untersuchungsstand"]),
        CodeForeignKeyConstraint(["h_beurteilung", "c_beurteilung"]),
        CodeForeignKeyConstraint(["h_branche", "c_branche"]),
        CodeForeignKeyConstraint(["h_pfas_typ", "c_pfas_typ"]),
        CodeForeignKeyConstraint(["h_infg_von", "c_infg_von"]),
        CodeForeignKeyConstraint(["h_infg_bis", "c_infg_bis"]),
        {"schema": "alma"},
    )

    # Primary keys / foreign keys
    intp_id: Mapped[int] = mapped_column(primary_key=True, init=False)
    vflz_id: Mapped[int] = mapped_column(ForeignKey("alma.vflz.vflz_id"), init=False)

    # Codewerte
    h_untersuchungsstand: Mapped[int | None] = mapped_column(init=False)
    c_untersuchungsstand: Mapped[str | None] = mapped_column(init=False)

    h_beurteilung: Mapped[int | None] = mapped_column(init=False)
    c_beurteilung: Mapped[str | None] = mapped_column(init=False)

    h_branche: Mapped[int | None] = mapped_column(init=False)
    c_branche: Mapped[str | None] = mapped_column(init=False)

    h_pfas_typ: Mapped[int | None] = mapped_column(init=False)
    c_pfas_typ: Mapped[str | None] = mapped_column(init=False)

    h_infg_von: Mapped[int | None] = mapped_column(init=False)
    c_infg_von: Mapped[str | None] = mapped_column(init=False)

    h_infg_bis: Mapped[int | None] = mapped_column(init=False)
    c_infg_bis: Mapped[str | None] = mapped_column(init=False)

    #  Relationships
    untersuchungs_stand: Mapped[codes.UntersuchungsStand | None] = relationship(
        codes.UntersuchungsStand,
        foreign_keys=[h_untersuchungsstand, c_untersuchungsstand],
        lazy="joined",
        default=None,
    )
    beurteilung: Mapped[codes.Beurteilung | None] = relationship(
        codes.Beurteilung,
        foreign_keys=[h_beurteilung, c_beurteilung],
        lazy="joined",
        default=None,
    )
    branche: Mapped[codes.BranchePFAS | None] = relationship(
        codes.BranchePFAS,
        foreign_keys=[h_branche, c_branche],
        lazy="joined",
        default=None,
    )
    pfas_typ: Mapped[codes.PFASTyp | None] = relationship(
        codes.PFASTyp,
        foreign_keys=[h_pfas_typ, c_pfas_typ],
        lazy="joined",
        default=None,
    )
    genauigkeit_von: Mapped[codes.Genauigkeit | None] = relationship(
        codes.Genauigkeit,
        foreign_keys=[h_infg_von, c_infg_von],
        lazy="joined",
        default=None,
    )
    genauigkeit_bis: Mapped[codes.Genauigkeit | None] = relationship(
        codes.Genauigkeit,
        foreign_keys=[h_infg_bis, c_infg_bis],
        lazy="joined",
        default=None,
    )
    bemerkung: Mapped[bem.BemerkungPFAS | None] = relationship(
        bem.BemerkungPFAS,
        primaryjoin=foreign(bem.BemerkungPFAS.key_value) == intp_id,
        init=False,
        cascade="all, delete-orphan",
    )
    bemerkung_datenimport: Mapped[bem.BemerkungDatenimportPFAS | None] = relationship(
        bem.BemerkungDatenimportPFAS,
        primaryjoin=foreign(bem.BemerkungDatenimportPFAS.key_value) == intp_id,
        init=False,
    )
    begruendung_bewertung: Mapped[bem.BegruendungBewertungPFAS | None] = relationship(
        bem.BegruendungBewertungPFAS,
        primaryjoin=foreign(bem.BegruendungBewertungPFAS.key_value) == intp_id,
        init=False,
        cascade="all, delete-orphan",
    )
    pfas_haltige_loeschmittel: Mapped[list[codes.LoeschmittelPFASHaltig]] = (
        relationship(
            codes.LoeschmittelPFASHaltig,
            secondary=pfas_haltige_loeschmittel_mapping,
            init=False,
        )
    )
    pfas_freie_loeschmittel: Mapped[list[codes.LoeschmittelPFASFrei]] = relationship(
        codes.LoeschmittelPFASFrei,
        secondary=pfas_freie_loeschmittel_mapping,
        init=False,
    )
    loeschschaum_einsatz: Mapped[list[LoeschschaumEinsatz]] = relationship(
        LoeschschaumEinsatz,
        init=False,
        cascade="all, delete-orphan",
    )

    # Actual fields
    name: Mapped[str | None] = mapped_column(default=None)
    strasse: Mapped[str | None] = mapped_column(default=None)
    plz: Mapped[str | None] = mapped_column(default=None)
    ort: Mapped[str | None] = mapped_column(default=None)
    eva: Mapped[str | None] = mapped_column("eva_nummer", default=None)

    zeitraum_von: Mapped[date | None] = mapped_column("von", default=None)
    zeitraum_bis: Mapped[date | None] = mapped_column("bis", default=None)
    zeitraum_vonjahr: Mapped[bool] = mapped_column(default=False)
    zeitraum_bisjahr: Mapped[bool] = mapped_column(default=False)
    zeitraum_bisheute: Mapped[bool] = mapped_column(default=False)

    pfas_loeschmittel: Mapped[bool | None] = mapped_column(default=None)
    relevant: Mapped[bool | None] = mapped_column(default=None)

    menge_schaumgemisch: Mapped[int | None] = mapped_column(default=None)
    menge_konzentrat: Mapped[int | None] = mapped_column(default=None)
    beschreibungen_detail: Mapped[str | None] = mapped_column(default=None)

    zentroid: Mapped[WKBElement | None] = mapped_column(
        Geometry("POINT", srid=constants.LV_95_SRID), default=None, init=False
    )
    zentroid_geojson: Mapped[str | None] = column_property(
        functions.ST_AsGeoJSON(zentroid)
    )

    def set_zentroid(self, geojson: dict[str, Any]):
        self.zentroid = functions.ST_GeomFromGeoJSON(json.dumps(geojson))
        self.zentroid = functions.ST_SetSRID(self.zentroid, constants.LV_95_SRID)


kinderspielplatz_altersstufe_mapping_table = Table(
    "intk_altersstufe",
    Base.metadata,
    Column("intk_altersstufe_id", Integer, primary_key=True),
    Column("intk_id", Integer, ForeignKey("alma.intk.intk_id")),
    Column("h_altersstufe_kinder", Integer),
    Column("c_altersstufe_kinder", String),
    CodeForeignKeyConstraint(["h_altersstufe_kinder", "c_altersstufe_kinder"]),
)
kinderspielplatz_altersstufe_mapping_table.schema = "alma"


class KinderspielplatzGruenflaeche(Base, SupportsSnapshots, ErfassungMutationMixin):
    __tablename__ = "intk"
    __table_args__ = (
        CodeForeignKeyConstraint(["h_infg_von", "c_infg_von"]),
        CodeForeignKeyConstraint(["h_infg_bis", "c_infg_bis"]),
        CodeForeignKeyConstraint(
            ["h_kinderspielplatz_gruenflache_typ", "c_kinderspielplatz_gruenflache_typ"]
        ),
        CodeForeignKeyConstraint(["h_eigentumsform", "c_eigentumsform"]),
        CodeForeignKeyConstraint(["h_beurteilung", "c_beurteilung"]),
        CodeForeignKeyConstraint(["h_untersuchungsstand", "c_untersuchungsstand"]),
        {"schema": "alma"},
    )

    # Primary key
    intk_id: Mapped[int] = mapped_column(primary_key=True, init=False)

    # Foreign key to
    vflz_id: Mapped[int] = mapped_column(ForeignKey("alma.vflz.vflz_id"), init=False)

    # Codewerte
    h_infg_von: Mapped[int | None] = mapped_column(init=False)
    c_infg_von: Mapped[str | None] = mapped_column(init=False)

    h_infg_bis: Mapped[int | None] = mapped_column(init=False)
    c_infg_bis: Mapped[str | None] = mapped_column(init=False)

    h_kinderspielplatz_gruenflache_typ: Mapped[int | None] = mapped_column(init=False)
    c_kinderspielplatz_gruenflache_typ: Mapped[str | None] = mapped_column(init=False)

    h_eigentumsform: Mapped[int | None] = mapped_column(init=False)
    c_eigentumsform: Mapped[str | None] = mapped_column(init=False)

    h_beurteilung: Mapped[int | None] = mapped_column(init=False)
    c_beurteilung: Mapped[str | None] = mapped_column(init=False)

    h_untersuchungsstand: Mapped[int | None] = mapped_column(init=False)
    c_untersuchungsstand: Mapped[str | None] = mapped_column(init=False)

    # Relationships
    genauigkeit_von: Mapped[codes.Genauigkeit | None] = relationship(
        codes.Genauigkeit,
        foreign_keys=[h_infg_von, c_infg_von],
        lazy="joined",
        default=None,
    )
    genauigkeit_bis: Mapped[codes.Genauigkeit | None] = relationship(
        codes.Genauigkeit,
        foreign_keys=[h_infg_bis, c_infg_bis],
        lazy="joined",
        default=None,
    )
    kinderspielplatz_gruenflache_typ: Mapped[
        codes.KinderspielplatzGruenflaecheTyp | None
    ] = relationship(
        codes.KinderspielplatzGruenflaecheTyp,
        foreign_keys=[
            h_kinderspielplatz_gruenflache_typ,
            c_kinderspielplatz_gruenflache_typ,
        ],
        lazy="joined",
        default=None,
    )
    eigentumsform: Mapped[codes.Eigentumsform | None] = relationship(
        codes.Eigentumsform,
        foreign_keys=[h_eigentumsform, c_eigentumsform],
        lazy="joined",
        default=None,
    )
    beurteilung: Mapped[codes.Beurteilung | None] = relationship(
        codes.Beurteilung,
        foreign_keys=[h_beurteilung, c_beurteilung],
        lazy="joined",
        default=None,
    )
    untersuchungs_stand: Mapped[codes.UntersuchungsStand | None] = relationship(
        codes.UntersuchungsStand,
        foreign_keys=[h_untersuchungsstand, c_untersuchungsstand],
        lazy="joined",
        default=None,
    )
    bemerkung: Mapped[bem.BemerkungKinderspielplatzGruenflaeche | None] = relationship(
        bem.BemerkungKinderspielplatzGruenflaeche,
        primaryjoin=foreign(bem.BemerkungKinderspielplatzGruenflaeche.key_value)
        == intk_id,
        init=False,
        cascade="all, delete-orphan",
    )
    bemerkung_datenimport: Mapped[
        bem.BemerkungDatenimportKinderspielplatzGruenflaeche | None
    ] = relationship(
        bem.BemerkungDatenimportKinderspielplatzGruenflaeche,
        primaryjoin=foreign(
            bem.BemerkungDatenimportKinderspielplatzGruenflaeche.key_value
        )
        == intk_id,
        init=False,
    )
    begruendung_bewertung: Mapped[
        bem.BegruendungBewertungKinderspielplatzGruenflaeche | None
    ] = relationship(
        bem.BegruendungBewertungKinderspielplatzGruenflaeche,
        primaryjoin=foreign(
            bem.BegruendungBewertungKinderspielplatzGruenflaeche.key_value
        )
        == intk_id,
        init=False,
        cascade="all, delete-orphan",
    )
    altersstufen_kinder: Mapped[list[codes.AltersstufeKinder]] = relationship(
        codes.AltersstufeKinder,
        init=False,
        secondary=kinderspielplatz_altersstufe_mapping_table,
    )

    # Actual fields
    name: Mapped[str | None] = mapped_column(default=None)
    strasse: Mapped[str | None] = mapped_column(default=None)
    plz: Mapped[str | None] = mapped_column(default=None)
    ort: Mapped[str | None] = mapped_column(default=None)
    eva: Mapped[str | None] = mapped_column("eva_nummer", default=None)

    zeitraum_von: Mapped[date | None] = mapped_column("von", default=None)
    zeitraum_bis: Mapped[date | None] = mapped_column("bis", default=None)
    zeitraum_vonjahr: Mapped[bool] = mapped_column(default=False)
    zeitraum_bisjahr: Mapped[bool] = mapped_column(default=False)
    zeitraum_bisheute: Mapped[bool] = mapped_column(default=False)

    relevant: Mapped[bool | None] = mapped_column(default=None)
    belastung_ueber_sanierungswert: Mapped[bool | None] = mapped_column(default=None)

    zentroid: Mapped[WKBElement | None] = mapped_column(
        Geometry("POINT", srid=constants.LV_95_SRID), default=None, init=False
    )
    zentroid_geojson: Mapped[str | None] = column_property(
        functions.ST_AsGeoJSON(zentroid)
    )

    def set_zentroid(self, geojson: dict[str, Any]):
        self.zentroid = functions.ST_GeomFromGeoJSON(json.dumps(geojson))
        self.zentroid = functions.ST_SetSRID(self.zentroid, constants.LV_95_SRID)


class Beurteilung(Base, SupportsSnapshots, ErfassungMutationMixin):
    __tablename__ = "bere"
    __table_args__ = (
        CodeForeignKeyConstraint(["h_bere_res_abwbewe", "c_bere_res_abwbewe"]),
        CodeForeignKeyConstraint(["h_bere_prio_untersuch", "c_bere_prio_untersuch"]),
        CodeForeignKeyConstraint(["h_bere_prio_sanier", "c_bere_prio_sanier"]),
        {"schema": "alma"},
    )
    # primary keys / foreign keys
    vflz_id: Mapped[int] = mapped_column(
        ForeignKey("alma.vflz.vflz_id"), primary_key=True, init=False
    )

    # Codewerte
    h_bere_res_abwbewe: Mapped[int | None] = mapped_column(init=False)
    c_bere_res_abwbewe: Mapped[str | None] = mapped_column(init=False)

    h_bere_prio_untersuch: Mapped[int | None] = mapped_column(init=False)
    c_bere_prio_untersuch: Mapped[str | None] = mapped_column(init=False)

    h_bere_prio_sanier: Mapped[int | None] = mapped_column(init=False)
    c_bere_prio_sanier: Mapped[str | None] = mapped_column(init=False)

    # Relationships
    beurteilung: Mapped[codes.Beurteilung | None] = relationship(
        codes.Beurteilung,
        foreign_keys=[h_bere_res_abwbewe, c_bere_res_abwbewe],
        lazy="joined",
        default=None,
    )
    prio_untersuch: Mapped[codes.PrioUntersuchung | None] = relationship(
        codes.PrioUntersuchung,
        foreign_keys=[h_bere_prio_untersuch, c_bere_prio_untersuch],
        lazy="joined",
        default=None,
    )
    prio_sanier: Mapped[codes.PrioSanierung | None] = relationship(
        codes.PrioSanierung,
        foreign_keys=[h_bere_prio_sanier, c_bere_prio_sanier],
        lazy="joined",
        default=None,
    )

    @property
    def kbs_info(self) -> codes.KbsInfo | None:
        if self.beurteilung:
            return self.beurteilung.kbs_info
        return None

    @property
    def rechtlicher_bezug(self) -> codes.RechtlicherBezug | None:
        if self.beurteilung:
            return codes.RechtlicherBezug(
                codeliste=codes.CodeListe(constants.CodeListe.RechtlicherBezug),
                code=self.beurteilung.code,
            )

    @property
    def handlungsbedarf(self) -> codes.Handlungsbedarf | None:
        if self.beurteilung:
            return codes.Handlungsbedarf(
                codeliste=codes.CodeListe(constants.CodeListe.Handlungsbedarf),
                code=self.beurteilung.code,
            )


class Massnahme(Base, SupportsSnapshots, ErfassungMutationMixin):
    __tablename__ = "mass"
    __table_args__ = (
        CodeForeignKeyConstraint(["h_massnahme", "c_massnahme"]),
        {"schema": "alma"},
    )
    # Primary keys
    mass_id: Mapped[int] = mapped_column(init=False, primary_key=True)

    # Foreign keys
    vflz_id: Mapped[int] = mapped_column(ForeignKey("alma.vflz.vflz_id"), init=False)

    # Codewerte
    h_massnahme: Mapped[int | None] = mapped_column(init=False)
    c_massnahme: Mapped[str | None] = mapped_column(init=False)

    # Relationships
    massnahme: Mapped[codes.Massnahme | None] = relationship(
        codes.Massnahme,
        foreign_keys=[h_massnahme, c_massnahme],
        lazy="joined",
        default=None,
    )
    bemerkung: Mapped[bem.BemerkungMassnahme | None] = relationship(
        bem.BemerkungMassnahme,
        primaryjoin=foreign(bem.BemerkungMassnahme.key_value) == mass_id,
        init=False,
        default=None,
        cascade="all, delete-orphan",
    )

    # Actual fields
    dat_massnahme: Mapped[date | None] = mapped_column(default=None)
    ang_massnahme: Mapped[date | None] = mapped_column(default=None)


class Sanierungsziel(Base, SupportsSnapshots, ErfassungMutationMixin):
    __tablename__ = "sani"
    __table_args__ = (
        CodeForeignKeyConstraint(["h_saniziel", "c_saniziel"]),
        {"schema": "alma"},
    )
    # Primary Keys
    sani_id: Mapped[int] = mapped_column(primary_key=True, init=False)

    # Foreign keys
    vflz_id: Mapped[int] = mapped_column(ForeignKey("alma.vflz.vflz_id"), init=False)

    # Codewerte
    h_saniziel: Mapped[int | None] = mapped_column(init=False)
    c_saniziel: Mapped[str | None] = mapped_column(init=False)

    # Relationships
    sanierungsziel: Mapped[codes.Sanierungsziel | None] = relationship(
        codes.Sanierungsziel,
        foreign_keys=[h_saniziel, c_saniziel],
        lazy="joined",
        default=None,
    )
    bemerkung: Mapped[bem.BemerkungSanierung | None] = relationship(
        bem.BemerkungSanierung,
        primaryjoin=foreign(bem.BemerkungSanierung.key_value) == sani_id,
        init=False,
        cascade="all, delete-orphan",
    )


class KTU(Base):
    __tablename__ = "ktu"
    __table_args__ = (CodeForeignKeyConstraint(["h_ktu", "c_ktu"]), {"schema": "alma"})

    # Primary Keys
    ktu_id: Mapped[int] = mapped_column(primary_key=True, init=False)

    # Codewerte
    h_ktu: Mapped[int] = mapped_column(init=False)
    c_ktu: Mapped[str] = mapped_column(init=False)

    # Relationships
    ktu: Mapped[codes.KTU] = relationship(
        codes.KTU, foreign_keys=[h_ktu, c_ktu], lazy="joined", init=False
    )

    # Actual fields
    rangefrom: Mapped[int]
    rangeto: Mapped[int]


class VflGeo(Base, SupportsSnapshots, ErfassungMutationMixin, kw_only=True):
    """Geometry of a Verdachtsfläche. Keep it as a separate object to allow tracking."""

    __tablename__ = "vflgeo"

    __table_args__ = ({"schema": "alma"},)

    # Primary keys
    vflgeo_id: Mapped[int] = mapped_column(primary_key=True, init=False)

    # Foreign keys
    vflz_id: Mapped[int] = mapped_column(ForeignKey("alma.vflz.vflz_id"), init=False)

    # Actual fields
    wkb_geometry: Mapped[WKBElement] = mapped_column(
        Geometry(geometry_type="Geometry", srid=constants.LV_95_SRID), init=False
    )
    # set init=False as it will be set by set_geometry function
    wkb_geometry_geojson: Mapped[str] = column_property(
        functions.ST_AsGeoJSON(wkb_geometry)
    )
    flaeche: Mapped[float] = column_property(functions.ST_Area(wkb_geometry))

    buffered_wkb_geometry: Mapped[WKBElement] = column_property(
        case(
            (
                functions.ST_IsEmpty(functions.ST_Buffer(wkb_geometry, -1)),
                functions.ST_GeomFromEWKB(wkb_geometry),
            ),
            else_=functions.ST_Buffer(wkb_geometry, -1),
        )
    )

    def set_geometry(self, geojson: dict[str, Any]):
        self.wkb_geometry = functions.ST_GeomFromGeoJSON(json.dumps(geojson))
        self.wkb_geometry = functions.ST_SetSRID(
            self.wkb_geometry, constants.LV_95_SRID
        )


class VflzStatusPublikation(Base):
    __tablename__ = "vflz_publication_status_v"
    __table_args__ = {"schema": "alma"}

    vfl_id: Mapped[int] = mapped_column(primary_key=True)
    published_vflz_id: Mapped[int]
    dat_publizieren: Mapped[date]
    belastet: Mapped[bool]


class VflzCurrent(Base):
    __tablename__ = "vflz_current_v"
    __table_args__ = {"schema": "alma"}

    vflz_id: Mapped[int] = mapped_column(primary_key=True)
    vfl_id: Mapped[int]
    is_current: Mapped[bool]
    vflz_created_date: Mapped[datetime]


class Vollzug(Base, SupportsSnapshots, ErfassungMutationMixin):
    __tablename__ = "vflnr"
    __table_args__ = (
        CodeForeignKeyConstraint(["h_org_kuerzel", "c_org_kuerzel"]),
        {"schema": "alma"},
    )

    # Primary Keys
    vflnr_id: Mapped[int] = mapped_column(primary_key=True, init=False)

    # Codewerte
    h_org_kuerzel: Mapped[int] = mapped_column(init=False)
    c_org_kuerzel: Mapped[str] = mapped_column(init=False)

    # Relationships
    behoerde: Mapped[codes.BehoerdenKuerzel] = relationship(
        codes.BehoerdenKuerzel,
        foreign_keys=[h_org_kuerzel, c_org_kuerzel],
        lazy="joined",
    )

    # Foreign Keys
    vflz_id: Mapped[int] = mapped_column(ForeignKey("alma.vflz.vflz_id"), init=False)

    # Actual fields
    combined_id: Mapped[str] = mapped_column("nummer")
    aktiv: Mapped[bool] = mapped_column(default=False)


class Vflz(Base, SupportsSnapshots, ErfassungMutationMixin, kw_only=True):
    """Verdachtsflächenzustand"""

    __tablename__ = "vflz"
    __table_args__ = (
        CodeForeignKeyConstraint(["h_vflz_vftyp", "c_vflz_vftyp"]),
        CodeForeignKeyConstraint(["h_vflz_deponietyp", "c_vflz_deponietyp"]),
        CodeForeignKeyConstraint(["h_vflz_gws_bereich", "c_vflz_gws_bereich"]),
        CodeForeignKeyConstraint(["h_vflz_gws_zone", "c_vflz_gws_zone"]),
        CodeForeignKeyConstraint(
            ["h_vflz_durchlaessigkeit", "c_vflz_durchlaessigkeit"]
        ),
        CodeForeignKeyConstraint(["h_vflz_karstgeb", "c_vflz_karstgeb"]),
        CodeForeignKeyConstraint(["h_vflz_bearbstand", "c_vflz_bearbstand"]),
        CodeForeignKeyConstraint(["h_vflz_unterstand", "c_vflz_unterstand"]),
        CodeForeignKeyConstraint(["h_org_kuerzel", "c_org_kuerzel"]),
        {"schema": "alma"},
    )

    # Primary keys
    vflz_id: Mapped[int] = mapped_column(primary_key=True, init=False)

    # Foreign keys
    obje_id: Mapped[int] = mapped_column(ForeignKey("alma.obje.obje_id"), init=False)
    h_gem_id: Mapped[int | None] = mapped_column(
        "h_gem_id", ForeignKey("alma.h_gem.h_gem_id"), init=False
    )
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("alma.vflz.vflz_id"), init=False
    )
    flugplatz_id: Mapped[int | None] = mapped_column(
        ForeignKey("alma.flugplatz.flugplatz_id"), init=False
    )
    ktu_id: Mapped[int | None] = mapped_column(
        ForeignKey("alma.ktu.ktu_id"), init=False
    )

    # Not technically a foreign key, but it is referred to later in the
    # `status_publikation` relationship
    vfl_id: Mapped[int] = mapped_column()

    # Codewerte
    h_vflz_vftyp: Mapped[int] = mapped_column(init=False)
    c_vflz_vftyp: Mapped[str] = mapped_column(init=False)
    h_vflz_deponietyp: Mapped[int | None] = mapped_column(init=False)
    c_vflz_deponietyp: Mapped[str | None] = mapped_column(init=False)
    h_vflz_gws_bereich: Mapped[int | None] = mapped_column(init=False)
    c_vflz_gws_bereich: Mapped[str | None] = mapped_column(init=False)
    h_vflz_gws_zone: Mapped[int | None] = mapped_column(init=False)
    c_vflz_gws_zone: Mapped[str | None] = mapped_column(init=False)
    h_vflz_durchlaessigkeit: Mapped[int | None] = mapped_column(init=False)
    c_vflz_durchlaessigkeit: Mapped[str | None] = mapped_column(init=False)
    h_vflz_karstgeb: Mapped[int | None] = mapped_column(init=False)
    c_vflz_karstgeb: Mapped[str | None] = mapped_column(init=False)
    h_vflz_bearbstand: Mapped[int | None] = mapped_column(init=False)
    c_vflz_bearbstand: Mapped[str | None] = mapped_column(init=False)
    h_vflz_unterstand: Mapped[int | None] = mapped_column(init=False)
    c_vflz_unterstand: Mapped[str | None] = mapped_column(init=False)
    h_org_kuerzel: Mapped[int] = mapped_column(init=False)
    c_org_kuerzel: Mapped[str] = mapped_column(init=False)

    # relationships
    objekt: Mapped[Objekt] = relationship(Objekt, lazy="joined")
    gemeinde: Mapped[gem.Gemeinde | None] = relationship(gem.Gemeinde, init=False)
    ablagerungen: Mapped[list[Ablagerung]] = relationship(
        Ablagerung,
        init=False,
        cascade="all, delete-orphan",
        order_by=order_by_start_date_criteria(Ablagerung, Ablagerung.inta_id),
    )
    vftyp: Mapped[codes.StandortTyp] = relationship(
        codes.StandortTyp,
        foreign_keys=[h_vflz_vftyp, c_vflz_vftyp],
        lazy="joined",
    )
    deponietyp: Mapped[codes.DeponieTyp | None] = relationship(
        codes.DeponieTyp,
        foreign_keys=[h_vflz_deponietyp, c_vflz_deponietyp],
        init=False,
        lazy="joined",
    )
    gws_bereich: Mapped[codes.Gewaesserschutzbereich | None] = relationship(
        codes.Gewaesserschutzbereich,
        foreign_keys=[h_vflz_gws_bereich, c_vflz_gws_bereich],
        init=False,
        lazy="joined",
    )
    gws_zone: Mapped[codes.Gewaesserschutzzone | None] = relationship(
        codes.Gewaesserschutzzone,
        foreign_keys=[h_vflz_gws_zone, c_vflz_gws_zone],
        init=False,
        lazy="joined",
    )
    durchlaessigkeit: Mapped[codes.Durchlaessigkeit | None] = relationship(
        codes.Durchlaessigkeit,
        foreign_keys=[h_vflz_durchlaessigkeit, c_vflz_durchlaessigkeit],
        init=False,
        lazy="joined",
    )
    karstgeb: Mapped[codes.JaNeinUnbekannt | None] = relationship(
        codes.JaNeinUnbekannt,
        foreign_keys=[h_vflz_karstgeb, c_vflz_karstgeb],
        init=False,
        lazy="joined",
    )

    betriebe: Mapped[list[Betrieb]] = relationship(
        Betrieb,
        init=False,
        cascade="all, delete-orphan",
        order_by=[
            Betrieb.relevant.is_(True).desc(),
            *order_by_start_date_criteria(Betrieb, Betrieb.intb_id),
        ],
    )
    schiessanlagen: Mapped[list[Schiessanlage]] = relationship(
        Schiessanlage,
        init=False,
        cascade="all, delete-orphan",
        order_by=order_by_start_date_criteria(Schiessanlage, Schiessanlage.intb_id),
    )
    # Only used in alma.search for joining both betriebe and schiessanlagen
    betriebe_und_schiessanlagen: Mapped[list[BasisBetrieb]] = relationship(
        BasisBetrieb,
        init=False,
        viewonly=True,
    )
    # Used in alma.search for joining beteiligte
    beteiligte: Mapped[list[subj.Beteiligter]] = relationship(
        subj.Beteiligter,
        init=False,
        cascade="all, delete-orphan",
        order_by=subj.Beteiligter.bet_id,
    )

    unfaelle: Mapped[list[Unfall]] = relationship(
        Unfall,
        init=False,
        cascade="all, delete-orphan",
        order_by=[
            func.date_part("year", Unfall.zeitpunkt).desc().nulls_last(),
            Unfall.zeitpunkt_jahr.desc(),
            func.date_part("month", Unfall.zeitpunkt).desc(),
            func.date_part("day", Unfall.zeitpunkt).desc(),
            Unfall.intu_id,
        ],
    )
    kinderspielplaetze_gruenflaechen: Mapped[list[KinderspielplatzGruenflaeche]] = (
        relationship(
            KinderspielplatzGruenflaeche,
            init=False,
            cascade="all, delete-orphan",
            order_by=order_by_start_date_criteria(
                KinderspielplatzGruenflaeche, KinderspielplatzGruenflaeche.intk_id
            ),
        )
    )

    grundwasser: Mapped[list[um.Grundwasser]] = relationship(
        um.Grundwasser, init=False, cascade="all, delete-orphan"
    )
    oberflaechen_gewaesser: Mapped[list[um.OberflaechenGewaesser]] = relationship(
        um.OberflaechenGewaesser, init=False, cascade="all, delete-orphan"
    )
    nutzungen_boden: Mapped[list[um.NutzungBoden]] = relationship(
        um.NutzungBoden,
        init=False,
        cascade="all, delete-orphan",
        order_by=um.NutzungBoden.nubo_id,
    )
    umwelt_stoffe: Mapped[list[um.UmweltStoff]] = relationship(
        um.UmweltStoff,
        init=False,
        cascade="all, delete-orphan",
        order_by=um.UmweltStoff.stoffe_id,
    )
    einzelereignisse: Mapped[list[um.Einzelereignis]] = relationship(
        um.Einzelereignis,
        init=False,
        cascade="all, delete-orphan",
        order_by=[
            um.Einzelereignis.datum.desc().nulls_last(),
            um.Einzelereignis.veen_id,
        ],
    )
    umweltschaeden: Mapped[list[um.Umweltschaden]] = relationship(
        um.Umweltschaden,
        init=False,
        cascade="all, delete-orphan",
        order_by=um.Umweltschaden.vfus_id,
    )
    beurteilung: Mapped[Beurteilung | None] = relationship(
        Beurteilung, init=False, cascade="all, delete-orphan"
    )
    massnahmen: Mapped[list[Massnahme]] = relationship(
        Massnahme, init=False, cascade="all, delete-orphan", order_by=Massnahme.mass_id
    )
    sanierungsziele: Mapped[list[Sanierungsziel]] = relationship(
        Sanierungsziel,
        init=False,
        cascade="all, delete-orphan",
        order_by=Sanierungsziel.sani_id,
    )

    bemerkung_standort: Mapped[bem.BemerkungStandort | None] = relationship(
        bem.BemerkungStandort,
        primaryjoin=foreign(bem.BemerkungStandort.key_value) == vflz_id,
        init=False,
        cascade="all, delete-orphan",
    )
    bemerkung_umwelt: Mapped[bem.BemerkungUmwelt | None] = relationship(
        bem.BemerkungUmwelt,
        primaryjoin=foreign(bem.BemerkungUmwelt.key_value) == vflz_id,
        init=False,
        cascade="all, delete-orphan",
    )
    bemerkungen_intern: Mapped[list[bem.BemerkungIntern]] = relationship(
        bem.BemerkungIntern,
        primaryjoin=foreign(bem.BemerkungUmwelt.key_value) == vflz_id,
        init=False,
        cascade="all, delete-orphan",
        order_by=bem.BemerkungIntern.bem_id,
    )
    bemerkung_datenimport: Mapped[bem.BemerkungDatenimportStandort | None] = (
        relationship(
            bem.BemerkungDatenimportStandort,
            primaryjoin=foreign(bem.BemerkungDatenimportStandort.key_value) == vflz_id,
            init=False,
            cascade="all, delete-orphan",
        )
    )
    begruendung_bewertung: Mapped[bem.BegruendungBewertung | None] = relationship(
        bem.BegruendungBewertung,
        primaryjoin=foreign(bem.BegruendungBewertung.key_value) == vflz_id,
        init=False,
        cascade="all, delete-orphan",
    )
    begruendung_prio_untersuchungsbedarf: Mapped[
        bem.BegruendungPrioUntersuchungsbedarf | None
    ] = relationship(
        bem.BegruendungPrioUntersuchungsbedarf,
        primaryjoin=foreign(bem.BegruendungPrioUntersuchungsbedarf.key_value)
        == vflz_id,
        init=False,
        cascade="all, delete-orphan",
    )
    begruendung_prio_sanierungsbedarf: Mapped[
        bem.BegruendungPrioSanierungsbedarf | None
    ] = relationship(
        bem.BegruendungPrioSanierungsbedarf,
        primaryjoin=foreign(bem.BegruendungPrioUntersuchungsbedarf.key_value)
        == vflz_id,
        init=False,
        cascade="all, delete-orphan",
    )

    vflgeo: Mapped[VflGeo | None] = relationship(
        VflGeo, init=False, cascade="all, delete-orphan"
    )

    bearbeitungs_stand: Mapped[codes.Bearbeitungsstand | None] = relationship(
        codes.Bearbeitungsstand,
        foreign_keys=[h_vflz_bearbstand, c_vflz_bearbstand],
        init=False,
        lazy="joined",
        default=None,
    )
    untersuchungs_stand: Mapped[codes.UntersuchungsStand | None] = relationship(
        codes.UntersuchungsStand,
        foreign_keys=[h_vflz_unterstand, c_vflz_unterstand],
        init=False,
        lazy="joined",
        default=None,
    )
    status_publikation: Mapped[VflzStatusPublikation | None] = relationship(
        VflzStatusPublikation,
        primaryjoin=foreign(VflzStatusPublikation.vfl_id) == vfl_id,
        viewonly=True,
        lazy="joined",
        init=False,
    )
    vollzug: Mapped[list[Vollzug]] = relationship(
        Vollzug,
        init=False,
        cascade="all, delete-orphan",
        order_by=Vollzug.vflnr_id,
    )
    behoerde: Mapped[codes.BehoerdenKuerzel] = relationship(
        codes.BehoerdenKuerzel,
        foreign_keys=[h_org_kuerzel, c_org_kuerzel],
    )
    pfas: Mapped[list[PFAS]] = relationship(
        PFAS,
        init=False,
        cascade="all, delete-orphan",
        order_by=order_by_start_date_criteria(PFAS, PFAS.intp_id),
    )
    flugplatz: Mapped[Flugplatz | None] = relationship(Flugplatz, init=False)
    ktu: Mapped[KTU | None] = relationship(KTU, init=False, default=None)

    # actual fields
    combined_id: Mapped[str] = mapped_column("vflz_combined_id_kt")
    bezeichnung: Mapped[str | None] = mapped_column(default=None)

    postleitzahl: Mapped[str | None] = mapped_column("vflz_postleitzahl", default=None)
    ort: Mapped[str | None] = mapped_column("vflz_ort", default=None)

    flurname: Mapped[str | None] = mapped_column("vflz_flurname", default=None)
    strasse: Mapped[str | None] = mapped_column("vflz_strasse", default=None)
    rechtskraft: Mapped[bool] = mapped_column(default=False)
    publizieren: Mapped[bool] = mapped_column(default=False)
    dat_rechtskraft: Mapped[date | None] = mapped_column(default=None)
    dat_publizieren: Mapped[date | None] = mapped_column(default=None)

    zeitraum_von: Mapped[date | None] = mapped_column(default=None)
    zeitraum_bis: Mapped[date | None] = mapped_column(default=None)
    zeitraum_vonjahr: Mapped[bool] = mapped_column(default=False)
    zeitraum_bisjahr: Mapped[bool] = mapped_column(default=False)
    zeitraum_bisheute: Mapped[bool] = mapped_column(default=False)
    vflz_created_date: Mapped[datetime | None] = mapped_column(default=None)

    zentroid: Mapped[WKBElement] = mapped_column(
        Geometry("POINTZ", srid=constants.LV_95_SRID), init=False
    )
    zentroid_geojson: Mapped[str] = column_property(functions.ST_AsGeoJSON(zentroid))
    lang: Mapped[Lang] = mapped_column(default=constants.Language.DE)
    in_betrieb: Mapped[bool | None] = mapped_column(default=None)
    nachsorge: Mapped[bool | None] = mapped_column(default=None)

    message: Mapped[str] = mapped_column(init=False)

    @validates("combined_id")
    def validate_combined_id(self, key: str, combined_id: str):
        for v in self.vollzug:
            if v.behoerde.code == settings.behoerde and combined_id != v.combined_id:
                raise AttributeError(
                    "Combined_id to be set is not equal to vollzug of instance setting."
                )
        return combined_id

    @validates("behoerde")
    def validate_behoerde(self, key: str, behoerde: codes.BehoerdenKuerzel):
        for v in self.vollzug:
            if v.aktiv and behoerde != v.behoerde:
                raise AttributeError(
                    "Behoerde to be set is not equal to active vollzug."
                )
        return behoerde

    def set_zentroid(self, geojson: dict[str, Any]):
        self.zentroid = functions.ST_GeomFromGeoJSON(json.dumps(geojson))
        self.zentroid = functions.ST_SetSRID(self.zentroid, constants.LV_95_SRID)

    def get_current(self, session: Session) -> "Vflz":
        """Return the current version of this Vflz, or self if already current."""
        if self.is_current:
            return self
        return session.scalars(
            select(Vflz).where(Vflz.is_current, Vflz.vfl_id == self.vfl_id)
        ).one()

    def historize(self, message: str) -> None:
        """
        Historize this Vflz version.
        """
        original_vflz_id = self.vflz_id
        assert original_vflz_id

        self._create_immutable_snapshot()

        # Update properties of the new version
        self.message = message
        self.parent_id = original_vflz_id
        self.publizieren = False
        self.dat_publizieren = None
        self.vflz_created_date = datetime.now()

    def update_zeitraum(self):
        for ablagerung in self.ablagerungen:
            ablagerung.update_zeitraum()

        merged_zeitraum = merge(
            self.ablagerungen
            + self.betriebe
            + self.schiessanlagen
            + self.kinderspielplaetze_gruenflaechen
            + self.pfas
        )
        for unfall in self.unfaelle:
            if unfall.zeitpunkt:
                if merged_zeitraum.zeitraum_von is None:  # noqa: SIM114
                    merged_zeitraum.zeitraum_von = unfall.zeitpunkt
                    merged_zeitraum.zeitraum_vonjahr = unfall.zeitpunkt_jahr
                elif unfall.zeitpunkt < merged_zeitraum.zeitraum_von:
                    merged_zeitraum.zeitraum_von = unfall.zeitpunkt
                    merged_zeitraum.zeitraum_vonjahr = unfall.zeitpunkt_jahr

        for k, v in asdict(merged_zeitraum).items():
            setattr(self, k, v)

    def create_teilstandort(
        self,
        *,
        combined_id: str,
        gemeinde: gem.Gemeinde,
        bezeichnung: str,
        parent_geometry: dict[str, Any],
        parent_zentroid: dict[str, Any] | None,
        teilstandort_geometry: dict[str, Any],
        teilstandort_zentroid: dict[str, Any] | None,
    ):
        session = Session.object_session(self)
        assert session
        behoerde = session.scalars(
            select(codes.BehoerdenKuerzel).where(
                codes.BehoerdenKuerzel.code == settings.behoerde
            )
        ).one()

        highest_vfl_id = session.execute(select(sql_functions.max(Vflz.vfl_id))).one()[
            0
        ]

        self.historize("vflz.historization.teilflaecheSeparated")
        historized_parent_vflz_id = self.vflz_id
        parent_id = self.vflz_id
        self._create_mutable_snapshot()
        self.parent_id = parent_id
        self.vfl_id = highest_vfl_id + 1
        self.gemeinde = gemeinde
        self.bezeichnung = bezeichnung

        vollzug = Vollzug(behoerde=self.behoerde, combined_id=combined_id)
        vollzug.aktiv = True
        self.vollzug = [vollzug]
        self.combined_id = combined_id
        self.behoerde = behoerde

        self.set_geometry(teilstandort_zentroid, teilstandort_geometry)
        historized_parent_vflz = session.get_one(Vflz, historized_parent_vflz_id)
        historized_parent_vflz.set_geometry(parent_zentroid, parent_geometry)

    def set_geometry(self, zentroid: dict[str, Any] | None, geometry: dict[str, Any]):
        session = Session.object_session(self)
        if not self.vflgeo:
            self.vflgeo = VflGeo()
        self.vflgeo.set_geometry(geometry)
        if zentroid is None:
            centroid_query = select(  # type: ignore[reportUnknownVariableType]
                functions.ST_AsGeoJSON(
                    functions.ST_Force3D(
                        functions.ST_Centroid(self.vflgeo.wkb_geometry)
                    )
                )
            )
            centroid_geojson = json.loads(session.scalars(centroid_query).one())  # type: ignore[reportUnknownVariableType]
            if settings.height_api:
                centroid_geojson["coordinates"][2] = fetch_height(
                    centroid_geojson["coordinates"][0],
                    centroid_geojson["coordinates"][1],
                )
            self.set_zentroid(centroid_geojson)
        else:
            if settings.height_api:
                zentroid["coordinates"][2] = fetch_height(
                    zentroid["coordinates"][0], zentroid["coordinates"][1]
                )
            self.set_zentroid(zentroid)

    def __post_init__(self):
        vollzug = Vollzug(behoerde=self.behoerde, combined_id=self.combined_id)
        vollzug.aktiv = True
        self.vollzug.append(vollzug)


class VflPool(Base, ErfassungMutationMixin):
    __tablename__ = "vfl_pool"
    __table_args__ = {"schema": "alma"}

    # Primary Keys
    vfl_pool_id: Mapped[int] = mapped_column(primary_key=True, init=False)

    # Foreign keys
    pool_id: Mapped[int] = mapped_column(ForeignKey("alma.pool.pool_id"), init=False)
    vfl_id: Mapped[int] = mapped_column()


class Pool(Base, ErfassungMutationMixin):
    __tablename__ = "pool"
    __table_args__ = {"schema": "alma"}

    # Primary Keys
    pool_id: Mapped[int] = mapped_column(primary_key=True, init=False)

    # relationships
    vfl_pools: Mapped[list[VflPool]] = relationship(
        VflPool, init=False, cascade="all, delete-orphan"
    )

    # Actual fields
    bezeichnung: Mapped[str]
    bemerkungen: Mapped[str | None] = mapped_column(default=None)

    def add_vfl(self, vfl_id: int) -> None:
        self.vfl_pools.append(VflPool(vfl_id=vfl_id))

    def remove_vfl(self, vfl_id: int) -> None:
        self.vfl_pools = [vp for vp in self.vfl_pools if vp.vfl_id != vfl_id]

    def copy(self, bezeichnung: str) -> Self:
        cls = type(self)
        copy = cls(bezeichnung=bezeichnung)
        copy.vfl_pools = [VflPool(vfl_id=vp.vfl_id) for vp in self.vfl_pools]
        return copy


def is_read_only(session: Session, vflz: Vflz) -> bool:
    vollzug_editable_setting = session.scalars(
        select(admin.InstanceSetting).where(
            admin.InstanceSetting.key == "backend.differentVollzugEditable"
        )
    ).one_or_none()
    return (
        vollzug_editable_setting is not None
        and vollzug_editable_setting.value is False
        and settings.behoerde != vflz.behoerde.code
    ) or (not vflz.is_current)


@dataclass
class EvaluationStatusData:
    belastet: bool = False
    rechtskraft: bool = False
    vfl_published: bool = False
    publish_now: bool = False
    vfl_deleted: bool = False
    delete_now: bool = False
    dat_rechtskraft: date | None = None
    vfl_dat_publizieren: date | None = None
    published_previously: bool = False
    deleted_previously: bool = False

    @classmethod
    def from_vflz(cls, session: Session, vflz: Vflz) -> Self:
        current_status = cls()
        rechtskraft_already_set = any(
            session.scalars(
                select(Vflz.rechtskraft).where(Vflz.vfl_id == vflz.vfl_id)
            ).all()
        )
        status_publikation = vflz.status_publikation
        db_beurteilung = vflz.beurteilung if vflz.beurteilung else None

        current_status.belastet = (
            db_beurteilung.kbs_info.belastet
            if (db_beurteilung and db_beurteilung.kbs_info)
            else False
        )
        current_status.rechtskraft = rechtskraft_already_set
        current_status.vfl_published = (
            status_publikation is not None and status_publikation.belastet
        )
        current_status.publish_now = vflz.publizieren and current_status.belastet
        current_status.vfl_deleted = (
            status_publikation is not None and not status_publikation.belastet
        )
        current_status.delete_now = vflz.publizieren and not current_status.belastet
        current_status.vfl_dat_publizieren = (
            status_publikation.dat_publizieren if status_publikation else None
        )
        current_status.dat_rechtskraft = vflz.dat_rechtskraft

        last_published_vflz = session.scalars(
            select(Vflz)
            .where(
                Vflz.vflz_id < vflz.vflz_id,
                Vflz.publizieren,
                Vflz.vfl_id == vflz.vfl_id,
                Vflz.dat_publizieren < datetime.now(),
            )
            .order_by(Vflz.vflz_id.desc())
        ).first()

        current_status.deleted_previously = (
            last_published_vflz is not None
            and bool(last_published_vflz.beurteilung)
            and bool(last_published_vflz.beurteilung.kbs_info)
            and not last_published_vflz.beurteilung.kbs_info.belastet
        )
        current_status.published_previously = (
            last_published_vflz is not None
            and bool(last_published_vflz.beurteilung)
            and bool(last_published_vflz.beurteilung.kbs_info)
            and bool(last_published_vflz.beurteilung.kbs_info.belastet)
        )
        return current_status

    def to_dict(self) -> dict[str, bool | str | None]:
        return {
            "belastet": self.belastet,
            "rechtskraft": self.rechtskraft,
            "vflPublished": self.vfl_published,
            "publishNow": self.publish_now,
            "vflDeleted": self.vfl_deleted,
            "deleteNow": self.delete_now,
            "datRechtskraft": self.dat_rechtskraft.isoformat()
            if self.dat_rechtskraft
            else None,
            "vflDatPublizieren": self.vfl_dat_publizieren.isoformat()
            if self.vfl_dat_publizieren
            else None,
            "publishedPreviously": self.published_previously,
            "deletedPreviously": self.deleted_previously,
        }
