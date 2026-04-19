import { z } from 'zod'

export const CreateInvoiceDto = z.object({
  clientId: z.string().min(1),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  subtotal: z.number().positive(),
  taxRate: z.number().min(0).max(100).default(20),
  notes: z.string().optional(),
})

export const UpdateInvoiceDto = CreateInvoiceDto.partial()

export const UpdateStatusDto = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']),
})

export const ListInvoicesDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  clientId: z.string().optional(),
})

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceDto>
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceDto>
export type ListInvoicesInput = z.infer<typeof ListInvoicesDto>
