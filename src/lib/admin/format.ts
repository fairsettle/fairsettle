import { format } from 'date-fns'

export function formatCaseReference(caseId: string) {
  return `FS-${caseId.replaceAll('-', '').slice(0, 8).toUpperCase()}`
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatAdminDate(date: string | Date) {
  return format(new Date(date), 'd MMM yyyy')
}

export function formatAdminDateTime(date: string | Date) {
  return format(new Date(date), 'd MMM yyyy, HH:mm')
}
