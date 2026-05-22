import { z } from 'zod'

const StatusEnum = z.enum(['EN_COURS', 'VALIDE', 'REMBOURSE', 'REFUSE'])

export const CreateCustomerReturnDto = z.object({
  facture:   z.string().optional(),
  clientNom: z.string().min(1).max(255),
  date:      z.coerce.date(),
  motif:     z.string().optional(),
  montant:   z.number().nonnegative().default(0),
  statut:    StatusEnum.default('EN_COURS'),
  agenceId:  z.string().nullable().optional(),
})

export const UpdateCustomerReturnDto = CreateCustomerReturnDto.partial()

export type CreateCustomerReturnInput = z.infer<typeof CreateCustomerReturnDto>
export type UpdateCustomerReturnInput = z.infer<typeof UpdateCustomerReturnDto>
