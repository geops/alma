import { Combobox, ComboboxInput, ComboboxOptions } from "@headlessui/react";
import { gql } from "graphql-request";
import { padStart } from "lodash";
import debounce from "lodash/debounce";
import { router } from "next/client";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";

import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import CodeMultiComboBox from "@/components/CodeMultiComboBox";
import Form from "@/components/Form";
import ResetIcon from "@/components/icons/ResetIcon";
import SearchIcon from "@/components/icons/SearchIcon";
import MultiComboBox from "@/components/MultiComboBox";
import SearchLayout from "@/components/SearchLayout";
import VflzItem from "@/components/VflzItem";
import VflzList from "@/components/VflzList";
import fonts from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { ModelContext } from "@/lib/modelContext";
import { makeSimpleSearchQuery } from "@/lib/search";

import type { ChangeEvent } from "react";

import type { SearchOptionsQuery, TextSearchQuery } from "@/lib/graphql";
import type { QuerySimpleSearchArgs } from "@/lib/search";

const queryOptions = gql`
  query searchOptions {
    gemeinden {
      bfsNummer
      gemeinde
      hGemId
      label: displayValue
    }
    kbsInfos {
      beurteilung
      belastet
    }
  }
`;

const queryTextSearch = gql`
  query textSearch(
    $filters: [SearchFilter!]
    $query: String!
    $lang: Language!
  ) {
    search(filters: $filters, query: $query, lang: $lang, perPage: 10) {
      graph {
        results {
          ...VflzItem
        }
      }
    }
  }
  ${VflzItem.fragment}
`;

const simpleSearchEmptyValues: QuerySimpleSearchArgs = {
  beurteilung: undefined,
  hGemId: [],
  page: 1,
  perPage: undefined,
  publiziert: false,
  query: "",
  vftyp: [],
};

function SimpleSearchTextInput() {
  const { setValue, watch } = useFormContext<QuerySimpleSearchArgs>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const { activeLocale, t } = useI18n();

  const handleInputChange = useMemo(() => {
    return debounce((event: ChangeEvent<HTMLInputElement>) => {
      setValue("query", event.target.value, { shouldDirty: true });
    }, 300);
  }, [setValue]);

  const query = watch("query");
  const values = watch(["beurteilung", "hGemId", "publiziert", "vftyp"]);

  const variables = useMemo(() => {
    return {
      ...makeSimpleSearchQuery({
        beurteilung: values[0],
        hGemId: values[1],
        publiziert: values[2],
        query,
        vftyp: values[3],
      }),
      lang: activeLocale.toUpperCase(),
    };
  }, [activeLocale, query, values]);

  const { data } = useSWR<TextSearchQuery>(
    query && query.length > 2 && [queryTextSearch, variables],
    { keepPreviousData: true },
  );

  return (
    <Combobox
      immediate
      onChange={(vflzId) => {
        const item = data?.search.graph.results.find((r) => {
          return r.vflzId === vflzId;
        });
        if (item) {
          setValue("query", item.combinedId, { shouldDirty: true });
          inputRef.current?.form?.requestSubmit();
          setTimeout(() => {
            inputRef.current?.blur();
          }, 100);
        }
      }}
      value={query}
    >
      <div className="relative">
        <SearchIcon className="text-gray-6 absolute top-1/4 left-2" />
        <ComboboxInput
          autoComplete="off"
          className="border-gray-5 w-64 rounded-lg border px-3 py-2 pl-8 text-xs font-medium shadow-xs focus:outline-hidden"
          name="query"
          onBlur={() => {
            setOpen(false);
          }}
          onChange={handleInputChange}
          onFocus={() => {
            setOpen(true);
          }}
          placeholder={t("search.textSearchPlaceholder")}
          ref={inputRef}
        />
      </div>
      {open && data?.search.graph.results.length && query.length > 2 ? (
        <ComboboxOptions
          anchor={{ gap: 8, offset: 0, to: "bottom end" }}
          className={`${fonts} border-gray-5 text-gray-6 z-60 w-64 rounded-xl border bg-white shadow-lg`}
          static
        >
          <div className="my-2 ml-3 text-xs font-semibold uppercase">
            {t("search.textSearchResults")}
          </div>
          <VflzList isCombobox items={data.search.graph.results} link={false} />
        </ComboboxOptions>
      ) : null}
    </Combobox>
  );
}

function SimpleSearchForm({
  onReset,
  values,
}: {
  onReset: () => void;
  values?: QuerySimpleSearchArgs;
}) {
  const { t } = useI18n();
  const { data } = useSWRImmutable<SearchOptionsQuery>(queryOptions);
  const { formState, reset } = useFormContext<QuerySimpleSearchArgs>();
  const isDirty = Object.keys(formState.dirtyFields).length > 0;
  useEffect(() => {
    if (!values) {
      return;
    }
    reset(values);
  }, [reset, values]);

  return (
    <div className="relative flex justify-between gap-2 pb-4.5">
      <div className="flex w-full items-center gap-2">
        <SimpleSearchTextInput />
        <ModelContext value="Vflz">
          <CodeMultiComboBox data-test="vftypFilter" name="vftyp" />
        </ModelContext>
        <ModelContext value="Vflz">
          <MultiComboBox
            data-test="gemeindeFilter"
            name="hGemId"
            options={data?.gemeinden.map((g) => {
              return {
                ...g,
                value: padStart(g.hGemId ?? 0, 4, "0"),
              };
            })}
          />
        </ModelContext>
        <ModelContext value="Beurteilung">
          <CodeMultiComboBox
            categories={[
              {
                label: t("fields.Search.belastet"),
                values: (data?.kbsInfos ?? [])
                  .filter((i) => {
                    return i.belastet;
                  })
                  .map((i) => {
                    return i.beurteilung;
                  }),
              },
              {
                label: t("fields.Search.unbelastet"),
                values: (data?.kbsInfos ?? [])
                  .filter((i) => {
                    return i.belastet === false;
                  })
                  .map((i) => {
                    return i.beurteilung;
                  }),
              },
            ]}
            data-test="beurteilungFilter"
            name="beurteilung.beurteilung"
            sortByValue={false}
          />
        </ModelContext>
        <div
          className="border-gray-5 rounded-lg border px-3.5 py-2"
          data-test="publiziertFilter"
        >
          <ModelContext value="Search">
            <Checkbox name="publiziert" />
          </ModelContext>
        </div>
      </div>
      <Button
        className="my-1.5 flex space-x-1.5"
        disabled={!isDirty}
        type="submit"
      >
        <SearchIcon />
        <span>{t("search.submit")}</span>
      </Button>
      <Button
        className="my-1.5 flex space-x-1.5"
        data-test="resetSimpleSearchButton"
        disabled={
          !isDirty &&
          JSON.stringify(formState.defaultValues) ===
            JSON.stringify(simpleSearchEmptyValues)
        }
        onClick={() => {
          void reset(simpleSearchEmptyValues, { keepDefaultValues: true });
          onReset();
        }}
        type="button"
      >
        <ResetIcon />
        <span>{t("search.reset")}</span>
      </Button>
    </div>
  );
}

export default function SearchPage() {
  const [formValues, setFormValues] = useState<QuerySimpleSearchArgs>();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("advanced")) {
      void router.replace("/search/advanced");
      return;
    }

    setFormValues({
      beurteilung: searchParams.get("beurteilung")
        ? {
            beurteilung:
              searchParams
                .get("beurteilung")
                ?.split(",")
                .map((b) => {
                  return { label: "", value: b };
                }) ?? [],
          }
        : undefined,
      hGemId:
        searchParams
          .get("gemeinde")
          ?.split(",")
          .filter(Boolean)
          .map((value) => {
            return { gemeinde: "", label: "", value };
          }) ?? [],
      page: 1,
      perPage: searchParams.get("perPage")
        ? parseInt(searchParams.get("perPage") ?? "1")
        : undefined,
      publiziert: searchParams.get("publiziert") === "true",
      query: searchParams.get("q") ?? "",
      vftyp:
        searchParams
          .get("vftyp")
          ?.split(",")
          .filter(Boolean)
          .map((value) => {
            return { label: "", value };
          }) ?? [],
    });
  }, [searchParams]);

  return (
    <Form
      data-test="simpleSearchForm"
      model="simpleSearch"
      onSubmit={(values: QuerySimpleSearchArgs) => {
        const params = new URLSearchParams(searchParams);

        params.delete("p");
        params.set("q", values.query ?? "");
        params.set("publiziert", values.publiziert ? "true" : "false");

        const gemeinde = values.hGemId?.length
          ? values.hGemId
              .map((g) => {
                return g.value;
              })
              .join(",")
          : "";
        params.set("gemeinde", gemeinde);

        const beurteilung = values.beurteilung?.beurteilung?.length
          ? values.beurteilung.beurteilung
              .map((b) => {
                return b.value;
              })
              .join(",")
          : "";
        params.set("beurteilung", beurteilung);

        const vftyp = values.vftyp?.length
          ? values.vftyp
              .map((s) => {
                return s.value;
              })
              .join(",")
          : "";
        params.set("vftyp", vftyp);

        localStorage.removeItem("search-params-");
        localStorage.setItem("last-search-mode", "simple");
        void router.push(`?${params.toString()}`);
        setFormValues({ ...values, page: 1 });
      }}
    >
      <SearchLayout>
        <SimpleSearchForm
          onReset={() => {
            localStorage.removeItem("search-params-");
            void router.push(``);
            setFormValues(simpleSearchEmptyValues);
          }}
          values={formValues}
        />
      </SearchLayout>
    </Form>
  );
}
