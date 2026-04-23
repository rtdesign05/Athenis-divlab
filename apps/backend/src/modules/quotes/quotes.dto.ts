import { z } from 'zod'

export const CreateQuoteDto = z.object({
  clientId:  z.string().min(1),
  issueDate: z.coerce.date(),
  validUntil: z.coerce.date(),
  subtotal:  z.number().positive(),
  taxRate:   z.number().min(0).max(100).default(20),
  notes:     z.string().optional(),
})

export const UpdateQuoteDto = CreateQuoteDto.partial()

export const UpdateQuoteStatusDto = z.object({
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED']),
})

export const ListQuotesDto = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  status:   z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED']).optional(),
  clientId: z.string().optional(),
})

export type CreateQuoteInput  = z.infer<typeof CreateQuoteDto>
export type UpdateQuoteInput  = z.infer<typeof UpdateQuoteDto>
export type ListQuotesInput   = z.infer<typeof ListQuotesDto>
