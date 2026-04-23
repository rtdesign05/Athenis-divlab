import { useState } from 'react'
import { useCsrdReport, useEsgYears } from '@/hooks/useEsg'
import type { MaterialiteItem } from '@/services/esgApi'

const PILIER_COLOR: Record<string, string> = {
  E: 'bg-green-100 text-green-700',
  S: 'bg-blue-100 text-blue-700',
  G: 'bg-purple-100 text-purple-700',
}

const PRIO_COLOR: Record<string, string> = {
  CRITIQUE: 'bg-red-100 text-red-700',
  ÉLEVÉ:   'bg-orange-100 text-orange-700',
  MOYEN:    'bg-yellow-100 text-yellow-700',
}

// Matrice de matérialité (2x2 importance financière vs impact sociétal)
function MaterialiteMatrix({ items }: { items: MaterialiteItem[] }) {
  const material    = items.filter(i => i.materiel)
  const nonMaterial = items.filter(i => !i.materiel)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">Matrice de matérialité double</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-xs font-semibold text-red-700 mb-2">Sujets matériels ({material.length})</p>
          <p className="text-xs text-red-500 mb-3">Impact financier ET/OU impact sociétal significatif</p>
          <div className="space-y-2">
            {material.map(item => (
              <div key={item.esrs} className="flex items-center gap-2">
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${PILIER_COLOR[item.pilier]}`}>{item.esrs}</span>
                <span className="text-xs text-gray-700">{item.topic}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Sujets non matériels ({nonMaterial.length})</p>
          <p className="text-xs text-gray-400 mb-3">Impact limité selon les données disponibles</p>
          <div className="space-y-2">
            {nonMaterial.map(item => (
              <div key={item.esrs} className="flex items-center gap-2">
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${PILIER_COLOR[item.pilier]}`}>{item.esrs}</span>
                <span className="text-xs text-gray-500">{item.topic}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function CsrdPage() {
  const years = useEsgYears()
  const [year, setYear] = useState(new Date().getFullYear())
  const report = useCsrdReport(year)

  const yearOptions = years.data?.length ? years.data : [year]

  const handleExport = () => {
    if (!report.data) return
    const lines = [
      `RAPPORT CSRD — ${report.data.year}`,
      `Généré le : ${new Date(report.data.generatedAt).toLocaleString('fr-FR')}`,
      `Conformité CSRD : ${report.data.conformiteCSRD ? 'OUI' : 'NON (score < 60)'}`,
      '',
      `Score ESG Global : ${report.data.scores.global}/100`,
      `  E - Environnement : ${report.data.scores.environnement}/100`,
      `  S - Social        : ${report.data.scores.social}/100`,
      `  G - Gouvernance   : ${report.data.scores.gouvernance}/100`,
      '',
      `BILAN CARBONE (GHG Protocol)`,
      `  Scope 1 : ${report.data.co2.scope1.toFixed(2)} tCO2e`,
      `  Scope 2 : ${report.data.co2.scope2.toFixed(2)} tCO2e`,
      `  Scope 3 : ${report.data.co2.scope3.toFixed(2)} tCO2e`,
      `  TOTAL   : ${report.data.co2.total.toFixed(2)} tCO2e`,
      '',
      'MATÉRIALITÉ ESRS',
      ...report.data.materialite.map(m => `  [${m.materiel ? 'M' : '-'}] ${m.esrs} — ${m.topic} : ${m.valeur}`),
      '',
      'RECOMMANDATIONS',
      ...report.data.recommandations.map(r => `  [${r.priorite}] (${r.pilier}) ${r.action}`),
    ].join('\n')

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `CSRD_${year}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapport CSRD</h1>
          <p className="text-sm text-gray-500">European Sustainability Reporting Standards (ESRS) — Directive CSRD 2024</p>
        </div>
        <div className="flex gap-2">
          <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={year} onChange={e => setYear(Number(e.target.value))}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {report.data && (
            <button onClick={handleExport}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Exporter TXT
            </button>
          )}
        </div>
      </div>

      {report.isError ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
          Aucune donnée pour {year} — saisissez vos indicateurs d'abord.
        </div>
      ) : report.isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">Génération du rapport…</div>
      ) : report.data && (
        <>
          {/* Conformité banner */}
          <div className={`rounded-xl p-4 ${report.data.conformiteCSRD ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{report.data.conformiteCSRD ? '✅' : '⚠️'}</span>
              <div>
                <p className={`font-semibold ${report.data.conformiteCSRD ? 'text-green-800' : 'text-red-800'}`}>
                  {report.data.conformiteCSRD ? 'Conformité CSRD atteinte' : 'Conformité CSRD insuffisante'}
                </p>
                <p className={`text-sm ${report.data.conformiteCSRD ? 'text-green-600' : 'text-red-600'}`}>
                  Score global : {report.data.scores.global}/100 — {report.data.conformiteCSRD ? 'Score ≥ 60' : 'Score < 60, des améliorations sont nécessaires'}
                </p>
              </div>
            </div>
          </div>

          {/* CO2 */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">ESRS E1 — Bilan carbone (GHG Protocol)</h2>
            <div className="grid grid-cols-4 gap-4 text-center">
              {[
                { label: 'Scope 1', value: report.data.co2.scope1, color: 'text-red-600' },
                { label: 'Scope 2', value: report.data.co2.scope2, color: 'text-orange-600' },
                { label: 'Scope 3', value: report.data.co2.scope3, color: 'text-yellow-600' },
                { label: 'Total',   value: report.data.co2.total,  color: 'text-gray-900' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className={`text-2xl font-bold ${color}`}>{value.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{label} (tCO2e)</p>
                </div>
              ))}
            </div>
          </div>

          {/* Matrice de matérialité */}
          <MaterialiteMatrix items={report.data.materialite} />

          {/* ESRS table */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-700">Analyse ESRS — Sujets de durabilité</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">ESRS</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Sujet</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Pilier</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Matériel</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Valeur</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.data.materialite.map(item => (
                  <tr key={item.esrs} className={`hover:bg-gray-50 ${item.materiel ? '' : 'opacity-60'}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-gray-600">{item.esrs}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.topic}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PILIER_COLOR[item.pilier]}`}>
                        {item.pilier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.materiel
                        ? <span className="text-xs font-semibold text-red-600">Oui</span>
                        : <span className="text-xs text-gray-400">Non</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-gray-700">{item.valeur}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{item.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recommandations */}
          {report.data.recommandations.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">Plan d'amélioration recommandé</h2>
              <div className="space-y-2">
                {report.data.recommandations.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                    <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${PRIO_COLOR[r.priorite] ?? 'bg-gray-100 text-gray-600'}`}>
                      {r.priorite}
                    </span>
                    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium shrink-0 mt-0.5 bg-gray-200 text-gray-600">{r.pilier}</span>
                    <p className="text-sm text-gray-700">{r.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
