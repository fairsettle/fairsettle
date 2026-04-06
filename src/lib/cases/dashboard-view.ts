import { getLocalizedPath } from "@/lib/locale-path";
import type { DashboardCase } from "@/types/dashboard";

export function getDashboardNextStepKey(caseItem: DashboardCase) {
  if (caseItem.status === "active") {
    switch (caseItem.flow_state) {
      case "continue_next_phase":
        return "dashboard.nextStepContinueNextPhase";
      case "waiting_for_responder":
        return "dashboard.nextStepWaitingForResponder";
      case "continue_response":
        return "dashboard.nextStepContinueResponse";
      case "waiting_for_next_phase":
        return "dashboard.nextStepWaitingForNextPhase";
      default:
        break;
    }
  }

  switch (caseItem.status) {
    case "draft":
      return "dashboard.nextStepDraft";
    case "invited":
      return "dashboard.nextStepInvited";
    case "active":
      return caseItem.viewer_role === "initiator"
        ? "dashboard.nextStepActiveInitiator"
        : "dashboard.nextStepActiveResponder";
    case "comparison":
      return "dashboard.nextStepComparison";
    case "completed":
      return "dashboard.nextStepCompleted";
    case "expired":
    default:
      return "dashboard.nextStepExpired";
  }
}

export function getDashboardCaseHref(locale: string, caseItem: DashboardCase) {
  switch (caseItem.status) {
    case "invited":
      return getLocalizedPath(locale, `/cases/${caseItem.id}/invite`);
    case "active":
      if (caseItem.flow_state === "continue_next_phase") {
        return getLocalizedPath(locale, `/cases/${caseItem.id}/questions`);
      }

      if (
        caseItem.flow_state === "continue_response" ||
        caseItem.flow_state === "waiting_for_next_phase"
      ) {
        return getLocalizedPath(locale, `/cases/${caseItem.id}/questions`);
      }

      return caseItem.viewer_role === "initiator"
        ? getLocalizedPath(locale, `/cases/${caseItem.id}/invite`)
        : getLocalizedPath(locale, `/cases/${caseItem.id}/questions`);
    case "comparison":
    case "completed":
      return getLocalizedPath(locale, `/cases/${caseItem.id}/comparison`);
    case "expired":
      return getLocalizedPath(locale, `/cases/${caseItem.id}/export`);
    case "draft":
    default:
      return getLocalizedPath(locale, `/cases/${caseItem.id}/questions`);
  }
}

export function getDashboardCaseActionKey(caseItem: DashboardCase) {
  if (caseItem.status === "active") {
    switch (caseItem.flow_state) {
      case "continue_next_phase":
        return "dashboard.actionContinueNextPhase";
      case "waiting_for_responder":
        return "dashboard.actionWaitingForResponder";
      case "continue_response":
        return "dashboard.actionContinueResponse";
      case "waiting_for_next_phase":
        return "dashboard.actionWaitingForNextPhase";
      default:
        break;
    }
  }

  switch (caseItem.status) {
    case "draft":
      return "dashboard.actionDraft";
    case "invited":
      return "dashboard.actionInvited";
    case "active":
      return caseItem.viewer_role === "initiator"
        ? "dashboard.actionActiveInitiator"
        : "dashboard.actionActiveResponder";
    case "comparison":
      return "dashboard.actionComparison";
    case "completed":
      return "dashboard.actionCompleted";
    case "expired":
    default:
      return "dashboard.actionExpired";
  }
}

export function getDashboardStatusBadgeClasses(status: DashboardCase["status"]) {
  switch (status) {
    case "active":
    case "completed":
      return "border-success/10 bg-success-soft text-success";
    case "comparison":
      return "border-brand/10 bg-brand-soft text-brand-strong";
    case "expired":
      return "border-danger/10 bg-danger-soft text-danger";
    case "draft":
      return "border-line bg-surface-soft text-ink-soft";
    case "invited":
    default:
      return "border-warning/10 bg-warning-soft text-warning";
  }
}
