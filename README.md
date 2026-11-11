# <img src="alma-logo.png" width=50> alma

**alma** is a web application to manage the register of contaminated sites. It supports authorities in documenting suspected sites and polluted sites, running the
investigation and remediation workflows required by the Swiss _Contaminated Sites Ordinance (CSO)_, and producing register extracts and reports.

## Requirements

- `docker` and the Compose v2 plugin (`docker-compose-v2` on Ubuntu 22.04+)
- `make`
- `curl` (used by the `Makefile` to wait for services to become healthy)
- ~8 GB free RAM recommended for running the full stack

## Quick start

**Note**: If you want to use our demo data, please get in touch.

Clone the repository and start the full stack:

    $ git clone <repository-url> alma
    $ cd alma
    $ make start-services

The first run builds all images locally, initialises the database, and configures authorization. Once it finishes you can open:

- alma UI: <http://localhost:8080/>
- GraphiQL API explorer: <http://localhost:8080/graphql>
- SSO login: <http://localhost:8080/api/auth/authorize/>

To stop the instance:

    $ make stop-services

After changing code or switching branches, rebuild the docker images with:

    $ make rebuild

To login, use these credentials:

- username: `test@alma-os.ch`
- password: `demo2024`

### Using prebuilt images (geOps internal)

The `docker-compose.yml` file references prebuilt images on
`registry.geops.com`. If you have access to that registry you can pull them
instead of building locally:

    $ docker login registry.geops.com
    $ docker compose pull

External contributors do not need this — `make start-services` builds every
image from the sources in this repository.

## What runs where

`make start-services` starts the following containers (see
[`docker-compose.yml`](./docker-compose.yml) for the full list):

| Service     | Purpose                                                             |
| ----------- | ------------------------------------------------------------------- |
| `nginx`     | Reverse proxy in front of frontend, backend, MapServer and Keycloak |
| `backend`   | GraphQL / REST API                                                  |
| `frontend`  | Next.js UI                                                          |
| `db`        | PostgreSQL + PostGIS + anonymizer extension                         |
| `keycloak`  | Authentication                                                      |
| `mapserver` | WMS/WFS map rendering                                               |
| `email`     | Debug SMTP server for local development                             |
| `scheduler` | Cron jobs                                                           |

## TLS for internal connections (ALTLAGA-10)

By default, TLS is enabled between the containers. Except for db and mapserver, the same base images may be used.
For db and mapserver, entrypoints differ. We provide a `-no-tls` target/image tag to disable TLS.

TLS is enabled by setting respective environment variables.

Review apps and tests run without TLS enabled. For documentation, please refer to [confluence](https://confluence.geops.com/pages/viewpage.action?pageId=241797748).

The images contain no certificates. Most TLS images read the certificate paths
from environment variables that docker compose sets (`PG_TLS_*`, `ALMA_TLS_*`,
`KC_HTTPS_*`, `MAPSERVER_TLS_*`, see below). nginx is the exception: its config
uses the fixed mount paths `/certs/tls.crt`, `/certs/tls.key`, `/certs/ca.crt`
directly. The mount target in the compose file and the variable (where used)
must agree.

Running locally:

* certificates must be provided locally. Check `docker-compose.tls.yaml` for volume mounts.
* `docker compose up` / `make start-services` – plaintext (`-no-tls` images),
  no certificates needed.
* `TLS_ENABLED=true make start-services` (or
  `docker compose -f docker-compose.yml -f docker-compose.tls.yml up`) – TLS
  images, certificates mounted from `./certs`, cert-path variables set, https on
  the host ports. e2e tests run plaintext only
  (`make e2e-tests`). The local backend dev server (uvicorn, hot reload) stays
  env-driven (`UVICORN_SSL_*`).



### Environment interface of the TLS images (set by compose, no defaults)

| Component  | Variables |
| ---------- | --------- |
| db         | `PG_TLS_CERT_FILE`, `PG_TLS_KEY_FILE` (required); `PG_TLS_RUNTIME_DIR` (set in the image), `POSTGRES_HOST_AUTH_METHOD` |
| libpq clients | `PGSSLMODE`, `PGSSLROOTCERT` |
| backend    | `SSL_CERT_FILE`, `REQUESTS_CA_BUNDLE`, `CURL_CA_BUNDLE`, `GDAL_CURL_CA_BUNDLE` (combined bundle), `GUNICORN_CMD_ARGS=--certfile=... --keyfile=...` (gunicorn of the TLS image) / `UVICORN_SSL_CERTFILE`, `UVICORN_SSL_KEYFILE` (local dev server), `OIDC_BASE_URL`, `MONITORING_*_URL` |
| keycloak   | (`KC_HTTP_ENABLED=false` baked in) `KC_HTTPS_PORT`, `KC_HTTPS_CERTIFICATE_FILE`, `KC_HTTPS_CERTIFICATE_KEY_FILE`, `KC_HTTPS_PROTOCOLS`, `KC_DB_URL_PROPERTIES`, `KC_HOSTNAME` |
| db_migrate | `FLYWAY_URL=…?sslmode=require` |
| mapserver  | `MAPSERVER_TLS_CERT_FILE`, `MAPSERVER_TLS_KEY_FILE`, `MAPSERVER_TLS_CA_FILE`, `MAPSERVER_URL` |
| nginx      | none – certificates are mounted at the fixed paths `/certs/tls.crt`, `/certs/tls.key`, `/certs/ca.crt` (hardcoded in the config) |
| cypress    | `CYPRESS_BASE_URL`, `NODE_EXTRA_CA_CERTS` |
| Helm       | review apps run plaintext: the chart uses the `-no-tls` images, no certificates |

## Configure authentication for deployments

We use keycloak for authentication either directly or via an external identity provider.

The alma backend uses the OpenID Connect protocol but expects `preferred_username` to be set in the user info endpoint. Roles are managed inside the alma backend, not in Keycloak.

The following sections describe the basic setup for the different variants.

### Common setup

It is advised to use a separate realm for the alma backend. This allows only exposing that realm to external requests while keeping the master realm protected.

Initial credentials for the master realm can be set using environment variables (see the `docker-compose.yml` and `backend/settings.py` file).

By default the alma-backend expects an `alma` realm with a client `alma-backend`.

A complete example configuration is available in the `docker/keycloak/initial.json` (used to set up the dev environment).

### Variant 1: Without external identity provider

This is the default setup for local development and testing but can also be used for deployments.

The relevant settings for login requirements can be found under `Authentication`. Here you can configure the required actions for the user to login.

Two-factor authentication is limited to OTP and WebAuthn.

### Variant 2: With external identity provider

In this case, the user is redirected to the external identity provider for login. The external identity provider must be configured in keycloak.

Make sure to map the correct field to the keycloak username (e.g. `nickname` for geOps SSO).

After setting up the external identity provider, you can disable the local login in the `Authentication` settings.

## Getting help & contributing

- **Questions and bug reports:** please open an issue on the project's GitHub
  repository. Include the commit / release version, the command you ran and the
  relevant logs.
- **Contributions:** pull requests are welcome. Before opening one, please make
  sure that:
  - `pre-commit` hooks pass (installed via `pre-commit install` in `backend/`)
  - backend tests pass (`pytest` in `backend/`)
  - the frontend builds and the Cypress tests pass (`make cypress-tests` in `frontend/`)
- **Get in Touch**: feel free to get in touch by contacting info@geops.com
- **Product Homepage**: feel free to read our official product homepage on https://alma-os.ch
