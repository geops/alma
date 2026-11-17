import olControl from "ol/control/Control";
import React, { useEffect } from "react";

import useMap from "./useMap";

export const ControlContext = React.createContext(new olControl({}));

interface ControlProps {
  children?: React.ReactNode;
  control: olControl;
}

export default function Control({ children, control }: ControlProps) {
  const olMap = useMap();

  useEffect(() => {
    olMap.addControl(control);
    return () => {
      olMap.removeControl(control);
    };
  }, [control, olMap]);

  return <ControlContext value={control}>{children}</ControlContext>;
}
