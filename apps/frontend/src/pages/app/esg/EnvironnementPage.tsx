import { useState } from 'react'
import { useEsgScore } from '@/hooks/useEsg'

export function EnvironnementPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data, isLoading } = useEsgScore(year)

  const co2  = data?.co2
  const ind  = data?.indicators

  const energyMwh      = ind?.energyKwh   != null ? +(ind.energyKwh / 1000).toFixed(1)  : null
  const wasteTonnes    = ind?.wasteKg      != null ? +(ind.wasteKg   / 1000).toFixed(2)  : null
  const renewablePct   = ind?.renewableRatio                                              ?? null

  const scope1 = co2?.scope1 ?? 0
  const scope2 = co2?.scope2 ?? 0
  const scope3 = co2?.scope3 ?? 0

  const INDICATEURS = [
    { code: 'E1', label: 'Énergie',                    unite: 'MWh/an',  valeur: energyMwh,    objectif: 220,  lowerBetter: true },
    { code: 'E1', label: 'Énergies renouvelables',     unite: '%',       valeur: renewablePct,  objectif: 50,   lowerBetter: false },
    { code: 'E1', label: 'CO₂ Scope 1 (direct)',       unite: 'tCO₂e',  valeur: scope1 || null, objectif: 35,  lowerBetter: true },
    { code: 'E1', label: 'CO₂ Scope 2 (électricité)',  unite: 'tCO₂e',  valeur: scope2 || null, objectif: 20,  lowerBetter: true },
    { code: 'E1', label: 'CO₂ Scope 3 (indirect)',     unite: 'tCO₂e',  valeur: scope3 || null, objectif: 140, lowerBetter: true },
    { code: 'E5', label: 'Déchets totaux',             unite: 'tonnes', valeur: wasteTonnes,   objectif: 10,   lowerBetter: true },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Environnemental</h1>
          <p className="mt-1 text-sm text-gray-500">Indicateurs ESRS E1–E5 — {year}</p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <span className="text-xs text-gray-400">Chargement…</span>}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* CO₂ Scope cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Scope 1 (direct)',      val: scope1, color: 'bg-red-500',    max: 80  },
          { label: 'Scope 2 (électricité)', val: scope2, color: 'bg-orange-400', max: 50  },
          { label: 'Scope 3 (indirect)',    val: scope3, color: 'bg-amber-400',  max: 250 },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
            {isLoading ? (
              <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-100" />
            ) : (
              <>
                <p className="mt-1.5 text-2xl font-bold text-gray-900">
                  {s.val > 0 ? s.val.toFixed(2) : '—'}
                  {s.val > 0 && <span className="ml-1 text-base font-normal text-gray-400">tCO₂e</span>}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${s.color}`}
                    style={{ width: `${Math.min((s.val / s.max) * 100, 100)}%` }}
                  />
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Totals banner */}
      {(scope1 + scope2 + scope3) > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-green-700">Total CO₂ (Scope 1+2+3)</p>
            <p className="text-2xl font-bold text-green-900">{(scope1 + scope2 + scope3).toFixed(2)} tCO₂e</p>
          </div>
          {renewablePct != null && (
            <div className="text-right">
              <p className="text-xs font-medium text-green-700">Énergies renouvelables</p>
              <p className="text-2xl font-bold text-green-900">{renewablePct} %</p>
            </div>
          )}
        </div>
      )}

      {/* Table indicateurs */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Tous les indicateurs</h2>
          <span className="rounded bg-forest-100 px-1.5 py-0.5 text-xs font-medium text-forest-700">ESRS E1 · E3 · E5</span>
        </div>
        {isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
          </div>
        ) : (
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
                const hasVal = ind.valeur != null
                const ratio  = hasVal ? (ind.lowerBetter
                  ? ind.valeur! / ind.objectif
                  : ind.objectif / ind.valeur!) : null
                const ok = ratio != null ? ratio <= 1 : null
                return (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-5 py-2.5 text-gray-700">{ind.label}</td>
                    <td className="px-5 py-2.5">
                      <span className="rounded bg-forest-100 px-1.5 py-0.5 text-xs font-medium text-forest-700">{ind.code}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-900">
                      {hasVal ? `${ind.valeur} ${ind.unite}` : <span className="text-gray-300">Non renseigné</span>}
                    </td>
                    <td className="px-5 py-2.5 text-right text-gray-500">{ind.objectif} {ind.unite}</td>
                    <td className="px-5 py-2.5 w-36">
                      {ok != null ? (
                        <>
                          <div className="h-1.5 rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full ${ok ? 'bg-green-500' : 'bg-red-400'}`}
                              style={{ width: `${Math.min((ind.lowerBetter ? (ind.objectif / ind.valeur!) : (ind.valeur! / ind.objectif)) * 100, 100)}%` }}
                            />
                          </div>
                          <p className={`mt-0.5 text-[10px] ${ok ? 'text-green-600' : 'text-red-500'}`}>
                            {ok ? '✓ Objectif atteint' : ind.lowerBetter
                              ? `${Math.round(((ind.valeur! / ind.objectif) - 1) * 100)}% au-dessus`
                              : `${Math.round(((ind.objectif / ind.valeur!) - 1) * 100)}% en-dessous`
                            }
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
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
