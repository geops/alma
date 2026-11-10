from datetime import datetime, timedelta

import pytest
from business_workflow_manager.types import NodeStatus
from sqlalchemy import select
from utils import (
    make_document_node,
    make_form_node,
    make_note_node,
    make_task_node,
    make_vflz,
    make_vflz_beurteilung,
)

from alma import constants
from alma.graphql.types.workflow import FaelligkeitStatus
from alma.models import codes

pytestmark = [
    # Fixture required by all tests in this module
    # Run all tests in this module using the "lesen sachdaten" role unless otherwise specified
    pytest.mark.usefixtures("generate_codes", "as_lesen_sachdaten"),
]


@pytest.mark.parametrize(
    "vflz_created_dates, stats",
    [
        (
            {
                "ablagerung1": timedelta(days=-1),
                "betrieb1": timedelta(days=-1),
                "ablagerung2_historized": timedelta(days=-1),
                "ablagerung2": timedelta(days=1),
                "unfall": timedelta(days=2),
                "teilstandort_unfall": timedelta(days=3),
            },
            [
                {"typ": "ABLAGERUNG", "count": 2},
                {"typ": "BETRIEB", "count": 1},
                {"typ": "UNFALL", "count": 0},
                {"typ": "SCHIESSANLAGE", "count": 0},
                {"typ": "KINDERSPIELPLATZ_GRUENFLAECHE", "count": 0},
                {"typ": "PFAS", "count": 0},
            ],
        ),
        (
            {
                "ablagerung1": timedelta(days=1),
                "betrieb1": timedelta(days=2),
                "ablagerung2_historized": timedelta(days=-2),
                "ablagerung2": timedelta(days=-1),
                "unfall": timedelta(days=-1),
                "teilstandort_unfall": timedelta(days=-1),
            },
            [
                {"typ": "ABLAGERUNG", "count": 1},
                {"typ": "BETRIEB", "count": 0},
                {"typ": "UNFALL", "count": 2},
                {"typ": "SCHIESSANLAGE", "count": 0},
                {"typ": "KINDERSPIELPLATZ_GRUENFLAECHE", "count": 0},
                {"typ": "PFAS", "count": 0},
            ],
        ),
        (
            {
                "ablagerung1": timedelta(days=0),
                "betrieb1": timedelta(days=2),
                "ablagerung2_historized": timedelta(days=-2),
                "ablagerung2": timedelta(days=-1),
                "unfall": timedelta(days=-1),
                "teilstandort_unfall": timedelta(days=-1),
            },
            [
                {"typ": "ABLAGERUNG", "count": 2},
                {"typ": "BETRIEB", "count": 0},
                {"typ": "UNFALL", "count": 2},
                {"typ": "SCHIESSANLAGE", "count": 0},
                {"typ": "KINDERSPIELPLATZ_GRUENFLAECHE", "count": 0},
                {"typ": "PFAS", "count": 0},
            ],
        ),
    ],
)
def test_get_dashboard_standort_typen_statistic(
    session, run_query, vflz_created_dates, stats
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

    standorttyp_ablagerung = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.ABLAGERUNG
        )
    ).one()
    standorttyp_betrieb = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.BETRIEB
        )
    ).one()
    standorttyp_unfall = session.scalars(
        select(codes.StandortTyp).where(
            codes.StandortTyp.code == constants.StandortTyp.UNFALL
        )
    ).one()

    stichtag = datetime(2020, 1, 1, 13)
    vflz = make_vflz(session, "My Site", 1)
    vflz.vflz_created_date = stichtag + vflz_created_dates["ablagerung1"]
    vflz.vftyp = standorttyp_ablagerung

    vflz2 = make_vflz(session, "My Site 2", 2)
    vflz2.vflz_created_date = stichtag + vflz_created_dates["betrieb1"]
    vflz2.vftyp = standorttyp_betrieb

    vflz3 = make_vflz(session, "My Site 3", 3)
    vflz3.vflz_created_date = stichtag + vflz_created_dates["ablagerung2_historized"]
    vflz3.vftyp = standorttyp_ablagerung

    vflz3.historize("message")
    vflz3.vflz_created_date = stichtag + vflz_created_dates["ablagerung2"]

    vflz4 = make_vflz(session, "My Site 4", 4)
    vflz4.vflz_created_date = stichtag + vflz_created_dates["unfall"]
    vflz4.vftyp = standorttyp_unfall

    assert vflz4.gemeinde
    vflz4.create_teilstandort(
        combined_id="teilstandort-combined-id",
        gemeinde=vflz4.gemeinde,
        bezeichnung="Teilstand von vflz 4",
        parent_geometry=parent_geometry,
        parent_zentroid=None,
        teilstandort_geometry=teilstandort_geometry,
        teilstandort_zentroid=None,
    )
    vflz4.vflz_created_date = stichtag + vflz_created_dates["teilstandort_unfall"]
    session.commit()

    query = """
    query q($stichtag: Date! ){
        dashboardStatistic(stichtag: $stichtag) {
            standortTypen {
                typ
                count
            }
        }
    }
    """
    result = run_query(query, variable_values={"stichtag": stichtag.date().isoformat()})

    assert result.data["dashboardStatistic"]["standortTypen"] == stats


@pytest.mark.parametrize(
    "vflz_created_dates, stats",
    [
        (
            {
                "vflz1_historized": timedelta(days=-2),
                "vflz1": timedelta(days=-1),
                "vflz2": timedelta(days=-1),
                "vflz3": timedelta(days=-1),
                "vflz4_historized": timedelta(days=-1),
                "vflz4": timedelta(days=1),
                "vflz4_teilstandort": timedelta(days=1),
            },
            [
                {
                    "beurteilungGruppe": "code:1031:Test",
                    "count": 2,
                },
                {
                    "beurteilungGruppe": "code:1031:Test2",
                    "count": 1,
                },
            ],
        ),
        (
            {
                "vflz1_historized": timedelta(days=-2),
                "vflz1": timedelta(days=1),
                "vflz2": timedelta(days=1),
                "vflz3": timedelta(days=1),
                "vflz4_historized": timedelta(days=1),
                "vflz4": timedelta(days=1),
                "vflz4_teilstandort": timedelta(days=-1),
            },
            [
                {
                    "beurteilungGruppe": "code:1031:Test",
                    "count": 1,
                },
                {
                    "beurteilungGruppe": "code:1031:Test2",
                    "count": 1,
                },
            ],
        ),
        (
            {
                "vflz1_historized": timedelta(days=0),
                "vflz1": timedelta(days=1),
                "vflz2": timedelta(days=1),
                "vflz3": timedelta(days=1),
                "vflz4_historized": timedelta(days=1),
                "vflz4": timedelta(days=1),
                "vflz4_teilstandort": timedelta(days=-1),
            },
            [
                {
                    "beurteilungGruppe": "code:1031:Test",
                    "count": 1,
                },
                {
                    "beurteilungGruppe": "code:1031:Test2",
                    "count": 1,
                },
            ],
        ),
    ],
)
def test_get_beurteilung_gruppen_statistic(
    session, run_query, vflz_created_dates, stats
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

    stichtag = datetime(2020, 1, 1, 13)
    beurteilung1 = session.scalars(
        select(codes.Beurteilung).where(codes.Beurteilung.code == "test")
    ).one()
    beurteilung2 = session.scalars(
        select(codes.Beurteilung).where(codes.Beurteilung.code == "test2")
    ).one()
    beurteilung_gruppe = session.scalars(
        select(codes.BeurteilungGruppe).where(codes.BeurteilungGruppe.code == "Test")
    ).one()
    beurteilung_gruppe2 = session.scalars(
        select(codes.BeurteilungGruppe).where(codes.BeurteilungGruppe.code == "Test2")
    ).one()

    kbsinfo1 = codes.KbsInfo(
        beurteilung=beurteilung1,
        beurteilung_gruppe=beurteilung_gruppe,
        color="#ff0000",
        color_rgb=None,
        belastet=True,
    )
    kbsinfo2 = codes.KbsInfo(
        beurteilung=beurteilung2,
        beurteilung_gruppe=beurteilung_gruppe2,
        color="#00ff00",
        color_rgb=None,
        belastet=False,
    )
    session.add_all([kbsinfo1, kbsinfo2])
    session.commit()

    vflz1 = make_vflz(session, "My Site 1", 1)
    vflz1.vflz_created_date = stichtag + vflz_created_dates["vflz1_historized"]
    make_vflz_beurteilung(session, vflz1, "test2")
    vflz1.historize("historize")
    make_vflz_beurteilung(session, vflz1, "test")
    vflz1.vflz_created_date = stichtag + vflz_created_dates["vflz1"]

    vflz2 = make_vflz(session, "My Site 2", 2)
    vflz2.vflz_created_date = stichtag + vflz_created_dates["vflz2"]
    make_vflz_beurteilung(session, vflz2, "test")

    vflz3 = make_vflz(session, "My Site 3", 3)
    vflz3.vflz_created_date = stichtag + vflz_created_dates["vflz3"]
    make_vflz_beurteilung(session, vflz3, "test2")

    vflz4 = make_vflz(session, "My Site 4", 4)
    vflz4.vflz_created_date = stichtag + vflz_created_dates["vflz4_historized"]
    vflz4.historize("message")
    make_vflz_beurteilung(session, vflz4, "test2")
    vflz4.vflz_created_date = stichtag + vflz_created_dates["vflz4"]

    assert vflz4.gemeinde
    vflz4.create_teilstandort(
        combined_id="teilstandort-combined-id",
        gemeinde=vflz4.gemeinde,
        bezeichnung="Teilstand von vflz 4",
        parent_geometry=parent_geometry,
        parent_zentroid=None,
        teilstandort_geometry=teilstandort_geometry,
        teilstandort_zentroid=None,
    )
    vflz4.vflz_created_date = stichtag + vflz_created_dates["vflz4_teilstandort"]
    make_vflz_beurteilung(session, vflz4, "test")

    query = """
    query q($stichtag: Date! ){
        dashboardStatistic(stichtag: $stichtag) {
            beurteilungen {
                beurteilungGruppe
                count
            }
        }
    }
    """

    result = run_query(query, variable_values={"stichtag": stichtag.date().isoformat()})
    assert result.data["dashboardStatistic"]["beurteilungen"] == stats


@pytest.mark.parametrize(
    "node1_data, node2_data, stats",
    [
        (
            {
                "started_at": timedelta(days=-1),
                "finished_at": None,
                "deadline": None,
                "status": NodeStatus.STARTED,
            },
            {
                "started_at": timedelta(days=-1),
                "finished_at": None,
                "deadline": timedelta(days=4),
                "status": NodeStatus.SKIPPED,
            },
            [
                {"faelligkeit": FaelligkeitStatus.UEBERFAELLIG.name, "count": 0},
                {
                    "faelligkeit": FaelligkeitStatus.FAELLIG_NAECHSTE_WOCHE.name,
                    "count": 0,
                },
                {"faelligkeit": FaelligkeitStatus.FAELLIG_SPAETER.name, "count": 0},
                {"faelligkeit": FaelligkeitStatus.RUHEND.name, "count": 1},
            ],
        ),
        (
            {
                "started_at": timedelta(days=-1),
                "finished_at": None,
                "deadline": timedelta(days=4),
                "status": NodeStatus.STARTED,
            },
            {
                "started_at": timedelta(days=-1),
                "finished_at": None,
                "deadline": timedelta(days=-1),
                "status": NodeStatus.STARTED,
            },
            [
                {"faelligkeit": FaelligkeitStatus.UEBERFAELLIG.name, "count": 1},
                {
                    "faelligkeit": FaelligkeitStatus.FAELLIG_NAECHSTE_WOCHE.name,
                    "count": 1,
                },
                {"faelligkeit": FaelligkeitStatus.FAELLIG_SPAETER.name, "count": 0},
                {"faelligkeit": FaelligkeitStatus.RUHEND.name, "count": 0},
            ],
        ),
        (
            {
                "started_at": timedelta(days=-1),
                "finished_at": timedelta(days=-1),
                "deadline": None,
                "status": NodeStatus.INACTIVE,
            },
            {
                "started_at": timedelta(days=-1),
                "finished_at": None,
                "deadline": timedelta(days=21),
                "status": NodeStatus.STARTED,
            },
            [
                {"faelligkeit": FaelligkeitStatus.UEBERFAELLIG.name, "count": 0},
                {
                    "faelligkeit": FaelligkeitStatus.FAELLIG_NAECHSTE_WOCHE.name,
                    "count": 1,
                },
                {"faelligkeit": FaelligkeitStatus.FAELLIG_SPAETER.name, "count": 0},
                {"faelligkeit": FaelligkeitStatus.RUHEND.name, "count": 0},
            ],
        ),
        (
            {
                "started_at": timedelta(days=-1),
                "finished_at": None,
                "deadline": None,
                "status": NodeStatus.INACTIVE,
            },
            {
                "started_at": timedelta(days=0),
                "finished_at": timedelta(days=1),
                "deadline": timedelta(days=12),
                "status": NodeStatus.STARTED,
            },
            [
                {"faelligkeit": FaelligkeitStatus.UEBERFAELLIG.name, "count": 0},
                {
                    "faelligkeit": FaelligkeitStatus.FAELLIG_NAECHSTE_WOCHE.name,
                    "count": 0,
                },
                {"faelligkeit": FaelligkeitStatus.FAELLIG_SPAETER.name, "count": 0},
                {"faelligkeit": FaelligkeitStatus.RUHEND.name, "count": 1},
            ],
        ),
    ],
)
def test_get_geschaefte_faelligkeit_statistic(
    session, run_query, node1_data, node2_data, stats
):
    stichtag = datetime(2020, 1, 1, 13)
    vflz = make_vflz(session, "My Site", 1)
    vflz2 = make_vflz(session, "My Site 2", 2)
    task_node = make_task_node(session, vflz, "My first Note")
    task_node2 = make_task_node(session, vflz2, "My second Note")

    task_node.started_at = stichtag + node1_data["started_at"]
    task_node.finished_at = (
        (stichtag + node1_data["finished_at"]) if node1_data["finished_at"] else None
    )
    task_node.deadline = (
        (datetime.now() + node1_data["deadline"]) if node1_data["deadline"] else None
    )
    task_node.status = node1_data["status"]

    task_node2.started_at = stichtag + node2_data["started_at"]
    task_node2.finished_at = (
        (stichtag + node2_data["finished_at"]) if node2_data["finished_at"] else None
    )
    task_node2.deadline = (
        (datetime.now() + node2_data["deadline"]) if node2_data["deadline"] else None
    )
    task_node2.status = node2_data["status"]

    query = """
    query q($stichtag: Date! ){
        dashboardStatistic(stichtag: $stichtag) {
            geschaefte {
                faelligkeit
                count
            }
        }
    }
    """

    result = run_query(query, variable_values={"stichtag": stichtag.date().isoformat()})
    assert result.data["dashboardStatistic"]["geschaefte"] == stats


def test_form_note_document_are_always_considered_ruhend(session, run_query):
    stichtag = datetime(2020, 1, 1, 13)
    deadline = stichtag + timedelta(days=-1)
    started_at = stichtag + timedelta(days=-2)

    vflz = make_vflz(session, "My Site", 1)

    form_node = make_form_node(session, vflz, "My first Form")
    form_node.status = NodeStatus.STARTED
    form_node.deadline = deadline
    form_node.started_at = started_at

    note_node = make_note_node(session, vflz, "My first Note")
    note_node.status = NodeStatus.STARTED
    note_node.deadline = deadline
    note_node.started_at = started_at

    document_node = make_document_node(session, vflz, "My first Document")
    document_node.status = NodeStatus.STARTED
    document_node.deadline = deadline
    document_node.started_at = started_at

    task_node = make_task_node(session, vflz, "My first Task")
    task_node.status = NodeStatus.STARTED
    task_node.deadline = deadline
    task_node.started_at = started_at

    query = """
    query q($stichtag: Date! ){
        dashboardStatistic(stichtag: $stichtag) {
            geschaefte {
                faelligkeit
                count
            }
        }
    }
    """

    result = run_query(query, variable_values={"stichtag": stichtag.date().isoformat()})
    assert result.data["dashboardStatistic"]["geschaefte"] == [
        {"faelligkeit": FaelligkeitStatus.UEBERFAELLIG.name, "count": 1},
        {
            "faelligkeit": FaelligkeitStatus.FAELLIG_NAECHSTE_WOCHE.name,
            "count": 0,
        },
        {"faelligkeit": FaelligkeitStatus.FAELLIG_SPAETER.name, "count": 0},
        {"faelligkeit": FaelligkeitStatus.RUHEND.name, "count": 3},
    ]
