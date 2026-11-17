import { use } from "react";

import { MapContext } from "./Map";

export default function useMap() {
  return use(MapContext);
}
