import { z } from 'zod'

const SlotSchema = z.object({ start: z.string(), end: z.string() }).nullable()

export const UpsertScheduleDto = z.object({
  employeeId: z.string().min(1),
  weekStart:  z.coerce.date(),
  monday:     SlotSchema.optional(),
  tuesday:    SlotSchema.optional(),
  wednesday:  SlotSchema.optional(),
  thursday:   SlotSchema.optional(),
  friday:     SlotSchema.optional(),
})

export const ListScheduleDto = z.object({
  weekStart: z.coerce.date(),
})

export type UpsertScheduleInput = z.infer<typeof UpsertScheduleDto>
export type ListScheduleInput   = z.infer<typeof ListScheduleDto>
