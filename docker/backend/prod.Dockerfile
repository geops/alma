FROM python:3.11-slim-bookworm AS base

COPY --from=ghcr.io/astral-sh/uv:0.13.5 /uv /uvx /bin/

# gid 0 (root group) + group perms mirroring the owner, so the container
# also works under OpenShift, which runs it as an arbitrary UID in group 0.
RUN useradd --home-dir /app --create-home --shell /bin/sh --gid 0 app \
    && mkdir -p /app/src \
    && chown -R app:0 /app \
    && chmod -R g=u /app 
ENV HOME=/app
USER app
WORKDIR /app

ONBUILD USER root
ONBUILD RUN set -eux; \
    sed -i 's/^Components: main$/Components: main contrib non-free non-free-firmware/' /etc/apt/sources.list.d/debian.sources; \
    echo 'ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true' | debconf-set-selections; \
    echo 'ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula seen true' | debconf-set-selections; \
    apt-get update; \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        gdal-bin \
        zip \
        libgdal-dev \
        build-essential \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        libharfbuzz-subset0 \
        graphviz \
        openjdk-17-jdk \
        supervisor \
        poppler-utils \
        libfile-mimeinfo-perl \
        libimage-exiftool-perl \
        ghostscript \
        libsecret-1-0 \
        zlib1g-dev \
        libjpeg-dev \
        imagemagick \
        libmagic1 \
        webp \
        libreoffice \
        git \
        ttf-mscorefonts-installer; \
    rm -rf /var/lib/apt/lists/*

ONBUILD ARG VERSION=0.0.0

ONBUILD ENV UV_COMPILE_BYTECODE=1
ONBUILD ENV UV_LINK_MODE=copy
ONBUILD ENV UV_NO_DEV=1
ONBUILD ENV PATH="/app/.local/bin:$PATH"
ONBUILD ENV VIRTUAL_ENV=/app/venv
ONBUILD ENV UV_PROJECT_ENVIRONMENT=/app/venv
ONBUILD ENV SETUPTOOLS_SCM_PRETEND_VERSION_FOR_ALMA_BACKEND=$SETUPTOOLS_SCM_PRETEND_VERSION_FOR_ALMA_BACKEND


ONBUILD USER app
ONBUILD RUN mkdir -p /app/exports/interlis_exports/ /app/exports/search/ /app/exports/kbs/ /app/documents \
&& chmod -R g+rwX /app/exports /app/documents

ONBUILD RUN --mount=type=bind,source=backend/uv.lock,target=uv.lock \
    --mount=type=bind,source=backend/pyproject.toml,target=pyproject.toml \
    cd /app/src && uv sync --python python3.11 --locked --no-install-project
ONBUILD RUN cd /app/src && uv pip install --no-deps --no-binary="gdal" "gdal==$(gdal-config --version).*"

ONBUILD COPY --chown=app:0 backend/ /app/src
ONBUILD RUN cd /app/src && SETUPTOOLS_SCM_PRETEND_VERSION_FOR_ALMA_BACKEND=${VERSION} uv pip install --no-deps /app/src

FROM base as build

COPY docker/backend/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000
ENTRYPOINT ["/app/venv/bin/python3"]
CMD [ \
    "-m", \
    "gunicorn", \
    "alma.api:app", \
    "--workers", \
    "2", \
    "--worker-class", \
    "uvicorn.workers.UvicornWorker", \
    "--bind", \
    "0.0.0.0:8000", \
    "--access-logfile=-" \
]
