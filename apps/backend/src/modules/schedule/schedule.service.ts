import { prisma } from '../../lib/prisma.js'
import type { UpsertScheduleInput, ListScheduleInput } from './schedule.dto.js'

const EMP_SELECT = { id: true, firstName: true, lastName: true, employmentType: true }

export async function getWeekSchedule(companyId: string, query: ListScheduleInput) {
  const monday = new Date(query.weekStart)
  monday.setHours(0, 0, 0, 0)
  // Snap to Monday
  const day = monday.getDay()
  if (day !== 1) monday.setDate(monday.getDate() - ((day + 6) % 7))

  const [employees, schedules, leaves] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, endDate: null },
      select: EMP_SELECT,
      orderBy: { lastName: 'asc' },
    }),
    prisma.workSchedule.findMany({
      where: { companyId, weekStart: monday },
    }),
    prisma.leaveRequest.findMany({
      where: {
        companyId,
        status: 'APPROVED',
        startDate: { lte: new Date(monday.getTime() + 4 * 86_400_000) },
        endDate:   { gte: monday },
      },
      select: { employeeId: true, startDate: true, endDate: true, type: true },
    }),
  ])

  const schedMap = new Map(schedules.map(s => [s.employeeId, s]))
  const leaveMap = new Map<string, { type: string }[]>()
  for (const l of leaves) {
    if (!leaveMap.has(l.employeeId)) leaveMap.set(l.employeeId, [])
    leaveMap.get(l.employeeId)!.push({ type: l.type })
  }

  return {
    weekStart:  monday.toISOString(),
    employees: employees.map(emp => ({
      ...emp,
      schedule: schedMap.get(emp.id) ?? null,
      leaves:   leaveMap.get(emp.id) ?? [],
    })),
  }
}

export async function upsertSchedule(companyId: string, data: UpsertScheduleInput) {
  const emp = await prisma.employee.findUnique({ where: { id: data.employeeId } })
  if (!emp || emp.companyId !== companyId) return null

  const monday = new Date(data.weekStart)
  monday.setHours(0, 0, 0, 0)
  const day = monday.getDay()
  if (day !== 1) monday.setDate(monday.getDate() - ((day + 6) % 7))

  return prisma.workSchedule.upsert({
    where: { companyId_employeeId_weekStart: { companyId, employeeId: data.employeeId, weekStart: monday } },
    update: {
      monday:    data.monday    !== undefined ? (data.monday    as never) : undefined,
      tuesday:   data.tuesday   !== undefined ? (data.tuesday   as never) : undefined,
      wednesday: data.wednesday !== undefined ? (data.wednesday as never) : undefined,
      thursday:  data.thursday  !== undefined ? (data.thursday  as never) : undefined,
      friday:    data.friday    !== undefined ? (data.friday    as never) : undefined,
    },
    create: {
      companyId,
      employeeId: data.employeeId,
      weekStart:  monday,
      monday:     (data.monday    ?? null) as never,
      tuesday:    (data.tuesday   ?? null) as never,
      wednesday:  (data.wednesday ?? null) as never,
      thursday:   (data.thursday  ?? null) as never,
      friday:     (data.friday    ?? null) as never,
    },
  })
}
