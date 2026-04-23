import { z } from 'zod'

const ObjectiveSchema = z.object({
  id:       z.string(),
  title:    z.string().min(1),
  target:   z.string(),
  progress: z.number().min(0).max(100).default(0),
  dueDate:  z.string().optional(),
  done:     z.boolean().default(false),
})

export const CreateReviewDto = z.object({
  employeeId:  z.string().min(1),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  notes:       z.string().optional(),
})

export const UpdateReviewDto = z.object({
  rating:       z.number().int().min(1).max(5).nullish(),
  strengths:    z.string().nullish(),
  improvements: z.string().nullish(),
  objectives:   z.array(ObjectiveSchema).optional(),
  status:       z.enum(['DRAFT', 'SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  scheduledAt:  z.string().datetime({ offset: true }).nullish(),
  completedAt:  z.string().datetime({ offset: true }).nullish(),
  reviewerId:   z.string().nullish(),
  notes:        z.string().nullish(),
})

export const ListReviewsDto = z.object({
  employeeId: z.string().optional(),
  year:       z.coerce.number().int().optional(),
  status:     z.enum(['DRAFT', 'SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
})

export type CreateReviewInput = z.infer<typeof CreateReviewDto>
export type UpdateReviewInput = z.infer<typeof UpdateReviewDto>
export type ListReviewsInput  = z.infer<typeof ListReviewsDto>
export type Objective         = z.infer<typeof ObjectiveSchema>
