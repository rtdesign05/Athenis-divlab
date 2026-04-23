import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  hrApi,
  type CreateEmployeeDto, type UpdateEmployeeDto,
  type CreateLeaveDto, type ReviewLeaveDto, type LeaveStatus,
  type CreateReviewDto, type UpdateReviewDto, type ReviewStatus,
  type UpsertScheduleDto,
} from '@/services/hrApi'
import { toSafeAmount } from '@/shared/utils/currency'

export const HR_KEYS = {
  all:      ['employees'] as const,
  list:     (activeOnly?: boolean) => ['employees', 'list', activeOnly ?? 'all'] as const,
  stats:    ()                     => ['employees', 'stats'] as const,
  detail:   (id: string)           => ['employees', 'detail', id] as const,
  payslip:  (id: string, month: string) => ['employees', 'payslip', id, month] as const,
}

export const LEAVE_KEYS = {
  all:     ['leaves'] as const,
  list:    (p?: object) => ['leaves', 'list', p ?? {}] as const,
  stats:   ()           => ['leaves', 'stats'] as const,
  balance: (empId: string) => ['leaves', 'balance', empId] as const,
}

export const REVIEW_KEYS = {
  all:    ['reviews'] as const,
  list:   (p?: object) => ['reviews', 'list', p ?? {}] as const,
  detail: (id: string) => ['reviews', 'detail', id] as const,
}

export const SCHEDULE_KEYS = {
  week: (weekStart: string) => ['schedule', 'week', weekStart] as const,
}

// ── Employees ────────────────────────────────────────────────────────────────
export function useEmployees(activeOnly?: boolean) {
  return useQuery({
    queryKey: HR_KEYS.list(activeOnly),
    queryFn:  () => hrApi.list(activeOnly),
    select:   (data) => ({
      items:               data,
      masseSalarialeMonth: data.filter(e => !e.endDate).reduce((s, e) => s + toSafeAmount(e.grossSalary), 0),
    }),
  })
}

export function useEmployeeStats() {
  return useQuery({ queryKey: HR_KEYS.stats(), queryFn: hrApi.stats })
}

export function usePayslip(id: string, month: string) {
  return useQuery({
    queryKey: HR_KEYS.payslip(id, month),
    queryFn:  () => hrApi.payslip(id, month),
    enabled:  !!id && !!month,
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateEmployeeDto) => hrApi.create(dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: HR_KEYS.all }),
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateEmployeeDto }) => hrApi.update(id, dto),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: HR_KEYS.all })
      qc.invalidateQueries({ queryKey: HR_KEYS.detail(id) })
    },
  })
}

export function useToggleEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => hrApi.toggle(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: HR_KEYS.all }),
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => hrApi.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: HR_KEYS.all }),
  })
}

// ── Leaves ───────────────────────────────────────────────────────────────────
export function useLeaves(params?: { employeeId?: string; status?: LeaveStatus }) {
  return useQuery({
    queryKey: LEAVE_KEYS.list(params),
    queryFn:  () => hrApi.leaves.list(params),
  })
}

export function useLeaveStats() {
  return useQuery({ queryKey: LEAVE_KEYS.stats(), queryFn: hrApi.leaves.stats })
}

export function useLeaveBalance(empId: string) {
  return useQuery({
    queryKey: LEAVE_KEYS.balance(empId),
    queryFn:  () => hrApi.leaves.balance(empId),
    enabled:  !!empId,
  })
}

export function useCreateLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateLeaveDto) => hrApi.leaves.create(dto),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: LEAVE_KEYS.all })
    },
  })
}

export function useReviewLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ReviewLeaveDto }) => hrApi.leaves.review(id, dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: LEAVE_KEYS.all }),
  })
}

export function useCancelLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => hrApi.leaves.cancel(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: LEAVE_KEYS.all }),
  })
}

// ── Reviews ──────────────────────────────────────────────────────────────────
export function useReviews(params?: { employeeId?: string; status?: ReviewStatus }) {
  return useQuery({
    queryKey: REVIEW_KEYS.list(params),
    queryFn:  () => hrApi.reviews.list(params),
  })
}

export function useReview(id: string) {
  return useQuery({
    queryKey: REVIEW_KEYS.detail(id),
    queryFn:  () => hrApi.reviews.get(id),
    enabled:  !!id,
  })
}

export function useCreateReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateReviewDto) => hrApi.reviews.create(dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: REVIEW_KEYS.all }),
  })
}

export function useUpdateReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateReviewDto }) => hrApi.reviews.update(id, dto),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: REVIEW_KEYS.all })
      qc.invalidateQueries({ queryKey: REVIEW_KEYS.detail(id) })
    },
  })
}

export function useDeleteReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => hrApi.reviews.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: REVIEW_KEYS.all }),
  })
}

// ── Schedule ─────────────────────────────────────────────────────────────────
export function useWeekSchedule(weekStart: string) {
  return useQuery({
    queryKey: SCHEDULE_KEYS.week(weekStart),
    queryFn:  () => hrApi.schedule.getWeek(weekStart),
    enabled:  !!weekStart,
  })
}

export function useUpsertSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpsertScheduleDto) => hrApi.schedule.upsert(dto),
    onSuccess:  (_, dto) => {
      qc.invalidateQueries({ queryKey: SCHEDULE_KEYS.week(dto.weekStart) })
    },
  })
}
