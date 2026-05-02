"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchApi } from "@/lib/api-client";

export function AdminReferralActions({
  requestId,
  locale,
  initialStatus,
  initialNotes,
}: {
  requestId: string;
  locale: string;
  initialStatus: "new" | "reviewing" | "matched" | "closed" | "cancelled";
  initialNotes: string | null;
}) {
  const [triageStatus, setTriageStatus] = useState(initialStatus);
  const [internalNotes, setInternalNotes] = useState(initialNotes ?? "");
  const [specialistId, setSpecialistId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetchApi(`/api/admin/referrals/${requestId}`, locale, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          triageStatus,
          internalNotes,
          specialistId: specialistId || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to save triage changes.");
      }

      setMessage("Saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save triage changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-[1.25rem] border border-line/80 bg-surface-soft/70 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <select
          className="h-11 rounded-[1rem] border border-line bg-surface px-4 text-sm"
          value={triageStatus}
          onChange={(event) => setTriageStatus(event.target.value as typeof initialStatus)}
        >
          <option value="new">New</option>
          <option value="reviewing">Reviewing</option>
          <option value="matched">Matched</option>
          <option value="closed">Closed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <Input
          placeholder="Assigned specialist ID (optional)"
          value={specialistId}
          onChange={(event) => setSpecialistId(event.target.value)}
        />
        <Button type="button" className="h-11" disabled={saving} onClick={() => void handleSave()}>
          {saving ? "Saving..." : "Save triage"}
        </Button>
      </div>

      <Textarea
        rows={4}
        placeholder="Internal notes"
        value={internalNotes}
        onChange={(event) => setInternalNotes(event.target.value)}
      />

      {message ? <p className="text-sm text-ink-soft">{message}</p> : null}
    </div>
  );
}
