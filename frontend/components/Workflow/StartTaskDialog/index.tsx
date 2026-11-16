import { gql } from "graphql-request";
import { usePathname } from "next/navigation";
import { useState } from "react";

import Button from "@/components/Button";
import Dialog from "@/components/Dialog";
import { useI18n } from "@/lib/i18n";

import PlusIcon from "../../icons/PlusIcon";

import {
  type OptionsSource,
  TasksContextProvider,
  useTasksContext,
} from "./TasksContext";
import TaskTargetSelection from "./TaskTargetSelection";
import TaskTypeSelection from "./TaskTypeSelection";

import type { Problem, TaskOption, TaskType } from "@/lib/graphql";

export const createNotiz = gql`
  mutation createStandortNotiz($data: CreateStandortNotizInput!) {
    createTask: createStandortNotiz(data: $data) {
      taskId
    }
  }
`;

export const createPoolNotiz = gql`
  mutation createPoolNotiz($data: CreatePoolNotizInput!) {
    createTasks: createPoolNotiz(data: $data) {
      taskId
    }
  }
`;

export const createDokument = gql`
  mutation createStandortDokument($data: CreateStandortDokumentInput!) {
    createTask: createStandortDokument(data: $data) {
      taskId
    }
  }
`;

export const createPoolDokument = gql`
  mutation createPoolDokument($data: CreatePoolDokumentInput!) {
    createTasks: createPoolDokument(data: $data) {
      taskId
    }
  }
`;

export const createAufgabe = gql`
  mutation createStandortAufgabe($data: CreateStandortAufgabeInput!) {
    createTask: createStandortAufgabe(data: $data) {
      taskId
    }
  }
`;

export const createPoolAufgabe = gql`
  mutation createPoolAufgabe($data: CreatePoolAufgabeInput!) {
    createTasks: createPoolAufgabe(data: $data) {
      taskId
    }
  }
`;

export const startProzessMutation = gql`
  mutation startStandortProzess($data: StartStandortProzessInput!) {
    startStandortProzess(data: $data) {
      prozess {
        taskId
      }
    }
  }
`;

export const startPoolProzessMutation = gql`
  mutation startPoolProzess($data: StartPoolProzessInput!) {
    startPoolProzess(data: $data) {
      prozesse {
        taskId
      }
    }
  }
`;

export const startFolgeschrittMutation = gql`
  mutation startStandortFolgeschritt($data: StartStandortFolgeschrittInput!) {
    startStandortFolgeschritt(data: $data) {
      task {
        taskId
      }
    }
  }
`;

export const startPoolFolgeschrittMutation = gql`
  mutation startPoolFolgeschritt($data: StartPoolFolgeschrittInput!) {
    startPoolFolgeschritt(data: $data) {
      tasks {
        taskId
      }
    }
  }
`;

export const taskTypes: TaskType[] = ["NOTIZ", "DOKUMENT", "AUFGABE"];

export const kategorieVariables = {
  kategorie: null,
  oeffentlich: false,
};

function TasksDialog({
  isOpen = false,
  onClose,
  reloadList,
  taskId,
  title,
  vflzId,
  ...props
}: {
  isOpen?: boolean;
  onClose?: () => void;
  reloadList?: (taskId?: string) => void;
  taskId?: string;
  title?: string;
  vflzId?: string;
}) {
  const { t } = useI18n();
  const {
    prozesseOptions,
    reset,
    selectedOptionId,
    selectedTaskType,
    setSelectedTaskType,
    setStep,
    step,
  } = useTasksContext();
  const pathname = usePathname();

  function closeDialog() {
    onClose?.();
    reset();
  }

  const selectedProzess = prozesseOptions.find(
    (option) => option.optionId === selectedOptionId,
  );
  const selectedProzessTitle = selectedProzess ? t(selectedProzess.title) : "";

  const resolvedTitle =
    step === "target"
      ? t("workflow.createTaskType", {
          taskType:
            selectedTaskType === "WORKFLOW"
              ? selectedProzessTitle
              : t(`TaskType.${selectedTaskType}`),
        })
      : (title ?? t("workflow.startProzessTitle"));

  return (
    <Dialog
      className="[&_[data-dialog=dialog-body]]:max-w-120"
      isOpen={isOpen}
      onClose={closeDialog}
      title={resolvedTitle}
      {...props}
    >
      {step === "select" ? (
        <TaskTypeSelection
          onClose={closeDialog}
          onSelect={
            pathname === "/workflow"
              ? (taskType) => {
                  setSelectedTaskType(taskType);
                  setStep("target");
                }
              : undefined
          }
          reloadList={reloadList}
          taskId={taskId}
          vflzId={vflzId}
        />
      ) : (
        <TaskTargetSelection
          onClose={closeDialog}
          reloadList={reloadList}
          taskId={taskId}
        />
      )}
    </Dialog>
  );
}

export default function StartTaskDialog({
  forceStartProzess = false,
  isOpen,
  onClose,
  options = [],
  optionsSource = "global",
  problems,
  reloadList,
  sortByTitle,
  taskId,
  title,
  vflzId,
  ...props
}: {
  forceStartProzess?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  options?: TaskOption[];
  optionsSource?: OptionsSource;
  problems?: Pick<Problem, "message" | "messageCode">[];
  reloadList?: (taskId?: string) => void;
  sortByTitle?: boolean;
  taskId?: string;
  title?: string;
  vflzId?: string;
}) {
  const { t } = useI18n();
  const [isStartTaskDialogOpen, setIsStartTaskDialogOpen] = useState(false);
  const isControlled = isOpen !== undefined;
  const open = isControlled ? isOpen : isStartTaskDialogOpen;

  return (
    <>
      {!isControlled ? (
        <Button
          data-test="StartTaskDialog-toggle"
          onClick={() => setIsStartTaskDialogOpen(true)}
        >
          <PlusIcon />
          <span className="ml-1.5">{t("workflow.startProzess")}</span>
        </Button>
      ) : null}
      <TasksContextProvider
        defaultSelectedTaskType={taskTypes[0]}
        forceStartProzess={forceStartProzess}
        options={options}
        optionsSource={optionsSource}
        problems={problems}
        sortByTitle={sortByTitle}
        taskId={taskId}
        vflzId={vflzId}
      >
        <TasksDialog
          isOpen={open}
          onClose={() => {
            setIsStartTaskDialogOpen(false);
            onClose?.();
          }}
          reloadList={reloadList}
          taskId={taskId}
          title={title}
          vflzId={vflzId}
          {...props}
        />
      </TasksContextProvider>
    </>
  );
}
