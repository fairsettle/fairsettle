import { BriefcaseBusiness } from "lucide-react";
import Link from "next/link";

import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { AdminSectionCard } from "@/components/admin/AdminSectionCard";
import { getStrictLocalizedPath } from "@/lib/locale-path";
import { listMarketplaceSpecialists } from "@/lib/referrals/service";

export default async function SpecialistsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const specialists = await listMarketplaceSpecialists({
    specialistType: typeof searchParams.type === "string" ? (searchParams.type as any) : "all",
    language: typeof searchParams.language === "string" ? searchParams.language : "all",
    specialism: typeof searchParams.specialism === "string" ? searchParams.specialism : undefined,
    remoteOnly: searchParams.remote === "true",
    postcode: typeof searchParams.postcode === "string" ? searchParams.postcode : undefined,
    nextAvailableOnly: searchParams.nextAvailable === "true",
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="space-y-6">
        <AdminPageIntro
          eyebrow="Marketplace"
          title="Specialists"
          description="Browse verified mediators and solicitors, then book or request specialist support from the FairSettle marketplace."
          icon={BriefcaseBusiness}
        />

        <AdminSectionCard
          icon={BriefcaseBusiness}
          title="Available professionals"
          description="Specialist profiles can be filtered by type, language, specialism, remote availability, location, and next available slot."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {specialists.length ? specialists.map((specialist) => (
              <Link
                key={specialist.id}
                href={getStrictLocalizedPath(locale, `/specialists/${specialist.id}`)}
                className="rounded-[1.5rem] border border-line/80 bg-surface p-5 transition-colors hover:bg-surface-soft"
              >
                <div className="space-y-2">
                  <h3 className="font-display text-2xl text-ink">{specialist.fullName}</h3>
                  <p className="text-sm text-ink-soft">
                    {specialist.specialistType} • {specialist.accreditationBody} • £{specialist.hourlyRate}/hour
                  </p>
                  <p className="text-sm leading-6 text-ink-soft">{specialist.bio}</p>
                  <p className="text-sm text-ink-soft">
                    Languages: {specialist.languages.join(", ")} • Specialisms: {specialist.specialisms.join(", ")}
                  </p>
                </div>
              </Link>
            )) : (
              <p className="rounded-[1.5rem] border border-line/80 bg-surface px-4 py-10 text-center text-ink-soft md:col-span-2">
                No specialists matched these filters.
              </p>
            )}
          </div>
        </AdminSectionCard>
      </div>
    </main>
  );
}
