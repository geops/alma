import Form from "./Form";
import ZeitraumFields from "./ZeitraumFields";

describe("ZeitraumFields component", () => {
  it("validates zeitraum", () => {
    cy.mount(
      <Form model="Ablagerung" onSubmit={cy.stub().as("submit")}>
        <ZeitraumFields name="foo" />
        <button type="submit">Submit</button>
      </Form>,
    );
    cy.get("input[name='foo.von']").type("2022");
    cy.get("input[name='foo.bis']").type("2021");
    cy.get("button[type=submit]").click();
    cy.get("[data-test=ValidationPopover-button]").should("have.length", 2);
    cy.get("@submit").should("not.have.been.called");
    cy.get("input[name='foo.bis']").clear();
    cy.get("input[name='foo.bis']").type("2023");
    cy.get("button[type=submit]").click();
    cy.get("[data-test=ValidationPopover-button]").should("not.exist");
    cy.get("@submit").should("have.been.calledOnce");
    cy.get("@submit").should("have.been.calledWithMatch", {
      foo: { bis: "2023-01-01", von: "2022-01-01" },
    });
  });
});
