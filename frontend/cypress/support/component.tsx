import { mount, type MountOptions, type MountReturn } from "cypress/react";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { RouterContext } from "next/dist/shared/lib/router-context.shared-runtime";

import Form from "@/components/Form";
import fonts from "@/lib/fonts";
import { Permission, type UseCurrentUserQuery } from "@/lib/graphql";
import { I18n, translationsQuery } from "@/lib/i18n";
import { AppSWRConfig } from "@/pages/_app";

import "./commands";

import "@/lib/tailwind.css";

import type { NextRouter } from "next/router";
import type { PropsWithChildren, ReactNode } from "react";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      mount: (
        component: ReactNode,
        options?: {
          form?: { model?: string };
          router?: Partial<NextRouter>;
          translations?: Record<string, unknown>;
        } & MountOptions,
      ) => Cypress.Chainable<MountReturn>;
      stubCurrentUser: (
        currentUser?: Partial<UseCurrentUserQuery["currentUser"]>,
      ) => void;
    }
  }
}

function CypressNextRouter({
  children,
  router,
}: PropsWithChildren<{ router?: Partial<NextRouter> }>) {
  if (!router) {
    return <>{children}</>;
  }

  const defaultRouter = {
    asPath: "/",
    back: cy.stub().as("router:back"),
    basePath: "",
    beforePopState: () => {
      return null;
    },
    bfcacheId: "cypress",
    events: {
      emit: cy.stub().as("router:emit"),
      off: cy.stub().as("router:off"),
      on: cy.stub().as("router:on"),
    },
    forward: cy.stub().as("router:forward"),
    isFallback: false,
    isLocaleDomain: false,
    isPreview: false,
    isReady: true,
    pathname: "/",
    prefetch: cy.stub().as("router:prefetch"),
    push: cy.stub().as("router:push"),
    query: {},
    refresh: () => {
      return null;
    },
    reload: cy.stub().as("router:reload"),
    replace: cy.stub().as("router:replace"),
    route: "/",
  };
  return (
    <AppRouterContext value={defaultRouter}>
      <RouterContext value={{ ...defaultRouter, ...router }}>
        {children}
      </RouterContext>
    </AppRouterContext>
  );
}

Cypress.Commands.add("mount", (component, options) => {
  const translations = { de: options?.translations ?? {}, fr: {}, it: {} };
  return mount(
    <AppSWRConfig
      provider={() => {
        const cache = new Map();
        cache.set(translationsQuery, { data: { translations } });
        return cache;
      }}
    >
      <CypressNextRouter router={options?.router}>
        <I18n>
          <div className={fonts}>
            {options?.form ? (
              <Form model={options?.form.model ?? "cypress"}>{component}</Form>
            ) : (
              component
            )}
          </div>
        </I18n>
      </CypressNextRouter>
    </AppSWRConfig>,
    options,
  );
});

Cypress.Commands.add("stubCurrentUser", (currentUser) => {
  cy.intercept("POST", "/graphql", (req) => {
    if (req.body.query?.includes("query useCurrentUser")) {
      req.reply({
        data: {
          currentUser: {
            permissions: Object.values(Permission),
            username: "Cypress",
            ...currentUser,
          },
        },
      });
    }
  });
});
