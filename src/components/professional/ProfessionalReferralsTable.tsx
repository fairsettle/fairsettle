import Link from "next/link";

import { ReferralStatusBadge } from "@/components/professional/ReferralStatusBadge";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  formatDateTime,
  formatPaymentModel,
} from "@/lib/professional/presentation";

export type ProfessionalReferralRow = {
  id: string;
  caseId: string;
  status: string;
  paymentModel: string;
  createdAt: string;
  scheduledFor: string | null;
  paymentAmount: number | null;
  payoutAmount: number | null;
  requesterSummary: string;
  detailHref: string;
};

export function ProfessionalReferralsTable({
  rows,
  emptyTitle,
  emptyCopy,
}: {
  rows: ProfessionalReferralRow[];
  emptyTitle: string;
  emptyCopy: string;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-line bg-surface-soft/60 px-6 py-12 text-center">
        <p className="font-medium text-ink">{emptyTitle}</p>
        <p className="mt-2 text-sm text-ink-soft">{emptyCopy}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {rows.map((row) => (
        <article
          key={row.id}
          className="rounded-[1.6rem] border border-line/80 bg-surface p-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)] transition-colors hover:bg-surface-soft/40"
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="max-w-full break-all text-base font-medium text-ink">Case {row.caseId}</p>
                <span className="rounded-full bg-surface-soft px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">
                  {formatPaymentModel(row.paymentModel)}
                </span>
              </div>
              <p className="text-sm leading-6 text-ink-soft">{row.requesterSummary}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <ReferralStatusBadge status={row.status} />
              <Button asChild>
                <Link href={row.detailHref}>Open case</Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.15rem] border border-line/70 bg-surface-soft/65 px-4 py-3">
              <p className="app-kicker">Created</p>
              <p className="mt-2 text-sm font-medium text-ink">{formatDateTime(row.createdAt)}</p>
            </div>
            <div className="rounded-[1.15rem] border border-line/70 bg-surface-soft/65 px-4 py-3">
              <p className="app-kicker">Session</p>
              <p className="mt-2 text-sm font-medium text-ink">{formatDateTime(row.scheduledFor)}</p>
            </div>
            <div className="rounded-[1.15rem] border border-line/70 bg-surface-soft/65 px-4 py-3">
              <p className="app-kicker">Amount</p>
              <p className="mt-2 text-sm font-medium text-ink">Gross {formatCurrency(row.paymentAmount)}</p>
              <p className="mt-1 text-sm text-ink-soft">Payout {formatCurrency(row.payoutAmount)}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
