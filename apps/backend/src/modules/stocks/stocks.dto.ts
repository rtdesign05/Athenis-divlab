import { z } from 'zod'

export const CreateFamilyDto = z.object({
  code:        z.string().min(2).max(6).toUpperCase(),
  nom:         z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

export const UpdateFamilyDto = CreateFamilyDto.partial()

export const CreateArticleDto = z.object({
  reference:        z.string().max(50).optional(),
  designation:      z.string().min(1).max(200),
  familleId:        z.string().optional(),
  unite:            z.string().default('unité'),
  prixAchat:        z.number().nonnegative(),
  prixVente:        z.number().nonnegative(),
  tvaAchat:         z.number().min(0).max(1).default(0.1925),
  tvaVente:         z.number().min(0).max(1).default(0.1925),
  stockInitial:     z.number().nonnegative().default(0),
  stockMin:         z.number().nonnegative().default(0),
  stockMax:         z.number().nonnegative().optional(),
  methodeValuation: z.enum(['CMUP', 'FIFO']).default('CMUP'),
  description:      z.string().max(500).optional(),
  codeBarres:       z.string().max(50).optional(),
  fournisseur:      z.string().max(200).optional(),
  delaiAppro:       z.number().int().nonnegative().optional(),
  emplacement:      z.string().max(100).optional(),
  compteAchat:      z.string().max(20).optional(),
  compteVente:      z.string().max(20).optional(),
})

export const UpdateArticleDto = CreateArticleDto.omit({ stockInitial: true }).partial()

export const ListArticlesDto = z.object({
  familleId: z.string().optional(),
  search:    z.string().optional(),
  alerte:    z.coerce.boolean().optional(),
  isActive:  z.coerce.boolean().optional(),
  page:      z.coerce.number().int().positive().default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(50),
})

export const CreateMouvementDto = z.object({
  articleId:    z.string(),
  type:         z.enum(['ENTREE_ACHAT', 'ENTREE_RETOUR', 'ENTREE_INVENTAIRE', 'SORTIE_VENTE', 'SORTIE_CASSE', 'SORTIE_INVENTAIRE', 'TRANSFERT', 'AJUSTEMENT']),
  quantite:     z.number().positive(),
  prixUnitaire: z.number().nonnegative(),
  date:         z.coerce.date().optional(),
  reference:    z.string().max(100).optional(),
  description:  z.string().max(500).optional(),
  invoiceId:    z.string().optional(),
  fiscalYearId: z.string().optional(),
})

export const ListMouvementsDto = z.object({
  articleId: z.string().optional(),
  type:      z.enum(['ENTREE_ACHAT', 'ENTREE_RETOUR', 'ENTREE_INVENTAIRE', 'SORTIE_VENTE', 'SORTIE_CASSE', 'SORTIE_INVENTAIRE', 'TRANSFERT', 'AJUSTEMENT']).optional(),
  dateFrom:  z.coerce.date().optional(),
  dateTo:    z.coerce.date().optional(),
  page:      z.coerce.number().int().positive().default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(50),
})

export type CreateFamilyInput     = z.infer<typeof CreateFamilyDto>
export type UpdateFamilyInput     = z.infer<typeof UpdateFamilyDto>
export type CreateArticleInput    = z.infer<typeof CreateArticleDto>
export type UpdateArticleInput    = z.infer<typeof UpdateArticleDto>
export type ListArticlesInput     = z.infer<typeof ListArticlesDto>
export type CreateMouvementInput  = z.infer<typeof CreateMouvementDto>
export type ListMouvementsInput   = z.infer<typeof ListMouvementsDto>
