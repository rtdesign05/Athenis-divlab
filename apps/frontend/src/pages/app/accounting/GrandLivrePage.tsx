import { useQuery } from '@tanstack/react-query'
import { useSelectedFiscalYearData, useFiscalYears } from '@/hooks/useFiscalYear'
import { accountingApi } from '@/services/accountingApi'
import { useCurrency } from '@/hooks/useCurrency'

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
    </div>
  )
}

function formatDate(d: string | Date): string {
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function GrandLivrePage() {
  const { fmt } = useCurrency()
  const { isLoading: yearsLoading } = useFiscalYears()
  const fyData = useSelectedFiscalYearData()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['grand-livre-journal', fyData?.id],
    queryFn:  () => fyData ? accountingApi.getGrandLivreByFiscalYear(fyData.id) : Promise.reject(new Error('no fy')),
    enabled:  !!fyData?.id,
    staleTime: 30_000,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Grand livre</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data ? `\xc9critures par compte \u2014 exercice ${data.year}` : 'Chargement\u2026'}
          </p>
        </div>
      </div>

      {(yearsLoading || isLoading) && <Spinner />}

      {!yearsLoading && !fyData && (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-500">
          <p className="text-sm">S\xe9lectionnez un exercice comptable ci-dessus.</p>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger le grand livre. V\xe9rifiez la connexion au serveur.
        </div>
      )}

      {data && data.comptes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
          <p className="text-sm">Aucune \xe9criture pour l\u2019exercice {data.year}.</p>
        </div>
      )}

      {data && data.comptes.map((c) => (
        <div key={c.account} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 flex items-center gap-3">
            <span className="font-mono text-sm font-semibold text-gray-700">{c.account}</span>
            <span className="text-sm text-gray-600">\u2014</span>
            <span className="text-sm font-medium text-gray-900">{c.label}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                <th className="px-5 py-2.5">Date</th>
                <th className="px-5 py-2.5">Journal</th>
                <th className="px-5 py-2.5">Libell\xe9</th>
                <th className="px-5 py-2.5 text-right">D\xe9bit</th>
                <th className="px-5 py-2.5 text-right">Cr\xe9dit</th>
                <th className="px-5 py-2.5 text-right">Solde cumulatif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {c.lignes.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-2.5 text-gray-500">{formatDate(l.date)}</td>
                  <td className="px-5 py-2.5">
                    <span className="text-xs font-medium text-gray-500">{l.journalCode}</span>
                  </td>
                  <td className="px-5 py-2.5 text-gray-700">{l.label}</td>
                  <td className="px-5 py-2.5 text-right font-medium">{l.debit ? fmt(l.debit) : ''}</td>
                  <td className="px-5 py-2.5 text-right font-medium">{l.credit ? fmt(l.credit) : ''}</td>
                  <td className={`px-5 py-2.5 text-right font-semibold ${l.solde >= 0 ? 'text-forest-800' : 'text-red-600'}`}>
                    {fmt(Math.abs(l.solde))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
