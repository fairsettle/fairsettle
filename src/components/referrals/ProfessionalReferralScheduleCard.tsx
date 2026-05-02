"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchApi } from "@/lib/api-client";

export function ProfessionalReferralScheduleCard({
  referralId,
  initialStatus,
  initialScheduledFor,
  initialMeetingMode,
  initialMeetingLink,
  initialMeetingInstructions,
  locale,
}: {
  referralId: string;
  initialStatus: "pending" | "accepted" | "session_scheduled" | "recommendation_submitted" | "completed" | "cancelled";
  initialScheduledFor: string | null;
  initialMeetingMode: "video" | "phone" | "in_person" | null;
  initialMeetingLink: string | null;
  initialMeetingInstructions: string | null;
  locale: string;
}) {
  const [status, setStatus] = useState<"accepted" | "session_scheduled" | "completed" | "cancelled">(
    initialStatus === "pending" || initialStatus === "recommendation_submitted"
      ? "accepted"
      : (initialStatus as "accepted" | "session_scheduled" | "completed" | "cancelled"),
  );
  const [scheduledFor, setScheduledFor] = useState(
    initialScheduledFor ? new Date(initialScheduledFor).toISOString().slice(0, 16) : "",
  );
  const [meetingMode, setMeetingMode] = useState<"video" | "phone" | "in_person">(
    initialMeetingMode ?? "video",
  );
  const [meetingLink, setMeetingLink] = useState(initialMeetingLink ?? "");
  const [meetingInstructions, setMeetingInstructions] = useState(initialMeetingInstructions ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetchApi(`/api/referrals/${referralId}/schedule`, locale, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          meetingMode: status === "session_scheduled" ? meetingMode : null,
          meetingLink: meetingLink || null,
          meetingInstructions: meetingInstructions || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to save referral scheduling.");
      }

      setMessage("Referral schedule saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save referral scheduling.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-[1.5rem] border border-line/80 bg-surface p-5">
      <div className="space-y-1">
        <p className="app-kicker">Scheduling</p>
        <p className="text-sm leading-6 text-ink-soft">
          Update the referral status, set the session time, and send the meeting details to both parents.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Status</p>
          <select
            className="h-11 w-full rounded-2xl border border-input bg-surface px-4 text-sm text-ink transition-[border-color,box-shadow,background-color] duration-200 outline-none hover:border-brand/18 hover:bg-white focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "accepted" | "session_scheduled" | "completed" | "cancelled")
            }
          >
            <option value="accepted">Accepted</option>
            <option value="session_scheduled">Session scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Scheduled for</p>
          <Input
            type="datetime-local"
            value={scheduledFor}
            onChange={(event) => setScheduledFor(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Meeting mode</p>
          <select
            className="h-11 w-full rounded-2xl border border-input bg-surface px-4 text-sm text-ink transition-[border-color,box-shadow,background-color] duration-200 outline-none hover:border-brand/18 hover:bg-white focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={meetingMode}
            onChange={(event) => setMeetingMode(event.target.value as "video" | "phone" | "in_person")}
          >
            <option value="video">Video</option>
            <option value="phone">Phone</option>
            <option value="in_person">In person</option>
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Meeting link</p>
          <Input
            placeholder="https://..."
            value={meetingLink}
            onChange={(event) => setMeetingLink(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Instructions</p>
        <Textarea
          rows={4}
          placeholder="Add dial-in details, documents to prepare, or arrival instructions."
          value={meetingInstructions}
          onChange={(event) => setMeetingInstructions(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={busy} onClick={() => void handleSave()}>
          {busy ? "Saving..." : "Save scheduling"}
        </Button>
      </div>

      {message ? <p className="text-sm text-ink-soft">{message}</p> : null}
    </div>
  );
}
