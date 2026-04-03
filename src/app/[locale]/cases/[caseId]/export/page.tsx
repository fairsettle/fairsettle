"use client";

import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/PageHeader";
import { SavingsBar } from "@/components/savings/SavingsBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CasePayload {
  case: {
    id: string;
    viewer_role: "initiator" | "responder";
    status:
      | "draft"
      | "invited"
      | "active"
      | "comparison"
      | "completed"
      | "expired";
  };
}

interface DownloadPayload {
  error?: string;
  download_url?: string;
  tier?: "standard" | "resolution";
  export_type?: "full_case" | "single_party";
  is_single_party?: boolean;
}

const STANDARD_FEATURE_KEYS = [
  "export.standardFeatureSummary",
  "export.standardFeaturePositions",
  "export.standardFeatureComparison",
  "export.standardFeatureAudit",
] as const;

const RESOLUTION_FEATURE_KEYS = [
  ...STANDARD_FEATURE_KEYS,
  "export.resolutionFeatureConsent",
  "export.resolutionFeatureCooperation",
] as const;

export default function ExportPage({
  params: { caseId },
}: {
  params: { caseId: string };
}) {
  const locale = useLocale();
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [caseStatus, setCaseStatus] = useState<
    CasePayload["case"]["status"] | null
  >(null);
  const [viewerRole, setViewerRole] = useState<
    CasePayload["case"]["viewer_role"] | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState<
    "standard" | "resolution" | null
  >(null);
  const [isPolling, setIsPolling] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadTier, setDownloadTier] = useState<"standard" | "resolution">(
    "standard",
  );
  const [errorMessage, setErrorMessage] = useState("");

  const isSuccess = searchParams.get("success") === "true";
  const isCancelled = searchParams.get("cancelled") === "true";
  const isSingleParty = caseStatus === "expired";
  const canPurchaseExport = viewerRole === "initiator";
  const currentStage = useMemo(
    () => (downloadUrl || isSuccess ? 5 : 4),
    [downloadUrl, isSuccess],
  );

  useEffect(() => {
    let ignore = false;

    async function loadCase() {
      try {
        const response = await fetch(`/api/cases/${caseId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("case_failed");
        }

        const payload = (await response.json()) as CasePayload;

        if (!ignore) {
          setCaseStatus(payload.case.status);
          setViewerRole(payload.case.viewer_role);
          setErrorMessage("");
        }
      } catch {
        if (!ignore) {
          setErrorMessage(t("export.loadError"));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadCase();

    return () => {
      ignore = true;
    };
  }, [caseId, t]);

  useEffect(() => {
    if (!isSuccess) {
      return;
    }

    let ignore = false;
    let intervalId: NodeJS.Timeout | null = null;

    async function pollDownload() {
      try {
        const response = await fetch(`/api/exports/${caseId}/download`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as DownloadPayload;

        if (!ignore && payload.download_url) {
          setDownloadUrl(payload.download_url);
          setDownloadTier(payload.tier ?? "standard");
          setIsPolling(false);
          if (intervalId) {
            clearInterval(intervalId);
          }
        }
      } catch {}
    }

    setIsPolling(true);
    void pollDownload();
    intervalId = setInterval(() => {
      void pollDownload();
    }, 5000);

    return () => {
      ignore = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [caseId, isSuccess]);

  async function handleCheckout(tier: "standard" | "resolution") {
    if (!canPurchaseExport) {
      setErrorMessage(t("export.initiatorOnlyBody"));
      return;
    }

    setErrorMessage("");
    setIsCheckingOut(tier);

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          case_id: caseId,
          tier,
        }),
      });

      let payload: { error?: string; url?: string } = {};
      const rawBody = await response.text();

      if (rawBody) {
        try {
          payload = JSON.parse(rawBody) as { error?: string; url?: string };
        } catch {
          payload = {};
        }
      }

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "checkout_failed");
      }

      window.location.href = payload.url;
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : t("errors.generic"),
      );
      setIsCheckingOut(null);
    }
  }

  async function handleSinglePartyDownload() {
    setErrorMessage("");
    setIsPolling(true);

    try {
      const response = await fetch(`/api/exports/${caseId}/download`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as DownloadPayload;

      if (!response.ok || !payload.download_url) {
        throw new Error(payload.error || "download_failed");
      }

      setDownloadUrl(payload.download_url);
      setDownloadTier(payload.tier ?? "standard");
      window.location.href = payload.download_url;
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : t("errors.generic"),
      );
    } finally {
      setIsPolling(false);
    }
  }

  if (isLoading) {
    return (
      <main className=" px-5 py-6">
        <div className="mx-auto max-w-5xl">
          <PageHeader
            brandLabel={t("nav.brand")}
            icon={FileText}
            locale={locale}
            subtitle={t("export.loading")}
            title={t("export.title")}
            titleClassName="text-3xl sm:text-4xl"
          />
        </div>
      </main>
    );
  }

  return (
    <main className=" px-5 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          brandLabel={t("nav.brand")}
          eyebrow={t("export.eyebrow")}
          icon={FileText}
          locale={locale}
          subtitle={t("export.ready")}
          title={t("export.title")}
        />

        <SavingsBar stage={currentStage} tier={downloadTier} />

        {isSuccess ? (
          <Card className="app-panel">
            <CardContent className="space-y-4 p-6">
              <div className="app-icon-chip">
                <CheckCircle2 className="size-5" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-3xl text-ink">
                  {t("export.successTitle")}
                </h2>
                <p className="text-sm leading-6 text-ink-soft">
                  {downloadUrl
                    ? t("export.successReady")
                    : t("export.successPreparing")}
                </p>
              </div>
              {downloadUrl ? (
                <Button
                  className="h-12 px-6 text-base"
                  size="lg"
                  type="button"
                  onClick={() => {
                    window.location.href = downloadUrl;
                  }}
                >
                  {t("export.downloadReady")}
                </Button>
              ) : (
                <div className="app-note flex items-center gap-3 px-4 py-4">
                  <Loader2 className="size-4 animate-spin" />
                  <span>{t("export.polling")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {isCancelled ? (
          <Card className="border-warning/15">
            <CardContent className="p-6 text-sm leading-6 text-warning-foreground">
              {t("export.cancelled")}
            </CardContent>
          </Card>
        ) : null}

        {isSingleParty ? (
          <Card className="app-panel">
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <h2 className="font-display text-3xl text-ink">
                  {t("export.singlePartyTitle")}
                </h2>
                <p className="text-sm leading-6 text-ink-soft">
                  {t("export.singlePartyBody")}
                </p>
              </div>
              <Button
                className="h-12 px-6 text-base"
                disabled={isPolling}
                size="lg"
                type="button"
                onClick={() => void handleSinglePartyDownload()}
              >
                {isPolling
                  ? t("export.preparingDownload")
                  : t("export.singlePartyCta")}
              </Button>
            </CardContent>
          </Card>
        ) : !canPurchaseExport ? (
          <Card className="app-panel">
            <CardContent className="space-y-3 p-6">
              <h2 className="font-display text-3xl text-ink">
                {t("export.initiatorOnlyTitle")}
              </h2>
              <p className="text-sm leading-6 text-ink-soft">
                {t("export.initiatorOnlyBody")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="app-panel">
              <CardContent className="space-y-5 p-6">
                <div className="space-y-2">
                  <h2 className="font-display text-3xl text-ink">
                    {t("export.standardTitle")}
                  </h2>
                  <p className="text-sm leading-6 text-ink-soft">
                    {t("export.standardBody")}
                  </p>
                </div>
                <div className="grid gap-3">
                  {STANDARD_FEATURE_KEYS.map((featureKey) => (
                    <div
                      key={featureKey}
                      className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-surface-soft px-4 py-3"
                    >
                      <span className="text-sm text-ink">{t(featureKey)}</span>
                      <Badge
                        className="border-success/10 bg-success-soft text-success-foreground"
                        variant="secondary"
                      >
                        {t("export.included")}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button
                  className="h-12 w-full text-base"
                  disabled={isCheckingOut !== null}
                  size="lg"
                  type="button"
                  onClick={() => void handleCheckout("standard")}
                >
                  {isCheckingOut === "standard"
                    ? t("export.redirecting")
                    : t("export.download")}
                </Button>
              </CardContent>
            </Card>

            <Card className="app-panel border-2 border-brand/20">
              <CardContent className="space-y-5 p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-3xl text-ink">
                    {t("export.resolutionTitle")}
                  </h2>
                  <Badge
                    className="border-brand/15 bg-brand-soft text-brand-strong"
                    variant="secondary"
                  >
                    {t("export.recommended")}
                  </Badge>
                </div>
                <p className="text-sm leading-6 text-ink-soft">
                  {t("export.resolutionBody")}
                </p>
                <div className="grid gap-3">
                  {RESOLUTION_FEATURE_KEYS.map((featureKey) => (
                    <div
                      key={featureKey}
                      className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-surface-soft px-4 py-3"
                    >
                      <span className="text-sm text-ink">{t(featureKey)}</span>
                      <Badge
                        className="border-success/10 bg-success-soft text-success-foreground"
                        variant="secondary"
                      >
                        {t("export.included")}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button
                  className="h-12 w-full text-base"
                  disabled={isCheckingOut !== null}
                  size="lg"
                  type="button"
                  variant="outline"
                  onClick={() => void handleCheckout("resolution")}
                >
                  {isCheckingOut === "resolution"
                    ? t("export.redirecting")
                    : t("export.upgrade")}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {errorMessage ? (
          <p className="app-alert-danger">{errorMessage}</p>
        ) : null}

        <p className="app-note bg-surface px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
          {t("export.footerNote")}
        </p>
      </div>
    </main>
  );
}
