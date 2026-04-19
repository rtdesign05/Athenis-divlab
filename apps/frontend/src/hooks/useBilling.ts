import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi, type InvoiceListParams, type CreateInvoiceDto, type UpdateInvoiceDto, type InvoiceStatus } from '@/services/billingApi'
import { toSafeAmount } from '@/shared/utils/currency'

export const BILLING_KEYS = {
  all:    ['invoices'] as const,
  list:   (p?: InvoiceListParams) => ['invoices', 'list', p ?? {}] as const,
  detail: (id: string)            => ['invoices', 'detail', id] as const,
}

export function useInvoices(params?: InvoiceListParams) {
  return useQuery({
    queryKey: BILLING_KEYS.list(params),
    queryFn:  () => billingApi.list(params),
    select: (data) => ({
      ...data,
      totalAmount: data.items.reduce((s, i) => s + toSafeAmount(i.total), 0),
      paidAmount:  data.items.filter(i => i.status === 'PAID').reduce((s, i) => s + toSafeAmount(i.total), 0),
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
    mutationFn: ({ id, dto }: { id: string; dto: UpdateInvoiceDto }) => billingApi.update(id, dto),
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
    onSuccess:  () => qc.invalidateQueries({ queryKey: BILLING_KEYS.all }),
  })
}

export function useDeleteInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => billingApi.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: BILLING_KEYS.all }),
  })
}
