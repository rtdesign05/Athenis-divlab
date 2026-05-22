import { z } from 'zod'

const EmploymentType = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'])
const PaymentMethod  = z.enum(['MOBILE_MONEY', 'BANK_TRANSFER', 'CASH', 'CHECK'])

export const CreateEmployeeDto = z.object({
  firstName:      z.string().min(1).max(100),
  lastName:       z.string().min(1).max(100),
  email:          z.string().email().optional(),
  phone:          z.string().max(20).optional(),
  employmentType: EmploymentType,
  grossSalary:    z.number().positive(),
  startDate:      z.coerce.date(),
  // Moyens de paiement
  paymentMethod:        PaymentMethod.optional(),
  mobileMoneyNumber:    z.string().max(20).optional(),
  mobileMoneyProvider:  z.string().max(20).optional(),
  bankName:             z.string().max(100).optional(),
  bankAccountHolder:    z.string().max(100).optional(),
  bankAccountNumber:    z.string().max(50).optional(),
  bankSwiftCode:        z.string().max(20).optional(),
  // Métadonnées organisationnelles
  poste:        z.string().max(100).nullable().optional(),
  departement:  z.string().max(100).nullable().optional(),
  managerId:    z.string().nullable().optional(),
})

export const UpdateEmployeeDto = CreateEmployeeDto.partial()

export const ListEmployeesDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  active: z.enum(['true', 'false']).optional(),
})

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeDto>
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeDto>
export type ListEmployeesInput = z.infer<typeof ListEmployeesDto>
