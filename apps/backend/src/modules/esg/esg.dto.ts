import { z } from 'zod'

const Scope1DetailsSchema = z.object({
  naturalGas: z.number().nonnegative().optional(),  // MWh
  fuelOil:    z.number().nonnegative().optional(),  // litres
  vehicles:   z.number().nonnegative().optional(),  // litres fuel
  process:    z.number().nonnegative().optional(),  // tCO2e direct
}).optional()

const Scope3DetailsSchema = z.object({
  businessTravel:  z.number().nonnegative().optional(), // km
  freight:         z.number().nonnegative().optional(), // tonne-km
  waste:           z.number().nonnegative().optional(), // kg
  purchasedGoods:  z.number().nonnegative().optional(), // k€ spend
}).optional()

export const UpsertEsgDto = z.object({
  year:              z.number().int().min(2000).max(2100),
  // Scope 1
  scope1Details:     Scope1DetailsSchema,
  // Scope 2
  scope2Kwh:         z.number().nonnegative().optional(),
  // Scope 3
  scope3Details:     Scope3DetailsSchema,
  // Energy & environment
  energyKwh:         z.number().nonnegative().optional(),
  wasteKg:           z.number().nonnegative().optional(),
  renewableRatio:    z.number().min(0).max(100).optional(),
  // Social
  genderPayGap:      z.number().min(0).max(100).optional(),
  trainingHours:     z.number().nonnegative().optional(),
  absenteeismRate:   z.number().min(0).max(100).optional(),
  workplaceAccidents: z.number().int().nonnegative().optional(),
  // Governance
  boardFemaleRatio:  z.number().min(0).max(100).optional(),
  hasEthicsCode:     z.boolean().optional(),
  hasAnticorruption: z.boolean().optional(),
})

export const CreateActionDto = z.object({
  title:       z.string().min(1),
  description: z.string().optional(),
  pilier:      z.enum(['E', 'S', 'G']),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  targetYear:  z.number().int(),
  deadline:    z.coerce.date().optional(),
  owner:       z.string().optional(),
  kpiTarget:   z.string().optional(),
  co2Saving:   z.number().nonnegative().optional(),
})

export const UpdateActionDto = z.object({
  title:       z.string().min(1).optional(),
  description: z.string().optional(),
  status:      z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  deadline:    z.coerce.date().optional(),
  owner:       z.string().optional(),
  kpiTarget:   z.string().optional(),
  kpiCurrent:  z.string().optional(),
  co2Saving:   z.number().nonnegative().optional(),
})

export type UpsertEsgInput    = z.infer<typeof UpsertEsgDto>
export type CreateActionInput = z.infer<typeof CreateActionDto>
export type UpdateActionInput = z.infer<typeof UpdateActionDto>
