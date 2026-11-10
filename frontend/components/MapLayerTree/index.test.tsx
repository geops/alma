import GroupLayer from "ol/layer/Group";
import VectorLayer from "ol/layer/Vector";

import Layer from "@/packages/react-spatial/Layer";

import Map from "../Map";

import MapLayerTree from "./index";

const bottomLayer = new VectorLayer({
  properties: { id: "bottom", readonly: true, title: "Bottom" },
});
const topLayer = new VectorLayer({ properties: { id: "top", title: "Top" } });
const groupLayer = new GroupLayer({
  layers: [
    new VectorLayer({ properties: { id: "sub", title: "Sub" } }),
    new VectorLayer({ properties: { id: "hiddenSub", title: "Hidden Sub" } }),
  ],
  properties: {
    collapsed: false,
    hiddenLayers: ["hiddenSub"],
    id: "foo",
    readonly: true,
    title: "Foo",
  },
});

const layerItemButtonSelectors = [
  "div[data-test=MapLayerTree-item-move]",
  "button[data-test=MapLayerTree-item-edit]",
  "button[data-test=MapLayerTree-item-delete]",
];

describe("MapLayerTree component", () => {
  beforeEach(() => {
    cy.viewport(1024, 500);
  });

  it("renders empty layer tree", () => {
    cy.mount(
      <Map className="h-screen">
        <MapLayerTree settingName="editor" />
      </Map>,
    );
    cy.get("button[data-test=MapLayerTree-toggle]").click();
    cy.get("ul[data-test=MapLayerTree-list] li").should("have.length", 0);
  });

  it("highlights active map controls", () => {
    cy.mount(
      <Map className="h-screen">
        <MapLayerTree settingName="editor" />
      </Map>,
    );
    ["MapLayerTree-toggle", "MapLayerTree-info"].forEach((control) => {
      cy.get(`button[data-test=${control}]`)
        .should("have.css", "color", "rgb(71, 84, 103)")
        .click()
        .should("have.css", "background-color", "rgb(223, 241, 251)")
        .and("have.css", "color", "rgb(0, 134, 201)")
        .click()
        .should("have.css", "color", "rgb(71, 84, 103)")
        .and("not.have.css", "background-color", "rgb(223, 241, 251)");
    });
  });

  it("renders nested tree with readonly group layer and hidden sub layer", () => {
    cy.mount(
      <Map className="h-screen">
        <MapLayerTree settingName="editor" />
        <Layer layer={bottomLayer} />
        <Layer layer={groupLayer} />
        <Layer layer={topLayer} />
      </Map>,
    );
    cy.get("button[data-test=MapLayerTree-toggle]").click();
    cy.get("ul[data-test=MapLayerTree-list] li").then((items) => {
      expect(items[0]).to.contain.text("Top");
      layerItemButtonSelectors.forEach((selector) => {
        cy.wrap(items[0]).find(selector).should("exist");
      });

      expect(items[1]).to.contain.text("Foo");
      cy.wrap(items[1])
        .find("div[data-test=MapLayerTree-item-move]")
        .should("exist");

      expect(items[2]).to.contain.text("Sub");
      layerItemButtonSelectors.forEach((selector) => {
        cy.wrap(items[2]).find(selector).should("not.exist");
      });

      expect(items[3]).to.contain.text("Bottom");
      cy.wrap(items[3])
        .find("div[data-test=MapLayerTree-item-move]")
        .should("exist");
    });
  });

  it("adds and removes single WMS layer", () => {
    cy.intercept("POST", "/graphql", (req) => {
      if (req.body.query?.includes("query useSetting")) {
        req.reply({
          data: {
            instanceSettings: [
              {
                key: "ui.map.import.urls",
                value: [
                  "https://geodienste.ch/db/planerischer_gewaesserschutz_v1_2_0/deu?SERVICE=WMS&REQUEST=GetCapabilities",
                ],
              },
            ],
          },
        });
      } else if (req.body.query?.includes("mutation updateUserSetting")) {
        req.alias = "updateUserSetting";
        req.reply({ data: {} });
      } else {
        req.reply({});
      }
    });
    cy.intercept(
      "https://geodienste.ch/db/planerischer_gewaesserschutz_v1_2_0/deu?SERVICE=WMS&REQUEST=GetCapabilities",
      (req) => {
        return req.reply({
          fixture:
            "MapLayerTree/ImportServiceWidget/planerischer_gewaesserschutz_v1_2_0.xml",
        });
      },
    );
    cy.mount(
      <Map className="h-screen">
        <MapLayerTree settingName="editor" />
      </Map>,
    );
    cy.get("button[data-test=MapLayerTree-toggle]").click();
    cy.get("button[data-test=MapLayerTree-open-import-service]").click();
    cy.get("ul[data-test=MapLayerTree-import-urls] button").click();
    cy.get("ul[data-test=MapLayerTree-import-items] label").click();
    cy.get("button[data-test=MapLayerTree-run-import-service]").click();
    cy.wait("@updateUserSetting");
    cy.get("ul[data-test=MapLayerTree-list] li").contains(
      "geodienste.ch WMS Planerischer Gewässerschutz",
    );

    // Click on delete
    cy.get(
      "ul[data-test=MapLayerTree-list] button[data-test=MapLayerTree-item-delete]",
    ).click({ force: true });

    // Infirm deletion in confirmation dialog
    cy.get("button[data-test=MapLayerTree-item-delete-confirm-no]").click({
      force: true,
    });
    cy.get("ul[data-test=MapLayerTree-list] li").should("have.length", 1);

    // Click on delete again
    cy.get(
      "ul[data-test=MapLayerTree-list] button[data-test=MapLayerTree-item-delete]",
    ).click({ force: true });

    // Confirm deletion in confirmation dialog
    cy.get("button[data-test=MapLayerTree-item-delete-confirm-yes]").click({
      force: true,
    });

    cy.wait("@updateUserSetting");
    cy.get("ul[data-test=MapLayerTree-list] li").should("have.length", 0);
  });

  it("restores layer ordering from current user setting", () => {
    cy.intercept<{ query: string }>("POST", "/graphql", (req) => {
      if (req.body.query.includes("query useCurrentUser")) {
        req.alias = "useCurrentUser";
        req.reply({
          data: {
            currentUser: {
              settings: [
                {
                  key: "mapLayerTree.editor",
                  value: [
                    { id: "bottom", type: "Layer", version: 1 },
                    {
                      id: "foo",
                      items: [{ id: "sub", type: "Layer", version: 1 }],
                      title: "Foo",
                      type: "Group",
                      version: 1,
                    },
                    { id: "top", type: "Layer", version: 1 },
                  ],
                },
              ],
            },
          },
        });
      }
    });
    cy.mount(
      <Map className="h-screen">
        <MapLayerTree settingName="editor" />
        <Layer layer={groupLayer} />
        <Layer layer={topLayer} />
        <Layer layer={bottomLayer} />
      </Map>,
    );
    cy.wait("@useCurrentUser");
    cy.get("button[data-test=MapLayerTree-toggle]").click();
    cy.get("ul[data-test=MapLayerTree-list] li").then((items) => {
      expect(items[0]).to.contain.text("Top");
      expect(items[1]).to.contain.text("Foo");
      expect(items[2]).to.contain.text("Sub");
      expect(items[3]).to.contain.text("Bottom");
    });
  });

  it("restores visibility for existing readonly group sublayers", () => {
    const publishedLayer = new VectorLayer({
      properties: {
        id: "vflzSearchLayerGroup.published",
        title: "Published",
      },
    });
    const notPublishedLayer = new VectorLayer({
      properties: {
        id: "vflzSearchLayerGroup.notPublished",
        title: "Not Published",
      },
    });
    const searchLayer = new VectorLayer({
      properties: { id: "vflzSearchLayer", title: "Search" },
    });
    const visibilityGroupLayer = new GroupLayer({
      layers: [notPublishedLayer, publishedLayer, searchLayer],
      properties: {
        collapsed: false,
        hiddenLayers: ["vflzSearchLayer"],
        id: "vflzSearchLayerGroup",
        readonly: true,
        title: "VFLZ Search Group",
      },
    });

    cy.intercept<{ query: string }>("POST", "/graphql", (req) => {
      if (req.body.query.includes("query useCurrentUser")) {
        req.alias = "useCurrentUser";
        req.reply({
          data: {
            currentUser: {
              settings: [
                {
                  key: "mapLayerTree.editor",
                  value: [
                    {
                      collapsed: false,
                      id: "vflzSearchLayerGroup",
                      items: [
                        {
                          id: "vflzSearchLayerGroup.notPublished",
                          type: "Layer",
                          version: 1,
                          visible: false,
                        },
                        {
                          id: "vflzSearchLayerGroup.published",
                          type: "Layer",
                          version: 1,
                          visible: true,
                        },
                        {
                          id: "vflzSearchLayer",
                          type: "Layer",
                          version: 1,
                          visible: false,
                        },
                      ],
                      title: "VFLZ Search Group",
                      type: "Group",
                      version: 1,
                      visible: true,
                    },
                  ],
                },
              ],
            },
          },
        });
      }
    });

    cy.mount(
      <Map className="h-screen">
        <MapLayerTree settingName="editor" />
        <Layer layer={visibilityGroupLayer} />
      </Map>,
    );

    cy.wait("@useCurrentUser").then(() => {
      expect(notPublishedLayer.getVisible()).to.equal(false);
      expect(publishedLayer.getVisible()).to.equal(true);
      expect(searchLayer.getVisible()).to.equal(false);
    });
  });

  it("falls back to defaults when user settings are invalid", () => {
    cy.intercept<{ query: string }>("POST", "/graphql", (req) => {
      if (req.body.query.includes("query useCurrentUser")) {
        req.reply({
          data: {
            currentUser: {
              settings: [
                {
                  key: "mapLayerTree.editor",
                  value: "not-an-array",
                },
              ],
            },
          },
        });
      }
    });
    cy.mount(
      <Map className="h-screen">
        <MapLayerTree settingName="editor" />
        <Layer layer={bottomLayer} />
        <Layer layer={groupLayer} />
        <Layer layer={topLayer} />
      </Map>,
    );
    cy.get("button[data-test=MapLayerTree-toggle]").click();
    cy.get("ul[data-test=MapLayerTree-list] li").then((items) => {
      expect(items[0]).to.contain.text("Top");
      expect(items[1]).to.contain.text("Foo");
      expect(items[2]).to.contain.text("Sub");
      expect(items[3]).to.contain.text("Bottom");
    });
  });

  it("ignores duplicate layer ids from current user setting", () => {
    cy.intercept<{ query: string }>("POST", "/graphql", (req) => {
      if (req.body.query.includes("query useCurrentUser")) {
        req.alias = "useCurrentUser";
        req.reply({
          data: {
            currentUser: {
              settings: [
                {
                  key: "mapLayerTree.editor",
                  value: [
                    { id: "bottom", type: "Layer", version: 1 },
                    { id: "bottom", type: "Layer", version: 1 },
                    {
                      id: "foo",
                      items: [
                        { id: "sub", type: "Layer", version: 1 },
                        { id: "sub", type: "Layer", version: 1 },
                      ],
                      title: "Foo",
                      type: "Group",
                      version: 1,
                    },
                    { id: "top", type: "Layer", version: 1 },
                    { id: "top", type: "Layer", version: 1 },
                  ],
                },
              ],
            },
          },
        });
      }
    });

    cy.mount(
      <Map className="h-screen">
        <MapLayerTree settingName="editor" />
        <Layer layer={groupLayer} />
        <Layer layer={topLayer} />
        <Layer layer={bottomLayer} />
      </Map>,
    );

    cy.wait("@useCurrentUser");
    cy.get("button[data-test=MapLayerTree-toggle]").click();
    cy.get("ul[data-test=MapLayerTree-list] li").then((items) => {
      expect(items).to.have.length(4);
      expect(items[0]).to.contain.text("Top");
      expect(items[1]).to.contain.text("Foo");
      expect(items[2]).to.contain.text("Sub");
      expect(items[3]).to.contain.text("Bottom");
    });
  });

  it("grays out label when layer is hidden due to scale range", () => {
    const scaleRangeLayer = new VectorLayer({
      maxResolution: 5,
      properties: { id: "sr", title: "ScaleRange Layer" },
    });
    cy.mount(
      <Map className="h-screen">
        <MapLayerTree settingName="editor" />
        <Layer layer={scaleRangeLayer} />
        <Layer layer={topLayer} />
      </Map>,
    );
    cy.get("button[data-test=MapLayerTree-toggle]").click();
    cy.get("ul[data-test=MapLayerTree-list] li")
      .contains("ScaleRange Layer")
      .should("have.class", "text-gray-5");
    cy.get("ul[data-test=MapLayerTree-list] li")
      .contains("Top")
      .should("have.class", "text-gray-8");
  });
});
