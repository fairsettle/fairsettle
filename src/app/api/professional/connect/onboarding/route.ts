import { NextResponse } from "next/server";

import { apiError } from "@/lib/api-errors";
import { getAppOrigin, getRequestOrigin } from "@/lib/app-url";
import { createConnectOnboardingLink } from "@/lib/professional/connect";
import { coerceSupportedLocale } from "@/lib/locale-path";
import { readSupabaseUserFromCookies } from "@/lib/admin/auth";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return apiError(req, "STRIPE_NOT_CONFIGURED", 500);
  }

  const locale = coerceSupportedLocale(req.headers.get("x-fairsettle-locale"));
  const user = readSupabaseUserFromCookies();

  if (!user) {
    return apiError(req, "UNAUTHORIZED", 401);
  }

  try {
    const accountLink = await createConnectOnboardingLink({
      locale,
      preferredOrigin: getAppOrigin(getRequestOrigin(req)),
      profileId: user.id,
      userEmail: user.email,
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unable to start Stripe onboarding.";
    return apiError(req, "STRIPE_NOT_CONFIGURED", 409, { details });
  }
}
