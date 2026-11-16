import { useCallback } from "react";

import Button from "@/components/Button";
import MarkerIcon from "@/components/icons/MarkerIcon";
import PoolIcon from "@/components/icons/PoolIcon";
import SearchIcon from "@/components/icons/SearchIcon";
import { useI18n } from "@/lib/i18n";

import PoolsPanel from "./PoolsPanel";
import { useTasksContext } from "./TasksContext";
import useCreateTask from "./useCreateTask";
import { VflzPanel } from "./VflzPanel";

import type { ReactNode } from "react";

export function SelectedInput({
  dataTest,
  onClick,
  value,
}: {
  dataTest?: string;
  onClick: () => void;
  value: ReactNode | string;
}) {
  return (
    <div>
      <button
        className="border-gray-5 text-gray-7 flex w-full cursor-text items-center gap-2 rounded-lg border py-1.5 pr-2 pl-2 text-xs font-medium shadow-xs"
        data-test={dataTest}
        onClick={() => {
          onClick();
        }}
        type="button"
      >
        <SearchIcon className="text-gray-6" />
        <span className="min-w-0 flex-1 text-left">{value}</span>
      </button>
    </div>
  );
}

export default function TaskTargetSelection({
  onClose,
  reloadList,
  taskId,
}: {
  onClose?: () => void;
  reloadList?: (newTaskId?: string) => void;
  taskId?: string;
}) {
  const { t } = useI18n();
  const {
    canCreate,
    selectedOptionId,
    selectedPool,
    selectedTaskType,
    selectedVflz,
    setStep,
    setTargetType,
    targetType,
    vflzId,
  } = useTasksContext();
  const createTask = useCreateTask({
    onClose,
    reloadList,
    taskId,
  });

  const handleCreateTask = useCallback(() => {
    if (!selectedTaskType || (!selectedVflz && !selectedPool)) return;
    createTask({
      optionId: selectedOptionId,
      poolId: targetType === "POOL" ? selectedPool?.poolId : undefined,
      taskType: selectedTaskType,
      vflzId:
        targetType === "STANDORT"
          ? (vflzId ?? selectedVflz?.vflzId)
          : undefined,
    });
  }, [
    createTask,
    selectedOptionId,
    selectedPool,
    selectedTaskType,
    selectedVflz,
    targetType,
    vflzId,
  ]);

  return (
    <div className="flex min-w-100 flex-col gap-4">
      <div className="flex">
        <Button
          active={targetType === "STANDORT"}
          className="flex-1 justify-center"
          data-test="Workflow-targetStandort"
          group
          onClick={() => {
            setTargetType("STANDORT");
          }}
        >
          <MarkerIcon className="size-4" />
          {t("search.categories.standort")}
        </Button>
        <Button
          active={targetType === "POOL"}
          className="flex-1 justify-center"
          data-test="Workflow-targetPool"
          group
          onClick={() => {
            setTargetType("POOL");
          }}
        >
          <PoolIcon className="size-4" />
          {t("pools.pool")}
        </Button>
      </div>
      {targetType === "STANDORT" ? <VflzPanel /> : null}
      {targetType === "POOL" ? <PoolsPanel /> : null}
      <div className="border-gray-2 flex justify-end gap-2 border-t pt-4">
        <Button
          className="w-full"
          onClick={() => {
            setStep("select");
          }}
          outline
        >
          {t("workflow.back")}
        </Button>
        <Button
          className="w-full"
          data-test="Workflow-createTask"
          disabled={!canCreate}
          onClick={handleCreateTask}
        >
          {t("workflow.createTask")}
        </Button>
      </div>
    </div>
  );
}
