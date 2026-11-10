import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import useSWR from "swr";

import Button from "@/components/Button";
import Form from "@/components/Form";
import PlusIcon from "@/components/icons/PlusIcon";
import ResetIcon from "@/components/icons/ResetIcon";
import Input from "@/components/Input";
import MultiComboBox from "@/components/MultiComboBox";
import StableWidthText from "@/components/StableWidthText";
import Switch from "@/components/Switch";
import { FaelligkeitStatus, TaskStatus, TaskType } from "@/lib/graphql";
import { useI18n } from "@/lib/i18n";
import useCurrentUser from "@/lib/useCurrentUser";
import useInfiniteScroll from "@/lib/useInfiniteScroll";

import List from "./List";
import { queryGlobal, queryVflz } from "./queries";
import StartTaskDialog from "./StartTaskDialog";
import Task from "./Task";
import { IconProzess } from "./TaskIcon";

import type { KeyedMutator } from "swr";

import type {
  GeschaefteFilter,
  GlobalWorkflowQuery,
  SortTasks,
  VflzLayoutFragment,
  VflzWorkflowLayoutQuery,
  VflzWorkflowQuery,
  WorkflowFilterFragment,
  WorkflowItemFragment,
} from "@/lib/graphql";

interface FormFilterValues {
  eigene?: boolean | null;
  faelligkeit?: { label: string; value: FaelligkeitStatus }[] | null;
  status?: { label: string; value: TaskStatus }[] | null;
  taskTyp?: { label: string; value: TaskType }[] | null;
  teilflaechen?: { label: string; value: string }[] | null;
  titel?: null | string;
}

function IconClock() {
  return (
    <svg fill="none" height="20" width="20" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 6.458V10l2.291 2.292M17.708 10A7.708 7.708 0 1 1 2.29 10a7.708 7.708 0 0 1 15.417 0Z"
        stroke="#0B4A6F"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconSortBy({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 3.96v12.08m0 0-2.5-2.5m2.5 2.5 2.5-2.5m2.3-7.91h7.07m-3.75 8.75h3.76M11.46 10h5.41"
        stroke="#344054"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

const workflowFilterEmptyValues: GeschaefteFilter = {
  eigene: null,
  faelligkeit: [],
  status: [],
  taskTyp: [],
  teilflaechen: null,
  titel: null,
};

// This object is used to compare the formState value with default values to determine if the reset button should be disabled or not
const workflowFilterFormDefaultValues: FormFilterValues = {
  eigene: null,
  faelligkeit: [],
  status: [],
  taskTyp: [],
  teilflaechen: [],
  titel: null,
};

function WorkflowFilter({
  onReset,
  teilstandorte,
  values,
}: {
  onReset: () => void;
  teilstandorte: undefined | WorkflowFilterFragment["teilstandorte"];
  values: GeschaefteFilter | undefined;
}) {
  const { t } = useI18n();
  const { formState, reset, setValue, watch } = useFormContext();
  const isDirty = Object.keys(formState.dirtyFields).length > 0;
  const eigene = watch("eigene") as boolean;

  const statusOptions = useMemo(() => {
    return [
      { label: t("TaskStatus.OFFEN"), value: TaskStatus.Offen },
      { label: t("TaskStatus.RUHEND"), value: TaskStatus.Ruhend },
      { label: t("TaskStatus.ABGESCHLOSSEN"), value: TaskStatus.Abgeschlossen },
    ];
  }, [t]);

  const faelligkeitsOptions = useMemo(() => {
    return [
      {
        label: t("FaelligkeitStatus.UEBERFAELLIG"),
        value: FaelligkeitStatus.Ueberfaellig,
      },
      {
        label: t("FaelligkeitStatus.FAELLIG_NAECHSTE_WOCHE"),
        value: FaelligkeitStatus.FaelligNaechsteWoche,
      },
      {
        label: t("FaelligkeitStatus.FAELLIG_SPAETER"),
        value: FaelligkeitStatus.FaelligSpaeter,
      },
      {
        label: t("FaelligkeitStatus.RUHEND"),
        value: FaelligkeitStatus.Ruhend,
      },
    ];
  }, [t]);

  const taskTypOptions = useMemo(() => {
    return Object.values(TaskType).map((type) => {
      return {
        label: t(`TaskType.${type}`),
        value: type,
      };
    });
  }, [t]);

  const teilflaechenOptions = useMemo(() => {
    if (!teilstandorte) {
      return [];
    }
    return teilstandorte.map((ts) => {
      return {
        label: ts.combinedId,
        value: ts.combinedId,
      };
    });
  }, [teilstandorte]);

  useEffect(() => {
    const resetValues = {
      eigene: values?.eigene ?? null,
      faelligkeit: faelligkeitsOptions.filter((f) => {
        return values?.faelligkeit?.includes(f.value);
      }),
      status: statusOptions.filter((s) => {
        return values?.status?.includes(s.value);
      }),
      taskTyp: taskTypOptions.filter((tt) => {
        return values?.taskTyp?.includes(tt.value);
      }),
      teilflaechen: teilflaechenOptions.filter((tf) => {
        return values?.teilflaechen?.includes(tf.value);
      }),
      titel: values?.titel ?? null,
    };
    reset(resetValues);
  }, [
    faelligkeitsOptions,
    reset,
    statusOptions,
    taskTypOptions,
    teilflaechenOptions,
    values?.eigene,
    values?.faelligkeit,
    values?.status,
    values?.taskTyp,
    values?.teilflaechen,
    values?.titel,
  ]);

  return (
    <div className="flex scroll-mt-32 items-end justify-between" id="filter">
      <div className="flex items-center">
        <MultiComboBox
          hideLabel={false}
          name="status"
          options={statusOptions}
          sortByValue={false}
        />
        <MultiComboBox
          hideLabel={false}
          name="taskTyp"
          options={taskTypOptions}
        />
        <MultiComboBox
          hideLabel={false}
          name="faelligkeit"
          options={faelligkeitsOptions}
          sortByValue={false}
        />
        {teilstandorte && teilstandorte.length > 0 && (
          <MultiComboBox
            hideLabel={false}
            name="teilflaechen"
            options={teilflaechenOptions}
          />
        )}
        <Input name="titel" />
        <Switch
          checked={eigene}
          className="mx-4 mt-4"
          label={t("fields.Task.eigene")}
          onChange={(toggleState) => {
            setValue("eigene", toggleState, { shouldDirty: true });
          }}
        />
      </div>
      <div className="mb-2 flex gap-2">
        <Button disabled={!isDirty} type="submit">
          {t("workflow.filter.apply")}
        </Button>
        <Button
          className="gap-1.5"
          disabled={
            !isDirty &&
            JSON.stringify(formState.defaultValues) ===
              JSON.stringify(workflowFilterFormDefaultValues)
          }
          onClick={() => {
            void reset(workflowFilterFormDefaultValues, {
              keepDefaultValues: true,
            });
            onReset();
          }}
          type="button"
        >
          <ResetIcon />
          {t("workflow.filter.reset")}
        </Button>
      </div>
    </div>
  );
}

const perPage = 20;

export default function Workflow({
  mutatePage,
  vflz,
  vflzId,
}: {
  mutatePage?: KeyedMutator<VflzWorkflowLayoutQuery>;
  vflz?: null | VflzLayoutFragment;
  vflzId?: string;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isStartTaskDialogOpen, setIsStartTaskDialogOpen] = useState(false);
  const { getSetting, permissions, updateSetting } = useCurrentUser();
  const asTree = getSetting<boolean>("workflow.asTree", false);
  const reverse = getSetting<boolean>("workflow.reverse", true);
  const sortBy = getSetting<SortTasks>("workflow.sortBy", "StartDatum");
  const compactView = getSetting<boolean>("workflow.compactView", false);
  const filter = getSetting<GeschaefteFilter | undefined>(
    "workflow.filter",
    undefined,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number[]>([]);
  const [geschaefte, setGeschaefte] = useState<WorkflowItemFragment[]>([]);
  const vflzIdRef = useRef<string>(vflzId);
  const listContext = JSON.stringify([vflzId, filter, asTree, reverse, sortBy]);
  const listContextRef = useRef(listContext);
  const [paginationContext, setPaginationContext] = useState(listContext);

  if (paginationContext !== listContext) {
    setPaginationContext(listContext);
    setPage(1);
  }

  const updateSettingRef = useRef<typeof updateSetting>(updateSetting);
  const taskId = useMemo(() => {
    return searchParams?.get("id") ?? undefined;
  }, [searchParams]);
  const [requestedTaskId, setRequestedTaskId] = useState<string | undefined>(
    () => {
      return taskId;
    },
  );

  // redirect to a taskId or to root if no taskId is provided
  const redirectTo = useCallback(
    (newTaskId?: string) => {
      const idParam = newTaskId ? `?id=${newTaskId}` : "";
      void router.push(`${pathname}${idParam}`, undefined, {
        scroll: false,
      });
    },
    [router, pathname],
  );

  const handleSuccess = useCallback(
    (data: GlobalWorkflowQuery | VflzWorkflowQuery) => {
      const { geschaefte: newGeschaefte } = "vflz" in data ? data.vflz : data;
      if (!newGeschaefte?.page) {
        setIsLoading(false);
        return;
      }

      const newPage = newGeschaefte.page;
      const newResults = newGeschaefte.results ?? [];
      let appendDirection: "after" | "before" | "none" | "reset" = "none";

      if (
        vflzIdRef.current !== vflzId ||
        listContextRef.current !== listContext
      ) {
        vflzIdRef.current = vflzId;
        listContextRef.current = listContext;
        appendDirection = "reset";
        setPages([newPage]);
      } else {
        setPages((prevPages) => {
          if (prevPages.includes(newPage)) {
            appendDirection = "none";
            return prevPages;
          }
          appendDirection =
            prevPages.length > 0 && newPage < prevPages[0] ? "before" : "after";
          return [...prevPages, newPage].sort((a, b) => {
            return a - b;
          });
        });
      }
      setGeschaefte((prevGeschaefte) => {
        if (appendDirection === "none") {
          if (prevGeschaefte?.length === 0) {
            return newResults;
          }
          return prevGeschaefte;
        }
        if (appendDirection === "reset") {
          return [...newResults];
        }
        if (appendDirection === "before") {
          return [...newResults, ...prevGeschaefte];
        }
        return [...prevGeschaefte, ...newResults];
      });

      if (appendDirection !== "none") {
        setPage(newPage);
      }
      setIsLoading(false);
    },
    [listContext, setGeschaefte, setIsLoading, setPage, setPages, vflzId],
  );

  const handleFailure = useCallback(() => {
    // If there is a requestedTaskId it is probably the reason of the failure,
    // because the taskId is not part of the vflz requested.
    // So in case we remove it and reload
    // TODO: verfiy how to be sure this is the reason
    if (requestedTaskId) {
      redirectTo();
      setRequestedTaskId(undefined);
    }
    setIsLoading(false);
  }, [redirectTo, requestedTaskId, setIsLoading, setRequestedTaskId]);

  // [ALTLZGA-37] Select the same teilflaechen in the filter when loading the vflz
  // then make it the default filter.
  useEffect(() => {
    if (vflzId && vflz?.combinedId) {
      workflowFilterFormDefaultValues.teilflaechen = [
        { label: vflz.combinedId, value: vflz.combinedId },
      ];
      workflowFilterEmptyValues.teilflaechen = [vflz.combinedId];

      void updateSettingRef.current(
        "workflow.filter",
        workflowFilterEmptyValues,
      );
    } else if (!vflzId) {
      workflowFilterEmptyValues.teilflaechen = [];
    }
  }, [vflzId, vflz]);

  const {
    data,
    isLoading: isListLoading,
    mutate,
  } = useSWR<GlobalWorkflowQuery | VflzWorkflowQuery>(
    vflzId
      ? [
          queryVflz,
          {
            asTree,
            filter: filter ? { ...filter } : null,
            page,
            perPage,
            reverse,
            sortBy,
            taskId: requestedTaskId,
            vflzId,
          },
        ]
      : [
          queryGlobal,
          {
            asTree,
            filter: filter ? { ...filter, teilflaechen: null } : null,
            page,
            perPage,
            reverse,
            sortBy,
            taskId: requestedTaskId,
          },
        ],
    null,
    {
      dedupingInterval: 0,
      focusThrottleInterval: 0,
      keepPreviousData: true,
      onDiscarded: handleFailure,
      onError: handleFailure,
      onSuccess: handleSuccess,
    },
  );

  const listData = useMemo(() => {
    if (!data) {
      return undefined;
    }
    if ("vflz" in data) {
      return data.vflz?.geschaefte;
    }
    return data.geschaefte;
  }, [data]);

  useEffect(() => {
    // used for deep links from dashboard
    const eigene = searchParams?.get("eigene") === "";
    const faelligkeit = searchParams?.get("faelligkeit");
    const status = searchParams?.get("status")?.split(",") ?? [];
    if (faelligkeit || eigene || status.length > 0) {
      void updateSetting("workflow.asTree", false);
      void updateSetting("workflow.filter", {
        eigene: eigene ? true : null,
        faelligkeit: faelligkeit ? [faelligkeit] : null,
        status: status.length > 0 ? status : null,
      });
      void router.replace(pathname);
    }
  }, [pathname, router, searchParams, updateSetting]);

  const resetPagination = useCallback(() => {
    setIsLoading(true);
    setGeschaefte([]);
    setPages([]);
    setPage(1);
  }, [setGeschaefte, setIsLoading, setPage, setPages]);

  const reloadList = useCallback(
    (newTaskId?: string) => {
      setGeschaefte([]);
      setPages([]);
      redirectTo(newTaskId);
      if (!newTaskId) {
        setPage(1);
      }
      void mutate(undefined, { revalidate: true });
    },
    [mutate, redirectTo, setGeschaefte, setPage, setPages],
  );

  const containerRef = useInfiniteScroll(
    () => {
      if (isListLoading || !listData?.numPages || pages.length < 1) {
        return;
      }
      if (pages.at(-1)! >= listData?.numPages) {
        return;
      }
      // We remove the taskId from the request to get the correct page of results.
      setRequestedTaskId(undefined);
      setPage((pages.at(-1) ?? 1) + 1);
    },
    undefined,
    undefined,
    () => {
      if (isListLoading || !listData?.numPages || pages.length < 1) {
        return;
      }
      if (pages[0] <= 1) {
        return;
      }
      // We remove the taskId from the request to get the correct page of results.
      setRequestedTaskId(undefined);
      setPage((pages[0] ?? 2) - 1);
    },
  );

  // Redirect to the first of the list if no taskId is provided and the list is not empty for the vflzId provided
  useEffect(() => {
    if (
      vflzIdRef.current === vflzId &&
      !taskId &&
      geschaefte.length > 0 &&
      (!vflzId || geschaefte[0].vflz.vflzId === vflzId)
    ) {
      redirectTo(geschaefte[0].taskId);
      return;
    }
  }, [taskId, geschaefte, redirectTo, vflzId]);

  // [ALTLZGA-37] Display only the page when the workflowFilterEmptyValues is correctly set
  // it will make the workflow filter to be set as default
  if (vflzId && !vflz && !workflowFilterEmptyValues?.teilflaechen) {
    return null;
  }
  return (
    <>
      {vflzId && data && "vflz" in data ? (
        <StartTaskDialog
          isOpen={isStartTaskDialogOpen}
          onClose={() => {
            return setIsStartTaskDialogOpen(false);
          }}
          options={data.vflz.prozesse}
          reloadList={reloadList}
          sortByTitle
          title={t("workflow.startProzessTitle")}
          vflzId={vflzId}
        />
      ) : null}
      <Form
        defaultValues={workflowFilterFormDefaultValues}
        model="Task"
        onSubmit={(values: FormFilterValues) => {
          resetPagination();
          const faelligkeitValues = Array.isArray(values.faelligkeit)
            ? values.faelligkeit.map((f) => {
                return f.value;
              })
            : null;
          const statusValues = Array.isArray(values.status)
            ? values.status.map((s) => {
                return s.value;
              })
            : null;
          const taskTypValues = Array.isArray(values.taskTyp)
            ? values.taskTyp.map((tt) => {
                return tt.value;
              })
            : null;
          const teilflaechenValues = Array.isArray(values.teilflaechen)
            ? values.teilflaechen.map((tf) => {
                return tf.value;
              })
            : null;
          const newFilter: GeschaefteFilter = {
            eigene: values.eigene ?? null,
            faelligkeit:
              faelligkeitValues && faelligkeitValues.length > 0
                ? faelligkeitValues
                : null,
            status:
              statusValues && statusValues.length > 0 ? statusValues : null,
            taskTyp:
              taskTypValues && taskTypValues.length > 0 ? taskTypValues : null,
            teilflaechen:
              teilflaechenValues && teilflaechenValues.length > 0
                ? teilflaechenValues
                : null,
            titel: values.titel ?? null,
          };

          void updateSetting("workflow.filter", newFilter);
          redirectTo();
        }}
      >
        <WorkflowFilter
          onReset={() => {
            resetPagination();
            void updateSetting("workflow.filter", workflowFilterEmptyValues);
            redirectTo();
          }}
          teilstandorte={
            data && "vflz" in data ? data.vflz.teilstandorte : undefined
          }
          values={filter}
        />
      </Form>
      <div className="border-gray-4 flex justify-between border-t pt-3 pb-4">
        <div className="flex gap-4">
          <div>
            <Button
              active={!asTree}
              group
              onClick={() => {
                if (asTree) {
                  resetPagination();
                  void updateSetting("workflow.asTree", false);
                }
              }}
            >
              <IconClock />
              <StableWidthText value={t("workflow.asTree.false")} />
            </Button>
            <Button
              active={asTree}
              group
              onClick={() => {
                if (!asTree) {
                  resetPagination();
                  void updateSetting("workflow.asTree", true);
                }
              }}
            >
              <IconProzess className="size-5" />
              <StableWidthText value={t("workflow.asTree.true")} />
            </Button>
          </div>
          <div>
            <Button
              active={sortBy === "StartDatum"}
              group
              onClick={() => {
                resetPagination();
                if (sortBy === "StartDatum") {
                  void updateSetting("workflow.reverse", !reverse);
                } else {
                  void updateSetting("workflow.sortBy", "StartDatum");
                  void updateSetting("workflow.reverse", true);
                }
              }}
            >
              <IconSortBy
                className={`transition-transform ${sortBy === "StartDatum" && !reverse ? "rotate-180" : "rotate-0"}`}
              />
              <StableWidthText value={t("workflow.sortBy.start")} />
            </Button>
            <Button
              active={sortBy === "Faelligkeit"}
              group
              onClick={() => {
                resetPagination();
                if (sortBy === "Faelligkeit") {
                  void updateSetting("workflow.reverse", !reverse);
                } else {
                  void updateSetting("workflow.sortBy", "Faelligkeit");
                  void updateSetting("workflow.reverse", true);
                }
              }}
            >
              <IconSortBy
                className={`transition-transform ${sortBy === "Faelligkeit" && !reverse ? "rotate-180" : "rotate-0"}`}
              />
              <StableWidthText value={t("workflow.sortBy.due")} />
            </Button>
          </div>
          <Switch
            checked={compactView}
            label={t("workflow.compactView")}
            onChange={(checked) => {
              void updateSetting("workflow.compactView", checked);
            }}
          />
        </div>
        {vflzId && permissions.canEditProcess ? (
          <Button
            data-test="Workflow-startProzess"
            onClick={() => {
              setIsStartTaskDialogOpen(true);
            }}
          >
            <PlusIcon />
            <span className="ml-1.5">{t("workflow.startProzess")}</span>
          </Button>
        ) : null}
      </div>
      <div className="flex gap-4">
        <div
          className={`border-gray-5 divide-gray-5 sticky flex-1/3 divide-y overflow-x-hidden overflow-y-auto rounded-lg border ${vflzId ? "top-32 max-h-[calc(100vh-9rem)]" : "top-4 max-h-[calc(100vh-2rem)]"}`}
          data-test="Workflow-list"
          ref={containerRef}
        >
          <div className="bg-gray-4 sticky top-0 z-20 border-none p-2 text-xs font-bold">
            {t("workflow.numResults", {
              count: geschaefte.length.toString(),
              total: (listData?.numResultsTotal ?? 0).toString(),
            })}
          </div>
          <List
            asTree={asTree}
            compactView={compactView}
            isLoading={isLoading}
            items={geschaefte}
            selectedTaskId={taskId}
            withVflzInfo={vflzId === undefined}
          />
        </div>
        <div
          className={`border-gray-5 bg-gray-2 sticky h-fit flex-2/3 rounded-lg border p-5 ${vflzId ? "top-32" : "top-4"}`}
        >
          <Task
            mutatePage={mutatePage}
            reloadList={reloadList}
            taskId={taskId}
            withVflzInfo={vflzId === undefined}
          />
        </div>
      </div>
    </>
  );
}
