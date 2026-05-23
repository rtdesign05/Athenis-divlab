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
  // Le solde réel d'un compte de trésorerie = solde initial saisi à la
  // création de la source (banque, caisse, mobile money) + somme des
  // mouvements (TreasuryEntry). Les anciennes implémentations n'agrégeaient
  // que les TreasuryEntry → les nouveaux comptes créés depuis le module
  // Gestion (avec solde initial > 0) n'apparaissaient pas sur le dashboard.
  const baseWhere = {
    companyId,
    ...(user ? getAgenceFilter(user) : {}),
  } as const

  const [sources, entriesAgg] = await Promise.all([
    prisma.treasurySource.findMany({
      where: { ...baseWhere, isActive: true },
      select: { type: true, nom: true, solde: true },
    }),
    prisma.treasuryEntry.groupBy({
      by:    ['sourceName', 'sourceType'],
      where: baseWhere,
      _sum:  { montant: true },
    }),
  ])

  // Index des mouvements par (type|nom) — clé composite car le même nom peut
  // exister sur deux types différents (ex: « Wave » mobile_money et caisse).
  const movementByKey = new Map<string, number>()
  for (const r of entriesAgg) {
    movementByKey.set(`${r.sourceType}|${r.sourceName}`, Number(r._sum.montant ?? 0))
  }

  // 1) D'abord toutes les sources actives (solde initial + mouvements)
  const out = sources.map(s => {
    const key  = `${s.type}|${s.nom}`
    const move = movementByKey.get(key) ?? 0
    movementByKey.delete(key)
    return {
      sourceName: s.nom,
      sourceType: s.type as Prisma.TreasuryEntryGroupByOutputType['sourceType'],
      solde:      Number(s.solde ?? 0) + move,
    }
  })

  // 2) Puis les mouvements « orphelins » dont la source n'existe plus
  //    (ou n'a jamais été créée en TreasurySource) — rétro-compat.
  for (const [key, sum] of movementByKey) {
    const [type, name] = key.split('|', 2) as [string, string]
    out.push({
      sourceName: name,
      sourceType: type as Prisma.TreasuryEntryGroupByOutputType['sourceType'],
      solde:      sum,
    })
  }

  return out
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
