import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { getAgenceFilter } from '../../middleware/agenceFilter.js'
import type { JwtPayload } from '@athenis/shared-types'
import type {
  CreateTreasuryEntryInput,
  CreateTreasurySourceInput,
  ListTreasuryInput,
  ListTreasurySourcesInput,
  UpdateTreasuryEntryInput,
  UpdateTreasurySourceInput,
} from './treasury.dto.js'

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

export async function updateEntry(
  companyId: string,
  id: string,
  data: UpdateTreasuryEntryInput,
) {
  const entry = await prisma.treasuryEntry.findUnique({ where: { id } })
  if (!entry || entry.companyId !== companyId) return null
  return prisma.treasuryEntry.update({
    where: { id },
    data: {
      ...(data.date         !== undefined ? { date: data.date } : {}),
      ...(data.libelle      !== undefined ? { libelle: data.libelle } : {}),
      ...(data.montant      !== undefined ? { montant: new Prisma.Decimal(data.montant) } : {}),
      ...(data.pieceName    !== undefined ? { pieceName: data.pieceName } : {}),
      ...(data.status       !== undefined ? { status: data.status } : {}),
      ...(data.contrepartie !== undefined ? { contrepartie: data.contrepartie ?? Prisma.JsonNull } : {}),
      ...(data.extraPieces  !== undefined ? { extraPieces:  data.extraPieces  ?? Prisma.JsonNull } : {}),
    },
    include: { agence: { select: { nom: true } } },
  })
}

export async function deleteEntry(companyId: string, id: string) {
  const entry = await prisma.treasuryEntry.findUnique({ where: { id } })
  if (!entry || entry.companyId !== companyId) return
  await prisma.treasuryEntry.delete({ where: { id } })
}

// ── Sources (comptes bancaires / caisses / wallets MM) ────────────────────────

export async function listSources(
  companyId: string,
  query: ListTreasurySourcesInput,
  user?: JwtPayload,
) {
  const where: Prisma.TreasurySourceWhereInput = {
    companyId,
    isActive: true,
    ...(user ? getAgenceFilter(user) : {}),
    ...(query.type ? { type: query.type } : {}),
  }
  return prisma.treasurySource.findMany({
    where,
    include: { agence: { select: { id: true, nom: true } } },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createSource(
  companyId: string,
  data: CreateTreasurySourceInput,
  user?: JwtPayload,
) {
  const agenceId = data.agenceId ?? user?.agenceId ?? null
  return prisma.treasurySource.create({
    data: {
      companyId,
      ...(agenceId ? { agenceId } : {}),
      type:            data.type,
      nom:             data.nom,
      solde:           new Prisma.Decimal(data.solde ?? 0),
      devise:          data.devise ?? 'XAF',
      banque:          data.banque ?? null,
      numero:          data.numero ?? null,
      responsable:     data.responsable ?? null,
      operateur:       data.operateur ?? null,
      numeroTelephone: data.numeroTelephone ?? null,
    },
    include: { agence: { select: { id: true, nom: true } } },
  })
}

export async function updateSource(
  companyId: string,
  id: string,
  data: UpdateTreasurySourceInput,
) {
  const existing = await prisma.treasurySource.findUnique({ where: { id } })
  if (!existing || existing.companyId !== companyId) return null
  return prisma.treasurySource.update({
    where: { id },
    data: {
      ...(data.nom             !== undefined ? { nom: data.nom } : {}),
      ...(data.solde           !== undefined ? { solde: new Prisma.Decimal(data.solde) } : {}),
      ...(data.devise          !== undefined ? { devise: data.devise } : {}),
      ...(data.banque          !== undefined ? { banque: data.banque ?? null } : {}),
      ...(data.numero          !== undefined ? { numero: data.numero ?? null } : {}),
      ...(data.responsable     !== undefined ? { responsable: data.responsable ?? null } : {}),
      ...(data.operateur       !== undefined ? { operateur: data.operateur ?? null } : {}),
      ...(data.numeroTelephone !== undefined ? { numeroTelephone: data.numeroTelephone ?? null } : {}),
      ...(data.agenceId        !== undefined ? { agenceId: data.agenceId ?? null } : {}),
    },
    include: { agence: { select: { id: true, nom: true } } },
  })
}

export async function deleteSource(companyId: string, id: string) {
  const existing = await prisma.treasurySource.findUnique({ where: { id } })
  if (!existing || existing.companyId !== companyId) return
  // Soft delete : on garde l'historique des opérations rattachées au nom
  await prisma.treasurySource.update({ where: { id }, data: { isActive: false } })
}
