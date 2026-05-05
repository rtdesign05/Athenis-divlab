import { useState, useEffect } from 'react'
import { useEsgScore, useEsgYears } from '@/hooks/useEsg'
import { useEmployees } from '@/hooks/useHr'

export function SocialFormationPage() {
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
  const trainingHours = ind?.trainingHours ?? null
  const absenteeism = ind?.absenteeismRate ?? null
  const accidents = ind?.workplaceAccidents ?? null

  const actifs = (employees.data?.items ?? []).filter((e) => !e.endDate).length
  const totalHours = trainingHours != null && actifs > 0 ? Math.round(trainingHours * actifs) : null

  const trainingOk = trainingHours != null ? trainingHours >= 30 : null
  const absenteeismOk = absenteeism != null ? absenteeism <= 3 : null
  const accidentsOk = accidents != null ? accidents === 0 : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Formation & Bien-être</h1>
          <p className="mt-1 text-sm text-gray-500">Indicateurs ESRS S1-13 — formation, absentéisme, accidents — {year}</p>
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
          <p className="font-medium">Aucune donnée formation pour {year}</p>
          <p className="text-xs mt-1">Saisissez vos indicateurs dans{' '}
            <a href="/app/esg/scope" className="text-forest-700 hover:underline font-medium">Saisie données</a>.
          </p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-xl border p-5 ${trainingOk === true ? 'border-green-200 bg-green-50' : trainingOk === false ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs font-medium text-gray-500">Formation / employé</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-100" />
          ) : (
            <>
              <p className="mt-1.5 text-3xl font-bold text-gray-900">
                {trainingHours != null ? trainingHours : <span className="text-gray-300">—</span>}
                {trainingHours != null && <span className="ml-1 text-base font-normal text-gray-400">h/an</span>}
              </p>
              <p className={`mt-1 text-xs ${trainingOk === true ? 'text-green-600' : trainingOk === false ? 'text-amber-600' : 'text-gray-400'}`}>
                {trainingOk === true ? '✓ Objectif ≥ 30 h' : trainingOk === false ? '○ Objectif : ≥ 30 h' : 'Objectif : ≥ 30 h/an'}
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Total heures formation</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-100" />
          ) : (
            <>
              <p className="mt-1.5 text-3xl font-bold text-gray-900">
                {totalHours != null ? totalHours.toLocaleString('fr-FR') : <span className="text-gray-300">—</span>}
                {totalHours != null && <span className="ml-1 text-base font-normal text-gray-400">h</span>}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {actifs > 0 ? `${actifs} employés actifs` : 'Données RH requises'}
              </p>
            </>
          )}
        </div>

        <div className={`rounded-xl border p-5 ${absenteeismOk === true ? 'border-green-200 bg-green-50' : absenteeismOk === false ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs font-medium text-gray-500">Taux d'absentéisme</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-100" />
          ) : (
            <>
              <p className="mt-1.5 text-3xl font-bold text-gray-900">
                {absenteeism != null ? absenteeism : <span className="text-gray-300">—</span>}
                {absenteeism != null && <span className="ml-1 text-base font-normal text-gray-400">%</span>}
              </p>
              <p className={`mt-1 text-xs ${absenteeismOk === true ? 'text-green-600' : absenteeismOk === false ? 'text-red-500' : 'text-gray-400'}`}>
                {absenteeismOk === true ? '✓ Objectif ≤ 3%' : absenteeismOk === false ? '○ Objectif : ≤ 3%' : 'Objectif : ≤ 3%'}
              </p>
            </>
          )}
        </div>

        <div className={`rounded-xl border p-5 ${accidentsOk === true ? 'border-green-200 bg-green-50' : accidentsOk === false ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs font-medium text-gray-500">Accidents du travail</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-100" />
          ) : (
            <>
              <p className="mt-1.5 text-3xl font-bold text-gray-900">
                {accidents != null ? accidents : <span className="text-gray-300">—</span>}
                {accidents != null && <span className="ml-1 text-base font-normal text-gray-400">cas</span>}
              </p>
              <p className={`mt-1 text-xs ${accidentsOk === true ? 'text-green-600' : accidentsOk === false ? 'text-red-500' : 'text-gray-400'}`}>
                {accidentsOk === true ? '✓ Aucun accident' : accidentsOk === false ? `${accidents} accident(s) signalé(s)` : 'Objectif : 0 cas'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Training indicators table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Indicateurs formation & sécurité</h2>
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">ESRS S1-13</span>
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
              {[
                {
                  label: 'Heures de formation / employé',
                  val: trainingHours,
                  unite: 'h/an',
                  objectif: 30,
                  ok: trainingOk,
                  lowerBetter: false,
                  bar: trainingHours != null ? Math.min((trainingHours / 60) * 100, 100) : 0,
                },
                {
                  label: "Taux d'absentéisme",
                  val: absenteeism,
                  unite: '%',
                  objectif: 3,
                  ok: absenteeismOk,
                  lowerBetter: true,
                  bar: absenteeism != null ? Math.min((absenteeism / 10) * 100, 100) : 0,
                },
                {
                  label: 'Accidents du travail',
                  val: accidents,
                  unite: 'cas',
                  objectif: 0,
                  ok: accidentsOk,
                  lowerBetter: true,
                  bar: accidents != null ? Math.min((accidents / 5) * 100, 100) : 0,
                },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-gray-700">{row.label}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {row.val != null ? `${row.val} ${row.unite}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-400">
                    {row.lowerBetter ? '≤' : '≥'} {row.objectif} {row.unite}
                  </td>
                  <td className="px-5 py-3 w-36">
                    {row.val != null && (
                      <div className="h-1.5 rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${row.ok ? 'bg-green-500' : row.lowerBetter ? 'bg-red-400' : 'bg-amber-400'}`}
                          style={{ width: `${row.bar}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {row.ok != null ? (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${row.ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {row.ok ? '✓ Objectif' : '○ À améliorer'}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Context note */}
      {actifs === 0 && !employees.isLoading && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 py-4 text-center">
          <p className="text-xs text-gray-400">Le total des heures de formation nécessite les données RH. Rendez-vous dans <a href="/app/hr/employes" className="text-forest-700 hover:underline">Employés</a>.</p>
        </div>
      )}
    </div>
  )
}
