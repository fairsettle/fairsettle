"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DASHBOARD_PAGE_SIZE_OPTIONS,
  type DashboardQuery,
} from "@/lib/cases/dashboard-search";

export function DashboardFiltersBar({
  filters,
  resultCount,
  totalCount,
  onCaseTypeChange,
  onPageSizeChange,
  onRoleChange,
  onSearchChange,
  onStatusChange,
}: {
  filters: DashboardQuery;
  resultCount: number;
  totalCount: number;
  onCaseTypeChange: (value: DashboardQuery["caseType"]) => void;
  onPageSizeChange: (value: number) => void;
  onRoleChange: (value: DashboardQuery["role"]) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: DashboardQuery["status"]) => void;
}) {
  const t = useTranslations();

  return (
    <div className="app-panel-soft p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-xs lg:flex-none">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
          <Input
            className="h-9 rounded-xl pl-10 text-sm"
            placeholder={t("dashboard.searchPlaceholder")}
            value={filters.q}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            <Select
              value={filters.status}
              onValueChange={(value) =>
                onStatusChange(value as DashboardQuery["status"])
              }
            >
              <SelectTrigger className="w-full sm:w-auto sm:min-w-[10rem]" size="sm">
                <SelectValue placeholder={t("dashboard.filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("dashboard.filterAllStatuses")}</SelectItem>
                <SelectItem value="draft">{t("caseStatus.draft")}</SelectItem>
                <SelectItem value="invited">{t("caseStatus.invited")}</SelectItem>
                <SelectItem value="active">{t("caseStatus.active")}</SelectItem>
                <SelectItem value="comparison">{t("caseStatus.comparison")}</SelectItem>
                <SelectItem value="completed">{t("caseStatus.completed")}</SelectItem>
                <SelectItem value="expired">{t("caseStatus.expired")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.caseType}
              onValueChange={(value) =>
                onCaseTypeChange(value as DashboardQuery["caseType"])
              }
            >
              <SelectTrigger className="w-full sm:w-auto sm:min-w-[10rem]" size="sm">
                <SelectValue placeholder={t("dashboard.filterCaseType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("dashboard.filterAllCaseTypes")}</SelectItem>
                <SelectItem value="child">{t("caseTypes.child")}</SelectItem>
                <SelectItem value="financial">{t("caseTypes.financial")}</SelectItem>
                <SelectItem value="asset">{t("caseTypes.asset")}</SelectItem>
                <SelectItem value="combined">{t("caseTypes.combined")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.role}
              onValueChange={(value) =>
                onRoleChange(value as DashboardQuery["role"])
              }
            >
              <SelectTrigger className="w-full sm:w-auto sm:min-w-[8.5rem]" size="sm">
                <SelectValue placeholder={t("dashboard.filterRole")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("dashboard.filterAllRoles")}</SelectItem>
                <SelectItem value="initiator">{t("dashboard.roleInitiator")}</SelectItem>
                <SelectItem value="responder">{t("dashboard.roleResponder")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={String(filters.pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="w-full sm:w-auto sm:min-w-[7.5rem]" size="sm">
                <SelectValue placeholder={t("dashboard.pageSize")} />
              </SelectTrigger>
              <SelectContent>
                {DASHBOARD_PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {t("dashboard.pageSizeOption", { count: option })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="shrink-0 text-sm text-ink-soft lg:text-right">
          {t("dashboard.resultsCount", {
            shown: resultCount,
            total: totalCount,
          })}
        </p>
      </div>
    </div>
  );
}
