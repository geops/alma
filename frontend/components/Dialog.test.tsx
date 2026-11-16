import AppDialog from "./Dialog";

describe("Dialog component", () => {
  it("renders title and children when open", () => {
    cy.mount(
      <AppDialog isOpen onClose={cy.stub()} title="Foo">
        Bar
      </AppDialog>,
    );
    cy.get("h2").contains("Foo");
    cy.contains("Bar");
    cy.get('[data-dialog="dialog-body"]').should("contain", "Bar");
  });

  it("does not render when closed", () => {
    cy.mount(
      <AppDialog isOpen={false} onClose={cy.stub()} title="Foo">
        Bar
      </AppDialog>,
    );
    cy.get("h2").should("not.exist");
    cy.contains("Bar").should("not.exist");
  });

  it("closes when close button is clicked", () => {
    cy.mount(
      <AppDialog isOpen onClose={cy.stub().as("onClose")} title="Foo">
        Bar
      </AppDialog>,
    );
    cy.get("h2").parent().find("button").click();
    cy.get("@onClose").should("have.been.called");
  });

  describe("closeOnClickOutside=true (default)", () => {
    it("closes when clicking the backdrop", () => {
      cy.mount(
        <AppDialog isOpen onClose={cy.stub().as("onClose")} title="Foo">
          Bar
        </AppDialog>,
      );
      cy.get(".fixed.inset-0.backdrop-blur-xs").click({ force: true });
      cy.get("@onClose").should("have.been.called");
    });

    it("does not close when clicking inside the panel content", () => {
      cy.mount(
        <AppDialog isOpen onClose={cy.stub().as("onClose")} title="Foo">
          Bar
        </AppDialog>,
      );
      cy.contains("Bar").click();
      cy.get("@onClose").should("not.have.been.called");
    });
  });

  describe("closeOnClickOutside=false", () => {
    it("does not close when clicking the backdrop", () => {
      cy.mount(
        <AppDialog
          closeOnClickOutside={false}
          isOpen
          onClose={cy.stub().as("onClose")}
          title="Foo"
        >
          Bar
        </AppDialog>,
      );
      cy.get(".fixed.inset-0.backdrop-blur-xs").click({ force: true });
      cy.get("@onClose").should("not.have.been.called");
    });

    it("does not close when clicking inside the content", () => {
      cy.mount(
        <AppDialog
          closeOnClickOutside={false}
          isOpen
          onClose={cy.stub().as("onClose")}
          title="Foo"
        >
          Bar
        </AppDialog>,
      );
      cy.contains("Bar").click();
      cy.get("@onClose").should("not.have.been.called");
    });
  });
});
