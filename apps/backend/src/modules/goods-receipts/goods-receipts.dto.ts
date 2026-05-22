import { z } from 'zod'

const LigneSchema = z.object({
  id:            z.string(),
  reference:     z.string().optional(),
  designation:   z.string(),
  quantite:      z.number().nonnegative(),
  quantiteRecue: z.number().nonnegative().default(0),
  unite:         z.string().optional(),
})

const StatusEnum = z.enum(['ATTENDU', 'RECU_PARTIEL', 'RECU', 'LITIGE'])

export const CreateGoodsReceiptDto = z.object({
  commande:       z.string().optional(),
  fournisseurNom: z.string().min(1).max(255),
  dateCreation:   z.coerce.date(),
  datePrevue:     z.coerce.date().nullable().optional(),
  dateReception:  z.coerce.date().nullable().optional(),
  statut:         StatusEnum.default('ATTENDU'),
  lignes:         z.array(LigneSchema).default([]),
  notes:          z.string().optional(),
  agenceId:       z.string().nullable().optional(),
})

export const UpdateGoodsReceiptDto = CreateGoodsReceiptDto.partial()

export type CreateGoodsReceiptInput = z.infer<typeof CreateGoodsReceiptDto>
export type UpdateGoodsReceiptInput = z.infer<typeof UpdateGoodsReceiptDto>
