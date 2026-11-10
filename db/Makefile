source := demo
netrc := $(HOME)/.netrc

COMPOSE_PROJECT_NAME ?= alma
network := $(COMPOSE_PROJECT_NAME)_backend

SOURCE_FILE ?= exchange.tgz
ALTLAST_UPDATE_FILE := include/updates_altlast4web/altlast_$(source)_db_update.sql
ALMA_UPDATE_FILE := include/updates_golives/$(source)_updates_golive.sql
ALMA_DB_DUMP := alma_$(source).dump


POSTGRES_CMD := docker run \
	--rm \
	--network=$(network) \
	-v ./include:/include:ro \
	-v ./data:/data:ro \
	--entrypoint "" \
	registry.geops.com/geops/alma/alma-db:latest

db-info:
	docker compose run --rm db_migrate info

db-migrate:
	docker compose run --rm db_migrate migrate -outOfOrder=true

db-fetch-source:
	make data/projects

db-fetch-source-alma:
	mkdir -p data
	curl -Ssf --netrc-optional --netrc-file "$(netrc)" "https://demo.webdav.geops.de/$(ALMA_DB_DUMP)" -o "data/$(ALMA_DB_DUMP)"

db-import-alma:
	$(POSTGRES_CMD) pg_restore \
		--single-transaction \
		--disable-triggers \
		-d postgresql://alma:alma@db:5432/alma /data/$(ALMA_DB_DUMP)
	#checkov:skip=CKV_SECRET_4 ignore credentials

db-import-alma-anon:
	$(POSTGRES_CMD) psql --version
	$(POSTGRES_CMD) psql \
		--single-transaction \
		--set="ON_ERROR_STOP=on" \
		-f /data/$(ALMA_DB_DUMP) \
		postgresql://alma:alma@db:5432/alma

data/projects:
	mkdir -p data
	curl -Ssf --netrc-optional --netrc-file "$(netrc)" "https://$(source).webdav.geops.de/$(SOURCE_FILE)" -o data/exchange.tgz
	tar --directory=data -xf data/exchange.tgz
	gunzip -f data/projects.gz
	touch data/projects

db-import: db-import-non-anonymized

data/processmaker: data/projects
	gunzip -f data/processmaker.gz
	touch data/processmaker

db-import-non-anonymized: data/projects data/processmaker db-import-settings db-import-translations
	$(POSTGRES_CMD) pg_restore --list data/projects > data/projects.list
	grep -vf include/projects.list-filter data/projects.list > data/projects.list.filtered
	$(POSTGRES_CMD) pg_restore \
		-Fc \
		--single-transaction \
		--data-only \
		--disable-triggers \
		--use-list=data/projects.list.filtered \
		--schema=altlast \
		--schema=altlast_admin \
		--schema=altlast_hist \
		--schema=altlast_ili \
		--schema=altlast_imp \
		--schema=altlast_user \
		--schema=altlast_version1 \
		--schema=altlast_wfs \
		-d postgresql://alma:alma@db:5432/alma \
		/data/projects
	$(POSTGRES_CMD) pg_restore \
		-Fc \
		--single-transaction \
		--data-only \
		--disable-triggers \
		--schema=wf_workflow \
		--table=app_delegation \
		--table=app_document \
		--table=app_thread \
		--table=dynaform \
		--table=process \
		--table=step \
		--table=task \
		--table=content \
		--table=import_document \
		--table=output_document \
		-d postgresql://alma:alma@db:5432/alma \
		/data/processmaker
	docker compose run --rm -v "$(shell pwd)/data:/data/:ro" backend /app/src/scripts/import_processmaker_forms.py --db-url=postgresql://alma:alma@db:5432/alma --workflow-files=/data/workflow
	if [ -f $(ALTLAST_UPDATE_FILE) ]; then \
		$(POSTGRES_CMD) psql \
			-1 -f $(ALTLAST_UPDATE_FILE) postgresql://alma:alma@db:5432/alma; \
	fi
	$(POSTGRES_CMD) psql \
		-c "select import_altlast.check_all()" postgresql://alma:alma@db:5432/alma
	$(POSTGRES_CMD) psql \
		-c "select import_altlast.import_all('$(source)')" postgresql://alma:alma@db:5432/alma
	$(POSTGRES_CMD) psql \
		-1 -f /include/insert_interlis_settings_demo.sql postgresql://alma:alma@db:5432/alma
	$(POSTGRES_CMD) psql \
		-1 -f /include/import_system_users.sql postgresql://alma:alma@db:5432/alma
	if [ -f $(ALMA_UPDATE_FILE) ]; then \
		$(POSTGRES_CMD) psql \
			-1 -f $(ALMA_UPDATE_FILE) postgresql://alma:alma@db:5432/alma; \
	fi
	$(MAKE) db-import-translated-codelists

db-import-system-users:
	$(POSTGRES_CMD) psql -1 -v ON_ERROR_STOP=ON -f /include/import_system_users.sql postgresql://alma:alma@db:5432/alma

load-demo-fixtures:
	make db-import-system-users
	$(POSTGRES_CMD) psql -1 -f /include/demo-fixtures.sql postgresql://alma:alma@db:5432/alma

db-export-demo:
	rm -f data/alma_demo.dump
	$(POSTGRES_CMD) pg_dump \
		-Fc \
		--exclude-schema='altlast*' \
		--exclude-table='keycloak.*' \
		-d postgresql://alma:alma@db:5432/alma \
	> ./data/alma_demo.dump

# Fail if the demo data is missing (the dump was fetched but has no content)
db-check-demo-data:
	n=$$($(POSTGRES_CMD) psql -Atc "select count(*) from alma.vflz" postgresql://alma:alma@db:5432/alma); \
	echo "alma.vflz has $$n rows"; \
	test "$$n" -ge 100

db-upload-demo:
	curl -Ssf --netrc-optional --netrc-file "$(netrc)" --upload-file data/alma_demo.dump "https://demo.webdav.geops.de/alma_demo.dump"
	# single backup copy, overwritten on every upload
	curl -Ssf --netrc-optional --netrc-file "$(netrc)" --upload-file data/alma_demo.dump "https://demo.webdav.geops.de/alma_demo_backup.dump"

db-configure-user:
	$(POSTGRES_CMD) psql -1 -v ON_ERROR_STOP=ON -f /include/e2e-configure-user.sql postgresql://alma:alma@db:5432/alma

db-import-translations:
	$(POSTGRES_CMD) psql -1 -v ON_ERROR_STOP=ON -f /include/import_translations.sql postgresql://alma:alma@db:5432/alma
	$(POSTGRES_CMD) psql -1 -v ON_ERROR_STOP=ON -f /include/delete_translations.sql postgresql://alma:alma@db:5432/alma

db-import-translations-test:
	$(POSTGRES_CMD) psql -1 -v ON_ERROR_STOP=ON -f /include/import_translations.sql postgresql://alma:alma@db:5432/alma_test
	$(POSTGRES_CMD) psql -1 -v ON_ERROR_STOP=ON -f /include/delete_translations.sql postgresql://alma:alma@db:5432/alma_test

db-import-settings:
	docker compose run --rm backend /app/src/scripts/import_settings.py --db-url=postgresql://alma:alma@db:5432/alma --settings-csv=/app/src/alma/default_instance_settings.csv

db-import-translated-codelists:
	$(POSTGRES_CMD) psql -1 -v ON_ERROR_STOP=ON -f /include/import_codes.sql postgresql://alma:alma@db:5432/alma

db-import-additional-stoffgruppen:
	$(POSTGRES_CMD) psql -1 -v ON_ERROR_STOP=ON -f /include/insert_additional_stoffgruppen.sql postgresql://alma:alma@db:5432/alma

db-import-fixtures:
	$(POSTGRES_CMD) psql -1 -v ON_ERROR_STOP=ON -f /include/e2e-fixtures.sql postgresql://alma:alma@db:5432/alma

db-export-fixtures:
	$(POSTGRES_CMD) pg_dump \
		--data-only \
		--disable-triggers \
		--schema=alma \
		--schema=alma_external \
		-d postgresql://alma:alma@db:5432/alma \
		> ./include/e2e-fixtures.sql

db-import-kantone:
	$(POSTGRES_CMD) psql -f /include/import_kantone.sql postgresql://alma:alma@db:5432/alma

db-import-report-configurations:
	$(POSTGRES_CMD) psql -f /include/import_report_configurations.sql postgresql://alma:alma@db:5432/alma

db-import-flugplaetze:
	$(POSTGRES_CMD) psql -f /include/import_flugplaetze.sql postgresql://alma:alma@db:5432/alma

db-import-noga-codes:
	$(POSTGRES_CMD) psql -1 -v ON_ERROR_STOP=ON -f /include/import_noga_codes_25001.sql postgresql://alma:alma@db:5432/alma

db-insert-jahrestrends:
	$(POSTGRES_CMD) psql -f /include/insert_demo_jahrestrends.sql postgresql://alma:alma@db:5432/alma

# Commands required for data migration
db-migration-pull-codes:
	mkdir -p data/$(source)
	curl -Ssf --netrc-optional --netrc-file "$(netrc)" "https://$(source).webdav.geops.ch/alma_$(source)_codes_translations.dump" -o data/$(source)/alma_$(source)_codes_translations.dump

db-migration-import-codes:
	$(POSTGRES_CMD) psql -c \
		'delete from alma.translations; delete from alma.cod; delete from alma.c_cli;' \
		postgresql://alma:alma@db:5432/alma

	$(POSTGRES_CMD) pg_restore \
		--single-transaction \
		--data-only \
		--schema=alma \
		-d postgresql://alma:alma@db:5432/alma data/$(source)/alma_$(source)_codes_translations.dump

db-migration-pull-wfs-cache:
	mkdir -p data/$(source)
	curl -Ssf --netrc-optional --netrc-file "$(netrc)" "https://$(source).webdav.geops.ch/alma_$(source)_wfs_cache.dump" -o data/$(source)/alma_$(source)_wfs_cache.dump


db-migration-import-wfs-cache:
	$(POSTGRES_CMD) psql -c \
		'delete from alma_external.wfs_cache;' \
		postgresql://alma:alma@db:5432/alma

	$(POSTGRES_CMD) pg_restore \
		--single-transaction \
		--data-only \
		--schema=alma_external \
		-d postgresql://alma:alma@db:5432/alma data/$(source)/alma_$(source)_wfs_cache.dump

db-export-alma:
	rm -f data/$(ALMA_DB_DUMP)
	$(POSTGRES_CMD) pg_dump \
		-Fc \
		--exclude-schema='altlast*' \
		--disable-triggers \
		-d postgresql://alma:alma@db:5432/alma \
	> ./data/$(ALMA_DB_DUMP)

db-upload-alma:
	tar -C data -czf data/alma_$(source)_dump.tar.gz $(ALMA_DB_DUMP)
	curl -Ssf --netrc-optional --netrc-file "$(netrc)" --upload-file data/alma_$(source)_dump.tar.gz "https://$(source).webdav.geops.ch/alma_$(source)_dump.tar.gz"

db-import-documents:
	docker compose run --volume "$(shell pwd)/data/workflow/files:/workflow" \
		--entrypoint=/app/venv/bin/python \
		backend /app/src/scripts/copy_processmaker_documents.py \
		--workflow-files=/workflow --verbose

db-generate-missing-preview-images:
	docker compose run --rm backend -m alma.cli generate-missing-previews

db-migrate-gwas:
	$(POSTGRES_CMD) psql -f /include/migrate_gwas.sql postgresql://alma:alma@db:5432/alma
