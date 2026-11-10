import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { gql } from "graphql-request";
import debounce from "lodash/debounce";
import { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import useSWR from "swr";

import Field from "@/components/Field";
import SearchIcon from "@/components/icons/SearchIcon";
import XIcon from "@/components/icons/XIcon";
import Spinner from "@/components/Spinner";
import fonts from "@/lib/fonts";
import getSubjektLabel from "@/lib/getSubjektLabel";
import { useI18n } from "@/lib/i18n";

import type {
  BeteiligteFieldBeteiligterFragment,
  BeteiligteFieldBeteiligterGeschaeftFragment,
  BeteiligteFieldSubjektFragment,
  SearchSubjekteQuery,
} from "@/lib/graphql";

export const beteiligterFragment = gql`
  fragment BeteiligteFieldBeteiligter on Beteiligter {
    isSachbearbeiter
    subjekt {
      subjId
      vorname
      name
      taetigkeit
    }
  }
`;

export const beteiligterGeschaeftFragment = gql`
  fragment BeteiligteFieldBeteiligterGeschaeft on BeteiligterGeschaeft {
    betTaskId
    subjekt {
      subjId
      vorname
      name
      taetigkeit
    }
  }
`;

const subjektFragment = gql`
  fragment BeteiligteFieldSubjekt on Subjekt {
    subjId
    vorname
    name
    taetigkeit
  }
`;

const searchSubjekte = gql`
  query searchVflzSubjekte($filter: String, $isSachbearbeiter: Boolean) {
    subjekte(filter: $filter, isSachbearbeiter: $isSachbearbeiter) {
      results {
        ...BeteiligteFieldSubjekt
      }
    }
  }
  ${subjektFragment}
`;

const anchor = {
  gap: 4,
  offset: -13,
  padding: "32px",
  to: "bottom start" as const,
};

export default function BeteiligteField({
  name,
  required,
  vflzBeteiligte,
  ...props
}: {
  name: "sachbearbeitung" | "sonstigeBeteiligte";
  required?: boolean;
  vflzBeteiligte?: BeteiligteFieldBeteiligterFragment[];
}) {
  const { t } = useI18n();
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState(false);
  const { formState, getFieldState, register } = useFormContext();
  const { onChange } = register(name, { required, value: [] });
  const selectedOptions = useWatch<
    Record<string, BeteiligteFieldBeteiligterGeschaeftFragment[]>
  >({ name });
  const fieldState = getFieldState(name, formState);
  const isSachbearbeiter = useMemo(() => {
    return name === "sachbearbeitung";
  }, [name]);
  const search = useSWR<SearchSubjekteQuery>(
    filter && [searchSubjekte, { filter, isSachbearbeiter }],
  );

  const handleInputChange = useMemo(() => {
    return debounce((event: React.ChangeEvent<HTMLInputElement>) => {
      setFilter(event.target.value);
    }, 300);
  }, []);

  const options: BeteiligteFieldBeteiligterGeschaeftFragment[] = useMemo(() => {
    const notSelected = (subjekt: BeteiligteFieldSubjektFragment) => {
      return !selectedOptions?.some((o) => {
        return subjekt.subjId === o.subjekt.subjId;
      });
    };
    return search.data || search.isLoading
      ? (search.data?.subjekte.results ?? []).filter(notSelected).map((s) => {
          return { betTaskId: "", subjekt: s };
        })
      : (vflzBeteiligte ?? [])
          .filter((b) => {
            return (
              (name === "sachbearbeitung" ? b.isSachbearbeiter : true) &&
              notSelected(b.subjekt)
            );
          })
          .map((b) => {
            return { betTaskId: "", subjekt: b.subjekt };
          });
  }, [name, search, selectedOptions, vflzBeteiligte]);

  return (
    <Field name={name} {...props} error={fieldState.error}>
      <Combobox
        as="div"
        className="border-gray-5 relative z-10 min-h-[34px] cursor-text rounded-lg border bg-white px-3 py-2 shadow-xs has-[[data-anchor^=bottom]]:rounded-b-none has-[[data-anchor^=bottom]]:border-b-0 has-[[data-anchor^=top]]:rounded-t-none has-[[data-anchor^=top]]:border-t-0"
        immediate
        multiple
        onBlur={() => {
          setActive(false);
        }}
        onChange={(value) => {
          void onChange({ target: { name, value } });
        }}
        onClick={() => {
          setActive(true);
        }}
        onClose={() => {
          handleInputChange.cancel();
          setFilter("");
          setActive(false);
        }}
        value={selectedOptions}
      >
        {selectedOptions?.length ? (
          <div className={`${active ? "mb-2" : ""} flex flex-wrap gap-2`}>
            {selectedOptions.map((option, index) => {
              return (
                <div
                  className="border-gray-5 flex items-center space-x-1 rounded-md border px-2 text-xs"
                  key={option.subjekt.subjId}
                >
                  <span>{getSubjektLabel(option.subjekt)}</span>
                  <button
                    aria-label={getSubjektLabel(option.subjekt)}
                    className="text-gray-6 hover:text-gray-7"
                    onClick={() => {
                      const value = selectedOptions.toSpliced(index, 1);
                      setActive(false);
                      void onChange({ target: { name, value } });
                    }}
                    type="button"
                  >
                    <XIcon className="w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
        {active ? (
          <div
            className={`relative z-30 ${!selectedOptions?.length ? "mt-8.5" : ""}`}
          >
            <SearchIcon className="text-gray-6 absolute top-1/2 left-2.5 -translate-y-1/2" />
            <ComboboxInput
              aria-label={t("BeteiligteField.searchPlaceholder")}
              autoComplete="off"
              className="border-gray-5 focus:border-blue-4 focus:ring-blue-6/25 placeholder:text-gray-6 w-full rounded-lg border bg-white py-2 pr-3 pl-8 text-xs shadow-xs focus:ring-4 focus:outline-hidden"
              displayValue={() => {
                return "";
              }}
              onChange={handleInputChange}
              placeholder={t("BeteiligteField.searchPlaceholder")}
              ref={(el) => {
                el?.focus();
              }}
            />
          </div>
        ) : null}
        <ComboboxOptions
          anchor={anchor}
          className={`${fonts} border-gray-5 z-20 w-[calc(var(--input-width)+1.5rem+2px)] rounded-lg border bg-white p-1 shadow-lg empty:invisible data-[anchor^=bottom]:rounded-t-none data-[anchor^=bottom]:border-t-0 data-[anchor^=top]:rounded-b-none data-[anchor^=top]:border-b-0 data-[anchor^=top]:shadow-[0_-10px_15px_-3px_rgb(0_0_0/0.1),0_-4px_6px_-4px_rgb(0_0_0/0.1)]`}
        >
          <div className="border-gray-4 m-2 space-y-1 rounded-lg border p-1.5 py-1">
            {search.isLoading ? (
              <Spinner className="mx-auto my-0.5 w-8" />
            ) : null}
            {!search.isLoading &&
              (options.length === 0 ? (
                <div className="p-2 text-center text-sm font-medium">
                  {t("BeteiligteField.noResults")}
                </div>
              ) : (
                options.map((option) => {
                  return (
                    <ComboboxOption
                      className="group text-gray-7 data-focus:bg-gray-2 data-selected:bg-gray-2 data-focus:text-gray-8 data-selected:text-gray-8 cursor-pointer rounded-md p-2 text-sm font-medium"
                      key={option.subjekt.subjId}
                      value={option}
                    >
                      {getSubjektLabel(option.subjekt)}
                    </ComboboxOption>
                  );
                })
              ))}
          </div>
        </ComboboxOptions>
      </Combobox>
    </Field>
  );
}
