import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Map from "ol/Map";
import MapBrowserEvent from "ol/MapBrowserEvent";
import VectorSource from "ol/source/Vector";

import Control from "./Control";
import ModifyControl from "./Modify";
import Toolbar from "./Toolbar";

describe("OpenLayers editor controls", () => {
  let map: Map | undefined;

  afterEach(() => {
    map?.dispose();
    map = undefined;
  });

  it("uses the supplied element and toggles the active class", () => {
    const element = document.createElement("div");
    const control = new Control({ element, tipLabel: "Modify" });

    expect(control.getElement()).to.equal(element);
    expect(element.querySelector("button")?.title).to.equal("Modify");
    element.querySelector("button")?.click();
    expect(control.active).to.equal(true);
    expect(element.classList.contains("active")).to.equal(true);

    control.deactivate();
    expect(control.active).to.equal(false);
    expect(element.classList.contains("active")).to.equal(false);
  });

  it("attaches controls to the toolbar element", () => {
    const target = document.createElement("div");
    const toolbar = new Toolbar();
    const control = new Control({ element: document.createElement("div") });
    toolbar.addControl(control);
    map = new Map({ controls: [], target });
    map.addControl(toolbar);

    expect(target.querySelector(".ole-toolbar button")).to.equal(
      control.getElement().firstElementChild,
    );
    expect(control.getMap()).to.equal(map);

    map.removeControl(toolbar);
    expect(target.querySelector(".ole-toolbar button")).to.equal(null);
    expect(control.getMap()).to.equal(null);
  });

  it("handles cursor updates without a map target", () => {
    const control = new ModifyControl({ source: new VectorSource() });
    map = new Map({ controls: [] });
    const event = new MapBrowserEvent(
      "pointermove",
      map,
      new PointerEvent("pointermove"),
    );

    control.updateCursor(event);
    control.setMap(map);
    control.updateCursor(event);
  });

  it("updates the cursor when hovering over features", () => {
    const target = document.createElement("div");
    const source = new VectorSource({
      features: [new Feature(new Point([0, 0]))],
    });
    const control = new ModifyControl({ source });
    map = new Map({ controls: [], target });
    control.setMap(map);
    const event = new MapBrowserEvent(
      "pointermove",
      map,
      new PointerEvent("pointermove"),
    );

    event.coordinate = [0, 0];
    control.updateCursor(event);
    expect(target.style.cursor).to.equal("pointer");

    event.coordinate = [1, 1];
    control.updateCursor(event);
    expect(target.style.cursor).to.equal("");
  });
});
