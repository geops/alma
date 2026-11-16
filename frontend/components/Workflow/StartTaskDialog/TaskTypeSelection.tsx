import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { useCallback, useEffect, useMemo } from "react";

import Button from "@/components/Button";
import { anchor } from "@/components/Combobox";
import CheckIcon from "@/components/icons/CheckIcon";
import ChevronIcon from "@/components/icons/ChevronIcon";
import Message from "@/components/Message";
import fonts from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";

import TaskIcon from "../TaskIcon";

import { type SelectionType, useTasksContext } from "./TasksContext";
import useCreateTask from "./useCreateTask";

import { taskTypes } from "./index";

import type { TaskOption } from "@/lib/graphql";

function TaskOptions({
  onSelect,
}: {
  onSelect: (taskType: SelectionType, optionId?: string) => void;
}) {
  const { t } = useI18n();
  const { problems, prozesseOptions, selectedOptionId, setSelectedOptionId } =
    useTasksContext();
  const unavailableReason =
    prozesseOptions.length === 0 ? problems?.at(0) : undefined;

  const selectedOption = useMemo<TaskOption | undefined>(
    () =>
      prozesseOptions.find((o) => o.optionId === selectedOptionId) ??
      prozesseOptions?.[0],
    [prozesseOptions, selectedOptionId],
  );

  useEffect(() => {
    setSelectedOptionId(selectedOption?.optionId);
  }, [selectedOption, setSelectedOptionId]);

  return (
    <>
      {prozesseOptions.length > 0 ? (
        <div className="flex w-full items-center gap-1">
          <Listbox
            as="div"
            className="relative min-w-80 flex-1"
            onChange={setSelectedOptionId}
            value={selectedOptionId}
          >
            <ListboxButton
              className="group border-gray-5 disabled:bg-gray-2 disabled:text-gray-6 data-active:border-blue-4 data-active:ring-blue-6/25 flex min-h-8.5 w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-xs shadow-xs data-active:ring-4 data-active:outline-hidden"
              data-test="Workflow-select-button"
            >
              <span className="truncate">
                {selectedOption ? (
                  <>
                    <TaskIcon
                      className="mr-1 inline shrink-0"
                      taskType={selectedOption.type}
                    />
                    <span className="w-full align-middle text-sm">
                      {t((selectedOption || prozesseOptions[0]).title)}
                    </span>
                  </>
                ) : null}
              </span>
              <ChevronIcon className="text-gray-6 flex-none rotate-180 transition-transform group-data-active:rotate-0" />
            </ListboxButton>
            <ListboxOptions
              anchor={anchor}
              className={`${fonts} border-gray-5 z-30 w-(--button-width) space-y-1 rounded-lg border bg-white p-1 shadow-lg`}
            >
              {prozesseOptions.map(({ optionId, title, type }) => (
                <ListboxOption
                  className="data-selected:bg-gray-2 group data-selected:text-gray-8 text-gray-7 hover:bg-gray-2 hover:text-gray-8 flex cursor-pointer items-center justify-between rounded-md p-2.5 pl-2 text-sm font-medium"
                  data-test={`Workflow-select-${type}-${optionId}`}
                  key={optionId}
                  value={optionId}
                >
                  <span className="flex items-center gap-2">
                    <TaskIcon className="shrink-0" taskType={type} />
                    <span className="text-sm">{t(title)}</span>
                  </span>
                  <CheckIcon className="text-blue-6 hidden shrink-0 group-data-selected:block" />
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Listbox>
          <Button
            className="h-10"
            data-test="Workflow-startProzess"
            onClick={() =>
              selectedOptionId && onSelect("WORKFLOW", selectedOptionId)
            }
          >
            {t("workflow.start")}
          </Button>
        </div>
      ) : null}
      {unavailableReason ? (
        <Message>
          <span data-test="StartTaskDialog-unavailableReason">
            {unavailableReason.messageCode
              ? t(unavailableReason.messageCode) || unavailableReason.message
              : unavailableReason.message}
          </span>
        </Message>
      ) : null}

      {taskTypes.map((taskType) => {
        return (
          <Button
            data-test={`Workflow-create${taskType}`}
            key={taskType}
            onClick={() => onSelect(taskType)}
            plain
          >
            <TaskIcon taskType={taskType} />
            <span className="ml-2 grow text-left">
              {t(`TaskType.${taskType}`)}
            </span>
          </Button>
        );
      })}
    </>
  );
}

export default function TaskTypeSelection({
  onClose,
  onSelect,
  reloadList,
  taskId,
  vflzId,
}: {
  onClose?: () => void;
  onSelect?: (taskType: SelectionType) => void;
  reloadList?: (newTaskId?: string) => void;
  taskId?: string;
  vflzId?: string;
}) {
  const createTask = useCreateTask({
    onClose,
    reloadList,
    taskId,
  });

  const handleSelect = useCallback(
    (taskType: SelectionType, optionId?: string) => {
      return onSelect
        ? onSelect(taskType)
        : createTask({ optionId, taskType, vflzId });
    },
    [createTask, onSelect, vflzId],
  );

  return (
    <div className="flex max-w-100 flex-col gap-2">
      <TaskOptions onSelect={handleSelect} />
    </div>
  );
}
