import Spinner from "@/components/Spinner";
import VflzItem from "@/components/VflzItem";

import type { VflzItemFragment } from "@/lib/graphql";

function VflzItemSkeleton() {
  return (
    <VflzItem
      className="font-blokk py-2 opacity-50 blur-sm"
      vflz={{
        bezeichnung: "Skeleton Location",
        combinedId: "ABC-123",
        evaluationStatus: {
          deletedPreviously: false,
          deleteNow: false,
          publishedPreviously: false,
          publishNow: false,
        },
        vflzId: "",
      }}
    />
  );
}

export default function VflzList({
  className = "",
  clickable = true,
  isCombobox,
  items,
  link,
  noResults,
}: {
  className?: string;
  clickable?: boolean;
  isCombobox?: boolean;
  items?: VflzItemFragment[];
  link?: boolean;
  noResults?: string;
}) {
  if (items?.length === 0) {
    return noResults ? (
      <div className={`text-gray-7 mb-3 px-3 text-sm ${className}`}>
        {noResults}
      </div>
    ) : null;
  }
  return (
    <div className={`relative ${className}`}>
      {items ? null : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner className="w-8" />
        </div>
      )}
      <div
        className={`divide-gray-5 border-gray-5 ${clickable ? "cursor-pointer" : ""} divide-y border-t`}
      >
        {items ? (
          items.map((vflz) => {
            return (
              <VflzItem
                className="py-2"
                clickable={clickable}
                isCombobox={isCombobox}
                key={vflz.vflzId}
                link={link}
                vflz={vflz}
              />
            );
          })
        ) : (
          <>
            <VflzItemSkeleton />
            <VflzItemSkeleton />
            <VflzItemSkeleton />
          </>
        )}
      </div>
    </div>
  );
}
