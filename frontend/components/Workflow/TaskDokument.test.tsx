import { useState } from "react";

import TaskDokument from "@/components/Workflow/TaskDokument";

import type { TaskProps } from "@/components/Workflow/Task";

const mountOptions = {
  router: {},
  translations: {
    fields: {
      Task: {
        upload: {
          error: { generic: "Upload fehlgeschlagen" },
          replace: "Ersetzen",
          selectFile: "Datei auswählen",
        },
        url: "URL",
      },
    },
    workflow: { create: { DOKUMENT: "Neues Dokument" } },
  },
};

const task = {
  deletable: false,
  dokument: "",
  events: [],
  faelligkeitsStatus: "UEBERFAELLIG" as const,
  folgeschritte: { availableOptions: [], problems: [] },
  oeffentlich: false,
  readOnly: false,
  sachbearbeitung: [],
  sonstigeBeteiligte: [],
  startDatum: "2025-01-01",
  status: "OFFEN" as const,
  taskId: "1",
  title: "Neues Dokument",
  triggers: [],
  type: "DOKUMENT" as const,
  url: "https://example.com/document.pdf",
  vflz: { beteiligte: [], latestVflzId: "1" },
};

describe("TaskDokument", () => {
  beforeEach(() => {
    cy.intercept<{ query: string }>("POST", "/graphql").as("graphql");
  });

  it("displays url as link when valid", () => {
    const mockTaskProps: TaskProps = {
      mutateTask: cy.stub(),
      task,
    };
    cy.mount(<TaskDokument {...mockTaskProps} />, mountOptions);
    cy.get('[data-test="Workflow-taskTitle"] input').should(
      "have.value",
      "Neues Dokument",
    );
    cy.get('[data-test="urlAnchor"]').should("exist");
    cy.get('[data-test="urlAnchor"]').should(
      "have.attr",
      "href",
      "https://example.com/document.pdf",
    );
  });

  it("allows editing url when edit button is clicked", () => {
    const mockTaskProps: TaskProps = {
      mutateTask: cy.stub(),
      task,
    };
    cy.mount(<TaskDokument {...mockTaskProps} />, mountOptions);
    cy.get('[data-test="urlAnchor"]').should("exist");
    cy.get('[data-test="urlEditBtn"]').click();
    cy.get('[data-test="urlInput"]').should("be.focused");
    cy.get('[data-test="urlInput"]').should(
      "have.value",
      "https://example.com/document.pdf",
    );
  });

  it("exits edit mode on blur", () => {
    const mockTaskProps: TaskProps = {
      mutateTask: cy.stub(),
      task,
    };
    cy.mount(<TaskDokument {...mockTaskProps} />, mountOptions);
    cy.get('[data-test="urlEditBtn"]').click();
    cy.get('[data-test="urlInput"]').should("be.focused");
    cy.get('[data-test="urlInput"]').blur();
    cy.get('[data-test="urlAnchor"]').should("exist");
  });

  it("handles successful upload", () => {
    cy.intercept("POST", "/api/documents", {
      body: "document_ref",
      statusCode: 200,
    }).as("mockDocumentUpload");
    cy.intercept("GET", "/api/documents/document_ref", {
      body: { file_size: 12, file_type: "text/plain", title: "test-file.txt" },
      statusCode: 200,
    }).as("documentMetadata");

    const mockTaskProps: TaskProps = {
      mutateTask: cy.stub(),
      task,
    };
    cy.mount(<TaskDokument {...mockTaskProps} />, mountOptions);
    cy.get('[data-test="Workflow-taskTitle"] input').should(
      "have.value",
      "Neues Dokument",
    );
    cy.get('[data-test="urlAnchor"]').should("exist");
    cy.get("label[for=file-upload]").contains("Datei auswählen");
    const file = new File(["file content"], "test-file.txt", {
      type: "text/plain",
    });
    cy.get('input[type="file"]').selectFile(
      {
        contents: file,
        fileName: "test-file.txt",
      },
      { force: true },
    );
    cy.get("label[for=file-upload]").contains("Ersetzen");
    cy.get('[data-test="Workflow-taskTitle"] input').should(
      "have.value",
      "test-file",
    );
  });

  it("handles failed Upload", () => {
    cy.intercept("POST", "/api/documents", {
      statusCode: 500,
    }).as("failedDocumentUpload");
    const mockTaskProps: TaskProps = {
      mutateTask: cy.stub(),
      task,
    };
    cy.mount(<TaskDokument {...mockTaskProps} />, mountOptions);
    cy.get('[data-test="urlAnchor"]').should("exist");
    cy.get("label[for=file-upload]").contains("Datei auswählen");
    const file = new File(["file content"], "test-file.txt", {
      type: "text/plain",
    });
    cy.get('input[type="file"]').selectFile(
      {
        contents: file,
        fileName: "test-file.txt",
      },
      { force: true },
    );
    cy.get("label[for=file-upload]").contains("Datei auswählen");
    cy.get("div[data-test=uploadError]").contains("Upload fehlgeschlagen");
  });

  it("clears document state when switching to a task without a document", () => {
    cy.intercept("GET", "/api/documents/document_ref", {
      body: {
        file_size: 1024,
        file_type: "text/plain",
        title: "existing-file.txt",
      },
      statusCode: 200,
    }).as("documentMetadata");

    function Wrapper() {
      const [currentTask, setCurrentTask] = useState({
        ...task,
        dokument: "document_ref",
      });

      return (
        <>
          <button
            onClick={() => {
              setCurrentTask({
                ...task,
                dokument: "",
                taskId: "2",
                title: "Leeres Dokument",
                url: "",
              });
            }}
            type="button"
          >
            Switch task
          </button>
          <TaskDokument mutateTask={cy.stub()} task={currentTask} />
        </>
      );
    }

    cy.mount(<Wrapper />, mountOptions);
    cy.wait("@documentMetadata");
    cy.contains("existing-file.txt").should("exist");

    cy.contains("Switch task").click();

    cy.contains("existing-file.txt").should("not.exist");
    cy.get("label[for=file-upload]").contains("Datei auswählen");
    cy.get('[data-test="urlInput"]').should("have.value", "");
  });
});
