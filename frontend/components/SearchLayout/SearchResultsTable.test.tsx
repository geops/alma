import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";

import Form from "@/components/Form";
import i18n from "@/cypress/fixtures/i18n.json";
import colors from "@/cypress/fixtures/vflz/colors.json";
import searchResultsTabular from "@/cypress/fixtures/vflz/search/search.json";
import searchFieldNames from "@/cypress/fixtures/vflz/search/searchFieldNames.json";
import { SearchField } from "@/lib/graphql";

import SearchResultsTable from "./SearchResultsTable";

const mountOptions = {
  router: {},
  translations: {
    search: {
      noResults: { heading: "Keine Treffer gefunden" },
      results: { other: "{{count}} Treffer" },
    },
  },
};

describe("SearchResultsTable Component", () => {
  describe("Show results", () => {
    beforeEach(() => {
      cy.intercept("POST", "/graphql", (req) => {
        if (req.body.query?.includes("query searchTabular")) {
          if (req.body.variables?.page === 1) {
            req.reply({
              data: {
                search: searchResultsTabular,
              },
            });
          } else {
            req.reply({
              data: {
                search: {
                  tabular: {
                    results: [],
                  },
                },
              },
            });
          }
        } else if (req.body.query?.includes("query SearchFieldNames")) {
          req.reply(searchFieldNames);
        } else if (req.body.query?.includes("query I18n")) {
          req.reply(i18n);
        } else if (req.body.query?.includes("query colors")) {
          req.reply(colors);
        }
      });
    });

    it("renders", () => {
      cy.mount(
        <SearchParamsContext value={new URLSearchParams()}>
          <Form model="foo">
            <SearchResultsTable
              fields={[
                SearchField.Standortnummer,
                SearchField.Bezeichnung,
                SearchField.Gemeinde,
                SearchField.BfsNr,
                SearchField.Beurteilung,
                SearchField.Standorttyp,
              ]}
              filters={{ query: "" }}
            />
          </Form>
        </SearchParamsContext>,
        mountOptions,
      );

      cy.get("table").should("exist");
      cy.get("tbody tr").should("have.length", 3);
    });

    it("group results by Standort", () => {
      cy.mount(
        <SearchParamsContext value={new URLSearchParams()}>
          <Form model="foo">
            <SearchResultsTable
              fields={[
                SearchField.Standortnummer,
                SearchField.Bezeichnung,
                SearchField.Gemeinde,
                SearchField.BfsNr,
                SearchField.Beurteilung,
                SearchField.Standorttyp,
                SearchField.Beteiligte,
              ]}
              filters={{ query: "" }}
              isGrouped
            />
          </Form>
        </SearchParamsContext>,
        mountOptions,
      );
      cy.get("table").should("exist");
      cy.get("div").contains("2 Treffer").should("exist");
      cy.get("tbody tr").should("have.length", 4);
      cy.get("button").contains("(2)").should("exist");
      cy.get("button").contains("(2)").click();
      cy.get("tbody tr").should("have.length", 2);
      cy.get("button").contains("(2)").should("exist");
      cy.get("button").contains("(2)").click();
      cy.get("tbody tr").should("have.length", 4);
    });
  });

  describe("No results", () => {
    before(() => {
      cy.intercept("POST", "/graphql", (req) => {
        if (req.body.query?.includes("query searchTabular")) {
          req.reply({
            data: {
              search: {
                tabular: {
                  numResultsTotal: 0,
                  results: [],
                },
              },
            },
          });
        }
      });
    });

    it("displays no results message when no data", function () {
      cy.mount(
        <SearchParamsContext value={new URLSearchParams()}>
          <Form model="foo">
            <SearchResultsTable filters={{ query: "" }} />
          </Form>
        </SearchParamsContext>,
        mountOptions,
      );

      cy.get("table").should("exist");
      cy.get("div").contains("0 Treffer").should("exist");
      cy.get("h3").contains("Keine Treffer gefunden").should("exist");
    });
  });
});
