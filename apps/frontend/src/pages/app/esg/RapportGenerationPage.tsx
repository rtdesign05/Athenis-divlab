import { useState, useEffect } from 'react'
import { useCsrdReport, useEsgScore, useEsgYears } from '@/hooks/useEsg'
import { PdfButton } from '@/shared/components/ui/PdfButton'
import { usePdf } from '@/shared/hooks/usePdf'

function StatusBadge({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="text-gray-300">—</span>
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
      {ok ? '✓' : '○'}
    </span>
  )
}

function NullVal({ val, unit = '' }: { val: number | null | undefined; unit?: string }) {
  if (val == null) return <span className="text-gray-300 text-xs">Non renseigné</span>
  return <span>{val}{unit && <span className="ml-1 text-xs text-gray-400">{unit}</span>}</span>
}

function BoolVal({ val }: { val: boolean | null | undefined }) {
  if (val == null) return <span className="text-gray-300 text-xs">Non renseigné</span>
  return <span className={val ? 'text-green-700' : 'text-red-600'}>{val ? 'Oui' : 'Non'}</span>
}

export function RapportGenerationPage() {
  const years = useEsgYears()
  const [year, setYear] = useState(new Date().getFullYear())
  const report = useCsrdReport(year)
  const score = useEsgScore(year)
  const { downloadEsgRapport } = usePdf()

  const yearOptions = years.data?.length ? years.data : [year]

  useEffect(() => {
    if (years.data?.length) {
      const sorted = [...years.data].sort((a, b) => b - a)
      setYear(prev => years.data!.includes(prev) ? prev : (sorted[0] ?? prev))
    }
  }, [years.data])

  const isLoading = report.isLoading || score.isLoading
  const rData = report.data
  const sData = score.data

  const ind = sData?.indicators
  const co2 = rData?.co2 ?? sData?.co2
  const scores = rData?.scores

  const energyMwh = ind?.energyKwh != null ? +(ind.energyKwh / 1000).toFixed(1) : null
  const wasteTonnes = ind?.wasteKg != null ? +(ind.wasteKg / 1000).toFixed(2) : null

  // Auto-generated key findings
  const findings: string[] = []
  if (scores?.social != null) {
    if (scores.social >= 50) findings.push(`Votre score social ${scores.social}/100 dépasse la médiane sectorielle`)
    else findings.push(`Votre score social ${scores.social}/100 est en-dessous de la médiane sectorielle (50)`)
  }
  if (co2?.total != null && co2.total > 0) {
    findings.push(`Votre bilan carbone total est ${co2.total.toFixed(2)} tCO₂e`)
  }
  if (ind?.renewableRatio != null) {
    findings.push(`Part d'énergies renouvelables : ${ind.renewableRatio}%${ind.renewableRatio >= 50 ? ' — objectif atteint' : ' — objectif 50%'}`)
  }
  if (findings.length === 0) {
    findings.push('Complétez vos indicateurs dans Saisie données pour obtenir des conclusions automatiques.')
  }

  const today = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Génération du rapport ESG</h1>
          <p className="mt-1 text-sm text-gray-500">Rapport de durabilité complet prêt à l'impression — exercice {year}</p>
        </div>
        <div className="flex gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <PdfButton
            onDownload={() => downloadEsgRapport({ year, referentiel: 'CSRD' })}
            label="Télécharger PDF"
            className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700"
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-forest-500 border-t-transparent" />
          <span className="ml-3 text-sm text-gray-400">Génération du rapport…</span>
        </div>
      )}

      {/* Report preview */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">

        {/* Report header */}
        <div className="bg-forest-900 px-8 py-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">Rapport de Durabilité ESG {year}</h2>
              <p className="mt-1 text-forest-200 text-sm">Référentiel CSRD / ESRS 2024</p>
            </div>
            <div className="text-right text-sm text-forest-200">
              <p>Généré le {today}</p>
              <p className="mt-1">Athenis — Module ESG</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg bg-forest-800 px-3 py-2">
              <p className="text-forest-300 text-xs">Entreprise</p>
              <p className="font-medium mt-0.5">— Votre entreprise —</p>
            </div>
            <div className="rounded-lg bg-forest-800 px-3 py-2">
              <p className="text-forest-300 text-xs">Exercice</p>
              <p className="font-medium mt-0.5">{year}</p>
            </div>
            <div className="rounded-lg bg-forest-800 px-3 py-2">
              <p className="text-forest-300 text-xs">Statut</p>
              <p className="font-medium mt-0.5">
                {rData ? (rData.conformiteCSRD ? '✅ Conforme CSRD' : '⚠️ Non-conforme') : '— En attente'}
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">

          {/* Section 1 — Résumé exécutif */}
          <section className="px-8 py-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">1. Résumé exécutif</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className={`rounded-xl border p-4 text-center ${
                scores?.global != null && scores.global >= 70 ? 'border-green-200 bg-green-50' :
                scores?.global != null && scores.global >= 40 ? 'border-amber-200 bg-amber-50' :
                'border-gray-200 bg-gray-50'
              }`}>
                <p className="text-xs text-gray-500 mb-1">Score ESG Global</p>
                <p className={`text-4xl font-bold ${
                  scores?.global != null && scores.global >= 70 ? 'text-green-700' :
                  scores?.global != null && scores.global >= 40 ? 'text-amber-700' :
                  'text-gray-400'
                }`}>{scores?.global ?? '—'}<span className="text-base font-normal text-gray-400">/100</span></p>
              </div>
              <div className={`rounded-xl border p-4 text-center ${rData?.conformiteCSRD ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <p className="text-xs text-gray-500 mb-1">Conformité CSRD</p>
                <p className={`text-2xl font-bold mt-2 ${rData?.conformiteCSRD ? 'text-green-700' : 'text-red-600'}`}>
                  {rData ? (rData.conformiteCSRD ? '✅ Conforme' : '❌ Non-conforme') : <span className="text-gray-300 text-base">—</span>}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Complétude</p>
                <p className="text-4xl font-bold text-gray-700">
                  {rData ? `${Math.round((rData.materialite.filter(m => m.valeur && m.valeur !== '—').length / Math.max(rData.materialite.length, 1)) * 100)}%` : <span className="text-gray-300">—</span>}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Points clés</p>
              <ul className="space-y-1">
                {findings.map((f, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-forest-600 mt-0.5">•</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Section E — Environnement */}
          <section className="px-8 py-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              <span className="mr-2 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">E</span>
              2. Section Environnement
            </h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr className="text-xs font-semibold text-gray-500">
                  <th className="px-4 py-2.5">Indicateur</th>
                  <th className="px-4 py-2.5 text-right">Valeur</th>
                  <th className="px-4 py-2.5 text-right">Objectif</th>
                  <th className="px-4 py-2.5 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700">CO₂ Scope 1 (direct)</td>
                  <td className="px-4 py-2.5 text-right font-medium"><NullVal val={co2?.scope1} unit="tCO₂e" /></td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">≤ 35 tCO₂e</td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge ok={co2?.scope1 != null ? co2.scope1 <= 35 : null} /></td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700">CO₂ Scope 2 (électricité)</td>
                  <td className="px-4 py-2.5 text-right font-medium"><NullVal val={co2?.scope2} unit="tCO₂e" /></td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">≤ 20 tCO₂e</td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge ok={co2?.scope2 != null ? co2.scope2 <= 20 : null} /></td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700">CO₂ Scope 3 (indirect)</td>
                  <td className="px-4 py-2.5 text-right font-medium"><NullVal val={co2?.scope3} unit="tCO₂e" /></td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">≤ 140 tCO₂e</td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge ok={co2?.scope3 != null ? co2.scope3 <= 140 : null} /></td>
                </tr>
                <tr className="bg-green-50/30 hover:bg-green-50/50">
                  <td className="px-4 py-2.5 text-gray-700 font-medium">CO₂ Total</td>
                  <td className="px-4 py-2.5 text-right font-bold text-forest-700"><NullVal val={co2?.total} unit="tCO₂e" /></td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">≤ 195 tCO₂e</td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge ok={co2?.total != null ? co2.total <= 195 : null} /></td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700">Consommation énergie</td>
                  <td className="px-4 py-2.5 text-right font-medium"><NullVal val={energyMwh} unit="MWh" /></td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">≤ 220 MWh</td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge ok={energyMwh != null ? energyMwh <= 220 : null} /></td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700">Part renouvelable</td>
                  <td className="px-4 py-2.5 text-right font-medium"><NullVal val={ind?.renewableRatio} unit="%" /></td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">≥ 50%</td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge ok={ind?.renewableRatio != null ? ind.renewableRatio >= 50 : null} /></td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700">Déchets totaux</td>
                  <td className="px-4 py-2.5 text-right font-medium"><NullVal val={wasteTonnes} unit="tonnes" /></td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">≤ 10 t</td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge ok={wasteTonnes != null ? wasteTonnes <= 10 : null} /></td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Section S — Social */}
          <section className="px-8 py-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              <span className="mr-2 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">S</span>
              3. Section Social
            </h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr className="text-xs font-semibold text-gray-500">
                  <th className="px-4 py-2.5">Indicateur</th>
                  <th className="px-4 py-2.5 text-right">Valeur</th>
                  <th className="px-4 py-2.5 text-right">Objectif</th>
                  <th className="px-4 py-2.5 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700">Écart de salaire F/H (ESRS S1-16)</td>
                  <td className="px-4 py-2.5 text-right font-medium"><NullVal val={ind?.genderPayGap} unit="%" /></td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">≤ 5%</td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge ok={ind?.genderPayGap != null ? ind.genderPayGap <= 5 : null} /></td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700">Heures de formation / employé (ESRS S1-13)</td>
                  <td className="px-4 py-2.5 text-right font-medium"><NullVal val={ind?.trainingHours} unit="h/an" /></td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">≥ 30 h</td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge ok={ind?.trainingHours != null ? ind.trainingHours >= 30 : null} /></td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700">Taux d'absentéisme (ESRS S1-13)</td>
                  <td className="px-4 py-2.5 text-right font-medium"><NullVal val={ind?.absenteeismRate} unit="%" /></td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">≤ 3%</td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge ok={ind?.absenteeismRate != null ? ind.absenteeismRate <= 3 : null} /></td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700">Accidents du travail (ESRS S1-13)</td>
                  <td className="px-4 py-2.5 text-right font-medium"><NullVal val={ind?.workplaceAccidents} unit="cas" /></td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">0 cas</td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge ok={ind?.workplaceAccidents != null ? ind.workplaceAccidents === 0 : null} /></td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Section G — Gouvernance */}
          <section className="px-8 py-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              <span className="mr-2 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">G</span>
              4. Section Gouvernance
            </h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr className="text-xs font-semibold text-gray-500">
                  <th className="px-4 py-2.5">Indicateur</th>
                  <th className="px-4 py-2.5 text-right">Valeur</th>
                  <th className="px-4 py-2.5 text-right">Objectif</th>
                  <th className="px-4 py-2.5 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700">Femmes au conseil d'administration (ESRS G1)</td>
                  <td className="px-4 py-2.5 text-right font-medium"><NullVal val={ind?.boardFemaleRatio} unit="%" /></td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">≥ 40%</td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge ok={ind?.boardFemaleRatio != null ? ind.boardFemaleRatio >= 40 : null} /></td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700">Code d'éthique (ESRS G1)</td>
                  <td className="px-4 py-2.5 text-right font-medium"><BoolVal val={ind?.hasEthicsCode} /></td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">Oui</td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge ok={ind?.hasEthicsCode != null ? ind.hasEthicsCode : null} /></td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700">Politique anti-corruption (ESRS G1)</td>
                  <td className="px-4 py-2.5 text-right font-medium"><BoolVal val={ind?.hasAnticorruption} /></td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">Oui</td>
                  <td className="px-4 py-2.5 text-center"><StatusBadge ok={ind?.hasAnticorruption != null ? ind.hasAnticorruption : null} /></td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Analyse de matérialité */}
          {rData?.materialite && rData.materialite.length > 0 && (
            <section className="px-8 py-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">5. Analyse de matérialité</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-red-700 mb-2">Sujets matériels</p>
                  <div className="space-y-1">
                    {rData.materialite.filter(m => m.materiel).map((m, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5">
                        <span className="rounded bg-forest-100 px-1.5 py-0.5 text-xs font-mono text-forest-800">{m.esrs}</span>
                        <span className="text-xs text-gray-700">{m.topic}</span>
                      </div>
                    ))}
                    {rData.materialite.filter(m => m.materiel).length === 0 && (
                      <p className="text-xs text-gray-400">Aucun sujet matériel identifié</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Sujets non matériels</p>
                  <div className="space-y-1">
                    {rData.materialite.filter(m => !m.materiel).map((m, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5">
                        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-mono text-gray-600">{m.esrs}</span>
                        <span className="text-xs text-gray-500">{m.topic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Plan d'amélioration */}
          {rData?.recommandations && rData.recommandations.length > 0 && (
            <section className="px-8 py-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">6. Plan d'amélioration</h3>
              <div className="space-y-2">
                {rData.recommandations.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.pilier === 'E' ? 'bg-green-100 text-green-700' :
                      r.pilier === 'S' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>{r.pilier}</span>
                    <p className="text-sm text-gray-700 flex-1">{r.action}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.priorite === 'ÉLEVÉ' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>{r.priorite}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 7 — Périmètre de reporting */}
          <section className="px-8 py-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">7. Périmètre et méthodologie de reporting</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">📐 Périmètre organisationnel</p>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>• Périmètre : entité juridique principale (contrôle opérationnel)</li>
                  <li>• Période de reporting : 1er janvier — 31 décembre {year}</li>
                  <li>• Consolidation : selon le protocole GHG Corporate Standard</li>
                </ul>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">🔬 Sources & méthodologie</p>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>• CO₂ : Facteurs d'émission ADEME Base Carbone® & AIE</li>
                  <li>• RH : Module Ressources Humaines (registre du personnel)</li>
                  <li>• Énergie : Compteurs et factures fournisseurs</li>
                  <li>• Déchets : Bordereaux de suivi déchets (BSD)</li>
                </ul>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">📋 Référentiel ESRS appliqué</p>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>• <span className="font-mono bg-gray-200 px-1 rounded text-xs">ESRS 1</span> Exigences générales</li>
                  <li>• <span className="font-mono bg-gray-200 px-1 rounded text-xs">ESRS 2</span> Informations générales</li>
                  <li>• <span className="font-mono bg-gray-200 px-1 rounded text-xs">ESRS E1</span> Changement climatique (GES)</li>
                  <li>• <span className="font-mono bg-gray-200 px-1 rounded text-xs">ESRS S1</span> Personnel (S1-13, S1-16)</li>
                  <li>• <span className="font-mono bg-gray-200 px-1 rounded text-xs">ESRS G1</span> Conduite des affaires</li>
                </ul>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">⚠️ Limites & omissions</p>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>• ESRS E3 (Eau) : indicateurs non encore collectés</li>
                  <li>• ESRS S2 (Chaîne de valeur) : évaluation en cours</li>
                  <li>• Les données Scope 3 sont des estimations partielles</li>
                  <li>• Vérification par OTI recommandée (Art. L.225-102-1)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 8 — Déclaration de conformité */}
          <section className="px-8 py-6 border-t border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4">8. Déclaration de conformité CSRD</h3>
            <div className={`rounded-xl border p-4 flex items-center gap-4 ${rData?.conformiteCSRD ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
              <span className="text-3xl">{rData?.conformiteCSRD ? '✅' : '⚠️'}</span>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${rData?.conformiteCSRD ? 'text-green-800' : 'text-amber-800'}`}>
                  {rData?.conformiteCSRD
                    ? `Conforme CSRD — Score global ${rData.scores.global}/100 (seuil ≥ 60 atteint)`
                    : `Non-conforme CSRD — Score global ${rData?.scores.global ?? '—'}/100 (seuil ≥ 60 non atteint)`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Directive 2022/2464/UE (CSRD) · Règlement délégué (UE) 2023/2772 (ESRS) · Application à partir de l'exercice 2024
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500">Directeur Général</p>
                <p className="text-xs text-gray-400 mt-1">Date : _______________</p>
                <p className="text-xs text-gray-400 mt-6">Signature : _______________</p>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500">Responsable RSE</p>
                <p className="text-xs text-gray-400 mt-1">Date : _______________</p>
                <p className="text-xs text-gray-400 mt-6">Signature : _______________</p>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500">OTI (si applicable)</p>
                <p className="text-xs text-gray-400 mt-1">Date : _______________</p>
                <p className="text-xs text-gray-400 mt-6">Signature : _______________</p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="bg-forest-900 px-8 py-4 flex items-center justify-between">
            <p className="text-xs text-forest-300">
              Rapport de durabilité CSRD/ESRS {year} — Athenis ESG
            </p>
            <p className="text-xs text-forest-400">
              Généré le {today} · Référentiel ESRS 2024 (Règlement (UE) 2023/2772)
            </p>
          </div>
        </div>
      </div>

      {!isLoading && !rData && !sData && (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
          <p className="font-medium">Aucune donnée ESG pour {year}</p>
          <p className="text-xs mt-1">Saisissez vos indicateurs dans{' '}
            <a href="/app/esg/scope" className="text-forest-700 hover:underline font-medium">Saisie données</a>.
          </p>
        </div>
      )}
    </div>
  )
}
