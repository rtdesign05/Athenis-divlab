import { useDSFHistory } from '@/hooks/useFiscal'

function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }

const STATUS_BADGE: Record<string, string> = {
  PAID:     'bg-green-100 text-green-700',
  DECLARED: 'bg-blue-100 text-blue-700',
  PENDING:  'bg-amber-100 text-amber-700',
  LATE:     'bg-red-100 text-red-700',
}

export function DSFHistoriquePage() {
  const { data = [], isLoading } = useDSFHistory()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Historique DSF</h1>
        <p className="mt-0.5 text-sm text-gray-500">Déclarations Statistiques et Fiscales — 5 derniers exercices</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Chargement…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Exercice</th>
                <th className="px-4 py-3 text-center">Année de dépôt</th>
                <th className="px-4 py-3 text-center">Échéance légale</th>
                <th className="px-4 py-3 text-center">Date de dépôt</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data as Array<{ anneeExercice: number; anneeDépôt: number; dateDepot: string | null; status: string | null; echéance: string }>).map((row) => {
                const now = new Date()
                const ech = new Date(row.echéance)
                const isLate = !row.status && ech < now
                return (
                  <tr key={row.anneeExercice} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">Exercice {row.anneeExercice}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{row.anneeDépôt}</td>
                    <td className="px-4 py-3 text-center text-gray-600">15/03/{row.anneeDépôt}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{fmtDate(row.dateDepot)}</td>
                    <td className="px-4 py-3 text-center">
                      {row.status ? (
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[row.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {row.status === 'PAID' ? 'Soldée' : row.status === 'DECLARED' ? 'Déposée' : row.status === 'PENDING' ? 'En attente' : 'En retard'}
                        </span>
                      ) : (
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${isLate ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                          {isLate ? 'En retard' : 'Non déposée'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a href={`/app/fiscal/dsf`}
                        className="rounded px-2 py-1 text-xs font-medium text-[#006633] hover:bg-[#E8F5E9] transition-colors">
                        {row.status ? 'Consulter' : 'Déposer →'}
                      </a>
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
