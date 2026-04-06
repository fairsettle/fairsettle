"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getDashboardCaseActionKey,
  getDashboardCaseHref,
  getDashboardNextStepKey,
  getDashboardStatusBadgeClasses,
} from "@/lib/cases/dashboard-view";
import { cn } from "@/lib/utils";
import type { DashboardCase } from "@/types/dashboard";

export function DashboardCaseCard({
  caseItem,
  currency,
  locale,
}: {
  caseItem: DashboardCase;
  currency: Intl.NumberFormat;
  locale: string;
}) {
  const t = useTranslations();

  return (
    <Link
      aria-label={`${t(`caseTypes.${caseItem.case_type}`)} ${t(`caseStatus.${caseItem.status}`)}`}
      className="group block"
      href={getDashboardCaseHref(locale, caseItem)}
    >
      <Card className="app-panel-soft app-interactive-card border-line/80">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <p className="app-kicker">{t("dashboard.caseTypeLabel")}</p>
              <h2 className="font-display text-[2rem] leading-tight text-ink">
                {t(`caseTypes.${caseItem.case_type}`)}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                className={cn(
                  "h-8 border px-3 text-sm font-semibold",
                  getDashboardStatusBadgeClasses(caseItem.status),
                )}
                variant="outline"
              >
                {t(`caseStatus.${caseItem.status}`)}
              </Badge>
              <span className="inline-flex items-center justify-center text-ink-soft transition-colors duration-200 group-hover:text-brand">
                <ArrowUpRight className="size-4" />
              </span>
            </div>
          </div>

          <div className="grid gap-4 border-t border-line/80 pt-3 text-sm sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-soft/70">
                {t("dashboard.created")}
              </p>
              <p className="font-medium text-ink">
                {new Date(caseItem.created_at).toLocaleDateString(locale)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-soft/70">
                {t("dashboard.roleLabel")}
              </p>
              <p className="font-medium text-ink">
                {caseItem.viewer_role === "initiator"
                  ? t("dashboard.roleInitiator")
                  : t("dashboard.roleResponder")}
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

          <div className="app-note-brand px-4 py-3 transition-colors duration-200 group-hover:bg-surface-brand">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
              {t("dashboard.nextStepLabel")}
            </p>
            <p className="mt-1 text-sm font-medium text-ink">
              {t(getDashboardNextStepKey(caseItem))}
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-line/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-soft">{t("dashboard.openCaseHint")}</p>
            <span
              className={cn(
                buttonVariants({
                  variant: "outline",
                  size: "lg",
                }),
                "h-10 px-4 text-sm",
              )}
            >
              {t(getDashboardCaseActionKey(caseItem))}
              <ArrowUpRight className="ml-2 size-4" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
