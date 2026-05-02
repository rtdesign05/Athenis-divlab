import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'

/** Cache fiscal year lookup to avoid repeated DB calls per revision operation */
const fyYearCache = new Map<string, number>()

async function getFiscalYearYear(fiscalYearId: string): Promise<number> {
  if (fyYearCache.has(fiscalYearId)) return fyYearCache.get(fiscalYearId)!
  const fy = await prisma.fiscalYear.findUnique({ where: { id: fiscalYearId }, select: { year: true } })
  const year = fy?.year ?? new Date().getFullYear()
  fyYearCache.set(fiscalYearId, year)
  return year
}

// ── SYSCOHADA Cycle definitions (by account number prefixes) ──────────────────
//
// Prefixes are matched in declaration order — more specific prefixes must come
// before broader ones within the same cycle (e.g. '42' before '4').

interface CycleDef {
  id:       number
  name:     string
  /** Account number prefixes that belong to this cycle (matched longest first). */
  prefixes: string[]
}

export const CYCLE_DEFS: CycleDef[] = [
  {
    id: 1, name: 'Ventes / Clients',
    prefixes: ['41', '70', '71', '72', '73', '74', '75', '77', '78'],
  },
  {
    id: 2, name: 'Achats / Fournisseurs',
    prefixes: ['40', '60', '61', '62', '63', '64', '65'],
  },
  {
    id: 3, name: 'Trésorerie',
    prefixes: ['51', '52', '53', '54', '56', '57', '58'],
  },
  {
    id: 4, name: 'Paie / Personnel',
    prefixes: ['42', '43', '66', '67'],
  },
  {
    id: 5, name: 'Immobilisations',
    prefixes: ['20', '21', '22', '23', '24', '25', '26', '27', '28', '29'],
  },
  {
    id: 6, name: 'Stocks',
    prefixes: ['30', '31', '32', '33', '34', '35', '36', '37', '38', '39'],
  },
  {
    id: 7, name: 'Fiscal / TVA',
    prefixes: ['44', '45', '46', '47', '48', '49'],
  },
  {
    id: 8, name: 'Capitaux / Financement',
    prefixes: ['10', '11', '12', '14', '15', '16', '17', '18', '19'],
  },
  {
    id: 9, name: 'Clôture / Résultat',
    prefixes: ['13', '88', '89'],
  },
]

/** Assign a SYSCOHADA cycle id to an account number (returns 0 if unclassified). */
function assignCycle(accountNumber: string): number {
  for (const cycle of CYCLE_DEFS) {
    for (const prefix of cycle.prefixes) {
      if (accountNumber.startsWith(prefix)) return cycle.id
    }
  }
  return 0
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReviewedAccount {
  number:          string
  label:           string
  debit:           number
  credit:          number
  solde:           number
  cycle:           number
  status:          'PENDING' | 'REVIEWED' | 'ANOMALY'
  reviewedBy?:     string
  reviewedAt?:     Date
  note?:           string
  anomalyNote?:    string
  resolutionNote?: string
  isAnomaly:       boolean
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fetch real balance (debit/credit per account) from journal entries for a FY. */
async function getBalanceAccounts(
  companyId: string,
  fiscalYearId: string,
): Promise<{ number: string; label: string; debit: number; credit: number }[]> {
  const entries = await prisma.journalEntry.findMany({
    where:  { companyId, fiscalYearId },
    select: { compte: true, debit: true, credit: true },
  })

  const map = new Map<string, { debit: number; credit: number }>()
  for (const e of entries) {
    const cur = map.get(e.compte) ?? { debit: 0, credit: 0 }
    cur.debit  += Number(e.debit)
    cur.credit += Number(e.credit)
    map.set(e.compte, cur)
  }

  // Enrich with labels from AccountPlan
  const accountNumbers = [...map.keys()]
  const plans = await prisma.accountPlan.findMany({
    where:  { companyId, numero: { in: accountNumbers } },
    select: { numero: true, intitule: true },
  })
  const labelMap = new Map(plans.map(p => [p.numero, p.intitule]))

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([acct, { debit, credit }]) => ({
      number: acct,
      label:  labelMap.get(acct) ?? acct,
      debit,
      credit,
    }))
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function getCyclesWithAccounts(
  companyId: string,
  fiscalYearId: string,
): Promise<ReviewCycle[]> {
  // 1. Real balance from journal
  const balanceAccounts = await getBalanceAccounts(companyId, fiscalYearId)

  // 2. Existing review records
  const reviews = await prisma.accountReview.findMany({
    where: { companyId, fiscalYearId },
  })
  const reviewMap = new Map(reviews.map(r => [r.accountNumber, r]))

  // 3. Group accounts into cycles
  const cycleMap = new Map<number, ReviewedAccount[]>()
  for (const cycle of CYCLE_DEFS) cycleMap.set(cycle.id, [])
  const unclassified: ReviewedAccount[] = []

  for (const acct of balanceAccounts) {
    const cycleId = assignCycle(acct.number)
    const rev     = reviewMap.get(acct.number)

    const reviewed: ReviewedAccount = {
      number:    acct.number,
      label:     acct.label,
      debit:     acct.debit,
      credit:    acct.credit,
      solde:     acct.debit - acct.credit,
      cycle:     cycleId,
      status:    (rev?.status ?? 'PENDING') as 'PENDING' | 'REVIEWED' | 'ANOMALY',
      isAnomaly: rev?.isAnomaly ?? false,
    }
    if (rev?.reviewedBy)  reviewed.reviewedBy  = rev.reviewedBy
    if (rev?.reviewedAt)  reviewed.reviewedAt  = rev.reviewedAt
    if (rev?.anomalyNote) reviewed.anomalyNote = rev.anomalyNote
    // note is re-used as resolution note after anomaly resolution
    if (rev?.note && rev.status === 'REVIEWED' && rev.anomalyNote) {
      reviewed.resolutionNote = rev.note
    } else if (rev?.note) {
      reviewed.note = rev.note
    }

    if (cycleId === 0) {
      unclassified.push(reviewed)
    } else {
      cycleMap.get(cycleId)!.push(reviewed)
    }
  }

  // 4. Build output cycles
  const result: ReviewCycle[] = CYCLE_DEFS.map((def) => {
    const accounts      = cycleMap.get(def.id) ?? []
    const isNA          = accounts.length === 0
    const totalAccounts = accounts.length
    const reviewedCount = accounts.filter(a => a.status === 'REVIEWED').length
    const anomalyCount  = accounts.filter(a => a.status === 'ANOMALY').length
    const percentage    = totalAccounts > 0 ? Math.round((reviewedCount / totalAccounts) * 100) : 0

    let cycleStatus: 'complete' | 'partial' | 'none' | 'na'
    if (isNA) {
      cycleStatus = 'na'
    } else if (reviewedCount === totalAccounts && anomalyCount === 0) {
      cycleStatus = 'complete'
    } else if (reviewedCount > 0 || anomalyCount > 0) {
      cycleStatus = 'partial'
    } else {
      cycleStatus = 'none'
    }

    return {
      id: def.id,
      name: def.name,
      isNA,
      accounts,
      totalAccounts,
      reviewedCount,
      anomalyCount,
      percentage,
      cycleStatus,
    }
  })

  return result
}

export async function getRevisionProgress(
  companyId: string,
  fiscalYearId: string,
): Promise<RevisionProgress> {
  const cycles      = await getCyclesWithAccounts(companyId, fiscalYearId)
  const activeCycles = cycles.filter(c => !c.isNA)

  const total      = activeCycles.reduce((s, c) => s + c.totalAccounts, 0)
  const reviewed   = activeCycles.reduce((s, c) => s + c.reviewedCount, 0)
  const anomalies  = activeCycles.reduce((s, c) => s + c.anomalyCount, 0)
  const percentage = total > 0 ? Math.round((reviewed / total) * 100) : 0

  const blockingReasons: string[] = []

  // Non-cycle-9 cycles that are incomplete
  const incompleteCycles = activeCycles.filter(c => c.id !== 9 && c.cycleStatus !== 'complete')
  for (const c of incompleteCycles) {
    const pending = c.totalAccounts - c.reviewedCount
    blockingReasons.push(
      `Cycle ${c.id} (${c.name}) : ${pending} compte${pending > 1 ? 's' : ''} non révisé${pending > 1 ? 's' : ''}`,
    )
  }

  // Unresolved anomalies
  const unresolvedAnomalies = await prisma.accountReview.count({
    where: { companyId, fiscalYearId, status: 'ANOMALY', isAnomaly: true },
  })
  if (unresolvedAnomalies > 0) {
    blockingReasons.push(
      `${unresolvedAnomalies} anomalie${unresolvedAnomalies > 1 ? 's' : ''} non résolue${unresolvedAnomalies > 1 ? 's' : ''}`,
    )
  }

  // Cycle 9 must be last
  const cycle9 = activeCycles.find(c => c.id === 9)
  if (cycle9 && cycle9.cycleStatus !== 'complete') {
    const otherComplete = activeCycles.filter(c => c.id !== 9).every(c => c.cycleStatus === 'complete')
    if (!otherComplete) {
      blockingReasons.push('Cycle 9 (Clôture / Résultat) doit être révisé en dernier')
    }
  }

  const canClose = blockingReasons.length === 0 && percentage === 100
  return { total, reviewed, anomalies, percentage, canClose, blockingReasons }
}

export async function reviewAccount(
  companyId: string,
  fiscalYearId: string,
  accountNumber: string,
  cycle: number,
  reviewedBy: string,
  note?: string,
): Promise<void> {
  // Cycle 9 cannot be reviewed before all others are complete
  if (cycle === 9) {
    const cycles = await getCyclesWithAccounts(companyId, fiscalYearId)
    const otherIncomplete = cycles.filter(c => !c.isNA && c.id !== 9 && c.cycleStatus !== 'complete')
    if (otherIncomplete.length > 0) {
      throw new AppError(
        'Le Cycle 9 (Clôture / Résultat) ne peut être révisé qu\'après tous les autres cycles',
        409,
        'CYCLE9_BLOCKED',
      )
    }
  }

  const fyYear = await getFiscalYearYear(fiscalYearId)
  await prisma.accountReview.upsert({
    where:  { companyId_fiscalYearId_accountNumber: { companyId, fiscalYearId, accountNumber } },
    update: { status: 'REVIEWED', reviewedBy, reviewedAt: new Date(), note: note ?? null, cycle, isAnomaly: false },
    create: { companyId, fiscalYearId, year: fyYear, accountNumber, cycle, status: 'REVIEWED', reviewedBy, reviewedAt: new Date(), note: note ?? null },
  })
}

export async function unreviewAccount(
  companyId: string,
  fiscalYearId: string,
  accountNumber: string,
): Promise<void> {
  const fyYearUnreview = await getFiscalYearYear(fiscalYearId)
  await prisma.accountReview.upsert({
    where:  { companyId_fiscalYearId_accountNumber: { companyId, fiscalYearId, accountNumber } },
    update: { status: 'PENDING', reviewedBy: null, reviewedAt: null, note: null, isAnomaly: false },
    create: { companyId, fiscalYearId, year: fyYearUnreview, accountNumber, cycle: 0, status: 'PENDING' },
  })
}

export async function markAnomaly(
  companyId: string,
  fiscalYearId: string,
  accountNumber: string,
  cycle: number,
  reviewedBy: string,
  anomalyNote: string,
): Promise<void> {
  if (!anomalyNote.trim()) throw new AppError('La note d\'anomalie est obligatoire', 400, 'NOTE_REQUIRED')

  const fyYearAnomaly = await getFiscalYearYear(fiscalYearId)
  await prisma.accountReview.upsert({
    where:  { companyId_fiscalYearId_accountNumber: { companyId, fiscalYearId, accountNumber } },
    update: { status: 'ANOMALY', reviewedBy, reviewedAt: new Date(), anomalyNote, isAnomaly: true, cycle },
    create: { companyId, fiscalYearId, year: fyYearAnomaly, accountNumber, cycle, status: 'ANOMALY', reviewedBy, reviewedAt: new Date(), anomalyNote, isAnomaly: true },
  })
}

export async function resolveAnomaly(
  companyId: string,
  fiscalYearId: string,
  accountNumber: string,
  reviewedBy: string,
  resolutionNote: string,
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
    // Store resolution note in `note` field (anomalyNote is preserved for audit)
    data:  { status: 'REVIEWED', reviewedBy, reviewedAt: new Date(), isAnomaly: false, note: resolutionNote },
  })
}

export async function markAllReviewed(
  companyId: string,
  fiscalYearId: string,
  reviewedBy: string,
): Promise<void> {
  // Get real accounts from balance (not static list)
  const accounts = await getBalanceAccounts(companyId, fiscalYearId)
  const now      = new Date()

  const fyYearAll = await getFiscalYearYear(fiscalYearId)
  await Promise.all(
    accounts.map((acct) => {
      const cycleId = assignCycle(acct.number)
      return prisma.accountReview.upsert({
        where:  { companyId_fiscalYearId_accountNumber: { companyId, fiscalYearId, accountNumber: acct.number } },
        update: { status: 'REVIEWED', reviewedBy, reviewedAt: now, cycle: cycleId },
        create: { companyId, fiscalYearId, year: fyYearAll, accountNumber: acct.number, cycle: cycleId, status: 'REVIEWED', reviewedBy, reviewedAt: now },
      })
    }),
  )
}
