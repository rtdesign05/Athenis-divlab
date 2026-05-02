import { useState } from 'react'
import { useHR } from '@/contexts/HRContext'

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
  CANCELLED: 'Annulé',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

const TYPE_LABEL: Record<string, string> = {
  CP: 'Congés payés',
  RTT: 'RTT',
  SICK: 'Maladie',
  MATERNITY: 'Maternité',
  UNPAID: 'Sans solde',
}

const TYPE_COLOR: Record<string, string> = {
  CP: 'bg-green-50 text-green-600',
  RTT: 'bg-blue-50 text-blue-600',
  SICK: 'bg-red-50 text-red-600',
  MATERNITY: 'bg-pink-50 text-pink-600',
  UNPAID: 'bg-gray-50 text-gray-500',
}

export function HistoriqueCongesPage() {
  const { employees, leaves } = useHR()
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [yearFilter, setYearFilter] = useState<string>('2026')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')

  const years = Array.from(new Set(leaves.map(l => l.startDate.slice(0, 4)))).sort().reverse()

  const filtered = leaves.filter(l => {
    const matchStatus = statusFilter === 'ALL' || l.status === statusFilter
    const matchYear = yearFilter === 'ALL' || l.startDate.startsWith(yearFilter)
    const matchType = typeFilter === 'ALL' || l.type === typeFilter
    return matchStatus && matchYear && matchType
  })

  function getEmployee(id: string) {
    return employees.find(e => e.id === id)
  }

  const totalDays = filtered.filter(l => l.status === 'APPROVED').reduce((sum, l) => sum + l.days, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historique des congés</h1>
        <p className="text-sm text-gray-500 mt-1">Suivi de toutes les demandes d'absence</p>
      </div>

      {/* KPIs rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total demandes</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Jours approuvés</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{totalDays}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">En attente</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {filtered.filter(l => l.status === 'PENDING').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Refusées</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {filtered.filter(l => l.status === 'REJECTED').length}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="label">Année</label>
            <select
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              className="input text-sm"
            >
              <option value="ALL">Toutes</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">Statut</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input text-sm"
            >
              <option value="ALL">Tous</option>
              <option value="PENDING">En attente</option>
              <option value="APPROVED">Approuvé</option>
              <option value="REJECTED">Refusé</option>
              <option value="CANCELLED">Annulé</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="input text-sm"
            >
              <option value="ALL">Tous</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { setStatusFilter('ALL'); setYearFilter('2026'); setTypeFilter('ALL') }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            {filtered.length} demande{filtered.length !== 1 ? 's' : ''}
          </h2>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Aucune demande ne correspond aux filtres.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left font-medium">Employé</th>
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-left font-medium">Début</th>
                  <th className="px-4 py-2 text-left font-medium">Fin</th>
                  <th className="px-4 py-2 text-right font-medium">Jours</th>
                  <th className="px-4 py-2 text-left font-medium">Motif</th>
                  <th className="px-4 py-2 text-center font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered
                  .slice()
                  .sort((a, b) => b.startDate.localeCompare(a.startDate))
                  .map(leave => {
                    const emp = getEmployee(leave.employeeId)
                    return (
                      <tr key={leave.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <div>
                            <p className="font-medium text-gray-800">
                              {emp ? `${emp.firstName} ${emp.lastName}` : leave.employeeId}
                            </p>
                            {emp && <p className="text-xs text-gray-400">{emp.poste}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[leave.type]}`}>
                            {TYPE_LABEL[leave.type]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{leave.startDate}</td>
                        <td className="px-4 py-2.5 text-gray-600">{leave.endDate}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-800">{leave.days} j</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[160px] truncate">
                          {leave.reason ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[leave.status]}`}>
                            {STATUS_LABEL[leave.status]}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
