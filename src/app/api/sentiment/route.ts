import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api-errors";
import { DEFAULT_AI_MODEL } from "@/lib/ai/provider";
import { getDeepToneAnalysis } from "@/lib/ai/tone";
import { getAuthorizedCase } from "@/lib/cases/auth";
import { checkTone } from "@/lib/openai/moderation";
import { createClient } from "@/lib/supabase/server";

const sentimentSchema = z.object({
  case_id: z.string().uuid(),
  field_name: z.string().min(1),
  submitted_text: z.string(),
  deleted_text: z.string().optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return apiError(req, "UNAUTHORIZED", 401);
  }

  const body = await req.json();
  const parsed = sentimentSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(req, "VALIDATION_FAILED", 400, {
      details: parsed.error.issues,
    });
  }

  const { response } = await getAuthorizedCase(parsed.data.case_id, req);

  if (response) {
    return response;
  }

  let submittedResult = {
    is_flagged: false,
    score: 0,
    flags: {} as Record<string, boolean>,
  };
  let deletedResult: {
    is_flagged: boolean;
    score: number;
    flags: Record<string, boolean>;
  } | null = null;

  try {
    const [submittedCheck, deletedCheck] = await Promise.all([
      checkTone(parsed.data.submitted_text),
      parsed.data.deleted_text
        ? checkTone(parsed.data.deleted_text)
        : Promise.resolve(null),
    ]);

    submittedResult = submittedCheck;
    deletedResult = deletedCheck;
  } catch {}

  const maxScore = Math.max(submittedResult.score, deletedResult?.score ?? 0)
  const flaggedText =
    submittedResult.is_flagged && parsed.data.submitted_text
      ? parsed.data.submitted_text
      : deletedResult?.is_flagged
        ? parsed.data.deleted_text ?? ""
        : ""

  let deepAnalysis: Awaited<ReturnType<typeof getDeepToneAnalysis>> = null

  if (flaggedText) {
    const previousLogs = await supabase
      .from("sentiment_logs")
      .select("submitted_text, deleted_text")
      .eq("case_id", parsed.data.case_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)

    const previousTexts = (previousLogs.data ?? [])
      .flatMap((row) => [row.submitted_text, row.deleted_text])
      .filter((value): value is string => Boolean(value && value.trim()))

    deepAnalysis = await getDeepToneAnalysis({
      caseId: parsed.data.case_id,
      userId: user.id,
      previousTexts,
      flaggedText,
    })
  }

  await supabase.from("sentiment_logs").insert({
    case_id: parsed.data.case_id,
    user_id: user.id,
    field_name: parsed.data.field_name,
    submitted_text: parsed.data.submitted_text || null,
    deleted_text: parsed.data.deleted_text || null,
    sentiment_score: maxScore,
    flags: {
      submitted: submittedResult.flags,
      deleted: deletedResult?.flags ?? {},
    },
    risk_level: deepAnalysis?.risk_level ?? null,
    recommended_action: deepAnalysis?.recommended_action ?? null,
    ai_explanation: deepAnalysis?.explanation ?? null,
    ai_patterns: deepAnalysis?.patterns_detected ?? null,
    deep_analysis_model: deepAnalysis ? DEFAULT_AI_MODEL : null,
    deep_analysis_at: deepAnalysis ? new Date().toISOString() : null,
  });

  return NextResponse.json({
    flagged: submittedResult.is_flagged,
    risk_level: deepAnalysis?.risk_level ?? null,
  });
}
