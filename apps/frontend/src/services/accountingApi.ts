import { api } from '@/lib/api'

// ── Existing report types ─────────────────────────────────────────────────────

export interface Bilan {
  actif: { immobilisations: string; creances: string; tresorerie: string; total: string }
  passif: { capitaux: string; dettes: string; total: string }
  year: number
}

export interface CompteResultat {
  produits: { caTotal: string; autresProduits: string; total: string }
  charges: {
    achatsMarchandises: string
    servicesExterieurs: string
    chargesPersonnel: string
    impots: string
    dotations: string
    autresCharges: string
    total: string
  }
  resultatNet: string
  year: number
}

export interface GrandLivreEntry {
  date: string
  libelle: string
  debit: string
  credit: string
  compte: string
}

export interface BalanceEntry {
  compte: string
  libelle: string
  totalDebit: string
  totalCredit: string
  solde: string
}

export interface TvaTrimestrielle {
  year: number
  quarters: {
    quarter: number
    tvaCollectee: string
    tvaDeductible: string
    tvaNette: string
  }[]
}

// ── Bank / Rapprochement types ─────────────────────────────────────────────────

export interface BankTransaction {
  id: string
  date: string
  label: string
  amount: string
  type: 'CREDIT' | 'DEBIT'
  reference: string | null
  status: 'UNMATCHED' | 'MATCHED' | 'IGNORED'
  lettrage: string | null
  invoiceId: string | null
  expenseId: string | null
  invoice: { id: string; number: string; total: string } | null
  expense: { id: string; description: string; amount: string } | null
  importedAt: string
}

export interface BankStats {
  total: number
  matched: number
  unmatched: number
  ignored: number
  reconciliationRate: number
}

export interface CA3Ligne {
  label: string
  base: number | null
  tva: number
}

export interface CA3Data {
  period: string
  year: number
  quarter: number
  lignes: Record<string, CA3Ligne>
}

export interface ClotureStatus {
  year: number
  alreadyClosed: boolean
  closedAt: string | null
  openInvoices: number
  resultatNet: number
  canClose: boolean
  blockers: string[]
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

const d = <T>(r: { data: { data: T } }) => r.data.data

// ── Existing accounting API ───────────────────────────────────────────────────

export const accountingApi = {
  bilan:           (year?: number) => api.get<{ data: Bilan }>('/accounting/bilan', { params: year ? { year } : undefined }).then(d),
  compteResultat:  (year?: number) => api.get<{ data: CompteResultat }>('/accounting/compte-de-resultat', { params: year ? { year } : undefined }).then(d),
  grandLivre:      (year?: number) => api.get<{ data: unknown }>('/accounting/grand-livre', { params: year ? { year } : undefined }).then(d),
  balance:         (year?: number) => api.get<{ data: unknown }>('/accounting/balance', { params: year ? { year } : undefined }).then(d),
  tva:             (year?: number) => api.get<{ data: unknown }>('/accounting/tva', { params: year ? { year } : undefined }).then(d),
  ca3:             (year: number, quarter: number) =>
    api.get<{ data: CA3Data }>('/accounting/tva/ca3', { params: { year, quarter } }).then(d),
  clotureStatus:   (year: number) => api.get<{ data: ClotureStatus }>('/accounting/cloture', { params: { year } }).then(d),
  clotureClose:    (year: number, notes?: string) =>
    api.post<{ data: unknown }>('/accounting/cloture', { year, notes }).then(d),
  fecDownloadUrl:  (year: number, token: string) =>
    `/api/accounting/fec?year=${year}`,
}

// ── Bank API ──────────────────────────────────────────────────────────────────

export const bankApi = {
  stats:         ()                                                       =>
    api.get<{ data: BankStats }>('/bank/stats').then(d),
  list:          (p?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ data: Paginated<BankTransaction> }>('/bank', { params: p }).then(d),
  import:        (format: 'CSV' | 'OFX', content: string)                =>
    api.post<{ data: { imported: number } }>('/bank/import', { format, content }).then(d),
  autoReconcile: ()                                                       =>
    api.post<{ data: { matched: number } }>('/bank/auto-reconcile').then(d),
  reconcile:     (transactionId: string, invoiceId?: string, expenseId?: string) =>
    api.post<{ data: BankTransaction }>('/bank/reconcile', { transactionId, invoiceId, expenseId }).then(d),
  setStatus:     (id: string, status: string, lettrage?: string)          =>
    api.patch<{ data: BankTransaction }>(`/bank/${id}/status`, { status, lettrage }).then(d),
  remove:        (id: string)                                             => api.delete(`/bank/${id}`),
}
