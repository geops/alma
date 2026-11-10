describe("Admin page for system settings", () => {
  beforeEach(() => {
    cy.intercept<{ query: string }>("POST", "/graphql", (req) => {
      if (req.body.query.includes("query InstanceSettings")) {
        req.alias = "InstanceSettings";
      } else if (req.body.query.includes("mutation UpdateInstanceSetting")) {
        req.alias = "UpdateInstanceSetting";
      }
    });
  });

  it("reads and updates system settings", () => {
    cy.setUser("admin");
    cy.visit("/admin/system");
    cy.wait("@InstanceSettings");

    cy.get("td").contains("ui.map.import.urls").click();
    cy.get("div[role=dialog]").should("exist");
    cy.get("div[role=dialog] textarea").type("xyz");
    cy.get("button[type=submit]").click();
    cy.get("button[data-test=ValidationPopover-button]").should("exist");
    cy.get("button").contains("Abbrechen").click();
    cy.get("div[role=dialog]").should("not.exist");

    cy.get("td").contains("ui.map.maxExtent").click();
    cy.get("div[role=dialog]").should("exist");
    cy.get("div[role=dialog] textarea").type("{selectAll}xyz");
    cy.get("button[type=submit]").click();
    cy.get("button[data-test=ValidationPopover-button]").should("exist");
    cy.get("div[role=dialog] textarea").type(
      "{selectAll}[2485000,1064000,2835000,1300001]",
    );
    cy.get("button[type=submit]").click();
    cy.wait("@UpdateInstanceSetting");
    cy.get("div[role=dialog]").should("not.exist");
    cy.get("td").contains("1300001").should("exist");
  });

  it("saves an integer Kompartimente limit", () => {
    cy.setUser("admin");
    cy.updateAdminSetting("ui.ablagerungen.maxKompartimente", "undefined");
    cy.visit("/admin/system");
    cy.wait("@InstanceSettings");

    cy.get("td").contains("ui.ablagerungen.maxKompartimente").click();
    cy.get("div[role=dialog] textarea").should("have.value", '"undefined"');
    cy.get("div[role=dialog] textarea").type("{selectAll}1.5");
    cy.get("button[type=submit]").click();
    cy.get("button[data-test=ValidationPopover-button]").should("exist");
    cy.get("div[role=dialog] textarea").type("{selectAll}1");
    cy.get("button[type=submit]").click();
    cy.wait("@UpdateInstanceSetting");
    cy.get("div[role=dialog]").should("not.exist");
    cy.get("td")
      .contains("ui.ablagerungen.maxKompartimente")
      .parent()
      .should("contain", "1");
    cy.get("td").contains("ui.ablagerungen.maxKompartimente").click();
    cy.get("div[role=dialog] textarea").type('{selectAll}"undefined"');
    cy.get("button[type=submit]").click();
    cy.wait("@UpdateInstanceSetting");
    cy.get("div[role=dialog]").should("not.exist");
    cy.get("td")
      .contains("ui.ablagerungen.maxKompartimente")
      .parent()
      .find("td")
      .last()
      .should("have.text", '"undefined"');
  });

  it("shows message for missing permissions", () => {
    cy.setUser("bearbeiten-geschaefte");
    cy.visit("/admin/system");
    cy.get("[data-test=MissingPermission]").should("exist");
  });
});
