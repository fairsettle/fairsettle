"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  Mail,
  MessageSquareReply,
  Upload,
  UserCheck,
  UserPen,
  XCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import type { TimelineEvent } from "@/types/timeline";

const TIMELINE_BATCH_SIZE = 10;

function getTimelineEventStatus(eventType: string): TimelineItem["status"] {
  if (eventType === "invitation_expired" || eventType === "case_expired") {
    return "error";
  }

  if (eventType === "reminder_sent") {
    return "pending";
  }

  return "completed";
}

function getTimelineEventIcon(eventType: string): ReactNode {
  switch (eventType) {
    case "case_created":
      return <FileText className="h-3 w-3" />;
    case "questions_started":
      return <Clock3 className="h-3 w-3" />;
    case "questions_completed":
      return <FileCheck2 className="h-3 w-3" />;
    case "invitation_sent":
      return <Mail className="h-3 w-3" />;
    case "invitation_opened":
      return <BellRing className="h-3 w-3" />;
    case "invitation_accepted":
      return <UserCheck className="h-3 w-3" />;
    case "invitation_expired":
      return <XCircle className="h-3 w-3" />;
    case "reminder_sent":
      return <BellRing className="h-3 w-3" />;
    case "responder_started":
      return <UserPen className="h-3 w-3" />;
    case "responder_completed":
      return <CheckCircle2 className="h-3 w-3" />;
    case "comparison_generated":
      return <MessageSquareReply className="h-3 w-3" />;
    case "resolution_accepted":
      return <CheckCircle2 className="h-3 w-3" />;
    case "resolution_modified":
      return <UserPen className="h-3 w-3" />;
    case "resolution_rejected":
      return <XCircle className="h-3 w-3" />;
    case "document_uploaded":
      return <Upload className="h-3 w-3" />;
    case "export_purchased":
      return <FileCheck2 className="h-3 w-3" />;
    case "export_downloaded":
      return <Download className="h-3 w-3" />;
    case "case_expired":
      return <XCircle className="h-3 w-3" />;
    default:
      return <Clock3 className="h-3 w-3" />;
  }
}

export function CaseTimeline({ events }: { events: TimelineEvent[] }) {
  const locale = useLocale();
  const t = useTranslations();
  const [visibleCount, setVisibleCount] = useState(TIMELINE_BATCH_SIZE);

  const items: TimelineItem[] = useMemo(
    () =>
      [...events]
        .reverse()
        .map((event) => ({
          id: `${event.event_type}-${event.created_at}`,
          title: t(`timeline.events.${event.event_type}`),
          timestamp: event.created_at,
          status: getTimelineEventStatus(event.event_type),
          icon: getTimelineEventIcon(event.event_type),
        })),
    [events, t],
  );

  useEffect(() => {
    setVisibleCount(TIMELINE_BATCH_SIZE);
  }, [events]);

  const visibleItems = items.slice(0, visibleCount);
  const canShowMore = visibleCount < items.length;
  const hasExpanded = visibleCount > TIMELINE_BATCH_SIZE;

  return (
    <Card className="app-panel">
      <CardContent className="space-y-6 p-6">
        <div className="space-y-2">
          <h2 className="font-display text-3xl text-ink">{t("timeline.title")}</h2>
          <p className="text-sm leading-6 text-ink-soft">
            {t("timeline.subtitle")}
          </p>
        </div>

        {items.length === 0 ? (
          <p className="app-note bg-surface-soft px-4 py-3 text-sm">
            {t("timeline.empty")}
          </p>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-soft">
                {t("timeline.showingCount", {
                  shown: visibleItems.length,
                  total: items.length,
                })}
              </p>
            </div>

            <Timeline
              items={visibleItems}
              locale={locale}
              timestampPosition="inline"
              variant="spacious"
            />

            {canShowMore || hasExpanded ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                {hasExpanded ? (
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => setVisibleCount(TIMELINE_BATCH_SIZE)}
                  >
                    {t("timeline.showLess")}
                  </Button>
                ) : null}

                {canShowMore ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setVisibleCount((current) =>
                        Math.min(current + TIMELINE_BATCH_SIZE, items.length),
                      )
                    }
                  >
                    {t("timeline.showMore", {
                      count: Math.min(TIMELINE_BATCH_SIZE, items.length - visibleCount),
                    })}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
