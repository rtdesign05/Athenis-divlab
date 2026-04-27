import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  billingApi,
  recurringApi,
  type InvoiceListParams,
  type CreateInvoiceDto,
  type InvoiceStatus,
  type CreateRecurringDto,
} from '@/services/billingApi'
import { toSafeAmount } from '@/shared/utils/currency'

export const BILLING_KEYS = {
  all:       ['invoices'] as const,
  list:      (p?: InvoiceListParams) => ['invoices', 'list', p ?? {}] as const,
  detail:    (id: string)            => ['invoices', 'detail', id] as const,
  dashboard: ['invoices', 'dashboard'] as const,
  cashFlow:  ['invoices', 'cash-flow'] as const,
  reminders: ['invoices', 'reminders'] as const,
  recurring: ['invoices', 'recurring'] as const,
}

export function useInvoices(params?: InvoiceListParams) {
  return useQuery({
    queryKey: BILLING_KEYS.list(params),
    queryFn:  () => billingApi.list(params),
    select: (data) => ({
      ...data,
      totalAmount: data.items.reduce((s, i) => s + toSafeAmount(i.total), 0),
      paidAmount:  data.items.filter(i => i.status === 'PAID').reduce((s, i) => s + toSafeAmount(i.total), 0),
      totalPages:  data.page,
    }),
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: BILLING_KEYS.detail(id),
    queryFn:  () => billingApi.get(id),
    enabled:  !!id,
  })
}

export function useDashboardStats() {
  return useQuery({
    queryKey: BILLING_KEYS.dashboard,
    queryFn:  () => billingApi.dashboard(),
    staleTime: 60_000,
  })
}

export function useCashFlow() {
  return useQuery({
    queryKey: BILLING_KEYS.cashFlow,
    queryFn:  () => billingApi.cashFlow(),
    staleTime: 5 * 60_000,
  })
}

export function useReminders() {
  return useQuery({
    queryKey: BILLING_KEYS.reminders,
    queryFn:  () => billingApi.reminders(),
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateInvoiceDto) => billingApi.create(dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: BILLING_KEYS.all }),
  })
}

export function useUpdateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateInvoiceDto> }) => billingApi.update(id, dto),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: BILLING_KEYS.all })
      qc.invalidateQueries({ queryKey: BILLING_KEYS.detail(id) })
    },
  })
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) => billingApi.updateStatus(id, status),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: BILLING_KEYS.all })
      qc.invalidateQueries({ queryKey: BILLING_KEYS.dashboard })
    },
  })
}

export function useDeleteInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => billingApi.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: BILLING_KEYS.all }),
  })
}

// ── Recurring ─────────────────────────────────────────────────────────────────

export function useRecurringInvoices() {
  return useQuery({
    queryKey: BILLING_KEYS.recurring,
    queryFn:  () => recurringApi.list(),
  })
}

export function useCreateRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateRecurringDto) => recurringApi.create(dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: BILLING_KEYS.recurring }),
  })
}

export function useUpdateRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateRecurringDto> & { active?: boolean } }) =>
      recurringApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: BILLING_KEYS.recurring }),
  })
}

export function useDeleteRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => recurringApi.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: BILLING_KEYS.recurring }),
  })
}

export function useGenerateFromRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => recurringApi.generate(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: BILLING_KEYS.all })
      qc.invalidateQueries({ queryKey: BILLING_KEYS.recurring })
    },
  })
}
