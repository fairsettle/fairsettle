import { NextResponse } from "next/server";

import { apiError } from "@/lib/api-errors";
import { buildAppUrl, getRequestOrigin } from "@/lib/app-url";
import { sendDirectEmail } from "@/lib/email/resend";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function handleCronRequest(req: Request) {
  if (!process.env.CRON_SECRET) {
    return apiError(req, "INTERNAL_ERROR", 500);
  }

  if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return apiError(req, "UNAUTHORIZED", 401);
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const requestOrigin = getRequestOrigin(req);
  const { data: recommendations, error } = await supabaseAdmin
    .from("recommendations")
    .select("id, case_id, referral_id, created_at, last_follow_up_at, follow_up_sent_count, referrals(*), recommendation_responses(*)")
    .lte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: true });

  if (error) {
    return apiError(req, "FETCH_FAILED", 400);
  }

  let remindersSent = 0;

  for (const recommendation of (recommendations as Array<any> | null) ?? []) {
    const hasPendingResponse = (recommendation.recommendation_responses ?? []).some(
      (response: { action: string }) => response.action === "pending",
    );

    if (!hasPendingResponse) {
      continue;
    }

    if (recommendation.last_follow_up_at) {
      continue;
    }

    const { data: caseItem } = await supabaseAdmin
      .from("cases")
      .select("initiator_id, responder_id")
      .eq("id", recommendation.case_id)
      .maybeSingle();

    const participantIds = [caseItem?.initiator_id, caseItem?.responder_id].filter(Boolean) as string[];
    const { data: profiles } = participantIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, email, preferred_language")
          .in("id", participantIds)
      : { data: [] };

    const specialistId = (recommendation.referrals as { specialist_id?: string | null } | null)?.specialist_id;
    const { data: specialistProfile } = specialistId
      ? await supabaseAdmin
          .from("specialists")
          .select("email, full_name")
          .eq("id", specialistId)
          .maybeSingle()
      : { data: null };

    for (const profile of profiles ?? []) {
      if (!profile.email || !process.env.RESEND_API_KEY) {
        continue;
      }

      await sendDirectEmail({
        to: profile.email,
        subject: "Your FairSettle professional recommendation is waiting",
        title: "There is still a professional recommendation waiting for your response",
        body: "A specialist recommendation has been sitting without a full response for seven days. Open the case to accept, modify, or reject the suggested items.",
        ctaLabel: "Open case",
        ctaUrl: buildAppUrl(
          `/cases/${recommendation.case_id}/resolution`,
          profile.preferred_language || "en",
          requestOrigin,
        ),
      }).catch(() => null);

      remindersSent += 1;
    }

    if (specialistProfile?.email && process.env.RESEND_API_KEY) {
      await sendDirectEmail({
        to: specialistProfile.email,
        subject: "A FairSettle recommendation is still awaiting parent responses",
        title: "Your recommendation is still waiting for both parents",
        body: "The recommendation you submitted still has pending parent responses after seven days. Review the case if you need to prepare a follow-up session or clarify the next steps.",
        ctaLabel: "Open specialist dashboard",
        ctaUrl: buildAppUrl("/professional/dashboard", "en", requestOrigin),
      }).catch(() => null);
    }

    await supabaseAdmin
      .from("recommendations")
      .update({
        last_follow_up_at: new Date().toISOString(),
        follow_up_sent_count: Number(recommendation.follow_up_sent_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recommendation.id);
  }

  return NextResponse.json({ reminders_sent: remindersSent });
}

export async function GET(req: Request) {
  return handleCronRequest(req);
}

export async function POST(req: Request) {
  return handleCronRequest(req);
}
