import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { CreateInvoiceInput, UpdateInvoiceInput, ListInvoicesInput } from './invoices.dto.js'

async function nextInvoiceNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.invoice.count({
    where: { companyId, number: { startsWith: `FA-${year}-` } },
  })
  return `FA-${year}-${String(count + 1).padStart(3, '0')}`
}

export async function listInvoices(companyId: string, query: ListInvoicesInput) {
  const { page, limit, status, clientId } = query
  const where: Prisma.InvoiceWhereInput = {
    companyId,
    ...(status ? { status } : {}),
    ...(clientId ? { clientId } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { client: { select: { id: true, name: true, email: true } } },
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
    include: { client: { select: { id: true, name: true, email: true } } },
  })
  if (!invoice || invoice.companyId !== companyId)
    throw new AppError('Invoice not found', 404, 'NOT_FOUND')
  return invoice
}

export async function createInvoice(companyId: string, data: CreateInvoiceInput) {
  const client = await prisma.client.findUnique({ where: { id: data.clientId } })
  if (!client || client.companyId !== companyId)
    throw new AppError('Client not found', 404, 'NOT_FOUND')

  const taxAmount = new Prisma.Decimal(data.subtotal).mul(data.taxRate).div(100)
  const total = new Prisma.Decimal(data.subtotal).add(taxAmount)
  const number = await nextInvoiceNumber(companyId)

  return prisma.invoice.create({
    data: {
      companyId,
      clientId: data.clientId,
      number,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      subtotal: new Prisma.Decimal(data.subtotal),
      taxRate: data.taxRate,
      taxAmount,
      total,
      notes: data.notes ?? null,
      status: 'DRAFT',
    },
    include: { client: { select: { id: true, name: true, email: true } } },
  })
}

export async function updateInvoice(companyId: string, id: string, data: UpdateInvoiceInput) {
  const existing = await getInvoice(companyId, id)
  if (existing.status === 'PAID' || existing.status === 'CANCELLED')
    throw new AppError('Cannot edit a paid or cancelled invoice', 409, 'INVOICE_LOCKED')

  const subtotal = data.subtotal != null ? new Prisma.Decimal(data.subtotal) : existing.subtotal
  const taxRate = data.taxRate ?? Number(existing.taxRate)
  const taxAmount = subtotal.mul(taxRate).div(100)
  const total = subtotal.add(taxAmount)

  return prisma.invoice.update({
    where: { id },
    data: {
      ...(data.clientId ? { clientId: data.clientId } : {}),
      ...(data.issueDate ? { issueDate: data.issueDate } : {}),
      ...(data.dueDate ? { dueDate: data.dueDate } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      subtotal,
      taxRate,
      taxAmount,
      total,
    },
    include: { client: { select: { id: true, name: true, email: true } } },
  })
}

export async function updateInvoiceStatus(companyId: string, id: string, status: string) {
  await getInvoice(companyId, id)
  return prisma.invoice.update({ where: { id }, data: { status: status as never } })
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
