import GroupLayer from "ol/layer/Group";
import VectorLayer from "ol/layer/Vector";

import ImportFileWidget from "./ImportFileWidget";
import { DispatchContext } from "./tree";

function getExpectKML(title: string) {
  return (stub: Cypress.Agent<sinon.SinonStub>) => {
    expect(stub).have.been.calledWithMatch({
      payload: { layer: Cypress.sinon.match.instanceOf(VectorLayer) },
      type: "addLayer",
    });

    const layer = stub.lastCall.args[0].payload.layer as VectorLayer;
    expect(layer.getSource()?.getFeatures().length).to.equal(3);
    expect(layer.get("title")).to.equal(title);
  };
}

function getExpectShapefile(title: string) {
  return (stub: Cypress.Agent<sinon.SinonStub>) => {
    expect(stub).have.been.calledWithMatch({
      payload: { layer: Cypress.sinon.match.instanceOf(GroupLayer) },
      type: "addLayer",
    });

    const layer = stub.lastCall.args[0].payload.layer as GroupLayer;
    const lineLayer = layer.getLayers().item(0) as VectorLayer;
    const polygonLayer = layer.getLayers().item(1) as VectorLayer;
    const pointLayer = layer.getLayers().item(2) as VectorLayer;
    expect(layer.get("title")).to.equal(title);
    expect(layer.getLayers().getLength()).to.equal(3);
    expect(lineLayer.get("title")).to.equal("Lines");
    expect(polygonLayer.get("title")).to.equal("Polygone");
    expect(pointLayer.get("title")).to.equal("Punkte");
    expect(lineLayer.getSource()?.getFeatures().length).to.equal(5);
    expect(polygonLayer.getSource()?.getFeatures().length).to.equal(5);
    expect(pointLayer.getSource()?.getFeatures().length).to.equal(13);
  };
}

describe("ImportFileWidget component", () => {
  it("imports local KML file", () => {
    const dispatchStub = cy.stub();
    const onCloseStub = cy.stub();
    cy.mount(
      <DispatchContext value={dispatchStub}>
        <ImportFileWidget onClose={onCloseStub} />
      </DispatchContext>,
    );
    cy.get("button[data-test=ImportFileWidget-local]").click();
    cy.get("div[data-test=ImportFileWidget]")
      .find("input[name=file]")
      .selectFile("cypress/fixtures/MapLayerTree/ImportFileWidget/test.kml");
    cy.get("button[data-test=ImportFileWidget-import]").click();
    cy.wrap(dispatchStub).should(getExpectKML("test.kml"));
    cy.wrap(onCloseStub).should("have.been.calledOnce");
  });

  it("imports remote KML file", () => {
    const dispatchStub = cy.stub();
    const onCloseStub = cy.stub();
    cy.intercept("GET", "https://test.com/test.kml", {
      fixture: "MapLayerTree/ImportFileWidget/test.kml",
    });
    cy.mount(
      <DispatchContext value={dispatchStub}>
        <ImportFileWidget onClose={onCloseStub} />
      </DispatchContext>,
    );
    cy.get("div[data-test=ImportFileWidget]")
      .find("input[name=url]")
      .type("https://test.com/test.kml");
    cy.get("button[data-test=ImportFileWidget-import]").click();
    cy.wrap(dispatchStub).should(getExpectKML("https://test.com/test.kml"));
    cy.wrap(onCloseStub).should("have.been.calledOnce");
  });

  it("imports local Shapefile", () => {
    const dispatchStub = cy.stub();
    const onCloseStub = cy.stub();
    cy.mount(
      <DispatchContext value={dispatchStub}>
        <ImportFileWidget onClose={onCloseStub} />
      </DispatchContext>,
    );
    cy.get("button[data-test=ImportFileWidget-local]").click();
    cy.get("div[data-test=ImportFileWidget]")
      .find("input[name=file]")
      .selectFile("cypress/fixtures/MapLayerTree/ImportFileWidget/shapefiles.zip"); // prettier-ignore
    cy.get("button[data-test=ImportFileWidget-import]").click();
    cy.wrap(dispatchStub).should(getExpectShapefile("shapefiles.zip"));
    cy.wrap(onCloseStub).should("have.been.calledOnce");
  });

  it("imports remote Shapefile", () => {
    const dispatchStub = cy.stub();
    const onCloseStub = cy.stub();
    cy.intercept("GET", "https://test.com/shapefiles.zip", {
      fixture: "MapLayerTree/ImportFileWidget/shapefiles.zip",
    });
    cy.mount(
      <DispatchContext value={dispatchStub}>
        <ImportFileWidget onClose={onCloseStub} />
      </DispatchContext>,
    );
    cy.get("div[data-test=ImportFileWidget]")
      .find("input[name=url]")
      .type("https://test.com/shapefiles.zip");
    cy.get("button[data-test=ImportFileWidget-import]").click();
    cy.wrap(dispatchStub).should(
      getExpectShapefile("https://test.com/shapefiles.zip"),
    );
    cy.wrap(onCloseStub).should("have.been.calledOnce");
  });

  it("handles help, fetchFailed, invalidFileType and invalidSHP status", () => {
    const dispatchStub = cy.stub();
    const onCloseStub = cy.stub();
    cy.intercept("GET", "https://test.com/404.kml", {
      statusCode: 404,
    });
    cy.mount(
      <DispatchContext value={dispatchStub}>
        <ImportFileWidget onClose={onCloseStub} />
      </DispatchContext>,
    );
    // test help status
    cy.get("[data-test=ImportFileWidget-help]").should("be.visible");

    // test fetchFailed status
    cy.get("div[data-test=ImportFileWidget]")
      .find("input[name=url]")
      .type("https://test.com/404.kml");
    cy.get("button[data-test=ImportFileWidget-import]").click();
    cy.get("[data-test=ImportFileWidget-fetchFailed]").should("be.visible");

    // test invalidFileType status
    cy.get("button[data-test=ImportFileWidget-local]").click();
    cy.get("div[data-test=ImportFileWidget]")
      .find("input[name=file]")
      .selectFile("cypress/fixtures/MapLayerTree/ImportFileWidget/invalid.txt");
    cy.get("button[data-test=ImportFileWidget-import]").click();
    cy.get("[data-test=ImportFileWidget-invalidFileType]").should("be.visible");

    // test invalidSHP status
    cy.get("div[data-test=ImportFileWidget]")
      .find("input[name=file]")
      .selectFile("cypress/fixtures/MapLayerTree/ImportFileWidget/invalid.zip");
    cy.get("button[data-test=ImportFileWidget-import]").click();
    cy.get("[data-test=ImportFileWidget-invalidSHP]").should("be.visible");
    cy.wrap(dispatchStub).should("not.have.been.called");
    cy.wrap(onCloseStub).should("not.have.been.called");
  });
});
