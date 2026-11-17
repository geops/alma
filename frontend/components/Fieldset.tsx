import { Fieldset, Legend } from "@headlessui/react";
import { useFormContext } from "react-hook-form";

import MutationInfo from "@/components/MutationInfo";
import tw from "@/lib/tw";

import type { PropsWithChildren } from "react";

import type { MutationInfoFragment } from "@/lib/graphql";

type MutationInfos = (MutationInfoFragment | null | undefined)[];

function getLastMutationInfo(infos: MutationInfos) {
  return infos.reduce((last, info) => {
    const date = info
      ? new Date(info.mutationsDatum || info.erfassungsDatum || 0)
      : 0;
    const lastDate = last
      ? new Date(last.mutationsDatum || last.erfassungsDatum || 0)
      : 0;
    return date > lastDate ? info : last;
  }, null);
}

const background = {
  1: tw`border-gray-4 bg-white`,
  2: tw`border-gray-4 bg-gray-2`,
};

export default function AlmaFieldset({
  children,
  className = "",
  disabled = false,
  id,
  legend,
  level = 1,
  mutationInfo,
}: PropsWithChildren<{
  className?: string;
  disabled?: boolean;
  id?: string;
  legend?: string;
  level?: 1 | 2;
  mutationInfo?: MutationInfoFragment | MutationInfos | null;
}>) {
  const { formState } = useFormContext();

  const lastMutation = Array.isArray(mutationInfo)
    ? getLastMutationInfo(mutationInfo)
    : mutationInfo;

  return (
    <Fieldset
      className={`rounded-lg border p-5 ${background[level]}`}
      disabled={formState.disabled || disabled}
    >
      <div className="flex items-start justify-between">
        {legend ? (
          <Legend className="mb-3 scroll-mt-44 font-semibold" id={id}>
            {legend}
          </Legend>
        ) : null}
        <MutationInfo className="ml-auto" {...lastMutation} />
      </div>
      <div className={className}>{children}</div>
    </Fieldset>
  );
}
