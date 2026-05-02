import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toNum(d: Prisma.Decimal | null | undefined): number {
  return d ? Number(d) : 0
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getDashboard(userId: string) {
  const now          = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    profile,
    revenusAgg,
    depensesAgg,
    revenusMoisAgg,
    depensesMoisAgg,
    objectifsCount,
    objectifsAtteints,
    comptesAgg,
  ] = await Promise.all([
    // Upsert profile to ensure it exists
    prisma.personalProfile.upsert({
      where:  { userId },
      create: { userId },
      update: {},
    }),
    prisma.personalRevenue.aggregate({
      where: { userId },
      _sum:  { amount: true },
    }),
    prisma.personalExpense.aggregate({
      where: { userId },
      _sum:  { amount: true },
    }),
    prisma.personalRevenue.aggregate({
      where: { userId, date: { gte: firstOfMonth } },
      _sum:  { amount: true },
    }),
    prisma.personalExpense.aggregate({
      where: { userId, date: { gte: firstOfMonth } },
      _sum:  { amount: true },
    }),
    prisma.personalObjectif.count({ where: { userId } }),
    prisma.personalObjectif.count({ where: { userId, achieved: true } }),
    prisma.personalCompte.aggregate({
      where: { userId },
      _sum:  { balance: true },
    }),
  ])

  const totalRevenus  = toNum(revenusAgg._sum?.amount)
  const totalDepenses = toNum(depensesAgg._sum?.amount)
  const revenusMois   = toNum(revenusMoisAgg._sum?.amount)
  const depensesMois  = toNum(depensesMoisAgg._sum?.amount)
  const soldeTotal    = toNum(comptesAgg._sum?.balance)

  return {
    profile,
    summary: {
      soldeTotal,
      totalRevenus,
      totalDepenses,
      epargneNette:    totalRevenus - totalDepenses,
      revenusMois,
      depensesMois,
      soldeNetMois:    revenusMois - depensesMois,
      objectifsCount,
      objectifsAtteints,
    },
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
