import { api } from '@/lib/api'

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'
export type LeaveType   = 'CP' | 'RTT' | 'SICK' | 'MATERNITY' | 'UNPAID'
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type ReviewStatus = 'DRAFT' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

export interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  employmentType: EmploymentType
  startDate: string
  endDate: string | null
  grossSalary: string
  createdAt: string
  updatedAt: string
}

export interface EmployeeStats {
  byType: { employmentType: EmploymentType; _count: number; _sum: { grossSalary: string } }[]
  active: { count: number; avgSalary: string | null; totalMonthly: string }
  annualMasseSalariale: string
  totalHeadcount: number
}

export interface CreateEmployeeDto {
  firstName: string
  lastName: string
  email?: string
  employmentType: EmploymentType
  startDate: string
  grossSalary: number
}

export type UpdateEmployeeDto = Partial<CreateEmployeeDto>

// ── Leaves ──────────────────────────────────────────────────────────────────
export interface LeaveRequest {
  id: string
  employeeId: string
  employee?: { firstName: string; lastName: string }
  type: LeaveType
  startDate: string
  endDate: string
  days: number
  status: LeaveStatus
  reason: string | null
  notes: string | null
  createdAt: string
}

export interface LeaveBalance {
  employee: { id: string; firstName: string; lastName: string }
  balance: {
    cp:  { accrued: number; taken: number; balance: number }
    rtt: { accrued: number; taken: number; balance: number }
  }
  pendingRequests: number
}

export interface LeaveStats {
  pending: number
  approvedThisMonth: number
  totalBusinessDays: number
}

export interface CreateLeaveDto {
  employeeId: string
  type: LeaveType
  startDate: string
  endDate: string
  reason?: string
}

export interface ReviewLeaveDto {
  status: 'APPROVED' | 'REJECTED'
}

// ── Annual Reviews ───────────────────────────────────────────────────────────
export interface ReviewObjective {
  id: string
  title: string
  target: string
  progress: number
  dueDate: string | null
  done: boolean
}

export interface AnnualReview {
  id: string
  employeeId: string
  employee?: { firstName: string; lastName: string }
  year: number
  reviewerId: string | null
  status: ReviewStatus
  scheduledAt: string | null
  completedAt: string | null
  rating: number | null
  notes: string | null
  strengths: string | null
  improvements: string | null
  objectives: ReviewObjective[]
  createdAt: string
}

export interface CreateReviewDto {
  employeeId: string
  scheduledAt?: string
  notes?: string
}

export interface UpdateReviewDto {
  status?: ReviewStatus
  scheduledAt?: string | null
  completedAt?: string | null
  reviewerId?: string | null
  rating?: number | null
  notes?: string | null
  strengths?: string | null
  improvements?: string | null
  objectives?: ReviewObjective[]
}

// ── Schedule ─────────────────────────────────────────────────────────────────
export interface TimeSlot { start: string; end: string }

export interface EmployeeSchedule {
  id: string
  firstName: string
  lastName: string
  employmentType: EmploymentType
  schedule: {
    monday: TimeSlot | null
    tuesday: TimeSlot | null
    wednesday: TimeSlot | null
    thursday: TimeSlot | null
    friday: TimeSlot | null
  } | null
  leaves: { type: LeaveType }[]
}

export interface WeekSchedule {
  weekStart: string
  employees: EmployeeSchedule[]
}

export interface UpsertScheduleDto {
  employeeId: string
  weekStart: string
  monday?: TimeSlot | null
  tuesday?: TimeSlot | null
  wednesday?: TimeSlot | null
  thursday?: TimeSlot | null
  friday?: TimeSlot | null
}

// ── Payslip ──────────────────────────────────────────────────────────────────
export interface PayslipLine {
  label: string
  base: number
  salRate: number
  salAmt: number
  empRate: number
  empAmt: number
}

export interface Payslip {
  month: string
  employee: { firstName: string; lastName: string; email: string; employmentType: string }
  grossSalary: number
  lines: PayslipLine[]
  totalSalariale: number
  totalPatronale: number
  netBeforeTax: number
  csgDeductible: number
  netImposable: number
  netToPay: number
  totalCost: number
}

const d = <T>(r: { data: { data: T } }) => r.data.data

export const hrApi = {
  // Employees
  list:   (activeOnly?: boolean) => api.get<{ data: { items: Employee[] } }>('/employees', { params: activeOnly !== undefined ? { active: activeOnly ? 'true' : 'false' } : undefined }).then(r => d(r).items ?? []),
  stats:  ()                     => api.get<{ data: EmployeeStats }>('/employees/stats').then(d),
  get:    (id: string)           => api.get<{ data: Employee }>(`/employees/${id}`).then(d),
  create: (dto: CreateEmployeeDto) => api.post<{ data: Employee }>('/employees', dto).then(d),
  update: (id: string, dto: UpdateEmployeeDto) => api.patch<{ data: Employee }>(`/employees/${id}`, dto).then(d),
  toggle: (id: string)           => api.post<{ data: Employee }>(`/employees/${id}/toggle-status`).then(d),
  remove: (id: string)           => api.delete(`/employees/${id}`),
  payslip: (id: string, month: string) => api.get<{ data: Payslip }>(`/employees/${id}/payslip`, { params: { month } }).then(d),

  // Leaves
  leaves: {
    list:    (params?: { employeeId?: string; status?: LeaveStatus }) =>
               api.get<{ data: { items: LeaveRequest[] } }>('/leaves', { params }).then(r => d(r).items ?? []),
    get:     (id: string) => api.get<{ data: LeaveRequest }>(`/leaves/${id}`).then(d),
    stats:   ()           => api.get<{ data: LeaveStats }>('/leaves/stats').then(d),
    balance: (empId: string) => api.get<{ data: LeaveBalance }>(`/leaves/balance/${empId}`).then(d),
    create:  (dto: CreateLeaveDto) => api.post<{ data: LeaveRequest }>('/leaves', dto).then(d),
    review:  (id: string, dto: ReviewLeaveDto) => api.patch<{ data: LeaveRequest }>(`/leaves/${id}/review`, dto).then(d),
    cancel:  (id: string) => api.post<{ data: LeaveRequest }>(`/leaves/${id}/cancel`).then(d),
  },

  // Reviews
  reviews: {
    list:   (params?: { employeeId?: string; status?: ReviewStatus }) =>
              api.get<{ data: { items: AnnualReview[] } }>('/reviews', { params }).then(r => d(r).items ?? []),
    get:    (id: string) => api.get<{ data: AnnualReview }>(`/reviews/${id}`).then(d),
    create: (dto: CreateReviewDto) => api.post<{ data: AnnualReview }>('/reviews', dto).then(d),
    update: (id: string, dto: UpdateReviewDto) => api.patch<{ data: AnnualReview }>(`/reviews/${id}`, dto).then(d),
    remove: (id: string) => api.delete(`/reviews/${id}`),
  },

  // Schedule
  schedule: {
    getWeek: (weekStart: string) =>
               api.get<{ data: WeekSchedule }>('/schedule', { params: { weekStart } }).then(d),
    upsert:  (dto: UpsertScheduleDto) => api.post<{ data: unknown }>('/schedule', dto).then(d),
  },
}
