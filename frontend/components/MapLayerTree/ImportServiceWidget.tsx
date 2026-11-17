import { WfsEndpoint, WmsEndpoint, WmtsEndpoint } from "@camptocamp/ogc-client";
import debounce from "lodash/debounce";
import isObject from "lodash/isObject";
import Collection from "ol/Collection";
import GroupLayer from "ol/layer/Group";
import ImageLayer from "ol/layer/Image";
import TileLayer from "ol/layer/Tile";
import ImageWMS from "ol/source/ImageWMS";
import WMTS from "ol/source/WMTS";
import { use, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import Button from "@/components/Button";
import PlusIcon from "@/components/icons/PlusIcon";
import XIcon from "@/components/icons/XIcon";
import Input from "@/components/Input";
import Spinner from "@/components/Spinner";
import { useI18n } from "@/lib/i18n";
import { ModelContext } from "@/lib/modelContext";
import useSetting from "@/lib/useSetting";

import { createWFSLayer } from "./layer";
import { DispatchContext, getRandomId } from "./tree";
import TreeItem from "./TreeItem";
import Widget from "./Widget";

import type { WmsLayerSummary } from "@camptocamp/ogc-client";
import type BaseLayer from "ol/layer/Base";
import type { ChangeEvent } from "react";

import type { GroupItem, LayerItem } from "./tree";

function isValidUrl(input: string) {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

interface ServiceResult {
  items: (GroupItem | LayerItem)[];
  type: "WFS" | "WMS" | "WMTS";
  url: string;
}

type ServiceResultInvalid =
  | "invalidResponse"
  | "invalidURL"
  | "invalidWfs"
  | "invalidWms"
  | "invalidWmts";

async function serviceResult2Layer(
  serviceResult: ServiceResult,
  layerNames: Record<string, boolean>,
): Promise<BaseLayer | undefined> {
  const selectedLayerNames = Object.entries(layerNames)
    .filter(([, checked]) => {
      return checked;
    })
    .map(([name]) => {
      return name;
    });
  if (selectedLayerNames.length === 0) {
    return;
  }
  const layers = new Collection<BaseLayer>();
  let groupTitle = "";
  if (serviceResult.type === "WFS") {
    const wfs = await new WfsEndpoint(serviceResult.url).isReady();
    groupTitle = wfs.getServiceInfo().title;
    for (const name of selectedLayerNames) {
      const item = serviceResult.items.find((i) => {
        return i.id === name;
      });
      if (!item) {
        continue;
      }
      let featureUrl = wfs.getFeatureUrl(item.id);
      const params = new URLSearchParams(featureUrl.split("?")[1]);
      params.set("VERSION", "1.1.0"); // force VERSION compatible with OpenLayers
      params.set("SRSNAME", "EPSG:2056"); // force compatible projection
      featureUrl = `${featureUrl.split("?")[0]}?${params.toString()}`;
      layers.push(
        createWFSLayer({
          id: getRandomId(),
          scaleRange: "large",
          title: item.title,
          type: "WFS",
          url: featureUrl,
          version: 1,
        }),
      );
    }
  } else if (serviceResult.type === "WMS") {
    const wms = await new WmsEndpoint(serviceResult.url).isReady();
    groupTitle = wms.getServiceInfo().title;
    for (const name of selectedLayerNames) {
      const item = serviceResult.items.find((i) => {
        return i.id === name;
      });
      if (!item) {
        continue;
      }
      const wmsLayer = wms.getLayerByName(item.id);
      if (wmsLayer) {
        layers.push(
          new ImageLayer({
            properties: {
              id: getRandomId(),
              legend: item.legend,
              title: item.title,
            },
            source: new ImageWMS({
              params: { LAYERS: wmsLayer.name },
              url: wms.getOperationUrl("GetMap"),
            }),
          }),
        );
      }
    }
  } else if (serviceResult.type === "WMTS") {
    const wmts = await new WmtsEndpoint(serviceResult.url).isReady();
    groupTitle = wmts.getServiceInfo().title;
    for (const item of serviceResult.items) {
      if (selectedLayerNames.includes(item.id)) {
        const wmtsLayer = wmts.getLayers().find((l) => {
          return l.name === item.id;
        });
        const matrixSet = wmtsLayer?.matrixSets[0];
        const resourceLink = wmtsLayer?.resourceLinks[0];
        if (wmtsLayer && matrixSet && resourceLink) {
          const dimensions = wmts.getDefaultDimensions(wmtsLayer.name);
          const tileGrid = await wmts.getOpenLayersTileGrid(
            wmtsLayer.name,
            matrixSet.identifier,
          );
          if (tileGrid) {
            layers.push(
              new TileLayer({
                properties: {
                  id: getRandomId(),
                  legend: item.legend,
                  title: item.title,
                  url: resourceLink.url,
                },
                source: new WMTS({
                  dimensions,
                  format: resourceLink.format,
                  layer: wmtsLayer.name,
                  matrixSet: matrixSet.identifier,
                  projection: matrixSet.crs,
                  requestEncoding: resourceLink.encoding,
                  style: wmtsLayer.defaultStyle,
                  tileGrid,
                  url: resourceLink.url,
                }),
              }),
            );
          }
        }
      }
    }
  }
  return layers.getLength() === 1
    ? layers.item(0)
    : new GroupLayer({
        layers,
        properties: {
          collapsed: false,
          id: getRandomId(),
          title: groupTitle,
        },
      });
}

function getWmsLayer2Item(
  items: (GroupItem | LayerItem)[],
  level = 0,
  wms: WmsEndpoint,
  parentId?: string,
) {
  return (layer: WmsLayerSummary) => {
    let newLevel = level;
    if (layer.name) {
      items.push({
        collapsed: layer.children ? true : undefined,
        id: layer.name,
        legend: wms.getLayerByName(layer.name).styles[0]?.legendUrl,
        level,
        opacity: 1,
        parentId,
        title: layer.title,
        visible: false,
      });
      newLevel = level + 1;
    }
    if (layer.children) {
      layer.children.forEach(
        getWmsLayer2Item(items, newLevel, wms, layer.name),
      );
    }
  };
}

function wms2items(wms: WmsEndpoint) {
  const items: (GroupItem | LayerItem)[] = [];
  wms.getLayers().forEach(getWmsLayer2Item(items, 0, wms));
  return items;
}

export default function ImportServiceWidget({
  onClose,
}: {
  onClose: () => void;
}) {
  const dispatch = use(DispatchContext);
  const methods = useForm<{ layers: Record<string, boolean>; url: string }>();
  const { t } = useI18n();
  const [urls, updateUrls] = useSetting<string[]>("ui.map.import.urls", []);
  const [serviceResult, setServiceResult] = useState<
    "fetchFailed" | "loading" | ServiceResult | ServiceResultInvalid
  >();

  const handleURLChange = useMemo(() => {
    return debounce((event: ChangeEvent<HTMLInputElement>) => {
      const url = event.target.value;
      if (url === "") {
        setServiceResult(undefined);
      } else if (isValidUrl(url)) {
        setServiceResult("loading");
        fetch(url)
          .then((response) => {
            return response.text();
          })
          .then((text) => {
            const runUpdateUrls = () => {
              if (urls.includes(url) === false) {
                return updateUrls(
                  [...urls, url].sort((a, b) => {
                    return a.localeCompare(b);
                  }),
                );
              }
            };
            if (text.includes("WFS_Capabilities ")) {
              new WfsEndpoint(url)
                .isReady()
                .then((wfs) => {
                  setServiceResult({
                    items: wfs.getFeatureTypes().map((featureType) => {
                      return {
                        id: featureType.name,
                        level: 0,
                        opacity: 1,
                        title: featureType.title ?? featureType.name,
                        visible: false,
                      };
                    }),
                    type: "WFS",
                    url,
                  });
                })
                .then(runUpdateUrls)
                .catch(() => {
                  return setServiceResult("invalidWfs");
                });
            } else if (text.includes("<WMS_Capabilities ")) {
              new WmsEndpoint(url)
                .isReady()
                .then((wms) => {
                  setServiceResult({
                    items: wms2items(wms),
                    type: "WMS",
                    url,
                  });
                })
                .then(runUpdateUrls)
                .catch(() => {
                  return setServiceResult("invalidWms");
                });
            } else if (text.includes("Capabilities ")) {
              new WmtsEndpoint(url)
                .isReady()
                .then((wmts) => {
                  setServiceResult({
                    items: wmts.getLayers().map((layer) => {
                      return {
                        id: layer.name,
                        legend: layer.styles[0]?.legendUrl,
                        level: 0,
                        opacity: 1,
                        title:
                          "title" in layer && typeof layer.title === "string"
                            ? layer.title
                            : layer.name,
                        visible: false,
                      };
                    }),
                    type: "WMTS",
                    url,
                  });
                })
                .then(runUpdateUrls)
                .catch(() => {
                  return setServiceResult("invalidWmts");
                });
            } else {
              setServiceResult("invalidResponse");
            }
          })
          .catch(() => {
            return setServiceResult("fetchFailed");
          });
      } else {
        setServiceResult("invalidURL");
      }
    }, 300);
  }, [urls, updateUrls]);

  const isParentVisible = (item: GroupItem | LayerItem): boolean => {
    if (!item.parentId) {
      return true;
    }
    const parent =
      isObject(serviceResult) &&
      serviceResult.items.find((p) => {
        return p.id === item.parentId;
      });
    return parent && "collapsed" in parent
      ? !parent.collapsed && isParentVisible(parent)
      : true;
  };

  return (
    <Widget
      icon={<PlusIcon />}
      onClose={onClose}
      title={t("MapLayerTree.importService.title")}
    >
      <FormProvider {...methods}>
        <div className="rounded-lg bg-white p-2">
          <ModelContext value="MapLayerTree">
            <Input
              name="url"
              onChange={handleURLChange}
              placeholder={t("MapLayerTree.importService.urlPlaceholder")}
            />
          </ModelContext>
          <div className="border-gray-4 max-h-[calc(100vh-26rem)] overflow-x-hidden overflow-y-scroll rounded-lg border shadow-lg">
            {serviceResult === "fetchFailed" ||
            serviceResult === "invalidResponse" ||
            serviceResult === "invalidURL" ? (
              <div className="text-red-6 my-4 flex h-8 items-center justify-center space-x-1 text-sm">
                <span>{t(`MapLayerTree.importService.${serviceResult}`)}</span>
                <button
                  onClick={() => {
                    methods.setValue("url", "");
                    setServiceResult(undefined);
                  }}
                  type="button"
                >
                  <XIcon />
                </button>
              </div>
            ) : null}
            {serviceResult === "loading" ? (
              <Spinner className="mx-auto my-4 h-8" />
            ) : null}
            {isObject(serviceResult) ? (
              <ul className="my-2" data-test="MapLayerTree-import-items">
                {serviceResult.items.filter(isParentVisible).map((item) => {
                  return (
                    <TreeItem
                      key={item.id}
                      onChange={(id, checked) => {
                        return methods.setValue("layers", {
                          ...methods.getValues("layers"),
                          [id]: checked,
                        });
                      }}
                      onCollapse={(id, collapsed) => {
                        return setServiceResult({
                          ...serviceResult,
                          items: serviceResult.items.map((i) => {
                            return i.id === id ? { ...i, collapsed } : i;
                          }),
                        });
                      }}
                      {...item}
                    />
                  );
                })}
              </ul>
            ) : null}
            {!serviceResult ? (
              <ul className="p-0.5" data-test="MapLayerTree-import-urls">
                {urls.map((u) => {
                  return (
                    <li key={u} title={u}>
                      <button
                        className="hover:bg-blue-1 w-full truncate rounded p-1 text-left text-xs"
                        onClick={() => {
                          methods.setValue("url", u);
                          const event = { target: { value: u } };
                          handleURLChange(
                            event as ChangeEvent<HTMLInputElement>,
                          );
                        }}
                        type="button"
                      >
                        {u}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
          {isObject(serviceResult) ? (
            <Button
              className="mt-4"
              data-test="MapLayerTree-run-import-service"
              onClick={() => {
                const layerNames = methods.getValues("layers");
                serviceResult2Layer(serviceResult, layerNames)
                  .then((layer) => {
                    if (layer) {
                      dispatch({ payload: { layer }, type: "addLayer" });
                    }
                    onClose();
                  })
                  .catch((error) => {
                    console.error(error);
                    onClose();
                  });
              }}
              outline
            >
              {t("MapLayerTree.import")}
            </Button>
          ) : null}
        </div>
      </FormProvider>
    </Widget>
  );
}
