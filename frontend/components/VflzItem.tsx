import { ComboboxOption } from "@headlessui/react";
import { gql } from "graphql-request";

import PublicationIcon from "@/components/icons/PublicationIcon";
import VflzLink from "@/components/VflzLink";

import type { CSSProperties, PropsWithChildren } from "react";

import type { VflzItemFragment } from "@/lib/graphql";

function VflzItemContainer({
  children,
  className,
  clickable = true,
  color,
  isCombobox,
  vflzId,
}: PropsWithChildren<{
  className: string;
  clickable?: boolean;
  color?: string;
  isCombobox?: boolean;
  vflzId: string;
}>) {
  return isCombobox ? (
    <ComboboxOption
      className={`relative bg-(--kbs-color)/20 px-3 text-xs data-focus:bg-(--kbs-color)/10 ${className}`}
      data-test="VflzItem"
      style={{ "--kbs-color": color ?? "var(--color-gray-5)" } as CSSProperties}
      value={vflzId}
    >
      {children}
    </ComboboxOption>
  ) : (
    <div
      className={`relative bg-(--kbs-color)/20 px-3 text-xs ${clickable ? "hover:bg-(--kbs-color)/10" : ""} ${className}`}
      data-test="VflzItem"
      style={{ "--kbs-color": color ?? "var(--color-gray-5)" } as CSSProperties}
    >
      {children}
    </div>
  );
}

function VflzItem({
  className = "",
  clickable = true,
  isCombobox,
  link = true,
  vflz,
}: {
  className?: string;
  clickable?: boolean;
  isCombobox?: boolean;
  link?: boolean;
  vflz: VflzItemFragment;
}) {
  return (
    <VflzItemContainer
      className={className}
      clickable={clickable}
      color={vflz.beurteilung?.kbsInfo?.color}
      isCombobox={isCombobox}
      vflzId={vflz.vflzId}
    >
      <div className="flex items-center space-x-2 font-medium">
        <PublicationIcon className="h-5 w-5" vflz={vflz} />
        <span className="text-gray-7">
          {vflz.combinedId}
          {vflz.gemeinde?.gemeinde && ` \u2022 ${vflz.gemeinde?.gemeinde}`}
        </span>
      </div>
      {link ? (
        <VflzLink
          className="expand-click-area text-blue-7 font-semibold"
          options={{ doNotAppendSearch: true }}
          vflzId={vflz.vflzId}
        >
          {vflz.bezeichnung ?? ""}
        </VflzLink>
      ) : (
        <span className="font-semibold">{vflz.bezeichnung ?? ""}</span>
      )}
    </VflzItemContainer>
  );
}

VflzItem.fragment = gql`
  fragment VflzItem on Vflz {
    combinedId
    vflzId
    bezeichnung
    beurteilung {
      kbsInfo {
        color
      }
    }
    gemeinde {
      gemeinde
    }
    ...PublicationIcon
  }
  ${PublicationIcon.fragment}
`;

export default VflzItem;
