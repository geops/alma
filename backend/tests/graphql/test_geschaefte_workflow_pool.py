from datetime import date
from pathlib import Path

import business_workflow_manager.models as wf
import pytest
from business_workflow_manager.loader import load_workflow_from_file
from business_workflow_manager.types import NodeStatus
from pytest import raises as assert_raises
from sqlalchemy import select
from utils import QueryError, make_pool, make_vfl_pool, make_vflz

pytestmark = [
    # Fixture required by all tests in this module
    pytest.mark.usefixtures("generate_codes"),
]


start_pool_folgeschritt_mutation = """
    mutation m($data: StartPoolFolgeschrittInput!) {
        startPoolFolgeschritt(data: $data) {
            tasks {
                taskId
                title
                type
                vflz { vflzId }
                sachbearbeitung { subjekt { user { username } } }
            }
        }
    }
"""


validate_pool_folgeschritt_query = """
    query q(
        $poolId: ID!
        $optionId: ID
        $validPage: Int!
        $validPerPage: Int!
        $invalidPage: Int!
        $invalidPerPage: Int!
    ) {
        validatePoolFolgeschritt(
            data: { poolId: $poolId, optionId: $optionId }
            validPage: $validPage
            validPerPage: $validPerPage
            invalidPage: $invalidPage
            invalidPerPage: $invalidPerPage
        ) {
            validStandorte {
                numResultsTotal
                numPages
                page
                perPage
                results { vflzId }
            }
            invalidStandorte {
                numResultsTotal
                numPages
                page
                perPage
                results { vflzId }
            }
        }
    }
"""


@pytest.fixture
def simple_workflow(session) -> wf.Workflow:
    path = Path(__file__).parent / "workflows" / "simple.yml"
    with path.open() as f:
        workflow = load_workflow_from_file(session, f).workflow
    return workflow


@pytest.fixture
def branching_form_workflow(session) -> wf.Workflow:
    path = Path(__file__).parent / "workflows" / "branching_form.yml"
    with path.open() as f:
        workflow = load_workflow_from_file(session, f).workflow
    return workflow


def _run_validate(
    run_query,
    pool_id,
    option_id=None,
    valid_page=1,
    valid_per_page=20,
    invalid_page=1,
    invalid_per_page=20,
):
    return run_query(
        validate_pool_folgeschritt_query,
        variable_values={
            "poolId": str(pool_id),
            "optionId": str(option_id) if option_id is not None else None,
            "validPage": valid_page,
            "validPerPage": valid_per_page,
            "invalidPage": invalid_page,
            "invalidPerPage": invalid_per_page,
        },
    )


def _finish_form_at_site(
    workflow: wf.Workflow, vflz, field_a: bool, field_b: bool
) -> wf.FormNode:
    """Set up a site so its leaf is a finished form node with the given values."""
    workflow_node = workflow.create_node(str(vflz.vflz_id))
    start_task_config = workflow.tasks["start_task"]
    task_node = start_task_config.create_node(str(vflz.vflz_id))
    task_node.parent = workflow_node
    workflow_node.next_node = task_node

    form_config = start_task_config.steps[0].step
    assert isinstance(form_config, wf.Form)
    form_node = form_config.create_node(str(vflz.vflz_id))
    form_node.parent = task_node
    task_node.next_node = form_node

    form_data = {"field_a": field_a, "field_b": field_b}
    form_node.form_data = form_data
    form_node.data = {"form": {"choice_form": form_data}}
    form_node.status = NodeStatus.FINISHED

    return form_node


def test_start_pool_prozess_fails_with_insufficient_permission(
    session, run_query, simple_workflow: wf.Workflow, as_lesen_geschaefte
):
    pool = make_pool(session)
    mutation = """
        mutation m($data: StartPoolProzessInput!) {
            startPoolProzess(data: $data) {
                prozesse { taskId }
            }
        }
    """

    with assert_raises(QueryError, match="not allowed"):
        run_query(
            mutation,
            variable_values={
                "data": {
                    "poolId": str(pool.pool_id),
                    "optionId": str(simple_workflow.wf_config_id),
                }
            },
        )


def test_start_pool_prozess_starts_workflow_at_each_site_in_pool(
    session, run_query, simple_workflow: wf.Workflow, as_bearbeiten_geschaefte
):
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)

    mutation = """
        mutation m($data: StartPoolProzessInput!) {
            startPoolProzess(data: $data) {
                prozesse {
                    title
                    vflz { vflzId }
                    sachbearbeitung { subjekt { user { username } } }
                }
            }
        }
    """

    result = run_query(
        mutation,
        variable_values={
            "data": {
                "poolId": str(pool.pool_id),
                "optionId": str(simple_workflow.wf_config_id),
            }
        },
    )

    assert result.data["startPoolProzess"]["prozesse"] == [
        {
            "title": "wf:b6395856-9556-48b4-828f-6610d153a3bc:title",
            "vflz": {"vflzId": str(vflz1.vflz_id)},
            "sachbearbeitung": [{"subjekt": {"user": {"username": "alma-test"}}}],
        },
        {
            "title": "wf:b6395856-9556-48b4-828f-6610d153a3bc:title",
            "vflz": {"vflzId": str(vflz2.vflz_id)},
            "sachbearbeitung": [{"subjekt": {"user": {"username": "alma-test"}}}],
        },
    ]

    nodes = session.scalars(select(wf.WorkflowNode)).all()
    assert {node.entity_id for node in nodes} == {vflz1.vflz_id, vflz2.vflz_id}


def test_start_pool_prozess_continues_after_failure_at_one_site(
    session, run_query, simple_workflow: wf.Workflow, as_bearbeiten_geschaefte
):
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)

    # Reaching the limit at site 1 makes starting the process fail there.
    simple_workflow.max_per_entity = 1
    session.add(simple_workflow.create_node(str(vflz1.vflz_id)))
    session.commit()

    mutation = """
        mutation m($data: StartPoolProzessInput!) {
            startPoolProzess(data: $data) {
                prozesse { vflz { vflzId } }
            }
        }
    """

    result = run_query(
        mutation,
        variable_values={
            "data": {
                "poolId": str(pool.pool_id),
                "optionId": str(simple_workflow.wf_config_id),
            }
        },
    )

    assert result.data["startPoolProzess"]["prozesse"] == [
        {"vflz": {"vflzId": str(vflz2.vflz_id)}},
    ]

    nodes = session.scalars(
        select(wf.WorkflowNode).where(wf.WorkflowNode.entity_id == vflz1.vflz_id)
    ).all()
    # Only the pre-existing node, no additional node was created at site 1.
    assert len(nodes) == 1


def test_create_pool_notiz_creates_notiz_at_each_site_in_pool(
    session, run_query, as_bearbeiten_geschaefte
):
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)

    mutation = """
        mutation m($data: CreatePoolNotizInput!) {
            createPoolNotiz(data: $data) {
                title
                notiz
                kategorie
                oeffentlich
                vflz { vflzId }
                sachbearbeitung { subjekt { user { username } } }
            }
        }
    """

    result = run_query(
        mutation,
        variable_values={
            "data": {
                "title": "Notiz Titel",
                "startDatum": date(2020, 1, 1).isoformat(),
                "poolId": str(pool.pool_id),
                "notiz": "Notiz",
                "kategorie": "code:10022:Kategorie",
                "oeffentlich": True,
            }
        },
    )

    assert result.data["createPoolNotiz"] == [
        {
            "title": "Notiz Titel",
            "notiz": "Notiz",
            "kategorie": "code:10022:Kategorie",
            "oeffentlich": True,
            "vflz": {"vflzId": str(vflz1.vflz_id)},
            "sachbearbeitung": [{"subjekt": {"user": {"username": "alma-test"}}}],
        },
        {
            "title": "Notiz Titel",
            "notiz": "Notiz",
            "kategorie": "code:10022:Kategorie",
            "oeffentlich": True,
            "vflz": {"vflzId": str(vflz2.vflz_id)},
            "sachbearbeitung": [{"subjekt": {"user": {"username": "alma-test"}}}],
        },
    ]


def test_create_pool_dokument_creates_dokument_at_each_site_in_pool(
    session, run_query, as_bearbeiten_geschaefte
):
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)

    mutation = """
        mutation m($data: CreatePoolDokumentInput!) {
            createPoolDokument(data: $data) {
                title
                dokument
                kategorie
                oeffentlich
                vflz { vflzId }
                sachbearbeitung { subjekt { user { username } } }
            }
        }
    """

    result = run_query(
        mutation,
        variable_values={
            "data": {
                "title": "Dokument Titel",
                "startDatum": date(2020, 1, 1).isoformat(),
                "poolId": str(pool.pool_id),
                "dokument": "dummy",
                "notiz": "Notiz",
                "kategorie": "code:10022:Kategorie",
                "oeffentlich": True,
            }
        },
    )

    assert result.data["createPoolDokument"] == [
        {
            "title": "Dokument Titel",
            "dokument": "dummy",
            "kategorie": "code:10022:Kategorie",
            "oeffentlich": True,
            "vflz": {"vflzId": str(vflz1.vflz_id)},
            "sachbearbeitung": [{"subjekt": {"user": {"username": "alma-test"}}}],
        },
        {
            "title": "Dokument Titel",
            "dokument": "dummy",
            "kategorie": "code:10022:Kategorie",
            "oeffentlich": True,
            "vflz": {"vflzId": str(vflz2.vflz_id)},
            "sachbearbeitung": [{"subjekt": {"user": {"username": "alma-test"}}}],
        },
    ]


def test_create_pool_aufgabe_creates_aufgabe_at_each_site_in_pool(
    session, run_query, as_bearbeiten_geschaefte
):
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)

    mutation = """
        mutation m($data: CreatePoolAufgabeInput!) {
            createPoolAufgabe(data: $data) {
                title
                faelligkeitsDatum
                vflz { vflzId }
                sachbearbeitung { subjekt { user { username } } }
            }
        }
    """

    result = run_query(
        mutation,
        variable_values={
            "data": {
                "title": "Aufgabe Titel",
                "startDatum": date(2020, 1, 1).isoformat(),
                "faelligkeitsDatum": date(2021, 1, 1).isoformat(),
                "poolId": str(pool.pool_id),
                "notiz": "Notiz",
            }
        },
    )

    assert result.data["createPoolAufgabe"] == [
        {
            "title": "Aufgabe Titel",
            "faelligkeitsDatum": "2021-01-01",
            "vflz": {"vflzId": str(vflz1.vflz_id)},
            "sachbearbeitung": [{"subjekt": {"user": {"username": "alma-test"}}}],
        },
        {
            "title": "Aufgabe Titel",
            "faelligkeitsDatum": "2021-01-01",
            "vflz": {"vflzId": str(vflz2.vflz_id)},
            "sachbearbeitung": [{"subjekt": {"user": {"username": "alma-test"}}}],
        },
    ]


def test_create_pool_aufgabe_ignores_sites_not_assigned_to_pool(
    session, run_query, as_bearbeiten_geschaefte
):
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)

    mutation = """
        mutation m($data: CreatePoolAufgabeInput!) {
            createPoolAufgabe(data: $data) {
                vflz { vflzId }
            }
        }
    """

    result = run_query(
        mutation,
        variable_values={
            "data": {
                "title": "Aufgabe Titel",
                "startDatum": date(2020, 1, 1).isoformat(),
                "faelligkeitsDatum": date(2021, 1, 1).isoformat(),
                "poolId": str(pool.pool_id),
                "notiz": "Notiz",
            }
        },
    )

    assert result.data["createPoolAufgabe"] == [
        {"vflz": {"vflzId": str(vflz1.vflz_id)}},
    ]


def test_start_pool_folgeschritt_with_task_option_starts_next_step_at_each_leaf(
    session, run_query, simple_workflow: wf.Workflow, as_bearbeiten_geschaefte
):
    """When option_id refers to a task step, the next step is started at each leaf node."""
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)

    # Pre-create WorkflowNodes at each site so a folgeschritt can be started.
    workflow_vflz1 = simple_workflow.create_node(str(vflz1.vflz_id))
    session.add(workflow_vflz1)
    session.add(simple_workflow.create_node(str(vflz2.vflz_id)))
    session.commit()

    task_1_config_id = simple_workflow.tasks["task_1"].wf_config_id

    result = run_query(
        start_pool_folgeschritt_mutation,
        variable_values={
            "data": {
                "poolId": str(pool.pool_id),
                "optionId": str(task_1_config_id),
                "taskId": str(workflow_vflz1.wf_node_id),
            }
        },
    )

    tasks = result.data["startPoolFolgeschritt"]["tasks"]
    assert len(tasks) == 2
    assert {t["vflz"]["vflzId"] for t in tasks} == {
        str(vflz1.vflz_id),
        str(vflz2.vflz_id),
    }
    assert all(t["type"] == "AUFGABE" for t in tasks)
    assert all(
        t["sachbearbeitung"] == [{"subjekt": {"user": {"username": "alma-test"}}}]
        for t in tasks
    )

    # A TaskNode was created at each site.
    task_nodes = session.scalars(select(wf.TaskNode)).all()
    assert {n.entity_id for n in task_nodes} == {vflz1.vflz_id, vflz2.vflz_id}


def test_start_pool_folgeschritt_skips_sites_without_matching_leaf(
    session, run_query, simple_workflow: wf.Workflow, as_bearbeiten_geschaefte
):
    """Only leaf nodes with the same config as the node given by taskId are
    considered. Site 1 has no such leaf (its leaf is task_1), so it is skipped
    while site 2 is advanced."""
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)

    # Site 1: workflow started AND task_1 started (leaf = task_1 node).
    workflow_node_1 = simple_workflow.create_node(str(vflz1.vflz_id))
    session.add(workflow_node_1)
    task_1_config = simple_workflow.tasks["task_1"]
    task_node_1 = task_1_config.create_node(str(vflz1.vflz_id))
    task_node_1.parent = workflow_node_1
    workflow_node_1.next_node = task_node_1
    session.add(task_node_1)

    # Site 2: only workflow started (leaf = workflow node).
    session.add(simple_workflow.create_node(str(vflz2.vflz_id)))
    session.commit()

    # Requesting task_1 based on the workflow node: only site 2 has a workflow
    # node as its leaf (site 1 already has task_1 running).
    result = run_query(
        start_pool_folgeschritt_mutation,
        variable_values={
            "data": {
                "poolId": str(pool.pool_id),
                "optionId": str(task_1_config.wf_config_id),
                "taskId": str(workflow_node_1.wf_node_id),
            }
        },
    )

    tasks = result.data["startPoolFolgeschritt"]["tasks"]
    assert len(tasks) == 1
    assert tasks[0]["vflz"]["vflzId"] == str(vflz2.vflz_id)
    assert tasks[0]["type"] == "AUFGABE"

    session.refresh(task_node_1)
    assert not task_node_1.next_node


def test_start_pool_folgeschritt_ignores_sites_not_assigned_to_pool(
    session, run_query, simple_workflow: wf.Workflow, as_bearbeiten_geschaefte
):
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)

    # Only the vflz in the pool has a workflow started.
    workflow_node = simple_workflow.create_node(str(vflz1.vflz_id))
    session.add(workflow_node)
    session.commit()

    task_1_config_id = simple_workflow.tasks["task_1"].wf_config_id

    result = run_query(
        start_pool_folgeschritt_mutation,
        variable_values={
            "data": {
                "poolId": str(pool.pool_id),
                "optionId": str(task_1_config_id),
                "taskId": str(workflow_node.wf_node_id),
            }
        },
    )

    tasks = result.data["startPoolFolgeschritt"]["tasks"]
    assert len(tasks) == 1
    assert tasks[0]["vflz"]["vflzId"] == str(vflz1.vflz_id)


def test_start_pool_folgeschritt_only_advances_sites_where_step_is_valid(
    session, run_query, simple_workflow: wf.Workflow, as_bearbeiten_geschaefte
):
    """Pool with three sites: one has a started task, the others only the workflow.

    Starting the folgeschritt of the started task's first step (Document-1) should
    only advance the site where task_1 is already running. The other two sites
    have the WorkflowNode as their leaf, which does not match the config of the
    node given by taskId, so they are not considered at all.
    """
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    vflz3 = make_vflz(session, "Standort 3", vfl_id=3, combined_id="combined-id-3")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)
    make_vfl_pool(session, vflz3.vfl_id, pool)

    # Site 1: workflow started AND task_1 started.
    workflow_node_1 = simple_workflow.create_node(str(vflz1.vflz_id))
    session.add(workflow_node_1)
    task_1_config = simple_workflow.tasks["task_1"]
    task_node_1 = task_1_config.create_node(str(vflz1.vflz_id))
    task_node_1.parent = workflow_node_1
    workflow_node_1.next_node = task_node_1
    session.add(task_node_1)

    # Sites 2 & 3: only the workflow is started.
    session.add(simple_workflow.create_node(str(vflz2.vflz_id)))
    session.add(simple_workflow.create_node(str(vflz3.vflz_id)))
    session.commit()

    # Try to start Document-1 (the first step of task_1).
    document_1_config_id = task_1_config.steps[0].step.wf_config_id

    result = run_query(
        start_pool_folgeschritt_mutation,
        variable_values={
            "data": {
                "poolId": str(pool.pool_id),
                "optionId": str(document_1_config_id),
                "taskId": str(task_node_1.wf_node_id),
            }
        },
    )

    tasks = result.data["startPoolFolgeschritt"]["tasks"]
    # Only site 1 has task_1 running, so only there Document-1 is a valid next step.
    assert len(tasks) == 1
    assert tasks[0]["vflz"]["vflzId"] == str(vflz1.vflz_id)
    assert tasks[0]["type"] == "DOKUMENT"

    # No DocumentNode was created at sites 2 or 3.
    document_nodes = session.scalars(select(wf.DocumentNode)).all()
    assert [n.entity_id for n in document_nodes] == [vflz1.vflz_id]


def test_start_pool_folgeschritt_respects_form_conditions_per_site(
    session, run_query, branching_form_workflow: wf.Workflow, as_bearbeiten_geschaefte
):
    """Two sites, both with a finished form as their leaf, tagged with different
    boolean fields. The workflow has one link per field. Starting the folgeschritt
    for task A must only advance the site whose form has field_a set; starting the
    folgeschritt for task B must only advance the other site.
    """
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)

    form_node_1 = _finish_form_at_site(
        branching_form_workflow, vflz1, field_a=True, field_b=False
    )
    form_node_2 = _finish_form_at_site(
        branching_form_workflow, vflz2, field_a=False, field_b=True
    )

    # we need to perform two commits since SA would perform a bulk insert,
    # which would not cast the entity_id from str to int
    session.add(form_node_1)
    session.commit()

    session.add(form_node_2)
    session.commit()

    task_a_config_id = branching_form_workflow.tasks["task_a"].wf_config_id
    task_b_config_id = branching_form_workflow.tasks["task_b"].wf_config_id

    # Requesting task A: only site 1 (with field_a=true) must advance.
    result = run_query(
        start_pool_folgeschritt_mutation,
        variable_values={
            "data": {
                "poolId": str(pool.pool_id),
                "optionId": str(task_a_config_id),
                "taskId": str(form_node_1.wf_node_id),
            }
        },
    )
    tasks = result.data["startPoolFolgeschritt"]["tasks"]
    assert len(tasks) == 1
    assert tasks[0]["vflz"]["vflzId"] == str(vflz1.vflz_id)
    assert (
        tasks[0]["title"] == "wf:87197df2-7867-43e3-93d4-3b24a5384958:task:task_a:title"
    )

    # Requesting task B: only site 2 (with field_b=true) must advance.
    result = run_query(
        start_pool_folgeschritt_mutation,
        variable_values={
            "data": {
                "poolId": str(pool.pool_id),
                "optionId": str(task_b_config_id),
                "taskId": str(form_node_1.wf_node_id),
            }
        },
    )
    tasks = result.data["startPoolFolgeschritt"]["tasks"]
    assert len(tasks) == 1
    assert tasks[0]["vflz"]["vflzId"] == str(vflz2.vflz_id)
    assert (
        tasks[0]["title"] == "wf:87197df2-7867-43e3-93d4-3b24a5384958:task:task_b:title"
    )

    # The created TaskNodes are of the correct config at each site.
    task_nodes_by_entity = {
        n.entity_id: n
        for n in session.scalars(select(wf.TaskNode)).all()
        if n.wf_config_id != branching_form_workflow.tasks["start_task"].wf_config_id
    }
    assert task_nodes_by_entity[vflz1.vflz_id].wf_config_id == task_a_config_id
    assert task_nodes_by_entity[vflz2.vflz_id].wf_config_id == task_b_config_id


def test_validate_pool_folgeschritt_without_option_all_sites_are_valid(
    session, run_query, simple_workflow: wf.Workflow, as_lesen_geschaefte
):
    """When no optionId is given every site in the pool is considered valid."""
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)

    result = _run_validate(run_query, pool.pool_id)
    data = result.data["validatePoolFolgeschritt"]

    assert data["validStandorte"]["numResultsTotal"] == 2
    assert data["invalidStandorte"]["numResultsTotal"] == 0
    assert {r["vflzId"] for r in data["validStandorte"]["results"]} == {
        str(vflz1.vflz_id),
        str(vflz2.vflz_id),
    }


def test_validate_pool_folgeschritt_with_task_option(
    session, run_query, simple_workflow: wf.Workflow, as_lesen_geschaefte
):
    """Sites whose leaf node has the given task as the next valid step are valid."""
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)

    # Site 1 has the workflow started so task_1 is a valid next step.
    session.add(simple_workflow.create_node(str(vflz1.vflz_id)))
    # Site 2 has no workflow started so task_1 is not a valid next step.
    session.commit()

    task_1_config_id = simple_workflow.tasks["task_1"].wf_config_id
    result = _run_validate(run_query, pool.pool_id, option_id=task_1_config_id)
    data = result.data["validatePoolFolgeschritt"]

    assert data["validStandorte"]["numResultsTotal"] == 1
    assert data["invalidStandorte"]["numResultsTotal"] == 1
    assert data["validStandorte"]["results"][0]["vflzId"] == str(vflz1.vflz_id)
    assert data["invalidStandorte"]["results"][0]["vflzId"] == str(vflz2.vflz_id)


def test_validate_pool_folgeschritt_with_document_option(
    session, run_query, simple_workflow: wf.Workflow, as_lesen_geschaefte
):
    """A document step that is the next valid step makes the site valid."""
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)

    # Site 1: workflow and task_1 already started → document-1 is the next step.
    workflow_node_1 = simple_workflow.create_node(str(vflz1.vflz_id))
    session.add(workflow_node_1)
    task_1_config = simple_workflow.tasks["task_1"]
    task_node_1 = task_1_config.create_node(str(vflz1.vflz_id))
    task_node_1.parent = workflow_node_1
    workflow_node_1.next_node = task_node_1
    session.add(task_node_1)

    # Site 2: only workflow started → document-1 is not the next step.
    session.add(simple_workflow.create_node(str(vflz2.vflz_id)))
    session.commit()

    document_1_config_id = task_1_config.steps[0].step.wf_config_id
    result = _run_validate(run_query, pool.pool_id, option_id=document_1_config_id)
    data = result.data["validatePoolFolgeschritt"]

    assert data["validStandorte"]["numResultsTotal"] == 1
    assert data["invalidStandorte"]["numResultsTotal"] == 1
    assert data["validStandorte"]["results"][0]["vflzId"] == str(vflz1.vflz_id)
    assert data["invalidStandorte"]["results"][0]["vflzId"] == str(vflz2.vflz_id)


def test_validate_pool_folgeschritt_ignores_sites_not_in_pool(
    session, run_query, simple_workflow: wf.Workflow, as_lesen_geschaefte
):
    """Sites that are not assigned to the pool are not considered at all."""
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    # vflz2 is NOT in the pool.
    session.add(simple_workflow.create_node(str(vflz1.vflz_id)))
    session.add(simple_workflow.create_node(str(vflz2.vflz_id)))
    session.commit()

    task_1_config_id = simple_workflow.tasks["task_1"].wf_config_id
    result = _run_validate(run_query, pool.pool_id, option_id=task_1_config_id)
    data = result.data["validatePoolFolgeschritt"]

    assert data["validStandorte"]["numResultsTotal"] == 1
    assert data["invalidStandorte"]["numResultsTotal"] == 0
    assert data["validStandorte"]["results"][0]["vflzId"] == str(vflz1.vflz_id)


def test_validate_pool_folgeschritt_pagination_valid_standorte(
    session, run_query, simple_workflow: wf.Workflow, as_lesen_geschaefte
):
    """Pagination parameters for valid standorte are respected."""
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    vflz3 = make_vflz(session, "Standort 3", vfl_id=3, combined_id="combined-id-3")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)
    make_vfl_pool(session, vflz3.vfl_id, pool)

    # All three sites have the workflow started → all three are valid for task_1.
    session.add(simple_workflow.create_node(str(vflz1.vflz_id)))
    session.add(simple_workflow.create_node(str(vflz2.vflz_id)))
    session.add(simple_workflow.create_node(str(vflz3.vflz_id)))
    session.commit()

    task_1_config_id = simple_workflow.tasks["task_1"].wf_config_id

    # Page 1 of 2 with per_page=2
    result = _run_validate(
        run_query,
        pool.pool_id,
        option_id=task_1_config_id,
        valid_page=1,
        valid_per_page=2,
    )
    data = result.data["validatePoolFolgeschritt"]
    assert data["validStandorte"]["numResultsTotal"] == 3
    assert data["validStandorte"]["numPages"] == 2
    assert data["validStandorte"]["page"] == 1
    assert data["validStandorte"]["perPage"] == 2
    assert len(data["validStandorte"]["results"]) == 2

    # Page 2 of 2
    result = _run_validate(
        run_query,
        pool.pool_id,
        option_id=task_1_config_id,
        valid_page=2,
        valid_per_page=2,
    )
    data = result.data["validatePoolFolgeschritt"]
    assert data["validStandorte"]["numResultsTotal"] == 3
    assert data["validStandorte"]["page"] == 2
    assert len(data["validStandorte"]["results"]) == 1


def test_validate_pool_folgeschritt_pagination_invalid_standorte(
    session, run_query, simple_workflow: wf.Workflow, as_lesen_geschaefte
):
    """Pagination parameters for invalid standorte are respected."""
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    vflz3 = make_vflz(session, "Standort 3", vfl_id=3, combined_id="combined-id-3")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)
    make_vfl_pool(session, vflz3.vfl_id, pool)

    # None of the three sites has any nodes → all are invalid for task_1.
    session.commit()

    task_1_config_id = simple_workflow.tasks["task_1"].wf_config_id

    result = _run_validate(
        run_query,
        pool.pool_id,
        option_id=task_1_config_id,
        invalid_page=1,
        invalid_per_page=2,
    )
    data = result.data["validatePoolFolgeschritt"]
    assert data["invalidStandorte"]["numResultsTotal"] == 3
    assert data["invalidStandorte"]["numPages"] == 2
    assert data["invalidStandorte"]["page"] == 1
    assert data["invalidStandorte"]["perPage"] == 2
    assert len(data["invalidStandorte"]["results"]) == 2

    result = _run_validate(
        run_query,
        pool.pool_id,
        option_id=task_1_config_id,
        invalid_page=2,
        invalid_per_page=2,
    )
    data = result.data["validatePoolFolgeschritt"]
    assert data["invalidStandorte"]["page"] == 2
    assert len(data["invalidStandorte"]["results"]) == 1


def test_validate_pool_folgeschritt_respects_form_conditions_per_site(
    session, run_query, branching_form_workflow: wf.Workflow, as_lesen_geschaefte
):
    """Validation honours form-based link conditions: task_a is only valid where
    field_a is true, and task_b only where field_b is true."""
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)

    form_node_1 = _finish_form_at_site(
        branching_form_workflow, vflz1, field_a=True, field_b=False
    )
    form_node_2 = _finish_form_at_site(
        branching_form_workflow, vflz2, field_a=False, field_b=True
    )

    # we need to perform two commits since SA would perform a bulk insert,
    # which would not cast the entity_id from str to int
    session.add(form_node_1)
    session.commit()

    session.add(form_node_2)
    session.commit()

    task_a_config_id = branching_form_workflow.tasks["task_a"].wf_config_id
    task_b_config_id = branching_form_workflow.tasks["task_b"].wf_config_id

    result_a = _run_validate(run_query, pool.pool_id, option_id=task_a_config_id)
    data_a = result_a.data["validatePoolFolgeschritt"]
    assert data_a["validStandorte"]["numResultsTotal"] == 1
    assert data_a["invalidStandorte"]["numResultsTotal"] == 1
    assert data_a["validStandorte"]["results"][0]["vflzId"] == str(vflz1.vflz_id)
    assert data_a["invalidStandorte"]["results"][0]["vflzId"] == str(vflz2.vflz_id)

    result_b = _run_validate(run_query, pool.pool_id, option_id=task_b_config_id)
    data_b = result_b.data["validatePoolFolgeschritt"]
    assert data_b["validStandorte"]["numResultsTotal"] == 1
    assert data_b["invalidStandorte"]["numResultsTotal"] == 1
    assert data_b["validStandorte"]["results"][0]["vflzId"] == str(vflz2.vflz_id)
    assert data_b["invalidStandorte"]["results"][0]["vflzId"] == str(vflz1.vflz_id)


def test_start_pool_folgeschritt_skips_sites_where_step_is_invalid(
    session, run_query, simple_workflow: wf.Workflow, as_bearbeiten_geschaefte
):
    """All sites have a matching leaf (the workflow node), but the requested
    option (Document-1) is not a valid next step there. start_next_step raises
    InvalidWorkflowStep at each site, which must be swallowed."""
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)

    workflow_node_1 = simple_workflow.create_node(str(vflz1.vflz_id))
    session.add(workflow_node_1)
    session.add(simple_workflow.create_node(str(vflz2.vflz_id)))
    session.commit()

    document_1_config_id = simple_workflow.tasks["task_1"].steps[0].step.wf_config_id

    result = run_query(
        start_pool_folgeschritt_mutation,
        variable_values={
            "data": {
                "poolId": str(pool.pool_id),
                "optionId": str(document_1_config_id),
                "taskId": str(workflow_node_1.wf_node_id),
            }
        },
    )

    assert result.data["startPoolFolgeschritt"]["tasks"] == []
    assert session.scalars(select(wf.DocumentNode)).all() == []
    assert session.scalars(select(wf.TaskNode)).all() == []


def test_start_pool_folgeschritt_uses_current_vflz_after_historization(
    session, run_query, simple_workflow: wf.Workflow, as_bearbeiten_geschaefte
):
    """Leaf nodes attached to an older vflz version of a site in the pool are
    found, and only the current vflz is reported/processed (once per site)."""
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)

    old_vflz_id = vflz1.vflz_id
    workflow_node = simple_workflow.create_node(str(old_vflz_id))
    session.add(workflow_node)
    session.commit()

    vflz1.historize("test historization")
    session.commit()
    new_vflz_id = vflz1.vflz_id
    assert new_vflz_id != old_vflz_id

    result = run_query(
        start_pool_folgeschritt_mutation,
        variable_values={
            "data": {
                "poolId": str(pool.pool_id),
                "optionId": str(simple_workflow.tasks["task_1"].wf_config_id),
                "taskId": str(workflow_node.wf_node_id),
            }
        },
    )

    tasks = result.data["startPoolFolgeschritt"]["tasks"]
    assert len(tasks) == 1
    assert tasks[0]["vflz"]["vflzId"] == str(new_vflz_id)


def test_validate_pool_folgeschritt_with_prozess_option(
    session, run_query, simple_workflow: wf.Workflow, as_lesen_geschaefte
):
    """For a Prozess option, a site is invalid once max_per_entity is reached."""
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    vflz2 = make_vflz(session, "Standort 2", vfl_id=2, combined_id="combined-id-2")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)
    make_vfl_pool(session, vflz2.vfl_id, pool)

    simple_workflow.max_per_entity = 1
    session.add(simple_workflow.create_node(str(vflz1.vflz_id)))
    session.commit()

    result = _run_validate(
        run_query, pool.pool_id, option_id=simple_workflow.wf_config_id
    )
    data = result.data["validatePoolFolgeschritt"]

    assert data["validStandorte"]["numResultsTotal"] == 1
    assert data["invalidStandorte"]["numResultsTotal"] == 1
    assert data["validStandorte"]["results"][0]["vflzId"] == str(vflz2.vflz_id)
    assert data["invalidStandorte"]["results"][0]["vflzId"] == str(vflz1.vflz_id)


def test_validate_pool_folgeschritt_after_historization(
    session, run_query, simple_workflow: wf.Workflow, as_lesen_geschaefte
):
    """Nodes on an older vflz version count for the site; only the current
    vflz is reported."""
    vflz1 = make_vflz(session, "Standort 1", vfl_id=1, combined_id="combined-id-1")
    pool = make_pool(session)
    make_vfl_pool(session, vflz1.vfl_id, pool)

    session.add(simple_workflow.create_node(str(vflz1.vflz_id)))
    session.commit()
    vflz1.historize("test historization")
    session.commit()

    result = _run_validate(
        run_query,
        pool.pool_id,
        option_id=simple_workflow.tasks["task_1"].wf_config_id,
    )
    data = result.data["validatePoolFolgeschritt"]
    assert data["validStandorte"]["numResultsTotal"] == 1
    assert data["invalidStandorte"]["numResultsTotal"] == 0
    assert data["validStandorte"]["results"][0]["vflzId"] == str(vflz1.vflz_id)
