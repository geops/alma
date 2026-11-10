from datetime import date
from pathlib import Path

import business_workflow_manager.models as wf_models
import httpx2
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from utils import (
    make_ablagerung,
    make_betrieb,
    make_einzelereignis,
    make_grundwasser,
    make_kinderspielplatz_gruenflaeche,
    make_kompartiment_stoffgruppe,
    make_kompartiment_stoffklasse,
    make_loeschschaum_einsatz,
    make_massnahme,
    make_nutzung_boden,
    make_oberflaechen_gewaesser,
    make_pfas,
    make_pool,
    make_sanierungsziel,
    make_schiessanlage,
    make_umweltschaden,
    make_umweltstoff,
    make_unfall,
    make_unfallstoff,
    make_vfl_pool,
    make_vflz,
    make_vflz_beurteilung,
)

from alma.models import codes
from alma.models.bem import (
    BegruendungBewertung,
    BegruendungBewertungBetrieb,
    BegruendungBewertungKinderspielplatzGruenflaeche,
    BegruendungBewertungPFAS,
    BegruendungPrioSanierungsbedarf,
    BegruendungPrioUntersuchungsbedarf,
    BemerkungAblagerung,
    BemerkungBetrieb,
    BemerkungDatenimportAblagerung,
    BemerkungDatenimportBetrieb,
    BemerkungDatenimportKinderspielplatzGruenflaeche,
    BemerkungDatenimportPFAS,
    BemerkungDatenimportSchiessanlage,
    BemerkungDatenimportStandort,
    BemerkungDatenimportUnfall,
    BemerkungEinzelereignis,
    BemerkungIntern,
    BemerkungKinderspielplatzGruenflaeche,
    BemerkungMassnahme,
    BemerkungPFAS,
    BemerkungSanierung,
    BemerkungStandort,
    BemerkungUmwelt,
    BemerkungUmweltschaden,
    BemerkungUnfall,
)
from alma.models.vflz import fetch_height

pytestmark = [
    # Fixture required by all tests in this module
    # Run all tests in this module using the "lesen sachdaten" role unless otherwise specified
    pytest.mark.usefixtures("generate_codes", "as_lesen_sachdaten"),
]


@pytest.fixture
def simple_workflow(workflow_manager) -> wf_models.Workflow:
    path = Path(__file__).parent / "workflows" / "simple.yml"
    with path.open() as f:
        workflow, _ = workflow_manager.load_workflow_from_file(f)
    return workflow


def test_latest_vflz(session, run_query):
    query = """
    {
        latestVflz {
            vflzId
            vflId
            combinedId
            vftyp
            vftypEnum
            objekt { objeId }
            bezeichnung
            flurname
            strasse
            postleitzahl
            ort
            flaeche
            datRechtskraft
            datPublizieren
            rechtskraft
            publizieren
            bearbeitungsStand
            untersuchungsStand
            zentroid
            gemeinde {
                hGemId
                bfsNummer
                gemeinde
                kanton
            }
            lang
            deponietyp
            inBetrieb
            nachsorge
            isCurrent
            versionen { vflzId isCurrent }
        }
    }
    """
    vflz = make_vflz(session, "My Site")

    result = run_query(query)
    assert result.data == {
        "latestVflz": [
            {
                "vflId": "1",
                "vflzId": str(vflz.vflz_id),
                "combinedId": "combined-id-1",
                "vftyp": "code:63:02",
                "vftypEnum": "BETRIEB",
                "objekt": {"objeId": str(vflz.objekt.obje_id)},
                "bezeichnung": "My Site",
                "flurname": None,
                "strasse": "strasse 3a",
                "gemeinde": {
                    "hGemId": "1",
                    "bfsNummer": 1,
                    "gemeinde": "Aeugst am Albis",
                    "kanton": "code:15:ZH",
                },
                "postleitzahl": "7123",
                "ort": "Bern",
                "flaeche": None,
                "datRechtskraft": None,
                "datPublizieren": None,
                "rechtskraft": False,
                "publizieren": False,
                "bearbeitungsStand": "code:55:test",
                "untersuchungsStand": "code:10023:test",
                "zentroid": {
                    "type": "Point",
                    "crs": {
                        "properties": {"name": "EPSG:2056"},
                        "type": "name",
                    },
                    "coordinates": [30, 10, 40],
                },
                "lang": "DE",
                "deponietyp": "code:12001:test",
                "inBetrieb": True,
                "nachsorge": False,
                "isCurrent": True,
                "versionen": [{"vflzId": str(vflz.vflz_id), "isCurrent": True}],
            },
        ]
    }


def test_get_versionen(session, run_query):
    vflz = make_vflz(session, "My Site")
    old_vflz_id = vflz.vflz_id

    vflz.historize("Historisiert")
    new_vflz_id = vflz.vflz_id

    session.commit()

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            vflzId
            isCurrent
            message
            versionen { vflzId isCurrent message }
        }
    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(new_vflz_id)})
    assert result.data == {
        "vflz": {
            "vflzId": str(new_vflz_id),
            "isCurrent": True,
            "message": "Historisiert",
            "versionen": [
                {
                    "vflzId": str(new_vflz_id),
                    "isCurrent": True,
                    "message": "Historisiert",
                },
                {
                    "vflzId": str(old_vflz_id),
                    "isCurrent": False,
                    "message": "Initial version",
                },
            ],
        }
    }


def test_get_latest_vflz_id(session, run_query):
    vflz = make_vflz(session, "My Site")
    old_vflz_id = vflz.vflz_id

    vflz.historize("Historisiert")
    new_vflz_id = vflz.vflz_id

    session.commit()

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            vflzId
            isCurrent
            latestVflzId
        }
    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(new_vflz_id)})
    assert result.data == {
        "vflz": {
            "vflzId": str(new_vflz_id),
            "isCurrent": True,
            "latestVflzId": str(new_vflz_id),
        }
    }

    result = run_query(query=query, variable_values={"vflzId": str(old_vflz_id)})
    assert result.data == {
        "vflz": {
            "vflzId": str(old_vflz_id),
            "isCurrent": False,
            "latestVflzId": str(new_vflz_id),
        }
    }


def test_task_vflz_latest_vflz_id_follows_historization(
    session, run_query, simple_workflow: wf_models.Workflow, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    initial_vflz_id = vflz.vflz_id

    workflow_node = simple_workflow.create_node(entity_id=str(vflz.vflz_id))
    session.add(workflow_node)
    session.commit()

    query = """
    query q($taskId: ID!) {
        task(taskId: $taskId) {
            vflz {
                vflzId
                latestVflzId
            }
        }
    }
    """

    result = run_query(query, {"taskId": str(workflow_node.wf_node_id)})
    assert result.data == {
        "task": {
            "vflz": {
                "vflzId": str(initial_vflz_id),
                "latestVflzId": str(initial_vflz_id),
            }
        }
    }

    vflz.historize("Historisiert")
    session.commit()
    new_vflz_id = vflz.vflz_id
    assert new_vflz_id != initial_vflz_id

    result = run_query(query, {"taskId": str(workflow_node.wf_node_id)})
    assert result.data == {
        "task": {
            "vflz": {
                "vflzId": str(initial_vflz_id),
                "latestVflzId": str(new_vflz_id),
            }
        }
    }


def test_get_ablagerungen(session, run_query):
    vflz = make_vflz(session, "My Site")
    ablagerung = make_ablagerung(session, vflz)

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            vflzId
            ablagerungen {
                intaId
                volKompartiment
                tiefe
                zeitraum {
                    von
                    bis
                    vonjahr
                    bisjahr
                    bisheute
                }
            }
        }
    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})
    assert result.data == {
        "vflz": {
            "vflzId": str(vflz.vflz_id),
            "ablagerungen": [
                {
                    "intaId": str(ablagerung.inta_id),
                    "volKompartiment": 3.0,
                    "tiefe": "32",
                    "zeitraum": {
                        "von": "2021-01-01",
                        "bis": "2022-02-02",
                        "vonjahr": True,
                        "bisjahr": False,
                        "bisheute": False,
                    },
                }
            ],
        }
    }


def test_get_kompartiment_stoffklassen(session, run_query):
    vflz = make_vflz(session, "My Site")
    ablagerung = make_ablagerung(session, vflz)
    kompartiment_stoffklasse = make_kompartiment_stoffklasse(session, ablagerung)

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            vflzId
            ablagerungen {
                kompartimentStoffklassen {
                    kkskId
                    stoffklasse
                    teilvol
                    zeitraum {
                        von
                        bis
                        vonjahr
                        bisjahr
                        bisheute
                        genauigkeitVon
                        genauigkeitBis
                    }
                }
            }
        }
    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})
    assert result.data == {
        "vflz": {
            "vflzId": str(vflz.vflz_id),
            "ablagerungen": [
                {
                    "kompartimentStoffklassen": [
                        {
                            "kkskId": str(kompartiment_stoffklasse.kksk_id),
                            "stoffklasse": "code:94:test",
                            "teilvol": 0.5,
                            "zeitraum": {
                                "von": "2021-01-01",
                                "bis": "2022-02-02",
                                "vonjahr": True,
                                "bisjahr": False,
                                "bisheute": False,
                                "genauigkeitVon": "code:90:test",
                                "genauigkeitBis": "code:90:test",
                            },
                        }
                    ]
                }
            ],
        }
    }


def test_get_stoffgruppen_of_vflz(session, run_query):
    vflz = make_vflz(session, "My Site")
    ablagerung = make_ablagerung(session, vflz)
    kompartiment_stoffklasse = make_kompartiment_stoffklasse(session, ablagerung)
    kompartiment_stoffgruppe = make_kompartiment_stoffgruppe(
        session, kompartiment_stoffklasse
    )

    query = """
        query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            ablagerungen {
                kompartimentStoffklassen {
                    kompartimentStoffgruppen {
                        kksgId
                        stoffgruppe
                        teilvol
                    }
                }
            }
        }
    }

    """
    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})
    assert result.data == {
        "vflz": {
            "ablagerungen": [
                {
                    "kompartimentStoffklassen": [
                        {
                            "kompartimentStoffgruppen": [
                                {
                                    "kksgId": str(kompartiment_stoffgruppe.kksg_id),
                                    "stoffgruppe": str(
                                        kompartiment_stoffgruppe.stoffgruppe
                                    ),
                                    "teilvol": kompartiment_stoffgruppe.teilvol,
                                }
                            ]
                        }
                    ]
                }
            ],
        }
    }


def test_get_betriebe_from_given_vflz_id(session, run_query):
    vflz = make_vflz(session, "My Site")
    betrieb = make_betrieb(session, vflz)

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            betriebe {
                intbId
                brancheAsw
                brancheNoga
                untersuchungsStand
                beurteilung
                firmaName
                firmaStrasse
                firmaPlz
                firmaOrt
                eva
                groesse
                zeitraum {
                    von
                    bis
                    vonjahr
                    bisjahr
                    bisheute
                    genauigkeitVon
                    genauigkeitBis
                }
                zentroid
                relevant
                mobileStoffe
            }
        }
    }
    """
    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})
    assert result.data == {
        "vflz": {
            "betriebe": [
                {
                    "intbId": str(betrieb.intb_id),
                    "brancheAsw": "code:25:test",
                    "brancheNoga": "code:25001:test",
                    "untersuchungsStand": "code:10023:test",
                    "beurteilung": "code:103:test",
                    "firmaName": "Foo Firma Name",
                    "firmaStrasse": "Foo Firma Strasse",
                    "firmaPlz": "1234",
                    "firmaOrt": "Foo Firma Ort",
                    "eva": "Foo EVA",
                    "groesse": 10,
                    "zentroid": {
                        "type": "Point",
                        "crs": {
                            "properties": {"name": "EPSG:2056"},
                            "type": "name",
                        },
                        "coordinates": [30, 10],
                    },
                    "zeitraum": {
                        "von": "2027-01-01",
                        "bis": "2028-02-02",
                        "vonjahr": False,
                        "bisjahr": True,
                        "bisheute": False,
                        "genauigkeitVon": "code:90:test",
                        "genauigkeitBis": "code:90:test",
                    },
                    "relevant": False,
                    "mobileStoffe": True,
                }
            ]
        }
    }


def test_get_schiessanlagen_from_given_vflz_id(session, run_query):
    vflz = make_vflz(session, "My Site")
    schiessanlage = make_schiessanlage(session, vflz)

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            schiessanlagen {
                intbId
                brancheAsw
                brancheNoga
                untersuchungsStand
                beurteilung
                firmaName
                firmaStrasse
                firmaPlz
                firmaOrt
                eva
                groesse
                zeitraum {
                    von
                    bis
                    vonjahr
                    bisjahr
                    bisheute
                    genauigkeitVon
                    genauigkeitBis
                }
                zentroid
                relevant
                mobileStoffe
                typ
                schusszahl
                scheibenzahl
                hatKugelfang
            }
        }
    }
    """
    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})
    assert result.data == {
        "vflz": {
            "schiessanlagen": [
                {
                    "intbId": str(schiessanlage.intb_id),
                    "brancheAsw": "code:25:test",
                    "brancheNoga": "code:25001:test",
                    "untersuchungsStand": "code:10023:test",
                    "beurteilung": "code:103:test",
                    "firmaName": "Foo Firma Name",
                    "firmaStrasse": "Foo Firma Strasse",
                    "firmaPlz": "1234",
                    "firmaOrt": "Foo Firma Ort",
                    "eva": "Foo EVA",
                    "groesse": 10,
                    "zentroid": {
                        "type": "Point",
                        "crs": {
                            "properties": {"name": "EPSG:2056"},
                            "type": "name",
                        },
                        "coordinates": [30, 10],
                    },
                    "zeitraum": {
                        "von": "2027-01-01",
                        "bis": "2028-02-02",
                        "vonjahr": False,
                        "bisjahr": True,
                        "bisheute": False,
                        "genauigkeitVon": "code:90:test",
                        "genauigkeitBis": "code:90:test",
                    },
                    "relevant": False,
                    "mobileStoffe": True,
                    "typ": "code:11410:test",
                    "schusszahl": 3,
                    "scheibenzahl": 4,
                    "hatKugelfang": True,
                }
            ]
        }
    }


def test_get_unfall_given_a_vflz_id(session, run_query):
    vflz = make_vflz(session, "My Site")
    unfall = make_unfall(session, vflz)
    unfallstoff = make_unfallstoff(session, unfall)

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            unfaelle {
                intuId
                genauigkeitZeitpunkt
                name
                zeitpunkt
                zeitpunktjahr
                unfallstoffe {
                    inumId
                    stoff
                    stoffmng
                    ausgelaufen
                    zurueckgewonnen
                }
            }
        }

    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "unfaelle": [
                {
                    "intuId": str(unfall.intu_id),
                    "genauigkeitZeitpunkt": "code:90:test",
                    "name": "Foo Unfall",
                    "zeitpunkt": "2020-01-01",
                    "zeitpunktjahr": True,
                    "unfallstoffe": [
                        {
                            "inumId": str(unfallstoff.inum_id),
                            "stoff": "code:117:test",
                            "stoffmng": 3.0,
                            "ausgelaufen": 4.0,
                            "zurueckgewonnen": 2.0,
                        }
                    ],
                }
            ]
        }
    }


def test_get_grundwasser_given_vflz_id(session, run_query):
    vflz = make_vflz(session, "My Site")
    gwas = make_grundwasser(session, vflz)
    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            grundwasser {
                gwasId
                relativeLage
                flurabstand
                nutzung
                distanz
            }
        }
    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "grundwasser": [
                {
                    "gwasId": str(gwas.gwas_id),
                    "relativeLage": str(gwas.relative_lage),
                    "flurabstand": 3.1,
                    "nutzung": str(gwas.nutzung),
                    "distanz": 3,
                }
            ]
        }
    }


def test_get_oberflaeche_gewaesser_given_vflz_id(session, run_query):
    vflz = make_vflz(session, "My Site")
    ogw = make_oberflaechen_gewaesser(session, vflz)
    ogw.distanz = 4
    ogw.name = "bazz OGW"

    ogw2 = make_oberflaechen_gewaesser(session, vflz)
    ogw2.distanz = 5
    ogw2.name = "bar OGW"

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            oberflaechenGewaesser {
                ogwId
                artGewaesser
                bauGewaesser
                relativeLage
                distanz
                name
            }
        }
    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "oberflaechenGewaesser": [
                {
                    "ogwId": str(ogw.ogw_id),
                    "artGewaesser": "code:66:test",
                    "bauGewaesser": "code:67:test",
                    "relativeLage": "code:70:test",
                    "distanz": 4,
                    "name": "bazz OGW",
                },
                {
                    "ogwId": str(ogw2.ogw_id),
                    "artGewaesser": "code:66:test",
                    "bauGewaesser": "code:67:test",
                    "relativeLage": "code:70:test",
                    "distanz": 5,
                    "name": "bar OGW",
                },
            ]
        }
    }


def test_get_nutzung_boden_given_vflz_id(session, run_query):
    vflz = make_vflz(session, "My Site")
    nutzung_boden = make_nutzung_boden(session, vflz)
    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            nutzungenBoden {
                nuboId
                nutzungsart
                aktuelleNutzung
            }
        }
    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "nutzungenBoden": [
                {
                    "nuboId": str(nutzung_boden.nubo_id),
                    "nutzungsart": "code:87:test",
                    "aktuelleNutzung": "code:92:test",
                }
            ]
        }
    }


def test_get_umweltstoff_given_vflz_id(session, run_query):
    vflz = make_vflz(session, "My Site")
    umweltstoff = make_umweltstoff(session, vflz)
    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            umweltStoffe {
                stoffeId
                gefaehrdeteBereiche
                stoffGruppe
                stoff
                beurteilung
            }
        }
    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "umweltStoffe": [
                {
                    "stoffeId": str(umweltstoff.stoffe_id),
                    "gefaehrdeteBereiche": "code:299:test",
                    "stoffGruppe": "code:300:test",
                    "stoff": "code:301:test",
                    "beurteilung": "code:330:test",
                }
            ]
        }
    }


def test_get_einzelereignisse_given_vflz_id(session, run_query):
    vflz = make_vflz(session, "My Site")
    einzelereignis = make_einzelereignis(session, vflz)
    einzelereignis2 = make_einzelereignis(session, vflz)
    einzelereignis3 = make_einzelereignis(session, vflz)
    einzelereignis2.datum = date.fromisoformat("2020-03-10")
    einzelereignis3.datum = None
    session.commit()

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            einzelereignisse {
                veenId
                einzelereignis
                datum
            }
        }
    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "einzelereignisse": [
                {
                    "veenId": str(einzelereignis.veen_id),
                    "einzelereignis": "code:61:test",
                    "datum": "2021-03-04",
                },
                {
                    "veenId": str(einzelereignis2.veen_id),
                    "einzelereignis": "code:61:test",
                    "datum": "2020-03-10",
                },
                {
                    "veenId": str(einzelereignis3.veen_id),
                    "einzelereignis": "code:61:test",
                    "datum": None,
                },
            ]
        }
    }


def test_get_umweltschaden_given_vflz_id(session, run_query):
    vflz = make_vflz(session, "My Site")
    umweltschaden = make_umweltschaden(session, vflz)
    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            umweltschaeden {
                vfusId
                artSchaden
                schaeden
            }
        }
    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "umweltschaeden": [
                {
                    "vfusId": str(umweltschaden.vfus_id),
                    "artSchaden": "code:101:test",
                    "schaeden": "code:102:test",
                }
            ]
        }
    }


def test_get_beurteilung_of_vflz(session, run_query):
    vflz = make_vflz(session, "My Site")
    make_vflz_beurteilung(session, vflz)

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            beurteilung {
                beurteilung
                prioSanier
                prioUntersuch
            }
        }
    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "beurteilung": {
                "beurteilung": "code:103:test",
                "prioUntersuch": "code:26020:2024",
                "prioSanier": "code:26021:2024",
            }
        }
    }


def test_beurteilung_includes_handlungsbedarf_and_rechtlicher_bezug_codes_based_on_beurteilung_code(
    session, run_query
):
    vflz = make_vflz(session, "My Site")
    make_vflz_beurteilung(session, vflz, code_beurteilung="test2")

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            beurteilung {
                beurteilung
                rechtlicherBezug
                handlungsbedarf
            }
        }
    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "beurteilung": {
                "beurteilung": "code:103:test2",
                "rechtlicherBezug": "code:10104:test2",
                "handlungsbedarf": "code:10105:test2",
            }
        }
    }


def test_get_beurteilung_without_kbsinfo(session, run_query):
    vflz = make_vflz(session, "My Site")
    make_vflz_beurteilung(session, vflz)

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            beurteilung {
                beurteilung
                kbsInfo { color }
            }
        }
    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {"beurteilung": {"beurteilung": "code:103:test", "kbsInfo": None}}
    }


def test_get_beurteilung_with_kbsinfo(session, run_query):
    vflz = make_vflz(session, "My Site")
    beurteilung = make_vflz_beurteilung(session, vflz)
    code_beurteilung_gruppe = session.scalars(
        select(codes.BeurteilungGruppe).where(codes.BeurteilungGruppe.code == "Test")
    ).one()
    assert beurteilung.beurteilung
    kbsinfo = codes.KbsInfo(
        beurteilung=beurteilung.beurteilung,
        beurteilung_gruppe=code_beurteilung_gruppe,
        color="#ff0000",
        color_rgb=None,
        belastet=True,
    )
    session.add(kbsinfo)
    session.commit()

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            beurteilung {
                beurteilung
                kbsInfo { color colorRgb belastet beurteilungGruppe }
            }
        }
    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "beurteilung": {
                "beurteilung": "code:103:test",
                "kbsInfo": {
                    "color": "#ff0000",
                    "colorRgb": None,
                    "belastet": True,
                    "beurteilungGruppe": "code:1031:Test",
                },
            }
        }
    }


def test_get_massnahme_of_vflz(session, run_query):
    vflz = make_vflz(session, "My Site")
    massnahme = make_massnahme(session, vflz)

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            massnahmen {
                massId
                massnahme
                datMassnahme
                angMassnahme
            }
        }
    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "massnahmen": [
                {
                    "massId": str(massnahme.mass_id),
                    "massnahme": "code:10021:test",
                    "datMassnahme": "2020-03-04",
                    "angMassnahme": "2020-05-03",
                }
            ]
        }
    }


def test_get_sanierungsziel_of_vflz(session, run_query):
    vflz = make_vflz(session, "My Site")
    sanierungsziel = make_sanierungsziel(session, vflz)

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            sanierungsziele {
                saniId
                sanierungsziel
            }
        }
    }
    """
    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "sanierungsziele": [
                {
                    "saniId": str(sanierungsziel.sani_id),
                    "sanierungsziel": "code:10020:test",
                }
            ]
        }
    }


def test_get_bemerkungen_of_vflz(session, run_query):
    vflz = make_vflz(session, "My Site")
    vflz.bemerkung_standort = BemerkungStandort("Bemerkung Standort")
    vflz.bemerkung_umwelt = BemerkungUmwelt("Bemerkung Umwelt")
    vflz.bemerkung_datenimport = BemerkungDatenimportStandort("Bemerkung Datenimport")
    vflz.begruendung_bewertung = BegruendungBewertung("Begründung Bewertung")
    vflz.begruendung_prio_sanierungsbedarf = BegruendungPrioSanierungsbedarf(
        "Begründung Prio. Sanierungsbedarf"
    )
    vflz.begruendung_prio_untersuchungsbedarf = BegruendungPrioUntersuchungsbedarf(
        "Begründung Prio. Untersuchungsbedarf"
    )
    vflz.bemerkungen_intern = [
        BemerkungIntern("Bemerkung intern 1"),
        BemerkungIntern("Bemerkung intern 2"),
    ]
    session.commit()

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            bemerkungStandort { bem }
            bemerkungUmwelt { bem }
            bemerkungDatenimport { bem }
            begruendungBewertung { bem }
            begruendungPrioSanierungsbedarf { bem }
            begruendungPrioUntersuchungsbedarf { bem }
            bemerkungenIntern { bem }
        }
    }
    """
    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "bemerkungStandort": {"bem": "Bemerkung Standort"},
            "bemerkungUmwelt": {"bem": "Bemerkung Umwelt"},
            "bemerkungDatenimport": {"bem": "Bemerkung Datenimport"},
            "begruendungBewertung": {"bem": "Begründung Bewertung"},
            "begruendungPrioSanierungsbedarf": {
                "bem": "Begründung Prio. Sanierungsbedarf"
            },
            "begruendungPrioUntersuchungsbedarf": {
                "bem": "Begründung Prio. Untersuchungsbedarf"
            },
            "bemerkungenIntern": [
                {"bem": "Bemerkung intern 1"},
                {"bem": "Bemerkung intern 2"},
            ],
        }
    }


def test_get_bemerkung_betrieb(session: Session, run_query):
    vflz = make_vflz(session, "My Site")
    betrieb = make_betrieb(session, vflz)
    betrieb.bemerkung = BemerkungBetrieb("Bemerkung Betrieb")
    betrieb.bemerkung_datenimport = BemerkungDatenimportBetrieb(
        "Bemerkung Datenimport Betrieb"
    )
    betrieb.begruendung_bewertung = BegruendungBewertungBetrieb("Begründung Bewertung")

    session.commit()

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            betriebe {
                begruendungBewertung {
                    bem
                }
                bemerkung {
                    bem
                }
                bemerkungDatenimport {
                    bem
                }
            }
        }
    }
    """
    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "betriebe": [
                {
                    "begruendungBewertung": {"bem": "Begründung Bewertung"},
                    "bemerkung": {"bem": "Bemerkung Betrieb"},
                    "bemerkungDatenimport": {"bem": "Bemerkung Datenimport Betrieb"},
                },
            ]
        }
    }


def test_get_bemerkung_datenimport_schiessanlage(session: Session, run_query):
    vflz = make_vflz(session, "My Site")
    schiessanlage = make_schiessanlage(session, vflz)
    schiessanlage.bemerkung_datenimport = BemerkungDatenimportSchiessanlage(
        "Bemerkung Schiessanlage"
    )

    session.commit()

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            schiessanlagen {
                bemerkungDatenimport {
                    bem
                }
            }
        }
    }
    """
    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "schiessanlagen": [
                {
                    "bemerkungDatenimport": {"bem": "Bemerkung Schiessanlage"},
                },
            ]
        }
    }


def test_get_bemerkung_ablagerung(session: Session, run_query):
    vflz = make_vflz(session, "My Site")
    ablagerung = make_ablagerung(session, vflz)
    ablagerung.bemerkung = BemerkungAblagerung("Bemerkung Ablagerung")
    ablagerung.bemerkung_datenimport = BemerkungDatenimportAblagerung(
        "Bemerkung Datenimport Ablagerung"
    )
    session.commit()

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            ablagerungen {
                bemerkung { bem }
                bemerkungDatenimport { bem }
            }
        }
    }
    """
    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "ablagerungen": [
                {
                    "bemerkung": {"bem": "Bemerkung Ablagerung"},
                    "bemerkungDatenimport": {"bem": "Bemerkung Datenimport Ablagerung"},
                }
            ]
        }
    }


def test_get_bemerkung_datenimport_ablagerung(session: Session, run_query):
    vflz = make_vflz(session, "My Site")
    ablagerung = make_ablagerung(session, vflz)
    ablagerung.bemerkung_datenimport = BemerkungDatenimportAblagerung(
        "Bemerkung Ablagerung"
    )

    session.commit()

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            ablagerungen {
                bemerkungDatenimport {
                    bem
                }
            }
        }
    }
    """
    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "ablagerungen": [
                {
                    "bemerkungDatenimport": {"bem": "Bemerkung Ablagerung"},
                },
            ]
        }
    }


def test_get_bemerkung_unfall(session: Session, run_query):
    vflz = make_vflz(session, "My Site")
    unfall = make_unfall(session, vflz)
    unfall.bemerkung = BemerkungUnfall("Bemerkung Unfall")
    unfall.bemerkung_datenimport = BemerkungDatenimportUnfall(
        "Bemerkung Datenimport Unfall"
    )
    session.commit()

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            unfaelle { bemerkung { bem } bemerkungDatenimport { bem } }
        }
    }
    """
    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "unfaelle": [
                {
                    "bemerkung": {"bem": "Bemerkung Unfall"},
                    "bemerkungDatenimport": {"bem": "Bemerkung Datenimport Unfall"},
                }
            ]
        }
    }


def test_get_bemerkung_massnahme(session: Session, run_query):
    vflz = make_vflz(session, "My Site")
    massnahme = make_massnahme(session, vflz)
    massnahme.bemerkung = BemerkungMassnahme("Bemerkung Massnahme")
    session.commit()

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            massnahmen { bemerkung { bem } }
        }
    }
    """
    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {"massnahmen": [{"bemerkung": {"bem": "Bemerkung Massnahme"}}]}
    }


def test_get_bemerkung_sanierungsziel(session: Session, run_query):
    vflz = make_vflz(session, "My Site")
    sanierungsziel = make_sanierungsziel(session, vflz)
    sanierungsziel.bemerkung = BemerkungSanierung("Bemerkung Sanierung")
    session.commit()

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            sanierungsziele { bemerkung { bem } }
        }
    }
    """
    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {"sanierungsziele": [{"bemerkung": {"bem": "Bemerkung Sanierung"}}]}
    }


def test_get_bemerkung_umweltschaden(session: Session, run_query):
    vflz = make_vflz(session, "My Site")
    umweltschaden = make_umweltschaden(session, vflz)
    umweltschaden.bemerkung = BemerkungUmweltschaden("Bemerkung Umweltschaden")
    session.commit()

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            umweltschaeden { bemerkung { bem } }
        }
    }
    """
    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {"umweltschaeden": [{"bemerkung": {"bem": "Bemerkung Umweltschaden"}}]}
    }


def test_get_bemerkung_einzelereignis(session: Session, run_query):
    vflz = make_vflz(session, "My Site")
    einzelereignis = make_einzelereignis(session, vflz)
    einzelereignis.bemerkung = BemerkungEinzelereignis("Bemerkung Einzelereignis")
    session.commit()

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            einzelereignisse { bemerkung { bem } }
        }
    }
    """
    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "einzelereignisse": [{"bemerkung": {"bem": "Bemerkung Einzelereignis"}}]
        }
    }


def test_get_pool_by_id(session: Session, run_query):
    pool = make_pool(session)
    query = """
    query q($poolId: ID!) {
        pool(poolId: $poolId) {
            bemerkungen
            bezeichnung
        }
    }
    """

    result = run_query(query=query, variable_values={"poolId": str(pool.pool_id)})
    assert result.data["pool"] == {"bemerkungen": "bar", "bezeichnung": "foo"}


def test_get_all_pools(session: Session, run_query):
    pool1 = make_pool(session, bezeichnung="foo")
    pool2 = make_pool(session, bezeichnung="bar")
    query = """
    {
        pools {
            numPages
            numResultsTotal
            results {
                poolId
                bemerkungen
                bezeichnung
            }
        }
    }
    """

    result = run_query(query)
    assert result.data["pools"]["numPages"] == 1
    assert result.data["pools"]["numResultsTotal"] == 2
    assert result.data["pools"]["results"] == [
        {"poolId": str(pool2.pool_id), "bemerkungen": "bar", "bezeichnung": "bar"},
        {
            "poolId": str(pool1.pool_id),
            "bemerkungen": "bar",
            "bezeichnung": "foo",
        },
    ]


def test_get_standorte_from_pool(session: Session, run_query):
    vflz1 = make_vflz(session, "My Site", 1, combined_id="vflz2")
    vflz2 = make_vflz(session, "My Site", 42, combined_id="vflz1")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)

    query = """
    query q($poolId: ID!) {
        pool(poolId: $poolId) {
            standorte(page: 1, perPage: 1) {
                numResultsTotal
                numPages
                results {
                    vflzId
                }
            }
        }
    }
    """

    result = run_query(query, {"poolId": str(pool.pool_id)})
    assert result.data["pool"]["standorte"] == {
        "numPages": 2,
        "numResultsTotal": 2,
        "results": [
            {"vflzId": str(vflz2.vflz_id)},
        ],
    }


def test_get_pools_from_vflz(session: Session, run_query):
    vflz1 = make_vflz(session, "My Site")
    pool = make_pool(session)
    pool2 = make_pool(session, "foo2")
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz1.vfl_id, pool2)

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            pools {
                poolId
            }
        }
    }
    """

    result = run_query(query, {"vflzId": str(vflz1.vflz_id)})
    assert result.data["vflz"]["pools"] == [
        {"poolId": str(pool.pool_id)},
        {"poolId": str(pool2.pool_id)},
    ]


def test_filter_pools_by_bezeichnung(session: Session, run_query):
    make_vflz(session, "My Site")
    pool = make_pool(session, "find me")
    make_pool(session, "hidden")
    pool3 = make_pool(session, "find me too")
    query = """
    query q($bezeichnung: String!) {
        pools(filterBezeichnung: $bezeichnung) {
            numPages
            numResultsTotal
            results {
                poolId
            }
        }
    }
    """

    result = run_query(query, {"bezeichnung": "me"})
    assert result.data["pools"] == {
        "numPages": 1,
        "numResultsTotal": 2,
        "results": [
            {"poolId": str(pool.pool_id)},
            {"poolId": str(pool3.pool_id)},
        ],
    }


def test_schiessanlage_are_ordered_by_timestamp_and_id_if_not_provided(session):
    vflz = make_vflz(session, "My Site")
    schiessanlage1 = make_schiessanlage(session, vflz)
    schiessanlage2 = make_schiessanlage(session, vflz)
    schiessanlage3 = make_schiessanlage(session, vflz)
    schiessanlage4 = make_schiessanlage(session, vflz)

    schiessanlage1.zeitraum_von = date(2020, 3, 3)
    schiessanlage3.zeitraum_von = date(2000, 1, 1)
    schiessanlage2.zeitraum_von = None
    schiessanlage4.zeitraum_von = None

    schiessanlagen_ids = [s.intb_id for s in vflz.schiessanlagen]
    assert schiessanlagen_ids == [
        schiessanlage1.intb_id,
        schiessanlage3.intb_id,
        schiessanlage2.intb_id,
        schiessanlage4.intb_id,
    ]


def test_unfaelle_are_ordered_by_timestamp_and_id_if_not_provided(session):
    vflz = make_vflz(session, "My Site")
    unfall1 = make_unfall(session, vflz)
    unfall2 = make_unfall(session, vflz)
    unfall3 = make_unfall(session, vflz)
    unfall4 = make_unfall(session, vflz)

    unfall1.zeitpunkt = date(2020, 3, 3)
    unfall3.zeitpunkt = date(2000, 1, 1)
    unfall2.zeitpunkt = None
    unfall4.zeitpunkt = None

    unfaelle_ids = [u.intu_id for u in vflz.unfaelle]
    assert unfaelle_ids == [
        unfall1.intu_id,
        unfall3.intu_id,
        unfall2.intu_id,
        unfall4.intu_id,
    ]


def test_betriebe_are_ordered_by_timestamp_and_id_if_not_provided(session):
    vflz = make_vflz(session, "My Site")
    betrieb1 = make_betrieb(session, vflz)
    betrieb2 = make_betrieb(session, vflz)
    betrieb3 = make_betrieb(session, vflz)
    betrieb4 = make_betrieb(session, vflz)

    betrieb1.zeitraum_von = date(2020, 3, 3)
    betrieb3.zeitraum_von = date(2000, 1, 1)
    betrieb2.zeitraum_von = None
    betrieb4.zeitraum_von = None

    betriebe_ids = [b.intb_id for b in vflz.betriebe]
    assert betriebe_ids == [
        betrieb1.intb_id,
        betrieb3.intb_id,
        betrieb2.intb_id,
        betrieb4.intb_id,
    ]


def test_betriebe_are_ordered_by_relevance_then_timestamp(session):
    vflz = make_vflz(session, "My Site")
    betriebe = []
    for relevant, start_date in [
        (False, date(2024, 1, 1)),
        (True, date(2000, 1, 1)),
        (None, date(2025, 1, 1)),
        (True, date(2020, 1, 1)),
        (True, None),
        (False, None),
        (None, None),
    ]:
        betrieb = make_betrieb(session, vflz)
        betrieb.relevant = relevant
        betrieb.zeitraum_von = start_date
        betriebe.append(betrieb)

    session.flush()
    session.expire(vflz, ["betriebe"])

    assert [betrieb.intb_id for betrieb in vflz.betriebe] == [
        betriebe[index].intb_id for index in [3, 1, 4, 2, 0, 5, 6]
    ]


def test_zeitraum_ordering_betriebe_one_with_vonjahr_one_without(session):
    vflz = make_vflz(session, "My Site")
    betrieb1 = make_betrieb(session, vflz)
    betrieb2 = make_betrieb(session, vflz)

    betrieb1.zeitraum_von = date(2000, 3, 3)
    betrieb1.zeitraum_vonjahr = True
    betrieb2.zeitraum_von = date(2000, 1, 1)
    betrieb2.zeitraum_vonjahr = False

    betriebe_ids = [b.intb_id for b in vflz.betriebe]
    assert betriebe_ids == [betrieb1.intb_id, betrieb2.intb_id]


def test_ablagerungen_are_ordered_by_timestamp_and_id_if_not_provided(session):
    vflz = make_vflz(session, "My Site")
    ablagerung1 = make_ablagerung(session, vflz)
    ablagerung2 = make_ablagerung(session, vflz)
    ablagerung3 = make_ablagerung(session, vflz)
    ablagerung4 = make_ablagerung(session, vflz)

    ablagerung1.zeitraum_von = date(2020, 3, 3)
    ablagerung3.zeitraum_von = date(2000, 1, 1)
    ablagerung2.zeitraum_von = None
    ablagerung4.zeitraum_von = None
    session.commit()
    ablagerungen_ids = [a.inta_id for a in vflz.ablagerungen]
    assert ablagerungen_ids == [
        ablagerung1.inta_id,
        ablagerung3.inta_id,
        ablagerung2.inta_id,
        ablagerung4.inta_id,
    ]


def test_kompartiment_stoffklassen_are_order_by_timestamp_and_id_if_not_provided(
    session,
):
    vflz = make_vflz(session, "My Site")
    ablagerung = make_ablagerung(session, vflz)
    kksk1 = make_kompartiment_stoffklasse(session, ablagerung)
    kksk2 = make_kompartiment_stoffklasse(session, ablagerung)
    kksk3 = make_kompartiment_stoffklasse(session, ablagerung)
    kksk4 = make_kompartiment_stoffklasse(session, ablagerung)

    kksk1.zeitraum_von = None
    kksk2.zeitraum_von = date(2020, 3, 3)
    kksk3.zeitraum_von = None
    kksk4.zeitraum_von = date(2019, 2, 3)
    session.commit()
    kksk_ids = [k.kksk_id for k in ablagerung.kompartiment_stoffklassen]
    assert kksk_ids == [kksk2.kksk_id, kksk4.kksk_id, kksk1.kksk_id, kksk3.kksk_id]


def test_query_vflz_by_vfl_ids(session, run_query):
    first_vfl_id = 1
    second_vfl_id = 2
    third_vfl_id = 3
    vflz = make_vflz(session, "My Site", first_vfl_id)

    make_vflz(session, "My Second Site", second_vfl_id)

    vflz4 = make_vflz(session, "My Second Site", third_vfl_id)

    query = """
    {
        vflzByVflIds(vflIds: ["3", "1"]) {
            vflzId
            vflId
        }
    }
    """

    result = run_query(query)
    assert result.data["vflzByVflIds"] == [
        {"vflzId": str(vflz4.vflz_id), "vflId": str(third_vfl_id)},
        {"vflzId": str(vflz.vflz_id), "vflId": str(first_vfl_id)},
    ]


def test_get_pfas_of_vflz(session, run_query):
    untersuchungs_stand = session.scalars(
        select(codes.UntersuchungsStand).where(codes.UntersuchungsStand.code == "test")
    ).one()
    beurteilung = session.scalars(
        select(codes.Beurteilung).where(codes.Beurteilung.code == "test")
    ).one()
    branche = session.scalars(
        select(codes.BranchePFAS).where(codes.BranchePFAS.code == "test")
    ).one()
    pfas_typ = session.scalars(
        select(codes.PFASTyp).where(codes.PFASTyp.code == "test")
    ).one()
    pfas_haltig_loeschmittel = session.scalars(
        select(codes.LoeschmittelPFASHaltig).where(
            codes.LoeschmittelPFASHaltig.code == "test"
        )
    ).one()
    pfas_frei_loeschmittel = session.scalars(
        select(codes.LoeschmittelPFASFrei).where(
            codes.LoeschmittelPFASFrei.code == "test"
        )
    ).one()
    genauigkeit_code = session.scalars(
        select(codes.Genauigkeit).where(codes.Genauigkeit.code == "test")
    ).one()

    vflz = make_vflz(session, "My Site")
    pfas = make_pfas(session, vflz)
    make_loeschschaum_einsatz(session, pfas)
    pfas.untersuchungs_stand = untersuchungs_stand
    pfas.beurteilung = beurteilung
    pfas.branche = branche
    pfas.pfas_typ = pfas_typ
    pfas.name = "PFAS Standort"
    pfas.strasse = "PFAS-Strasse 1"
    pfas.plz = "12345"
    pfas.ort = "Bern"
    pfas.eva = "EVA-PFAS"
    pfas.pfas_loeschmittel = True
    pfas.pfas_haltige_loeschmittel = [pfas_haltig_loeschmittel]
    pfas.pfas_freie_loeschmittel = [pfas_frei_loeschmittel]
    pfas.relevant = True
    pfas.menge_schaumgemisch = 100
    pfas.menge_konzentrat = 200
    pfas.beschreibungen_detail = "Detailbeschreibung"
    pfas.genauigkeit_von = genauigkeit_code
    pfas.genauigkeit_bis = genauigkeit_code
    pfas.zeitraum_von = date(2026, 1, 1)
    pfas.zeitraum_bis = date(2027, 2, 2)
    pfas.zeitraum_vonjahr = False
    pfas.zeitraum_bisjahr = False
    pfas.zeitraum_bisheute = False

    pfas.bemerkung = BemerkungPFAS(bem="foo")
    pfas.bemerkung_datenimport = BemerkungDatenimportPFAS(
        bem="Bemerkung Datenimport PFAS"
    )
    pfas.begruendung_bewertung = BegruendungBewertungPFAS(bem="bar")
    pfas.erfasser = "test_user"
    pfas.mutierer = "test_user"

    pfas.set_zentroid(
        {
            "type": "Point",
            "crs": {
                "properties": {"name": "EPSG:2056"},
                "type": "name",
            },
            "coordinates": [123, 321],
        }
    )

    session.flush()

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            pfas {
                intpId
                untersuchungsStand
                beurteilung
                branche
                pfasTyp
                pfasHaltigeLoeschmittel
                pfasFreieLoeschmittel
                loeschschaumEinsatz {
                    loeschschaumEinsatz
                    haeufigkeitNutzung
                }
                name
                strasse
                plz
                ort
                eva
                zeitraum {
                    von
                    bis
                    vonjahr
                    bisjahr
                    bisheute
                    genauigkeitVon
                    genauigkeitBis
                }
                bemerkung { bem }
                bemerkungDatenimport { bem }
                begruendungBewertung { bem }
                erfassungMutation { erfasser mutierer }
                pfasLoeschmittel
                relevant
                mengeSchaumgemisch
                mengeKonzentrat
                beschreibungenDetail
                zentroid
            }
        }
    }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})

    assert result.data == {
        "vflz": {
            "pfas": [
                {
                    "intpId": str(pfas.intp_id),
                    "untersuchungsStand": "code:10023:test",
                    "beurteilung": "code:103:test",
                    "branche": "code:25002:test",
                    "pfasTyp": "code:500:test",
                    "pfasHaltigeLoeschmittel": ["code:501:test"],
                    "pfasFreieLoeschmittel": ["code:502:test"],
                    "loeschschaumEinsatz": [
                        {
                            "loeschschaumEinsatz": "code:503:hand",
                            "haeufigkeitNutzung": "code:504:test",
                        }
                    ],
                    "name": "PFAS Standort",
                    "strasse": "PFAS-Strasse 1",
                    "plz": "12345",
                    "ort": "Bern",
                    "eva": "EVA-PFAS",
                    "zeitraum": {
                        "von": "2026-01-01",
                        "bis": "2027-02-02",
                        "vonjahr": False,
                        "bisjahr": False,
                        "bisheute": False,
                        "genauigkeitVon": "code:90:test",
                        "genauigkeitBis": "code:90:test",
                    },
                    "bemerkung": {"bem": "foo"},
                    "bemerkungDatenimport": {"bem": "Bemerkung Datenimport PFAS"},
                    "begruendungBewertung": {"bem": "bar"},
                    "erfassungMutation": {
                        "erfasser": "test_user",
                        "mutierer": "alma-test",
                    },
                    "pfasLoeschmittel": True,
                    "relevant": True,
                    "mengeSchaumgemisch": 100,
                    "mengeKonzentrat": 200,
                    "beschreibungenDetail": "Detailbeschreibung",
                    "zentroid": {
                        "type": "Point",
                        "crs": {
                            "properties": {"name": "EPSG:2056"},
                            "type": "name",
                        },
                        "coordinates": [123, 321],
                    },
                }
            ]
        }
    }


def test_get_kinderspielplatze_gruenflaechen_from_given_vflz_id(session, run_query):
    typ_code = session.scalars(
        select(codes.KinderspielplatzGruenflaecheTyp).where(
            codes.KinderspielplatzGruenflaecheTyp.code == "Typ"
        )
    ).one()
    eigentumsform_code = session.scalars(
        select(codes.Eigentumsform).where(codes.Eigentumsform.code == "Eigentumsform")
    ).one()
    beurteilung_code = session.scalars(
        select(codes.Beurteilung).where(codes.Beurteilung.code == "test")
    ).one()
    untersuchungsstand_code = session.scalars(
        select(codes.UntersuchungsStand).where(codes.UntersuchungsStand.code == "test")
    ).one()
    genauigkeit_code = session.scalars(
        select(codes.Genauigkeit).where(codes.Genauigkeit.code == "test")
    ).one()
    altersstufe_kinder_0_3_code = session.scalars(
        select(codes.AltersstufeKinder).where(codes.AltersstufeKinder.code == "0-3")
    ).one()

    vflz = make_vflz(session, "My Site")
    intk = make_kinderspielplatz_gruenflaeche(session, vflz)
    intk.kinderspielplatz_gruenflache_typ = typ_code
    intk.eigentumsform = eigentumsform_code
    intk.beurteilung = beurteilung_code
    intk.untersuchungs_stand = untersuchungsstand_code
    intk.genauigkeit_von = genauigkeit_code
    intk.genauigkeit_bis = genauigkeit_code
    intk.zeitraum_von = date(2026, 1, 1)
    intk.zeitraum_bis = date(2027, 2, 2)
    intk.zeitraum_vonjahr = False
    intk.zeitraum_bisjahr = False
    intk.zeitraum_bisheute = False
    intk.name = "Foo Name"
    intk.strasse = "Foo Strasse"
    intk.plz = "1234"
    intk.ort = "Foo Ort"
    intk.eva = "Foo EVA"
    intk.relevant = False
    intk.belastung_ueber_sanierungswert = True
    intk.altersstufen_kinder.append(altersstufe_kinder_0_3_code)
    intk.bemerkung = BemerkungKinderspielplatzGruenflaeche(bem="foo")
    intk.bemerkung_datenimport = BemerkungDatenimportKinderspielplatzGruenflaeche(
        bem="Bemerkung Datenimport Kinderspielplatz Gruenfläche"
    )
    intk.begruendung_bewertung = BegruendungBewertungKinderspielplatzGruenflaeche(
        bem="bar"
    )
    intk.erfasser = "test_user"
    intk.mutierer = "test_user"

    intk.set_zentroid(
        {
            "type": "Point",
            "crs": {
                "properties": {"name": "EPSG:2056"},
                "type": "name",
            },
            "coordinates": [123, 321],
        }
    )

    session.flush()

    query = """
    query q($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
            kinderspielplaetzeGruenflaechen {
                intkId
                kinderspielplatzGruenflacheTyp
                eigentumsform
                beurteilung
                untersuchungsStand
                name
                strasse
                plz
                ort
                eva
                zeitraum {
                    von
                    bis
                    vonjahr
                    bisjahr
                    bisheute
                    genauigkeitVon
                    genauigkeitBis
                }
                relevant
                belastungUeberSanierungswert
                zentroid
                altersstufenKinder
                bemerkung { bem }
                bemerkungDatenimport { bem }
                begruendungBewertung { bem }
                erfassungMutation { erfassungsDatum erfasser mutationsDatum mutierer }
            }
        }
    }
    """
    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})
    erfassung_result = result.data["vflz"]["kinderspielplaetzeGruenflaechen"][0].pop(
        "erfassungMutation"
    )

    assert erfassung_result["erfassungsDatum"]
    assert erfassung_result["mutationsDatum"]
    assert erfassung_result["erfasser"] == "test_user"
    assert erfassung_result["mutierer"] == "alma-test"

    assert result.data == {
        "vflz": {
            "kinderspielplaetzeGruenflaechen": [
                {
                    "intkId": str(intk.intk_id),
                    "kinderspielplatzGruenflacheTyp": "code:400:Typ",
                    "eigentumsform": "code:401:Eigentumsform",
                    "beurteilung": "code:103:test",
                    "untersuchungsStand": "code:10023:test",
                    "name": "Foo Name",
                    "strasse": "Foo Strasse",
                    "plz": "1234",
                    "ort": "Foo Ort",
                    "eva": "Foo EVA",
                    "zeitraum": {
                        "von": "2026-01-01",
                        "bis": "2027-02-02",
                        "vonjahr": False,
                        "bisjahr": False,
                        "bisheute": False,
                        "genauigkeitVon": "code:90:test",
                        "genauigkeitBis": "code:90:test",
                    },
                    "relevant": False,
                    "belastungUeberSanierungswert": True,
                    "zentroid": {
                        "type": "Point",
                        "crs": {
                            "properties": {"name": "EPSG:2056"},
                            "type": "name",
                        },
                        "coordinates": [123, 321],
                    },
                    "altersstufenKinder": ["code:402:0-3"],
                    "bemerkung": {"bem": "foo"},
                    "bemerkungDatenimport": {
                        "bem": "Bemerkung Datenimport Kinderspielplatz Gruenfläche"
                    },
                    "begruendungBewertung": {"bem": "bar"},
                }
            ]
        }
    }


def test_height_raises_error_results_in_zero_height_returned(monkeypatch):
    def mock_get(*args, **kwargs):
        raise httpx2.TimeoutException("API error")

    monkeypatch.setattr(httpx2, "get", mock_get)
    assert fetch_height(123, 321) == 0
