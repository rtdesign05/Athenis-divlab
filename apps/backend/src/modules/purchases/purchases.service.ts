import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import { getAgenceFilter } from '../../middleware/agenceFilter.js'
import type { JwtPayload } from '@athenis/shared-types'
import type { CreatePurchaseOrderInput, UpdatePurchaseOrderInput, ListPurchaseOrdersInput } from './purchases.dto.js'

const LINES_INCLUDE = {
  lines:  { orderBy: { designation: 'asc' as const } },
  agence: { select: { nom: true } },
} as const

// ── Number generation ─────────────────────────────────────────────────────────

async function nextOrderReference(companyId: string, tx?: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear()
  const db   = tx ?? prisma
  const count = await db.purchaseOrder.count({
    where: { companyId, reference: { startsWith: `BC-${year}-` } },
  })
  return `BC-${year}-${String(count + 1).padStart(3, '0')}`
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listPurchaseOrders(companyId: string, query: ListPurchaseOrdersInput, user?: JwtPayload) {
  const { page, limit, status, search } = query

  const where: Prisma.PurchaseOrderWhereInput = {
    companyId,
    ...(user ? getAgenceFilter(user) : {}),
    ...(status ? { status } : {}),
    ...(search ? {
      OR: [
        { fournisseur: { contains: search, mode: 'insensitive' } },
        { objet:       { contains: search, mode: 'insensitive' } },
        { reference:   { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: LINES_INCLUDE,
      orderBy: { date: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.purchaseOrder.count({ where }),
  ])

  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getPurchaseOrder(companyId: string, id: string) {
  const order = await prisma.purchaseOrder.findUnique({
    where:   { id },
    include: LINES_INCLUDE,
  })
  if (!order || order.companyId !== companyId)
    throw new AppError('Bon de commande introuvable', 404, 'NOT_FOUND')
  return order
}

export async function createPurchaseOrder(
  companyId:    string,
  data:         CreatePurchaseOrderInput,
  _createdBy:   string,
  user?:        JwtPayload,
) {
  const agenceId = user?.agenceId ?? null

  return prisma.$transaction(async (tx) => {
    const reference = await nextOrderReference(companyId, tx)
    return tx.purchaseOrder.create({
      data: {
        companyId,
        ...(agenceId     ? { agenceId }              : {}),
        ...(data.fiscalYearId ? { fiscalYearId: data.fiscalYearId } : {}),
        reference,
        fournisseur:        data.fournisseur,
        objet:              data.objet,
        status:             'DRAFT',
        date:               data.date,
        receptionAt:        data.receptionAt ?? null,
        montantHT:          new Prisma.Decimal(data.montantHT),
        vatRate:            new Prisma.Decimal(data.vatRate),
        montantTTC:         new Prisma.Decimal(data.montantTTC),
        conditionsPaiement: data.conditionsPaiement ?? null,
        notes:              data.notes ?? null,
        lines: {
          create: data.lines.map(l => ({
            reference:      l.reference ?? null,
            designation:    l.designation,
            quantite:       new Prisma.Decimal(l.quantite),
            unite:          l.unite,
            prixUnitaireHT: new Prisma.Decimal(l.prixUnitaireHT),
            montantHT:      new Prisma.Decimal(l.montantHT),
          })),
        },
      },
      include: LINES_INCLUDE,
    })
  })
}

export async function updatePurchaseOrder(
  companyId: string,
  id:        string,
  data:      UpdatePurchaseOrderInput,
) {
  await getPurchaseOrder(companyId, id)

  return prisma.purchaseOrder.update({
    where: { id },
    data:  {
      ...(data.fournisseur        !== undefined ? { fournisseur: data.fournisseur }                          : {}),
      ...(data.objet              !== undefined ? { objet: data.objet }                                      : {}),
      ...(data.status             !== undefined ? { status: data.status }                                    : {}),
      ...(data.date               !== undefined ? { date: data.date }                                        : {}),
      ...(data.receptionAt        !== undefined ? { receptionAt: data.receptionAt ?? null }                  : {}),
      ...(data.montantHT          !== undefined ? { montantHT: new Prisma.Decimal(data.montantHT) }          : {}),
      ...(data.vatRate            !== undefined ? { vatRate: new Prisma.Decimal(data.vatRate) }              : {}),
      ...(data.montantTTC         !== undefined ? { montantTTC: new Prisma.Decimal(data.montantTTC) }        : {}),
      ...(data.conditionsPaiement !== undefined ? { conditionsPaiement: data.conditionsPaiement ?? null }    : {}),
      ...(data.notes              !== undefined ? { notes: data.notes ?? null }                              : {}),
      ...(data.lines ? {
        lines: {
          deleteMany: {},
          create: data.lines.map(l => ({
            reference:      l.reference ?? null,
            designation:    l.designation,
            quantite:       new Prisma.Decimal(l.quantite),
            unite:          l.unite,
            prixUnitaireHT: new Prisma.Decimal(l.prixUnitaireHT),
            montantHT:      new Prisma.Decimal(l.montantHT),
          })),
        },
      } : {}),
    },
    include: LINES_INCLUDE,
  })
}

export async function deletePurchaseOrder(companyId: string, id: string) {
  await getPurchaseOrder(companyId, id)
  await prisma.purchaseOrder.delete({ where: { id } })
}

export async function purchaseOrderStats(companyId: string, user?: JwtPayload) {
  const baseWhere: Prisma.PurchaseOrderWhereInput = {
    companyId,
    ...(user ? getAgenceFilter(user) : {}),
  }

  const [total, draft, sent, received, partial, cancelled, amountAgg] = await Promise.all([
    prisma.purchaseOrder.count({ where: baseWhere }),
    prisma.purchaseOrder.count({ where: { ...baseWhere, status: 'DRAFT' } }),
    prisma.purchaseOrder.count({ where: { ...baseWhere, status: 'SENT' } }),
    prisma.purchaseOrder.count({ where: { ...baseWhere, status: 'RECEIVED' } }),
    prisma.purchaseOrder.count({ where: { ...baseWhere, status: 'PARTIAL' } }),
    prisma.purchaseOrder.count({ where: { ...baseWhere, status: 'CANCELLED' } }),
    prisma.purchaseOrder.aggregate({
      where:  { ...baseWhere, status: { not: 'CANCELLED' } },
      _sum:   { montantTTC: true },
    }),
  ])

  return {
    total,
    byStatus: { draft, sent, received, partial, cancelled },
    totalMontantTTC: Number(amountAgg._sum.montantTTC ?? 0),
  }
}
