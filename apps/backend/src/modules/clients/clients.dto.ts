import { z } from 'zod'

export const CreateClientDto = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  siren: z.string().length(9).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  /** Compte comptable client (411xxx). Auto-généré si non fourni. */
  accountingCode: z.string().min(3).max(9).optional(),
  /** Agence à laquelle rattacher le client (multi-site). */
  agenceId: z.string().nullable().optional(),
})

export const UpdateClientDto = CreateClientDto.partial()

export const ListClientsDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
})

export type CreateClientInput = z.infer<typeof CreateClientDto>
export type UpdateClientInput = z.infer<typeof UpdateClientDto>
export type ListClientsInput = z.infer<typeof ListClientsDto>
