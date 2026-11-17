import evaluation from "../../fixtures/vflz/evaluation.json";

function formFind(selector: string) {
  return cy.get("form[data-test=vflzEvaluationForm]").find(selector);
}

function formFindContains(selector: string, value: string) {
  formFind(selector).contains(value);
}

function formFindHasValue(selector: string, value: boolean | string) {
  formFind(selector).should("have.value", value);
}

function listboxSelect(selector: string, value: string) {
  formFind(selector).should("be.enabled");
  formFind(selector).click();
  cy.get("div[role=listbox]:visible").should("exist");
  cy.get("div[role=listbox]:visible div[role=option]").should("be.visible");
  cy.get("div[role=listbox]:visible div[role=option]").should(
    "have.length.above",
    1,
  );
  cy.get("div[role=listbox]:visible div[role=option]").contains(value).click();
}

describe("Vflz Evaluation Page", () => {
  let evaluationQueryAlias = "VflzEvaluation";

  beforeEach(() => {
    evaluationQueryAlias = "VflzEvaluation";
    cy.intercept<{ query: string }>("POST", "/graphql", (req) => {
      if (req.body.query.includes("mutation CypressCreateVflz")) {
        req.alias = "createVflz";
      } else if (req.body.query.includes("query VflzEvaluation")) {
        req.alias = evaluationQueryAlias;
      } else if (req.body.query.includes("mutation updateVflzEvaluation")) {
        req.alias = "updateVflzEvaluation";
      } else if (req.body.query.includes("query codeLists")) {
        req.alias = "queryCodeLists";
      }
    });

    let waitForResizeObserver = false;
    cy.on("uncaught:exception", (err) => {
      if (err.message.includes("ResizeObserver")) {
        waitForResizeObserver = true;
        return false;
      }
    });
    if (waitForResizeObserver) {
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500); // wait for ResizeObserver to settle
    }
  });

  it("reads values for Beurteilung", () => {
    cy.resetFixture("evaluation");
    cy.setUser("bearbeiten-sachdaten");

    cy.visit(`/vflz/1/evaluation`);
    cy.wait("@VflzEvaluation");

    /* READ values */

    cy.get("[data-test=VflzSummary-beurteilung]")
      .contains("unbelastet")
      .and("have.css", "border-color", "rgb(0, 255, 0)");

    /* Beurteilung */
    formFindContains("button[name='beurteilung.beurteilung']", "unbelastet");
    formFindContains(
      "span[data-test='rechtlicherBezug']",
      "Unbelasteter Standort: keine Belastungen festgestellt",
    );
    formFindContains(
      "span[data-test='handlungsbedarf']",
      "Kein weiterer Handlungsbedarf",
    );
    formFindHasValue(
      "textarea[name='begruendungBewertung.bem']",
      evaluation.begruendungBewertung.bem,
    );
    formFindContains(
      "button[name='bearbeitungsStand']",
      "Definitiver Katastereintrag rechtskräftig",
    );
    formFindContains("button[name='untersuchungsStand']", "Überwachung läuft");
    cy.get("div[data-test='rechtskraft'] span[role='checkbox']").should(
      "not.have.attr",
      "data-checked",
    );
    cy.get("div[data-test='publizieren'] span[role='checkbox']").should(
      "not.have.attr",
      "data-checked",
    );
    formFindHasValue("input[name='datRechtskraft']", "");
    formFindHasValue("input[name='datPublizieren']", "");

    /* Priorisierung Untersuchungsbedarf */
    formFindContains("button[name='beurteilung.prioUntersuch']", "2026");
    formFindHasValue(
      "textarea[name='begruendungPrioUntersuchungsbedarf.bem']",
      "Begründung Untersuchung",
    );

    /* Ziele und Dringlichkeit der Überwachung/Sanierung */
    formFindContains(
      "button[name='sanierungsziele.0.sanierungsziel']",
      "Teildekontamination",
    );
    formFindHasValue(
      "textarea[name='sanierungsziele.0.bemerkung.bem']",
      evaluation.sanierungsziele[0].bemerkung.bem,
    );
    formFindContains("button[name='beurteilung.prioSanier']", "2032");
    formFindHasValue(
      "textarea[name='begruendungPrioSanierungsbedarf.bem']",
      evaluation.begruendungPrioSanierungsbedarf.bem,
    );

    /* Durchgeführte oder angeordnete Massnahmen */
    formFindContains("button[name='massnahmen.0.massnahme']", "Entwässerung");
    formFindHasValue("input[name='massnahmen.0.angMassnahme']", "29.09.2024");
    formFindHasValue("input[name='massnahmen.0.datMassnahme']", "31.10.2024");
    formFindHasValue(
      "textarea[name='massnahmen.0.bemerkung.bem']",
      evaluation.massnahmen[0].bemerkung.bem,
    );
  });

  it("updates values for Beurteilung", () => {
    cy.setUser("bearbeiten-sachdaten");
    cy.createVflz({ bezeichnung: "Beurteilung Test" }).then((vflzId) => {
      cy.visit(`/vflz/${vflzId}/evaluation`);
      cy.wait("@VflzEvaluation");

      /* UPDATE values */

      formFind("button[data-test=lockButton]").click();
      const random = Math.random().toString(36).substring(2, 6);
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500); // wait for codelistboxes

      /* Beurteilung */
      listboxSelect(
        "button[name='beurteilung.beurteilung']",
        "Belastet, weder überwachungs- noch sanierungsbedürftig",
      );
      formFind("textarea[name='begruendungBewertung.bem']").type(
        "Begründung Bewertung",
      );
      formFind("button[type=submit]").click();
      cy.wait(["@updateVflzEvaluation"]);
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(300); // wait for codelistboxes to be updated

      listboxSelect(
        "button[name='bearbeitungsStand']",
        "Erhebung in Bearbeitung",
      );
      listboxSelect(
        "button[name=untersuchungsStand]",
        "Historische Untersuchung in Bearbeitung",
      );
      formFind("div[data-test=rechtskraft]").click();
      formFind("input[name=datRechtskraft]").type("{selectAll}28.09.2022");
      formFind("div[data-test=publizieren] span[role=checkbox]").click();
      formFind("input[name=datPublizieren]").type("{selectAll}01.10.2024");

      /* Priorisierung Untersuchungsbedarf */
      listboxSelect("button[name='beurteilung.prioUntersuch']", "2022");
      formFind("textarea[name='begruendungPrioUntersuchungsbedarf.bem']").type(
        "Begründung Untersuchung",
      );

      /* Sanierungsziele */
      formFind("button").contains("Sanierungsziel hinzufügen").click();
      listboxSelect(
        "button[name='sanierungsziele.0.sanierungsziel']",
        "Einschränkung der Nutzung",
      );
      formFind("textarea[name='sanierungsziele.0.bemerkung.bem']").type(
        "Bemerkung Sanierungsziel",
      );
      listboxSelect("button[name='beurteilung.prioSanier']", "2034");
      formFind("textarea[name='begruendungPrioSanierungsbedarf.bem']").type(
        "Begründung Sanierung",
      );

      /* Durchgeführte oder angeordnete Massnahmen */
      formFind("button").contains("Massnahme hinzufügen").click();
      listboxSelect(
        "button[name='massnahmen.0.massnahme']",
        "Oberflächenabdeckung",
      );
      formFind("input[name='massnahmen.0.angMassnahme']").type(
        "{selectAll}03.04.2022",
      );
      formFind("input[name='massnahmen.0.datMassnahme']").type(
        "{selectAll}01.11.2024",
      );
      formFind("textarea[name='massnahmen.0.bemerkung.bem']").type(
        "Bemerkung Massnahme",
      );
      formFind(
        "fieldset[aria-labelledby=massnahmen] button[data-test=FieldArrayAddButton]",
      ).click();
      formFind(
        "fieldset[aria-labelledby=massnahmen] div.group button[data-test=FieldArray-remove]",
      )
        .last()
        .click();

      formFind("button[type=submit]").click();
      cy.wait(["@updateVflzEvaluation"]);

      /* CHECK updated values */

      cy.get("[data-test=VflzSummary-beurteilung]")
        .contains("Belastet, weder überwachungs- noch sanierungsbedürftig")
        .and("have.css", "border-color", "rgb(255, 255, 0)");

      /* Beurteilung */
      formFindContains(
        "button[name='beurteilung.beurteilung']",
        "Belastet, weder überwachungs- noch sanierungsbedürftig",
      );
      formFindContains(
        "span[data-test='rechtlicherBezug']",
        "Belasteter Standort: aufgrund der Resultate der Voruntersuchung",
      );
      formFindContains(
        "span[data-test='handlungsbedarf']",
        "Kein aktueller Handlungsbedarf. Bei Bauvorhaben: Beachtung von Art. 3",
      );
      formFindHasValue(
        "textarea[name='begruendungBewertung.bem']",
        "Begründung Bewertung",
      );
      formFindContains(
        "button[name='bearbeitungsStand']",
        "Erhebung in Bearbeitung",
      );
      formFindContains(
        "button[name='untersuchungsStand']",
        "Historische Untersuchung in Bearbeitung",
      );
      cy.get("div[data-test='rechtskraft'] span[role='checkbox']").should(
        "have.attr",
        "data-checked",
      );
      cy.get("div[data-test='publizieren'] span[role='checkbox']").should(
        "have.attr",
        "data-checked",
      );
      formFindHasValue("input[name='datRechtskraft']", "28.09.2022");
      formFindHasValue("input[name='datPublizieren']", "01.10.2024");

      /* Priorisierung Untersuchungsbedarf */
      formFindContains("button[name='beurteilung.prioUntersuch']", "2022");
      formFindHasValue(
        "textarea[name='begruendungPrioUntersuchungsbedarf.bem']",
        "Begründung Untersuchung",
      );

      /* Ziele und Dringlichkeit der Überwachung/Sanierung */
      formFindContains(
        "button[name='sanierungsziele.0.sanierungsziel']",
        "Einschränkung der Nutzung",
      );
      formFindHasValue(
        "textarea[name='sanierungsziele.0.bemerkung.bem']",
        "Bemerkung Sanierungsziel",
      );
      formFindContains("button[name='beurteilung.prioSanier']", "2034");
      formFindHasValue(
        "textarea[name='begruendungPrioSanierungsbedarf.bem']",
        "Begründung Sanierung",
      );

      /* Durchgeführte oder angeordnete Massnahmen */
      formFindContains(
        "button[name='massnahmen.0.massnahme']",
        "Oberflächenabdeckung",
      );
      formFindHasValue("input[name='massnahmen.0.angMassnahme']", "03.04.2022");
      formFindHasValue("input[name='massnahmen.0.datMassnahme']", "01.11.2024");
      formFindHasValue(
        "textarea[name='massnahmen.0.bemerkung.bem']",
        "Bemerkung Massnahme",
      );

      cy.get("button[name='massnahmen.1.massnahme']").should("not.exist");

      /* Add, update and remove Sanierungsziele */
      cy.get("form[data-test=vflzEvaluationForm]")
        .find("fieldset[aria-labelledby=sanierungsziel] div.group")
        .then((elements) => {
          expect(elements.length).to.eq(1);
        });

      formFind(
        "fieldset[aria-labelledby=sanierungsziel] button[data-test=FieldArrayAddButton]",
      ).click();

      cy.get("form[data-test=vflzEvaluationForm]")
        .find("fieldset[aria-labelledby=sanierungsziel] div.group")
        .then((elements) => {
          expect(elements.length).to.eq(2);
        });

      listboxSelect(
        "button[name='sanierungsziele.1.sanierungsziel']",
        "Andere",
      );
      formFind("textarea[name='sanierungsziele.1.bemerkung.bem']").type(
        `Andere${random}`,
      );

      formFind("fieldset[aria-labelledby=sanierungsziel] div.group h3")
        .last()
        .contains("Andere");
      formFindContains(
        "button[name='sanierungsziele.1.sanierungsziel']",
        "Andere",
      );
      formFindHasValue(
        "textarea[name='sanierungsziele.1.bemerkung.bem']",
        `Andere${random}`,
      );

      formFind(
        "fieldset[aria-labelledby=sanierungsziel] div.group button[data-test=FieldArray-remove]",
      )
        .last()
        .click();

      cy.get("form[data-test=vflzEvaluationForm]")
        .find("fieldset[aria-labelledby=sanierungsziel] div.group")
        .then((elements) => {
          expect(elements.length).to.eq(1);
        });

      /* Add, update and remove Massnahmen */
      cy.get("form[data-test=vflzEvaluationForm]")
        .find("fieldset[aria-labelledby=massnahmen] div.group")
        .then((elements) => {
          expect(elements.length).to.eq(1);
        });

      formFind(
        "fieldset[aria-labelledby=massnahmen] button[data-test=FieldArrayAddButton]",
      ).click();
      cy.wait("@queryCodeLists");
      cy.get("form[data-test=vflzEvaluationForm]")
        .find("fieldset[aria-labelledby=massnahmen] div.group")
        .then((elements) => {
          expect(elements.length).to.eq(2);
        });

      listboxSelect(
        "button[name='massnahmen.1.massnahme']",
        "Einbau Basisabdichtung",
      );
      formFind("textarea[name='massnahmen.1.bemerkung.bem']").type(
        `Neue${random}`,
      );

      formFind("fieldset[aria-labelledby=massnahmen] div.group h3")
        .last()
        .contains("Einbau Basisabdichtung");
      formFindContains(
        "button[name='massnahmen.1.massnahme']",
        "Einbau Basisabdichtung",
      );
      formFindHasValue(
        "textarea[name='massnahmen.1.bemerkung.bem']",
        `Neue${random}`,
      );

      formFind(
        "fieldset[aria-labelledby=massnahmen] div.group button[data-test=FieldArray-remove]",
      )
        .last()
        .click();

      cy.get("form[data-test=vflzEvaluationForm]")
        .find("fieldset[aria-labelledby=massnahmen] div.group")
        .then((elements) => {
          expect(elements.length).to.eq(1);
        });

      /* shows dialog if form has unsaved changes (form is dirty) */
      cy.then(() => {
        evaluationQueryAlias = "ReloadVflzEvaluation";
      });
      cy.reload();
      cy.wait("@ReloadVflzEvaluation")
        .its("response.body.data.vflz.begruendungBewertung.bem")
        .should("equal", "Begründung Bewertung");
      formFind("textarea[name='begruendungBewertung.bem']").should(
        "have.value",
        "Begründung Bewertung",
      );
      formFind("button[type=submit]").should("be.disabled");
      formFind("textarea[name='begruendungBewertung.bem']").type("something");
      formFind("textarea[name='begruendungBewertung.bem']").should(
        "have.value",
        "Begründung Bewertungsomething",
      );
      formFind("button[type=submit]").should("not.be.disabled");

      cy.on("uncaught:exception", (error) => {
        expect(error.message).to.include("cancelRouteChange");
        return false;
      });

      // cancel navigation
      cy.url().then((url) => {
        formFind("textarea[name='begruendungBewertung.bem']").type(
          "testchanges",
        );
        cy.get("header nav a[href='/']").click();
        cy.get("[data-test=DirtyFieldsDialog]").should("exist");
        cy.get("body").type("{Esc}"); // close dialog
        cy.get("[data-test=DirtyFieldsDialog]").should("not.exist");
        cy.url().should("contain", url.split("#")[0]);
      });

      // discard changes
      formFind("textarea[name='begruendungBewertung.bem']").type("something");
      formFind("button[type=submit]").should("not.be.disabled");
      cy.get("header nav a[href='/']").click();
      cy.get("[data-test=DirtyFieldsDialog]").should("exist");
      cy.get("button[data-test=DirtyFieldsDialog-discard]").click();
      cy.get("[data-test=DirtyFieldsDialog]").should("not.exist");
      cy.url().should("eq", `${Cypress.config().baseUrl}/`);
    });
  });

  it("renders disabled form for viewVfl permission", () => {
    cy.setUser("lesen-sachdaten");
    cy.visit("/vflz/1/evaluation");
    cy.wait("@VflzEvaluation");
    formFind("button[type=submit],fieldset,input:not([hidden]),textarea").each(
      (element) => {
        cy.wrap(element).should("have.attr", "disabled");
      },
    );
  });
});
