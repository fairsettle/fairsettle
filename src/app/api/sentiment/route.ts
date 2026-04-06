import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api-errors";
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

  await supabase.from("sentiment_logs").insert({
    case_id: parsed.data.case_id,
    user_id: user.id,
    field_name: parsed.data.field_name,
    submitted_text: parsed.data.submitted_text || null,
    deleted_text: parsed.data.deleted_text || null,
    sentiment_score: Math.max(submittedResult.score, deletedResult?.score ?? 0),
    flags: {
      submitted: submittedResult.flags,
      deleted: deletedResult?.flags ?? {},
    },
  });

  return NextResponse.json({ flagged: submittedResult.is_flagged });
}
