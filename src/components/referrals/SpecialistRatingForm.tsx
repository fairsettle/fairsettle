"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fetchApi } from "@/lib/api-client";

export function SpecialistRatingForm({
  referralId,
  specialistId,
  caseId,
  locale,
}: {
  referralId: string;
  specialistId: string;
  caseId: string;
  locale: string;
}) {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [message, setMessage] = useState("");

  async function handleSave() {
    setMessage("");
    const response = await fetchApi("/api/specialist-ratings", locale, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralId, specialistId, caseId, rating, reviewText }),
    });

    setMessage(response.ok ? "Rating saved." : "Unable to save rating.");
  }

  return (
    <div className="space-y-3 rounded-[1.25rem] border border-line/80 bg-surface-soft/70 p-4">
      <select
        className="h-11 w-full rounded-[1rem] border border-line bg-surface px-4 text-sm"
        value={rating}
        onChange={(event) => setRating(Number(event.target.value))}
      >
        {[5, 4, 3, 2, 1].map((value) => (
          <option key={value} value={value}>
            {value} / 5
          </option>
        ))}
      </select>
      <Textarea
        rows={3}
        placeholder="Optional review"
        value={reviewText}
        onChange={(event) => setReviewText(event.target.value)}
      />
      <Button type="button" onClick={() => void handleSave()}>
        Save rating
      </Button>
      {message ? <p className="text-sm text-ink-soft">{message}</p> : null}
    </div>
  );
}
