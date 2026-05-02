import { useState } from 'react'
import { useHR } from '@/contexts/HRContext'

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const TYPE_COLOR: Record<string, string> = {
  CP: 'bg-green-100 text-green-700',
  RTT: 'bg-blue-100 text-blue-700',
  SICK: 'bg-red-100 text-red-700',
  MATERNITY: 'bg-pink-100 text-pink-700',
  UNPAID: 'bg-gray-100 text-gray-600',
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

export function CalendrierCongesPage() {
  const { employees, leaves } = useHR()
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(4) // mai = index 4

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Jours dans le mois
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Jour de la semaine du 1er (0=dim, 1=lun, ...) -> converti en lun=0
  const rawFirst = new Date(year, month, 1).getDay()
  const firstDayOffset = rawFirst === 0 ? 6 : rawFirst - 1

  // Congés approuvés du mois
  const monthLeaves = leaves.filter(l => {
    if (l.status !== 'APPROVED') return false
    const start = new Date(l.startDate)
    const end = new Date(l.endDate)
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0)
    return start <= monthEnd && end >= monthStart
  })

  function getLeavesForDay(day: number) {
    const dateStr = isoDate(year, month, day)
    return monthLeaves.filter(l => l.startDate <= dateStr && l.endDate >= dateStr)
  }

  function getEmployee(id: string) {
    return employees.find(e => e.id === id)
  }

  // Grille calendrier : cases vides + jours
  const totalCells = firstDayOffset + daysInMonth
  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendrier des congés</h1>
          <p className="text-sm text-gray-500 mt-1">Vue mensuelle des absences approuvées</p>
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

      {/* Légende types */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TYPE_LABEL).map(([type, label]) => (
          <span key={type} className={`text-xs px-3 py-1 rounded-full font-medium ${TYPE_COLOR[type]}`}>
            {label}
          </span>
        ))}
      </div>

      {/* Grille calendrier */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* En-têtes jours */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {JOURS.map(j => (
            <div key={j} className={`p-2 text-center text-xs font-semibold ${j === 'Sam' || j === 'Dim' ? 'text-gray-400 bg-gray-50' : 'text-gray-600'}`}>
              {j}
            </div>
          ))}
        </div>

        {/* Cases */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const colIndex = idx % 7
            const isWeekend = colIndex === 5 || colIndex === 6
            const dayLeaves = day ? getLeavesForDay(day) : []

            return (
              <div
                key={idx}
                className={`min-h-[80px] p-1.5 border-b border-r border-gray-100 ${isWeekend ? 'bg-gray-50' : 'bg-white'} ${!day ? 'opacity-0' : ''}`}
              >
                {day && (
                  <>
                    <p className={`text-xs font-medium mb-1 ${isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>{day}</p>
                    <div className="space-y-0.5">
                      {dayLeaves.map(leave => {
                        const emp = getEmployee(leave.employeeId)
                        if (!emp) return null
                        const initials = `${emp.firstName[0]}${emp.lastName[0]}`
                        return (
                          <div
                            key={leave.id}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLOR[leave.type]}`}
                            title={`${emp.firstName} ${emp.lastName} — ${TYPE_LABEL[leave.type]}`}
                          >
                            <span className="font-bold">{initials}</span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )
          })}
          {/* Remplir la dernière ligne */}
          {Array.from({ length: (7 - (totalCells % 7)) % 7 }).map((_, i) => (
            <div key={`end-${i}`} className="min-h-[80px] p-1.5 border-b border-r border-gray-100 bg-gray-50 opacity-50" />
          ))}
        </div>
      </div>

      {/* Liste des absences du mois */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Absences approuvées — {MOIS[month]} {year}
            <span className="ml-2 text-xs font-normal text-gray-400">({monthLeaves.length} demande{monthLeaves.length !== 1 ? 's' : ''})</span>
          </h2>
        </div>
        {monthLeaves.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucune absence approuvée ce mois-ci.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2 text-left font-medium">Employé</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-left font-medium">Début</th>
                <th className="px-4 py-2 text-left font-medium">Fin</th>
                <th className="px-4 py-2 text-right font-medium">Jours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthLeaves.map(leave => {
                const emp = getEmployee(leave.employeeId)
                return (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">
                      {emp ? `${emp.firstName} ${emp.lastName}` : leave.employeeId}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[leave.type]}`}>
                        {TYPE_LABEL[leave.type]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{leave.startDate}</td>
                    <td className="px-4 py-2.5 text-gray-600">{leave.endDate}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800">{leave.days} j</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
