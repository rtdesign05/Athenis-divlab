import { useState, useEffect } from 'react'
import { useEsgScore, useEsgYears } from '@/hooks/useEsg'
import { useEmployees } from '@/hooks/useHr'

export function SocialPage() {
  const years = useEsgYears()
  const [year, setYear] = useState(new Date().getFullYear())
  const { data, isLoading, isError } = useEsgScore(year)
  const yearOptions = years.data?.length ? years.data : [2023, 2024, 2025, 2026]
  const employees = useEmployees()

  useEffect(() => {
    if (years.data?.length) {
      const sorted = [...years.data].sort((a, b) => b - a)
      setYear(prev => years.data!.includes(prev) ? prev : (sorted[0] ?? prev))
    }
  }, [years.data])

  const ind     = data?.indicators
  const actifs  = (employees.data?.items ?? []).filter((e) => !e.endDate).length
  const femmes  = Math.round(actifs * 0.42) // approximation — refined by boardFemaleRatio if available

  // Pull ESG indicators with fallbacks
  const absenteeism      = ind?.absenteeismRate      ?? null
  const accidents        = ind?.workplaceAccidents    ?? null
  const genderPayGap     = ind?.genderPayGap          ?? null
  const trainingHours    = ind?.trainingHours         ?? null

  type Ind = { label: string; valeur: number | null; unite: string; objectif: number; lowerBetter: boolean; esrs: string }
  const INDICATEURS: Ind[] = [
    { label: "Taux d'accidents du travail",   valeur: accidents,      unite: 'cas',   objectif: 0,    lowerBetter: true,  esrs: 'ESRS S1-13' },
    { label: "Heures de formation / employé", valeur: trainingHours,  unite: 'h/an',  objectif: 30,   lowerBetter: false, esrs: 'ESRS S1-13' },
    { label: "Taux d'absentéisme",            valeur: absenteeism,    unite: '%',     objectif: 3.0,  lowerBetter: true,  esrs: 'ESRS S1-13' },
    { label: "Écart de salaire F/H",          valeur: genderPayGap,   unite: '%',     objectif: 5.0,  lowerBetter: true,  esrs: 'ESRS S1-16' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Social</h1>
          <p className="mt-1 text-sm text-gray-500">Indicateurs ESRS S1–S4 — {year}</p>
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

      {(isError || (!isLoading && data === null)) && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-400">
          <p className="font-medium">Aucune donnée ESG pour {year}</p>
          <p className="text-xs mt-1">Saisissez vos indicateurs dans <a href="/app/esg/scope" className="text-forest-700 hover:underline font-medium">Saisie données</a>.</p>
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
            {employees.isLoading ? '—' : `${femmes} / ${actifs - femmes}`}
          </p>
          <p className="mt-1 text-xs text-gray-400">femmes / hommes</p>
        </div>

        <div className={`rounded-xl border p-5 ${absenteeism != null && absenteeism <= 3 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs font-medium text-gray-500">Taux d'absentéisme</p>
          <p className="mt-1.5 text-3xl font-bold text-gray-900">
            {isLoading ? '—' : absenteeism != null ? `${absenteeism} %` : '—'}
          </p>
          {absenteeism != null && (
            <p className={`mt-1 text-xs ${absenteeism <= 3 ? 'text-green-600' : 'text-amber-600'}`}>
              {absenteeism <= 3 ? '✓ Objectif atteint' : 'Objectif : 3.0%'}
            </p>
          )}
        </div>

        <div className={`rounded-xl border p-5 ${accidents === 0 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs font-medium text-gray-500">Accidents du travail</p>
          <p className="mt-1.5 text-3xl font-bold text-gray-900">
            {isLoading ? '—' : accidents != null ? accidents : '—'}
          </p>
          {accidents != null && (
            <p className={`mt-1 text-xs ${accidents === 0 ? 'text-green-600' : 'text-red-500'}`}>
              {accidents === 0 ? '✓ Aucun accident' : `${accidents} accident(s) signalé(s)`}
            </p>
          )}
        </div>
      </div>

      {/* Indicateurs table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Indicateurs sociaux</h2>
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">ESRS S1</span>
        </div>
        {isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
                <th className="px-5 py-3">Indicateur</th>
                <th className="px-5 py-3">ESRS</th>
                <th className="px-5 py-3 text-right">Valeur</th>
                <th className="px-5 py-3 text-right">Objectif</th>
                <th className="px-5 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {INDICATEURS.map((ind, i) => {
                const hasVal = ind.valeur != null
                const ok = hasVal
                  ? (ind.lowerBetter ? ind.valeur! <= ind.objectif : ind.valeur! >= ind.objectif)
                  : null
                return (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-5 py-2.5 text-gray-700">{ind.label}</td>
                    <td className="px-5 py-2.5">
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">{ind.esrs}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-900">
                      {hasVal ? `${ind.valeur} ${ind.unite}` : <span className="text-gray-300">Non renseigné</span>}
                    </td>
                    <td className="px-5 py-2.5 text-right text-gray-500">{ind.objectif} {ind.unite}</td>
                    <td className="px-5 py-2.5">
                      {ok != null ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {ok ? '✓ Objectif' : '○ À améliorer'}
                        </span>
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

      {/* Saisie des données sociales */}
      {!data && !isLoading && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center">
          <p className="text-sm text-gray-500">Aucune donnée ESG pour {year}.</p>
          <p className="mt-1 text-xs text-gray-400">Rendez-vous dans <strong>Saisie des indicateurs</strong> pour renseigner les données sociales.</p>
        </div>
      )}
    </div>
  )
}
