import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { gql } from "graphql-request";
import debounce from "lodash/debounce";
import get from "lodash/get";
import merge from "lodash/merge";
import uniqBy from "lodash/uniqBy";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";

import AnchorNavigation from "@/components/AnchorNavigation";
import Button from "@/components/Button";
import CodeCheckbox from "@/components/CodeCheckbox";
import CodeCombobox from "@/components/CodeCombobox";
import CodeListbox from "@/components/CodeListbox";
import { anchor } from "@/components/Combobox";
import Dialog from "@/components/Dialog";
import Field from "@/components/Field";
import FieldArray from "@/components/FieldArray";
import Fieldset from "@/components/Fieldset";
import Form from "@/components/Form";
import CheckIcon from "@/components/icons/CheckIcon";
import ChevronIcon from "@/components/icons/ChevronIcon";
import PlusIcon from "@/components/icons/PlusIcon";
import ResetIcon from "@/components/icons/ResetIcon";
import SaveIcon from "@/components/icons/SaveIcon";
import TrashIcon from "@/components/icons/TrashIcon";
import Input from "@/components/Input";
import Listbox from "@/components/Listbox";
import { mutationInfoFragment } from "@/components/MutationInfo";
import Textarea from "@/components/Textarea";
import VflzActionMenu from "@/components/VflzActionMenu";
import VflzLayout from "@/components/VflzLayout";
import vflzMapFragment from "@/components/VflzMap.fragment";
import client from "@/lib/client";
import fonts from "@/lib/fonts";
import getSubjektLabel from "@/lib/getSubjektLabel";
import { EigentumStatus } from "@/lib/graphql";
import { type tFunction, useI18n } from "@/lib/i18n";
import { ModelContext } from "@/lib/modelContext";
import toBemerkungInput from "@/lib/toBemerkungInput";
import useCodeOptions from "@/lib/useCodeOptions";
import useCurrentUser from "@/lib/useCurrentUser";
import useSetting from "@/lib/useSetting";

import type { FieldValues, Path, PathValue } from "react-hook-form";

import type { AnchorNavItem } from "@/components/AnchorNavigation";
import type {
  BeteiligterStandortInput,
  CreateSubjektInput,
  CreateSubjektMutation,
  EigentumFragment,
  EigentumInput,
  Kontakt,
  Maybe,
  MutationInfoFragment,
  SachbearbeitungFragment,
  SachbearbeitungInput,
  SachbearbeitungQuery,
  SearchSubjekteQuery,
  SonstigeFragment,
  SubjektFieldFragment,
  SubjektQuery,
  UpdateSubjektInput,
  UpdateSubjektMutation,
  UpdateVflzBeteiligteMutation,
  VflzMapFragment,
  VflzParticipantsLayoutQuery,
} from "@/lib/graphql";

const VflzMapEigentum = dynamic(
  () => {
    return import("@/components/VflzMapEigentum");
  },
  { ssr: false },
);

const shouldDirty = { shouldDirty: true };

export const DisplayTypeSetting = {
  Both: "both",
  Gemeinde: "gemeinde",
  Nummerierungsbereich: "nummerierungsbereich",
};
export type DisplayTypeSetting =
  (typeof DisplayTypeSetting)[keyof typeof DisplayTypeSetting];

function useMutationInfo(name: string) {
  const { getValues } = useFormContext<{
    [name]: { erfassungMutation: MutationInfoFragment | null }[];
  }>();
  return (getValues(name) || [])
    .map((b) => {
      return b.erfassungMutation;
    })
    .filter(Boolean) as MutationInfoFragment[];
}

const subjektFieldsFragment = gql`
  fragment SubjektFields on Subjekt {
    subjId
    anrede
    bemerkung {
      bem
    }
    hasStandorte
    kategorien
    kontakte {
      kontaktId
      kontaktTyp
      kontakt
    }
    kuerzel
    land
    name
    ort
    postleitzahl
    strasse
    taetigkeit
    vorname
  }
`;

const createSubjektMutation = gql`
  mutation createSubjekt($data: CreateSubjektInput!) {
    createSubjekt(data: $data) {
      subjekt {
        ...SubjektFields
      }
      problemGroup {
        ...FormProblems
      }
    }
  }
  ${Form.fragment}
  ${subjektFieldsFragment}
`;

const updateSubjektMutation = gql`
  mutation updateSubjekt($data: UpdateSubjektInput!) {
    updateSubjekt(data: $data) {
      subjekt {
        ...SubjektFields
      }
      problemGroup {
        ...FormProblems
      }
    }
  }
  ${Form.fragment}
  ${subjektFieldsFragment}
`;

const deleteSubjektMutation = gql`
  mutation deleteSubjekt($subjId: ID!) {
    deleteSubjekt(subjId: $subjId)
  }
`;

const querySubjekt = gql`
  query subjekt($subjId: ID!) {
    subjekt(subjId: $subjId) {
      ...SubjektFields
    }
  }
  ${subjektFieldsFragment}
`;

const emptySubjekt = {
  anrede: null,
  bemerkung: null,
  kategorien: [],
  kontakte: [],
  kuerzel: null,
  land: null,
  name: null,
  ort: null,
  postleitzahl: null,
  strasse: null,
  taetigkeit: null,
  vorname: null,
};

function SubjektKontakte() {
  const options = useCodeOptions({ name: "kontaktTyp", required: true });
  const {
    clearErrors,
    formState: { defaultValues, errors },
    setValue,
  } = useFormContext<CreateSubjektInput | UpdateSubjektInput>();
  const value = useWatch<Record<string, Kontakt[]>>({ name: "kontakte" });
  const getSortIndex = (kontakt: { kontaktTyp: null | string }) => {
    return (
      options.find((o) => {
        return o.value === kontakt.kontaktTyp;
      })?.originalSortIndex ?? 0
    );
  };

  return options.map((option, index) => {
    const errorIndex = options?.reduce((acc, o, i) =>
      // skip empty rows to find errors returned by the server
      {
        return i < index &&
          defaultValues?.kontakte?.every((k) => {
            return k?.kontaktTyp !== o.value;
          })
          ? acc - 1
          : acc;
      }, index);
    const error =
      errors.kontakte?.[errorIndex]?.kontakt &&
      defaultValues?.kontakte?.find((k) => {
        return k?.kontaktTyp === option.value;
      })
        ? { type: errors.kontakte[errorIndex].kontakt.type.split(".")[0] }
        : undefined;
    const item = value?.find((k) => {
      return k.kontaktTyp === option.value;
    });
    return (
      <Input
        error={error}
        key={option.value}
        label={option.label}
        onChange={(event) => {
          if (error) {
            clearErrors(`kontakte.${errorIndex}`);
          }
          const newItem = {
            kontakt: event.target.value,
            kontaktId: item?.kontaktId ?? null,
            kontaktTyp: option.value,
          };
          const newKontakte = item
            ? value.map((k) => {
                return k.kontaktTyp === item.kontaktTyp ? newItem : k;
              })
            : [...(value ?? []), newItem];
          setValue(
            "kontakte",
            newKontakte
              .filter((k) => {
                return k.kontakt;
              })
              .sort((a, b) => {
                return getSortIndex(a) - getSortIndex(b);
              }),
            shouldDirty,
          );
        }}
        value={item?.kontakt ?? ""}
      />
    );
  });
}

function SubjektDialogSubmitButton() {
  const { formState } = useFormContext();
  const { t } = useI18n();
  return (
    <Button
      disabled={Object.keys(formState.dirtyFields).length === 0}
      type="submit"
    >
      <SaveIcon />
      <span className="ml-2">{t("SubjektDialog.saveSubjekt")}</span>
    </Button>
  );
}

interface SubjektDialogProps {
  onClose: (
    value?: boolean, // false according to headlessui doc when called by ESC and click outside DialogPanel (that includes click on CloseButton)
    subjekt?:
      | CreateSubjektMutation["createSubjekt"]["subjekt"]
      | null // when deleted
      | UpdateSubjektMutation["updateSubjekt"]["subjekt"],
  ) => void;
  subjId?: string;
}

function SubjektDialog({ onClose, subjId }: SubjektDialogProps) {
  const { t } = useI18n();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { data, mutate } = useSWR<SubjektQuery>(
    subjId && [querySubjekt, { subjId }],
  );
  const deleteSubjekt = () => {
    return void client.request(deleteSubjektMutation, { subjId }).then(() => {
      return onClose(false, null);
    });
  };

  return (
    <>
      <Dialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          return setIsDeleteDialogOpen(false);
        }}
        title={t("SubjektDialog.deleteSubjekt")}
      >
        <div>{t("SubjektDialog.deleteSubjektMessage")}</div>
        <div className="mt-8 flex justify-end gap-4">
          <Button
            onClick={() => {
              return setIsDeleteDialogOpen(false);
            }}
            outline
          >
            {t("cancel")}
          </Button>
          <Button onClick={deleteSubjekt}>
            {t("SubjektDialog.deleteSubjekt")}
          </Button>
        </div>
      </Dialog>
      <Dialog
        isOpen
        onClose={(value) => {
          onClose(value);
        }}
        title={t(
          subjId ? "SubjektDialog.updateTitle" : "SubjektDialog.createTitle",
        )}
      >
        <Form<CreateSubjektInput | UpdateSubjektInput>
          className="grid max-w-4xl grid-cols-1 gap-x-4 gap-y-3"
          model="Subjekt"
          onSubmit={async (values, methods) => {
            const result = await client.request<
              CreateSubjektMutation | UpdateSubjektMutation
            >(
              "subjId" in values
                ? updateSubjektMutation
                : createSubjektMutation,
              {
                data: {
                  ...values,
                  bemerkung: toBemerkungInput(values.bemerkung),
                  hasStandorte: undefined,
                },
              },
            );
            const { problemGroup, subjekt } =
              "createSubjekt" in result
                ? result.createSubjekt
                : result.updateSubjekt;
            void mutate({ subjekt }, { revalidate: false });
            methods.reset(subjekt);
            if (problemGroup.problems.length > 0) {
              return problemGroup;
            } else {
              onClose(false, subjekt);
            }
          }}
          submitInvalid
          values={data?.subjekt ?? emptySubjekt}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <CodeListbox name="anrede" />
                <Input name="kuerzel" />
                <Input name="vorname" />
                <Input name="name" />
              </div>
              <Textarea name="taetigkeit" />
              <Input name="strasse" />
              <div className="grid grid-cols-4 gap-4">
                <Input name="postleitzahl" />
                <Input className="col-span-3" name="ort" />
              </div>
              <CodeCombobox name="land" />
              <CodeCheckbox name="kategorien" />
            </div>
            <div className="grid auto-rows-min grid-cols-1 gap-4">
              <ModelContext value="Kontakt">
                <SubjektKontakte />
              </ModelContext>
              <ModelContext value="Subjekt.bemerkung">
                <Textarea name="bemerkung.bem" />
              </ModelContext>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <Button
              onClick={() => {
                return onClose(false);
              }}
              outline
            >
              {t("cancel")}
            </Button>
            {subjId ? (
              <Button
                className="text-red-6 bg-red-2 border-red-5 hover:text-red-6"
                onClick={() => {
                  if (data?.subjekt?.hasStandorte) {
                    setIsDeleteDialogOpen(true);
                  } else {
                    deleteSubjekt();
                  }
                }}
                outline
              >
                <TrashIcon />
                <span className="ml-2">{t("SubjektDialog.deleteSubjekt")}</span>
              </Button>
            ) : (
              <div />
            )}
            <SubjektDialogSubmitButton />
          </div>
        </Form>
      </Dialog>
    </>
  );
}

const subjektFieldFragment = gql`
  fragment SubjektField on Subjekt {
    subjId
    vorname
    name
    taetigkeit
  }
`;

const searchSubjekte = gql`
  query searchSubjekte($query: String) {
    subjekte(filter: $query) {
      results {
        ...SubjektField
      }
    }
  }
  ${subjektFieldFragment}
`;

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="20"
      viewBox="0 0 20 20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.667 17.5c0-1.163 0-1.745-.144-2.218a3.333 3.333 0 0 0-2.222-2.222c-.473-.143-1.055-.143-2.218-.143H7.917c-1.163 0-1.745 0-2.218.143a3.333 3.333 0 0 0-2.222 2.222c-.144.473-.144 1.055-.144 2.218M13.75 6.25a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.667"
      />
    </svg>
  );
}

function SubjektField<T extends FieldValues>({
  disabled,
  name,
  required,
  setSubjektDialog,
  ...props
}: {
  className?: string;
  disabled?: boolean;
  name: Path<T>;
  required?: boolean;
  setSubjektDialog: React.Dispatch<SubjektDialogProps | undefined>;
}) {
  const { t } = useI18n();
  const { formState, getFieldState, getValues, register, setValue } =
    useFormContext<T>();
  const [query, setQuery] = useState("");
  const { onChange } = register(name, { required });
  const selectedOption = useWatch({ name }) as Maybe<SubjektFieldFragment>;
  const search = useSWR<SearchSubjekteQuery>(
    query && [searchSubjekte, { query }],
    null,
    { keepPreviousData: true },
  );

  const { error } = getFieldState(name);

  const handleInputChange = useMemo(() => {
    return debounce((event: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    }, 300);
  }, []);

  const options: SubjektFieldFragment[] = useMemo(() => {
    return [
      {
        name: t("SubjektField.new"),
        subjId: "new",
        taetigkeit: "",
        vorname: "",
      },
      selectedOption!,
      ...(search.data?.subjekte.results.filter((s) => {
        return selectedOption?.subjId !== s.subjId;
      }) ?? []),
    ].filter(Boolean);
  }, [search.data, selectedOption, t]);

  return (
    <>
      <Field hideLabel name={name} {...props}>
        <Combobox
          disabled={disabled ?? formState.disabled}
          immediate
          onChange={(value) => {
            if (value?.subjId === "new") {
              setSubjektDialog({
                onClose: (val, newSubjekt) => {
                  void onChange({ target: { name, value: newSubjekt } });
                  setSubjektDialog(undefined);
                },
              });
            } else if (value) {
              void onChange({ target: { name, value } });
            }
          }}
          onClose={() => {
            return setQuery("");
          }}
          value={selectedOption}
        >
          <div className="relative">
            <ComboboxInput
              aria-label="Assignee"
              autoComplete="off"
              className={`${error ? "border-red-3 bg-red-2" : "border-gray-5 bg-white"} focus:border-blue-4 focus:ring-blue-6/25 disabled:bg-gray-2 disabled:text-gray-6 w-full rounded-lg border px-3 py-2 text-xs shadow-xs focus:ring-4 focus:outline-hidden`}
              displayValue={(item: SubjektFieldFragment | undefined) => {
                return item ? getSubjektLabel(item) : "";
              }}
              name={name}
              onChange={handleInputChange}
              placeholder={t("SubjektField.placeholder")}
            />
            <ComboboxButton className="group absolute inset-y-0 right-0 px-2.5">
              <ChevronIcon className="text-gray-6 rotate-180 transition-transform group-data-active:rotate-0" />
            </ComboboxButton>
          </div>
          <ComboboxOptions
            anchor={anchor}
            className={`${fonts} border-gray-5 z-30 w-(--input-width) space-y-1 rounded-lg border bg-white p-1 shadow-lg empty:invisible`}
          >
            {options.map((option) => {
              return (
                <ComboboxOption
                  className="group text-gray-7 data-focus:bg-gray-2 data-selected:bg-gray-2 data-focus:text-gray-8 data-selected:text-gray-8 flex w-full cursor-pointer items-center justify-between rounded-md p-2.5 pl-2 text-sm font-medium"
                  key={option.subjId}
                  value={option}
                >
                  {option.subjId === "new" ? (
                    <span className="flex">
                      <PlusIcon className="mr-2" />
                      {getSubjektLabel(option)}
                    </span>
                  ) : (
                    getSubjektLabel(option)
                  )}
                  <CheckIcon className="text-blue-6 hidden group-data-selected:block" />
                </ComboboxOption>
              );
            })}
          </ComboboxOptions>
        </Combobox>
      </Field>
      <Button
        className="mr-3"
        disabled={disabled ?? formState.disabled}
        name={`${name}.SubjektDialog`}
        onClick={() => {
          const subjekt = getValues(name);
          setSubjektDialog({
            onClose: (val, newSubjekt) => {
              if (newSubjekt) {
                setValue(name, newSubjekt as PathValue<T, Path<T>>);
              } else if (newSubjekt === null) {
                // subjekt was deleted
                const [rootName, index] = name.split(".") as [Path<T>, string];
                const beteiligte = getValues(rootName);
                if (Array.isArray(beteiligte)) {
                  (beteiligte as unknown[]).splice(Number(index), 1);
                }
                setValue(rootName, beteiligte);
              }
              setSubjektDialog(undefined);
            },
            subjId: subjekt?.subjId as string | undefined,
          });
        }}
        outline
      >
        <UserIcon className="-m-0.5" />
      </Button>
    </>
  );
}

const querySachbearbeitung = gql`
  query Sachbearbeitung($page: Int!) {
    subjekte(page: $page, perPage: 20, isSachbearbeiter: true) {
      results {
        subjId
        vorname
        name
        user {
          id
        }
      }
    }
  }
`;

const emptySachbearbeitung = {
  betArtId: null,
  beteiligter: { subjekt: { subjId: null } },
};

function Sachbearbeitung() {
  const currentUser = useCurrentUser();
  const { setValue } = useFormContext<SachbearbeitungFragment>();
  const { t } = useI18n();
  const { data } = useSWRImmutable<SachbearbeitungQuery>(
    querySachbearbeitung,
    async (query: string) => {
      const results: SachbearbeitungQuery["subjekte"]["results"] = [];
      let page = 1;
      let pageResults;
      do {
        const response = await client.request<SachbearbeitungQuery>(query, {
          page,
        });
        pageResults = response.subjekte.results;
        results.push(...pageResults);
        page += 1;
      } while (pageResults.length === 20);
      return { subjekte: { results } };
    },
  );
  const sachbearbeitung = useWatch<SachbearbeitungFragment>({
    name: "sachbearbeitung",
  });

  useEffect(() => {
    if (
      Array.isArray(sachbearbeitung) &&
      sachbearbeitung.length === 1 &&
      sachbearbeitung[0].betArtId === null &&
      sachbearbeitung[0].beteiligter.subjekt.subjId === null
    ) {
      const currentUserSubjekt = data?.subjekte.results.find((s) => {
        return s.user?.id === currentUser.id;
      });
      if (currentUserSubjekt) {
        setValue("sachbearbeitung", [
          merge(sachbearbeitung[0], {
            beteiligter: { subjekt: { subjId: currentUserSubjekt.subjId } },
          }),
        ]);
      }
    }
  }, [currentUser, data, sachbearbeitung, setValue]);

  return (
    <Fieldset
      id="sachbearbeitung"
      legend={t("vflz.participants.sachbearbeitung.title")}
      mutationInfo={useMutationInfo("sachbearbeitung")}
    >
      <FieldArray
        addLabel={t("vflz.participants.sachbearbeitung.addLabel")}
        model="SachbearbeiterStandort"
        name="sachbearbeitung"
        simple
        value={emptySachbearbeitung}
      >
        {(index) => {
          return (
            <Listbox
              className="w-64"
              hideLabel
              name={`sachbearbeitung.${index}.beteiligter.subjekt.subjId`}
              options={data?.subjekte.results
                .filter(({ subjId }) => {
                  return Array.isArray(sachbearbeitung)
                    ? !sachbearbeitung.some(({ beteiligter }, i) => {
                        return (
                          i !== index && beteiligter.subjekt.subjId === subjId
                        );
                      })
                    : true;
                })
                .map((s) => {
                  return {
                    label: `${s.vorname} ${s.name}`,
                    value: s.subjId,
                  };
                })}
            />
          );
        }}
      </FieldArray>
    </Fieldset>
  );
}

Sachbearbeitung.fragment = gql`
  fragment Sachbearbeitung on Vflz {
    sachbearbeitung {
      betArtId
      beteiligter {
        betId
        subjekt {
          subjId
          vorname
          name
        }
      }
      erfassungMutation {
        ...MutationInfo
      }
    }
  }
`;

Sachbearbeitung.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: [],
    id: "sachbearbeitung",
    legend: t("vflz.participants.sachbearbeitung.title"),
  };
};

Sachbearbeitung.toInput = (
  values: SachbearbeitungFragment,
): SachbearbeitungInput[] => {
  return values.sachbearbeitung
    .filter((b) => {
      return b.beteiligter.subjekt.subjId;
    })
    .map((b) => {
      return {
        betArtId: b.betArtId ?? null,
        subjId: b.beteiligter.subjekt.subjId,
      };
    });
};

const emptySonstigeBeteiligter = {};

function Sonstige({
  setSubjektDialog,
}: {
  setSubjektDialog: React.Dispatch<SubjektDialogProps | undefined>;
}) {
  const { t } = useI18n();
  return (
    <Fieldset
      id="sonstige"
      legend={t("vflz.participants.sonstige.title")}
      mutationInfo={useMutationInfo("sonstigeBeteiligte")}
    >
      <FieldArray
        addLabel={t("vflz.participants.sonstige.addLabel")}
        model="BeteiligterStandort"
        name="sonstigeBeteiligte"
        simple
        value={emptySonstigeBeteiligter}
      >
        {(index) => {
          return (
            <div className="flex items-center space-x-2">
              <SubjektField<SonstigeFragment>
                className="w-64"
                name={`sonstigeBeteiligte.${index}.beteiligter.subjekt`}
                required
                setSubjektDialog={setSubjektDialog}
              />
              <CodeListbox
                className="w-48"
                hideLabel
                name={`sonstigeBeteiligte.${index}.beziehungsart`}
                required
              />
            </div>
          );
        }}
      </FieldArray>
    </Fieldset>
  );
}

Sonstige.fragment = gql`
  fragment Sonstige on Vflz {
    sonstigeBeteiligte {
      betArtId
      beziehungsart
      beteiligter {
        betId
        subjekt {
          ...SubjektField
        }
      }
      erfassungMutation {
        ...MutationInfo
      }
    }
  }
`;

Sonstige.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: [],
    id: "sonstige",
    legend: t("vflz.participants.sonstige.title"),
  };
};

Sonstige.toInput = (values: SonstigeFragment): BeteiligterStandortInput[] => {
  return values.sonstigeBeteiligte.map((b) => {
    return {
      betArtId: b.betArtId ?? null,
      beziehungsart: b.beziehungsart,
      subjId: b.beteiligter.subjekt.subjId,
    };
  });
};

function EigentumItem({
  index,
  name,
  setSubjektDialog,
}: {
  index: number;
  name: `eigentum.${number}`;
  setSubjektDialog: React.Dispatch<SubjektDialogProps | undefined>;
}) {
  const [displayType] = useSetting<DisplayTypeSetting>(
    "ui.display.gemeindenUndNummerierungsbereiche",
    DisplayTypeSetting.Gemeinde,
  );
  const { control, formState, getValues, setValue } =
    useFormContext<EigentumFragment>();
  const { remove } = useFieldArray({ control, name: "eigentum" });
  const eigentum = useWatch<EigentumFragment>({ name: "eigentum" });
  const item = Array.isArray(eigentum) && eigentum[index];
  const isFehlend = get(item, "status") === EigentumStatus.Fehlend;
  const isUeberzaehlig = get(item, "status") === EigentumStatus.Ueberzaehlig;
  const isZugeordnet = get(item, "status") === EigentumStatus.Zugeordnet;
  const gemeindenUndNummerierungsbereiche = (
    getValues("gemeindenUndNummerierungsbereiche") || []
  ).map(({ gemeinde, nummerierungsbereich }) => {
    if (
      displayType === DisplayTypeSetting.Both &&
      gemeinde &&
      nummerierungsbereich
    ) {
      return {
        label: `${nummerierungsbereich.bezeichnung} / ${gemeinde.displayValue}`,
        value: gemeinde.hGemId,
      };
    } else if (
      displayType === DisplayTypeSetting.Nummerierungsbereich &&
      nummerierungsbereich
    ) {
      return {
        label: nummerierungsbereich.bezeichnung,
        value: nummerierungsbereich.hNbId,
      };
    }
    return {
      label: gemeinde?.displayValue ?? null,
      value: gemeinde?.hGemId ?? null,
    };
  });

  return (
    <>
      <div className="flex w-full items-center space-x-2">
        <SubjektField<EigentumFragment>
          className="w-1/4"
          disabled={isFehlend || formState.disabled}
          name={`${name}.subjekt`}
          required={!isFehlend && !formState.disabled}
          setSubjektDialog={setSubjektDialog}
        />
        <CodeListbox
          className="w-1/4"
          disabled={isFehlend || formState.disabled}
          hideLabel
          name={`${name}.beziehungsart`}
          required={!isFehlend && !formState.disabled}
        />
        <Listbox
          className="w-1/4"
          disabled={isFehlend || formState.disabled}
          hideLabel
          name={`${name}.${displayType === DisplayTypeSetting.Nummerierungsbereich ? "nummerierungsbereich.hNbId" : "gemeinde.hGemId"}`}
          options={uniqBy(gemeindenUndNummerierungsbereiche, "value")}
          required={!isFehlend && !formState.disabled}
        />
        <Input
          className="w-0 grow"
          disabled={isFehlend || formState.disabled}
          hideLabel
          name={`${name}.parzellen`}
          placeholder="Parzelle(n)"
          required={!isFehlend && !formState.disabled}
        />
      </div>
      <button
        className={`p-2.5 ${isFehlend ? "text-blue-7 hover:text-blue-8 hover:bg-blue-1" : ""} ${isUeberzaehlig ? "text-red-6 hover:bg-red-2 hover:text-red-7" : ""} ${isZugeordnet ? "text-orange-6 hover:bg-orange-1 hover:text-orange-7" : ""}`}
        name={name}
        onClick={() => {
          if (isFehlend || isZugeordnet) {
            const newItem = {
              ...(item as EigentumFragment["eigentum"][number]),
              status: isFehlend
                ? EigentumStatus.Zugeordnet
                : EigentumStatus.Fehlend,
            };
            setValue(`eigentum.${index}`, newItem, shouldDirty);
          } else if (
            isUeberzaehlig &&
            Array.isArray(eigentum) &&
            eigentum.every((e) => {
              return typeof e === "object" && "status" in e;
            })
          ) {
            remove(index);
            setValue("eigentum", eigentum.toSpliced(index, 1), shouldDirty);
          }
        }}
        type="button"
      >
        {isFehlend ? <ResetIcon /> : <TrashIcon />}
      </button>
    </>
  );
}

const emptyEigentum = {
  beziehungsart: null,
  gemeinde: { hGemId: null },
  nummerierungsbereich: { hNbId: null },
  parzellen: "",
  status: EigentumStatus.Ueberzaehlig,
  subjekt: null,
};

function Eigentum({
  setSubjektDialog,
  vflz,
}: {
  setSubjektDialog: React.Dispatch<SubjektDialogProps | undefined>;
  vflz?: VflzMapFragment;
}) {
  const { t } = useI18n();
  return (
    <Fieldset
      id="eigentum"
      legend={t("vflz.participants.eigentum.title")}
      mutationInfo={useMutationInfo("eigentum")}
    >
      <VflzMapEigentum vflz={vflz} />
      <FieldArray
        addLabel={t("vflz.participants.eigentum.addLabel")}
        hideRemoveButton
        model="EigentuemerStandort"
        name="eigentum"
        simple
        value={emptyEigentum}
      >
        {(index) => {
          return (
            <EigentumItem
              index={index}
              name={`eigentum.${index}`}
              setSubjektDialog={setSubjektDialog}
            />
          );
        }}
      </FieldArray>
    </Fieldset>
  );
}

Eigentum.fragment = gql`
  fragment Eigentum on Vflz {
    eigentum {
      beziehungsart
      erfassungMutation {
        ...MutationInfo
      }
      gemeinde {
        hGemId
      }
      nummerierungsbereich {
        hNbId
      }
      parzellen
      status
      subjekt {
        ...SubjektField
      }
    }
    gemeindenUndNummerierungsbereiche {
      gemeinde {
        hGemId
        displayValue
      }
      nummerierungsbereich {
        hNbId
        bezeichnung
      }
    }
  }
`;

Eigentum.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: [],
    id: "eigentum",
    legend: t("vflz.participants.eigentum.title"),
  };
};

Eigentum.toInput = (values: EigentumFragment): EigentumInput[] => {
  return values.eigentum.map((e) => {
    const parzellen = e.parzellen as string | string[];
    return {
      beziehungsart:
        e.status === EigentumStatus.Fehlend ? null : e.beziehungsart,
      hGemId: e.gemeinde?.hGemId ?? null,
      hNbId: e.nummerierungsbereich?.hNbId ?? null,
      parzellen: Array.isArray(parzellen)
        ? parzellen.filter(Boolean)
        : parzellen
            .split(",")
            .map((p) => {
              return p.trim();
            })
            .filter(Boolean),
      status: e.status,
      subjId:
        e.status === EigentumStatus.Fehlend
          ? null
          : (e.subjekt?.subjId ?? null),
    };
  });
};

const queryVflzParticipants = gql`
  query VflzParticipantsLayout($vflzId: ID!) {
    vflz(vflzId: $vflzId) {
      readOnly
      ...Sachbearbeitung
      ...Sonstige
      ...Eigentum
      ...VflzLayout
      ...VflzMap
    }
  }
  ${Sachbearbeitung.fragment}
  ${Sonstige.fragment}
  ${Eigentum.fragment}
  ${mutationInfoFragment}
  ${subjektFieldFragment}
  ${VflzLayout.fragment}
  ${vflzMapFragment}
`;

const updateVflzBeteiligteMutation = gql`
  mutation updateVflzBeteiligte($data: UpdateVflzBeteiligteInput!) {
    updateVflzBeteiligte(data: $data) {
      __typename
      ... on Vflz {
        readOnly
        ...Sachbearbeitung
        ...Sonstige
        ...Eigentum
        ...VflzLayout
        ...VflzMap
      }
      ... on ProblemGroup {
        ...FormProblems
      }
    }
  }
  ${Form.fragment}
  ${Sachbearbeitung.fragment}
  ${Sonstige.fragment}
  ${Eigentum.fragment}
  ${mutationInfoFragment}
  ${subjektFieldFragment}
  ${VflzLayout.fragment}
  ${vflzMapFragment}
`;

export default function VflzParticipantsPage() {
  const { permissions } = useCurrentUser();
  const { t } = useI18n();
  const router = useRouter();
  const [subjektDialog, setSubjektDialog] = useState<SubjektDialogProps>();
  const { vflzId } = router.query as { vflzId: string };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data, error, mutate } = useSWR<VflzParticipantsLayoutQuery>(
    vflzId && [queryVflzParticipants, { vflzId }],
  );
  return (
    <VflzLayout error={error as unknown} vflz={data?.vflz}>
      {subjektDialog !== undefined ? (
        <SubjektDialog {...subjektDialog} />
      ) : null}
      <Form
        className="flex grow space-x-5"
        disabled={!permissions.canEditVfl || data?.vflz.readOnly}
        model="Vflz"
        onSubmit={async (values) => {
          const { updateVflzBeteiligte } =
            await client.request<UpdateVflzBeteiligteMutation>(
              updateVflzBeteiligteMutation,
              {
                data: {
                  eigentum: Eigentum.toInput(values),
                  sachbearbeitung: Sachbearbeitung.toInput(values),
                  sonstigeBeteiligte: Sonstige.toInput(values),
                  vflzId,
                },
              },
            );
          if (updateVflzBeteiligte.__typename === "Vflz") {
            await mutate({ vflz: updateVflzBeteiligte }, { revalidate: false });
          }
        }}
        values={data?.vflz}
      >
        <AnchorNavigation
          items={[
            Sachbearbeitung.getNavItem(t),
            Sonstige.getNavItem(t),
            Eigentum.getNavItem(t),
          ]}
        />
        {permissions.canEditVfl ? (
          <VflzActionMenu
            canEditVollzug={data?.vflz.isCurrent && permissions.canEditVfl}
            mutatePage={mutate}
          />
        ) : null}
        <div className="grow space-y-5">
          <Sachbearbeitung />
          <Sonstige setSubjektDialog={setSubjektDialog} />
          <Eigentum setSubjektDialog={setSubjektDialog} vflz={data?.vflz} />
        </div>
      </Form>
    </VflzLayout>
  );
}
