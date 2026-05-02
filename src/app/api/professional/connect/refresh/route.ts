import { NextResponse } from "next/server";

import { apiError } from "@/lib/api-errors";
import { getAppOrigin, getRequestOrigin } from "@/lib/app-url";
import { readSupabaseUserFromCookies } from "@/lib/admin/auth";
import { createConnectOnboardingLink } from "@/lib/professional/connect";

export async function GET(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return apiError(req, "STRIPE_NOT_CONFIGURED", 500);
  }

  const user = readSupabaseUserFromCookies();
  if (!user) {
    return apiError(req, "UNAUTHORIZED", 401);
  }

  const requestUrl = new URL(req.url);
  const locale = requestUrl.searchParams.get("locale");

  try {
    const accountLink = await createConnectOnboardingLink({
      locale,
      preferredOrigin: getAppOrigin(getRequestOrigin(req)),
      profileId: user.id,
      userEmail: user.email,
    });

    return NextResponse.redirect(accountLink.url, { status: 303 });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unable to refresh Stripe onboarding.";
    return apiError(req, "STRIPE_NOT_CONFIGURED", 409, { details });
  }
}
