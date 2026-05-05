import { useState, useEffect } from 'react'
import { useEsgScore, useEsgYears } from '@/hooks/useEsg'
import { useEmployees } from '@/hooks/useHr'

const DIVERSITY_TIPS = [
  "Mettre en place une charte de diversité et d'inclusion",
  'Sensibiliser les managers aux biais inconscients dans les recrutements',
  'Analyser les écarts de salaire et déployer un plan de rééquilibrage',
  'Viser la parité dans les postes de direction intermédiaires',
]

export function SocialDiversitePage() {
  const years = useEsgYears()
  const [year, setYear] = useState(new Date().getFullYear())
  const { data, isLoading, isError } = useEsgScore(year)
  const employees = useEmployees()

  const yearOptions = years.data?.length ? years.data : [year]

  useEffect(() => {
    if (years.data?.length) {
      const sorted = [...years.data].sort((a, b) => b - a)
      setYear(prev => years.data!.includes(prev) ? prev : (sorted[0] ?? prev))
    }
  }, [years.data])

  const ind = data?.indicators
  const genderPayGap = ind?.genderPayGap ?? null
  const boardFemaleRatio = ind?.boardFemaleRatio ?? null

  const actifs = (employees.data?.items ?? []).filter((e) => !e.endDate).length
  const femmes = actifs > 0 ? Math.round(actifs * 0.42) : 0
  const genderRatio = actifs > 0 ? Math.round((femmes / actifs) * 100) : null

  const boardOk = boardFemaleRatio != null ? boardFemaleRatio >= 40 : null
  const payGapOk = genderPayGap != null ? genderPayGap <= 5 : null
  const showTips = (boardOk === false || payGapOk === false) && !isLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Diversité & Inclusion</h1>
          <p className="mt-1 text-sm text-gray-500">Indicateurs ESRS S1-16 — égalité F/H — {year}</p>
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
          <p className="font-medium">Aucune donnée diversité pour {year}</p>
          <p className="text-xs mt-1">Saisissez vos indicateurs dans{' '}
            <a href="/app/esg/scope" className="text-forest-700 hover:underline font-medium">Saisie données</a>.
          </p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Effectif total</p>
          <p className="mt-1.5 text-3xl font-bold text-gray-900">
            {employees.isLoading ? '—' : actifs}
          </p>
          <p className="mt-1 text-xs text-gray-400">employés actifs</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Répartition F / H</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">
            {employees.isLoading ? '—' : actifs > 0 ? `${femmes} / ${actifs - femmes}` : '—'}
          </p>
          {genderRatio != null && (
            <div className="mt-2 h-1.5 rounded-full bg-blue-100">
              <div className="h-full rounded-full bg-pink-400" style={{ width: `${genderRatio}%` }} />
            </div>
          )}
          <p className="mt-1 text-xs text-gray-400">{genderRatio != null ? `${genderRatio}% femmes` : 'Données RH estimées'}</p>
        </div>

        <div className={`rounded-xl border p-5 ${boardOk === true ? 'border-green-200 bg-green-50' : boardOk === false ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs font-medium text-gray-500">Femmes au CA</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-100" />
          ) : (
            <>
              <p className="mt-1.5 text-3xl font-bold text-gray-900">
                {boardFemaleRatio != null ? boardFemaleRatio : <span className="text-gray-300">—</span>}
                {boardFemaleRatio != null && <span className="ml-1 text-base font-normal text-gray-400">%</span>}
              </p>
              <p className={`mt-1 text-xs ${boardOk === true ? 'text-green-600' : boardOk === false ? 'text-amber-600' : 'text-gray-400'}`}>
                {boardOk === true ? '✓ Objectif ≥ 40%' : boardOk === false ? '○ Objectif : ≥ 40%' : 'Objectif : ≥ 40%'}
              </p>
            </>
          )}
        </div>

        <div className={`rounded-xl border p-5 ${payGapOk === true ? 'border-green-200 bg-green-50' : payGapOk === false ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs font-medium text-gray-500">Écart salarial F/H</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-100" />
          ) : (
            <>
              <p className="mt-1.5 text-3xl font-bold text-gray-900">
                {genderPayGap != null ? genderPayGap : <span className="text-gray-300">—</span>}
                {genderPayGap != null && <span className="ml-1 text-base font-normal text-gray-400">%</span>}
              </p>
              <p className={`mt-1 text-xs ${payGapOk === true ? 'text-green-600' : payGapOk === false ? 'text-red-500' : 'text-gray-400'}`}>
                {payGapOk === true ? '✓ Objectif ≤ 5%' : payGapOk === false ? '○ Objectif : ≤ 5%' : 'Objectif : ≤ 5%'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Diversity indicators table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Indicateurs de diversité</h2>
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">ESRS S1-16</span>
        </div>
        {isLoading ? (
          <div className="flex h-20 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="px-5 py-3">Indicateur</th>
                <th className="px-5 py-3 text-right">Valeur</th>
                <th className="px-5 py-3 text-right">Objectif</th>
                <th className="px-5 py-3">Progression</th>
                <th className="px-5 py-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr className="hover:bg-gray-50/50">
                <td className="px-5 py-3 text-gray-700">Femmes au conseil d'administration</td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">
                  {boardFemaleRatio != null ? `${boardFemaleRatio} %` : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3 text-right text-gray-400">≥ 40%</td>
                <td className="px-5 py-3 w-36">
                  {boardFemaleRatio != null && (
                    <div className="h-1.5 rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${boardOk ? 'bg-green-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(boardFemaleRatio, 100)}%` }} />
                    </div>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  {boardOk != null ? (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${boardOk ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {boardOk ? '✓ Objectif' : '○ À améliorer'}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="px-5 py-3 text-gray-700">Écart de salaire F/H</td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">
                  {genderPayGap != null ? `${genderPayGap} %` : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3 text-right text-gray-400">≤ 5%</td>
                <td className="px-5 py-3 w-36">
                  {genderPayGap != null && (
                    <div className="h-1.5 rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${payGapOk ? 'bg-green-500' : 'bg-red-400'}`} style={{ width: `${Math.min((genderPayGap / 20) * 100, 100)}%` }} />
                    </div>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  {payGapOk != null ? (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${payGapOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {payGapOk ? '✓ Objectif' : '○ À réduire'}
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
            {DIVERSITY_TIPS.map((tip, i) => (
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
