import { useState } from 'react'
import { useHR } from '@/contexts/HRContext'

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const LEAVE_DAY_COLOR: Record<string, string> = {
  CP: 'bg-green-200 text-green-800',
  RTT: 'bg-blue-200 text-blue-800',
  SICK: 'bg-red-200 text-red-800',
  MATERNITY: 'bg-pink-200 text-pink-800',
  UNPAID: 'bg-gray-200 text-gray-600',
}

const LEAVE_LABEL: Record<string, string> = {
  CP: 'CP',
  RTT: 'RTT',
  SICK: 'MAL',
  MATERNITY: 'MAT',
  UNPAID: 'SS',
}

const TYPE_LABEL: Record<string, string> = {
  CP: 'Congés payés',
  RTT: 'RTT',
  SICK: 'Maladie',
  MATERNITY: 'Maternité',
  UNPAID: 'Sans solde',
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isWeekend(year: number, month: number, day: number): boolean {
  const d = new Date(year, month, day).getDay()
  return d === 0 || d === 6
}

export function PlanningMoisPage() {
  const { employees, leaves } = useHR()
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(4) // mai

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Jours ouvrés du mois
  const workDays = days.filter(d => !isWeekend(year, month, d)).length

  // Employés actifs (pas encore terminé au 1er du mois)
  const monthStart = isoDate(year, month, 1)
  const activeEmployees = employees.filter(e => {
    if (e.endDate && e.endDate < monthStart) return false
    if (e.startDate > isoDate(year, month, daysInMonth)) return false
    return true
  })

  // Congés approuvés du mois
  const monthLeaves = leaves.filter(l => {
    if (l.status !== 'APPROVED') return false
    const mEnd = isoDate(year, month, daysInMonth)
    return l.startDate <= mEnd && l.endDate >= monthStart
  })

  function getDayStatus(empId: string, day: number): { type: 'weekend' | 'leave' | 'work' | 'notstarted'; leaveType?: string } {
    const dateStr = isoDate(year, month, day)
    const emp = employees.find(e => e.id === empId)

    // Pas encore commencé ou terminé
    if (emp && (emp.startDate > dateStr || (emp.endDate && emp.endDate < dateStr))) {
      return { type: 'notstarted' }
    }
    if (isWeekend(year, month, day)) return { type: 'weekend' }

    const leave = monthLeaves.find(l => l.employeeId === empId && l.startDate <= dateStr && l.endDate >= dateStr)
    if (leave) return { type: 'leave', leaveType: leave.type }

    return { type: 'work' }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planning mensuel</h1>
          <p className="text-sm text-gray-500 mt-1">
            {workDays} jours ouvrés — {activeEmployees.length} collaborateurs actifs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-base font-semibold text-gray-800 min-w-[140px] text-center">
            {MOIS[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Table planning */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        <table className="text-xs border-collapse min-w-max w-full">
          <thead>
            {/* En-tête numéros de jours */}
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b border-r border-gray-200 min-w-[160px]">
                Employé
              </th>
              {days.map(d => {
                const weekend = isWeekend(year, month, d)
                const dayOfWeek = new Date(year, month, d).getDay()
                const dayLetters = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
                return (
                  <th
                    key={d}
                    className={`px-1 py-1.5 text-center font-medium border-b border-r border-gray-100 w-8 ${
                      weekend ? 'bg-gray-100 text-gray-400' : 'bg-gray-50 text-gray-600'
                    }`}
                  >
                    <div>{d}</div>
                    <div className="text-gray-400 font-normal">{dayLetters[dayOfWeek]}</div>
                  </th>
                )
              })}
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200 whitespace-nowrap">
                Abs.
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeEmployees.length === 0 ? (
              <tr>
                <td colSpan={daysInMonth + 2} className="px-4 py-8 text-center text-gray-400">
                  Aucun employé actif ce mois-ci.
                </td>
              </tr>
            ) : (
              activeEmployees.map(emp => {
                let absCount = 0
                return (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="sticky left-0 bg-white px-4 py-2 border-r border-gray-200 z-10 hover:bg-gray-50">
                      <p className="font-medium text-gray-800 whitespace-nowrap">{emp.firstName} {emp.lastName}</p>
                      <p className="text-gray-400 text-xs whitespace-nowrap">{emp.poste}</p>
                    </td>
                    {days.map(d => {
                      const status = getDayStatus(emp.id, d)
                      if (status.type === 'leave') absCount++

                      let cellClass = ''
                      let cellContent: React.ReactNode = null

                      if (status.type === 'weekend') {
                        cellClass = 'bg-gray-100'
                      } else if (status.type === 'notstarted') {
                        cellClass = 'bg-white'
                        cellContent = <span className="text-gray-200">—</span>
                      } else if (status.type === 'leave' && status.leaveType) {
                        cellClass = LEAVE_DAY_COLOR[status.leaveType] ?? 'bg-gray-100'
                        cellContent = <span className="font-semibold">{LEAVE_LABEL[status.leaveType]}</span>
                      } else {
                        // Jour ouvré normal
                        // Temps partiel = chevron, CDI = checkmark
                        if (emp.employmentType === 'PART_TIME') {
                          cellClass = 'bg-yellow-50'
                          cellContent = <span className="text-yellow-500">~</span>
                        } else {
                          cellClass = 'bg-green-50'
                          cellContent = <span className="text-green-500">✓</span>
                        }
                      }

                      return (
                        <td key={d} className={`w-8 h-8 text-center border-r border-gray-100 ${cellClass}`}>
                          {cellContent}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2 text-right font-medium text-gray-700">
                      {absCount > 0 ? (
                        <span className="text-red-600">{absCount}j</span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-xs text-gray-500 font-medium">Légende :</span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="w-5 h-5 rounded bg-green-50 flex items-center justify-center text-green-500 font-bold">✓</span>
          <span className="text-gray-600">Jour ouvré</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="w-5 h-5 rounded bg-yellow-50 flex items-center justify-center text-yellow-500 font-bold">~</span>
          <span className="text-gray-600">Temps partiel</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="w-5 h-5 rounded bg-gray-100" />
          <span className="text-gray-600">Weekend</span>
        </span>
        {Object.entries(LEAVE_LABEL).map(([type, abbr]) => (
          <span key={type} className="flex items-center gap-1.5 text-xs">
            <span className={`w-5 h-5 rounded flex items-center justify-center font-semibold ${LEAVE_DAY_COLOR[type]}`}>{abbr}</span>
            <span className="text-gray-600">{TYPE_LABEL[type]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
