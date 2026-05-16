import { z } from 'zod'

export const InvoiceLineDto = z.object({
  description:    z.string().min(1),
  quantite:       z.number().positive().default(1),
  unite:          z.string().default('pièce'),
  prixUnitaireHT: z.number().min(0),
  tvaRate:        z.number().min(0).max(100).default(0),
  montantHT:      z.number().min(0),
})

export const CreateInvoiceDto = z.object({
  clientId:           z.string().min(1),
  modele:             z.enum(['standard', 'proforma', 'avoir', 'acompte']).default('standard'),
  issueDate:          z.coerce.date(),
  dueDate:            z.coerce.date(),
  subtotal:           z.number().positive(),
  taxRate:            z.number().min(0).max(100).default(20),
  conditionsPaiement: z.string().optional(),
  notes:              z.string().optional(),
  lines:              z.array(InvoiceLineDto).default([]),
})

export const UpdateInvoiceDto = CreateInvoiceDto.partial()

export const UpdateStatusDto = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']),
})

export const ListInvoicesDto = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  status:   z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  clientId: z.string().optional(),
})

export const CreateRecurringDto = z.object({
  clientId:    z.string().min(1),
  frequency:   z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']),
  subtotal:    z.number().positive(),
  taxRate:     z.number().min(0).max(100).default(20),
  notes:       z.string().optional(),
  nextDueDate: z.coerce.date(),
})

export const UpdateRecurringDto = z.object({
  active:      z.boolean().optional(),
  frequency:   z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']).optional(),
  subtotal:    z.number().positive().optional(),
  taxRate:     z.number().min(0).max(100).optional(),
  notes:       z.string().optional(),
  nextDueDate: z.coerce.date().optional(),
})

export type InvoiceLineInput     = z.infer<typeof InvoiceLineDto>
export type CreateInvoiceInput   = z.infer<typeof CreateInvoiceDto>
export type UpdateInvoiceInput   = z.infer<typeof UpdateInvoiceDto>
export type ListInvoicesInput    = z.infer<typeof ListInvoicesDto>
export type CreateRecurringInput = z.infer<typeof CreateRecurringDto>
export type UpdateRecurringInput = z.infer<typeof UpdateRecurringDto>
