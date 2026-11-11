import pytest
from sqlalchemy import select
from utils import make_flugplatz, make_gemeinde, make_ktu, make_vflz

from alma import constants
from alma.combined_id import (
    generate_new_combined_id,
    generate_new_teilstandort_combined_id,
)
from alma.exceptions import CombinedIdError
from alma.models import codes
from alma.models import vflz as vflz_models
from alma.settings import (
    CombinedIdFactoryName,
    TeilstandortCombinedIdFactoryName,
    settings,
)

pytestmark = [
    # Fixture required by all tests in this module
    pytest.mark.usefixtures("generate_codes", "as_bearbeiten_sachdaten"),
]


@pytest.mark.parametrize(
    "assigned_combined_ids, standorttyp, expected_next_combined_id",
    [
        (["101 D 0001", "101 D 02", "101 D 05"], "code:63:01", "101 D 06"),
        (["101 D 0001", "101 D 02", "101 D 05"], "code:63:02", "101 S 01"),
        (["101 D 0001", "101 D 02", "101 B 05"], "code:63:01", "101 D 03"),
        (["101 D 0001", "101 D 02", "101 S 98"], "code:63:02", "101 S 99"),
        (["101 D 0001", "101 D 02", "101 B 06"], "code:63:04", "101 S 01"),
    ],
)
def test_get_standortnummer(
    session,
    test_settings,
    assigned_combined_ids,
    standorttyp,
    expected_next_combined_id,
):
    settings.combined_id_factory = CombinedIdFactoryName.BFS_DBUS_LFD_WHITESPACES

    gem = make_gemeinde(session, name="Brig Glis", bfs_nummer=101)
    for vfl_id, combined_id in enumerate(assigned_combined_ids):
        make_vflz(session, f"My Site {vfl_id}", vfl_id, combined_id)

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.BFS_DBUS_LFD_WHITESPACES,
            vftyp=codes.Code.from_db(session, standorttyp),
            gemeinde=gem,
        )
        == expected_next_combined_id
    )


def test_laufende_nummer_resets_for_new_gemeinde(session, test_settings):
    settings.combined_id_factory = CombinedIdFactoryName.BFS_DBUS_LFD_WHITESPACES
    gem_brig_glis = make_gemeinde(session, name="Brig Glis", bfs_nummer=100)
    gem_bern = make_gemeinde(session, name="Bern", bfs_nummer=200)
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()
    make_vflz(session, "My Site", 1, "200 D 03")

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.BFS_DBUS_LFD_WHITESPACES,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "200 D 04"
    )
    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.BFS_DBUS_LFD_WHITESPACES,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_brig_glis,
        )
        == "100 D 01"
    )


def test_get_teilstandort_nummer(session, test_settings):
    settings.combined_id_factory = CombinedIdFactoryName.BFS_DBUS_LFD_WHITESPACES
    settings.teilstandort_combined_id_factory = (
        TeilstandortCombinedIdFactoryName.DOT_NUMBER
    )

    objekt = vflz_models.Objekt()
    session.add(objekt)
    teilstandort1 = make_vflz(session, "Teilstandort 1", 1, "001 D 01")
    teilstandort1.objekt = objekt

    teilstandort2 = make_vflz(session, "Teilstandort 2", 2, "001 D 01.01")
    teilstandort2.objekt = objekt

    teilstandort3 = make_vflz(session, "Teilstandort 3", 3, "sss")
    teilstandort3.objekt = objekt
    assert (
        generate_new_teilstandort_combined_id(
            session=session,
            factory_name=TeilstandortCombinedIdFactoryName.DOT_NUMBER,
            vflz_combined_id=teilstandort1.combined_id,
        )
        == "001 D 01.02"
    )

    assert (
        generate_new_teilstandort_combined_id(
            session=session,
            factory_name=TeilstandortCombinedIdFactoryName.DOT_NUMBER,
            vflz_combined_id=teilstandort2.combined_id,
        )
        == "001 D 01.01.01"
    )

    assert (
        generate_new_teilstandort_combined_id(
            session=session,
            factory_name=TeilstandortCombinedIdFactoryName.DOT_NUMBER,
            vflz_combined_id=teilstandort3.combined_id,
        )
        == "sss.01"
    )


def test_bfs_dbus_lfd_whitespaces_factory(session, test_settings):
    settings.combined_id_factory = CombinedIdFactoryName.BFS_DBUS_LFD_WHITESPACES
    gem_brig_glis = make_gemeinde(session, name="Brig Glis", bfs_nummer=100)
    gem_bern = make_gemeinde(session, name="Bern", bfs_nummer=200)
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.BFS_DBUS_LFD_WHITESPACES,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "200 D 01"
    )
    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.BFS_DBUS_LFD_WHITESPACES,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_brig_glis,
        )
        == "100 D 01"
    )


def test_internal_bfs_abus_lfd_underscore_factory(session, test_settings):
    settings.combined_id_factory = (
        CombinedIdFactoryName.INTERNAL_BFS_ABUS_LFD_UNDERSCORE
    )
    gem_bern = make_gemeinde(session, name="Bern", bfs_nummer=200)
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.INTERNAL_BFS_ABUS_LFD_UNDERSCORE,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "999_A001"
    )

    vflz = make_vflz(session, "my site", 1, "132_A113")
    vflz.gemeinde = gem_bern

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.INTERNAL_BFS_ABUS_LFD_UNDERSCORE,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "132_A114"
    )


def test_bfs_zero_one_three_two_lfdr_hyphen_factory(session, test_settings):
    settings.combined_id_factory = (
        CombinedIdFactoryName.BFS_ZERO_ONE_THREE_TWO_LFDR_HYPHEN
    )
    gem_bern = make_gemeinde(session, name="Bern", bfs_nummer=200)
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()
    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.BFS_ZERO_ONE_THREE_TWO_LFDR_HYPHEN,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "200-0001"
    )

    make_vflz(session, "My Site", 1, "200-0001")
    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.BFS_ZERO_ONE_THREE_TWO_LFDR_HYPHEN,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "200-0002"
    )


def test_abub_ktu_factory(session, test_settings):
    settings.combined_id_factory = CombinedIdFactoryName.ABUB_KTU
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()
    ktu_bls = make_ktu(session, "bls")
    ktu_bls.rangefrom = 4300
    ktu_bls.rangeto = 4399

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.ABUB_KTU,
            vftyp=ablagerung_vftyp,
            ktu=ktu_bls,
        )
        == "A4300"
    )

    make_vflz(session, "My Site", 1, "A4300")
    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.ABUB_KTU,
            vftyp=ablagerung_vftyp,
            ktu=ktu_bls,
        )
        == "A4301"
    )


def test_abub_ktu_standortnummer_exceeds_range(session, test_settings):
    settings.combined_id_factory = CombinedIdFactoryName.ABUB_KTU
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()
    ktu_bls = make_ktu(session, "bls")
    ktu_bls.rangefrom = 4300
    ktu_bls.rangeto = 4302

    make_vflz(session, "My Site", 3, "A4302")

    with pytest.raises(CombinedIdError, match="Last number exceeds KTU range"):
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.ABUB_KTU,
            vftyp=ablagerung_vftyp,
            ktu=ktu_bls,
        )


def test_abub_ktu_standortnummer_skips_those_that_do_not_fit(session, test_settings):
    settings.combined_id_factory = CombinedIdFactoryName.ABUB_KTU
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()
    ktu_bls = make_ktu(session, "bls")
    ktu_bls.rangefrom = 4300
    ktu_bls.rangeto = 4302

    make_vflz(session, "My Site", 3, "A4300")
    make_vflz(session, "My Site", 3, "A4301-102")

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.ABUB_KTU,
            vftyp=ablagerung_vftyp,
            ktu=ktu_bls,
        )
        == "A4301"
    )


def test_flugplatz_dius_lfd_underscore_factory(session, test_settings):
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()
    flugplatz = make_flugplatz(session)
    flugplatz.c_kt = "GE"
    flugplatz.abk = "Gene"
    flugplatz.zusatz = "1"
    session.commit()

    make_vflz(session, "My Site", 1, "GE-Gene-1-D-09")
    make_vflz(session, "My Site", 1, "GE-Gene-1-D-59")

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.FLUGPLATZ_DIUS_LFD_UNDERSCORE,
            vftyp=ablagerung_vftyp,
            flugplatz=flugplatz,
        )
        == "GE-Gene-1-D-60"
    )


def test_internal_bfs_dot_lfd_factory_ablagerung(session, test_settings):
    settings.combined_id_factory = CombinedIdFactoryName.D_INTERNAL_BFS_DOT_LFD
    gem_bern = make_gemeinde(session, name="Bern", bfs_nummer=200)
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.D_INTERNAL_BFS_DOT_LFD,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "D-200-1"
    )

    vflz = make_vflz(session, "my site", 1, "D-200-5")
    vflz.gemeinde = gem_bern

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.D_INTERNAL_BFS_DOT_LFD,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "D-200-6"
    )


def test_internal_bfs_dot_lfd_factory_betrieb(session, test_settings):
    settings.combined_id_factory = CombinedIdFactoryName.D_INTERNAL_BFS_DOT_LFD
    gem_bern = make_gemeinde(session, name="Bern", bfs_nummer=200)
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.BETRIEB
        )
    ).one()

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.D_INTERNAL_BFS_DOT_LFD,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "999.1"
    )

    vflz = make_vflz(session, "my site", 1, "123.3")
    vflz.gemeinde = gem_bern

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.D_INTERNAL_BFS_DOT_LFD,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "123.4"
    )


def test_canton_bfs_gemeinde_lfd_abub_factory(session, test_settings):
    settings.combined_id_factory = (
        CombinedIdFactoryName.CANTON_INTERNAL_BFS_LFD_ABUB_DOT
    )
    gem_bern = make_gemeinde(session, name="Bern", bfs_nummer=200)
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.CANTON_INTERNAL_BFS_LFD_ABUB_DOT,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "22.999.0001A"
    )

    vflz = make_vflz(session, "my site", 1, "22.100.0005A")
    vflz.gemeinde = gem_bern

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.CANTON_INTERNAL_BFS_LFD_ABUB_DOT,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "22.100.0006A"
    )


def test_bfs_deae_lfd_hyphen_factory(session, test_settings):
    settings.combined_id_factory = CombinedIdFactoryName.BFS_DEAE_LFD_HYPHEN
    gem_bern = make_gemeinde(session, name="Bern", bfs_nummer=200)
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.BFS_DEAE_LFD_HYPHEN,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "200-D-0001"
    )

    vflz = make_vflz(session, "my site", 1, "200-D-0001")
    vflz.gemeinde = gem_bern

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.BFS_DEAE_LFD_HYPHEN,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "200-D-0002"
    )


def test_bfs_lfd_factory(session, test_settings):
    settings.combined_id_factory = CombinedIdFactoryName.BFS_LFD
    gem_bern = make_gemeinde(session, name="Bern", bfs_nummer=200)
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.BFS_LFD,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "02000001"
    )

    vflz = make_vflz(session, "my site", 1, "02000005")
    vflz.gemeinde = gem_bern

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.BFS_LFD,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "02000006"
    )


def test_internal_bfs_abus_lfd_underscore_factory_twice(session, test_settings):
    settings.combined_id_factory = (
        CombinedIdFactoryName.INTERNAL_BFS_ABUS_LFD_UNDERSCORE_TWICE
    )
    gem_bern = make_gemeinde(session, name="Bern", bfs_nummer=200)
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.INTERNAL_BFS_ABUS_LFD_UNDERSCORE_TWICE,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "999_A_001"
    )

    vflz = make_vflz(session, "my site", 1, "132_A_113")
    vflz.gemeinde = gem_bern

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.INTERNAL_BFS_ABUS_LFD_UNDERSCORE_TWICE,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "132_A_114"
    )


def test_bfs_abus_lfd_factory(session, test_settings):
    settings.combined_id_factory = CombinedIdFactoryName.BFS_ABUS_LFD
    gem_bern = make_gemeinde(session, name="Bern", bfs_nummer=200)
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.BFS_ABUS_LFD,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "200A0001"
    )

    vflz = make_vflz(session, "my site", 1, "200A0005")
    vflz.gemeinde = gem_bern

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.BFS_ABUS_LFD,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_bern,
        )
        == "200A0006"
    )


def test_aa_bfs_lfd_dot_factory(session, test_settings):
    settings.combined_id_factory = CombinedIdFactoryName.AA_BFS_LFD_DOT
    gem_aarau = make_gemeinde(session, name="Aarau", bfs_nummer=4001)
    gem_baden = make_gemeinde(session, name="Baden", bfs_nummer=4021)
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.AA_BFS_LFD_DOT,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_aarau,
        )
        == "AA4001.0001"
    )

    make_vflz(session, "Site 1", 1, "AA4001.0001")
    make_vflz(session, "Site 2", 2, "AA4001.0277")
    make_vflz(session, "Site 3", 3, "AA4021.0500")

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.AA_BFS_LFD_DOT,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_aarau,
        )
        == "AA4001.0278"
    )
    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.AA_BFS_LFD_DOT,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_baden,
        )
        == "AA4021.0501"
    )


def test_aa_bfs_lfd_dot_factory_ignores_teilstandorte(session, test_settings):
    settings.combined_id_factory = CombinedIdFactoryName.AA_BFS_LFD_DOT
    gem_aarau = make_gemeinde(session, name="Aarau", bfs_nummer=4001)
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()
    make_vflz(session, "Site 1", 1, "AA4001.0278")
    make_vflz(session, "Site 2", 2, "AA4001.0278-1")
    make_vflz(session, "Site 3", 3, "AA4001.0278-2")

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.AA_BFS_LFD_DOT,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_aarau,
        )
        == "AA4001.0279"
    )


def test_aa_bfs_lfd_dot_factory_ignores_malformed_suffixes(session, test_settings):
    settings.combined_id_factory = CombinedIdFactoryName.AA_BFS_LFD_DOT
    gem_aarau = make_gemeinde(session, name="Aarau", bfs_nummer=4001)
    ablagerung_vftyp = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()
    make_vflz(session, "Valid site", 1, "AA4001.0020")
    make_vflz(session, "Too many digits", 2, "AA4001.99999")
    make_vflz(session, "Non-numeric suffix", 3, "AA4001.999A")
    make_vflz(session, "Child site", 4, "AA4001.9999-1")

    assert (
        generate_new_combined_id(
            session=session,
            factory_name=CombinedIdFactoryName.AA_BFS_LFD_DOT,
            vftyp=ablagerung_vftyp,
            gemeinde=gem_aarau,
        )
        == "AA4001.0021"
    )


def test_get_teilstandort_nummer_hyphen(session, test_settings):
    settings.teilstandort_combined_id_factory = (
        TeilstandortCombinedIdFactoryName.HYPHEN_NUMBER
    )

    assert (
        generate_new_teilstandort_combined_id(
            session=session,
            factory_name=TeilstandortCombinedIdFactoryName.HYPHEN_NUMBER,
            vflz_combined_id="AA4001.0278",
        )
        == "AA4001.0278-1"
    )

    make_vflz(session, "Teilstandort 1", 1, "AA4001.0278-1")
    make_vflz(session, "Teilstandort 3", 2, "AA4001.0278-3")
    make_vflz(session, "Teilstandort 1-1", 3, "AA4001.0278-1-1")

    assert (
        generate_new_teilstandort_combined_id(
            session=session,
            factory_name=TeilstandortCombinedIdFactoryName.HYPHEN_NUMBER,
            vflz_combined_id="AA4001.0278",
        )
        == "AA4001.0278-4"
    )
    assert (
        generate_new_teilstandort_combined_id(
            session=session,
            factory_name=TeilstandortCombinedIdFactoryName.HYPHEN_NUMBER,
            vflz_combined_id="AA4001.0278-1",
        )
        == "AA4001.0278-1-2"
    )


def test_get_teilstandort_nummer_hyphen_ignores_zero(session, test_settings):
    settings.teilstandort_combined_id_factory = (
        TeilstandortCombinedIdFactoryName.HYPHEN_NUMBER
    )
    make_vflz(session, "Zero is not a child number", 1, "AA4001.0278-0")

    assert (
        generate_new_teilstandort_combined_id(
            session=session,
            factory_name=TeilstandortCombinedIdFactoryName.HYPHEN_NUMBER,
            vflz_combined_id="AA4001.0278",
        )
        == "AA4001.0278-1"
    )
