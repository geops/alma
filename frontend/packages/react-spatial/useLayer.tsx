import { use } from "react";

import { LayerContext } from "./Layer";

import type Layer from "ol/layer/Layer";

export default function useLayer<T extends Layer>() {
  return use(LayerContext) as T;
}
