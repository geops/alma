import { gql } from "graphql-request";
import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import CodeListbox from "@/components/CodeListbox";
import Fieldset from "@/components/Fieldset";
import { useValidatedData } from "@/components/Form";
import Input from "@/components/Input";
import Message from "@/components/Message";
import { useI18n } from "@/lib/i18n";
import { ModelContext } from "@/lib/modelContext";

import type { VflzCreateFormFieldsFragment } from "@/lib/graphql";

function VflzCreateFormFields({
  message,
  title,
  vftypDisabled,
}: {
  message: string;
  title: string;
  vftypDisabled?: boolean;
}) {
  const { validatedData } = useValidatedData();
  const { formState, getValues, setError } =
    useFormContext<VflzCreateFormFieldsFragment>();
  const { t } = useI18n();
  const hGemId = useWatch<VflzCreateFormFieldsFragment>({
    name: "gemeinde.hGemId",
  });
  const vftyp = useWatch<VflzCreateFormFieldsFragment>({ name: "vftyp" });

  useEffect(() => {
    if (formState.isSubmitted && !hGemId) {
      setError("gemeinde.displayValue", { type: "required" });
    }
  }, [formState.isSubmitted, hGemId, setError]);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">{title}</h1>
        <Message>{message}</Message>
      </div>
      <Fieldset className="grid grid-cols-3 gap-5">
        <ModelContext value="Vflz.gemeinde">
          <Input disabled name="gemeinde.displayValue" required />
        </ModelContext>
        <Input
          data-test="VflzCreateFormFields-kanton"
          disabled
          label={t("vflz.kanton")}
          value={t(getValues("gemeinde.kanton") ?? "")}
        />
        <CodeListbox disabled={vftypDisabled} name="vftyp" required />
        <Input
          {...(("combinedId" in validatedData && vftyp) || vftypDisabled
            ? {}
            : { disabled: true })}
          name="combinedId"
          required
        />
        <Input name="bezeichnung" required />
        <CodeListbox name="flugplatz" />
        <CodeListbox name="ktu" />
      </Fieldset>
    </div>
  );
}

VflzCreateFormFields.fragment = gql`
  fragment VflzCreateFormFields on Vflz {
    bezeichnung
    combinedId
    flugplatz
    gemeinde {
      displayValue
      hGemId
      kanton
    }
    ktu
    vftyp
  }
`;

export default VflzCreateFormFields;
