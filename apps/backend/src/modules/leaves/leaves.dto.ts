import { z } from 'zod'

export const CreateLeaveDto = z.object({
  employeeId: z.string().min(1),
  type:       z.enum(['CP', 'RTT', 'SICK', 'MATERNITY', 'UNPAID']),
  startDate:  z.coerce.date(),
  endDate:    z.coerce.date(),
  reason:     z.string().optional(),
}).refine((d) => d.endDate >= d.startDate, { message: 'endDate must be after startDate' })

export const ReviewLeaveDto = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  notes:  z.string().optional(),
})

export const ListLeavesDto = z.object({
  employeeId: z.string().optional(),
  status:     z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateLeaveInput = z.infer<typeof CreateLeaveDto>
export type ReviewLeaveInput = z.infer<typeof ReviewLeaveDto>
export type ListLeavesInput  = z.infer<typeof ListLeavesDto>
