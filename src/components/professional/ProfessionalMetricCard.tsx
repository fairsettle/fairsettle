import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ProfessionalMetricCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: "brand" | "success" | "warning" | "neutral";
}) {
  const accentClass =
    accent === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : accent === "warning"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : accent === "brand"
          ? "bg-brand-soft text-brand-strong border-brand/15"
          : "bg-surface-soft text-ink-soft border-line/70";

  return (
    <Card size="sm" className="app-panel h-full overflow-visible">
      <CardHeader className="gap-1 border-b border-line/70 pb-4">
        <p className="app-kicker">{label}</p>
      </CardHeader>
      <CardContent className="space-y-3 pb-5 pt-5 sm:pb-6">
        <p className="font-display text-3xl leading-none text-ink sm:text-[2rem]">{value}</p>
      {detail ? (
        <p className={cn("rounded-[1rem] border px-3 py-2 text-xs font-medium uppercase tracking-[0.18em]", accentClass)}>
          {detail}
        </p>
      ) : null}
      </CardContent>
    </Card>
  );
}
