describe("Vflz Workflow Page", () => {
  beforeEach(() => {
    cy.intercept<{ query: string }>("POST", "/graphql", (req) => {
      if (req.body.query.includes("query VflzWorkflowLayout")) {
        req.alias = "VflzWorkflowLayout";
      } else if (req.body.query.includes("query startTaskDialogProzesse")) {
        req.alias = "StartTaskDialogProzesse";
      } else if (req.body.query.includes("query VflzWorkflow")) {
        req.alias = "VflzWorkflow";
      } else if (req.body.query.includes("query task")) {
        req.alias = "Task";
      } else if (req.body.query.includes("mutation createStandortNotiz")) {
        req.alias = "createNotiz";
      } else if (req.body.query.includes("mutation createStandortDokument")) {
        req.alias = "createDokument";
      } else if (req.body.query.includes("mutation createStandortAufgabe")) {
        req.alias = "createAufgabe";
      } else if (req.body.query.includes("mutation deleteTask")) {
        req.alias = "deleteTask";
      } else if (
        req.body.query.includes("mutation startStandortFolgeschritt")
      ) {
        req.alias = "startStandortFolgeschritt";
      } else if (req.body.query.includes("mutation startStandortProzess")) {
        req.alias = "startProzess";
      } else if (req.body.query.includes("mutation updateDokument")) {
        req.alias = "updateDokument";
      } else if (req.body.query.includes("mutation updateFormular")) {
        req.alias = "updateFormular";
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

  it("hides menu item for missing permission", () => {
    cy.setUser("lesen-sachdaten");
    cy.visit("/vflz/1");
    cy.get(
      "header[data-test=VflzLayout-header] nav a[href='/vflz/1#content']",
    ).should("exist");
    cy.get(
      "header[data-test=VflzLayout-header] nav a[href='/vflz/1/workflow#filter']",
    ).should("not.exist");
  });

  it("shows read-only tasks for read permission", () => {
    cy.setUser("lesen-geschaefte");
    cy.updateUserSetting("lesen-geschaefte", "workflow.filter", "");
    cy.visit("/vflz/1/workflow");
    cy.get(
      "header[data-test=VflzLayout-header] nav a[href='/vflz/1/workflow#filter']",
    ).should("exist");
    cy.get("div[data-test^=Workflow-item]").should("exist");
    cy.get("form[data-test=Workflow-taskForm]")
      .find("button,fieldset,input,textarea")
      .should("be.disabled");
    cy.get("button[data-test=Workflow-startProzess]").should("not.exist");
    cy.get("form[data-test=Workflow-taskForm] button[type=submit]").should(
      "not.exist",
    );
  });

  it("should allow setting start and end to same date", () => {
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;

    cy.setUser("bearbeiten-geschaefte");
    cy.updateUserSetting("bearbeiten-geschaefte", "workflow.filter", "");
    cy.createVflz({ bezeichnung: "Workflow date validation" }).then(
      (vflzId) => {
        cy.visit(`/vflz/${vflzId}/workflow`);
        cy.wait(["@VflzWorkflowLayout", "@VflzWorkflow"]);
        cy.get("button[data-test=StartTaskDialog-toggle]").click({
          force: true,
        });
        cy.get("button[data-test=Workflow-createAUFGABE]").click();
        cy.wait(["@createAufgabe", "@Task"]);
        cy.get("input[name=startDatum]").type(
          `{selectAll}${day}.${month}.2025`,
        );
        cy.get("input[name=endDatum]").type(`{selectAll}${day}.${month}.2025`);
        cy.get("form[data-test=Workflow-taskForm] button[type='submit']").click(
          {
            force: true,
          },
        );
        cy.get("div[data-test=Workflow-item-AUFGABE]").contains(
          `Ende: ${day.toString().padStart(2, "0")}.${month.toString().padStart(2, "0")}.2025`,
        );
      },
    );
  });

  it("can create and delete Notiz, Dokument, Aufgabe and start Prozess with max_per_entity only once", () => {
    cy.setUser("bearbeiten-geschaefte");
    cy.updateUserSetting("bearbeiten-geschaefte", "workflow.filter", "");
    cy.createVflz({ bezeichnung: "Workflow Test" }).then((vflzId) => {
      const visibleDialog = () =>
        cy.get('[data-dialog="dialog-body"]:visible').last();
      const visibleMenu = () => cy.get("div[role=menu]:visible").last();
      const selectDialogOption = (label: string) => {
        cy.get("[role=option]:visible").should("exist");
        cy.contains("[role=option]:visible", label).click();
      };
      const clickActionMenuItem = (dataTest: string) => {
        cy.get("[data-test=ActionMenu] button[aria-haspopup=menu]").click({
          force: true,
        });
        visibleMenu().find(`button[data-test=${dataTest}]`).click({
          force: true,
        });
      };
      const confirmDeleteTask = () => {
        visibleDialog().contains("button", "Löschen").click();
        cy.wait("@deleteTask");
        cy.wait("@VflzWorkflow");
      };
      const revisitWorkflow = () => {
        cy.visit(`/vflz/${vflzId}/workflow`);
        cy.wait("@VflzWorkflowLayout");
        cy.wait("@VflzWorkflow");
      };

      cy.visit(`/vflz/${vflzId}/workflow`);
      cy.wait("@VflzWorkflowLayout");
      cy.wait("@VflzWorkflow");

      ["Notiz", "Dokument", "Aufgabe"].forEach((type) => {
        cy.get("button[data-test=StartTaskDialog-toggle]").click({
          force: true,
        });
        cy.get(
          `button[data-test=Workflow-create${type.toUpperCase()}]`,
        ).click();
        cy.wait(`@create${type}`);
        cy.wait("@Task");
        cy.get("div[data-test^=Workflow-item]").contains(type);
        cy.get("div[data-test=Workflow-taskTitle]").contains(type);
        clickActionMenuItem("WorkflowActionMenu-deleteTask");
        confirmDeleteTask();
      });

      cy.get("button[data-test=StartTaskDialog-toggle]").click({
        force: true,
      });
      cy.wait("@StartTaskDialogProzesse");
      visibleDialog().find("[data-test=Workflow-select-button]").click();
      selectDialogOption("Erstbeurteilung");
      visibleDialog().find("[data-test=Workflow-startProzess]").click();
      cy.wait(["@VflzWorkflow", "@startProzess", "@Task"]);
      cy.get("button[data-test=StartTaskDialog-toggle]").click({
        force: true,
      });
      visibleDialog().find("[data-test=Workflow-select-button]").click();
      cy.get("div[role=listbox]:visible")
        .last()
        .contains("[role=option]", "Erstbeurteilung")
        .should("not.exist");
      cy.get("body").type("{Esc}"); // close listbox
      cy.get("body").type("{Esc}"); // close dialog
      cy.get("div[data-test^=Workflow-item]").contains(
        "Erstbeurteilung Inhaberorientierung",
      );
      cy.get("div[data-test=Workflow-taskTitle]").contains(
        "Erstbeurteilung Inhaberorientierung",
      );

      // create Notiz, Dokument, Aufgabe for prozess "Erstbeurteilung"
      ["Notiz", "Dokument", "Aufgabe"].forEach((type) => {
        cy.get("div[data-test^=Workflow-item]")
          .contains("Erstbeurteilung")
          .click({ force: true });
        cy.get("[data-test=ActionMenu] button[aria-haspopup=menu]").click({
          force: true,
        });
        cy.get("button[data-test=WorkflowActionMenu-startTask]").click();
        cy.get(`button[data-test=Workflow-create${type.toUpperCase()}]`)
          .last()
          .click({ force: true });
        cy.wait([`@create${type}`, "@VflzWorkflow"]);
        cy.get("div[data-test^=Workflow-item]").contains(type);
        cy.get("div[data-test=Workflow-taskTitle]").contains(type);
        clickActionMenuItem("WorkflowActionMenu-deleteTask");
        confirmDeleteTask();
        cy.get("div[data-test^=Workflow-item]")
          .contains(type)
          .should("not.exist");
        cy.get("div[data-test=Workflow-taskTitle]")
          .contains(type)
          .should("not.exist");
      });

      // start next task in Prozess
      clickActionMenuItem("WorkflowActionMenu-startTask");
      visibleDialog().find("[data-test=Workflow-startProzess]").click();
      cy.wait("@startStandortFolgeschritt");
      cy.wait(["@VflzWorkflow", "@Task"]);
      cy.get("div[data-test^=Workflow-item]").contains(
        "Erstbeurteilung Erhebungsdokumente",
      );
      cy.get("div[data-test=Workflow-taskTitle]").contains(
        "Erstbeurteilung Erhebungsdokumente",
      );

      // start next task in Prozess
      clickActionMenuItem("WorkflowActionMenu-startTask");
      visibleDialog().find("[data-test=Workflow-startProzess]").click();
      cy.wait("@startStandortFolgeschritt");
      cy.wait(["@VflzWorkflow", "@Task"]);
      cy.get("div[data-test^=Workflow-item]").contains("Erhebungsdokumente");
      cy.get("div[data-test=Workflow-taskTitle]").contains(
        "Erhebungsdokumente",
      );

      // upload file for Dokument task to continue workflow
      cy.get("input[type=file]").selectFile("public/favicon-32x32.png", {
        force: true,
      });
      cy.get("[data-test=ActionMenu] button[type=submit]").click();

      cy.wait(["@updateDokument", "@Task", "@VflzWorkflow"]);

      // start next task in Prozess
      clickActionMenuItem("WorkflowActionMenu-startTask");
      visibleDialog().find("[data-test=Workflow-select-button]").click();
      selectDialogOption("Erhebungsdokumente vollständig erfasst?");
      visibleDialog().find("[data-test=Workflow-startProzess]").click();
      cy.wait(["@startStandortFolgeschritt", "@VflzWorkflow", "@Task"]);
      cy.get("div[data-test^=Workflow-item]").contains(
        "Erhebungsdokumente vollständig erfasst?",
      );
      cy.get("div[data-test=Workflow-taskTitle]").contains(
        "Erhebungsdokumente vollständig erfasst?",
      );

      // update field for Form task to continue workflow
      cy.get("form[data-test=Workflow-taskForm] span[role=checkbox]").click();
      cy.get("[data-test=ActionMenu] button[type=submit]").click();
      cy.wait(["@Task", "@VflzWorkflow"]);

      // start next task in Prozess
      clickActionMenuItem("WorkflowActionMenu-startTask");
      visibleDialog().find("[data-test=Workflow-select-button]").click();
      selectDialogOption("Kontrolle Standortsdaten und Beurteilung");
      visibleDialog().find("[data-test=Workflow-startProzess]").click();
      cy.wait(["@startStandortFolgeschritt", "@VflzWorkflow", "@Task"]);
      cy.get("div[data-test^=Workflow-item]").contains(
        "Kontrolle Standortsdaten und Beurteilung",
      );
      cy.get("div[data-test=Workflow-taskTitle]").contains(
        "Kontrolle Standortsdaten und Beurteilung",
      );

      // delete current task
      clickActionMenuItem("WorkflowActionMenu-deleteTask");
      confirmDeleteTask();
      cy.get("div[data-test^=Workflow-item]")
        .contains("Kontrolle Standortsdaten und Beurteilung")
        .should("not.exist");
      cy.get("div[data-test^=Workflow-item]").first().click();
      cy.get("div[data-test=Workflow-taskTitle]")
        .contains("Kontrolle Standortsdaten und Beurteilung")
        .should("not.exist");

      // delete current task
      cy.get("div[data-test^=Workflow-item]")
        .contains("Erhebungsdokumente vollständig erfasst?")
        .click();
      cy.get("div[data-test=Workflow-taskTitle]").contains(
        "Erhebungsdokumente vollständig erfasst?",
      );
      clickActionMenuItem("WorkflowActionMenu-deleteTask");
      confirmDeleteTask();

      // delete current task
      cy.get("div[data-test=Workflow-item-DOKUMENT]")
        .contains("Erhebungsdokumente")
        .click();
      cy.wait("@Task");
      cy.get("form[data-test=Workflow-taskForm]").contains("favicon-32x32.png");
      clickActionMenuItem("WorkflowActionMenu-deleteTask");
      confirmDeleteTask();

      revisitWorkflow();

      // delete current task
      cy.get("div[data-test=Workflow-item-AUFGABE]")
        .contains("Erstbeurteilung Erhebungsdokumente")
        .click();
      cy.get("div[data-test=Workflow-taskTitle]").contains(
        "Erstbeurteilung Erhebungsdokumente",
      );
      clickActionMenuItem("WorkflowActionMenu-deleteTask");
      visibleDialog().should("exist");
      confirmDeleteTask();

      // delete last task in Prozess, workflow list should be empty now
      cy.get("div[data-test=Workflow-item-PROZESS]")
        .contains("Erstbeurteilung Inhaberorientierung")
        .click();
      cy.get("div[data-test=Workflow-taskTitle]").contains(
        "Erstbeurteilung Inhaberorientierung",
      );
      clickActionMenuItem("WorkflowActionMenu-deleteTask");
      confirmDeleteTask();
      revisitWorkflow();
      cy.get("div[data-test^=Workflow-item]").should("not.exist");
      cy.get("div[data-test=Workflow-taskTitle]").should("not.exist");
    });
  });

  it("calls workflow trigger and creates events", () => {
    const visibleDialog = () =>
      cy.get('[data-dialog="dialog-body"]:visible').should("have.length", 1);
    const selectWorkflowOption = (label: string) => {
      visibleDialog().find("[data-test=Workflow-select-button]").click();
      cy.get("[role=listbox]:visible").contains("[role=option]", label).click();
      visibleDialog().find("[data-test=Workflow-startProzess]").click();
    };

    cy.setUser("bearbeiten-geschaefte");
    cy.updateUserSetting("bearbeiten-geschaefte", "workflow.filter", "");
    cy.createVflz({ bezeichnung: "Workflow Test" }).then((vflzId) => {
      cy.visit(`/vflz/${vflzId}/workflow`);
      cy.wait("@VflzWorkflowLayout");
      cy.wait("@VflzWorkflow");

      cy.get("button[data-test=StartTaskDialog-toggle]").click({
        force: true,
      });
      selectWorkflowOption("Test Events");
      cy.wait(["@startProzess", "@Task"]);
      cy.get('[data-dialog="dialog-body"]').should("not.exist");

      cy.get(
        "form[data-test=Workflow-taskForm] [data-test=ActionMenu] button[aria-haspopup=menu]",
      ).click();
      cy.get("[role=menu]:visible")
        .find("button[data-test=WorkflowActionMenu-startTask]")
        .click();
      selectWorkflowOption("Alle Events");
      cy.wait(["@startStandortFolgeschritt", "@Task"]);
      cy.get('[data-dialog="dialog-body"]').should("not.exist");

      cy.get("form[data-test=Workflow-taskForm] button[name=status]").click();
      cy.get("[role=listbox]:visible")
        .contains("[role=option]", "geschlossen")
        .click();

      cy.get(
        "form[data-test=Workflow-taskForm] [data-test=ActionMenu] button[type=submit]",
      ).click();

      const date = new Date().toLocaleDateString("de", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      [
        [
          `Der Standort wurde am ${date} historisiert.`,
          "/evaluation#beurteilung",
        ],
        [
          `Der Bearbeitungsstand wurde am ${date} auf «Erhebung in Bearbeitung» gesetzt.`,
          "/evaluation#beurteilung",
        ],
        [
          `Der Untersuchungsstand wurde am ${date} auf «keine Untersuchung» gesetzt.`,
          "/evaluation#beurteilung",
        ],
        [
          `Der Standort wurde am ${date} publiziert.`,
          "/evaluation#beurteilung",
        ],
        [
          `Das Geschäft «Standortänderungen publizieren» wurde am ${date} gestartet.`,
          "/workflow?",
        ],
      ].forEach(([content, path], index) => {
        cy.get("ul[data-test=Workflow-taskEvents] li a")
          .eq(index)
          .contains(content)
          .should("have.attr", "href")
          .and("contains", path);
      });
    });
  });

  it("updates Formular task with boolean field", () => {
    cy.resetFixture("taskFormular");
    cy.setUser("bearbeiten-geschaefte");
    cy.visit("/vflz/1/workflow?id=3");
    cy.wait("@Task");
    cy.get("form[data-test=Workflow-taskForm]").contains("Test B").click();
    cy.get("[data-test=ActionMenu] button[type=submit]").click();
    cy.wait<unknown, { data: { task: { __typename: string } } }>(
      "@updateFormular",
    ).should(({ response }) => {
      expect(response?.body.data.task.__typename).to.equal("Formular");
    });
  });
});
