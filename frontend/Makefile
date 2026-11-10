CONTAINER_NAME ?= cypress-tests

dev-server: dev-server-setup
	make db-fetch-source -C ../db
	make db-anonymize -C ../db
	make db-import -C ../db
	npm run dev

dev-server-cypress: dev-server-setup
	make import-workflows -C ..
	make db-import-fixtures -C ../db
	make db-import-report-configurations -C ../db
	make db-import-settings -C ../db
	make db-import-translations -C ../db
	make db-import-translated-codelists -C ../db
	make cypress-e2e-test-user
	npm run dev

dev-server-clean:
	# Kill any Next.js dev server still holding port 3000
	-lsof -ti:3000 -sTCP:LISTEN 2>/dev/null | xargs -r kill -9 || true
	# Kill docker container still holding port 8000 (like mapset)
	docker ps --filter publish=8000 -q | xargs -r docker stop
	# Kill any Next.js dev server still holding port 8000
	-lsof -ti:8000 -sTCP:LISTEN 2>/dev/null | xargs -r kill -9 || true
	# kill all containers (including orphaned ones) to avoid port conflicts
	-docker ps -q | xargs -r docker kill || true
	# Bring down all services AND remove volumes (wipes DB data)
	# All profiles must be activated together because `cypress` depends on `nginx` (prod profile)
	-docker compose --profile frontend_dev --profile prod --profile cypress --profile backend_tests down --remove-orphans -v
	# Remove leftover `docker compose run` containers (interrupted --rm invocations)
	-docker ps -aq --filter "name=alma-.*-run-" | xargs -r docker rm -f

dev-server-setup: dev-server-clean
	corepack enable pnpm && pnpm install
	docker compose up -d scheduler
	docker compose run --rm db_migrate migrate
	docker compose run --rm --remove-orphans keycloak import --file /opt/keycloak/data/import/initial.json
	docker compose up -d nginx_dev
	@echo
	@echo "dev server: http://localhost:8080/"
	@echo "GraphiGL  : http://localhost:8080/graphql"
	@echo "SSO login : http://localhost:8080/api/auth/authorize/"
	@echo

cypress-component-tests:
	docker rm $(CONTAINER_NAME) || true
	if [ -n "$(RECORD_KEY)" ]; then \
		docker compose run --name $(CONTAINER_NAME) cypress npx cypress run --component --browser chrome --record --key $(RECORD_KEY); \
	else \
		docker compose run --name $(CONTAINER_NAME) cypress npx cypress run --component --browser chrome --record false; \
	fi

cypress-e2e-test-user:
	docker compose run --rm --no-deps backend -m alma.cli create-e2e-test-user unauthorized
	docker compose run --rm --no-deps backend -m alma.cli create-e2e-test-user --role_name=LESEN_SACHDATEN lesen-sachdaten
	docker compose run --rm --no-deps backend -m alma.cli create-e2e-test-user --role_name=LESEN_GESCHAEFTE lesen-geschaefte
	docker compose run --rm --no-deps backend -m alma.cli create-e2e-test-user --role_name=BEARBEITEN_SACHDATEN bearbeiten-sachdaten
	docker compose run --rm --no-deps backend -m alma.cli create-e2e-test-user --role_name=BEARBEITEN_GESCHAEFTE bearbeiten-geschaefte
	docker compose run --rm --no-deps backend -m alma.cli create-e2e-test-user --role_name=ADMINISTRATION admin
	docker compose run --rm --no-deps backend -m alma.cli create-e2e-test-user --role_name=ADMINISTRATION 'System-User'
	make db-configure-user -C ../db

cypress-e2e-tests:
	docker rm $(CONTAINER_NAME) || true
	docker compose up -d
	make cypress-e2e-test-user
	if [ -n "$(RECORD_KEY)" ]; then \
		docker compose run --no-deps --name $(CONTAINER_NAME) cypress npx cypress run --browser chrome --headed --no-runner-ui --record --key $(RECORD_KEY); \
	else \
		docker compose run --no-deps --name $(CONTAINER_NAME) cypress npx cypress run --browser chrome --headed --no-runner-ui --record false; \
	fi

copy-cypress-data:
	mkdir -p cypress
	docker cp $(CONTAINER_NAME):/frontend/cypress/screenshots ./cypress || true
	docker cp $(CONTAINER_NAME):/frontend/cypress/videos ./cypress || true
	docker rm $(CONTAINER_NAME) || true
