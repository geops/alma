"""This module is used for implementing custom combined_ids.
These follow a specific schema that depends on the specifications provided by the client.
The specifications themselves differ heavily. That is why we need to implement a new
CombinedIdFactory for each client. These need to follow the FactoryTemplate protocol,
i.e. the new factory must provide a `.format` function which suggests a new
combined id ('Standortnummer') given some input data (which is usually vftyp and gemeinde).

The factory can be chosen in the settings."""

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from alma.constants import StandortTyp
from alma.exceptions import CombinedIdError
from alma.models import codes as code_models
from alma.models import flugplatz as fp_models
from alma.models import gem as gem_models
from alma.models import vflz as vflz_models
from alma.settings import CombinedIdFactoryName, TeilstandortCombinedIdFactoryName


def get_suffixes(session: Session, vflz_combined_id_root: str) -> list[str]:
    """Returns the suffix of all vflz_combined ids found in db that start with `vflz_combined_id_root`."""
    combined_ids: list[str] = list(
        session.scalars(
            select(vflz_models.Vflz.combined_id).where(
                vflz_models.Vflz.combined_id.startswith(vflz_combined_id_root)
            )
        ).all()
    )
    return [ci[len(vflz_combined_id_root) :] for ci in combined_ids]


def get_last_laufende_nummer(
    combined_id_suffixes: list[str],
    lfd_nummer_regex: str,
    dot_included_in_suffix: bool = True,
) -> int:
    """Given the suffixes, returns their highest laufende nummer given a regex."""
    compiled_lfd_nummer_regex = re.compile(lfd_nummer_regex)
    last_nummer = 0
    for suffix in combined_id_suffixes:
        match = compiled_lfd_nummer_regex.search(suffix)
        if not match:
            continue
        if dot_included_in_suffix:
            last_nummer = max(int(match.group(0)[1:]), last_nummer)  # omit dot!
        else:
            last_nummer = max(int(match.group(0)), last_nummer)
    return last_nummer


class FactoryTemplate:
    standort_typ_map: dict[StandortTyp, str] = {
        StandortTyp.ABLAGERUNG: "A",
        StandortTyp.BETRIEB: "B",
        StandortTyp.UNFALL: "U",
        StandortTyp.SCHIESSANLAGE: "S",
        StandortTyp.KINDERSPIELPLATZ_GRUENFLAECHE: "K",
        StandortTyp.PFAS: "P",
    }
    lfd_nummer_regex = "^:[0-9]{3}$"

    @classmethod
    def format(
        cls,
        session: Session,
        vftyp: code_models.Code,
        gemeinde: gem_models.Gemeinde | None = None,
        ktu: vflz_models.KTU | None = None,
        flugplatz: fp_models.Flugplatz | None = None,
    ) -> str:
        raise NotImplementedError


class InternalBfsABUSLfdUnderscoreFactory(FactoryTemplate):
    lfd_nummer_regex = "^[0-9]{3}$"
    """Wird verwendet wenn die Gemeinde-IDs nicht in der Gemeindetabelle vorhanden sind, da diese nur intern beim Kunden vorliegen.
    Anhand der dem Standort zugewiesen Gemeinde, wird die zugewiesene Gemeinde-ID extrahiert
    und zur Standortnummergenerierung weiter verwendet.

    Die Standortnummer wird dann nach diesem Muster generiert: <interne-gemeinde-nummer>_<anfangsbuchstabe-standort-typ><laufende-nummer>.
    """

    @classmethod
    def format(
        cls,
        session: Session,
        vftyp: code_models.Code,
        gemeinde: gem_models.Gemeinde | None = None,
        ktu: vflz_models.KTU | None = None,
        flugplatz: fp_models.Flugplatz | None = None,
    ):
        assert gemeinde
        valid_standort_nummer_regexp = r"^[0-9]*_[A|U|B|S][0-9]{3}"
        example_combined_id = session.scalars(
            select(vflz_models.Vflz.combined_id).where(
                vflz_models.Vflz.h_gem_id == gemeinde.h_gem_id,
                vflz_models.Vflz.combined_id.regexp_match(valid_standort_nummer_regexp),
            )
        ).first()

        gemeinde_nummer = "999"
        if example_combined_id:
            gemeinde_nummer = example_combined_id.split("_")[0]

        standort_typ = StandortTyp(vftyp.code)
        stamm = f"{gemeinde_nummer}_{cls.standort_typ_map[standort_typ]}"
        suffixes = get_suffixes(session, stamm)
        last_laufende_nummer = get_last_laufende_nummer(
            suffixes, cls.lfd_nummer_regex, False
        )
        return f"{gemeinde_nummer}_{cls.standort_typ_map[standort_typ]}{last_laufende_nummer + 1:0>3}"


class InternalBfsABUSLfdUnderscoreFactoryTwice(FactoryTemplate):
    lfd_nummer_regex = "^[0-9]{3}$"
    """Wird verwendet wenn die Gemeinde-IDs nicht in der Gemeindetabelle vorhanden sind, da diese nur intern beim Kunden vorliegen.
    Anhand der dem Standort zugewiesen Gemeinde, wird die zugewiesene Gemeinde-ID extrahiert
    und zur Standortnummergenerierung weiter verwendet.

    Die Standortnummer wird dann nach diesem Muster generiert: <interne-gemeinde-nummer>_<anfangsbuchstabe-standort-typ>_<laufende-nummer>.
    """

    @classmethod
    def format(
        cls,
        session: Session,
        vftyp: code_models.Code,
        gemeinde: gem_models.Gemeinde | None = None,
        ktu: vflz_models.KTU | None = None,
        flugplatz: fp_models.Flugplatz | None = None,
    ):
        assert gemeinde
        valid_standort_nummer_regexp = r"^[0-9]*_[A|U|B|S]_[0-9]{3}"
        example_combined_id = session.scalars(
            select(vflz_models.Vflz.combined_id).where(
                vflz_models.Vflz.h_gem_id == gemeinde.h_gem_id,
                vflz_models.Vflz.combined_id.regexp_match(valid_standort_nummer_regexp),
            )
        ).first()

        gemeinde_nummer = "999"
        if example_combined_id:
            gemeinde_nummer = example_combined_id.split("_")[0]

        standort_typ = StandortTyp(vftyp.code)
        stamm = f"{gemeinde_nummer}_{cls.standort_typ_map[standort_typ]}_"
        suffixes = get_suffixes(session, stamm)
        last_laufende_nummer = get_last_laufende_nummer(
            suffixes, cls.lfd_nummer_regex, False
        )
        return f"{gemeinde_nummer}_{cls.standort_typ_map[standort_typ]}_{last_laufende_nummer + 1:0>3}"


class BfsZeroOneThreeTwoLfdrHyphenFactory(FactoryTemplate):
    lfd_nummer_regex = "^[0-9]{3}$"
    standort_typ_map: dict[StandortTyp, str] = {
        StandortTyp.ABLAGERUNG: "0",
        StandortTyp.BETRIEB: "1",
        StandortTyp.UNFALL: "3",
        StandortTyp.SCHIESSANLAGE: "2",
        StandortTyp.KINDERSPIELPLATZ_GRUENFLAECHE: "4",
        StandortTyp.PFAS: "5",
    }
    """Erzeugt Standortnummern nach diesem Muster: <gemeinde-bfs-nummer>-<standort-typ><laufende Nummer>.

    Beispiel: es wird ein Standort vom Standorttyp Ablagerung in der Gemeinde 'Bern' mit der BfS-Nummer 123 erzeugt.
    Dann ist die generierte Standortnummer: 123-0001.
    """

    @classmethod
    def format(
        cls,
        session: Session,
        vftyp: code_models.Code,
        gemeinde: gem_models.Gemeinde | None = None,
        ktu: vflz_models.KTU | None = None,
        flugplatz: fp_models.Flugplatz | None = None,
    ):
        assert gemeinde
        standort_typ = StandortTyp(vftyp.code)
        stamm = f"{gemeinde.bfs_nummer}-{cls.standort_typ_map[standort_typ]}"
        suffixes = get_suffixes(session, stamm)
        last_laufende_nummer = get_last_laufende_nummer(
            suffixes, cls.lfd_nummer_regex, False
        )
        return f"{stamm}{last_laufende_nummer + 1:0>3}"


class BfsDBUSLfdWhitespacesFactory(FactoryTemplate):
    lfd_nummer_regex = "^[0-9]{2}$"
    standort_typ_map: dict[StandortTyp, str] = {
        StandortTyp.ABLAGERUNG: "D",
        StandortTyp.BETRIEB: "S",
        StandortTyp.UNFALL: "U",
        StandortTyp.SCHIESSANLAGE: "S",
        StandortTyp.KINDERSPIELPLATZ_GRUENFLAECHE: "K",
        StandortTyp.PFAS: "P",
    }
    """Erzeugt Standortnummern nach diesem Muster: <gemeinde-bfs-nummer> <standort-typ> <laufende Nummer>.

    Beispiel: es wird ein Standort vom Typ Ablagerung in der Gemeinde 'Bern' mit der BfS-Nummer 123 erzeugt.
    Dann ist die generierte Standortnummer: 123 D 01.
    """

    @classmethod
    def format(
        cls,
        session: Session,
        vftyp: code_models.Code,
        gemeinde: gem_models.Gemeinde | None = None,
        ktu: vflz_models.KTU | None = None,
        flugplatz: fp_models.Flugplatz | None = None,
    ):
        assert gemeinde
        standort_typ = StandortTyp(vftyp.code)
        stamm = f"{gemeinde.bfs_nummer} {cls.standort_typ_map[standort_typ]} "
        suffixes = get_suffixes(session, stamm)
        last_laufende_nummer = get_last_laufende_nummer(
            suffixes, cls.lfd_nummer_regex, False
        )
        return f"{stamm}{last_laufende_nummer + 1:0>2}"


class ABUBKtuFactory(FactoryTemplate):
    """Erzeugt Standortnummer nach diesem Muster: <anfangsbuchstabe-standort-typ><laufende-ktu-nummer>.

    Für jedes Transportunternehmen wurde ein Nummerierungsbereich in der Tabelle KTU gesetzt.
    Bei der Standortnummer wird die nächste Freie Nummer nach dem Buchstaben der Standortsnummer gesetzt.

    Beispiel: KTU= 'LEB' rangefrom = 40501 rangeto = 40999

    Neuer Ablagerungsstandort: A40501 (da bisher kein Standort bei diesem KTU erfasst wurde)
    """

    standort_typ_map: dict[StandortTyp, str] = {
        StandortTyp.ABLAGERUNG: "A",
        StandortTyp.BETRIEB: "B",
        StandortTyp.UNFALL: "U",
        StandortTyp.SCHIESSANLAGE: "B",
        StandortTyp.KINDERSPIELPLATZ_GRUENFLAECHE: "K",
        StandortTyp.PFAS: "P",
    }

    @classmethod
    def format(
        cls,
        session: Session,
        vftyp: code_models.Code,
        gemeinde: gem_models.Gemeinde | None = None,
        ktu: vflz_models.KTU | None = None,
        flugplatz: fp_models.Flugplatz | None = None,
    ):
        assert ktu
        standort_typ = StandortTyp(vftyp.code)
        stamm = cls.standort_typ_map[standort_typ]

        suffixes = get_suffixes(session, stamm)

        last_nummer = None
        for lfd_nummer in range(ktu.rangefrom, ktu.rangeto + 1):
            if str(lfd_nummer) in suffixes:
                last_nummer = lfd_nummer
        last_nummer = last_nummer + 1 if last_nummer else ktu.rangefrom

        if last_nummer > ktu.rangeto:
            raise CombinedIdError("Last number exceeds KTU range")
        return f"{stamm}{last_nummer}"


class FlugplatzDIUSLfdUnderscoreFactory(FactoryTemplate):
    lfd_nummer_regex = "^[0-9]{2}$"
    standort_typ_map: dict[StandortTyp, str] = {
        StandortTyp.ABLAGERUNG: "D",
        StandortTyp.BETRIEB: "I",
        StandortTyp.UNFALL: "U",
        StandortTyp.SCHIESSANLAGE: "S",
        StandortTyp.KINDERSPIELPLATZ_GRUENFLAECHE: "K",
        StandortTyp.PFAS: "P",
    }

    """Erzeugt Standortnummer nach diesem Muster: <flugplatz-id>_<anfangsbuchstabe-standort-typ><laufende-nummer>.

    Beispiel: es wird ein Betrieb in dem Flugplatz mit der ID 'ZRH' erzeugt.
    Dann ist die generierte Standortnummer: ZRH_B001
    """

    @classmethod
    def format(
        cls,
        session: Session,
        vftyp: code_models.Code,
        gemeinde: gem_models.Gemeinde | None = None,
        ktu: vflz_models.KTU | None = None,
        flugplatz: fp_models.Flugplatz | None = None,
    ):
        assert flugplatz
        standort_typ = StandortTyp(vftyp.code)
        stamm = f"{flugplatz.c_kt}-{flugplatz.abk}-{flugplatz.zusatz}-{cls.standort_typ_map[standort_typ]}-"

        suffixes = get_suffixes(session, stamm)
        last_laufende_nummer = get_last_laufende_nummer(
            suffixes, cls.lfd_nummer_regex, False
        )
        return f"{stamm}{last_laufende_nummer + 1:0>2}"


class DInternalBfsDotLfdFactory(FactoryTemplate):
    lfd_nummer_regex = r"^[0-9]+$"
    not_inta_valid_standort_nummer_regex = r"^[0-9]+\.[0-9]+$"
    standort_typ_map: dict[StandortTyp, str] = {
        StandortTyp.ABLAGERUNG: "D",
        StandortTyp.BETRIEB: "",
        StandortTyp.UNFALL: "",
        StandortTyp.SCHIESSANLAGE: "",
        StandortTyp.KINDERSPIELPLATZ_GRUENFLAECHE: "",
        StandortTyp.PFAS: "",
    }
    """Wird verwendet wenn die Gemeinde-IDs nicht in der Gemeindetabelle vorhanden sind, da diese nur intern beim Kunden vorliegen.
    Anhand der dem Standort zugewiesen Gemeinde, wird die zugewiesene Gemeinde-ID extrahiert
    und zur Standortnummergenerierung weiter verwendet.

    Die Standortnummer wird auf zwei Mustern generiert:

    1. Ablagerung: D-<bfs-nummer>-<laufende-nummer>
    2. Sonst: <interne-gemeinde-nummer>.<laufende-nummer>
    """

    @classmethod
    def format(
        cls,
        session: Session,
        vftyp: code_models.Code,
        gemeinde: gem_models.Gemeinde | None = None,
        ktu: vflz_models.KTU | None = None,
        flugplatz: fp_models.Flugplatz | None = None,
    ) -> str:
        assert gemeinde
        standort_typ = StandortTyp(vftyp.code)

        if standort_typ == StandortTyp.ABLAGERUNG:
            stamm = f"{cls.standort_typ_map[standort_typ]}-{gemeinde.bfs_nummer}-"
        else:
            example_combined_id = session.scalars(
                select(vflz_models.Vflz.combined_id).where(
                    vflz_models.Vflz.h_gem_id == gemeinde.h_gem_id,
                    vflz_models.Vflz.combined_id.regexp_match(
                        cls.not_inta_valid_standort_nummer_regex
                    ),
                )
            ).first()

            gemeinde_nummer = (
                example_combined_id.split(".")[0] if example_combined_id else "999"
            )
            stamm = f"{gemeinde_nummer}."

        suffixes = get_suffixes(session, stamm)
        last_laufende_nummer = get_last_laufende_nummer(
            combined_id_suffixes=suffixes,
            lfd_nummer_regex=cls.lfd_nummer_regex,
            dot_included_in_suffix=False,
        )
        return f"{stamm}{last_laufende_nummer + 1}"


class CantonInternalBfsLfdABUBDotFactory(FactoryTemplate):
    lfd_nummer_regex = r"^[0-9]{4}"
    standort_typ_map: dict[StandortTyp, str] = {
        StandortTyp.ABLAGERUNG: "A",
        StandortTyp.BETRIEB: "B",
        StandortTyp.UNFALL: "U",
        StandortTyp.SCHIESSANLAGE: "B",
        StandortTyp.KINDERSPIELPLATZ_GRUENFLAECHE: "K",
        StandortTyp.PFAS: "P",
    }
    """Erzeugt Standortnummer nach diesem Muster: 22.<kantonale-gemeinde-nummer>.<laufende-nummer><Standort-Typ>.

    Anhand der dem Standort zugewiesen Gemeinde, wird die zugewiesene Gemeinde-ID extrahiert
    und zur Standortnummergenerierung weiter verwendet.
    """

    @classmethod
    def format(
        cls,
        session: Session,
        vftyp: code_models.Code,
        gemeinde: gem_models.Gemeinde | None = None,
        ktu: vflz_models.KTU | None = None,
        flugplatz: fp_models.Flugplatz | None = None,
    ):
        assert gemeinde
        valid_standort_nummer_regexp = r"^22\.\d{3}\.\d{4}[ABUB]$"

        example_combined_id = session.scalars(
            select(vflz_models.Vflz.combined_id).where(
                vflz_models.Vflz.h_gem_id == gemeinde.h_gem_id,
                vflz_models.Vflz.combined_id.regexp_match(valid_standort_nummer_regexp),
            )
        ).first()

        gemeinde_nummer = (
            example_combined_id.split(".")[1] if example_combined_id else "999"
        )
        standort_typ = StandortTyp(vftyp.code)
        stamm = f"22.{gemeinde_nummer}."

        suffixes = get_suffixes(session, stamm)
        last_laufende_nummer = get_last_laufende_nummer(
            combined_id_suffixes=suffixes,
            lfd_nummer_regex=cls.lfd_nummer_regex,
            dot_included_in_suffix=False,
        )
        return (
            f"{stamm}{last_laufende_nummer + 1:0>4}{cls.standort_typ_map[standort_typ]}"
        )


class BfsDeaeLfdHyphenFactory(FactoryTemplate):
    lfd_nummer_regex = r"^[0-9]{4}$"
    standort_typ_map: dict[StandortTyp, str] = {
        StandortTyp.ABLAGERUNG: "D",
        StandortTyp.BETRIEB: "E",
        StandortTyp.UNFALL: "A",
        StandortTyp.SCHIESSANLAGE: "E",
        StandortTyp.KINDERSPIELPLATZ_GRUENFLAECHE: "K",
        StandortTyp.PFAS: "P",
    }
    """Erzeugt Standortnummern nach diesem Muster: <gemeinde-bfs-nummer>-<standort-typ>-<laufende Nummer>.

    Beispiel: es wird ein Standort vom Standorttyp Ablagerung in der Gemeinde 'Bern' mit der BfS-Nummer 123 erzeugt.
    Dann ist die generierte Standortnummer: 123-D-0001.
    """

    @classmethod
    def format(
        cls,
        session: Session,
        vftyp: code_models.Code,
        gemeinde: gem_models.Gemeinde | None = None,
        ktu: vflz_models.KTU | None = None,
        flugplatz: fp_models.Flugplatz | None = None,
    ):
        assert gemeinde
        standort_typ = StandortTyp(vftyp.code)
        stamm = f"{gemeinde.bfs_nummer}-{cls.standort_typ_map[standort_typ]}-"
        suffixes = get_suffixes(session, stamm)
        last_laufende_nummer = get_last_laufende_nummer(
            suffixes, cls.lfd_nummer_regex, False
        )
        return f"{stamm}{last_laufende_nummer + 1:0>4}"


class BfsLfdFactory(FactoryTemplate):
    lfd_nummer_regex = r"^[0-9]{4}$"
    """Erzeugt Standortnummern nach diesem Muster: <gemeinde-bfs-nummer><laufende Nummer 4 stellig>.

    Beispiel: es wird ein Standort in der Gemeinde 'Bern' mit der BfS-Nummer 123 erzeugt.
    Dann ist die generierte Standortnummer: 1230001.
    """

    @classmethod
    def format(
        cls,
        session: Session,
        vftyp: code_models.Code,
        gemeinde: gem_models.Gemeinde | None = None,
        ktu: vflz_models.KTU | None = None,
        flugplatz: fp_models.Flugplatz | None = None,
    ):
        assert gemeinde
        stamm = f"{gemeinde.bfs_nummer:0>4}"
        suffixes = get_suffixes(session, stamm)
        last_laufende_nummer = get_last_laufende_nummer(
            suffixes, cls.lfd_nummer_regex, False
        )
        return f"{stamm}{last_laufende_nummer + 1:0>4}"


class BfsAbusLfdFactory(FactoryTemplate):
    lfd_nummer_regex = r"^[0-9]{4}$"
    standort_typ_map: dict[StandortTyp, str] = {
        StandortTyp.ABLAGERUNG: "A",
        StandortTyp.BETRIEB: "B",
        StandortTyp.UNFALL: "U",
        StandortTyp.SCHIESSANLAGE: "S",
        StandortTyp.KINDERSPIELPLATZ_GRUENFLAECHE: "K",
        StandortTyp.PFAS: "P",
    }
    """Erzeugt Standortnummern nach diesem Muster: <gemeinde-bfs-nummer><standort-typ><laufende Nummer 4 stellig>.

    Beispiel: es wird ein Standort in der Gemeinde 'Bern' mit der BfS-Nummer 123 erzeugt.
    Dann ist die generierte Standortnummer: 123A0001.
    """

    @classmethod
    def format(
        cls,
        session: Session,
        vftyp: code_models.Code,
        gemeinde: gem_models.Gemeinde | None = None,
        ktu: vflz_models.KTU | None = None,
        flugplatz: fp_models.Flugplatz | None = None,
    ):
        assert gemeinde
        standort_typ = StandortTyp(vftyp.code)
        stamm = f"{gemeinde.bfs_nummer}{cls.standort_typ_map[standort_typ]}"
        suffixes = get_suffixes(session, stamm)
        last_laufende_nummer = get_last_laufende_nummer(
            suffixes, cls.lfd_nummer_regex, False
        )
        return f"{stamm}{last_laufende_nummer + 1:0>4}"


class AaBfsLfdDotFactory(FactoryTemplate):
    lfd_nummer_regex = r"^[0-9]{4}$"
    """Erzeugt Standortnummern nach diesem Muster: AA<gemeinde-bfs-nummer>.<laufende Nummer 4 stellig>.

    Die laufende Nummer hat Lücken. Vorgeschlagen wird die Nummer nach der höchsten vorhandenen.
    Teilstandorte (z.B. AA4001.0278-1) werden bei der Ermittlung der höchsten Nummer ignoriert.

    Beispiel: es wird ein Standort in der Gemeinde mit der BfS-Nummer 4001 erzeugt,
    die höchste vorhandene Nummer ist 0277. Dann ist die generierte Standortnummer: AA4001.0278.
    """

    @classmethod
    def format(
        cls,
        session: Session,
        vftyp: code_models.Code,
        gemeinde: gem_models.Gemeinde | None = None,
        ktu: vflz_models.KTU | None = None,
        flugplatz: fp_models.Flugplatz | None = None,
    ):
        assert gemeinde
        stamm = f"AA{gemeinde.bfs_nummer}."
        suffixes = get_suffixes(session, stamm)
        last_laufende_nummer = get_last_laufende_nummer(
            suffixes, cls.lfd_nummer_regex, False
        )
        return f"{stamm}{last_laufende_nummer + 1:0>4}"


class TeilstandortWithDotNumberFactory:
    lfd_nummer_regex = r"^\.[0-9]*$"

    @classmethod
    def format(cls, session: Session, vflz_combined_id: str) -> str:
        suffixes = get_suffixes(session, vflz_combined_id)
        last_laufende_nummer = get_last_laufende_nummer(suffixes, cls.lfd_nummer_regex)
        return f"{vflz_combined_id}.{last_laufende_nummer + 1:0>2}"


class TeilstandortWithHyphenNumberFactory:
    """Hängt an die Standortnummer des Hauptstandorts eine fortlaufende Nummer an: <standortnummer>-<nummer>.

    Beispiel: AA4001.0278-1, AA4001.0278-2
    """

    lfd_nummer_regex = r"^-[0-9]*$"

    @classmethod
    def format(cls, session: Session, vflz_combined_id: str) -> str:
        suffixes = get_suffixes(session, vflz_combined_id)
        last_laufende_nummer = get_last_laufende_nummer(suffixes, cls.lfd_nummer_regex)
        return f"{vflz_combined_id}-{last_laufende_nummer + 1}"


COMBINED_ID_FACTORY_MAPPING: dict[CombinedIdFactoryName, type[FactoryTemplate]] = {
    CombinedIdFactoryName.INTERNAL_BFS_ABUS_LFD_UNDERSCORE: InternalBfsABUSLfdUnderscoreFactory,
    CombinedIdFactoryName.BFS_ZERO_ONE_THREE_TWO_LFDR_HYPHEN: BfsZeroOneThreeTwoLfdrHyphenFactory,
    CombinedIdFactoryName.ABUB_KTU: ABUBKtuFactory,
    CombinedIdFactoryName.FLUGPLATZ_DIUS_LFD_UNDERSCORE: FlugplatzDIUSLfdUnderscoreFactory,
    CombinedIdFactoryName.BFS_DBUS_LFD_WHITESPACES: BfsDBUSLfdWhitespacesFactory,
    CombinedIdFactoryName.D_INTERNAL_BFS_DOT_LFD: DInternalBfsDotLfdFactory,
    CombinedIdFactoryName.CANTON_INTERNAL_BFS_LFD_ABUB_DOT: CantonInternalBfsLfdABUBDotFactory,
    CombinedIdFactoryName.BFS_DEAE_LFD_HYPHEN: BfsDeaeLfdHyphenFactory,
    CombinedIdFactoryName.BFS_LFD: BfsLfdFactory,
    CombinedIdFactoryName.INTERNAL_BFS_ABUS_LFD_UNDERSCORE_TWICE: InternalBfsABUSLfdUnderscoreFactoryTwice,
    CombinedIdFactoryName.BFS_ABUS_LFD: BfsAbusLfdFactory,
    CombinedIdFactoryName.AA_BFS_LFD_DOT: AaBfsLfdDotFactory,
}

TEILSTANDORT_ID_FACTORY_MAPPING = {
    TeilstandortCombinedIdFactoryName.DOT_NUMBER: TeilstandortWithDotNumberFactory,
    TeilstandortCombinedIdFactoryName.HYPHEN_NUMBER: TeilstandortWithHyphenNumberFactory,
}


def generate_new_combined_id(
    *,
    session: Session,
    factory_name: CombinedIdFactoryName,
    vftyp: code_models.Code,
    gemeinde: gem_models.Gemeinde | None = None,
    ktu: vflz_models.KTU | None = None,
    flugplatz: fp_models.Flugplatz | None = None,
) -> str:
    return COMBINED_ID_FACTORY_MAPPING[factory_name].format(
        session, vftyp, gemeinde, ktu, flugplatz
    )


def generate_new_teilstandort_combined_id(
    session: Session,
    factory_name: TeilstandortCombinedIdFactoryName,
    vflz_combined_id: str,
) -> str:
    return TEILSTANDORT_ID_FACTORY_MAPPING[factory_name].format(
        session, vflz_combined_id
    )
