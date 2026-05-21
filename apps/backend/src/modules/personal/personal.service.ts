import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toNum(d: Prisma.Decimal | null | undefined): number {
  return d ? Number(d) : 0
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

/**
 * Renvoie l'agrégat du dashboard personnel pour une période donnée.
 *
 * @param userId   user authentifié
 * @param period   { annee, mois } 1-12 ; par défaut : mois en cours
 *
 * Sémantique des champs renvoyés :
 *   - revenusMois / depensesMois : sommes des opérations DATÉES dans le mois
 *   - soldeTotalComptes : solde NET de la période = revenusMois - depensesMois
 *     (le user a explicitement demandé que le solde reflète la période, pas
 *     le cumul des comptes bancaires)
 *   - tauxEpargne : (revenus - dépenses) / revenus en %
 *   - transactionsRecentes : 5 dernières opérations DATÉES dans le mois
 *   - comptes / objectifs : atemporels (état actuel)
 */
export async function getDashboard(
  userId: string,
  period?: { annee?: number; mois?: number },
) {
  const now    = new Date()
  const annee  = period?.annee && Number.isFinite(period.annee)
    ? Math.trunc(period.annee)
    : now.getFullYear()
  const moisIn = period?.mois  && Number.isFinite(period.mois)
    ? Math.trunc(period.mois)
    : (now.getMonth() + 1) // human-1-based
  const mois   = Math.min(12, Math.max(1, moisIn))

  const periodStart = new Date(annee, mois - 1, 1)
  const periodEnd   = new Date(annee, mois,     1) // exclusif

  // Ensure the personal profile exists (no-op for returning users)
  await prisma.personalProfile.upsert({ where: { userId }, create: { userId }, update: {} }).catch(() => null)

  const dateInPeriod = { date: { gte: periodStart, lt: periodEnd } }

  const [
    revenusPeriodeAgg,
    depensesPeriodeAgg,
    comptesList,
    objectifsList,
    recentRevenus,
    recentDepenses,
  ] = await Promise.all([
    prisma.personalRevenue.aggregate({
      where: { userId, ...dateInPeriod },
      _sum:  { amount: true },
    }),
    prisma.personalExpense.aggregate({
      where: { userId, ...dateInPeriod },
      _sum:  { amount: true },
    }),
    prisma.personalCompte.findMany({
      where:   { userId },
      orderBy: { nom: 'asc' },
    }),
    prisma.personalObjectif.findMany({
      where:   { userId },
      orderBy: [{ achieved: 'asc' }, { deadline: 'asc' }],
    }),
    prisma.personalRevenue.findMany({
      where:   { userId, ...dateInPeriod },
      orderBy: { date: 'desc' },
      take:    5,
    }),
    prisma.personalExpense.findMany({
      where:   { userId, ...dateInPeriod },
      orderBy: { date: 'desc' },
      take:    5,
    }),
  ])

  const revenusMois  = toNum(revenusPeriodeAgg._sum?.amount)
  const depensesMois = toNum(depensesPeriodeAgg._sum?.amount)
  const soldePeriode = revenusMois - depensesMois

  const tauxEpargne =
    revenusMois > 0 ? Math.round(((revenusMois - depensesMois) / revenusMois) * 100) : 0

  // 5 dernières opérations de la période (revenus + dépenses confondus)
  const transactionsRecentes = [
    ...recentRevenus.map((r) => ({
      id:         r.id,
      libelle:    r.label,
      montant:    toNum(r.amount),
      categorie:  r.type,
      date:       r.date.toISOString(),
      recurrent:  r.recurrent,
      createdAt:  r.createdAt.toISOString(),
      type:       'REVENU' as const,
    })),
    ...recentDepenses.map((d) => ({
      id:         d.id,
      libelle:    d.label,
      montant:    toNum(d.amount),
      categorie:  d.category,
      date:       d.date.toISOString(),
      recurrent:  false,
      createdAt:  d.createdAt.toISOString(),
      type:       'DEPENSE' as const,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  return {
    annee,
    mois,
    revenusMois,
    depensesMois,
    soldeTotalComptes: soldePeriode,   // ← solde NET de la période
    tauxEpargne,
    comptes: comptesList.map((c) => ({
      id:        c.id,
      nom:       c.nom,
      type:      c.type,
      solde:     toNum(c.balance),
      createdAt: c.createdAt.toISOString(),
    })),
    objectifs: objectifsList.map((o) => ({
      id:            o.id,
      nom:           o.name,
      montantCible:  toNum(o.targetAmount),
      montantActuel: toNum(o.currentAmount),
      dateEcheance:  o.deadline ? o.deadline.toISOString() : null,
      createdAt:     o.createdAt.toISOString(),
    })),
    transactionsRecentes,
  }
}

// ── Revenus ───────────────────────────────────────────────────────────────────

export async function listRevenus(userId: string) {
  return prisma.personalRevenue.findMany({
    where:   { userId },
    orderBy: { date: 'desc' },
  })
}

export async function createRevenu(
  userId: string,
  data: { label: string; amount: number; type?: string; date?: string; recurrent?: boolean; description?: string },
) {
  return prisma.personalRevenue.create({
    data: {
      userId,
      label:       data.label,
      amount:      data.amount,
      type:        data.type        ?? 'OTHER',
      date:        data.date        ? new Date(data.date) : new Date(),
      recurrent:   data.recurrent   ?? false,
      description: data.description ?? null,
    },
  })
}

export async function updateRevenu(
  userId: string,
  id: string,
  data: { label?: string; amount?: number; type?: string; date?: string; recurrent?: boolean; description?: string },
) {
  const rev = await prisma.personalRevenue.findFirst({ where: { id, userId } })
  if (!rev) throw new AppError('Revenu introuvable', 404, 'NOT_FOUND')

  return prisma.personalRevenue.update({
    where: { id },
    data: {
      ...(data.label       !== undefined ? { label: data.label }                : {}),
      ...(data.amount      !== undefined ? { amount: data.amount }              : {}),
      ...(data.type        !== undefined ? { type: data.type }                  : {}),
      ...(data.date        !== undefined ? { date: new Date(data.date) }        : {}),
      ...(data.recurrent   !== undefined ? { recurrent: data.recurrent }        : {}),
      ...(data.description !== undefined ? { description: data.description }    : {}),
    },
  })
}

export async function deleteRevenu(userId: string, id: string) {
  const rev = await prisma.personalRevenue.findFirst({ where: { id, userId } })
  if (!rev) throw new AppError('Revenu introuvable', 404, 'NOT_FOUND')
  await prisma.personalRevenue.delete({ where: { id } })
}

// ── Dépenses ──────────────────────────────────────────────────────────────────

export async function listDepenses(userId: string) {
  return prisma.personalExpense.findMany({
    where:   { userId },
    orderBy: { date: 'desc' },
  })
}

export async function createDepense(
  userId: string,
  data: { label: string; amount: number; category?: string; date?: string; description?: string },
) {
  return prisma.personalExpense.create({
    data: {
      userId,
      label:       data.label,
      amount:      data.amount,
      category:    data.category    ?? 'OTHER',
      date:        data.date        ? new Date(data.date) : new Date(),
      description: data.description ?? null,
    },
  })
}

export async function updateDepense(
  userId: string,
  id: string,
  data: { label?: string; amount?: number; category?: string; date?: string; description?: string },
) {
  const dep = await prisma.personalExpense.findFirst({ where: { id, userId } })
  if (!dep) throw new AppError('Dépense introuvable', 404, 'NOT_FOUND')

  return prisma.personalExpense.update({
    where: { id },
    data: {
      ...(data.label       !== undefined ? { label: data.label }                : {}),
      ...(data.amount      !== undefined ? { amount: data.amount }              : {}),
      ...(data.category    !== undefined ? { category: data.category }          : {}),
      ...(data.date        !== undefined ? { date: new Date(data.date) }        : {}),
      ...(data.description !== undefined ? { description: data.description }    : {}),
    },
  })
}

export async function deleteDepense(userId: string, id: string) {
  const dep = await prisma.personalExpense.findFirst({ where: { id, userId } })
  if (!dep) throw new AppError('Dépense introuvable', 404, 'NOT_FOUND')
  await prisma.personalExpense.delete({ where: { id } })
}

// ── Objectifs ─────────────────────────────────────────────────────────────────

export async function listObjectifs(userId: string) {
  return prisma.personalObjectif.findMany({
    where:   { userId },
    orderBy: [{ achieved: 'asc' }, { deadline: 'asc' }],
  })
}

export async function createObjectif(
  userId: string,
  data: { name: string; targetAmount: number; currentAmount?: number; deadline?: string },
) {
  return prisma.personalObjectif.create({
    data: {
      userId,
      name:          data.name,
      targetAmount:  data.targetAmount,
      currentAmount: data.currentAmount ?? 0,
      deadline:      data.deadline ? new Date(data.deadline) : null,
    },
  })
}

export async function updateObjectif(
  userId: string,
  id: string,
  data: { name?: string; targetAmount?: number; currentAmount?: number; deadline?: string; achieved?: boolean },
) {
  const obj = await prisma.personalObjectif.findFirst({ where: { id, userId } })
  if (!obj) throw new AppError('Objectif introuvable', 404, 'NOT_FOUND')

  return prisma.personalObjectif.update({
    where: { id },
    data: {
      ...(data.name          !== undefined ? { name: data.name }                          : {}),
      ...(data.targetAmount  !== undefined ? { targetAmount: data.targetAmount }          : {}),
      ...(data.currentAmount !== undefined ? { currentAmount: data.currentAmount }        : {}),
      ...(data.deadline      !== undefined ? { deadline: new Date(data.deadline) }        : {}),
      ...(data.achieved      !== undefined ? { achieved: data.achieved }                  : {}),
    },
  })
}

export async function deleteObjectif(userId: string, id: string) {
  const obj = await prisma.personalObjectif.findFirst({ where: { id, userId } })
  if (!obj) throw new AppError('Objectif introuvable', 404, 'NOT_FOUND')
  await prisma.personalObjectif.delete({ where: { id } })
}

// ── Comptes ───────────────────────────────────────────────────────────────────

export async function listComptes(userId: string) {
  return prisma.personalCompte.findMany({
    where:   { userId },
    orderBy: { nom: 'asc' },
  })
}

export async function createCompte(
  userId: string,
  data: { nom: string; type?: string; balance?: number; iban?: string },
) {
  return prisma.personalCompte.create({
    data: {
      userId,
      nom:     data.nom,
      type:    data.type    ?? 'COURANT',
      balance: data.balance ?? 0,
      iban:    data.iban    ?? null,
    },
  })
}

export async function updateCompte(
  userId: string,
  id: string,
  data: { nom?: string; type?: string; balance?: number; iban?: string; isActive?: boolean },
) {
  const compte = await prisma.personalCompte.findFirst({ where: { id, userId } })
  if (!compte) throw new AppError('Compte introuvable', 404, 'NOT_FOUND')

  return prisma.personalCompte.update({
    where: { id },
    data: {
      ...(data.nom      !== undefined ? { nom: data.nom }           : {}),
      ...(data.type     !== undefined ? { type: data.type }         : {}),
      ...(data.balance  !== undefined ? { balance: data.balance }   : {}),
      ...(data.iban     !== undefined ? { iban: data.iban }         : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  })
}

export async function deleteCompte(userId: string, id: string) {
  const compte = await prisma.personalCompte.findFirst({ where: { id, userId } })
  if (!compte) throw new AppError('Compte introuvable', 404, 'NOT_FOUND')
  await prisma.personalCompte.delete({ where: { id } })
}
