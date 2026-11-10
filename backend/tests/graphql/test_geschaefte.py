from datetime import date, datetime, timedelta
from io import StringIO
from typing import Any

import business_workflow_manager.models as wf_models
import pytest
from business_workflow_manager.types import NodeStatus
from freezegun import freeze_time
from pytest import raises as assert_raises
from sqlalchemy import select
from sqlalchemy.orm import Session
from utils import (
    QueryError,
    make_beteiligter_geschaeft,
    make_document_node,
    make_form_node,
    make_note_node,
    make_subj,
    make_task_config,
    make_task_node,
    make_translation,
    make_vflz,
    make_workflow_config,
    make_workflow_node,
)

from alma.constants import Language
from alma.graphql.types.workflow import FaelligkeitStatus
from alma.models import auth
from alma.models.vflz import Vflz
from alma.models.workflow import BeteiligterGeschaeft

pytestmark = [
    # Fixture required by all tests in this module
    pytest.mark.usefixtures("generate_codes"),
]


def test_reading_vflz_geschaefte_fails_without_lesen_geschaefte(
    session: Session, run_query
):
    vflz = make_vflz(session, "My Site")

    query = """
        query q($vflzId: ID!) {
            vflz(vflzId: $vflzId) {
                geschaefte { results { title } }
            }
        }
    """

    with assert_raises(QueryError, match="not allowed"):
        run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})


def test_reading_vflz_geschaefte_does_not_fail_with_lesen_geschaefte(
    session: Session, run_query, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    make_document_node(session, vflz, "Document 1")

    query = """
        query q($vflzId: ID!) {
            vflz(vflzId: $vflzId) {
                geschaefte {
                    numPages
                    numResultsTotal
                    results { title }
                    page
                    perPage
                }
            }
        }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})
    assert result.data == {
        "vflz": {
            "geschaefte": {
                "numPages": 1,
                "numResultsTotal": 1,
                "page": 1,
                "perPage": 20,
                "results": [{"title": "Document 1"}],
            }
        }
    }


def test_reading_global_geschaefte_fails_without_lesen_geschaefte(
    session: Session, run_query
):
    query = "{ geschaefte { results { title } } }"

    with assert_raises(QueryError, match="not allowed"):
        run_query(query=query)


def test_reading_global_geschaefte_does_not_fail_with_lesen_geschaefte(
    session: Session, run_query, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    make_document_node(session, vflz, "Document 1")

    query = """{
        geschaefte {
            numPages
            numResultsTotal
            results { title }
            page
            perPage
        }
    }"""

    result = run_query(query=query)
    assert result.data == {
        "geschaefte": {
            "numPages": 1,
            "numResultsTotal": 1,
            "page": 1,
            "perPage": 20,
            "results": [{"title": "Document 1"}],
        }
    }


def test_reading_vflz_geschaefte_of_parent_includes_teilstandorte(
    session: Session, run_query, as_lesen_geschaefte
):
    parent_geometry = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200010],
                    [2600010, 1200010],
                    [2600010, 1200000],
                    [2600005, 1200000],
                    [2600005, 1200005],
                    [2600000, 1200005],
                    [2600000, 1200010],
                ]
            ]
        ],
    }

    teilstandort_geometry = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200000],
                    [2600000, 1200005],
                    [2600005, 1200005],
                    [2600005, 1200000],
                    [2600000, 1200000],
                ]
            ]
        ],
    }
    vflz = make_vflz(session, "Hauptstandort")
    main_vflz_id = vflz.vflz_id
    doc1 = make_document_node(session, vflz, "Dokument Hauptstandort")
    assert vflz.gemeinde

    vflz.create_teilstandort(
        combined_id="new-combined-id",
        gemeinde=vflz.gemeinde,
        bezeichnung="Teilstandort 1",
        parent_geometry=parent_geometry,
        parent_zentroid=None,
        teilstandort_geometry=teilstandort_geometry,
        teilstandort_zentroid=None,
    )
    session.commit()
    part_vflz_id = vflz.vflz_id

    doc2 = make_document_node(session, vflz, "Dokument Teilstandort")

    assert doc1.entity_id == main_vflz_id
    assert doc2.entity_id == part_vflz_id

    query = """
        query q($vflzId: ID!) {
            vflz(vflzId: $vflzId) {
                geschaefte {
                    results { title vflz { vflzId bezeichnung } }
                }
            }
        }
    """

    result = run_query(query=query, variable_values={"vflzId": str(main_vflz_id)})
    assert result.data == {
        "vflz": {
            "geschaefte": {
                "results": [
                    {
                        "title": "Dokument Hauptstandort",
                        "vflz": {
                            "vflzId": str(main_vflz_id),
                            "bezeichnung": "Hauptstandort",
                        },
                    },
                    {
                        "title": "Dokument Teilstandort",
                        "vflz": {
                            "vflzId": str(part_vflz_id),
                            "bezeichnung": "Teilstandort 1",
                        },
                    },
                ],
            }
        }
    }


def test_reading_vflz_geschaefte_of_teilstandort_includes_parent_and_siblings(
    session: Session, run_query, as_lesen_geschaefte
):
    parent_geometry = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200010],
                    [2600010, 1200010],
                    [2600010, 1200000],
                    [2600005, 1200000],
                    [2600005, 1200005],
                    [2600000, 1200005],
                    [2600000, 1200010],
                ]
            ]
        ],
    }

    teilstandort_geometry = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200000],
                    [2600000, 1200005],
                    [2600005, 1200005],
                    [2600005, 1200000],
                    [2600000, 1200000],
                ]
            ]
        ],
    }
    vflz = make_vflz(session, "Hauptstandort")
    main_vflz_id = vflz.vflz_id
    doc1 = make_document_node(session, vflz, "Dokument Hauptstandort")
    assert vflz.gemeinde

    vflz.create_teilstandort(
        combined_id="new-combined-id-1",
        gemeinde=vflz.gemeinde,
        bezeichnung="Teilstandort 1",
        parent_geometry=parent_geometry,
        parent_zentroid=None,
        teilstandort_geometry=teilstandort_geometry,
        teilstandort_zentroid=None,
    )
    session.commit()
    part1_vflz_id = vflz.vflz_id

    doc2 = make_document_node(session, vflz, "Dokument Teilstandort 1")

    # Fetch the historized Hauptstandort again
    vflz = session.scalars(select(Vflz).where(Vflz.parent_id == main_vflz_id)).one()
    assert vflz.gemeinde

    vflz.create_teilstandort(
        combined_id="new-combined-id-2",
        gemeinde=vflz.gemeinde,
        bezeichnung="Teilstandort 2",
        parent_geometry=parent_geometry,
        parent_zentroid=None,
        teilstandort_geometry=teilstandort_geometry,
        teilstandort_zentroid=None,
    )
    session.commit()
    part2_vflz_id = vflz.vflz_id

    doc3 = make_document_node(session, vflz, "Dokument Teilstandort 2")

    assert doc1.entity_id == main_vflz_id
    assert doc2.entity_id == part1_vflz_id
    assert doc3.entity_id == part2_vflz_id

    query = """
        query q($vflzId: ID!) {
            vflz(vflzId: $vflzId) {
                geschaefte {
                    results { title vflz { vflzId bezeichnung } }
                }
            }
        }
    """

    result = run_query(query=query, variable_values={"vflzId": str(part1_vflz_id)})
    assert result.data == {
        "vflz": {
            "geschaefte": {
                "results": [
                    {
                        "title": "Dokument Hauptstandort",
                        "vflz": {
                            "vflzId": str(main_vflz_id),
                            "bezeichnung": "Hauptstandort",
                        },
                    },
                    {
                        "title": "Dokument Teilstandort 1",
                        "vflz": {
                            "vflzId": str(part1_vflz_id),
                            "bezeichnung": "Teilstandort 1",
                        },
                    },
                    {
                        "title": "Dokument Teilstandort 2",
                        "vflz": {
                            "vflzId": str(part2_vflz_id),
                            "bezeichnung": "Teilstandort 2",
                        },
                    },
                ],
            }
        }
    }


def test_get_global_geschaefte_page_by_task_id_flat(
    session: Session, run_query, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    doc1 = make_document_node(session, vflz, "Document 1")
    doc2 = make_document_node(session, vflz, "Document 2")
    doc3 = make_document_node(session, vflz, "Document 3")
    doc1.started_at = datetime.now()
    doc2.started_at = datetime.now() + timedelta(days=1)
    doc3.started_at = datetime.now() + timedelta(days=2)

    query = """
        query q($taskId: ID!, $perPage: Int!, $reverse: Boolean! = false) {
            geschaefte(taskId: $taskId, perPage: $perPage, sortBy: StartDatum, reverse: $reverse) {
                numPages
                numResultsTotal
                page
                results { title }
            }
        }
    """

    result = run_query(
        query=query, variable_values={"taskId": doc2.wf_node_id, "perPage": 2}
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 2,
            "numResultsTotal": 3,
            "page": 1,
            "results": [{"title": "Document 1"}, {"title": "Document 2"}],
        }
    }

    result = run_query(
        query=query, variable_values={"taskId": doc3.wf_node_id, "perPage": 2}
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 2,
            "numResultsTotal": 3,
            "page": 2,
            "results": [{"title": "Document 3"}],
        }
    }
    result = run_query(
        query=query,
        variable_values={"taskId": doc1.wf_node_id, "perPage": 1, "reverse": True},
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 3,
            "numResultsTotal": 3,
            "page": 3,
            "results": [{"title": "Document 1"}],
        }
    }


def test_get_global_geschaefte_page_by_task_id_tree(
    session: Session, run_query, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    doc1 = make_document_node(session, vflz, "Document 1")
    doc2 = make_document_node(session, vflz, "Document 2")
    doc3 = make_document_node(session, vflz, "Document 3")

    doc11 = make_document_node(session, vflz, "Document 1-1")
    doc11.parent = doc1
    doc111 = make_document_node(session, vflz, "Document 1-1-1")
    doc111.parent = doc11

    doc31 = make_document_node(session, vflz, "Document 3-1")
    doc31.parent = doc3
    doc32 = make_document_node(session, vflz, "Document 3-2")
    doc32.parent = doc3

    doc1.started_at = datetime.now()
    doc2.started_at = datetime.now() + timedelta(days=1)
    doc3.started_at = datetime.now() + timedelta(days=2)

    query = """
        query q($taskId: ID!, $perPage: Int!, $reverse: Boolean! = false) {
            geschaefte(asTree: true, taskId: $taskId, perPage: $perPage, sortBy: StartDatum, reverse: $reverse) {
                numPages
                numResultsTotal
                page
                results { title }
            }
        }
    """

    result = run_query(
        query=query, variable_values={"taskId": doc2.wf_node_id, "perPage": 2}
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 2,
            "numResultsTotal": 7,
            "page": 1,
            "results": [
                {"title": "Document 1"},
                {"title": "Document 2"},
                {"title": "Document 1-1"},
                {"title": "Document 1-1-1"},
            ],
        }
    }

    result = run_query(
        query=query, variable_values={"taskId": doc3.wf_node_id, "perPage": 2}
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 2,
            "numResultsTotal": 7,
            "page": 2,
            "results": [
                {"title": "Document 3"},
                {"title": "Document 3-1"},
                {"title": "Document 3-2"},
            ],
        }
    }

    result = run_query(
        query=query,
        variable_values={"taskId": doc1.wf_node_id, "perPage": 1, "reverse": True},
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 3,
            "numResultsTotal": 7,
            "page": 3,
            "results": [
                {"title": "Document 1"},
                {"title": "Document 1-1"},
                {"title": "Document 1-1-1"},
            ],
        }
    }

    # Ask for a task_id that does not point to a top-level node
    result = run_query(
        query=query,
        variable_values={"taskId": doc11.wf_node_id, "perPage": 1},
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 3,
            "numResultsTotal": 7,
            "page": 1,
            "results": [
                {"title": "Document 1"},
                {"title": "Document 1-1"},
                {"title": "Document 1-1-1"},
            ],
        }
    }


def test_get_vflz_geschaefte_page_by_task_id_flat(
    session, run_query, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    doc1 = make_document_node(session, vflz, "Document 1")
    doc2 = make_document_node(session, vflz, "Document 2")
    doc3 = make_document_node(session, vflz, "Document 3")
    doc1.started_at = datetime.now()
    doc2.started_at = datetime.now() + timedelta(days=1)
    doc3.started_at = datetime.now() + timedelta(days=2)

    query = """
        query q($vflzId: ID!, $taskId: ID!, $perPage: Int!, $reverse: Boolean! = false) {
            vflz(vflzId: $vflzId) {
                geschaefte(taskId: $taskId, perPage: $perPage, sortBy: StartDatum, reverse: $reverse) {
                    numPages
                    numResultsTotal
                    page
                    results { title }
                }
            }
        }
    """

    result = run_query(
        query=query,
        variable_values={
            "vflzId": str(vflz.vflz_id),
            "taskId": doc2.wf_node_id,
            "perPage": 2,
        },
    )
    assert result.data["vflz"] == {
        "geschaefte": {
            "numPages": 2,
            "numResultsTotal": 3,
            "page": 1,
            "results": [{"title": "Document 1"}, {"title": "Document 2"}],
        }
    }

    result = run_query(
        query=query,
        variable_values={
            "vflzId": str(vflz.vflz_id),
            "taskId": doc3.wf_node_id,
            "perPage": 2,
        },
    )
    assert result.data["vflz"] == {
        "geschaefte": {
            "numPages": 2,
            "numResultsTotal": 3,
            "page": 2,
            "results": [{"title": "Document 3"}],
        }
    }

    result = run_query(
        query=query,
        variable_values={
            "vflzId": str(vflz.vflz_id),
            "taskId": doc1.wf_node_id,
            "perPage": 1,
            "reverse": True,
        },
    )
    assert result.data["vflz"] == {
        "geschaefte": {
            "numPages": 3,
            "numResultsTotal": 3,
            "page": 3,
            "results": [{"title": "Document 1"}],
        }
    }


def test_get_vflz_geschaefte_page_by_task_id_returns_no_result_with_invalid_task_id(
    session, run_query, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    doc1 = make_document_node(session, vflz, "Document 1")
    doc1.started_at = datetime.now()

    vflz2 = make_vflz(session, "An unrelated site")
    doc2 = make_document_node(session, vflz2, "Document 2")
    doc2.started_at = datetime.now()

    query = """
        query q($vflzId: ID!, $taskId: ID!, $perPage: Int!, $reverse: Boolean! = false) {
            vflz(vflzId: $vflzId) {
                geschaefte(taskId: $taskId, perPage: $perPage, sortBy: StartDatum, reverse: $reverse) {
                    numPages
                    numResultsTotal
                    page
                    results { title }
                }
            }
        }
    """

    with assert_raises(QueryError, match="Invalid task_id"):
        run_query(
            query=query,
            variable_values={
                "vflzId": str(vflz.vflz_id),
                "taskId": doc2.wf_node_id,
                "perPage": 2,
            },
        )


def test_get_vflz_geschaefte_page_by_task_id_flat_by_faelligkeit(
    session, run_query, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    doc1 = make_document_node(session, vflz, "Document 1")
    doc2 = make_document_node(session, vflz, "Document 2")
    doc3 = make_document_node(session, vflz, "Document 3")
    doc1.started_at = datetime.now()
    doc2.started_at = datetime.now() + timedelta(days=1)
    doc3.started_at = datetime.now() + timedelta(days=2)
    doc3.deadline = datetime.now() + timedelta(days=5)

    query = """
        query q($vflzId: ID!, $taskId: ID!, $perPage: Int!, $reverse: Boolean! = false) {
            vflz(vflzId: $vflzId) {
                geschaefte(taskId: $taskId, perPage: $perPage, sortBy: Faelligkeit, reverse: $reverse) {
                    numPages
                    numResultsTotal
                    page
                    results { title }
                }
            }
        }
    """

    result = run_query(
        query=query,
        variable_values={
            "vflzId": str(vflz.vflz_id),
            "taskId": doc2.wf_node_id,
            "perPage": 2,
        },
    )
    assert result.data["vflz"] == {
        "geschaefte": {
            "numPages": 2,
            "numResultsTotal": 3,
            "page": 2,
            "results": [{"title": "Document 2"}],
        }
    }

    result = run_query(
        query=query,
        variable_values={
            "vflzId": str(vflz.vflz_id),
            "taskId": doc3.wf_node_id,
            "perPage": 2,
        },
    )
    assert result.data["vflz"] == {
        "geschaefte": {
            "numPages": 2,
            "numResultsTotal": 3,
            "page": 1,
            "results": [{"title": "Document 3"}, {"title": "Document 1"}],
        }
    }

    result = run_query(
        query=query,
        variable_values={
            "vflzId": str(vflz.vflz_id),
            "taskId": doc2.wf_node_id,
            "perPage": 1,
            "reverse": True,
        },
    )
    assert result.data["vflz"] == {
        "geschaefte": {
            "numPages": 3,
            "numResultsTotal": 3,
            "page": 1,
            "results": [{"title": "Document 2"}],
        }
    }

    result = run_query(
        query=query,
        variable_values={
            "vflzId": str(vflz.vflz_id),
            "taskId": doc3.wf_node_id,
            "perPage": 1,
            "reverse": True,
        },
    )
    assert result.data["vflz"] == {
        "geschaefte": {
            "numPages": 3,
            "numResultsTotal": 3,
            "page": 3,
            "results": [{"title": "Document 3"}],
        }
    }


def test_get_vflz_geschaefte_page_by_task_id_tree(
    session: Session, run_query, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    doc1 = make_document_node(session, vflz, "Document 1")
    doc2 = make_document_node(session, vflz, "Document 2")
    doc3 = make_document_node(session, vflz, "Document 3")

    doc11 = make_document_node(session, vflz, "Document 1-1")
    doc11.parent = doc1
    doc111 = make_document_node(session, vflz, "Document 1-1-1")
    doc111.parent = doc11

    doc31 = make_document_node(session, vflz, "Document 3-1")
    doc31.parent = doc3
    doc32 = make_document_node(session, vflz, "Document 3-2")
    doc32.parent = doc3

    doc1.started_at = datetime.now()
    doc2.started_at = datetime.now() + timedelta(days=1)
    doc3.started_at = datetime.now() + timedelta(days=2)

    query = """
        query q($vflzId: ID!, $taskId: ID!, $perPage: Int!, $reverse: Boolean! = false) {
            vflz(vflzId: $vflzId) {
                geschaefte(asTree: true, taskId: $taskId, perPage: $perPage, sortBy: StartDatum, reverse: $reverse) {
                    numPages
                    numResultsTotal
                    page
                    results { title }
                }
            }
        }
    """

    result = run_query(
        query=query,
        variable_values={
            "vflzId": str(vflz.vflz_id),
            "taskId": doc2.wf_node_id,
            "perPage": 2,
        },
    )
    assert result.data["vflz"] == {
        "geschaefte": {
            "numPages": 2,
            "numResultsTotal": 7,
            "page": 1,
            "results": [
                {"title": "Document 1"},
                {"title": "Document 2"},
                {"title": "Document 1-1"},
                {"title": "Document 1-1-1"},
            ],
        }
    }

    result = run_query(
        query=query,
        variable_values={
            "vflzId": str(vflz.vflz_id),
            "taskId": doc3.wf_node_id,
            "perPage": 2,
        },
    )
    assert result.data["vflz"] == {
        "geschaefte": {
            "numPages": 2,
            "numResultsTotal": 7,
            "page": 2,
            "results": [
                {"title": "Document 3"},
                {"title": "Document 3-1"},
                {"title": "Document 3-2"},
            ],
        }
    }

    result = run_query(
        query=query,
        variable_values={
            "vflzId": str(vflz.vflz_id),
            "taskId": doc1.wf_node_id,
            "perPage": 1,
            "reverse": True,
        },
    )
    assert result.data["vflz"] == {
        "geschaefte": {
            "numPages": 3,
            "numResultsTotal": 7,
            "page": 3,
            "results": [
                {"title": "Document 1"},
                {"title": "Document 1-1"},
                {"title": "Document 1-1-1"},
            ],
        }
    }


def test_can_access_vflz_via_task(session: Session, run_query, as_lesen_geschaefte):
    vflz = make_vflz(session, "My Site")
    make_document_node(session, vflz, "Document 1")

    query = """
        query q($vflzId: ID!) {
            vflz(vflzId: $vflzId) {
                geschaefte {
                    results { title vflz { bezeichnung } }
                }
            }
        }
    """

    result = run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})
    assert result.data == {
        "vflz": {
            "geschaefte": {
                "results": [
                    {"title": "Document 1", "vflz": {"bezeichnung": "My Site"}}
                ],
            }
        }
    }


def test_update_aufgabe_with_correct_data(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")
    task_node = make_task_node(session, vflz, "Task 1")

    mutation = """
    mutation m($data: UpdateAufgabeInput!) {
        updateAufgabe(data: $data) {
            ... on Aufgabe {
                title
                status
                startDatum
                endDatum
                faelligkeitsDatum
                notiz
            }
        }
    }
    """

    result = run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(task_node.wf_node_id),
                "title": "Task 1 - updated",
                "status": "ABGESCHLOSSEN",
                "startDatum": "2025-03-19",
                "endDatum": "2025-03-20",
                "faelligkeitsDatum": "2025-03-28",
                "notiz": "foo",
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
            }
        },
    )

    assert result.data["updateAufgabe"] == {
        "title": "Task 1 - updated",
        "status": "ABGESCHLOSSEN",
        "startDatum": "2025-03-19",
        "endDatum": "2025-03-20",
        "faelligkeitsDatum": "2025-03-28",
        "notiz": "foo",
    }


def test_update_aufgabe_with_non_null_deadline_if_inactive_raises(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")
    task_node = make_task_node(session, vflz, "Task 1")
    mutation = """
    mutation m($data: UpdateAufgabeInput!) {
        updateAufgabe(data: $data) {
            ... on WorkflowProblemGroup {
                problems {
                    problemCode
                    message
                }
            }
        }
    }
    """

    result = run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(task_node.wf_node_id),
                "title": "Task 1",
                "status": "RUHEND",
                "startDatum": "2025-03-19",
                "endDatum": "2025-03-20",
                "faelligkeitsDatum": "2025-03-28",
                "notiz": None,
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
            }
        },
    )
    assert result.data["updateAufgabe"]["problems"] == [
        {"problemCode": "VALIDATION", "message": "Invalid timestamp values."}
    ]


def test_update_prozess_with_correct_data(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")
    workflow_node = make_workflow_node(session, vflz, "Task 1")

    subj1 = make_subj(session, name="name1")
    subj2 = make_subj(session, name="name2-sachbearbeiter")

    user = auth.User(sub="sub", username="username", email="user@geops.com")
    subj2.user = user

    mutation = """
    mutation m($data: UpdateProzessInput!) {
        updateProzess(data: $data) {
            ... on Prozess {
                title
                status
                startDatum
                endDatum
                faelligkeitsDatum
                notiz
                sachbearbeitung { subjekt { name } }
                sonstigeBeteiligte { subjekt { name } }
            }
        }
    }
    """

    result = run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(workflow_node.wf_node_id),
                "title": "Task 1 - updated",
                "status": "ABGESCHLOSSEN",
                "startDatum": "2025-03-19",
                "endDatum": "2025-03-20",
                "faelligkeitsDatum": "2025-03-28",
                "notiz": "foo",
                "sachbearbeitung": [{"betTaskId": None, "subjId": subj2.subj_id}],
                "sonstigeBeteiligte": [{"betTaskId": None, "subjId": subj1.subj_id}],
            }
        },
    )

    assert result.data["updateProzess"] == {
        "title": "Task 1 - updated",
        "status": "ABGESCHLOSSEN",
        "startDatum": "2025-03-19",
        "endDatum": "2025-03-20",
        "faelligkeitsDatum": "2025-03-28",
        "notiz": "foo",
        "sachbearbeitung": [{"subjekt": {"name": "name2-sachbearbeiter"}}],
        "sonstigeBeteiligte": [{"subjekt": {"name": "name1"}}],
    }


def test_update_dokument_with_correct_data(
    session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")
    document_node = make_document_node(session, vflz, "My Document")

    mutation = """
    mutation m($data: UpdateDokumentInput!) {
        updateDokument(data: $data) {
            title
            startDatum
            notiz
            dokument
            kategorie
            oeffentlich
        }
    }
    """

    result = run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(document_node.wf_node_id),
                "title": "My Document - updated",
                "startDatum": "2025-03-19",
                "notiz": "foo",
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
                "dokument": "bla",
                "kategorie": "code:10022:Kategorie",
                "oeffentlich": True,
            }
        },
    )

    assert result.data["updateDokument"] == {
        "title": "My Document - updated",
        "startDatum": "2025-03-19",
        "notiz": "foo",
        "dokument": "bla",
        "kategorie": "code:10022:Kategorie",
        "oeffentlich": True,
    }


def test_update_dokument_can_set_url(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")
    document_node = make_document_node(session, vflz, "My Document")
    document_node.document_ref = "document-reference"

    mutation = """
    mutation m($data: UpdateDokumentInput!) {
        updateDokument(data: $data) {
            dokument
            url
        }
    }
    """

    result = run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(document_node.wf_node_id),
                "title": "My Document",
                "startDatum": "2025-03-19",
                "notiz": "foo",
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
                "dokument": "document-reference",
                "url": "https://example.com/my-document.pdf",
                "kategorie": None,
                "oeffentlich": True,
            }
        },
    )

    assert result.data["updateDokument"] == {
        "dokument": "document-reference",
        "url": "https://example.com/my-document.pdf",
    }
    session.refresh(document_node)
    assert document_node.url == "https://example.com/my-document.pdf"


def test_update_notiz_with_correct_data(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")
    note_node = make_note_node(session, vflz, "My Note")

    mutation = """
    mutation m($data: UpdateNotizInput!) {
        updateNotiz(data: $data) {
            title
            startDatum
            endDatum
            faelligkeitsDatum
            status
            notiz
            kategorie
            oeffentlich
        }
    }
    """
    result = run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(note_node.wf_node_id),
                "title": "My Note - updated",
                "startDatum": "2025-03-19",
                "notiz": "foo",
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
                "kategorie": "code:10022:Kategorie",
                "oeffentlich": False,
            }
        },
    )

    assert result.data["updateNotiz"] == {
        "title": "My Note - updated",
        "startDatum": "2025-03-19",
        "endDatum": "2025-03-19",
        "faelligkeitsDatum": "2025-03-19",
        "status": "ABGESCHLOSSEN",
        "notiz": "foo",
        "kategorie": "code:10022:Kategorie",
        "oeffentlich": False,
    }


def test_update_notiz_can_set_url(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")
    note_node = make_note_node(session, vflz, "My Note")

    mutation = """
    mutation m($data: UpdateNotizInput!) {
        updateNotiz(data: $data) {
            notiz
            url
        }
    }
    """

    result = run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(note_node.wf_node_id),
                "title": "My Note",
                "startDatum": "2025-03-19",
                "notiz": "foo",
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
                "url": "https://example.com/my-note",
                "kategorie": None,
                "oeffentlich": True,
            }
        },
    )

    assert result.data["updateNotiz"] == {
        "notiz": "foo",
        "url": "https://example.com/my-note",
    }
    session.refresh(note_node)
    assert note_node.url == "https://example.com/my-note"


def test_update_formular_with_correct_data(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")
    form_node = make_form_node(session, vflz, "My Form")

    mutation = """
    mutation m($data: UpdateFormularInput!) {
        updateFormular(data: $data) {
            ... on Formular {
                title
                startDatum
                notiz
            }
        }
    }
    """

    result = run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(form_node.wf_node_id),
                "title": "My Form - updated",
                "startDatum": "2025-03-19",
                "notiz": "foo",
                "eingaben": None,
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
            }
        },
    )

    assert result.data["updateFormular"] == {
        "title": "My Form - updated",
        "startDatum": "2025-03-19",
        "notiz": "foo",
    }


def test_global_flat_mode_sort_criteria(
    session: Session, run_query, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    d1 = make_document_node(session, vflz, "Document 1")
    d2 = make_document_node(session, vflz, "Document 2")
    d3 = make_document_node(session, vflz, "Document 3")
    d4 = make_document_node(session, vflz, "Document 4")

    d1.started_at = datetime.now()
    d1.deadline = None

    d2.started_at = datetime.now() + timedelta(days=1)
    d2.deadline = datetime.now() + timedelta(days=2)

    d3.started_at = datetime.now() + timedelta(days=2)
    d3.deadline = datetime.now() + timedelta(days=2)

    d4.started_at = datetime.now() + timedelta(days=3)
    d4.deadline = datetime.now() + timedelta(days=4)

    session.commit()

    query = """
    query q($sortBy: SortTasks!, $reverse: Boolean!, $page: Int!, $perPage: Int!) {
        geschaefte(asTree: false, sortBy: $sortBy, reverse: $reverse, page: $page, perPage: $perPage) {
            numPages
            numResultsTotal
            results { title }
        }
    }
    """

    result = run_query(
        query=query,
        variable_values={
            "sortBy": "StartDatum",
            "reverse": False,
            "page": 1,
            "perPage": 2,
        },
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 2,
            "numResultsTotal": 4,
            "results": [
                {"title": "Document 1"},
                {"title": "Document 2"},
            ],
        }
    }

    result = run_query(
        query=query,
        variable_values={
            "sortBy": "StartDatum",
            "reverse": False,
            "page": 2,
            "perPage": 2,
        },
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 2,
            "numResultsTotal": 4,
            "results": [
                {"title": "Document 3"},
                {"title": "Document 4"},
            ],
        }
    }

    result = run_query(
        query=query,
        variable_values={
            "sortBy": "StartDatum",
            "reverse": True,
            "page": 1,
            "perPage": 4,
        },
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 1,
            "numResultsTotal": 4,
            "results": [
                {"title": "Document 4"},
                {"title": "Document 3"},
                {"title": "Document 2"},
                {"title": "Document 1"},
            ],
        }
    }

    result = run_query(
        query=query,
        variable_values={
            "sortBy": "Faelligkeit",
            "reverse": False,
            "page": 1,
            "perPage": 4,
        },
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 1,
            "numResultsTotal": 4,
            "results": [
                {"title": "Document 2"},
                {"title": "Document 3"},
                {"title": "Document 4"},
                {"title": "Document 1"},
            ],
        }
    }

    result = run_query(
        query=query,
        variable_values={
            "sortBy": "Faelligkeit",
            "reverse": True,
            "page": 1,
            "perPage": 4,
        },
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 1,
            "numResultsTotal": 4,
            "results": [
                {"title": "Document 1"},
                {"title": "Document 4"},
                {"title": "Document 3"},
                {"title": "Document 2"},
            ],
        }
    }


def test_global_tree_mode_sort_criteria(
    session: Session, run_query, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    d1 = make_document_node(session, vflz, "Document 1")
    d2 = make_document_node(session, vflz, "Document 2")
    d3 = make_document_node(session, vflz, "Document 3")
    d4 = make_document_node(session, vflz, "Document 4")

    d11 = make_document_node(session, vflz, "Document 1-1")
    d11.parent = d1
    d111 = make_document_node(session, vflz, "Document 1-1-1")
    d111.parent = d11
    d31 = make_document_node(session, vflz, "Document 3-1")
    d31.parent = d3
    d32 = make_document_node(session, vflz, "Document 3-2")
    d32.parent = d3

    d1.started_at = datetime.now()
    d1.deadline = None

    d2.started_at = datetime.now() + timedelta(days=1)
    d2.deadline = datetime.now() + timedelta(days=2)

    d3.started_at = datetime.now() + timedelta(days=2)
    d3.deadline = datetime.now() + timedelta(days=2)

    d4.started_at = datetime.now() + timedelta(days=3)
    d4.deadline = datetime.now() + timedelta(days=4)

    session.commit()

    query = """
    query q($sortBy: SortTasks!, $reverse: Boolean!, $page: Int!, $perPage: Int!) {
        geschaefte(asTree: true, sortBy: $sortBy, reverse: $reverse, page: $page, perPage: $perPage) {
            numPages
            numResultsTotal
            results { title }
        }
    }
    """

    result = run_query(
        query=query,
        variable_values={
            "sortBy": "StartDatum",
            "reverse": False,
            "page": 1,
            "perPage": 2,
        },
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 2,
            "numResultsTotal": 8,
            "results": [
                {"title": "Document 1"},
                {"title": "Document 2"},
                {"title": "Document 1-1"},
                {"title": "Document 1-1-1"},
            ],
        }
    }

    result = run_query(
        query=query,
        variable_values={
            "sortBy": "StartDatum",
            "reverse": False,
            "page": 2,
            "perPage": 2,
        },
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 2,
            "numResultsTotal": 8,
            "results": [
                {"title": "Document 3"},
                {"title": "Document 4"},
                {"title": "Document 3-1"},
                {"title": "Document 3-2"},
            ],
        }
    }

    result = run_query(
        query=query,
        variable_values={
            "sortBy": "StartDatum",
            "reverse": True,
            "page": 1,
            "perPage": 4,
        },
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 1,
            "numResultsTotal": 8,
            "results": [
                {"title": "Document 4"},
                {"title": "Document 3"},
                {"title": "Document 2"},
                {"title": "Document 1"},
                {"title": "Document 3-2"},
                {"title": "Document 3-1"},
                {"title": "Document 1-1"},
                {"title": "Document 1-1-1"},
            ],
        }
    }

    result = run_query(
        query=query,
        variable_values={
            "sortBy": "Faelligkeit",
            "reverse": False,
            "page": 1,
            "perPage": 4,
        },
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 1,
            "numResultsTotal": 8,
            "results": [
                {"title": "Document 2"},
                {"title": "Document 3"},
                {"title": "Document 4"},
                {"title": "Document 1"},
                {"title": "Document 1-1"},
                {"title": "Document 3-1"},
                {"title": "Document 3-2"},
                {"title": "Document 1-1-1"},
            ],
        }
    }

    result = run_query(
        query=query,
        variable_values={
            "sortBy": "Faelligkeit",
            "reverse": True,
            "page": 1,
            "perPage": 4,
        },
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 1,
            "numResultsTotal": 8,
            "results": [
                {"title": "Document 1"},
                {"title": "Document 4"},
                {"title": "Document 3"},
                {"title": "Document 2"},
                {"title": "Document 3-2"},
                {"title": "Document 3-1"},
                {"title": "Document 1-1"},
                {"title": "Document 1-1-1"},
            ],
        }
    }


@pytest.mark.parametrize(
    ("field_definitions", "field_data", "problem_message"),
    [
        (
            [
                {"name": "integer_field", "type": "int"},
                {
                    "name": "choices_field",
                    "type": "str",
                    "choices": [
                        {"label": "foo-label", "value": "foo"},
                        {"label": "bar-label", "value": "bar"},
                    ],
                },
            ],
            {"integer_field": "3", "choices_field": "foo"},
            None,
        ),
        (
            [
                {"name": "integer_field", "type": "int"},
                {
                    "name": "choices_field",
                    "type": "str",
                    "choices": [
                        {"label": "foo-label", "value": "foo"},
                        {"label": "bar-label", "value": "bar"},
                    ],
                },
            ],
            {"integer_field": "string", "choices_field": "foo"},
            "Field value not allowed",
        ),
        (
            [
                {"name": "integer_field", "type": "int"},
                {
                    "name": "choices_field",
                    "type": "str",
                    "choices": [
                        {"label": "foo-label", "value": "foo"},
                        {"label": "bar-label", "value": "bar"},
                    ],
                },
            ],
            {"foo_field": "string", "choices_field": "foo"},
            "Form fields to be set do not match form configuration.",
        ),
        (
            [
                {"name": "integer_field", "type": "int"},
                {
                    "name": "choices_field",
                    "type": "str",
                    "choices": [
                        {"label": "foo-label", "value": "foo"},
                        {"label": "bar-label", "value": "bar"},
                    ],
                },
            ],
            {"integer_field": "3", "choices_field": "bazz"},
            "Choice value bazz not found in choices values.",
        ),
        (
            [
                {"name": "integer_field", "type": "int"},
            ],
            {"integer_field": "3", "choices_field": "3"},
            "Form fields to be set do not match form configuration.",
        ),
    ],
)
def test_update_formular_with_form_data(
    session: Session,
    run_query,
    as_bearbeiten_geschaefte,
    field_definitions: list[dict[str, Any]],
    field_data: dict[str, Any],
    problem_message: str | None,
):
    vflz = make_vflz(session, "My Site")
    form_node = make_form_node(session, vflz)
    form_node.form_config["fields"] = field_definitions

    mutation = """
    mutation m($data: UpdateFormularInput!) {
        updateFormular(data: $data) {
            ... on Formular {
                eingaben
            }
            ... on ProblemGroup {
                problems {
                    problemCode
                    message
                }
            }
        }
    }
    """

    result = run_query(
        mutation,
        variable_values={
            "data": {
                "taskId": str(form_node.wf_node_id),
                "title": "My Task",
                "startDatum": "2025-03-20",
                "eingaben": field_data,
                "notiz": None,
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
            }
        },
    )

    if problem_message is None:
        assert "problems" not in result.data["updateFormular"]
        assert result.data["updateFormular"]["eingaben"] == field_data
    else:
        assert (
            result.data["updateFormular"]["problems"][0]["message"] == problem_message
        )


def test_query_dokument_by_id(session, run_query, as_lesen_geschaefte):
    vflz = make_vflz(session, "My Site")
    d1 = make_document_node(session, vflz, "Document 1")
    d1.document_ref = "foo"
    d1.title = "titel"
    d1.status = NodeStatus.FINISHED
    d1.started_at = datetime(2020, 1, 1)
    query = """
    query q($taskId: ID!) {
        task(taskId: $taskId) {
            ... on Dokument {
                taskId
                title
                type
                status
                startDatum
                vflz { vflzId }
                dokument
            }
        }
    }
    """

    result = run_query(query, {"taskId": str(d1.wf_node_id)})
    assert result.data["task"] == {
        "taskId": str(d1.wf_node_id),
        "title": "titel",
        "status": "ABGESCHLOSSEN",
        "startDatum": date(2020, 1, 1).isoformat(),
        "vflz": {"vflzId": str(vflz.vflz_id)},
        "dokument": "foo",
        "type": "DOKUMENT",
    }


def test_query_dokument_by_id_returns_url(
    session: Session, run_query, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    document_node = make_document_node(session, vflz, "Document 1")
    document_node.document_ref = "document-reference"
    document_node.url = "https://example.com/document.pdf"
    document_node.title = "titel"
    document_node.status = NodeStatus.FINISHED
    document_node.started_at = datetime(2020, 1, 1)
    query = """
    query q($taskId: ID!) {
        task(taskId: $taskId) {
            ... on Dokument {
                dokument
                url
            }
        }
    }
    """

    result = run_query(query, {"taskId": str(document_node.wf_node_id)})
    assert result.data["task"] == {
        "dokument": "document-reference",
        "url": "https://example.com/document.pdf",
    }


def test_query_formular_by_id(session: Session, run_query, as_lesen_geschaefte):
    vflz = make_vflz(session, "My Site")
    f1 = make_form_node(session, vflz, "Document 1")
    f1.title = "titel"
    f1.status = NodeStatus.FINISHED
    f1.started_at = datetime(2020, 1, 1)
    query = """
    query q($taskId: ID!) {
        task(taskId: $taskId) {
            ... on Formular {
                taskId
                title
                type
                status
                startDatum
                vflz { vflzId }
            }
        }
    }
    """

    result = run_query(query, {"taskId": str(f1.wf_node_id)})
    assert result.data["task"] == {
        "taskId": str(f1.wf_node_id),
        "title": "titel",
        "status": "ABGESCHLOSSEN",
        "startDatum": date(2020, 1, 1).isoformat(),
        "vflz": {"vflzId": str(vflz.vflz_id)},
        "type": "FORMULAR",
    }


def test_query_notiz_by_id(session, run_query, as_lesen_geschaefte):
    vflz = make_vflz(session, "My Site")
    n1 = make_note_node(session, vflz, "Document 1")
    n1.title = "titel"
    n1.status = NodeStatus.FINISHED
    n1.started_at = datetime(2020, 1, 1)
    query = """
    query q($taskId: ID!) {
        task(taskId: $taskId) {
            ... on Notiz {
                taskId
                title
                type
                status
                startDatum
                vflz { vflzId }
            }
        }
    }
    """

    result = run_query(query, {"taskId": str(n1.wf_node_id)})
    assert result.data["task"] == {
        "taskId": str(n1.wf_node_id),
        "title": "titel",
        "status": "ABGESCHLOSSEN",
        "startDatum": date(2020, 1, 1).isoformat(),
        "vflz": {"vflzId": str(vflz.vflz_id)},
        "type": "NOTIZ",
    }


def test_query_notiz_by_id_returns_url(
    session: Session, run_query, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    note_node = make_note_node(session, vflz, "Note 1")
    note_node.url = "https://example.com/note"
    note_node.title = "titel"
    note_node.status = NodeStatus.FINISHED
    note_node.started_at = datetime(2020, 1, 1)
    query = """
    query q($taskId: ID!) {
        task(taskId: $taskId) {
            ... on Notiz {
                notiz
                url
            }
        }
    }
    """

    result = run_query(query, {"taskId": str(note_node.wf_node_id)})
    assert result.data["task"] == {
        "notiz": None,
        "url": "https://example.com/note",
    }


def test_query_aufgabe_by_id(session: Session, run_query, as_lesen_geschaefte):
    vflz = make_vflz(session, "My Site")
    a1 = make_task_node(session, vflz, "Document 1")
    a1.title = "titel"
    a1.status = NodeStatus.FINISHED
    a1.started_at = datetime(2020, 1, 1)
    query = """
    query q($taskId: ID!) {
        task(taskId: $taskId) {
            ... on Aufgabe {
                taskId
                title
                type
                status
                startDatum
                vflz { vflzId }
            }
        }
    }
    """

    result = run_query(query, {"taskId": str(a1.wf_node_id)})
    assert result.data["task"] == {
        "taskId": str(a1.wf_node_id),
        "title": "titel",
        "status": "ABGESCHLOSSEN",
        "startDatum": date(2020, 1, 1).isoformat(),
        "vflz": {"vflzId": str(vflz.vflz_id)},
        "type": "AUFGABE",
    }


def test_query_prozess_by_id(session: Session, run_query, as_lesen_geschaefte):
    vflz = make_vflz(session, "My Site")
    p1 = make_workflow_node(session, vflz, "Document 1")
    p1.title = "titel"
    p1.status = NodeStatus.FINISHED
    p1.started_at = datetime(2020, 1, 1)
    query = """
    query q($taskId: ID!) {
        task(taskId: $taskId) {
            ... on Prozess {
                taskId
                title
                type
                status
                startDatum
                vflz { vflzId }
            }
        }
    }
    """

    result = run_query(query, {"taskId": str(p1.wf_node_id)})
    assert result.data["task"] == {
        "taskId": str(p1.wf_node_id),
        "title": "titel",
        "status": "ABGESCHLOSSEN",
        "startDatum": date(2020, 1, 1).isoformat(),
        "vflz": {"vflzId": str(vflz.vflz_id)},
        "type": "PROZESS",
    }


def test_create_new_notiz(session: Session, run_query, as_bearbeiten_geschaefte):
    vflz = make_vflz(session, "Standort 1")
    mutation = """
    mutation m($data: CreateNotizInput!) {
        createNotiz(data: $data) {
            startDatum
            endDatum
            faelligkeitsDatum
            notiz
            kategorie
            oeffentlich
            title
            vflz {
                vflzId
            }
            status
            sachbearbeitung { subjekt { user { username } } }
        }
    }
    """

    variables = {
        "data": {
            "title": "Notiz Titel",
            "startDatum": date(2020, 1, 1).isoformat(),
            "vflzId": str(vflz.vflz_id),
            "notiz": "Notiz",
            "kategorie": "code:10022:Kategorie",
            "oeffentlich": True,
        }
    }

    result = run_query(mutation, variables)
    assert result.data["createNotiz"] == {
        "startDatum": "2020-01-01",
        "endDatum": "2020-01-01",
        "notiz": "Notiz",
        "title": "Notiz Titel",
        "faelligkeitsDatum": "2020-01-01",
        "vflz": {
            "vflzId": str(vflz.vflz_id),
        },
        "status": "ABGESCHLOSSEN",
        "sachbearbeitung": [{"subjekt": {"user": {"username": "alma-test"}}}],
        "kategorie": "code:10022:Kategorie",
        "oeffentlich": True,
    }


def test_create_new_notiz_with_url(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "Standort 1")
    mutation = """
    mutation m($data: CreateNotizInput!) {
        createNotiz(data: $data) {
            notiz
            url
        }
    }
    """

    result = run_query(
        mutation,
        {
            "data": {
                "title": "Notiz Titel",
                "startDatum": date(2020, 1, 1).isoformat(),
                "vflzId": str(vflz.vflz_id),
                "notiz": "Notiz",
                "url": "https://example.com/new-note",
                "kategorie": "code:10022:Kategorie",
                "oeffentlich": True,
            }
        },
    )

    assert result.data["createNotiz"] == {
        "notiz": "Notiz",
        "url": "https://example.com/new-note",
    }


def test_create_new_dokument(session: Session, run_query, as_bearbeiten_geschaefte):
    vflz = make_vflz(session, "Standort 1")
    mutation = """
    mutation m($data: CreateDokumentInput!) {
        createDokument(data: $data) {
            startDatum
            endDatum
            faelligkeitsDatum
            notiz
            title
            vflz {
                vflzId
            }
            status
            dokument
            sachbearbeitung { subjekt { user { username } } }
            kategorie
            oeffentlich
        }
    }
    """

    variables = {
        "data": {
            "title": "Dokument Titel",
            "startDatum": date(2020, 1, 1).isoformat(),
            "vflzId": str(vflz.vflz_id),
            "notiz": "Notiz",
            "dokument": "dummy",
            "kategorie": "code:10022:Kategorie",
            "oeffentlich": True,
        }
    }

    result = run_query(mutation, variables)
    assert result.data["createDokument"] == {
        "startDatum": "2020-01-01",
        "endDatum": "2020-01-01",
        "notiz": "Notiz",
        "title": "Dokument Titel",
        "faelligkeitsDatum": "2020-01-01",
        "vflz": {
            "vflzId": str(vflz.vflz_id),
        },
        "status": "ABGESCHLOSSEN",
        "dokument": "dummy",
        "sachbearbeitung": [{"subjekt": {"user": {"username": "alma-test"}}}],
        "kategorie": "code:10022:Kategorie",
        "oeffentlich": True,
    }


def test_create_new_dokument_with_url(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "Standort 1")
    mutation = """
    mutation m($data: CreateDokumentInput!) {
        createDokument(data: $data) {
            dokument
            url
        }
    }
    """

    result = run_query(
        mutation,
        {
            "data": {
                "title": "Dokument Titel",
                "startDatum": date(2020, 1, 1).isoformat(),
                "vflzId": str(vflz.vflz_id),
                "notiz": "Notiz",
                "dokument": "",
                "url": "https://example.com/new-document.pdf",
                "kategorie": "code:10022:Kategorie",
                "oeffentlich": True,
            }
        },
    )

    assert result.data["createDokument"] == {
        "dokument": "",
        "url": "https://example.com/new-document.pdf",
    }


def test_create_new_aufgabe(session: Session, run_query, as_bearbeiten_geschaefte):
    vflz = make_vflz(session, "Standort 1")
    mutation = """
    mutation m($data: CreateAufgabeInput!) {
        createAufgabe(data: $data) {
            startDatum
            endDatum
            faelligkeitsDatum
            notiz
            title
            vflz {
                vflzId
            }
            status
            sachbearbeitung { subjekt { user { username } } }
        }
    }
    """

    variables = {
        "data": {
            "title": "Aufgabe Titel",
            "faelligkeitsDatum": date(2021, 1, 1).isoformat(),
            "vflzId": str(vflz.vflz_id),
            "notiz": "Notiz",
            "startDatum": date(2020, 1, 1).isoformat(),
        }
    }

    result = run_query(mutation, variables)
    assert result.data["createAufgabe"] == {
        "startDatum": "2020-01-01",
        "endDatum": None,
        "notiz": "Notiz",
        "title": "Aufgabe Titel",
        "faelligkeitsDatum": "2021-01-01",
        "vflz": {
            "vflzId": str(vflz.vflz_id),
        },
        "status": "OFFEN",
        "sachbearbeitung": [{"subjekt": {"user": {"username": "alma-test"}}}],
    }


def test_create_new_aufgabe_with_task_id(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "Standort 1")

    workflow_node = make_workflow_node(session, vflz, "My Workflow")

    task_node = make_task_node(session, vflz, "My Task")
    task_node.parent = workflow_node

    document_node = make_document_node(session, vflz, "My Document")
    document_node.parent = task_node

    session.flush()

    mutation = """
    mutation m($data: CreateAufgabeInput!) {
        createAufgabe(data: $data) {
            taskId
            title
        }
    }
    """

    variables = {
        "data": {
            "title": "Aufgabe Titel",
            "faelligkeitsDatum": date(2021, 1, 1).isoformat(),
            "vflzId": str(vflz.vflz_id),
            "notiz": "Notiz",
            "startDatum": date(2020, 1, 1).isoformat(),
        }
    }

    # Can create aufgabe under prozess
    variables["data"]["taskId"] = str(workflow_node.wf_node_id)
    result = run_query(mutation, variables)
    new_node = session.get_one(
        wf_models.TaskNode, result.data["createAufgabe"]["taskId"]
    )
    assert new_node.parent is workflow_node

    # Creating aufgabe under other aufgabe puts it under parent prozess
    variables["data"]["taskId"] = str(task_node.wf_node_id)
    result = run_query(mutation, variables)
    new_node = session.get_one(
        wf_models.TaskNode, result.data["createAufgabe"]["taskId"]
    )
    assert new_node.parent is workflow_node

    # Creating aufgabe under document puts it under grandparent prozess
    variables["data"]["taskId"] = str(document_node.wf_node_id)
    result = run_query(mutation, variables)
    new_node = session.get_one(
        wf_models.TaskNode, result.data["createAufgabe"]["taskId"]
    )
    assert new_node.parent is workflow_node


def test_create_new_document_with_task_id(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "Standort 1")

    workflow_node = make_workflow_node(session, vflz, "My Workflow")

    task_node = make_task_node(session, vflz, "My Task")
    task_node.parent = workflow_node

    document_node = make_document_node(session, vflz, "My Document")
    document_node.parent = task_node

    session.flush()

    mutation = """
    mutation m($data: CreateDokumentInput!) {
        createDokument(data: $data) {
            taskId
            title
        }
    }
    """

    variables = {
        "data": {
            "title": "Dokument Titel",
            "vflzId": str(vflz.vflz_id),
            "notiz": "Notiz",
            "startDatum": date(2020, 1, 1).isoformat(),
            "dokument": "dokument-referenz",
            "kategorie": None,
            "oeffentlich": False,
        }
    }

    # Can create dokument under prozess
    variables["data"]["taskId"] = str(workflow_node.wf_node_id)
    result = run_query(mutation, variables)
    new_node = session.get_one(
        wf_models.DocumentNode, result.data["createDokument"]["taskId"]
    )
    assert new_node.parent is workflow_node

    # Can create dokument under aufgabe
    variables["data"]["taskId"] = str(task_node.wf_node_id)
    result = run_query(mutation, variables)
    new_node = session.get_one(
        wf_models.DocumentNode, result.data["createDokument"]["taskId"]
    )
    assert new_node.parent is task_node

    # Creating dokument under other dokument puts it under parent aufgabe
    variables["data"]["taskId"] = str(document_node.wf_node_id)
    result = run_query(mutation, variables)
    new_node = session.get_one(
        wf_models.DocumentNode, result.data["createDokument"]["taskId"]
    )
    assert new_node.parent is task_node


def test_create_new_notiz_with_task_id(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "Standort 1")

    workflow_node = make_workflow_node(session, vflz, "My Workflow")

    task_node = make_task_node(session, vflz, "My Task")
    task_node.parent = workflow_node

    document_node = make_document_node(session, vflz, "My Document")
    document_node.parent = task_node

    session.flush()

    mutation = """
    mutation m($data: CreateNotizInput!) {
        createNotiz(data: $data) {
            taskId
            title
        }
    }
    """

    variables = {
        "data": {
            "title": "Dokument Titel",
            "vflzId": str(vflz.vflz_id),
            "notiz": "Notiz",
            "startDatum": date(2020, 1, 1).isoformat(),
            "kategorie": None,
            "oeffentlich": False,
        }
    }

    # Can create notiz under prozess
    variables["data"]["taskId"] = str(workflow_node.wf_node_id)
    result = run_query(mutation, variables)
    new_node = session.get_one(wf_models.NoteNode, result.data["createNotiz"]["taskId"])
    assert new_node.parent is workflow_node

    # Can create notiz under aufgabe
    variables["data"]["taskId"] = str(task_node.wf_node_id)
    result = run_query(mutation, variables)
    new_node = session.get_one(wf_models.NoteNode, result.data["createNotiz"]["taskId"])
    assert new_node.parent is task_node

    # Creating notiz under dokument puts it under parent aufgabe
    variables["data"]["taskId"] = str(document_node.wf_node_id)
    result = run_query(mutation, variables)
    new_node = session.get_one(wf_models.NoteNode, result.data["createNotiz"]["taskId"])
    assert new_node.parent is task_node


@pytest.mark.parametrize(
    "geschaefte_filter, results",
    [
        (
            {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 4"}, {"title": "Document 5"}, {"title": "Document 3"}],
        ),
        (
            {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": ["UEBERFAELLIG"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 3"}],
        ),
        (
            {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_NAECHSTE_WOCHE"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [],
        ),
        (
            {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": ["RUHEND"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 4"}],
        ),
        (
            {
                "status": ["ABGESCHLOSSEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 1"}, {"title": "Notiz"}],
        ),
        (
            {
                "status": ["ABGESCHLOSSEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": ["NOTIZ", "DOKUMENT"],
                "titel": None,
            },
            [{"title": "Document 1"}, {"title": "Notiz"}],
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 2"}],
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_NAECHSTE_WOCHE"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [],
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 2"}],
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER"],
                "teilflaechen": ["does not exist"],
                "taskTyp": None,
                "titel": None,
            },
            [],
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER"],
                "teilflaechen": ["combined-id-1"],
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 2"}],
        ),
        (
            {
                "status": None,
                "eigene": False,
                "faelligkeit": ["RUHEND"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 1"}, {"title": "Document 4"}],
        ),
        (
            {
                "status": ["ABGESCHLOSSEN", "UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER", "RUHEND"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 1"}, {"title": "Document 2"}],
        ),
        (
            {
                "status": ["ABGESCHLOSSEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": ["NOTIZ"],
                "titel": None,
            },
            [{"title": "Notiz"}],
        ),
        (
            {
                "status": ["ABGESCHLOSSEN", "UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER", "RUHEND"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": "ocum",
            },
            [{"title": "Document 1"}, {"title": "Document 2"}],
        ),
    ],
)
def test_global_geschaefte_page_filtered_flat(
    session: Session, run_query, as_lesen_geschaefte, geschaefte_filter, results
):
    vflz = make_vflz(session, "My Site")
    doc1 = make_document_node(session, vflz, "Document 1")
    doc2 = make_document_node(session, vflz, "Document 2")
    doc3 = make_document_node(session, vflz, "Document 3")
    doc4 = make_document_node(session, vflz, "Document 4")
    doc5 = make_document_node(session, vflz, "Document 5")
    note = make_note_node(session, vflz, "Notiz")

    note.status = NodeStatus.FINISHED
    note.deadline = datetime.now() + timedelta(weeks=3)

    doc1.started_at = datetime.now()
    doc1.deadline = None
    doc1.status = NodeStatus.FINISHED

    doc2.started_at = datetime.now() + timedelta(days=1)
    doc2.status = NodeStatus.SKIPPED
    doc2.deadline = datetime.now() + timedelta(weeks=5)

    doc3.started_at = datetime.now() + timedelta(days=2)
    doc3.deadline = datetime.now() - timedelta(hours=1)

    doc4.started_at = datetime.now()
    doc4.deadline = None

    doc5.started_at = datetime.now()
    doc5.deadline = datetime.now() + timedelta(weeks=5)

    query = """
        query q($perPage: Int!, $reverse: Boolean! = false, $filter: GeschaefteFilter!) {
            geschaefte(perPage: $perPage, sortBy: StartDatum, reverse: $reverse, filter: $filter, asTree: false) {
                numPages
                numResultsTotal
                page
                results { title }
            }
        }
    """

    result = run_query(
        query=query, variable_values={"perPage": 4, "filter": geschaefte_filter}
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 1 if results else 0,
            "numResultsTotal": len(results),
            "page": 1,
            "results": results,
        }
    }


def test_global_geschaefte_page_filtered_by_translated_title(
    session: Session, run_query, as_lesen_geschaefte
):
    """
    Titles coming from workflow templates are stored on `wf_node.title` as a
    translation key (msgid) rather than as literal text; the actual text is
    looked up in the `translations` table. The title filter must therefore
    also match against the translated text, not just the literal column value.
    """
    vflz = make_vflz(session, "My Site")
    doc = make_document_node(session, vflz, "task:oreb:title")
    make_translation(session, Language.DE, "task:oreb:title", "ÖREB Auszug")

    query = """
        query q($perPage: Int!, $filter: GeschaefteFilter!) {
            geschaefte(perPage: $perPage, sortBy: StartDatum, filter: $filter, asTree: false) {
                numResultsTotal
                results { title }
            }
        }
    """

    result = run_query(
        query=query,
        variable_values={
            "perPage": 10,
            "filter": {
                "status": None,
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": "ÖREB",
            },
        },
    )
    assert result.data == {
        "geschaefte": {
            "numResultsTotal": 1,
            "results": [{"title": doc.title}],
        }
    }


@pytest.mark.parametrize(
    "geschaefte_filter, results",
    [
        (
            {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 4"}, {"title": "Document 3"}],
        ),
        (
            {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": ["UEBERFAELLIG"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 3"}],
        ),
        (
            {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_NAECHSTE_WOCHE"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [],
        ),
        (
            {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": ["RUHEND"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 4"}],
        ),
        (
            {
                "status": ["ABGESCHLOSSEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 1"}, {"title": "Notiz"}],
        ),
        (
            {
                "status": ["ABGESCHLOSSEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": ["NOTIZ", "DOKUMENT"],
                "titel": None,
            },
            [{"title": "Document 1"}, {"title": "Notiz"}],
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 2"}],
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_NAECHSTE_WOCHE"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [],
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 2"}],
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER"],
                "teilflaechen": ["does not exist"],
                "taskTyp": None,
                "titel": None,
            },
            [],
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER"],
                "teilflaechen": ["combined-id-1"],
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 2"}],
        ),
        (
            {
                "status": None,
                "eigene": False,
                "faelligkeit": ["RUHEND"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 1"}, {"title": "Document 4"}],
        ),
        (
            {
                "status": ["ABGESCHLOSSEN", "UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER", "RUHEND"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 1"}, {"title": "Document 2"}],
        ),
        (
            {
                "status": ["ABGESCHLOSSEN", "UEBERSPRUNGEN"],
                "eigene": True,
                "faelligkeit": ["FAELLIG_SPAETER", "RUHEND"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 1"}],
        ),
        (
            {
                "status": ["ABGESCHLOSSEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": ["NOTIZ"],
                "titel": None,
            },
            [{"title": "Notiz"}],
        ),
        (
            {
                "status": ["ABGESCHLOSSEN", "UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER", "RUHEND"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": "ument 2",
            },
            [{"title": "Document 2"}],
        ),
    ],
)
def test_filter_vflz_geschaefte_flat(
    session, run_query, as_lesen_geschaefte, geschaefte_filter, results, context
):
    vflz = make_vflz(session, "My Site")
    doc1 = make_document_node(session, vflz, "Document 1")
    doc2 = make_document_node(session, vflz, "Document 2")
    doc3 = make_document_node(session, vflz, "Document 3")
    doc4 = make_document_node(session, vflz, "Document 4")
    note = make_note_node(session, vflz, "Notiz")

    note.status = NodeStatus.FINISHED
    note.deadline = datetime.now() + timedelta(weeks=3)

    doc1.started_at = datetime.now()
    doc1.deadline = None
    doc1.status = NodeStatus.FINISHED

    doc2.started_at = datetime.now() + timedelta(days=1)
    doc2.status = NodeStatus.SKIPPED
    doc2.deadline = datetime.now() + timedelta(weeks=5)

    doc3.started_at = datetime.now() + timedelta(days=2)
    doc3.deadline = datetime.now() - timedelta(hours=1)

    doc4.started_at = datetime.now()
    doc4.deadline = None

    subj = make_subj(
        session, name="Fleissig", vorname="Frieda", taetigkeit="Productownerin"
    )
    subj.user = context.user

    make_beteiligter_geschaeft(session, subjekt=subj, node=doc1)

    query = """
        query q($vflzId: ID!, $perPage: Int!, $filter: GeschaefteFilter!) {
            vflz(vflzId: $vflzId) {
                geschaefte(perPage: $perPage, sortBy: StartDatum, filter: $filter, asTree: false) {
                    numPages
                    numResultsTotal
                    page
                    results { title }
                }
            }
        }
    """

    result = run_query(
        query=query,
        variable_values={
            "vflzId": str(vflz.vflz_id),
            "perPage": 10,
            "filter": geschaefte_filter,
        },
    )
    assert result.data["vflz"] == {
        "geschaefte": {
            "numPages": 1 if results else 0,
            "numResultsTotal": len(results),
            "page": 1,
            "results": results,
        }
    }


@pytest.mark.parametrize(
    "geschaefte_filter, results, num_results_total",
    [
        (
            {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [
                {"title": "Document 1"},
                {"title": "Document 3"},
                {"title": "Document 4"},
                {"title": "Document 1-1"},
                {"title": "Document 3-2"},
            ],
            3,
        ),
        (
            {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": ["UEBERFAELLIG"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [
                {"title": "Document 3"},
            ],
            1,
        ),
        (
            {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_NAECHSTE_WOCHE"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [],
            0,
        ),
        (
            {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": ["RUHEND"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [
                {"title": "Document 1"},
                {"title": "Document 3"},
                {"title": "Document 4"},
                {"title": "Document 1-1"},
                {"title": "Document 3-2"},
            ],
            3,
        ),
        (
            {
                "status": ["ABGESCHLOSSEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [
                {"title": "Document 1"},
                {"title": "Notiz"},
                {"title": "Document 3"},
                {"title": "Document 3-1"},
            ],
            3,
        ),
        (
            {
                "status": ["ABGESCHLOSSEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": ["NOTIZ", "DOKUMENT"],
                "titel": None,
            },
            [
                {"title": "Document 1"},
                {"title": "Notiz"},
                {"title": "Document 3"},
                {"title": "Document 3-1"},
            ],
            3,
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [
                {"title": "Document 1"},
                {"title": "Document 2"},
                {"title": "Document 1-1"},
                {"title": "Document 1-1-1"},
            ],
            2,
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_NAECHSTE_WOCHE"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [
                {"title": "Document 1"},
                {"title": "Document 1-1"},
                {"title": "Document 1-1-1"},
            ],
            1,
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 2"}],
            1,
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER"],
                "teilflaechen": ["does not exist"],
                "taskTyp": None,
                "titel": None,
            },
            [],
            0,
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER"],
                "teilflaechen": ["combined-id-1"],
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 2"}],
            1,
        ),
        (
            {
                "status": None,
                "eigene": False,
                "faelligkeit": ["RUHEND"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [
                {"title": "Document 1"},
                {"title": "Document 3"},
                {"title": "Document 4"},
                {"title": "Document 1-1"},
                {"title": "Document 3-2"},
            ],
            3,
        ),
        (
            {
                "status": ["ABGESCHLOSSEN", "UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER", "RUHEND"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [
                {"title": "Document 1"},
                {"title": "Document 2"},
                {"title": "Document 3"},
                {"title": "Document 3-1"},
            ],
            3,
        ),
        (
            {
                "status": ["ABGESCHLOSSEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": ["NOTIZ"],
                "titel": None,
            },
            [
                {"title": "Notiz"},
            ],
            1,
        ),
        (
            {
                "status": ["ABGESCHLOSSEN", "UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER", "RUHEND"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": "3",
            },
            [
                {"title": "Document 3"},
                {"title": "Document 3-1"},
            ],
            1,
        ),
    ],
)
def test_filter_global_geschaefte_page_tree(
    session: Session,
    run_query,
    as_lesen_geschaefte,
    geschaefte_filter,
    results,
    num_results_total,
):
    vflz = make_vflz(session, "My Site")
    doc1 = make_document_node(session, vflz, "Document 1")
    doc2 = make_document_node(session, vflz, "Document 2")
    doc3 = make_document_node(session, vflz, "Document 3")
    doc4 = make_document_node(session, vflz, "Document 4")
    note = make_note_node(session, vflz, "Notiz")

    note.status = NodeStatus.FINISHED
    note.deadline = datetime.now() + timedelta(weeks=3)

    doc1.started_at = datetime.now()
    doc1.deadline = None
    doc1.status = NodeStatus.FINISHED

    doc2.started_at = datetime.now() + timedelta(days=1)
    doc2.status = NodeStatus.SKIPPED
    doc2.deadline = datetime.now() + timedelta(weeks=5)

    doc3.started_at = datetime.now() + timedelta(days=2)
    doc3.deadline = datetime.now() - timedelta(hours=1)

    doc4.started_at = datetime.now() + timedelta(days=3)
    doc4.deadline = None

    doc11 = make_document_node(session, vflz, "Document 1-1")
    doc11.started_at = datetime.now() + timedelta(days=5)
    doc11.parent = doc1

    doc111 = make_document_node(session, vflz, "Document 1-1-1")
    doc111.parent = doc11
    doc111.status = NodeStatus.SKIPPED
    doc111.started_at = datetime.now() + timedelta(days=6)
    doc111.deadline = datetime.now() + timedelta(hours=10)

    doc31 = make_document_node(session, vflz, "Document 3-1")
    doc31.parent = doc3
    doc31.status = NodeStatus.FINISHED
    doc31.started_at = datetime.now() + timedelta(days=7)
    doc31.deadline = datetime.now() + timedelta(weeks=5)

    doc32 = make_document_node(session, vflz, "Document 3-2")
    doc32.parent = doc3
    doc32.started_at = datetime.now() + timedelta(days=8)
    doc32.deadline = None

    query = """
        query q($perPage: Int!, $reverse: Boolean! = false, $filter: GeschaefteFilter) {
            geschaefte(asTree: true, perPage: $perPage, sortBy: StartDatum, reverse: $reverse, filter: $filter) {
                numPages
                numResultsTotal
                page
                results { title }
            }
        }
    """

    result = run_query(
        query=query, variable_values={"filter": geschaefte_filter, "perPage": 10}
    )
    assert result.data == {
        "geschaefte": {
            "numPages": 1 if num_results_total > 0 else 0,
            "numResultsTotal": len(results),
            "page": 1,
            "results": results,
        }
    }


@pytest.mark.parametrize(
    "geschaefte_filter, results, num_results_total",
    [
        (
            {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [
                {"title": "Document 1"},
                {"title": "Document 3"},
                {"title": "Document 4"},
                {"title": "Document 1-1"},
                {"title": "Document 3-2"},
            ],
            3,
        ),
        (
            {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": ["UEBERFAELLIG"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [
                {"title": "Document 3"},
            ],
            1,
        ),
        (
            {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_NAECHSTE_WOCHE"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [],
            0,
        ),
        (
            {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": ["RUHEND"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [
                {"title": "Document 1"},
                {"title": "Document 3"},
                {"title": "Document 4"},
                {"title": "Document 1-1"},
                {"title": "Document 3-2"},
            ],
            3,
        ),
        (
            {
                "status": ["ABGESCHLOSSEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [
                {"title": "Document 1"},
                {"title": "Notiz"},
                {"title": "Document 3"},
                {"title": "Document 3-1"},
            ],
            3,
        ),
        (
            {
                "status": ["ABGESCHLOSSEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": ["NOTIZ", "DOKUMENT"],
                "titel": None,
            },
            [
                {"title": "Document 1"},
                {"title": "Notiz"},
                {"title": "Document 3"},
                {"title": "Document 3-1"},
            ],
            3,
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [
                {"title": "Document 1"},
                {"title": "Document 2"},
                {"title": "Document 1-1"},
                {"title": "Document 1-1-1"},
            ],
            2,
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_NAECHSTE_WOCHE"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [
                {"title": "Document 1"},
                {"title": "Document 1-1"},
                {"title": "Document 1-1-1"},
            ],
            1,
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 2"}],
            1,
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER"],
                "teilflaechen": ["does not exist"],
                "taskTyp": None,
                "titel": None,
            },
            [],
            0,
        ),
        (
            {
                "status": ["UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER"],
                "teilflaechen": ["combined-id-1"],
                "taskTyp": None,
                "titel": None,
            },
            [{"title": "Document 2"}],
            1,
        ),
        (
            {
                "status": None,
                "eigene": False,
                "faelligkeit": ["RUHEND"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [
                {"title": "Document 1"},
                {"title": "Document 3"},
                {"title": "Document 4"},
                {"title": "Document 1-1"},
                {"title": "Document 3-2"},
            ],
            3,
        ),
        (
            {
                "status": ["ABGESCHLOSSEN", "UEBERSPRUNGEN"],
                "eigene": False,
                "faelligkeit": ["FAELLIG_SPAETER", "RUHEND"],
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            [
                {"title": "Document 1"},
                {"title": "Document 2"},
                {"title": "Document 3"},
                {"title": "Document 3-1"},
            ],
            3,
        ),
        (
            {
                "status": ["ABGESCHLOSSEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": ["NOTIZ"],
                "titel": None,
            },
            [
                {"title": "Notiz"},
            ],
            1,
        ),
        (
            {
                "status": ["ABGESCHLOSSEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": "ot",
            },
            [
                {"title": "Notiz"},
            ],
            1,
        ),
    ],
)
def test_filter_vflz_geschaefte_page_tree(
    session: Session,
    run_query,
    as_lesen_geschaefte,
    geschaefte_filter,
    results,
    num_results_total,
):
    vflz = make_vflz(session, "My Site")
    doc1 = make_document_node(session, vflz, "Document 1")
    doc2 = make_document_node(session, vflz, "Document 2")
    doc3 = make_document_node(session, vflz, "Document 3")
    doc4 = make_document_node(session, vflz, "Document 4")
    note = make_note_node(session, vflz, "Notiz")

    note.status = NodeStatus.FINISHED
    note.deadline = datetime.now() + timedelta(weeks=3)

    doc1.started_at = datetime.now()
    doc1.deadline = None
    doc1.status = NodeStatus.FINISHED

    doc2.started_at = datetime.now() + timedelta(days=1)
    doc2.status = NodeStatus.SKIPPED
    doc2.deadline = datetime.now() + timedelta(weeks=5)

    doc3.started_at = datetime.now() + timedelta(days=2)
    doc3.deadline = datetime.now() - timedelta(hours=1)

    doc4.started_at = datetime.now() + timedelta(days=3)
    doc4.deadline = None

    doc11 = make_document_node(session, vflz, "Document 1-1")
    doc11.started_at = datetime.now() + timedelta(days=5)
    doc11.parent = doc1

    doc111 = make_document_node(session, vflz, "Document 1-1-1")
    doc111.parent = doc11
    doc111.status = NodeStatus.SKIPPED
    doc111.started_at = datetime.now() + timedelta(days=6)
    doc111.deadline = datetime.now() + timedelta(hours=10)

    doc31 = make_document_node(session, vflz, "Document 3-1")
    doc31.parent = doc3
    doc31.status = NodeStatus.FINISHED
    doc31.started_at = datetime.now() + timedelta(days=7)
    doc31.deadline = datetime.now() + timedelta(weeks=5)

    doc32 = make_document_node(session, vflz, "Document 3-2")
    doc32.parent = doc3
    doc32.started_at = datetime.now() + timedelta(days=8)
    doc32.deadline = None

    query = """
        query q($filter: GeschaefteFilter, $vflzId: ID!) {
            vflz(vflzId: $vflzId) {
                geschaefte(asTree: true, perPage: 10, sortBy: StartDatum, reverse: false, filter: $filter) {
                    numPages
                    numResultsTotal
                    page
                    results { title }
                }
            }
        }
    """

    result = run_query(
        query=query,
        variable_values={"filter": geschaefte_filter, "vflzId": str(vflz.vflz_id)},
    )
    assert result.data["vflz"] == {
        "geschaefte": {
            "numPages": 1 if num_results_total > 0 else 0,
            "numResultsTotal": len(results),
            "page": 1,
            "results": results,
        }
    }


def test_filter_vflz_geschaefte_page_tree_by_task_id(
    session: Session, run_query, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    doc1 = make_document_node(session, vflz, "Document 1")
    doc2 = make_document_node(session, vflz, "Document 2")
    doc3 = make_document_node(session, vflz, "Document 3")
    doc4 = make_document_node(session, vflz, "Document 4")

    doc1.started_at = datetime.now()
    doc1.deadline = None
    doc1.status = NodeStatus.FINISHED

    doc2.started_at = datetime.now() + timedelta(days=1)
    doc2.status = NodeStatus.SKIPPED
    doc2.deadline = datetime.now() + timedelta(weeks=5)

    doc3.started_at = datetime.now() + timedelta(days=2)
    doc3.deadline = datetime.now() - timedelta(hours=1)

    doc4.started_at = datetime.now() + timedelta(days=3)
    doc4.deadline = None

    doc11 = make_document_node(session, vflz, "Document 1-1")
    doc11.started_at = datetime.now() + timedelta(days=5)
    doc11.parent = doc1

    doc111 = make_document_node(session, vflz, "Document 1-1-1")
    doc111.parent = doc11
    doc111.status = NodeStatus.SKIPPED
    doc111.started_at = datetime.now() + timedelta(days=6)
    doc111.deadline = datetime.now() + timedelta(hours=10)

    doc31 = make_document_node(session, vflz, "Document 3-1")
    doc31.parent = doc3
    doc31.status = NodeStatus.FINISHED
    doc31.started_at = datetime.now() + timedelta(days=7)
    doc31.deadline = datetime.now() + timedelta(weeks=5)

    doc32 = make_document_node(session, vflz, "Document 3-2")
    doc32.parent = doc3
    doc32.started_at = datetime.now() + timedelta(days=8)
    doc32.deadline = None

    query = """
    query q($filter: GeschaefteFilter, $vflzId: ID!, $taskId: ID!) {
        vflz(vflzId: $vflzId) {
            geschaefte(taskId: $taskId, asTree: true, perPage: 1, sortBy: StartDatum, reverse: false, filter: $filter) {
                numPages
                numResultsTotal
                page
                results { title }
            }
        }
    }
    """

    result = run_query(
        query=query,
        variable_values={
            "filter": {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
            "vflzId": str(vflz.vflz_id),
            "taskId": str(doc3.wf_node_id),
        },
    )
    assert result.data["vflz"] == {
        "geschaefte": {
            "numPages": 3,
            "numResultsTotal": 5,
            "page": 2,
            "results": [
                {"title": "Document 3"},
                {"title": "Document 3-2"},
            ],
        }
    }


def test_get_global_geschaefte_page_by_task_id_flat_filtered(
    session: Session, run_query, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    doc1 = make_document_node(session, vflz, "Document 1")
    doc2 = make_document_node(session, vflz, "Document 2")
    doc3 = make_document_node(session, vflz, "Document 3")
    doc4 = make_document_node(session, vflz, "Document 4")

    doc1.started_at = datetime.now()
    doc1.deadline = None
    doc1.status = NodeStatus.FINISHED

    doc2.started_at = datetime.now() + timedelta(days=1)
    doc2.status = NodeStatus.SKIPPED
    doc2.deadline = datetime.now() + timedelta(weeks=5)

    doc3.started_at = datetime.now() + timedelta(days=2)
    doc3.deadline = datetime.now() - timedelta(hours=1)

    doc4.started_at = datetime.now() + timedelta(days=3)
    doc4.deadline = None

    doc11 = make_document_node(session, vflz, "Document 1-1")
    doc11.started_at = datetime.now() + timedelta(days=5)
    doc11.parent = doc1

    doc111 = make_document_node(session, vflz, "Document 1-1-1")
    doc111.parent = doc11
    doc111.status = NodeStatus.SKIPPED
    doc111.started_at = datetime.now() + timedelta(days=6)
    doc111.deadline = datetime.now() + timedelta(hours=10)

    doc31 = make_document_node(session, vflz, "Document 3-1")
    doc31.parent = doc3
    doc31.status = NodeStatus.FINISHED
    doc31.started_at = datetime.now() + timedelta(days=7)
    doc31.deadline = datetime.now() + timedelta(weeks=5)

    doc32 = make_document_node(session, vflz, "Document 3-2")
    doc32.parent = doc3
    doc32.started_at = datetime.now() + timedelta(days=8)
    doc32.deadline = None

    query = """
    query q($filter: GeschaefteFilter, $taskId: ID!) {
        geschaefte(taskId: $taskId, asTree: false, perPage: 2, sortBy: StartDatum, reverse: false, filter: $filter) {
            numPages
            numResultsTotal
            page
            results { title }
        }
    }
    """
    result = run_query(
        query=query,
        variable_values={
            "taskId": doc3.wf_node_id,
            "filter": {
                "status": ["OFFEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
        },
    )
    assert result.data["geschaefte"] == {
        "numPages": 2,
        "numResultsTotal": 4,
        "page": 1,
        "results": [{"title": "Document 3"}, {"title": "Document 4"}],
    }


def test_get_global_geschaefte_page_by_task_id_which_is_filtered_out(
    session: Session, run_query, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    doc1 = make_document_node(session, vflz, "Document 1")

    tree_query = """
    query q($filter: GeschaefteFilter, $taskId: ID!) {
        geschaefte(taskId: $taskId, asTree: true, perPage: 2, sortBy: StartDatum, reverse: false, filter: $filter) {
            numPages
            numResultsTotal
            page
            results { title }
        }
    }
    """
    tree_result = run_query(
        query=tree_query,
        variable_values={
            "taskId": doc1.wf_node_id,
            "filter": {
                "status": ["ABGESCHLOSSEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
        },
    )
    assert tree_result.data["geschaefte"] == {
        "numPages": 0,
        "numResultsTotal": 0,
        "page": 1,
        "results": [],
    }

    flat_query = """
    query q($filter: GeschaefteFilter, $taskId: ID!) {
        geschaefte(taskId: $taskId, asTree: false, perPage: 2, sortBy: StartDatum, reverse: false, filter: $filter) {
            numPages
            numResultsTotal
            page
            results { title }
        }
    }
    """
    flat_result = run_query(
        query=flat_query,
        variable_values={
            "taskId": doc1.wf_node_id,
            "filter": {
                "status": ["ABGESCHLOSSEN"],
                "eigene": False,
                "faelligkeit": None,
                "teilflaechen": None,
                "taskTyp": None,
                "titel": None,
            },
        },
    )
    assert flat_result.data["geschaefte"] == {
        "numPages": 0,
        "numResultsTotal": 0,
        "page": 1,
        "results": [],
    }


@freeze_time("2026-01-01 12:00:00")
@pytest.mark.parametrize(
    "offset, status",
    [
        (timedelta(weeks=1), FaelligkeitStatus.FAELLIG_NAECHSTE_WOCHE),
        (timedelta(weeks=3), FaelligkeitStatus.FAELLIG_NAECHSTE_WOCHE),
        (timedelta(weeks=4, microseconds=-1), FaelligkeitStatus.FAELLIG_NAECHSTE_WOCHE),
        (None, FaelligkeitStatus.RUHEND),
        (timedelta(hours=-1), FaelligkeitStatus.UEBERFAELLIG),
        (timedelta(weeks=4), FaelligkeitStatus.FAELLIG_SPAETER),
        (timedelta(weeks=5), FaelligkeitStatus.FAELLIG_SPAETER),
    ],
)
def test_faelligkeits_status(offset, status):
    deadline = datetime.now() + offset if offset is not None else None
    assert FaelligkeitStatus.from_datetime(deadline) == status


def test_delete_task_not_allowed_for_task_that_is_not_last_of_workflow(
    session, run_query, as_bearbeiten_geschaefte, workflow_manager
):
    delete_mutation = """
    mutation m($taskId: ID!) {
        deleteTask(taskId: $taskId)
    }
    """
    workflow_config = """
    workflow:
      title: Test workflow
      version: 1
      min_per_entity: 0
      max_per_entity: null
      start_task_ref: task1
      tasks:
        task1:
          title: Task 1
          steps:
          - type: document
            title: Dokument 1
          - type: document
            title: Dokument 2
          start_task: true
          links:
            - task_ref: END
        END:
          title: __END__
          steps: []
          links: []
    """
    workflow, _ = workflow_manager.load_workflow_from_file(StringIO(workflow_config))

    vflz = make_vflz(session, "My Site")
    wf_node = workflow.create_node(str(vflz.vflz_id))
    session.add(wf_node)
    session.flush()

    def _start_next_step(node, wf_config):
        node_info = workflow_manager.start_next_step(
            node.wf_node_id, wf_config.wf_config_id
        )
        return session.get(wf_models.Node, node_info.wf_node_id)

    task_node = _start_next_step(wf_node, workflow.tasks["task1"])
    doc1_node = _start_next_step(task_node, workflow.tasks["task1"].steps[0].step)
    doc1_node.status = NodeStatus.FINISHED
    doc2_node = _start_next_step(task_node, workflow.tasks["task1"].steps[1].step)

    session.commit()
    with pytest.raises(QueryError, match="Cannot delete task"):
        run_query(delete_mutation, {"taskId": str(task_node.wf_node_id)})

    with pytest.raises(QueryError, match="Cannot delete task"):
        run_query(delete_mutation, {"taskId": str(doc1_node.wf_node_id)})

    result = run_query(delete_mutation, {"taskId": str(doc2_node.wf_node_id)})
    assert result.data["deleteTask"] == str(doc2_node.wf_node_id)


def test_delete_task_allowed_for_standalone_tasks_without_subchildren(
    session, run_query, as_bearbeiten_geschaefte
):
    delete_mutation = """
    mutation m($taskId: ID!) {
        deleteTask(taskId: $taskId)
    }
    """

    vflz = make_vflz(session, "My Site")
    doc_node = make_document_node(session, vflz)
    form_node = make_form_node(session, vflz)
    task_node = make_task_node(session, vflz)
    notiz_node = make_note_node(session, vflz)

    notiz_child_node = make_note_node(session, vflz)
    notiz_child_node.parent = task_node

    result = run_query(delete_mutation, {"taskId": str(doc_node.wf_node_id)})
    assert result.data["deleteTask"] == str(doc_node.wf_node_id)

    result = run_query(delete_mutation, {"taskId": str(form_node.wf_node_id)})
    assert result.data["deleteTask"] == str(form_node.wf_node_id)

    result = run_query(delete_mutation, {"taskId": str(notiz_node.wf_node_id)})
    assert result.data["deleteTask"] == str(notiz_node.wf_node_id)

    # ensure that the children are deleted at first
    with pytest.raises(QueryError, match="Cannot delete task"):
        run_query(delete_mutation, {"taskId": str(task_node.wf_node_id)})

    result = run_query(delete_mutation, {"taskId": str(notiz_child_node.wf_node_id)})
    assert result.data["deleteTask"] == str(notiz_child_node.wf_node_id)

    result = run_query(delete_mutation, {"taskId": str(task_node.wf_node_id)})
    assert result.data["deleteTask"] == str(task_node.wf_node_id)


def test_delete_task_with_children_fails_and_keeps_sachbearbeiter(
    session, run_query, as_bearbeiten_geschaefte
):
    delete_mutation = """
    mutation m($taskId: ID!) {
        deleteTask(taskId: $taskId)
    }
    """

    vflz = make_vflz(session, "My Site")
    task_node = make_task_node(session, vflz)
    child_node = make_note_node(session, vflz)
    child_node.parent = task_node

    subj = make_subj(session, name="sachbearbeiter")
    beteiligter_geschaeft = make_beteiligter_geschaeft(
        session, subjekt=subj, node=task_node
    )

    with pytest.raises(QueryError, match="Cannot delete task"):
        run_query(delete_mutation, {"taskId": str(task_node.wf_node_id)})

    assert (
        session.get(
            BeteiligterGeschaeft,
            beteiligter_geschaeft.bet_task_id,
        )
        is not None
    )


def test_update_prozess_with_problems_in_faelligkeit_and_status_for_children_yields_problem_group(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")
    workflow_node = make_workflow_node(session, vflz, "Prozess")
    workflow_node.deadline = datetime(2030, 1, 1)

    task_node = make_task_node(session, vflz, "Task 1")
    task_node.parent = workflow_node
    task_node.deadline = datetime(2030, 1, 1)
    task_node.status = NodeStatus.STARTED

    task_node2 = make_task_node(session, vflz, "Task 2")
    task_node2.parent = workflow_node
    task_node2.deadline = datetime(2030, 1, 1)
    task_node2.status = NodeStatus.FINISHED

    task_node3 = make_task_node(session, vflz, "Task 3")
    task_node3.parent = task_node2
    task_node3.deadline = None
    task_node3.status = NodeStatus.INACTIVE

    document_node = make_document_node(session, vflz, "Dokument")
    document_node.parent = workflow_node
    document_node.deadline = datetime(2030, 1, 1)
    document_node.status = NodeStatus.STARTED

    subj1 = make_subj(session, name="name1")
    subj2 = make_subj(session, name="name2-sachbearbeiter")

    user = auth.User(sub="sub", username="username", email="user@geops.com")
    subj2.user = user

    mutation = """
    mutation m($data: UpdateProzessInput!, $updateChildTasks: Boolean!) {
        updateProzess(data: $data, updateChildTasks: $updateChildTasks) {
            ... on Prozess {
                title
                status
                startDatum
                endDatum
                faelligkeitsDatum
                notiz
                sachbearbeitung { subjekt { name } }
                sonstigeBeteiligte { subjekt { name } }
            }
            ... on WorkflowProblemGroup {
                faelligkeitsDatumProblemTasks {
                    taskId
                }
                statusProblemTasks {
                    taskId
                }
            }
        }
    }
    """

    result = run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(workflow_node.wf_node_id),
                "title": "Task 1 - updated",
                "status": "ABGESCHLOSSEN",
                "startDatum": "2025-03-19",
                "endDatum": "2025-03-20",
                "faelligkeitsDatum": "2025-03-28",
                "notiz": "foo",
                "sachbearbeitung": [{"betTaskId": None, "subjId": subj2.subj_id}],
                "sonstigeBeteiligte": [{"betTaskId": None, "subjId": subj1.subj_id}],
            },
            "updateChildTasks": False,
        },
    )

    assert result.data["updateProzess"]["faelligkeitsDatumProblemTasks"] == [
        {"taskId": str(task_node.wf_node_id)}
    ]
    assert result.data["updateProzess"]["statusProblemTasks"] == [
        {"taskId": str(task_node.wf_node_id)},
        {"taskId": str(task_node3.wf_node_id)},
    ]


def test_update_prozess_with_problems_in_faelligkeit_and_status_for_children_updates_children(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")
    workflow_node = make_workflow_node(session, vflz, "Prozess")
    workflow_node.deadline = datetime(
        2030,
        1,
        1,
    )

    task_node = make_task_node(session, vflz, "Task 1")
    task_node.parent = workflow_node
    task_node.deadline = datetime(2030, 1, 1)
    task_node.status = NodeStatus.STARTED

    task_node2 = make_task_node(session, vflz, "Task 2")
    task_node2.parent = workflow_node
    task_node2.deadline = datetime(2030, 1, 1)
    task_node2.status = NodeStatus.FINISHED

    task_node3 = make_task_node(session, vflz, "Task 3")
    task_node3.parent = task_node2
    task_node3.deadline = None
    task_node3.status = NodeStatus.INACTIVE

    document_node = make_document_node(session, vflz, "Dokument")
    document_node.parent = workflow_node
    document_node.deadline = datetime(2030, 1, 1)
    document_node.status = NodeStatus.STARTED

    subj1 = make_subj(session, name="name1")
    subj2 = make_subj(session, name="name2-sachbearbeiter")

    user = auth.User(sub="sub", username="username", email="user@geops.com")
    subj2.user = user

    mutation = """
    mutation m($data: UpdateProzessInput!, $updateChildTasks: Boolean!) {
        updateProzess(data: $data, updateChildTasks: $updateChildTasks) {
            ... on Prozess {
                title
                status
                startDatum
                endDatum
                faelligkeitsDatum
                notiz
                sachbearbeitung { subjekt { name } }
                sonstigeBeteiligte { subjekt { name } }
            }
            ... on WorkflowProblemGroup {
                faelligkeitsDatumProblemTasks {
                    taskId
                }
                statusProblemTasks {
                    taskId
                }
            }
        }
    }
    """
    assert task_node.deadline.date().isoformat() != "2025-03-28"
    assert task_node3.status != "finished"
    assert task_node3.finished_at is None
    assert task_node.status != "finished"
    assert task_node.finished_at is None
    assert document_node.status != "finished"
    assert document_node.deadline.date().isoformat() != "2025-03-28"
    assert document_node.finished_at is None

    run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(workflow_node.wf_node_id),
                "title": "Task 1 - updated",
                "status": "ABGESCHLOSSEN",
                "startDatum": "2025-03-19",
                "endDatum": "2025-03-20",
                "faelligkeitsDatum": "2025-03-28",
                "notiz": "foo",
                "sachbearbeitung": [{"betTaskId": None, "subjId": subj2.subj_id}],
                "sonstigeBeteiligte": [{"betTaskId": None, "subjId": subj1.subj_id}],
            },
            "updateChildTasks": True,
        },
    )
    session.flush()

    assert workflow_node.deadline.date().isoformat() == "2025-03-28"
    assert task_node.deadline.date().isoformat() == "2025-03-28"
    assert task_node3.status == "finished"
    assert task_node3.finished_at == workflow_node.finished_at
    assert task_node.status == "finished"
    assert task_node.finished_at == workflow_node.finished_at
    assert document_node.deadline.date().isoformat() == "2025-03-28"
    assert document_node.finished_at == workflow_node.finished_at


def test_update_tasks_with_problems_in_faelligkeit_and_status_for_parents_yields_problem_group(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")
    workflow_node = make_workflow_node(session, vflz, "Prozess")
    workflow_node.deadline = datetime(2000, 1, 1)

    task_node = make_task_node(session, vflz, "Task 1")
    task_node.parent = workflow_node
    task_node.deadline = datetime(2030, 1, 1)
    task_node.status = NodeStatus.FINISHED

    task_node2 = make_task_node(session, vflz, "Task 2")
    task_node2.parent = task_node
    task_node2.deadline = datetime(2000, 1, 1)
    task_node2.status = NodeStatus.FINISHED

    mutation = """
    mutation m($data: UpdateAufgabeInput!, $updateParentTasks: Boolean!) {
        updateAufgabe(data: $data, updateParentTasks: $updateParentTasks) {
            ... on Aufgabe {
                title
                status
                startDatum
                endDatum
                faelligkeitsDatum
                notiz
            }
            ... on WorkflowProblemGroup {
                faelligkeitsDatumProblemTasks {
                    taskId
                }
                statusProblemTasks {
                    taskId
                }
            }
        }
    }
    """

    result = run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(task_node2.wf_node_id),
                "title": "Task 2 - updated",
                "status": "OFFEN",
                "startDatum": "2025-03-19",
                "endDatum": None,
                "faelligkeitsDatum": "2025-03-28",
                "notiz": "foo",
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
            },
            "updateParentTasks": False,
        },
    )

    assert result.data["updateAufgabe"]["faelligkeitsDatumProblemTasks"] == [
        {"taskId": str(workflow_node.wf_node_id)}
    ]
    assert result.data["updateAufgabe"]["statusProblemTasks"] == [
        {"taskId": str(task_node.wf_node_id)},
    ]


def test_update_tasks_with_problems_in_faelligkeit_and_status_updates_parents(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")
    workflow_node = make_workflow_node(session, vflz, "Prozess")
    workflow_node.deadline = datetime(2000, 1, 1)

    task_node = make_task_node(session, vflz, "Task 1")
    task_node.parent = workflow_node
    task_node.deadline = datetime(2030, 1, 1)
    task_node.status = NodeStatus.FINISHED
    task_node.finished_at = datetime(2040, 1, 1)

    task_node2 = make_task_node(session, vflz, "Task 2")
    task_node2.parent = task_node
    task_node2.deadline = datetime(2000, 1, 1)
    task_node2.status = NodeStatus.FINISHED

    mutation = """
    mutation m($data: UpdateAufgabeInput!, $updateParentTasks: Boolean!) {
        updateAufgabe(data: $data, updateParentTasks: $updateParentTasks) {
            ... on Aufgabe {
                title
                status
                startDatum
                endDatum
                faelligkeitsDatum
                notiz
            }
            ... on WorkflowProblemGroup {
                faelligkeitsDatumProblemTasks {
                    taskId
                }
                statusProblemTasks {
                    taskId
                }
            }
        }
    }
    """

    assert workflow_node.deadline.date().isoformat() != "2025-03-28"
    assert task_node.deadline.date().isoformat() != "2025-03-28"
    assert task_node.finished_at is not None
    assert task_node.status != "started"
    assert task_node2.deadline.date().isoformat() != "2025-03-28"
    assert task_node2.status != "started"

    run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(task_node2.wf_node_id),
                "title": "Task 2 - updated",
                "status": "OFFEN",
                "startDatum": "2025-03-19",
                "endDatum": None,
                "faelligkeitsDatum": "2025-03-28",
                "notiz": "foo",
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
            },
            "updateParentTasks": True,
        },
    )

    session.flush()
    assert workflow_node.deadline.date().isoformat() == "2025-03-28"
    assert task_node.deadline.date().isoformat() != "2025-03-28"
    assert task_node.status == "started"
    assert task_node.finished_at is None
    assert task_node2.deadline.date().isoformat() == "2025-03-28"
    assert task_node2.status == "started"


def test_update_notiz_with_kategorie_twice(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")
    note_node = make_note_node(session, vflz, "My Note")

    mutation = """
    mutation m($data: UpdateNotizInput!) {
        updateNotiz(data: $data) {
            title
            startDatum
            endDatum
            faelligkeitsDatum
            status
            notiz
            kategorie
            oeffentlich
        }
    }
    """
    variable_values = {
        "data": {
            "taskId": str(note_node.wf_node_id),
            "title": "My Note - updated",
            "startDatum": "2025-03-19",
            "notiz": "foo",
            "sachbearbeitung": [],
            "sonstigeBeteiligte": [],
            "kategorie": "code:10022:Kategorie",
            "oeffentlich": False,
        }
    }

    result = run_query(query=mutation, variable_values=variable_values)

    assert result.data["updateNotiz"] == {
        "title": "My Note - updated",
        "startDatum": "2025-03-19",
        "endDatum": "2025-03-19",
        "faelligkeitsDatum": "2025-03-19",
        "status": "ABGESCHLOSSEN",
        "notiz": "foo",
        "kategorie": "code:10022:Kategorie",
        "oeffentlich": False,
    }

    variable_values["data"]["kategorie"] = None
    result = run_query(query=mutation, variable_values=variable_values)

    assert result.data["updateNotiz"] == {
        "title": "My Note - updated",
        "startDatum": "2025-03-19",
        "endDatum": "2025-03-19",
        "faelligkeitsDatum": "2025-03-19",
        "status": "ABGESCHLOSSEN",
        "notiz": "foo",
        "kategorie": None,
        "oeffentlich": False,
    }

    variable_values["data"]["kategorie"] = "code:10022:Kategorie"
    result = run_query(query=mutation, variable_values=variable_values)

    assert result.data["updateNotiz"] == {
        "title": "My Note - updated",
        "startDatum": "2025-03-19",
        "endDatum": "2025-03-19",
        "faelligkeitsDatum": "2025-03-19",
        "status": "ABGESCHLOSSEN",
        "notiz": "foo",
        "kategorie": "code:10022:Kategorie",
        "oeffentlich": False,
    }


def test_aufgabe_includes_event_triggers(
    session: Session, run_query, as_lesen_geschaefte
):
    vflz = make_vflz(session, "My Site")
    workflow_config = make_workflow_config(session, title="Workflow 1")
    task_config = make_task_config(
        session, workflow_config, name="my_task", title="Task 1"
    )
    task_config.triggers = [{"type": "StandortHistorisieren", "value": None}]
    a1 = task_config.create_node(str(vflz.vflz_id))
    session.add(a1)
    session.flush()

    query = """
    query q($taskId: ID!) {
        task(taskId: $taskId) {
            ... on Aufgabe {
                title
                triggers  {
                    ... on StandortHistorisieren {
                        value
                    }
                }
            }
        }
    }
    """

    result = run_query(query, {"taskId": str(a1.wf_node_id)})
    assert result.data["task"] == {
        "title": "Task 1",
        "triggers": [{"value": None}],
    }


def test_sorting_unchanged_after_document_update(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")

    # Prozess > Task > Dokument hierarchy
    prozess = make_workflow_node(session, vflz, "Prozess 1")
    task = make_task_node(session, vflz, "Task 1")
    task.parent = prozess
    dokument = make_document_node(session, vflz, "Dokument 1")
    dokument.parent = task

    # Two standalone documents for ordering context
    frueher = make_document_node(session, vflz, "Dokument frueher")
    spaeter = make_document_node(session, vflz, "Dokument spaeter")

    past = datetime.now() - timedelta(days=30)
    frueher.started_at = past
    prozess.started_at = past + timedelta(days=1)
    task.started_at = past + timedelta(days=2)
    dokument.started_at = past + timedelta(days=3)
    spaeter.started_at = past + timedelta(days=4)
    session.commit()

    query = """
    query q {
        geschaefte(asTree: false, sortBy: StartDatum, reverse: false, page: 1, perPage: 10) {
            numResultsTotal
            results { title }
        }
    }
    """

    result_before = run_query(query=query)
    assert result_before.data["geschaefte"]["results"] == [
        {"title": "Dokument frueher"},
        {"title": "Prozess 1"},
        {"title": "Task 1"},
        {"title": "Dokument 1"},
        {"title": "Dokument spaeter"},
    ]

    # Update a field on the document — sorting must not change
    mutation = """
    mutation m($data: UpdateDokumentInput!) {
        updateDokument(data: $data) {
            title
            notiz
        }
    }
    """
    run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(dokument.wf_node_id),
                "title": "Dokument 1 - aktualisiert",
                "startDatum": dokument.started_at.date().isoformat(),
                "notiz": "aktualisierte Notiz",
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
                "dokument": "test.pdf",
                "kategorie": None,
                "oeffentlich": True,
            }
        },
    )

    result_after = run_query(query=query)
    assert (
        result_after.data["geschaefte"]["numResultsTotal"]
        == result_before.data["geschaefte"]["numResultsTotal"]
    )
    assert result_after.data["geschaefte"]["results"] == [
        {"title": "Dokument frueher"},
        {"title": "Prozess 1"},
        {"title": "Task 1"},
        {"title": "Dokument 1 - aktualisiert"},
        {"title": "Dokument spaeter"},
    ]


def test_sorting_unchanged_after_notiz_update(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")

    prozess = make_workflow_node(session, vflz, "Prozess 1")
    task = make_task_node(session, vflz, "Task 1")
    task.parent = prozess
    notiz = make_note_node(session, vflz, "Notiz 1")
    notiz.parent = task

    frueher = make_document_node(session, vflz, "Dokument frueher")
    spaeter = make_document_node(session, vflz, "Dokument spaeter")

    past = datetime.now() - timedelta(days=30)
    frueher.started_at = past
    prozess.started_at = past + timedelta(days=1)
    task.started_at = past + timedelta(days=2)
    notiz.started_at = past + timedelta(days=3)
    spaeter.started_at = past + timedelta(days=4)
    session.commit()

    query = """
    query q {
        geschaefte(asTree: false, sortBy: StartDatum, reverse: false, page: 1, perPage: 10) {
            numResultsTotal
            results { title }
        }
    }
    """

    result_before = run_query(query=query)
    assert result_before.data["geschaefte"]["results"] == [
        {"title": "Dokument frueher"},
        {"title": "Prozess 1"},
        {"title": "Task 1"},
        {"title": "Notiz 1"},
        {"title": "Dokument spaeter"},
    ]

    mutation = """
    mutation m($data: UpdateNotizInput!) {
        updateNotiz(data: $data) {
            title
            notiz
        }
    }
    """
    run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(notiz.wf_node_id),
                "title": "Notiz 1 - aktualisiert",
                "startDatum": notiz.started_at.date().isoformat(),
                "notiz": "aktualisierte Notiz",
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
                "kategorie": None,
                "oeffentlich": True,
            }
        },
    )

    result_after = run_query(query=query)
    assert (
        result_after.data["geschaefte"]["numResultsTotal"]
        == result_before.data["geschaefte"]["numResultsTotal"]
    )
    assert result_after.data["geschaefte"]["results"] == [
        {"title": "Dokument frueher"},
        {"title": "Prozess 1"},
        {"title": "Task 1"},
        {"title": "Notiz 1 - aktualisiert"},
        {"title": "Dokument spaeter"},
    ]


def test_sorting_unchanged_after_formular_update(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")

    prozess = make_workflow_node(session, vflz, "Prozess 1")
    task = make_task_node(session, vflz, "Task 1")
    task.parent = prozess
    formular = make_form_node(session, vflz, "Formular 1")
    formular.parent = task

    frueher = make_document_node(session, vflz, "Dokument frueher")
    spaeter = make_document_node(session, vflz, "Dokument spaeter")

    past = datetime.now() - timedelta(days=30)
    frueher.started_at = past
    prozess.started_at = past + timedelta(days=1)
    task.started_at = past + timedelta(days=2)
    formular.started_at = past + timedelta(days=3)
    spaeter.started_at = past + timedelta(days=4)
    session.commit()

    query = """
    query q {
        geschaefte(asTree: false, sortBy: StartDatum, reverse: false, page: 1, perPage: 10) {
            numResultsTotal
            results { title }
        }
    }
    """

    result_before = run_query(query=query)
    assert result_before.data["geschaefte"]["results"] == [
        {"title": "Dokument frueher"},
        {"title": "Prozess 1"},
        {"title": "Task 1"},
        {"title": "Formular 1"},
        {"title": "Dokument spaeter"},
    ]

    mutation = """
    mutation m($data: UpdateFormularInput!) {
        updateFormular(data: $data) {
            ... on Formular {
                title
                notiz
            }
        }
    }
    """
    run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(formular.wf_node_id),
                "title": "Formular 1 - aktualisiert",
                "startDatum": formular.started_at.date().isoformat(),
                "notiz": "aktualisiertes Formular",
                "eingaben": None,
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
            }
        },
    )

    result_after = run_query(query=query)
    assert (
        result_after.data["geschaefte"]["numResultsTotal"]
        == result_before.data["geschaefte"]["numResultsTotal"]
    )
    assert result_after.data["geschaefte"]["results"] == [
        {"title": "Dokument frueher"},
        {"title": "Prozess 1"},
        {"title": "Task 1"},
        {"title": "Formular 1 - aktualisiert"},
        {"title": "Dokument spaeter"},
    ]


def test_sorting_unchanged_after_aufgabe_update(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")

    prozess = make_workflow_node(session, vflz, "Prozess 1")
    aufgabe = make_task_node(session, vflz, "Aufgabe 1")
    aufgabe.parent = prozess

    frueher = make_document_node(session, vflz, "Dokument frueher")
    spaeter = make_document_node(session, vflz, "Dokument spaeter")

    past = datetime.now() - timedelta(days=30)
    frueher.started_at = past
    prozess.started_at = past + timedelta(days=1)
    aufgabe.started_at = past + timedelta(days=2)
    spaeter.started_at = past + timedelta(days=3)
    session.commit()

    query = """
    query q {
        geschaefte(asTree: false, sortBy: StartDatum, reverse: false, page: 1, perPage: 10) {
            numResultsTotal
            results { title }
        }
    }
    """

    result_before = run_query(query=query)
    assert result_before.data["geschaefte"]["results"] == [
        {"title": "Dokument frueher"},
        {"title": "Prozess 1"},
        {"title": "Aufgabe 1"},
        {"title": "Dokument spaeter"},
    ]

    mutation = """
    mutation m($data: UpdateAufgabeInput!) {
        updateAufgabe(data: $data) {
            ... on Aufgabe {
                title
                notiz
            }
        }
    }
    """
    run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(aufgabe.wf_node_id),
                "title": "Aufgabe 1 - aktualisiert",
                "status": "ABGESCHLOSSEN",
                "startDatum": aufgabe.started_at.date().isoformat(),
                "endDatum": None,
                "faelligkeitsDatum": None,
                "notiz": "aktualisierte Aufgabe",
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
            }
        },
    )

    result_after = run_query(query=query)
    assert (
        result_after.data["geschaefte"]["numResultsTotal"]
        == result_before.data["geschaefte"]["numResultsTotal"]
    )
    assert result_after.data["geschaefte"]["results"] == [
        {"title": "Dokument frueher"},
        {"title": "Prozess 1"},
        {"title": "Aufgabe 1 - aktualisiert"},
        {"title": "Dokument spaeter"},
    ]


def test_sorting_unchanged_after_prozess_update(
    session: Session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "My Site")

    prozess = make_workflow_node(session, vflz, "Prozess 1")
    task = make_task_node(session, vflz, "Task 1")
    task.parent = prozess
    dokument = make_document_node(session, vflz, "Dokument 1")
    dokument.parent = task

    frueher = make_document_node(session, vflz, "Dokument frueher")
    spaeter = make_document_node(session, vflz, "Dokument spaeter")

    past = datetime.now() - timedelta(days=30)
    frueher.started_at = past
    prozess.started_at = past + timedelta(days=1)
    task.started_at = past + timedelta(days=2)
    dokument.started_at = past + timedelta(days=3)
    spaeter.started_at = past + timedelta(days=4)

    query = """
    query q {
        geschaefte(asTree: false, sortBy: StartDatum, reverse: false, page: 1, perPage: 10) {
            numResultsTotal
            results { title }
        }
    }
    """

    result_before = run_query(query=query)
    assert result_before.data["geschaefte"]["results"] == [
        {"title": "Dokument frueher"},
        {"title": "Prozess 1"},
        {"title": "Task 1"},
        {"title": "Dokument 1"},
        {"title": "Dokument spaeter"},
    ]

    mutation = """
    mutation m($data: UpdateProzessInput!) {
        updateProzess(data: $data) {
            ... on Prozess {
                title
                notiz
            }
        }
    }
    """

    run_query(
        query=mutation,
        variable_values={
            "data": {
                "taskId": str(prozess.wf_node_id),
                "title": "Prozess 1 - aktualisiert",
                "status": "OFFEN",
                "startDatum": prozess.started_at.date().isoformat(),
                "endDatum": None,
                "faelligkeitsDatum": None,
                "notiz": "aktualisierter Prozess",
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
            }
        },
    )

    result_after = run_query(query=query)
    assert (
        result_after.data["geschaefte"]["numResultsTotal"]
        == result_before.data["geschaefte"]["numResultsTotal"]
    )
    assert result_after.data["geschaefte"]["results"] == [
        {"title": "Dokument frueher"},
        {"title": "Prozess 1 - aktualisiert"},
        {"title": "Task 1"},
        {"title": "Dokument 1"},
        {"title": "Dokument spaeter"},
    ]
