import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export type MandatType = 'COMPLET' | 'COMPTABILITE' | 'GESTION' | 'FISCAL' | 'DECLARATIONS' | 'PARTIEL'
export type CompanySize = 'TPE' | 'PME' | 'ETI' | 'GE'

export const ALL_MODULES = [
  { key: 'gestion',      label: 'Gestion commerciale' },
  { key: 'comptabilite', label: 'Comptabilité' },
  { key: 'rh',           label: 'Ressources humaines' },
  { key: 'fiscalite',    label: 'Fiscalité' },
  { key: 'juridique',    label: 'Juridique' },
  { key: 'esg',          label: 'ESG' },
] as const

export interface PortfolioCompany {
  id: string
  nom: string
  siren: string | null
  secteur: string | null
  taille: CompanySize
  plan: string
  modules: string[]
}

export interface PortfolioItem {
  company: PortfolioCompany
  mandat: { type: MandatType; modules: string[]; since: string }
  kpis: {
    totalFacture: number
    invoiceCount: number
    overdueInvoices: number
    totalDepenses: number
    activeEmployees: number
  }
}

export interface CabinetSummary {
  totalMandats: number
  activeMandats: number
  inactiveMandats: number
  totalFacturePortefeuille: number
  companiesWithOverdueInvoices: number
}

export interface CabinetDashboard {
  summary: CabinetSummary
  portfolio: PortfolioItem[]
}

export interface Mandat {
  id: string
  cabinetId: string
  companyId: string
  type: MandatType
  modules: string[]
  isActive: boolean
  dateDebut: string | null
  dateFin: string | null
  notes: string | null
  createdAt: string
  company: { id: string; nom: string; siren: string | null; plan: string }
}

export interface CompanySearchResult {
  id: string
  nom: string
  siren: string | null
  niu: string | null
  secteur: string | null
  taille: CompanySize
  plan: string
  ville: string | null
  pays: string
}

export type CabinetInviteStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'

export interface CabinetInvitation {
  id: string
  token: string
  cabinetId: string
  companyId: string
  type: MandatType
  modules: string[]
  notes: string | null
  status: CabinetInviteStatus
  sentTo: string
  expiresAt: string
  acceptedAt: string | null
  rejectedAt: string | null
  createdAt: string
  company: { id: string; nom: string; siren: string | null; plan: string }
}

export interface InvitationDetail {
  id: string
  token: string
  type: MandatType
  modules: string[]
  notes: string | null
  status: CabinetInviteStatus
  sentTo: string
  expiresAt: string
  acceptedAt: string | null
  rejectedAt: string | null
  cabinet: { id: string; nom: string; siret: string | null; pays: string; email: string | null }
  company: { id: string; nom: string; siren: string | null }
}

export interface SendInvitationData {
  companyId: string
  type: MandatType
  modules: string[]
  notes?: string
}

export interface CreateMandatData {
  companyId: string
  type: MandatType
  modules: string[]
  notes?: string
  dateDebut?: string
}

export interface UpdateMandatData {
  type?: MandatType
  modules?: string[]
  notes?: string | null
  dateDebut?: string
  dateFin?: string | null
}

// ── Labels & couleurs ─────────────────────────────────────────────────────────

export const MANDAT_TYPE_LABELS: Record<MandatType, string> = {
  COMPLET:      'Mission complète',
  COMPTABILITE: 'Comptabilité',
  GESTION:      'Gestion',
  FISCAL:       'Fiscalité',
  DECLARATIONS: 'Déclarations',
  PARTIEL:      'Mission partielle',
}

export const MANDAT_TYPE_COLORS: Record<MandatType, string> = {
  COMPLET:      'bg-forest-100 text-forest-800',
  COMPTABILITE: 'bg-blue-100 text-blue-800',
  GESTION:      'bg-purple-100 text-purple-800',
  FISCAL:       'bg-amber-100 text-amber-800',
  DECLARATIONS: 'bg-pink-100 text-pink-800',
  PARTIEL:      'bg-gray-100 text-gray-700',
}

export const PLAN_COLORS: Record<string, string> = {
  FREE:    'bg-gray-100 text-gray-600',
  STARTER: 'bg-blue-100 text-blue-700',
  PRO:     'bg-purple-100 text-purple-700',
  PREMIUM: 'bg-amber-100 text-amber-700',
}

// ── API ───────────────────────────────────────────────────────────────────────

const d = <T>(r: { data: { data: T } }) => r.data.data

export const cabinetApi = {
  // Dashboard & portfolio
  dashboard: () =>
    api.get<{ data: CabinetDashboard }>('/cabinet/dashboard').then(d),

  portfolio: () =>
    api.get<{ data: PortfolioItem[] }>('/cabinet/portfolio').then(d),

  // Company view (context switch)
  switchToCompany: (companyId: string) =>
    api.post<{ data: { viewToken: string; company: { id: string; nom: string } } }>(
      `/cabinet/switch/${companyId}`,
    ).then(d),

  // Invitations (cabinet side)
  invitations: () =>
    api.get<{ data: CabinetInvitation[] }>('/cabinet/invitations').then(d),

  sendInvitation: (data: SendInvitationData) =>
    api.post<{ data: CabinetInvitation }>('/cabinet/invitations', data).then(d),

  cancelInvitation: (id: string) =>
    api.delete<{ data: CabinetInvitation }>(`/cabinet/invitations/${id}`).then(d),

  // Company search
  searchCompanies: (q: string) =>
    api.get<{ data: CompanySearchResult[] }>(`/cabinet/search-companies?q=${encodeURIComponent(q)}`).then(d),

  // Mandats
  mandats: () =>
    api.get<{ data: Mandat[] }>('/cabinet/mandats').then(d),

  toggleMandat: (companyId: string) =>
    api.post<{ data: Mandat }>(`/cabinet/mandats/${companyId}/toggle`).then(d),

  createMandat: (data: CreateMandatData) =>
    api.post<{ data: Mandat }>('/cabinet/mandats', data).then(d),

  updateMandat: (companyId: string, data: UpdateMandatData) =>
    api.patch<{ data: Mandat }>(`/cabinet/mandats/${companyId}`, data).then(d),

  deleteMandat: (companyId: string) =>
    api.delete(`/cabinet/mandats/${companyId}`),
}
