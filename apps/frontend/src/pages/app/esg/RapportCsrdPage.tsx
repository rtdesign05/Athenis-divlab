import { useState, useEffect } from 'react'
import { useCsrdReport, useEsgYears } from '@/hooks/useEsg'

function scoreColor(score: number) {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-600'
}

function scoreBg(score: number) {
  if (score >= 70) return 'border-green-200 bg-green-50'
  if (score >= 40) return 'border-amber-200 bg-amber-50'
  return 'border-red-200 bg-red-50'
}

export function RapportCsrdPage() {
  const years = useEsgYears()
  const [year, setYear] = useState(new Date().getFullYear())
  const report = useCsrdReport(year)

  const yearOptions = years.data?.length ? years.data : [year]

  useEffect(() => {
    if (years.data?.length) {
      const sorted = [...years.data].sort((a, b) => b - a)
      setYear(prev => years.data!.includes(prev) ? prev : (sorted[0] ?? prev))
    }
  }, [years.data])

  const data = report.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Conformité CSRD / ESRS</h1>
          <p className="mt-1 text-sm text-gray-500">Tableau de conformité ESRS complet — exercice {year}</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
        >
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Loading */}
      {report.isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-forest-500 border-t-transparent" />
          <span className="ml-3 text-sm text-gray-400">Chargement du rapport CSRD…</span>
        </div>
      )}

      {/* No data */}
      {!report.isLoading && (report.isError || data === null) && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-400">
          <p className="font-medium">Aucune donnée CSRD pour {year}</p>
          <p className="text-xs mt-1">Saisissez vos indicateurs dans{' '}
            <a href="/app/esg/scope" className="text-forest-700 hover:underline font-medium">Saisie données</a>.
          </p>
        </div>
      )}

      {data && (
        <>
          {/* Conformité banner */}
          <div className={`rounded-xl border p-4 flex items-center gap-3 ${data.conformiteCSRD ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <span className="text-2xl">{data.conformiteCSRD ? '✅' : '❌'}</span>
            <div>
              <p className={`text-sm font-semibold ${data.conformiteCSRD ? 'text-green-800' : 'text-red-800'}`}>
                {data.conformiteCSRD ? 'Conforme CSRD — seuil ≥ 60 atteint' : 'Non-conforme CSRD — score global < 60'}
              </p>
              <p className="text-xs text-gray-500">Score global : {data.scores.global}/100</p>
            </div>
          </div>

          {/* Score cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Score Global',       score: data.scores.global,       icon: '🌍' },
              { label: 'Environnement',       score: data.scores.environnement, icon: '🌿' },
              { label: 'Social',              score: data.scores.social,        icon: '👥' },
              { label: 'Gouvernance',         score: data.scores.gouvernance,   icon: '🏛️' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border p-5 ${scoreBg(s.score)}`}>
                <p className="text-xs font-medium text-gray-500">{s.icon} {s.label}</p>
                <p className={`mt-1.5 text-3xl font-bold ${scoreColor(s.score)}`}>{s.score}<span className="text-base font-normal text-gray-400">/100</span></p>
                <div className="mt-2 h-1.5 rounded-full bg-white/60">
                  <div
                    className={`h-full rounded-full ${s.score >= 70 ? 'bg-green-500' : s.score >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${s.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* CO2 breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Bilan carbone (tCO₂e)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Scope 1 — Direct',     val: data.co2.scope1 },
                { label: 'Scope 2 — Électricité', val: data.co2.scope2 },
                { label: 'Scope 3 — Indirect',    val: data.co2.scope3 },
                { label: 'Total',                 val: data.co2.total, bold: true },
              ].map((s) => (
                <div key={s.label} className={`rounded-lg p-3 ${s.bold ? 'bg-forest-50 border border-forest-200' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-xl font-bold mt-1 ${s.bold ? 'text-forest-800' : 'text-gray-800'}`}>
                    {s.val > 0 ? s.val.toFixed(2) : <span className="text-gray-300">—</span>}
                    {s.val > 0 && <span className="ml-1 text-xs font-normal text-gray-400">tCO₂e</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ESRS Compliance table */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Tableau de conformité ESRS</h2>
              <span className="rounded bg-forest-100 px-2 py-0.5 text-xs font-medium text-forest-700">
                {data.materialite.filter(m => m.materiel).length} indicateurs matériels
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr className="text-left text-xs font-semibold text-gray-500">
                    <th className="px-4 py-3">ESRS</th>
                    <th className="px-4 py-3">Sujet</th>
                    <th className="px-4 py-3 text-center">Pilier</th>
                    <th className="px-4 py-3 text-center">Matériel</th>
                    <th className="px-4 py-3 text-right">Valeur mesurée</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.materialite.map((m, i) => {
                    const isConforme = !m.materiel || (m.valeur && m.valeur !== '—' && m.valeur !== 'Non renseigné')
                    return (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5">
                          <span className="rounded bg-forest-100 px-1.5 py-0.5 text-xs font-mono font-medium text-forest-800">{m.esrs}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">{m.topic}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            m.pilier === 'E' ? 'bg-green-100 text-green-700' :
                            m.pilier === 'S' ? 'bg-blue-100 text-blue-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>{m.pilier}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            m.materiel ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                          }`}>{m.materiel ? 'Oui' : 'Non'}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-gray-600">
                          {m.valeur && m.valeur !== '—' ? m.valeur : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            isConforme ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {isConforme ? '✓ Conforme' : '○ À améliorer'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
