import { format, parseISO, isValid, differenceInCalendarDays } from 'date-fns'
import { fr } from 'date-fns/locale'

export function toSafeDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = typeof value === 'string' ? parseISO(value) : value
  return isValid(d) ? d : null
}

export function formatDate(
  value: string | Date | null | undefined,
  pattern = 'dd/MM/yyyy',
): string {
  const d = toSafeDate(value)
  if (!d) return '—'
  return format(d, pattern, { locale: fr })
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, 'dd/MM/yyyy HH:mm')
}

export function getDaysOverdue(dueDate: string | Date | null | undefined): number {
  const d = toSafeDate(dueDate)
  if (!d) return 0
  return Math.max(0, differenceInCalendarDays(new Date(), d))
}

export function isOverdue(dueDate: string | Date | null | undefined): boolean {
  return getDaysOverdue(dueDate) > 0
}
