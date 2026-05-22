import { api } from '@/lib/api'

export interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  siren: string | null
  agenceId: string | null
  agence: { id: string; nom: string } | null
  reliabilityScore?: number
  invoiceCount?: number
  invoiceTotal?: string
  createdAt: string
  updatedAt: string
  _count?: { invoices: number }
}

export interface CreateClientDto {
  name: string
  email?: string
  phone?: string
  address?: string
  siren?: string
  accountingCode?: string
  agenceId?: string | null
}

export type UpdateClientDto = Partial<CreateClientDto>

const d = <T>(r: { data: { data: T } }) => r.data.data

export const clientsApi = {
  list:   (search?: string) => api.get<{ data: Client[] }>('/clients', { params: search ? { search } : undefined }).then(d),
  get:    (id: string)      => api.get<{ data: Client }>(`/clients/${id}`).then(d),
  create: (dto: CreateClientDto)          => api.post<{ data: Client }>('/clients', dto).then(d),
  update: (id: string, dto: UpdateClientDto) => api.patch<{ data: Client }>(`/clients/${id}`, dto).then(d),
  remove: (id: string)      => api.delete(`/clients/${id}`),
}
