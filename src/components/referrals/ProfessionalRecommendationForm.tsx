"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fetchApi } from "@/lib/api-client";

export function ProfessionalRecommendationForm({
  caseId,
  referralId,
  items,
  locale,
}: {
  caseId: string;
  referralId: string;
  items: Array<{
    item_key: string;
    question_id: string;
    child_id: string | null;
    question_label: string;
  }>;
  locale: string;
}) {
  const [overallAssessment, setOverallAssessment] = useState("");
  const [nextStepsRecommendation, setNextStepsRecommendation] =
    useState<"accept_suggestions" | "modify_positions" | "book_follow_up" | "seek_mediation" | "seek_solicitor_support" | "court_pack_ready">("accept_suggestions");
  const [stances, setStances] = useState<Record<string, "agree_with_party_a" | "agree_with_party_b" | "alternative">>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [safeguardingFlag, setSafeguardingFlag] = useState(false);
  const [safeguardingNotes, setSafeguardingNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetchApi("/api/recommendations", locale, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referralId,
          caseId,
          items: items.map((item) => ({
            item_key: item.item_key,
            question_id: item.question_id,
            child_id: item.child_id,
            question_label: item.question_label,
            recommended_stance: stances[item.item_key] || "alternative",
            recommended_value: { value: notes[item.item_key] || "" },
            reasoning: notes[item.item_key] || "Professional recommendation submitted.",
          })),
          overallAssessment,
          nextStepsRecommendation,
          safeguardingFlag,
          safeguardingNotes: safeguardingNotes || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to submit recommendation.");
      }

      setMessage("Recommendation submitted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit recommendation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Textarea
        rows={5}
        placeholder="Overall assessment"
        value={overallAssessment}
        onChange={(event) => setOverallAssessment(event.target.value)}
      />
      <select
        className="h-11 w-full rounded-[1rem] border border-line bg-surface px-4 text-sm"
        value={nextStepsRecommendation}
        onChange={(event) =>
          setNextStepsRecommendation(event.target.value as typeof nextStepsRecommendation)
        }
      >
        <option value="accept_suggestions">Accept suggestions</option>
        <option value="modify_positions">Modify positions</option>
        <option value="book_follow_up">Book follow-up</option>
        <option value="seek_mediation">Seek mediation</option>
        <option value="seek_solicitor_support">Seek solicitor support</option>
        <option value="court_pack_ready">Court pack ready</option>
      </select>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.item_key} className="rounded-[1.25rem] border border-line/80 bg-surface-soft/70 p-4">
            <p className="text-sm font-medium text-ink">{item.question_label}</p>
            <select
              className="mt-3 h-11 w-full rounded-[1rem] border border-line bg-surface px-4 text-sm"
              value={stances[item.item_key] || "alternative"}
              onChange={(event) =>
                setStances((current) => ({
                  ...current,
                  [item.item_key]: event.target.value as "agree_with_party_a" | "agree_with_party_b" | "alternative",
                }))
              }
            >
              <option value="alternative">Recommend alternative outcome</option>
              <option value="agree_with_party_a">Agree with Party A</option>
              <option value="agree_with_party_b">Agree with Party B</option>
            </select>
            <Textarea
              className="mt-3"
              rows={3}
              placeholder="Recommended outcome and reasoning"
              value={notes[item.item_key] ?? ""}
              onChange={(event) =>
                setNotes((current) => ({ ...current, [item.item_key]: event.target.value }))
              }
            />
          </div>
        ))}
      </div>
      <label className="flex items-center gap-3 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={safeguardingFlag}
          onChange={(event) => setSafeguardingFlag(event.target.checked)}
        />
        Safeguarding concern identified in this recommendation
      </label>
      <Textarea
        rows={4}
        placeholder="Safeguarding notes (optional)"
        value={safeguardingNotes}
        onChange={(event) => setSafeguardingNotes(event.target.value)}
      />
      <Button type="button" className="h-12" disabled={busy} onClick={() => void handleSubmit()}>
        {busy ? "Submitting..." : "Submit recommendation"}
      </Button>
      {message ? <p className="text-sm text-ink-soft">{message}</p> : null}
    </div>
  );
}
