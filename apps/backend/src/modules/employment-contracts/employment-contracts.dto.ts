import { z } from 'zod'

const EmploymentType = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'])
const Status         = z.enum(['DRAFT', 'SIGNED', 'TERMINATED'])

export const CreateEmploymentContractDto = z.object({
  employeeId:   z.string().min(1),
  contractType: EmploymentType,
  status:       Status.default('DRAFT'),
  startDate:    z.coerce.date(),
  endDate:      z.coerce.date().nullable().optional(),
  grossSalary:  z.number().nonnegative(),
  poste:        z.string().min(1).max(200),
  departement:  z.string().min(1).max(200),
  lieuTravail:  z.string().min(1).max(200),
  content:      z.string().min(1),
  signedAt:     z.coerce.date().nullable().optional(),
})

export const UpdateEmploymentContractDto = CreateEmploymentContractDto.partial().omit({ employeeId: true })

export type CreateEmploymentContractInput = z.infer<typeof CreateEmploymentContractDto>
export type UpdateEmploymentContractInput = z.infer<typeof UpdateEmploymentContractDto>
