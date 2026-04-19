import { api } from '@/lib/api'

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'

export interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string | null
  employmentType: EmploymentType
  startDate: string
  endDate: string | null
  salary: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface EmployeeStats {
  totalActive: number
  totalSalaryAnnual: string
  byType: { type: EmploymentType; count: number }[]
}

export interface CreateEmployeeDto {
  firstName: string
  lastName: string
  email?: string
  employmentType: EmploymentType
  startDate: string
  salary: number
}

export type UpdateEmployeeDto = Partial<CreateEmployeeDto>

const d = <T>(r: { data: { data: T } }) => r.data.data

export const hrApi = {
  list:   (activeOnly?: boolean) => api.get<{ data: Employee[] }>('/employees', { params: activeOnly !== undefined ? { activeOnly } : undefined }).then(d),
  stats:  ()                     => api.get<{ data: EmployeeStats }>('/employees/stats').then(d),
  get:    (id: string)           => api.get<{ data: Employee }>(`/employees/${id}`).then(d),
  create: (dto: CreateEmployeeDto) => api.post<{ data: Employee }>('/employees', dto).then(d),
  update: (id: string, dto: UpdateEmployeeDto) => api.patch<{ data: Employee }>(`/employees/${id}`, dto).then(d),
  toggle: (id: string)           => api.post<{ data: Employee }>(`/employees/${id}/toggle`).then(d),
  remove: (id: string)           => api.delete(`/employees/${id}`),
}
