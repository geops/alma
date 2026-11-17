import { defaults as defaultInteractions } from "ol/interaction/defaults";
import olMap from "ol/Map";
import React, { useEffect, useMemo, useState } from "react";

import type { MapOptions } from "ol/Map";

export const MapContext = React.createContext(new olMap({}));

export type MapProps = {
  children?: React.ReactNode;
  className?: string;
} & MapOptions &
  Omit<React.HTMLProps<HTMLDivElement>, "controls">;

export default function Map({
  children,
  className,
  controls,
  interactions,
  view,
  ...props
}: MapProps) {
  const map = useMemo(() => {
    return new olMap({
      controls,
      interactions:
        interactions ??
        defaultInteractions({
          altShiftDragRotate: false,
          pinchRotate: false,
        }),
      keyboardEventTarget: document,
      view,
    });
  }, [view, controls, interactions]);
  const [target, setTarget] = useState<HTMLDivElement>();

  useEffect(() => {
    map.setTarget(target);

    // It seems the controls are not well initialized when the map is created
    map.getControls().forEach((control) => {
      if (control.getMap() !== map) {
        control.setMap(map);
      }
    });
    return () => {
      map.setTarget();
    };
  }, [map, target]);

  return (
    <MapContext value={map}>
      <div
        className={className}
        ref={(ref) => {
          setTarget(ref ?? undefined);
        }}
        {...props}
      >
        {children}
      </div>
    </MapContext>
  );
}
