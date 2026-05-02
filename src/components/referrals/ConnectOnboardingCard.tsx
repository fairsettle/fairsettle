"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/api-client";

export function ConnectOnboardingCard({
  locale,
  status,
  statusDetail,
}: {
  locale: string;
  status: "not_started" | "pending" | "completed" | "restricted";
  statusDetail?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleStart() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetchApi("/api/professional/connect/onboarding", locale, {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.url) {
        throw new Error(
          typeof payload?.error?.details === "string"
            ? payload.error.details
            : typeof payload?.error?.message === "string"
              ? payload.error.message
              : "Unable to start Stripe onboarding.",
        );
      }

      window.location.href = payload.url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start Stripe onboarding.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[1.5rem] border border-line/80 bg-surface px-5 py-4">
      <p className="app-kicker">Stripe Connect</p>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        {status === "completed"
          ? "Payout onboarding is complete. Marketplace bookings can now send funds to your connected account."
          : status === "restricted"
            ? "Your Stripe account needs attention before payouts can continue."
            : "Complete Stripe onboarding to receive marketplace payouts directly through FairSettle."}
      </p>
      {statusDetail ? <p className="mt-2 text-sm leading-6 text-ink-soft">{statusDetail}</p> : null}
      {status !== "completed" ? (
        <Button type="button" className="mt-4 h-11" disabled={busy} onClick={() => void handleStart()}>
          {busy
            ? "Preparing Stripe…"
            : status === "pending"
              ? "Resume Stripe onboarding"
              : status === "restricted"
                ? "Continue Stripe verification"
                : "Start Stripe onboarding"}
        </Button>
      ) : null}
      {message ? <p className="mt-3 text-sm text-ink-soft">{message}</p> : null}
    </div>
  );
}
