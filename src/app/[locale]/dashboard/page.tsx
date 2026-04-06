"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { DashboardCaseCard } from "@/components/dashboard/DashboardCaseCard";
import { DashboardFiltersBar } from "@/components/dashboard/DashboardFiltersBar";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import { PendingInvitationsPanel } from "@/components/dashboard/PendingInvitationsPanel";
import { AsyncStateCard } from "@/components/feedback/AsyncStateCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchApi } from "@/lib/api-client";
import {
  DASHBOARD_DEFAULT_PAGE_SIZE,
  type DashboardQuery,
} from "@/lib/cases/dashboard-search";
import {
  readApiErrorMessage,
  resolveApiErrorMessage,
} from "@/lib/client-errors";
import { getLocalizedPath } from "@/lib/locale-path";
import type {
  DashboardCase,
  DashboardCasesMeta,
  DashboardCasesResponse,
  PendingInvitation,
} from "@/types/dashboard";

export default function DashboardPage() {
  const locale = useLocale();
  const t = useTranslations();
  const [cases, setCases] = useState<DashboardCase[]>([]);
  const [meta, setMeta] = useState<DashboardCasesMeta>({
    page: 1,
    pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [pendingInvitations, setPendingInvitations] = useState<
    PendingInvitation[]
  >([]);
  const [filters, setFilters] = useState<DashboardQuery>({
    q: "",
    status: "all",
    caseType: "all",
    role: "all",
    page: 1,
    pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const deferredSearch = useDeferredValue(filters.q);

  useEffect(() => {
    let ignore = false;

    async function loadCases() {
      try {
        const caseParams = new URLSearchParams({
          page: String(filters.page),
          pageSize: String(filters.pageSize),
        });

        if (deferredSearch.trim()) {
          caseParams.set("q", deferredSearch.trim());
        }
        if (filters.status !== "all") {
          caseParams.set("status", filters.status);
        }
        if (filters.caseType !== "all") {
          caseParams.set("caseType", filters.caseType);
        }
        if (filters.role !== "all") {
          caseParams.set("role", filters.role);
        }

        const [casesResponse, invitationsResponse] = await Promise.all([
          fetchApi(`/api/cases?${caseParams.toString()}`, locale, { cache: "no-store" }),
          fetchApi("/api/invitations/pending", locale, { cache: "no-store" }),
        ]);

        if (!casesResponse.ok) {
          throw new Error(
            resolveApiErrorMessage(
              await readApiErrorMessage(casesResponse),
              t("dashboard.loading"),
            ),
          );
        }

        if (!invitationsResponse.ok) {
          throw new Error(
            resolveApiErrorMessage(
              await readApiErrorMessage(invitationsResponse),
              t("dashboard.loading"),
            ),
          );
        }

        const casesData = (await casesResponse
          .json()
          .catch(() => null)) as DashboardCasesResponse | null;
        const invitationsData = await invitationsResponse
          .json()
          .catch(() => null);

        if (!ignore) {
          setCases(casesData?.cases ?? []);
          setMeta(
            casesData?.meta ?? {
              page: 1,
              pageSize: filters.pageSize,
              total: 0,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          );
          setPendingInvitations(invitationsData?.invitations ?? []);
          setErrorMessage("");
        }
      } catch (error) {
        if (!ignore) {
          setCases([]);
          setMeta({
            page: 1,
            pageSize: filters.pageSize,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          });
          setPendingInvitations([]);
          setErrorMessage(
            error instanceof Error && error.message
              ? error.message
              : t("errors.generic"),
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadCases();

    return () => {
      ignore = true;
    };
  }, [
    deferredSearch,
    filters.caseType,
    filters.page,
    filters.pageSize,
    filters.role,
    filters.status,
    locale,
    t,
  ]);

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        maximumFractionDigits: 0,
      }),
    [],
  );

  const formatDate = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
        dateStyle: "medium",
      }),
    [locale],
  );

  return (
    <main className=" px-5 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          actions={
            <>
              <Button asChild className="h-12 px-6 text-base" size="lg">
                <Link href={getLocalizedPath(locale, "/cases/new")}>
                  {t("dashboard.startCase")}
                </Link>
              </Button>
            </>
          }
          brandLabel={t("nav.brand")}
          locale={locale}
          subtitle={t("dashboard.subtitle")}
          title={t("dashboard.title")}
        />

        {isLoading ? (
          <AsyncStateCard
            body={t("dashboard.subtitle")}
            title={t("dashboard.loading")}
          />
        ) : errorMessage ? (
          <AsyncStateCard
            body={t("errors.generic")}
            title={errorMessage}
            variant="error"
          />
        ) : (
          <>
            <PendingInvitationsPanel
              formatDate={formatDate}
              invitations={pendingInvitations}
              locale={locale}
            />

            <DashboardFiltersBar
              filters={filters}
              resultCount={cases.length}
              totalCount={meta.total}
              onCaseTypeChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  caseType: value,
                  page: 1,
                }))
              }
              onPageSizeChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  page: 1,
                  pageSize: value,
                }))
              }
              onRoleChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  page: 1,
                  role: value,
                }))
              }
              onSearchChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  page: 1,
                  q: value,
                }))
              }
              onStatusChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  page: 1,
                  status: value,
                }))
              }
            />

            {meta.total === 0 ? (
              <Card className="border-dashed border-brand/15">
                <CardContent className="space-y-4 p-8 text-center">
                  <h2 className="font-display text-3xl text-ink">
                    {pendingInvitations.length > 0
                      ? t("dashboard.emptyLinkedTitle")
                      : t("dashboard.emptyTitle")}
                  </h2>
                  <p className="mx-auto max-w-md text-sm leading-6 text-ink-soft">
                    {pendingInvitations.length > 0
                      ? t("dashboard.emptyLinkedBody")
                      : t("dashboard.emptyBody")}
                  </p>
                  <Button asChild className="h-12 px-6 text-base" size="lg">
                    <Link href={getLocalizedPath(locale, "/cases/new")}>
                      {t("dashboard.startCase")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : cases.length === 0 ? (
              <Card className="border-dashed border-line/80">
                <CardContent className="space-y-3 p-8 text-center">
                  <h2 className="font-display text-3xl text-ink">
                    {t("dashboard.noResultsTitle")}
                  </h2>
                  <p className="mx-auto max-w-md text-sm leading-6 text-ink-soft">
                    {t("dashboard.noResultsBody")}
                  </p>
                  <Button
                    className="mx-auto"
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setFilters({
                        q: "",
                        status: "all",
                        caseType: "all",
                        role: "all",
                        page: 1,
                        pageSize: filters.pageSize,
                      })
                    }
                  >
                    {t("dashboard.clearFilters")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4">
                  {cases.map((caseItem) => (
                    <DashboardCaseCard
                      key={caseItem.id}
                      caseItem={caseItem}
                      currency={currency}
                      locale={locale}
                    />
                  ))}
                </div>

                <DashboardPagination
                  currentPage={meta.page}
                  hasNextPage={meta.hasNextPage}
                  hasPreviousPage={meta.hasPreviousPage}
                  totalPages={meta.totalPages}
                  onPageChange={(page) =>
                    setFilters((current) => ({
                      ...current,
                      page,
                    }))
                  }
                />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
