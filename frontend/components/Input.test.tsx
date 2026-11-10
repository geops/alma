import Form from "./Form";
import Input from "./Input";

describe("Input component", () => {
  it("renders input element", () => {
    cy.mount(<Input label="foo" value="bar" />, { form: {} });
    cy.get("input").should("have.value", "bar");
  });

  it("validates float input on submit", () => {
    cy.mount(
      <Form model="Input" onSubmit={cy.stub().as("submit")}>
        <Input name="foo" type="float" />
        <button type="submit">Submit</button>
      </Form>,
      {
        translations: {
          fields: { Input: { foo: "Foo" } },
        },
      },
    );

    cy.get("input[name=foo]").type("abc");
    cy.get("button[type=submit]").click();
    cy.get("[data-test=ValidationPopover-button]").should("exist");
    cy.get("@submit").should("not.have.been.called");

    cy.get("input[name=foo]").clear();
    cy.get("input[name=foo]").type("1,5");
    cy.get("button[type=submit]").click();
    cy.get("[data-test=ValidationPopover-button]").should("not.exist");
    cy.get("@submit").should("have.been.calledOnce");
    cy.get("@submit").should("have.been.calledWithMatch", { foo: 1.5 });
  });
});
