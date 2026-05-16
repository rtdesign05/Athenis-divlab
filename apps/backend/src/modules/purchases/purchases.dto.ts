import { z } from 'zod'

export const PurchaseOrderLineDto = z.object({
  reference:      z.string().optional(),
  designation:    z.string().min(1),
  quantite:       z.number().positive(),
  unite:          z.string().default('pièce'),
  prixUnitaireHT: z.number().min(0),
  montantHT:      z.number().min(0),
})

export const CreatePurchaseOrderDto = z.object({
  fournisseur:        z.string().min(1),
  objet:              z.string().min(1),
  date:               z.coerce.date(),
  receptionAt:        z.coerce.date().optional(),
  montantHT:          z.number().min(0),
  vatRate:            z.number().min(0).max(100).default(0),
  montantTTC:         z.number().min(0),
  conditionsPaiement: z.string().optional(),
  notes:              z.string().optional(),
  fiscalYearId:       z.string().optional(),
  lines:              z.array(PurchaseOrderLineDto).default([]),
})

export const UpdatePurchaseOrderDto = CreatePurchaseOrderDto.partial().extend({
  status: z.enum(['DRAFT', 'SENT', 'RECEIVED', 'PARTIAL', 'CANCELLED']).optional(),
})

export const ListPurchaseOrdersDto = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(200).default(50),
  status:   z.enum(['DRAFT', 'SENT', 'RECEIVED', 'PARTIAL', 'CANCELLED']).optional(),
  search:   z.string().optional(),
})

export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderDto>
export type UpdatePurchaseOrderInput = z.infer<typeof UpdatePurchaseOrderDto>
export type ListPurchaseOrdersInput  = z.infer<typeof ListPurchaseOrdersDto>
