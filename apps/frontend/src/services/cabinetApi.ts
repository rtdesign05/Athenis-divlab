import { api } from '@/lib/api'

export type MandatType = 'COMPLET' | 'COMPTABILITE' | 'GESTION' | 'DECLARATIONS'

export interface CompanyKpi {
  id: string
  name: string
  siren: string | null
  plan: string
  mandatType: MandatType
  mandatActif: boolean
  mandatId: string
  kpis: {
    invoiceCount: number
    paidAmount: string
    pendingAmount: string
    expenseCount: number
    employeeCount: number
  }
}

export interface CabinetDashboard {
  totalCompanies: number
  totalMandats: number
  mandatsActifs: number
  totalRevenuGere: string
}

export interface Mandat {
  id: string
  companyId: string
  company: { id: string; name: string; siren: string | null }
  type: MandatType
  modules: string[]
  actif: boolean
  createdAt: string
}

const d = <T>(r: { data: { data: T } }) => r.data.data

export const cabinetApi = {
  dashboard:    ()                                   => api.get<{ data: CabinetDashboard }>('/cabinet/dashboard').then(d),
  portfolio:    ()                                   => api.get<{ data: CompanyKpi[] }>('/cabinet/portfolio').then(d),
  mandats:      ()                                   => api.get<{ data: Mandat[] }>('/cabinet/mandats').then(d),
  toggleMandat: (mandatId: string)                   => api.post<{ data: Mandat }>(`/cabinet/mandats/${mandatId}/toggle`).then(d),
  createMandat: (dto: { companyId: string; type: MandatType; modules: string[] }) =>
    api.post<{ data: Mandat }>('/cabinet/mandats', dto).then(d),
}
