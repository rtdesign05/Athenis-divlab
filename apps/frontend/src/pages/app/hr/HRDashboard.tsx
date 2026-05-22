import { useHR } from '@/contexts/HRContext'
import { useCurrency } from '@/hooks/useCurrency'

const TYPE_LABEL: Record<string, string> = {
  FULL_TIME:  'Temps plein',
  PART_TIME:  'Temps partiel',
  CONTRACT:   'Contractuel',
  INTERN:     'Stagiaire',
}

const TYPE_COLOR: Record<string, string> = {
  FULL_TIME:  'bg-forest-600',
  PART_TIME:  'bg-blue-500',
  CONTRACT:   'bg-purple-500',
  INTERN:     'bg-amber-500',
}

export function HRDashboard() {
  const { employees, leaves } = useHR()
  const { fmt } = useCurrency()

  const actifs = employees.filter(e => !e.endDate).length
  const masseSalariale = employees.reduce((s, e) => s + e.grossSalary, 0)
  const congesEnAttente = leaves.filter(l => l.status === 'PENDING').length

  // Jours approuvés ce mois (mai 2026)
  const now = new Date()
  const joursApprouvesMois = leaves
    .filter(l => l.status === 'APPROVED')
    .filter(l => {
      const start = new Date(l.startDate)
      return start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth()
    })
    .reduce((s, l) => s + l.days, 0)

  // Répartition par type de contrat
  const typeMap: Record<string, number> = {}
  employees.forEach(e => {
    typeMap[e.employmentType] = (typeMap[e.employmentType] ?? 0) + 1
  })
  const contrats = Object.entries(typeMap).map(([type, count]) => ({
    label: TYPE_LABEL[type] ?? type,
    count,
    color: TYPE_COLOR[type] ?? 'bg-gray-400',
  }))
  const totalContrats = contrats.reduce((s, c) => s + c.count, 0)

  return (
    <div className="h-full flex flex-col gap-3">

      <div className="shrink-0 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900">Ressources humaines</h1>
        <p className="text-xs text-gray-500">Vue d'ensemble des effectifs</p>
      </div>

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Effectif actif</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{actifs}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Masse salariale / mois</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{fmt(masseSalariale)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Congés en attente</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{congesEnAttente}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Jours approuvés ce mois</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{joursApprouvesMois}</p>
        </div>
      </div>

      {/* Répartition par type de contrat */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white p-4 flex flex-col justify-between">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Répartition par type de contrat</h2>

          {contrats.length > 0 ? (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full gap-0.5">
                {contrats.map(c => (
                  <div
                    key={c.label}
                    className={`${c.color} transition-all`}
                    style={{ width: `${(c.count / totalContrats) * 100}%` }}
                  />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-4">
                {contrats.map(c => (
                  <div key={c.label} className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-sm ${c.color}`} />
                    <span className="text-sm text-gray-600">{c.label}</span>
                    <span className="text-sm font-semibold text-gray-900">{c.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">Aucune donnée de répartition disponible</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
            <p className="text-xs text-gray-500">Total effectif</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-forest-700">
              {typeMap['FULL_TIME'] ?? 0}
            </p>
            <p className="text-xs text-gray-500">Temps plein</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">
              {employees.length - (typeMap['FULL_TIME'] ?? 0)}
            </p>
            <p className="text-xs text-gray-500">Autres contrats</p>
          </div>
        </div>
      </div>

    </div>
  )
}
