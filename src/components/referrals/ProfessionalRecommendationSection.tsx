"use client";

import { useEffect, useState } from "react";

import { RecommendationResponseCard } from "@/components/referrals/RecommendationResponseCard";
import { Card, CardContent } from "@/components/ui/card";
import { fetchApi } from "@/lib/api-client";

type RecommendationPayload = {
  recommendations: Array<{
    id: string;
    overall_assessment: string | null;
    next_steps_recommendation: string | null;
    safeguarding_flag: boolean;
    items: Array<{
      item_key: string;
      question_label?: string;
      recommended_stance?: "agree_with_party_a" | "agree_with_party_b" | "alternative";
      recommended_value?: unknown;
      reasoning?: string;
    }>;
    recommendation_responses: Array<{
      id: string;
      user_id: string;
      item_key: string;
      action: "pending" | "accept" | "modify" | "reject";
    }>;
  }>;
  viewer_user_id: string;
};

export function ProfessionalRecommendationSection({
  caseId,
  locale,
}: {
  caseId: string;
  locale: string;
}) {
  const [payload, setPayload] = useState<RecommendationPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetchApi(`/api/recommendations/${caseId}`, locale, {
        cache: "no-store",
      }).catch(() => null);

      if (!response?.ok) {
        return;
      }

      const data = (await response.json()) as RecommendationPayload;
      if (!cancelled) {
        setPayload(data);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [caseId, locale]);

  const recommendation = payload?.recommendations?.[0];
  if (!recommendation) {
    return null;
  }

  return (
    <Card className="app-panel border-brand/15">
      <CardContent className="space-y-4 p-6">
        <div className="space-y-2">
          <p className="app-kicker">Professional recommendation</p>
          <p className="text-sm leading-6 text-ink-soft">
            {recommendation.overall_assessment || "A specialist has submitted a recommendation for this case."}
          </p>
          {recommendation.next_steps_recommendation ? (
            <p className="text-sm text-ink-soft">
              Next step: {recommendation.next_steps_recommendation}
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          {(recommendation.items || []).map((item) => {
            const responseForViewer = recommendation.recommendation_responses.find(
              (response) =>
                response.item_key === item.item_key &&
                response.user_id === payload?.viewer_user_id,
            );
            const itemTitle = item.question_label || item.item_key;
            const stanceLabel =
              item.recommended_stance === "agree_with_party_a"
                ? "Recommended stance: align with Party A"
                : item.recommended_stance === "agree_with_party_b"
                  ? "Recommended stance: align with Party B"
                  : "Recommended stance: alternative outcome";

            return (
              <div key={item.item_key} className="space-y-3 rounded-[1.25rem] border border-line/80 bg-surface-soft/70 p-4">
                <p className="text-sm font-medium text-ink">{itemTitle}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">{stanceLabel}</p>
                {item.recommended_value ? (
                  <p className="text-sm text-ink-soft">
                    Recommended value: {typeof item.recommended_value === "object"
                      ? JSON.stringify(item.recommended_value)
                      : String(item.recommended_value)}
                  </p>
                ) : null}
                {item.reasoning ? <p className="text-sm leading-6 text-ink-soft">{item.reasoning}</p> : null}
                {responseForViewer ? (
                  <RecommendationResponseCard
                    recommendationId={recommendation.id}
                    responseId={responseForViewer.id}
                    itemLabel={itemTitle}
                    recommendedValue={item.recommended_value ?? null}
                    locale={locale}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
