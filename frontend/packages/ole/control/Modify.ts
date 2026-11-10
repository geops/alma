import { singleClick, targetNotEditable } from "ol/events/condition";
import Event from "ol/events/Event";
import EventType from "ol/events/EventType";
import Interaction from "ol/interaction/Interaction";
import ModifyInteraction from "ol/interaction/Modify";
import SelectInteraction from "ol/interaction/Select";
import oleControl from "ole/control/Control";

import type Collection from "ol/Collection";
import type { Options as ControlOptions } from "ol/control/Control";
import type { EventsKey } from "ol/events";
import type Feature from "ol/Feature";
import type { InteractionOnSignature } from "ol/interaction/Interaction";
import type { Options as SelectInteractionOptions } from "ol/interaction/Select";
import type Map from "ol/Map";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import type { OnSignature } from "ol/Observable";
import type VectorSource from "ol/source/Vector";

export class DeleteEvent extends Event {
  constructor(type: "delete") {
    super(type);
  }
}

class DeleteInteraction extends Interaction {
  features: Collection<Feature>;

  on!: InteractionOnSignature<EventsKey> &
    OnSignature<"delete", DeleteEvent, EventsKey>;

  source: VectorSource;

  un!: InteractionOnSignature<EventsKey> &
    OnSignature<"delete", DeleteEvent, null>;

  constructor({
    features,
    source,
  }: {
    features: Collection<Feature>;
    source: VectorSource;
  }) {
    super();
    this.features = features;
    this.source = source;
  }

  handleEvent(event: MapBrowserEvent<KeyboardEvent>) {
    if (
      targetNotEditable(event) &&
      event.type == EventType.KEYDOWN &&
      event.originalEvent.key === "Backspace"
    ) {
      this.source.removeFeatures(this.features.getArray());
      this.dispatchEvent(new Event("delete"));
    }
    return true;
  }
}

interface DrawControlOptions {
  className?: string;
  selectOptions?: SelectInteractionOptions;
  source: VectorSource;
  target?: ControlOptions["target"];
}

class ModifyControl extends oleControl {
  deleteInteraction: DeleteInteraction;
  modifyInteraction: ModifyInteraction;

  selectInteraction: SelectInteraction;

  source: VectorSource;

  constructor(options: DrawControlOptions) {
    super({
      element: document.createElement("div"),
      target: options?.target,
    });

    this.element.className = options?.className ?? "ole-modify";

    this.selectInteraction = new SelectInteraction({
      ...options.selectOptions,
    });

    this.deleteInteraction = new DeleteInteraction({
      features: this.selectInteraction.getFeatures(),
      source: options.source,
    });

    this.modifyInteraction = new ModifyInteraction({
      deleteCondition: singleClick,
      features: this.selectInteraction.getFeatures(),
    });

    this.source = options.source;
  }

  activate() {
    super.activate();
    this.getMap()?.addInteraction(this.deleteInteraction);
    this.getMap()?.addInteraction(this.modifyInteraction);
    this.getMap()?.addInteraction(this.selectInteraction);
    this.getMap()?.on("pointermove", this.updateCursor);

    this.deleteInteraction.on("delete", this.clearSelection);
  }

  deactivate() {
    super.deactivate();
    this.getMap()?.removeInteraction(this.deleteInteraction);
    this.getMap()?.removeInteraction(this.modifyInteraction);
    this.getMap()?.removeInteraction(this.selectInteraction);
    this.getMap()?.un("pointermove", this.updateCursor);

    this.deleteInteraction.un("delete", this.clearSelection);
  }

  setMap(map: Map | null): void {
    const oldMap = this.getMap();
    if (oldMap) {
      oldMap.removeInteraction(this.deleteInteraction);
      oldMap.removeInteraction(this.modifyInteraction);
      oldMap.removeInteraction(this.selectInteraction);
      oldMap.un("pointermove", this.updateCursor);
    }

    if (map) {
      map.addInteraction(this.deleteInteraction);
      map.addInteraction(this.modifyInteraction);
      map.addInteraction(this.selectInteraction);
      if (this.active) {
        map.on("pointermove", this.updateCursor);
      }
    }
    super.setMap(map);
  }

  updateCursor = (event: MapBrowserEvent) => {
    const map = this.getMap();
    const target = map?.getTargetElement();
    if (target) {
      const features = this.source.getFeaturesAtCoordinate(event.coordinate);
      target.style.cursor = features.length ? "pointer" : "";
    }
  };

  private clearSelection = () => {
    this.selectInteraction.getFeatures().clear();
  };
}

export default ModifyControl;
