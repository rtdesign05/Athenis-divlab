import { useState } from 'react'
import { useIS } from '@/hooks/useFiscal'
import type { TaxDeclStatus } from '@/services/fiscalApi'

const YEARS = [2024, 2025, 2026]

function fmt(n: number) { return n.toLocaleString('fr-FR') + ' F CFA' }
function fmtDate(d: string | Date | null) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }

const STATUS_CONFIG: Record<TaxDeclStatus, { label: string; cls: string; dot: string }> = {
  PENDING:   { label: 'A payer',    cls: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
  DECLARED:  { label: 'Declare',    cls: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400' },
  PAID:      { label: 'Paye',       cls: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  LATE:      { label: 'En retard',  cls: 'bg-red-100 text-red-700',      dot: 'bg-red-500' },
  EXEMPTED:  { label: 'Exonere',    cls: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-300' },
}

export function ISAcomptesPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data, isLoading } = useIS(year)

  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-gray-100" />

  const acomptes = data?.acomptes ?? []
  const totalVerse = acomptes.filter(a => a.status === 'PAID' || a.status === 'DECLARED').reduce((s, a) => s + a.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Acomptes IS</h1>
          <p className="mt-0.5 text-sm text-gray-500">Versements acomptes Impôt sur les Sociétés — Art. 23 CGI</p>
        </div>
        <div className="flex gap-2">
          {YEARS.map(y => (
            <button key={y} onClick={() => setYear(y)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${y === year ? 'border-[#006633] bg-[#E8F5E9] text-[#006633]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'IS estimé annuel', value: fmt(data.isEstimeAnnuel), sub: `33% × résultat ou 1% CA`, color: 'text-gray-900' },
            { label: 'CA exercice', value: fmt(data.caAnnuel), sub: `Jan–mois courant`, color: 'text-blue-700' },
            { label: 'Acomptes versés', value: fmt(totalVerse), sub: `sur ${acomptes.length} versements`, color: 'text-green-700' },
            { label: 'Solde estimé', value: fmt(Math.max(0, data.isEstimeAnnuel - totalVerse)), sub: `à régulariser à la DSF`, color: 'text-amber-700' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
              <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
              <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Acomptes table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Tableau des versements — {year}</h2>
          <span className="text-xs text-gray-400">2 acomptes annuels — Art. 23 CGI Cameroun</span>
        </div>
        {acomptes.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Aucun acompte calculé pour {year}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Versement</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3 text-center">Échéance</th>
                <th className="px-4 py-3 text-center">Payé le</th>
                <th className="px-4 py-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {acomptes.map((a, i) => {
                const st = STATUS_CONFIG[a.status as TaxDeclStatus] ?? { label: a.status, cls: 'bg-gray-100 text-gray-500', dot: 'bg-gray-300' }
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${st.dot}`} />
                        <span className="font-medium text-gray-800">Versement N°{a.number}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400 pl-[18px]">
                        {a.number === 1 ? 'Avant le 15 février — 50% IS N-1' : 'Avant le 15 août — 50% IS N-1'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-semibold text-gray-900">{fmt(a.amount)}</td>
                    <td className="px-4 py-4 text-center text-sm text-gray-600">{fmtDate(a.dueDate)}</td>
                    <td className="px-4 py-4 text-center text-sm text-gray-500">{fmtDate(a.paidAt)}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-[#E8F5E9]">
              <tr>
                <td className="px-4 py-2.5 text-xs font-bold uppercase text-[#006633]">TOTAL VERSÉ</td>
                <td className="px-4 py-2.5 text-right font-mono text-sm font-bold text-[#006633]">{fmt(totalVerse)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">Régime des acomptes IS — Art. 23 CGI Cameroun</p>
        <p className="mt-1 text-xs">Deux versements de 50% de l'IS de l'exercice précédent. Solde versé lors du dépôt de la DSF (15 mars N+1). Si IS réel inférieur aux acomptes : crédit d'impôt imputable.</p>
      </div>
    </div>
  )
}
