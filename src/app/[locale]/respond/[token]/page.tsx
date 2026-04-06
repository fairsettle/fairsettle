import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  LogIn,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/PageHeader";
import { NeutralityBanner } from "@/components/respond/NeutralityBanner";
import { ResponderReviewClient } from "@/components/respond/ResponderReviewClient";
import { SavingsBar } from "@/components/savings/SavingsBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  acceptInvitationToken,
  getInvitationByToken,
  getResponderReviewItems,
  getResponderSavedReviewItems,
  validateInvitationToken,
} from "@/lib/invitations";
import { getLocalizedPath } from "@/lib/locale-path";
import { createClient } from "@/lib/supabase/server";

function InvalidInvitationState({
  actionLabel,
  brandLabel,
  locale,
  title,
  body,
}: {
  actionLabel: string;
  brandLabel: string;
  locale: string;
  title: string;
  body: string;
}) {
  return (
    <main className=" px-5 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card className="app-panel mx-auto w-full max-w-3xl">
          <CardContent className="space-y-5 p-6">
            <div className="app-note-warning inline-flex h-12 w-12 items-center justify-center rounded-2xl border-0 p-0">
              <AlertTriangle className="size-5" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-4xl text-ink">{title}</h1>
              <p className="text-sm leading-6 text-ink-soft">{body}</p>
            </div>
            <Button asChild className="h-12" size="lg">
              <Link href={getLocalizedPath(locale, "/")}>{actionLabel}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default async function RespondPage({
  params: { locale, token },
}: {
  params: { locale: string; token: string };
}) {
  const t = await getTranslations({ locale });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const validation = await validateInvitationToken(token);
  const invitationContext = await getInvitationByToken(token);

  const isReturningResponder =
    Boolean(user) &&
    invitationContext.invitation?.status === "accepted" &&
    invitationContext.caseItem?.responder_id === user?.id;

  if (!validation.valid && !isReturningResponder) {
    return (
      <InvalidInvitationState
        actionLabel={t("nav.brand")}
        brandLabel={t("nav.brand")}
        body={t("responder.invalidBody")}
        locale={locale}
        title={t("errors.inviteInvalid")}
      />
    );
  }

  if (!user) {
    const redirectTarget = getLocalizedPath(locale, `/respond/${token}`);
    const registerHref = `${getLocalizedPath(locale, "/register")}?redirect=${encodeURIComponent(redirectTarget)}`;
    const loginHref = `${getLocalizedPath(locale, "/login")}?redirect=${encodeURIComponent(redirectTarget)}`;

    return (
      <main className=" px-5 py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <Card className="app-panel">
              <CardContent className="space-y-5 p-6">
                <Badge variant="secondary">
                  {t("responder.invitedEyebrow")}
                </Badge>
                <div className="space-y-2">
                  <h1 className="font-display text-4xl text-ink">
                    {t("responder.invitedTitle")}
                  </h1>
                  <p className="text-sm leading-6 text-ink-soft">
                    {t("responder.invitedBody")}
                  </p>
                </div>
                <NeutralityBanner />
                <div className="app-note">
                  <p className="font-medium text-ink">
                    {t("invite.previewTitle")}
                  </p>
                  <p className="mt-2">{t("invite.previewBody")}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="app-panel">
              <CardContent className="p-6">
                <Tabs className="gap-4" defaultValue="register">
                  <TabsList
                    className="grid h-auto grid-cols-2 gap-2 p-2"
                    variant="line"
                  >
                    <TabsTrigger className="h-12" value="register">
                      {t("responder.registerTab")}
                    </TabsTrigger>
                    <TabsTrigger className="h-12" value="login">
                      {t("responder.loginTab")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent className="space-y-4" value="register">
                    <div className="space-y-2">
                      <h2 className="font-display text-3xl text-ink">
                        {t("responder.registerTitle")}
                      </h2>
                      <p className="text-sm leading-6 text-ink-soft">
                        {t("responder.registerBody")}
                      </p>
                    </div>
                    <Button asChild className="h-12 w-full" size="lg">
                      <Link href={registerHref}>
                        <UserPlus className="mr-2 size-4" />
                        {t("responder.registerCta")}
                      </Link>
                    </Button>
                  </TabsContent>

                  <TabsContent className="space-y-4" value="login">
                    <div className="space-y-2">
                      <h2 className="font-display text-3xl text-ink">
                        {t("responder.loginTitle")}
                      </h2>
                      <p className="text-sm leading-6 text-ink-soft">
                        {t("responder.loginBody")}
                      </p>
                    </div>
                    <Button
                      asChild
                      className="h-12 w-full"
                      size="lg"
                      variant="outline"
                    >
                      <Link href={loginHref}>
                        <LogIn className="mr-2 size-4" />
                        {t("responder.loginCta")}
                      </Link>
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <SavingsBar stage={2} />
        </div>
      </main>
    );
  }

  if (!invitationContext.caseItem || !invitationContext.invitation) {
    return (
      <InvalidInvitationState
        actionLabel={t("nav.brand")}
        brandLabel={t("nav.brand")}
        body={t("responder.invalidBody")}
        locale={locale}
        title={t("errors.inviteInvalid")}
      />
    );
  }

  if (invitationContext.caseItem.initiator_id === user.id) {
    return (
      <InvalidInvitationState
        actionLabel={t("nav.brand")}
        brandLabel={t("nav.brand")}
        body={t("responder.ownCaseBody")}
        locale={locale}
        title={t("responder.ownCaseTitle")}
      />
    );
  }

  const acceptance = await acceptInvitationToken(token);

  if (!acceptance.success) {
    return (
      <InvalidInvitationState
        actionLabel={t("nav.brand")}
        brandLabel={t("nav.brand")}
        body={t("responder.invalidBody")}
        locale={locale}
        title={t("errors.inviteInvalid")}
      />
    );
  }

  const [reviewItems, savedReviewItems] = await Promise.all([
    getResponderReviewItems(acceptance.caseId),
    getResponderSavedReviewItems(acceptance.caseId, user.id),
  ]);

  if (invitationContext.caseItem.question_set_version === "v2") {
    return (
      <main className=" px-5 py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <PageHeader
            brandLabel={t("nav.brand")}
            eyebrow={t("responder.invitedEyebrow")}
            locale={locale}
            subtitle={t("responder.independentSubtitle")}
            title={t("responder.independentTitle")}
          />

          <Card className="app-panel">
            <CardContent className="space-y-4 p-6">
              <div className="app-note-brand">
                <p className="font-medium text-ink">
                  {t("responder.independentBodyTitle")}
                </p>
                <p className="mt-2">{t("responder.independentBody")}</p>
              </div>
              <NeutralityBanner />
              <Button asChild className="h-12" size="lg">
                <Link
                  href={getLocalizedPath(
                    locale,
                    `/cases/${acceptance.caseId}/questions`,
                  )}
                >
                  {t("responder.startQuestions")}
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className=" px-5 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          brandLabel={t("nav.brand")}
          eyebrow={t("responder.invitedEyebrow")}
          locale={locale}
          subtitle={t("responder.reviewIntro")}
          title={t("responder.invitedTitle")}
        />

        {reviewItems.length > 0 ? (
          <ResponderReviewClient
            caseId={acceptance.caseId}
            initialSelections={savedReviewItems}
            invitationToken={token}
            items={reviewItems}
          />
        ) : (
          <Card className="app-panel">
            <CardContent className="space-y-4 p-6">
              <h2 className="font-display text-3xl text-ink">
                {t("responder.noItemsTitle")}
              </h2>
              <p className="text-sm leading-6 text-ink-soft">
                {t("responder.noItemsBody")}
              </p>
              <Button asChild className="h-12" size="lg">
                <Link
                  href={getLocalizedPath(
                    locale,
                    `/cases/${acceptance.caseId}/questions`,
                  )}
                >
                  {t("responder.startQuestions")}
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
