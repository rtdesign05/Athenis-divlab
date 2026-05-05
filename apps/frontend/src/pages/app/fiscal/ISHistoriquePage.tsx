import { useISHistory } from '@/hooks/useFiscal'

function fmt(n: number | null) { return n != null ? n.toLocaleString('fr-FR') + ' F CFA' : '—' }
function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }

const STATUS_BADGE: Record<string, string> = {
  PAID:     'bg-green-100 text-green-700',
  DECLARED: 'bg-blue-100 text-blue-700',
  PENDING:  'bg-amber-100 text-amber-700',
  LATE:     'bg-red-100 text-red-700',
}

export function ISHistoriquePage() {
  const { data = [], isLoading } = useISHistory()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Historique IS</h1>
        <p className="mt-0.5 text-sm text-gray-500">Impôt sur les Sociétés — 5 derniers exercices</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Chargement…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Exercice</th>
                <th className="px-4 py-3 text-right">Résultat fiscal</th>
                <th className="px-4 py-3 text-right">IS calculé</th>
                <th className="px-4 py-3 text-right">Acomptes versés</th>
                <th className="px-4 py-3 text-right">Solde</th>
                <th className="px-4 py-3 text-center">Statut DSF</th>
                <th className="px-4 py-3 text-left">Date dépôt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data as Array<{ year: number; resultatFiscal: number | null; isPayer: number | null; acomptesVerses: number; solde: number | null; status: string | null; declaredAt: string | null }>).map((row) => (
                <tr key={row.year} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-800">Exercice {row.year}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">{fmt(row.resultatFiscal)}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">{fmt(row.isPayer)}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-700">{fmt(row.acomptesVerses)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${(row.solde ?? 0) > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                    {row.solde != null ? ((row.solde > 0 ? '+' : '') + fmt(row.solde)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.status ? (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[row.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {row.status === 'PAID' ? 'Soldé' : row.status === 'DECLARED' ? 'Déclaré' : row.status === 'PENDING' ? 'En attente' : 'En retard'}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Non déclaré</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(row.declaredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
