import { gql } from "graphql-request";
import set from "lodash/set";
import { createContext, use, useEffect, useMemo, useState } from "react";
// import rosetta from 'rosetta/debug';
import rosetta from "rosetta";
import useSWRImmutable from "swr/immutable";

import Spinner from "@/components/Spinner";
import useCurrentUser from "@/lib/useCurrentUser";

import type { ReactNode } from "react";

import type { JSONTranslation, TranslationsQuery } from "./graphql";

type LocaleType = "de" | "fr" | "it";

export type tFunction = (
  this: void,
  key: string,
  params?: Record<string, string>,
  lang?: LocaleType,
) => string;

interface ContextType {
  activeLocale: LocaleType;
  locale(this: void, lang: LocaleType): string;
  pluralRules: Intl.PluralRules;
  t: tFunction;
  table: typeof i18n.table;
}

export const defaultLanguage: LocaleType = "de";
const supportedLocales: LocaleType[] = ["de", "fr", "it"];

/**
 * Detect the browser's preferred language from navigator.languages,
 * returning the first supported locale or defaultLanguage as fallback.
 */
function detectBrowserLanguage(): LocaleType {
  if (typeof navigator === "undefined") {
    return defaultLanguage;
  }

  const languages = navigator.languages ?? [navigator.language];
  for (const lang of languages) {
    const shortLang = lang.split("-")[0].toLowerCase();
    if (supportedLocales.includes(shortLang as LocaleType)) {
      return shortLang as LocaleType;
    }
  }
  return defaultLanguage;
}

function getPluralRules(lang = defaultLanguage) {
  return new Intl.PluralRules(`${lang}-CH`);
}

const initialTranslations: Record<string, unknown> = {
  de: {
    Layout: {
      logout: "Abmelden",
      userMenu: "Konto",
    },
    missingPermission:
      "Fehlende Berechtigungen, bitte kontaktieren Sie den Administrator.",
    version: "v{{version}}",
  },
  fr: {
    Layout: {
      logout: "Se déconnecter",
      userMenu: "Compte",
    },
    missingPermission:
      "Autorisations manquantes, veuillez contacter l'administrateur.",
    version: "v{{version}}",
  },
  it: {
    Layout: {
      logout: "Disconnettersi",
      userMenu: "Account",
    },
    missingPermission: "Autorizzazioni mancanti, contattare l'amministratore.",
    version: "v{{version}}",
  },
};

const i18n = rosetta(initialTranslations);
i18n.locale(defaultLanguage);

export const I18nContext = createContext<ContextType>({
  ...i18n,
  activeLocale: defaultLanguage,
  pluralRules: getPluralRules(),
});

export const translationsQuery = gql`
  query translations {
    translations {
      de
      fr
      it
    }
  }
`;

function transformTranslations(input: JSONTranslation) {
  const output: Record<string, unknown> = {};
  Object.entries(input).forEach(([key, value]) => {
    set(output, key, value);
  });
  return output;
}

const HTTPStatusForbidden = 403;

export function I18n({ children }: { children: ReactNode }) {
  const { getSetting, updateSetting } = useCurrentUser();

  const [, setTick] = useState(0);

  const { data, error, isLoading } = useSWRImmutable<
    TranslationsQuery,
    { response?: { status?: number } } | undefined
  >(translationsQuery, null, {
    onSuccess: ({ translations }) => {
      i18n.set("de", transformTranslations(translations.de));
      i18n.set("fr", transformTranslations(translations.fr));
      i18n.set("it", transformTranslations(translations.it));
      setTick((tick) => {
        return tick + 1;
      });
    },
  });

  const activeLocale = useMemo(() => {
    const locale = getSetting<LocaleType | null>("locale", null);
    if (locale && supportedLocales.includes(locale)) {
      return locale;
    }
    return detectBrowserLanguage();
  }, [getSetting]);

  const pluralRules = useMemo(() => {
    return getPluralRules(activeLocale);
  }, [activeLocale]);

  useEffect(() => {
    if (isLoading || !data) {
      return;
    }
    i18n.set("de", transformTranslations(data.translations.de));
    i18n.set("fr", transformTranslations(data.translations.fr));
    i18n.set("it", transformTranslations(data.translations.it));
  }, [data, isLoading]);

  useEffect(() => {
    i18n.locale(activeLocale);
  }, [activeLocale]);

  const i18nWrapper = {
    ...i18n,
    activeLocale,
    locale: (locale: LocaleType) => {
      void updateSetting("locale", locale);
      return i18n.locale(locale);
    },
    pluralRules,
  };

  const isReady = useMemo(() => {
    return (
      (!error || error.response?.status === HTTPStatusForbidden) && !isLoading
    );
  }, [error, isLoading]);

  return isReady ? (
    <I18nContext value={i18nWrapper}>{children}</I18nContext>
  ) : (
    <div className="flex h-screen items-center justify-center">
      <Spinner className="w-32" />
    </div>
  );
}

export function useI18n() {
  const instance = use(I18nContext);
  return instance;
}
