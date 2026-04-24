import { api } from '@/lib/api'

export type ReviewStatus = 'PENDING' | 'REVIEWED' | 'ANOMALY'

export interface ReviewedAccount {
  number:            string
  label:             string
  debit:             number
  credit:            number
  solde:             number
  cycle:             number
  status:            ReviewStatus
  reviewedBy?:       string
  reviewedAt?:       string
  note?:             string
  anomalyNote?:      string
  anomalyResolvedAt?: string
  resolutionNote?:   string
}

export interface ReviewCycle {
  id:            number
  name:          string
  isNA:          boolean
  accounts:      ReviewedAccount[]
  totalAccounts: number
  reviewedCount: number
  anomalyCount:  number
  percentage:    number
  cycleStatus:   'complete' | 'partial' | 'none' | 'na'
}

export interface RevisionProgress {
  total:           number
  reviewed:        number
  anomalies:       number
  percentage:      number
  canClose:        boolean
  blockingReasons: string[]
}

const d = <T>(r: { data: { data: T } }) => r.data.data

export const revisionApi = {
  cycles:  (year: number) =>
    api.get<{ data: ReviewCycle[] }>('/accounting/revision', { params: { year } }).then(d),
  progress: (year: number) =>
    api.get<{ data: RevisionProgress }>('/accounting/revision/progress', { params: { year } }).then(d),
  review: (accountNumber: string, year: number, note?: string) =>
    api.post(`/accounting/revision/${accountNumber}/review`, { year, note }),
  unreview: (accountNumber: string, year: number) =>
    api.delete(`/accounting/revision/${accountNumber}/review`, { data: { year } }),
  markAnomaly: (accountNumber: string, year: number, anomalyNote: string) =>
    api.post(`/accounting/revision/${accountNumber}/anomaly`, { year, anomalyNote }),
  resolveAnomaly: (accountNumber: string, year: number, resolutionNote: string) =>
    api.post(`/accounting/revision/${accountNumber}/resolve-anomaly`, { year, resolutionNote }),
  markAll: (year: number) =>
    api.post('/accounting/revision/mark-all', { year }),
}
