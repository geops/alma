from enum import StrEnum
from typing import TYPE_CHECKING

import strawberry
from strawberry.scalars import JSON


class ProblemCodeEnum(StrEnum):
    VALIDATION = "validation"
    VALIDATION_EMAIL = "validation_email"
    VALIDATION_PHONE = "validation_phone"
    VALIDATION_URL = "validation_url"
    VALIDATION_GEOM = "validation_geom"
    EXISTS = "exists"
    BUSY = "busy"
    TASK_DELETE = "task_delete"
    UNAVAILABLE_FOLGESCHRITT = "unavailable_folgeschritt"


if TYPE_CHECKING:
    ProblemCode = ProblemCodeEnum
else:
    ProblemCode = strawberry.enum(ProblemCodeEnum)


@strawberry.type
class Problem:
    message: str
    problem_code: ProblemCode
    field: str
    message_code: str | None = None
    message_args: JSON | None = None


@strawberry.type
class ProblemGroup:
    problems: list[Problem]
