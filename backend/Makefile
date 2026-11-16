db-migrate:
	make -C ../db db-migrate

setup-test-db:
	docker compose up -d db
	docker compose exec db wait_for_database.sh
	docker compose run --rm db psql -c "drop database if exists alma_test" -c "create database alma_test owner alma" "postgresql://alma:alma@db/alma"
	docker compose run --rm db_migrate -url=jdbc:postgresql://db/alma_test migrate
	make -C ../db db-import-translations-test

docker-tests:
	docker compose run --rm backend_dev

graphql-schema:
	strawberry export-schema alma.graphql.schema:schema > schema.graphql
