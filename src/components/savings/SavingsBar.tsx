"use client";

import { useTranslations } from "next-intl";

import type { SavingsData } from "@/lib/savings/calculator";
import { calculateSavings } from "@/lib/savings/calculator";

export function SavingsBar({
  stage,
  tier = "standard",
  snapshot,
}: {
  stage?: number;
  tier?: "standard" | "resolution";
  snapshot?: SavingsData;
}) {
  const t = useTranslations();
  const savings = snapshot ?? calculateSavings(stage ?? 0, tier);
  const formatCurrency = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  });

  return (
    <div className="rounded-[1.75rem] border border-brand/10 bg-[linear-gradient(135deg,rgba(6,78,59,0.96),rgba(13,148,136,0.94))] p-5 text-white shadow-[0_22px_60px_rgba(15,118,110,0.24)]">
      <div className="grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-white/70">{t("savings.solicitorRoute")}</p>
          <p className="mt-2 text-xl font-semibold text-white/95 line-through decoration-[#f7cb7d] decoration-2">
            {formatCurrency.format(savings.solicitorTotal)}
          </p>
        </div>
        <div>
          <p className="text-white/70">{t("savings.fairsettle")}</p>
          <p className="mt-2 text-xl font-semibold text-white">
            {formatCurrency.format(savings.fairSettleTotal)}
          </p>
        </div>
        <div>
          <p className="text-white/70">{t("savings.savedLabel")}</p>
          <p className="mt-2 text-xl font-semibold text-[#ddf8ec]">
            {t("savings.youveSaved", {
              amount: formatCurrency.format(savings.saved),
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
