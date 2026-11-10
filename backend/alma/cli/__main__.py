import asyncio
import json
import logging
import subprocess
import sys
from pathlib import Path
from subprocess import CalledProcessError

import click
from business_workflow_manager.config import Workflow
from business_workflow_manager.exceptions import WorkflowException
from business_workflow_manager.graphviz import write_graph
from business_workflow_manager.manager import WorkflowManager
from business_workflow_manager.types import Language
from preview_generator.exception import (  # pyright: ignore[reportMissingTypeStubs]
    BuilderDependencyNotFound,
    PreviewGeneratorException,
)
from preview_generator.manager import (  # pyright: ignore[reportMissingTypeStubs]
    PreviewManager,
)
from procrastinate import jobs
from sqlalchemy import or_, select

from alma import wfs_cache
from alma.db import get_session
from alma.graphql.mutation import enforce_read_only
from alma.keycloak import get_keycloak_client
from alma.models.auth import User
from alma.models.documents import Asset
from alma.models.subj import Subjekt
from alma.models.vflz import Vflz, fetch_height
from alma.permissions import RoleName
from alma.settings import settings
from alma.task_queue.app import app
from alma.workflow_integration import add_event_handlers, wf_manager_config

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@click.group()
def main() -> None:
    pass


@main.command()
@click.option("--role_name", type=str, required=False)
@click.argument("username", type=str, required=True)
def create_e2e_test_user(role_name: str | None, username: str) -> None:
    if not settings.debug.enable_e2e_test_user:
        sys.exit("Not creating e2e test user - setting not enabled!")

    role_name = RoleName[role_name] if role_name else None

    with get_session() as db, get_keycloak_client() as keycloak:
        user = db.scalars(select(User).where(User.username == username)).one_or_none()
        if user:
            click.echo(f"User already exists: {user}")
            user.update(
                db,
                keycloak,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                role_name=role_name,
            )
            if role_name != (user.role.name if user.role else None):
                click.echo(f"{user} has role {role_name} now")
            else:
                click.echo(f"User already had role {role_name}")
        else:
            user = User.create(
                db,
                keycloak,
                username=username,
                email=f"{username}@example.test",
                first_name=username,
                last_name=username,
                role_name=role_name,
            )
            user.is_sachbearbeitung = True
            subjekt = Subjekt()
            subjekt.vorname = username
            subjekt.name = username
            user.subjekt = subjekt

            db.add(subjekt)
            db.commit()
            click.echo(f"User created {user} with role {role_name}")


@main.command()
@click.option("--only", type=str, help="Refresh only data for this WFS service name")
def update_wfs_cache(only: str | None) -> None:
    with get_session() as session:
        if not only:
            wfs_cache.refresh_all(session)
        elif only in settings.wfs_config:
            wfs_cache.refresh_wfs(session, only)
        else:
            sys.exit(f"No WFS settings configured for {only}")


@main.command()
def sync_users_from_keycloak():
    with get_session() as db, get_keycloak_client() as keycloak:
        User.sync_from_keycloak(db, keycloak)


@main.command()
@click.argument("user_id", type=int)
@click.argument("role_name", type=str)
def set_role(user_id: int, role_name: str) -> None:
    """Set role for existing user by role role_name

    Intended for initial setup or debugging only.
    """
    with get_session() as db:
        user = db.scalars(select(User).where(User.id == user_id)).one()
        user.set_role(db, RoleName[role_name])
        click.echo(f"{user} has role {role_name} now")


@main.group()
def workflow() -> None:
    pass


@main.command()
@click.option("--message", type=str, required=True)
def historize_all(message: str) -> None:
    with get_session() as session:
        vflzs = session.scalars(select(Vflz).where(Vflz.is_current)).all()

        for vflz in vflzs:
            enforce_read_only(session, vflz)
            vflz.historize(message)
        session.commit()


@workflow.command("import")
@click.option(
    "--file",
    required=True,
    type=click.Path(exists=True, dir_okay=False, path_type=Path),
)
def wf_import(file: Path) -> None:
    with get_session() as db:
        with WorkflowManager(db, wf_manager_config) as mgr:
            add_event_handlers(mgr)
            with file.open() as f:
                try:
                    workflow, config = mgr.load_workflow_from_file(f)
                    print(f"Imported workflow: {workflow.key}")
                except WorkflowException as e:
                    sys.exit(f"Error: {e}")
            db.commit()
            new_config = mgr.dump_workflow(workflow)
        if new_config != config:
            print(f"Writing updated workflow file to {file}")
            with file.open("w") as o:
                new_config.write(o)
        else:
            print("Workflow file unchanged")


@workflow.command("plot")
@click.option(
    "--file",
    required=True,
    type=click.Path(exists=True, dir_okay=False, path_type=Path),
)
def wf_plot(file: Path) -> None:
    # remove old language-independent files
    old_dot_file = file.with_suffix(".dot")
    old_png_file = file.with_suffix(".png")

    if old_dot_file.exists():
        print(f"Removing old file {old_dot_file}")
        old_dot_file.unlink()

    if old_png_file.exists():
        print(f"Removing old file {old_png_file}")
        old_png_file.unlink()

    # Write one set of files per language
    for lang in Language:
        dot_file = file.with_suffix(f".{lang.value}.dot")
        png_file = file.with_suffix(f".{lang.value}.png")
        print(f"Writing workflow graph to {dot_file}")
        with file.open() as f, dot_file.open("w") as o:
            config = Workflow.read(f)
            write_graph(config, o, lang=lang)
        print(f"Writing workflow PNG image to {png_file}")
        subprocess.run(["dot", "-Tpng", "-o", png_file, dot_file], check=True)


@workflow.command("export")
@click.option(
    "--file",
    required=True,
    type=click.Path(exists=False, dir_okay=False, path_type=Path),
)
@click.option("--key", required=True, type=str)
def wf_export(file: Path, key: str) -> None:
    with (
        get_session() as db,
        file.open("w") as f,
        WorkflowManager(db, wf_manager_config) as mgr,
    ):
        try:
            mgr.dump_workflow_to_file(key, f)
            print(f"Exported workflow: {key}")
        except WorkflowException as e:
            sys.exit(f"Error: {e}")


@main.command("generate-missing-previews")
def generate_missing_previews():
    """Generate preview images for all assets missing a preview."""
    with get_session() as session:
        assets = session.scalars(
            select(Asset).where(
                or_(Asset.preview_path.is_(None), Asset.preview_path == "")
            )
        ).all()
        if not assets:
            click.echo("No assets without preview found.")
            return
        preview_manager = PreviewManager(settings.documents_path)
        updated = 0
        for asset in assets:
            asset_file = Path(settings.documents_path) / asset.file_path
            if not asset_file.exists():
                click.echo(f"File not found for asset {asset.asset_id}: {asset_file}")
                continue
            try:
                asset.preview_path = preview_manager.get_jpeg_preview(
                    str(asset_file),
                    page=0,
                    width=450,
                    height=int(450 * 1.4),
                )
                updated += 1
                click.echo(f"Preview generated for asset {asset.asset_id}")
            except (
                PreviewGeneratorException,
                BuilderDependencyNotFound,
                CalledProcessError,
            ) as e:
                click.echo(
                    f"Failed to generate preview for asset {asset.asset_id}: {e}"
                )
        session.commit()
        click.echo(f"Done. {updated} previews generated.")


@main.command("print-settings")
@click.option("--key", required=False, type=str)
def print_settings(key: str | None):
    if key:
        settings_dict = settings.model_dump(by_alias=True)
        try:
            print(f"{key}: {json.dumps(settings_dict[key], indent=4)}")
        except KeyError:
            print(f"Setting {key} not set")
    else:
        print(settings.model_dump_json(indent=4, by_alias=True))


@main.command("update-height")
def update_height():
    with get_session() as session:
        vflzs = session.scalars(select(Vflz).where(Vflz.is_current)).all()

        for vflz in vflzs:
            zentroid = json.loads(vflz.zentroid_geojson)
            if settings.height_api:
                zentroid["coordinates"][2] = fetch_height(
                    zentroid["coordinates"][0], zentroid["coordinates"][1]
                )
            vflz.set_zentroid(zentroid)
        session.commit()


@main.command("kill-stalled-jobs")
def kill_stalled_jobs():
    async def main():
        async with app.open_async():  # pyright: ignore[reportUnknownMemberType]
            stalled_jobs = await app.job_manager.get_stalled_jobs(30)
            for job in stalled_jobs:
                await app.job_manager.finish_job(
                    job=job,
                    status=jobs.Status.ABORTED,
                    delete_job=False,
                )
                print(f"Aborted job {job.id}: {job.task_name}")

    asyncio.run(main())


if __name__ == "__main__":
    main()
