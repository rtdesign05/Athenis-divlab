import { prisma } from '../../lib/prisma.js'
import type { UpsertScheduleInput, ListScheduleInput } from './schedule.dto.js'

// WorkSchedule model does not exist in v2 schema — use in-memory store
interface WorkSchedule {
  id: string; companyId: string; employeeId: string; weekStart: Date
  monday: unknown; tuesday: unknown; wednesday: unknown; thursday: unknown; friday: unknown
}
const schedStore = new Map<string, WorkSchedule>()
let seq = 0
function genId() { return `SCH-${++seq}-${Date.now()}` }

export async function getWeekSchedule(companyId: string, query: ListScheduleInput) {
  const monday = new Date(query.weekStart)
  monday.setHours(0, 0, 0, 0)
  const day = monday.getDay()
  if (day !== 1) monday.setDate(monday.getDate() - ((day + 6) % 7))

  const employees = await prisma.employee.findMany({
    where: { companyId, dateFinContrat: null },
    select: { id: true, nom: true, prenom: true, contrat: true },
    orderBy: { nom: 'asc' },
  })

  const schedMap = new Map(
    [...schedStore.values()]
      .filter(s => s.companyId === companyId && s.weekStart.getTime() === monday.getTime())
      .map(s => [s.employeeId, s])
  )

  return {
    weekStart:  monday.toISOString(),
    employees: employees.map(emp => ({
      ...emp,
      schedule: schedMap.get(emp.id) ?? null,
      leaves:   [] as { type: string }[],
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

  const existing = [...schedStore.values()].find(
    s => s.companyId === companyId && s.employeeId === data.employeeId && s.weekStart.getTime() === monday.getTime()
  )

  const id = existing?.id ?? genId()
  const schedule: WorkSchedule = {
    id, companyId,
    employeeId: data.employeeId,
    weekStart:  monday,
    monday:     data.monday    ?? existing?.monday    ?? null,
    tuesday:    data.tuesday   ?? existing?.tuesday   ?? null,
    wednesday:  data.wednesday ?? existing?.wednesday ?? null,
    thursday:   data.thursday  ?? existing?.thursday  ?? null,
    friday:     data.friday    ?? existing?.friday    ?? null,
  }
  schedStore.set(id, schedule)
  return schedule
}
