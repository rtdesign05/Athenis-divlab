import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  ListInvoicesInput,
} from './invoices.dto.js'

const CLIENT_SELECT = { id: true, nom: true, email: true }

async function nextInvoiceReference(companyId: string, tx?: Prisma.TransactionClient): Promise<string> {
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

export async function listInvoices(companyId: string, query: ListInvoicesInput) {
  const { page, limit, status, clientId } = query
  const where: Prisma.InvoiceWhereInput = {
    companyId,
    ...(status   ? { status }   : {}),
    ...(clientId ? { clientId } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { client: { select: CLIENT_SELECT } },
      orderBy: { issuedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ])
  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getInvoice(companyId: string, id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: { select: CLIENT_SELECT } },
  })
  if (!invoice || invoice.companyId !== companyId)
    throw new AppError('Invoice not found', 404, 'NOT_FOUND')
  return invoice
}

export async function createInvoice(companyId: string, data: CreateInvoiceInput, createdBy: string) {
  return prisma.$transaction(async (tx) => {
    const client = await tx.client.findUnique({ where: { id: data.clientId } })
    if (!client || client.companyId !== companyId)
      throw new AppError('Client not found', 404, 'NOT_FOUND')

    const amountHT  = new Prisma.Decimal(data.subtotal ?? 0)
    const vatRate   = new Prisma.Decimal(data.taxRate ?? 0).div(100)
    const amountTTC = amountHT.mul(vatRate.add(1)).toDecimalPlaces(2)
    const reference = await nextInvoiceReference(companyId, tx)

    return tx.invoice.create({
      data: {
        companyId,
        clientId:    data.clientId,
        reference,
        issuedAt:    data.issueDate ?? new Date(),
        dueAt:       data.dueDate ?? null,
        amountHT,
        vatRate:     vatRate,
        amountTTC,
        description: data.notes ?? null,
        status:      'DRAFT',
        createdBy,
      },
      include: { client: { select: CLIENT_SELECT } },
    })
  })
}

export async function updateInvoice(companyId: string, id: string, data: UpdateInvoiceInput) {
  const existing = await getInvoice(companyId, id)
  if (existing.status === 'PAID' || existing.status === 'CANCELLED')
    throw new AppError('Cannot edit a paid or cancelled invoice', 409, 'INVOICE_LOCKED')

  const amountHT  = data.subtotal != null ? new Prisma.Decimal(data.subtotal) : existing.amountHT
  const vatRatePct = data.taxRate ?? Number(existing.vatRate) * 100
  const vatRate   = new Prisma.Decimal(vatRatePct).div(100)
  const amountTTC = amountHT.mul(vatRate.add(1)).toDecimalPlaces(2)

  return prisma.invoice.update({
    where: { id },
    data: {
      ...(data.clientId  ? { clientId: data.clientId }             : {}),
      ...(data.issueDate ? { issuedAt: data.issueDate }            : {}),
      ...(data.dueDate   ? { dueAt: data.dueDate }                 : {}),
      ...(data.notes !== undefined ? { description: data.notes }   : {}),
      amountHT, vatRate, amountTTC,
    },
    include: { client: { select: CLIENT_SELECT } },
  })
}

const VALID_INVOICE_STATUSES = ['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED'] as const
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

export async function invoiceStats(companyId: string) {
  const [byStatus, totals] = await Promise.all([
    prisma.invoice.groupBy({
      by: ['status'],
      where: { companyId },
      _count: true,
      _sum: { amountTTC: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId },
      _sum: { amountHT: true, amountTTC: true },
      _count: true,
    }),
  ])
  return { byStatus, totals }
}

// ── Dashboard KPIs ────────────────────────────────────────────────────────────

export async function dashboardStats(companyId: string) {
  const now       = new Date()
  const y         = now.getFullYear()
  const startCurr = new Date(y, 0, 1)
  const startPrev = new Date(y - 1, 0, 1)
  const endPrev   = new Date(y, 0, 1)

  const [paidCurr, paidPrev, expenses, paidInvoicesForDSO, pending, overdue] = await Promise.all([
    prisma.invoice.aggregate({
      where: { companyId, status: 'PAID', paidAt: { gte: startCurr } },
      _sum: { amountTTC: true, amountHT: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId, status: 'PAID', paidAt: { gte: startPrev, lt: endPrev } },
      _sum: { amountTTC: true },
    }),
    prisma.expense.aggregate({
      where: { companyId, date: { gte: startCurr } },
      _sum: { amount: true },
    }),
    prisma.invoice.findMany({
      where: { companyId, status: 'PAID', paidAt: { not: null }, issuedAt: { gte: startCurr } },
      select: { issuedAt: true, paidAt: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId, status: { in: ['PENDING', 'OVERDUE'] } },
      _sum: { amountTTC: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { companyId, status: 'OVERDUE' },
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

export async function getReminders(companyId: string) {
  const now = new Date()
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: { in: ['PENDING', 'OVERDUE'] },
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

export async function cashFlowForecast(companyId: string) {
  const now    = new Date()
  const end90  = new Date(now.getTime() + 90 * 86_400_000)

  const [pendingInvoices, recentExpenses] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ['PENDING', 'OVERDUE'] },
        dueAt: { lte: end90 },
      },
      select: { dueAt: true, amountTTC: true },
    }),
    prisma.expense.findMany({
      where: { companyId, date: { gte: new Date(now.getTime() - 90 * 86_400_000) } },
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
