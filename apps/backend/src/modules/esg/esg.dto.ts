import { z } from 'zod'

export const UpsertEsgDto = z.object({
  year: z.number().int().min(2000).max(2100),
  co2Emissions: z.number().nonnegative().optional(),
  energyKwh: z.number().nonnegative().optional(),
  wasteKg: z.number().nonnegative().optional(),
  genderPayGap: z.number().min(0).max(100).optional(),
  trainingHours: z.number().nonnegative().optional(),
})

export type UpsertEsgInput = z.infer<typeof UpsertEsgDto>
