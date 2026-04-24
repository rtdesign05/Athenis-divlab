import { useEmployees, useLeaveStats } from '@/hooks/useHr'
import { useCurrency } from '@/hooks/useCurrency'

export function HRDashboard() {
  const employeesQ = useEmployees()
  const leaveStatsQ = useLeaveStats()

  const actifs = (employeesQ.data?.items ?? []).filter((e) => !e.endDate).length
  const masse  = employeesQ.data?.masseSalarialeMonth ?? 0
  const stats  = leaveStatsQ.data

  const { fmt } = useCurrency()

  const contrats = [
    { label: 'CDI',     count: 12, color: 'bg-forest-600' },
    { label: 'CDD',     count:  4, color: 'bg-blue-500' },
    { label: 'Alternance', count: 2, color: 'bg-purple-500' },
    { label: 'Stage',   count:  1, color: 'bg-amber-500' },
  ]
  const total = contrats.reduce((s, c) => s + c.count, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Ressources humaines</h1>
        <p className="mt-1 text-sm text-gray-500">Vue d'ensemble de vos effectifs</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Effectif actif</p>
          <p className="mt-1.5 text-3xl font-bold text-gray-900">
            {employeesQ.isLoading ? '—' : actifs}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Masse salariale / mois</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">
            {employeesQ.isLoading ? '—' : fmt(masse)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Congés en attente</p>
          <p className="mt-1.5 text-3xl font-bold text-gray-900">
            {leaveStatsQ.isLoading ? '—' : (stats?.pending ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Jours approuvés ce mois</p>
          <p className="mt-1.5 text-3xl font-bold text-gray-900">
            {leaveStatsQ.isLoading ? '—' : (stats?.totalBusinessDays ?? 0)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Répartition par type de contrat</h2>
        <div className="flex h-4 w-full overflow-hidden rounded-full gap-0.5">
          {contrats.map((c) => (
            <div
              key={c.label}
              className={`${c.color} transition-all`}
              style={{ width: `${(c.count / total) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          {contrats.map((c) => (
            <div key={c.label} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-sm ${c.color}`} />
              <span className="text-sm text-gray-600">{c.label}</span>
              <span className="text-sm font-semibold text-gray-900">{c.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
