import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSelectedFiscalYearData, useFiscalYears } from '@/hooks/useFiscalYear'
import { useFiscalYearGuard } from '@/hooks/useFiscalYear'
import { accountingApi } from '@/services/accountingApi'
import { useCurrency } from '@/hooks/useCurrency'

type JournalFilter = 'ALL' | 'VTE' | 'ACH' | 'BQ' | 'CAI' | 'OD'

const FILTER_LABELS: Record<JournalFilter, string> = {
  ALL: 'Tous',
  VTE: 'Ventes',
  ACH: 'Achats',
  BQ:  'Banque',
  CAI: 'Caisse',
  OD:  'OD',
}

const JOURNAL_COLOR: Record<string, string> = {
  VTE: 'bg-green-100 text-green-700',
  ACH: 'bg-red-100 text-red-700',
  BQ:  'bg-blue-100 text-blue-700',
  BNQ: 'bg-blue-100 text-blue-700',
  CAI: 'bg-yellow-100 text-yellow-700',
  OD:  'bg-purple-100 text-purple-700',
}

function formatDate(d: string | Date): string {
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
    </div>
  )
}

export function JournalPage() {
  const { fmt: fmtAmount } = useCurrency()
  const fmt = (n: number) => n === 0 ? '' : fmtAmount(n)
  const [filter, setFilter] = useState<JournalFilter>('ALL')

  const { isLoading: yearsLoading } = useFiscalYears()
  const fyData = useSelectedFiscalYearData()
  const { isReadOnly } = useFiscalYearGuard()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['journal', fyData?.id],
    queryFn:  () => fyData ? accountingApi.getJournal(fyData.id) : Promise.reject(new Error('no fy')),
    enabled:  !!fyData?.id,
    staleTime: 30_000,
  })

  const entries = data?.entries ?? []
  const visible = filter === 'ALL' ? entries : entries.filter(e => e.journalCode === filter)

  const totalDebit  = visible.reduce((s, e) => s + e.debit,  0)
  const totalCredit = visible.reduce((s, e) => s + e.credit, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Journal comptable</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data ? `Exercice ${data.year} \u2014 ${entries.length} \xe9criture${entries.length !== 1 ? 's' : ''}` : 'Chargement\u2026'}
          </p>
        </div>
        {!isReadOnly && (
          <button className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors">
            + Nouvelle \xe9criture
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {(Object.keys(FILTER_LABELS) as JournalFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-forest-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {(yearsLoading || isLoading) && <Spinner />}

      {!yearsLoading && !fyData && (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-500">
          <p className="text-sm">S\xe9lectionnez un exercice comptable ci-dessus.</p>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger le journal. V\xe9rifiez la connexion au serveur.
        </div>
      )}

      {data && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Journal</th>
                <th className="px-4 py-3">Compte</th>
                <th className="px-4 py-3">Libell\xe9</th>
                <th className="px-4 py-3 text-right">D\xe9bit</th>
                <th className="px-4 py-3 text-right">Cr\xe9dit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    Aucune \xe9criture{filter !== 'ALL' ? ` pour le journal ${filter}` : ''} sur cet exercice.
                  </td>
                </tr>
              ) : (
                visible.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-500">{formatDate(e.date)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${JOURNAL_COLOR[e.journalCode] ?? 'bg-gray-100 text-gray-600'}`}>
                        {e.journalCode}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{e.account}</td>
                    <td className="px-4 py-2.5 text-gray-700">{e.label}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmt(e.debit)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmt(e.credit)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {visible.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-sm">
                  <td colSpan={4} className="px-4 py-2.5 text-gray-700">TOTAUX</td>
                  <td className="px-4 py-2.5 text-right text-gray-900">{fmtAmount(totalDebit)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-900">{fmtAmount(totalCredit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
