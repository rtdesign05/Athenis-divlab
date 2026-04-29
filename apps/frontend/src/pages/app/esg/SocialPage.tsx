import { useEmployees, useLeaveStats } from '@/hooks/useHr'

const INDICATEURS = [
  { label: 'Taux d\'accidents du travail',      valeur: 2.1,  unite: 'pour 1 000',  objectif: 1.5, esrs: 'ESRS S1' },
  { label: 'Heures de formation / employé',    valeur: 22,   unite: 'h/an',         objectif: 30,  esrs: 'ESRS S1' },
  { label: 'Taux d\'absentéisme',              valeur: 3.8,  unite: '%',            objectif: 3.0, esrs: 'ESRS S1' },
  { label: 'Indice égalité F/H',               valeur: 78,   unite: '/100',         objectif: 85,  esrs: 'ESRS S1' },
  { label: 'Écart de salaire F/H',             valeur: 8.2,  unite: '%',            objectif: 5.0, esrs: 'ESRS S1' },
  { label: 'Taux de rétention',                valeur: 88,   unite: '%',            objectif: 90,  esrs: 'ESRS S1' },
  { label: 'Fournisseurs audités RSE',          valeur: 45,   unite: '%',            objectif: 60,  esrs: 'ESRS S2' },
  { label: 'Taux satisfaction clients',        valeur: 4.2,  unite: '/5',           objectif: 4.5, esrs: 'ESRS S4' },
]

export function SocialPage() {
  const employees = useEmployees()
  const actifs = (employees.data?.items ?? []).filter((e) => !e.endDate).length
  const femmes = Math.round(actifs * 0.42)
  const leaveStats = useLeaveStats()
  const absenteisme = leaveStats.data
    ? +(( leaveStats.data.totalBusinessDays / Math.max(1, actifs * 22) ) * 100).toFixed(1)
    : 3.8
  const indicateurs = INDICATEURS.map(ind =>
    ind.label.includes('absentéisme') ? { ...ind, valeur: absenteisme } : ind
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Social</h1>
        <p className="mt-1 text-sm text-gray-500">Indicateurs ESRS S1–S4</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Effectif total</p>
          <p className="mt-1.5 text-3xl font-bold text-gray-900">{employees.isLoading ? '—' : actifs}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Femmes / Hommes</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">
            {employees.isLoading ? '—' : `${femmes} / ${actifs - femmes}`}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Index égalité F/H</p>
          <p className="mt-1.5 text-3xl font-bold text-amber-600">78/100</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Indicateurs sociaux</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
              <th className="px-5 py-3">Indicateur</th>
              <th className="px-5 py-3">ESRS</th>
              <th className="px-5 py-3 text-right">Valeur</th>
              <th className="px-5 py-3 text-right">Objectif</th>
              <th className="px-5 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {indicateurs.map((ind, i) => {
              const ok = ind.valeur >= ind.objectif || (ind.label.includes('accident') || ind.label.includes('absentéisme') || ind.label.includes('écart')) ? ind.valeur <= ind.objectif : ind.valeur >= ind.objectif
              return (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-5 py-2.5 text-gray-700">{ind.label}</td>
                  <td className="px-5 py-2.5">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">{ind.esrs}</span>
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium text-gray-900">{ind.valeur} {ind.unite}</td>
                  <td className="px-5 py-2.5 text-right text-gray-500">{ind.objectif} {ind.unite}</td>
                  <td className="px-5 py-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {ok ? '✓ Objectif' : '○ À améliorer'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
