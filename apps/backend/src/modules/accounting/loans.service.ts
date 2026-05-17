/**
 * Service de gestion des emprunts — Module Comptabilité
 *
 * Réglementation SYSCOHADA / PCG :
 *  - Compte 16x  : Emprunts et dettes assimilées
 *      161 — Emprunts obligataires
 *      162 — Emprunts auprès des établissements de crédit
 *      163 — Avances reçues de l'État
 *      164 — Autres emprunts et dettes
 *      166 — Intérêts courus (à payer)
 *  - Compte 66x  : Frais financiers
 *      661 — Intérêts des emprunts (OHADA)
 *      671 — Intérêts financiers
 *  - Compte 521  : Banques (PCG 512)
 *
 *  Écritures comptables type :
 *
 *  Mise à disposition (décaissement) :
 *      D 521 (banque)
 *      C 162 (emprunt)
 *
 *  Remboursement d'une échéance :
 *      D 162 (emprunt)          ← part capital
 *      D 661 (intérêts)         ← part intérêts
 *      C 521 (banque)           ← total échéance
 *
 *  Intérêts courus à la clôture (CAP) :
 *      D 661
 *      C 1661 (intérêts courus)
 *
 * Quatre types d'amortissement supportés :
 *  - CONSTANT_PAYMENT   : mensualité constante (annuité française)
 *  - CONSTANT_PRINCIPAL : amortissement linéaire (capital constant)
 *  - IN_FINE            : capital remboursé in fine, intérêts payés régulièrement
 *  - BULLET             : capital + intérêts payés intégralement à l'échéance
 */
import type { Loan as LoanModel, LoanAmortType, LoanStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import { normalizeAccountCode } from '../../lib/accountCodes.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScheduleLine {
  period:           number
  date:             string  // ISO yyyy-mm-dd
  openingPrincipal: number
  payment:          number
  interest:         number
  capital:          number
  closingPrincipal: number
}

export interface LoanSummary {
  totalPayments:   number
  totalInterest:   number
  totalPrincipal:  number
  monthlyPayment:  number  // mensualité moyenne (ou fixe si CONSTANT_PAYMENT)
  effectiveRate:   number  // taux effectif annualisé
  paidPrincipal:   number  // capital remboursé à ce jour (date du jour)
  paidInterest:    number  // intérêts payés à ce jour
  remainingPrincipal: number
  nextDueDate:     string | null
  nextDueAmount:   number
}

interface LoanWithSchedule extends LoanModel {
  schedule:  ScheduleLine[]
  summary:   LoanSummary
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Ajoute n mois à une date, en gérant correctement les fins de mois */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  const targetMonth = d.getMonth() + months
  d.setMonth(targetMonth)
  return d
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ── Calcul du tableau d'amortissement ────────────────────────────────────────

/**
 * Génère le tableau d'amortissement complet pour un emprunt.
 * Toutes les fréquences sont mensuelles (1 ligne par mois).
 */
export function computeSchedule(loan: {
  principal:        number
  rate:             number  // taux annuel
  durationMonths:   number
  startDate:        Date
  firstPaymentDate: Date
  amortType:        LoanAmortType
}): ScheduleLine[] {
  const { principal, rate, durationMonths, firstPaymentDate, amortType } = loan
  if (durationMonths < 1) return []
  if (principal <= 0) return []

  const monthlyRate = rate / 12
  const schedule: ScheduleLine[] = []

  if (amortType === 'CONSTANT_PAYMENT') {
    // M = K · i / (1 − (1+i)^−n)
    const m = monthlyRate === 0
      ? principal / durationMonths
      : principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -durationMonths))
    let remaining = principal
    for (let p = 1; p <= durationMonths; p++) {
      const interest = round2(remaining * monthlyRate)
      const capital  = round2(m - interest)
      const closing  = p === durationMonths ? 0 : round2(remaining - capital)
      schedule.push({
        period:           p,
        date:             toISO(addMonths(firstPaymentDate, p - 1)),
        openingPrincipal: round2(remaining),
        payment:          round2(p === durationMonths ? interest + remaining : m),
        interest,
        capital:          p === durationMonths ? round2(remaining) : capital,
        closingPrincipal: closing,
      })
      remaining = closing
    }
  } else if (amortType === 'CONSTANT_PRINCIPAL') {
    const capitalPerPeriod = principal / durationMonths
    let remaining = principal
    for (let p = 1; p <= durationMonths; p++) {
      const interest = round2(remaining * monthlyRate)
      const capital  = round2(capitalPerPeriod)
      const closing  = p === durationMonths ? 0 : round2(remaining - capital)
      const cap      = p === durationMonths ? round2(remaining) : capital
      schedule.push({
        period:           p,
        date:             toISO(addMonths(firstPaymentDate, p - 1)),
        openingPrincipal: round2(remaining),
        payment:          round2(interest + cap),
        interest,
        capital:          cap,
        closingPrincipal: closing,
      })
      remaining = closing
    }
  } else if (amortType === 'IN_FINE') {
    // Intérêts payés tous les mois, capital à l'échéance
    const interestMonth = round2(principal * monthlyRate)
    for (let p = 1; p <= durationMonths; p++) {
      const isLast = p === durationMonths
      schedule.push({
        period:           p,
        date:             toISO(addMonths(firstPaymentDate, p - 1)),
        openingPrincipal: principal,
        payment:          isLast ? round2(principal + interestMonth) : interestMonth,
        interest:         interestMonth,
        capital:          isLast ? principal : 0,
        closingPrincipal: isLast ? 0 : principal,
      })
    }
  } else if (amortType === 'BULLET') {
    // Tout payé à l'échéance (intérêts capitalisés)
    const total = round2(principal * (1 + monthlyRate * durationMonths))
    const totalInterest = round2(total - principal)
    schedule.push({
      period:           1,
      date:             toISO(addMonths(firstPaymentDate, durationMonths - 1)),
      openingPrincipal: principal,
      payment:          total,
      interest:         totalInterest,
      capital:          principal,
      closingPrincipal: 0,
    })
  }

  return schedule
}

/** Calcule le résumé d'un emprunt à partir de son tableau d'amortissement */
function computeSummary(loan: LoanModel, schedule: ScheduleLine[], today = new Date()): LoanSummary {
  const totalPayments  = schedule.reduce((s, l) => s + l.payment,  0)
  const totalInterest  = schedule.reduce((s, l) => s + l.interest, 0)
  const totalPrincipal = schedule.reduce((s, l) => s + l.capital,  0)

  const todayIso = toISO(today)
  let paidPrincipal = 0, paidInterest = 0
  let nextDueDate: string | null = null
  let nextDueAmount = 0

  for (const line of schedule) {
    if (line.date <= todayIso) {
      paidPrincipal += line.capital
      paidInterest  += line.interest
    } else if (nextDueDate === null) {
      nextDueDate    = line.date
      nextDueAmount  = line.payment
    }
  }

  const remainingPrincipal = Number(loan.principal) - paidPrincipal
  const monthlyPayment     = schedule.length > 0 ? schedule[0]!.payment : 0
  // Taux effectif = total intérêts / capital (approximation simple)
  const effectiveRate      = Number(loan.principal) > 0 ? totalInterest / Number(loan.principal) : 0

  return {
    totalPayments:      round2(totalPayments),
    totalInterest:      round2(totalInterest),
    totalPrincipal:     round2(totalPrincipal),
    monthlyPayment:     round2(monthlyPayment),
    effectiveRate:      round2(effectiveRate * 10000) / 10000,
    paidPrincipal:      round2(paidPrincipal),
    paidInterest:       round2(paidInterest),
    remainingPrincipal: round2(remainingPrincipal),
    nextDueDate,
    nextDueAmount:      round2(nextDueAmount),
  }
}

// ── Référence séquentielle ────────────────────────────────────────────────────

async function nextReference(companyId: string, year: number): Promise<string> {
  const prefix = `EMP-${year}-`
  const last = await prisma.loan.findFirst({
    where:   { companyId, reference: { startsWith: prefix } },
    orderBy: { reference: 'desc' },
    select:  { reference: true },
  })
  let next = 1
  if (last?.reference) {
    const m = /-(\d+)$/.exec(last.reference)
    if (m) next = parseInt(m[1]!, 10) + 1
  }
  return `${prefix}${String(next).padStart(3, '0')}`
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listLoans(companyId: string) {
  const loans = await prisma.loan.findMany({
    where:   { companyId },
    orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
  })
  // Pour chaque emprunt, calcule un résumé léger
  return loans.map(l => {
    const schedule = computeSchedule({
      principal:        Number(l.principal),
      rate:             Number(l.rate),
      durationMonths:   l.durationMonths,
      startDate:        l.startDate,
      firstPaymentDate: l.firstPaymentDate,
      amortType:        l.amortType,
    })
    const summary = computeSummary(l, schedule)
    return { ...l, principal: Number(l.principal), rate: Number(l.rate), summary }
  })
}

export async function getLoan(companyId: string, id: string): Promise<LoanWithSchedule> {
  const loan = await prisma.loan.findFirst({ where: { id, companyId } })
  if (!loan) throw new AppError('Emprunt introuvable', 404, 'NOT_FOUND')

  const schedule = computeSchedule({
    principal:        Number(loan.principal),
    rate:             Number(loan.rate),
    durationMonths:   loan.durationMonths,
    startDate:        loan.startDate,
    firstPaymentDate: loan.firstPaymentDate,
    amortType:        loan.amortType,
  })
  const summary = computeSummary(loan, schedule)
  return { ...loan, schedule, summary }
}

interface CreateLoanInput {
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

export async function createLoan(
  companyId: string,
  data: CreateLoanInput,
  userId: string,
) {
  if (!data.name?.trim())   throw new AppError('Libellé requis', 400, 'VALIDATION_ERROR')
  if (!data.lender?.trim()) throw new AppError('Prêteur requis', 400, 'VALIDATION_ERROR')
  if (!(data.principal > 0)) throw new AppError('Capital strictement positif', 400, 'VALIDATION_ERROR')
  if (data.rate < 0 || data.rate > 1) throw new AppError('Taux entre 0 et 1 (ex 0.085 = 8,5%)', 400, 'VALIDATION_ERROR')
  if (data.durationMonths < 1) throw new AppError('Durée minimale 1 mois', 400, 'VALIDATION_ERROR')

  const startDate        = new Date(data.startDate)
  const firstPaymentDate = new Date(data.firstPaymentDate)
  if (firstPaymentDate < startDate)
    throw new AppError('La première échéance doit être postérieure ou égale à la mise à disposition', 400, 'INVALID_DATES')

  const reference = data.reference?.trim() || (await nextReference(companyId, startDate.getFullYear()))

  // Comptes par défaut selon zone (récupérer la zone de la société)
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { accountingZone: true } })
  const isOhada = company.accountingZone === 'OHADA' || company.accountingZone !== 'FRANCE'

  const loanAccount     = data.account?.trim()         ? normalizeAccountCode(data.account)         : normalizeAccountCode('162')
  const bankAcct        = data.bankAccount?.trim()     ? normalizeAccountCode(data.bankAccount)     : normalizeAccountCode(isOhada ? '521' : '512')
  const interestAcct    = data.interestAccount?.trim() ? normalizeAccountCode(data.interestAccount) : normalizeAccountCode(isOhada ? '671' : '661')

  return prisma.loan.create({
    data: {
      companyId,
      reference,
      name:             data.name.trim(),
      lender:           data.lender.trim(),
      principal:        data.principal,
      rate:             data.rate,
      durationMonths:   data.durationMonths,
      startDate,
      firstPaymentDate,
      amortType:        data.amortType ?? 'CONSTANT_PAYMENT',
      currency:         data.currency ?? 'XAF',
      account:          loanAccount,
      bankAccount:      bankAcct,
      interestAccount:  interestAcct,
      notes:            data.notes ?? null,
      createdBy:        userId,
    },
  })
}

export async function updateLoan(
  companyId: string,
  id: string,
  data: Partial<CreateLoanInput> & { status?: LoanStatus },
) {
  const existing = await prisma.loan.findFirst({ where: { id, companyId } })
  if (!existing) throw new AppError('Emprunt introuvable', 404, 'NOT_FOUND')

  return prisma.loan.update({
    where: { id },
    data: {
      ...(data.name        !== undefined ? { name: data.name }       : {}),
      ...(data.lender      !== undefined ? { lender: data.lender }   : {}),
      ...(data.principal   !== undefined ? { principal: data.principal } : {}),
      ...(data.rate        !== undefined ? { rate: data.rate }       : {}),
      ...(data.durationMonths !== undefined ? { durationMonths: data.durationMonths } : {}),
      ...(data.startDate   !== undefined ? { startDate: new Date(data.startDate) } : {}),
      ...(data.firstPaymentDate !== undefined ? { firstPaymentDate: new Date(data.firstPaymentDate) } : {}),
      ...(data.amortType   !== undefined ? { amortType: data.amortType } : {}),
      ...(data.currency    !== undefined ? { currency: data.currency } : {}),
      ...(data.account     !== undefined ? { account: data.account ? normalizeAccountCode(data.account) : null } : {}),
      ...(data.bankAccount !== undefined ? { bankAccount: data.bankAccount ? normalizeAccountCode(data.bankAccount) : null } : {}),
      ...(data.interestAccount !== undefined ? { interestAccount: data.interestAccount ? normalizeAccountCode(data.interestAccount) : null } : {}),
      ...(data.notes       !== undefined ? { notes: data.notes }     : {}),
      ...(data.status      !== undefined ? { status: data.status }   : {}),
    },
  })
}

export async function deleteLoan(companyId: string, id: string) {
  const existing = await prisma.loan.findFirst({ where: { id, companyId } })
  if (!existing) throw new AppError('Emprunt introuvable', 404, 'NOT_FOUND')
  await prisma.loan.delete({ where: { id } })
  return { deleted: 1 }
}
