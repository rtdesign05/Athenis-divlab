import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { getAgenceFilter } from '../../middleware/agenceFilter.js'
import type { JwtPayload } from '@athenis/shared-types'
import type { CreateTreasuryEntryInput, ListTreasuryInput } from './treasury.dto.js'

// ── Liste + soldes agrégés ────────────────────────────────────────────────────

export async function listEntries(companyId: string, query: ListTreasuryInput, user?: JwtPayload) {
  const { page, limit, sourceType, sourceName } = query
  const where: Prisma.TreasuryEntryWhereInput = {
    companyId,
    ...(user ? getAgenceFilter(user) : {}),
    ...(sourceType ? { sourceType } : {}),
    ...(sourceName ? { sourceName } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.treasuryEntry.findMany({
      where,
      include: { agence: { select: { nom: true } } },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.treasuryEntry.count({ where }),
  ])
  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

// Soldes agrégés par compte (sourceName) — pour TresoreriePage
export async function getBalances(companyId: string, user?: JwtPayload) {
  const where: Prisma.TreasuryEntryWhereInput = {
    companyId,
    ...(user ? getAgenceFilter(user) : {}),
  }
  const agg = await prisma.treasuryEntry.groupBy({
    by:    ['sourceName', 'sourceType'],
    where,
    _sum:  { montant: true },
  })
  return agg.map(r => ({
    sourceName: r.sourceName,
    sourceType: r.sourceType,
    solde:      Number(r._sum.montant ?? 0),
  }))
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createEntry(companyId: string, data: CreateTreasuryEntryInput, user?: JwtPayload) {
  const agenceId = user?.agenceId ?? null
  return prisma.treasuryEntry.create({
    data: {
      companyId,
      ...(agenceId ? { agenceId } : {}),
      date:       data.date,
      libelle:    data.libelle,
      montant:    new Prisma.Decimal(data.montant),
      sourceType: data.sourceType,
      sourceName: data.sourceName,
      pieceName:  data.pieceName ?? null,
    },
    include: { agence: { select: { nom: true } } },
  })
}

export async function deleteEntry(companyId: string, id: string) {
  const entry = await prisma.treasuryEntry.findUnique({ where: { id } })
  if (!entry || entry.companyId !== companyId) return
  await prisma.treasuryEntry.delete({ where: { id } })
}
