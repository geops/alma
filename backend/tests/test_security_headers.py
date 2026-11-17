from collections.abc import Iterator
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

import alma.oidc
from alma.api import app


@pytest.fixture
def mock_sso() -> Iterator[None]:
    async def _fake_get_sso() -> Mock:
        return Mock()

    app.dependency_overrides[alma.oidc.get_sso] = _fake_get_sso
    try:
        yield
    finally:
        del app.dependency_overrides[alma.oidc.get_sso]


def test_graphql_responses_are_not_cacheable(client: TestClient, mock_sso):
    response = client.post("/graphql", json={"query": "{ __typename }"})

    assert response.headers["Cache-Control"] == "no-cache, no-store, must-revalidate"
    assert response.headers["Pragma"] == "no-cache"
    assert response.headers["Expires"] == "0"


def test_non_graphql_responses_have_no_cache_headers(client: TestClient):
    response = client.get("/")

    assert response.status_code == 200
    assert "Cache-Control" not in response.headers


def test_logout_sets_clear_site_data_header(client: TestClient, mock_sso):
    response = client.get("/api/auth/logout/", follow_redirects=False)

    assert response.is_redirect
    assert response.headers["Clear-Site-Data"] == '"cache", "storage", "cookies"'
