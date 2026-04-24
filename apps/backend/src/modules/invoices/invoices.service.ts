import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  ListInvoicesInput,
  CreateRecurringInput,
  UpdateRecurringInput,
} from './invoices.dto.js'

const CLIENT_SELECT = { id: true, name: true, email: true }

export async function nextInvoiceNumber(companyId: string): Promise<string> {
  const year  = new Date().getFullYear()
  const count = await prisma.invoice.count({
    where: { companyId, number: { startsWith: `FA-${year}-` } },
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
      orderBy: { issueDate: 'desc' },
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

export async function createInvoice(companyId: string, data: CreateInvoiceInput) {
  const client = await prisma.client.findUnique({ where: { id: data.clientId } })
  if (!client || client.companyId !== companyId)
    throw new AppError('Client not found', 404, 'NOT_FOUND')

  const taxAmount = new Prisma.Decimal(data.subtotal).mul(data.taxRate).div(100).toDecimalPlaces(2)
  const total     = new Prisma.Decimal(data.subtotal).add(taxAmount).toDecimalPlaces(2)
  const number    = await nextInvoiceNumber(companyId)

  return prisma.invoice.create({
    data: {
      companyId,
      clientId: data.clientId,
      number,
      issueDate: data.issueDate,
      dueDate:   data.dueDate,
      subtotal:  new Prisma.Decimal(data.subtotal),
      taxRate:   data.taxRate,
      taxAmount,
      total,
      notes:  data.notes ?? null,
      status: 'DRAFT',
    },
    include: { client: { select: CLIENT_SELECT } },
  })
}

export async function updateInvoice(companyId: string, id: string, data: UpdateInvoiceInput) {
  const existing = await getInvoice(companyId, id)
  if (existing.status === 'PAID' || existing.status === 'CANCELLED')
    throw new AppError('Cannot edit a paid or cancelled invoice', 409, 'INVOICE_LOCKED')

  const subtotal  = data.subtotal != null ? new Prisma.Decimal(data.subtotal) : existing.subtotal
  const taxRate   = data.taxRate ?? Number(existing.taxRate)
  const taxAmount = subtotal.mul(taxRate).div(100).toDecimalPlaces(2)
  const total     = subtotal.add(taxAmount).toDecimalPlaces(2)

  return prisma.invoice.update({
    where: { id },
    data: {
      ...(data.clientId  ? { clientId: data.clientId }   : {}),
      ...(data.issueDate ? { issueDate: data.issueDate } : {}),
      ...(data.dueDate   ? { dueDate: data.dueDate }     : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      subtotal, taxRate, taxAmount, total,
    },
    include: { client: { select: CLIENT_SELECT } },
  })
}

const VALID_INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'] as const
type InvoiceStatus = (typeof VALID_INVOICE_STATUSES)[number]

export async function updateInvoiceStatus(companyId: string, id: string, status: string) {
  if (!(VALID_INVOICE_STATUSES as readonly string[]).includes(status)) {
    throw new AppError(`Statut invalide: ${status}`, 400, 'INVALID_STATUS')
  }
  await getInvoice(companyId, id)
  const extra = status === 'PAID' ? { paidAt: new Date() } : {}
  return prisma.invoice.update({ where: { id }, data: { status: status as InvoiceStatus, ...extra } })
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
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId },
      _sum: { subtotal: true, taxAmount: true, total: true },
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
      _sum: { total: true, subtotal: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId, status: 'PAID', paidAt: { gte: startPrev, lt: endPrev } },
      _sum: { total: true },
    }),
    prisma.expense.aggregate({
      where: { companyId, date: { gte: startCurr } },
      _sum: { amount: true },
    }),
    prisma.invoice.findMany({
      where: { companyId, status: 'PAID', paidAt: { not: null }, issueDate: { gte: startCurr } },
      select: { issueDate: true, paidAt: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId, status: { in: ['SENT', 'OVERDUE'] } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { companyId, status: 'OVERDUE' },
      _sum: { total: true },
      _count: true,
    }),
  ])

  const revenueCurr   = Number(paidCurr._sum.total   ?? 0)
  const revenuePrev   = Number(paidPrev._sum.total   ?? 0)
  const revenueGrowth = revenuePrev > 0 ? ((revenueCurr - revenuePrev) / revenuePrev) * 100 : null
  const totalExpenses = Number(expenses._sum.amount  ?? 0)
  const grossProfit   = revenueCurr - totalExpenses
  const grossMargin   = revenueCurr > 0 ? grossProfit / revenueCurr : null

  let dso: number | null = null
  if (paidInvoicesForDSO.length > 0) {
    const totalDays = paidInvoicesForDSO.reduce((sum, inv) => {
      const days = (new Date(inv.paidAt!).getTime() - new Date(inv.issueDate).getTime()) / 86_400_000
      return sum + Math.max(0, days)
    }, 0)
    dso = Math.round(totalDays / paidInvoicesForDSO.length)
  }

  return {
    revenue:       { current: revenueCurr, previous: revenuePrev, growth: revenueGrowth },
    grossProfit:   { amount: grossProfit, margin: grossMargin },
    dso,
    pendingAmount: Number(pending._sum.total ?? 0),
    pendingCount:  pending._count,
    overdueAmount: Number(overdue._sum.total ?? 0),
    overdueCount:  overdue._count,
  }
}

// ── Reminders ─────────────────────────────────────────────────────────────────

export async function getReminders(companyId: string) {
  const now = new Date()
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: { in: ['SENT', 'OVERDUE'] },
    },
    include: { client: { select: CLIENT_SELECT } },
    orderBy: { dueDate: 'asc' },
  })

  return invoices.map((inv) => {
    const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86_400_000)
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

  const [pendingInvoices, recurringList, recentExpenses] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ['SENT', 'OVERDUE'] },
        dueDate: { lte: end90 },
      },
      select: { dueDate: true, total: true },
    }),
    prisma.recurringInvoice.findMany({
      where: { companyId, active: true, nextDueDate: { lte: end90 } },
      select: { nextDueDate: true, subtotal: true, taxRate: true, frequency: true },
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
        const d = new Date(inv.dueDate)
        return d >= weekStart && d < weekEnd
      })
      .reduce((s, inv) => s + Number(inv.total), 0)

    const recurringIncome = recurringList
      .filter((r) => {
        const d = new Date(r.nextDueDate)
        return d >= weekStart && d < weekEnd
      })
      .reduce((s, r) => {
        const tax = Number(r.subtotal) * Number(r.taxRate) / 100
        return s + Number(r.subtotal) + tax
      }, 0)

    weeks.push({
      label:            `S${w + 1}`,
      startDate:        weekStart.toISOString().slice(0, 10),
      expectedIncome:   Math.round(income + recurringIncome),
      expectedExpenses: Math.round(avgWeeklyExpense),
      balance:          Math.round(income + recurringIncome - avgWeeklyExpense),
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

// ── Recurring Invoices ────────────────────────────────────────────────────────

export async function listRecurring(companyId: string) {
  return prisma.recurringInvoice.findMany({
    where: { companyId },
    include: { client: { select: CLIENT_SELECT } },
    orderBy: { nextDueDate: 'asc' },
  })
}

export async function createRecurring(companyId: string, data: CreateRecurringInput) {
  const client = await prisma.client.findUnique({ where: { id: data.clientId } })
  if (!client || client.companyId !== companyId)
    throw new AppError('Client not found', 404, 'NOT_FOUND')

  return prisma.recurringInvoice.create({
    data: {
      companyId,
      clientId:    data.clientId,
      frequency:   data.frequency,
      subtotal:    new Prisma.Decimal(data.subtotal),
      taxRate:     data.taxRate,
      notes:       data.notes ?? null,
      nextDueDate: data.nextDueDate,
      active:      true,
    },
    include: { client: { select: CLIENT_SELECT } },
  })
}

export async function updateRecurring(companyId: string, id: string, data: UpdateRecurringInput) {
  const existing = await prisma.recurringInvoice.findUnique({ where: { id } })
  if (!existing || existing.companyId !== companyId)
    throw new AppError('Recurring invoice not found', 404, 'NOT_FOUND')

  return prisma.recurringInvoice.update({
    where: { id },
    data: {
      ...(data.active      !== undefined ? { active: data.active }           : {}),
      ...(data.frequency              ? { frequency: data.frequency }        : {}),
      ...(data.subtotal               ? { subtotal: new Prisma.Decimal(data.subtotal) } : {}),
      ...(data.taxRate                ? { taxRate: data.taxRate }            : {}),
      ...(data.notes      !== undefined ? { notes: data.notes }              : {}),
      ...(data.nextDueDate            ? { nextDueDate: data.nextDueDate }    : {}),
    },
    include: { client: { select: CLIENT_SELECT } },
  })
}

export async function deleteRecurring(companyId: string, id: string) {
  const existing = await prisma.recurringInvoice.findUnique({ where: { id } })
  if (!existing || existing.companyId !== companyId)
    throw new AppError('Recurring invoice not found', 404, 'NOT_FOUND')
  await prisma.recurringInvoice.delete({ where: { id } })
}

export async function generateFromRecurring(companyId: string, recurringId: string) {
  const recurring = await prisma.recurringInvoice.findUnique({
    where: { id: recurringId },
    include: { client: { select: CLIENT_SELECT } },
  })
  if (!recurring || recurring.companyId !== companyId)
    throw new AppError('Recurring invoice not found', 404, 'NOT_FOUND')
  if (!recurring.active)
    throw new AppError('Recurring invoice is inactive', 409, 'RECURRING_INACTIVE')

  const taxAmount = new Prisma.Decimal(recurring.subtotal).mul(recurring.taxRate).div(100)
  const total     = new Prisma.Decimal(recurring.subtotal).add(taxAmount)
  const number    = await nextInvoiceNumber(companyId)

  const nextDueDate = new Date(recurring.nextDueDate)
  const freqMonths = recurring.frequency === 'MONTHLY' ? 1 : recurring.frequency === 'QUARTERLY' ? 3 : 12
  nextDueDate.setMonth(nextDueDate.getMonth() + freqMonths)

  const [invoice] = await prisma.$transaction([
    prisma.invoice.create({
      data: {
        companyId,
        clientId:          recurring.clientId,
        recurringInvoiceId: recurring.id,
        number,
        issueDate:  new Date(),
        dueDate:    recurring.nextDueDate,
        subtotal:   recurring.subtotal,
        taxRate:    recurring.taxRate,
        taxAmount,
        total,
        notes:  recurring.notes,
        status: 'DRAFT',
      },
      include: { client: { select: CLIENT_SELECT } },
    }),
    prisma.recurringInvoice.update({
      where: { id: recurringId },
      data:  { nextDueDate },
    }),
  ])

  return invoice
}
