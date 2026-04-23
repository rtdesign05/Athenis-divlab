import { useState } from 'react'
import { useCA3 } from '@/hooks/useAccounting'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { formatCurrency } from '@/shared/utils/currency'

const CURRENT_YEAR    = new Date().getFullYear()
const CURRENT_QUARTER = Math.ceil((new Date().getMonth() + 1) / 3)

function CA3Table({ data }: { data: ReturnType<typeof useCA3>['data'] }) {
  if (!data) return null

  const CADRE_A = ['01', '02', '03', '04', '09']
  const CADRE_B = ['20', '23']
  const CADRE_C = ['28', '29']

  function Section({ title, keys }: { title: string; keys: string[] }) {
    return (
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">{title}</h4>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 text-xs">N° ligne</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 text-xs">Libellé</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 text-xs">Base HT</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 text-xs">TVA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {keys.map((k) => {
                const ligne = data.lignes[k]
                if (!ligne) return null
                const isTotal = k === '09' || k === '23' || k === '28' || k === '29'
                return (
                  <tr key={k} className={isTotal ? 'bg-gray-50 font-semibold' : 'hover:bg-gray-50'}>
                    <td className="px-3 py-2.5 text-gray-400 font-mono text-xs">{k}</td>
                    <td className="px-3 py-2.5 text-gray-700">{ligne.label}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">
                      {ligne.base != null ? formatCurrency(ligne.base) : '—'}
                    </td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${
                      k === '28' ? 'text-red-600' : k === '29' ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {formatCurrency(ligne.tva)}
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

  const net28 = data.lignes['28']?.tva ?? 0
  const net29 = data.lignes['29']?.tva ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Déclaration CA3 — {data.period}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Pré-remplie automatiquement à partir de vos données</p>
        </div>
        <div className={`card py-3 px-4 text-center min-w-[160px] ${net28 > 0 ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-green-400'}`}>
          <p className="text-xs text-gray-500">{net28 > 0 ? 'TVA à payer' : 'Crédit de TVA'}</p>
          <p className={`text-xl font-bold mt-1 ${net28 > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(net28 > 0 ? net28 : net29)}
          </p>
        </div>
      </div>

      <Section title="Cadre A — Opérations imposables" keys={CADRE_A} />
      <Section title="Cadre B — Déductions" keys={CADRE_B} />
      <Section title="Cadre C — TVA à payer" keys={CADRE_C} />

      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
        Ces montants sont calculés à partir de vos factures payées et dépenses enregistrées dans Athenis.
        Vérifiez les montants avant de déposer votre déclaration sur impots.gouv.fr.
      </div>
    </div>
  )
}

export function TVAPage() {
  const [year, setYear]       = useState(CURRENT_YEAR)
  const [quarter, setQuarter] = useState(CURRENT_QUARTER)

  const { data, isLoading } = useCA3(year, quarter)

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Déclaration TVA (CA3)</h2>
          <p className="mt-1 text-sm text-gray-500">Formulaire CA3 pré-rempli par trimestre</p>
        </div>

        {/* Period selector */}
        <div className="flex gap-3 items-center flex-wrap">
          <div>
            <label className="label mb-1">Année</label>
            <select className="input" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label mb-1">Trimestre</label>
            <select className="input" value={quarter} onChange={e => setQuarter(Number(e.target.value))}>
              {[1, 2, 3, 4].map(q => (
                <option key={q} value={q}>T{q}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading
          ? <div className="animate-pulse space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded" />)}</div>
          : <CA3Table data={data} />
        }
      </div>
    </ErrorBoundary>
  )
}
