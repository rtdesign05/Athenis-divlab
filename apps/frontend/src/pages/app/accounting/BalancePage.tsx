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

export function BalancePage() {
  const { fmt } = useCurrency()
  const { isLoading: yearsLoading } = useFiscalYears()
  const fyData = useSelectedFiscalYearData()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['balance-journal', fyData?.id],
    queryFn:  () => fyData ? accountingApi.getBalanceByFiscalYear(fyData.id) : Promise.reject(new Error('no fy')),
    enabled:  !!fyData?.id,
    staleTime: 30_000,
  })

  const equilibre = data?.equilibre ?? false

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Balance g\xe9n\xe9rale</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data ? `Exercice ${data.year}` : 'Chargement\u2026'}
          </p>
        </div>
        {data && (
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${equilibre ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {equilibre ? '\u2713 \xc9quilibr\xe9e' : '\u2717 D\xe9s\xe9quilibr\xe9e'}
          </span>
        )}
      </div>

      {(yearsLoading || isLoading) && <Spinner />}

      {!yearsLoading && !fyData && (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-500">
          <p className="text-sm">S\xe9lectionnez un exercice comptable ci-dessus.</p>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger la balance. V\xe9rifiez la connexion au serveur.
        </div>
      )}

      {data && data.rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
          <p className="text-sm">Aucune \xe9criture pour l\u2019exercice {data.year}.</p>
        </div>
      )}

      {data && data.rows.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
                <th className="px-5 py-3">Compte</th>
                <th className="px-5 py-3">Libell\xe9</th>
                <th className="px-5 py-3 text-right">Total D\xe9bit</th>
                <th className="px-5 py-3 text-right">Total Cr\xe9dit</th>
                <th className="px-5 py-3 text-right">Solde D</th>
                <th className="px-5 py-3 text-right">Solde C</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.rows.map((r) => (
                <tr key={r.account} className="hover:bg-gray-50/50">
                  <td className="px-5 py-2.5 font-mono text-xs text-gray-600">{r.account}</td>
                  <td className="px-5 py-2.5 text-gray-700">{r.label}</td>
                  <td className="px-5 py-2.5 text-right">{fmt(r.totalDebit)}</td>
                  <td className="px-5 py-2.5 text-right">{fmt(r.totalCredit)}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-blue-700">{r.soldeDebiteur > 0 ? fmt(r.soldeDebiteur) : ''}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-orange-600">{r.soldeCrediteur > 0 ? fmt(r.soldeCrediteur) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td colSpan={2} className="px-5 py-3 text-gray-900">TOTAL</td>
                <td className="px-5 py-3 text-right text-gray-900">{fmt(data.totalDebit)}</td>
                <td className="px-5 py-3 text-right text-gray-900">{fmt(data.totalCredit)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
