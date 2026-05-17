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
  addCompte:    (body: { numero: string; intitule: string; classe: number; type: ChartAccountType; isSystem?: boolean; isCentralizer?: boolean }) =>
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
  /**
   * Attache (ou détache) une pièce justificative à toutes les lignes d'une
   * écriture (même pieceId). Passer pieceUrl=null pour détacher.
   */
  attachJustificative: (pieceId: string, data: { pieceUrl: string | null; pieceName: string | null }) =>
    api.put<{ data: { pieceId: string; linesUpdated: number; pieceUrl: string | null; pieceName: string | null } }>(
      `/accounting/journal/piece/${pieceId}/justificative`,
      data,
    ).then(d),
  deleteJournalEntry: (id: string) =>
    api.delete(`/accounting/journal/${id}`),
  reimpute: (entryIds: string[], newAccount: string) =>
    api.put<{ data: { updated: number; newAccount: string } }>('/accounting/journal/reimpute', { entryIds, newAccount }).then(d),
  setLettrage: (entryIds: string[], code: string) =>
    api.put<{ data: { updated: number; code: string } }>('/accounting/journal/lettrage', { entryIds, code }).then(d),
  deleteLettrage: (code: string, fiscalYearId: string) =>
    api.delete<{ data: { unlettered: number } }>(`/accounting/journal/lettrage/${encodeURIComponent(code)}`, { params: { fiscalYearId } }).then(d),
  /** Liste les comptes de tiers (classe 4) présents dans l'exercice avec stats de lettrage */
  getComptesTiers: (fiscalYearId: string) =>
    api.get<{ data: ComptesTiersRow[] }>('/accounting/comptes-tiers', { params: { fiscalYearId } }).then(d),
  /** Écritures d'un compte de tiers avec codes de lettrage et solde progressif */
  getLettragePourCompte: (fiscalYearId: string, compte: string) =>
    api.get<{ data: LettrageCompteData }>('/accounting/lettrage-compte', { params: { fiscalYearId, compte } }).then(d),
  /** Lettrage réglementaire : valide D=C, génère le code auto (A, B, …) */
  lettrer: (fiscalYearId: string, entryIds: string[]) =>
    api.post<{ data: { code: string; lettered: number } }>('/accounting/lettrer', { fiscalYearId, entryIds }).then(d),
  /** Délettrage : supprime un code sur toutes ses écritures dans l'exercice */
  delettrer: (code: string, fiscalYearId: string) =>
    api.delete<{ data: { unlettered: number } }>(`/accounting/lettrage/${encodeURIComponent(code)}`, { params: { fiscalYearId } }).then(d),
  /** Liste les régularisations CCA / PCA / FNP / FAE de l'exercice */
  listRegularizations: (fiscalYearId: string) =>
    api.get<{ data: Regularization[] }>('/accounting/regularizations', { params: { fiscalYearId } }).then(d),
  /** Crée une régularisation et optionnellement sa contre-passation N+1 */
  createRegularization: (payload: CreateRegularizationPayload) =>
    api.post<{ data: { main: { pieceId: string; created: number }; extourne: { pieceId: string; fiscalYearId: string; created: number } | null; reference: string } }>('/accounting/regularizations', payload).then(d),
  /** Supprime une régularisation (et sa contre-passation éventuelle) */
  deleteRegularization: (pieceId: string) =>
    api.delete<{ data: { deleted: number; deletedExtourne: number } }>(`/accounting/regularizations/${encodeURIComponent(pieceId)}`).then(d),
  /** Liste les régularisations N-1 à extourner dans l'exercice N, avec leur statut */
  listExtournes: (fiscalYearId: string) =>
    api.get<{ data: ExtourneListResponse }>('/accounting/extournes', { params: { fiscalYearId } }).then(d),
  /** Crée l'extourne d'une régularisation N-1 dans l'exercice N */
  createExtourne: (payload: { fiscalYearId: string; regPieceId: string; date?: string }) =>
    api.post<{ data: { pieceId: string; reference: string; created: number } }>('/accounting/extournes', payload).then(d),
  /** Crée toutes les extournes manquantes en lot */
  createAllPendingExtournes: (fiscalYearId: string) =>
    api.post<{ data: { processed: number; created: number; errors: { reference: string; error: string }[] } }>('/accounting/extournes/all-pending', { fiscalYearId }).then(d),
  /** Supprime une extourne */
  deleteExtourne: (pieceId: string) =>
    api.delete<{ data: { deleted: number } }>(`/accounting/extournes/${encodeURIComponent(pieceId)}`).then(d),
  // ── Emprunts ───────────────────────────────────────────────────────────────
  listLoans:   () => api.get<{ data: Loan[] }>('/accounting/loans').then(d),
  getLoan:     (id: string) => api.get<{ data: LoanWithSchedule }>(`/accounting/loans/${id}`).then(d),
  createLoan:  (payload: CreateLoanPayload) =>
    api.post<{ data: Loan }>('/accounting/loans', payload).then(d),
  updateLoan:  (id: string, payload: Partial<CreateLoanPayload> & { status?: LoanStatus }) =>
    api.put<{ data: Loan }>(`/accounting/loans/${id}`, payload).then(d),
  deleteLoan:  (id: string) => api.delete<{ data: { deleted: number } }>(`/accounting/loans/${id}`).then(d),
  getBalanceByFiscalYear: (fiscalYearId: string) =>
    api.get<{ data: BalanceData }>('/accounting/balance-journal', { params: { fiscalYearId } }).then(d),
  getGrandLivreByFiscalYear: (fiscalYearId: string) =>
    api.get<{ data: GrandLivreData }>('/accounting/grand-livre-journal', { params: { fiscalYearId } }).then(d),
  listFiscalYears:   () => api.get<{ data: FiscalYear[] }>('/accounting/fiscal-years').then(d),
  createFiscalYear:  (body: { year: number; startDate?: string; endDate?: string }) => api.post<{ data: FiscalYear }>('/accounting/fiscal-years', body).then(d),
  getFiscalYear:     (id: string) => api.get<{ data: FiscalYear }>(`/accounting/fiscal-years/${id}`).then(d),
  lockFiscalYear:          (id: string) => api.put<{ data: FiscalYear }>(`/accounting/fiscal-years/${id}/lock`).then(d),
  closeFiscalYear:         (id: string) => api.post<{ data: FiscalYear }>(`/accounting/fiscal-years/${id}/close`).then(d),
  reopenFiscalYear:        (id: string) => api.post<{ data: FiscalYear }>(`/accounting/fiscal-years/${id}/reopen`).then(d),
  generateOpeningEntries:  (id: string) => api.post<{ data: { generated: number; fiscalYear: number; nextYear: number } }>(`/accounting/fiscal-years/${id}/generate-opening-entries`).then(d),
  fiscalYearSummary:       (id: string) => api.get<{ data: FiscalYearSummary }>(`/accounting/fiscal-years/${id}/summary`).then(d),
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
  isCentralizer:  boolean
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
  lettrage:    string | null
  /** URL de la pièce justificative (toutes les lignes du pieceId la partagent) */
  pieceUrl?:   string | null
  /** Nom de la pièce justificative (fichier) */
  pieceName?:  string | null
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
  pieceId:     string | null
  label:       string
  debit:       number
  credit:      number
  solde:       number
  reference:   string | null
  lettrage:    string | null
}

// ── Emprunts (classe 16) ──────────────────────────────────────────────────────

export type LoanAmortType = 'CONSTANT_PAYMENT' | 'CONSTANT_PRINCIPAL' | 'IN_FINE' | 'BULLET'
export type LoanStatus = 'ACTIVE' | 'REPAID' | 'IN_DEFAULT'

export interface LoanScheduleLine {
  period:           number
  date:             string
  openingPrincipal: number
  payment:          number
  interest:         number
  capital:          number
  closingPrincipal: number
}

export interface LoanSummary {
  totalPayments:      number
  totalInterest:      number
  totalPrincipal:     number
  monthlyPayment:     number
  effectiveRate:      number
  paidPrincipal:      number
  paidInterest:       number
  remainingPrincipal: number
  nextDueDate:        string | null
  nextDueAmount:      number
}

export interface Loan {
  id:               string
  companyId:        string
  reference:        string
  name:             string
  lender:           string
  principal:        number
  rate:             number
  durationMonths:   number
  startDate:        string
  firstPaymentDate: string
  amortType:        LoanAmortType
  currency:         string
  account:          string | null
  bankAccount:      string | null
  interestAccount:  string | null
  status:           LoanStatus
  notes:            string | null
  createdAt:        string
  updatedAt:        string
  summary?:         LoanSummary
}

export interface LoanWithSchedule extends Loan {
  schedule: LoanScheduleLine[]
  summary:  LoanSummary
}

export interface CreateLoanPayload {
  name:             string
  lender:           string
  principal:        number
  rate:             number
  durationMonths:   number
  startDate:        string
  firstPaymentDate: string
  amortType?:       LoanAmortType
  currency?:        string
  account?:         string | null
  bankAccount?:     string | null
  interestAccount?: string | null
  notes?:           string | null
  reference?:       string | null
}

// ── Régularisations d'inventaire (CCA / PCA / FNP / FAE) ──────────────────────

export type RegularizationType = 'CCA' | 'PCA' | 'FNP' | 'FAE' | 'CAP' | 'PAR' | 'CD'

export interface RegularizationLine {
  id:     string
  compte: string
  debit:  number
  credit: number
}

export interface Regularization {
  pieceId:            string
  reference:          string | null
  type:               RegularizationType | 'XXX'
  date:               string
  libelle:            string
  montant:            number
  lignes:             RegularizationLine[]
  hasContrepassation: boolean
}

export interface CreateRegularizationPayload {
  fiscalYearId:         string
  type:                 RegularizationType
  date:                 string       // ISO yyyy-mm-dd
  contrepartie:         string       // compte 6xx ou 7xx
  libelle:              string
  montant:              number
  reference?:           string | null
  autoContrepassation:  boolean
}

// ── Extournes (contre-passations N-1 → N) ─────────────────────────────────────

export interface ExtourneRegularization {
  pieceId:    string
  reference:  string | null
  type:       RegularizationType | 'XXX'
  date:       string
  libelle:    string
  montant:    number
  lignes:     RegularizationLine[]
  extourne:   {
    pieceId: string | null
    date:    string | null
    lignes:  RegularizationLine[]
  } | null
}

export interface ExtourneListResponse {
  previousFyExists: boolean
  previousYear:     number
  previousFyStatus?: string
  currentYear:      number
  currentFyStatus?: string
  regularizations:  ExtourneRegularization[]
  totalPending?:    number
  totalDone?:       number
}

// ── Lettrage des comptes de tiers ─────────────────────────────────────────────

export interface ComptesTiersRow {
  compte:      string
  label:       string
  totalDebit:  number
  totalCredit: number
  solde:       number
  lettres:     number
  nonLettres:  number
}

export interface LettrageEntry {
  id:          string
  date:        string
  journalCode: string
  pieceId:     string | null
  label:       string
  reference:   string | null
  debit:       number
  credit:      number
  solde:       number
  lettrage:    string | null
}

export interface LettrageCompteData {
  fiscalYearId: string
  compte:       string
  lignes:       LettrageEntry[]
  totalDebit:   number
  totalCredit:  number
  solde:        number
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
  _count:         { journalEntries: number } | null
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
