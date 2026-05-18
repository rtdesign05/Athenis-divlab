import { z } from 'zod'

export const PurchaseOrderLineDto = z.object({
  reference:      z.string().optional(),
  designation:    z.string().min(1),
  quantite:       z.number().positive(),
  unite:          z.string().default('pièce'),
  prixUnitaireHT: z.number().min(0),
  montantHT:      z.number().min(0),
  articleId:      z.string().optional(),
  compteAchat:    z.string().optional(),
})

const PurchaseOrderBase = z.object({
  /** Numéro de facture fournisseur fourni manuellement (obligatoire pour les factures
   *  d'achat — le fournisseur impose son numéro, pas d'auto-incrément côté SaaS) */
  reference:          z.string().min(1).optional(),
  /** Type de document : ORDER (bon de commande) ou INVOICE (facture d'achat reçue
   *  du fournisseur). Par défaut ORDER pour rétrocompatibilité. */
  documentType:       z.enum(['ORDER', 'INVOICE']).default('ORDER'),
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
  pieceUrl:           z.string().optional(),
  pieceName:          z.string().optional(),
  lines:              z.array(PurchaseOrderLineDto).default([]),
})

// B4 : montantHT doit correspondre à Σ(line.montantHT) ; montantTTC à
//      montantHT × (1 + vatRate/100). Tolérance 0,01.
function checkPurchaseCoherence(data: Record<string, unknown>, ctx: z.RefinementCtx) {
  const montantHT  = data['montantHT']  as number | undefined
  const montantTTC = data['montantTTC'] as number | undefined
  const vatRate    = data['vatRate']    as number | undefined
  const lines      = data['lines']      as { montantHT?: number }[] | undefined
  if (lines && lines.length > 0 && montantHT != null) {
    const sumLines = lines.reduce((s, l) => s + Number(l.montantHT ?? 0), 0)
    if (Math.abs(sumLines - montantHT) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['montantHT'],
        message: `Incohérence : montantHT=${montantHT} ≠ Σ(lignes)=${sumLines.toFixed(2)}`,
      })
    }
  }
  if (montantHT != null && montantTTC != null && vatRate != null) {
    const expectedTTC = montantHT * (1 + vatRate / 100)
    if (Math.abs(expectedTTC - montantTTC) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['montantTTC'],
        message: `Incohérence : montantTTC=${montantTTC} ≠ HT×(1+TVA)=${expectedTTC.toFixed(2)}`,
      })
    }
  }
}

export const CreatePurchaseOrderDto = PurchaseOrderBase.superRefine(checkPurchaseCoherence)
export const UpdatePurchaseOrderDto = PurchaseOrderBase.partial().extend({
  status: z.enum(['DRAFT', 'SENT', 'RECEIVED', 'PARTIAL', 'CANCELLED']).optional(),
}).superRefine(checkPurchaseCoherence)

export const ListPurchaseOrdersDto = z.object({
  page:         z.coerce.number().int().positive().default(1),
  limit:        z.coerce.number().int().min(1).max(200).default(50),
  status:       z.enum(['DRAFT', 'SENT', 'RECEIVED', 'PARTIAL', 'CANCELLED']).optional(),
  documentType: z.enum(['ORDER', 'INVOICE']).optional(),  // filtrer bons vs factures
  search:       z.string().optional(),
})

export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderDto>
export type UpdatePurchaseOrderInput = z.infer<typeof UpdatePurchaseOrderDto>
export type ListPurchaseOrdersInput  = z.infer<typeof ListPurchaseOrdersDto>
