"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLocalizedPath } from "@/lib/locale-path";
import type { PendingInvitation } from "@/types/dashboard";

export function PendingInvitationsPanel({
  invitations,
  formatDate,
  locale,
}: {
  invitations: PendingInvitation[];
  formatDate: Intl.DateTimeFormat;
  locale: string;
}) {
  const t = useTranslations();

  if (invitations.length === 0) {
    return null;
  }

  return (
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
          {invitations.map((invitation) => (
            <div key={invitation.id} className="app-panel-soft p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="app-kicker">{t("dashboard.pendingInvitesFrom")}</p>
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
                    <Link href={getLocalizedPath(locale, `/respond/${invitation.token}`)}>
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

              <div className="app-note-brand mt-4 px-4 py-3">
                <p className="text-sm font-medium text-ink">
                  {t("dashboard.pendingInvitesHint")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
