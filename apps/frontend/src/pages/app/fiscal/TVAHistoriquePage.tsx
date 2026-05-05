import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fiscalApi } from '@/services/fiscalApi'
import type { TaxDeclStatus } from '@/services/fiscalApi'

const YEARS = [2024, 2025, 2026]
const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const STATUS_CONFIG: Record<TaxDeclStatus, { label: string; cls: string }> = {
  PENDING:   { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
  DECLARED:  { label: 'Déclarée',   cls: 'bg-blue-100 text-blue-700' },
  PAID:      { label: 'Payée ✓',   cls: 'bg-green-100 text-green-700' },
  LATE:      { label: 'En retard', cls: 'bg-red-100 text-red-700' },
  EXEMPTED:  { label: 'Exonérée',  cls: 'bg-gray-100 text-gray-500' },
}

function fmt(n: number) { return n.toLocaleString('fr-FR') + ' F CFA' }
function fmtDate(d: string | Date | null) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }

export function TVAHistoriquePage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['fiscal', 'tva-history', year],
    queryFn: () => fiscalApi.tvaHistory(year),
    staleTime: 2 * 60_000,
  })

  const totalDeclare = (history as Array<{ taxAmount?: string | number; status?: string }>)
    .filter(d => d.status === 'DECLARED' || d.status === 'PAID')
    .reduce((s, d) => s + Number(d.taxAmount ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Historique TVA</h1>
        <p className="mt-0.5 text-sm text-gray-500">Toutes les déclarations TVA de l'exercice sélectionné</p>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-3">
        {YEARS.map(y => (
          <button key={y} onClick={() => setYear(y)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              y === year ? 'border-[#006633] bg-[#E8F5E9] text-[#006633]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {y}
          </button>
        ))}
        <span className="ml-auto text-sm font-semibold text-[#006633]">
          Total déclaré : {fmt(totalDeclare)}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Chargement…</div>
        ) : (history as Array<{ id: string; month?: number | null; period: string; taxAmount?: string | number; baseAmount?: string | number; status: string; declaredAt?: string | null }>).length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-gray-500">Aucune déclaration TVA pour {year}</p>
            <p className="mt-1 text-xs text-gray-400">Les déclarations apparaissent ici après validation depuis l'onglet TVA</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Période</th>
                <th className="px-4 py-3 text-right">Base HT</th>
                <th className="px-4 py-3 text-right">TVA collectée</th>
                <th className="px-4 py-3 text-right">TVA nette versée</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-left">Date déclaration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(history as Array<{ id: string; month?: number | null; period: string; taxAmount?: string | number; baseAmount?: string | number; status: string; declaredAt?: string | null }>).map((d) => {
                const st = STATUS_CONFIG[d.status as TaxDeclStatus] ?? { label: d.status, cls: 'bg-gray-100 text-gray-500' }
                const monthIdx = (d.month ?? 1) - 1
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {MONTHS_FR[monthIdx]} {year}
                      <span className="ml-2 text-xs text-gray-400">({d.period})</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600">{fmt(Number(d.baseAmount ?? 0))}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(Math.round(Number(d.baseAmount ?? 0) * 0.1925))}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">{fmt(Number(d.taxAmount ?? 0))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(d.declaredAt ?? null)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-[#E8F5E9]">
              <tr>
                <td className="px-4 py-2.5 text-xs font-bold uppercase text-[#006633]">TOTAL {year}</td>
                <td colSpan={2} />
                <td className="px-4 py-2.5 text-right font-mono text-sm font-bold text-[#006633]">{fmt(totalDeclare)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Les déclarations sont créées automatiquement lorsque vous validez la TVA mensuelle dans l'onglet <strong>TVA &rarr; Déclaration</strong>
      </p>
    </div>
  )
}
