"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { getLocalizedPath } from "@/lib/locale-path";

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(getLocalizedPath(locale, "/reset-password"))}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccess(true);
    } catch {
      setErrorMessage(t("errors.generic"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="px-5 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Card className="app-panel mx-auto w-full max-w-3xl">
          <CardContent className="space-y-6 p-6 sm:p-7 md:p-8">
            <div className="space-y-2">
              <p className="app-kicker">{t("forgotPassword.eyebrow")}</p>
              <h1 className="font-display text-4xl text-ink sm:text-5xl">
                {t("forgotPassword.title")}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-ink-soft">
                {t("forgotPassword.body")}
              </p>
            </div>

            {success ? (
              <div className="space-y-4">
                <div className="app-note-brand">
                  <div className="flex items-start gap-3">
                    <div className="app-chip h-10 w-10 justify-center rounded-2xl px-0">
                      <MailCheck className="size-4" />
                    </div>
                    <div>
                      <p className="font-medium text-ink">
                        {t("forgotPassword.successTitle")}
                      </p>
                      <p className="mt-1">
                        {t("forgotPassword.successBody", { email })}
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  className="app-link-subtle justify-start px-0"
                  href={getLocalizedPath(locale, "/login")}
                >
                  {t("forgotPassword.backToLogin")}
                </Link>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("login.email")}</Label>
                  <Input
                    id="email"
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                {errorMessage ? (
                  <p className="app-alert-danger">{errorMessage}</p>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="h-12 px-6 text-base"
                    disabled={isSubmitting}
                    size="lg"
                    type="submit"
                  >
                    {t("forgotPassword.submit")}
                  </Button>
                  <Button asChild className="h-12 px-6 text-base" size="lg" variant="outline">
                    <Link href={getLocalizedPath(locale, "/login")}>
                      {t("forgotPassword.backToLogin")}
                    </Link>
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
