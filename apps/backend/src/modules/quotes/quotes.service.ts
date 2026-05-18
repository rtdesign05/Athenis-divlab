import { prisma } from '../../lib/prisma.js'
import { Prisma } from '@prisma/client'
import { AppError } from '../../middleware/errorHandler.js'
import { nextInvoiceReference } from '../invoices/invoices.service.js'
import type { CreateQuoteInput, UpdateQuoteInput, ListQuotesInput } from './quotes.dto.js'

// Quote model does not exist in v2 schema — use in-memory store
interface Quote {
  id: string; companyId: string; clientId: string; reference: string
  issuedAt: Date; validUntil: Date | null; amountHT: number; vatRate: number; amountTTC: number
  notes: string | null; status: string; createdAt: Date; updatedAt: Date
}
const quoteStore = new Map<string, Quote>()
let seq = 0
function genId() { return `QT-${++seq}-${Date.now()}` }

export async function listQuotes(companyId: string, query: ListQuotesInput) {
  const { page, limit, status, clientId } = query
  const all = [...quoteStore.values()]
    .filter(q => q.companyId === companyId
      && (!status   || q.status === status)
      && (!clientId || q.clientId === clientId))
    .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())
  const total = all.length
  const items = all.slice((page - 1) * limit, page * limit)
  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getQuote(companyId: string, id: string) {
  const quote = quoteStore.get(id)
  if (!quote || quote.companyId !== companyId)
    throw new AppError('Quote not found', 404, 'NOT_FOUND')
  return quote
}

export async function createQuote(companyId: string, data: CreateQuoteInput) {
  const client = await prisma.client.findUnique({ where: { id: data.clientId } })
  if (!client || client.companyId !== companyId)
    throw new AppError('Client not found', 404, 'NOT_FOUND')

  const year  = new Date().getFullYear()
  const count = [...quoteStore.values()].filter(q => q.companyId === companyId && q.reference.startsWith(`DEV-${year}-`)).length
  const reference = `DEV-${year}-${String(count + 1).padStart(3, '0')}`

  const amountHT  = data.subtotal ?? 0
  const vatRate   = (data.taxRate ?? 0) / 100
  const amountTTC = +(amountHT * (1 + vatRate)).toFixed(2)
  const id = genId()
  const now = new Date()
  const quote: Quote = {
    id, companyId, clientId: data.clientId, reference,
    issuedAt:   data.issueDate ?? now,
    validUntil: data.validUntil ?? null,
    amountHT, vatRate, amountTTC,
    notes:  data.notes ?? null,
    status: 'DRAFT',
    createdAt: now, updatedAt: now,
  }
  quoteStore.set(id, quote)
  return quote
}

export async function updateQuote(companyId: string, id: string, data: UpdateQuoteInput) {
  const existing = await getQuote(companyId, id)
  if (existing.status === 'CONVERTED')
    throw new AppError('Cannot edit a converted quote', 409, 'QUOTE_LOCKED')

  // VN3 : vérifier que clientId appartient à companyId, sinon la conversion
  //       en facture (convertQuoteToInvoice) créerait une invoice rattachée
  //       à un client d'un autre tenant.
  if (data.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, companyId },
      select: { id: true },
    })
    if (!client) throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND')
  }

  const amountHT  = data.subtotal ?? existing.amountHT
  const vatRate   = data.taxRate != null ? data.taxRate / 100 : existing.vatRate
  const amountTTC = +(amountHT * (1 + vatRate)).toFixed(2)
  const updated: Quote = {
    ...existing,
    amountHT, vatRate, amountTTC,
    ...(data.clientId   ? { clientId: data.clientId }     : {}),
    ...(data.issueDate  ? { issuedAt: data.issueDate }    : {}),
    ...(data.validUntil !== undefined ? { validUntil: data.validUntil ?? null } : {}),
    ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
    updatedAt: new Date(),
  }
  quoteStore.set(id, updated)
  return updated
}

export async function updateQuoteStatus(companyId: string, id: string, status: string) {
  const existing = await getQuote(companyId, id)
  const updated = { ...existing, status, updatedAt: new Date() }
  quoteStore.set(id, updated)
  return updated
}

export async function deleteQuote(companyId: string, id: string) {
  const quote = await getQuote(companyId, id)
  if (quote.status === 'CONVERTED')
    throw new AppError('Cannot delete a converted quote', 409, 'QUOTE_LOCKED')
  quoteStore.delete(id)
}

export async function convertQuoteToInvoice(companyId: string, quoteId: string) {
  const quote = await getQuote(companyId, quoteId)
  if (quote.status === 'CONVERTED')
    throw new AppError('Quote already converted', 409, 'ALREADY_CONVERTED')
  if (quote.status === 'REJECTED')
    throw new AppError('Cannot convert a rejected quote', 409, 'QUOTE_REJECTED')

  const dueAt = new Date(Date.now() + 30 * 86_400_000)

  const invoice = await prisma.$transaction(async (tx) => {
    const reference = await nextInvoiceReference(companyId, tx)
    return tx.invoice.create({
      data: {
        companyId,
        clientId:    quote.clientId,
        reference,
        issuedAt:    new Date(),
        dueAt,
        amountHT:    new Prisma.Decimal(quote.amountHT),
        vatRate:     new Prisma.Decimal(quote.vatRate),
        taxAmount:   new Prisma.Decimal(quote.amountTTC).minus(new Prisma.Decimal(quote.amountHT)).toDecimalPlaces(2),
        amountTTC:   new Prisma.Decimal(quote.amountTTC),
        description: quote.notes,
        status:      'DRAFT',
      },
      include: { client: { select: { id: true, nom: true, email: true } } },
    })
  })
  quoteStore.set(quoteId, { ...quote, status: 'CONVERTED', updatedAt: new Date() })
  return invoice
}

export async function quoteStats(companyId: string) {
  const all = [...quoteStore.values()].filter(q => q.companyId === companyId)
  const byStatus = Object.entries(
    all.reduce((acc, q) => { acc[q.status] = (acc[q.status] ?? 0) + 1; return acc }, {} as Record<string, number>)
  ).map(([status, count]) => ({ status, _count: count, _sum: { amountTTC: all.filter(q => q.status === status).reduce((s, q) => s + q.amountTTC, 0) } }))
  return {
    byStatus,
    totals: {
      _count: all.length,
      _sum: { amountHT: all.reduce((s, q) => s + q.amountHT, 0), amountTTC: all.reduce((s, q) => s + q.amountTTC, 0) },
    },
  }
}
