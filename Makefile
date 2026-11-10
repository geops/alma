default: start-services

backend/env_file:
	cp backend/env_file.dist backend/env_file
	echo '# Secret key used for signing JWT tokens:' >> backend/env_file
	echo "ALMA_SECRET_KEY=\"`openssl rand -base64 32`\"" >> backend/env_file
	echo '# Keycloak admin password (username: admin):' >> backend/env_file
	echo "KC_BOOTSTRAP_ADMIN_PASSWORD=\"`openssl rand -base64 32`\"" >> backend/env_file

rebuild: backend/env_file
	docker compose build

start-services: backend/env_file
	# set up the database before starting the rest of the services:
	docker compose up -d --remove-orphans db
	docker compose exec db wait_for_database.sh
	make -C db db-migrate load-demo-fixtures db-import-translations
	# needed to take KC_HOSTNAME into account:
	docker compose run --rm --remove-orphans keycloak import --file /opt/keycloak/data/import/initial.json
	# start the rest of the services:
	docker compose up -d --remove-orphans
	# make sure the links are ready before displaying the URLs:
	until curl --silent --fail --output /dev/null http://localhost:8080/auth/realms/alma/.well-known/openid-configuration; do sleep 1; done
	@echo
	@echo "alma     : http://localhost:8080/"
	@echo "GraphiQL : http://localhost:8080/graphql (if configured)"
	@echo "SSO login: http://localhost:8080/api/auth/authorize/"
	@echo
	@echo "backend  : http://localhost:8000/"
	@echo

start-services-no-translations: backend/env_file
	# set up the database before starting the rest of the services:
	docker compose up -d --remove-orphans db
	docker compose exec db wait_for_database.sh
	make -C db db-migrate load-demo-fixtures
	# needed to take KC_HOSTNAME into account:
	docker compose run --rm --remove-orphans keycloak import --file /opt/keycloak/data/import/initial.json
	# start the rest of the services:
	docker compose up -d --remove-orphans
	# make sure the links are ready before displaying the URLs:
	until curl --silent --fail --output /dev/null http://localhost:8080/auth/realms/alma/.well-known/openid-configuration; do sleep 1; done
	@echo
	@echo "alma     : http://localhost:8080/"
	@echo "GraphiQL : http://localhost:8080/graphql (if configured)"
	@echo "SSO login: http://localhost:8080/api/auth/authorize/"
	@echo
	@echo "backend  : http://localhost:8000/"
	@echo

stop-services:
	docker compose --profile db_anonymize --profile backend_tests --profile frontend_dev down

restart-services:
	make stop-services
	lsof -i :8080 || test $$? -eq 1
	lsof -i :8000 || test $$? -eq 1
	sudo systemctl stop nginx
	make start-services

restart-services-no-translations:
	make stop-services
	lsof -i :8080 || test $$? -eq 1
	lsof -i :8000 || test $$? -eq 1
	sudo systemctl stop nginx
	make start-services-no-translations

e2e-tests: stop-services
	docker compose up -d db
	docker compose exec db wait_for_database.sh
	docker compose run --rm db_migrate migrate
	docker compose run --rm keycloak import --file /opt/keycloak/data/import/initial.json
	docker compose up -d
	make import-workflows
	make -C db db-import-fixtures
	make -C db db-import-settings
	make -C db db-import-translations
	make -C db db-import-translated-codelists
	until curl --silent --fail --output /dev/null http://localhost:8080/auth/realms/alma/.well-known/openid-configuration; do sleep 1; done
	make -C frontend cypress-e2e-tests

import-workflows:
	docker compose run --rm --no-deps --entrypoint=/bin/sh backend -c 'for filename in src/workflows/*.yml; do /app/venv/bin/alma workflow import --file="$$filename"; done'
