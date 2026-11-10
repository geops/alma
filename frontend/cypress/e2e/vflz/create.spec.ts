import type {
  CreateVflzInput,
  CreateVflzMutation,
  ValidateCreateVflzInput,
} from "@/lib/graphql";

function formFind(selector: string) {
  return cy.get("form[data-test=vflzCreateForm]").find(selector);
}

function dataFormFind(selector: string) {
  return cy.get("form[data-test=vflzDataForm]").find(selector);
}

describe("Vflz create page", () => {
  beforeEach(() => {
    cy.setUser("bearbeiten-sachdaten");
    cy.stubSettings([
      { key: "ui.map.maxExtent", value: [2606506, 1228365, 2607006, 1228865] },
    ]);
    cy.intercept<{ query?: string }>("POST", "/graphql", (req) => {
      if (req.body.query?.includes("query searchMap")) {
        // Other sites must not change the drawn polygon through snapping or tracing.
        req.reply({
          data: {
            search: {
              geo: {
                vflgeo: { features: [], type: "FeatureCollection" },
                zentroid: { features: [], type: "FeatureCollection" },
              },
            },
          },
        });
      } else if (req.body.query?.includes("query validateCreateVflz")) {
        req.alias = "validateCreateVflz";
      } else if (req.body.query?.includes("mutation createVflz")) {
        req.alias = "createVflz";
      }
    });
  });

  it("creates Standort based on validated data", () => {
    cy.updateAdminSetting("ui.fields.Vflz.flugplatz.hidden", true);
    cy.updateAdminSetting("ui.fields.Vflz.ktu.hidden", true);
    cy.visit("/vflz/create");
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(5000); // wait for map to register controls
    cy.get(".ole-draw-Polygon button").click();
    cy.get(".ol-viewport").click(496, 302);
    cy.get(".ol-viewport").click(556, 322);
    cy.get(".ol-viewport").click(436, 322);
    cy.get(".ol-viewport").click(496, 302); // closing the polygon better work than double click
    let geometry: ValidateCreateVflzInput["geometry"];
    cy.wait<{ variables: { data: ValidateCreateVflzInput } }>(
      "@validateCreateVflz",
    ).then(({ request }) => {
      geometry = request.body.variables.data.geometry;
      if (geometry.type !== "MultiPolygon") {
        throw new Error(`Expected a MultiPolygon, got ${geometry.type}`);
      }
      expect(geometry.coordinates).to.have.length(1);
      expect(geometry.coordinates[0]).to.have.length(1);
      const ring = geometry.coordinates[0][0];
      expect(ring).to.have.length(4);
      expect(ring[0]).to.deep.equal(ring[3]);
    });

    formFind("input[disabled][name='gemeinde.displayValue']")
      .closest("div")
      .find("[data-test=ValidationPopover-button]")
      .click();
    cy.get("[data-test=ValidationPopover-panel]")
      .contains("Bar (0002)")
      .click();
    formFind("input[disabled][name='gemeinde.displayValue']").should(
      "have.value",
      "Bar (0002)",
    );
    formFind("[data-test=VflzCreateFormFields-kanton] input[disabled]").should(
      "have.value",
      "BL",
    );
    cy.wait("@validateCreateVflz");

    formFind("button[name='vftyp']").click();
    cy.get("div[role=listbox] div[role=option]")
      .contains("Ablagerungsstandort")
      .click();
    cy.wait("@validateCreateVflz");

    formFind("input[name=combinedId]").should("not.have.value", "");
    let combinedId = "";
    formFind("input[name=combinedId]")
      .invoke("val")
      .then((val) => {
        combinedId = val as string;
      });

    formFind("input[name=bezeichnung]").type("Test");
    formFind("button[type=submit]").click();
    cy.wait<
      { variables: { data: CreateVflzInput } },
      { data: CreateVflzMutation; errors?: unknown[] }
    >("@createVflz").then(({ request, response }) => {
      expect(request.body.variables.data.geometry).to.deep.equal(geometry);
      expect(response?.statusCode).to.equal(200);
      expect(response?.body.errors).to.equal(undefined);
      const createVflz = response?.body.data.createVflz;
      if (createVflz?.__typename !== "Vflz") {
        throw new Error(
          `Expected createVflz to return a Vflz: ${JSON.stringify(createVflz)}`,
        );
      }
      const { vflzId } = createVflz;
      cy.location("pathname", { timeout: 10000 }).should(
        "equal",
        `/vflz/${vflzId}/data`,
      );
    });
    cy.get("[data-test=DirtyFieldsDialog]").should("not.exist");
    cy.then(() => {
      cy.get("[data-test=VflzSummary]").contains(`${combinedId} Test`);
    });
    dataFormFind("input[name=bezeichnung]").should("have.value", "Test");
    dataFormFind("input[disabled][name='gemeinde.displayValue']").should(
      "have.value",
      "Bar (0002)",
    );
    dataFormFind("[data-test=vflzDataFormKanton] input[disabled]").should(
      "have.value",
      "BL",
    );
    dataFormFind("[data-test=vflzDataFormEast] input[disabled]").should(
      "have.value",
      "2606760",
    );
    dataFormFind("[data-test=vflzDataFormNorth] input[disabled]").should(
      "have.value",
      "1228610",
    );
    dataFormFind("input[disabled][name='zentroid.coordinates.2']").should(
      "have.value",
      "430",
    );
    dataFormFind("input[disabled][name=flaeche]").should("have.value", "314");
  });
});
