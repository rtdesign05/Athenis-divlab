import { api } from '@/lib/api'

export type ContractType   = 'EMPLOYMENT' | 'SERVICE' | 'NDA' | 'PARTNERSHIP' | 'LEASE' | 'SUPPLIER' | 'CLIENT' | 'OTHER'
export type ContractStatus = 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'EXPIRED' | 'TERMINATED'
export type SignatureStatus = 'PENDING' | 'SIGNED' | 'REFUSED'
export type GdprLegalBasis = 'CONSENT' | 'CONTRACT' | 'LEGAL_OBLIGATION' | 'VITAL_INTEREST' | 'PUBLIC_TASK' | 'LEGITIMATE_INTEREST'
export type GdprRiskLevel  = 'LOW' | 'MEDIUM' | 'HIGH'
export type AlertSeverity  = 'INFO' | 'WARNING' | 'CRITICAL'
export type AlertStatus    = 'OPEN' | 'DISMISSED' | 'RESOLVED'

export interface ContractParty {
  name: string
  email: string
  role?: string
}

export interface ContractSignature {
  signerName:  string
  signerEmail: string
  signerRole:  string | null
  status:      SignatureStatus
  signedAt:    string | null
}

export interface LegalContract {
  id:           string
  title:        string
  type:         ContractType
  status:       ContractStatus
  parties:      ContractParty[]
  content:      string | null
  fileUrl:      string | null
  signedAt:     string | null
  expiresAt:    string | null
  terminatedAt: string | null
  notes:        string | null
  createdAt:    string
  signatures:   ContractSignature[]
  _count?:      { alerts: number }
}

export interface GdprEntry {
  id:              string
  treatmentName:   string
  purpose:         string
  legalBasis:      GdprLegalBasis
  dataCategories:  string[]
  dataSubjects:    string[]
  retentionMonths: number
  responsible:     string
  subcontractors:  string[]
  securityMeasures: string[]
  riskLevel:       GdprRiskLevel
  dpiaRequired:    boolean
  lastReviewedAt:  string | null
  notes:           string | null
  createdAt:       string
}

export interface LegalAlert {
  id:          string
  contractId:  string | null
  contract?:   { id: string; title: string; type: ContractType } | null
  title:       string
  message:     string
  severity:    AlertSeverity
  status:      AlertStatus
  dueDate:     string | null
  dismissedAt: string | null
  resolvedAt:  string | null
  createdAt:   string
}

export interface AlertStats { total: number; critical: number; warning: number; info: number }
export interface GdprStats  { total: number; highRisk: number; dpiaRequired: number; byBasis: Record<string, number> }

const d = <T>(r: { data: { data: T } }) => r.data.data

export const legalApi = {
  // Contracts
  contracts: {
    list:   (params?: { type?: ContractType; status?: ContractStatus }) =>
              api.get<{ data: LegalContract[] }>('/legal/contracts', { params }).then(d),
    get:    (id: string) => api.get<{ data: LegalContract }>(`/legal/contracts/${id}`).then(d),
    create: (dto: {
      title: string; type: ContractType; parties: ContractParty[]
      content?: string; fileUrl?: string; expiresAt?: string; notes?: string
    }) => api.post<{ data: LegalContract }>('/legal/contracts', dto).then(d),
    update: (id: string, dto: Partial<{
      title: string; status: ContractStatus; parties: ContractParty[]
      content: string; fileUrl: string; expiresAt: string; terminatedAt: string; notes: string
    }>) => api.patch<{ data: LegalContract }>(`/legal/contracts/${id}`, dto).then(d),
    remove: (id: string) => api.delete(`/legal/contracts/${id}`),
    sendSignature: (id: string, dto: { signerName: string; signerEmail: string; signerRole?: string }) =>
      api.post<{ data: ContractSignature & { signLink: string } }>(`/legal/contracts/${id}/send-signature`, dto).then(d),
  },

  // GDPR
  gdpr: {
    stats:  ()           => api.get<{ data: GdprStats }>('/legal/gdpr/stats').then(d),
    list:   ()           => api.get<{ data: GdprEntry[] }>('/legal/gdpr').then(d),
    get:    (id: string) => api.get<{ data: GdprEntry }>(`/legal/gdpr/${id}`).then(d),
    create: (dto: Omit<GdprEntry, 'id' | 'createdAt' | 'lastReviewedAt'>) =>
              api.post<{ data: GdprEntry }>('/legal/gdpr', dto).then(d),
    update: (id: string, dto: Partial<Omit<GdprEntry, 'id' | 'createdAt'>>) =>
              api.patch<{ data: GdprEntry }>(`/legal/gdpr/${id}`, dto).then(d),
    remove: (id: string) => api.delete(`/legal/gdpr/${id}`),
  },

  // Alerts
  alerts: {
    stats:   ()                     => api.get<{ data: AlertStats }>('/legal/alerts/stats').then(d),
    list:    (status?: AlertStatus) => api.get<{ data: LegalAlert[] }>('/legal/alerts', { params: status ? { status } : undefined }).then(d),
    create:  (dto: { title: string; message: string; severity?: AlertSeverity; dueDate?: string; contractId?: string }) =>
               api.post<{ data: LegalAlert }>('/legal/alerts', dto).then(d),
    update:  (id: string, status: AlertStatus) =>
               api.patch<{ data: LegalAlert }>(`/legal/alerts/${id}`, { status }).then(d),
    sync:    () => api.post<{ data: { synced: number } }>('/legal/alerts/sync').then(d),
  },
}
