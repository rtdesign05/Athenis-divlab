import { Prisma } from '@prisma/client'
import type { Fournisseur } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type {
  CreateFournisseurInput,
  UpdateFournisseurInput,
  ListFournisseursInput,
} from './fournisseurs.dto.js'

type WithAgence = Fournisseur & { agence: { id: string; nom: string } | null }

function serialize(f: WithAgence) {
  return {
    id:             f.id,
    companyId:      f.companyId,
    agenceId:       f.agenceId,
    agence:         f.agence,
    nom:            f.nom,
    categorie:      f.categorie,
    email:          f.email,
    telephone:      f.telephone,
    adresse:        f.adresse,
    notes:          f.notes,
    accountingCode: f.accountingCode,
    isActive:       f.isActive,
    createdAt:      f.createdAt.toISOString(),
    updatedAt:      f.updatedAt.toISOString(),
  }
}

const include = { agence: { select: { id: true, nom: true } } }

export async function listFournisseurs(companyId: string, query: ListFournisseursInput) {
  const where: Prisma.FournisseurWhereInput = {
    companyId,
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.search
      ? { OR: [
          { nom:   { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ]}
      : {}),
  }
  const items = await prisma.fournisseur.findMany({ where, include, orderBy: { nom: 'asc' } })
  return items.map(serialize)
}

export async function createFournisseur(companyId: string, data: CreateFournisseurInput) {
  const created = await prisma.fournisseur.create({
    data: {
      companyId,
      nom:            data.nom,
      categorie:      data.categorie ?? 'AUTRE',
      email:          data.email     || null,
      telephone:      data.telephone || null,
      adresse:        data.adresse   || null,
      notes:          data.notes     || null,
      accountingCode: data.accountingCode || null,
      ...(data.agenceId ? { agenceId: data.agenceId } : {}),
    },
    include,
  })
  return serialize(created)
}

export async function updateFournisseur(companyId: string, id: string, data: UpdateFournisseurInput) {
  const existing = await prisma.fournisseur.findUnique({ where: { id } })
  if (!existing || existing.companyId !== companyId) {
    throw new AppError('Fournisseur introuvable', 404, 'NOT_FOUND')
  }
  const updated = await prisma.fournisseur.update({
    where: { id },
    data: {
      ...(data.nom            !== undefined ? { nom: data.nom }                                 : {}),
      ...(data.categorie      !== undefined ? { categorie: data.categorie }                     : {}),
      ...(data.email          !== undefined ? { email:     data.email     || null }             : {}),
      ...(data.telephone      !== undefined ? { telephone: data.telephone || null }             : {}),
      ...(data.adresse        !== undefined ? { adresse:   data.adresse   || null }             : {}),
      ...(data.notes          !== undefined ? { notes:     data.notes     || null }             : {}),
      ...(data.accountingCode !== undefined ? { accountingCode: data.accountingCode || null }   : {}),
      ...(data.agenceId       !== undefined ? { agenceId:  data.agenceId  ?? null }             : {}),
    },
    include,
  })
  return serialize(updated)
}

export async function deleteFournisseur(companyId: string, id: string) {
  const result = await prisma.fournisseur.deleteMany({ where: { id, companyId } })
  if (result.count === 0) throw new AppError('Fournisseur introuvable', 404, 'NOT_FOUND')
}
