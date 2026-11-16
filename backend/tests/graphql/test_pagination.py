import pytest
from graphql import GraphQLError
from utils import QueryError

from alma.graphql.utils.pagination import validate_per_page
from alma.settings import settings


def test_validate_per_page_ok(monkeypatch):
    monkeypatch.setattr(settings, "max_page_size", 50)
    assert validate_per_page(1) == 1
    assert validate_per_page(50) == 50


@pytest.mark.parametrize("value", [51, 1000])
def test_validate_per_page_too_large(monkeypatch, value):
    monkeypatch.setattr(settings, "max_page_size", 50)
    with pytest.raises(GraphQLError, match="must not be greater than 50"):
        validate_per_page(value)


@pytest.mark.parametrize("value", [0, -1])
def test_validate_per_page_too_small(value):
    with pytest.raises(GraphQLError, match="greater than 0"):
        validate_per_page(value)


@pytest.mark.usefixtures("as_lesen_geschaefte")
@pytest.mark.parametrize(
    "query_field",
    ["pools", "codeLists", "subjekte", "geschaefte"],
)
def test_query_per_page_limit(run_query, monkeypatch, query_field):
    monkeypatch.setattr(settings, "max_page_size", 5)

    query = f"{query_field}(perPage: 6) {{ page }} "
    with pytest.raises(QueryError, match="per_page must not be greater than"):
        response = run_query(f"query {{ {query} }}")

    query = f"{query_field}(perPage: 5) {{ page }} "
    response = run_query(f"query {{ {query} }}")
    assert not response.errors


@pytest.mark.usefixtures("as_lesen_sachdaten")
def test_search_per_page_limit(run_query, monkeypatch):
    monkeypatch.setattr(settings, "max_page_size", 5)
    query = 'query { search(query: "foo", perPage: 6) { page } }'

    with pytest.raises(QueryError, match="per_page must not be greater than"):
        response = run_query(query)
    query = 'query { search(query: "foo", perPage: 5) { page } }'
    response = run_query(query)
    assert not response.errors
