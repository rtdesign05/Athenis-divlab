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
  employeeId:   z.string().min(1),
  year:         z.number().int().min(2020).max(2030),
  rating:       z.number().int().min(1).max(5).optional(),
  strengths:    z.string().optional(),
  improvements: z.string().optional(),
  objectives:   z.array(ObjectiveSchema).optional(),
})

export const UpdateReviewDto = z.object({
  rating:       z.number().int().min(1).max(5).optional(),
  strengths:    z.string().optional(),
  improvements: z.string().optional(),
  objectives:   z.array(ObjectiveSchema).optional(),
  status:       z.enum(['DRAFT', 'COMPLETED']).optional(),
})

export const ListReviewsDto = z.object({
  employeeId: z.string().optional(),
  year:       z.coerce.number().int().optional(),
  status:     z.enum(['DRAFT', 'COMPLETED']).optional(),
})

export type CreateReviewInput = z.infer<typeof CreateReviewDto>
export type UpdateReviewInput = z.infer<typeof UpdateReviewDto>
export type ListReviewsInput  = z.infer<typeof ListReviewsDto>
export type Objective         = z.infer<typeof ObjectiveSchema>
