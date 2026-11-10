"use client";
import { Zoom, ZoomSlider, ZoomToExtent } from "ol/control";
import { type Extent, isEmpty } from "ol/extent";
import ImageLayer from "ol/layer/Image";
import TileLayer from "ol/layer/Tile";
import { get as getProj } from "ol/proj";
import { register } from "ol/proj/proj4";
import ImageWMS from "ol/source/ImageWMS";
import TileWMS from "ol/source/TileWMS";
import View from "ol/View";
import proj4 from "proj4";
import { memo, useEffect, useMemo, useState } from "react";
import Control from "react-spatial/Control";
import Map from "react-spatial/Map";
import useMap from "react-spatial/useMap";

import CheckIcon from "@/components/icons/CheckIcon";
import ChevronIcon from "@/components/icons/ChevronIcon";
import { useI18n } from "@/lib/i18n";
import useCurrentUser from "@/lib/useCurrentUser";
import useSetting from "@/lib/useSetting";

import type { CSSProperties, PropsWithChildren } from "react";

type SettingName = "editor" | "search" | "vflz";

proj4.defs(
  "EPSG:2056",
  "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs",
);
register(proj4);

// TODO: set tip labels based on translations
const controls = [new ZoomSlider(), new Zoom()];

interface BaseLayerConfig {
  key: string;
  label?: string;
  label_de?: string;
  label_en?: string;
  label_fr?: string;
  label_it?: string;
  layer: string;
  tiled?: boolean;
  url: string;
}

function BaseLayer({
  hideControls = false,
  layers = [],
  settingName,
}: {
  hideControls?: boolean;
  layers?: BaseLayerConfig[];
  settingName?: SettingName;
}) {
  const { activeLocale, t } = useI18n();
  const map = useMap();
  const [activeLayer, setActiveLayer] = useState(layers.at(0));
  const [isOpen, setIsOpen] = useState(false);
  const { getSetting, updateSetting } = useCurrentUser();
  const key = getSetting<string>(`mapBaseLayer.${settingName}`, "");

  useEffect(() => {
    const targetLayer =
      layers.find((layer) => {
        return layer.key === key;
      }) ?? layers.at(0);
    if (!targetLayer || targetLayer === activeLayer) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      setActiveLayer(targetLayer);
    });
    return () => {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    };
  }, [activeLayer, key, layers]);

  useEffect(() => {
    const sourceOptions = {
      params: { LAYERS: activeLayer?.layer },
      url: activeLayer?.url,
    };
    const baseLayer =
      activeLayer?.tiled === false
        ? new ImageLayer({
            source: new ImageWMS({
              ...sourceOptions,
              hidpi: false,
              ratio: 1,
            }),
          })
        : new TileLayer({ source: new TileWMS(sourceOptions) });
    map.getLayers().insertAt(0, baseLayer);
    return () => {
      return map.removeLayer(baseLayer) && undefined;
    };
  }, [activeLayer, map]);

  if (hideControls) {
    return null;
  }

  return (
    <div
      className={`alma-map-base-layer ${isOpen ? "alma-map-base-layer-open" : ""}`}
      style={{ "--alma-map-base-layer-count": layers.length } as CSSProperties}
    >
      <button
        className="alma-map-base-layer-toggle"
        onClick={() => {
          return setIsOpen((open) => {
            return !open;
          });
        }}
        type="button"
      >
        {isOpen ? (
          <ChevronIcon />
        ) : (
          <>
            <img
              alt={`Baselayer ${activeLayer?.key} selected`}
              onError={(event) => {
                if (event.currentTarget.src !== `/map/baselayer-empty.png`) {
                  event.currentTarget.src = `/map/baselayer-empty.png`;
                }
              }}
              src={`/map/baselayer-${activeLayer?.key}.png`}
            />
            <span>{t("Map.BaseLayer.label")}</span>
          </>
        )}
      </button>
      {isOpen &&
        layers.map((layer) => {
          const isActive = activeLayer?.key === layer.key;
          return (
            <button
              className={isActive ? "alma-map-base-layer-active" : ""}
              data-test={`BaseLayer-${layer.key}`}
              key={layer.key}
              onClick={() => {
                setActiveLayer(layer);
                setIsOpen(false);
                if (settingName) {
                  void updateSetting(`mapBaseLayer.${settingName}`, layer.key);
                }
              }}
              type="button"
            >
              <img
                alt={`Baselayer ${layer.key}`}
                onError={(event) => {
                  if (event.currentTarget.src !== `/map/baselayer-empty.png`) {
                    event.currentTarget.src = `/map/baselayer-empty.png`;
                  }
                }}
                src={`/map/baselayer-${layer.key}.png`}
              />
              {isActive && <CheckIcon />}
              <span>
                {t(`Map.BaseLayer.${layer.key}`) ||
                  layer[`label_${activeLocale}`] ||
                  layer.label ||
                  layer.key}
              </span>
            </button>
          );
        })}
    </div>
  );
}

const defaultBaseLayers = [
  {
    key: "aerial",
    layer: "ch.swisstopo.swissimage",
    url: "https://wms.geo.admin.ch",
  },
  {
    key: "map-color",
    layer: "ch.swisstopo.pixelkarte-farbe",
    url: "https://wms.geo.admin.ch",
  },
  {
    key: "map-gray",
    layer: "ch.swisstopo.pixelkarte-grau",
    url: "https://wms.geo.admin.ch",
  },
];

export const defaultMaxExtent = [2485000, 1064000, 2835000, 1300000];

function AlmaMap({
  baseLayerKey,
  children,
  className = "",
  hideControls = false,
  settingName,
  zoomExtent,
}: PropsWithChildren<{
  baseLayerKey?: string;
  className?: string;
  hideControls?: boolean;
  mapControls?: "default" | "none";
  settingName?: SettingName;
  zoomExtent?: Extent;
}>) {
  const [baseLayers] = useSetting<BaseLayerConfig[]>(
    "ui.map.baseLayers",
    defaultBaseLayers,
  );
  const [maxExtent] = useSetting<Extent>("ui.map.maxExtent", defaultMaxExtent);

  const sortedBaseLayers = useMemo(() => {
    if (!baseLayerKey) {
      return baseLayers;
    }

    const sorted = baseLayers.sort((a, b) => {
      if (a.key === baseLayerKey) {
        return -1;
      }
      if (b.key === baseLayerKey) {
        return 1;
      }
      return 0;
    });
    return sorted;
  }, [baseLayerKey, baseLayers]);

  const view = useMemo(() => {
    return new View({ extent: maxExtent, projection: getProj("EPSG:2056")! });
  }, [maxExtent]);

  const zoomToExtentControl = useMemo(() => {
    return new ZoomToExtent({ extent: zoomExtent, label: "" });
  }, [zoomExtent]);

  useEffect(() => {
    view.getProjection().setExtent(maxExtent);
    // wait for the map to be rendered
    const timeoutID = setTimeout(() => {
      if (zoomExtent && !isEmpty(zoomExtent)) {
        view.fit(zoomExtent);
      } else if (maxExtent) {
        view.fit(maxExtent);
      }
    });
    return () => {
      return clearTimeout(timeoutID);
    };
  }, [maxExtent, zoomExtent, view]);

  return (
    <Map
      className={`alma-map-container relative ${className}`}
      controls={hideControls ? [] : controls}
      id="map"
      interactions={hideControls ? [] : undefined}
      view={view}
    >
      <BaseLayer
        hideControls={hideControls}
        layers={sortedBaseLayers}
        settingName={settingName}
      />
      {!hideControls && <Control control={zoomToExtentControl} />}
      {children}
    </Map>
  );
}
export default memo(AlmaMap);
