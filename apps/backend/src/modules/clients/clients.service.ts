import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { CreateClientInput, UpdateClientInput, ListClientsInput } from './clients.dto.js'

type InvoiceForScore = { status: string; dueAt: Date | null; paidAt: Date | null }

function computeReliabilityScoreFromInvoices(invoices: InvoiceForScore[]): number {
  if (invoices.length === 0) return 100

  const paid = invoices.filter((i) => i.status === 'PAID')
  if (paid.length === 0) return 0

  const onTimeCount = paid.filter((i) => {
    if (!i.paidAt || !i.dueAt) return false
    return new Date(i.paidAt) <= new Date(i.dueAt)
  }).length

  const lateCount     = paid.length - onTimeCount
  const overdueCount  = invoices.filter((i) => i.status === 'OVERDUE').length
  const totalNegative = lateCount + overdueCount * 2
  const maxPossible   = paid.length + overdueCount * 2
  return Math.max(0, Math.round(100 - (totalNegative / maxPossible) * 100))
}

async function computeReliabilityScore(clientId: string): Promise<number> {
  const invoices = await prisma.invoice.findMany({
    where: { clientId, status: { in: ['PAID', 'OVERDUE', 'CANCELLED'] } },
    select: { status: true, dueAt: true, paidAt: true },
  })
  return computeReliabilityScoreFromInvoices(invoices)
}

export async function listClients(companyId: string, query: ListClientsInput) {
  const { page, limit, search } = query
  const where: Prisma.ClientWhereInput = {
    companyId,
    ...(search
      ? {
          OR: [
            { nom: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: { agence: { select: { id: true, nom: true } } },
      orderBy: { nom: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.client.count({ where }),
  ])

  const clientIds = items.map((c) => c.id)
  const allInvoices = await prisma.invoice.findMany({
    where: { clientId: { in: clientIds }, status: { in: ['PAID', 'OVERDUE', 'CANCELLED'] } },
    select: { clientId: true, status: true, dueAt: true, paidAt: true },
  })
  const invoicesByClient = new Map<string, typeof allInvoices>()
  for (const inv of allInvoices) {
    const list = invoicesByClient.get(inv.clientId) ?? []
    list.push(inv)
    invoicesByClient.set(inv.clientId, list)
  }

  const itemsWithScore = items.map((c) => ({
    ...c,
    reliabilityScore: computeReliabilityScoreFromInvoices(invoicesByClient.get(c.id) ?? []),
  }))

  return { items: itemsWithScore, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getClient(companyId: string, id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: { agence: { select: { id: true, nom: true } } },
  })
  if (!client || client.companyId !== companyId)
    throw new AppError('Client not found', 404, 'NOT_FOUND')

  const reliabilityScore = await computeReliabilityScore(id)
  const invoiceStats = await prisma.invoice.aggregate({
    where: { clientId: id },
    _count: true,
    _sum:  { amountTTC: true },
  })

  return { ...client, reliabilityScore, invoiceCount: invoiceStats._count, invoiceTotal: invoiceStats._sum?.amountTTC }
}

export async function createClient(companyId: string, data: CreateClientInput & { accountingCode?: string }) {
  if (data.email) {
    const dup = await prisma.client.findFirst({ where: { companyId, email: data.email } })
    if (dup) throw new AppError('A client with this email already exists', 409, 'EMAIL_DUPLICATE')
  }

  // Compte comptable : saisi ou auto-généré (411 + slug du nom)
  let accountingCode = data.accountingCode?.trim()
  if (!accountingCode) {
    const slug = data.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'CLIENT'
    accountingCode = `411${slug}`
    // N31 : déduplication. Deux clients "DUPONT SARL" et "DUPONT SA" génèrent
    //       tous deux 411DUPONT. On suffixe avec un compteur si collision.
    const existingSameCode = await prisma.client.findFirst({
      where:  { companyId, accountingCode },
      select: { id: true },
    })
    if (existingSameCode) {
      let suffix = 2
      // Pas plus de 99 collisions (très improbable)
      while (suffix < 100) {
        const candidate = `411${slug.slice(0, Math.max(1, 6 - String(suffix).length))}${suffix}`
        const taken = await prisma.client.findFirst({
          where:  { companyId, accountingCode: candidate },
          select: { id: true },
        })
        if (!taken) {
          accountingCode = candidate
          break
        }
        suffix++
      }
    }
  }

  // Synchronisation avec Plan Comptable (création si absent)
  const { normalizeAccountCode } = await import('../../lib/accountCodes.js')
  const normalized = normalizeAccountCode(accountingCode)
  const existing = await prisma.accountPlan.findUnique({
    where: { companyId_numero: { companyId, numero: normalized } },
  })
  if (!existing) {
    const company = await prisma.company.findUniqueOrThrow({
      where: { id: companyId }, select: { accountingZone: true },
    })
    await prisma.accountPlan.create({
      data: {
        companyId,
        numero:   normalized,
        intitule: `Client ${data.name}`,
        classe:   4,
        type:     'ACTIF',
        zone:     company.accountingZone,
        isSystem: false,
        isActive: true,
      },
    })
  }

  return prisma.client.create({
    data: {
      companyId,
      nom:            data.name,
      email:          data.email     ?? null,
      telephone:      data.phone     ?? null,
      adresse:        data.address   ?? null,
      accountingCode: normalized,
      ...(data.agenceId ? { agenceId: data.agenceId } : {}),
    },
    include: { agence: { select: { id: true, nom: true } } },
  })
}

export async function updateClient(companyId: string, id: string, data: UpdateClientInput) {
  await getClient(companyId, id)
  if (data.email) {
    const dup = await prisma.client.findFirst({
      where: { companyId, email: data.email, NOT: { id } },
    })
    if (dup) throw new AppError('A client with this email already exists', 409, 'EMAIL_DUPLICATE')
  }
  return prisma.client.update({
    where: { id },
    data: {
      ...(data.name     !== undefined ? { nom: data.name }                   : {}),
      ...(data.email    !== undefined ? { email: data.email ?? null }        : {}),
      ...(data.phone    !== undefined ? { telephone: data.phone ?? null }    : {}),
      ...(data.address  !== undefined ? { adresse: data.address ?? null }    : {}),
      ...(data.agenceId !== undefined ? { agenceId: data.agenceId ?? null }  : {}),
    },
    include: { agence: { select: { id: true, nom: true } } },
  })
}

export async function deleteClient(companyId: string, id: string) {
  await getClient(companyId, id)
  const invoiceCount = await prisma.invoice.count({ where: { clientId: id } })
  if (invoiceCount > 0)
    throw new AppError('Cannot delete a client with invoices', 409, 'CLIENT_HAS_INVOICES')
  await prisma.client.delete({ where: { id } })
}
