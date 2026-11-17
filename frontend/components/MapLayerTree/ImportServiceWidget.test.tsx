import { clearCache } from "@camptocamp/ogc-client";

import ImportServiceWidget from "./ImportServiceWidget";

const services = [
  {
    firstItem: "Armee- und Kriegsdenkmäler",
    fixture: "MapLayerTree/ImportServiceWidget/wms.geo.admin.ch.xml",
    url: "https://wms.geo.admin.ch/?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.3.0",
  },
  {
    firstItem: "geodienste.ch WMS Planerischer Gewässerschutz",
    fixture:
      "MapLayerTree/ImportServiceWidget/planerischer_gewaesserschutz_v1_2_0.xml",
    url: "https://geodienste.ch/db/planerischer_gewaesserschutz_v1_2_0/deu?SERVICE=WMS&REQUEST=GetCapabilities",
  },
  {
    firstItem: "Tracer Verbindungslinien",
    fixture: "MapLayerTree/ImportServiceWidget/geoservice.apps.be.ch-wms.xml",
    url: "https://www.geoservice.apps.be.ch/geoservice3/services/a42geo/of_geoscientificinformation02_de_ms_wms/MapServer/WMSServer?&request=GetCapabilities&service=WMS",
  },
  {
    firstItem: "Naturgefahren Perimeter Gefahrenkartierung",
    fixture: "MapLayerTree/ImportServiceWidget/wfs.geo.gl.ch.xml",
    url: "https://wfs.geo.gl.ch/?SERVICE=WFS&VERSION=1.1.0&REQUEST=GetCapabilities",
  },
  {
    firstItem: "OWS Kanton Glarus",
    fixture: "MapLayerTree/ImportServiceWidget/wms.geo.gl.ch.xml",
    url: "https://wms.geo.gl.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities",
  },
];

describe("ImportServiceWidget component", () => {
  beforeEach(() => {
    cy.then(clearCache);
    cy.intercept<{ query?: string }>("POST", "/graphql", (req) => {
      if (req.body.query?.includes("query useSetting")) {
        req.reply({ data: { instanceSettings: [] } });
      } else if (req.body.query?.includes("mutation UpdateInstanceSetting")) {
        req.alias = "updateInstanceSetting";
        req.reply({ data: {} });
      }
    });
  });

  services.forEach((service) => {
    it(`parses OGC service ${service.url}`, () => {
      cy.clock();
      const url = new URL(service.url);
      // The OGC client normalizes query parameter order and casing.
      cy.intercept(
        { hostname: url.hostname, method: "GET", pathname: url.pathname },
        { fixture: service.fixture },
      ).as("getCapabilities");
      cy.mount(<ImportServiceWidget onClose={cy.stub()} />);
      cy.get("input[name=url]").type(service.url);
      cy.tick(300);
      // Both service detection and OGC parsing must use the fixture.
      cy.wait(["@getCapabilities", "@getCapabilities"]);
      cy.contains("label", service.firstItem);
      cy.wait("@updateInstanceSetting");
    });
  });
});
