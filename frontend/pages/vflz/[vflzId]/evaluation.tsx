import { gql } from "graphql-request";
import isEqual from "lodash/isEqual";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";

import AnchorNavigation from "@/components/AnchorNavigation";
import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import CodeListbox from "@/components/CodeListbox";
import DatePicker from "@/components/DatePicker";
import FieldArray from "@/components/FieldArray";
import Fieldset from "@/components/Fieldset";
import Form from "@/components/Form";
import LockedIcon from "@/components/icons/LockedIcon";
import { mutationInfoFragment } from "@/components/MutationInfo";
import Textarea from "@/components/Textarea";
import VflzActionMenu from "@/components/VflzActionMenu";
import VflzLayout from "@/components/VflzLayout";
import client from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { ModelContext, useModelContext } from "@/lib/modelContext";
import removeErfassungMutation from "@/lib/removeErfassungMutation";
import toBemerkungInput from "@/lib/toBemerkungInput";
import useCodeOptions from "@/lib/useCodeOptions";
import useCurrentUser from "@/lib/useCurrentUser";

import type { AnchorNavItem } from "@/components/AnchorNavigation";
import type {
  BeurteilungInput,
  KbsInfosQuery,
  MassnahmeInput,
  MutationInfoFragment,
  SanierungszielInput,
  UpdateVflzEvaluationInput,
  UpdateVflzEvaluationMutation,
  VflzEvaluationFormFragment,
  VflzEvaluationQuery,
} from "@/lib/graphql";
import type { tFunction } from "@/lib/i18n";
import type { Props } from "@/lib/useCodeOptions";

function CodeLabel({
  code,
  name,
  ...props
}: { className?: string; code: string | undefined } & Props) {
  const model = useModelContext();
  const { t } = useI18n();
  const fieldname = name.split(".").pop();
  const label = t(`fields.${model}.${fieldname}`);

  const options = useCodeOptions({ name });
  const currentValueLabel = options.find((o) => {
    return o.value?.split(":")[2] === code;
  })?.label;

  return (
    <>
      <span className="font-semibold">{label}: </span>
      <span {...props}>{currentValueLabel}</span>
    </>
  );
}

function UnlockedIcon() {
  return (
    <svg fill="none" height="18" width="16" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3.833 7.333V5.667A4.167 4.167 0 0 1 11.82 4M8 11.083v1.667M5.333 16.5h5.334c1.4 0 2.1 0 2.635-.273a2.5 2.5 0 0 0 1.092-1.092c.273-.535.273-1.235.273-2.635v-1.167c0-1.4 0-2.1-.273-2.635a2.5 2.5 0 0 0-1.092-1.092c-.535-.273-1.235-.273-2.635-.273H5.333c-1.4 0-2.1 0-2.635.273a2.5 2.5 0 0 0-1.092 1.092c-.273.535-.273 1.235-.273 2.635V12.5c0 1.4 0 2.1.273 2.635a2.5 2.5 0 0 0 1.092 1.092c.535.273 1.235.273 2.635.273Z"
        stroke="#98A2B3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.667"
      />
    </svg>
  );
}

const queryKbsInfos = gql`
  query kbsInfos {
    kbsInfos {
      beurteilung
      belastet
      color
    }
  }
`;

function isBelastet(
  kbsInfosList?: KbsInfosQuery["kbsInfos"],
  beurteilungCode?: null | string,
) {
  if (!kbsInfosList) {
    return false;
  }
  if (!beurteilungCode) {
    return false;
  }

  return kbsInfosList.some((k) => {
    return k.beurteilung === beurteilungCode && k.belastet;
  });
}

function VflzBeurteilung({
  initialState,
}: {
  initialState?: VflzEvaluationFormFragment;
}) {
  const { getValues, setValue, watch } =
    useFormContext<VflzEvaluationFormFragment>();
  const { t } = useI18n();
  const [isEditLocked, setIsEditLocked] = useState(true);
  const [tmpBeurteilungPublizieren, setTmpBeurteilungPublizieren] = useState<{
    beurteilung: null | string;
    datPublizieren: null | string;
    publizieren: boolean;
  }>({
    beurteilung: initialState?.beurteilung?.beurteilung ?? null,
    datPublizieren: initialState?.datPublizieren ?? null,
    publizieren: !!initialState?.publizieren,
  });
  const beurteilungValue = watch("beurteilung.beurteilung");
  const isRechtskraft = watch("rechtskraft");
  const datRechtskraftValue = watch("datRechtskraft");
  const isPublizieren = watch("publizieren");
  const datPublizierenValue = watch("datPublizieren");
  const { data: kbsInfosListData } =
    useSWRImmutable<KbsInfosQuery>(queryKbsInfos);

  const kbsErsteintragOk =
    isBelastet(kbsInfosListData?.kbsInfos, beurteilungValue) ||
    getValues("evaluationStatus.belastet");
  useEffect(() => {
    setValue("rechtskraft", !!datRechtskraftValue);
  }, [datRechtskraftValue, setValue]);

  const publizierenOk = !!getValues("rechtskraft");
  useEffect(() => {
    setValue("publizieren", !!datPublizierenValue);
  }, [datPublizierenValue, setValue]);

  const kbsLoeschungOk = !isBelastet(
    kbsInfosListData?.kbsInfos,
    beurteilungValue,
  );

  useEffect(() => {
    if (initialState) {
      setTmpBeurteilungPublizieren({
        beurteilung: initialState.beurteilung?.beurteilung ?? null,
        datPublizieren: initialState.datPublizieren ?? null,
        publizieren: !!initialState.publizieren,
      });
    }
  }, [initialState]);

  useEffect(() => {
    if (isRechtskraft && !getValues("datRechtskraft")) {
      setValue("datRechtskraft", new Date().toISOString().split("T")[0]);
    } else if (!isRechtskraft) {
      setValue("datRechtskraft", null);
    }
  }, [getValues, isRechtskraft, setValue]);

  useEffect(() => {
    if (isPublizieren && !getValues("datPublizieren")) {
      setValue("datPublizieren", new Date().toISOString().split("T")[0]);
    } else if (!isPublizieren) {
      setValue("datPublizieren", null);
    }
  }, [getValues, isPublizieren, setValue]);

  useEffect(() => {
    if (beurteilungValue !== tmpBeurteilungPublizieren.beurteilung) {
      setValue("publizieren", false);
      setValue("datPublizieren", null);
    } else {
      setValue("publizieren", tmpBeurteilungPublizieren.publizieren);
      setValue("datPublizieren", tmpBeurteilungPublizieren.datPublizieren);
    }
  }, [
    beurteilungValue,
    kbsInfosListData?.kbsInfos,
    setValue,
    tmpBeurteilungPublizieren,
  ]);

  return (
    <Fieldset
      className="space-y-8"
      id="beurteilung"
      legend={t("vflz.evaluation.title")}
      mutationInfo={[
        getValues("beurteilung.erfassungMutation"),
        getValues("begruendungBewertung.erfassungMutation"),
      ]}
    >
      <ModelContext value="Beurteilung">
        <CodeListbox name="beurteilung.beurteilung" />
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          <div className="bg-blue-1 rounded-lg p-2 text-xs">
            <CodeLabel
              code={beurteilungValue?.split(":")[2]}
              data-test="rechtlicherBezug"
              name="rechtlicherBezug"
            />
          </div>
          <div className="bg-blue-1 rounded-lg p-2 text-xs">
            <CodeLabel
              code={beurteilungValue?.split(":")[2]}
              data-test="handlungsbedarf"
              name="handlungsbedarf"
            />
          </div>
        </div>
      </ModelContext>
      <ModelContext value="Vflz.begruendungBewertung">
        <Textarea name="begruendungBewertung.bem" />
      </ModelContext>
      <div className="relative">
        <Button
          className={`flex space-x-1.5 ${isEditLocked ? "" : "text-gray-5 bg-white"} absolute top-5 left-5`}
          data-test="lockButton"
          onClick={() => {
            return setIsEditLocked(!isEditLocked);
          }}
          outline
        >
          {isEditLocked ? <LockedIcon /> : <UnlockedIcon />}
          <span>{t("vflz.evaluation.lockEditButton")}</span>
        </Button>
        <Fieldset
          className="mt-8"
          disabled={isEditLocked}
          id="lockedFields"
          level={2}
          mutationInfo={getValues("erfassungMutation")}
        >
          <div className="border-gray-4 grid grid-cols-2 gap-x-8 gap-y-5 border-y py-3">
            <CodeListbox name="bearbeitungsStand" />
            <CodeListbox name="untersuchungsStand" />
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 pt-3">
            <div data-test="rechtskraft">
              <Checkbox
                disabled={!kbsErsteintragOk || isEditLocked}
                name="rechtskraft"
              />
            </div>
            <div data-test="publizieren">
              <Checkbox
                disabled={!publizierenOk || isEditLocked}
                name="publizieren"
                {...(kbsLoeschungOk && {
                  label: t("vflz.evaluation.kbsLoeschung"),
                })}
              />
            </div>
            <div className="pl-5">
              <DatePicker disabled={!kbsErsteintragOk} name="datRechtskraft" />
            </div>
            <div className="pl-5">
              <DatePicker
                disabled={!publizierenOk}
                name="datPublizieren"
                {...(kbsLoeschungOk && {
                  label: t("vflz.evaluation.datLoeschung"),
                })}
              />
            </div>
          </div>
        </Fieldset>
      </div>
    </Fieldset>
  );
}

VflzBeurteilung.fragment = gql`
  fragment VflzBeurteilung on Vflz {
    bearbeitungsStand
    beurteilung {
      beurteilung
      erfassungMutation {
        ...MutationInfo
      }
      handlungsbedarf
      kbsInfo {
        belastet
      }
      rechtlicherBezug
    }
    begruendungBewertung {
      ...BemErfassungMutation
    }
    datPublizieren
    datRechtskraft
    erfassungMutation {
      ...MutationInfo
    }
    isCurrent
    publizieren
    rechtskraft
    evaluationStatus {
      belastet
    }
    untersuchungsStand
  }
`;

VflzBeurteilung.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: [
      "bearbeitungsStand",
      "untersuchungsStand",
      "beurteilung",
      "begruendungBewertung",
      "rechtskraft",
      "publizieren",
    ],
    id: "beurteilung",
    legend: t("vflz.evaluation.title"),
  };
};

VflzBeurteilung.toInput = ({
  beurteilung,
}: {
  beurteilung?: BeurteilungInput | null;
}) => {
  return {
    beurteilung: {
      beurteilung: (beurteilung?.beurteilung ?? null) as null | string,
      prioSanier: (beurteilung?.prioSanier ?? null) as null | string,
      prioUntersuch: (beurteilung?.prioUntersuch ?? null) as null | string,
    },
  };
};

function VflzPrioUntersuchung() {
  const { getValues } = useFormContext<VflzEvaluationFormFragment>();
  const { t } = useI18n();

  return (
    <Fieldset
      className="space-y-8"
      id="prio-untersuchung"
      legend={t("vflz.evaluation.prioUntersuchungsbedarf.title")}
      mutationInfo={getValues(
        "begruendungPrioUntersuchungsbedarf.erfassungMutation",
      )}
    >
      <div className="@container grid grid-cols-2 gap-x-8 gap-y-5">
        <ModelContext value="Beurteilung">
          <CodeListbox name="beurteilung.prioUntersuch" />
        </ModelContext>
        <div className="col-span-2">
          <ModelContext value="Vflz.begruendungPrioUntersuchungsbedarf">
            <Textarea name="begruendungPrioUntersuchungsbedarf.bem" />
          </ModelContext>
        </div>
      </div>
    </Fieldset>
  );
}

VflzPrioUntersuchung.fragment = gql`
  fragment VflzPrioUntersuchung on Vflz {
    begruendungPrioUntersuchungsbedarf {
      ...BemErfassungMutation
    }
    beurteilung {
      prioUntersuch
    }
  }
`;

VflzPrioUntersuchung.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: [],
    id: "prio-untersuchung",
    legend: t("vflz.evaluation.prioUntersuchungsbedarf.navItem"),
  };
};

const emptySanierungsziel: SanierungszielInput = {
  bemerkung: null,
  sanierungsziel: null,
  saniId: null,
};

function VflzSanierungsziele() {
  const { getValues } = useFormContext<VflzEvaluationFormFragment>();
  const { t } = useI18n();

  return (
    <Fieldset
      className="space-y-8"
      id="sanierungsziel"
      legend={t("vflz.evaluation.zieleSanierung.title")}
      mutationInfo={
        [
          getValues("begruendungPrioUntersuchungsbedarf.erfassungMutation"),
          ...(getValues("sanierungsziele") || [])
            .map((s) => {
              return [s.erfassungMutation, s.bemerkung?.erfassungMutation];
            })
            .flat(),
        ] as MutationInfoFragment[]
      }
    >
      <FieldArray<SanierungszielInput>
        addLabel={t("sanierungsziel.addLabel")}
        getTitle={(s) => {
          return s.sanierungsziel ? t(s.sanierungsziel as string) : "";
        }}
        model="Sanierungsziel"
        name="sanierungsziele"
        value={emptySanierungsziel}
      >
        {(i1) => {
          return (
            <div className="@container grid grid-cols-2 gap-x-8 gap-y-5">
              <CodeListbox name={`sanierungsziele.${i1}.sanierungsziel`} />
              <div className="col-span-2">
                <ModelContext value={`Sanierungsziel.bemerkung`}>
                  <Textarea name={`sanierungsziele.${i1}.bemerkung.bem`} />
                </ModelContext>
              </div>
            </div>
          );
        }}
      </FieldArray>
      <div className="@container grid grid-cols-2 gap-x-8 gap-y-5">
        <ModelContext value="Beurteilung">
          <CodeListbox name="beurteilung.prioSanier" />
        </ModelContext>
        <div className="col-span-2">
          <ModelContext value="Vflz.begruendungPrioSanierungsbedarf">
            <Textarea name="begruendungPrioSanierungsbedarf.bem" />
          </ModelContext>
        </div>
      </div>
    </Fieldset>
  );
}

VflzSanierungsziele.fragment = gql`
  fragment VflzSanierungsziele on Vflz {
    begruendungPrioSanierungsbedarf {
      ...BemErfassungMutation
    }
    beurteilung {
      prioSanier
    }
    sanierungsziele {
      saniId
      sanierungsziel
      bemerkung {
        ...BemErfassungMutation
      }
      erfassungMutation {
        ...MutationInfo
      }
    }
  }
`;

VflzSanierungsziele.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: ["beurteilung", "begruendungPrioSanierungsbedarf"],
    id: "sanierungsziel",
    legend: t("vflz.evaluation.zieleSanierung.navItem"),
  };
};

VflzSanierungsziele.toInput = (
  sanierunsziele: VflzEvaluationQuery["vflz"]["sanierungsziele"] = [],
): SanierungszielInput[] => {
  return sanierunsziele
    .map((sanierunsziel) => {
      return removeErfassungMutation({
        ...sanierunsziel,
        bemerkung: toBemerkungInput(sanierunsziel.bemerkung),
      });
    })
    .filter((s) => {
      return !isEqual(s, emptySanierungsziel);
    });
};

const emptyMassnahme: MassnahmeInput = {
  angMassnahme: null,
  bemerkung: null,
  datMassnahme: null,
  massId: null,
  massnahme: null,
};

function VflzMassnahmen() {
  const { getValues } = useFormContext<VflzEvaluationFormFragment>();
  const { t } = useI18n();

  return (
    <Fieldset
      className="space-y-8"
      id="massnahmen"
      legend={t("vflz.evaluation.massnahmen.title")}
      mutationInfo={(getValues("massnahmen") || [])
        .map((m) => {
          return [m.erfassungMutation, m.bemerkung?.erfassungMutation];
        })
        .flat()}
    >
      <FieldArray<MassnahmeInput>
        addLabel={t("massnahme.addLabel")}
        getTitle={(m) => {
          return m.massnahme ? t(m.massnahme as string) : "";
        }}
        model="Massnahme"
        name="massnahmen"
        value={emptyMassnahme}
      >
        {(i1) => {
          return (
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              <CodeListbox name={`massnahmen.${i1}.massnahme`} />
              <div className="col-start-1">
                <DatePicker name={`massnahmen.${i1}.angMassnahme`} />
              </div>
              <div>
                <DatePicker name={`massnahmen.${i1}.datMassnahme`} />
              </div>
              <div className="col-span-2">
                <ModelContext value={`Massnahme.bemerkung`}>
                  <Textarea name={`massnahmen.${i1}.bemerkung.bem`} />
                </ModelContext>
              </div>
            </div>
          );
        }}
      </FieldArray>
    </Fieldset>
  );
}

VflzMassnahmen.fragment = gql`
  fragment VflzMassnahmen on Vflz {
    massnahmen {
      angMassnahme
      bemerkung {
        ...BemErfassungMutation
      }
      datMassnahme
      erfassungMutation {
        ...MutationInfo
      }
      massId
      massnahme
    }
  }
`;

VflzMassnahmen.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: [],
    id: "massnahmen",
    legend: t("vflz.evaluation.massnahmen.navItem"),
  };
};

VflzMassnahmen.toInput = (
  massnahmen: VflzEvaluationQuery["vflz"]["massnahmen"] = [],
): MassnahmeInput[] => {
  return massnahmen
    .map((massnahme) => {
      return removeErfassungMutation({
        ...massnahme,
        bemerkung: toBemerkungInput(massnahme.bemerkung),
      });
    })
    .filter((m) => {
      return !isEqual(m, emptyMassnahme);
    });
};

const vflzEvaluationFormFragment = gql`
  fragment VflzEvaluationForm on Vflz {
    vflzId
    isCurrent
    readOnly
    ...VflzBeurteilung
    ...VflzPrioUntersuchung
    ...VflzSanierungsziele
    ...VflzMassnahmen
  }
  ${mutationInfoFragment}
  ${VflzBeurteilung.fragment}
  ${VflzPrioUntersuchung.fragment}
  ${VflzSanierungsziele.fragment}
  ${VflzMassnahmen.fragment}
  fragment BemErfassungMutation on Bemerkung {
    bem
    erfassungMutation {
      ...MutationInfo
    }
  }
`;

const queryVflzEvaluation = gql`
  query VflzEvaluation($vflzId: ID!) {
    vflz(vflzId: $vflzId) {
      ...VflzEvaluationForm
      ...VflzLayout
    }
  }
  ${vflzEvaluationFormFragment}
  ${VflzLayout.fragment}
`;

const updateVflzEvaluationMutation = gql`
  mutation updateVflzEvaluation($data: UpdateVflzEvaluationInput!) {
    updateVflzEvaluation(data: $data) {
      __typename
      ... on Vflz {
        ...VflzEvaluationForm
        ...VflzLayout
      }
      ... on ProblemGroup {
        ...FormProblems
      }
    }
  }
  ${vflzEvaluationFormFragment}
  ${Form.fragment}
  ${VflzLayout.fragment}
`;

function getVflzEvaluation(
  data: VflzEvaluationQuery["vflz"],
): Required<UpdateVflzEvaluationInput> {
  return {
    bearbeitungsStand: data.bearbeitungsStand ?? null,
    begruendungBewertung: toBemerkungInput(data.begruendungBewertung),
    begruendungPrioSanierungsbedarf: toBemerkungInput(
      data.begruendungPrioSanierungsbedarf,
    ),
    begruendungPrioUntersuchungsbedarf: toBemerkungInput(
      data.begruendungPrioUntersuchungsbedarf,
    ),
    ...VflzBeurteilung.toInput(data),
    datPublizieren: data.datPublizieren || null,
    datRechtskraft: data.datRechtskraft || null,
    massnahmen: VflzMassnahmen.toInput(data.massnahmen),
    publizieren: data.publizieren ?? false,
    rechtskraft: data.rechtskraft ?? false,
    sanierungsziele: VflzSanierungsziele.toInput(data.sanierungsziele),
    untersuchungsStand: data.untersuchungsStand ?? null,
    vflzId: data.vflzId,
  };
}

export default function VflzEvaluationPage() {
  const { permissions } = useCurrentUser();
  const { t } = useI18n();
  const router = useRouter();
  const { vflzId } = router.query;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data, error, mutate } = useSWR<VflzEvaluationQuery>(
    vflzId && [queryVflzEvaluation, { vflzId }],
  );

  const anchorNavItems: AnchorNavItem[] = [
    VflzBeurteilung.getNavItem(t),
    VflzPrioUntersuchung.getNavItem(t),
    VflzSanierungsziele.getNavItem(t),
    VflzMassnahmen.getNavItem(t),
  ];

  return (
    <VflzLayout error={error as unknown} vflz={data?.vflz}>
      <Form<VflzEvaluationQuery["vflz"]>
        className="flex grow space-x-5"
        data-test="vflzEvaluationForm"
        disabled={data?.vflz.readOnly || !permissions.canEditVfl}
        model="Vflz"
        onSubmit={async (values) => {
          const { updateVflzEvaluation } =
            await client.request<UpdateVflzEvaluationMutation>(
              updateVflzEvaluationMutation,
              { data: getVflzEvaluation(values) },
            );
          if (updateVflzEvaluation.__typename === "Vflz") {
            await mutate({ vflz: updateVflzEvaluation }, { revalidate: false });
            await router.push(
              `/vflz/${updateVflzEvaluation.vflzId}/evaluation`,
              undefined,
              { shallow: true },
            );
          } else {
            return updateVflzEvaluation; // ProblemGroup
          }
        }}
        values={data?.vflz}
      >
        <AnchorNavigation items={anchorNavItems} />
        <div className="grow space-y-5">
          <VflzBeurteilung initialState={data?.vflz} />
          <VflzPrioUntersuchung />
          <VflzSanierungsziele />
          <VflzMassnahmen />
          {permissions.canEditVfl ? (
            <VflzActionMenu
              canEditVollzug={data?.vflz.isCurrent && permissions.canEditVfl}
              mutatePage={mutate}
            />
          ) : null}
        </div>
      </Form>
    </VflzLayout>
  );
}
