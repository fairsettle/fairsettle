"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchApi } from "@/lib/api-client";

export function SpecialistBookingCard({
  specialistId,
  specialistType,
  defaultFeePounds,
  locale,
}: {
  specialistId: string;
  specialistType: "mediator" | "solicitor";
  defaultFeePounds: number;
  locale: string;
}) {
  const [caseId, setCaseId] = useState("");
  const [amountPounds, setAmountPounds] = useState(String(defaultFeePounds));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleBook() {
    setBusy(true);
    setMessage("");

    try {
      const endpoint =
        specialistType === "mediator"
          ? "/api/payments/specialist-checkout"
          : "/api/referrals";

      const response = await fetchApi(endpoint, locale, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:
          specialistType === "mediator"
            ? JSON.stringify({
                caseId,
                specialistId,
                specialistType,
                amountPence: Math.round(Number(amountPounds || 0) * 100),
              })
            : JSON.stringify({
                caseId,
                specialistId,
                source: "marketplace",
                paymentModel: "solicitor_off_platform",
              }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof payload?.error?.details === "string"
            ? payload.error.details
            : typeof payload?.error?.message === "string"
              ? payload.error.message
              : "Unable to continue specialist booking.",
        );
      }

      if (payload.url) {
        window.location.href = payload.url;
        return;
      }

      setMessage(
        specialistType === "solicitor"
          ? "Your solicitor referral request has been created."
          : "Your marketplace booking request is ready.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to continue specialist booking.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-[1.5rem] border border-line/80 bg-surface-soft/70 p-5">
      <Input
        placeholder="Case ID"
        value={caseId}
        onChange={(event) => setCaseId(event.target.value)}
      />
      {specialistType === "mediator" ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Session fee (£)</p>
          <Input
            inputMode="decimal"
            placeholder="299"
            value={amountPounds}
            onChange={(event) => setAmountPounds(event.target.value)}
          />
        </div>
      ) : null}
      <Button type="button" className="h-11" disabled={busy || !caseId} onClick={() => void handleBook()}>
        {busy ? "Preparing..." : specialistType === "mediator" ? "Book mediator" : "Request solicitor referral"}
      </Button>
      {message ? <p className="text-sm text-ink-soft">{message}</p> : null}
    </div>
  );
}
