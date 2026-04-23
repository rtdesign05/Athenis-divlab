import { useState } from 'react'
import { useWeekSchedule, useUpsertSchedule } from '@/hooks/useHr'
import type { TimeSlot } from '@/services/hrApi'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const
type Day = typeof DAYS[number]

const DAY_LABEL: Record<Day, string> = {
  monday: 'Lun', tuesday: 'Mar', wednesday: 'Mer', thursday: 'Jeu', friday: 'Ven',
}

const LEAVE_TYPE_COLOR: Record<string, string> = {
  CP: 'bg-blue-100 text-blue-700',
  RTT: 'bg-purple-100 text-purple-700',
  SICK: 'bg-red-100 text-red-700',
  MATERNITY: 'bg-pink-100 text-pink-700',
  UNPAID: 'bg-gray-100 text-gray-600',
}

function toMonday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  if (day !== 1) d.setDate(d.getDate() - ((day + 6) % 7))
  return d
}

function formatWeekStart(d: Date) {
  return d.toISOString().slice(0, 10)
}

interface SlotEditorProps {
  slot: TimeSlot | null
  onChange: (slot: TimeSlot | null) => void
}
function SlotEditor({ slot, onChange }: SlotEditorProps) {
  if (!slot) {
    return (
      <button
        onClick={() => onChange({ start: '09:00', end: '17:00' })}
        className="w-full rounded border border-dashed border-gray-300 py-1 text-xs text-gray-400 hover:border-blue-400 hover:text-blue-500">
        + Ajouter
      </button>
    )
  }
  return (
    <div className="rounded border border-blue-200 bg-blue-50 px-1.5 py-1">
      <div className="flex items-center gap-1">
        <input
          type="time"
          value={slot.start}
          onChange={e => onChange({ ...slot, start: e.target.value })}
          className="w-16 border-0 bg-transparent text-xs text-blue-700 focus:outline-none"
        />
        <span className="text-xs text-blue-400">→</span>
        <input
          type="time"
          value={slot.end}
          onChange={e => onChange({ ...slot, end: e.target.value })}
          className="w-16 border-0 bg-transparent text-xs text-blue-700 focus:outline-none"
        />
        <button onClick={() => onChange(null)} className="ml-auto text-xs text-blue-400 hover:text-red-500">✕</button>
      </div>
    </div>
  )
}

export function PlanningPage() {
  const [currentMonday, setCurrentMonday] = useState(() => toMonday(new Date()))
  const weekStart = formatWeekStart(currentMonday)

  const { data, isLoading } = useWeekSchedule(weekStart)
  const upsert = useUpsertSchedule()

  // Local edits buffer: empId → day → slot
  const [edits, setEdits] = useState<Record<string, Partial<Record<Day, TimeSlot | null>>>>({})

  const prevWeek = () => {
    const d = new Date(currentMonday)
    d.setDate(d.getDate() - 7)
    setCurrentMonday(d)
    setEdits({})
  }
  const nextWeek = () => {
    const d = new Date(currentMonday)
    d.setDate(d.getDate() + 7)
    setCurrentMonday(d)
    setEdits({})
  }

  const getSlot = (empId: string, day: Day, scheduleSlot: TimeSlot | null): TimeSlot | null => {
    if (edits[empId] && day in edits[empId]) return edits[empId][day] ?? null
    return scheduleSlot
  }

  const setSlot = (empId: string, day: Day, slot: TimeSlot | null) => {
    setEdits(prev => ({
      ...prev,
      [empId]: { ...prev[empId], [day]: slot },
    }))
  }

  const saveEmployee = async (empId: string) => {
    const empEdits = edits[empId]
    if (!empEdits) return
    const emp = data?.employees.find(e => e.id === empId)
    const base = emp?.schedule ?? {}
    await upsert.mutateAsync({
      employeeId: empId,
      weekStart,
      ...DAYS.reduce((acc, day) => {
        acc[day] = day in empEdits ? (empEdits[day] ?? null) : ((base as Record<string, TimeSlot | null>)[day] ?? null)
        return acc
      }, {} as Record<Day, TimeSlot | null>),
    })
    setEdits(prev => { const n = { ...prev }; delete n[empId]; return n })
  }

  const dayDates = DAYS.map((_, i) => {
    const d = new Date(currentMonday)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planning hebdomadaire</h1>
          <p className="text-sm text-gray-500">Horaires par employé</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevWeek}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            ← Préc.
          </button>
          <span className="text-sm font-medium text-gray-700">
            Semaine du {currentMonday.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
          <button onClick={nextWeek}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Suiv. →
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">Chargement…</div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 min-w-40">Employé</th>
                {DAYS.map((day, i) => (
                  <th key={day} className="px-3 py-3 text-center font-medium text-gray-500 min-w-36">
                    <span className="block">{DAY_LABEL[day]}</span>
                    <span className="block text-xs font-normal text-gray-400">
                      {dayDates[i]?.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-medium text-gray-500 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.employees.map(emp => {
                const hasEdits = !!edits[emp.id]
                const leaveTypes = emp.leaves.map(l => l.type)

                return (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-gray-400">{emp.employmentType}</p>
                      {leaveTypes.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {leaveTypes.map((t, i) => (
                            <span key={i}
                              className={`inline-flex rounded-full px-1.5 py-0.5 text-xs ${LEAVE_TYPE_COLOR[t] ?? 'bg-gray-100 text-gray-600'}`}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    {DAYS.map(day => {
                      const slot = getSlot(emp.id, day, emp.schedule?.[day] ?? null)
                      const onLeave = leaveTypes.length > 0
                      return (
                        <td key={day} className="px-3 py-2">
                          {onLeave ? (
                            <div className="rounded border border-dashed border-gray-200 bg-gray-50 py-1 text-center text-xs text-gray-400">
                              Absent
                            </div>
                          ) : (
                            <SlotEditor
                              slot={slot}
                              onChange={s => setSlot(emp.id, day, s)}
                            />
                          )}
                        </td>
                      )
                    })}
                    <td className="px-3 py-3 text-center">
                      {hasEdits && (
                        <button
                          onClick={() => saveEmployee(emp.id)}
                          disabled={upsert.isPending}
                          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                          {upsert.isPending ? '…' : 'Sauver'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {data?.employees.length === 0 && (
            <div className="p-8 text-center text-gray-400">Aucun employé actif</div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Cliquer sur "+ Ajouter" pour définir des horaires. Les cellules "Absent" indiquent un congé approuvé sur la semaine.
      </p>
    </div>
  )
}
