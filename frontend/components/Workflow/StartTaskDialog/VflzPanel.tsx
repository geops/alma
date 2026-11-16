import { Combobox, ComboboxInput, ComboboxOptions } from "@headlessui/react";
import { gql } from "graphql-request";
import debounce from "lodash/debounce";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import SearchIcon from "@/components/icons/SearchIcon";
import XIcon from "@/components/icons/XIcon";
import Trans from "@/components/Trans";
import VflzItem from "@/components/VflzItem";
import VflzList from "@/components/VflzList";
import fonts from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";

import FooterWarningMessage from "./FooterWarningMessage";
import { useTasksContext } from "./TasksContext";
import { SelectedInput } from "./TaskTargetSelection";

import type { ChangeEvent } from "react";

import type {
  TaskOption,
  TaskTargetStandortSearchQuery,
  TaskTargetVflzItemQuery,
} from "@/lib/graphql";

const queryVflzItem = gql`
  query taskTargetVflzItem($vflzId: ID!) {
    vflz(vflzId: $vflzId) {
      ...VflzItem
      prozesse {
        optionId
        title
        type
      }
    }
  }
  ${VflzItem.fragment}
`;

const queryTaskTargetStandortSearch = gql`
  query taskTargetStandortSearch($query: String!, $lang: Language!) {
    search(query: $query, lang: $lang, perPage: 10) {
      graph {
        results {
          ...VflzItem
          prozesse {
            optionId
            title
            type
          }
        }
      }
    }
  }
  ${VflzItem.fragment}
`;

export function VflzPanel() {
  const { activeLocale, t } = useI18n();
  const {
    prozesseOptions,
    selectedOptionId,
    selectedTaskType,
    selectedVflz,
    setSelectedVflz,
    taskId,
    updateCanCreate,
    vflzId,
  } = useTasksContext();
  const [query, setQuery] = useState("");

  const handleInputChange = useMemo(
    () =>
      debounce((event: ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
      }, 300),
    [],
  );

  // When the panel is initialised with an vflzId we fetch the vflz data
  const { data: vflzItemData } = useSWR<TaskTargetVflzItemQuery>(
    vflzId && !selectedVflz ? [queryVflzItem, { vflzId }] : null,
  );

  const opts = useMemo<TaskOption[]>(() => {
    return taskId ? prozesseOptions : (selectedVflz?.prozesse ?? []);
  }, [prozesseOptions, selectedVflz, taskId]);

  useEffect(() => {
    if (vflzItemData?.vflz) {
      setSelectedVflz(vflzItemData.vflz);
    }
  }, [vflzItemData, setSelectedVflz]);

  const { data, isLoading } = useSWR<TaskTargetStandortSearchQuery>(
    query && [
      queryTaskTargetStandortSearch,
      { lang: activeLocale.toUpperCase(), query },
    ],
  );

  useEffect(() => {
    updateCanCreate(false, opts);
  }, [updateCanCreate, opts]);

  if (selectedVflz) {
    const prozessAvailable = (
      taskId ? prozesseOptions : selectedVflz.prozesse
    ).some((prozess) => prozess.optionId === selectedOptionId);

    return (
      <>
        {!vflzId ? (
          <SelectedInput
            dataTest="Workflow-selectedStandort"
            onClick={() => setSelectedVflz(undefined)}
            value={
              <span className="flex items-center justify-between">
                <span className="mt-0.5">{selectedVflz.bezeichnung ?? ""}</span>
                <XIcon className="text-gray-6 hover:text-gray-7 w-4 shrink-0 cursor-pointer" />
              </span>
            }
          />
        ) : null}
        <VflzItem
          className="rounded-lg py-2"
          clickable={false}
          link={false}
          vflz={selectedVflz}
        />
        {selectedTaskType === "WORKFLOW" && !prozessAvailable ? (
          <FooterWarningMessage>
            <Trans
              i18nKey="workflow.prozessAlreadyExists"
              values={{
                title: (
                  <strong>
                    {t(
                      prozesseOptions.find(
                        (p) => p.optionId === selectedOptionId,
                      )?.title ?? "",
                    )}
                  </strong>
                ),
              }}
            />
          </FooterWarningMessage>
        ) : null}
      </>
    );
  }

  return (
    <Combobox
      immediate
      onChange={(selectedId: null | string) => {
        const vflz = data?.search.graph.results.find((result) => {
          return result.vflzId === selectedId;
        });
        if (vflz) {
          setSelectedVflz(vflz);
          setQuery("");
        }
      }}
      onClose={() => {
        setQuery("");
      }}
      value={query}
    >
      <div className="relative">
        <SearchIcon className="text-gray-6 absolute top-2.5 left-2.5" />
        <ComboboxInput
          autoComplete="off"
          // eslint-disable-next-line jsx-a11y-x/no-autofocus
          autoFocus
          className="border-gray-5 w-full rounded-lg border px-3 py-2.5 pl-8 text-xs font-medium shadow-xs focus:outline-hidden"
          data-test="Workflow-standortSearchInput"
          onChange={handleInputChange}
          placeholder={t("workflow.searchStandorte")}
        />
      </div>
      {query ? (
        <ComboboxOptions
          anchor={{ gap: "8px", padding: "32px", to: "bottom start" }}
          className={`${fonts} border-gray-5 z-30 w-(--input-width) rounded-lg border border-t-0 bg-white shadow-lg`}
          static
        >
          <VflzList
            isCombobox
            items={isLoading ? undefined : data?.search.graph.results}
            noResults={t("quickSearch.noResults")}
          />
        </ComboboxOptions>
      ) : null}
    </Combobox>
  );
}
