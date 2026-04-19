import { z } from 'zod'

const EmploymentType = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'])

export const CreateEmployeeDto = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  employmentType: EmploymentType,
  grossSalary: z.number().positive(),
  startDate: z.coerce.date(),
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
