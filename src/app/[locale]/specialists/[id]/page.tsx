import { BriefcaseBusiness } from "lucide-react";
import Image from "next/image";

import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { AdminSectionCard } from "@/components/admin/AdminSectionCard";
import { SpecialistBookingCard } from "@/components/referrals/SpecialistBookingCard";
import { getSpecialistById } from "@/lib/referrals/service";

export default async function SpecialistDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const specialist = await getSpecialistById(id);

  if (!specialist) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 py-8">
        <p className="text-ink-soft">Specialist not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="space-y-6">
        <AdminPageIntro
          eyebrow="Specialist profile"
          title={specialist.full_name}
          description="Verified marketplace profile with qualifications, pricing, language support, and booking options."
          icon={BriefcaseBusiness}
        />

        <AdminSectionCard
          icon={BriefcaseBusiness}
          title="Profile"
          description="This is the live specialist profile parents can use for direct marketplace booking or referral requests."
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_360px]">
            <div className="space-y-4 text-sm leading-6 text-ink-soft">
              <div className="flex flex-wrap items-center gap-4">
                {specialist.photo_url ? (
                  <Image
                    src={specialist.photo_url}
                    alt={specialist.full_name}
                    width={96}
                    height={96}
                    className="size-24 rounded-[1.5rem] object-cover"
                  />
                ) : null}
                <div className="space-y-1">
                  <p>Type: {specialist.specialist_type}</p>
                  <p>Accreditation: {specialist.accreditation_body} ({specialist.accreditation_number})</p>
                  <p>Experience: {specialist.years_experience} years</p>
                  <p>Rate: £{specialist.hourly_rate}/hour</p>
                </div>
              </div>
              <p>{specialist.bio}</p>
              <p>Languages: {specialist.languages.join(", ")}</p>
              <p>Specialisms: {specialist.specialisms.join(", ")}</p>
              <p>Location: {specialist.location_text}</p>
              <p>Remote available: {specialist.remote_available ? "Yes" : "No"}</p>
              <p>
                Rating: {Number(specialist.rating_average ?? 0).toFixed(1)} / 5
                {" • "}
                {specialist.rating_count} review{specialist.rating_count === 1 ? "" : "s"}
              </p>
              <p>
                Next availability: {specialist.next_availability
                  ? new Date(specialist.next_availability).toLocaleString(locale)
                  : "Availability will be confirmed directly with the specialist."}
              </p>
              {specialist.recent_ratings?.length ? (
                <div className="space-y-2 pt-2">
                  <p className="font-medium text-ink">Recent feedback</p>
                  {specialist.recent_ratings.map((rating: { id: string; rating: number; review_text: string | null }) => (
                    <div key={rating.id} className="rounded-[1.25rem] border border-line/70 bg-surface-soft/70 px-4 py-3">
                      <p className="text-sm text-ink">Rating: {rating.rating}/5</p>
                      {rating.review_text ? <p className="mt-1 text-sm text-ink-soft">{rating.review_text}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <SpecialistBookingCard
              specialistId={specialist.id}
              specialistType={specialist.specialist_type as "mediator" | "solicitor"}
              defaultFeePounds={Number(specialist.hourly_rate ?? 299)}
              locale={locale}
            />
          </div>
        </AdminSectionCard>
      </div>
    </main>
  );
}
