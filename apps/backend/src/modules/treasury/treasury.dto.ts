import { z } from 'zod'

export const CreateTreasuryEntryDto = z.object({
  date:       z.coerce.date(),
  libelle:    z.string().min(1),
  montant:    z.number(),               // positif = crédit, négatif = débit
  sourceType: z.enum(['banque', 'caisse', 'mobile_money']),
  sourceName: z.string().min(1),        // ex: "BICEC — Compte courant entreprise"
  pieceName:  z.string().optional(),
})

export const ListTreasuryDto = z.object({
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().min(1).max(500).default(200),
  sourceType: z.enum(['banque', 'caisse', 'mobile_money']).optional(),
  sourceName: z.string().optional(),
})

export type CreateTreasuryEntryInput = z.infer<typeof CreateTreasuryEntryDto>
export type ListTreasuryInput        = z.infer<typeof ListTreasuryDto>
