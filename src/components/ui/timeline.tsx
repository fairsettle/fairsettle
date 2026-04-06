"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, Check, Clock, X } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const timelineVariants = cva("relative flex flex-col", {
  variants: {
    variant: {
      default: "gap-4",
      compact: "gap-2",
      spacious: "gap-8",
    },
    orientation: {
      vertical: "flex-col",
      horizontal: "flex-row",
    },
  },
  defaultVariants: {
    variant: "default",
    orientation: "vertical",
  },
});

const timelineItemVariants = cva("relative flex gap-3 pb-2", {
  variants: {
    orientation: {
      vertical: "flex-row",
      horizontal: "min-w-64 shrink-0 flex-col",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});

const timelineConnectorVariants = cva("bg-border", {
  variants: {
    orientation: {
      vertical: "absolute left-3 top-9 h-full w-px",
      horizontal: "absolute left-8 top-3 h-px w-full",
    },
    status: {
      default: "bg-border",
      completed: "bg-primary",
      active: "bg-primary",
      pending: "bg-muted-foreground/30",
      error: "bg-destructive",
    },
  },
  defaultVariants: {
    orientation: "vertical",
    status: "default",
  },
});

const timelineIconVariants = cva(
  "flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-background text-xs font-medium",
  {
    variants: {
      status: {
        default: "border-border text-muted-foreground",
        completed: "border-primary bg-primary text-primary-foreground",
        active:
          "animate-pulse border-primary bg-background text-primary",
        pending: "border-muted-foreground/30 text-muted-foreground",
        error:
          "border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      status: "default",
    },
  },
);

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp?: string | Date;
  status?: "default" | "completed" | "active" | "pending" | "error";
  icon?: React.ReactNode;
  content?: React.ReactNode;
  metadata?: Record<string, unknown>;
}

export interface TimelineProps extends VariantProps<typeof timelineVariants> {
  items: TimelineItem[];
  className?: string;
  locale?: string;
  showConnectors?: boolean;
  showTimestamps?: boolean;
  timestampPosition?: "top" | "bottom" | "inline";
}

function getStatusIcon(status: TimelineItem["status"]) {
  switch (status) {
    case "completed":
      return <Check className="h-3 w-3" />;
    case "active":
    case "pending":
      return <Clock className="h-3 w-3" />;
    case "error":
      return <X className="h-3 w-3" />;
    default:
      return <div className="h-2 w-2 rounded-full bg-current" />;
  }
}

function formatTimestamp(timestamp: string | Date, locale?: string): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Timeline({
  items,
  className,
  locale,
  variant,
  orientation = "vertical",
  showConnectors = true,
  showTimestamps = true,
  timestampPosition = "top",
}: TimelineProps) {
  const timelineContent = (
    <div
      className={cn(
        timelineVariants({ variant, orientation }),
        orientation === "horizontal" ? "pb-4" : "",
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          className={cn(timelineItemVariants({ orientation }))}
        >
          {showConnectors && index < items.length - 1 ? (
            <div
              className={cn(
                timelineConnectorVariants({
                  orientation,
                  status: item.status,
                }),
              )}
            />
          ) : null}

          <div className="relative z-10 flex shrink-0">
            <div className={cn(timelineIconVariants({ status: item.status }))}>
              {item.icon ?? getStatusIcon(item.status)}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {showTimestamps &&
            timestampPosition === "top" &&
            item.timestamp ? (
                <time className="text-xs text-muted-foreground">
                {formatTimestamp(item.timestamp, locale)}
              </time>
            ) : null}

            <div className="flex items-start justify-between gap-2">
              <h3 className="leading-tight font-medium">{item.title}</h3>
              {showTimestamps &&
              timestampPosition === "inline" &&
              item.timestamp ? (
                <time className="shrink-0 text-xs text-muted-foreground">
                  {formatTimestamp(item.timestamp, locale)}
                </time>
              ) : null}
            </div>

            {item.description ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            ) : null}

            {item.content ? <div className="mt-3">{item.content}</div> : null}

            {showTimestamps &&
            timestampPosition === "bottom" &&
            item.timestamp ? (
              <time className="text-xs text-muted-foreground">
                {formatTimestamp(item.timestamp, locale)}
              </time>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );

  if (orientation === "horizontal") {
    return (
      <ScrollArea className={cn("w-full", className)} orientation="horizontal">
        {timelineContent}
      </ScrollArea>
    );
  }

  if (!items.length) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        <AlertCircle className="mr-2 inline size-4 align-text-bottom" />
        No timeline items available.
      </div>
    );
  }

  return <div className={className}>{timelineContent}</div>;
}

export {
  timelineConnectorVariants,
  timelineIconVariants,
  timelineItemVariants,
  timelineVariants,
};
