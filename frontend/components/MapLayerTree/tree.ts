import { arrayMove } from "@dnd-kit/sortable";
import * as Sentry from "@sentry/nextjs";
import Collection from "ol/Collection";
import GroupLayer from "ol/layer/Group";
import ImageLayer from "ol/layer/Image";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import WebGLVectorLayer from "ol/layer/WebGLVector";
import ImageWMS from "ol/source/ImageWMS";
import WMTS from "ol/source/WMTS";
import WMTSTileGrid from "ol/tilegrid/WMTS";
import { createContext } from "react";
import { z } from "zod";

import { createWFSLayer } from "./layer";

import type BaseLayer from "ol/layer/Base";

export interface LayerItem {
  id: string;
  legend?: string;
  level: number;
  opacity: number;
  parentId?: string;
  readonly?: boolean;
  scaleRange?: "large";
  title: string;
  visible: boolean;
}

export type GroupItem = {
  collapsed: boolean;
  indeterminate: boolean;
} & LayerItem;

const settingBaseSchema = z.object({
  id: z.string().min(1),
  opacity: z.number().min(0).max(1).optional(),
  scaleRange: z.enum(["large"]).optional(),
  version: z.number().min(1),
  visible: z.boolean().optional(),
});

export const SettingLayerItemSchema = settingBaseSchema.extend({
  type: z.literal("Layer"),
});

export const SettingWFSItemSchema = settingBaseSchema.extend({
  title: z.string().min(1),
  type: z.literal("WFS"),
  url: z.string().min(1),
});

export const SettingWMSItemSchema = settingBaseSchema.extend({
  legend: z.string().optional(),
  name: z.string().min(1),
  title: z.string().min(1),
  type: z.literal("WMS"),
  url: z.string().min(1),
});

export const SettingWMTSItemSchema = settingBaseSchema.extend({
  dimensions: z.record(z.string(), z.string()),
  format: z.string().min(1),
  layer: z.string().min(1),
  legend: z.string().optional(),
  matrixSet: z.string().min(1),
  projection: z.string().min(1),
  requestEncoding: z.enum(["KVP", "REST"]),
  style: z.string().min(1),
  tileGrid: z
    .object({
      matrixIds: z.array(z.string().min(1)),
      origins: z.array(z.array(z.number())),
      resolutions: z.array(z.number()),
      sizes: z.array(z.array(z.number())),
    })
    .strict(),
  title: z.string().min(1),
  type: z.literal("WMTS"),
  url: z.string().min(1),
});

export const SettingGroupItemSchema = settingBaseSchema.extend({
  collapsed: z.boolean().optional(),
  // hiddenLayers: z.array(z.string()).optional(),
  items: z.array(
    z.discriminatedUnion("type", [
      SettingLayerItemSchema,
      SettingWFSItemSchema,
      SettingWMSItemSchema,
      SettingWMTSItemSchema,
    ]),
  ),
  title: z.string().min(1),
  type: z.literal("Group"),
});

const SettingItemSchema = z.discriminatedUnion("type", [
  SettingLayerItemSchema,
  SettingWFSItemSchema,
  SettingWMSItemSchema,
  SettingWMTSItemSchema,
  SettingGroupItemSchema,
]);

export const SettingItemsSchema = z.array(SettingItemSchema);

export type SettingLayerItem = z.infer<typeof SettingLayerItemSchema>;
export type SettingGroupItem = z.infer<typeof SettingGroupItemSchema>;
export type SettingWFSItem = z.infer<typeof SettingWFSItemSchema>;
export type SettingWMSItem = z.infer<typeof SettingWMSItemSchema>;
export type SettingWMTSItem = z.infer<typeof SettingWMTSItemSchema>;
export type SettingItem = z.infer<typeof SettingItemSchema>;

export type Tree = Collection<BaseLayer>;

export const DispatchContext = createContext<React.Dispatch<LayerTreeAction>>(
  () => {
    return undefined;
  },
);

export const SCALE_RANGE_MAX_RESOLUTION: Record<string, number> = {
  large: 5,
};

function getScaleRange(layer: BaseLayer): "large" | undefined {
  const maxResolution = layer.getMaxResolution();
  for (const [key, value] of Object.entries(SCALE_RANGE_MAX_RESOLUTION)) {
    if (maxResolution === value) {
      return key as "large";
    }
  }
  return undefined;
}

function getLayer2Item(
  items: (GroupItem | LayerItem)[],
  level = 0,
  parentId?: string,
  parentReadonly = false,
) {
  return (layer: BaseLayer) => {
    const id = layer.get("id") as string | undefined;
    const layerReadonly = layer.get("readonly") as boolean | undefined;
    const readonly = parentReadonly || layerReadonly;
    const title = layer.get("title") as string | undefined;
    if (id === undefined || title === undefined) {
      return;
    }
    const opacity = layer.getOpacity();
    const scaleRange = getScaleRange(layer);
    const visible = layer.getVisible();
    const item = {
      id,
      level,
      opacity,
      parentId,
      readonly,
      scaleRange,
      title,
      visible,
    };
    if (layer instanceof GroupLayer) {
      const hiddenLayers = layer.get("hiddenLayers") as string[] | undefined;
      items.push({
        ...item,
        collapsed: layer.get("collapsed") as boolean | undefined,
        indeterminate: layer.get("indeterminate") as boolean | undefined,
      });
      if (layer.get("collapsed") === false) {
        layer
          .getLayers()
          .getArray()
          .filter((l) => {
            return hiddenLayers === undefined
              ? true
              : !hiddenLayers.includes(l.get("id") as string);
          })
          .reverse()
          .forEach(getLayer2Item(items, level + 1, id, !!readonly));
      }
    } else {
      const legend = layer.get("legend") as string | undefined;
      items.push({ ...item, legend });
    }
  };
}

export function getRandomId() {
  return Math.random().toString(36).substring(2, 9);
}

interface LayerLocation {
  collection: Collection<BaseLayer>;
  index: number;
  layer: BaseLayer;
  parentGroup?: GroupLayer;
}

function findLayerLocation(tree: Tree, id: string): LayerLocation | undefined {
  for (let index = 0; index < tree.getLength(); index++) {
    const layer = tree.item(index);
    if (layer.get("id") === id) {
      return { collection: tree, index, layer };
    }

    if (!(layer instanceof GroupLayer)) {
      continue;
    }

    const subLayers = layer.getLayers();
    for (let subIndex = 0; subIndex < subLayers.getLength(); subIndex++) {
      const subLayer = subLayers.item(subIndex);
      if (subLayer.get("id") === id) {
        return {
          collection: subLayers,
          index: subIndex,
          layer: subLayer,
          parentGroup: layer,
        };
      }
    }
  }

  return undefined;
}

function updateLayerById(
  tree: Tree,
  id: string,
  updater: (location: LayerLocation) => void,
) {
  const location = findLayerLocation(tree, id);
  if (location) {
    updater(location);
  }

  return new Collection<BaseLayer>(tree.getArray());
}

function findRootLayerById(tree: Collection<BaseLayer>, id: string) {
  return tree.getArray().find((layer) => {
    return layer.get("id") === id;
  });
}

interface AddLayerAction {
  payload: {
    layer: BaseLayer;
  };
  type: "addLayer";
}

interface MoveLayerAction {
  payload: {
    actionId: string;
    id: string;
    level: number;
    overId?: string;
  };
  type: "moveLayer";
}

interface RemoveLayerAction {
  payload: {
    id: string;
  };
  type: "removeLayer";
}

interface RenameLayerAction {
  payload: {
    id: string;
    title: string;
  };
  type: "renameLayer";
}

interface SetVisibleAction {
  payload: {
    id: string;
    visible: boolean;
  };
  type: "setVisible";
}

interface SetOpacityAction {
  payload: {
    id: string;
    opacity: number;
  };
  type: "setOpacity";
}

interface SetScaleRangeAction {
  payload: {
    id: string;
    scaleRange?: "large";
  };
  type: "setScaleRange";
}

interface SetCollapsedAction {
  payload: {
    collapsed: boolean;
    id: string;
  };
  type: "setCollapsed";
}

function addLayer(tree: Tree, action: AddLayerAction): Tree {
  if (
    tree.getArray().find((l) => {
      return l === action.payload.layer;
    }) === undefined
  ) {
    const index = tree.getArray().findLastIndex((l) => {
      return l.get("title");
    });
    tree.insertAt(index < 0 ? 0 : index + 1, action.payload.layer);
  }
  return new Collection<BaseLayer>(tree.getArray());
}

function moveLayer(tree: Tree, action: MoveLayerAction): Tree {
  const previousSingleActionIds =
    (tree.get("singleActionIds") as string[] | undefined) ?? [];
  const singleActionIds = [...previousSingleActionIds];
  const addSingleActionId = (actionId: string) => {
    if (!singleActionIds.includes(actionId)) {
      singleActionIds.push(actionId);
    }
    if (singleActionIds.length > 25) {
      singleActionIds.splice(0, singleActionIds.length - 25);
    }
  };

  if (previousSingleActionIds.includes(action.payload.actionId)) {
    const nextSingleActionIds = previousSingleActionIds.filter((id) => {
      return id !== action.payload.actionId;
    });
    const nextTree = new Collection<BaseLayer>(tree.getArray());
    nextTree.set("singleActionIds", nextSingleActionIds);
    return nextTree;
  }

  let foundTree = tree;
  let foundIndex: number | undefined;
  let foundLayer: BaseLayer | undefined;

  for (let i = 0; i < tree.getLength(); i++) {
    const l = tree.item(i);
    if (l.get("id") === action.payload.id) {
      foundIndex = i;
      foundLayer = l;
      break;
    }
    if (l instanceof GroupLayer) {
      for (let j = 0; j < l.getLayers().getLength(); j++) {
        if (l.getLayers().item(j).get("id") === action.payload.id) {
          foundLayer = l.getLayers().item(j);
          foundIndex = j;
          foundTree = l.getLayers();
          break;
        }
      }
      if (foundLayer) {
        break;
      }
    }
  }

  if (
    action.payload.id === action.payload.overId &&
    foundLayer?.get("level") === action.payload.level
  ) {
    return tree;
  }

  if (foundIndex !== undefined && foundTree && foundLayer) {
    for (let i = 0; i < tree.getLength(); i++) {
      const layer = tree.item(i);
      if (layer.get("id") === action.payload.overId) {
        const prevLayer = tree.item(i - 1);
        if (action.payload.level === 0 && foundTree === tree) {
          // move layer at root level
          addSingleActionId(action.payload.actionId);
          const nextTree = new Collection(
            arrayMove(tree.getArray(), foundIndex, i),
          );
          nextTree.set("singleActionIds", singleActionIds);
          return nextTree;
        } else if (action.payload.id === action.payload.overId) {
          if (prevLayer instanceof GroupLayer) {
            if (
              prevLayer.get("readonly") === true &&
              foundTree !== prevLayer.getLayers()
            ) {
              return new Collection<BaseLayer>(tree.getArray());
            }
            tree.remove(foundLayer);
            prevLayer.getLayers().push(foundLayer);
          } else if (prevLayer?.get("id") !== undefined) {
            tree.remove(prevLayer);
            tree.remove(foundLayer);
            const group = new GroupLayer({
              layers: new Collection<BaseLayer>([prevLayer, foundLayer]),
              properties: {
                collapsed: false,
                id: getRandomId(),
                title: prevLayer.get("title") as string,
              },
            });
            tree.insertAt(i - 1, group);
          }
        } else if (
          foundLayer instanceof GroupLayer &&
          layer instanceof GroupLayer
        ) {
          if (layer.get("readonly") === true) {
            return new Collection<BaseLayer>(tree.getArray());
          }
          // move group into group
          tree.remove(foundLayer);
          layer.getLayers().extend(foundLayer.getLayers().getArray());
          addSingleActionId(action.payload.actionId);
        } else if (layer instanceof GroupLayer && action.payload.level === 1) {
          if (layer.get("readonly") === true) {
            return new Collection<BaseLayer>(tree.getArray());
          }
          foundTree.remove(foundLayer);
          layer.getLayers().push(foundLayer);
          addSingleActionId(action.payload.actionId);
        } else if (
          prevLayer instanceof GroupLayer &&
          action.payload.level === 1
        ) {
          if (
            prevLayer.get("readonly") === true &&
            foundTree !== prevLayer.getLayers()
          ) {
            return new Collection<BaseLayer>(tree.getArray());
          }
          foundTree.remove(foundLayer);
          prevLayer.getLayers().push(foundLayer);
          addSingleActionId(action.payload.actionId);
        } else if (foundTree === tree && layer instanceof GroupLayer) {
          if (layer.get("readonly") === true) {
            return new Collection<BaseLayer>(tree.getArray());
          }
          foundTree.remove(foundLayer);
          layer.getLayers().push(foundLayer);
          addSingleActionId(action.payload.actionId);
        } else if (foundTree === tree) {
          tree.remove(layer);
          tree.remove(foundLayer);
          const group = new GroupLayer({
            layers: new Collection<BaseLayer>([layer, foundLayer]),
            properties: {
              collapsed: false,
              id: getRandomId(),
              title: layer.get("title") as string,
            },
          });
          tree.insertAt(i - 1, group);
        } else {
          foundTree.remove(foundLayer);
          tree.insertAt(i + 1, foundLayer);
          addSingleActionId(action.payload.actionId);
        }
        break;
      }
      if (layer instanceof GroupLayer) {
        let found = false;
        for (let j = 0; j < layer.getLayers().getLength(); j++) {
          if (layer.getLayers().item(j).get("id") === action.payload.overId) {
            if (foundTree === layer.getLayers() && action.payload.level === 1) {
              layer.setLayers(
                new Collection(arrayMove(foundTree.getArray(), foundIndex, j)),
              );
              addSingleActionId(action.payload.actionId);
            } else if (action.payload.level === 0) {
              let insertIndex = i;
              if (foundTree === layer.getLayers()) {
                insertIndex = i;
              } else if (foundTree === tree && foundIndex < i) {
                insertIndex = i - 1;
              }
              foundTree.remove(foundLayer);
              tree.insertAt(insertIndex, foundLayer);
              addSingleActionId(action.payload.actionId);
            } else if (action.payload.level === 1) {
              if (
                layer.get("readonly") === true &&
                foundTree !== layer.getLayers()
              ) {
                return new Collection<BaseLayer>(tree.getArray());
              }
              foundTree.remove(foundLayer);
              layer.getLayers().insertAt(j + 1, foundLayer);
              addSingleActionId(action.payload.actionId);
            }
            found = true;
            break;
          }
        }
        if (found) {
          break;
        }
      }
    }
  }
  tree.set("singleActionIds", singleActionIds);
  const nextTree = new Collection<BaseLayer>(tree.getArray());
  nextTree.set("singleActionIds", singleActionIds);
  return nextTree;
}

function removeLayer(tree: Tree, action: RemoveLayerAction): Tree {
  return updateLayerById(tree, action.payload.id, (location) => {
    if (location.parentGroup && location.collection.getLength() === 1) {
      tree.remove(location.parentGroup);
      return;
    }

    location.collection.remove(location.layer);
  });
}

function renameLayer(tree: Tree, action: RenameLayerAction): Tree {
  return updateLayerById(tree, action.payload.id, ({ layer }) => {
    layer.set("title", action.payload.title);
  });
}

function setOpacity(tree: Tree, action: SetOpacityAction): Tree {
  return updateLayerById(tree, action.payload.id, ({ layer }) => {
    layer.setOpacity(action.payload.opacity);
  });
}

function setScaleRange(tree: Tree, action: SetScaleRangeAction): Tree {
  return updateLayerById(tree, action.payload.id, ({ layer }) => {
    layer.setMaxResolution(
      action.payload.scaleRange
        ? SCALE_RANGE_MAX_RESOLUTION[action.payload.scaleRange]
        : Infinity,
    );
  });
}

function setCollapsed(tree: Tree, action: SetCollapsedAction): Tree {
  return updateLayerById(tree, action.payload.id, ({ layer }) => {
    if (layer instanceof GroupLayer) {
      layer.set("collapsed", action.payload.collapsed);
    }
  });
}

function setVisible(tree: Tree, action: SetVisibleAction): Tree {
  for (const l1 of tree.getArray()) {
    if (l1 instanceof GroupLayer) {
      const all = l1.get("id") === action.payload.id;
      const subLayers = l1.getLayers().getArray();
      let found = all && subLayers.length === 0;
      for (const l2 of subLayers) {
        if (l2.get("id") === action.payload.id || all) {
          l2.setVisible(action.payload.visible);
          found = true;
        }
      }
      if (found) {
        if (subLayers.length === 0) {
          l1.set("indeterminate", false);
          l1.setVisible(action.payload.visible);
        } else {
          const allVisible = subLayers.every((l) => {
            return l.getVisible();
          });
          const allHidden = subLayers.every((l) => {
            return !l.getVisible();
          });
          l1.set("indeterminate", !allVisible && !allHidden);
          if (allHidden) {
            l1.setVisible(false);
          } else {
            l1.setVisible(true);
          }
        }
        break;
      }
    }
    if (l1.get("id") === action.payload.id) {
      l1.setVisible(action.payload.visible);
      break;
    }
  }
  return new Collection<BaseLayer>(tree.getArray());
}

type LayerTreeAction =
  | AddLayerAction
  | MoveLayerAction
  | RemoveLayerAction
  | RenameLayerAction
  | SetCollapsedAction
  | SetOpacityAction
  | SetScaleRangeAction
  | SetVisibleAction;

export function layerTreeReducer(tree: Tree, action: LayerTreeAction) {
  switch (action.type) {
    case "addLayer":
      return addLayer(tree, action);
    case "moveLayer":
      return moveLayer(tree, action);
    case "removeLayer":
      return removeLayer(tree, action);
    case "renameLayer":
      return renameLayer(tree, action);
    case "setCollapsed":
      return setCollapsed(tree, action);
    case "setOpacity":
      return setOpacity(tree, action);
    case "setScaleRange":
      return setScaleRange(tree, action);
    case "setVisible":
      return setVisible(tree, action);
    default:
      return tree;
  }
}

function settings2TreeInternal(data: unknown, ids: Set<string>): Tree {
  const tree = new Collection<BaseLayer>();

  const parsedItems = SettingItemsSchema.safeParse(data);
  if (!parsedItems.success) {
    Sentry.captureException(new Error("Failed to parse layer settings"), {
      extra: { parsedItems },
    });
    return tree;
  }

  parsedItems.data.forEach((item) => {
    if (item.version !== 1) {
      return;
    }
    if (ids.has(item.id)) {
      return;
    }
    ids.add(item.id);

    let layer;
    if (item.type === "Layer") {
      layer = new VectorLayer({
        properties: { id: item.id },
        visible: item.visible,
      });
    } else if (item.type === "Group") {
      layer = new GroupLayer({
        layers: settings2TreeInternal(item.items, ids),
        properties: {
          collapsed: item.collapsed,
          id: item.id,
          title: item.title,
        },
        visible: item.visible,
      });
    } else if (item.type === "WFS") {
      layer = createWFSLayer(item);
    } else if (item.type === "WMS") {
      layer = new ImageLayer({
        properties: { id: item.id, legend: item.legend, title: item.title },
        source: new ImageWMS({
          params: { LAYERS: item.name },
          url: item.url,
        }),
        visible: item.visible,
      });
    } else if (item.type === "WMTS") {
      layer = new TileLayer({
        properties: {
          id: item.id,
          legend: item.legend,
          title: item.title,
          url: item.url,
        },
        source: new WMTS({
          dimensions: item.dimensions,
          format: item.format,
          layer: item.layer,
          matrixSet: item.matrixSet,
          projection: item.projection,
          requestEncoding: item.requestEncoding,
          style: item.style,
          tileGrid: new WMTSTileGrid({
            matrixIds: item.tileGrid.matrixIds,
            origins: item.tileGrid.origins,
            resolutions: item.tileGrid.resolutions,
            sizes: item.tileGrid.sizes,
          }),
          url: item.url,
        }),
        visible: item.visible,
      });
    }
    if (layer) {
      if (item.opacity !== undefined) {
        layer.setOpacity(item.opacity);
      }
      if (item.scaleRange) {
        layer.setMaxResolution(SCALE_RANGE_MAX_RESOLUTION[item.scaleRange]);
      }
      tree.push(layer);
    }
  });
  return tree;
}

export function settings2Tree(data: unknown): Tree {
  return settings2TreeInternal(data, new Set<string>());
}

function applySavedLayerState(savedLayer: BaseLayer, targetLayer: BaseLayer) {
  targetLayer.setOpacity(savedLayer.getOpacity());
  targetLayer.setVisible(savedLayer.getVisible());
  targetLayer.setMaxResolution(savedLayer.getMaxResolution());

  const collapsed = savedLayer.get("collapsed") as boolean | undefined;
  if (collapsed !== undefined) {
    targetLayer.set("collapsed", collapsed);
  }

  if (
    !(savedLayer instanceof GroupLayer) ||
    !(targetLayer instanceof GroupLayer)
  ) {
    return;
  }

  const targetLayers = targetLayer.getLayers();
  savedLayer.getLayers().forEach((savedChild, index) => {
    const id = savedChild.get("id") as string | undefined;
    if (id === undefined) {
      return;
    }

    const targetChild = targetLayers.getArray().find((candidate) => {
      return candidate.get("id") === id;
    });

    if (targetChild) {
      applySavedLayerState(savedChild, targetChild);
      if (targetLayers.item(index) !== targetChild) {
        targetLayers.remove(targetChild);
        targetLayers.insertAt(index, targetChild);
      }
      return;
    }

    targetLayers.insertAt(index, savedChild);
  });
}

export function restoreLayerTree(
  savedTree: Tree,
  targetTree: Tree,
  rootOffset = 0,
) {
  savedTree.forEach((savedLayer, index) => {
    const id = savedLayer.get("id") as string | undefined;
    if (id === undefined) {
      return;
    }

    const targetLayer = findRootLayerById(targetTree, id);
    const position = index + rootOffset;

    if (targetLayer) {
      applySavedLayerState(savedLayer, targetLayer);
      if (targetTree.item(position) !== targetLayer) {
        targetTree.remove(targetLayer);
        targetTree.insertAt(position, targetLayer);
      }
      return;
    }

    targetTree.insertAt(position, savedLayer);
  });

  return new Collection<BaseLayer>(targetTree.getArray());
}

export function tree2Items(tree: Tree): (GroupItem | LayerItem)[] {
  const items: (GroupItem | LayerItem)[] = [];
  tree.getArray().slice().reverse().forEach(getLayer2Item(items));
  return items;
}

export function tree2Settings(tree: Tree): SettingItem[] {
  return tree
    .getArray()
    .map((layer) => {
      const id = layer.get("id") as string | undefined;
      const title = layer.get("title") as string | undefined;
      const type = layer.get("type") as string | undefined;
      const version = 1;
      if (id === undefined || type === "file") {
        return;
      }
      const visible = layer.getVisible();
      const opacity = layer.getOpacity();
      const item = {
        id,
        opacity: opacity < 1 ? opacity : undefined,
        scaleRange: getScaleRange(layer),
        type: "Layer" as const,
        version,
        visible,
      };
      if (layer instanceof GroupLayer && title) {
        // Group Layer
        const collapsed = layer.get("collapsed") as boolean;
        const items = tree2Settings(layer.getLayers()).filter((i) => {
          return i.type !== "Group";
        });
        return { ...item, collapsed, items, title, type: "Group" as const };
      } else if (layer instanceof WebGLVectorLayer && title) {
        // WFS
        const url = layer.get("url") as string | undefined;
        if (url) {
          return { ...item, title, type: "WFS" as const, url };
        }
      } else if (layer instanceof ImageLayer && title) {
        // WMS
        const source = layer.getSource() as ImageWMS | undefined;
        if (source instanceof ImageWMS) {
          const url = source.getUrl()!;
          const name = (source.getParams() as Record<string, string>).LAYERS;
          const legend = layer.get("legend") as string | undefined;
          return { ...item, legend, name, title, type: "WMS" as const, url };
        }
      } else if (layer instanceof TileLayer && title) {
        // WMTS
        const source = layer.getSource() as undefined | WMTS;
        const tileGrid = source?.getTileGrid();
        const url = layer.get("url") as string | undefined;
        if (source instanceof WMTS && tileGrid instanceof WMTSTileGrid && url) {
          const legend = layer.get("legend") as string | undefined;
          const zooms = new Array(tileGrid.getMaxZoom() + 1).fill(0);
          return {
            ...item,
            dimensions: source.getDimensions(),
            format: source.getFormat(),
            layer: source.getLayer(),
            legend,
            matrixSet: source.getMatrixSet(),
            projection: source.getProjection()?.getCode() ?? "EPSG:2056",
            requestEncoding: source.getRequestEncoding(),
            style: source.getStyle(),
            tileGrid: {
              matrixIds: tileGrid.getMatrixIds(),
              origins: zooms.map((_, zoom) => {
                return tileGrid.getOrigin(zoom);
              }),
              resolutions: tileGrid.getResolutions(),
              sizes: zooms.map((_, zoom) => {
                const tileRange = tileGrid.getFullTileRange(zoom);
                return [(tileRange?.maxX ?? 0) + 1, (tileRange?.maxY ?? 0) + 1];
              }),
            },
            title,
            type: "WMTS" as const,
            url,
          };
        }
      }
      return item;
    })
    .filter((l) => {
      return l !== undefined;
    });
}
