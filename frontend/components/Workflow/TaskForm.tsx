import { gql } from "graphql-request";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useRouter } from "next/router";
import { useCallback, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useSWRConfig } from "swr";

import ActionMenu from "@/components/ActionMenu";
import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import CodeListbox from "@/components/CodeListbox";
import DatePicker from "@/components/DatePicker";
import Dialog from "@/components/Dialog";
import Form from "@/components/Form";
import PlusIcon from "@/components/icons/PlusIcon";
import TrashIcon from "@/components/icons/TrashIcon";
import Input from "@/components/Input";
import Listbox from "@/components/Listbox";
import Message from "@/components/Message";
import Textarea from "@/components/Textarea";
import client from "@/lib/client";
import { dayEnd, dayStart } from "@/lib/date";
import getVflzUrl from "@/lib/getVflzUrl";
import { TaskStatus, TaskType } from "@/lib/graphql";
import { type tFunction, useI18n } from "@/lib/i18n";
import toLocaleDateString from "@/lib/toLocaleDateString";
import useCurrentUser from "@/lib/useCurrentUser";

import BeteiligteField, {
  beteiligterFragment,
  beteiligterGeschaeftFragment,
} from "./BeteiligteField";
import { queryGlobal, queryVflz } from "./queries";
import StartTaskDialog from "./StartTaskDialog/index";
import TaskIcon from "./TaskIcon";

import type React from "react";
import type { UseFormGetValues, UseFormSetValue } from "react-hook-form";

import type {
  ProblemTasksFragment,
  TaskEventsFragment,
  TaskFormFragment,
  UpdateAufgabeInput,
  UpdateDokumentInput,
  UpdateFormularInput,
  UpdateNotizInput,
  UpdateProzessInput,
} from "@/lib/graphql";

import type { TaskProps } from "./Task";

const deleteTaskMutation = gql`
  mutation deleteTask($taskId: ID!) {
    deleteTask(taskId: $taskId)
  }
`;

function DeleteTaskDialog({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("workflow.delete.title")}
    >
      <span className="block">{t("workflow.delete.confirm")}</span>
      <div className="mt-8 flex justify-end gap-2">
        <Button onClick={onClose} outline>
          {t("workflow.delete.cancel")}
        </Button>
        <Button onClick={onConfirm}>{t("workflow.delete.delete")}</Button>
      </div>
    </Dialog>
  );
}

function UpdateTasksDialog({
  isOpen,
  onClose,
  problemTasks,
  submitFormAndUpdateTasks,
}: {
  isOpen: boolean;
  onClose: () => void;
  problemTasks?: ProblemTasksFragment;
  submitFormAndUpdateTasks: () => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("workflow.updateDialog.title")}
    >
      {(problemTasks?.faelligkeitsDatumProblemTasks.length ?? 0) > 0 ? (
        <div className="text-sm">
          <div>{t("workflow.updateDialog.faelligkeit")}:</div>
          <ul className="list-disc pt-2 pl-4">
            {problemTasks?.faelligkeitsDatumProblemTasks.map((task) => {
              return <li key={task.taskId}>{t(task.title) || task.title}</li>;
            })}
          </ul>
        </div>
      ) : null}
      {(problemTasks?.statusProblemTasks.length ?? 0) > 0 ? (
        <div className="text-sm">
          <div className="mt-6">{t("workflow.updateDialog.status")}:</div>
          <ul className="list-disc pt-2 pl-4">
            {problemTasks?.statusProblemTasks.map((task) => {
              return <li key={task.taskId}>{t(task.title) || task.title}</li>;
            })}
          </ul>
        </div>
      ) : null}
      <div className="mt-8 flex justify-end gap-2">
        <Button onClick={onClose} outline>
          {t("cancel")}
        </Button>
        <Button onClick={submitFormAndUpdateTasks}>
          {t("workflow.updateDialog.save")}
        </Button>
      </div>
    </Dialog>
  );
}

// Functions use to update the status fields based on the values of the other fields.
// This is used to ensure that the status is always consistent with the other fields.
const updateStatusFields = (
  {
    endDatum,
    faelligkeitsDatum,
    status,
  }: {
    endDatum?: string;
    faelligkeitsDatum?: string;
    status?: TaskStatus;
  },
  setValue: UseFormSetValue<TaskFormFragment>,
  options?: {
    getValues: UseFormGetValues<TaskFormFragment>;
    validateEndDatum?: (endDate: string) => boolean | string | undefined;
  },
) => {
  const { getValues, validateEndDatum } = options ?? {};
  const faelligkeitsDatumValue = getValues?.("faelligkeitsDatum");
  const statusValue = getValues?.("status");
  const endDatumValue = getValues?.("endDatum");

  if (endDatum !== null && endDatum !== undefined) {
    if (!endDatum || endDatum === "") {
      setValue("status", TaskStatus.Offen);

      // Set default value for faelligkeitsDatum if it is not set
      if (!faelligkeitsDatumValue) {
        const now = new Date();
        setValue("faelligkeitsDatum", now.toISOString().split("Z")[0]);
      }
    } else if (!validateEndDatum?.(endDatum)) {
      // do nothing
    } else if (!Number.isNaN(new Date(endDatum))) {
      setValue("status", TaskStatus.Abgeschlossen);
    }
  } else if (faelligkeitsDatum !== null && faelligkeitsDatum !== undefined) {
    if (!faelligkeitsDatum && statusValue === TaskStatus.Offen) {
      setValue("status", TaskStatus.Ruhend);
    } else if (statusValue === TaskStatus.Ruhend) {
      setValue("status", TaskStatus.Offen);
    }
  } else if (status !== null && status !== undefined) {
    if (status === TaskStatus.Ruhend) {
      setValue("faelligkeitsDatum", "");
      setValue("endDatum", "");
    } else if (status === TaskStatus.Abgeschlossen && !endDatumValue) {
      // Set default value for endDatum if it is not set
      const now = new Date();
      setValue("endDatum", now.toISOString().split("Z")[0]);
    } else if (status === TaskStatus.Offen) {
      setValue("endDatum", "");

      // Set default value for faelligkeitsDatum if it is not set
      if (!faelligkeitsDatumValue) {
        const now = new Date();
        setValue("faelligkeitsDatum", now.toISOString().split("Z")[0]);
      }
    }
  }
};

function OpenEventsBlockingDialog({
  isOpen,
  onClose,
  problemTasks,
}: {
  isOpen: boolean;
  onClose: () => void;
  problemTasks?: ProblemTasksFragment;
}) {
  const { t } = useI18n();
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("workflow.openEventsDialog.title")}
    >
      <p className="text-sm">{t("workflow.openEventsDialog.message")}</p>
      {(problemTasks?.openEventsProblemTasks.length ?? 0) > 0 ? (
        <div className="mt-4 text-sm">
          <ul className="list-disc pt-2 pl-4">
            {problemTasks?.openEventsProblemTasks.map((task) => {
              return <li key={task.taskId}>{t(task.title) || task.title}</li>;
            })}
          </ul>
        </div>
      ) : null}
      <div className="mt-8 flex justify-end gap-2">
        <Button onClick={onClose} outline>
          {t("cancel")}
        </Button>
      </div>
    </Dialog>
  );
}

function StatusFields() {
  const { t } = useI18n();
  const { getValues, setValue, watch } = useFormContext<TaskFormFragment>();
  const endDatum = watch("endDatum");

  const validateEndDatum = useCallback(
    (endDate: string) => {
      const [startDatum, status] = getValues(["startDatum", "status"]);
      if ((!endDate || endDate === "") && status === TaskStatus.Abgeschlossen) {
        return "endDatum";
      }
      if (startDatum && endDate && dayEnd(endDate) < dayStart(startDatum)) {
        return "startEnde";
      }
      const date = new Date(endDate);
      if (!Number.isNaN(date.getTime())) {
        return true;
      }
    },
    [getValues],
  );

  return (
    <>
      <div className="flex gap-2">
        <DatePicker
          name="startDatum"
          required={true}
          validate={(val) => {
            if (!val) {
              return "required";
            }
            if (endDatum) {
              if (dayStart(val as string) > dayEnd(endDatum)) {
                return "startEnde";
              }
            }
            return true;
          }}
        />
        <DatePicker
          name="faelligkeitsDatum"
          onChange={(val) => {
            updateStatusFields({ faelligkeitsDatum: val }, setValue, {
              getValues,
              validateEndDatum,
            });
          }}
        />
        <DatePicker
          name="endDatum"
          onChange={(val) => {
            updateStatusFields({ endDatum: val }, setValue, {
              getValues,
              validateEndDatum,
            });
          }}
          validate={(val) => {
            return validateEndDatum(val as string);
          }}
        />
      </div>
      <Listbox
        name="status"
        onChange={(value) => {
          updateStatusFields({ status: value as TaskStatus }, setValue, {
            getValues,
            validateEndDatum,
          });
        }}
        options={[
          {
            label: t(`TaskStatus.${TaskStatus.Offen}`),
            value: TaskStatus.Offen,
          },
          {
            label: t(`TaskStatus.${TaskStatus.Abgeschlossen}`),
            value: TaskStatus.Abgeschlossen,
          },
          {
            label: t(`TaskStatus.${TaskStatus.Ruhend}`),
            value: TaskStatus.Ruhend,
          },
        ]}
        required
      />
    </>
  );
}

function TaskEvents({ items }: { items?: TaskFormFragment["events"] }) {
  const { t } = useI18n();
  const pathname = usePathname();
  return items && items.length > 0 ? (
    <Message>
      <ul
        className="list-disc space-y-1 py-1 pl-4"
        data-test="Workflow-taskEvents"
      >
        {items.map((item) => {
          let href =
            "vflzId" in item
              ? `/vflz/${item.vflzId}/evaluation#beurteilung`
              : pathname;
          if (item.__typename === "StandortHistorisiert") {
            href = `/vflz/${item.newVflzId}/evaluation#beurteilung`;
          } else if (item.__typename === "ProzessGestartet") {
            href = `${pathname}?id=${item.taskId}`;
          }
          const params = {
            code: "code" in item ? t(item.code) || item.code : "",
            date: "timestamp" in item ? toLocaleDateString(item.timestamp) : "",
            title: "title" in item ? t(item.title) || item.title : "",
          };
          return (
            <li key={item.__typename}>
              <Link className="text-blue-8 hover:underline" href={href}>
                {t(`workflow.event.${item.__typename}`, params)}
              </Link>
            </li>
          );
        })}
      </ul>
    </Message>
  ) : null;
}

function TaskTriggers({ items }: { items?: TaskFormFragment["triggers"] }) {
  const { t } = useI18n();
  return items && items.length > 0 ? (
    <Message>
      <ul className="list-disc space-y-1 py-1 pl-4">
        {items.map((item) => {
          return (
            <li key={item.__typename}>
              {t(`workflow.trigger.${item.__typename}`, {
                code: "code" in item ? t(item.code) || item.code : "",
                title: "title" in item ? t(item.title) || item.title : "",
              })}
            </li>
          );
        })}
      </ul>
    </Message>
  ) : null;
}

function toInput(
  t: tFunction,
  values: TaskFormFragment,
  task: TaskFormFragment,
  includeStatusFields = false,
  includeKategorieFields = false,
):
  | UpdateAufgabeInput
  | UpdateDokumentInput
  | UpdateFormularInput
  | UpdateNotizInput
  | UpdateProzessInput {
  // for Formular tasks set empty boolean "eingaben" to false
  if (task.type === TaskType.Formular && "felder" in task) {
    task.felder.forEach((feld) => {
      if (
        feld.type === "bool" &&
        "eingaben" in values &&
        (values.eingaben === null ||
          typeof values.eingaben !== "object" ||
          !(feld.name in values.eingaben) ||
          values.eingaben[feld.name] === null)
      ) {
        values.eingaben = {
          ...values.eingaben,
          [feld.name]: false,
        };
      }
    });
  }

  const title = t(task.title) === values.title ? task.title : values.title;
  const statusFields = includeStatusFields
    ? {
        endDatum:
          !values.endDatum || values.endDatum === ""
            ? null
            : values.endDatum.split("T")[0],
        faelligkeitsDatum:
          !values.faelligkeitsDatum || values.faelligkeitsDatum === ""
            ? null
            : values.faelligkeitsDatum.split("T")[0],
        status: values.status,
      }
    : {};
  const kategorieFields = includeKategorieFields
    ? {
        kategorie: values.kategorie,
        oeffentlich: values.oeffentlich,
      }
    : {};
  return {
    ...statusFields,
    ...kategorieFields,
    dokument: "dokument" in values ? values.dokument! : undefined,
    eingaben:
      "eingaben" in values && typeof values.eingaben === "object"
        ? values.eingaben
        : undefined,
    notiz: values.notiz,
    sachbearbeitung: values.sachbearbeitung.map((b) => {
      return {
        betTaskId: b.betTaskId || null,
        subjId: b.subjekt.subjId,
      };
    }),
    sonstigeBeteiligte: values.sonstigeBeteiligte.map((b) => {
      return {
        betTaskId: b.betTaskId || null,
        subjId: b.subjekt.subjId,
      };
    }),
    startDatum: values.startDatum.split("T")[0],
    taskId: task.taskId,
    title,
    url: "url" in values ? values.url : undefined,
  };
}

interface Mutation {
  task:
    | ({
        __typename: "Aufgabe" | "Dokument" | "Formular" | "Notiz" | "Prozess";
      } & TaskEventsFragment)
    | { __typename: "ProblemGroup" }
    | ProblemTasksFragment;
}

const queryVflzKey = queryVflz.replace(/\n/g, "\\n");
const queryGlobalKey = queryGlobal.replace(/\n/g, "\\n");

function TaskForm<T extends Mutation>({
  children,
  className = "max-w-xl space-y-4",
  mutatePage,
  mutateTask,
  mutation,
  reloadList,
  showKategorieFields,
  showStatusFields,
  task,
}: React.PropsWithChildren<{
  className?: string;
  mutation: string;
  reloadList?: (taskId?: string) => void;
  showKategorieFields?: boolean;
  showStatusFields?: boolean;
}> &
  TaskProps) {
  const { permissions } = useCurrentUser();
  const { t } = useI18n();
  const { cache } = useSWRConfig();
  const formRef = useRef<HTMLFormElement>(null);
  const updateTasksRef = useRef(false);
  const [problemTasks, setProblemTasks] = useState<ProblemTasksFragment>();
  const [isStartTaskDialogOpen, setIsStartTaskDialogOpen] = useState(false);
  const [isDeleteTaskDialogOpen, setIsDeleteTaskDialogOpen] = useState(false);
  const [isUpdateTasksDialogOpen, setIsUpdateTasksDialogOpen] = useState(false);
  const [isOpenEventsBlockingDialogOpen, setIsOpenEventsBlockingDialogOpen] =
    useState(false);
  const values = task
    ? { ...task, title: t(task.title) || task.title }
    : undefined;
  const params = useParams<{ vflzId: string | undefined }>();
  const pathname = usePathname();
  const router = useRouter();
  const isVflzPage = pathname?.split("/").at(1)?.localeCompare("vflz") === 0;
  const deleteTask = useCallback(async () => {
    await client.request(deleteTaskMutation, {
      taskId: values?.taskId,
    });
    void router.replace(pathname);
  }, [pathname, router, values?.taskId]);

  return (
    <>
      <StartTaskDialog
        isOpen={isStartTaskDialogOpen}
        onClose={() => {
          setIsStartTaskDialogOpen(false);
        }}
        options={values?.folgeschritte.availableOptions}
        optionsSource="provided"
        problems={values?.folgeschritte.problems}
        reloadList={reloadList}
        taskId={values?.taskId}
        title={t("workflow.startFolgeschrittTitle")}
        vflzId={values?.vflz?.latestVflzId}
      />
      <DeleteTaskDialog
        isOpen={isDeleteTaskDialogOpen}
        onClose={() => {
          setIsDeleteTaskDialogOpen(false);
        }}
        onConfirm={() => {
          void (async () => {
            await deleteTask();
            if (reloadList) {
              reloadList(undefined);
            }
            setIsDeleteTaskDialogOpen(false);
          })();
        }}
      />
      <UpdateTasksDialog
        isOpen={isUpdateTasksDialogOpen}
        onClose={() => {
          setIsUpdateTasksDialogOpen(false);
        }}
        problemTasks={problemTasks}
        submitFormAndUpdateTasks={() => {
          updateTasksRef.current = true;
          formRef.current?.requestSubmit();
          setIsUpdateTasksDialogOpen(false);
        }}
      />
      <OpenEventsBlockingDialog
        isOpen={isOpenEventsBlockingDialogOpen}
        onClose={() => {
          setIsOpenEventsBlockingDialogOpen(false);
        }}
        problemTasks={problemTasks}
      />
      <Form
        className={className}
        data-test="Workflow-taskForm"
        defaultValues={values}
        disabled={!permissions.canEditProcess || values?.readOnly}
        model="Task"
        onSubmit={async (data) => {
          const result = await client.request<T>(mutation, {
            data: toInput(t, data, task, showStatusFields, showKategorieFields),
            updateTasks: updateTasksRef.current,
          });
          updateTasksRef.current = false;
          if (result.task.__typename === "WorkflowProblemGroup") {
            setProblemTasks(result.task);
            if ((result.task.openEventsProblemTasks?.length ?? 0) > 0) {
              setIsOpenEventsBlockingDialogOpen(true);
            } else {
              setIsUpdateTasksDialogOpen(true);
            }
          } else {
            // delete stale cache items for list queries,
            // to avoid flickering list items when clicking
            // on an item which was mutated on the server
            const keys = cache.keys();
            for (const key of keys) {
              if (key.includes(queryGlobalKey) || key.includes(queryVflzKey)) {
                cache.delete(key);
              }
            }
            await mutateTask();
            if (reloadList) {
              void reloadList(values?.taskId);
            }
            if ("events" in result.task) {
              const newVflzId = result.task.events.find((e) => {
                return e.__typename === "StandortHistorisiert";
              })?.newVflzId;
              if (parseInt(newVflzId ?? "") > parseInt(params.vflzId ?? "")) {
                setTimeout(() => {
                  // wait for form to reset, then navigate to new VFLZ page
                  void router.push(getVflzUrl(newVflzId ?? ""), undefined, {
                    scroll: false,
                  });
                }, 300);
              } else {
                void mutatePage?.();
              }
            }
          }
        }}
        ref={formRef}
        values={values}
      >
        <div
          className="mb-2 flex items-center space-x-1"
          data-test="Workflow-taskTitle"
        >
          {values && <TaskIcon className="shrink-0" taskType={values.type} />}
          <span>{values?.title}</span>
        </div>
        {values?.vflz?.latestVflzId && (
          <div className="mb-4 block">
            <Link
              className="text-blue-7 text-sm font-medium"
              href={`/vflz/${values.vflz.latestVflzId}/workflow?id=${values.taskId}`}
            >
              {values && "vflzInfo" in values
                ? `${values.vflzInfo?.combinedId} ${values.vflzInfo?.bezeichnung}`
                : null}
            </Link>
          </div>
        )}
        {children}
        {showStatusFields ? (
          <StatusFields />
        ) : (
          <DatePicker
            name="startDatum"
            required={true}
            validate={(val) => {
              if (!val) {
                return "required";
              }
            }}
          />
        )}

        {values?.status === TaskStatus.Abgeschlossen ? (
          <TaskEvents items={values?.events} />
        ) : (
          <TaskTriggers items={values?.triggers} />
        )}
        <Input data-test="Workflow-taskTitle" name="title" />
        {showKategorieFields ? (
          <>
            <CodeListbox name="kategorie" />
            <Checkbox name="oeffentlich" />
          </>
        ) : null}
        <Textarea className="min-h-8.5" name="notiz" />
        <BeteiligteField
          name="sachbearbeitung"
          vflzBeteiligte={values?.vflz.beteiligte}
        />
        <BeteiligteField
          name="sonstigeBeteiligte"
          vflzBeteiligte={values?.vflz.beteiligte}
        />
        {permissions.canEditProcess ? (
          <ActionMenu>
            <ActionMenu.Item
              data-test="WorkflowActionMenu-startTask"
              onClick={() => {
                setIsStartTaskDialogOpen(true);
              }}
            >
              <PlusIcon />
              <span>{t("workflow.startFolgeschritt")}</span>
            </ActionMenu.Item>
            {isVflzPage ? (
              <ActionMenu.Item
                data-test="WorkflowActionMenu-deleteTask"
                disabled={!values?.deletable}
                onClick={() => {
                  setIsDeleteTaskDialogOpen(true);
                }}
              >
                <TrashIcon className={values?.deletable ? "text-red-6" : ""} />
                <span>{t("workflow.deleteTask")}</span>
              </ActionMenu.Item>
            ) : null}
            <ActionMenu.ResetActionItem />
          </ActionMenu>
        ) : null}
      </Form>
    </>
  );
}

TaskForm.fragment = gql`
  fragment TaskForm on Task {
    deletable
    faelligkeitsDatum
    faelligkeitsStatus
    endDatum
    kategorie
    notiz
    oeffentlich
    readOnly
    startDatum
    status
    taskId
    title
    type
    events {
      __typename
      ... on StandortHistorisiert {
        timestamp
        newVflzId
      }
      ... on UntersuchungsStandGesetzt {
        code
        timestamp
        vflzId
      }
      ... on BearbeitungsstandGesetzt {
        code
        timestamp
        vflzId
      }
      ... on AusKbsGeloescht {
        timestamp
        vflzId
      }
      ... on InKbsEingetragen {
        timestamp
        vflzId
      }
      ... on ProzessGestartet {
        timestamp
        title
        taskId
      }
    }
    folgeschritte {
      availableOptions {
        optionId
        title
        type
      }
      problems {
        message
        messageCode
      }
    }
    sachbearbeitung {
      ...BeteiligteFieldBeteiligterGeschaeft
    }
    sonstigeBeteiligte {
      ...BeteiligteFieldBeteiligterGeschaeft
    }
    triggers {
      __typename
      ... on StandortHistorisieren {
        value
      }
      ... on UntersuchungsStandSetzen {
        code
      }
      ... on BearbeitungsstandSetzen {
        code
      }
      ... on ProzessStarten {
        title
      }
    }
    vflz {
      latestVflzId
      beteiligte {
        ...BeteiligteFieldBeteiligter
      }
    }
    vflzInfo: vflz @include(if: $withVflzInfo) {
      combinedId
      bezeichnung
    }
    ... on Dokument {
      dokument
      url
    }
    ... on Notiz {
      url
    }
    ... on Formular {
      felder
      eingaben
    }
  }
  ${beteiligterFragment}
  ${beteiligterGeschaeftFragment}
`;

TaskForm.eventsFragment = gql`
  fragment TaskEvents on Task {
    events {
      __typename
      ... on StandortHistorisiert {
        newVflzId
      }
      ... on UntersuchungsStandGesetzt {
        vflzId
      }
      ... on BearbeitungsstandGesetzt {
        vflzId
      }
      ... on AusKbsGeloescht {
        vflzId
      }
      ... on InKbsEingetragen {
        vflzId
      }
    }
  }
`;

TaskForm.problemTasksFragment = gql`
  fragment ProblemTasks on WorkflowProblemGroup {
    __typename
    faelligkeitsDatumProblemTasks {
      taskId
      title
    }
    statusProblemTasks {
      taskId
      title
    }
    openEventsProblemTasks {
      taskId
      title
    }
  }
`;

export default TaskForm;
