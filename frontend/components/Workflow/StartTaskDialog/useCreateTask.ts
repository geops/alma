import { useRouter } from "next/router";
import { useCallback } from "react";

import client from "@/lib/client";
import { useI18n } from "@/lib/i18n";

import { useTasksContext } from "./TasksContext";

import {
  createAufgabe,
  createDokument,
  createNotiz,
  createPoolAufgabe,
  createPoolDokument,
  createPoolNotiz,
  kategorieVariables,
  startFolgeschrittMutation,
  startPoolFolgeschrittMutation,
  startPoolProzessMutation,
  startProzessMutation,
} from "./";

import type {
  CreatePoolNotizMutation,
  CreateStandortNotizMutation,
  StartPoolFolgeschrittMutation,
  StartPoolProzessMutation,
  StartStandortFolgeschrittMutation,
  StartStandortProzessMutation,
} from "@/lib/graphql";

import type { SelectionType } from "./TasksContext";

export default function useCreateTask({
  onClose,
  reloadList,
  taskId,
}: {
  onClose?: () => void;
  reloadList?: (newTaskId?: string) => void;
  taskId?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { forceStartProzess } = useTasksContext();

  const navigateToTask = useCallback(
    (newTaskId: string | undefined) => {
      onClose?.();

      if (newTaskId) {
        const basePath = router.asPath.split("?")[0];
        void router.push(`${basePath}?id=${newTaskId}`, undefined, {
          scroll: false,
        });
        reloadList?.(newTaskId);
      } else {
        reloadList?.();
      }
    },
    [onClose, reloadList, router],
  );

  return useCallback(
    ({
      optionId,
      poolId,
      taskType,
      vflzId,
    }: {
      optionId?: string;
      poolId?: string;
      taskType: SelectionType;
      vflzId?: string;
    }) => {
      const effectiveTaskId = forceStartProzess ? undefined : taskId;

      if (taskType === "WORKFLOW") {
        if (!optionId) return;
        if (poolId) {
          if (effectiveTaskId) {
            client
              .request<StartPoolFolgeschrittMutation>(
                startPoolFolgeschrittMutation,
                { data: { optionId, poolId, taskId: effectiveTaskId } },
              )
              .then((result: StartPoolFolgeschrittMutation) => {
                navigateToTask(
                  result.startPoolFolgeschritt.tasks.at(-1)?.taskId,
                );
              })
              .catch(console.error);
          } else {
            client
              .request<StartPoolProzessMutation>(startPoolProzessMutation, {
                data: { optionId, poolId },
              })
              .then((result: StartPoolProzessMutation) => {
                navigateToTask(result.startPoolProzess.prozesse.at(-1)?.taskId);
              })
              .catch(console.error);
          }
          return;
        }
        client
          .request<
            StartStandortFolgeschrittMutation | StartStandortProzessMutation
          >(
            effectiveTaskId ? startFolgeschrittMutation : startProzessMutation,
            {
              data: effectiveTaskId
                ? { optionId, taskId: effectiveTaskId }
                : { optionId, vflzId },
            },
          )
          .then((result) => {
            const { taskId: newTaskId } =
              "startStandortFolgeschritt" in result
                ? result.startStandortFolgeschritt.task
                : result.startStandortProzess.prozess;
            navigateToTask(newTaskId);
          })
          .catch(console.error);
        return;
      }

      const title = t(`workflow.create.${taskType}`);
      const startDatum = new Date().toISOString().split("T")[0];

      if (poolId) {
        const generalVariables = { notiz: "", poolId, startDatum, title };
        let mutation: typeof createPoolAufgabe | undefined;
        let variables: Record<string, unknown> | undefined;
        if (taskType === "NOTIZ") {
          mutation = createPoolNotiz;
          variables = { data: { ...kategorieVariables, ...generalVariables } };
        } else if (taskType === "DOKUMENT") {
          mutation = createPoolDokument;
          variables = {
            data: { dokument: "", ...kategorieVariables, ...generalVariables },
          };
        } else if (taskType === "AUFGABE") {
          const nowPlus7Days = new Date();
          nowPlus7Days.setDate(new Date().getDate() + 7);
          const faelligkeitsDatum = nowPlus7Days.toISOString().split("T")[0];
          mutation = createPoolAufgabe;
          variables = { data: { faelligkeitsDatum, ...generalVariables } };
        }
        if (variables && mutation) {
          client
            .request<CreatePoolNotizMutation>(mutation, variables)
            .then((result) => {
              navigateToTask(result.createTasks.at(-1)?.taskId);
            })
            .catch(console.error);
        }
        return;
      }

      const generalVariables = {
        notiz: "",
        startDatum,
        taskId: effectiveTaskId,
        title,
        vflzId,
      };
      let mutation: typeof createAufgabe | undefined;
      let variables: Record<string, unknown> | undefined;
      if (taskType === "NOTIZ") {
        mutation = createNotiz;
        variables = { data: { ...kategorieVariables, ...generalVariables } };
      } else if (taskType === "DOKUMENT") {
        mutation = createDokument;
        variables = {
          data: { dokument: "", ...kategorieVariables, ...generalVariables },
        };
      } else if (taskType === "AUFGABE") {
        const nowPlus7Days = new Date();
        nowPlus7Days.setDate(new Date().getDate() + 7);
        const faelligkeitsDatum = nowPlus7Days.toISOString().split("T")[0];
        mutation = createAufgabe;
        variables = { data: { faelligkeitsDatum, ...generalVariables } };
      }
      if (variables && mutation) {
        client
          .request<CreateStandortNotizMutation>(mutation, variables)
          .then((result) => {
            navigateToTask(result.createTask.taskId);
          })
          .catch(console.error);
      }
    },
    [forceStartProzess, navigateToTask, t, taskId],
  );
}
