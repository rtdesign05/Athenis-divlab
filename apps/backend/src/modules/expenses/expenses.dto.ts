import { z } from 'zod'

const ExpenseCategory = z.enum(['LOYER', 'LOGICIELS', 'TRANSPORT', 'MARKETING', 'FOURNITURES', 'SALAIRES', 'AUTRES'])

export const CreateExpenseDto = z.object({
  category: ExpenseCategory,
  amount: z.number().positive(),
  description: z.string().min(1).max(500),
  date: z.coerce.date(),
  receiptUrl: z.string().url().optional(),
})

export const UpdateExpenseDto = CreateExpenseDto.partial()

export const ListExpensesDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: ExpenseCategory.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export type CreateExpenseInput = z.infer<typeof CreateExpenseDto>
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseDto>
export type ListExpensesInput = z.infer<typeof ListExpensesDto>
