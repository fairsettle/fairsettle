export interface SavingsData {
  solicitorTotal: number;
  fairSettleTotal: number;
  saved: number;
  stageName: string;
}

export interface QuestionFlowSavingsInput {
  phase: "child" | "financial" | "asset";
  sectionName?: string | null;
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
  mediator_assist: 299,
};

const QUESTION_FLOW_SECTION_COSTS: Record<
  QuestionFlowSavingsInput["phase"],
  Array<{ match: string[]; solicitorCost: number; label: string }>
> = {
  child: [
    {
      match: ["Living arrangements"],
      solicitorCost: 225,
      label: "Initial solicitor consultation",
    },
    {
      match: ["Weekly schedule", "Holidays"],
      solicitorCost: 500,
      label: "Child arrangements negotiation",
    },
    {
      match: ["Handovers", "Decision-making"],
      solicitorCost: 975,
      label: "Full child arrangements solicitor process",
    },
  ],
  financial: [
    {
      match: ["Income"],
      solicitorCost: 1200,
      label: "Financial disclosure begins",
    },
    {
      match: ["Property"],
      solicitorCost: 1500,
      label: "Property negotiation",
    },
    {
      match: ["Savings and assets", "Debts"],
      solicitorCost: 1750,
      label: "Full financial picture",
    },
    {
      match: ["Child maintenance", "Monthly outgoings"],
      solicitorCost: 2000,
      label: "Maintenance calculation and outgoings",
    },
  ],
  asset: [
    {
      match: ["Property", "Vehicles and contents"],
      solicitorCost: 2100,
      label: "Asset split negotiation",
    },
    {
      match: ["Business interests", "Pensions"],
      solicitorCost: 2225,
      label: "Full combined solicitor cost",
    },
  ],
};

export function calculateSavings(
  currentStage: number,
  tier: "standard" | "resolution" | "mediator_assist" = "standard",
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

export function calculateQuestionFlowSavings({
  phase,
  sectionName,
}: QuestionFlowSavingsInput): SavingsData {
  const phaseSections = QUESTION_FLOW_SECTION_COSTS[phase];
  const matchedSection =
    phaseSections.find((section) =>
      section.match.some((value) => value === sectionName),
    ) ?? phaseSections.at(0);

  const solicitorTotal = matchedSection?.solicitorCost ?? 0;

  return {
    solicitorTotal,
    fairSettleTotal: 0,
    saved: solicitorTotal,
    stageName: matchedSection?.label ?? "",
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
