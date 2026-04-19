import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi, type ExpenseCategory, type CreateExpenseDto, type UpdateExpenseDto } from '@/services/expensesApi'
import { toSafeAmount } from '@/shared/utils/currency'

export const EXPENSE_KEYS = {
  all:    ['expenses'] as const,
  list:   (cat?: ExpenseCategory) => ['expenses', 'list', cat ?? 'all'] as const,
  stats:  ()                      => ['expenses', 'stats'] as const,
  detail: (id: string)            => ['expenses', 'detail', id] as const,
}

export function useExpenses(category?: ExpenseCategory) {
  return useQuery({
    queryKey: EXPENSE_KEYS.list(category),
    queryFn:  () => expensesApi.list(category),
    select:   (data) => ({
      items:    data,
      totalHT:  data.reduce((s, e) => s + toSafeAmount(e.amount), 0),
      totalTVA: data.reduce((s, e) => s + toSafeAmount(e.tva), 0),
    }),
  })
}

export function useExpenseStats() {
  return useQuery({
    queryKey: EXPENSE_KEYS.stats(),
    queryFn:  expensesApi.stats,
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateExpenseDto) => expensesApi.create(dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: EXPENSE_KEYS.all }),
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateExpenseDto }) => expensesApi.update(id, dto),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: EXPENSE_KEYS.all })
      qc.invalidateQueries({ queryKey: EXPENSE_KEYS.detail(id) })
    },
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: EXPENSE_KEYS.all }),
  })
}
