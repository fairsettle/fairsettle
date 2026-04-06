"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LockKeyhole, MailCheck, ShieldCheck } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { FamilyProfileFields } from "@/components/profile/FamilyProfileFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchApi } from "@/lib/api-client";
import { mapAuthErrorMessage, readApiErrorMessage } from "@/lib/client-errors";
import { getLocalizedPath } from "@/lib/locale-path";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [formState, setFormState] = useState({
    full_name: "",
    email: "",
    password: "",
    preferred_language: locale as "en" | "pl" | "ro" | "ar",
    children_count: 1,
    parent_role: "" as "" | "mum" | "dad",
    children: [{ first_name: "", date_of_birth: "" }],
    privacy_consent: false,
  });
  const childRows = useMemo(
    () =>
      Array.from({ length: formState.children_count }, (_, index) => ({
        first_name: formState.children[index]?.first_name ?? "",
        date_of_birth: formState.children[index]?.date_of_birth ?? "",
      })),
    [formState.children, formState.children_count],
  );

  const redirectTarget = searchParams.get("redirect")?.startsWith("/")
    ? searchParams.get("redirect")!
    : getLocalizedPath(locale, "/dashboard");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetchApi("/api/auth/register", locale, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        requires_email_confirmation?: boolean;
        user?: { email?: string | null };
      } | null;

      if (!response.ok) {
        const errorMessage = payload?.error ?? (await readApiErrorMessage(response));
        const error = errorMessage?.toLowerCase() ?? "";
        setErrorMessage(
          error === "validation failed"
            ? t("errors.validation")
            : mapAuthErrorMessage(errorMessage, t),
        );
        return;
      }

      if (payload?.requires_email_confirmation) {
        setConfirmationEmail(payload.user?.email ?? formState.email);
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

  if (confirmationEmail) {
    return (
      <main className=" px-5 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <Card className="app-panel mx-auto w-full max-w-3xl">
            <CardContent className="space-y-5 p-6 sm:p-7 md:p-8">
              <div className="app-chip h-12 w-12 justify-center rounded-2xl px-0">
                <MailCheck className="size-5" />
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-4xl text-ink sm:text-5xl">
                  {t("register.confirmEmailTitle")}
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-ink-soft">
                  {t("register.confirmEmailBody", { email: confirmationEmail })}
                </p>
              </div>

              <div className="app-note-brand">
                <p className="font-medium text-ink">
                  {t("register.confirmEmailHintTitle")}
                </p>
                <p className="mt-2">{t("register.confirmEmailHintBody")}</p>
              </div>

              <div className="border-t border-line pt-5">
                <Link className="app-link-subtle" href={getLocalizedPath(locale, "/login")}>
                  {t("register.signInLink")}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className=" px-5 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Card className="app-panel">
          <CardContent className="space-y-6 p-6 sm:p-7 md:p-8">
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="app-kicker">{t("register.step")}</p>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-brand">
                  <div className="h-full w-1/3 rounded-full bg-brand" />
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-4xl text-ink sm:text-5xl">
                  {t("register.title")}
                </h1>
                <p className="text-lg font-medium text-ink">
                  {t("register.aboutTitle")}
                </p>
                <p className="max-w-2xl text-sm leading-6 text-ink-soft">
                  {t("register.aboutSubtitle")}
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="full_name">{t("register.fullName")}</Label>
                  <Input
                    id="full_name"
                    required
                    value={formState.full_name}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        full_name: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("register.email")}</Label>
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
                  <Label>{t("register.preferredLanguage")}</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(["en", "pl", "ro", "ar"] as const).map((language) => (
                      <Button
                        key={language}
                        className="h-11 rounded-2xl"
                        onClick={() =>
                          setFormState((current) => ({
                            ...current,
                            preferred_language: language,
                          }))
                        }
                        type="button"
                        variant={
                          formState.preferred_language === language
                            ? "default"
                            : "outline"
                        }
                      >
                        {t(`languages.${language}`)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="password">{t("register.password")}</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="password"
                      required
                      minLength={8}
                      type={showPassword ? "text" : "password"}
                      value={formState.password}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                    />
                    <Button
                      className="h-11 px-4 sm:w-auto"
                      onClick={() => setShowPassword((current) => !current)}
                      type="button"
                      variant="outline"
                    >
                      {showPassword
                        ? t("register.hidePassword")
                        : t("register.showPassword")}
                    </Button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <FamilyProfileFields
                    children={childRows}
                    childrenCount={formState.children_count}
                    parentRole={formState.parent_role}
                    t={t}
                    onChildChange={(index, key, value) =>
                      setFormState((current) => {
                        const nextChildren = [...current.children];
                        nextChildren[index] = {
                          first_name: nextChildren[index]?.first_name ?? "",
                          date_of_birth:
                            nextChildren[index]?.date_of_birth ?? "",
                          [key]: value,
                        };

                        return {
                          ...current,
                          children: nextChildren,
                        };
                      })
                    }
                    onChildrenCountChange={(count) =>
                      setFormState((current) => ({
                        ...current,
                        children_count: count,
                        children: Array.from({ length: count }, (_, index) => ({
                          first_name: current.children[index]?.first_name ?? "",
                          date_of_birth:
                            current.children[index]?.date_of_birth ?? "",
                        })),
                      }))
                    }
                    onParentRoleChange={(role) =>
                      setFormState((current) => ({
                        ...current,
                        parent_role: role,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="app-panel-brand p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 text-brand" />
                  <div className="space-y-1">
                    <p className="font-medium text-ink">{t("gdpr.dataSafe")}</p>
                    <p className="text-sm leading-6 text-ink-soft">
                      {t("gdpr.gdprNotice")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="app-note flex items-start gap-3">
                <Checkbox
                  checked={formState.privacy_consent}
                  className="mt-1"
                  id="privacy_consent"
                  onCheckedChange={(checked) =>
                    setFormState((current) => ({
                      ...current,
                      privacy_consent: checked === true,
                    }))
                  }
                />
                <Label className="leading-6" htmlFor="privacy_consent">
                  {t("register.privacyConsent")}
                </Label>
              </div>

              {errorMessage ? (
                <p className="app-alert-danger">{errorMessage}</p>
              ) : null}

              <Button
                className="h-12 w-full text-base"
                disabled={isSubmitting || !formState.privacy_consent}
                size="lg"
                type="submit"
              >
                <LockKeyhole className="mr-2 size-4" />
                {t("register.continue")}
              </Button>
            </form>

            <div className="border-t border-line pt-5">
              <Link
                className="app-link-subtle"
                href={`${getLocalizedPath(locale, "/login")}${searchParams.get("redirect") ? `?redirect=${encodeURIComponent(searchParams.get("redirect")!)}` : ""}`}
              >
                {t("register.signInLink")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
