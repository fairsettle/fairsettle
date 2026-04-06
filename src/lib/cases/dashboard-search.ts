import { z } from "zod";

import type { CaseStatus, CaseType } from "@/types/core";
import type { DashboardRoleFilter } from "@/types/dashboard";

export const DASHBOARD_DEFAULT_PAGE_SIZE = 12;
export const DASHBOARD_PAGE_SIZE_OPTIONS = [12, 24, 48] as const;

const dashboardQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z
    .enum(["all", "draft", "invited", "active", "comparison", "completed", "expired"])
    .optional(),
  caseType: z.enum(["all", "child", "financial", "asset", "combined"]).optional(),
  role: z.enum(["all", "initiator", "responder"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce
    .number()
    .int()
    .refine(
      (value) =>
        DASHBOARD_PAGE_SIZE_OPTIONS.includes(
          value as (typeof DASHBOARD_PAGE_SIZE_OPTIONS)[number],
        ),
    )
    .optional(),
});

export type DashboardQuery = {
  q: string;
  status: "all" | CaseStatus;
  caseType: "all" | CaseType;
  role: DashboardRoleFilter;
  page: number;
  pageSize: number;
};

export function parseDashboardQuery(searchParams: URLSearchParams): DashboardQuery {
  const parsed = dashboardQuerySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    caseType: searchParams.get("caseType") ?? undefined,
    role: searchParams.get("role") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return {
      q: "",
      status: "all",
      caseType: "all",
      role: "all",
      page: 1,
      pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
    };
  }

  return {
    q: parsed.data.q ?? "",
    status: parsed.data.status ?? "all",
    caseType: parsed.data.caseType ?? "all",
    role: parsed.data.role ?? "all",
    page: parsed.data.page ?? 1,
    pageSize: parsed.data.pageSize ?? DASHBOARD_DEFAULT_PAGE_SIZE,
  };
}

export function caseMatchesDashboardQuery(
  caseItem: {
    id: string;
    case_type: CaseType;
    status: CaseStatus;
    viewer_role: "initiator" | "responder";
  },
  query: DashboardQuery,
) {
  if (query.status !== "all" && caseItem.status !== query.status) {
    return false;
  }

  if (query.caseType !== "all" && caseItem.case_type !== query.caseType) {
    return false;
  }

  if (query.role !== "all" && caseItem.viewer_role !== query.role) {
    return false;
  }

  if (!query.q) {
    return true;
  }

  const haystack = [
    caseItem.id,
    caseItem.case_type,
    caseItem.status,
    caseItem.viewer_role,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.q.toLowerCase());
}
