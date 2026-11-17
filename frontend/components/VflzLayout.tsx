import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { gql } from "graphql-request";
import debounce from "lodash/debounce";
import { useRouter } from "next/router";
import { type PropsWithChildren, useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import useSWR from "swr";

import AddToPoolDialog from "@/components/AddToPoolDialog";
import Button from "@/components/Button";
import Form from "@/components/Form";
import PoolIcon from "@/components/icons/PoolIcon";
import PublicationIcon from "@/components/icons/PublicationIcon";
import Layout from "@/components/Layout";
import Listbox from "@/components/Listbox";
import Pagination from "@/components/Pagination";
import VflHistory from "@/components/VflHistory";
import VflzItem from "@/components/VflzItem";
import VflzLink from "@/components/VflzLink";
import VflzList from "@/components/VflzList";
import VflzStatusText from "@/components/VflzStatusText";
import VflzSummary from "@/components/VflzSummary";
import getVflzUrl from "@/lib/getVflzUrl";
import { useI18n } from "@/lib/i18n";
import toLocaleDateString from "@/lib/toLocaleDateString";
import useCurrentUser from "@/lib/useCurrentUser";
import useLocalStorage from "@/lib/useLocalStorage";

import type {
  SidebarPoolVflzQuery,
  SidebarPoolVflzQueryVariables,
  SidebarVflzPoolsQuery,
  VflzLayoutFragment,
  VflzStatusTextFragment,
  VflzTeilstandortFragment,
  VflzVersionFragment,
} from "@/lib/graphql";

function NavItem({
  children,
  path = "",
}: PropsWithChildren<{ path?: string }>) {
  const router = useRouter();
  return (
    <Layout.NavItem
      href={`/vflz/${router.query.vflzId?.toString()}${path}`}
      pathname={`/vflz/[vflzId]${path.split("#").at(0)}`}
    >
      {children}
    </Layout.NavItem>
  );
}

function SidebarIcon() {
  return (
    <svg fill="none" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12.75 4.833h1.667M10.667 1.5v15m2.083-8.333h1.667M12.75 11.5h1.667M12.5 1.5h-7c-1.4 0-2.1 0-2.635.272a2.5 2.5 0 0 0-1.093 1.093C1.5 3.4 1.5 4.1 1.5 5.5v7c0 1.4 0 2.1.272 2.635a2.5 2.5 0 0 0 1.093 1.092C3.4 16.5 4.1 16.5 5.5 16.5h7c1.4 0 2.1 0 2.635-.273a2.5 2.5 0 0 0 1.092-1.092c.273-.535.273-1.235.273-2.635v-7c0-1.4 0-2.1-.273-2.635a2.5 2.5 0 0 0-1.092-1.093C14.6 1.5 13.9 1.5 12.5 1.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.667"
      />
    </svg>
  );
}

function SidebarHistoryIcon() {
  return (
    <svg fill="none" height="24" width="25" xmlns="http://www.w3.org/2000/svg">
      <path
        d="m18.573 14.333.333-.942 1.886.666-.334.943-1.885-.667ZM18.999 8h1v1h-1V8Zm-1-4V3h2v1h-2Zm-3 5h-1V7h1v2Zm3.892-2.673.672.74-1.48 1.346-.672-.74 1.48-1.346ZM11.97 21a9 9 0 0 1-9-9h2a7 7 0 0 0 7 7v2Zm-9-9a9 9 0 0 1 9-9v2a7 7 0 0 0-7 7h-2Zm17.488 3a9.003 9.003 0 0 1-8.488 6v-2a7.003 7.003 0 0 0 6.602-4.667l1.886.667Zm-.46-11v4h-2V4h2Zm-1 5h-4V7h4v2Zm-7.028-6c3.02 0 5.07 1.292 6.92 3.327l-1.48 1.346C15.816 5.919 14.266 5 11.97 5V3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SidebarVersionIcon() {
  return (
    <svg fill="none" height="24" width="25" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7.834 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 0v7m9-7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 0v2a2 2 0 0 1-2 2h-5a2 2 0 0 0-2 2v2m0 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SidebarTab({ children }: PropsWithChildren) {
  return (
    <Tab className="border-gray-4 text-gray-6 hover:bg-gray-3 data-selected:border-b-gray-7 data-selected:bg-gray-3 data-selected:text-gray-7 hover:text-gray-7 flex grow justify-center border-b-2 py-3 outline-hidden">
      {children}
    </Tab>
  );
}

function SidebarTitle({ children }: PropsWithChildren) {
  return (
    <h3 className="text-gray-7 mx-3 mt-6 mb-3 text-sm font-semibold">
      {children}
    </h3>
  );
}

function VflzTeilstandort({
  teilstandort,
}: {
  teilstandort: VflzTeilstandortFragment;
}) {
  const router = useRouter();
  const isActive = router.query.vflzId?.toString() === teilstandort.vflzId;
  return (
    <li
      className={`text-gray-7 flex items-center space-x-2 p-2 text-xs ${isActive ? "font-semibold" : ""}`}
    >
      <PublicationIcon className="w-5" vflz={teilstandort} />
      <VflzLink
        className="hover:text-gray-8"
        options={{ doNotAppendSearch: true }}
        vflzId={teilstandort.vflzId}
      >
        {teilstandort.combinedId}: {teilstandort.bezeichnung}
      </VflzLink>
    </li>
  );
}

VflzTeilstandort.fragment = gql`
  fragment VflzTeilstandort on Vflz {
    bezeichnung
    combinedId
    vflzId
    ...PublicationIcon
  }
`;

function VflzVersion({ version }: { version: VflzVersionFragment }) {
  const { t } = useI18n();
  const router = useRouter();
  const isActive = router.query.vflzId?.toString() === version.vflzId;
  const message = t(version.message) || version.message;
  return (
    <tr
      className={`border-gray-5 text-gray-7 border-b align-top text-xs ${isActive ? "font-semibold" : "hover:text-gray-8 hover:cursor-pointer"}`}
      onClick={() => {
        if (!isActive) {
          void router.push(getVflzUrl(version.vflzId));
        }
      }}
      style={
        version.beurteilung?.kbsInfo
          ? { backgroundColor: `${version.beurteilung.kbsInfo.color}33` }
          : undefined
      }
    >
      <td className="p-2">
        <PublicationIcon className="w-5" vflz={version} />
      </td>
      <td className="py-2 align-middle">
        {toLocaleDateString(version.vflzCreatedDate)}
      </td>
      <td
        className="w-full max-w-0 truncate p-2 pr-3 align-middle"
        title={message}
      >
        {message}
      </td>
    </tr>
  );
}

VflzVersion.fragment = gql`
  fragment VflzVersion on Vflz {
    message
    publizieren
    vflzCreatedDate
    vflzId
    beurteilung {
      kbsInfo {
        color
      }
    }
    ...PublicationIcon
  }
`;

const queryPoolVflz = gql`
  query sidebarPoolVflz($page: Int!, $poolId: ID!, $perPage: Int!) {
    pool(poolId: $poolId) {
      standorte(page: $page, perPage: $perPage) {
        numPages
        results {
          ...VflzItem
        }
      }
    }
  }
  ${VflzItem.fragment}
`;

function SidebarPoolVflz({ vflzId }: { vflzId?: string }) {
  const { watch } = useFormContext<SidebarPoolVflzQueryVariables>();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>();
  const poolId = watch("poolId");

  const { data } = useSWR<SidebarPoolVflzQuery>(
    poolId &&
      perPage !== undefined && [queryPoolVflz, { page, perPage, poolId }],
  );
  const items =
    data?.pool.standorte.results.filter((v) => {
      return v.vflzId !== vflzId;
    }) ?? [];

  useEffect(() => {
    const updatePerPage = debounce(() => {
      setPerPage(Math.max(Math.floor((window.innerHeight - 496) / 53), 6));
    }, 300);
    updatePerPage();
    window.addEventListener("resize", updatePerPage);
    return () => {
      return window.removeEventListener("resize", updatePerPage);
    };
  }, []);

  useEffect(() => {
    if (poolId) {
      localStorage.setItem("alma-vflz-sidebar-pool", poolId);
    }
  }, [poolId]);

  return (
    <>
      <VflzList className="border-gray-5 border-b" items={items} />
      {data && items.length > 0 && (
        <Pagination
          currentPage={page}
          pagesCount={data.pool.standorte.numPages ?? 0}
          setPage={setPage}
          size="small"
        />
      )}
    </>
  );
}

const queryVflzPools = gql`
  query sidebarVflzPools($vflzId: ID!) {
    vflz(vflzId: $vflzId) {
      pools {
        poolId
        bezeichnung
        standorte {
          numResultsTotal
        }
      }
    }
  }
`;

function Sidebar({
  vflz,
}: {
  vflz?: {
    teilstandorte: VflzTeilstandortFragment[];
    versionen: VflzVersionFragment[];
    vflId: string | undefined;
  } & VflzStatusTextFragment;
}) {
  const [activeTab, setActiveTab] = useLocalStorage("alma-vflz-sidebar-tab", 0);
  const poolId = localStorage.getItem("alma-vflz-sidebar-pool");
  const router = useRouter();
  const vflzId = router.query.vflzId?.toString();
  const { data, mutate } = useSWR<SidebarVflzPoolsQuery>(
    vflzId && [queryVflzPools, { vflzId }],
  );
  const { t } = useI18n();
  const [isAddToPoolDialogOpen, setIsAddToPoolDialogOpen] = useState(false);
  return (
    <div data-test="VflzLayout-sidebar">
      <aside className="border-gray-4 sticky top-38 mb-20 w-64 overflow-hidden rounded-lg border bg-white xl:w-72">
        <TabGroup defaultIndex={activeTab} onChange={setActiveTab}>
          <TabList className="flex">
            <SidebarTab>
              <SidebarVersionIcon />
            </SidebarTab>
            <SidebarTab>
              <SidebarHistoryIcon />
            </SidebarTab>
            <SidebarTab>
              <PoolIcon />
            </SidebarTab>
          </TabList>
          <TabPanels>
            <TabPanel className="pb-4">
              <SidebarTitle>{t("vflz.sidebar.versionen")}</SidebarTitle>
              <div className="text-gray-8 mx-3 -mt-2 mb-3 space-y-1 text-xs">
                <VflzStatusText vflz={vflz} />
              </div>
              <table
                className="border-gray-5 w-full border-t"
                data-test="VflzLayout-sidebar-versionen"
              >
                <tbody>
                  {vflz?.versionen.map((version) => {
                    return (
                      <VflzVersion key={version.vflzId} version={version} />
                    );
                  })}
                </tbody>
              </table>
              {vflz?.teilstandorte.length === 0 ? null : (
                <>
                  <SidebarTitle>{t("vflz.sidebar.teilstandorte")}</SidebarTitle>
                  <ul
                    className="divide-gray-5 border-gray-5 bg-gray-3 divide-y border-y"
                    data-test="VflzLayout-sidebar-teilstandorte"
                  >
                    {vflz?.teilstandorte.map((teilstandort) => {
                      return (
                        <VflzTeilstandort
                          key={teilstandort.vflzId}
                          teilstandort={teilstandort}
                        />
                      );
                    })}
                  </ul>
                </>
              )}
            </TabPanel>
            <TabPanel>
              <SidebarTitle>{t("history")}</SidebarTitle>
              <VflHistory />
            </TabPanel>
            <TabPanel className="pb-4">
              <SidebarTitle>{t("vflz.sidebar.pools.title")}</SidebarTitle>
              <Form
                data-test="VflzLayout-sidebar-pools"
                model="Vflz"
                values={{
                  poolId:
                    data?.vflz.pools.find((p) => {
                      return p.poolId === poolId;
                    })?.poolId ?? data?.vflz.pools.at(0)?.poolId,
                }}
              >
                <Listbox
                  className="mx-3 -mt-3 mb-3"
                  name="poolId"
                  options={(data?.vflz.pools ?? []).map((p) => {
                    return {
                      label: `${p.bezeichnung} (${p.standorte.numResultsTotal})`,
                      value: p.poolId,
                    };
                  })}
                />
                <SidebarPoolVflz vflzId={vflzId} />
              </Form>
              <div className="mx-3 flex flex-col space-y-2">
                <AddToPoolDialog
                  isOpen={isAddToPoolDialogOpen}
                  mutateVflzPools={mutate}
                  onClose={() => {
                    setIsAddToPoolDialogOpen(false);
                  }}
                  vflId={vflz?.vflId}
                  vflzPools={data?.vflz.pools}
                />
                <Button
                  data-test="VflzLayout-sidebar-open-pool-dialog"
                  onClick={() => {
                    setIsAddToPoolDialogOpen(true);
                  }}
                  outline
                >
                  {t("vflz.sidebar.pools.add")}
                </Button>
                <Button href="/pools" outline>
                  {t("vflz.sidebar.pools.admin")}
                </Button>
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </aside>
    </div>
  );
}

function VflzLayout({
  children,
  error,
  isLoading = false,
  vflz,
}: PropsWithChildren<{
  error?: unknown;
  isLoading?: boolean;
  vflz?: VflzLayoutFragment;
}>) {
  const currentUser = useCurrentUser();
  const [sidebarVisible, setSidebarVisible] = useLocalStorage(
    "alma-vflz-sidebar-visible",
    true,
  );
  const { t } = useI18n();
  const [headerElement, setHeaderElement] = useState<HTMLElement>();

  useEffect(() => {
    // handle sticky header
    const observer = new IntersectionObserver(
      ([e]) => {
        return e.target.toggleAttribute("data-stuck", e.intersectionRatio < 1);
      },
      { threshold: [0.8, 1] },
    );
    if (headerElement) {
      observer.observe(headerElement);
      return () => {
        return observer.unobserve(headerElement);
      };
    }
    return () => {
      return observer.disconnect();
    };
  }, [headerElement]);

  useEffect(() => {
    // update vfl history
    if (vflz?.vflId === undefined) {
      return;
    }
    const oldHistory = currentUser.getSetting<string[]>("vflHistory", []);
    let newHistory: string[] = [];
    if (oldHistory.includes(vflz.vflId) && oldHistory[0] !== vflz.vflId) {
      // move vflId to the front of the history list
      newHistory = [
        vflz.vflId,
        ...oldHistory.filter((i) => {
          return i !== vflz.vflId;
        }),
      ];
    } else if (oldHistory.includes(vflz.vflId) === false) {
      newHistory = [vflz.vflId, ...oldHistory];
    }
    if (newHistory.length > 31) {
      newHistory = newHistory.slice(0, 31);
    }
    if (newHistory.length > 0) {
      void currentUser.updateSetting("vflHistory", newHistory);
    }
  }, [vflz?.vflId, currentUser]);

  return (
    <Layout error={error} isLoading={isLoading} title={vflz?.combinedId ?? ""}>
      <header
        className="sticky -top-1 z-20 mt-4 mb-2 pt-3 pb-4 data-stuck:bg-white data-stuck:shadow-md"
        data-test="VflzLayout-header"
        ref={(ref) => {
          return setHeaderElement(ref ?? undefined);
        }}
      >
        <div className="space-y-1 px-4 2xl:container 2xl:mx-auto">
          <VflzSummary isWide vflz={vflz} />
          <nav className="flex space-x-5">
            <Layout.NavList>
              <NavItem path="#content">{t("vflz.overview.title")}</NavItem>
              <NavItem path="/data#basedata">{t("vflz.data.title")}</NavItem>
              <NavItem path="/geo#map">{t("vflz.geodata.title")}</NavItem>
              <NavItem path="/evaluation#beurteilung">
                {t("vflz.evaluation.title")}
              </NavItem>
              <NavItem path="/participants#sachbearbeitung">
                {t("vflz.participants.title")}
              </NavItem>
              {currentUser.permissions.canViewProcess ? (
                <NavItem path="/workflow#filter">
                  {t("vflz.workflow.title")}
                </NavItem>
              ) : null}
            </Layout.NavList>
            <Button
              data-test="VflzLayout-toggleSidebar"
              onClick={() => {
                return setSidebarVisible((v) => {
                  return !v;
                });
              }}
              outline
            >
              <SidebarIcon />
            </Button>
          </nav>
        </div>
      </header>
      <div className="mb-4 flex min-h-[calc(100dvh-120px)] space-x-5 px-4 2xl:container 2xl:mx-auto">
        <main className="z-10 w-full">{children}</main>
        {sidebarVisible ? <Sidebar vflz={vflz} /> : null}
      </div>
    </Layout>
  );
}

VflzLayout.fragment = gql`
  fragment VflzLayout on Vflz {
    combinedId
    vflId
    teilstandorte {
      ...VflzTeilstandort
    }
    versionen {
      ...VflzVersion
    }
    ...VflzSummary
  }
  ${VflzSummary.fragment}
  ${VflzTeilstandort.fragment}
  ${VflzVersion.fragment}
`;

export default VflzLayout;
