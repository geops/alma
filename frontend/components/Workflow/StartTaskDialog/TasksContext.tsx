import { gql } from "graphql-request";
import { createContext, use, useCallback, useMemo, useState } from "react";
import useSWR from "swr";

import { useI18n } from "@/lib/i18n";

import type { Dispatch, PropsWithChildren, SetStateAction } from "react";

import type {
  PoolOptionFragment,
  Problem,
  StartTaskDialogProzesseQuery,
  TaskOption,
  TaskTargetVflzItemQuery,
  TaskType,
} from "@/lib/graphql";

export type SelectionType = "WORKFLOW" | TaskType;
export type Step = "select" | "target";
export type TargetType = "POOL" | "STANDORT";
export type OptionsSource = "global" | "provided";
export const poolOptionFragment = gql`
  fragment PoolOption on Pool {
    poolId
    bezeichnung
    standorte(perPage: 1) {
      numResultsTotal
    }
  }
`;

const queryProzesse = gql`
  query startTaskDialogProzesse {
    prozesse {
      optionId
      title
      type
    }
  }
`;

interface TasksContextValue {
  canCreate: boolean;
  forceStartProzess: boolean;
  problems?: Pick<Problem, "message" | "messageCode">[];
  prozesseOptions: TaskOption[];
  reset: () => void;
  selectedOptionId: string | undefined;
  selectedPool: PoolOptionFragment | undefined;
  selectedTaskType: SelectionType | undefined;
  selectedVflz: TaskTargetVflzItemQuery["vflz"] | undefined;
  setCanCreate: Dispatch<SetStateAction<boolean>>;
  setSelectedOptionId: Dispatch<SetStateAction<string | undefined>>;
  setSelectedPool: Dispatch<SetStateAction<PoolOptionFragment | undefined>>;
  setSelectedTaskType: Dispatch<SetStateAction<SelectionType | undefined>>;
  setSelectedVflz: Dispatch<
    SetStateAction<TaskTargetVflzItemQuery["vflz"] | undefined>
  >;
  setStep: Dispatch<SetStateAction<Step>>;
  setTargetType: Dispatch<SetStateAction<TargetType>>;
  step: Step;
  targetType: TargetType;
  taskId: string | undefined;
  updateCanCreate: (hasValidPoolVflzs?: boolean, opts?: TaskOption[]) => void;
  vflzId: string | undefined;
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

function useProzesseOptions(
  options: TaskOption[],
  optionsSource: OptionsSource,
  sortByTitle: boolean,
) {
  const { t } = useI18n();
  const { data } = useSWR<StartTaskDialogProzesseQuery>(
    optionsSource === "global" ? queryProzesse : null,
  );
  const sortFunction = useCallback(
    (a: TaskOption, b: TaskOption) => {
      return sortByTitle ? t(a.title).localeCompare(t(b.title)) : 0;
    },
    [sortByTitle, t],
  );

  return useMemo(() => {
    const resolvedOptions =
      optionsSource === "provided" ? options : (data?.prozesse ?? []);

    return [...resolvedOptions].sort(sortFunction);
  }, [data?.prozesse, options, optionsSource, sortFunction]);
}

export function TasksContextProvider({
  children,
  defaultSelectedTaskType,
  forceStartProzess = false,
  options,
  optionsSource,
  problems,
  sortByTitle = true,
  taskId,
  vflzId,
}: PropsWithChildren<{
  defaultSelectedTaskType?: SelectionType;
  forceStartProzess?: boolean;
  options?: TaskOption[];
  optionsSource: OptionsSource;
  problems?: Pick<Problem, "message" | "messageCode">[];
  sortByTitle?: boolean;
  taskId?: string;
  vflzId?: string;
}>) {
  const { activeLocale } = useI18n();
  const [step, setStep] = useState<Step>("select");
  const [selectedTaskType, setSelectedTaskType] = useState<
    SelectionType | undefined
  >(defaultSelectedTaskType);
  const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>(
    undefined,
  );
  const [targetType, setTargetType] = useState<TargetType>("STANDORT");
  const [selectedVflz, setSelectedVflz] =
    useState<TaskTargetVflzItemQuery["vflz"]>();
  const [selectedPool, setSelectedPool] = useState<PoolOptionFragment>();
  const [canCreate, setCanCreate] = useState(false);
  const prozesseOptions = useProzesseOptions(
    options ?? [],
    optionsSource,
    sortByTitle,
  );
  const [appliedDefaultForLocale, setAppliedDefaultForLocale] = useState<
    string | undefined
  >(undefined);

  if (appliedDefaultForLocale !== activeLocale && prozesseOptions.length > 0) {
    setAppliedDefaultForLocale(activeLocale);
    setSelectedTaskType("WORKFLOW");
    setSelectedOptionId(prozesseOptions[0].optionId);
  }

  function reset() {
    setSelectedTaskType(
      prozesseOptions.length > 0 ? "WORKFLOW" : defaultSelectedTaskType,
    );
    setSelectedOptionId(prozesseOptions[0]?.optionId);
    setStep("select");
    setTargetType("STANDORT");
    setSelectedVflz(undefined);
    setSelectedPool(undefined);
    setCanCreate(false);
    setAppliedDefaultForLocale(undefined);
  }

  const updateCanCreate = useCallback(
    (hasValidPoolVflzs?: boolean, opts?: TaskOption[]) => {
      if (targetType === "STANDORT") {
        const condition =
          !!selectedVflz &&
          (selectedTaskType === "WORKFLOW"
            ? (opts ?? prozesseOptions).some(
                (o) => o.optionId === selectedOptionId,
              )
            : true);
        setCanCreate(condition);
      }

      if (targetType === "POOL") {
        const condition = !!selectedPool && !!hasValidPoolVflzs;
        setCanCreate(condition);
      }
    },
    [
      prozesseOptions,
      selectedOptionId,
      selectedTaskType,
      selectedPool,
      selectedVflz,
      targetType,
    ],
  );

  return (
    <TasksContext
      value={{
        canCreate,
        forceStartProzess,
        problems,
        prozesseOptions,
        reset,
        selectedOptionId,
        selectedPool,
        selectedTaskType,
        selectedVflz,
        setCanCreate,
        setSelectedOptionId,
        setSelectedPool,
        setSelectedTaskType,
        setSelectedVflz,
        setStep,
        setTargetType,
        step,
        targetType,
        taskId,
        updateCanCreate,
        vflzId,
      }}
    >
      {children}
    </TasksContext>
  );
}

export function useTasksContext() {
  const context = use(TasksContext);
  if (!context) {
    throw new Error(
      "useTasksContext must be used within a TasksContextProvider",
    );
  }
  return context;
}
