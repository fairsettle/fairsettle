"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fetchApi } from "@/lib/api-client";

export function RecommendationResponseCard({
  recommendationId,
  responseId,
  itemLabel,
  recommendedValue,
  locale,
}: {
  recommendationId: string;
  responseId: string;
  itemLabel: string;
  recommendedValue: unknown;
  locale: string;
}) {
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function save(action: "accept" | "modify" | "reject") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetchApi("/api/recommendation-responses", locale, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendationId,
          responseId,
          action,
          responseValue:
            action === "modify"
              ? { value: comment }
              : action === "accept"
                ? recommendedValue ?? null
                : null,
          comment,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to save recommendation response.");
      }

      setMessage(`Saved as ${action}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save recommendation response.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-[1.25rem] border border-line/80 bg-surface-soft/70 p-4">
      <Textarea
        rows={3}
        placeholder="Optional comment or modified position"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={busy} onClick={() => void save("accept")}>
          Accept
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void save("modify")}>
          Modify
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void save("reject")}>
          Reject
        </Button>
      </div>
      {message ? <p className="text-sm text-ink-soft">{message}</p> : null}
    </div>
  );
}
