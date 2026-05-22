import { z } from 'zod'

const CategorieEnum = z.enum([
  'MATIERES_PREMIERES', 'SERVICES', 'EQUIPEMENT', 'LOGISTIQUE', 'INFORMATIQUE', 'AUTRE',
])

export const CreateFournisseurDto = z.object({
  nom:        z.string().min(1).max(255),
  categorie:  CategorieEnum.default('AUTRE'),
  email:      z.string().email().optional().or(z.literal('')),
  telephone:  z.string().max(20).optional().or(z.literal('')),
  adresse:    z.string().max(500).optional().or(z.literal('')),
  notes:      z.string().max(2000).optional().or(z.literal('')),
  agenceId:   z.string().nullable().optional(),
  accountingCode: z.string().max(20).optional(),
})

export const UpdateFournisseurDto = CreateFournisseurDto.partial()

export const ListFournisseursDto = z.object({
  search:   z.string().optional(),
  isActive: z.preprocess(v => v === 'true' || v === true, z.boolean()).optional(),
})

export type CreateFournisseurInput = z.infer<typeof CreateFournisseurDto>
export type UpdateFournisseurInput = z.infer<typeof UpdateFournisseurDto>
export type ListFournisseursInput  = z.infer<typeof ListFournisseursDto>
