import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import { getAgenceFilter } from '../../middleware/agenceFilter.js'
import type { JwtPayload } from '@athenis/shared-types'
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  ListInvoicesInput,
} from './invoices.dto.js'

const CLIENT_SELECT = { id: true, nom: true, email: true }
const LINES_INCLUDE = { lines: { orderBy: { description: 'asc' as const } }, client: { select: CLIENT_SELECT }, agence: { select: { nom: true } } } as const

export async function nextInvoiceReference(companyId: string, tx?: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear()
  const db = tx ?? prisma
  if (tx) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId + ':FA:' + year}))`
  }
  const count = await db.invoice.count({
    where: { companyId, reference: { startsWith: `FA-${year}-` } },
  })
  return `FA-${year}-${String(count + 1).padStart(3, '0')}`
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listInvoices(companyId: string, query: ListInvoicesInput, user?: JwtPayload) {
  const { page, limit, status, clientId } = query
  const where: Prisma.InvoiceWhereInput = {
    companyId,
    ...(user ? getAgenceFilter(user) : {}),
    ...(status   ? { status }   : {}),
    ...(clientId ? { clientId } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: LINES_INCLUDE,
      orderBy: { issuedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ])
  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getInvoice(companyId: string, id: string, user?: JwtPayload) {
  const invoice = await prisma.invoice.findUnique({
    where:   { id },
    include: LINES_INCLUDE,
  })
  if (!invoice || invoice.companyId !== companyId)
    throw new AppError('Invoice not found', 404, 'NOT_FOUND')

  // Enforce agence isolation: a restricted user cannot access invoices of other agences
  if (user?.isRestricted && user.agenceIds.length > 0) {
    if (!invoice.agenceId || !user.agenceIds.includes(invoice.agenceId)) {
      throw new AppError('Invoice not found', 404, 'NOT_FOUND')
    }
  }

  return invoice
}

export async function createInvoice(companyId: string, data: CreateInvoiceInput, _createdBy: string, user?: JwtPayload) {
  return prisma.$transaction(async (tx) => {
    const client = await tx.client.findUnique({ where: { id: data.clientId } })
    if (!client || client.companyId !== companyId)
      throw new AppError('Client not found', 404, 'NOT_FOUND')

    const amountHT  = new Prisma.Decimal(data.subtotal ?? 0)
    const vatRatePct = new Prisma.Decimal(data.taxRate ?? 20)
    const taxAmount = amountHT.mul(vatRatePct).div(100).toDecimalPlaces(2)
    const amountTTC = amountHT.add(taxAmount).toDecimalPlaces(2)
    const reference = await nextInvoiceReference(companyId, tx)

    // Tag with the user's primary agenceId so it is only visible to that agence
    const agenceId = user?.agenceId ?? null

    return tx.invoice.create({
      data: {
        companyId,
        clientId:           data.clientId,
        modele:             data.modele ?? 'standard',
        reference,
        issuedAt:           data.issueDate ?? new Date(),
        dueAt:              data.dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amountHT,
        vatRate:            vatRatePct,
        taxAmount,
        amountTTC,
        description:        data.notes ?? null,
        conditionsPaiement: data.conditionsPaiement ?? null,
        status:             'DRAFT',
        ...(agenceId ? { agenceId } : {}),
        lines: {
          create: (data.lines ?? []).map(l => ({
            description:    l.description,
            quantite:       new Prisma.Decimal(l.quantite),
            unite:          l.unite,
            prixUnitaireHT: new Prisma.Decimal(l.prixUnitaireHT),
            tvaRate:        new Prisma.Decimal(l.tvaRate),
            montantHT:      new Prisma.Decimal(l.montantHT),
          })),
        },
      },
      include: LINES_INCLUDE,
    })
  })
}

export async function updateInvoice(companyId: string, id: string, data: UpdateInvoiceInput) {
  const existing = await getInvoice(companyId, id)
  if (existing.status === 'PAID' || existing.status === 'CANCELLED')
    throw new AppError('Cannot edit a paid or cancelled invoice', 409, 'INVOICE_LOCKED')

  const amountHT  = data.subtotal != null ? new Prisma.Decimal(data.subtotal) : existing.amountHT
  const vatRatePct = new Prisma.Decimal(data.taxRate ?? Number(existing.vatRate))
  const taxAmount = amountHT.mul(vatRatePct).div(100).toDecimalPlaces(2)
  const amountTTC = amountHT.add(taxAmount).toDecimalPlaces(2)

  return prisma.invoice.update({
    where: { id },
    data: {
      ...(data.clientId  ? { clientId: data.clientId }             : {}),
      ...(data.issueDate ? { issuedAt: data.issueDate }            : {}),
      ...(data.dueDate   ? { dueAt: data.dueDate }                 : {}),
      ...(data.notes !== undefined ? { description: data.notes }         : {}),
      ...(data.conditionsPaiement !== undefined ? { conditionsPaiement: data.conditionsPaiement ?? null } : {}),
      ...(data.modele    ? { modele: data.modele }                  : {}),
      amountHT, vatRate: vatRatePct, taxAmount, amountTTC,
      ...(data.lines ? {
        lines: {
          deleteMany: {},
          create: data.lines.map(l => ({
            description:    l.description,
            quantite:       new Prisma.Decimal(l.quantite),
            unite:          l.unite,
            prixUnitaireHT: new Prisma.Decimal(l.prixUnitaireHT),
            tvaRate:        new Prisma.Decimal(l.tvaRate),
            montantHT:      new Prisma.Decimal(l.montantHT),
          })),
        },
      } : {}),
    },
    include: LINES_INCLUDE,
  })
}

const VALID_INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'] as const
type InvoiceStatusType = (typeof VALID_INVOICE_STATUSES)[number]

export async function updateInvoiceStatus(companyId: string, id: string, status: string) {
  if (!(VALID_INVOICE_STATUSES as readonly string[]).includes(status)) {
    throw new AppError(`Statut invalide: ${status}`, 400, 'INVALID_STATUS')
  }
  await getInvoice(companyId, id)
  const extra = status === 'PAID' ? { paidAt: new Date() } : {}
  return prisma.invoice.update({ where: { id }, data: { status: status as InvoiceStatusType, ...extra } })
}

export async function deleteInvoice(companyId: string, id: string) {
  const invoice = await getInvoice(companyId, id)
  if (invoice.status !== 'DRAFT')
    throw new AppError('Only draft invoices can be deleted', 409, 'INVOICE_NOT_DRAFT')
  await prisma.invoice.delete({ where: { id } })
}

export async function invoiceStats(companyId: string, user?: JwtPayload) {
  const af = user ? getAgenceFilter(user) : {}
  const [byStatus, totals] = await Promise.all([
    prisma.invoice.groupBy({
      by: ['status'],
      where: { companyId, ...af },
      _count: true,
      _sum: { amountTTC: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId, ...af },
      _sum: { amountHT: true, amountTTC: true },
      _count: true,
    }),
  ])
  return { byStatus, totals }
}

// ── Dashboard KPIs ────────────────────────────────────────────────────────────

export async function dashboardStats(
  companyId: string,
  opts: { from?: Date; to?: Date } = {},
  user?: JwtPayload,
) {
  const now  = new Date()
  const y    = now.getFullYear()
  // Inclusive start / exclusive end (midnight of next day)
  const from = opts.from ?? new Date(y, 0, 1)
  const to   = opts.to
    ? new Date(new Date(opts.to).setHours(23, 59, 59, 999))
    : new Date(y + 1, 0, 1)

  // Previous period: same duration shifted exactly 1 year back
  const prevFrom = new Date(from.getFullYear() - 1, from.getMonth(), from.getDate())
  const prevTo   = new Date(to.getFullYear()   - 1, to.getMonth(),   to.getDate(), 23, 59, 59, 999)

  const af = user ? getAgenceFilter(user) : {}

  const [paidCurr, paidPrev, expenses, paidInvoicesForDSO, pending, overdue] = await Promise.all([
    prisma.invoice.aggregate({
      where: { companyId, ...af, status: 'PAID', paidAt: { gte: from, lte: to } },
      _sum: { amountTTC: true, amountHT: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId, ...af, status: 'PAID', paidAt: { gte: prevFrom, lte: prevTo } },
      _sum: { amountTTC: true },
    }),
    prisma.expense.aggregate({
      where: { companyId, ...af, date: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.invoice.findMany({
      where: { companyId, ...af, status: 'PAID', paidAt: { not: null }, issuedAt: { gte: from, lte: to } },
      select: { issuedAt: true, paidAt: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId, ...af, status: { in: ['SENT', 'OVERDUE'] } },
      _sum: { amountTTC: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { companyId, ...af, status: 'OVERDUE' },
      _sum: { amountTTC: true },
      _count: true,
    }),
  ])

  const revenueCurr   = Number(paidCurr._sum?.amountTTC   ?? 0)
  const revenuePrev   = Number(paidPrev._sum?.amountTTC   ?? 0)
  const revenueGrowth = revenuePrev > 0 ? ((revenueCurr - revenuePrev) / revenuePrev) * 100 : null
  const totalExpenses = Number(expenses._sum?.amount  ?? 0)
  const grossProfit   = revenueCurr - totalExpenses
  const grossMargin   = revenueCurr > 0 ? grossProfit / revenueCurr : null

  let dso: number | null = null
  if (paidInvoicesForDSO.length > 0) {
    const totalDays = paidInvoicesForDSO.reduce((sum, inv) => {
      const days = (new Date(inv.paidAt!).getTime() - new Date(inv.issuedAt).getTime()) / 86_400_000
      return sum + Math.max(0, days)
    }, 0)
    dso = Math.round(totalDays / paidInvoicesForDSO.length)
  }

  return {
    revenue:       { current: revenueCurr, previous: revenuePrev, growth: revenueGrowth },
    grossProfit:   { amount: grossProfit, margin: grossMargin },
    dso,
    pendingAmount: Number(pending._sum?.amountTTC ?? 0),
    pendingCount:  pending._count,
    overdueAmount: Number(overdue._sum?.amountTTC ?? 0),
    overdueCount:  overdue._count,
  }
}

// ── Reminders ─────────────────────────────────────────────────────────────────

export async function getReminders(companyId: string, user?: JwtPayload) {
  const now = new Date()
  const af  = user ? getAgenceFilter(user) : {}
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      ...af,
      status: { in: ['SENT', 'OVERDUE'] },
    },
    include: { client: { select: CLIENT_SELECT } },
    orderBy: { dueAt: 'asc' },
  })

  return invoices.map((inv) => {
    const dueAt = inv.dueAt ? new Date(inv.dueAt) : now
    const daysOverdue = Math.floor((now.getTime() - dueAt.getTime()) / 86_400_000)
    let reminderLevel: 1 | 2 | 3 | null = null
    if (daysOverdue >= 30) reminderLevel = 3
    else if (daysOverdue >= 14) reminderLevel = 2
    else if (daysOverdue >= 7)  reminderLevel = 1

    return { ...inv, daysOverdue, reminderLevel }
  }).filter((inv) => inv.daysOverdue >= 0)
}

// ── Cash Flow Forecast (90 days) ──────────────────────────────────────────────

export async function cashFlowForecast(companyId: string, user?: JwtPayload) {
  const now    = new Date()
  const end90  = new Date(now.getTime() + 90 * 86_400_000)
  const af     = user ? getAgenceFilter(user) : {}

  const [pendingInvoices, recentExpenses] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId,
        ...af,
        status: { in: ['SENT', 'OVERDUE'] },
        dueAt: { lte: end90 },
      },
      select: { dueAt: true, amountTTC: true },
    }),
    prisma.expense.findMany({
      where: { companyId, ...af, date: { gte: new Date(now.getTime() - 90 * 86_400_000) } },
      select: { amount: true },
    }),
  ])

  const avgWeeklyExpense = recentExpenses.reduce((s, e) => s + Number(e.amount), 0) / 13

  const weeks: Array<{
    label: string
    startDate: string
    expectedIncome: number
    expectedExpenses: number
    balance: number
  }> = []

  for (let w = 0; w < 13; w++) {
    const weekStart = new Date(now.getTime() + w * 7 * 86_400_000)
    const weekEnd   = new Date(now.getTime() + (w + 1) * 7 * 86_400_000)

    const income = pendingInvoices
      .filter((inv) => {
        const d = inv.dueAt ? new Date(inv.dueAt) : null
        return d && d >= weekStart && d < weekEnd
      })
      .reduce((s, inv) => s + Number(inv.amountTTC), 0)

    weeks.push({
      label:            `S${w + 1}`,
      startDate:        weekStart.toISOString().slice(0, 10),
      expectedIncome:   Math.round(income),
      expectedExpenses: Math.round(avgWeeklyExpense),
      balance:          Math.round(income - avgWeeklyExpense),
    })
  }

  let cumulative = 0
  const weeksWithCumulative = weeks.map((w) => {
    cumulative += w.balance
    return { ...w, cumulative: Math.round(cumulative) }
  })

  return {
    weeks: weeksWithCumulative,
    summary: {
      totalExpectedIncome:   weeks.reduce((s, w) => s + w.expectedIncome, 0),
      totalExpectedExpenses: weeks.reduce((s, w) => s + w.expectedExpenses, 0),
      netCashFlow:           cumulative,
    },
  }
}
