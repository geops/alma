import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { gql } from "graphql-request";
import debounce from "lodash/debounce";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";

import Button from "@/components/Button";
import SearchIcon from "@/components/icons/SearchIcon";
import Spinner from "@/components/Spinner";
import Trans from "@/components/Trans";
import VflzItem from "@/components/VflzItem";
import fonts from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import useInfiniteScroll from "@/lib/useInfiniteScroll";

import FooterWarningMessage from "./FooterWarningMessage";
import { poolOptionFragment, useTasksContext } from "./TasksContext";
import { SelectedInput } from "./TaskTargetSelection";

import type { ChangeEvent } from "react";

import type {
  PoolOptionFragment,
  TaskTargetPoolFolgeschrittInvalidQuery,
  TaskTargetPoolFolgeschrittValidQuery,
  TaskTargetPoolSearchQuery,
} from "@/lib/graphql";

const queryTaskTargetPoolSearch = gql`
  query taskTargetPoolSearch($filterBezeichnung: String!, $vflzId: ID) {
    pools(filterBezeichnung: $filterBezeichnung, vflzId: $vflzId, perPage: 10) {
      results {
        ...PoolOption
      }
    }
  }
  ${poolOptionFragment}
`;

const perPage = 10;

/** Paginates valid standorte; fetches just 1 invalid result to get the total. */
const queryTaskTargetPoolFolgeschrittValid = gql`
  query taskTargetPoolFolgeschrittValid(
    $poolId: ID!
    $optionId: ID
    $validPage: Int!
    $validPerPage: Int!
  ) {
    validatePoolFolgeschritt(
      data: { poolId: $poolId, optionId: $optionId }
      validPage: $validPage
      validPerPage: $validPerPage
      invalidPage: 1
      invalidPerPage: 1
    ) {
      validStandorte {
        numResultsTotal
        results {
          ...VflzItem
        }
      }
      invalidStandorte {
        numResultsTotal
      }
    }
  }
  ${VflzItem.fragment}
`;

/** Paginates invalid standorte; fetches just 1 valid result to get the total. */
const queryTaskTargetPoolFolgeschrittInvalid = gql`
  query taskTargetPoolFolgeschrittInvalid(
    $poolId: ID!
    $optionId: ID
    $invalidPage: Int!
    $invalidPerPage: Int!
  ) {
    validatePoolFolgeschritt(
      data: { poolId: $poolId, optionId: $optionId }
      validPage: 1
      validPerPage: 1
      invalidPage: $invalidPage
      invalidPerPage: $invalidPerPage
    ) {
      validStandorte {
        numResultsTotal
      }
      invalidStandorte {
        numResultsTotal
        results {
          ...VflzItem
        }
      }
    }
  }
  ${VflzItem.fragment}
`;

function PoolNumber({ number }: { number: number }) {
  return (
    <span className="border-gray-5 inline-grid size-6 shrink-0 place-items-center rounded-full border text-[11px] leading-none font-medium [font-variant-numeric:tabular-nums]">
      {number}
    </span>
  );
}

function ExcludedVflzMessage({
  numExcluded = 0,
  numTotal = 0,
}: {
  numExcluded?: number;
  numTotal?: number;
}) {
  const { t } = useI18n();

  if (!numTotal || !numExcluded) {
    return null;
  }

  return (
    <FooterWarningMessage
      title={
        <div className="mt-1.5 mb-1 text-sm font-bold">
          {t("workflow.pools.excludedSitesTitle", {
            includedCount: String(numTotal - numExcluded),
            totalCount: String(numTotal),
          })}
        </div>
      }
    >
      {numExcluded === 1
        ? t("workflow.pools.excludedSite")
        : t("workflow.pools.excludedSites", {
            count: String(numExcluded),
          })}
    </FooterWarningMessage>
  );
}

function PoolVflzList() {
  const { t } = useI18n();
  const {
    prozesseOptions,
    selectedOptionId,
    selectedPool,
    selectedTaskType,
    setCanCreate,
  } = useTasksContext();

  const [showInvalid, setShowInvalid] = useState(false);
  const [loadingContainer, setLoadingContainer] = useState<
    "invalid" | "valid" | null
  >(null);

  const optionId =
    selectedTaskType === "WORKFLOW" ? selectedOptionId : undefined;

  // Reset to valid tab when pool or option changes (during-render derived state)
  const [prevPoolOption, setPrevPoolOption] = useState(
    `${selectedPool?.poolId}|${optionId}`,
  );
  const poolOptionKey = `${selectedPool?.poolId}|${optionId}`;
  if (prevPoolOption !== poolOptionKey) {
    setPrevPoolOption(poolOptionKey);
    setShowInvalid(false);
  }

  // ── Valid query (always active) ────────────────────────────────────────────
  const getValidKey = (
    pageIndex: number,
    prev: null | TaskTargetPoolFolgeschrittValidQuery,
  ) => {
    if (!selectedPool?.poolId) return null;
    if (prev?.validatePoolFolgeschritt.validStandorte.results.length === 0)
      return null;
    return [
      queryTaskTargetPoolFolgeschrittValid,
      {
        optionId,
        poolId: selectedPool.poolId,
        validPage: pageIndex + 1,
        validPerPage: perPage,
      },
    ];
  };
  const {
    data: validPages,
    isValidating: isValidating_valid,
    setSize: setValidSize,
    size: validSize,
  } = useSWRInfinite<TaskTargetPoolFolgeschrittValidQuery>(getValidKey, {
    dedupingInterval: 0,
  });

  // ── Invalid query (only when tab is active) ────────────────────────────────
  const getInvalidKey = (
    pageIndex: number,
    prev: null | TaskTargetPoolFolgeschrittInvalidQuery,
  ) => {
    if (!selectedPool?.poolId || !showInvalid) return null;
    if (prev?.validatePoolFolgeschritt.invalidStandorte.results.length === 0)
      return null;
    return [
      queryTaskTargetPoolFolgeschrittInvalid,
      {
        invalidPage: pageIndex + 1,
        invalidPerPage: perPage,
        optionId,
        poolId: selectedPool.poolId,
      },
    ];
  };
  const {
    data: invalidPages,
    isValidating: isValidating_invalid,
    setSize: setInvalidSize,
    size: invalidSize,
  } = useSWRInfinite<TaskTargetPoolFolgeschrittInvalidQuery>(getInvalidKey, {
    dedupingInterval: 0,
  });

  const validResults = useMemo(
    () =>
      validPages?.flatMap(
        (p) => p.validatePoolFolgeschritt.validStandorte.results,
      ) ?? [],
    [validPages],
  );
  const invalidResults = useMemo(
    () =>
      invalidPages?.flatMap(
        (p) => p.validatePoolFolgeschritt.invalidStandorte.results,
      ) ?? [],
    [invalidPages],
  );

  const numValidTotal =
    validPages?.[0]?.validatePoolFolgeschritt.validStandorte.numResultsTotal ??
    0;
  const numInvalidTotal =
    validPages?.[0]?.validatePoolFolgeschritt.invalidStandorte
      .numResultsTotal ?? 0;

  useEffect(() => {
    setCanCreate(numValidTotal > 0);
  }, [numValidTotal, setCanCreate]);

  const hasMoreValid = validResults.length < numValidTotal;
  const hasMoreInvalid = invalidResults.length < numInvalidTotal;

  const loadMore = (container: "invalid" | "valid") => {
    setLoadingContainer(container);
    if (container === "valid" && !isValidating_valid)
      void setValidSize(validSize + 1);
    if (container === "invalid" && !isValidating_invalid)
      void setInvalidSize(invalidSize + 1);
  };

  const validScrollRef = useInfiniteScroll(() => {
    if (hasMoreValid) loadMore("valid");
  });
  const invalidScrollRef = useInfiniteScroll(() => {
    if (hasMoreInvalid) loadMore("invalid");
  });

  const selectedProzessTitle =
    prozesseOptions.find((p) => p.optionId === selectedOptionId)?.title ??
    selectedOptionId ??
    "";

  const isLoading = !validPages && isValidating_valid;

  let validListContent: React.ReactNode;
  if (isLoading) {
    validListContent = (
      <div className="flex justify-center py-4">
        <Spinner className="size-5" />
      </div>
    );
  } else if (numValidTotal === 0) {
    validListContent = (
      <p className="text-gray-6 px-3 py-4 text-xs">
        <Trans
          i18nKey="workflow.pools.noValidStandorte"
          values={{
            title: (
              <strong>{t(selectedProzessTitle) || selectedProzessTitle}</strong>
            ),
          }}
        />
      </p>
    );
  } else {
    validListContent = validResults.map((vflz) => (
      <VflzItem
        className="py-2"
        clickable={false}
        key={vflz.vflzId}
        link={false}
        vflz={vflz}
      />
    ));
  }

  return (
    <>
      <div className="border-gray-5 overflow-hidden rounded-lg border">
        {/* Header / tab strip */}
        {numInvalidTotal > 0 ? (
          <div className="bg-gray-2 flex items-stretch px-1 py-1">
            <Button
              active={!showInvalid}
              className="flex-1 self-stretch text-center text-xs whitespace-normal"
              group
              onClick={() => setShowInvalid(false)}
            >
              {t("workflow.pools.validStandorte")}
              <PoolNumber number={numValidTotal} />
            </Button>
            {numInvalidTotal > 0 && (
              <Button
                active={showInvalid}
                className="flex-1 self-stretch text-center text-xs whitespace-normal"
                group
                onClick={() => setShowInvalid(true)}
              >
                {t("workflow.pools.invalidStandorte")}
                <PoolNumber number={numInvalidTotal} />
              </Button>
            )}
          </div>
        ) : null}

        {/* Valid list */}
        <div
          className={`divide-gray-5 border-gray-5 max-h-64 divide-y overflow-y-auto ${
            showInvalid ? "hidden" : "block"
          } ${numInvalidTotal > 0 ? "border-t" : ""} max-h-[20vh]`}
          ref={validScrollRef}
        >
          {validListContent}
          {isValidating_valid && validPages && loadingContainer === "valid" ? (
            <div className="flex justify-center py-2">
              <Spinner className="size-5" />
            </div>
          ) : null}
        </div>

        {/* Invalid list */}
        <div
          className={`divide-gray-5 border-gray-5 max-h-64 divide-y overflow-y-auto border-t ${
            showInvalid ? "block" : "hidden"
          } max-h-[20vh]`}
          ref={invalidScrollRef}
        >
          {!invalidPages && isValidating_invalid ? (
            <div className="flex justify-center py-4">
              <Spinner className="size-5" />
            </div>
          ) : (
            invalidResults.map((vflz) => (
              <VflzItem
                className="py-2"
                clickable={false}
                key={vflz.vflzId}
                link={false}
                vflz={vflz}
              />
            ))
          )}
          {isValidating_invalid &&
          invalidPages &&
          loadingContainer === "invalid" ? (
            <div className="flex justify-center py-2">
              <Spinner className="size-5" />
            </div>
          ) : null}
        </div>
      </div>

      <ExcludedVflzMessage
        numExcluded={numInvalidTotal}
        numTotal={numValidTotal + numInvalidTotal}
      />
    </>
  );
}

function PoolSearchResults({
  isLoading,
  pools,
}: {
  isLoading: boolean;
  pools: PoolOptionFragment[];
}) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="text-gray-6 p-2.5 text-sm">
        {t("quickSearch.noResults")}
      </div>
    );
  }

  return pools.map((pool) => (
    <ComboboxOption
      className="data-focus:bg-gray-2 text-gray-7 flex cursor-pointer items-center rounded-md p-2.5 text-sm font-medium"
      key={pool.poolId}
      value={pool.poolId}
    >
      {pool.bezeichnung} ({pool.standorte.numResultsTotal})
    </ComboboxOption>
  ));
}

export default function PoolsPanel() {
  const { t } = useI18n();
  const { selectedPool, setCanCreate, setSelectedPool, vflzId } =
    useTasksContext();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!selectedPool) setCanCreate(false);
  }, [selectedPool, setCanCreate]);

  const handleInputChange = useMemo(
    () =>
      debounce((event: ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
      }, 300),
    [],
  );

  const { data, isLoading } = useSWR<TaskTargetPoolSearchQuery>(
    query && [
      queryTaskTargetPoolSearch,
      { filterBezeichnung: query, vflzId: vflzId ?? null },
    ],
  );

  const results = data?.pools.results ?? [];

  if (selectedPool) {
    return (
      <>
        <SelectedInput
          dataTest="Workflow-selectedPool"
          onClick={() => setSelectedPool(undefined)}
          value={
            <div className="flex w-full items-center justify-between">
              <span className="mt-0.5">{selectedPool.bezeichnung}</span>
              <PoolNumber number={selectedPool.standorte.numResultsTotal} />
            </div>
          }
        />
        <PoolVflzList />
      </>
    );
  }

  return (
    <>
      <Combobox
        immediate
        onChange={(poolId: null | string) => {
          const pool = results.find((result) => {
            return result.poolId === poolId;
          });
          if (pool) {
            setSelectedPool(pool);
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
            data-test="Workflow-poolSearchInput"
            onChange={handleInputChange}
            placeholder={t("workflow.searchPools")}
          />
        </div>
        {query ? (
          <ComboboxOptions
            anchor={{ gap: "8px", padding: "32px", to: "bottom start" }}
            className={`${fonts} border-gray-5 z-30 w-(--input-width) space-y-1 rounded-lg border bg-white p-1 shadow-lg`}
            static
          >
            <PoolSearchResults isLoading={isLoading} pools={results} />
          </ComboboxOptions>
        ) : null}
      </Combobox>
    </>
  );
}
