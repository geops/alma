from graphql import GraphQLError

from alma.settings import settings


def validate_per_page(per_page: int) -> int:
    """Ensure `per_page` is within the allowed range.

    Raises a GraphQLError if `per_page` is not positive or exceeds
    `settings.max_page_size`. Returns the validated value.
    """
    max_page_size = settings.max_page_size
    if per_page < 1:
        raise GraphQLError(
            "per_page must be greater than 0",
            extensions={"code": "INVALID_PER_PAGE"},
        )
    if per_page > max_page_size:
        raise GraphQLError(
            f"per_page must not be greater than {max_page_size}",
            extensions={"code": "INVALID_PER_PAGE"},
        )
    return per_page
