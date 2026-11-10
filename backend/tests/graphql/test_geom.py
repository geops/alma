import pytest
from pydantic import HttpUrl
from sqlalchemy.exc import IntegrityError
from utils import QueryError, make_vflz

from alma.models import vflz as vflz_models
from alma.settings import settings

pytestmark = [
    # Fixture required by all tests in this module
    # Run all tests in this module using the "bearbeiten sachdaten" role unless otherwise specified
    pytest.mark.usefixtures("generate_codes", "as_bearbeiten_sachdaten"),
]


def test_reading_vfl_geom_with_area(run_query, session):
    geojson = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200000],
                    [2600000, 1200010],
                    [2600010, 1200010],
                    [2600010, 1200000],
                    [2600000, 1200000],
                ],
                [
                    [2600030, 1200000],
                    [2600000, 1200010],
                    [2600010, 1200010],
                    [2600010, 1200000],
                    [2600030, 1200000],
                ],
            ],
        ],
    }

    vflz = make_vflz(session, "My Site")
    vflgeo = vflz_models.VflGeo()
    vflgeo.set_geometry(geojson)
    vflz.vflgeo = vflgeo

    session.commit()
    query = """
    query q($id: ID!) {
        vflz(vflzId: $id) {
            vflgeo {
                geometry
            }
            flaeche
        }
    }
    """

    result = run_query(query=query, variable_values={"id": str(vflz.vflz_id)})
    assert result.data["vflz"]["vflgeo"]["geometry"] == geojson
    assert result.data["vflz"]["flaeche"] == 50


def test_set_geometry_calculates_zentroid_if_none_provided(run_query, session):
    vflz = make_vflz(session, "My Site")
    expected_zentroid_geojson = {
        "type": "Point",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [2600005, 1200005, 0],
    }
    geometry_geojson = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200000],
                    [2600000, 1200010],
                    [2600010, 1200010],
                    [2600010, 1200000],
                    [2600000, 1200000],
                ]
            ]
        ],
    }

    mutation = """
    mutation m($data: UpdateVflzGeoInput!) {
        updateVflzGeo(data: $data) {
            ... on Vflz {
                vflgeo {
                    geometry
                }
                zentroid
            }
        }
    }
    """

    result = run_query(
        query=mutation,
        variable_values={
            "data": {
                "vflzId": str(vflz.vflz_id),
                "zentroid": None,
                "geometry": geometry_geojson,
            }
        },
    )
    assert result.data["updateVflzGeo"]["vflgeo"]["geometry"] == geometry_geojson
    assert result.data["updateVflzGeo"]["zentroid"] == expected_zentroid_geojson


def test_set_zentroid_and_geometry(run_query, session, test_settings, httpx2_mock):
    settings.height_api = HttpUrl("https://api3.geo.admin.ch/rest/services/height")
    httpx2_mock.add_response(
        url=f"{settings.height_api}?easting=2600000&northing=1200000",
        json={"height": 553},
    )
    vflz = make_vflz(session, "My Site")
    zentroid_geojson = {
        "type": "Point",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [2600000, 1200000, 0],
    }
    geometry_geojson = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600100, 1200000],
                    [2600100, 1200100],
                    [2600200, 1200100],
                    [2600200, 1200000],
                    [2600100, 1200000],
                ]
            ]
        ],
    }

    mutation = """
    mutation m($data: UpdateVflzGeoInput!) {
        updateVflzGeo(data: $data) {
            ... on Vflz {
                vflgeo {
                    geometry
                }
                zentroid
            }
        }
    }
    """

    result = run_query(
        query=mutation,
        variable_values={
            "data": {
                "vflzId": str(vflz.vflz_id),
                "zentroid": zentroid_geojson,
                "geometry": geometry_geojson,
            }
        },
    )
    assert result.data["updateVflzGeo"]["vflgeo"]["geometry"] == geometry_geojson
    assert result.data["updateVflzGeo"]["zentroid"] == {
        "type": "Point",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [2600000, 1200000, 553],
    }
    settings.height_api = None


def test_set_geometry_with_empty_coordinates_raises(run_query, session):
    vflz = make_vflz(session, "My Site")
    geometry_geojson = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600100, 1200000],
                    [2600100, 1200100],
                    [2600200, 1200100],
                    [2600100, 1200000],
                    [],
                ]
            ]
        ],
    }

    mutation = """
    mutation m($data: UpdateVflzGeoInput!) {
        updateVflzGeo(data: $data) {
            ... on Vflz {
                vflgeo {
                    geometry
                }
                zentroid
            }
        }
    }
    """
    with pytest.raises(QueryError, match="no empty coordinates"):
        run_query(
            query=mutation,
            variable_values={
                "data": {
                    "vflzId": str(vflz.vflz_id),
                    "zentroid": None,
                    "geometry": geometry_geojson,
                }
            },
        )


def test_delete_centroid_automatically_calculates_new_one(run_query, session):
    vflz = make_vflz(session, "My Site")
    vflz.zentroid = "SRID=2056;POINT(2600000 1200000 3)"  # type: ignore[assignment]

    vflgeo = vflz_models.VflGeo()
    vflgeo.wkb_geometry = "SRID=2056;MULTIPOLYGON(((2600000 1200000,2600000 1200010,2600010 1200010,2600010 1200000,2600000 1200000)))"  # type: ignore[assignment]
    session.add(vflgeo)
    vflz.vflgeo = vflgeo
    session.commit()

    new_zentroid_geojson = {
        "type": "Point",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [2600010, 1200010, 0],
    }
    new_geometry_geojson = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200000],
                    [2600000, 1200020],
                    [2600020, 1200020],
                    [2600020, 1200000],
                    [2600000, 1200000],
                ]
            ]
        ],
    }
    mutation = """
    mutation m($data: UpdateVflzGeoInput!) {
        updateVflzGeo(data: $data) {
            ... on Vflz {
                vflgeo {
                    geometry
                }
                zentroid
            }
        }
    }
    """
    result = run_query(
        query=mutation,
        variable_values={
            "data": {
                "vflzId": str(vflz.vflz_id),
                "zentroid": None,
                "geometry": new_geometry_geojson,
            }
        },
    )

    assert result.data["updateVflzGeo"]["vflgeo"]["geometry"] == new_geometry_geojson
    assert result.data["updateVflzGeo"]["zentroid"] == new_zentroid_geojson


def test_geom_change_above_threshold_triggers_historization(run_query, session):
    vflz = make_vflz(session, "My Site")
    old_vflz_id = vflz.vflz_id
    vflgeo = vflz_models.VflGeo()
    vflgeo.wkb_geometry = "SRID=2056;MULTIPOLYGON(((2600000 1200000,2600000 1200000,2600000 1200000,2600000 1200000,2600000 1200000)))"  # type: ignore[assignment]
    session.add(vflgeo)
    vflz.vflgeo = vflgeo
    session.commit()

    new_geometry_geojson = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200000],
                    [2600000, 1200006],
                    [2600005, 1200006],
                    [2600005, 1200000],
                    [2600000, 1200000],
                ]
            ]
        ],
    }

    mutation = """
    mutation m($data: UpdateVflzGeoInput!) {
        updateVflzGeo(data: $data) {
            ... on Vflz {
                isCurrent
                vflzId
                vflgeo {
                    geometry
                }
            }
        }
    }
    """

    result = run_query(
        query=mutation,
        variable_values={
            "data": {
                "vflzId": str(vflz.vflz_id),
                "zentroid": None,
                "geometry": new_geometry_geojson,
            }
        },
    )
    assert result.data["updateVflzGeo"]["isCurrent"]
    assert int(result.data["updateVflzGeo"]["vflzId"]) > old_vflz_id
    assert result.data["updateVflzGeo"]["vflgeo"]["geometry"] == new_geometry_geojson


def test_cant_update_vflz_with_invalid_geom(run_query, session):
    vflz = make_vflz(session, "My Site")
    vflgeo = vflz_models.VflGeo()
    vflgeo.wkb_geometry = "SRID=2056;MULTIPOLYGON(((2600000 1200000,2600000 1200000,2600000 1200000,2600000 1200000,2600000 1200000)))"  # type: ignore[assignment]
    session.add(vflgeo)
    vflz.vflgeo = vflgeo
    session.commit()

    new_geometry_geojson = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [[[[0, 0], [1, 1], [1, 2], [1, 1], [0, 0]]]],
    }

    mutation = """
    mutation m($data: UpdateVflzGeoInput!) {
        updateVflzGeo(data: $data) {
            ... on ProblemGroup {
                problems {
                    problemCode
                    field
                }
            }
        }
    }
    """

    result = run_query(
        query=mutation,
        variable_values={
            "data": {
                "vflzId": str(vflz.vflz_id),
                "zentroid": None,
                "geometry": new_geometry_geojson,
            }
        },
    )
    assert result.data["updateVflzGeo"]["problems"] == [
        {"problemCode": "VALIDATION_GEOM", "field": "geometry"}
    ]


def test_create_new_geometry_triggers_historization(run_query, session):
    vflz = make_vflz(session, "My Vflz")
    old_vflz_id = vflz.vflz_id

    geometry_geojson = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200000],
                    [2600000, 1200010],
                    [2600010, 1200010],
                    [2600010, 1200000],
                    [2600000, 1200000],
                ]
            ]
        ],
    }

    mutation = """
    mutation m($data: UpdateVflzGeoInput!) {
        updateVflzGeo(data: $data) {
            ... on Vflz {
                vflzId
                isCurrent
                vflgeo {
                    geometry
                }
            }
        }
    }
    """

    result = run_query(
        query=mutation,
        variable_values={
            "data": {
                "vflzId": str(vflz.vflz_id),
                "zentroid": None,
                "geometry": geometry_geojson,
            }
        },
    )
    assert result.data["updateVflzGeo"]["vflgeo"]["geometry"] == geometry_geojson
    assert result.data["updateVflzGeo"]["isCurrent"]
    assert int(result.data["updateVflzGeo"]["vflzId"]) > old_vflz_id


def test_union(run_query):
    geom_a = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200000],
                    [2600000, 1200010],
                    [2600010, 1200010],
                    [2600010, 1200000],
                    [2600000, 1200000],
                ]
            ]
        ],
    }

    geom_b = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600010, 1200010],
                    [2600010, 1200020],
                    [2600000, 1200020],
                    [2600000, 1200010],
                    [2600010, 1200010],
                ]
            ]
        ],
    }

    query = """
    query q($geoA: GeoJSONMultiPolygon!, $geoB: GeoJSONMultiPolygon!) {
        geoUnion(geoA: $geoA, geoB: $geoB)
    }
    """
    result = run_query(query, variable_values={"geoA": geom_a, "geoB": geom_b})
    assert result.data["geoUnion"] == {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200000],
                    [2600000, 1200010],
                    [2600000, 1200020],
                    [2600010, 1200020],
                    [2600010, 1200010],
                    [2600010, 1200000],
                    [2600000, 1200000],
                ]
            ]
        ],
    }


def test_intersection(run_query):
    geom_a = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200000],
                    [2600000, 1200040],
                    [2600040, 1200040],
                    [2600040, 1200000],
                    [2600000, 1200000],
                ]
            ]
        ],
    }

    geom_b = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600010, 1200010],
                    [2600010, 1200020],
                    [2600000, 1200020],
                    [2600000, 1200010],
                    [2600010, 1200010],
                ]
            ]
        ],
    }

    query = """
    query q($geoA: GeoJSONMultiPolygon!, $geoB: GeoJSONMultiPolygon!) {
        geoIntersection(geoA: $geoA, geoB: $geoB)
    }
    """
    result = run_query(query, variable_values={"geoA": geom_a, "geoB": geom_b})
    assert result.data["geoIntersection"] == {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [
                        2600000,
                        1200010,
                    ],
                    [2600000, 1200020],
                    [2600010, 1200020],
                    [2600010, 1200010],
                    [2600000, 1200010],
                ]
            ]
        ],
    }


def test_difference(run_query):
    geom_a = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200000],
                    [2600000, 1200040],
                    [2600040, 1200040],
                    [2600040, 1200000],
                    [2600000, 1200000],
                ]
            ]
        ],
    }

    geom_b = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600010, 1200010],
                    [2600010, 1200020],
                    [2600000, 1200020],
                    [2600000, 1200010],
                    [2600010, 1200010],
                ]
            ]
        ],
    }

    query = """
    query q($geoA: GeoJSONMultiPolygon!, $geoB: GeoJSONMultiPolygon!) {
        geoDifference(geoA: $geoA, geoB: $geoB)
    }
    """
    result = run_query(query, variable_values={"geoA": geom_a, "geoB": geom_b})
    assert result.data["geoDifference"] == {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200000],
                    [2600000, 1200010],
                    [2600010, 1200010],
                    [2600010, 1200020],
                    [2600000, 1200020],
                    [2600000, 1200040],
                    [2600040, 1200040],
                    [2600040, 1200000],
                    [2600000, 1200000],
                ]
            ]
        ],
    }


def test_split(run_query):
    geo = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200000],
                    [2600000, 1200040],
                    [2600040, 1200040],
                    [2600040, 1200000],
                    [2600000, 1200000],
                ]
            ]
        ],
    }

    blade = {
        "type": "LineString",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [[2600000, 1200000], [2600040, 1200040]],
    }

    query = """
    query q($geo: GeoJSONMultiPolygon!, $blade: GeoJSONLineString!) {
        geoSplit(geo: $geo, blade: $blade)
    }
    """
    result = run_query(query, variable_values={"geo": geo, "blade": blade})
    assert result.data["geoSplit"] == {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200000],
                    [2600000, 1200040],
                    [2600040, 1200040],
                    [2600000, 1200000],
                ]
            ],
            [
                [
                    [2600040, 1200040],
                    [2600040, 1200000],
                    [2600000, 1200000],
                    [2600040, 1200040],
                ]
            ],
        ],
    }


def test_make_valid(run_query):
    geo = {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600000, 1200000],
                    [2600000, 1200040],
                    [2600040, 1200040],
                    [2600040, 1200000],
                    [2600000, 1200000],
                ],
                [
                    [2600000, 1200000],
                    [2600000, 1200020],
                    [2600060, 1200020],
                    [2600060, 1200000],
                    [2600000, 1200000],
                ],
            ]
        ],
    }

    query = """
    query q($geo: GeoJSONMultiPolygon!) {
        geoMakeValid(geo: $geo)
    }
    """

    result = run_query(query, variable_values={"geo": geo})
    assert result.data["geoMakeValid"] == {
        "type": "MultiPolygon",
        "crs": {"type": "name", "properties": {"name": "EPSG:2056"}},
        "coordinates": [
            [
                [
                    [2600040, 1200000],
                    [2600000, 1200000],
                    [2600000, 1200020],
                    [2600000, 1200040],
                    [2600040, 1200040],
                    [2600040, 1200020],
                    [2600060, 1200020],
                    [2600060, 1200000],
                    [2600040, 1200000],
                ]
            ]
        ],
    }


def test_creating_vflz_without_vflgeo_throws_exception(session):
    vflz = make_vflz(session, "foo")
    vflz.vflgeo = None
    vflz.zentroid = None  # pyright: ignore[reportAttributeAccessIssue]
    with pytest.raises(IntegrityError, match="violates not-null constraint"):
        session.commit()
