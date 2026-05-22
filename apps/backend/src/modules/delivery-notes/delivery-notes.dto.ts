import { z } from 'zod'

const LigneSchema = z.object({
  id:          z.string(),
  articleId:   z.string().optional(),
  reference:   z.string().optional(),
  designation: z.string(),
  quantite:    z.number().nonnegative(),
  unite:       z.string().optional(),
})

const StatusEnum = z.enum(['EN_PREPARATION', 'EXPEDIE', 'LIVRE', 'RETOURNE'])

export const CreateDeliveryNoteDto = z.object({
  commande:         z.string().optional(),
  clientNom:        z.string().min(1).max(255),
  dateCreation:     z.coerce.date(),
  datePrevue:       z.coerce.date().nullable().optional(),
  dateLivraison:    z.coerce.date().nullable().optional(),
  statut:           StatusEnum.default('EN_PREPARATION'),
  lignes:           z.array(LigneSchema).default([]),
  adresseLivraison: z.string().optional(),
  notes:            z.string().optional(),
  agenceId:         z.string().nullable().optional(),
})

export const UpdateDeliveryNoteDto = CreateDeliveryNoteDto.partial()

export type CreateDeliveryNoteInput = z.infer<typeof CreateDeliveryNoteDto>
export type UpdateDeliveryNoteInput = z.infer<typeof UpdateDeliveryNoteDto>
