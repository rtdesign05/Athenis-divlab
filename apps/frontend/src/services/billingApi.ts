import { api } from '@/lib/api'

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
export type QuoteStatus   = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED'
export type RecurringFrequency = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'

export interface Invoice {
  id: string
  number: string
  clientId: string | null
  client: { id: string; name: string; email: string | null } | null
  status: InvoiceStatus
  subtotal: string
  taxRate: string
  taxAmount: string
  total: string
  issueDate: string
  dueDate: string
  paidAt: string | null
  notes: string | null
  quoteId: string | null
  recurringInvoiceId: string | null
  createdAt: string
  updatedAt: string
}

export interface InvoiceWithReminder extends Invoice {
  daysOverdue: number
  reminderLevel: 1 | 2 | 3 | null
}

export interface Quote {
  id: string
  number: string
  clientId: string
  client: { id: string; name: string; email: string | null } | null
  status: QuoteStatus
  subtotal: string
  taxRate: string
  taxAmount: string
  total: string
  issueDate: string
  validUntil: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface RecurringInvoice {
  id: string
  clientId: string
  client: { id: string; name: string; email: string | null } | null
  frequency: RecurringFrequency
  subtotal: string
  taxRate: string
  notes: string | null
  active: boolean
  nextDueDate: string
  createdAt: string
}

export interface InvoiceListParams {
  status?: InvoiceStatus
  clientId?: string
  page?: number
  limit?: number
}

export interface QuoteListParams {
  status?: QuoteStatus
  clientId?: string
  page?: number
  limit?: number
}

export interface CreateInvoiceDto {
  clientId: string
  subtotal: number
  taxRate?: number
  issueDate: string
  dueDate: string
  notes?: string
}

export interface CreateQuoteDto {
  clientId: string
  subtotal: number
  taxRate?: number
  issueDate: string
  validUntil: string
  notes?: string
}

export interface CreateRecurringDto {
  clientId: string
  frequency: RecurringFrequency
  subtotal: number
  taxRate?: number
  notes?: string
  nextDueDate: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface DashboardStats {
  revenue:       { current: number; previous: number; growth: number | null }
  grossProfit:   { amount: number; margin: number | null }
  dso:           number | null
  pendingAmount: number
  pendingCount:  number
  overdueAmount: number
  overdueCount:  number
}

export interface CashFlowWeek {
  label: string
  startDate: string
  expectedIncome: number
  expectedExpenses: number
  balance: number
  cumulative: number
}

export interface CashFlowForecast {
  weeks: CashFlowWeek[]
  summary: { totalExpectedIncome: number; totalExpectedExpenses: number; netCashFlow: number }
}

const d = <T>(r: { data: { data: T } }) => r.data.data

export const billingApi = {
  list:         (p?: InvoiceListParams) => api.get<{ data: Paginated<Invoice> }>('/invoices', { params: p }).then(d),
  get:          (id: string)            => api.get<{ data: Invoice }>(`/invoices/${id}`).then(d),
  create:       (dto: CreateInvoiceDto) => api.post<{ data: Invoice }>('/invoices', dto).then(d),
  update:       (id: string, dto: Partial<CreateInvoiceDto>) => api.patch<{ data: Invoice }>(`/invoices/${id}`, dto).then(d),
  updateStatus: (id: string, status: InvoiceStatus) => api.patch<{ data: Invoice }>(`/invoices/${id}/status`, { status }).then(d),
  remove:       (id: string)            => api.delete(`/invoices/${id}`),
  dashboard:    (params?: { from?: string; to?: string }) =>
    api.get<{ data: DashboardStats }>('/invoices/dashboard', { params }).then(d),
  cashFlow:     ()                      => api.get<{ data: CashFlowForecast }>('/invoices/cash-flow').then(d),
  reminders:    ()                      => api.get<{ data: InvoiceWithReminder[] }>('/invoices/reminders').then(d),
}

export const quotesApi = {
  list:    (p?: QuoteListParams)       => api.get<{ data: Paginated<Quote> }>('/quotes', { params: p }).then(d),
  get:     (id: string)                => api.get<{ data: Quote }>(`/quotes/${id}`).then(d),
  create:  (dto: CreateQuoteDto)       => api.post<{ data: Quote }>('/quotes', dto).then(d),
  update:  (id: string, dto: Partial<CreateQuoteDto>) => api.patch<{ data: Quote }>(`/quotes/${id}`, dto).then(d),
  updateStatus: (id: string, status: QuoteStatus) => api.patch<{ data: Quote }>(`/quotes/${id}/status`, { status }).then(d),
  convert: (id: string)                => api.post<{ data: Invoice }>(`/quotes/${id}/convert`).then(d),
  remove:  (id: string)                => api.delete(`/quotes/${id}`),
}

export const recurringApi = {
  list:     ()                               => api.get<{ data: RecurringInvoice[] }>('/invoices/recurring').then(d),
  create:   (dto: CreateRecurringDto)        => api.post<{ data: RecurringInvoice }>('/invoices/recurring', dto).then(d),
  update:   (id: string, dto: Partial<CreateRecurringDto> & { active?: boolean }) =>
    api.patch<{ data: RecurringInvoice }>(`/invoices/recurring/${id}`, dto).then(d),
  remove:   (id: string)                     => api.delete(`/invoices/recurring/${id}`),
  generate: (id: string)                     => api.post<{ data: Invoice }>(`/invoices/recurring/${id}/generate`).then(d),
}
