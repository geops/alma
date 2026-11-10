# TODO can we re-use the prod image as base image here?
FROM python:3.11-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:0.13.5 /uv /uvx /bin/

RUN apt-get update \
    && apt-get install -y --no-install-recommends gdal-bin zip libgdal-dev build-essential libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 graphviz \
    poppler-utils libfile-mimeinfo-perl libimage-exiftool-perl ghostscript libsecret-1-0 zlib1g-dev libjpeg-dev imagemagick libmagic1 webp libreoffice git openssh-client

RUN useradd --home-dir /app --create-home --shell /bin/sh app \
    && mkdir -p /app/src \
    && chown -R app:app /app \
    && mkdir -p /output

ENV HOME=/app
USER app
WORKDIR /app

ENV PATH="/app/.local/bin:$PATH"
ENV VIRTUAL_ENV=/app/venv
ENV UV_PROJECT_ENVIRONMENT=/app/venv
ENV UV_LINK_MODE=copy
ENV UV_COMPILE_BYTECODE=1

RUN --mount=type=bind,source=backend/uv.lock,target=uv.lock \
    --mount=type=bind,source=backend/pyproject.toml,target=pyproject.toml \
    cd /app/src && uv sync --python python3.11 --locked --no-install-project
RUN cd /app/src && uv pip install --no-deps --no-binary="gdal" "gdal==$(gdal-config --version).*"

COPY --chown=app:app backend/ /app/src
RUN cd /app/src && uv pip install --no-deps /app/src

COPY docker/backend/run_tests.sh /app

ENTRYPOINT ["/app/run_tests.sh"]
