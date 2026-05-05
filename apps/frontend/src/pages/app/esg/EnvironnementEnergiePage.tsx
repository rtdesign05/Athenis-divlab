import { useState, useEffect } from 'react'
import { useEsgScore, useEsgYears } from '@/hooks/useEsg'

const TIPS = [
  "Installer des panneaux solaires pour augmenter la part d'énergies renouvelables",
  "Optimiser l'éclairage avec des ampoules LED basse consommation",
  'Mettre en place un système de gestion technique du bâtiment (GTB)',
  'Sensibiliser les employés aux écogestes pour réduire la consommation quotidienne',
]

export function EnvironnementEnergiePage() {
  const years = useEsgYears()
  const [year, setYear] = useState(new Date().getFullYear())
  const { data, isLoading, isError } = useEsgScore(year)

  const yearOptions = years.data?.length ? years.data : [year]

  useEffect(() => {
    if (years.data?.length) {
      const sorted = [...years.data].sort((a, b) => b - a)
      setYear(prev => years.data!.includes(prev) ? prev : (sorted[0] ?? prev))
    }
  }, [years.data])

  const ind = data?.indicators
  const energyMwh = ind?.energyKwh != null ? +(ind.energyKwh / 1000).toFixed(1) : null
  const renewablePct = ind?.renewableRatio ?? null
  const employees = null as number | null // not available from esgScore directly

  const energyOk = energyMwh != null ? energyMwh <= 220 : null
  const renewableOk = renewablePct != null ? renewablePct >= 50 : null
  const showTips = (energyOk === false || renewableOk === false) && !isLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Énergie</h1>
          <p className="mt-1 text-sm text-gray-500">Indicateurs ESRS E1 — consommation & renouvelables — {year}</p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <span className="text-xs text-gray-400">Chargement…</span>}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* No data */}
      {!isLoading && (isError || data === null) && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-400">
          <p className="font-medium">Aucune donnée énergie pour {year}</p>
          <p className="text-xs mt-1">Saisissez vos indicateurs dans{' '}
            <a href="/app/esg/scope" className="text-forest-700 hover:underline font-medium">Saisie données</a>.
          </p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`rounded-xl border p-5 ${energyOk === true ? 'border-green-200 bg-green-50' : energyOk === false ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs font-medium text-gray-500">Consommation totale</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-100" />
          ) : (
            <>
              <p className="mt-1.5 text-3xl font-bold text-gray-900">
                {energyMwh != null ? energyMwh : <span className="text-gray-300">—</span>}
                {energyMwh != null && <span className="ml-1 text-base font-normal text-gray-400">MWh</span>}
              </p>
              <p className={`mt-1 text-xs ${energyOk === true ? 'text-green-600' : energyOk === false ? 'text-red-500' : 'text-gray-400'}`}>
                {energyOk === true ? '✓ Objectif ≤ 220 MWh' : energyOk === false ? `○ Dépasse l'objectif 220 MWh` : 'Objectif : ≤ 220 MWh'}
              </p>
            </>
          )}
        </div>

        <div className={`rounded-xl border p-5 ${renewableOk === true ? 'border-green-200 bg-green-50' : renewableOk === false ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs font-medium text-gray-500">Part renouvelable</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-100" />
          ) : (
            <>
              <p className="mt-1.5 text-3xl font-bold text-gray-900">
                {renewablePct != null ? renewablePct : <span className="text-gray-300">—</span>}
                {renewablePct != null && <span className="ml-1 text-base font-normal text-gray-400">%</span>}
              </p>
              {renewablePct != null && (
                <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${renewableOk ? 'bg-green-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(renewablePct, 100)}%` }} />
                </div>
              )}
              <p className={`mt-1 text-xs ${renewableOk === true ? 'text-green-600' : renewableOk === false ? 'text-amber-600' : 'text-gray-400'}`}>
                {renewableOk === true ? '✓ Objectif ≥ 50%' : renewableOk === false ? '○ Objectif : ≥ 50%' : 'Objectif : ≥ 50%'}
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Conso / employé</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-100" />
          ) : (
            <>
              <p className="mt-1.5 text-3xl font-bold text-gray-900">
                {energyMwh != null && employees != null
                  ? <>{(energyMwh * 1000 / employees).toFixed(0)}<span className="ml-1 text-base font-normal text-gray-400">kWh/pers</span></>
                  : <span className="text-gray-300">—</span>
                }
              </p>
              <p className="mt-1 text-xs text-gray-400">Données RH requises</p>
            </>
          )}
        </div>
      </div>

      {/* Comparison table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Comparaison aux objectifs ESRS E1</h2>
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">ESRS E1</span>
        </div>
        {isLoading ? (
          <div className="flex h-20 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="px-5 py-3">Indicateur</th>
                <th className="px-5 py-3 text-right">Valeur mesurée</th>
                <th className="px-5 py-3 text-right">Objectif</th>
                <th className="px-5 py-3">Progression</th>
                <th className="px-5 py-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr className="hover:bg-gray-50/50">
                <td className="px-5 py-3 text-gray-700">Consommation d'énergie</td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">
                  {energyMwh != null ? `${energyMwh} MWh` : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3 text-right text-gray-400">≤ 220 MWh</td>
                <td className="px-5 py-3 w-32">
                  {energyMwh != null && (
                    <div className="h-1.5 rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${energyOk ? 'bg-green-500' : 'bg-red-400'}`} style={{ width: `${Math.min((energyMwh / 220) * 100, 100)}%` }} />
                    </div>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  {energyOk != null ? (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${energyOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {energyOk ? '✓ Objectif' : '○ À réduire'}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="px-5 py-3 text-gray-700">Part renouvelable</td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">
                  {renewablePct != null ? `${renewablePct} %` : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3 text-right text-gray-400">≥ 50%</td>
                <td className="px-5 py-3 w-32">
                  {renewablePct != null && (
                    <div className="h-1.5 rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${renewableOk ? 'bg-green-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(renewablePct, 100)}%` }} />
                    </div>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  {renewableOk != null ? (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${renewableOk ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {renewableOk ? '✓ Objectif' : '○ À améliorer'}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Tips */}
      {showTips && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold text-amber-800 mb-3">Pistes d'amélioration</h2>
          <ul className="space-y-2">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                <span className="mt-0.5 text-amber-500">→</span>{tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
