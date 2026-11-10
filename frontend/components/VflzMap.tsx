import { useRouter } from "next/router";
import { asArray, type Color } from "ol/color";
import { buffer, type Extent } from "ol/extent";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import MultiPolygon from "ol/geom/MultiPolygon";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Fill, Icon, Stroke, Style } from "ol/style";
import { memo, type PropsWithChildren, useEffect, useState } from "react";
import Layer from "react-spatial/Layer";
import useMap from "react-spatial/useMap";

import Map from "@/components/Map";
import isPointResolution from "@/lib/isPointResolution";

import type { StyleFunction } from "ol/style/Style";

import type { VflzMapFragment } from "@/lib/graphql";

const geoJSON = new GeoJSON();

export const iconProps = { displacement: [0, 18], scale: 0.75 };

function getStyle(color: Color = [0, 0, 0]): StyleFunction {
  return (feature, r) => {
    const dim = feature?.get("dim") as boolean | undefined;
    const hideZentroid = feature?.get("hideZentroid") as boolean | undefined;
    const isVflgeo = feature?.get("isVflgeo") as boolean | undefined;
    const isHiddenZentroid = !isPointResolution(r) && hideZentroid && !isVflgeo;
    const isHiddenPolygon = isPointResolution(r) && hideZentroid === undefined;
    return [
      new Style({
        image: isHiddenZentroid
          ? undefined
          : new Icon({
              ...iconProps,
              src: dim ? "/map/pin-dim.svg" : "/map/pin-active.svg",
            }),
        zIndex: dim ? 0 : 1,
      }),
      new Style({
        fill: isHiddenPolygon
          ? undefined
          : new Fill({ color: [...color, 0.5] }),
        image: isHiddenZentroid
          ? undefined
          : new Icon({ ...iconProps, color, src: "/map/pin.svg" }),
        stroke: isHiddenPolygon
          ? undefined
          : new Stroke({ color: dim ? "#277277" : "#4EE4FF", width: 3 }),
        zIndex: dim ? 0 : 1,
      }),
    ];
  };
}

export const source = new VectorSource();

export const layer = new VectorLayer({ source, style: getStyle() });

function getSourceExtent() {
  const extent = source.getExtent();
  return extent ? buffer(extent, 80) : undefined;
}

function RenderCompleteIndicator() {
  const map = useMap();
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const onRendercomplete = () => {
      return setIsComplete(true);
    };
    map.once("rendercomplete", onRendercomplete);
    return () => {
      return map.un("rendercomplete", onRendercomplete);
    };
  }, [map]);

  return <div className="hidden" id={isComplete ? "rendercomplete" : ""} />;
}

function VflzMap({
  baseLayerKey,
  children,
  className,
  dimFeatures = false,
  hideControls = false,
  hideZentroid = false,
  settingName = "vflz",
  updateExtent = false,
  vflz,
}: PropsWithChildren<{
  baseLayerKey?: string;
  className?: string;
  dimFeatures?: boolean;
  hideControls?: boolean;
  hideZentroid?: boolean;
  settingName?: "editor" | "vflz";
  updateExtent?: boolean;
  vflz?: VflzMapFragment;
}>) {
  const router = useRouter();
  const [zoomExtent, setZoomExtent] = useState<Extent>();

  useEffect(() => {
    const dim = dimFeatures;
    let isVflgeo = false;
    const features: Feature[] = [];
    if (vflz?.vflgeo?.geometry) {
      const geo = geoJSON.readGeometry(vflz.vflgeo.geometry);
      if (geo instanceof MultiPolygon) {
        const ps = geo.getPolygons();
        features.push(
          ...ps.map((geometry) => {
            return new Feature({ dim, geometry });
          }),
        );
      } else {
        isVflgeo = true;
      }
    }
    if (vflz && "zentroid" in vflz && vflz.zentroid) {
      const geometry = geoJSON.readGeometry(vflz.zentroid);
      if (geometry) {
        features.push(new Feature({ dim, geometry, hideZentroid, isVflgeo }));
      }
    }
    source.clear();
    let frame: number | undefined;
    if (features.length > 0) {
      source.addFeatures(features);
      // if updateExtent is true, always set zoom extent to source extent
      // else only set zoom extent on initial load, handled by router events afterwards
      frame = requestAnimationFrame(() => {
        setZoomExtent((ext) => {
          const nextExtent = getSourceExtent();
          return updateExtent || !ext ? nextExtent : ext;
        });
      });
    } else {
      frame = requestAnimationFrame(() => {
        setZoomExtent(undefined);
      });
    }
    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [dimFeatures, hideZentroid, updateExtent, vflz]);

  useEffect(() => {
    const setExtent = (url: string, { shallow }: { shallow: boolean }) => {
      if (shallow === false && updateExtent === false) {
        source.once("addfeature", () => {
          return setZoomExtent(getSourceExtent());
        });
      }
    };
    router.events.on("routeChangeComplete", setExtent);
    return () => {
      return router.events.off("routeChangeComplete", setExtent);
    };
  }, [router, updateExtent]);

  useEffect(() => {
    const color = vflz?.beurteilung?.kbsInfo?.color
      ? [...asArray(vflz.beurteilung.kbsInfo.color)].splice(0, 3)
      : [0, 0, 0];
    layer.setStyle(getStyle(color));
  }, [vflz?.beurteilung?.kbsInfo?.color]);

  return (
    <Map
      baseLayerKey={baseLayerKey}
      className={className}
      hideControls={hideControls}
      settingName={settingName}
      zoomExtent={zoomExtent}
    >
      <Layer layer={layer}>{children}</Layer>
      <RenderCompleteIndicator />
    </Map>
  );
}
export default memo(VflzMap);
