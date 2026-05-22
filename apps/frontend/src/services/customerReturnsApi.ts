import { api } from '@/lib/api'

export type CustomerReturnStatusApi = 'EN_COURS' | 'VALIDE' | 'REMBOURSE' | 'REFUSE'

export interface ApiCustomerReturn {
  id:        string
  agenceId:  string | null
  agence:    { id: string; nom: string } | null
  facture:   string | null
  clientNom: string
  date:      string
  motif:     string | null
  montant:   number
  statut:    CustomerReturnStatusApi
  createdAt: string
  updatedAt: string
}

export interface CreateCustomerReturnPayload {
  facture?:   string
  clientNom:  string
  date:       string
  motif?:     string
  montant?:   number
  statut?:    CustomerReturnStatusApi
  agenceId?:  string | null
}

export type UpdateCustomerReturnPayload = Partial<CreateCustomerReturnPayload>

const d = <T>(r: { data: { data: T } }) => r.data.data

export const customerReturnsApi = {
  list:   () => api.get<{ data: ApiCustomerReturn[] }>('/customer-returns').then(d),
  create: (p: CreateCustomerReturnPayload) =>
            api.post<{ data: ApiCustomerReturn }>('/customer-returns', p).then(d),
  update: (id: string, p: UpdateCustomerReturnPayload) =>
            api.patch<{ data: ApiCustomerReturn }>(`/customer-returns/${id}`, p).then(d),
  remove: (id: string) => api.delete(`/customer-returns/${id}`),
}
