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
  // V18 : utiliser max(reference) au lieu de count() — une facture supprimée
  //       ne doit pas faire revenir le compteur en arrière (sinon P2002 sur
  //       la référence de l'élément déjà supprimé qui reste en DB).
  const last = await db.invoice.findFirst({
    where:   { companyId, reference: { startsWith: `FA-${year}-` } },
    orderBy: { reference: 'desc' },
    select:  { reference: true },
  })
  let next = 1
  if (last?.reference) {
    const m = /-(\d+)$/.exec(last.reference)
    if (m) next = parseInt(m[1]!, 10) + 1
  }
  return `FA-${year}-${String(next).padStart(3, '0')}`
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

    // V2 : vérifier articleIds appartiennent à companyId
    const articleIds = (data.lines ?? [])
      .map(l => l.articleId)
      .filter((x): x is string => typeof x === 'string' && x.length > 0)
    if (articleIds.length > 0) {
      const found = await tx.article.count({
        where: { id: { in: articleIds }, companyId },
      })
      if (found !== new Set(articleIds).size) {
        throw new AppError('Article(s) introuvable(s)', 404, 'ARTICLE_NOT_FOUND')
      }
    }

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
            ...(l.articleId   ? { articleId: l.articleId }     : {}),
            ...(l.compteVente ? { compteVente: l.compteVente } : {}),
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

  // V2 : vérifier que les FK reçues appartiennent bien à companyId, sinon
  //      un user pourrait rattacher sa facture à un client/article d'un autre
  //      tenant (fuite côté PDF + corruption comptable au posting).
  if (data.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, companyId },
      select: { id: true },
    })
    if (!client) throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND')
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
            ...(l.articleId   ? { articleId: l.articleId }     : {}),
            ...(l.compteVente ? { compteVente: l.compteVente } : {}),
          })),
        },
      } : {}),
    },
    include: LINES_INCLUDE,
  })
}

const VALID_INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'] as const
type InvoiceStatusType = (typeof VALID_INVOICE_STATUSES)[number]

// B2 : machine d'état des factures (transitions autorisées). Toute transition
//      non listée renvoie 409. PAID et CANCELLED sont terminaux.
const INVOICE_TRANSITIONS: Record<InvoiceStatusType, readonly InvoiceStatusType[]> = {
  DRAFT:     ['SENT', 'CANCELLED'],
  SENT:      ['PAID', 'OVERDUE', 'CANCELLED'],
  OVERDUE:   ['PAID', 'CANCELLED'],
  PAID:      [],
  CANCELLED: [],
}

export async function updateInvoiceStatus(companyId: string, id: string, status: string, userId?: string) {
  if (!(VALID_INVOICE_STATUSES as readonly string[]).includes(status)) {
    throw new AppError(`Statut invalide: ${status}`, 400, 'INVALID_STATUS')
  }
  const target = status as InvoiceStatusType
  const existing = await getInvoice(companyId, id)
  const current = existing.status as InvoiceStatusType

  // B2 : vérifier la transition
  if (current !== target && !INVOICE_TRANSITIONS[current].includes(target)) {
    throw new AppError(
      `Transition non autorisée : ${current} → ${target}`,
      409, 'INVALID_TRANSITION',
    )
  }

  // B1 + B15 : comptabilisation et changement de statut sont atomiques.
  //   - Si posting requis (passage en SENT/PAID et pas encore posted),
  //     postSaleInvoice met posted=true + status=target dans la même tx.
  //   - Sinon, on met juste à jour le status (et paidAt si PAID).
  if ((target === 'SENT' || target === 'PAID') && !existing.posted) {
    const { postSaleInvoice } = await import('../accounting/posting.service.js')
    await postSaleInvoice(companyId, id, userId ?? 'system', target)
    // postSaleInvoice a déjà setté status=target dans le tx, on relit l'invoice.
    return getInvoice(companyId, id)
  }

  const extra = target === 'PAID' ? { paidAt: new Date() } : {}
  return prisma.invoice.update({
    where: { id },
    data: { status: target, ...extra },
  })
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

  // Conformément à SYSCOHADA / PCG : le chiffre d'affaires est reconnu à la
  // DATE D'ÉMISSION de la facture (issuedAt), pas à la date de paiement.
  // Inclus : SENT, PAID, OVERDUE (toute facture émise et non annulée).
  // Exclus : DRAFT (non validée) et CANCELLED (annulée).
  const SALES_STATUSES = ['SENT', 'PAID', 'OVERDUE'] as const

  const [salesCurr, salesPrev, expenses, paidInvoicesForDSO, pending, overdue, cashedCurr] = await Promise.all([
    prisma.invoice.aggregate({
      where: { companyId, ...af, status: { in: [...SALES_STATUSES] }, issuedAt: { gte: from, lte: to } },
      _sum: { amountTTC: true, amountHT: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { companyId, ...af, status: { in: [...SALES_STATUSES] }, issuedAt: { gte: prevFrom, lte: prevTo } },
      _sum: { amountTTC: true, amountHT: true },
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
    // Encaissements de la période (utile pour la trésorerie / DSO)
    prisma.invoice.aggregate({
      where: { companyId, ...af, status: 'PAID', paidAt: { gte: from, lte: to } },
      _sum: { amountTTC: true },
    }),
  ])

  // Chiffre d'affaires = montant HT (conforme SYSCOHADA art. 38 / PCG France
  // art. 512-1 : le CA est défini hors taxes récupérables). La TVA n'est pas
  // un produit pour l'entreprise — elle est collectée pour le compte de l'État.
  const revenueCurr   = Number(salesCurr._sum?.amountHT  ?? 0)
  const revenuePrev   = Number(salesPrev._sum?.amountHT  ?? 0)
  const revenueGrowth = revenuePrev > 0 ? ((revenueCurr - revenuePrev) / revenuePrev) * 100 : null
  const cashedAmount  = Number(cashedCurr._sum?.amountTTC ?? 0)
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
    salesCount:    salesCurr._count,
    cashedAmount,                                       // encaissements de la période (PAID)
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

  // Sources gestion :
  // - Entrées attendues : factures de vente SENT/OVERDUE avec dueAt dans 90j
  //   (encaissement TTC à la date d'échéance — convention conservatrice).
  // - Sorties attendues : factures d'achat SENT/RECEIVED/PARTIAL postées
  //   (= dettes fournisseurs comptabilisées) avec dueDate dans 90j.
  // - Si pas d'échéances futures explicites (cas typique en démarrage), on
  //   complète avec la moyenne hebdo des dépenses des 90 derniers jours
  //   (proxy comptable des charges fixes — loyers, paie, services).
  // Délai de paiement standard de l'entreprise (jours) — proxy pour estimer
  // l'échéance d'une facture d'achat quand le modèle n'a pas de dueDate
  // explicite. À défaut, 30 jours (norme commerciale OHADA / PCG).
  const companyForTerms = await prisma.company.findUnique({
    where: { id: companyId }, select: { paymentTerms: true },
  })
  const supplierPaymentDays = companyForTerms?.paymentTerms ?? 30

  const [pendingInvoices, pendingPurchases, recentExpenses] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId,
        ...af,
        status: { in: ['SENT', 'OVERDUE'] },
        dueAt:  { lte: end90 },
      },
      select: { dueAt: true, amountTTC: true },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        companyId,
        ...af,
        posted: true,
        status: { in: ['SENT', 'RECEIVED', 'PARTIAL'] },
      },
      select: { date: true, montantTTC: true },
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

    const purchaseExpense = pendingPurchases
      .filter((po) => {
        // Échéance estimée = date facture d'achat + délai paiement standard
        const due = new Date(new Date(po.date).getTime() + supplierPaymentDays * 86_400_000)
        return due >= weekStart && due < weekEnd
      })
      .reduce((s, po) => s + Number(po.montantTTC), 0)

    // Dépense hebdo = dettes fournisseurs échues sur la semaine, OU à défaut
    // la moyenne des charges récurrentes (proxy si pas de dettes explicites).
    const expenses = purchaseExpense > 0 ? purchaseExpense : avgWeeklyExpense

    weeks.push({
      label:            `S${w + 1}`,
      startDate:        weekStart.toISOString().slice(0, 10),
      expectedIncome:   Math.round(income),
      expectedExpenses: Math.round(expenses),
      balance:          Math.round(income - expenses),
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
