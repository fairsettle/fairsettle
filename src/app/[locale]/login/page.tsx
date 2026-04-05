"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mapAuthErrorMessage, readApiErrorMessage } from "@/lib/client-errors";
import { getLocalizedPath } from "@/lib/locale-path";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [formState, setFormState] = useState({
    email: "",
    password: "",
  });

  const redirectTarget = searchParams.get("redirect")?.startsWith("/")
    ? searchParams.get("redirect")!
    : getLocalizedPath(locale, "/dashboard");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        setErrorMessage(
          mapAuthErrorMessage(await readApiErrorMessage(response), t),
        );
        return;
      }

      router.push(redirectTarget);
      router.refresh();
    } catch {
      setErrorMessage(t("errors.generic"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMagicLink() {
    setErrorMessage("");
    setMagicLinkSent(false);

    try {
      const supabase = createClient();
      const emailRedirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTarget)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: formState.email,
        options: { emailRedirectTo },
      });

      if (error) {
        setErrorMessage(mapAuthErrorMessage(error.message, t));
        return;
      }

      setMagicLinkSent(true);
    } catch {
      setErrorMessage(t("errors.magicLinkFailed"));
    }
  }

  return (
    <main className="px-5 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Card className="app-panel">
          <CardContent className="space-y-6 p-6 sm:p-7 md:p-8">
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="app-kicker">{t("login.title")}</p>
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-4xl text-ink sm:text-5xl">
                  {t("login.title")}
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-ink-soft">
                  {t("landing.subheadline")}
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-5">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("login.email")}</Label>
                  <Input
                    id="email"
                    required
                    type="email"
                    value={formState.email}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t("login.password")}</Label>
                  <Input
                    id="password"
                    required
                    type="password"
                    value={formState.password}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {errorMessage ? (
                <p className="app-alert-danger">{errorMessage}</p>
              ) : null}

              {magicLinkSent ? (
                <p className="app-alert-success">{t("login.magicLinkSent")}</p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  className="h-12 flex-1 text-base"
                  disabled={isSubmitting}
                  size="lg"
                  type="submit"
                >
                  {t("login.submit")}
                </Button>
                <Button
                  className="h-12 flex-1 rounded-full"
                  disabled={!formState.email}
                  onClick={handleMagicLink}
                  type="button"
                  variant="outline"
                >
                  <Mail className="mr-2 size-4" />
                  {t("login.magicLink")}
                </Button>
              </div>
            </form>

            <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Link
                className="app-link-subtle justify-start px-0 text-sm"
                href={getLocalizedPath(locale, "/forgot-password")}
              >
                {t("login.forgotPassword")}
              </Link>
              <Link
                className="app-link-subtle"
                href={`${getLocalizedPath(locale, "/register")}${searchParams.get("redirect") ? `?redirect=${encodeURIComponent(searchParams.get("redirect")!)}` : ""}`}
              >
                {t("login.startFree")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
