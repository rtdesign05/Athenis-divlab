import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quotesApi, type QuoteListParams, type CreateQuoteDto, type QuoteStatus } from '@/services/billingApi'
import { BILLING_KEYS } from '@/hooks/useBilling'

export const QUOTE_KEYS = {
  all:    ['quotes'] as const,
  list:   (p?: QuoteListParams) => ['quotes', 'list', p ?? {}] as const,
  detail: (id: string)          => ['quotes', 'detail', id] as const,
}

export function useQuotes(params?: QuoteListParams) {
  return useQuery({
    queryKey: QUOTE_KEYS.list(params),
    queryFn:  () => quotesApi.list(params),
  })
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: QUOTE_KEYS.detail(id),
    queryFn:  () => quotesApi.get(id),
    enabled:  !!id,
  })
}

export function useCreateQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateQuoteDto) => quotesApi.create(dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QUOTE_KEYS.all }),
  })
}

export function useUpdateQuoteStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) => quotesApi.updateStatus(id, status),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QUOTE_KEYS.all }),
  })
}

export function useConvertQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quotesApi.convert(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: QUOTE_KEYS.all })
      qc.invalidateQueries({ queryKey: BILLING_KEYS.all })
    },
  })
}

export function useDeleteQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quotesApi.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QUOTE_KEYS.all }),
  })
}
