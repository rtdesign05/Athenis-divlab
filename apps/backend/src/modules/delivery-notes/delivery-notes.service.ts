import { Prisma } from '@prisma/client'
import type { DeliveryNote } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type {
  CreateDeliveryNoteInput,
  UpdateDeliveryNoteInput,
} from './delivery-notes.dto.js'

type WithAgence = DeliveryNote & { agence: { id: string; nom: string } | null }

function serialize(b: WithAgence) {
  return {
    id:               b.id,
    companyId:        b.companyId,
    agenceId:         b.agenceId,
    agence:           b.agence,
    commande:         b.commande,
    clientNom:        b.clientNom,
    dateCreation:     b.dateCreation.toISOString().slice(0, 10),
    datePrevue:       b.datePrevue?.toISOString().slice(0, 10) ?? null,
    dateLivraison:    b.dateLivraison?.toISOString().slice(0, 10) ?? null,
    statut:           b.statut,
    lignes:           b.lignes,
    adresseLivraison: b.adresseLivraison,
    notes:            b.notes,
    createdAt:        b.createdAt.toISOString(),
    updatedAt:        b.updatedAt.toISOString(),
  }
}

const include = { agence: { select: { id: true, nom: true } } }

export async function listDeliveryNotes(companyId: string) {
  const items = await prisma.deliveryNote.findMany({
    where:   { companyId },
    include,
    orderBy: { createdAt: 'desc' },
  })
  return items.map(serialize)
}

export async function createDeliveryNote(companyId: string, data: CreateDeliveryNoteInput) {
  const created = await prisma.deliveryNote.create({
    data: {
      companyId,
      commande:         data.commande ?? null,
      clientNom:        data.clientNom,
      dateCreation:     data.dateCreation,
      datePrevue:       data.datePrevue ?? null,
      dateLivraison:    data.dateLivraison ?? null,
      statut:           data.statut ?? 'EN_PREPARATION',
      lignes:           data.lignes as unknown as Prisma.InputJsonValue,
      adresseLivraison: data.adresseLivraison ?? null,
      notes:            data.notes ?? null,
      ...(data.agenceId ? { agenceId: data.agenceId } : {}),
    },
    include,
  })
  return serialize(created)
}

export async function updateDeliveryNote(companyId: string, id: string, data: UpdateDeliveryNoteInput) {
  const existing = await prisma.deliveryNote.findUnique({ where: { id } })
  if (!existing || existing.companyId !== companyId) {
    throw new AppError('Bon de livraison introuvable', 404, 'NOT_FOUND')
  }
  const updated = await prisma.deliveryNote.update({
    where: { id },
    data: {
      ...(data.commande         !== undefined ? { commande:         data.commande ?? null }            : {}),
      ...(data.clientNom        !== undefined ? { clientNom:        data.clientNom }                   : {}),
      ...(data.dateCreation     !== undefined ? { dateCreation:     data.dateCreation }                : {}),
      ...(data.datePrevue       !== undefined ? { datePrevue:       data.datePrevue ?? null }          : {}),
      ...(data.dateLivraison    !== undefined ? { dateLivraison:    data.dateLivraison ?? null }       : {}),
      ...(data.statut           !== undefined ? { statut:           data.statut }                      : {}),
      ...(data.lignes           !== undefined ? { lignes:           data.lignes as unknown as Prisma.InputJsonValue } : {}),
      ...(data.adresseLivraison !== undefined ? { adresseLivraison: data.adresseLivraison ?? null }    : {}),
      ...(data.notes            !== undefined ? { notes:            data.notes ?? null }               : {}),
      ...(data.agenceId         !== undefined ? { agenceId:         data.agenceId ?? null }            : {}),
    },
    include,
  })
  return serialize(updated)
}

export async function deleteDeliveryNote(companyId: string, id: string) {
  const result = await prisma.deliveryNote.deleteMany({ where: { id, companyId } })
  if (result.count === 0) throw new AppError('Bon de livraison introuvable', 404, 'NOT_FOUND')
}
