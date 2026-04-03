"use client";

import Link from "next/link";
import { ArrowUpRight, LayoutDashboard } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";

interface DashboardCase {
  id: string;
  case_type: "child" | "financial" | "asset" | "combined";
  status:
    | "draft"
    | "invited"
    | "active"
    | "comparison"
    | "completed"
    | "expired";
  created_at: string;
  savings_to_date: number;
}

function getNextStepKey(status: DashboardCase["status"]) {
  switch (status) {
    case "draft":
      return "dashboard.nextStepDraft";
    case "invited":
      return "dashboard.nextStepInvited";
    case "active":
      return "dashboard.nextStepActive";
    case "comparison":
      return "dashboard.nextStepComparison";
    case "completed":
      return "dashboard.nextStepCompleted";
    case "expired":
    default:
      return "dashboard.nextStepExpired";
  }
}

function getCaseHref(locale: string, caseItem: DashboardCase) {
  switch (caseItem.status) {
    case "invited":
      return getLocalizedPath(locale, `/cases/${caseItem.id}/invite`);
    case "comparison":
    case "completed":
      return getLocalizedPath(locale, `/cases/${caseItem.id}/comparison`);
    case "expired":
      return getLocalizedPath(locale, `/cases/${caseItem.id}/export`);
    case "draft":
    case "active":
    default:
      return getLocalizedPath(locale, `/cases/${caseItem.id}/questions`);
  }
}

function getStatusBadgeClasses(status: DashboardCase["status"]) {
  switch (status) {
    case "active":
    case "completed":
      return "border-success/10 bg-success-soft text-success";
    case "comparison":
      return "border-brand/10 bg-brand-soft text-brand-strong";
    case "expired":
      return "border-danger/10 bg-danger-soft text-danger";
    case "draft":
      return "border-line bg-surface-soft text-ink-soft";
    case "invited":
    default:
      return "border-warning/10 bg-warning-soft text-warning";
  }
}

export default function DashboardPage() {
  const locale = useLocale();
  const t = useTranslations();
  const [cases, setCases] = useState<DashboardCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadCases() {
      try {
        const response = await fetch("/api/cases");
        const data = await response.json();

        if (!ignore) {
          setCases(data.cases ?? []);
        }
      } catch {
        if (!ignore) {
          setCases([]);
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
  }, []);

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        maximumFractionDigits: 0,
      }),
    [],
  );

  return (
    <main className=" px-5 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          actions={
            <>
              <Button asChild className="h-12 px-6 text-base" size="lg">
                <Link href={getLocalizedPath(locale, "/cases/new")}>
                  {t("dashboard.startCase")}
                </Link>
              </Button>
              <form
                action="/api/auth/logout"
                method="post"
                className="w-full lg:w-auto"
              >
                <Button
                  className="h-11 w-full px-5"
                  type="submit"
                  variant="outline"
                >
                  {t("nav.logout")}
                </Button>
              </form>
            </>
          }
          brandLabel={t("nav.brand")}
          icon={LayoutDashboard}
          locale={locale}
          subtitle={t("dashboard.subtitle")}
          title={t("dashboard.title")}
        />

        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-sm text-ink-soft">
              {t("dashboard.loading")}
            </CardContent>
          </Card>
        ) : cases.length === 0 ? (
          <Card className="border-dashed border-brand/15">
            <CardContent className="space-y-4 p-8 text-center">
              <h2 className="font-display text-3xl text-ink">
                {t("dashboard.emptyTitle")}
              </h2>
              <p className="mx-auto max-w-md text-sm leading-6 text-ink-soft">
                {t("dashboard.emptyBody")}
              </p>
              <Button asChild className="h-12 px-6 text-base" size="lg">
                <Link href={getLocalizedPath(locale, "/cases/new")}>
                  {t("dashboard.startCase")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {cases.map((caseItem) => (
              <Link
                key={caseItem.id}
                aria-label={`${t(`caseTypes.${caseItem.case_type}`)} ${t(`caseStatus.${caseItem.status}`)}`}
                className="group block"
                href={getCaseHref(locale, caseItem)}
              >
                <Card className="app-panel-soft app-interactive-card border-line/80">
                  <CardContent className="space-y-5 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <p className="app-kicker">{t("dashboard.caseTypeLabel")}</p>
                        <h2 className="font-display text-3xl text-ink">
                          {t(`caseTypes.${caseItem.case_type}`)}
                        </h2>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          className={cn("h-8 border px-3 text-sm font-semibold", getStatusBadgeClasses(caseItem.status))}
                          variant="outline"
                        >
                          {t(`caseStatus.${caseItem.status}`)}
                        </Badge>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition-all duration-200 group-hover:border-brand/20 group-hover:bg-brand-soft group-hover:text-brand">
                          <ArrowUpRight className="size-4" />
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-4 border-t border-line/80 pt-4 text-sm sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-soft/70">
                          {t("dashboard.created")}
                        </p>
                        <p className="font-medium text-ink">
                          {new Date(caseItem.created_at).toLocaleDateString(locale)}
                        </p>
                      </div>

                      <div className="space-y-1 sm:text-right">
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-soft/70">
                          {t("dashboard.saved")}
                        </p>
                        <p className="font-semibold text-brand">
                          {currency.format(caseItem.savings_to_date)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[1.35rem] border border-brand/10 bg-surface-brand/75 px-4 py-3 transition-colors duration-200 group-hover:bg-surface-brand">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                        {t("dashboard.nextStepLabel")}
                      </p>
                      <p className="mt-1 text-sm font-medium text-ink">
                        {t(getNextStepKey(caseItem.status))}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
