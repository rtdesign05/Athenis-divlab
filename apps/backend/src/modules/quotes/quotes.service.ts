import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { CreateQuoteInput, UpdateQuoteInput, ListQuotesInput } from './quotes.dto.js'

const CLIENT_SELECT = { id: true, name: true, email: true }

async function nextQuoteNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.quote.count({
    where: { companyId, number: { startsWith: `DEV-${year}-` } },
  })
  return `DEV-${year}-${String(count + 1).padStart(3, '0')}`
}

async function nextInvoiceNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.invoice.count({
    where: { companyId, number: { startsWith: `FA-${year}-` } },
  })
  return `FA-${year}-${String(count + 1).padStart(3, '0')}`
}

export async function listQuotes(companyId: string, query: ListQuotesInput) {
  const { page, limit, status, clientId } = query
  const where: Prisma.QuoteWhereInput = {
    companyId,
    ...(status   ? { status }   : {}),
    ...(clientId ? { clientId } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: { client: { select: CLIENT_SELECT } },
      orderBy: { issueDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.quote.count({ where }),
  ])
  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getQuote(companyId: string, id: string) {
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { client: { select: CLIENT_SELECT } },
  })
  if (!quote || quote.companyId !== companyId)
    throw new AppError('Quote not found', 404, 'NOT_FOUND')
  return quote
}

export async function createQuote(companyId: string, data: CreateQuoteInput) {
  const client = await prisma.client.findUnique({ where: { id: data.clientId } })
  if (!client || client.companyId !== companyId)
    throw new AppError('Client not found', 404, 'NOT_FOUND')

  const taxAmount = new Prisma.Decimal(data.subtotal).mul(data.taxRate).div(100)
  const total     = new Prisma.Decimal(data.subtotal).add(taxAmount)
  const number    = await nextQuoteNumber(companyId)

  return prisma.quote.create({
    data: {
      companyId,
      clientId: data.clientId,
      number,
      issueDate:  data.issueDate,
      validUntil: data.validUntil,
      subtotal:  new Prisma.Decimal(data.subtotal),
      taxRate:   data.taxRate,
      taxAmount,
      total,
      notes:     data.notes ?? null,
      status:    'DRAFT',
    },
    include: { client: { select: CLIENT_SELECT } },
  })
}

export async function updateQuote(companyId: string, id: string, data: UpdateQuoteInput) {
  const existing = await getQuote(companyId, id)
  if (existing.status === 'CONVERTED')
    throw new AppError('Cannot edit a converted quote', 409, 'QUOTE_LOCKED')

  const subtotal  = data.subtotal != null ? new Prisma.Decimal(data.subtotal) : existing.subtotal
  const taxRate   = data.taxRate ?? Number(existing.taxRate)
  const taxAmount = subtotal.mul(taxRate).div(100)
  const total     = subtotal.add(taxAmount)

  return prisma.quote.update({
    where: { id },
    data: {
      ...(data.clientId   ? { clientId: data.clientId }     : {}),
      ...(data.issueDate  ? { issueDate: data.issueDate }   : {}),
      ...(data.validUntil ? { validUntil: data.validUntil } : {}),
      ...(data.notes !== undefined ? { notes: data.notes }  : {}),
      subtotal, taxRate, taxAmount, total,
    },
    include: { client: { select: CLIENT_SELECT } },
  })
}

export async function updateQuoteStatus(companyId: string, id: string, status: string) {
  await getQuote(companyId, id)
  return prisma.quote.update({ where: { id }, data: { status: status as never } })
}

export async function deleteQuote(companyId: string, id: string) {
  const quote = await getQuote(companyId, id)
  if (quote.status === 'CONVERTED')
    throw new AppError('Cannot delete a converted quote', 409, 'QUOTE_LOCKED')
  await prisma.quote.delete({ where: { id } })
}

export async function convertQuoteToInvoice(companyId: string, quoteId: string) {
  const quote = await getQuote(companyId, quoteId)
  if (quote.status === 'CONVERTED')
    throw new AppError('Quote already converted', 409, 'ALREADY_CONVERTED')
  if (quote.status === 'REJECTED')
    throw new AppError('Cannot convert a rejected quote', 409, 'QUOTE_REJECTED')

  const number  = await nextInvoiceNumber(companyId)
  const dueDate = new Date(Date.now() + 30 * 86_400_000)

  const [invoice] = await prisma.$transaction([
    prisma.invoice.create({
      data: {
        companyId,
        clientId:  quote.clientId,
        quoteId:   quote.id,
        number,
        issueDate: new Date(),
        dueDate,
        subtotal:  quote.subtotal,
        taxRate:   quote.taxRate,
        taxAmount: quote.taxAmount,
        total:     quote.total,
        notes:     quote.notes,
        status:    'DRAFT',
      },
      include: { client: { select: CLIENT_SELECT } },
    }),
    prisma.quote.update({ where: { id: quoteId }, data: { status: 'CONVERTED' } }),
  ])

  return invoice
}

export async function quoteStats(companyId: string) {
  const [byStatus, totals] = await Promise.all([
    prisma.quote.groupBy({
      by: ['status'],
      where: { companyId },
      _count: true,
      _sum: { total: true },
    }),
    prisma.quote.aggregate({
      where: { companyId },
      _sum: { subtotal: true, taxAmount: true, total: true },
      _count: true,
    }),
  ])
  return { byStatus, totals }
}
