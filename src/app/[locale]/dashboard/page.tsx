"use client";

import Link from "next/link";
import { ArrowUpRight, LayoutDashboard } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";

interface DashboardCase {
  id: string;
  case_type: "child" | "financial" | "asset" | "combined";
  viewer_role: "initiator" | "responder";
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

interface PendingInvitation {
  id: string;
  case_id: string;
  token: string;
  status: "sent" | "opened";
  sent_at: string;
  opened_at: string | null;
  expires_at: string;
  case_type: "child" | "financial" | "asset" | "combined";
  initiator_name: string | null;
}

function getNextStepKey(
  status: DashboardCase["status"],
  viewerRole: DashboardCase["viewer_role"],
) {
  switch (status) {
    case "draft":
      return "dashboard.nextStepDraft";
    case "invited":
      return "dashboard.nextStepInvited";
    case "active":
      return viewerRole === "initiator"
        ? "dashboard.nextStepActiveInitiator"
        : "dashboard.nextStepActiveResponder";
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
    case "active":
      return caseItem.viewer_role === "initiator"
        ? getLocalizedPath(locale, `/cases/${caseItem.id}/invite`)
        : getLocalizedPath(locale, `/cases/${caseItem.id}/questions`);
    case "comparison":
    case "completed":
      return getLocalizedPath(locale, `/cases/${caseItem.id}/comparison`);
    case "expired":
      return getLocalizedPath(locale, `/cases/${caseItem.id}/export`);
    case "draft":
    default:
      return getLocalizedPath(locale, `/cases/${caseItem.id}/questions`);
  }
}

function getCaseActionKey(caseItem: DashboardCase) {
  switch (caseItem.status) {
    case "draft":
      return "dashboard.actionDraft";
    case "invited":
      return "dashboard.actionInvited";
    case "active":
      return caseItem.viewer_role === "initiator"
        ? "dashboard.actionActiveInitiator"
        : "dashboard.actionActiveResponder";
    case "comparison":
      return "dashboard.actionComparison";
    case "completed":
      return "dashboard.actionCompleted";
    case "expired":
    default:
      return "dashboard.actionExpired";
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
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadCases() {
      try {
        const [casesResponse, invitationsResponse] = await Promise.all([
          fetch("/api/cases"),
          fetch("/api/invitations/pending"),
        ]);
        const casesData = await casesResponse.json().catch(() => null);
        const invitationsData = await invitationsResponse.json().catch(() => null);

        if (!ignore) {
          setCases(casesData?.cases ?? []);
          setPendingInvitations(invitationsData?.invitations ?? []);
        }
      } catch {
        if (!ignore) {
          setCases([]);
          setPendingInvitations([]);
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

  const formatDate = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
        dateStyle: "medium",
      }),
    [locale],
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
        ) : (
          <>
            {pendingInvitations.length > 0 ? (
              <Card className="app-panel-soft border-brand/15">
                <CardContent className="space-y-5 p-6">
                  <div className="space-y-2">
                    <p className="app-kicker">{t("dashboard.pendingInvitesLabel")}</p>
                    <h2 className="font-display text-3xl text-ink">
                      {t("dashboard.pendingInvitesTitle")}
                    </h2>
                    <p className="max-w-2xl text-sm leading-6 text-ink-soft">
                      {t("dashboard.pendingInvitesBody")}
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {pendingInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="rounded-[1.5rem] border border-line/80 bg-surface/95 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2">
                            <p className="app-kicker">
                              {t("dashboard.pendingInvitesFrom")}
                            </p>
                            <h3 className="font-display text-2xl text-ink">
                              {invitation.initiator_name || t("nav.brand")}
                            </h3>
                            <p className="text-sm leading-6 text-ink-soft">
                              {t("dashboard.pendingInvitesCaseType", {
                                caseType: t(`caseTypes.${invitation.case_type}`),
                              })}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              className="border-brand/10 bg-brand-soft text-brand-strong"
                              variant="outline"
                            >
                              {t(
                                invitation.status === "opened"
                                  ? "dashboard.pendingInvitesOpened"
                                  : "dashboard.pendingInvitesWaiting",
                              )}
                            </Badge>
                            <Button asChild className="h-11 px-5" size="lg">
                              <Link
                                href={getLocalizedPath(
                                  locale,
                                  `/respond/${invitation.token}`,
                                )}
                              >
                                {t("dashboard.pendingInvitesReview")}
                              </Link>
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 border-t border-line/80 pt-4 text-sm sm:grid-cols-2">
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-[0.2em] text-ink-soft/70">
                              {t("dashboard.pendingInvitesSent")}
                            </p>
                            <p className="font-medium text-ink">
                              {formatDate.format(new Date(invitation.sent_at))}
                            </p>
                          </div>
                          <div className="space-y-1 sm:text-right">
                            <p className="text-xs uppercase tracking-[0.2em] text-ink-soft/70">
                              {t("dashboard.pendingInvitesExpires")}
                            </p>
                            <p className="font-medium text-ink">
                              {formatDate.format(new Date(invitation.expires_at))}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-[1.25rem] border border-brand/10 bg-surface-brand/75 px-4 py-3">
                          <p className="text-sm font-medium text-ink">
                            {t("dashboard.pendingInvitesHint")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {cases.length === 0 ? (
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
                        {t(getNextStepKey(caseItem.status, caseItem.viewer_role))}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-line/80 pt-4">
                      <p className="text-sm text-ink-soft">
                        {t("dashboard.openCaseHint")}
                      </p>
                      <span
                        className={cn(
                          buttonVariants({ variant: "outline", size: "lg" }),
                          "h-11 px-5",
                        )}
                      >
                        {t(getCaseActionKey(caseItem))}
                        <ArrowUpRight className="ml-2 size-4" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
