"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchApi } from "@/lib/api-client";

type Application = {
  id: string;
  full_name: string;
  email: string;
  specialist_type: string;
  accreditation_body: string;
  accreditation_number: string;
  qualifications: string;
  years_experience: number;
  hourly_rate: number;
  languages: string[];
  specialisms: string[];
  location_text: string;
  postcode: string;
  remote_available: boolean;
  bio: string;
  status: "pending" | "approved" | "rejected";
  review_notes: string | null;
};

export function SpecialistApplicationReviewCard({
  application,
  locale,
}: {
  application: Application;
  locale: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(application.review_notes ?? "");
  const [profileId, setProfileId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleApprove() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetchApi(`/api/admin/specialists/${application.id}/approve`, locale, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationSource: application.specialist_type === "mediator" ? "FMC" : "SRA",
          verificationNotes: notes,
          profileId: profileId || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to approve application.");
      }

      setMessage("Approved");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to approve application.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetchApi(`/api/admin/specialists/${application.id}/reject`, locale, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewNotes: notes || "Application rejected",
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to reject application.");
      }

      setMessage("Rejected");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reject application.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="app-panel">
      <CardContent className="space-y-4 p-6">
        <div className="space-y-2">
          <h3 className="font-display text-2xl text-ink">{application.full_name}</h3>
          <p className="text-sm text-ink-soft">
            {application.specialist_type} • {application.accreditation_body} • {application.email}
          </p>
        </div>
        <div className="grid gap-2 text-sm text-ink-soft md:grid-cols-2">
          <p>Qualifications: {application.qualifications}</p>
          <p>Experience: {application.years_experience} years</p>
          <p>Rate: £{application.hourly_rate}/hour</p>
          <p>Location: {application.location_text} ({application.postcode})</p>
          <p>Languages: {application.languages.join(", ")}</p>
          <p>Specialisms: {application.specialisms.join(", ")}</p>
        </div>
        <p className="text-sm leading-6 text-ink-soft">{application.bio}</p>
        <Input
          placeholder="Linked profile ID (optional)"
          value={profileId}
          onChange={(event) => setProfileId(event.target.value)}
        />
        <Textarea
          rows={4}
          placeholder="Review notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <Button type="button" disabled={busy || application.status === "approved"} onClick={() => void handleApprove()}>
            {busy ? "Saving..." : "Approve"}
          </Button>
          <Button type="button" variant="outline" disabled={busy || application.status === "rejected"} onClick={() => void handleReject()}>
            Reject
          </Button>
        </div>
        {message ? <p className="text-sm text-ink-soft">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
