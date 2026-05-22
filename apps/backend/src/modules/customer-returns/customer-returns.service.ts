import { Prisma } from '@prisma/client'
import type { CustomerReturn } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type {
  CreateCustomerReturnInput,
  UpdateCustomerReturnInput,
} from './customer-returns.dto.js'

type WithAgence = CustomerReturn & { agence: { id: string; nom: string } | null }

function serialize(r: WithAgence) {
  return {
    id:        r.id,
    companyId: r.companyId,
    agenceId:  r.agenceId,
    agence:    r.agence,
    facture:   r.facture,
    clientNom: r.clientNom,
    date:      r.date.toISOString().slice(0, 10),
    motif:     r.motif,
    montant:   Number(r.montant),
    statut:    r.statut,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

const include = { agence: { select: { id: true, nom: true } } }

export async function listCustomerReturns(companyId: string) {
  const items = await prisma.customerReturn.findMany({
    where:   { companyId },
    include,
    orderBy: { createdAt: 'desc' },
  })
  return items.map(serialize)
}

export async function createCustomerReturn(companyId: string, data: CreateCustomerReturnInput) {
  const created = await prisma.customerReturn.create({
    data: {
      companyId,
      facture:   data.facture ?? null,
      clientNom: data.clientNom,
      date:      data.date,
      motif:     data.motif ?? null,
      montant:   new Prisma.Decimal(data.montant ?? 0),
      statut:    data.statut ?? 'EN_COURS',
      ...(data.agenceId ? { agenceId: data.agenceId } : {}),
    },
    include,
  })
  return serialize(created)
}

export async function updateCustomerReturn(companyId: string, id: string, data: UpdateCustomerReturnInput) {
  const existing = await prisma.customerReturn.findUnique({ where: { id } })
  if (!existing || existing.companyId !== companyId) {
    throw new AppError('Retour client introuvable', 404, 'NOT_FOUND')
  }
  const updated = await prisma.customerReturn.update({
    where: { id },
    data: {
      ...(data.facture   !== undefined ? { facture:   data.facture ?? null }                     : {}),
      ...(data.clientNom !== undefined ? { clientNom: data.clientNom }                           : {}),
      ...(data.date      !== undefined ? { date:      data.date }                                : {}),
      ...(data.motif     !== undefined ? { motif:     data.motif ?? null }                       : {}),
      ...(data.montant   !== undefined ? { montant:   new Prisma.Decimal(data.montant) }         : {}),
      ...(data.statut    !== undefined ? { statut:    data.statut }                              : {}),
      ...(data.agenceId  !== undefined ? { agenceId:  data.agenceId ?? null }                    : {}),
    },
    include,
  })
  return serialize(updated)
}

export async function deleteCustomerReturn(companyId: string, id: string) {
  const result = await prisma.customerReturn.deleteMany({ where: { id, companyId } })
  if (result.count === 0) throw new AppError('Retour client introuvable', 404, 'NOT_FOUND')
}
