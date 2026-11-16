import { Fragment } from "react";

import { useI18n } from "@/lib/i18n";

import type { ReactNode } from "react";

function getRawTranslation(tree: unknown, key: string): string {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    return acc && typeof acc === "object"
      ? (acc as Record<string, unknown>)[part]
      : undefined;
  }, tree);
  return typeof value === "string" ? value : "";
}

/**
 * Like `t()`, but allows interpolating React nodes (e.g. to render part of a
 * translation bold) instead of only plain strings.
 */
export default function Trans({
  i18nKey,
  values,
}: {
  i18nKey: string;
  values: Record<string, ReactNode>;
}) {
  const { activeLocale, table } = useI18n();
  const template = getRawTranslation(table(activeLocale), i18nKey);

  const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match = placeholderRegex.exec(template);
  while (match) {
    if (match.index > lastIndex) {
      parts.push(template.slice(lastIndex, match.index));
    }
    parts.push(<Fragment key={match.index}>{values[match[1]]}</Fragment>);
    lastIndex = match.index + match[0].length;
    match = placeholderRegex.exec(template);
  }
  if (lastIndex < template.length) {
    parts.push(template.slice(lastIndex));
  }

  return <>{parts}</>;
}
