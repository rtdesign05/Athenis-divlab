import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'

// ── Static cycle definitions (OHADA / SYSCOHADA) ──────────────────────────────

interface StaticAccount {
  number: string
  label:  string
  debit:  number
  credit: number
}

interface CycleDef {
  id:       number
  name:     string
  accounts: StaticAccount[]
  isNA:     boolean
}

export const CYCLES: CycleDef[] = [
  {
    id: 1, name: 'Ventes / Clients', isNA: false,
    accounts: [
      { number: '411',  label: 'Clients',               debit: 63_200_000, credit: 38_750_000 },
      { number: '701',  label: 'Prestations de services', debit: 0,         credit: 48_700_000 },
      { number: '4435', label: 'TVA collectée',          debit: 0,          credit:  9_374_750 },
    ],
  },
  {
    id: 2, name: 'Achats / Fournisseurs', isNA: false,
    accounts: [
      { number: '401',  label: 'Fournisseurs',           debit:  2_150_000, credit: 4_300_000 },
      { number: '604',  label: 'Fournitures consommables', debit:   275_000, credit: 0 },
      { number: '612',  label: 'Locations',               debit: 2_600_000, credit: 0 },
      { number: '635',  label: 'Déplacements et transport', debit:  825_000, credit: 0 },
      { number: '4434', label: 'TVA déductible',          debit:   358_775, credit: 0 },
    ],
  },
  {
    id: 3, name: 'Trésorerie', isNA: false,
    accounts: [
      { number: '521', label: 'Afriland First Bank', debit: 31_450_000, credit: 19_000_000 },
      { number: '522', label: 'BGFI Bank Douala',    debit: 14_800_000, credit:  8_500_000 },
      { number: '57',  label: 'Caisse siège',        debit:    750_000, credit:    500_000 },
    ],
  },
  {
    id: 4, name: 'Paie / Personnel', isNA: false,
    accounts: [
      { number: '661', label: 'Rémunérations directeurs',        debit: 14_550_000, credit:         0 },
      { number: '664', label: 'Charges sociales CNPS',           debit:  2_503_800, credit:         0 },
      { number: '431', label: 'CNPS à payer',                    debit:  1_200_000, credit: 2_503_800 },
      { number: '421', label: 'Rémunérations dues au personnel', debit:          0, credit:         0 },
    ],
  },
  {
    id: 5, name: 'Immobilisations', isNA: false,
    accounts: [
      { number: '2445', label: 'Matériel informatique', debit: 2_800_000, credit:       0 },
      { number: '2446', label: 'Mobilier de bureau',    debit: 1_200_000, credit:       0 },
      { number: '28',   label: 'Amortissements',        debit:         0, credit: 546_200 },
    ],
  },
  {
    id: 6, name: 'Stocks', isNA: true,
    accounts: [],
  },
  {
    id: 7, name: 'Fiscal / TVA', isNA: false,
    accounts: [
      { number: '4435', label: 'TVA collectée',  debit: 3_255_000, credit: 9_374_750 },
      { number: '4434', label: 'TVA déductible', debit:   358_775, credit:   165_000 },
      { number: '89',   label: 'IS dû',          debit:         0, credit: 8_561_850 },
    ],
  },
  {
    id: 8, name: 'Capitaux / Financement', isNA: false,
    accounts: [
      { number: '101', label: 'Capital social',   debit: 0, credit:  5_000_000 },
      { number: '118', label: 'Réserves libres',  debit: 0, credit:  8_200_000 },
      { number: '12',  label: 'Report à nouveau', debit: 0, credit: 12_800_000 },
    ],
  },
  {
    id: 9, name: 'Clôture / Résultat', isNA: false,
    accounts: [
      { number: '13', label: "Résultat net de l'exercice", debit: 8_561_850, credit: 25_945_000 },
    ],
  },
]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReviewedAccount extends StaticAccount {
  solde:        number
  cycle:        number
  status:       'PENDING' | 'REVIEWED' | 'ANOMALY'
  reviewedBy?:  string
  reviewedAt?:  Date
  note?:        string
  anomalyNote?: string
  isAnomaly:    boolean
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

// ── Service functions ─────────────────────────────────────────────────────────

export async function getCyclesWithAccounts(companyId: string, fiscalYearId: string): Promise<ReviewCycle[]> {
  const reviews = await prisma.accountReview.findMany({ where: { companyId, fiscalYearId } })
  const reviewMap = new Map(reviews.map(r => [r.accountNumber, r]))

  return CYCLES.map((cycle) => {
    if (cycle.isNA) {
      return {
        id: cycle.id, name: cycle.name, isNA: true,
        accounts: [], totalAccounts: 0, reviewedCount: 0, anomalyCount: 0, percentage: 0,
        cycleStatus: 'na' as const,
      }
    }

    const accounts: ReviewedAccount[] = cycle.accounts.map((acct) => {
      const rev = reviewMap.get(acct.number)
      const base: ReviewedAccount = {
        ...acct,
        solde:     acct.debit - acct.credit,
        cycle:     cycle.id,
        status:    (rev?.status ?? 'PENDING') as 'PENDING' | 'REVIEWED' | 'ANOMALY',
        isAnomaly: rev?.isAnomaly ?? false,
      }
      if (rev?.reviewedBy) base.reviewedBy = rev.reviewedBy
      if (rev?.reviewedAt) base.reviewedAt = rev.reviewedAt
      if (rev?.note) base.note = rev.note
      if (rev?.anomalyNote) base.anomalyNote = rev.anomalyNote
      return base
    })

    const totalAccounts = accounts.length
    const reviewedCount = accounts.filter(a => a.status === 'REVIEWED').length
    const anomalyCount  = accounts.filter(a => a.status === 'ANOMALY').length
    const percentage    = totalAccounts > 0 ? Math.round((reviewedCount / totalAccounts) * 100) : 0

    let cycleStatus: 'complete' | 'partial' | 'none'
    if (reviewedCount === totalAccounts && anomalyCount === 0) cycleStatus = 'complete'
    else if (reviewedCount > 0 || anomalyCount > 0) cycleStatus = 'partial'
    else cycleStatus = 'none'

    return { id: cycle.id, name: cycle.name, isNA: false, accounts, totalAccounts, reviewedCount, anomalyCount, percentage, cycleStatus }
  })
}

export async function getRevisionProgress(companyId: string, fiscalYearId: string): Promise<RevisionProgress> {
  const cycles = await getCyclesWithAccounts(companyId, fiscalYearId)
  const activeCycles = cycles.filter(c => !c.isNA)

  const total      = activeCycles.reduce((s, c) => s + c.totalAccounts, 0)
  const reviewed   = activeCycles.reduce((s, c) => s + c.reviewedCount, 0)
  const anomalies  = activeCycles.reduce((s, c) => s + c.anomalyCount, 0)
  const percentage = total > 0 ? Math.round((reviewed / total) * 100) : 0

  const blockingReasons: string[] = []

  const incompleteCycles = activeCycles.filter(c => c.id !== 9 && c.cycleStatus !== 'complete')
  for (const c of incompleteCycles) {
    const missing = c.totalAccounts - c.reviewedCount
    blockingReasons.push(`Cycle ${c.id} (${c.name}) : ${missing} compte${missing > 1 ? 's' : ''} non révisé${missing > 1 ? 's' : ''}`)
  }

  const unresolvedAnomalies = await prisma.accountReview.count({
    where: { companyId, fiscalYearId, status: 'ANOMALY', isAnomaly: true },
  })
  if (unresolvedAnomalies > 0) {
    blockingReasons.push(`${unresolvedAnomalies} anomalie${unresolvedAnomalies > 1 ? 's' : ''} non résolue${unresolvedAnomalies > 1 ? 's' : ''}`)
  }

  const cycle9 = activeCycles.find(c => c.id === 9)
  if (cycle9 && cycle9.cycleStatus !== 'complete') {
    const otherComplete = activeCycles.filter(c => c.id !== 9).every(c => c.cycleStatus === 'complete')
    if (!otherComplete) {
      blockingReasons.push('Cycle 9 (Clôture) doit être révisé en dernier')
    }
  }

  const canClose = blockingReasons.length === 0 && percentage === 100
  return { total, reviewed, anomalies, percentage, canClose, blockingReasons }
}

export async function reviewAccount(
  companyId: string, fiscalYearId: string, accountNumber: string, cycle: number, reviewedBy: string, note?: string,
): Promise<void> {
  if (cycle === 9) {
    const cycles = await getCyclesWithAccounts(companyId, fiscalYearId)
    const otherIncomplete = cycles.filter(c => !c.isNA && c.id !== 9 && c.cycleStatus !== 'complete')
    if (otherIncomplete.length > 0) {
      throw new AppError(
        'Le Cycle 9 (Clôture) ne peut être révisé qu\'après tous les autres cycles',
        409,
        'CYCLE9_BLOCKED',
      )
    }
  }

  await prisma.accountReview.upsert({
    where:  { companyId_fiscalYearId_accountNumber: { companyId, fiscalYearId, accountNumber } },
    update: { status: 'REVIEWED', reviewedBy, reviewedAt: new Date(), note: note ?? null, cycle, isAnomaly: false },
    create: { companyId, fiscalYearId, accountNumber, cycle, status: 'REVIEWED', reviewedBy, reviewedAt: new Date(), note: note ?? null },
  })
}

export async function unreviewAccount(companyId: string, fiscalYearId: string, accountNumber: string): Promise<void> {
  await prisma.accountReview.upsert({
    where:  { companyId_fiscalYearId_accountNumber: { companyId, fiscalYearId, accountNumber } },
    update: { status: 'PENDING', reviewedBy: null, reviewedAt: null, note: null, isAnomaly: false },
    create: { companyId, fiscalYearId, accountNumber, cycle: 0, status: 'PENDING' },
  })
}

export async function markAnomaly(
  companyId: string, fiscalYearId: string, accountNumber: string, cycle: number, reviewedBy: string, anomalyNote: string,
): Promise<void> {
  if (!anomalyNote.trim()) throw new AppError('La note d\'anomalie est obligatoire', 400, 'NOTE_REQUIRED')

  await prisma.accountReview.upsert({
    where:  { companyId_fiscalYearId_accountNumber: { companyId, fiscalYearId, accountNumber } },
    update: { status: 'ANOMALY', reviewedBy, reviewedAt: new Date(), anomalyNote, isAnomaly: true, cycle },
    create: { companyId, fiscalYearId, accountNumber, cycle, status: 'ANOMALY', reviewedBy, reviewedAt: new Date(), anomalyNote, isAnomaly: true },
  })
}

export async function resolveAnomaly(
  companyId: string, fiscalYearId: string, accountNumber: string, reviewedBy: string, resolutionNote: string,
): Promise<void> {
  if (!resolutionNote.trim()) throw new AppError('La note de résolution est obligatoire', 400, 'NOTE_REQUIRED')

  const existing = await prisma.accountReview.findUnique({
    where: { companyId_fiscalYearId_accountNumber: { companyId, fiscalYearId, accountNumber } },
  })
  if (!existing || existing.status !== 'ANOMALY') {
    throw new AppError('Compte non marqué en anomalie', 400, 'NOT_ANOMALY')
  }

  await prisma.accountReview.update({
    where: { companyId_fiscalYearId_accountNumber: { companyId, fiscalYearId, accountNumber } },
    data:  { status: 'REVIEWED', reviewedBy, reviewedAt: new Date(), isAnomaly: false, note: resolutionNote },
  })
}

export async function markAllReviewed(companyId: string, fiscalYearId: string, reviewedBy: string): Promise<void> {
  const now = new Date()
  const allAccounts = CYCLES.flatMap(c => c.isNA ? [] : c.accounts.map(a => ({ ...a, cycle: c.id })))

  await Promise.all(allAccounts.map(a =>
    prisma.accountReview.upsert({
      where:  { companyId_fiscalYearId_accountNumber: { companyId, fiscalYearId, accountNumber: a.number } },
      update: { status: 'REVIEWED', reviewedBy, reviewedAt: now },
      create: { companyId, fiscalYearId, accountNumber: a.number, cycle: a.cycle, status: 'REVIEWED', reviewedBy, reviewedAt: now },
    }),
  ))
}
