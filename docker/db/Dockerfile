ARG BUILD_ENV="prod"

FROM postgres:18.3-bookworm AS build_base
# Install prerequisites, including CA certificates
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        postgresql-18-postgis-3 \
        postgresql-18-postgis-3-scripts \
        postgresql-server-dev-18 \
        build-essential \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Configure Dalibo repository
RUN curl -fsSL https://repo.dalibo.com/install.sh | sh

# Install PostgreSQL Anonymizer
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql_anonymizer_18 \
    && rm -rf /var/lib/apt/lists/*

FROM build_base AS build_prod
ONBUILD RUN mkdir /include
ONBUILD COPY db/include/ /include

FROM build_base AS build_review
ONBUILD RUN mkdir /include
ONBUILD COPY db/include/ /include
ONBUILD COPY ./db/data/alma_demo.dump /include
#checkov:skip=CKV_DOCKER_7: checkov cannot resolve the BUILD_ENV variable
FROM build_${BUILD_ENV} AS common

COPY docker/db/wait_for_database.sh /usr/local/bin/
COPY docker/db/load_database_dump.sh /usr/local/bin/
COPY docker/db/initdb.sh /docker-entrypoint-initdb.d/
COPY docker/db/create_roles.sql /docker-entrypoint-initdb.d/

FROM common AS final-tls
# internal working copy of certificate/key (postgres needs key owned by the server user, 0600)
ENV PG_TLS_RUNTIME_DIR=/var/run/postgresql/tls
COPY docker/db/tls-entrypoint.sh /usr/local/bin/

USER postgres
ENTRYPOINT ["tls-entrypoint.sh"]
CMD ["postgres"]

FROM common AS final-no-tls

USER postgres
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["postgres"]

