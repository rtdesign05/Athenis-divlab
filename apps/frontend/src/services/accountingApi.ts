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
  fecDownloadUrl:  (year: number) =>
    `/api/accounting/fec?year=${year}`,
  plan:         () => api.get<{ data: PlanData }>('/accounting/plan').then(d),
  comptes:      () => api.get<{ data: CompteItem[] }>('/accounting/comptes').then(d),
  addCompte:    (body: { numero: string; intitule: string; classe: number; type: ChartAccountType; isSystem?: boolean }) =>
    api.post<{ data: CompteItem }>('/accounting/comptes', body).then(d),
  updateCompte: (id: string, intitule: string) =>
    api.put<{ data: CompteItem }>(`/accounting/comptes/${id}`, { intitule }).then(d),
  deleteCompte: (id: string) => api.delete(`/accounting/comptes/${id}`),
  etatsFinanciers:        (fiscalYearId: string) =>
    api.get<{ data: FinancialStatements }>('/accounting/etats-financiers', { params: { fiscalYearId } }).then(d),
  getFinancialStatements: (fiscalYearId: string) =>
    api.get<{ data: FinancialStatements }>('/accounting/financial-statements', { params: { fiscalYearId } }).then(d),
  getJournal:             (fiscalYearId: string) =>
    api.get<{ data: JournalData }>('/accounting/journal', { params: { fiscalYearId } }).then(d),
  createJournalEntry:     (data: { fiscalYearId: string; date: string; journal: string; compte: string; libelle: string; debit: number; credit: number; reference?: string }) =>
    api.post<{ data: unknown }>('/accounting/journal', data).then(d),
  createJournalEntryBatch: (data: {
    fiscalYearId: string
    date: string
    journal: string
    reference?: string
    lines: { compte: string; libelle: string; intituleCompte?: string; debit: number; credit: number }[]
  }) => api.post<{ data: unknown[] }>('/accounting/journal/batch', data).then(d),
  updateJournalPiece: (pieceId: string, data: {
    date: string
    journal: string
    reference?: string
    lines: { compte: string; libelle: string; debit: number; credit: number }[]
  }) => api.put<{ data: unknown[] }>(`/accounting/journal/piece/${pieceId}`, data).then(d),
  deleteJournalPiece: (pieceId: string) =>
    api.delete(`/accounting/journal/piece/${pieceId}`),
  deleteJournalEntry: (id: string) =>
    api.delete(`/accounting/journal/${id}`),
  getBalanceByFiscalYear: (fiscalYearId: string) =>
    api.get<{ data: BalanceData }>('/accounting/balance-journal', { params: { fiscalYearId } }).then(d),
  getGrandLivreByFiscalYear: (fiscalYearId: string) =>
    api.get<{ data: GrandLivreData }>('/accounting/grand-livre-journal', { params: { fiscalYearId } }).then(d),
  listFiscalYears:   () => api.get<{ data: FiscalYear[] }>('/accounting/fiscal-years').then(d),
  createFiscalYear:  (body: { year: number; startDate?: string; endDate?: string }) => api.post<{ data: FiscalYear }>('/accounting/fiscal-years', body).then(d),
  getFiscalYear:     (id: string) => api.get<{ data: FiscalYear }>(`/accounting/fiscal-years/${id}`).then(d),
  lockFiscalYear:    (id: string) => api.put<{ data: FiscalYear }>(`/accounting/fiscal-years/${id}/lock`).then(d),
  closeFiscalYear:   (id: string) => api.post<{ data: FiscalYear }>(`/accounting/fiscal-years/${id}/close`).then(d),
  reopenFiscalYear:  (id: string) => api.post<{ data: FiscalYear }>(`/accounting/fiscal-years/${id}/reopen`).then(d),
  fiscalYearSummary: (id: string) => api.get<{ data: FiscalYearSummary }>(`/accounting/fiscal-years/${id}/summary`).then(d),
}

// ── Plan comptable / Comptes types ───────────────────────────────────────────

export type ChartAccountType = 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT'
export type AccountingZone   = 'FRANCE' | 'OHADA' | 'IFRS'

export interface PlanEntry {
  numero:   string
  intitule: string
  classe:   number
  type:     ChartAccountType
  utilisé:  boolean
}

export interface PlanData {
  zone:      AccountingZone
  zoneLabel: { flag: string; label: string }
  entries:   PlanEntry[]
}

export interface CompteItem {
  id:             string
  numero:         string
  intitule:       string
  classe:         number
  type:           ChartAccountType
  zone:           AccountingZone
  isSystem:       boolean
  soldeDebiteur:  number
  soldeCrediteur: number
  soldeNet:       number
}

// ── Financial Statements types ────────────────────────────────────────────────

export interface FSPair { n: number; nm1: number }

export interface FinancialStatements {
  zone:        AccountingZone
  year:        number
  prevYear:    number
  status:      string
  entryCount:  number
  hasPrevYear: boolean
  // France PCG
  bilan?:                         Record<string, Record<string, FSPair>>
  compteDeResultat?:              Record<string, Record<string, FSPair>>
  // OHADA-only
  tafire?:                        Record<string, FSPair>
  // IFRS-only
  statementOfFinancialPosition?:  Record<string, Record<string, FSPair>>
  statementOfProfitOrLoss?:       Record<string, FSPair>
  statementOfCashFlows?:          Record<string, FSPair>
  statementOfChangesInEquity?:    Record<string, FSPair>
}

// ── Journal Entry types ───────────────────────────────────────────────────────

export interface JournalEntryRow {
  id:          string
  date:        string
  journalCode: string
  pieceId:     string | null
  account:     string
  label:       string
  debit:       number
  credit:      number
  reference:   string | null
}

export interface JournalData {
  fiscalYearId: string
  year:         number
  status:       string
  entries:      JournalEntryRow[]
}

export interface BalanceRow {
  account:        string
  label:          string
  totalDebit:     number
  totalCredit:    number
  soldeDebiteur:  number
  soldeCrediteur: number
}

export interface BalanceData {
  fiscalYearId: string
  year:         number
  status:       string
  rows:         BalanceRow[]
  totalDebit:   number
  totalCredit:  number
  equilibre:    boolean
}

export interface GrandLivreLigne {
  id:          string
  date:        string
  journalCode: string
  label:       string
  debit:       number
  credit:      number
  solde:       number
  reference:   string | null
}

export interface GrandLivreCompte {
  account: string
  label:   string
  lignes:  GrandLivreLigne[]
}

export interface GrandLivreData {
  fiscalYearId: string
  year:         number
  status:       string
  comptes:      GrandLivreCompte[]
}

// ── Fiscal Year types ─────────────────────────────────────────────────────────

export type FiscalYearStatus = 'DRAFT' | 'OPEN' | 'LOCKED' | 'CLOSED'

export interface FiscalYear {
  id:             string
  year:           number
  startDate:      string
  endDate:        string
  status:         FiscalYearStatus
  openingBalance: Record<string, number> | null
  closingBalance: Record<string, number> | null
  createdBy:      string
  closedBy:       string | null
  closedAt:       string | null
  createdAt:      string
  updatedAt:      string
  _count:         { entries: number; invoices: number; expenses: number }
}

export interface FiscalYearSummary {
  id:             string
  year:           number
  status:         FiscalYearStatus
  ca:             number
  charges:        number
  resultatNet:    number
  openInvoices:   number
  totalInvoices:  number
  totalExpenses:  number
  entriesCount:   number
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
