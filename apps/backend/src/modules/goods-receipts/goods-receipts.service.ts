import { Prisma } from '@prisma/client'
import type { GoodsReceipt } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type {
  CreateGoodsReceiptInput,
  UpdateGoodsReceiptInput,
} from './goods-receipts.dto.js'

type WithAgence = GoodsReceipt & { agence: { id: string; nom: string } | null }

function serialize(b: WithAgence) {
  return {
    id:             b.id,
    companyId:      b.companyId,
    agenceId:       b.agenceId,
    agence:         b.agence,
    commande:       b.commande,
    fournisseurNom: b.fournisseurNom,
    dateCreation:   b.dateCreation.toISOString().slice(0, 10),
    datePrevue:     b.datePrevue?.toISOString().slice(0, 10) ?? null,
    dateReception:  b.dateReception?.toISOString().slice(0, 10) ?? null,
    statut:         b.statut,
    lignes:         b.lignes,
    notes:          b.notes,
    createdAt:      b.createdAt.toISOString(),
    updatedAt:      b.updatedAt.toISOString(),
  }
}

const include = { agence: { select: { id: true, nom: true } } }

export async function listGoodsReceipts(companyId: string) {
  const items = await prisma.goodsReceipt.findMany({
    where:   { companyId },
    include,
    orderBy: { createdAt: 'desc' },
  })
  return items.map(serialize)
}

export async function createGoodsReceipt(companyId: string, data: CreateGoodsReceiptInput) {
  const created = await prisma.goodsReceipt.create({
    data: {
      companyId,
      commande:       data.commande ?? null,
      fournisseurNom: data.fournisseurNom,
      dateCreation:   data.dateCreation,
      datePrevue:     data.datePrevue ?? null,
      dateReception:  data.dateReception ?? null,
      statut:         data.statut ?? 'ATTENDU',
      lignes:         data.lignes as unknown as Prisma.InputJsonValue,
      notes:          data.notes ?? null,
      ...(data.agenceId ? { agenceId: data.agenceId } : {}),
    },
    include,
  })
  return serialize(created)
}

export async function updateGoodsReceipt(companyId: string, id: string, data: UpdateGoodsReceiptInput) {
  const existing = await prisma.goodsReceipt.findUnique({ where: { id } })
  if (!existing || existing.companyId !== companyId) {
    throw new AppError('Bon de réception introuvable', 404, 'NOT_FOUND')
  }
  const updated = await prisma.goodsReceipt.update({
    where: { id },
    data: {
      ...(data.commande       !== undefined ? { commande:       data.commande ?? null }            : {}),
      ...(data.fournisseurNom !== undefined ? { fournisseurNom: data.fournisseurNom }              : {}),
      ...(data.dateCreation   !== undefined ? { dateCreation:   data.dateCreation }                : {}),
      ...(data.datePrevue     !== undefined ? { datePrevue:     data.datePrevue ?? null }          : {}),
      ...(data.dateReception  !== undefined ? { dateReception:  data.dateReception ?? null }       : {}),
      ...(data.statut         !== undefined ? { statut:         data.statut }                      : {}),
      ...(data.lignes         !== undefined ? { lignes:         data.lignes as unknown as Prisma.InputJsonValue } : {}),
      ...(data.notes          !== undefined ? { notes:          data.notes ?? null }               : {}),
      ...(data.agenceId       !== undefined ? { agenceId:       data.agenceId ?? null }            : {}),
    },
    include,
  })
  return serialize(updated)
}

export async function deleteGoodsReceipt(companyId: string, id: string) {
  const result = await prisma.goodsReceipt.deleteMany({ where: { id, companyId } })
  if (result.count === 0) throw new AppError('Bon de réception introuvable', 404, 'NOT_FOUND')
}
