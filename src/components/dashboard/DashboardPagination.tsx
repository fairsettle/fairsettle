"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function DashboardPagination({
  currentPage,
  hasNextPage,
  hasPreviousPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink-soft">
        {t("dashboard.pageSummary", {
          page: currentPage,
          totalPages,
        })}
      </p>
      <div className="flex items-center gap-3">
        <Button
          disabled={!hasPreviousPage}
          type="button"
          variant="outline"
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="mr-2 size-4" />
          {t("dashboard.previousPage")}
        </Button>
        <Button
          disabled={!hasNextPage}
          type="button"
          variant="outline"
          onClick={() => onPageChange(currentPage + 1)}
        >
          {t("dashboard.nextPage")}
          <ChevronRight className="ml-2 size-4" />
        </Button>
      </div>
    </div>
  );
}
