import { useState } from 'react'
import { useHR } from '@/contexts/HRContext'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const
type Day = typeof DAYS[number]

const DAY_LABEL: Record<Day, string> = {
  monday: 'Lun', tuesday: 'Mar', wednesday: 'Mer', thursday: 'Jeu', friday: 'Ven',
}

const LEAVE_TYPE_COLOR: Record<string, string> = {
  CP:       'bg-blue-100 text-blue-700',
  RTT:      'bg-purple-100 text-purple-700',
  SICK:     'bg-red-100 text-red-700',
  MATERNITY:'bg-pink-100 text-pink-700',
  UNPAID:   'bg-gray-100 text-gray-600',
}

const TYPE_LABEL: Record<string, string> = {
  FULL_TIME: 'Temps plein',
  PART_TIME: 'Temps partiel',
  CONTRACT:  'CDD',
  INTERN:    'Stage',
}

interface TimeSlot { start: string; end: string }

function toMonday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  if (day !== 1) d.setDate(d.getDate() - ((day + 6) % 7))
  return d
}

/** Default slot based on employment type */
function defaultSlot(type: string): TimeSlot {
  if (type === 'PART_TIME') return { start: '08:00', end: '13:00' }
  if (type === 'INTERN')    return { start: '08:00', end: '15:00' }
  return { start: '08:00', end: '17:00' }
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
  const { employees, leaves } = useHR()
  const [currentMonday, setCurrentMonday] = useState(() => toMonday(new Date()))
  // empId → day → slot (null = absent, undefined = use default)
  const [overrides, setOverrides] = useState<Record<string, Partial<Record<Day, TimeSlot | null>>>>({})
  const [saved, setSaved] = useState<Set<string>>(new Set())

  const prevWeek = () => {
    setCurrentMonday(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  }
  const nextWeek = () => {
    setCurrentMonday(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  }

  const dayDates: Date[] = DAYS.map((_, i) => {
    const d = new Date(currentMonday)
    d.setDate(d.getDate() + i)
    return d
  })

  /** Check if an employee is on approved leave for a given calendar date */
  function isOnLeave(empId: string, date: Date) {
    return leaves.some(l => {
      if (l.employeeId !== empId || l.status !== 'APPROVED') return false
      const start = new Date(l.startDate)
      const end   = new Date(l.endDate)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      return date >= start && date <= end
    })
  }

  /** Approved leaves for this employee overlapping the current week */
  function weekLeaves(empId: string) {
    const weekEnd = new Date(currentMonday)
    weekEnd.setDate(weekEnd.getDate() + 4)
    return leaves.filter(l => {
      if (l.employeeId !== empId || l.status !== 'APPROVED') return false
      return new Date(l.startDate) <= weekEnd && new Date(l.endDate) >= currentMonday
    })
  }

  function getSlot(empId: string, day: Day, empType: string, date: Date): TimeSlot | null {
    if (isOnLeave(empId, date)) return null
    if (overrides[empId] && day in overrides[empId]) return overrides[empId][day] ?? null
    return defaultSlot(empType)
  }

  function setSlot(empId: string, day: Day, slot: TimeSlot | null) {
    setOverrides(prev => ({ ...prev, [empId]: { ...prev[empId], [day]: slot } }))
    setSaved(prev => { const n = new Set(prev); n.delete(empId); return n })
  }

  function saveEmployee(empId: string) {
    setSaved(prev => new Set(prev).add(empId))
  }

  const activeEmployees = employees.filter(e => !e.endDate || new Date(e.endDate) > new Date())

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
            {activeEmployees.map(emp => {
              const hasEdits = !!overrides[emp.id]
              const isSaved  = saved.has(emp.id)
              const wLeaves  = weekLeaves(emp.id)

              return (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-forest-100 flex items-center justify-center text-xs font-bold text-forest-700 shrink-0">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-xs leading-tight">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-xs text-gray-400 leading-tight">{TYPE_LABEL[emp.employmentType] ?? emp.employmentType}</p>
                      </div>
                    </div>
                    {wLeaves.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {wLeaves.map(l => (
                          <span key={l.id}
                            className={`inline-flex rounded-full px-1.5 py-0.5 text-xs ${LEAVE_TYPE_COLOR[l.type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {l.type}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {DAYS.map((day, i) => {
                    const date   = dayDates[i]!
                    const onLeave = isOnLeave(emp.id, date)
                    const slot   = getSlot(emp.id, day, emp.employmentType, date)

                    return (
                      <td key={day} className="px-3 py-2">
                        {onLeave ? (
                          <div className="rounded border border-dashed border-gray-200 bg-gray-50 py-1.5 text-center text-xs text-gray-400">
                            Absent
                          </div>
                        ) : (
                          <SlotEditor slot={slot} onChange={s => setSlot(emp.id, day, s)} />
                        )}
                      </td>
                    )
                  })}

                  <td className="px-3 py-3 text-center">
                    {isSaved ? (
                      <span className="text-xs text-green-600 font-medium">✓ Sauvé</span>
                    ) : hasEdits ? (
                      <button
                        onClick={() => saveEmployee(emp.id)}
                        className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700">
                        Sauver
                      </button>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {activeEmployees.length === 0 && (
          <div className="p-8 text-center text-gray-400">Aucun employé actif</div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Horaires par défaut pré-remplis selon le type de contrat. Cliquez sur une case pour modifier. "Absent" = congé approuvé.
      </p>
    </div>
  )
}
