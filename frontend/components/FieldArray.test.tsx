import { FormProvider, useForm } from "react-hook-form";

import FieldArray from "./FieldArray";

function TestWrapper({
  children,
  items = [],
}: {
  children: React.ReactNode;
  items?: { name: string }[];
}) {
  const methods = useForm({
    defaultValues: {
      items,
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
}

describe("FieldArray component", () => {
  [
    { maxItems: 1, withTitle: false },
    { maxItems: 1, withTitle: true },
    { maxItems: 2, withTitle: false },
  ].forEach(({ maxItems, withTitle }) => {
    it(`hides the add button at limit ${maxItems} and restores it after removal (title: ${withTitle})`, () => {
      cy.intercept("POST", "/graphql", {
        data: { instanceSettings: [] },
      });
      cy.stubCurrentUser();
      cy.mount(
        <TestWrapper>
          <FieldArray
            addLabel="Add Item"
            getTitle={withTitle ? () => "Item" : undefined}
            maxItems={maxItems}
            model="testModel"
            name="items"
            value={{ name: "" }}
          >
            {(index) => <div data-test={`item-${index}`}>Item {index}</div>}
          </FieldArray>
        </TestWrapper>,
      );

      Cypress._.times(maxItems, () => {
        cy.get('[data-test="FieldArrayAddButton"]').click();
      });
      cy.get('[data-test="item-0"]').should("exist");
      cy.get('[data-test="FieldArrayAddButton"]').should("not.exist");
      cy.get('button[name="items.0.remove"]').click();
      cy.get('[data-test="FieldArrayAddButton"]').should("exist");
    });
  });

  it("preserves existing entries above the limit", () => {
    cy.stubSettings([]);
    cy.stubCurrentUser();
    cy.mount(
      <TestWrapper items={[{ name: "First" }, { name: "Second" }]}>
        <FieldArray<{ name: string }>
          addLabel="Add Item"
          getTitle={(item) => item.name}
          maxItems={1}
          model="testModel"
          name="items"
          value={{ name: "" }}
        >
          {(index) => <div data-test={`item-${index}`}>Item {index}</div>}
        </FieldArray>
      </TestWrapper>,
    );

    cy.contains("First").should("exist");
    cy.contains("Second").should("exist");
    cy.get('[data-test="FieldArrayAddButton"]').should("not.exist");
    cy.get('button[name="items.0.remove"]').click();
    cy.get('[data-test="FieldArrayAddButton"]').should("not.exist");
    cy.get('button[name="items.0.remove"]').click();
    cy.get('[data-test="FieldArrayAddButton"]').should("exist");
  });

  [undefined, 0, -1, 1.5].forEach((maxItems) => {
    it(`does not limit additions for maxItems=${maxItems}`, () => {
      cy.intercept("POST", "/graphql", {
        data: { instanceSettings: [] },
      });
      cy.stubCurrentUser();
      cy.mount(
        <TestWrapper>
          <FieldArray
            addLabel="Add Item"
            maxItems={maxItems}
            model="testModel"
            name="items"
            value={{ name: "" }}
          >
            {(index) => <div data-test={`item-${index}`}>Item {index}</div>}
          </FieldArray>
        </TestWrapper>,
      );

      cy.get('[data-test="FieldArrayAddButton"]').click().click();
      cy.get('[data-test="item-1"]').should("exist");
      cy.get('[data-test="FieldArrayAddButton"]').should("exist");
    });
  });

  it("hides field array when system setting is enabled", () => {
    cy.intercept<{ query?: string }>("POST", "/graphql", (req) => {
      if (req.body.query?.includes("query useSetting")) {
        req.reply({
          data: {
            instanceSettings: [
              {
                key: "ui.fields.testModel.items.hidden",
                value: true,
              },
            ],
          },
        });
      } else {
        req.reply({});
      }
    });

    cy.mount(
      <TestWrapper>
        <FieldArray
          addLabel="Add Item"
          model="testModel"
          name="items"
          value={{ name: "" }}
        >
          {(index) => {
            return <div data-test={`item-${index}`}>Item {index}</div>;
          }}
        </FieldArray>
      </TestWrapper>,
    );

    cy.get('[data-test="FieldArrayAddButton"]').should("not.exist");
  });

  it("shows field array when system setting is disabled", () => {
    cy.intercept<{ query?: string }>("POST", "/graphql", (req) => {
      if (req.body.query?.includes("query useSetting")) {
        req.reply({
          data: {
            instanceSettings: [
              {
                key: "ui.fields.testModel.items.hidden",
                value: false,
              },
            ],
          },
        });
      } else {
        req.reply({});
      }
    });

    cy.mount(
      <TestWrapper>
        <FieldArray
          addLabel="Add Item"
          model="testModel"
          name="items"
          value={{ name: "" }}
        >
          {(index) => {
            return <div data-test={`item-${index}`}>Item {index}</div>;
          }}
        </FieldArray>
      </TestWrapper>,
    );

    cy.get('[data-test="FieldArrayAddButton"]').should("exist");
  });
});
