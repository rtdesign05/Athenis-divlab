import { api } from '@/lib/api'

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'
export type LeaveType   = 'CP' | 'RTT' | 'SICK' | 'MATERNITY' | 'UNPAID'
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type ReviewStatus = 'DRAFT' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

export type PaymentMethod = 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CASH' | 'CHECK'

export interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  employmentType: EmploymentType
  startDate: string
  endDate: string | null
  grossSalary: string
  // Moyens de paiement
  paymentMethod?:        PaymentMethod | null
  mobileMoneyNumber?:    string | null
  mobileMoneyProvider?:  string | null
  bankName?:             string | null
  bankAccountHolder?:    string | null
  bankAccountNumber?:    string | null
  bankSwiftCode?:        string | null
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
  firstName:      string
  lastName:       string
  email?:         string
  phone?:         string
  employmentType: EmploymentType
  startDate:      string
  grossSalary:    number
  paymentMethod?:       PaymentMethod
  mobileMoneyNumber?:   string
  mobileMoneyProvider?: string
  bankName?:            string
  bankAccountHolder?:   string
  bankAccountNumber?:   string
  bankSwiftCode?:       string
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
  irppBase: number      // base imposable après abattement 30%
  irpp: number          // IRPP mensuel
  cac: number           // Centimes additionnels communaux (10% IRPP)
  netImposable: number
  netToPay: number
  totalCost: number
}

// ── Payroll (paie en lot mensuel) ────────────────────────────────────────────

export type PayrollStatus = 'DRAFT' | 'POSTED' | 'PAID' | 'SENT' | 'CANCELLED'
export type PayslipStatus = 'PENDING' | 'PAID' | 'FAILED'

export interface PayslipRow {
  id:               string
  employeeId:       string
  employeeName:     string
  employeeEmail:    string | null
  employmentType:   EmploymentType
  daysWorked:       number
  daysAbsentUnpaid: number
  grossSalary:      string
  cnpsSal:          string
  cnpsEmp:          string
  irpp:             string
  cac:              string
  netToPay:         string
  totalCost:        string
  paymentMethod:    PaymentMethod | null
  paymentStatus:    PayslipStatus
  paidAt:           string | null
  emailSentAt:      string | null
}

export interface Payroll {
  id:               string
  year:             number
  month:            number
  status:           PayrollStatus
  employeesCount:   number
  totalGross:       string
  totalNet:         string
  totalCnpsSal:     string
  totalCnpsEmp:     string
  totalIrpp:        string
  totalCac:         string
  postedPieceId:    string | null
  postedAt:         string | null
  paidAt:           string | null
  sentAt:           string | null
  treasuryAccount:  string | null
  payslips?:        PayslipRow[]
  _count?:          { payslips: number }
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

  // Payroll batch
  payroll: {
    list:      () => api.get<{ data: Payroll[] }>('/payroll').then(d),
    get:       (id: string) => api.get<{ data: Payroll }>(`/payroll/${id}`).then(d),
    calculate: (year: number, month: number) =>
                 api.post<{ data: Payroll }>('/payroll/calculate', { year, month }).then(d),
    post:      (id: string) =>
                 api.post<{ data: { pieceId: string; reference: string; lines: number } }>(`/payroll/${id}/post`).then(d),
    pay:       (id: string, treasuryAccount: string) =>
                 api.post<{ data: { pieceId: string; paid: number; totalPaid: number; summary: Record<string, number> } }>(`/payroll/${id}/pay`, { treasuryAccount }).then(d),
    send:      (id: string) =>
                 api.post<{ data: { sent: number; skipped: number; total: number } }>(`/payroll/${id}/send`).then(d),
  },

  // Schedule
  schedule: {
    getWeek: (weekStart: string) =>
               api.get<{ data: WeekSchedule }>('/schedule', { params: { weekStart } }).then(d),
    upsert:  (dto: UpsertScheduleDto) => api.post<{ data: unknown }>('/schedule', dto).then(d),
  },
}
