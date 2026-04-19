import { api } from '@/lib/api'

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'

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
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface InvoiceListParams {
  status?: InvoiceStatus
  clientId?: string
  page?: number
  limit?: number
}

export interface CreateInvoiceDto {
  clientId?: string
  subtotal: number
  taxRate?: number
  issueDate: string
  dueDate: string
  notes?: string
}

export interface UpdateInvoiceDto extends Partial<CreateInvoiceDto> {
  status?: InvoiceStatus
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const d = <T>(r: { data: { data: T } }) => r.data.data

export const billingApi = {
  list:         (p?: InvoiceListParams) => api.get<{ data: Paginated<Invoice> }>('/invoices', { params: p }).then(d),
  get:          (id: string)            => api.get<{ data: Invoice }>(`/invoices/${id}`).then(d),
  create:       (dto: CreateInvoiceDto) => api.post<{ data: Invoice }>('/invoices', dto).then(d),
  update:       (id: string, dto: UpdateInvoiceDto) => api.patch<{ data: Invoice }>(`/invoices/${id}`, dto).then(d),
  updateStatus: (id: string, status: InvoiceStatus) => api.patch<{ data: Invoice }>(`/invoices/${id}/status`, { status }).then(d),
  remove:       (id: string)            => api.delete(`/invoices/${id}`),
}
