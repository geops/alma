import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import GeoJSON from "ol/format/GeoJSON";
import KML from "ol/format/KML";
import GroupLayer from "ol/layer/Group";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { use, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import shp, { type FeatureCollectionWithFilename } from "shpjs";

import Button from "@/components/Button";
import PlusIcon from "@/components/icons/PlusIcon";
import Input from "@/components/Input";
import Spinner from "@/components/Spinner";
import { useI18n } from "@/lib/i18n";
import { ModelContext } from "@/lib/modelContext";

import { DispatchContext, getRandomId } from "./tree";
import Widget from "./Widget";

import type BaseLayer from "ol/layer/Base";

const formatOptions = {
  dataProjection: "EPSG:4326",
  featureProjection: "EPSG:2056",
};

const geojson = new GeoJSON();

const kml = new KML();

function featureCollection2Layer(
  featureCollection: FeatureCollectionWithFilename,
) {
  return new VectorLayer({
    properties: {
      id: getRandomId(),
      title: featureCollection.fileName,
      type: "file",
    },
    source: new VectorSource({
      features: geojson.readFeatures(featureCollection, formatOptions),
    }),
  });
}

async function handleImport(
  value: FileList | string,
): Promise<BaseLayer | ImportStatus> {
  let fileType: "kml" | "zip" | undefined;
  let result: File | Response | undefined;
  let title: string | undefined;
  if (typeof value === "string") {
    result = await fetch(value);
    if (!result.ok) {
      return "fetchFailed";
    }
    const contentType = result.headers.get("content-type");
    if (contentType?.includes("kml") || value.endsWith(".kml")) {
      fileType = "kml";
    } else if (contentType?.includes("zip") || value.endsWith(".zip")) {
      fileType = "zip";
    }
    title = value;
  } else {
    result = value[0];
    if (result.type.includes("kml") || result.name.endsWith(".kml")) {
      fileType = "kml";
    } else if (result.type.includes("zip") || result.name.endsWith(".zip")) {
      fileType = "zip";
    }
    title = result.name;
  }
  let data: ArrayBuffer | string | undefined;
  if (fileType === "kml") {
    data = await result.text();
  } else if (fileType === "zip") {
    data = await result.arrayBuffer();
  } else {
    return "invalidFileType";
  }
  let featureCollection:
    FeatureCollectionWithFilename | FeatureCollectionWithFilename[] | undefined;
  if (typeof data === "string") {
    try {
      const features = kml.readFeatures(data, formatOptions);
      featureCollection = geojson.writeFeaturesObject(features, formatOptions);
      featureCollection.fileName = title;
    } catch (error) {
      console.error("KML error:", error);
      return "invalidKML";
    }
  } else if (data instanceof ArrayBuffer) {
    try {
      featureCollection = await shp(data);
    } catch (error) {
      console.error("Shapefile error:", error);
      return "invalidSHP";
    }
  }
  if (Array.isArray(featureCollection)) {
    return new GroupLayer({
      layers: featureCollection.map(featureCollection2Layer),
      properties: {
        collapsed: false,
        id: getRandomId(),
        title,
        type: "file",
      },
    });
  } else if (featureCollection) {
    return featureCollection2Layer(featureCollection);
  }
  return "invalidFile";
}

type ImportStatus =
  | "fetchFailed"
  | "invalidFile"
  | "invalidFileType"
  | "invalidKML"
  | "invalidSHP"
  | "loading";

export default function ImportFileWidget({ onClose }: { onClose: () => void }) {
  const dispatch = use(DispatchContext);
  const methods = useForm<{
    file: FileList | null;
    url: null | string;
  }>();
  const [activeTab, setActiveTab] = useState(0);
  const [status, setStatus] = useState<ImportStatus>();
  const { t } = useI18n();
  return (
    <Widget
      icon={<PlusIcon />}
      onClose={onClose}
      title={t("MapLayerTree.importFile.title")}
    >
      <div
        className="rounded-lg bg-white p-2 pt-1"
        data-test="ImportFileWidget"
      >
        <FormProvider {...methods}>
          <TabGroup defaultIndex={activeTab} onChange={setActiveTab}>
            <TabList className="border-gray-4 flex border-b">
              <Tab className="data-selected:border-b-blue-6 data-selected:text-blue-7 -mb-px border-b-2 border-transparent p-2 text-sm">
                {t("MapLayerTree.importFile.remote")}
              </Tab>
              <Tab
                className="data-selected:border-b-blue-6 data-selected:text-blue-7 -mb-px border-b-2 border-transparent p-2 text-sm"
                data-test="ImportFileWidget-local"
              >
                {t("MapLayerTree.importFile.local")}
              </Tab>
            </TabList>
            <TabPanels className="my-2">
              <TabPanel>
                <ModelContext value="MapLayerTree">
                  <Input
                    name="url"
                    placeholder={t("MapLayerTree.importFile.urlPlaceholder")}
                  />
                </ModelContext>
              </TabPanel>
              <TabPanel>
                <ModelContext value="MapLayerTree">
                  <Input name="file" type="file" />
                </ModelContext>
              </TabPanel>
            </TabPanels>
          </TabGroup>
          {status === "loading" ? (
            <Spinner className="mx-auto my-2 h-8" />
          ) : (
            <p
              className={`my-2 h-8 text-xs ${status ? "text-red-6" : "text-gray-7"}`}
              data-test={`ImportFileWidget-${status ?? "help"}`}
            >
              {t(`MapLayerTree.importFile.${status ?? "help"}`)}
            </p>
          )}
          <Button
            data-test="ImportFileWidget-import"
            disabled={status === "loading"}
            onClick={() => {
              const value = methods.getValues(activeTab === 0 ? "url" : "file");
              if (value === null) {
                return;
              }
              setStatus("loading");
              handleImport(value)
                .then((layer) => {
                  if (typeof layer === "string") {
                    setStatus(layer);
                  } else {
                    dispatch({ payload: { layer }, type: "addLayer" });
                    onClose();
                  }
                })
                .catch((error) => {
                  console.error("Import error:", error);
                  setStatus("invalidFile");
                });
            }}
            outline
          >
            {t("MapLayerTree.import")}
          </Button>
        </FormProvider>
      </div>
    </Widget>
  );
}
