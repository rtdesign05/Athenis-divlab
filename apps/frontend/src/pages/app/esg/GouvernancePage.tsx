import { useState } from 'react'
import { useEsgScore } from '@/hooks/useEsg'

export function GouvernancePage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data, isLoading } = useEsgScore(year)

  const ind = data?.indicators

  const boardFemaleRatio  = ind?.boardFemaleRatio  ?? null
  const hasEthicsCode     = ind?.hasEthicsCode     ?? false
  const hasAnticorruption = ind?.hasAnticorruption ?? false

  type IndRow = { label: string; valeur: string | number | boolean | null; objectif: string; ok: boolean | null; esrs: string }
  const INDICATEURS: IndRow[] = [
    {
      label:     '% femmes au conseil d\'administration',
      valeur:    boardFemaleRatio != null ? `${boardFemaleRatio} %` : null,
      objectif:  '40 %',
      ok:        boardFemaleRatio != null ? boardFemaleRatio >= 40 : null,
      esrs:      'ESRS G1',
    },
    {
      label:     'Code de conduite éthique publié',
      valeur:    hasEthicsCode ? 'Oui' : 'Non',
      objectif:  'Oui',
      ok:        hasEthicsCode,
      esrs:      'ESRS G1',
    },
    {
      label:     'Politique anti-corruption en place',
      valeur:    hasAnticorruption ? 'Oui' : 'Non',
      objectif:  'Oui',
      ok:        hasAnticorruption,
      esrs:      'ESRS G1',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Gouvernance</h1>
          <p className="mt-1 text-sm text-gray-500">Indicateurs ESRS G1 — composition et éthique — {year}</p>
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

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Femmes au CA */}
        <div className={`rounded-xl border p-5 ${
          boardFemaleRatio != null
            ? boardFemaleRatio >= 40 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
            : 'border-gray-200 bg-white'
        }`}>
          <p className="text-xs font-medium text-gray-500">Femmes au CA</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-gray-100" />
          ) : (
            <>
              <p className="mt-1.5 text-3xl font-bold text-gray-900">
                {boardFemaleRatio != null ? `${boardFemaleRatio} %` : '—'}
              </p>
              <p className={`text-xs mt-1 ${boardFemaleRatio != null
                ? boardFemaleRatio >= 40 ? 'text-green-600' : 'text-amber-600'
                : 'text-gray-400'}`}>
                {boardFemaleRatio != null
                  ? boardFemaleRatio >= 40 ? '✓ Objectif atteint' : 'Objectif : 40%'
                  : 'Non renseigné'}
              </p>
            </>
          )}
        </div>

        {/* Code éthique */}
        <div className={`rounded-xl border p-5 ${hasEthicsCode ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs font-medium text-gray-500">Code éthique</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-100" />
          ) : (
            <>
              <p className={`mt-1.5 text-3xl font-bold ${hasEthicsCode ? 'text-green-700' : 'text-gray-400'}`}>
                {hasEthicsCode ? 'Oui' : 'Non'}
              </p>
              <p className={`text-xs mt-1 ${hasEthicsCode ? 'text-green-600' : 'text-amber-600'}`}>
                {hasEthicsCode ? '✓ Publié' : '○ Non publié'}
              </p>
            </>
          )}
        </div>

        {/* Anti-corruption */}
        <div className={`rounded-xl border p-5 ${hasAnticorruption ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs font-medium text-gray-500">Politique anti-corruption</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-100" />
          ) : (
            <>
              <p className={`mt-1.5 text-3xl font-bold ${hasAnticorruption ? 'text-green-700' : 'text-gray-400'}`}>
                {hasAnticorruption ? 'Oui' : 'Non'}
              </p>
              <p className={`text-xs mt-1 ${hasAnticorruption ? 'text-green-600' : 'text-amber-600'}`}>
                {hasAnticorruption ? '✓ En place' : '○ À mettre en place'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Score synthèse */}
      {data && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 flex items-center gap-6">
          <div>
            <p className="text-xs font-medium text-gray-500">Score Gouvernance ESG</p>
            <p className="text-4xl font-bold text-gray-900">{data.scores.gouvernance}<span className="text-xl font-normal text-gray-400">/100</span></p>
          </div>
          <div className="flex-1">
            <div className="h-2 rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${data.scores.gouvernance >= 70 ? 'bg-green-500' : data.scores.gouvernance >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${data.scores.gouvernance}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Indicateurs ESRS G1 */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Indicateurs ESRS G1</h2>
          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">Gouvernance</span>
        </div>
        {isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {INDICATEURS.map((ind, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm text-gray-700">{ind.label}</p>
                  <p className="text-xs text-gray-400">{ind.esrs}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    {ind.valeur != null ? ind.valeur : <span className="text-gray-300">—</span>}
                  </span>
                  <span className="text-xs text-gray-400">Obj. {ind.objectif}</span>
                  {ind.ok != null ? (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ind.ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {ind.ok ? '✓' : '○'}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* No data prompt */}
      {!data && !isLoading && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center">
          <p className="text-sm text-gray-500">Aucune donnée ESG pour {year}.</p>
          <p className="mt-1 text-xs text-gray-400">
            Rendez-vous dans <strong>Saisie des indicateurs</strong> pour renseigner les données de gouvernance
            (ratio femmes au CA, code éthique, politique anti-corruption).
          </p>
        </div>
      )}
    </div>
  )
}
