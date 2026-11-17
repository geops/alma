import olBaseLayer from "ol/layer/Base";
import { createContext, useEffect } from "react";

import useMap from "./useMap";

import type React from "react";

export const LayerContext = createContext(new olBaseLayer({}));

interface LayerProps {
  children?: React.ReactNode;
  layer: olBaseLayer;
}

export default function Layer({ children, layer }: LayerProps) {
  const olMap = useMap();

  useEffect(() => {
    olMap.addLayer(layer);
    return () => {
      olMap.removeLayer(layer);
    };
  }, [layer, olMap]);

  return <LayerContext value={layer}>{children}</LayerContext>;
}
