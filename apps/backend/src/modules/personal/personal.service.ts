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
 * @param period   { annee, mois } 1-12 ; par défaut : mois en cours.
 *                 Les mois futurs sont autorisés pour du prévisionnel.
 *
 * Sémantique des champs renvoyés :
 *   - revenusMois / depensesMois : opérations DATÉES dans le mois (in-period)
 *   - soldeNetPeriode = revenusMois - depensesMois (flux net du mois)
 *   - soldeTotalComptes = soldeCumul = somme de (revenus - dépenses) depuis
 *     le début de l'historique jusqu'à la fin de la période sélectionnée.
 *     Permet le report mois-en-mois : si mai = 550€, et +1000€ en juin,
 *     juin = 1550€.
 *   - tauxEpargne : (revenus - dépenses) / revenus du mois en %
 *   - transactionsRecentes : 5 dernières opérations DE la période
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

  const dateInPeriod  = { date: { gte: periodStart, lt: periodEnd } }
  const dateUpToEnd   = { date: { lt: periodEnd } }                  // pour le cumul

  const [
    revenusPeriodeAgg,
    depensesPeriodeAgg,
    revenusCumulAgg,
    depensesCumulAgg,
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
    prisma.personalRevenue.aggregate({
      where: { userId, ...dateUpToEnd },
      _sum:  { amount: true },
    }),
    prisma.personalExpense.aggregate({
      where: { userId, ...dateUpToEnd },
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

  const revenusMois     = toNum(revenusPeriodeAgg._sum?.amount)
  const depensesMois    = toNum(depensesPeriodeAgg._sum?.amount)
  const soldeNetPeriode = revenusMois - depensesMois
  const soldeCumul      = toNum(revenusCumulAgg._sum?.amount) - toNum(depensesCumulAgg._sum?.amount)

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
    soldeNetPeriode,                   // ← flux net du mois (revenus − dépenses)
    soldeTotalComptes: soldeCumul,     // ← solde cumulé : reporté de mois en mois
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

/**
 * Vue annuelle : retourne pour chaque mois de l'année son revenus, dépenses,
 * solde net et solde cumulé. Permet le prévisionnel sur 12 mois — y compris
 * les mois futurs.
 */
export async function getAnnualOverview(userId: string, anneeIn?: number) {
  const now   = new Date()
  const annee = anneeIn && Number.isFinite(anneeIn) ? Math.trunc(anneeIn) : now.getFullYear()

  const yearStart = new Date(annee,     0, 1)
  const yearEnd   = new Date(annee + 1, 0, 1)

  // Solde cumulé d'ouverture : tout ce qui est avant le 01/01 de l'année
  const [openRevAgg, openDepAgg, yearRevenus, yearDepenses] = await Promise.all([
    prisma.personalRevenue.aggregate({ where: { userId, date: { lt: yearStart } }, _sum: { amount: true } }),
    prisma.personalExpense.aggregate({ where: { userId, date: { lt: yearStart } }, _sum: { amount: true } }),
    prisma.personalRevenue.findMany({
      where:  { userId, date: { gte: yearStart, lt: yearEnd } },
      select: { amount: true, date: true },
    }),
    prisma.personalExpense.findMany({
      where:  { userId, date: { gte: yearStart, lt: yearEnd } },
      select: { amount: true, date: true },
    }),
  ])

  const openingBalance = toNum(openRevAgg._sum?.amount) - toNum(openDepAgg._sum?.amount)

  // Agrégation par mois (0-11) — push direct, plus rapide que 24 queries Prisma
  const revByMonth   = new Array(12).fill(0) as number[]
  const depByMonth   = new Array(12).fill(0) as number[]
  for (const r of yearRevenus)   { revByMonth[r.date.getMonth()]! += toNum(r.amount) }
  for (const d of yearDepenses) { depByMonth[d.date.getMonth()]! += toNum(d.amount) }

  const mois: { mois: number; revenus: number; depenses: number; soldeNet: number; soldeCumul: number }[] = []
  let running = openingBalance
  for (let m = 0; m < 12; m++) {
    const rev = revByMonth[m]!
    const dep = depByMonth[m]!
    const net = rev - dep
    running += net
    mois.push({ mois: m + 1, revenus: rev, depenses: dep, soldeNet: net, soldeCumul: running })
  }

  return {
    annee,
    openingBalance,
    closingBalance: running,
    mois,
  }
}

// ── Revenus ───────────────────────────────────────────────────────────────────

export async function listRevenus(
  userId: string,
  filters?: { annee?: number; mois?: number; categorie?: string },
) {
  const where: Record<string, unknown> = { userId }
  if (filters?.annee && filters?.mois) {
    const a = Math.trunc(filters.annee)
    const m = Math.min(12, Math.max(1, Math.trunc(filters.mois)))
    where['date'] = { gte: new Date(a, m - 1, 1), lt: new Date(a, m, 1) }
  } else if (filters?.annee) {
    const a = Math.trunc(filters.annee)
    where['date'] = { gte: new Date(a, 0, 1), lt: new Date(a + 1, 0, 1) }
  }
  if (filters?.categorie) where['type'] = filters.categorie
  return prisma.personalRevenue.findMany({
    where,
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

export async function listDepenses(
  userId: string,
  filters?: { annee?: number; mois?: number; categorie?: string },
) {
  const where: Record<string, unknown> = { userId }
  if (filters?.annee && filters?.mois) {
    const a = Math.trunc(filters.annee)
    const m = Math.min(12, Math.max(1, Math.trunc(filters.mois)))
    where['date'] = { gte: new Date(a, m - 1, 1), lt: new Date(a, m, 1) }
  } else if (filters?.annee) {
    const a = Math.trunc(filters.annee)
    where['date'] = { gte: new Date(a, 0, 1), lt: new Date(a + 1, 0, 1) }
  }
  if (filters?.categorie) where['category'] = filters.categorie
  return prisma.personalExpense.findMany({
    where,
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
