import Workflow from "@/components/Workflow/index";
import i18n from "@/cypress/fixtures/i18n.json";
import geschaefte from "@/cypress/fixtures/vflz/geschaefte.json";
import useCurrentUser from "@/lib/useCurrentUser";

import type {
  UpdateUserSettingMutationVariables,
  UserSetting,
  VflzLayoutFragment,
} from "@/lib/graphql";

function buildWorkflowItem(index: number) {
  return {
    ...geschaefte.data.vflz.geschaefte.results[0],
    parentId: null,
    taskId: `${index}`,
    title: `Task ${index}`,
    vflz: {
      ...geschaefte.data.vflz.geschaefte.results[0].vflz,
      vflzId: "1",
    },
  };
}

function buildWorkflowResponse(resultsPerPage: number[]) {
  const allItems = Array.from({ length: 12 }, (_, index) => {
    return buildWorkflowItem(index + 1);
  });

  return (page: number) => {
    const start = (page - 1) * resultsPerPage[0];
    const end = start + (resultsPerPage[page - 1] ?? 0);

    return {
      data: {
        vflz: {
          ...geschaefte.data.vflz,
          geschaefte: {
            ...geschaefte.data.vflz.geschaefte,
            numPages: resultsPerPage.length,
            numResultsTotal: allItems.length,
            page,
            results: allItems.slice(start, end),
          },
          prozesse: [],
          teilstandorte: [],
        },
      },
    };
  };
}

describe("Workflow", () => {
  let userSettings: UserSetting[] = [];

  describe("default", () => {
    beforeEach(() => {
      cy.intercept<{
        query: string;
        variables: UpdateUserSettingMutationVariables;
      }>("POST", "/graphql", (req) => {
        if (req.body.query?.includes("query VflzWorkflow")) {
          req.reply(geschaefte);
        } else if (req.body.query?.includes("query I18n")) {
          req.reply(i18n);
        } else if (req.body.query?.includes("query useCurrentUser")) {
          req.reply({
            data: {
              currentUser: {
                settings: userSettings,
              },
            },
          });
        } else if (req.body.query?.includes("mutation updateUserSetting")) {
          req.alias = "updateUserSetting";
          req.reply({
            data: {
              updateUserSetting: req.body.variables.data,
            },
          });
        } else if (req.body.query?.includes("query useSetting")) {
          req.reply({
            data: {
              instanceSettings: [],
            },
          });
        }
      });
    });

    it("toggles grouping and sorting", () => {
      cy.mount(
        <Workflow
          vflz={{ combinedId: "A1" } as VflzLayoutFragment}
          vflzId="1"
        />,
        {
          router: {},
          translations: {
            workflow: {
              asTree: { false: "Chronologisch", true: "Gruppiert" },
              sortBy: { due: "Fälligkeit" },
            },
          },
        },
      );
      cy.get("div[data-test^=Workflow-item]").siblings().should("not.exist");
      cy.get("button").contains("Gruppiert").click();
      cy.get("div[data-test^=Workflow-item]").siblings().should("exist");
    });

    it("keeps the workflow list vertically scrollable for infinite loading", () => {
      cy.mount(
        <Workflow
          vflz={{ combinedId: "A1" } as VflzLayoutFragment}
          vflzId="1"
        />,
        {
          router: {},
          translations: {
            workflow: {
              asTree: { false: "Chronologisch", true: "Gruppiert" },
              sortBy: { due: "Fälligkeit" },
            },
          },
        },
      );

      cy.get('[data-test="Workflow-list"]').should(
        "have.class",
        "overflow-y-auto",
      );
    });
  });

  it("replaces filtered results when the VFLZ filter reset finishes", () => {
    const response = buildWorkflowResponse([2]);
    cy.intercept<{
      query: string;
      variables: {
        data: UpdateUserSettingMutationVariables["data"];
        filter?: { titel?: string };
      };
    }>("POST", "/graphql", (req) => {
      if (req.body.query?.includes("query VflzWorkflow")) {
        const filtered = req.body.variables.filter?.titel === "Task 1";
        const body = response(1);
        if (filtered) {
          body.data.vflz.geschaefte.results = [buildWorkflowItem(1)];
          body.data.vflz.geschaefte.numResultsTotal = 1;
        }
        req.alias = filtered ? "filteredWorkflow" : "unfilteredWorkflow";
        req.reply({ body, delay: filtered ? 0 : 500 });
      } else if (req.body.query?.includes("query I18n")) {
        req.reply(i18n);
      } else if (req.body.query?.includes("query useCurrentUser")) {
        req.reply({
          data: {
            currentUser: {
              settings: [
                { key: "workflow.filter", value: { titel: "Task 1" } },
              ],
            },
          },
        });
      } else if (req.body.query?.includes("mutation updateUserSetting")) {
        req.reply({
          body: { data: { updateUserSetting: req.body.variables.data } },
          delay: 300,
        });
      } else if (req.body.query?.includes("query useSetting")) {
        req.reply({ data: { instanceSettings: [] } });
      }
    });

    cy.mount(
      <Workflow vflz={{ combinedId: "A1" } as VflzLayoutFragment} vflzId="1" />,
      { router: {} },
    );
    cy.wait("@filteredWorkflow");
    cy.get("div[data-test^=Workflow-item]").should("have.length", 1);
    cy.wait("@unfilteredWorkflow");
    cy.get("div[data-test^=Workflow-item]").should("have.length", 2);
  });

  it("loads more compact-view items and resets pagination when external filters change", () => {
    const workflowResponse = buildWorkflowResponse([10, 2]);
    const vflz = { combinedId: "A1" } as VflzLayoutFragment;

    function WorkflowWithExternalFilter() {
      const { updateSetting } = useCurrentUser();
      return (
        <>
          <button
            onClick={() => {
              void updateSetting("workflow.filter", { titel: "Task 1" });
            }}
            type="button"
          >
            Change external filter
          </button>
          <Workflow vflz={vflz} vflzId="1" />
        </>
      );
    }

    userSettings = [
      { key: "workflow.compactView", value: true },
      {
        key: "workflow.filter",
        value: {
          eigene: null,
          faelligkeit: [],
          status: [],
          taskTyp: [],
          teilflaechen: null,
          titel: null,
        },
      },
    ];

    cy.intercept<{
      query: string;
      variables: {
        data: UpdateUserSettingMutationVariables["data"];
        filter?: { titel?: string };
        page: number;
      };
    }>("POST", "/graphql", (req) => {
      if (req.body.query?.includes("query VflzWorkflow")) {
        const { filter, page } = req.body.variables;
        const body = workflowResponse(page);
        if (filter?.titel === "Task 1") {
          expect(page).to.equal(1);
          req.alias = "externallyFilteredWorkflow";
          body.data.vflz.geschaefte.results = [buildWorkflowItem(1)];
          body.data.vflz.geschaefte.numPages = 1;
          body.data.vflz.geschaefte.numResultsTotal = 1;
        }
        req.reply(body);
      } else if (req.body.query?.includes("query I18n")) {
        req.reply(i18n);
      } else if (req.body.query?.includes("query useCurrentUser")) {
        req.reply({
          data: {
            currentUser: {
              settings: userSettings,
            },
          },
        });
      } else if (req.body.query?.includes("mutation updateUserSetting")) {
        req.alias = "updateUserSetting";
        req.reply({
          data: {
            updateUserSetting: req.body.variables.data,
          },
        });
      } else if (req.body.query?.includes("query useSetting")) {
        req.reply({
          data: {
            instanceSettings: [],
          },
        });
      }
    });

    cy.mount(<WorkflowWithExternalFilter />, {
      router: {},
      translations: {
        workflow: {
          asTree: { false: "Chronologisch", true: "Gruppiert" },
          compactView: "Kompakt",
          sortBy: { due: "Fälligkeit" },
        },
      },
    });

    cy.get("div[data-test^=Workflow-item]").should("have.length", "10");
    cy.get('[data-test="Workflow-list"]').scrollTo("bottom");
    cy.get("div[data-test^=Workflow-item]").should("have.length", "12");
    cy.contains("button", "Change external filter").click();
    cy.wait("@externallyFilteredWorkflow");
    cy.get("div[data-test^=Workflow-item]").should("have.length", 1);
  });
});
