import { gql } from "graphql-request";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { type Path, useFormContext, useWatch } from "react-hook-form";

import Form, { useValidatedData } from "@/components/Form";
import Layout from "@/components/Layout";
import VflzActionMenu from "@/components/VflzActionMenu";
import VflzCreateFormFields from "@/components/VflzCreateFormFields";
import client from "@/lib/client";
import { useI18n } from "@/lib/i18n";

import type { GeoJSONMultiPolygon, GeoJSONPoint } from "ol/format/GeoJSON";

import type {
  CreateVflzMutation,
  ValidateCreateVflzQuery,
} from "@/lib/graphql";

const VflzMapEditor = dynamic(
  () => {
    return import("@/components/VflzMapEditor");
  },
  {
    ssr: false,
  },
);

interface VflzCreateForm {
  bezeichnung?: string;
  combinedId?: string;
  flugplatz?: string;
  gemeinde?: { displayValue: string; hGemId: string; kanton?: null | string };
  geometry?: GeoJSONMultiPolygon | GeoJSONPoint;
  ktu?: string;
  vftyp?: string;
  zentroid?: GeoJSONPoint;
}

const createVflzMutation = gql`
  mutation createVflz($data: CreateVflzInput!) {
    createVflz(data: $data) {
      __typename
      ... on Vflz {
        vflzId
      }
      ... on ProblemGroup {
        ...FormProblems
      }
    }
  }
  ${Form.fragment}
`;

const queryValidateCreateVflz = gql`
  query validateCreateVflz($data: ValidateCreateVflzInput!) {
    validateCreateVflz(data: $data) {
      ... on ValidatedCreateVflzData {
        combinedId
        flugplatz
        gemeinde {
          __typename
          displayValue
          hGemId
          kanton
        }
      }
      ... on ProblemGroup {
        ...FormProblems
      }
    }
  }
  ${Form.fragment}
`;

function FormFields() {
  const [, setTick] = useState(0);
  const { setValidatedData } = useValidatedData();
  const { setError, setValue } = useFormContext<VflzCreateForm>();
  const { t } = useI18n();
  const flugplatz = useWatch<VflzCreateForm>({ name: "flugplatz" });
  const geometry = useWatch<VflzCreateForm>({ name: "geometry" });
  const hGemId = useWatch<VflzCreateForm>({ name: "gemeinde.hGemId" });
  const ktu = useWatch<VflzCreateForm>({ name: "ktu" });
  const vftyp = useWatch<VflzCreateForm>({ name: "vftyp" });

  useEffect(() => {
    if (!geometry) {
      return;
    }
    void client
      .request<ValidateCreateVflzQuery>(queryValidateCreateVflz, {
        data: {
          combinedId: null,
          flugplatz: flugplatz ?? null,
          gemeinde: hGemId ? { hGemId } : null,
          geometry,
          ktu: ktu ?? null,
          vftyp: vftyp ?? null,
        },
      })
      .then(({ validateCreateVflz }) => {
        if ("combinedId" in validateCreateVflz) {
          if (validateCreateVflz.combinedId.length === 1) {
            setValue("combinedId", validateCreateVflz.combinedId[0]);
          }
          if (validateCreateVflz.gemeinde.length === 1) {
            setValue("gemeinde", validateCreateVflz.gemeinde[0]);
          }
          setValidatedData(validateCreateVflz);
        } else {
          setValidatedData({});
          validateCreateVflz.problems.forEach((p) => {
            setError(p.field as Path<VflzCreateForm>, {
              type: `${p.problemCode}.${p.field}`,
            });
          });
          setTick((tick) => {
            return tick + 1;
          }); // force rerender to update view
        }
      });
  }, [
    flugplatz,
    geometry,
    hGemId,
    ktu,
    vftyp,
    setValidatedData,
    setError,
    setValue,
  ]);

  return (
    <VflzCreateFormFields
      message={t("vflz.create.message")}
      title={t("vflz.create.heading")}
    />
  );
}

export default function VflzCreatePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [createdVflzId, setCreatedVflzId] = useState<string>();

  useEffect(() => {
    if (createdVflzId) {
      void router.push(`/vflz/${createdVflzId}/data`);
    }
  }, [createdVflzId, router]);

  return (
    <Layout container title={t("vflz.create.title")}>
      <Form<VflzCreateForm>
        className="mt-4 space-y-5"
        data-test="vflzCreateForm"
        model="Vflz"
        onSubmit={async (values, methods) => {
          if (values.zentroid) {
            values.zentroid.coordinates[2] = 0;
          }
          const { createVflz } = await client.request<CreateVflzMutation>(
            createVflzMutation,
            {
              data: {
                bezeichnung: values.bezeichnung,
                combinedId: values.combinedId,
                flugplatz: values.flugplatz ?? null,
                gemeinde: { hGemId: values.gemeinde?.hGemId },
                geometry: values.geometry,
                ktu: values.ktu ?? null,
                vftyp: values.vftyp,
                zentroid: values.zentroid,
              },
            },
          );
          if (createVflz.__typename === "Vflz") {
            methods.reset(values);
            setCreatedVflzId(createVflz.vflzId);
          } else {
            return createVflz; // ProblemGroup
          }
        }}
      >
        <FormFields />
        <VflzMapEditor />
        <VflzActionMenu hideMenu />
      </Form>
    </Layout>
  );
}
