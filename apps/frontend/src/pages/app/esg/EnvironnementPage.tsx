import { useState } from 'react'
import { useEsgScore } from '@/hooks/useEsg'

const INDICATEURS = [
  { code: 'E1', label: 'Énergie', unite: 'MWh/an',    valeur: 248,  objectif: 220, esrs: 'ESRS E1' },
  { code: 'E1', label: 'Énergies renouvelables', unite: '%', valeur: 34, objectif: 50, esrs: 'ESRS E1' },
  { code: 'E1', label: 'CO₂ Scope 1 (direct)',  unite: 'tCO₂e', valeur: 42,  objectif: 35, esrs: 'ESRS E1' },
  { code: 'E1', label: 'CO₂ Scope 2 (électricité)', unite: 'tCO₂e', valeur: 28, objectif: 20, esrs: 'ESRS E1' },
  { code: 'E1', label: 'CO₂ Scope 3 (indirect)', unite: 'tCO₂e', valeur: 156, objectif: 140, esrs: 'ESRS E1' },
  { code: 'E3', label: 'Consommation eau',       unite: 'm³/an',  valeur: 1_840, objectif: 1_600, esrs: 'ESRS E3' },
  { code: 'E5', label: 'Déchets totaux',         unite: 'tonnes', valeur: 12.4, objectif: 10, esrs: 'ESRS E5' },
  { code: 'E5', label: 'Taux recyclage déchets', unite: '%',      valeur: 68,   objectif: 80, esrs: 'ESRS E5' },
]

export function EnvironnementPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const scopeData = useEsgScore(year)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Environnemental</h1>
          <p className="mt-1 text-sm text-gray-500">Indicateurs ESRS E1–E5 — {year}</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
        >
          {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* CO₂ Total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Scope 1 (direct)',       val: 42,  color: 'bg-red-500' },
          { label: 'Scope 2 (électricité)',  val: 28,  color: 'bg-orange-400' },
          { label: 'Scope 3 (indirect)',     val: 156, color: 'bg-amber-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
            <p className="mt-1.5 text-2xl font-bold text-gray-900">{s.val} <span className="text-base font-normal text-gray-400">tCO₂e</span></p>
            <div className="mt-2 h-1.5 rounded-full bg-gray-100">
              <div className={`h-full rounded-full ${s.color}`} style={{ width: `${Math.min((s.val / 200) * 100, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Table indicateurs */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Tous les indicateurs</h2>
          {scopeData.isLoading && <span className="text-xs text-gray-400">Chargement…</span>}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
              <th className="px-5 py-3">Indicateur</th>
              <th className="px-5 py-3">ESRS</th>
              <th className="px-5 py-3 text-right">Valeur</th>
              <th className="px-5 py-3 text-right">Objectif</th>
              <th className="px-5 py-3">Progression</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {INDICATEURS.map((ind, i) => {
              const ratio = ind.valeur / ind.objectif
              const ok    = ratio <= 1
              return (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-5 py-2.5 text-gray-700">{ind.label}</td>
                  <td className="px-5 py-2.5">
                    <span className="rounded bg-forest-100 px-1.5 py-0.5 text-xs font-medium text-forest-700">{ind.esrs}</span>
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium text-gray-900">{ind.valeur} {ind.unite}</td>
                  <td className="px-5 py-2.5 text-right text-gray-500">{ind.objectif} {ind.unite}</td>
                  <td className="px-5 py-2.5 w-32">
                    <div className="h-1.5 rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${ok ? 'bg-green-500' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                      />
                    </div>
                    <p className={`mt-0.5 text-[10px] ${ok ? 'text-green-600' : 'text-red-500'}`}>
                      {ok ? '✓ Objectif atteint' : `${Math.round((ratio - 1) * 100)}% au-dessus`}
                    </p>
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
