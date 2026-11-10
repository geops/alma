import {
  closestCenter,
  DndContext,
  DragOverlay,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import Button from "@/components/Button";
import Dialog from "@/components/Dialog";
import InfoCircleIcon from "@/components/icons/InfoCircleIcon";
import PlusIcon from "@/components/icons/PlusIcon";
import { useI18n } from "@/lib/i18n";
import useCurrentUser from "@/lib/useCurrentUser";
import useMap from "@/packages/react-spatial/useMap";

import ImportFileWidget from "./ImportFileWidget";
import ImportServiceWidget from "./ImportServiceWidget";
import MapFeatureInfo from "./MapFeatureInfo";
import {
  DispatchContext,
  getRandomId,
  layerTreeReducer,
  restoreLayerTree,
  settings2Tree,
  tree2Items,
  tree2Settings,
} from "./tree";
import TreeItem from "./TreeItem";
import Widget from "./Widget";

import type {
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
} from "@dnd-kit/core";

import type { GroupItem, LayerItem, SettingItem } from "./tree";
import type { TreeItemProps } from "./TreeItem";

function LayerTreeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="m2 12 9.642 4.821c.131.066.197.098.266.111.06.012.123.012.184 0 .069-.013.135-.045.266-.11L22 12M2 17l9.642 4.821c.131.066.197.098.266.111.06.012.123.012.184 0 .069-.013.135-.045.266-.11L22 17M2 7l9.642-4.821c.131-.066.197-.099.266-.111a.5.5 0 0 1 .184 0c.069.012.135.045.266.11L22 7l-9.642 4.821a1.066 1.066 0 0 1-.266.111.501.501 0 0 1-.184 0 1.093 1.093 0 0 1-.266-.11L2 7Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

type SettingName = "editor" | "search";

function SortableTreeItem({ id, ...props }: TreeItemProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    animateLayoutChanges: ({ isSorting, wasDragging }) => {
      return isSorting || wasDragging ? false : true;
    },
    id,
  });
  return (
    <TreeItem
      ghost={isDragging}
      handleProps={{
        ...attributes,
        ...listeners,
      }}
      id={id}
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      {...props}
    />
  );
}

const measuring = { droppable: { strategy: MeasuringStrategy.Always } };

function LayerTreeWidget({
  onClose,
  settingName,
}: {
  onClose: () => void;
  settingName: SettingName;
}) {
  const { updateSetting } = useCurrentUser();
  const map = useMap();
  const { t } = useI18n();
  const [importOpen, setImportOpen] = useState<"file" | "service">();
  const [tree, dispatch] = useReducer(layerTreeReducer, map.getLayers());
  const previousTree = useRef(tree);
  const [activeItem, setActiveItem] = useState<GroupItem | LayerItem>();
  const [activeLevel, setActiveLevel] = useState<number>(0);
  const [confirmRemoveItem, setConfirmRemoveItem] = useState<
    GroupItem | LayerItem
  >();

  const items = useMemo(() => {
    return tree2Items(tree);
  }, [tree]);

  const findItemById = useCallback(
    (itemId?: string) => {
      if (!itemId) {
        return undefined;
      }
      return items.find((i) => {
        return i.id === itemId;
      });
    },
    [items],
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    const item = findItemById(active.id.toString());
    if (item) {
      setActiveItem(item);
      setActiveLevel(item.level);
    }
  };

  const handleDragMove = ({ delta, over }: DragMoveEvent) => {
    const overId = over?.id.toString();
    const overItem = findItemById(overId);
    const overParent = overItem?.parentId
      ? findItemById(overItem.parentId)
      : undefined;

    if (
      overItem &&
      "collapsed" in overItem &&
      overItem.readonly === true &&
      activeItem?.parentId !== overItem.id
    ) {
      setActiveLevel(0);
      return;
    }

    if (
      overParent?.readonly === true &&
      activeItem?.parentId !== overParent.id
    ) {
      setActiveLevel(0);
      return;
    }

    const activeIndex = items.findIndex((i) => {
      return i.id === activeItem?.id;
    });
    const overIndex = overId
      ? items.findIndex((i) => {
          return i.id === overId;
        })
      : -1;
    if (items[overIndex - 1] === undefined) {
      setActiveLevel(0); // first item
    } else if (
      activeIndex < overIndex
        ? items[overIndex + 1]?.level === 1
        : items[overIndex]?.level === 1
    ) {
      setActiveLevel(1);
    } else {
      setActiveLevel(delta.x > 0 ? 1 : 0);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const id = event.active.id.toString();
    const overId = event.over?.id.toString();
    if (id && overId) {
      const overItem = findItemById(overId);
      const overParent = overItem?.parentId
        ? findItemById(overItem.parentId)
        : undefined;
      const droppingIntoReadonlyGroup =
        overItem !== undefined &&
        "collapsed" in overItem &&
        overItem.readonly === true &&
        activeItem?.parentId !== overItem.id &&
        activeLevel > overItem.level;
      const droppingIntoReadonlyParent =
        overParent?.readonly === true &&
        activeItem?.parentId !== overParent.id &&
        activeLevel > (overParent?.level ?? 0);

      if (droppingIntoReadonlyGroup || droppingIntoReadonlyParent) {
        setActiveItem(undefined);
        setActiveLevel(0);
        return;
      }

      dispatch({
        payload: { actionId: getRandomId(), id, level: activeLevel, overId },
        type: "moveLayer",
      });
    }
    setActiveItem(undefined);
    setActiveLevel(0);
  };

  useEffect(() => {
    if (tree !== previousTree.current) {
      previousTree.current = tree;
      void updateSetting(`mapLayerTree.${settingName}`, tree2Settings(tree));
      map.getLayerGroup().setLayers(tree);
      map.render();
    }
  }, [map, tree, settingName, updateSetting]);

  return (
    <div className="absolute top-20 left-4 z-20 flex space-x-4">
      <DispatchContext value={dispatch}>
        <DndContext
          collisionDetection={closestCenter}
          measuring={measuring}
          onDragEnd={handleDragEnd}
          onDragMove={handleDragMove}
          onDragStart={handleDragStart}
        >
          <SortableContext
            items={items.map((item) => {
              return item.id;
            })}
            strategy={verticalListSortingStrategy}
          >
            <Widget
              icon={<LayerTreeIcon className="w-4" />}
              onClose={onClose}
              title={t("MapLayerTree.title")}
            >
              <div className="overflow-x-hidden rounded-lg bg-white">
                <div className="bg-gray-2 border-gray-4 border-b p-2 text-xs font-semibold">
                  {t("MapLayerTree.mainLayers")}
                </div>
                <ul
                  className="max-h-[calc(100vh-23rem)] overflow-y-auto py-2"
                  data-test="MapLayerTree-list"
                >
                  {items
                    .filter((i) => {
                      return i.level === 1 && i.parentId === activeItem?.id
                        ? false
                        : true;
                    })
                    .map((item) => {
                      return (
                        <SortableTreeItem
                          key={item.id}
                          {...item}
                          {...("collapsed" in item && item === activeItem
                            ? {
                                collapsed:
                                  "collapsed" in item && item === activeItem,
                              }
                            : {})}
                          level={item === activeItem ? activeLevel : item.level}
                          onChange={(id, checked) => {
                            dispatch({
                              payload: { id, visible: checked },
                              type: "setVisible",
                            });
                          }}
                          onCollapse={
                            "collapsed" in item
                              ? () => {
                                  dispatch({
                                    payload: {
                                      collapsed: !item.collapsed,
                                      id: item.id,
                                    },
                                    type: "setCollapsed",
                                  });
                                }
                              : undefined
                          }
                          onDelete={() => {
                            setConfirmRemoveItem(item);
                          }}
                          onOpacityChange={(id, opacity) => {
                            dispatch({
                              payload: { id, opacity },
                              type: "setOpacity",
                            });
                          }}
                          onRename={(id, title) => {
                            dispatch({
                              payload: { id, title },
                              type: "renameLayer",
                            });
                          }}
                          onScaleRangeChange={(id, scaleRange) => {
                            dispatch({
                              payload: { id, scaleRange },
                              type: "setScaleRange",
                            });
                          }}
                        />
                      );
                    })}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-white p-2">
                <Button
                  onClick={() => {
                    return setImportOpen("file");
                  }}
                  outline
                >
                  <PlusIcon className="mr-2" />
                  {t("MapLayerTree.importFile.title")}
                </Button>
                <Button
                  data-test="MapLayerTree-open-import-service"
                  onClick={() => {
                    return setImportOpen("service");
                  }}
                  outline
                >
                  <PlusIcon className="mr-2" />
                  {t("MapLayerTree.importService.title")}
                </Button>
              </div>
            </Widget>
            {importOpen === "service" && (
              <ImportServiceWidget
                onClose={() => {
                  return setImportOpen(undefined);
                }}
              />
            )}
            {importOpen === "file" && (
              <ImportFileWidget
                onClose={() => {
                  return setImportOpen(undefined);
                }}
              />
            )}
          </SortableContext>
          <ul>
            <DragOverlay>
              {activeItem ? (
                <SortableTreeItem
                  {...activeItem}
                  {...("collapsed" in activeItem ? { collapsed: true } : {})}
                  level={activeLevel}
                />
              ) : null}
            </DragOverlay>
          </ul>
        </DndContext>
        <Dialog
          isOpen={!!confirmRemoveItem}
          onClose={() => {
            setConfirmRemoveItem(undefined);
          }}
          title={t("MapLayerTree.confirmRemove.title")}
        >
          <p>
            {t("MapLayerTree.confirmRemove.message", {
              title: confirmRemoveItem?.title ?? "",
            })}
          </p>
          <div className="mt-4 flex justify-end space-x-2">
            <Button
              data-test="MapLayerTree-item-delete-confirm-yes"
              onClick={() => {
                if (confirmRemoveItem) {
                  dispatch({
                    payload: { id: confirmRemoveItem.id },
                    type: "removeLayer",
                  });
                }
                setConfirmRemoveItem(undefined);
              }}
            >
              {t("MapLayerTree.confirmRemove.yes")}
            </Button>
            <Button
              data-test="MapLayerTree-item-delete-confirm-no"
              onClick={() => {
                setConfirmRemoveItem(undefined);
              }}
            >
              {t("MapLayerTree.confirmRemove.no")}
            </Button>
          </div>
        </Dialog>
      </DispatchContext>
    </div>
  );
}

export default function MapLayerTree({
  children,
  className,
  forceItems,
  settingName,
}: {
  children?: (featureInfoActive: boolean) => React.ReactNode;
  className?: string;
  forceItems?: SettingItem[];
  settingName: SettingName;
}) {
  const map = useMap();
  const [infoActive, setInfoActive] = useState(false);
  const [layerTreeOpen, setLayerTreeOpen] = useState(false);
  const { getSetting } = useCurrentUser();

  useEffect(() => {
    const items =
      forceItems ??
      getSetting<SettingItem[]>(`mapLayerTree.${settingName}`, []);
    const tree = settings2Tree(items);
    const mapLayers = map.getLayers().getArray();
    const layerOffset = Math.max(
      1,
      mapLayers.findIndex((layer) => {
        return layer.get("id") !== undefined;
      }),
    );
    restoreLayerTree(tree, map.getLayers(), layerOffset);
  }, [getSetting, map, settingName, forceItems]);

  return (
    <>
      <div
        className={`alma-map-widget absolute top-4 left-4 z-20 flex space-x-px p-1 ${className}`}
      >
        <button
          className={`flex h-11 w-11 items-center justify-center rounded-l-lg ${layerTreeOpen ? "text-blue-6 bg-blue-2" : "text-gray-7 bg-white/85 hover:bg-white"}`}
          data-test="MapLayerTree-toggle"
          onClick={() => {
            return setLayerTreeOpen(!layerTreeOpen);
          }}
          type="button"
        >
          <LayerTreeIcon />
        </button>
        <button
          className={`flex h-11 w-11 items-center justify-center rounded-r-lg ${infoActive ? "text-blue-6 bg-blue-2" : "text-gray-7 bg-white/85 hover:bg-white"}`}
          data-test="MapLayerTree-info"
          onClick={() => {
            return setInfoActive(!infoActive);
          }}
          type="button"
        >
          <InfoCircleIcon />
        </button>
      </div>
      {layerTreeOpen && (
        <LayerTreeWidget
          onClose={() => {
            return setLayerTreeOpen(false);
          }}
          settingName={settingName}
        />
      )}
      <MapFeatureInfo active={infoActive} setActive={setInfoActive} />
      {children?.(infoActive)}
    </>
  );
}
