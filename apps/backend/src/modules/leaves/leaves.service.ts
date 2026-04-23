import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { CreateLeaveInput, ReviewLeaveInput, ListLeavesInput } from './leaves.dto.js'

const EMP_SELECT = { id: true, firstName: true, lastName: true, email: true }

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

// CP balance: 2.5 days per worked month since startDate, capped at 30/year
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

export async function listLeaves(companyId: string, query: ListLeavesInput) {
  const { page, limit, status, employeeId } = query
  const where = {
    companyId,
    ...(status     ? { status }     : {}),
    ...(employeeId ? { employeeId } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: { employee: { select: EMP_SELECT } },
      orderBy: { startDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.leaveRequest.count({ where }),
  ])
  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getLeave(companyId: string, id: string) {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: { select: EMP_SELECT } },
  })
  if (!leave || leave.companyId !== companyId)
    throw new AppError('Leave request not found', 404, 'NOT_FOUND')
  return leave
}

export async function createLeave(companyId: string, data: CreateLeaveInput) {
  const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } })
  if (!employee || employee.companyId !== companyId)
    throw new AppError('Employee not found', 404, 'NOT_FOUND')

  // Check for overlapping leaves
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: data.employeeId,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [
        { startDate: { lte: data.endDate }, endDate: { gte: data.startDate } },
      ],
    },
  })
  if (overlap) throw new AppError('Overlapping leave request exists', 409, 'LEAVE_OVERLAP')

  const days = countBusinessDays(data.startDate, data.endDate)

  return prisma.leaveRequest.create({
    data: {
      companyId,
      employeeId: data.employeeId,
      type:      data.type,
      startDate: data.startDate,
      endDate:   data.endDate,
      days,
      reason:    data.reason ?? null,
      status:    'PENDING',
    },
    include: { employee: { select: EMP_SELECT } },
  })
}

export async function reviewLeave(companyId: string, id: string, data: ReviewLeaveInput) {
  const leave = await getLeave(companyId, id)
  if (leave.status !== 'PENDING')
    throw new AppError('Only pending requests can be reviewed', 409, 'LEAVE_NOT_PENDING')

  return prisma.leaveRequest.update({
    where: { id },
    data:  { status: data.status, notes: data.notes ?? null },
    include: { employee: { select: EMP_SELECT } },
  })
}

export async function cancelLeave(companyId: string, id: string) {
  const leave = await getLeave(companyId, id)
  if (!['PENDING', 'APPROVED'].includes(leave.status))
    throw new AppError('Cannot cancel this leave request', 409, 'CANNOT_CANCEL')
  if (new Date(leave.startDate) <= new Date())
    throw new AppError('Cannot cancel a leave that has already started', 409, 'ALREADY_STARTED')

  return prisma.leaveRequest.update({
    where: { id },
    data:  { status: 'CANCELLED' },
    include: { employee: { select: EMP_SELECT } },
  })
}

export async function getEmployeeBalance(companyId: string, employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { ...EMP_SELECT, startDate: true },
  })
  if (!employee || employee.companyId !== companyId)
    throw new AppError('Employee not found', 404, 'NOT_FOUND')

  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: { employeeId, status: 'APPROVED' },
    select: { type: true, days: true },
  })

  const balance = computeLeaveBalance(employee.startDate, approvedLeaves)
  const pending = await prisma.leaveRequest.count({ where: { employeeId, status: 'PENDING' } })

  return { employee, balance, pendingRequests: pending }
}

export async function leaveStats(companyId: string) {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const [pending, approvedThisMonth, byType] = await Promise.all([
    prisma.leaveRequest.count({ where: { companyId, status: 'PENDING' } }),
    prisma.leaveRequest.aggregate({
      where: { companyId, status: 'APPROVED', startDate: { gte: start, lte: end } },
      _sum: { days: true },
      _count: true,
    }),
    prisma.leaveRequest.groupBy({
      by: ['type'],
      where: { companyId, status: 'APPROVED' },
      _sum: { days: true },
      _count: true,
    }),
  ])
  return {
    pending,
    approvedThisMonth: approvedThisMonth._count,
    totalBusinessDays: approvedThisMonth._sum.days ?? 0,
    byType,
  }
}
