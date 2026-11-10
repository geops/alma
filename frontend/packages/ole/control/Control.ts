import Control, { type Options } from "ol/control/Control";
import EventType from "ol/events/EventType";

import type { EventsKey } from "ol/events";
import type { ObjectOnSignature } from "ol/Object";
import type { OnSignature } from "ol/Observable";

class oleControl extends Control {
  active = false;

  on!: ObjectOnSignature<EventsKey> &
    OnSignature<"change:active", Event, EventsKey>;

  once!: ObjectOnSignature<EventsKey> &
    OnSignature<"change:active", Event, EventsKey>;

  un!: ObjectOnSignature<EventsKey> & OnSignature<"change:active", Event, null>;

  declare protected element: HTMLElement;

  constructor(options: { element: HTMLElement; tipLabel?: string } & Options) {
    super(options);

    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.addEventListener(
      EventType.CLICK,
      this.handleClick.bind(this),
      false,
    );
    if (options.tipLabel) {
      button.setAttribute("title", options.tipLabel);
    }

    this.element.appendChild(button);
  }

  activate() {
    this.active = true;
    if (this.element) {
      this.element.className += " active";
    }
    this.dispatchEvent("change:active");
  }

  deactivate() {
    this.active = false;
    if (this.element) {
      this.element.classList.remove("active");
    }
  }

  getElement() {
    return this.element;
  }

  handleClick() {
    if (this.active === false) {
      this.activate();
    }
  }
}

export default oleControl;
