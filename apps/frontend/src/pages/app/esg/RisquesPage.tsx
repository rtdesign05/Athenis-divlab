import { useState, useEffect } from 'react'
import { useEsgScore, useEsgYears } from '@/hooks/useEsg'
import type { EsgScoreResult } from '@/services/esgApi'

interface Risk {
  id:          number
  titre:       string
  categorie:   string
  probabilite: 1 | 2 | 3 | 4 | 5
  impact:      1 | 2 | 3 | 4 | 5
  mitigation:  string
  statut:      'identified' | 'mitigating' | 'resolved'
  source:      'real' | 'static'
}

const CAT_COLORS: Record<string, string> = {
  'Environnemental': 'bg-green-100 text-green-700',
  'Réglementaire':   'bg-blue-100 text-blue-700',
  'Social':          'bg-purple-100 text-purple-700',
  'Gouvernance':     'bg-orange-100 text-orange-700',
  'Chaîne valeur':   'bg-yellow-100 text-yellow-700',
  'Réputationnel':   'bg-pink-100 text-pink-700',
}

const STATUT: Record<string, string> = { identified: 'Identifié', mitigating: 'En cours', resolved: 'Résolu' }
const STATUT_CLS: Record<string, string> = {
  identified: 'bg-red-100 text-red-700',
  mitigating: 'bg-amber-100 text-amber-700',
  resolved:   'bg-green-100 text-green-700',
}

const LEVEL = (n: number) => n <= 2 ? 'bg-green-200' : n === 3 ? 'bg-amber-200' : 'bg-red-300'

function deriveRisks(score: EsgScoreResult): Risk[] {
  const risks: Risk[] = []
  const ind = score.indicators
  let id = 1

  // Environmental risks from real data
  if (score.co2.total > 100)
    risks.push({ id: id++, titre: `Émissions GES élevées (${score.co2.total.toFixed(0)} tCO₂e)`, categorie: 'Environnemental', probabilite: 4, impact: 5, mitigation: 'Plan de décarbonation — réduction Scope 1 et 2 en priorité', statut: 'identified', source: 'real' })
  else if (score.co2.total > 50)
    risks.push({ id: id++, titre: `Émissions GES significatives (${score.co2.total.toFixed(0)} tCO₂e)`, categorie: 'Environnemental', probabilite: 3, impact: 3, mitigation: 'Suivi mensuel + contrats énergie verte', statut: 'mitigating', source: 'real' })

  if ((ind.energyKwh ?? 0) > 200000)
    risks.push({ id: id++, titre: `Consommation énergétique élevée (${((ind.energyKwh ?? 0) / 1000).toFixed(0)} MWh)`, categorie: 'Environnemental', probabilite: 4, impact: 4, mitigation: 'Audit énergétique + panneaux solaires + contrats énergie long terme', statut: 'mitigating', source: 'real' })

  if ((ind.renewableRatio ?? 100) < 20)
    risks.push({ id: id++, titre: 'Faible part d\'énergies renouvelables', categorie: 'Environnemental', probabilite: 3, impact: 3, mitigation: 'Achat certificats garantie d\'origine + PPAs renouvelables', statut: 'identified', source: 'real' })

  // CSRD regulatory risk
  if (score.scores.global < 60)
    risks.push({ id: id++, titre: 'Non-conformité CSRD (score < 60)', categorie: 'Réglementaire', probabilite: 3, impact: 5, mitigation: 'Mise en place reporting ESG + auditeur externe CSRD', statut: 'mitigating', source: 'real' })

  // Social risks from real data
  if ((ind.genderPayGap ?? 0) > 10)
    risks.push({ id: id++, titre: `Écart salarial H/F élevé (${ind.genderPayGap}%)`, categorie: 'Social', probabilite: 3, impact: 4, mitigation: 'Plan d\'égalité salariale — Loi Pénicaud (cible ≤ 5%)', statut: 'identified', source: 'real' })
  else if ((ind.genderPayGap ?? 0) > 5)
    risks.push({ id: id++, titre: `Écart salarial H/F à surveiller (${ind.genderPayGap}%)`, categorie: 'Social', probabilite: 2, impact: 3, mitigation: 'Index égalité en cours — actions correctives prévues', statut: 'mitigating', source: 'real' })

  if ((ind.trainingHours ?? 99) < 20)
    risks.push({ id: id++, titre: `Formation insuffisante (${ind.trainingHours ?? 0} h/salarié/an)`, categorie: 'Social', probabilite: 3, impact: 3, mitigation: 'Plan de formation renforcé — cible ≥ 24 h/an (ESRS S1-13)', statut: 'identified', source: 'real' })

  if ((ind.absenteeismRate ?? 0) > 5)
    risks.push({ id: id++, titre: `Taux d'absentéisme élevé (${ind.absenteeismRate}%)`, categorie: 'Social', probabilite: 3, impact: 3, mitigation: 'Programme bien-être + amélioration conditions de travail', statut: 'mitigating', source: 'real' })

  // Governance risks from real data
  if (!ind.hasEthicsCode)
    risks.push({ id: id++, titre: 'Absence de code de conduite éthique', categorie: 'Gouvernance', probabilite: 2, impact: 5, mitigation: 'Rédaction et publication du code éthique (obligation CSRD G1)', statut: 'identified', source: 'real' })

  if (!ind.hasAnticorruption)
    risks.push({ id: id++, titre: 'Absence de politique anti-corruption', categorie: 'Gouvernance', probabilite: 2, impact: 4, mitigation: 'Dispositif Loi Sapin II — formation et procédures internes', statut: 'identified', source: 'real' })

  if ((ind.boardFemaleRatio ?? 40) < 30)
    risks.push({ id: id++, titre: `Faible parité au conseil d'administration (${ind.boardFemaleRatio ?? 0}%)`, categorie: 'Gouvernance', probabilite: 2, impact: 3, mitigation: 'Plan de féminisation du CA — cible ≥ 40% (Loi Copé-Zimmermann)', statut: 'identified', source: 'real' })

  // Always include a data leak risk (static, always relevant)
  risks.push({ id: id++, titre: 'Fuite de données clients / fournisseurs', categorie: 'Gouvernance', probabilite: 2, impact: 5, mitigation: 'Chiffrement + audits sécurité trimestriels + RGPD', statut: 'mitigating', source: 'static' })

  // If almost no risks, add supply chain risk
  if (risks.length <= 3)
    risks.push({ id: id++, titre: 'Pénurie / instabilité chaîne d\'approvisionnement', categorie: 'Chaîne valeur', probabilite: 3, impact: 3, mitigation: 'Multi-sourcing fournisseurs + stocks tampon', statut: 'mitigating', source: 'static' })

  return risks
}

export function RisquesPage() {
  const years = useEsgYears()
  const [year, setYear] = useState(new Date().getFullYear())
  const score = useEsgScore(year)
  const [selected, setSelected] = useState<Risk | null>(null)

  const yearOptions = years.data?.length ? years.data : [year]

  useEffect(() => {
    if (years.data?.length) {
      const sorted = [...years.data].sort((a, b) => b - a)
      setYear(prev => years.data!.includes(prev) ? prev : (sorted[0] ?? prev))
    }
  }, [years.data])

  // Build risk list from real data or fallback to static list
  const RISKS: Risk[] = score.data
    ? deriveRisks(score.data)
    : [
        { id: 1, titre: 'Hausse prix énergie > 30%',      categorie: 'Environnemental', probabilite: 4, impact: 4, mitigation: 'Contrats énergie long terme + panneaux solaires',       statut: 'mitigating', source: 'static' },
        { id: 2, titre: 'Non-conformité CSRD',             categorie: 'Réglementaire',  probabilite: 2, impact: 5, mitigation: 'Mise en place reporting ESG + auditeur externe',         statut: 'mitigating', source: 'static' },
        { id: 3, titre: 'Rotation élevée talents clés',    categorie: 'Social',         probabilite: 3, impact: 4, mitigation: 'Plan rétention + revalorisations salariales',           statut: 'mitigating', source: 'static' },
        { id: 4, titre: 'Fuite données clients',           categorie: 'Gouvernance',    probabilite: 2, impact: 5, mitigation: 'Chiffrement données + audits sécurité trimestriels',    statut: 'identified', source: 'static' },
        { id: 5, titre: 'Pénurie matières premières',      categorie: 'Chaîne valeur',  probabilite: 3, impact: 3, mitigation: 'Multi-sourcing fournisseurs',                           statut: 'resolved',   source: 'static' },
        { id: 6, titre: 'Atteinte réputation ESG',         categorie: 'Réputationnel',  probabilite: 2, impact: 3, mitigation: 'Communication transparente + rapport CSRD annuel',      statut: 'identified', source: 'static' },
      ]

  const heatmap = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => {
      const prob = (5 - row) as 1|2|3|4|5
      const imp  = (col + 1) as 1|2|3|4|5
      const risks = RISKS.filter((r) => r.probabilite === prob && r.impact === imp)
      return { prob, imp, risks, score: prob * imp }
    })
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Risques ESG</h1>
          <p className="mt-1 text-sm text-gray-500">
            {score.data ? `Risques dérivés des données réelles — ${year}` : 'Heatmap probabilité × impact'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {score.isLoading && <span className="text-xs text-gray-400">Calcul…</span>}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Score summary */}
      {score.data && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Score Global', value: score.data.scores.global, color: 'text-gray-900' },
            { label: 'Environnement', value: score.data.scores.environnement, color: 'text-green-700' },
            { label: 'Social', value: score.data.scores.social, color: 'text-blue-700' },
            { label: 'Gouvernance', value: score.data.scores.gouvernance, color: 'text-purple-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}<span className="text-sm text-gray-400">/100</span></p>
            </div>
          ))}
        </div>
      )}

      {/* Heatmap */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Heatmap des risques ({RISKS.length} identifiés)</h2>
        <div className="flex gap-4">
          <div className="flex flex-col justify-between text-[10px] text-gray-400 py-1 pr-1">
            {['Certain', 'Probable', 'Possible', 'Peu probable', 'Rare'].map((l) => (
              <span key={l} className="leading-none">{l}</span>
            ))}
          </div>
          <div className="flex-1">
            <div className="grid grid-rows-5 gap-1">
              {heatmap.map((row, ri) => (
                <div key={ri} className="grid grid-cols-5 gap-1">
                  {row.map((cell, ci) => (
                    <div
                      key={ci}
                      className={`${LEVEL(cell.score)} rounded-md flex items-center justify-center min-h-10 cursor-pointer transition-opacity hover:opacity-80`}
                      onClick={() => cell.risks[0] && setSelected(cell.risks[0])}
                    >
                      {cell.risks.length > 0 && (
                        <span className="text-xs font-bold text-gray-700">{cell.risks.length}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-5 gap-1 text-[10px] text-gray-400 text-center">
              {['Mineur', 'Modéré', 'Significatif', 'Majeur', 'Catastrophique'].map((l) => (
                <span key={l}>{l}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-green-200" />Faible</span>
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-amber-200" />Modéré</span>
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-red-300" />Élevé</span>
        </div>
      </div>

      {/* Liste */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Registre des risques ({RISKS.length})</h2>
          {!score.data && <span className="text-xs text-gray-400">Saisissez vos données ESG pour un registre dynamique</span>}
        </div>
        <div className="divide-y divide-gray-50">
          {RISKS.map((r) => (
            <div key={r.id} className="px-5 py-3 hover:bg-gray-50/50 cursor-pointer" onClick={() => setSelected(r)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{r.titre}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CAT_COLORS[r.categorie] ?? 'bg-gray-100 text-gray-600'}`}>{r.categorie}</span>
                    {r.source === 'real' && <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[10px] font-medium text-forest-700">données réelles</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">{r.mitigation}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500">P{r.probabilite}×I{r.impact}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_CLS[r.statut]}`}>{STATUT[r.statut]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-4">{selected.titre}</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium text-gray-500">Catégorie :</span> {selected.categorie}</p>
              <p><span className="font-medium text-gray-500">Probabilité :</span> {selected.probabilite}/5</p>
              <p><span className="font-medium text-gray-500">Impact :</span> {selected.impact}/5</p>
              <p><span className="font-medium text-gray-500">Score :</span> {selected.probabilite * selected.impact}/25</p>
              <p><span className="font-medium text-gray-500">Plan de mitigation :</span> {selected.mitigation}</p>
              <p><span className="font-medium text-gray-500">Statut :</span> {STATUT[selected.statut]}</p>
              <p><span className="font-medium text-gray-500">Source :</span> {selected.source === 'real' ? '📊 Données ESG réelles' : '📋 Risque générique'}</p>
            </div>
            <button onClick={() => setSelected(null)} className="mt-5 w-full btn-secondary">Fermer</button>
          </div>
        </div>
      )}
    </div>
  )
}
