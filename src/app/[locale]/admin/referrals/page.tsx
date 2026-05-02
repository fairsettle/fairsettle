import { FolderHeart } from "lucide-react";

import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminSectionCard } from "@/components/admin/AdminSectionCard";
import { AdminTableShell } from "@/components/admin/AdminTableShell";
import { AdminReferralActions } from "@/components/referrals/AdminReferralActions";
import { getReferralAdminSummary, listReferralRequestsForAdmin } from "@/lib/referrals/service";

export default async function AdminReferralsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const [rows, summary] = await Promise.all([
    listReferralRequestsForAdmin() as Promise<Array<any>>,
    getReferralAdminSummary(),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Specialist queue"
        title="Referrals"
        description="Review incoming specialist requests, track request source, and move cases through triage."
        icon={FolderHeart}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminMetricCard metric={{ label: "Referral requests", value: String(summary.requestCount), subtitle: "All incoming specialist requests" }} />
        <AdminMetricCard metric={{ label: "Converted referrals", value: String(summary.referralCount), subtitle: "Requests that have become active referrals" }} />
        <AdminMetricCard metric={{ label: "Mediator Assist", value: String(summary.mediatorAssistCount), subtitle: "Paid mediator-assist requests" }} />
        <AdminMetricCard metric={{ label: "Marketplace bookings", value: String(summary.marketplaceCount), subtitle: "Connect checkout referral volume" }} />
        <AdminMetricCard metric={{ label: "Solicitor referrals", value: String(summary.solicitorCount), subtitle: "Off-platform solicitor lead flow" }} />
        <AdminMetricCard metric={{ label: "Stalled recommendations", value: String(summary.stalledCount), subtitle: "Pending for 7+ days and ready for follow-up" }} />
      </div>

      <AdminSectionCard
        icon={FolderHeart}
        title="Referral requests"
        description="This queue combines manual resolution-page requests and paid Mediator Assist purchases."
      >
        <AdminTableShell className="p-4">
          <div className="space-y-4">
            {rows.length ? rows.map((row) => (
              <div key={row.id} className="space-y-3 rounded-[1.5rem] border border-line/80 bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-ink">
                      {(row as any).profiles?.full_name || (row as any).profiles?.email || "Unknown requester"}
                    </p>
                    <p className="text-sm text-ink-soft">
                      Case {(row as any).cases?.id} • {row.specialist_type} • {row.source}
                    </p>
                    {row.message ? <p className="text-sm leading-6 text-ink-soft">{row.message}</p> : null}
                  </div>
                  <div className="text-sm text-ink-soft">{new Date(row.created_at).toLocaleString(locale)}</div>
                </div>

                <AdminReferralActions
                  requestId={row.id}
                  locale={locale}
                  initialStatus={row.triage_status}
                  initialNotes={row.internal_notes}
                />
              </div>
            )) : (
              <p className="px-4 py-10 text-center text-ink-soft">No referral requests yet.</p>
            )}
          </div>
        </AdminTableShell>
      </AdminSectionCard>
    </div>
  );
}
