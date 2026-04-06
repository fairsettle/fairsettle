"use client";

import { AlertCircle, Loader2, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type AsyncStateCardProps = {
  title: string;
  body?: string;
  variant?: "loading" | "error";
  icon?: LucideIcon;
};

export function AsyncStateCard({
  title,
  body,
  variant = "loading",
  icon: Icon,
}: AsyncStateCardProps) {
  const ResolvedIcon = Icon ?? (variant === "error" ? AlertCircle : Loader2);

  return (
    <Card className="app-panel">
      <CardContent className="space-y-4 p-6">
        <div className="app-icon-chip">
          <ResolvedIcon
            className={variant === "loading" ? "size-5 animate-spin" : "size-5"}
          />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl text-ink">{title}</h2>
          {body ? (
            <p className="text-sm leading-6 text-ink-soft">{body}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
