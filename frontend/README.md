# alma Frontend

The alma frontend is a [Next.js](https://nextjs.org/) application
that talks to the alma [backend](../backend/README.md) via GraphQL.

The frontend cannot run on its own: it depends on the backend, the database and
Keycloak. The easiest way to get all of them running is `make start-services`
from the repository root. The instructions below describe the _development_
setup, in which Next.js runs with hot reload against the containerised backend.

## Configuration

Create a file `.env.local` for configuration of a test user:

```bash
NEXT_PUBLIC_ALMA_E2E_TEST_USER=admin
```

## Run the dev environment

To start the application with the development server:

```bash
make dev-server-cypress
```

Open <http://localhost:8080> in your browser.

## Troubleshooting

**Cannot log in**

The backend needs a valid `backend/env_file`. If it does not exist yet, create
one from the template:

```bash
cp backend/env_file.dist backend/env_file
```

Ask other developers for the values that must be filled in, then rebuild from
the repository root:

```bash
make rebuild
```

### Emergency reset

If the dev environment is stuck, the following commands clean it up. Use with
care — they stop and remove containers.

From the repository root:

```bash
make rebuild                                # rebuild all images
```

From `frontend/`:

```bash
sudo nginx -s stop                          # stop a host nginx that may block port 80
make dev-server-clean                       # stop and remove dev containers and kill some process that could use port 8080 and 3000
docker kill $(docker ps -q)                 # last resort: kill everything
docker container prune                      # remove stopped containers
```

## Running the tests

### Dependency compatibility

Keep TypeScript on `~6.0.3`: the current `typescript-eslint` tooling requires
TypeScript `<6.1.0`. TypeScript 7 causes ESLint to crash in `ts-api-utils` while
loading the configuration. When upgrading the lint tooling to support newer
TypeScript versions, update both `package.json` and the TypeScript constraint
in `../renovate.json`.

TanStack Table stays on v8 until the search results table is migrated to the v9
API. Its major version is also constrained in `../renovate.json`.

GraphQL Code Generator stays on CLI v6 and TypeScript plugins v5 to preserve the
generated type contract. The newer majors generate conflicting enum definitions
and change operation types with the current configuration; their versions are
constrained in `../renovate.json` until that migration is completed.

The TypeScript configuration forces module detection so Next.js development and
production type validators do not declare conflicting global types.

### Cypress

Use `pnpm cypress:run --spec cypress/e2e/search.spec.ts` to run a targeted E2E
spec; arguments are forwarded directly to Cypress. Use `pnpm cypress:run:all`
to run the component suite followed by the E2E suite.

Cypress 16 manages browser memory by default; the removed
`experimentalMemoryManagement` option is no longer needed.

Component tests run in Chrome, including in CI, because the map tests need
WebGL and Cypress's default Electron browser fails to initialize it in the test
environment. Install Chrome locally and run `pnpm cypress:run:component` from
`frontend/`, or use `make -C frontend cypress-component-tests` from the repository
root to run them in the Cypress container, which already includes Chrome.

### Frontend checks

Run the `frontend_checks` validation commands from this directory:

```bash
pnpm exec prettier --check .
pnpm codegen
pnpm lint
pnpm tsc
pnpm build
```

To run the OpenLayers editor control tests:

```bash
pnpm exec cypress run --component --spec packages/ole/control/Control.test.tsx
```

### Cypress tests

To run the Cypress tests (as used in CI), set the required environment variable
in your `backend/env_file`:

```bash
ALMA_BEHOERDE=A
```

Then run:

```bash
make cypress-tests
```

To run the Cypress tests locally the debug user must be enabled — see
[`backend/env_file.dist`](../backend/env_file.dist).

Note: the Cypress tests do **not** run against the dev server (port `8081`),
but against the production setup on port `8080`, which uses the built static
assets.

## Translations

The application supports multiple languages. The translations are managed in the `db/include/translations.csv` file and imported into the database on startup. Each entry in the CSV file contains the key and translations for different languages (German, French, Italian). To add or update translations, modify the `translations.csv` file and follow the format:

```
key;de;fr;it
```

After making changes, ensure to restart the application for the changes to take effect.

To catch missing translations, open `frontend/lib/i18n.ts` and switch the `rosetta` import to `rosetta/debug`. Now you will see warnings in the console for any missing translations.
