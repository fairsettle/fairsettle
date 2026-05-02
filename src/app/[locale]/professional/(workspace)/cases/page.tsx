import { FolderKanban, Search } from "lucide-react";
import Link from "next/link";

import { AdminFiltersPanel } from "@/components/admin/AdminFiltersPanel";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSectionCard } from "@/components/admin/AdminSectionCard";
import {
  ProfessionalReferralsTable,
  type ProfessionalReferralRow,
} from "@/components/professional/ProfessionalReferralsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStrictLocalizedPath } from "@/lib/locale-path";
import {
  buildReferralRequestSummary,
  formatCurrency,
} from "@/lib/professional/presentation";
import { requireSpecialist } from "@/lib/professional/auth";
import { listProfessionalReferrals } from "@/lib/referrals/service";

const PAGE_SIZE = 8;

export default async function ProfessionalCasesPage({
  params: { locale },
  searchParams = {},
}: {
  params: { locale: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const professional = await requireSpecialist(locale);
  const referrals = (await listProfessionalReferrals(professional.specialistId)) as Array<any>;

  const query = typeof searchParams.q === "string" ? searchParams.q.trim().toLowerCase() : "";
  const statusFilter = typeof searchParams.status === "string" ? searchParams.status : "all";
  const paymentFilter = typeof searchParams.payment === "string" ? searchParams.payment : "all";
  const requestedPage = Number(typeof searchParams.page === "string" ? searchParams.page : "1");

  const filtered = referrals.filter((referral) => {
    const summary = buildReferralRequestSummary(referral.referral_requests).toLowerCase();
    const matchesQuery =
      !query ||
      referral.case_id.toLowerCase().includes(query) ||
      summary.includes(query) ||
      String(referral.status).toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || referral.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || (referral.payment_model ?? "request_only") === paymentFilter;
    return matchesQuery && matchesStatus && matchesPayment;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const rows: ProfessionalReferralRow[] = pageItems.map((referral) => ({
    id: referral.id,
    caseId: referral.case_id,
    status: referral.status,
    paymentModel: referral.payment_model ?? "request_only",
    createdAt: referral.created_at,
    scheduledFor: referral.scheduled_for,
    paymentAmount: referral.payment_amount,
    payoutAmount: referral.specialist_payout_amount,
    requesterSummary: buildReferralRequestSummary(referral.referral_requests),
    detailHref: getStrictLocalizedPath(locale, `/professional/cases/${referral.case_id}`),
  }));

  const scheduledCount = filtered.filter((item) => item.status === "session_scheduled").length;
  const paidCount = filtered.filter((item) => Number(item.payment_amount ?? 0) > 0).length;
  const valueOnPage = pageItems.reduce((sum, item) => sum + Number(item.payment_amount ?? 0), 0);

  return (
    <div className="space-y-8">
      <AdminPageIntro
        eyebrow="Casework"
        title="Cases"
        description="Search, filter, and open your assigned referrals."
        icon={FolderKanban}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="app-panel-soft rounded-[1.35rem] border border-line/80 bg-surface px-5 py-5">
          <p className="app-kicker">Filtered results</p>
          <p className="mt-3 font-display text-3xl text-ink">{filtered.length}</p>
          <p className="mt-3 text-sm text-ink-soft">Use search and status filters to focus your queue.</p>
        </div>
        <div className="app-panel-soft rounded-[1.35rem] border border-line/80 bg-surface px-5 py-5">
          <p className="app-kicker">Scheduled sessions</p>
          <p className="mt-3 font-display text-3xl text-ink">{scheduledCount}</p>
          <p className="mt-3 text-sm text-ink-soft">Cases already lined up for mediation or specialist review.</p>
        </div>
        <div className="app-panel-soft rounded-[1.35rem] border border-line/80 bg-surface px-5 py-5">
          <p className="app-kicker">Value on this page</p>
          <p className="mt-3 font-display text-3xl text-ink">{formatCurrency(valueOnPage)}</p>
          <p className="mt-3 text-sm text-ink-soft">{paidCount} paid booking{paidCount === 1 ? "" : "s"} in the filtered set.</p>
        </div>
      </div>

      <AdminSectionCard
        icon={Search}
        title="Case queue"
        description="Filter your queue and jump into the right case quickly."
      >
        <form className="space-y-4" method="get">
          <AdminFiltersPanel className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_220px_220px_auto]">
              <Input name="q" placeholder="Search case ID, request summary, or status" defaultValue={typeof searchParams.q === "string" ? searchParams.q : ""} />

              <select
                name="status"
                defaultValue={statusFilter}
                className="h-11 w-full rounded-2xl border border-input bg-surface px-4 text-sm text-ink transition-[border-color,box-shadow,background-color] duration-200 outline-none hover:border-brand/18 hover:bg-white focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="session_scheduled">Session scheduled</option>
                <option value="recommendation_submitted">Recommendation submitted</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                name="payment"
                defaultValue={paymentFilter}
                className="h-11 w-full rounded-2xl border border-input bg-surface px-4 text-sm text-ink transition-[border-color,box-shadow,background-color] duration-200 outline-none hover:border-brand/18 hover:bg-white focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="all">All payment paths</option>
                <option value="request_only">Request only</option>
                <option value="mediator_assist">Mediator Assist</option>
                <option value="connect_checkout">Marketplace payment</option>
                <option value="solicitor_off_platform">Solicitor off-platform</option>
              </select>

              <div className="flex gap-2">
                <Button type="submit">Apply</Button>
                <Button asChild type="button" variant="outline">
                  <Link href={getStrictLocalizedPath(locale, "/professional/cases")}>Reset</Link>
                </Button>
              </div>
            </div>
          </AdminFiltersPanel>
        </form>

        <ProfessionalReferralsTable
          rows={rows}
          emptyTitle="No cases match these filters"
          emptyCopy="Try widening the search, clearing filters, or waiting for new referrals to be assigned."
        />

        <AdminPagination
          pathname={getStrictLocalizedPath(locale, "/professional/cases")}
          page={page}
          totalPages={totalPages}
          searchParams={searchParams}
        />
      </AdminSectionCard>
    </div>
  );
}
