import { z } from 'zod'

export const CreateTreasuryEntryDto = z.object({
  date:       z.coerce.date(),
  libelle:    z.string().min(1),
  montant:    z.number(),               // positif = crédit, négatif = débit
  sourceType: z.enum(['banque', 'caisse', 'mobile_money']),
  sourceName: z.string().min(1),        // ex: "BICEC — Compte courant entreprise"
  pieceName:  z.string().optional(),
})

const ContrepartieSchema = z.object({
  accountCode:  z.string().min(1),
  accountLabel: z.string().min(1),
  libelle:      z.string().min(1),
  addedAt:      z.string().min(1),
})

const ExtraPieceSchema = z.object({
  id:      z.string().min(1),
  nom:     z.string().min(1),
  type:    z.enum(['facture', 'recu', 'bon_commande', 'virement', 'contrat', 'autre']),
  addedAt: z.string().min(1),
})

export const UpdateTreasuryEntryDto = z.object({
  date:         z.coerce.date().optional(),
  libelle:      z.string().min(1).optional(),
  montant:      z.number().optional(),
  pieceName:    z.string().nullable().optional(),
  status:       z.enum(['a_traiter', 'traite']).optional(),
  contrepartie: ContrepartieSchema.nullable().optional(),
  extraPieces:  z.array(ExtraPieceSchema).nullable().optional(),
})

export const ListTreasuryDto = z.object({
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().min(1).max(500).default(200),
  sourceType: z.enum(['banque', 'caisse', 'mobile_money']).optional(),
  sourceName: z.string().optional(),
})

// ── TreasurySource (comptes bancaires / caisses / mobile money) ────────────────

export const CreateTreasurySourceDto = z.object({
  type:            z.enum(['banque', 'caisse', 'mobile_money']),
  nom:             z.string().min(1),
  solde:           z.number().default(0),
  devise:          z.string().default('XAF'),
  banque:          z.string().optional(),
  numero:          z.string().optional(),
  responsable:     z.string().optional(),
  operateur:       z.string().optional(),
  numeroTelephone: z.string().optional(),
  agenceId:        z.string().optional(),
})

export const UpdateTreasurySourceDto = CreateTreasurySourceDto.partial().omit({ type: true })

export const ListTreasurySourcesDto = z.object({
  type: z.enum(['banque', 'caisse', 'mobile_money']).optional(),
})

export type CreateTreasuryEntryInput   = z.infer<typeof CreateTreasuryEntryDto>
export type UpdateTreasuryEntryInput   = z.infer<typeof UpdateTreasuryEntryDto>
export type ListTreasuryInput          = z.infer<typeof ListTreasuryDto>
export type CreateTreasurySourceInput  = z.infer<typeof CreateTreasurySourceDto>
export type UpdateTreasurySourceInput  = z.infer<typeof UpdateTreasurySourceDto>
export type ListTreasurySourcesInput   = z.infer<typeof ListTreasurySourcesDto>
