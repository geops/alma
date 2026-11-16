import { gql, GraphQLClient } from "graphql-request";

describe("Workflow page", () => {
  beforeEach(() => {
    cy.on("uncaught:exception", (err) => {
      if (err.message.includes("ResizeObserver")) {
        return false;
      }
    });
  });

  it("hides menu item for missing permission", () => {
    cy.setUser("lesen-sachdaten");
    cy.visit("/");
    cy.get("header nav a[href='/']").should("exist");
    cy.get("header nav a[href='/workflow']").should("not.exist");
  });

  it("shows read-only tasks", () => {
    cy.setUser("lesen-geschaefte");
    cy.visit("/workflow");
    cy.get("header nav a[href='/workflow']").should("exist");
    cy.get("div[data-test^=Workflow-item]").should("exist");
    cy.get("form[data-test=Workflow-taskForm]")
      .find("button,fieldset,input,textarea")
      .should("be.disabled");
    cy.get("form[data-test=Workflow-taskForm] button[type=submit]").should(
      "not.exist",
    );
  });

  it("shows editable tasks", () => {
    cy.setUser("bearbeiten-geschaefte");
    cy.visit("/workflow");
    cy.get("div[data-test^=Workflow-item]").should("exist");
    cy.get("form[data-test=Workflow-taskForm]")
      .find("button,fieldset,input,textarea")
      .should("be.enabled");
    cy.get("form[data-test=Workflow-taskForm] button[type=submit]").should(
      "exist",
    );
  });

  it("filters tasks by status, type, due date, and title", () => {
    cy.setUser("bearbeiten-geschaefte");
    cy.updateUserSetting("bearbeiten-geschaefte", "workflow.filter", "");
    cy.visit("/workflow");

    cy.get("#filter input[name=status]").type("{selectall}Offen{enter}{esc}");
    cy.get("#filter input[name=taskTyp]").type(
      "{selectall}Aufgabe{enter}{esc}",
    );
    cy.get("#filter input[name=faelligkeit]").type(
      "{selectall}überfällig{enter}{esc}",
    );
    cy.get("#filter input[name=titel]").type("{selectall}Test");
    cy.get("#filter button[type=submit]").click();

    cy.get("div[data-test^=Workflow-item]").should("have.length", 1);
    cy.get("div[data-test=Workflow-item-AUFGABE]").contains("Test Task");
  });

  it("supports pool-wise and standort-wise next-task creation for Erstbeurteilung", () => {
    const createPoolMutation = gql`
      mutation e2eCreatePool($data: CreatePoolInput!) {
        createPool(data: $data) {
          __typename
          ... on Pool {
            poolId
          }
        }
      }
    `;
    const queryVfl = gql`
      query e2eVflzForPool($vflzId: ID!) {
        vflz(vflzId: $vflzId) {
          vflId
        }
      }
    `;
    const addToPoolMutation = gql`
      mutation e2eAddToPool($poolId: ID!, $vflId: ID!) {
        addToPool(poolId: $poolId, vflId: $vflId) {
          poolId
        }
      }
    `;

    const visibleDialog = () => {
      return cy
        .get('[data-dialog="dialog-body"]:visible', { timeout: 20000 })
        .last();
    };
    const assertDialogIsVisible = () => {
      cy.get("body", { timeout: 20000 }).should(($body) => {
        expect(
          $body.find('[data-dialog="dialog-body"]:visible').length,
          "visible start task dialog",
        ).to.be.greaterThan(0);
      });
      return visibleDialog();
    };
    const openGlobalStartDialog = () => {
      cy.get("button[data-test=StartTaskDialog-toggle]", {
        timeout: 20000,
      })
        .should("exist")
        .click({ force: true });
      assertDialogIsVisible();
    };
    const selectErstbeurteilungOption = () => {
      assertDialogIsVisible()
        .find("[data-test=Workflow-select-button]")
        .click({ force: true });
      cy.get("div[role=listbox]:visible")
        .last()
        .contains("[role=option]", "Erstbeurteilung")
        .click({ force: true });
    };
    const goToPoolTarget = (poolName: string) => {
      assertDialogIsVisible()
        .find("button[data-test=Workflow-targetPool]")
        .click({ force: true });
      assertDialogIsVisible()
        .find("input[data-test=Workflow-poolSearchInput]")
        .first()
        .should("exist")
        .click({ force: true });
      assertDialogIsVisible()
        .find("input[data-test=Workflow-poolSearchInput]")
        .first()
        .clear({ force: true });
      assertDialogIsVisible()
        .find("input[data-test=Workflow-poolSearchInput]")
        .first()
        .type(poolName, { force: true });
      cy.contains("[role=option]:visible", poolName)
        .should("be.visible")
        .should("exist")
        .click({ force: true });
      visibleDialog()
        .find("button[data-test=Workflow-selectedPool]")
        .should("exist");
    };
    const openFloatingStartTaskDialog = () => {
      const openMenuAndStartTask = () => {
        cy.get("form[data-test=Workflow-taskForm]", {
          timeout: 20000,
        }).should("exist");
        cy.get(
          "form[data-test=Workflow-taskForm] [data-test=ActionMenu] button[aria-haspopup=menu]",
          {
            timeout: 20000,
          },
        )
          .first()
          .should("exist");
        cy.get(
          "form[data-test=Workflow-taskForm] [data-test=ActionMenu] button[aria-haspopup=menu]",
          {
            timeout: 20000,
          },
        )
          .first()
          .click({ force: true });

        cy.get("div[role=menu]:visible", { timeout: 20000 })
          .should("have.length.at.least", 1)
          .last();

        cy.get("div[role=menu]:visible", { timeout: 20000 })
          .last()
          .find("button[data-test=WorkflowActionMenu-startTask]")
          .should("be.visible")
          .and("not.be.disabled")
          .click({ force: true });
      };

      openMenuAndStartTask();
      assertDialogIsVisible();
    };
    const clickCreateInTargetStep = () => {
      visibleDialog()
        .find("button[data-test=Workflow-createTask]")
        .click({ force: true });
    };
    const closeVisibleDialogIfOpen = () => {
      cy.get("body").then(($body) => {
        if ($body.find('[data-dialog="dialog-body"]:visible').length > 0) {
          cy.get("body").type("{esc}");
          cy.get("body").type("{esc}");
          cy.get('[data-dialog="dialog-body"]:visible', {
            timeout: 20000,
          }).should("have.length", 0);
        }
      });
    };
    const workflowItems = () =>
      cy.get("div[data-test^=Workflow-item]", { timeout: 20000 });
    const assertPoolCountsAndOpenInvalid = (valid: number, invalid: number) => {
      cy.wait("@taskTargetPoolFolgeschrittValid").then(({ response }) => {
        const body = response?.body as
          | {
              data?: {
                validatePoolFolgeschritt?: {
                  invalidStandorte?: { numResultsTotal?: number };
                  validStandorte?: { numResultsTotal?: number };
                };
              };
            }
          | undefined;
        const result = body?.data?.validatePoolFolgeschritt;
        expect(result?.validStandorte?.numResultsTotal).to.equal(valid);
        expect(result?.invalidStandorte?.numResultsTotal).to.equal(invalid);
      });

      if (invalid > 0) {
        visibleDialog().find(".bg-gray-2 button").eq(1).click({ force: true });
      }
    };

    const standortPrefix = `Pool-Workflow-${Date.now()}`;
    const firstStandortBezeichnung = `${standortPrefix}-1`;
    const poolName = `Pool Test ${standortPrefix}`;
    const createdVflz: { bezeichnung: string; vflzId: string }[] = [];
    let createdPoolId = "";

    cy.intercept<{ query: string }>("POST", "/graphql", (req) => {
      if (req.body.query.includes("query GlobalWorkflow")) {
        req.alias = "GlobalWorkflow";
      } else if (req.body.query.includes("query startTaskDialogProzesse")) {
        req.alias = "StartTaskDialogProzesse";
      } else if (req.body.query.includes("query taskTargetPoolSearch")) {
        req.alias = "taskTargetPoolSearch";
      } else if (
        req.body.query.includes("query taskTargetPoolFolgeschrittValid")
      ) {
        req.alias = "taskTargetPoolFolgeschrittValid";
      } else if (
        req.body.query.includes("query taskTargetPoolFolgeschrittInvalid")
      ) {
        req.alias = "taskTargetPoolFolgeschrittInvalid";
      } else if (req.body.query.includes("mutation startPoolProzess")) {
        req.alias = "startPoolProzess";
      } else if (req.body.query.includes("mutation startPoolFolgeschritt")) {
        req.alias = "startPoolFolgeschritt";
      } else if (
        req.body.query.includes("mutation startStandortFolgeschritt")
      ) {
        req.alias = "startStandortFolgeschritt";
      } else if (req.body.query.includes("query taskTargetStandortSearch")) {
        req.alias = "taskTargetStandortSearch";
      } else if (req.body.query.includes("query task")) {
        req.alias = "Task";
      }
    });

    Cypress._.times(5, (index) => {
      const bezeichnung = `${standortPrefix}-${index + 1}`;
      cy.createVflz({ bezeichnung }).then((vflzId) => {
        createdVflz.push({ bezeichnung, vflzId });
      });
    });

    cy.then(() => {
      return cy
        .graphql<{ createPool: { __typename: string; poolId?: string } }>(
          createPoolMutation,
          { data: { bemerkungen: "", bezeichnung: poolName } },
        )
        .then(({ data }) => {
          expect(data.createPool.__typename).to.equal("Pool");
          createdPoolId = data.createPool.poolId!;
        });
    });

    cy.then(async () => {
      expect(createdVflz).to.have.length(5);

      const client = new GraphQLClient("/graphql", {
        headers: { "alma-e2e-test-user": "admin" },
      });

      for (const { vflzId } of createdVflz) {
        const vflResult = await client.request<{ vflz: { vflId: string } }>(
          queryVfl,
          { vflzId },
        );
        await client.request(addToPoolMutation, {
          poolId: createdPoolId,
          vflId: vflResult.vflz.vflId,
        });
      }
    });

    cy.setUser("bearbeiten-geschaefte");
    cy.updateUserSetting("bearbeiten-geschaefte", "workflow.filter", "");

    cy.visit("/workflow");
    cy.wait("@GlobalWorkflow");

    // 1) Create Erstbeurteilung Inhaberorientierung pool-wise for 5 standorte.
    openGlobalStartDialog();
    cy.wait("@StartTaskDialogProzesse");
    selectErstbeurteilungOption();
    visibleDialog()
      .find("[data-test=Workflow-startProzess]")
      .click({ force: true });
    goToPoolTarget(poolName);
    assertPoolCountsAndOpenInvalid(5, 0);
    visibleDialog()
      .find("button[data-test=Workflow-createTask]")
      .should("be.enabled");
    clickCreateInTargetStep();
    cy.wait("@startPoolProzess", { timeout: 20000 });
    cy.wait(["@GlobalWorkflow", "@Task"]);
    cy.get("div[data-test=Workflow-taskTitle] input", {
      timeout: 20000,
    }).should("have.value", "Erstbeurteilung Inhaberorientierung");
    workflowItems().contains("Erstbeurteilung Inhaberorientierung");

    // 2) Try same pool-wise process again -> disabled create and all 5 invalid.
    openGlobalStartDialog();
    selectErstbeurteilungOption();
    visibleDialog()
      .find("[data-test=Workflow-startProzess]")
      .click({ force: true });
    goToPoolTarget(poolName);
    assertPoolCountsAndOpenInvalid(0, 5);
    visibleDialog()
      .find("button[data-test=Workflow-createTask]")
      .should("be.disabled");
    closeVisibleDialogIfOpen();

    // 3) Open via floating menu, verify pool-wise valid=5 (do not create),
    // switch to Standort and create one task.
    workflowItems()
      .filter(":contains('Erstbeurteilung Inhaberorientierung')")
      .first()
      .click({ force: true });
    cy.wait("@Task");
    openFloatingStartTaskDialog();
    visibleDialog()
      .find("[data-test=Workflow-select-button]")
      .click({ force: true });
    cy.get("div[role=listbox]:visible")
      .last()
      .find("[role=option]")
      .first()
      .click({ force: true });
    visibleDialog()
      .find("[data-test=Workflow-startProzess]")
      .click({ force: true });
    goToPoolTarget(poolName);
    assertPoolCountsAndOpenInvalid(5, 0);

    visibleDialog()
      .find("button[data-test=Workflow-targetStandort]")
      .click({ force: true });
    visibleDialog().then(($dialog) => {
      const hasSelectedStandortChip =
        $dialog.find("button[data-test=Workflow-selectedStandort]").length > 0;
      const hasSelectedVflzItem =
        $dialog.find("[data-test=VflzItem]").length > 0;

      if (hasSelectedStandortChip || hasSelectedVflzItem) {
        return;
      }

      cy.wrap($dialog)
        .find("input[data-test=Workflow-standortSearchInput]")
        .first()
        .should("exist")
        .click({ force: true });
      visibleDialog()
        .find("input[data-test=Workflow-standortSearchInput]")
        .first()
        .clear({ force: true });
      visibleDialog()
        .find("input[data-test=Workflow-standortSearchInput]")
        .first()
        .type(firstStandortBezeichnung, { force: true });
      cy.wait("@taskTargetStandortSearch");
      cy.contains("[role=option]:visible", firstStandortBezeichnung).click({
        force: true,
      });
    });
    visibleDialog()
      .find("button[data-test=Workflow-createTask]")
      .should("be.enabled");
    clickCreateInTargetStep();
    cy.wait("@startStandortFolgeschritt");
    cy.wait(["@GlobalWorkflow", "@Task"]);

    // 4) Open another Erstbeurteilung task and create pool-wise,
    // now previous standort is invalid -> valid=4, invalid=1.
    workflowItems()
      .filter(":contains('Erstbeurteilung Inhaberorientierung')")
      .eq(1)
      .click({ force: true });
    cy.wait("@Task");
    openFloatingStartTaskDialog();
    visibleDialog()
      .find("[data-test=Workflow-select-button]")
      .click({ force: true });
    cy.get("div[role=listbox]:visible")
      .last()
      .find("[role=option]")
      .first()
      .click({ force: true });
    visibleDialog()
      .find("[data-test=Workflow-startProzess]")
      .click({ force: true });
    goToPoolTarget(poolName);
    assertPoolCountsAndOpenInvalid(4, 1);
    cy.get("[data-test=VflzItem]:visible").should("have.length", 1);
    visibleDialog()
      .find("button[data-test=Workflow-createTask]")
      .should("be.enabled");
    clickCreateInTargetStep();
    cy.wait("@startPoolFolgeschritt", { timeout: 20000 });
    cy.wait(["@GlobalWorkflow", "@Task"]);
  });
});
