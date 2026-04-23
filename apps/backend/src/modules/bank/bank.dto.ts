import { z } from 'zod'

export const ImportBankDto = z.object({
  format:  z.enum(['CSV', 'OFX']),
  content: z.string().min(1),
})

export const ReconcileDto = z.object({
  transactionId: z.string().min(1),
  invoiceId:     z.string().optional(),
  expenseId:     z.string().optional(),
}).refine((d) => d.invoiceId || d.expenseId, {
  message: 'Must provide invoiceId or expenseId',
})

export const UpdateTxStatusDto = z.object({
  status:   z.enum(['UNMATCHED', 'MATCHED', 'IGNORED']),
  lettrage: z.string().optional(),
})

export const ListBankTxDto = z.object({
  status:  z.enum(['UNMATCHED', 'MATCHED', 'IGNORED']).optional(),
  page:    z.coerce.number().int().positive().default(1),
  limit:   z.coerce.number().int().min(1).max(200).default(50),
})

export type ImportBankInput      = z.infer<typeof ImportBankDto>
export type ReconcileInput       = z.infer<typeof ReconcileDto>
export type UpdateTxStatusInput  = z.infer<typeof UpdateTxStatusDto>
export type ListBankTxInput      = z.infer<typeof ListBankTxDto>
