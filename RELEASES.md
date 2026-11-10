## Release 1.6.16

- Update custom data for data migrations, validations, workflows, reports and interlis exports

## Release 1.6.15

- Update postgres anonymizer to version 3 to match postgres v 18

## Release 1.6.13

- update frontend dependencies (major)
- Add option to disable graphql interface by default
- lock file maintenance frontend dependencies

## Release 1.6.12

- Update custom data for workflows and interlis exports

## Release 1.6.11

- Fix github repo url

## Release 1.6.10

- update uv, node and other certificate-related dependencies
- update brotli dependencies

## Release 1.6.9

- Add optional parameter to limit kompartimente for Ablagerung sites
- Increase task filter to less than 4 weeks instead of 2

## Release 1.6.8

- Add contrast to active tool in the OLE toolbar
- Sort betriebe by cadastre relevance
- Add flag for rendering WMS baselayers as imageLayer

## Release 1.6.7

- Allow pulling communes that have no kanton assigned

## Release 1.6.6

- Update custom data for migration and reports

## Release 1.6.5

- Update custom reports

## Release 1.6.4

- Updated to business workflow manager to [1.3.0](https://github.com/geops-open-source/business-workflow-manager/blob/main/RELEASES.md)
    - Allow tasks to be created as subtasks to tasks
    - Allow modified tasks to be updated
- Add option to hide document upload

## Release 1.6.3

- Update documentation

## Release 1.6.2

- Change db permissions

## Release 1.6.1

- Update license and documentation.

## Release 1.6.0

- Open Source publication alma on github.

## Release 1.5.70

- Update keycloak to 26.7.3
- Monitoring: Add semgrep, zap scan
- Adding new baselayers
- Update httpx -> httpx2

## Release 1.5.60

- Update dependencies

## Release 1.5.50

- Opening URLs directly from the form
- Highlight documents with uploaded files, make them instantly downloadable
- Update weasyprint version to 69

## Release 1.5.40

- Add clear button for simple/advanced searches & workflow filter
- Map & layer improvements
- Add link in global task view to workflow at site
- Deactivate map rotation
- Block closing task when subtasks have open events
- Optimize display messages when no data found

## Release 1.5.30

- UI/UX & workflow/tasks improvements

## Release 1.5.20

- Update postgres version 16->18, Flyway 10->12.
- Filter communities by canton
- Translate code list names
- Add access control for interlis exports

## Release 1.5.10

- split Standorte layer for editing map
- Add fields (Standortnummer, Bezeichnung und Standorttyp) to simple search
- Workflows/Tasks improvements
- Performance improvements
- Remove specific tasks from default workflows
- Add command to update heights of all sites
- Add url field to tasks
- Update dependencies

## Release 1.5.0

- Multiple surface waters
- Automated data import from external WFS
- Add new report Jahresbericht
- Update sentry-sdk to v2.51.
- More filters for tasks
- Monitoring improvements
- Add customized defaults for saved searches
- Show land parcel identifier (NBIdent) for parcels

## Release 1.4.0

- Monitoring: separate jobs for each INTERLIS export
- Add option to allow access to mapserver via IP
- Dashboard improvements
- Change to custom login theme
- Remove mapserver from review app
- Add changelog

## Release 1.3.0

- Field Flugplatz
- Update frontend dependencies
- Workflow/Tasks improvements
- New type PFAS

## Release 1.2.0

- Sentry integration
- New type Kinderspielplatz/Gruenflaeche
- Update frontend dependencies
- Add field for transport companies
- Translations for historization messages

## Release 1.1.0

- UI/UX & workflow/tasks improvements
- Authlib update
- Monitoring: Split Icinga requests into separate checks
- Update frontend dependencies
- Added new search fields
- Translation updates
- Added automated events for task completion
- Added validation for parcels

## Release 1.0.0

- First release of alma
