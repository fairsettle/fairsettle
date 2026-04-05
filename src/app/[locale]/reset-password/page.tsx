"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { getLocalizedPath } from "@/lib/locale-path";

export default function ResetPasswordPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage(t("errors.passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t("resetPassword.passwordMismatch"));
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(getLocalizedPath(locale, "/login"));
      }, 1200);
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
              <p className="app-kicker">{t("resetPassword.eyebrow")}</p>
              <h1 className="font-display text-4xl text-ink sm:text-5xl">
                {t("resetPassword.title")}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-ink-soft">
                {t("resetPassword.body")}
              </p>
            </div>

            {hasSession === false ? (
              <div className="space-y-4">
                <p className="app-note">{t("resetPassword.invalidLink")}</p>
                <Button
                  asChild
                  className="h-12 px-6 text-base"
                  size="lg"
                  variant="outline"
                >
                  <Link href={getLocalizedPath(locale, "/forgot-password")}>
                    {t("resetPassword.requestAnother")}
                  </Link>
                </Button>
              </div>
            ) : success ? (
              <p className="app-alert-success">{t("resetPassword.success")}</p>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {t("resetPassword.newPassword")}
                  </Label>
                  <Input
                    id="password"
                    required
                    minLength={8}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">
                    {t("resetPassword.confirmPassword")}
                  </Label>
                  <Input
                    id="confirm-password"
                    required
                    minLength={8}
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>

                {errorMessage ? (
                  <p className="app-alert-danger">{errorMessage}</p>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="h-12 px-6 text-base"
                    disabled={isSubmitting || hasSession === null}
                    size="lg"
                    type="submit"
                  >
                    {t("resetPassword.submit")}
                  </Button>
                  <Button
                    asChild
                    className="h-12 px-6 text-base"
                    size="lg"
                    variant="outline"
                  >
                    <Link href={getLocalizedPath(locale, "/login")}>
                      {t("resetPassword.backToLogin")}
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
