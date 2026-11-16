import StartTaskDialog from "./";

const folgeschrittGrund = {
  PROZESS_BEENDET: "Prozess beendet",
  SCHRITT_NICHT_ABGESCHLOSSEN: "Schritt nicht abgeschlossen",
  TASK_NICHT_ABGESCHLOSSEN: "Task nicht abgeschlossen",
  TASK_OHNE_WORKFLOW: "Task ohne Workflow",
};

type Grund = keyof typeof folgeschrittGrund;

const mountOptions = {
  router: {},
  translations: {
    "Task 2": "Task 2",
    TaskType: { AUFGABE: "Aufgabe", DOKUMENT: "Dokument", NOTIZ: "Notiz" },
    workflow: { folgeschrittGrund, start: "Starten" },
  },
};

// Same shape as `Task.folgeschritte.problems` from the backend.
const problem = (grund: Grund) => {
  return { message: grund, messageCode: `workflow.folgeschrittGrund.${grund}` };
};

const option = { optionId: "1", title: "Task 2", type: "AUFGABE" as const };

const reason = '[data-test="StartTaskDialog-unavailableReason"]';

describe("StartTaskDialog", () => {
  it("shows the options and no problem if options are available", () => {
    cy.mount(
      <StartTaskDialog
        isOpen
        onClose={cy.stub()}
        options={[option]}
        optionsSource="provided"
        problems={[problem("PROZESS_BEENDET")]}
        taskId="1"
        title="Nächsten Task starten"
      />,
      mountOptions,
    );

    cy.get('[data-test="Workflow-select-button"]').should("contain", "Task 2");
    cy.contains("button", "Starten").should("exist");
    cy.get(reason).should("not.exist");
  });

  it("shows the first problem if no options are available", () => {
    cy.mount(
      <StartTaskDialog
        isOpen
        onClose={cy.stub()}
        options={[]}
        optionsSource="provided"
        problems={[
          problem("PROZESS_BEENDET"),
          problem("SCHRITT_NICHT_ABGESCHLOSSEN"),
        ]}
        taskId="1"
        title="Nächsten Task starten"
      />,
      mountOptions,
    );

    cy.get('[data-test="Workflow-select-button"]').should("not.exist");
    cy.get(reason).should("have.text", "Prozess beendet");
    // Creating ad-hoc tasks is still possible.
    cy.get('[data-test="Workflow-createNOTIZ"]').should("exist");
  });

  (Object.entries(folgeschrittGrund) as [Grund, string][]).forEach(
    ([grund, text]) => {
      it(`translates ${grund}`, () => {
        cy.mount(
          <StartTaskDialog
            isOpen
            onClose={cy.stub()}
            optionsSource="provided"
            problems={[problem(grund)]}
            taskId="1"
            title="Nächsten Task starten"
          />,
          mountOptions,
        );

        cy.get(reason).should("have.text", text);
      });
    },
  );

  it("shows the problem in the user's language", () => {
    cy.stubCurrentUser({ settings: [{ key: "locale", value: "fr" }] });
    cy.mount(
      <StartTaskDialog
        isOpen
        onClose={cy.stub()}
        optionsSource="provided"
        problems={[problem("PROZESS_BEENDET")]}
        taskId="1"
        title="Démarrer la tâche suivante"
      />,
      {
        ...mountOptions,
        translationsByLocale: {
          fr: {
            workflow: {
              folgeschrittGrund: { PROZESS_BEENDET: "Processus terminé" },
            },
          },
        },
      },
    );

    cy.get(reason).should("have.text", "Processus terminé");
  });

  it("falls back to the message if there is no message code", () => {
    cy.mount(
      <StartTaskDialog
        isOpen
        onClose={cy.stub()}
        optionsSource="provided"
        problems={[{ message: "Unbekannter Grund", messageCode: null }]}
        taskId="1"
        title="Nächsten Task starten"
      />,
      mountOptions,
    );

    cy.get(reason).should("have.text", "Unbekannter Grund");
  });

  it("shows nothing if there are neither options nor problems", () => {
    cy.mount(
      <StartTaskDialog
        isOpen
        onClose={cy.stub()}
        optionsSource="provided"
        taskId="1"
        title="Nächsten Task starten"
      />,
      mountOptions,
    );

    cy.get('[data-test="Workflow-select-button"]').should("not.exist");
    cy.get(reason).should("not.exist");
  });
});
