import type {
  QuickSearchQuery,
  SearchFilter,
  SearchTabularQueryVariables,
} from "@/lib/graphql";

describe("Search Page", () => {
  beforeEach(() => {
    cy.setUser("lesen-sachdaten");

    cy.intercept<{ query: string }>("POST", "/graphql", (req) => {
      if (req.body.query.includes("query searchExports")) {
        req.alias = "SearchExports";
      } else if (req.body.query.includes("query searchOptions")) {
        req.alias = "SearchOptions";
      } else if (req.body.query.includes("query search")) {
        req.alias = "Search";
      } else {
        req.alias = "Other";
      }
    });
  });

  function formFindSimple(selector: string) {
    return cy.get("form[data-test=simpleSearchForm]").find(selector);
  }

  function formFindAdvanced(selector: string) {
    return cy.get("form[data-test=advancedSearchForm]").find(selector);
  }

  const visitOptions = {
    onBeforeLoad: (window: Cypress.AUTWindow) => {
      window.localStorage.removeItem("search-params");
    },
  };

  it("writes form values to searchParams", () => {
    cy.visit("/search", visitOptions);
    cy.wait("@Search");

    formFindSimple("input[name=query]").type("aaa");

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(600); // wait for debounce

    formFindSimple("div[data-test=gemeindeFilter] input").type("{selectAll}oo");
    cy.get("div[role=listbox]").contains("Foo");
    cy.get("div[role=listbox]").contains("Goo").click();
    formFindSimple("div[data-test=gemeindeFilter] button").click();

    formFindSimple("div[data-test=beurteilungFilter] input").should(
      "have.value",
      "Beurteilung (0)",
    );
    formFindSimple("div[data-test=beurteilungFilter] button").click();
    cy.get("div[role=listbox]")
      .contains("keine schädlichen oder lästigen")
      .click();
    formFindSimple("div[data-test=beurteilungFilter] button").click();

    formFindSimple("div[data-test=publiziertFilter] span[role=checkbox]").click(
      { force: true },
    );

    formFindSimple("button[type=submit]").click();
    cy.wait("@Search");
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(600);

    cy.url().then((url) => {
      const urlParams = new URLSearchParams(new URL(url).search);
      const query = urlParams.get("q");
      const gemeinde = urlParams.get("gemeinde");
      const beurteilung = urlParams.get("beurteilung");
      const publiziert = urlParams.get("publiziert");

      expect(query).to.equal("aaa");
      expect(gemeinde).to.equal("0004");
      expect(beurteilung).to.equal("code:103:02");
      expect(publiziert).to.equal("true");
    });

    cy.visit("/search/advanced");
    cy.wait("@Search");
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(600);
    formFindAdvanced("button[type=submit]").should("be.disabled");
    formFindAdvanced("textarea[name=advancedQuery]").type(
      'Beurteilung = "unbelastet"',
    );
    formFindAdvanced("button[type=submit]").should("be.enabled");
    formFindAdvanced("button[type=submit]").click({ force: true });

    cy.url().then((url) => {
      const urlParams = new URLSearchParams(new URL(url).search);
      const query = urlParams.get("q");
      expect(query).to.equal('Beurteilung = "unbelastet"');
    });
  });

  it("restores form values from searchParams", () => {
    cy.visit(
      "/search?q=testquery&gemeinde=0003%2C0001%2C0002&beurteilung=code%3A103%3A01&publiziert=true",
      visitOptions,
    );
    cy.wait("@Search");
    formFindSimple("input[name=query]").should("have.value", "testquery");
    formFindSimple("div[data-test=gemeindeFilter] input").should(
      "have.value",
      "Gemeinde (3)",
    );
    formFindSimple("div[data-test=beurteilungFilter] input").should(
      "have.value",
      "unbelastet",
    );
    formFindSimple(
      "div[data-test=publiziertFilter] span[role=checkbox]",
    ).should("have.attr", "data-checked");

    cy.visit('/search/advanced?q=Bezeichnung+%3D+"Betriebsstandort"');
    cy.wait("@Search");
    formFindAdvanced("textarea[name=advancedQuery]").should(
      "have.value",
      'Bezeichnung = "Betriebsstandort"',
    );
  });

  it("performs a search query based on searchParams", () => {
    cy.visit(
      "/search?q=testquery&gemeinde=0003%2C0001%2C0002&beurteilung=code%3A103%3A01&publiziert=true",
    );

    cy.intercept<{
      query: string;
      variables?: {
        query?: string;
      };
    }>("POST", "/graphql", (req) => {
      if (req.body.query.includes("query search")) {
        if (req.body?.variables?.query?.includes("testquery")) {
          req.alias = "SearchTestQuery";
        }
      }
    });

    cy.wait<{
      operationName: string;
      variables: SearchTabularQueryVariables;
    }>("@SearchTestQuery").then((interception) => {
      const requestBody = interception.request.body;
      expect(requestBody).to.have.property("operationName");

      expect(requestBody.operationName).to.equal("searchTabular");

      const { variables } = requestBody;

      expect(variables).to.have.property("query");
      expect(variables.query).to.equal("testquery");
      expect(variables.advanced).to.equal(false);
      expect(variables.filters).to.be.an("array");
      if (!Array.isArray(variables.filters)) {
        return;
      }
      expect(variables.filters).to.have.length(3);

      const bfs = variables.filters[0] || ({} as SearchFilter) || {};
      expect(bfs.field).to.equal("BFS_NR");
      expect(bfs.value).to.deep.equal([3, 1, 2]);

      const beurteilung = variables.filters[1];
      expect(beurteilung.field).to.equal("BEURTEILUNG");
      expect(beurteilung.value).to.deep.equal(["code:103:01"]);

      const publiziert = variables.filters[2];
      expect(publiziert.field).to.equal("AKTUELLSTE_PUBLIKATION");
      expect(publiziert.value).to.equal(true);
    });

    cy.visit('/search/advanced?q=Aktuelle-Nutzung+%3D+"Flugplatzareal"');

    cy.intercept<{
      query: string;
      variables?: {
        query?: string;
      };
    }>("POST", "/graphql", (req) => {
      if (req.body.query.includes("query search")) {
        if (
          req.body?.variables?.query?.includes(
            'Aktuelle-Nutzung = "Flugplatzareal"',
          )
        ) {
          req.alias = "SearchAdvancedQuery";
        }
      }
    });
    cy.wait<{
      operationName: string;
      variables: SearchTabularQueryVariables;
    }>("@SearchAdvancedQuery").then((interception) => {
      const requestBody = interception.request.body;
      expect(requestBody).to.have.property("operationName");

      expect(requestBody.operationName).to.equal("searchTabular");

      const { variables } = requestBody;

      expect(variables).to.have.property("query");
      expect(variables.query).to.equal('Aktuelle-Nutzung = "Flugplatzareal"');
    });
  });

  // eslint-disable-next-line mocha/no-pending-tests
  it.skip("restores previous search parameters from localStorage", () => {
    cy.visit(
      "/search?q=testquery&gemeinde=0001%2C0002&beurteilung=code%3A103%3A01&publiziert=true",
      visitOptions,
    );
    cy.wait("@Search");
    cy.visit("/search");
    cy.wait("@Search");
    formFindSimple("input[name=query]").should("have.value", "testquery");
    formFindSimple("div[data-test=gemeindeFilter] input").should(
      "have.value",
      "Gemeinde (2)",
    );
    formFindSimple("div[data-test=beurteilungFilter] input").should(
      "have.value",
      "unbelastet",
    );
    formFindSimple(
      "div[data-test=publiziertFilter] span[role=checkbox]",
    ).should("have.attr", "data-checked");

    cy.visit(
      "/search/advanced?q=Aktuellste-Publikation+%3D+TRUE",
      visitOptions,
    );
    cy.wait("@Search");
    cy.visit("/search/advanced");
    cy.wait("@Search");
    formFindAdvanced("textarea[name=advancedQuery]").should(
      "have.value",
      "Aktuellste-Publikation = TRUE",
    );
  });

  // eslint-disable-next-line mocha/no-pending-tests
  it.skip("performs search with simpleQuery and filters", () => {
    // find results for simpleQuery
    cy.visit("/search", visitOptions);
    cy.wait("@Search");
    formFindSimple("input[name=query]").click();
    cy.wait("@Other");
    formFindSimple("input[name=query]").wait(200).type("123");
    formFindSimple("button[type=submit]").click();
    cy.get("table[data-test=searchResultsTable]").should("exist");
    cy.get("table[data-test=searchResultsTable] tbody")
      .find("tr")
      .find("td")
      .contains("Schiessanlagenstandort");

    // filter Gemeinde
    cy.visit("/search", visitOptions);
    cy.wait("@Search");
    formFindSimple("div[data-test=gemeindeFilter] input").click();
    formFindSimple("div[data-test=gemeindeFilter] input").type("{selectAll}oo");
    cy.get("div[role=listbox]").contains("Foo");
    cy.get("div[role=listbox]").contains("Goo").click();
    formFindSimple("div[data-test=gemeindeFilter] button").click();
    formFindSimple("button[type=submit]").click();
    cy.get("table[data-test=searchResultsTable] tbody")
      .find("tr")
      .should("have.length", 1);

    // filter Beurteilung
    cy.visit("/search", visitOptions);
    cy.wait("@Search");
    formFindSimple("input[name=query]").click();
    cy.wait("@Other");
    formFindSimple("input[name=query]").wait(200).type("{selectAll}123");
    formFindSimple("div[data-test=beurteilungFilter] input").should(
      "have.value",
      "Beurteilung (0)",
    );
    formFindSimple("div[data-test=beurteilungFilter] button").click();
    cy.get("div[role=listbox]")
      .contains("keine schädlichen oder lästigen")
      .click();
    formFindSimple("div[data-test=beurteilungFilter] button").click();
    formFindSimple("button[type=submit]").click();
    cy.get("table[data-test=searchResultsTable]")
      .find("tbody")
      .should("not.exist");
    formFindSimple("div[data-test=beurteilungFilter] input").click();
    formFindSimple("div[data-test=beurteilungFilter] input").type(
      "{selectAll}unbel",
    );
    cy.get("div[role=listbox]").should("be.visible");
    cy.get("div[role=listbox]").contains("unbelastet").click();
    formFindSimple("div[data-test=beurteilungFilter] button").click();
    formFindSimple("div[data-test=beurteilungFilter] input").should(
      "have.value",
      "Beurteilung (2)",
    );
    formFindSimple("button[type=submit]").click();
    cy.get("table[data-test=searchResultsTable] tbody")
      .find("tr")
      .should("exist");

    // filter Publiziert
    cy.visit("/search", visitOptions);
    cy.wait("@Search");
    formFindSimple("input[name=query]").click();
    cy.wait("@Other");
    formFindSimple("input[name=query]").wait(200).type("{selectAll}123");
    formFindSimple("button[type=submit]").click();
    cy.get("table[data-test=searchResultsTable] tbody")
      .find("tr")
      .should("have.length.greaterThan", 1);
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200);
    formFindSimple("div[data-test=publiziertFilter] span[role=checkbox]").click(
      { force: true },
    );
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200);
    formFindSimple("button[type=submit]").click();
    cy.get("table[data-test=searchResultsTable] tbody")
      .find("tr")
      .should("have.length", 1);

    // filter combined
    cy.visit("/search", visitOptions);
    cy.wait("@Search");
    formFindSimple("input[name=query]").click();
    cy.wait("@Other");
    formFindSimple("input[name=query]").wait(200).type("{selectAll}123");
    formFindSimple("div[data-test=gemeindeFilter] input").type("goo");
    cy.get("div[role=listbox]").contains("Goo").click();
    formFindSimple("div[data-test=gemeindeFilter] button").click();
    formFindSimple("div[data-test=beurteilungFilter] input").click();
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200);
    formFindSimple("div[data-test=beurteilungFilter] input").type(
      "{selectAll}Belastet",
    );
    cy.get("div[role=listbox]").should("be.visible");
    cy.get("div[role=listbox]")
      .contains("keine schädlichen oder lästigen")
      .click();
    formFindSimple("div[data-test=beurteilungFilter] button").click();
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200);
    formFindSimple("div[data-test=publiziertFilter] span[role=checkbox]").click(
      { force: true },
    );
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200);
    formFindSimple("button[type=submit]").click();
    cy.get("table[data-test=searchResultsTable] tbody")
      .find("tr")
      .should("have.length", 1);

    // preview results view
    cy.get("div[data-test=resultsViewMode]").contains("Vorschau").click();
    cy.wait("@Search");
    formFindSimple("div[data-test=gemeindeFilter] input")
      .invoke("val")
      .should("contain", "Goo");
    formFindSimple("div[data-test=beurteilungFilter] input")
      .invoke("val")
      .should("contain", "Belastet, keine schädlichen");

    cy.get("table[data-test=searchResultsTable]").should("not.exist");
    cy.get("div[data-test=resultsPreviewList]").contains("1 Treffer");
    cy.get("div[data-test=resultsPreviewList]")
      .find("div[role=link]")
      .contains("Schiessanlagenstandort");
    cy.get("div[data-test=resultsPreviewItem]").contains(
      "Schiessanlagenstandort",
    );
    formFindSimple("input[name=query]").click();
    formFindSimple("input[name=query]").type("somethingreallynotexisting");
    formFindSimple("button[type=submit]").click();
    cy.get("div[data-test=resultsPreviewList]").contains("0 Treffer");
    cy.get("div[data-test=resultsPreviewItem]").should("not.exist");

    cy.visit("/search", visitOptions);
    cy.wait("@Search");
    cy.get("div[data-test=resultsViewMode]").contains("Vorschau").click();
    cy.get("div[data-test=resultsPreviewList]")
      .find("div[role=link]")
      .contains("B1.1")
      .click();
    cy.get("div[data-test=resultsPreviewItem]")
      .contains("B1.1 Betriebsstandort Teilfläche")
      .click();
    cy.get("header[data-test=VflzLayout-header]").contains(
      "B1.1 Betriebsstandort Teilfläche",
    );

    // browser history: Form values should be restored
    cy.visit("/search", visitOptions);
    cy.wait("@Search");
    formFindSimple("input[name=query]").click();
    cy.wait("@Other");
    formFindSimple("input[name=query]").wait(200).type("123");
    formFindSimple("div[data-test=gemeindeFilter] input").click();
    cy.wait("@Other");
    formFindSimple("div[data-test=gemeindeFilter] input").type("goo");
    cy.get("div[role=listbox]").contains("Goo").click();
    formFindSimple("div[data-test=gemeindeFilter] button").click();
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200);
    formFindSimple("div[data-test=beurteilungFilter] input").click();
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200);
    formFindSimple("div[data-test=beurteilungFilter] input").type(
      "slowly{selectAll}Belastet",
    );
    cy.get("div[role=listbox]").should("be.visible");
    cy.get("div[role=listbox]")
      .contains("keine schädlichen oder lästigen")
      .click();
    formFindSimple("div[data-test=beurteilungFilter] button").click();
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200);
    formFindSimple("div[data-test=publiziertFilter] span[role=checkbox]").click(
      { force: true },
    );
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200);
    formFindSimple("button[type=submit]").click();

    cy.visit("/search", visitOptions);
    cy.wait("@Search");
    formFindSimple("input[name=query]").should("have.value", "");
    formFindSimple("div[data-test=gemeindeFilter] input").should(
      "have.value",
      "Gemeinde (0)",
    );
    formFindSimple("div[data-test=beurteilungFilter] input").should(
      "have.value",
      "Beurteilung (0)",
    );
    formFindSimple(
      "div[data-test=publiziertFilter] span[role=checkbox]",
    ).should("not.have.attr", "data-checked");

    cy.go("back");
    cy.wait("@Search");
    formFindSimple("input[name=query]").should("have.value", "123");
    formFindSimple("div[data-test=gemeindeFilter] input").should(
      "have.value",
      "Goo (0004)",
    );
    formFindSimple("div[data-test=beurteilungFilter] input").should(
      "have.value",
      "Belastet, keine schädlichen oder lästigen Einwirkungen zu erwarten",
    );
    formFindSimple(
      "div[data-test=publiziertFilter] span[role=checkbox]",
    ).should("have.attr", "data-checked");

    // switch to Advanced Search
    cy.visit("/search");
    cy.wait("@Search");
    cy.get("div[data-test=toggleSearchType]").contains("Erweitert").click();
    cy.get("form[data-test=simpleSearchForm]").should("not.exist");
    cy.get("form[data-test=advancedSearchForm]").should("exist");
  });

  // eslint-disable-next-line mocha/no-pending-tests
  it.skip("performs advanced search with autocomplete and validation", () => {
    cy.visit("/search/advanced");
    formFindAdvanced("button[type=submit]").should("be.disabled");
    cy.get("form[data-test=advancedSearchForm]")
      .find("textarea[name=advancedQuery]")
      .click();
    cy.get("div[role=listbox]").should("be.visible");
    formFindAdvanced("textarea[name=advancedQuery]").type("Stand");
    cy.get("div[role=listbox]")
      .should("be.visible")
      .contains("Standorttyp")
      .click();
    cy.get("div[role=listbox]").contains("!=").click();
    cy.get("div[role=listbox]").contains("Ablagerung").click();
    formFindAdvanced("textarea[name=advancedQuery]").type("{esc}");
    formFindAdvanced("button[type=submit]").should("be.enabled");

    formFindAdvanced("textarea[name=advancedQuery]").click();
    formFindAdvanced("textarea[name=advancedQuery]").type(
      "{leftArrow}{leftArrow}{leftArrow}xyz",
    );
    formFindAdvanced("button[type=submit]").should("be.disabled");
    formFindAdvanced("textarea[name=advancedQuery]").type("{esc}");
    formFindAdvanced("span[data-test=validationMessage]").contains(
      "Ungültiger Wert für Feld 'Standorttyp'",
    );

    formFindAdvanced("textarea[name=advancedQuery]").type(
      "{selectAll}Idontexist",
    );
    formFindAdvanced("span[data-test=validationMessage]").contains(
      "Ausdruck nicht vollständig",
    );

    formFindAdvanced("textarea[name=advancedQuery]").type(
      '{selectAll}Standorttyp = "Unfallstandort"',
    );
    formFindAdvanced("span[data-test=validationMessage]").should("not.exist");
    formFindAdvanced("textarea[name=advancedQuery]").type("{esc}");
    formFindAdvanced("button[type=submit]").should("be.enabled");
    formFindAdvanced("button[type=submit]").click();

    formFindAdvanced("textarea[name=advancedQuery]").type("{selectAll}beur");
    cy.get("div[role=listbox]").should("be.visible").contains("Beurteilung");
    formFindAdvanced("textarea[name=advancedQuery]").type("{enter}");
    cy.get("div[role=listbox]").contains("!=");
    formFindAdvanced("textarea[name=advancedQuery]").type("{downArrow}{enter}");
    cy.get("div[role=listbox]")
      .should("be.visible")
      .contains("Datensatz gelöscht")
      .click();
    formFindAdvanced("span[data-test=validationMessage]").should("not.exist");

    // FieldSelector
    cy.visit("/search/advanced", visitOptions);
    cy.wait("@Search");
    formFindAdvanced("textarea[name=advancedQuery]").should("have.value", "");
    cy.contains("button", "Eigenschaften").should("be.enabled");
    formFindAdvanced("textarea[name=advancedQuery]").type("beur{esc}");
    cy.contains("button", "Eigenschaften").click();
    cy.contains("button", "vflz_id").click();
    formFindAdvanced("textarea[name=advancedQuery]").should(
      "have.value",
      "vflz_id ",
    );
    cy.contains("button", "Eigenschaften").should("be.disabled");
    formFindAdvanced("textarea[name=advancedQuery]").type("> 3 AND ({esc}");
    cy.contains("button", "Eigenschaften").should("be.enabled");
    cy.contains("button", "Eigenschaften").click();
    cy.get("input[name=fieldFilter]").type("urteil");
    cy.contains("button", "Beteiligte").should("not.exist");
    cy.contains("button", "Publiziert").click();
    formFindAdvanced("textarea[name=advancedQuery]").type("= TRUE){esc}");
    formFindAdvanced("button[type=submit]").click();

    // browser history: redirect to advanced search and restore form values
    cy.visit("/");
    cy.get("textarea[name=advancedQuery]").should("not.exist");
    cy.get("nav a").contains("Suche").click();
    cy.url().should("contain", "/advanced");
    formFindAdvanced("textarea[name=advancedQuery]").should(
      "have.value",
      "vflz_id > 3 AND (Publiziert = TRUE)",
    );

    // simple and advanced search should store params independently
    cy.visit("/search", {
      onBeforeLoad: (win) => {
        win.localStorage.removeItem("search-params");
        win.localStorage.removeItem("last-search-mode");
      },
    });
    cy.wait("@Search");

    formFindSimple("input[name=query]").click();
    cy.wait("@Other");
    formFindSimple("input[name=query]").wait(200).type("{selectAll}123");
    formFindSimple("div[data-test=gemeindeFilter] input").type("goo");
    cy.get("div[role=listbox]").contains("Goo").click();
    formFindSimple("div[data-test=gemeindeFilter] button").click();
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200);
    formFindSimple("div[data-test=beurteilungFilter] input").click();
    formFindSimple("div[data-test=beurteilungFilter] input").type("Belastet");
    cy.get("div[role=listbox]")
      .contains("keine schädlichen oder lästigen")
      .click();
    formFindSimple("div[data-test=beurteilungFilter] button").click();
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200);
    formFindSimple("div[data-test=publiziertFilter] span[role=checkbox]").click(
      { force: true },
    );
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200);
    formFindSimple("button[type=submit]").click();

    cy.get("div[data-test=toggleSearchType]").contains("Erweitert").click();
    cy.wait("@Search");
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(2000); // try reduce flake
    cy.get("div[data-test=toggleSearchType]").contains("Einfach").click();
    cy.wait("@Search");
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(2000); // try reduce flake

    formFindSimple("input[name=query]").should("exist");
    formFindSimple("input[name=query]").should("have.value", "123");
    formFindSimple("div[data-test=gemeindeFilter] input").should(
      "have.value",
      "Goo (0004)",
    );
    formFindSimple("div[data-test=beurteilungFilter] input").should(
      "have.value",
      "Belastet, keine schädlichen oder lästigen Einwirkungen zu erwarten",
    );
    formFindSimple(
      "div[data-test=publiziertFilter] span[role=checkbox]",
    ).should("have.attr", "data-checked");
  });

  it("performs simple search with all fields filled", () => {
    cy.visit("/search", visitOptions);
    cy.wait("@Search");

    // Fill out query field
    formFindSimple("input[name=query]").type("A1");

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(600); // wait for debounce

    // Fill out vftyp filter
    formFindSimple("div[data-test=vftypFilter] input").type("Ablagerung");
    cy.get("div[role=listbox]").should("be.visible");
    cy.get("div[role=listbox]").contains("Ablagerung").click();
    formFindSimple("div[data-test=vftypFilter] button").click();

    // Fill out gemeinde filter
    formFindSimple("div[data-test=gemeindeFilter] input").type("Foo");
    cy.get("div[role=listbox]").should("be.visible");
    cy.get("div[role=listbox]").contains("Foo").click();
    formFindSimple("div[data-test=gemeindeFilter] button").click();

    // Fill out beurteilung filter
    formFindSimple("div[data-test=beurteilungFilter] button").click();
    cy.get("div[role=listbox]").contains("unbelastet").click();
    formFindSimple("div[data-test=beurteilungFilter] button").click();

    // Submit the form
    formFindSimple("button[type=submit]").click();
    cy.wait("@Search");

    // Verify all URL parameters are set correctly
    cy.url().then((url) => {
      const urlParams = new URLSearchParams(new URL(url).search);
      expect(urlParams.get("q")).to.equal("A1");
      expect(urlParams.get("vftyp")).to.contain("code:");
      expect(urlParams.get("gemeinde")).to.equal("0001");
      expect(urlParams.get("beurteilung")).to.contain("code:");
    });

    // Verify search results table is displayed
    cy.get("table[data-test=searchResultsTable]").should("exist");
    cy.get("table[data-test=searchResultsTable]")
      .find("tbody")
      .find("tr")
      .should("have.length.greaterThan", 0);

    // Reset the search
    cy.get("button[data-test=resetSimpleSearchButton]").click();
    cy.wait("@Search");

    // Verify all URL parameters are removed
    cy.url().then((url) => {
      const urlParams = new URLSearchParams(new URL(url).search);
      expect([...urlParams.keys()].length).to.equal(0);
    });
  });

  it("changes search results columns on user selection", () => {
    cy.intercept<{ query: string }>("POST", "/graphql", (req) => {
      if (req.body.query.includes("query useCurrentUser")) {
        req.alias = "User";
        req.reply({
          data: {
            currentUser: {
              permissions: ["VIEW_VFL", "EDIT_SETTINGS"],
              settings: [],
            },
          },
        });
      }
    });

    cy.visit("/search");
    cy.wait("@Search");
    cy.get("table[data-test=searchResultsTable] thead").should(
      "not.contain",
      "Erfassung",
    );
    cy.get("button[data-test=columnSelector]").click();
    cy.get("[role=dialog] [data-test=SidebarDialog-panel]").should(
      "be.visible",
    );
    cy.get("div[role=dialog] form label").should("contain", "Bezeichnung");
    cy.get("div[role=dialog] input[name=fieldFilter]").type("erfa");
    cy.get("div[role=dialog] form label").should("not.contain", "Bezeichnung");
    cy.get("div[role=dialog] form label").should("contain", "Erfassung");
    cy.get("div[role=dialog] form label").contains("Erfassung").click();
    cy.get("div[role=dialog] button[type=submit]").click();
    cy.get("table[data-test=searchResultsTable] thead").should(
      "contain",
      "Erfassung",
    );
  });

  it("shows history and redirects from quick search to search and vflz page", () => {
    cy.updateUserSetting("lesen-sachdaten", "vflHistory", [1, 2, 3]);
    cy.intercept<{ query: string }>("POST", "/graphql", (req) => {
      if (req.body.query.includes("query quickSearch")) {
        req.alias = "QuickSearch";
      } else if (req.body.query.includes("query vflHistory")) {
        req.alias = "VflHistory";
      }
    });
    cy.visit("/search", {
      onBeforeLoad: (win) => {
        win.localStorage.clear();
      },
    });
    cy.wait("@Search");

    cy.get("[data-test=Layout-QuickSearch]").should("not.exist");
    cy.get("input[name=quickSearch]").click();
    cy.wait("@VflHistory");
    cy.get("div[data-test=Layout-QuickSearch][role=listbox] div[role=option] a")
      .should("have.length", 3)
      .each((option, index) => {
        expect(option).to.have.attr("href", `/vflz/${index + 1}`);
      });
    // Exact fixture names trigger direct-match navigation instead of the dropdown.
    cy.get("input[name=quickSearch]").type("Betriebs");
    cy.wait<
      { variables: { query: string } },
      { data: QuickSearchQuery; errors?: unknown[] }
    >("@QuickSearch").then(({ request, response }) => {
      expect(request.body.variables.query).to.equal("Betriebs");
      expect(response?.body.errors).to.equal(undefined);
      expect(response?.body.data.search.directMatch).to.equal(false);
      expect(
        response?.body.data.search.graph.results,
      ).to.have.length.greaterThan(0);
    });
    cy.get("div[data-test=Layout-QuickSearch][role=listbox] [role=option] a")
      .eq(0)
      .should("have.attr", "href", "/search?q=Betriebs");
    cy.get("input[name=quickSearch]").type("{enter}");
    cy.url().should("include", "/search?q=Betriebs");
    cy.get("[data-test=Layout-QuickSearch]").should("not.exist");
    cy.get("input[name=quickSearch]").type("Betriebs");
    cy.get("div[data-test=Layout-QuickSearch][role=listbox] div[role=option]")
      .eq(1)
      .click();
    cy.url().should("include", "/vflz/");
    cy.get("[data-test=Layout-QuickSearch]").should("not.exist");
  });

  it("creates a saved search which is shared with other users", () => {
    cy.visit("/search/advanced", {
      onBeforeLoad: (win) => {
        win.localStorage.clear();
      },
    });
    // create a saved search
    const name = Math.random().toString(36).substring(2, 6);
    cy.wait("@Search");
    cy.get("button[data-test=search-savedSearchDialog]").click();
    cy.get(
      "form[data-test=search-savedSearchDialog] input[name=name][type=text]",
    ).type(name);
    cy.get("[data-test=search-savedSearchDialog-isShared] label").click();
    cy.get(
      "form[data-test=search-savedSearchDialog] button[type=submit]",
    ).click();

    // check saved search is created
    cy.get("button[data-test=search-savedSearchSidebar]").click();
    cy.get("ul[data-test=search-savedSearchSidebar-list]").should(
      "contain",
      name,
    );

    cy.setUser("lesen-geschaefte");
    cy.visit("/search/advanced");
    cy.wait("@Search");
    cy.get("button[data-test=search-savedSearchSidebar]").click();
    cy.get("ul[data-test=search-savedSearchSidebar-list]").should(
      "contain",
      name,
    );
  });
});
