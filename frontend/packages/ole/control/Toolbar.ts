import Collection from "ol/Collection";
import Control, { type Options } from "ol/control/Control";

import type Map from "ol/Map";

import type oleControl from "./Control";

interface ToolbarOptions {
  className?: string;
  target: Options["target"];
}

class Toolbar extends Control {
  declare protected element: HTMLElement;

  private controls = new Collection<oleControl>();

  constructor(options?: ToolbarOptions) {
    super({
      element: document.createElement("div"),
      target: options?.target,
    });

    this.element.className = options?.className ?? "ole-toolbar";
  }

  addControl(control: oleControl) {
    control.setTarget(this.element);
    this.getMap()?.addControl(control);
    this.controls.push(control);
  }

  getControls() {
    return this.controls;
  }

  removeControl(control: oleControl) {
    this.getMap()?.removeControl(control);
    this.controls.remove(control);
  }

  setMap(map: Map | null) {
    super.setMap(map);
    this.controls.forEach((control) => {
      control.setMap(map);
    });
  }
}

export default Toolbar;
