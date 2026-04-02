/**
 * FairSettle — Resolution Engine
 * File: src/lib/resolution/engine.ts
 *
 * Implements the 5-rule deterministic resolution engine for MVP.
 * NO AI, NO machine learning, NO external API calls.
 * Pure arithmetic and conditional logic only.
 *
 * Rules:
 *  1. Matching answers  → Agreed (no suggestion needed)
 *  2. Numeric dispute   → Mathematical midpoint
 *  3. Child maintenance → CMS formula (overrides Rule 2)
 *  4. Choice dispute    → Show both answers + guidance text only
 *  5. Percentage split  → Midpoint with legal context note
 */

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export type QuestionType = 'single_choice' | 'multi_choice' | 'number' | 'text' | 'date';

export interface AnswerValue {
  value?: string | number;        // single_choice, number, text, date
  values?: string[];              // multi_choice
  currency?: string;              // optional, for number fields representing money
}

export interface ComparisonItem {
  question_id: string;
  question_type: QuestionType;
  question_text: Record<string, string>;   // i18n JSONB
  section: string;
  dispute_type: 'child' | 'financial' | 'asset';
  party_a_answer: AnswerValue;
  party_b_answer: AnswerValue;
  guidance_text: Record<string, string> | null;
  // These are populated by the API layer before calling the engine:
  _is_maintenance_question?: boolean;      // true for the child maintenance number question
  _is_percentage_question?: boolean;       // true for property/asset split % questions
  _payer_gross_annual_income?: number;     // payer's declared gross annual income (GBP)
  _children_count?: number;               // from Party A's profile
  _shared_overnights_per_year?: number;   // derived from the paying parent's nights answer
}

export type ResolutionRule =
  | 'exact_match'
  | 'cms_formula'
  | 'numeric_midpoint'
  | 'percentage_midpoint'
  | 'show_guidance_only'
  | 'no_comparison';              // text/date fields — cannot be compared automatically

export interface ResolutionResult {
  question_id: string;
  status: 'agreed' | 'gap' | 'no_comparison';
  rule_applied: ResolutionRule;
  party_a_answer: AnswerValue;
  party_b_answer: AnswerValue;
  suggestion: AnswerValue | null;
  suggestion_label: string | null;   // Human-readable suggestion text
  context_note: string | null;       // Legal context note shown below suggestion
  guidance_text: Record<string, string> | null;  // Shown for show_guidance_only rule
}

// ────────────────────────────────────────────────────────────
// Rule 1: Exact match check
// ────────────────────────────────────────────────────────────

function isAgreed(partyA: AnswerValue, partyB: AnswerValue): boolean {
  // single_choice, number, text, date: compare .value
  if (partyA.value !== undefined && partyB.value !== undefined) {
    // Normalise: trim strings, case-insensitive for text, exact for numbers
    const aVal = typeof partyA.value === 'string' ? partyA.value.trim().toLowerCase() : partyA.value;
    const bVal = typeof partyB.value === 'string' ? partyB.value.trim().toLowerCase() : partyB.value;
    return aVal === bVal;
  }
  // multi_choice: compare sorted arrays
  if (partyA.values !== undefined && partyB.values !== undefined) {
    const aSorted = [...partyA.values].sort().join('|');
    const bSorted = [...partyB.values].sort().join('|');
    return aSorted === bSorted;
  }
  return false;
}

// ────────────────────────────────────────────────────────────
// Rule 2: Numeric midpoint
// ────────────────────────────────────────────────────────────

function numericMidpoint(a: number, b: number): number {
  return Math.round((a + b) / 2);
}

// ────────────────────────────────────────────────────────────
// Rule 3: CMS child maintenance formula
// Overrides Rule 2 for child maintenance questions
// ────────────────────────────────────────────────────────────

/**
 * Calculate CMS (Child Maintenance Service) basic rate.
 *
 * @param payerGrossAnnualIncome - Paying parent's gross annual income in GBP
 * @param numberOfChildren - Number of qualifying children
 * @param sharedOvernightsPerYear - Annual overnight stays with the paying parent
 * @returns Monthly maintenance amount in GBP (rounded to nearest pound)
 */
export function calculateCMSMaintenance(
  payerGrossAnnualIncome: number,
  numberOfChildren: number,
  sharedOvernightsPerYear: number
): number {
  if (payerGrossAnnualIncome <= 0 || numberOfChildren <= 0) return 0;

  // CMS basic rates (% of gross weekly income)
  const basicRates: Record<number, number> = {
    1: 0.12,
    2: 0.16,
    3: 0.19,
  };
  const rate = basicRates[Math.min(numberOfChildren, 3)] || 0.19;

  const grossWeeklyIncome = payerGrossAnnualIncome / 52;
  let weeklyAmount = grossWeeklyIncome * rate;

  // Shared care adjustments (reduce weekly amount based on overnight stays)
  if (sharedOvernightsPerYear >= 156) {
    // 156+ nights: reduce by 3/7 and subtract additional £7/week per child
    weeklyAmount = weeklyAmount * (4 / 7) - 7 * numberOfChildren;
  } else if (sharedOvernightsPerYear >= 104) {
    // 104–155 nights: reduce by 2/7
    weeklyAmount = weeklyAmount * (5 / 7);
  } else if (sharedOvernightsPerYear >= 52) {
    // 52–103 nights: reduce by 1/7
    weeklyAmount = weeklyAmount * (6 / 7);
  }
  // Below 52 nights: no shared care adjustment

  const monthlyAmount = (weeklyAmount * 52) / 12;
  return Math.max(0, Math.round(monthlyAmount));
}

/**
 * Convert the "nights per week" answer text to annual overnight count.
 */
export function nightsAnswerToAnnual(nightsOptionText: string): number {
  const map: Record<string, number> = {
    'Every night (7)': 365,
    'Most nights (5-6)': Math.round(5.5 * 52),   // 286
    'Roughly equal (3-4)': Math.round(3.5 * 52),  // 182
    'Some nights (1-2)': Math.round(1.5 * 52),    // 78
    'Weekends only': 2 * 52,                       // 104
    'As agreed flexibly': 0,                       // use basic rate
  };
  return map[nightsOptionText] ?? 0;
}

// ────────────────────────────────────────────────────────────
// Rule 5: Percentage split midpoint
// ────────────────────────────────────────────────────────────

/**
 * Parse a percentage split option like "60/40 in my favour"
 * and return the initiator's (my) share as a number.
 * "50/50" → 50
 * "60/40 in my favour" → 60
 * "60/40 in their favour" → 40 (I keep 40)
 * "70/30 in my favour" → 70
 */
function parsePercentageOption(optionText: string, role: 'party_a' | 'party_b'): number | null {
  if (/^50\/50(?:\s+equal)?$/i.test(optionText.trim())) return 50;

  const match = optionText.match(/^(\d+)\/(\d+)\s+in\s+(my|their)\s+favour$/i);
  if (!match) return null;

  const higher = parseInt(match[1], 10);
  const lower = parseInt(match[2], 10);
  const favour = match[3].toLowerCase();

  if (role === 'party_a') {
    return favour === 'my' ? higher : lower;
  } else {
    // Party B's "my favour" means their share, which is Party A's "their favour"
    return favour === 'my' ? higher : lower;
  }
}

function buildPercentageLabel(myShare: number): string {
  const theirShare = 100 - myShare;
  if (myShare === theirShare) return '50/50';
  return `${myShare}/${theirShare}`;
}

// ────────────────────────────────────────────────────────────
// Format helpers
// ────────────────────────────────────────────────────────────

function formatMoney(amount: number, currency: string = 'GBP'): string {
  if (currency === 'GBP') return `£${amount.toLocaleString('en-GB')}`;
  return `${amount.toLocaleString()} ${currency}`;
}

function formatSuggestionLabel(item: ComparisonItem, value: number): string {
  if (item._is_percentage_question) {
    return buildPercentageLabel(value);
  }
  if (item.question_id && (
    item.question_text?.en?.toLowerCase().includes('maintenance') ||
    item.question_text?.en?.toLowerCase().includes('income') ||
    item.question_text?.en?.toLowerCase().includes('mortgage') ||
    item.question_text?.en?.toLowerCase().includes('monthly') ||
    item.question_text?.en?.toLowerCase().includes('value') ||
    item.question_text?.en?.toLowerCase().includes('savings') ||
    item.question_text?.en?.toLowerCase().includes('pension') ||
    item.question_text?.en?.toLowerCase().includes('debt')
  )) {
    const currency = (item.party_a_answer?.currency) || 'GBP';
    const suffix = item.question_text?.en?.includes('/month') || item._is_maintenance_question
      ? '/month' : '';
    return formatMoney(value, currency) + suffix;
  }
  return value.toString();
}

// ────────────────────────────────────────────────────────────
// Main resolution function
// ────────────────────────────────────────────────────────────

export function resolveItem(item: ComparisonItem): ResolutionResult {
  const base: Omit<ResolutionResult, 'status' | 'rule_applied' | 'suggestion' | 'suggestion_label' | 'context_note' | 'guidance_text'> = {
    question_id: item.question_id,
    party_a_answer: item.party_a_answer,
    party_b_answer: item.party_b_answer,
  };

  // Text and date fields cannot be compared automatically
  if (item.question_type === 'text' || item.question_type === 'date') {
    return {
      ...base,
      status: 'no_comparison',
      rule_applied: 'no_comparison',
      suggestion: null,
      suggestion_label: null,
      context_note: null,
      guidance_text: item.guidance_text,
    };
  }

  // ── Rule 1: Exact match ────────────────────────────────────
  if (isAgreed(item.party_a_answer, item.party_b_answer)) {
    return {
      ...base,
      status: 'agreed',
      rule_applied: 'exact_match',
      suggestion: null,
      suggestion_label: null,
      context_note: null,
      guidance_text: null,
    };
  }

  // From here: it's a gap. Determine which rule to apply.

  // ── Rule 3: CMS formula (overrides numeric midpoint) ──────
  if (
    item._is_maintenance_question &&
    item._payer_gross_annual_income &&
    item._payer_gross_annual_income > 0 &&
    item._children_count &&
    item._children_count > 0
  ) {
    const cmsAmount = calculateCMSMaintenance(
      item._payer_gross_annual_income,
      item._children_count,
      item._shared_overnights_per_year ?? 0
    );

    return {
      ...base,
      status: 'gap',
      rule_applied: 'cms_formula',
      suggestion: { value: cmsAmount, currency: 'GBP' },
      suggestion_label: `£${cmsAmount}/month`,
      context_note: 'CMS calculation based on declared incomes and shared care arrangements.',
      guidance_text: null,
    };
  }

  // ── Rule 5: Percentage split ──────────────────────────────
  if (item._is_percentage_question) {
    const aShare = typeof item.party_a_answer.value === 'string'
      ? parsePercentageOption(item.party_a_answer.value, 'party_a')
      : null;
    const bShare = typeof item.party_b_answer.value === 'string'
      ? parsePercentageOption(item.party_b_answer.value, 'party_b')
      : null;

    if (aShare !== null && bShare !== null) {
      const midShare = Math.round((aShare + bShare) / 2);
      const label = buildPercentageLabel(midShare);

      return {
        ...base,
        status: 'gap',
        rule_applied: 'percentage_midpoint',
        suggestion: { value: midShare },
        suggestion_label: label,
        context_note: 'Courts consider the housing needs of both parties and the children. The parent with primary care often receives a larger share.',
        guidance_text: null,
      };
    }
  }

  // ── Rule 2: Numeric midpoint ──────────────────────────────
  if (
    item.question_type === 'number' &&
    typeof item.party_a_answer.value === 'number' &&
    typeof item.party_b_answer.value === 'number'
  ) {
    const a = item.party_a_answer.value;
    const b = item.party_b_answer.value;
    const mid = numericMidpoint(a, b);

    return {
      ...base,
      status: 'gap',
      rule_applied: 'numeric_midpoint',
      suggestion: { value: mid, currency: item.party_a_answer.currency },
      suggestion_label: formatSuggestionLabel(item, mid),
      context_note: null,
      guidance_text: null,
    };
  }

  // ── Rule 4: Choice disagreement — guidance only ───────────
  // Applied to single_choice and multi_choice questions where answers differ
  return {
    ...base,
    status: 'gap',
    rule_applied: 'show_guidance_only',
    suggestion: null,
    suggestion_label: null,
    context_note: null,
    guidance_text: item.guidance_text,
  };
}

// ────────────────────────────────────────────────────────────
// Batch resolution — processes all comparison items
// ────────────────────────────────────────────────────────────

export interface ResolutionSummary {
  agreed_count: number;
  gap_count: number;
  no_comparison_count: number;
  total: number;
  has_cms_calculation: boolean;
  results: ResolutionResult[];
}

export function resolveAll(items: ComparisonItem[]): ResolutionSummary {
  const results = items.map(resolveItem);

  return {
    agreed_count: results.filter(r => r.status === 'agreed').length,
    gap_count: results.filter(r => r.status === 'gap').length,
    no_comparison_count: results.filter(r => r.status === 'no_comparison').length,
    total: results.length,
    has_cms_calculation: results.some(r => r.rule_applied === 'cms_formula'),
    results,
  };
}

// ────────────────────────────────────────────────────────────
// Helper: Build ComparisonItems from raw database data
// Called in /api/cases/[caseId]/resolution route
// ────────────────────────────────────────────────────────────

export interface RawResponse {
  question_id: string;
  answer_value: AnswerValue;
  submitted_at: string | null;
}

export interface QuestionRecord {
  id: string;
  dispute_type: 'child' | 'financial' | 'asset';
  section: string;
  question_text: Record<string, string>;
  question_type: QuestionType;
  options: Record<string, string[]> | null;
  guidance_text: Record<string, string> | null;
  display_order: number;
}

export interface CaseContext {
  children_count: number;
  initiator_income?: number;      // Party A gross annual income
  responder_income?: number;      // Party B gross annual income
  initiator_nights_answer?: string;  // Party A's "how many nights" answer text
  responder_nights_answer?: string;  // Party B's "how many nights" answer text
}

// Question ID or section name markers for special rules
const MAINTENANCE_QUESTION_SECTION = 'Child maintenance';
const MAINTENANCE_QUESTION_KEYWORDS = ['monthly child maintenance', 'maintenance amount'];
const PERCENTAGE_QUESTION_KEYWORDS = [
  'percentage split', 'what percentage split', 'equity do you think',
  'overall financial split', 'fair overall financial'
];

function isMaintenanceQuestion(q: QuestionRecord): boolean {
  if (q.section === MAINTENANCE_QUESTION_SECTION) return true;
  const text = q.question_text.en?.toLowerCase() ?? '';
  return MAINTENANCE_QUESTION_KEYWORDS.some(kw => text.includes(kw));
}

function isPercentageQuestion(q: QuestionRecord): boolean {
  const text = q.question_text.en?.toLowerCase() ?? '';
  return PERCENTAGE_QUESTION_KEYWORDS.some(kw => text.includes(kw));
}

export function buildComparisonItems(
  questions: QuestionRecord[],
  partyAResponses: RawResponse[],
  partyBResponses: RawResponse[],
  context: CaseContext
): ComparisonItem[] {
  const aMap = new Map(partyAResponses.map(r => [r.question_id, r]));
  const bMap = new Map(partyBResponses.map(r => [r.question_id, r]));

  // Determine payer for CMS: lower income = payer
  const payerIncome = context.initiator_income !== undefined && context.responder_income !== undefined
    ? Math.min(context.initiator_income, context.responder_income)
    : (context.initiator_income ?? context.responder_income ?? 0);

  // Determine shared overnights for the paying parent
  // If initiator has lower income (pays), use their nights answer
  // If responder has lower income (pays), use responder's nights answer
  const payerNightsAnswer = context.initiator_income !== undefined &&
    context.responder_income !== undefined &&
    context.initiator_income <= context.responder_income
    ? context.initiator_nights_answer
    : context.responder_nights_answer;

  const sharedOvernights = payerNightsAnswer
    ? nightsAnswerToAnnual(payerNightsAnswer)
    : 0;

  return questions
    .filter(q => aMap.has(q.id) && bMap.has(q.id))  // Only questions both parties answered
    .map(q => {
      const aResp = aMap.get(q.id)!;
      const bResp = bMap.get(q.id)!;

      return {
        question_id: q.id,
        question_type: q.question_type,
        question_text: q.question_text,
        section: q.section,
        dispute_type: q.dispute_type,
        party_a_answer: aResp.answer_value,
        party_b_answer: bResp.answer_value,
        guidance_text: q.guidance_text,
        _is_maintenance_question: isMaintenanceQuestion(q),
        _is_percentage_question: isPercentageQuestion(q),
        _payer_gross_annual_income: payerIncome,
        _children_count: context.children_count,
        _shared_overnights_per_year: sharedOvernights,
      } satisfies ComparisonItem;
    });
}
