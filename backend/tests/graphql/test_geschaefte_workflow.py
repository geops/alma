from datetime import date, datetime
from io import StringIO
from pathlib import Path

import business_workflow_manager.models as wf_models
import pytest
from business_workflow_manager.types import NodeStatus
from pytest import raises as assert_raises
from sqlalchemy import select
from utils import QueryError, make_vflz

pytestmark = [
    # Fixture required by all tests in this module
    pytest.mark.usefixtures("generate_codes"),
]


start_prozess_mutation = """
    mutation m($data: StartStandortProzessInput!) {
        startStandortProzess(data: $data) {
            prozess {
                taskId title
                sachbearbeitung { subjekt { user { username } } }
            }
        }
    }
"""
start_folgeschritt_mutation = """
    mutation m($data: StartStandortFolgeschrittInput!) {
        startStandortFolgeschritt(data: $data) {
            task {
                taskId title
                sachbearbeitung { subjekt { user { username } } }
            }
        }
    }
"""
folgeschritte_query = """
    query q($taskId: ID!) {
        task(taskId: $taskId) {
            folgeschritte {
                availableOptions { optionId title type }
                problems { message problemCode field messageCode }
            }
        }
    }
"""
update_dokument_mutation = """
    mutation m($data: UpdateDokumentInput!) {
        updateDokument(data: $data) {
            status
            folgeschritte {
                availableOptions { optionId title type }
                problems { message problemCode field messageCode }
            }
        }
    }
"""
update_formular_mutation = """
    mutation m($data: UpdateFormularInput!) {
        updateFormular(data: $data) {
        ... on Formular {
                status
                folgeschritte {
                    availableOptions { optionId title type }
                    problems { message problemCode field messageCode }
                }
            }
        }
    }
"""
update_aufgabe_mutation = """
    mutation m($data: UpdateAufgabeInput!) {
        updateAufgabe(data: $data) {
        ... on Aufgabe {
                status
                folgeschritte {
                    availableOptions { optionId title type }
                    problems { message problemCode field messageCode }
                }
            }
        }
    }
"""


def _problems(*reasons: str) -> list[dict[str, str]]:
    """Expected `folgeschritte.problems` for the given FolgeschrittGrund names."""
    return [
        {
            "message": reason,
            "problemCode": "UNAVAILABLE_FOLGESCHRITT",
            "field": "folgeschritte",
            "messageCode": f"workflow.folgeschrittGrund.{reason}",
        }
        for reason in reasons
    ]


@pytest.fixture
def simple_workflow(workflow_manager) -> wf_models.Workflow:
    path = Path(__file__).parent / "workflows" / "simple.yml"
    with path.open() as f:
        workflow = workflow_manager.load_workflow_from_file(f).workflow
    return workflow


def test_query_vflz_prozesse_fails_with_insufficient_permissions(
    session, run_query, simple_workflow: wf_models.Workflow, as_lesen_sachdaten
):
    vflz = make_vflz(session, "Standort 1")
    query = """
        query q($vflzId: ID!) {
            vflz(vflzId: $vflzId) {
                prozesse {
                    optionId
                    title
                    type
                }
            }
        }
    """
    with assert_raises(QueryError, match="not allowed"):
        run_query(query=query, variable_values={"vflzId": str(vflz.vflz_id)})


def test_query_vflz_prozesse(
    session, run_query, simple_workflow: wf_models.Workflow, as_lesen_geschaefte
):
    vflz = make_vflz(session, "Standort 1")
    query = """
        query q($vflzId: ID!) {
            vflz(vflzId: $vflzId) {
                prozesse {
                    optionId
                    title
                    type
                }
            }
        }
    """

    result = run_query(query, variable_values={"vflzId": str(vflz.vflz_id)})
    assert result.data["vflz"] == {
        "prozesse": [
            {
                "optionId": str(simple_workflow.wf_config_id),
                "title": "wf:b6395856-9556-48b4-828f-6610d153a3bc:title",
                "type": "PROZESS",
            },
        ],
    }


def test_query_vflz_prozesse_does_not_include_process_if_limit_is_reached(
    session, run_query, simple_workflow: wf_models.Workflow, as_lesen_geschaefte
):
    vflz = make_vflz(session, "Standort 1")
    workflow_node = simple_workflow.create_node(str(vflz.vflz_id))
    session.add(workflow_node)
    session.commit()

    query = """
        query q($vflzId: ID!) {
            vflz(vflzId: $vflzId) {
                prozesse {
                    optionId
                    title
                    type
                }
            }
        }
    """

    result = run_query(query, variable_values={"vflzId": str(vflz.vflz_id)})
    assert result.data["vflz"] == {
        "prozesse": [
            {
                "optionId": str(simple_workflow.wf_config_id),
                "title": "wf:b6395856-9556-48b4-828f-6610d153a3bc:title",
                "type": "PROZESS",
            },
        ],
    }

    simple_workflow.max_per_entity = 1

    result = run_query(query, variable_values={"vflzId": str(vflz.vflz_id)})
    assert result.data == {"vflz": {"prozesse": []}}

    simple_workflow.max_per_entity = 2

    result = run_query(query, variable_values={"vflzId": str(vflz.vflz_id)})
    assert result.data["vflz"] == {
        "prozesse": [
            {
                "optionId": str(simple_workflow.wf_config_id),
                "title": "wf:b6395856-9556-48b4-828f-6610d153a3bc:title",
                "type": "PROZESS",
            },
        ],
    }

    vflz.historize("Kommentar")
    workflow_node = simple_workflow.create_node(str(vflz.vflz_id))
    session.add(workflow_node)
    session.commit()

    result = run_query(query, variable_values={"vflzId": str(vflz.vflz_id)})
    assert result.data == {"vflz": {"prozesse": []}}


def test_query_global_prozesse_fails_with_insufficient_permissions(
    session, run_query, simple_workflow: wf_models.Workflow, as_lesen_sachdaten
):
    query = """
        query q {
            prozesse {
                optionId
                title
                type
            }
        }
    """
    with assert_raises(QueryError, match="not allowed"):
        run_query(query=query)


def test_query_global_prozesse(
    session, run_query, simple_workflow: wf_models.Workflow, as_lesen_geschaefte
):
    query = """
        query q {
            prozesse {
                optionId
                title
                type
            }
        }
    """

    result = run_query(query)
    assert result.data == {
        "prozesse": [
            {
                "optionId": str(simple_workflow.wf_config_id),
                "title": "wf:b6395856-9556-48b4-828f-6610d153a3bc:title",
                "type": "PROZESS",
            },
        ],
    }


def test_query_global_prozesse_includes_process_even_if_limit_is_reached(
    session, run_query, simple_workflow: wf_models.Workflow, as_lesen_geschaefte
):
    vflz = make_vflz(session, "Standort 1")
    simple_workflow.max_per_entity = 0
    workflow_node = simple_workflow.create_node(str(vflz.vflz_id))
    session.add(workflow_node)
    session.commit()

    query = """
        query q {
            prozesse {
                optionId
                title
                type
            }
        }
    """

    result = run_query(query)
    assert result.data == {
        "prozesse": [
            {
                "optionId": str(simple_workflow.wf_config_id),
                "title": "wf:b6395856-9556-48b4-828f-6610d153a3bc:title",
                "type": "PROZESS",
            },
        ],
    }


def test_start_prozess_fails_with_insufficient_permission(
    session, run_query, simple_workflow: wf_models.Workflow, as_lesen_geschaefte
):
    vflz = make_vflz(session, "Standort 1")
    mutation = """
        mutation m($data: StartStandortProzessInput!) {
            startStandortProzess(data: $data) {
                prozess { taskId title }
            }
        }
    """

    with assert_raises(QueryError, match="not allowed"):
        run_query(
            mutation,
            variable_values={
                "data": {
                    "vflzId": str(vflz.vflz_id),
                    "optionId": str(simple_workflow.wf_config_id),
                }
            },
        )


def test_start_prozess_creates_workflow_node_with_current_user_as_sachbearbeitung(
    session, run_query, simple_workflow: wf_models.Workflow, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "Standort 1")
    mutation = """
        mutation m($data: StartStandortProzessInput!) {
            startStandortProzess(data: $data) {
                prozess {
                    taskId title
                    sachbearbeitung { subjekt { user { username } } }
                }
            }
        }
    """

    result = run_query(
        mutation,
        variable_values={
            "data": {
                "vflzId": str(vflz.vflz_id),
                "optionId": str(simple_workflow.wf_config_id),
            }
        },
    )

    node = session.scalars(
        select(wf_models.WorkflowNode).where(
            wf_models.WorkflowNode.entity_id == vflz.vflz_id
        )
    ).one()

    assert result.data["startStandortProzess"] == {
        "prozess": {
            "sachbearbeitung": [{"subjekt": {"user": {"username": "alma-test"}}}],
            "taskId": str(node.wf_node_id),
            "title": "wf:b6395856-9556-48b4-828f-6610d153a3bc:title",
        }
    }


def test_start_prozess_fails_if_limit_is_reached(
    session, run_query, simple_workflow: wf_models.Workflow, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "Standort 1")
    simple_workflow.max_per_entity = 0
    session.commit()

    mutation = """
        mutation m($data: StartStandortProzessInput!) {
            startStandortProzess(data: $data) {
                prozess { taskId title }
            }
        }
    """

    with assert_raises(QueryError, match="Cannot start workflow"):
        run_query(
            mutation,
            variable_values={
                "data": {
                    "vflzId": str(vflz.vflz_id),
                    "optionId": str(simple_workflow.wf_config_id),
                }
            },
        )


def test_work_through_process(
    session, run_query, simple_workflow: wf_models.Workflow, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "Standort 1")
    result = run_query(
        start_prozess_mutation,
        variable_values={
            "data": {
                "vflzId": str(vflz.vflz_id),
                "optionId": str(simple_workflow.wf_config_id),
            }
        },
    )

    workflow_node = session.scalars(
        select(wf_models.WorkflowNode).where(
            wf_models.WorkflowNode.entity_id == vflz.vflz_id
        )
    ).one()

    assert result.data["startStandortProzess"] == {
        "prozess": {
            "taskId": str(workflow_node.wf_node_id),
            "title": "wf:b6395856-9556-48b4-828f-6610d153a3bc:title",
            "sachbearbeitung": [{"subjekt": {"user": {"username": "alma-test"}}}],
        }
    }

    result = run_query(folgeschritte_query, {"taskId": str(workflow_node.wf_node_id)})
    assert result.data["task"]["folgeschritte"] == {
        "availableOptions": [
            {
                "optionId": str(simple_workflow.tasks["task_1"].wf_config_id),
                "title": "wf:b6395856-9556-48b4-828f-6610d153a3bc:task:task_1:title",
                "type": "AUFGABE",
            }
        ],
        "problems": [],
    }

    result = run_query(
        start_folgeschritt_mutation,
        {
            "data": {
                "taskId": str(workflow_node.wf_node_id),
                "optionId": str(simple_workflow.tasks["task_1"].wf_config_id),
            }
        },
    )
    assert (
        result.data["startStandortFolgeschritt"]["task"]["title"]
        == "wf:b6395856-9556-48b4-828f-6610d153a3bc:task:task_1:title"
    )
    assert result.data["startStandortFolgeschritt"]["task"]["sachbearbeitung"] == [
        {"subjekt": {"user": {"username": "alma-test"}}},
    ]
    task_node_id = result.data["startStandortFolgeschritt"]["task"]["taskId"]

    result = run_query(folgeschritte_query, {"taskId": task_node_id})
    assert result.data["task"]["folgeschritte"] == {
        "availableOptions": [
            {
                "optionId": str(
                    simple_workflow.tasks["task_1"].steps[0].step.wf_config_id
                ),
                "title": "wf:b6395856-9556-48b4-828f-6610d153a3bc:task:task_1:step:1:title",
                "type": "DOKUMENT",
            }
        ],
        "problems": [],
    }

    result = run_query(
        start_folgeschritt_mutation,
        {
            "data": {
                "taskId": task_node_id,
                "optionId": str(
                    simple_workflow.tasks["task_1"].steps[0].step.wf_config_id
                ),
            }
        },
    )
    assert (
        result.data["startStandortFolgeschritt"]["task"]["title"]
        == "wf:b6395856-9556-48b4-828f-6610d153a3bc:task:task_1:step:1:title"
    )
    assert result.data["startStandortFolgeschritt"]["task"]["sachbearbeitung"] == [
        {"subjekt": {"user": {"username": "alma-test"}}},
    ]
    document_node_id = result.data["startStandortFolgeschritt"]["task"]["taskId"]

    result = run_query(
        update_dokument_mutation,
        {
            "data": {
                "taskId": document_node_id,
                "title": "Document 1",
                "startDatum": "2025-03-19",
                "notiz": "",
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
                "dokument": "",
                "kategorie": None,
                "oeffentlich": False,
            }
        },
    )
    assert result.data["updateDokument"]["status"] == "ABGESCHLOSSEN"
    assert result.data["updateDokument"]["folgeschritte"] == {
        "availableOptions": [
            {
                "optionId": str(
                    simple_workflow.tasks["task_1"].steps[1].step.wf_config_id
                ),
                "title": "wf:b6395856-9556-48b4-828f-6610d153a3bc:task:task_1:step:2:title",
                "type": "FORMULAR",
            }
        ],
        "problems": [],
    }

    result = run_query(
        start_folgeschritt_mutation,
        {
            "data": {
                "taskId": document_node_id,
                "optionId": str(
                    simple_workflow.tasks["task_1"].steps[1].step.wf_config_id
                ),
            }
        },
    )
    assert (
        result.data["startStandortFolgeschritt"]["task"]["title"]
        == "wf:b6395856-9556-48b4-828f-6610d153a3bc:task:task_1:step:2:title"
    )
    assert result.data["startStandortFolgeschritt"]["task"]["sachbearbeitung"] == [
        {"subjekt": {"user": {"username": "alma-test"}}},
    ]
    form_node_id = result.data["startStandortFolgeschritt"]["task"]["taskId"]

    result = run_query(
        update_formular_mutation,
        {
            "data": {
                "taskId": form_node_id,
                "title": "Form 1",
                "startDatum": "2025-03-19",
                "notiz": "",
                "eingaben": {"field-1": True},
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
            }
        },
    )
    assert result.data["updateFormular"] == {
        "status": "ABGESCHLOSSEN",
        "folgeschritte": {
            "availableOptions": [],
            "problems": _problems("PROZESS_BEENDET"),
        },
    }


CONDITIONAL_WORKFLOW = """
workflow:
  title: Workflow with a form deciding the next task
  version: 1
  min_per_entity: 0
  max_per_entity: null
  start_task_ref: task_1
  tasks:
    task_1:
      title: Task-1
      steps:
        - title: Decision
          type: form
          name: decision
          fields:
            - name: approved
              type: bool
      links:
        - task_ref: task_2
          condition: form.decision.approved == `true`
    task_2:
      title: Task-2
      steps: []
      links:
        - task_ref: END
    END:
      title: __END__
      steps: []
      links: []
"""


def _start_form(
    session, run_query, workflow_manager, workflow_yaml: str = CONDITIONAL_WORKFLOW
) -> tuple[wf_models.Workflow, str]:
    """Start the workflow up to the form of task_1, return the form task id."""
    workflow = workflow_manager.load_workflow_from_file(
        StringIO(workflow_yaml)
    ).workflow
    session.flush()
    vflz = make_vflz(session, "Standort 1")
    result = run_query(
        start_prozess_mutation,
        {"data": {"vflzId": str(vflz.vflz_id), "optionId": str(workflow.wf_config_id)}},
    )
    task_id = result.data["startStandortProzess"]["prozess"]["taskId"]
    for option_id in (
        workflow.tasks["task_1"].wf_config_id,
        workflow.tasks["task_1"].steps[0].step.wf_config_id,
    ):
        result = run_query(
            start_folgeschritt_mutation,
            {"data": {"taskId": task_id, "optionId": str(option_id)}},
        )
        task_id = result.data["startStandortFolgeschritt"]["task"]["taskId"]
    return workflow, task_id


def _update_form(run_query, form_task_id: str, value: bool) -> dict:
    result = run_query(
        update_formular_mutation,
        {
            "data": {
                "taskId": form_task_id,
                "title": "Form 1",
                "startDatum": "2025-03-19",
                "notiz": "",
                "eingaben": {"approved": value},
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
            }
        },
    )
    return result.data["updateFormular"]


def test_folgeschritte_schritt_nicht_abgeschlossen(
    session, run_query, as_bearbeiten_geschaefte, workflow_manager
):
    _, form_task_id = _start_form(session, run_query, workflow_manager)

    result = run_query(folgeschritte_query, {"taskId": form_task_id})

    assert result.data["task"] == {
        "folgeschritte": {
            "availableOptions": [],
            "problems": _problems("SCHRITT_NICHT_ABGESCHLOSSEN"),
        }
    }


def test_folgeschritte_schritt_nicht_abgeschlossen_if_selection_missing(
    session, run_query, as_bearbeiten_geschaefte, workflow_manager
):
    _, form_task_id = _start_form(session, run_query, workflow_manager)

    assert _update_form(run_query, form_task_id, False) == {
        "status": "ABGESCHLOSSEN",
        "folgeschritte": {
            "availableOptions": [],
            "problems": _problems("SCHRITT_NICHT_ABGESCHLOSSEN"),
        },
    }


def test_folgeschritte_without_reasons_if_selection_made(
    session, run_query, as_bearbeiten_geschaefte, workflow_manager
):
    workflow, form_task_id = _start_form(session, run_query, workflow_manager)

    assert _update_form(run_query, form_task_id, True) == {
        "status": "ABGESCHLOSSEN",
        "folgeschritte": {
            "availableOptions": [
                {
                    "optionId": str(workflow.tasks["task_2"].wf_config_id),
                    "title": workflow.tasks["task_2"].title,
                    "type": "AUFGABE",
                }
            ],
            "problems": [],
        },
    }


CONDITIONAL_WORKFLOW_WITH_END = CONDITIONAL_WORKFLOW.replace(
    "condition: form.decision.approved == `true`",
    "condition: form.decision.approved == `true`\n        - task_ref: END",
)


def test_folgeschritte_returns_options_and_problems(
    session, run_query, as_bearbeiten_geschaefte, workflow_manager
):
    workflow, form_task_id = _start_form(
        session, run_query, workflow_manager, CONDITIONAL_WORKFLOW_WITH_END
    )

    # The END link is never offered, but reported next to the valid option.
    assert _update_form(run_query, form_task_id, True)["folgeschritte"] == {
        "availableOptions": [
            {
                "optionId": str(workflow.tasks["task_2"].wf_config_id),
                "title": workflow.tasks["task_2"].title,
                "type": "AUFGABE",
            }
        ],
        "problems": _problems("PROZESS_BEENDET"),
    }


def test_folgeschritte_problems_are_ordered_by_priority(
    session, run_query, as_bearbeiten_geschaefte, workflow_manager
):
    _, form_task_id = _start_form(
        session, run_query, workflow_manager, CONDITIONAL_WORKFLOW_WITH_END
    )

    assert _update_form(run_query, form_task_id, False)["folgeschritte"] == {
        "availableOptions": [],
        "problems": _problems("PROZESS_BEENDET", "SCHRITT_NICHT_ABGESCHLOSSEN"),
    }


def _start_task_1(workflow_manager, session, simple_workflow: wf_models.Workflow):
    vflz = make_vflz(session, "Standort 1")
    workflow_node = workflow_manager.start_workflow(
        simple_workflow.wf_config_id, str(vflz.vflz_id)
    )
    task_node = workflow_manager.start_next_step(
        workflow_node.wf_node_id, simple_workflow.tasks["task_1"].wf_config_id
    )
    return workflow_node, task_node


def test_folgeschritte_task_nicht_abgeschlossen_for_step_of_closed_task(
    session,
    run_query,
    workflow_manager,
    simple_workflow: wf_models.Workflow,
    as_bearbeiten_geschaefte,
):
    _, task_node = _start_task_1(workflow_manager, session, simple_workflow)
    document_node = workflow_manager.start_next_step(
        task_node.wf_node_id,
        simple_workflow.tasks["task_1"].steps[0].step.wf_config_id,
    )
    workflow_manager.update_document_node(document_node.wf_node_id)
    workflow_manager.update_task_node(task_node.wf_node_id, status=NodeStatus.FINISHED)

    result = run_query(folgeschritte_query, {"taskId": str(document_node.wf_node_id)})

    assert result.data["task"]["folgeschritte"] == {
        "availableOptions": [],
        "problems": _problems("TASK_NICHT_ABGESCHLOSSEN"),
    }


def test_folgeschritte_task_nicht_abgeschlossen_for_closed_prozess(
    session,
    run_query,
    workflow_manager,
    simple_workflow: wf_models.Workflow,
    as_bearbeiten_geschaefte,
):
    vflz = make_vflz(session, "Standort 1")
    workflow_node = workflow_manager.start_workflow(
        simple_workflow.wf_config_id, str(vflz.vflz_id)
    )
    workflow_manager.update_workflow_node(
        workflow_node.wf_node_id, status=NodeStatus.FINISHED
    )

    result = run_query(folgeschritte_query, {"taskId": str(workflow_node.wf_node_id)})

    assert result.data["task"]["folgeschritte"] == {
        "availableOptions": [],
        "problems": _problems("TASK_NICHT_ABGESCHLOSSEN"),
    }


def test_folgeschritte_task_ohne_workflow(
    session, run_query, workflow_manager, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "Standort 1")
    task_node = workflow_manager.create_task_node(
        str(vflz.vflz_id), "Aufgabe", datetime(2025, 3, 19)
    )

    result = run_query(folgeschritte_query, {"taskId": str(task_node.wf_node_id)})

    assert result.data["task"]["folgeschritte"] == {
        "availableOptions": [],
        "problems": _problems("TASK_OHNE_WORKFLOW"),
    }


@pytest.mark.parametrize("status", [NodeStatus.SKIPPED, NodeStatus.INACTIVE])
def test_folgeschritte_without_problems_for_skipped_or_inactive_task(
    session,
    run_query,
    workflow_manager,
    simple_workflow: wf_models.Workflow,
    as_bearbeiten_geschaefte,
    status,
):
    _, task_node = _start_task_1(workflow_manager, session, simple_workflow)
    workflow_manager.update_task_node(task_node.wf_node_id, status=status)

    result = run_query(folgeschritte_query, {"taskId": str(task_node.wf_node_id)})

    assert result.data["task"]["folgeschritte"] == {
        "availableOptions": [],
        "problems": [],
    }


def test_can_close_parent_task_if_all_steps_are_closed(
    session, run_query, simple_workflow: wf_models.Workflow, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "Standort 1")

    # at first let's walk through the process and let's close all of the steps
    result = run_query(
        start_prozess_mutation,
        variable_values={
            "data": {
                "vflzId": str(vflz.vflz_id),
                "optionId": str(simple_workflow.wf_config_id),
            }
        },
    )
    workflow_node = session.scalars(
        select(wf_models.WorkflowNode).where(
            wf_models.WorkflowNode.entity_id == vflz.vflz_id
        )
    ).one()

    result = run_query(
        start_folgeschritt_mutation,
        variable_values={
            "data": {
                "taskId": str(workflow_node.wf_node_id),
                "optionId": str(simple_workflow.tasks["task_1"].wf_config_id),
            }
        },
    )

    task_node_id = result.data["startStandortFolgeschritt"]["task"]["taskId"]
    result = run_query(
        start_folgeschritt_mutation,
        variable_values={
            "data": {
                "taskId": str(task_node_id),
                "optionId": str(
                    simple_workflow.tasks["task_1"].steps[0].step.wf_config_id
                ),
            }
        },
    )
    document_node_id = result.data["startStandortFolgeschritt"]["task"]["taskId"]
    result = run_query(
        update_dokument_mutation,
        variable_values={
            "data": {
                "taskId": document_node_id,
                "title": "Document 1",
                "startDatum": "2025-03-19",
                "notiz": "",
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
                "dokument": "",
                "kategorie": None,
                "oeffentlich": False,
            }
        },
    )
    assert result.data["updateDokument"]["status"] == "ABGESCHLOSSEN"
    result = run_query(
        start_folgeschritt_mutation,
        {
            "data": {
                "taskId": document_node_id,
                "optionId": str(
                    simple_workflow.tasks["task_1"].steps[1].step.wf_config_id
                ),
            }
        },
    )
    form_node_id = result.data["startStandortFolgeschritt"]["task"]["taskId"]

    result = run_query(
        update_formular_mutation,
        {
            "data": {
                "taskId": form_node_id,
                "title": "Form 1",
                "startDatum": "2025-03-19",
                "notiz": "",
                "eingaben": {"field-1": True},
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
            }
        },
    )

    result = run_query(
        update_aufgabe_mutation,
        {
            "data": {
                "taskId": task_node_id,
                "title": "foo",
                "startDatum": "2025-03-19",
                "faelligkeitsDatum": None,
                "endDatum": None,
                "status": "ABGESCHLOSSEN",
                "notiz": None,
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
            }
        },
    )
    assert result.data["updateAufgabe"]["status"] == "ABGESCHLOSSEN"


def test_create_new_dokument(session, run_query, as_bearbeiten_geschaefte):
    vflz = make_vflz(session, "Standort 1")
    mutation = """
    mutation m($data: CreateStandortDokumentInput!) {
        createStandortDokument(data: $data) {
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
    assert result.data["createStandortDokument"] == {
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


def test_create_new_aufgabe(session, run_query, as_bearbeiten_geschaefte):
    vflz = make_vflz(session, "Standort 1")
    mutation = """
    mutation m($data: CreateStandortAufgabeInput!) {
        createStandortAufgabe(data: $data) {
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
    assert result.data["createStandortAufgabe"] == {
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


def test_create_new_aufgabe_nested_under_task(
    session, run_query, as_bearbeiten_geschaefte
):
    vflz = make_vflz(session, "Standort 1")
    mutation = """
    mutation m($data: CreateStandortAufgabeInput!) {
        createStandortAufgabe(data: $data) {
            taskId
            parentId
        }
    }
    """

    parent_variables = {
        "data": {
            "title": "Übergeordnete Aufgabe",
            "faelligkeitsDatum": date(2021, 1, 1).isoformat(),
            "vflzId": str(vflz.vflz_id),
            "notiz": "Notiz",
            "startDatum": date(2020, 1, 1).isoformat(),
        }
    }
    parent_result = run_query(mutation, parent_variables)
    parent_task_id = parent_result.data["createStandortAufgabe"]["taskId"]

    child_variables = {
        "data": {
            "title": "Unteraufgabe",
            "faelligkeitsDatum": date(2021, 1, 1).isoformat(),
            "vflzId": str(vflz.vflz_id),
            "notiz": "Notiz",
            "startDatum": date(2020, 1, 1).isoformat(),
            "taskId": parent_task_id,
        }
    }
    child_result = run_query(mutation, child_variables)

    # The new sub-Aufgabe must be nested directly under the selected parent
    # Aufgabe, not the top-level workflow/process node.
    assert child_result.data["createStandortAufgabe"]["parentId"] == parent_task_id


def test_start_folgeschritt_uses_current_vflz_after_historization(
    session, run_query, as_bearbeiten_geschaefte, workflow_manager
):
    """After a Vflz is historized, startFolgeschritt must attach the new task
    node to the current (post-historization) Vflz, not the old snapshot.

    This exercises AlmaWorkflowManager.set_current_vflz, which is invoked from
    the start_folgeschritt mutation resolver immediately after wm's
    start_next_step returns.
    """
    workflow_yaml = """
    workflow:
      title: Historization test workflow
      version: 1
      min_per_entity: 0
      max_per_entity: null
      start_task_ref: task1
      tasks:
        task1:
          title: Task 1
          steps: []
          links:
            - task_ref: task2
        task2:
          title: Task 2
          steps: []
          links:
            - task_ref: END
        END:
          title: __END__
          steps: []
          links: []
    """
    workflow = workflow_manager.load_workflow_from_file(
        StringIO(workflow_yaml)
    ).workflow
    session.flush()

    vflz = make_vflz(session, "Standort 1")
    original_vflz_id = vflz.vflz_id

    # 1) start the workflow (creates the WorkflowNode on the current vflz)
    result = run_query(
        start_prozess_mutation,
        variable_values={
            "data": {
                "vflzId": str(vflz.vflz_id),
                "optionId": str(workflow.wf_config_id),
            }
        },
    )
    workflow_node_id = result.data["startStandortProzess"]["prozess"]["taskId"]

    # 2) start task1
    result = run_query(
        start_folgeschritt_mutation,
        variable_values={
            "data": {
                "taskId": workflow_node_id,
                "optionId": str(workflow.tasks["task1"].wf_config_id),
            }
        },
    )
    task1_node_id = result.data["startStandortFolgeschritt"]["task"]["taskId"]

    # 3) close task1 (needed for links to be evaluated)
    run_query(
        update_aufgabe_mutation,
        variable_values={
            "data": {
                "taskId": task1_node_id,
                "title": "Task 1",
                "startDatum": "2025-01-01",
                "faelligkeitsDatum": None,
                "endDatum": "2025-01-02",
                "status": "ABGESCHLOSSEN",
                "notiz": None,
                "sachbearbeitung": [],
                "sonstigeBeteiligte": [],
            }
        },
    )

    # 4) historize vflz — creates a new current vflz_id
    vflz.historize("test historization")
    session.commit()
    new_vflz_id = vflz.vflz_id
    assert new_vflz_id != original_vflz_id

    # 5) start task2 via the GraphQL mutation; set_current_vflz should refresh
    #    the task2 node to point at the current vflz version.
    result = run_query(
        start_folgeschritt_mutation,
        variable_values={
            "data": {
                "taskId": task1_node_id,
                "optionId": str(workflow.tasks["task2"].wf_config_id),
            }
        },
    )
    task2_node_id = result.data["startStandortFolgeschritt"]["task"]["taskId"]

    task2_node = session.get_one(wf_models.TaskNode, int(task2_node_id))
    session.refresh(task2_node)
    assert int(task2_node.entity_id) == new_vflz_id
