from datetime import datetime
from pathlib import Path

import business_workflow_manager.models as wf_models
import pytest
from freezegun import freeze_time
from utils import make_ablagerung, make_vflz

pytestmark = [
    # Fixture required by all tests in this module
    # Run all tests in this module using the "bearbeiten sachdaten" role unless otherwise specified
    pytest.mark.usefixtures("generate_codes", "as_bearbeiten_sachdaten"),
]

vflz_query = """
query q($id: ID!) {
    vflz(vflzId: $id) {
        vflzId
        bezeichnung
        flurname
        strasse
        postleitzahl
        ort
        lang
        deponietyp
        gwsBereich
        gwsZone
        durchlaessigkeit
        karstgeb
        inBetrieb
        nachsorge
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
            kompartimentStoffklassen {
                kkskId
            }
            bemerkung { bem }
            bemerkungDatenimport { bem }
        }
        bemerkungStandort { bem }
        bemerkungUmwelt { bem }
        bemerkungDatenimport { bem }
        ktu
    }
}"""

vflz_mutation = """
mutation m($data: UpdateVflzDataInput!) {
    updateVflzData(data: $data) {
        ... on Vflz {
                vflzId
                bezeichnung
                flurname
                strasse
                postleitzahl
                ort
                lang
                deponietyp
                gwsBereich
                gwsZone
                durchlaessigkeit
                karstgeb
                inBetrieb
                nachsorge
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
                    kompartimentStoffklassen {
                        kkskId
                    }
                    bemerkung { bem }
                    bemerkungDatenimport { bem }
                }
                bemerkungStandort { bem }
                bemerkungUmwelt { bem }
                bemerkungDatenimport { bem }
                ktu
            }
        }
    }
"""


@freeze_time("2020-01-01 02:32:02")
def test_updating_vflz_writes_current_user_and_datetime_for_mutierer(session, context):
    vflz = make_vflz(session, "My Site")
    assert not vflz.mutierer
    assert not vflz.mutations_datum
    vflz.bezeichnung = "foo"
    session.commit()

    assert vflz.mutierer == context.user.username
    assert vflz.mutations_datum == datetime.fromisoformat("2020-01-01 02:32:02")


@freeze_time("2020-01-01 02:32:02")
def test_updating_vflz_writes_data_not_to_ablagerung(session, context):
    vflz = make_vflz(session, "My Site")
    ablagerung = make_ablagerung(session, vflz)
    vflz.bezeichnung = "foo"
    session.commit()

    assert vflz.mutierer == context.user.username
    assert vflz.mutations_datum == datetime.fromisoformat("2020-01-01 02:32:02")

    assert not ablagerung.mutierer
    assert not ablagerung.mutations_datum


def test_update_vflz_with_same_data_does_not_change_mutation_of_vflz(
    run_query, session
):
    vflz = make_vflz(session, "My Site")

    assert not vflz.mutierer
    assert not vflz.mutations_datum

    query_result = run_query(query=vflz_query, variable_values={"id": vflz.vflz_id})
    mutation_data = {
        "data": {
            "betriebe": [],
            "schiessanlagen": [],
            "unfaelle": [],
            "pfas": [],
            "kinderspielplaetzeGruenflaechen": [],
            "grundwasser": [],
            "oberflaechenGewaesser": [],
            "nutzungenBoden": [],
            "umweltStoffe": [],
            "einzelereignisse": [],
            "umweltschaeden": [],
            "gemeinde": None,
            "bemerkungStandort": None,
            "bemerkungUmwelt": None,
            "bemerkungDatenimport": None,
            "flugplatz": None,
            **query_result.data["vflz"],
        }
    }

    mutation_result = run_query(query=vflz_mutation, variable_values={**mutation_data})
    assert query_result.data["vflz"] == mutation_result.data["updateVflzData"]
    assert not vflz.mutierer
    assert not vflz.mutations_datum


def test_update_vflz_does_not_change_mutation_of_ablagerung(run_query, session):
    vflz = make_vflz(session, "My Site")
    ablagerung = make_ablagerung(session, vflz)
    assert not ablagerung.mutierer
    assert not ablagerung.mutations_datum

    query_result = run_query(query=vflz_query, variable_values={"id": vflz.vflz_id})
    query_result.data["vflz"]["flurname"] = "foo"
    mutation_data = {
        "data": {
            "betriebe": [],
            "schiessanlagen": [],
            "unfaelle": [],
            "pfas": [],
            "kinderspielplaetzeGruenflaechen": [],
            "grundwasser": [],
            "oberflaechenGewaesser": [],
            "nutzungenBoden": [],
            "umweltStoffe": [],
            "einzelereignisse": [],
            "umweltschaeden": [],
            "gemeinde": None,
            "flugplatz": None,
            **query_result.data["vflz"],
        }
    }

    mutation_result = run_query(query=vflz_mutation, variable_values={**mutation_data})
    assert query_result.data["vflz"] == mutation_result.data["updateVflzData"]
    assert not ablagerung.mutierer
    assert not ablagerung.mutations_datum


def test_update_ablagerung_does_not_change_mutation_of_vflz(run_query, session):
    with freeze_time("2020-03-03 03:03:02"):
        vflz = make_vflz(session, "My Site")
        ablagerung = make_ablagerung(session, vflz)
        assert vflz.mutations_datum == datetime.fromisoformat("2020-03-03 03:03:02")

    query_result = run_query(query=vflz_query, variable_values={"id": vflz.vflz_id})
    query_result.data["vflz"]["ablagerungen"][0]["tiefe"] = "40m"
    mutation_data = {
        "data": {
            "betriebe": [],
            "schiessanlagen": [],
            "unfaelle": [],
            "pfas": [],
            "kinderspielplaetzeGruenflaechen": [],
            "grundwasser": [],
            "oberflaechenGewaesser": [],
            "nutzungenBoden": [],
            "umweltStoffe": [],
            "einzelereignisse": [],
            "umweltschaeden": [],
            "gemeinde": None,
            "flugplatz": None,
            **query_result.data["vflz"],
        }
    }

    with freeze_time("2023-04-04 03:01:59"):
        mutation_result = run_query(
            query=vflz_mutation, variable_values={**mutation_data}
        )
        assert query_result.data["vflz"] == mutation_result.data["updateVflzData"]
        assert ablagerung.mutations_datum == datetime.fromisoformat(
            "2023-04-04 03:01:59"
        )


@freeze_time("2020-01-01 02:32:02")
def test_creating_vflz_only_writes_current_user_and_datetime_for_erfasser(
    session, context
):
    vflz = make_vflz(session, "My Site")
    assert vflz.erfasser == context.user.username
    assert vflz.erfassungs_datum == datetime.fromisoformat("2020-01-01 02:32:02")
    assert not vflz.mutierer
    assert not vflz.mutations_datum


@pytest.fixture
def simple_workflow(workflow_manager) -> wf_models.Workflow:
    path = Path(__file__).parent / "workflows" / "simple.yml"
    with path.open() as f:
        workflow = workflow_manager.load_workflow_from_file(f).workflow
    return workflow


@freeze_time("2020-01-01 02:32:02")
def test_creating_wm_node_writes_current_user_and_datetime_for_created(
    session, context, simple_workflow: wf_models.Workflow
):
    """wm models use the english AuditMixin columns; before_flush must
    populate created_by/created_at (and leave updated_* untouched)."""
    vflz = make_vflz(session, "My Site")
    wf_node = simple_workflow.create_node(str(vflz.vflz_id))
    session.add(wf_node)
    session.commit()

    assert wf_node.created_by == context.user.username
    assert wf_node.created_at == datetime.fromisoformat("2020-01-01 02:32:02")
    assert not wf_node.updated_by
    assert not wf_node.updated_at


def test_updating_wm_node_writes_current_user_and_datetime_for_updated(
    session, context, simple_workflow: wf_models.Workflow
):
    """Modifying a wm model populates updated_by/updated_at via before_flush."""
    with freeze_time("2020-01-01 02:32:02"):
        vflz = make_vflz(session, "My Site")
        wf_node = simple_workflow.create_node(str(vflz.vflz_id))
        session.add(wf_node)
        session.commit()

    with freeze_time("2023-04-04 03:01:59"):
        wf_node.title = "changed"
        session.commit()

    assert wf_node.updated_by == context.user.username
    assert wf_node.updated_at == datetime.fromisoformat("2023-04-04 03:01:59")
    # created_* preserved from initial insert
    assert wf_node.created_at == datetime.fromisoformat("2020-01-01 02:32:02")
