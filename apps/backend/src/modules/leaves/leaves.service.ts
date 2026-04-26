import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { CreateLeaveInput, ReviewLeaveInput, ListLeavesInput } from './leaves.dto.js'

// LeaveRequest model does not exist in v2 schema — use in-memory store
interface LeaveRequest {
  id: string; companyId: string; employeeId: string; type: string
  startDate: Date; endDate: Date; days: number; reason: string | null
  status: string; notes: string | null; createdAt: Date; updatedAt: Date
}
const leaveStore = new Map<string, LeaveRequest>()
let seq = 0
function genId() { return `LV-${++seq}-${Date.now()}` }

function countBusinessDays(start: Date, end: Date): number {
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function computeLeaveBalance(
  startDate: Date,
  approvedLeaves: { type: string; days: number }[],
) {
  const now          = new Date()
  const monthsWorked = Math.max(0,
    (now.getFullYear() - startDate.getFullYear()) * 12 +
    (now.getMonth() - startDate.getMonth()),
  )
  const cpAccrued = Math.min(monthsWorked * 2.5, 30)
  const cpTaken   = approvedLeaves.filter(l => l.type === 'CP').reduce((s, l) => s + l.days, 0)
  const rttAccrued = Math.min(Math.floor(monthsWorked / 12) * 12, 12)
  const rttTaken  = approvedLeaves.filter(l => l.type === 'RTT').reduce((s, l) => s + l.days, 0)

  return {
    cp:  { accrued: Math.round(cpAccrued  * 10) / 10, taken: cpTaken,  balance: Math.max(0, Math.round((cpAccrued  - cpTaken)  * 10) / 10) },
    rtt: { accrued: rttAccrued,                        taken: rttTaken, balance: Math.max(0, rttAccrued - rttTaken) },
  }
}

async function withEmployee(leave: LeaveRequest) {
  const employee = await prisma.employee.findUnique({
    where: { id: leave.employeeId },
    select: { id: true, nom: true, prenom: true, email: true },
  })
  return { ...leave, employee }
}

export async function listLeaves(companyId: string, query: ListLeavesInput) {
  const { page, limit, status, employeeId } = query
  const all = [...leaveStore.values()]
    .filter(l => l.companyId === companyId
      && (!status     || l.status === status)
      && (!employeeId || l.employeeId === employeeId))
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  const total = all.length
  const page_items = all.slice((page - 1) * limit, page * limit)
  const items = await Promise.all(page_items.map(withEmployee))
  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getLeave(companyId: string, id: string) {
  const leave = leaveStore.get(id)
  if (!leave || leave.companyId !== companyId)
    throw new AppError('Leave request not found', 404, 'NOT_FOUND')
  return leave
}

export async function createLeave(companyId: string, data: CreateLeaveInput) {
  const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } })
  if (!employee || employee.companyId !== companyId)
    throw new AppError('Employee not found', 404, 'NOT_FOUND')

  const overlap = [...leaveStore.values()].find(l =>
    l.employeeId === data.employeeId &&
    ['PENDING', 'APPROVED'].includes(l.status) &&
    l.startDate <= data.endDate && l.endDate >= data.startDate
  )
  if (overlap) throw new AppError('Overlapping leave request exists', 409, 'LEAVE_OVERLAP')

  const days = countBusinessDays(data.startDate, data.endDate)
  const id = genId()
  const now = new Date()
  const leave: LeaveRequest = {
    id, companyId,
    employeeId: data.employeeId,
    type:      data.type,
    startDate: data.startDate,
    endDate:   data.endDate,
    days,
    reason:    data.reason ?? null,
    status:    'PENDING',
    notes:     null,
    createdAt: now, updatedAt: now,
  }
  leaveStore.set(id, leave)
  return withEmployee(leave)
}

export async function reviewLeave(companyId: string, id: string, data: ReviewLeaveInput) {
  const leave = await getLeave(companyId, id)
  if (leave.status !== 'PENDING')
    throw new AppError('Only pending requests can be reviewed', 409, 'LEAVE_NOT_PENDING')

  const updated = { ...leave, status: data.status, notes: data.notes ?? null, updatedAt: new Date() }
  leaveStore.set(id, updated)
  return withEmployee(updated)
}

export async function cancelLeave(companyId: string, id: string) {
  const leave = await getLeave(companyId, id)
  if (!['PENDING', 'APPROVED'].includes(leave.status))
    throw new AppError('Cannot cancel this leave request', 409, 'CANNOT_CANCEL')
  if (new Date(leave.startDate) <= new Date())
    throw new AppError('Cannot cancel a leave that has already started', 409, 'ALREADY_STARTED')

  const updated = { ...leave, status: 'CANCELLED', updatedAt: new Date() }
  leaveStore.set(id, updated)
  return withEmployee(updated)
}

export async function getEmployeeBalance(companyId: string, employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, nom: true, prenom: true, email: true, dateEmbauche: true, companyId: true },
  })
  if (!employee || employee.companyId !== companyId)
    throw new AppError('Employee not found', 404, 'NOT_FOUND')

  const approvedLeaves = [...leaveStore.values()]
    .filter(l => l.employeeId === employeeId && l.status === 'APPROVED')
    .map(l => ({ type: l.type, days: l.days }))

  const balance = computeLeaveBalance(employee.dateEmbauche ?? new Date(), approvedLeaves)
  const pending = [...leaveStore.values()].filter(l => l.employeeId === employeeId && l.status === 'PENDING').length

  return { employee, balance, pendingRequests: pending }
}

export async function leaveStats(companyId: string) {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const all   = [...leaveStore.values()].filter(l => l.companyId === companyId)

  const pending = all.filter(l => l.status === 'PENDING').length
  const approvedThisMonth = all.filter(l =>
    l.status === 'APPROVED' && l.startDate >= start && l.startDate <= end
  )
  const totalBusinessDays = approvedThisMonth.reduce((s, l) => s + l.days, 0)

  const byTypeMap: Record<string, { _count: number; _sum: { days: number } }> = {}
  for (const l of all.filter(a => a.status === 'APPROVED')) {
    if (!byTypeMap[l.type]) byTypeMap[l.type] = { _count: 0, _sum: { days: 0 } }
    byTypeMap[l.type]!._count++
    byTypeMap[l.type]!._sum.days += l.days
  }
  const byType = Object.entries(byTypeMap).map(([type, val]) => ({ type, ...val }))

  return {
    pending,
    approvedThisMonth: approvedThisMonth.length,
    totalBusinessDays,
    byType,
  }
}
