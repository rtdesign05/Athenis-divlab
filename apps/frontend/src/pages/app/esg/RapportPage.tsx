import { useState, useEffect } from 'react'
import { useCsrdReport, useEsgYears } from '@/hooks/useEsg'
import { PdfButton } from '@/shared/components/ui/PdfButton'
import { usePdf } from '@/shared/hooks/usePdf'
import type { CsrdReport } from '@/services/esgApi'

type Referentiel = 'CSRD' | 'GRI' | 'DPEF'

interface Section { esrs: string; titre: string; statut: 'complet' | 'partiel' | 'manquant'; pct: number }

function buildSections(report: CsrdReport): Section[] {
  const ind = report.materialite
  const co2  = report.co2

  const hasE1   = co2.total > 0 || ind.some(m => m.esrs === 'E1' && m.materiel)
  const hasE5   = ind.some(m => m.esrs === 'E5' && m.valeur !== '—')
  const hasS1   = ind.some(m => m.esrs === 'S1-1')
  const hasS116 = ind.some(m => m.esrs === 'S1-16' && m.valeur !== '—')
  const hasS113 = ind.some(m => m.esrs === 'S1-13' && m.valeur !== '—')
  const hasG1   = ind.some(m => m.esrs === 'G1')

  // E1 completeness: up to 4 sub-indicators (scope1, scope2, scope3, energy)
  const e1Fields = [co2.scope1 > 0, co2.scope2 > 0, co2.scope3 > 0, hasE1].filter(Boolean).length
  const e1Pct = Math.round((e1Fields / 4) * 100)

  // S1 completeness: 3 indicators (pay gap, training, absenteeism)
  const s1Fields = [hasS116, hasS113, hasS1].filter(Boolean).length
  const s1Pct = Math.round((s1Fields / 3) * 100)

  // G1 completeness from scores
  const g1Pct = hasG1 ? Math.round(report.scores.gouvernance) : 0

  return [
    { esrs: 'ESRS 1',  titre: 'Exigences générales',                 statut: 'complet', pct: 100 },
    { esrs: 'ESRS 2',  titre: 'Informations générales',               statut: 'complet', pct: 100 },
    { esrs: 'ESRS E1', titre: 'Changement climatique',                statut: e1Pct >= 75 ? 'complet' : e1Pct >= 25 ? 'partiel' : 'manquant', pct: Math.max(e1Pct, hasE1 ? 10 : 0) },
    { esrs: 'ESRS E3', titre: 'Ressources en eau',                    statut: 'manquant', pct: 0 },
    { esrs: 'ESRS E5', titre: 'Ressources et économie circulaire',    statut: hasE5 ? 'partiel' : 'manquant', pct: hasE5 ? 60 : 0 },
    { esrs: 'ESRS S1', titre: 'Personnel de l\'entreprise',           statut: s1Pct >= 80 ? 'complet' : s1Pct >= 30 ? 'partiel' : 'manquant', pct: Math.max(s1Pct, hasS1 ? 20 : 0) },
    { esrs: 'ESRS S2', titre: 'Travailleurs chaîne de valeur',        statut: 'manquant', pct: 0 },
    { esrs: 'ESRS G1', titre: 'Conduite des affaires',                statut: g1Pct >= 70 ? 'complet' : g1Pct >= 30 ? 'partiel' : 'manquant', pct: g1Pct },
  ]
}

const STATUS_CLS: Record<string, string> = {
  complet:  'bg-green-100 text-green-700',
  partiel:  'bg-amber-100 text-amber-700',
  manquant: 'bg-red-100 text-red-700',
}

export function RapportPage() {
  const years = useEsgYears()
  const [year, setYear] = useState(new Date().getFullYear() - 1)
  const [referentiel, setReferentiel] = useState<Referentiel>('CSRD')
  const report = useCsrdReport(year)
  const { downloadEsgRapport } = usePdf()

  const yearOptions = years.data?.length ? years.data : [year]

  useEffect(() => {
    if (years.data?.length) {
      const sorted = [...years.data].sort((a, b) => b - a)
      setYear(prev => years.data!.includes(prev) ? prev : (sorted[0] ?? prev))
    }
  }, [years.data])

  const sections: Section[] = report.data
    ? buildSections(report.data)
    : [
        { esrs: 'ESRS 1',  titre: 'Exigences générales',              statut: 'complet',  pct: 100 },
        { esrs: 'ESRS 2',  titre: 'Informations générales',            statut: 'complet',  pct: 100 },
        { esrs: 'ESRS E1', titre: 'Changement climatique',             statut: 'manquant', pct: 0   },
        { esrs: 'ESRS E3', titre: 'Ressources en eau',                 statut: 'manquant', pct: 0   },
        { esrs: 'ESRS E5', titre: 'Ressources et économie circulaire', statut: 'manquant', pct: 0   },
        { esrs: 'ESRS S1', titre: 'Personnel de l\'entreprise',        statut: 'manquant', pct: 0   },
        { esrs: 'ESRS S2', titre: 'Travailleurs chaîne de valeur',     statut: 'manquant', pct: 0   },
        { esrs: 'ESRS G1', titre: 'Conduite des affaires',             statut: 'manquant', pct: 0   },
      ]

  const overall = Math.round(sections.reduce((s, r) => s + r.pct, 0) / sections.length)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Rapport ESG</h1>
          <p className="mt-1 text-sm text-gray-500">Rapport de durabilité — exercice {year}</p>
        </div>
        <div className="flex gap-2">
          <select
            value={referentiel}
            onChange={(e) => setReferentiel(e.target.value as Referentiel)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            <option value="CSRD">CSRD / ESRS</option>
            <option value="GRI">GRI Standards</option>
            <option value="DPEF">DPEF</option>
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <PdfButton
            onDownload={() => downloadEsgRapport({ year, referentiel })}
            label="Exporter PDF"
            className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors disabled:opacity-60"
          />
        </div>
      </div>

      {/* Conformité CSRD */}
      {report.data && (
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${report.data.conformiteCSRD ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <span className="text-2xl">{report.data.conformiteCSRD ? '✅' : '⚠️'}</span>
          <div>
            <p className={`text-sm font-semibold ${report.data.conformiteCSRD ? 'text-green-800' : 'text-amber-800'}`}>
              {report.data.conformiteCSRD ? 'Conforme CSRD' : 'Non-conforme CSRD'}
            </p>
            <p className="text-xs text-gray-500">
              Score global {report.data.scores.global}/100
              {report.data.conformiteCSRD ? ' — seuil de conformité atteint (≥ 60)' : ' — seuil de conformité non atteint (< 60)'}
            </p>
          </div>
        </div>
      )}

      {/* Progression globale */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Complétude du rapport {referentiel}</p>
          <span className={`text-lg font-bold ${overall >= 80 ? 'text-green-600' : overall >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{overall}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-forest-500 transition-all" style={{ width: `${overall}%` }} />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {sections.filter((s) => s.statut === 'complet').length} sections complètes ·{' '}
          {sections.filter((s) => s.statut === 'partiel').length} partielles ·{' '}
          {sections.filter((s) => s.statut === 'manquant').length} manquantes
        </p>
      </div>

      {/* Sections ESRS */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Sections du rapport {referentiel}</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {sections.map((s, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <div className="w-24 shrink-0">
                <span className="rounded bg-forest-100 px-2 py-0.5 text-xs font-mono font-medium text-forest-800">{s.esrs}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">{s.titre}</p>
                <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all ${s.pct >= 80 ? 'bg-green-500' : s.pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">{s.pct}%</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[s.statut]}`}>
                  {s.statut === 'complet' ? 'Complet' : s.statut === 'partiel' ? 'Partiel' : 'Manquant'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommandations */}
      {report.data?.recommandations && report.data.recommandations.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Recommandations prioritaires</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {report.data.recommandations.map((r, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3">
                <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.pilier === 'E' ? 'bg-green-100 text-green-700' :
                  r.pilier === 'S' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'
                }`}>{r.pilier}</span>
                <p className="text-sm text-gray-700">{r.action}</p>
                <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.priorite === 'ÉLEVÉ' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>{r.priorite}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matrice de matérialité */}
      {report.data?.materialite && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Matrice de matérialité ESRS</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">ESRS</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Sujet</th>
                  <th className="px-5 py-3 text-center font-medium text-gray-500">Pilier</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Valeur</th>
                  <th className="px-5 py-3 text-center font-medium text-gray-500">Matériel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.data.materialite.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-5 py-2.5">
                      <span className="rounded bg-forest-100 px-1.5 py-0.5 text-xs font-mono text-forest-800">{m.esrs}</span>
                    </td>
                    <td className="px-5 py-2.5 text-gray-700">{m.topic}</td>
                    <td className="px-5 py-2.5 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.pilier === 'E' ? 'bg-green-100 text-green-700' :
                        m.pilier === 'S' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>{m.pilier}</span>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-gray-500">{m.valeur}</td>
                    <td className="px-5 py-2.5 text-center">
                      <span className={`text-sm font-medium ${m.materiel ? 'text-red-600' : 'text-green-600'}`}>
                        {m.materiel ? '⚠ Matériel' : '✓ Non-matériel'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report.isLoading && (
        <p className="text-center text-sm text-gray-400">Chargement des données du rapport…</p>
      )}

      {(report.isError || report.data === null) && (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
          <p className="font-medium">Aucune donnée pour {year}</p>
          <p className="text-xs mt-1">Saisissez vos indicateurs dans <strong>Saisie données</strong> pour générer le rapport.</p>
        </div>
      )}
    </div>
  )
}
