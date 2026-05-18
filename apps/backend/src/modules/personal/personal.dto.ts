/**
 * V16 : DTOs Zod pour le module personal (espace privé utilisateur).
 *       Cohérent avec le reste du backend (pattern routes/service/dto).
 */
import { z } from 'zod'

// ── Revenus ──────────────────────────────────────────────────────────────────

export const CreateRevenuDto = z.object({
  label:       z.string().trim().min(1).max(200),
  amount:      z.number().finite().nonnegative().max(1_000_000_000_000),
  type:        z.string().max(50).optional(),
  date:        z.string().datetime().or(z.coerce.date()).optional(),
  recurrent:   z.boolean().optional(),
  description: z.string().max(2000).optional(),
})
export const UpdateRevenuDto = CreateRevenuDto.partial()

// ── Dépenses ─────────────────────────────────────────────────────────────────

export const CreateDepenseDto = z.object({
  label:       z.string().trim().min(1).max(200),
  amount:      z.number().finite().nonnegative().max(1_000_000_000_000),
  category:    z.string().max(50).optional(),
  date:        z.string().datetime().or(z.coerce.date()).optional(),
  recurrent:   z.boolean().optional(),
  description: z.string().max(2000).optional(),
})
export const UpdateDepenseDto = CreateDepenseDto.partial()

// ── Objectifs d'épargne ──────────────────────────────────────────────────────

export const CreateObjectifDto = z.object({
  label:        z.string().trim().min(1).max(200),
  targetAmount: z.number().finite().positive().max(1_000_000_000_000),
  currentAmount: z.number().finite().nonnegative().optional(),
  targetDate:   z.string().datetime().or(z.coerce.date()).optional(),
  description:  z.string().max(2000).optional(),
})
export const UpdateObjectifDto = CreateObjectifDto.partial()

export type CreateRevenuInput   = z.infer<typeof CreateRevenuDto>
export type UpdateRevenuInput   = z.infer<typeof UpdateRevenuDto>
export type CreateDepenseInput  = z.infer<typeof CreateDepenseDto>
export type UpdateDepenseInput  = z.infer<typeof UpdateDepenseDto>
export type CreateObjectifInput = z.infer<typeof CreateObjectifDto>
export type UpdateObjectifInput = z.infer<typeof UpdateObjectifDto>
