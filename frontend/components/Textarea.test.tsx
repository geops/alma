import Form from "./Form";
import Textarea from "./Textarea";

describe("Single-line textarea", () => {
  const title =
    "A long workflow task title that should remain fully visible ".repeat(8);

  for (const width of [375, 1024]) {
    it(`wraps the full title without resizing at ${width}px`, () => {
      cy.viewport(width, 768);
      cy.mount(
        <Form className="max-w-xl" defaultValues={{ title }} model="Task">
          <Textarea
            className="max-h-none w-full resize-none"
            data-test="Workflow-taskTitle"
            name="title"
            rows={1}
            singleLine
          />
        </Form>,
      );

      cy.get('[data-test="Workflow-taskTitle"] textarea')
        .should("have.value", title)
        .and("have.css", "resize", "none")
        .should(($textarea) => {
          const textarea = $textarea[0] as HTMLTextAreaElement;
          expect(textarea.clientHeight).to.be.greaterThan(40);
          expect(textarea.scrollHeight).to.be.at.most(
            textarea.clientHeight + 1,
          );
          expect(textarea.scrollWidth).to.be.at.most(textarea.clientWidth + 1);
        });
    });
  }

  it("strips pasted newlines and submits on Enter", () => {
    cy.mount(
      <Form model="Task" onSubmit={cy.stub().as("submit")}>
        <Textarea name="title" rows={1} singleLine />
        <button type="submit">Submit</button>
      </Form>,
    );

    cy.get("textarea").then(($textarea) => {
      const textarea = $textarea[0];
      const descriptor = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(textarea),
        "value",
      );
      descriptor?.set?.call(textarea, "First\nSecond");
    });
    cy.get("textarea").trigger("input").should("have.value", "FirstSecond");
    cy.get("textarea").type("{enter}").should("have.value", "FirstSecond");
    cy.get("@submit").should("have.been.calledOnce");
    cy.get("@submit").should("have.been.calledWithMatch", {
      title: "FirstSecond",
    });
  });
});
