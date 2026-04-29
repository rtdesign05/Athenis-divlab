import { useEmployees } from '@/hooks/useHr'
import type { EmploymentType } from '@/services/hrApi'

const TYPE_LABEL: Record<EmploymentType, string> = {
  FULL_TIME: 'CDI',
  PART_TIME: 'CDI (temps partiel)',
  CONTRACT:  'CDD',
  INTERN:    'Stage / Alternance',
}

const TYPE_COLOR: Record<EmploymentType, string> = {
  FULL_TIME: 'bg-green-100 text-green-700',
  PART_TIME: 'bg-green-100 text-green-600',
  CONTRACT:  'bg-blue-100 text-blue-700',
  INTERN:    'bg-amber-100 text-amber-700',
}

export function ContratsHRPage() {
  const employees = useEmployees()
  const items = employees.data?.items ?? []

  // Employees whose contract ends within 90 days
  const today = new Date()
  const alertDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
  const alerts = items.filter(e => {
    if (!e.endDate) return false
    const fin = new Date(e.endDate)
    return fin > today && fin <= alertDate
  })

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR')

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Contrats</h1>
          <p className="mt-1 text-sm text-gray-500">Gestion des contrats de travail — {items.filter(e => !e.endDate).length} CDI actifs</p>
        </div>
        <button className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors">
          + Nouveau contrat
        </button>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <span className="text-amber-600 text-lg">⚠</span>
          <p className="text-sm text-amber-800">
            <strong>{alerts.length} contrat{alerts.length > 1 ? 's' : ''} à renouveler</strong> —
            {alerts.map(e => ` ${e.firstName} ${e.lastName} (${formatDate(e.endDate!)})`).join(',')}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        {employees.isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Chargement des contrats…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
                <th className="px-5 py-3">Employé</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Début</th>
                <th className="px-5 py-3">Fin</th>
                <th className="px-5 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Aucun employé enregistré</td></tr>
              ) : items.map(e => {
                const isAlert = alerts.some(a => a.id === e.id)
                const actif   = !e.endDate || new Date(e.endDate) > today
                return (
                  <tr key={e.id} className={`hover:bg-gray-50/50 ${isAlert ? 'bg-amber-50/40' : ''}`}>
                    <td className="px-5 py-3 font-medium text-gray-900">{e.firstName} {e.lastName}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{e.email}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLOR[e.employmentType]}`}>
                        {TYPE_LABEL[e.employmentType]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{formatDate(e.startDate)}</td>
                    <td className="px-5 py-3 text-gray-600">{e.endDate ? formatDate(e.endDate) : '—'}</td>
                    <td className="px-5 py-3">
                      {isAlert ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">⚠ Renouveler</span>
                      ) : actif ? (
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Actif</span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">Terminé</span>
                      )}
                    </td>
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
