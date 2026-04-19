import { api } from '@/lib/api'

export type ExpenseCategory =
  | 'SOFTWARE' | 'TRAVEL' | 'EQUIPMENT' | 'MARKETING'
  | 'CONSULTING' | 'SALARY' | 'RENT' | 'OTHER'

export interface Expense {
  id: string
  date: string
  category: ExpenseCategory
  description: string
  amount: string
  tva: string
  receiptUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface ExpenseStats {
  byCategory: { category: ExpenseCategory; total: string }[]
  totalHT: string
  totalTVA: string
}

export interface CreateExpenseDto {
  date: string
  category: ExpenseCategory
  description: string
  amount: number
  tva?: number
  receiptUrl?: string
}

export type UpdateExpenseDto = Partial<CreateExpenseDto>

const d = <T>(r: { data: { data: T } }) => r.data.data

export const expensesApi = {
  list:   (category?: ExpenseCategory) => api.get<{ data: Expense[] }>('/expenses', { params: category ? { category } : undefined }).then(d),
  stats:  ()                            => api.get<{ data: ExpenseStats }>('/expenses/stats').then(d),
  get:    (id: string)                  => api.get<{ data: Expense }>(`/expenses/${id}`).then(d),
  create: (dto: CreateExpenseDto)       => api.post<{ data: Expense }>('/expenses', dto).then(d),
  update: (id: string, dto: UpdateExpenseDto) => api.patch<{ data: Expense }>(`/expenses/${id}`, dto).then(d),
  remove: (id: string)                  => api.delete(`/expenses/${id}`),
}
