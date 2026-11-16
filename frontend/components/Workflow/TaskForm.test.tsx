import TaskForm from "@/components/Workflow/TaskForm";
import { Permission } from "@/lib/graphql";

const mountOptions = {
  router: {},
  translations: {
    TaskStatus: {
      ABGESCHLOSSEN: "geschlossen",
      OFFEN: "offen",
      RUHEND: "ruhend",
    },
  },
};

const task = {
  deletable: false,
  events: [],
  faelligkeitsStatus: "UEBERFAELLIG" as const,
  folgeschritte: { availableOptions: [], problems: [] },
  oeffentlich: false,
  readOnly: false,
  sachbearbeitung: [],
  sonstigeBeteiligte: [],
  taskId: "1",
  triggers: [],
  vflz: { beteiligte: [], latestVflzId: "1" },
};

describe("TaskForm", () => {
  beforeEach(() => {
    cy.stubCurrentUser({ permissions: [Permission.EditProcess] });
  });

  it("Prozess", () => {
    cy.mount(
      <TaskForm
        mutateTask={cy.stub()}
        mutation=""
        showStatusFields
        task={{
          ...task,
          faelligkeitsStatus: "FAELLIG_SPAETER",
          startDatum: "2025-01-01",
          status: "OFFEN",
          title: "Test Task",
          type: "PROZESS",
        }}
      />,
      mountOptions,
    );

    cy.get("input[name=startDatum]").should("exist");
    cy.get("input[name=faelligkeitsDatum]").should("exist");
    cy.get("input[name=endDatum]").should("exist");
    cy.get("button[name=status]").should("exist");

    cy.get("input[name=endDatum]").type("{selectAll}11.11.2020");
    cy.get("input[name=faelligkeitsDatum]").type("{selectAll}15.11.2020");
    // currently we validate on submit
    // cy.get("input[name=startDatum]").type("{selectAll}13.11.2020");
    // cy.get("button[type=submit]").should("be.disabled");

    cy.get("input[name=startDatum]").type("{selectAll}09.11.2020");

    cy.get("button[name=status]").click();
    cy.get("div[role=listbox]").should("exist");
    cy.get("div[role=listbox]").contains("ruhend").click();
    cy.get("input[name=faelligkeitsDatum]").should("be.empty");

    cy.get("input[name=endDatum]").clear();
    cy.get("input[name=endDatum]").should("be.empty");
    cy.get("button[name=status]").click();
    cy.get("div[role=listbox]").should("exist");
    cy.get("div[role=listbox]").contains("geschlossen").click();
    cy.get("input[name=endDatum]")
      .invoke("val")
      .should("match", /\d+\.\d+\.\d{4}/);

    cy.get("button[name=status]").click();
    cy.get("div[role=listbox]").should("exist");
    cy.get("div[role=listbox]").contains("offen").click();
    cy.get("input[name=endDatum]").should("be.empty");
  });

  it("Aufgabe", () => {
    cy.mount(
      <TaskForm
        mutateTask={cy.stub()}
        mutation=""
        showStatusFields
        task={{
          ...task,
          faelligkeitsStatus: "FAELLIG_SPAETER",
          startDatum: "2025-01-01",
          status: "OFFEN",
          title: "Test Aufgabe",
          type: "AUFGABE",
        }}
      />,
      mountOptions,
    );

    cy.get("input[name=startDatum]").should("exist");
    cy.get("input[name=faelligkeitsDatum]").should("exist");
    cy.get("input[name=endDatum]").should("exist");
    cy.get("button[name=status]").should("exist");

    cy.get("input[name=endDatum]").type("{selectAll}11.11.2020");
    cy.get("button[name=status]").should("contain", "geschlossen");
    // currently we validate on submit
    // cy.get("input[name=endDatum]").clear();
    // cy.get("button[type=submit]").should("be.disabled");
  });

  it("Dokument", () => {
    cy.mount(
      <TaskForm
        mutateTask={cy.stub()}
        mutation=""
        task={{
          ...task,
          faelligkeitsStatus: "FAELLIG_SPAETER",
          startDatum: "2025-01-01",
          status: "OFFEN",
          title: "Test Dokument",
          type: "DOKUMENT",
        }}
      />,
      mountOptions,
    );

    cy.get("input[name=startDatum]").should("exist");
    cy.get("input[name=faelligkeitsDatum]").should("not.exist");
    cy.get("input[name=endDatum]").should("not.exist");
    cy.get("button[name=status]").should("not.exist");
  });

  it("Formular", () => {
    cy.mount(
      <TaskForm
        mutateTask={cy.stub()}
        mutation=""
        task={{
          ...task,
          faelligkeitsStatus: "FAELLIG_SPAETER",
          startDatum: "2025-01-01",
          status: "OFFEN",
          title: "Test Formular",
          type: "FORMULAR",
        }}
      />,
      mountOptions,
    );

    cy.get("input[name=startDatum]").should("exist");
    cy.get("input[name=faelligkeitsDatum]").should("not.exist");
    cy.get("input[name=endDatum]").should("not.exist");
    cy.get("button[name=status]").should("not.exist");
  });

  it("Notiz", () => {
    cy.mount(
      <TaskForm
        mutateTask={cy.stub()}
        mutation=""
        task={{
          ...task,
          endDatum: null,
          faelligkeitsDatum: null,
          faelligkeitsStatus: "FAELLIG_SPAETER",
          startDatum: "2025-03-25T00:00:00",
          status: "ABGESCHLOSSEN",
          title: "Test Note",
          type: "NOTIZ",
        }}
      />,
      mountOptions,
    );

    cy.get("input[name=startDatum]").should("exist");
    cy.get("input[name=faelligkeitsDatum]").should("not.exist");
    cy.get("input[name=endDatum]").should("not.exist");
    cy.get("button[name=status]").should("not.exist");
  });
});
