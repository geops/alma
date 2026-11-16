import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { gql } from "graphql-request";
import { useState } from "react";
import useSWR from "swr";

import Button from "@/components/Button";
import Combobox from "@/components/Combobox";
import Dialog from "@/components/Dialog";
import Form from "@/components/Form";
import Input from "@/components/Input";
import client from "@/lib/client";
import createPoolMutation from "@/lib/createPoolMutation";
import { useI18n } from "@/lib/i18n";

import type { KeyedMutator } from "swr";

import type {
  AddToPoolDialogQuery,
  CreatePoolMutation,
  SidebarVflzPoolsQuery,
} from "@/lib/graphql";

const queryPools = gql`
  query addToPoolDialog {
    pools(perPage: 20) {
      results {
        poolId
        bezeichnung
      }
    }
  }
`;

const addToPoolMutation = gql`
  mutation addToPool($poolId: ID!, $vflId: ID!) {
    addToPool(poolId: $poolId, vflId: $vflId) {
      poolId
    }
  }
`;

const addSearchResultsToPoolMutation = gql`
  mutation addSearchResultsToPool($poolId: ID!, $query: String!) {
    addSearchResultsToPool(data: { poolId: $poolId, query: $query }) {
      poolId
    }
  }
`;

export default function AddToPoolDialog({
  isOpen,
  mutateVflzPools,
  onClose,
  searchQuery,
  vflId,
  vflzPools,
}: {
  isOpen: boolean;
  mutateVflzPools?: KeyedMutator<SidebarVflzPoolsQuery>;
  onClose: () => void;
  searchQuery?: string;
  vflId?: string;
  vflzPools?: SidebarVflzPoolsQuery["vflz"]["pools"];
}) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const { data } = useSWR<AddToPoolDialogQuery>(queryPools);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("AddToPoolDialog.title")}
    >
      <Form<{ bezeichnung: null | string; poolId: string | undefined }>
        className="space-y-5"
        data-test="AddToPoolDialog"
        model="SidebarPoolDialog"
        onSubmit={async (values) => {
          let poolId;
          if (values.bezeichnung) {
            const result = await client.request<CreatePoolMutation>(
              createPoolMutation,
              { data: { bemerkungen: "", bezeichnung: values.bezeichnung } },
            );
            if (result.createPool?.__typename === "Pool") {
              poolId = result.createPool.poolId;
            } else {
              return result.createPool;
            }
          } else {
            poolId = values.poolId;
          }
          if (poolId) {
            if (vflId) {
              await client.request(addToPoolMutation, { poolId, vflId });
              if (mutateVflzPools) {
                await mutateVflzPools();
              }
            } else if (searchQuery !== undefined) {
              await client.request(addSearchResultsToPoolMutation, {
                poolId,
                query: searchQuery,
              });
            }
          }
          onClose();
        }}
      >
        <p className="text-gray-7 text-sm">
          {t("AddToPoolDialog.description")}
        </p>
        <TabGroup defaultIndex={activeTab} onChange={setActiveTab}>
          <TabList className="border-gray-4 flex border-b">
            <Tab className="data-selected:border-b-blue-6 data-selected:text-blue-7 -mb-px border-b-2 border-transparent p-2 text-sm">
              {t("AddToPoolDialog.existingPool")}
            </Tab>
            <Tab
              className="data-selected:border-b-blue-6 data-selected:text-blue-7 -mb-px border-b-2 border-transparent p-2 text-sm"
              data-test="ImportFileWidget-local"
            >
              {t("AddToPoolDialog.newPool")}
            </Tab>
          </TabList>
          <TabPanels className="my-2 min-h-18">
            <TabPanel>
              <Combobox
                name="poolId"
                options={data?.pools.results
                  .filter((p) => {
                    return !vflzPools?.some((vp) => {
                      return p.poolId === vp.poolId;
                    });
                  })
                  .map((p) => {
                    return { label: p.bezeichnung ?? "", value: p.poolId };
                  })}
              />
            </TabPanel>
            <TabPanel>
              <Input name="bezeichnung" />
            </TabPanel>
          </TabPanels>
        </TabGroup>
        <div className="flex justify-end gap-4">
          <Button onClick={onClose} outline>
            {t("AddToPoolDialog.cancel")}
          </Button>
          <Button type="submit">{t("AddToPoolDialog.add")}</Button>
        </div>
      </Form>
    </Dialog>
  );
}
