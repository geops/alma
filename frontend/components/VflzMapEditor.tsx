import { gql } from "graphql-request";
import clone from "lodash/clone";
import { always, never } from "ol/events/condition";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import GeometryCollection from "ol/geom/GeometryCollection";
import MultiPoint from "ol/geom/MultiPoint";
import MultiPolygon from "ol/geom/MultiPolygon";
import { DrawEvent } from "ol/interaction/Draw";
import SnapInteraction from "ol/interaction/Snap";
import VectorLayer from "ol/layer/Vector";
import WebGLVectorLayer from "ol/layer/WebGLVector";
import { unByKey } from "ol/Observable";
import VectorSource from "ol/source/Vector";
import { Circle, Fill, Style } from "ol/style";
import View from "ol/View";
import oleDrawControl from "ole/control/Draw";
import oleMakeValidControl from "ole/control/MakeValid";
import oleModifyControl, { type DeleteEvent } from "ole/control/Modify";
import oleOperationControl from "ole/control/Operation";
import oleSplitControl, { type SplitEvent } from "ole/control/Split";
import oleEditor from "ole/Editor";
import { useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import useMap from "react-spatial/useMap";

import MapLayerTree from "@/components/MapLayerTree";
import MutationInfo from "@/components/MutationInfo";
import ValidationPopover from "@/components/ValidationPopover";
import VflzMap, { layer, source } from "@/components/VflzMap";
import VflzSearchLayerGroup from "@/components/VflzSearchLayerGroup";
import client from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import useSetting from "@/lib/useSetting";

import type { GeoJSONMultiPolygon, GeoJSONPoint } from "ol/format/GeoJSON";
import type { Polygon } from "ol/geom";
import type { ModifyEvent } from "ol/interaction/Modify";
import type { SelectEvent } from "ol/interaction/Select";
import type { ObjectEvent } from "ol/Object";
import type { VectorSourceEvent } from "ol/source/Vector";
import type oleControl from "ole/control/Control";
import type { MakeValidEvent } from "ole/control/MakeValid";
import type { OperationEvent } from "ole/control/Operation";
import type { FieldErrors, FieldValues } from "react-hook-form";

import type {
  OleDifferenceQuery,
  OleIntersectQuery,
  OleMakeValidQuery,
  OleSplitQuery,
  OleUnionQuery,
  VflzMapEditorFragment,
} from "@/lib/graphql";

const geoJSON = new GeoJSON();

const selectStyle = new Style({
  geometry: function (feature) {
    const geometry = feature.getGeometry();
    return geometry?.getType() === "Polygon"
      ? new GeometryCollection([
          new MultiPoint((geometry as Polygon)?.getCoordinates().flat()),
          geometry as Polygon,
        ])
      : geometry;
  },
  image: new Circle({ fill: new Fill({ color: "#4EE4FF" }), radius: 5 }),
  zIndex: 2,
});

const traceSource = new VectorSource();

const snapInteraction = new SnapInteraction({ source: traceSource });

const drawPointControl = new oleDrawControl({ source, type: "Point" });

const drawPolygonControl = new oleDrawControl({
  condition: always,
  freehandCondition: never,
  source,
  trace: true,
  traceSource,
  type: "Polygon",
});

const modifyControl = new oleModifyControl({
  selectOptions: {
    layers: [layer],
    style: () => {
      return [...(layer.getStyle() as () => Style[])(), selectStyle];
    },
  },
  source,
});

const differenceMutation = gql`
  query oleDifference($A: GeoJSONMultiPolygon!, $B: GeoJSONMultiPolygon!) {
    geo: geoDifference(geoA: $A, geoB: $B)
  }
`;
const differenceControl = new oleOperationControl({
  operation: (A, B) => {
    return client
      .request<OleDifferenceQuery>(differenceMutation, { A, B })
      .then((result) => {
        return result.geo as GeoJSONMultiPolygon;
      });
  },
  selectInteraction: modifyControl.selectInteraction,
  source,
  type: "difference",
});

const intersectionMutation = gql`
  query oleIntersect($geoA: GeoJSONMultiPolygon!, $geoB: GeoJSONMultiPolygon!) {
    geo: geoIntersection(geoA: $geoA, geoB: $geoB)
  }
`;
const intersectionControl = new oleOperationControl({
  operation: (geoA, geoB) => {
    return client
      .request<OleIntersectQuery>(intersectionMutation, { geoA, geoB })
      .then((result) => {
        return result.geo as GeoJSONMultiPolygon;
      });
  },
  selectInteraction: modifyControl.selectInteraction,
  source,
  type: "intersection",
});

const makeValidMutation = gql`
  query oleMakeValid($geo: GeoJSONMultiPolygon!) {
    geo: geoMakeValid(geo: $geo)
  }
`;
const makeValidControl = new oleMakeValidControl({
  operation: (geo) => {
    return client
      .request<OleMakeValidQuery>(makeValidMutation, { geo })
      .then((result) => {
        return result.geo as GeoJSONMultiPolygon;
      });
  },
  selectInteraction: modifyControl.selectInteraction,
  source,
});

const unionMutation = gql`
  query oleUnion($geoA: GeoJSONMultiPolygon!, $geoB: GeoJSONMultiPolygon!) {
    geo: geoUnion(geoA: $geoA, geoB: $geoB)
  }
`;
const unionControl = new oleOperationControl({
  operation: (geoA, geoB) => {
    return client
      .request<OleUnionQuery>(unionMutation, { geoA, geoB })
      .then((result) => {
        return result.geo as GeoJSONMultiPolygon;
      });
  },
  selectInteraction: modifyControl.selectInteraction,
  source,
  type: "union",
});

const splitMutation = gql`
  query oleSplit($geo: GeoJSONMultiPolygon!, $blade: GeoJSONLineString!) {
    geo: geoSplit(geo: $geo, blade: $blade)
  }
`;
const splitControl = new oleSplitControl({
  operation: (geo, blade) => {
    return client
      .request<OleSplitQuery>(splitMutation, { blade, geo })
      .then((result) => {
        return result.geo as GeoJSONMultiPolygon;
      });
  },
  selectInteraction: modifyControl.selectInteraction,
  source,
});

const editor = new oleEditor({
  controls: [
    modifyControl,
    drawPointControl,
    drawPolygonControl,
    splitControl,
    makeValidControl,
    unionControl,
    intersectionControl,
    differenceControl,
  ],
});

type VflzGeometryType = "MultiPolygon" | "PointOrMultiPolygon";

function featuresToInput(geometryType: VflzGeometryType, features: Feature[]) {
  const geometries = features.map((f) => {
    return f.getGeometry()?.clone();
  });
  const point = geometries.find((g) => {
    return g?.getType() === "Point";
  });
  const zentroid = point
    ? (geoJSON.writeGeometryObject(point) as GeoJSONPoint)
    : null;
  if (zentroid?.coordinates?.length === 3) {
    // remove Z value from zentroid
    zentroid.coordinates = zentroid.coordinates.slice(0, 2);
  }
  const polygons = geometries
    .filter((geometry) => {
      return geometry?.getType() === "Polygon";
    })
    .map((geometry) => {
      return geometry as Polygon;
    })
    .map((polygon) => {
      // remove Z value from polygons
      const coordinates = polygon.getCoordinates().map((ring) => {
        return ring.map((coords) => {
          return coords.slice(0, 2);
        });
      });
      polygon.setCoordinates(coordinates);
      return polygon;
    });
  let geometry;
  if (polygons.length > 0) {
    const multiPolygon = new MultiPolygon(polygons);
    geometry = geoJSON.writeGeometryObject(multiPolygon) as GeoJSONMultiPolygon;
  } else if (geometryType === "PointOrMultiPolygon") {
    geometry = zentroid;
  }
  return { geometry, zentroid };
}

function getValidationMessage(
  geometryType: VflzGeometryType,
  errors: FieldErrors<FieldValues>,
) {
  if (errors.geometry?.type === "required") {
    return geometryType === "MultiPolygon"
      ? "VflzMapEditor.polygonRequired"
      : "VflzMapEditor.pointOrPolygonRequired";
  } else if (errors.geometry?.type === "VALIDATION_GEOM.geometry") {
    return "VflzMapEditor.validationMessage";
  }
  return geometryType === "MultiPolygon"
    ? "VflzMapEditor.polygonSelected"
    : "VflzMapEditor.pointOrPolygonSelected";
}

function getValidationTitle(errors: FieldErrors<FieldValues>) {
  if (errors.geometry?.type === "required") {
    return "Field.errorTitle.required";
  }
  return "Field.validationTitle";
}

function isDiff(
  a?: GeoJSONMultiPolygon | GeoJSONPoint | null,
  b?: GeoJSONMultiPolygon | GeoJSONPoint | null,
) {
  // clone coordinates to avoid mutation
  let aCoordinates = clone(a?.coordinates);
  let bCoordinates = clone(b?.coordinates);
  if (aCoordinates?.length === 3) {
    aCoordinates = aCoordinates.slice(0, 2);
  }
  if (bCoordinates?.length === 3) {
    bCoordinates = bCoordinates.slice(0, 2);
  }
  return JSON.stringify(aCoordinates) !== JSON.stringify(bCoordinates);
}

function isTraceResolution(view: View) {
  return (view.getResolution() ?? 0) < 3;
}

function setControlTitle(control: oleControl, title: string) {
  control.getElement().firstElementChild?.setAttribute("title", title);
}

const XCircleIconPlaceholder = document.createElement("span");
XCircleIconPlaceholder.className = "alma-map-x-circle-icon-placeholder";

function Editor({
  setSelected,
  vflz,
}: {
  setSelected?: boolean;
  vflz?: VflzMapEditorFragment;
}) {
  const { formState, register, resetField, setValue } = useFormContext();
  const { activeLocale, t } = useI18n();
  const map = useMap();
  const [geometryType] = useSetting<VflzGeometryType>(
    "vflz.geometryType",
    "PointOrMultiPolygon",
  );

  register("geometry", { required: true });
  register("zentroid");

  if (setSelected) {
    register("selectedGeometry", { required: true });
    register("selectedZentroid");
  }

  const hasError = useMemo(() => {
    return !!(formState.errors.geometry ?? formState.errors.selectedGeometry);
  }, [formState]);

  useEffect(() => {
    setControlTitle(drawPointControl, t("VflzMapEditor.drawPoint"));
    setControlTitle(drawPolygonControl, t("VflzMapEditor.drawPolygon"));
    setControlTitle(modifyControl, t("VflzMapEditor.modify"));
    setControlTitle(differenceControl, t("VflzMapEditor.difference"));
    setControlTitle(intersectionControl, t("VflzMapEditor.intersection"));
    setControlTitle(makeValidControl, t("VflzMapEditor.makeValid"));
    setControlTitle(unionControl, t("VflzMapEditor.union"));
    setControlTitle(splitControl, t("VflzMapEditor.split"));
  }, [activeLocale, t]);

  useEffect(() => {
    editor.setMap(map);

    const updateTraceSource = () => {
      traceSource.clear();
      if (isTraceResolution(map.getView()) === false) {
        return;
      }
      map
        .getAllLayers()
        .filter((l) => {
          return (
            (l instanceof VectorLayer || l instanceof WebGLVectorLayer) &&
            l.getSource() instanceof VectorSource
          );
        })
        .forEach((l) => {
          const currentSource = l.getSource();
          if (currentSource === source) {
            const sf = modifyControl.selectInteraction.getFeatures().getArray();
            const features = source.getFeatures().filter((f) => {
              return !sf.includes(f);
            });
            traceSource.addFeatures(features);
          } else if (l.getVisible() && currentSource instanceof VectorSource) {
            traceSource.addFeatures(currentSource.getFeatures() as Feature[]);
          }
        });
    };
    const eventsKeys = map
      .getAllLayers()
      .filter((l) => {
        return (
          (l instanceof VectorLayer || l instanceof WebGLVectorLayer) &&
          l.getSource() instanceof VectorSource
        );
      })
      .map((l) => {
        return [
          l.on("change:visible", updateTraceSource),
          (l.getSource() as VectorSource).on("addfeature", updateTraceSource),
          (l.getSource() as VectorSource).on(
            "removefeature",
            updateTraceSource,
          ),
        ];
      })
      .flat();
    eventsKeys.push(source.on("change", updateTraceSource));
    eventsKeys.push(map.getLayerGroup().on("change:layers", updateTraceSource));
    updateTraceSource();

    let controlKeyUp = true;
    let shiftKeyUp = true;
    let zoomedIn = true;
    const toggleTrace = (
      event: Event | KeyboardEvent | ObjectEvent | SelectEvent,
    ) => {
      map.removeInteraction(snapInteraction);
      if (event.target instanceof View) {
        zoomedIn = isTraceResolution(event.target);
      } else if ("key" in event && event.key === "Shift") {
        shiftKeyUp = event.type === "keyup";
      } else if ("key" in event && event.key === "Control") {
        controlKeyUp = event.type === "keyup";
      }
      const isPolygonActive =
        drawPolygonControl.active ||
        (modifyControl.active &&
          modifyControl.selectInteraction
            .getFeatures()
            .getArray()
            .some((f) => {
              return f.getGeometry()?.getType() === "Polygon";
            }));
      drawPolygonControl.drawInteraction.setTrace(controlKeyUp && zoomedIn);
      if (isPolygonActive && shiftKeyUp && zoomedIn) {
        // snapInteraction needs to be added to the map AFTER tracing is activated
        map.addInteraction(snapInteraction);
      }
    };
    eventsKeys.push(map.getView().on("change:resolution", toggleTrace));
    eventsKeys.push(drawPolygonControl.on("change:active", toggleTrace));
    eventsKeys.push(modifyControl.on("change:active", toggleTrace));
    eventsKeys.push(modifyControl.selectInteraction.on("select", toggleTrace));
    document.addEventListener("keydown", toggleTrace);
    document.addEventListener("keyup", toggleTrace);

    return () => {
      editor.setMap();
      document.removeEventListener("keydown", toggleTrace);
      document.removeEventListener("keyup", toggleTrace);
      unByKey(eventsKeys);
    };
  }, [map]);

  useEffect(() => {
    if (hasError) {
      document
        .getElementsByClassName("ole-operation ole-operation-difference")[0]
        ?.insertAdjacentElement("afterend", XCircleIconPlaceholder);
    } else {
      XCircleIconPlaceholder.remove();
    }
    return () => {
      return XCircleIconPlaceholder.remove();
    };
  }, [hasError]);

  useEffect(() => {
    if (vflz?.zentroid) {
      resetField("zentroid", { defaultValue: vflz.zentroid });
    }
    if (vflz?.vflgeo?.geometry) {
      resetField("geometry", { defaultValue: vflz.vflgeo.geometry });
    }
    modifyControl.selectInteraction.getFeatures().clear();
    modifyControl.selectInteraction.dispatchEvent("select");
  }, [resetField, vflz]);

  useEffect(() => {
    const removePreviousPoints = ({ feature }: VectorSourceEvent) => {
      if (feature?.getGeometry()?.getType() === "Point") {
        source.forEachFeature((f) => {
          if (f.getGeometry()?.getType() === "Point" && f !== feature) {
            source.removeFeature(f);
          }
        });
      }
    };
    source.on("addfeature", removePreviousPoints);
    return () => {
      return source.un("addfeature", removePreviousPoints);
    };
  }, []);

  useEffect(() => {
    const updateFieldValues = (
      event:
        | DeleteEvent
        | DrawEvent
        | MakeValidEvent
        | ModifyEvent
        | OperationEvent
        | SelectEvent
        | SplitEvent
        | VectorSourceEvent,
    ) => {
      let features = source.getFeatures();
      let selectedFeatures = modifyControl.selectInteraction
        .getFeatures()
        .getArray();
      if (event instanceof DrawEvent && event.type === "drawend") {
        event.feature.set("dim", setSelected);
        if (event.feature.getGeometry()?.getType() === "Point") {
          event.feature.set("hideZentroid", false);
          features = [];
          // remove previous points
          source.forEachFeature((f) => {
            if (f.getGeometry()?.getType() === "Point" && f !== event.feature) {
              source.removeFeature(f);
            } else {
              features.push(f);
            }
          });
        }
        features.push(event.feature);
        setTimeout(() => {
          return modifyControl.activate();
        });
        selectedFeatures = [event.feature];
      }
      // MakeValidEvent, SplitEvent or OperationEvent
      if ("features" in event && Array.isArray(event.features)) {
        event.features.forEach((f) => {
          return f.set("dim", setSelected);
        });
        setTimeout(() => {
          return modifyControl.activate();
        });
        modifyControl.selectInteraction.getFeatures().clear();
      }
      if (setSelected) {
        const selectedInput = featuresToInput(geometryType, selectedFeatures);
        setValue("selectedZentroid", selectedInput.zentroid, {
          shouldDirty: isDiff(selectedInput.zentroid, vflz?.zentroid),
        });
        setValue("selectedGeometry", selectedInput.geometry, {
          shouldDirty: isDiff(selectedInput.geometry, vflz?.vflgeo?.geometry),
          shouldValidate: true,
        });
        features = features.filter((f) => {
          return !selectedFeatures.includes(f);
        });
        if (features.length === 0 && vflz?.zentroid) {
          // restore original zentroid if no features are left after selection
          const geometry = geoJSON.readGeometry(vflz.zentroid);
          if (geometry) {
            features.push(new Feature(geometry));
          }
        }
      }
      const input = featuresToInput(geometryType, features);
      setValue("zentroid", input.zentroid, {
        shouldDirty: isDiff(input.zentroid, vflz?.zentroid),
      });
      setValue("geometry", input.geometry, {
        shouldDirty: isDiff(input.geometry, vflz?.vflgeo?.geometry),
        shouldValidate: true,
      });
    };
    const eventsKeys = [
      drawPointControl.drawInteraction.on("drawend", updateFieldValues),
      drawPolygonControl.drawInteraction.on("drawend", updateFieldValues),
      modifyControl.modifyInteraction.on("modifyend", updateFieldValues),
      modifyControl.deleteInteraction.on("delete", updateFieldValues),
      modifyControl.selectInteraction.on("select", updateFieldValues),
      differenceControl.on("operation", updateFieldValues),
      intersectionControl.on("operation", updateFieldValues),
      unionControl.on("operation", updateFieldValues),
      splitControl.on("split", updateFieldValues),
      makeValidControl.on("makeValid", updateFieldValues),
      source.on("addfeature", updateFieldValues),
    ];
    return () => {
      return unByKey(eventsKeys);
    };
  }, [geometryType, setValue, vflz, setSelected]);

  return hasError ? (
    <ValidationPopover
      className="absolute top-8 left-128 z-10"
      title={t(getValidationTitle(formState.errors))}
    >
      {t(getValidationMessage(geometryType, formState.errors))}
    </ValidationPopover>
  ) : null;
}

export default function VflzMapEditor({
  setSelected,
  vflz,
}: {
  setSelected?: boolean;
  vflz?: VflzMapEditorFragment;
}) {
  const { formState } = useFormContext();
  return (
    <VflzMap
      className="h-[calc(100vh-9rem)] scroll-mt-32"
      dimFeatures={setSelected}
      settingName="editor"
      vflz={vflz}
    >
      <MapLayerTree settingName="editor">
        {(featureInfoActive) => {
          return (
            <VflzSearchLayerGroup
              featureInfoActive={featureInfoActive}
              ignoreVflzId={vflz?.vflzId}
            />
          );
        }}
      </MapLayerTree>
      <MutationInfo
        className="alma-map-widget absolute top-5 right-18 z-10 border-none"
        {...vflz?.vflgeo?.erfassungMutation}
      />
      {formState.disabled ? null : (
        <Editor setSelected={setSelected} vflz={vflz} />
      )}
    </VflzMap>
  );
}
