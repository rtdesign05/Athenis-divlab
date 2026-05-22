import { api } from '@/lib/api'

export type ContractType   = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'
export type ContractStatus = 'DRAFT' | 'SIGNED' | 'TERMINATED'

export interface ApiEmploymentContract {
  id:            string
  companyId:     string
  employeeId:    string
  employeeName:  string
  employeeEmail: string
  contractType:  ContractType
  status:        ContractStatus
  startDate:     string
  endDate:       string | null
  grossSalary:   number
  poste:         string
  departement:   string
  lieuTravail:   string
  content:       string
  signedAt:      string | null
  createdAt:     string
  updatedAt:     string
}

export interface CreateContractPayload {
  employeeId:   string
  contractType: ContractType
  status?:      ContractStatus
  startDate:    string
  endDate?:     string | null
  grossSalary:  number
  poste:        string
  departement:  string
  lieuTravail:  string
  content:      string
  signedAt?:    string | null
}

export type UpdateContractPayload = Partial<Omit<CreateContractPayload, 'employeeId'>>

const d = <T>(r: { data: { data: T } }) => r.data.data

export const employmentContractsApi = {
  list:   () => api.get<{ data: ApiEmploymentContract[] }>('/employment-contracts').then(d),
  get:    (id: string) => api.get<{ data: ApiEmploymentContract }>(`/employment-contracts/${id}`).then(d),
  create: (payload: CreateContractPayload) =>
            api.post<{ data: ApiEmploymentContract }>('/employment-contracts', payload).then(d),
  update: (id: string, payload: UpdateContractPayload) =>
            api.patch<{ data: ApiEmploymentContract }>(`/employment-contracts/${id}`, payload).then(d),
  remove: (id: string) => api.delete(`/employment-contracts/${id}`),
}
