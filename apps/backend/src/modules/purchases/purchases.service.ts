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
  // B3 : verrou advisory par companyId + sequence pour éviter les courses.
  //      Sans ça, 2 POST simultanés → même reference → P2002.
  if (tx) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId + ':BC:' + year}))`
  }
  // V18 : max(reference) au lieu de count() (cf. fix N12 / V18)
  const last = await db.purchaseOrder.findFirst({
    where:   { companyId, reference: { startsWith: `BC-${year}-` } },
    orderBy: { reference: 'desc' },
    select:  { reference: true },
  })
  let next = 1
  if (last?.reference) {
    const m = /-(\d+)$/.exec(last.reference)
    if (m) next = parseInt(m[1]!, 10) + 1
  }
  return `BC-${year}-${String(next).padStart(3, '0')}`
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listPurchaseOrders(companyId: string, query: ListPurchaseOrdersInput, user?: JwtPayload) {
  const { page, limit, status, search } = query

  const where: Prisma.PurchaseOrderWhereInput = {
    companyId,
    ...(user ? getAgenceFilter(user) : {}),
    ...(status ? { status } : {}),
    ...(query.documentType ? { documentType: query.documentType } : {}),
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

  // V6 : vérifier que fiscalYearId reçu appartient à companyId, sinon on
  //      pourrait rattacher une commande à un exercice d'un autre tenant.
  if (data.fiscalYearId) {
    const fy = await prisma.fiscalYear.findFirst({
      where: { id: data.fiscalYearId, companyId },
      select: { id: true },
    })
    if (!fy) throw new AppError('Exercice fiscal invalide', 400, 'INVALID_FISCAL_YEAR')
  }
  // V2-like : vérifier que les articleIds des lignes appartiennent à companyId
  const articleIds = data.lines
    .map(l => l.articleId)
    .filter((x): x is string => typeof x === 'string' && x.length > 0)
  if (articleIds.length > 0) {
    const found = await prisma.article.count({
      where: { id: { in: articleIds }, companyId },
    })
    if (found !== new Set(articleIds).size) {
      throw new AppError('Article(s) introuvable(s)', 404, 'ARTICLE_NOT_FOUND')
    }
  }

  return prisma.$transaction(async (tx) => {
    // Si l'utilisateur fournit un numéro de facture (cas typique des factures
    // d'achat — le numéro vient du fournisseur), on l'utilise tel quel après
    // vérification d'unicité. Sinon, on génère un numéro auto-incrémenté.
    let reference: string
    if (data.reference?.trim()) {
      reference = data.reference.trim()
      const existing = await tx.purchaseOrder.findUnique({
        where: { companyId_reference: { companyId, reference } },
      })
      if (existing) {
        throw new AppError(`Le numéro ${reference} existe déjà pour cette société`, 409, 'DUPLICATE_REFERENCE')
      }
    } else {
      reference = await nextOrderReference(companyId, tx)
    }
    return tx.purchaseOrder.create({
      data: {
        companyId,
        ...(agenceId     ? { agenceId }              : {}),
        ...(data.fiscalYearId ? { fiscalYearId: data.fiscalYearId } : {}),
        reference,
        documentType:       data.documentType ?? 'ORDER',
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
        pieceUrl:           data.pieceUrl ?? null,
        pieceName:          data.pieceName ?? null,
        lines: {
          create: data.lines.map(l => ({
            reference:      l.reference ?? null,
            designation:    l.designation,
            quantite:       new Prisma.Decimal(l.quantite),
            unite:          l.unite,
            prixUnitaireHT: new Prisma.Decimal(l.prixUnitaireHT),
            montantHT:      new Prisma.Decimal(l.montantHT),
            ...(l.articleId   ? { articleId: l.articleId }     : {}),
            ...(l.compteAchat ? { compteAchat: l.compteAchat } : {}),
          })),
        },
      },
      include: LINES_INCLUDE,
    })
  })
}

// B2 : machine d'état des bons de commande / factures d'achat.
const PURCHASE_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT:     ['SENT', 'RECEIVED', 'CANCELLED'],
  SENT:      ['RECEIVED', 'PARTIAL', 'CANCELLED'],
  PARTIAL:   ['RECEIVED', 'CANCELLED'],
  RECEIVED:  [],
  CANCELLED: [],
}

export async function updatePurchaseOrder(
  companyId: string,
  id:        string,
  data:      UpdatePurchaseOrderInput,
  userId?:   string,
) {
  const existing = await getPurchaseOrder(companyId, id)

  // V9 : vérifier que les FK reçues appartiennent à companyId (V6 manqué sur l'update).
  //      Sans ça, un user pouvait remplacer les articleId/fiscalYearId d'un PO
  //      par ceux d'un autre tenant → fuite d'info via include {article: true}.
  if (data.fiscalYearId) {
    const fy = await prisma.fiscalYear.findFirst({
      where: { id: data.fiscalYearId, companyId },
      select: { id: true },
    })
    if (!fy) throw new AppError('Exercice fiscal invalide', 400, 'INVALID_FISCAL_YEAR')
  }
  if (data.lines?.length) {
    const articleIds = data.lines
      .map(l => l.articleId)
      .filter((x): x is string => typeof x === 'string' && x.length > 0)
    if (articleIds.length > 0) {
      const found = await prisma.article.count({
        where: { id: { in: articleIds }, companyId },
      })
      if (found !== new Set(articleIds).size) {
        throw new AppError('Article(s) introuvable(s)', 404, 'ARTICLE_NOT_FOUND')
      }
    }
  }

  // B2 : vérifier transition de statut si changement demandé
  if (data.status && data.status !== existing.status) {
    const allowed = PURCHASE_TRANSITIONS[existing.status] ?? []
    if (!allowed.includes(data.status)) {
      throw new AppError(
        `Transition non autorisée : ${existing.status} → ${data.status}`,
        409, 'INVALID_TRANSITION',
      )
    }
  }

  // B1 + B15 : comptabilisation et changement de statut atomiques.
  if (data.status === 'RECEIVED' && !existing.posted) {
    const { postPurchaseOrder } = await import('../accounting/posting.service.js')
    await postPurchaseOrder(companyId, id, userId ?? 'system', 'RECEIVED')
  }

  const updated = await prisma.purchaseOrder.update({
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
      ...(data.pieceUrl           !== undefined ? { pieceUrl: data.pieceUrl ?? null }                        : {}),
      ...(data.pieceName          !== undefined ? { pieceName: data.pieceName ?? null }                      : {}),
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
            ...(l.articleId   ? { articleId: l.articleId }     : {}),
            ...(l.compteAchat ? { compteAchat: l.compteAchat } : {}),
          })),
        },
      } : {}),
    },
    include: LINES_INCLUDE,
  })

  return updated
}

export async function deletePurchaseOrder(companyId: string, id: string) {
  await getPurchaseOrder(companyId, id)
  await prisma.purchaseOrder.delete({ where: { id } })
}

export async function purchaseOrderStats(
  companyId: string,
  user?: JwtPayload,
  opts: { from?: Date; to?: Date } = {},
) {
  const baseWhere: Prisma.PurchaseOrderWhereInput = {
    companyId,
    ...(user ? getAgenceFilter(user) : {}),
  }
  // Filtre date : si fourni, applique sur baseWhere.date
  const dateFilter: Prisma.PurchaseOrderWhereInput = (opts.from || opts.to)
    ? { date: {
        ...(opts.from ? { gte: opts.from } : {}),
        ...(opts.to   ? { lte: opts.to }   : {}),
      }}
    : {}

  const [total, draft, sent, received, partial, cancelled, amountAgg, periodAgg, dettesAgg] = await Promise.all([
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
    // Total achats de la période demandée (status non annulés)
    prisma.purchaseOrder.aggregate({
      where:  { ...baseWhere, ...dateFilter, status: { not: 'CANCELLED' } },
      _sum:   { montantTTC: true },
      _count: true,
    }),
    // Dettes fournisseurs : commandes validées (SENT/RECEIVED/PARTIAL),
    // posted=true (comptabilisées en charge donc créant la dette 401),
    // non encore réglées (paidAt null sur la pièce comptable associée).
    // Approximation : on prend les RECEIVED/SENT/PARTIAL postés.
    prisma.purchaseOrder.aggregate({
      where:  {
        ...baseWhere,
        posted: true,
        status: { in: ['SENT', 'RECEIVED', 'PARTIAL'] },
      },
      _sum:   { montantTTC: true },
      _count: true,
    }),
  ])

  return {
    total,
    byStatus: { draft, sent, received, partial, cancelled },
    totalMontantTTC: Number(amountAgg._sum.montantTTC ?? 0),
    periodMontantTTC: Number(periodAgg._sum.montantTTC ?? 0),
    periodCount:      periodAgg._count,
    dettesFournisseurs: Number(dettesAgg._sum.montantTTC ?? 0),
    dettesCount:        dettesAgg._count,
  }
}
