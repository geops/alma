from collections.abc import Coroutine, Iterator
from typing import Annotated, Any

from business_workflow_manager.manager import WorkflowManager
from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session
from strawberry.fastapi import GraphQLRouter

from ..dependencies import get_session
from ..graphql.schema import schema
from ..models.auth import User
from ..oidc import get_current_user
from ..settings import settings
from ..workflow_integration import add_event_handlers, wf_manager_config
from .context import Context


def get_workflow_manager(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Iterator[WorkflowManager]:
    with WorkflowManager(
        session, wf_manager_config, context={"user": current_user}
    ) as mgr:
        add_event_handlers(mgr)
        yield mgr


async def graphql_context_getter(
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    workflow_manager: Annotated[WorkflowManager, Depends(get_workflow_manager)],
) -> Context:
    return Context(db=db, user=current_user, workflow_manager=workflow_manager)


def init_app(app: FastAPI) -> None:
    app.include_router(
        GraphQLRouter[Coroutine[Any, Any, Context], Any](
            schema=schema,
            context_getter=graphql_context_getter,
            graphql_ide="graphiql" if settings.debug.graphql_ide else None,
        ),
        prefix="/graphql",
    )
