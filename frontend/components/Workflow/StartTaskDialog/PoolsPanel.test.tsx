import PoolsPanel from "./PoolsPanel";
import { TasksContextProvider, useTasksContext } from "./TasksContext";

function PoolValidation() {
  const { canCreate, selectedPool, setSelectedPool } = useTasksContext();

  return (
    <>
      <button
        onClick={() =>
          setSelectedPool(
            selectedPool
              ? undefined
              : {
                  bezeichnung: "Test pool",
                  poolId: "1",
                  standorte: { numResultsTotal: 5 },
                },
          )
        }
      >
        Toggle pool
      </button>
      <button data-test="createTask" disabled={!canCreate}>
        Create
      </button>
      <PoolsPanel />
    </>
  );
}

describe("Pool validation", () => {
  it("refreshes cached validation when reselecting a pool immediately", () => {
    let invalid = 0;
    cy.intercept<{ query: string }>("POST", "/graphql", (req) => {
      if (req.body.query.includes("query taskTargetPoolFolgeschrittValid")) {
        req.alias = "valid";
        req.reply({
          data: {
            validatePoolFolgeschritt: {
              invalidStandorte: { numResultsTotal: invalid },
              validStandorte: {
                numResultsTotal: 5 - invalid,
                results: [],
              },
            },
          },
        });
      } else if (
        req.body.query.includes("query taskTargetPoolFolgeschrittInvalid")
      ) {
        req.alias = "invalid";
        req.reply({
          data: {
            validatePoolFolgeschritt: {
              invalidStandorte: {
                numResultsTotal: invalid,
                results: [],
              },
              validStandorte: { numResultsTotal: 5 - invalid },
            },
          },
        });
      }
    });

    // Keep elapsed time below SWR's default two-second deduplication window.
    cy.clock();
    cy.mount(
      <TasksContextProvider optionsSource="provided">
        <PoolValidation />
      </TasksContextProvider>,
      {
        translations: {
          workflow: {
            pools: {
              invalidStandorte: "Invalid",
              validStandorte: "Valid",
            },
          },
        },
      },
    );

    cy.contains("button", "Toggle pool").click();
    cy.tick(50);
    cy.wait("@valid");
    cy.tick(1);
    cy.get("[data-test=createTask]").should("be.enabled");

    cy.contains("button", "Toggle pool").click();
    cy.then(() => {
      invalid = 5;
    });
    cy.contains("button", "Toggle pool").click();
    cy.tick(50);
    cy.wait("@valid");
    cy.tick(1);
    cy.get("[data-test=createTask]").should("be.disabled");
    cy.contains("button", "Invalid").should("contain", "5").click();
    cy.tick(50);
    cy.wait("@invalid");
    cy.tick(1);

    cy.contains("button", "Toggle pool").click();
    cy.then(() => {
      invalid = 1;
    });
    cy.contains("button", "Toggle pool").click();
    cy.tick(50);
    cy.wait("@valid");
    cy.tick(1);
    cy.get("[data-test=createTask]").should("be.enabled");
    cy.contains("button", "Invalid").should("contain", "1").click();
    cy.tick(50);
    cy.wait("@invalid");
  });
});
