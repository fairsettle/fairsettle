"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, UsersRound } from "lucide-react";

import { AsyncStateCard } from "@/components/feedback/AsyncStateCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { FamilyProfileFields } from "@/components/profile/FamilyProfileFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchApi } from "@/lib/api-client";
import {
  readApiErrorMessage,
  resolveApiErrorMessage,
} from "@/lib/client-errors";
import { getLocalizedPath } from "@/lib/locale-path";
import type {
  ChildProfileInput,
  ParentRole,
  ProfilePayload,
} from "@/types/profile";

export default function CompleteProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formState, setFormState] = useState({
    full_name: "",
    preferred_language: locale,
    parent_role: "" as ParentRole,
    children_count: 0,
    children: [] as ChildProfileInput[],
  });

  const childRows = useMemo(
    () =>
      Array.from({ length: formState.children_count }, (_, index) => ({
        first_name: formState.children[index]?.first_name ?? "",
        date_of_birth: formState.children[index]?.date_of_birth ?? "",
      })),
    [formState.children, formState.children_count],
  );

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        const response = await fetchApi("/api/profile", locale, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            resolveApiErrorMessage(
              await readApiErrorMessage(response),
              t("profileComplete.loadError"),
            ),
          );
        }

        const payload = (await response.json()) as ProfilePayload;

        if (!ignore) {
          setFormState({
            full_name: payload.profile.full_name ?? "",
            preferred_language: payload.profile.preferred_language ?? locale,
            parent_role: payload.profile.parent_role ?? "",
            children_count: payload.profile.children_count ?? 0,
            children: (payload.children ?? []).map((child) => ({
              first_name: child.first_name ?? "",
              date_of_birth: child.date_of_birth,
            })),
          });
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            error instanceof Error && error.message
              ? error.message
              : t("profileComplete.loadError"),
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, [locale, t]);

  async function handleSave() {
    setErrorMessage("");
    setIsSaving(true);

    try {
      const response = await fetchApi("/api/profile", locale, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        throw new Error(
          resolveApiErrorMessage(
            await readApiErrorMessage(response),
            t("profileComplete.saveError"),
          ),
        );
      }

      const redirect = searchParams.get("redirect");
      router.push(
        redirect?.startsWith("/")
          ? redirect
          : getLocalizedPath(locale, "/cases/new"),
      );
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : t("profileComplete.saveError"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="px-5 py-6">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            brandLabel={t("nav.brand")}
            locale={locale}
            subtitle={t("profileComplete.subtitle")}
            title={t("profileComplete.title")}
          />
          <AsyncStateCard
            body={t("profileComplete.subtitle")}
            title={t("profileComplete.loading")}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="px-5 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          brandLabel={t("nav.brand")}
          eyebrow={t("profileComplete.eyebrow")}
          locale={locale}
          subtitle={t("profileComplete.subtitle")}
          title={t("profileComplete.title")}
        />

        <Card className="app-panel">
          <CardContent className="space-y-6 p-6 sm:p-7 md:p-8">
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

              <div className="md:col-span-2">
                <FamilyProfileFields
                  childProfiles={childRows}
                  childrenCount={formState.children_count}
                  parentRole={formState.parent_role}
                  t={t}
                  onChildChange={(index, key, value) =>
                    setFormState((current) => {
                      const nextChildren = [...current.children];
                      nextChildren[index] = {
                        first_name: nextChildren[index]?.first_name ?? "",
                        date_of_birth: nextChildren[index]?.date_of_birth ?? "",
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

            {errorMessage ? (
              <p className="app-alert-danger">{errorMessage}</p>
            ) : null}

            <Button
              className="h-12 w-full text-base"
              disabled={isSaving}
              size="lg"
              type="button"
              onClick={handleSave}
            >
              {t("profileComplete.continue")}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
