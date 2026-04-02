export interface SavingsData {
  solicitorTotal: number;
  fairSettleTotal: number;
  saved: number;
  stageName: string;
}

const SOLICITOR_STAGE_COSTS = [
  { label: "Consultation", solicitorCost: 225 },
  { label: "Initial position statement", solicitorCost: 750 },
  { label: "Financial disclosure", solicitorCost: 1250 },
  { label: "Exchange of positions", solicitorCost: 2000 },
  { label: "Case documentation", solicitorCost: 1750 },
  { label: "Consent order draft", solicitorCost: 0 },
];

const FAIRSETTLE_COSTS = {
  standard: 49,
  resolution: 149,
};

export function calculateSavings(
  currentStage: number,
  tier: "standard" | "resolution" = "standard",
): SavingsData {
  const safeStage = Math.max(
    0,
    Math.min(currentStage, SOLICITOR_STAGE_COSTS.length - 1),
  );
  const solicitorTotal = SOLICITOR_STAGE_COSTS.slice(0, safeStage + 1).reduce(
    (sum, stage) => sum + stage.solicitorCost,
    0,
  );
  const fairSettleTotal = safeStage >= 5 ? FAIRSETTLE_COSTS[tier] : 0;

  return {
    solicitorTotal,
    fairSettleTotal,
    saved: solicitorTotal - fairSettleTotal,
    stageName: SOLICITOR_STAGE_COSTS[safeStage]?.label ?? "",
  };
}

export function getSavingsStageFromCaseStatus(status: string) {
  switch (status) {
    case "comparison":
      return 3;
    case "completed":
      return 5;
    case "expired":
      return 4;
    case "invited":
    case "active":
      return 2;
    case "draft":
    default:
      return 0;
  }
}
