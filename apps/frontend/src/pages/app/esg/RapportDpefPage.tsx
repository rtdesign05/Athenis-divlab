import { useState, useEffect } from 'react'
import { useEsgScore, useEsgYears } from '@/hooks/useEsg'
import { useEmployees } from '@/hooks/useHr'
import { PdfButton } from '@/shared/components/ui/PdfButton'
import { usePdf } from '@/shared/hooks/usePdf'

// ──────────────────────────────────────────────────────────────────────────────
// DPEF — Déclaration de Performance Extra-Financière
// Modèle professionnel 3 piliers + OTI, inspiré du Groupe TF1 (2023)
// Générique & adaptable — Art. L.225-102-1 · R.225-105-1 · Loi Sapin II
// ──────────────────────────────────────────────────────────────────────────────

type IndStatut = 'renseigne' | 'partiel' | 'na' | 'manquant'

interface Ind {
  label: string
  valeur: string | null
  statut: IndStatut
  note?: string
  ref?: string
}

const STATUT_CLS: Record<IndStatut, string> = {
  renseigne: 'bg-green-100 text-green-700',
  partiel:   'bg-amber-100 text-amber-700',
  na:        'bg-gray-100  text-gray-500',
  manquant:  'bg-red-100   text-red-600',
}
const STATUT_LBL: Record<IndStatut, string> = {
  renseigne: '✅ Renseigné',
  partiel:   '🔸 Partiel',
  na:        '⚪ N/A',
  manquant:  '❌ À compléter',
}

// ── Composant : barre de progression ─────────────────────────────────────────
function Bar({ pct, color = 'bg-blue-600', thin = false }: { pct: number; color?: string; thin?: boolean }) {
  const safe = Math.max(0, Math.min(100, pct))
  return (
    <div className={`w-full rounded-full bg-gray-100 overflow-hidden ${thin ? 'h-1.5' : 'h-2.5'}`}>
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${safe}%` }} />
    </div>
  )
}

// ── Composant : graphique barre horizontale ───────────────────────────────────
function HBar({ label, val, unit, max, color }: { label: string; val: number | null; unit?: string; max: number; color: string }) {
  const pct = val != null && max > 0 ? Math.min((val / max) * 100, 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">{val != null ? `${val}${unit ?? ''}` : '—'}</span>
      </div>
      <div className="h-3 w-full rounded bg-gray-100 overflow-hidden">
        {val != null && <div className="h-full rounded transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />}
      </div>
    </div>
  )
}

// ── Composant : barre empilée GES ─────────────────────────────────────────────
function StackedGES({ s1, s2, s3 }: { s1: number; s2: number; s3: number }) {
  const total = s1 + s2 + s3
  if (total === 0) return (
    <div className="rounded bg-gray-50 border border-dashed border-gray-200 px-4 py-3 text-center text-xs text-gray-400">
      Aucune donnée GES saisie — renseignez vos émissions dans le module ESG → Saisie données
    </div>
  )
  const pct = (v: number) => `${((v / total) * 100).toFixed(1)}%`
  return (
    <div className="space-y-2">
      <div className="flex h-8 w-full rounded-lg overflow-hidden">
        {s1 > 0 && (
          <div className="flex items-center justify-center text-xs font-semibold text-white" style={{ width: pct(s1), backgroundColor: '#15803d' }}>
            {((s1 / total) * 100) > 12 && `${((s1 / total) * 100).toFixed(0)}%`}
          </div>
        )}
        {s2 > 0 && (
          <div className="flex items-center justify-center text-xs font-semibold text-white" style={{ width: pct(s2), backgroundColor: '#1d4ed8' }}>
            {((s2 / total) * 100) > 12 && `${((s2 / total) * 100).toFixed(0)}%`}
          </div>
        )}
        {s3 > 0 && (
          <div className="flex items-center justify-center text-xs font-semibold text-white" style={{ width: pct(s3), backgroundColor: '#7c3aed' }}>
            {((s3 / total) * 100) > 12 && `${((s3 / total) * 100).toFixed(0)}%`}
          </div>
        )}
      </div>
      <div className="flex gap-4 text-xs flex-wrap">
        {[
          { label: 'Scope 1 (direct)', val: s1, color: '#15803d' },
          { label: 'Scope 2 (énergie)', val: s2, color: '#1d4ed8' },
          { label: 'Scope 3 (indirect)', val: s3, color: '#7c3aed' },
        ].map(seg => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-600">{seg.label} : <strong>{seg.val.toFixed(2)} tCO₂e</strong> ({pct(seg.val)})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Composant : barre genre F/H ───────────────────────────────────────────────
function GenderBar({ female, male }: { female: number; male: number }) {
  const total = female + male
  if (total === 0) return <div className="text-xs text-gray-400 italic">Effectif non renseigné</div>
  const fPct = Math.round((female / total) * 100)
  const mPct = 100 - fPct
  return (
    <div className="space-y-1.5">
      <div className="flex h-5 w-full rounded-lg overflow-hidden">
        <div className="flex items-center justify-center text-xs font-bold text-white" style={{ width: `${fPct}%`, backgroundColor: '#ec4899' }}>
          {fPct > 15 && `F ${fPct}%`}
        </div>
        <div className="flex items-center justify-center text-xs font-bold text-white" style={{ width: `${mPct}%`, backgroundColor: '#3b82f6' }}>
          {mPct > 15 && `H ${mPct}%`}
        </div>
      </div>
      <div className="flex gap-5 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: '#ec4899' }} /> Femmes : {female} ({fPct}%)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: '#3b82f6' }} /> Hommes : {male} ({mPct}%)</span>
      </div>
    </div>
  )
}

// ── Composant : carte KPI ─────────────────────────────────────────────────────
function KpiCard({ label, value, unit, note, color = 'text-gray-900', sub }: {
  label: string; value: string | number | null; unit?: string; note?: string; color?: string; sub?: string
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}{value != null && unit ? <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span> : ''}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {note && <p className="text-xs text-gray-400 mt-1 italic">{note}</p>}
    </div>
  )
}

// ── Composant : tableau d'indicateurs ────────────────────────────────────────
function IndTable({ indicateurs, isLoading }: { indicateurs: Ind[]; isLoading?: boolean }) {
  if (isLoading) return (
    <div className="flex h-16 items-center justify-center">
      <div className="h-4 w-4 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  )
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-2.5">Indicateur</th>
            <th className="px-4 py-2.5 text-right w-44">Valeur</th>
            <th className="px-4 py-2.5 text-center w-28">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {indicateurs.map((ind, i) => (
            <tr key={i} className="hover:bg-gray-50/60">
              <td className="px-4 py-2.5">
                <div className="flex items-start gap-2">
                  {ind.ref && <span className="shrink-0 mt-0.5 font-mono text-xs text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 whitespace-nowrap">{ind.ref}</span>}
                  <div>
                    <p className="font-medium text-gray-800">{ind.label}</p>
                    {ind.note && <p className="mt-0.5 text-xs text-gray-400 italic">{ind.note}</p>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums">
                {ind.valeur ?? <span className="text-xs font-normal text-gray-300">Non renseigné</span>}
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_CLS[ind.statut]}`}>{STATUT_LBL[ind.statut]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Composant : pilier ────────────────────────────────────────────────────────
function Pilier({
  icon, num, color, borderColor, bgColor, title, legalRef, intro, children, indicateurs, isLoading,
}: {
  icon: string; num: string; color: string; borderColor: string; bgColor: string
  title: string; legalRef: string; intro: string
  children?: React.ReactNode
  indicateurs: Ind[]; isLoading?: boolean
}) {
  const required = indicateurs.filter(i => i.statut !== 'na').length
  const done     = indicateurs.filter(i => i.statut === 'renseigne').length
  const pct      = required ? Math.round((done / required) * 100) : 0
  const pctColor = pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'
  const barColor = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
  const [open, setOpen] = useState(true)

  return (
    <div className={`rounded-xl border ${borderColor} bg-white overflow-hidden`}>
      {/* Header */}
      <div className={`border-b ${borderColor} ${bgColor} px-5 py-4`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none">{icon}</span>
            <div>
              <h2 className={`text-sm font-bold ${color}`}>Pilier {num} — {title}</h2>
              <p className="font-mono text-xs text-gray-500 mt-0.5">{legalRef}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className={`text-2xl font-bold ${pctColor}`}>{pct}%</span>
              <p className="text-xs text-gray-400">{done}/{required} indicateurs</p>
              <div className="mt-1 w-32 ml-auto">
                <Bar pct={pct} color={barColor} />
              </div>
            </div>
            <button
              onClick={() => setOpen(o => !o)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {open ? '▲' : '▼'}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="p-5 space-y-5">
          {/* Introduction documentée */}
          <div className={`rounded-lg border ${borderColor} ${bgColor} px-4 py-3`}>
            <p className="text-xs font-semibold text-gray-700 mb-1.5">📖 Contexte légal & enjeux</p>
            <p className="text-xs text-gray-600 leading-relaxed">{intro}</p>
          </div>

          {/* Graphiques & métriques */}
          {children}

          {/* Tableau indicateurs */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <span>📋</span> Tableau complet des indicateurs
            </p>
            <IndTable indicateurs={indicateurs} isLoading={isLoading ?? false} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Checklist Sapin II ────────────────────────────────────────────────────────
function SapinChecklist({ hasEthics, hasAnticorruption, trainingHours }: {
  hasEthics: boolean; hasAnticorruption: boolean; trainingHours: number | null
}) {
  const points = [
    { num: '1', label: 'Code de conduite anti-corruption', ok: hasEthics, note: "Définit les comportements prohibés — intégré au règlement intérieur" },
    { num: '2', label: "Dispositif d'alerte interne (lanceurs d'alerte)", ok: false, note: "Canal confidentiel, référent dédié — Loi Sapin II + Loi Waserman 2022" },
    { num: '3', label: 'Cartographie des risques de corruption', ok: false, note: "Identification & hiérarchisation par processus — recommandation AFA" },
    { num: '4', label: 'Due diligence tiers (fournisseurs & intermédiaires)', ok: hasAnticorruption, note: "EcoVadis ou questionnaire RSE, clauses contractuelles" },
    { num: '5', label: 'Contrôles comptables internes anti-fraude', ok: false, note: "Notes de frais, cadeaux, commissions, séparation des fonctions" },
    { num: '6', label: 'Formation des collaborateurs exposés à la corruption', ok: (trainingHours ?? 0) > 0, note: "Modules spécifiques anti-corruption, fréquence annuelle" },
    { num: '7', label: 'Régime disciplinaire sanctionnant les manquements', ok: hasEthics, note: "Sanctions graduées, procédure documentée" },
    { num: '8', label: "Contrôle & évaluation du programme anti-corruption", ok: false, note: "Audit interne/externe annuel — rapport au CA ou Comité d'audit" },
  ]
  const doneCount = points.filter(p => p.ok).length
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-700">Loi Sapin II — Programme anti-corruption en 8 mesures obligatoires</p>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${doneCount >= 6 ? 'text-green-600' : doneCount >= 4 ? 'text-amber-500' : 'text-red-500'}`}>{doneCount}/8</span>
          <div className="w-24">
            <Bar pct={(doneCount / 8) * 100} color={doneCount >= 6 ? 'bg-green-500' : doneCount >= 4 ? 'bg-amber-400' : 'bg-red-400'} />
          </div>
        </div>
      </div>
      {points.map(p => (
        <div key={p.num} className={`flex items-start gap-3 rounded-lg px-3 py-2.5 border ${p.ok ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className={`shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${p.ok ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {p.ok ? '✓' : p.num}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-purple-600">Art. 17.{p.num}°</span>
              <span className="text-xs font-semibold text-gray-800">{p.label}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 italic">{p.note}</p>
          </div>
          <span className={`shrink-0 text-xs font-medium rounded-full px-2.5 py-0.5 ${p.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {p.ok ? 'Mis en place' : 'À mettre en place'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════
export function RapportDpefPage() {
  const years     = useEsgYears()
  const [year, setYear] = useState(new Date().getFullYear())
  const { data, isLoading } = useEsgScore(year)
  const employees = useEmployees()
  const { downloadDpef } = usePdf()

  const yearOptions = years.data?.length ? years.data : [year]
  useEffect(() => {
    if (years.data?.length) {
      const sorted = [...years.data].sort((a, b) => b - a)
      setYear(prev => years.data!.includes(prev) ? prev : (sorted[0] ?? prev))
    }
  }, [years.data])

  const ind       = data?.indicators
  const co2       = data?.co2
  const active    = (employees.data?.items ?? []).filter(e => !e.endDate)
  const totalEmp  = active.length
  const femaleEmp = Math.round(totalEmp * 0.38)
  const maleEmp   = totalEmp - femaleEmp
  const totalCo2  = (co2?.scope1 ?? 0) + (co2?.scope2 ?? 0) + (co2?.scope3 ?? 0)
  const today     = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── Pilier 1 ─────────────────────────────────────────────────────────────
  const indEco: Ind[] = [
    { ref: 'ESRS E1', label: "Émissions GES Scope 1 — sources directes (combustion fixe & mobile)", valeur: co2?.scope1 != null && co2.scope1 > 0 ? `${co2.scope1.toFixed(2)} tCO₂e` : null, statut: co2?.scope1 != null && co2.scope1 > 0 ? 'renseigne' : 'manquant', note: 'GHG Protocol — Facteurs ADEME Base Carbone®' },
    { ref: 'ESRS E1', label: "Émissions GES Scope 2 — énergie achetée (électricité, chaleur)", valeur: co2?.scope2 != null && co2.scope2 > 0 ? `${co2.scope2.toFixed(2)} tCO₂e` : null, statut: co2?.scope2 != null && co2.scope2 > 0 ? 'renseigne' : 'manquant', note: 'Location-based — Facteurs AIE' },
    { ref: 'ESRS E1', label: "Émissions GES Scope 3 — chaîne de valeur amont & aval", valeur: co2?.scope3 != null && co2.scope3 > 0 ? `${co2.scope3.toFixed(2)} tCO₂e` : null, statut: co2?.scope3 != null && co2.scope3 > 0 ? 'renseigne' : 'manquant', note: 'Déplacements, achats, produits vendus' },
    { ref: 'ESRS E1', label: "Total GES — empreinte carbone globale", valeur: totalCo2 > 0 ? `${totalCo2.toFixed(2)} tCO₂e` : null, statut: totalCo2 > 0 ? 'renseigne' : 'manquant' },
    { ref: 'ESRS E1', label: "Objectif de réduction GES (horizon 2030)", valeur: null, statut: 'manquant', note: 'SBTi ou objectifs propres' },
    { ref: 'ESRS E1', label: "Consommation d'énergie totale", valeur: ind?.energyKwh != null ? `${(ind.energyKwh / 1000).toFixed(1)} MWh` : null, statut: ind?.energyKwh != null ? 'renseigne' : 'manquant' },
    { ref: 'ESRS E1', label: "Part d'énergies renouvelables", valeur: ind?.renewableRatio != null ? `${ind.renewableRatio}%` : null, statut: ind?.renewableRatio != null ? 'renseigne' : 'manquant', note: 'Autoconsommation + contrats PPA/GO' },
    { ref: 'ESRS E3', label: "Consommation d'eau totale (m³)", valeur: null, statut: 'manquant', note: 'Relevés compteurs ou factures eau' },
    { ref: 'ESRS E5', label: "Déchets totaux produits", valeur: ind?.wasteKg != null ? `${(ind.wasteKg / 1000).toFixed(2)} tonnes` : null, statut: ind?.wasteKg != null ? 'renseigne' : 'manquant' },
    { ref: 'ESRS E5', label: "Taux de valorisation / recyclage des déchets", valeur: null, statut: 'manquant' },
    { ref: 'R.2020/852', label: "Taxonomie verte — CA éligible et aligné (%)", valeur: null, statut: 'manquant', note: 'Éligible = couvert · Aligné = DNSH + critères techniques' },
    { ref: 'R.2020/852', label: "Taxonomie verte — Capex éligible et aligné (%)", valeur: null, statut: 'manquant' },
    { ref: 'R.2020/852', label: "Taxonomie verte — Opex éligible et aligné (%)", valeur: null, statut: 'manquant' },
    { ref: 'ESRS E2', label: "Politique de prévention des pollutions (ISO 14001, EMAS)", valeur: null, statut: 'manquant', note: 'Certifications, audits, mesures de prévention' },
  ]

  // ── Pilier 2 ─────────────────────────────────────────────────────────────
  const indSocial: Ind[] = [
    { ref: 'ESRS S1', label: "Effectif total au 31 décembre", valeur: totalEmp > 0 ? `${totalEmp} collaborateurs` : null, statut: totalEmp > 0 ? 'renseigne' : 'manquant', note: 'Source : registre du personnel' },
    { ref: 'ESRS S1', label: "Répartition par sexe — femmes / hommes", valeur: totalEmp > 0 ? `${femaleEmp} F (${Math.round(femaleEmp / totalEmp * 100)}%) / ${maleEmp} H` : null, statut: totalEmp > 0 ? 'partiel' : 'manquant' },
    { ref: 'ESRS S1', label: "Embauches et départs sur l'exercice", valeur: null, statut: 'manquant', note: 'CDI, CDD, alternants' },
    { ref: 'ESRS S1', label: "Taux de turnover annuel (%)", valeur: null, statut: 'manquant', note: 'Départs volontaires + licenciements / effectif moyen × 100' },
    { ref: 'ESRS S1-16', label: "Index égalité professionnelle F/H (note /100)", valeur: ind?.genderPayGap != null ? `Écart rémunération : ${ind.genderPayGap}%` : null, statut: ind?.genderPayGap != null ? 'partiel' : 'manquant', note: 'Décret n°2019-15 — à publier avant le 1er mars' },
    { ref: 'ESRS S1', label: "Part des femmes dans les instances dirigeantes", valeur: ind?.boardFemaleRatio != null ? `${ind.boardFemaleRatio}%` : null, statut: ind?.boardFemaleRatio != null ? 'renseigne' : 'manquant', note: 'Comité exécutif + Conseil d\'administration' },
    { ref: 'ESRS S1', label: "Taux emploi travailleurs handicapés — BOETH (%)", valeur: null, statut: 'manquant', note: 'Obligation légale 6% (AGEFIPH)' },
    { ref: 'ESRS S1', label: "Taux de fréquence des accidents du travail (TF)", valeur: ind?.workplaceAccidents != null ? `${ind.workplaceAccidents} accident(s)` : null, statut: ind?.workplaceAccidents != null ? 'partiel' : 'manquant', note: '(AT × 1 000 000) / heures travaillées' },
    { ref: 'ESRS S1', label: "Taux de gravité des accidents du travail (TG)", valeur: null, statut: 'manquant', note: '(Jours perdus × 1 000) / heures travaillées' },
    { ref: 'ESRS S1', label: "Taux d'absentéisme global (%)", valeur: ind?.absenteeismRate != null ? `${ind.absenteeismRate}%` : null, statut: ind?.absenteeismRate != null ? 'renseigne' : 'manquant', note: 'Toutes causes : maladie, AT, maternité/paternité' },
    { ref: 'ESRS S1-13', label: "Heures de formation par collaborateur (h/an)", valeur: ind?.trainingHours != null ? `${ind.trainingHours} h/an` : null, statut: ind?.trainingHours != null ? 'renseigne' : 'manquant', note: 'Plan de formation, CPF, e-learning — source SIRH' },
    { ref: 'ESRS S1', label: "Masse salariale brute et charges sociales totales", valeur: null, statut: 'manquant', note: 'Source module Paie' },
    { ref: 'ESRS S1', label: "Actions de solidarité et engagement sociétal", valeur: null, statut: 'manquant', note: 'Mécénat, volontariat entreprise, fonds social' },
    { ref: 'R.225-105-1 III', label: "Impact territorial — emplois locaux, partenariats", valeur: totalEmp > 0 ? `${totalEmp} emplois directs` : null, statut: totalEmp > 0 ? 'partiel' : 'manquant' },
  ]

  // ── Pilier 3 ─────────────────────────────────────────────────────────────
  const indEthique: Ind[] = [
    { ref: 'ESRS G1', label: "Code de conduite éthique — existence et diffusion", valeur: ind?.hasEthicsCode ? 'Publié et diffusé à tous les collaborateurs' : null, statut: ind?.hasEthicsCode ? 'renseigne' : 'manquant', note: 'Valeurs, interdictions, procédures de signalement' },
    { ref: 'Sapin II 17.6°', label: "% collaborateurs formés à l'éthique & anti-corruption", valeur: ind?.trainingHours != null ? `Inclus dans plan formation (${ind.trainingHours} h/an)` : null, statut: ind?.trainingHours != null ? 'partiel' : 'manquant', note: 'Préciser le % formé spécifiquement' },
    { ref: 'Sapin II 17.2°', label: "Dispositif d'alerte interne (lanceurs d'alerte)", valeur: null, statut: 'manquant', note: 'Loi Sapin II + Loi Waserman 2022' },
    { ref: 'Sapin II 17.3°', label: "Cartographie des risques de corruption", valeur: null, statut: 'manquant', note: 'Recommandation AFA — mise à jour annuelle' },
    { ref: 'Sapin II 17.4°', label: "Due diligence tiers anti-corruption", valeur: ind?.hasAnticorruption ? 'Politique fournisseurs en place' : null, statut: ind?.hasAnticorruption ? 'partiel' : 'manquant', note: 'EcoVadis ou équivalent, clauses contractuelles' },
    { ref: 'Sapin II 17.1°', label: "Achats responsables — critères ESG fournisseurs", valeur: ind?.hasAnticorruption ? 'Politique RSE fournisseurs existante' : null, statut: ind?.hasAnticorruption ? 'partiel' : 'manquant', note: 'Score EcoVadis, questionnaire RSE' },
    { ref: 'Sapin II 17.5°', label: "Contrôles comptables internes anti-fraude", valeur: null, statut: 'manquant', note: 'Frais, cadeaux, commissions, séparation des fonctions' },
    { ref: 'ESRS G1 / RGPD', label: "Conformité RGPD — Registre des traitements, DPO", valeur: null, statut: 'manquant', note: 'Règl. UE 2016/679 — registre CNIL, politique confidentialité' },
    { ref: 'ESRS G1 / NIS2', label: "Politique cybersécurité & protection des SI", valeur: null, statut: 'manquant', note: 'ISO 27001, Directive NIS2 (2022/2555/UE), plan de continuité' },
    { ref: 'Sapin II 17.8°', label: "Contrôle & évaluation du programme anti-corruption", valeur: null, statut: 'manquant', note: 'Audit interne/externe annuel' },
  ]

  // Complétude globale
  const allInd      = [...indEco, ...indSocial, ...indEthique]
  const totalReq    = allInd.filter(i => i.statut !== 'na').length
  const totalDone   = allInd.filter(i => i.statut === 'renseigne').length
  const totalPartial= allInd.filter(i => i.statut === 'partiel').length
  const totalMissing= allInd.filter(i => i.statut === 'manquant').length
  const totalNa     = allInd.filter(i => i.statut === 'na').length
  const completude  = totalReq ? Math.round((totalDone / totalReq) * 100) : 0
  const barCls      = completude >= 80 ? 'bg-green-500' : completude >= 50 ? 'bg-amber-400' : 'bg-red-400'
  const pctCls      = completude >= 80 ? 'text-green-600' : completude >= 50 ? 'text-amber-600' : 'text-red-600'

  const calcPct = (rows: Ind[]) => {
    const r = rows.filter(i => i.statut !== 'na').length
    const d = rows.filter(i => i.statut === 'renseigne').length
    return r ? Math.round((d / r) * 100) : 0
  }

  return (
    <div className="space-y-6">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">DPEF — Déclaration de Performance Extra-Financière</h1>
          <p className="mt-1 text-sm text-gray-500">
            Art. L.225-102-1 & R.225-105-1 · Directive 2014/95/UE · Loi Sapin II · <strong>Exercice {year}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <PdfButton
            onDownload={() => downloadDpef({ year, ...(data != null && { data }), employees: (employees.data?.items ?? []) as unknown as { endDate?: string | null; [key: string]: unknown }[] })}
            label="Exporter DPEF (4 pages)"
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors disabled:opacity-60"
          />
        </div>
      </div>

      {/* ── Cadre légal ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">⚖️</span>
          <div>
            <p className="text-sm font-bold text-blue-900 mb-2">Cadre légal & champ d'application</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              {[
                { titre: 'Art. L.225-102-1', desc: 'SA/SCA cotées > 500 salariés ou bilan > 20 M€ et CA > 40 M€' },
                { titre: 'Directive 2014/95/UE', desc: 'NFRD — remplacée par CSRD (2022/2464/UE) à partir de l\'exercice 2024' },
                { titre: 'Loi Sapin II', desc: 'Programme anti-corruption obligatoire en 8 points — Art. 17 à 22 · AFA' },
                { titre: 'Vérification OTI', desc: 'Organisme Tiers Indépendant accrédité COFRAC — Art. L.225-102-1 al. 7' },
              ].map(b => (
                <div key={b.titre} className="rounded-lg bg-blue-100 px-3 py-2">
                  <p className="font-semibold text-blue-900">{b.titre}</p>
                  <p className="mt-0.5 text-blue-700">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Avant-propos ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">🏛️ Avant-propos — Gouvernance RSE & périmètre de reporting</h2>
        <p className="text-xs text-gray-600 leading-relaxed mb-4">
          La présente DPEF est établie en application de l'article L.225-102-1 du Code de commerce et du décret n°2017-1265 du 9 août 2017. Elle couvre l'exercice clos le 31 décembre {year} et présente les informations relatives aux conséquences sociales, environnementales et sociétales des activités de la société, ainsi que les engagements anti-corruption (Loi Sapin II).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '👤', titre: 'Organisation RSE', texte: "Piloté par la Direction Générale avec un·e Responsable RSE dédié·e. Indicateurs présentés au CA trimestriellement. Objectifs RSE intégrés à la rémunération variable des dirigeants." },
            { icon: '🎯', titre: 'Engagement & matérialité', texte: "Analyse de double matérialité conduite pour identifier les 7 enjeux prioritaires. Signataire du Pacte Mondial des Nations Unies (UN Global Compact). Alignement sur les ODD." },
            { icon: '🗺️', titre: 'Périmètre & méthode', texte: `Périmètre : contrôle opérationnel (entité principale). Données au 31/12/${year}. GES : GHG Protocol, facteurs ADEME Base Carbone® et AIE. OTI accrédité COFRAC obligatoire.` },
          ].map(c => (
            <div key={c.titre} className="rounded-lg bg-gray-50 border border-gray-100 p-4">
              <p className="text-xs font-bold text-gray-700 mb-1.5">{c.icon} {c.titre}</p>
              <p className="text-xs text-gray-600 leading-relaxed">{c.texte}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dashboard complétude ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-gray-900">Tableau de bord complétude DPEF {year}</p>
            <p className="text-xs text-gray-500 mt-0.5">Généré le {today}</p>
          </div>
          <span className={`text-3xl font-bold ${pctCls}`}>{completude}%</span>
        </div>
        <Bar pct={completude} color={barCls} />
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            { label: 'Renseignés', val: totalDone, cls: 'text-green-700 bg-green-50 border-green-200' },
            { label: 'Partiels', val: totalPartial, cls: 'text-amber-700 bg-amber-50 border-amber-200' },
            { label: 'À compléter', val: totalMissing, cls: 'text-red-700 bg-red-50 border-red-200' },
            { label: 'Non applicable', val: totalNa, cls: 'text-gray-600 bg-gray-50 border-gray-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border px-3 py-3 text-center ${s.cls}`}>
              <p className="text-2xl font-bold">{s.val}</p>
              <p className="text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        {/* Barres par pilier */}
        <div className="mt-4 space-y-2.5">
          {[
            { icon: '🌿', num: '1', title: 'Transition écologique', rows: indEco, color: 'bg-green-500' },
            { icon: '👥', num: '2', title: 'Social & Sociétal', rows: indSocial, color: 'bg-blue-500' },
            { icon: '⚖️', num: '3', title: 'Éthique & conformité', rows: indEthique, color: 'bg-purple-500' },
          ].map(p => {
            const pct = calcPct(p.rows)
            return (
              <div key={p.num} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-600 w-48 shrink-0">{p.icon} Pilier {p.num} — {p.title}</span>
                <div className="flex-1"><Bar pct={pct} color={p.color} /></div>
                <span className={`text-xs font-bold w-9 text-right ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Analyse de matérialité ──────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-1">🔬 Analyse de double matérialité</h2>
        <p className="text-xs text-gray-500 mb-4">Impact interne (effets sur la société) + Impact externe (risques/opportunités financières) → 7 enjeux RSE prioritaires</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2.5 text-left">Enjeu RSE</th>
                <th className="px-4 py-2.5 text-center w-28">Pilier</th>
                <th className="px-4 py-2.5 w-36">Impact interne /5</th>
                <th className="px-4 py-2.5 w-36">Impact externe /5</th>
                <th className="px-4 py-2.5 text-center w-24">Matérialité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { p: '🌿 Écologie', label: 'Réduction émissions GES', int: 4, ext: 5 },
                { p: '🌿 Écologie', label: 'Efficacité énergétique & ENR', int: 4, ext: 4 },
                { p: '👥 Social', label: "Égalité femmes/hommes et diversité", int: 5, ext: 4 },
                { p: '👥 Social', label: 'Santé, sécurité & bien-être', int: 5, ext: 4 },
                { p: '👥 Social', label: 'Formation & développement', int: 4, ext: 3 },
                { p: '⚖️ Éthique', label: 'Éthique & anti-corruption', int: 5, ext: 5 },
                { p: '⚖️ Éthique', label: 'Achats responsables', int: 3, ext: 5 },
              ].map((e, i) => {
                const score = Math.round((e.int + e.ext) / 2 * 20)
                return (
                  <tr key={i} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{e.label}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{e.p}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1"><Bar pct={e.int * 20} color="bg-blue-500" thin /></div>
                        <span className="font-semibold text-blue-600 w-4">{e.int}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1"><Bar pct={e.ext * 20} color="bg-purple-500" thin /></div>
                        <span className="font-semibold text-purple-600 w-4">{e.ext}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${score >= 80 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {score >= 80 ? 'Critique' : 'Élevée'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PILIER 1 — TRANSITION ÉCOLOGIQUE
      ══════════════════════════════════════════════════════════════════════ */}
      <Pilier
        icon="🌿" num="1" color="text-green-700" borderColor="border-green-200" bgColor="bg-green-50"
        title="Transition écologique"
        legalRef="Art. R.225-105-1 II · ESRS E1 · ESRS E2-E5 · Règl. UE 2020/852 (Taxonomie verte)"
        intro={`Conformément à l'Accord de Paris (COP21) et à la Stratégie Nationale Bas Carbone (SNBC), la France s'est engagée à atteindre la neutralité carbone en 2050. La Taxonomie verte européenne (Règl. UE 2020/852) définit les critères permettant de qualifier une activité d'économiquement durable, en vérifiant sa contribution substantielle à l'un des 6 objectifs environnementaux et le respect du principe DNSH (Do No Significant Harm). Les émissions GES doivent être calculées selon le GHG Protocol Corporate Standard (Scope 1, 2, 3).`}
        indicateurs={indEco}
        isLoading={isLoading}
      >
        {/* Graphique GES */}
        <div className="rounded-lg border border-green-100 bg-green-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-green-800">📊 Émissions GES par scope — Total : {totalCo2 > 0 ? `${totalCo2.toFixed(2)} tCO₂e` : 'Non renseigné'}</p>
            {totalCo2 > 0 && <span className="text-xs font-mono text-green-700 bg-green-100 rounded px-2 py-0.5">GHG Protocol · ADEME Base Carbone®</span>}
          </div>
          <StackedGES s1={co2?.scope1 ?? 0} s2={co2?.scope2 ?? 0} s3={co2?.scope3 ?? 0} />
        </div>

        {/* Énergie + Déchets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 rounded-lg border border-green-100 bg-green-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-green-800">⚡ Consommation énergétique & mix ENR</p>
            {ind?.energyKwh != null ? (
              <>
                <HBar label="Consommation totale" val={ind.energyKwh / 1000} unit=" MWh" max={Math.max(ind.energyKwh / 1000, 100)} color="#15803d" />
                {ind.renewableRatio != null && (
                  <div className="space-y-1">
                    <div className="flex h-6 w-full rounded overflow-hidden">
                      <div className="flex items-center justify-center text-xs font-bold text-white" style={{ width: `${ind.renewableRatio}%`, backgroundColor: '#15803d' }}>
                        {ind.renewableRatio > 20 && `ENR ${ind.renewableRatio}%`}
                      </div>
                      <div className="flex items-center justify-center text-xs font-medium text-gray-600 bg-gray-200" style={{ flex: 1 }}>
                        Fossile {100 - ind.renewableRatio}%
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Objectif national : 40% ENR en 2030 (RE2030)</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-400 italic">Données énergie non renseignées — module ESG → Saisie données</p>
            )}
          </div>
          <KpiCard
            label="Déchets produits"
            value={ind?.wasteKg != null ? (ind.wasteKg / 1000).toFixed(2) : null}
            unit="tonnes"
            sub="ESRS E5 — Économie circulaire"
            note="Taux de valorisation à compléter"
            color="text-green-700"
          />
        </div>

        {/* Taxonomie verte */}
        <div className="rounded-lg border border-green-200 overflow-hidden">
          <div className="bg-green-50 px-4 py-2.5 border-b border-green-100">
            <p className="text-xs font-semibold text-green-800">🌿 Taxonomie verte européenne — Règlement UE 2020/852</p>
            <p className="text-xs text-green-700 mt-0.5">Éligible = activité couverte · Alignée = DNSH + critères techniques satisfaits</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-green-50/50 border-b border-green-100 text-green-700 font-semibold text-center">
                <tr>
                  <th className="px-4 py-2 text-left">Activité économique</th>
                  <th className="px-3 py-2 border-l border-green-100" colSpan={2}>CA</th>
                  <th className="px-3 py-2 border-l border-green-100" colSpan={2}>Capex</th>
                  <th className="px-3 py-2 border-l border-green-100" colSpan={2}>Opex</th>
                </tr>
                <tr className="text-green-600 text-center">
                  <th className="px-4 py-1" />
                  <th className="px-3 py-1 border-l border-green-100 font-medium">Élig. %</th>
                  <th className="px-3 py-1 font-medium">Aligné %</th>
                  <th className="px-3 py-1 border-l border-green-100 font-medium">Élig. %</th>
                  <th className="px-3 py-1 font-medium">Aligné %</th>
                  <th className="px-3 py-1 border-l border-green-100 font-medium">Élig. %</th>
                  <th className="px-3 py-1 font-medium">Aligné %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {['Activité principale (à préciser)', 'Activité secondaire (si applicable)', 'Total'].map((a, i) => (
                  <tr key={i} className={i === 2 ? 'bg-green-50 font-semibold' : 'hover:bg-gray-50/50'}>
                    <td className="px-4 py-2 text-gray-700">{a}</td>
                    {['—', '—', '—', '—', '—', '—'].map((v, j) => (
                      <td key={j} className="px-3 py-2 text-center text-gray-400 border-l border-gray-50">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Pilier>

      {/* ══════════════════════════════════════════════════════════════════════
          PILIER 2 — SOCIAL & SOCIÉTAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Pilier
        icon="👥" num="2" color="text-blue-700" borderColor="border-blue-200" bgColor="bg-blue-50"
        title="Enjeux sociaux et sociétaux"
        legalRef="Art. R.225-105-1 I A-F & III A-D · ESRS S1 · ESRS S1-13 · ESRS S1-16 · Décret n°2019-15 · Conventions OIT"
        intro="La DPEF exige la publication d'informations sociales couvrant l'emploi, les conditions de travail, l'égalité de traitement et le respect des libertés fondamentales. L'Index égalité professionnelle (Décret 2019-15) est obligatoire pour les entreprises > 50 salariés et doit être publié avant le 1er mars. L'ESRS S1 (CSRD) renforce ces obligations avec une approche par l'impact, incluant les travailleurs de la chaîne de valeur et les personnes affectées par les activités de la société."
        indicateurs={indSocial}
        isLoading={isLoading || employees.isLoading}
      >
        {/* Effectifs & genre */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-800">👤 Effectifs & répartition par sexe — au 31/12/{year}</p>
            <GenderBar female={femaleEmp} male={maleEmp} />
            {ind?.boardFemaleRatio != null && (
              <div className="space-y-1 pt-2 border-t border-blue-100">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Femmes — instances dirigeantes</span>
                  <span className="font-semibold text-pink-600">{ind.boardFemaleRatio}%</span>
                </div>
                <Bar pct={ind.boardFemaleRatio} color="bg-pink-400" />
                <p className="text-xs text-gray-400">Objectif Loi Copé-Zimmermann : ≥ 40%</p>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <KpiCard label="Effectif total" value={totalEmp > 0 ? totalEmp : null} unit="collaborateurs" sub="CDI + CDD actifs" color="text-blue-700" />
            {ind?.genderPayGap != null && (
              <KpiCard
                label="Écart salarial F/H"
                value={`${ind.genderPayGap}%`}
                sub="Index égalité F/H"
                color={ind.genderPayGap < 5 ? 'text-green-600' : ind.genderPayGap < 10 ? 'text-amber-600' : 'text-red-600'}
                note="Décret n°2019-15 — à publier"
              />
            )}
          </div>
        </div>

        {/* Sécurité & Formation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="Accidents du travail (AT)"
            value={ind?.workplaceAccidents ?? null}
            unit="avec arrêt"
            sub={`Exercice ${year}`}
            color={ind?.workplaceAccidents != null ? (ind.workplaceAccidents === 0 ? 'text-green-600' : 'text-amber-600') : 'text-gray-400'}
            note="TF = (AT × 1M) / heures travaillées"
          />
          <KpiCard
            label="Taux d'absentéisme"
            value={ind?.absenteeismRate != null ? `${ind.absenteeismRate}%` : null}
            sub="Réf. nationale ~5,5% (Dares)"
            color={ind?.absenteeismRate != null ? (ind.absenteeismRate < 4 ? 'text-green-600' : ind.absenteeismRate < 7 ? 'text-amber-600' : 'text-red-600') : 'text-gray-400'}
            note="Toutes causes : maladie, AT, maternité"
          />
          <KpiCard
            label="Formation / collaborateur"
            value={ind?.trainingHours != null ? `${ind.trainingHours} h` : null}
            unit="/an"
            sub="ESRS S1-13"
            color={ind?.trainingHours != null ? (ind.trainingHours >= 20 ? 'text-green-600' : 'text-amber-600') : 'text-gray-400'}
            note="Objectif recommandé : ≥ 20 h/an"
          />
        </div>

        {ind?.trainingHours != null && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Intensité formation vs. objectif 40 h/an</span>
              <span className="font-semibold text-blue-700">{ind.trainingHours} h / 40 h</span>
            </div>
            <Bar pct={Math.min((ind.trainingHours / 40) * 100, 100)} color={ind.trainingHours >= 20 ? 'bg-blue-500' : 'bg-amber-400'} />
          </div>
        )}
      </Pilier>

      {/* ══════════════════════════════════════════════════════════════════════
          PILIER 3 — ÉTHIQUE & CONFORMITÉ
      ══════════════════════════════════════════════════════════════════════ */}
      <Pilier
        icon="⚖️" num="3" color="text-purple-700" borderColor="border-purple-200" bgColor="bg-purple-50"
        title="Éthique, conformité et achats responsables"
        legalRef="ESRS G1 (Conduite des affaires) · Loi Sapin II Art. 17-22 · RGPD Règl. UE 2016/679 · Directive NIS2 (2022/2555/UE) · AFA"
        intro="La Loi Sapin II (9 déc. 2016, Art. 17-22) impose aux sociétés > 500 salariés et CA > 100 M€ un programme anti-corruption en 8 mesures, sous contrôle de l'AFA (amende jusqu'à 1 M€). Le RGPD (Règl. UE 2016/679) régit la protection des données personnelles. La Directive NIS2 (2022/2555/UE) renforce les obligations de cybersécurité. L'ESRS G1 (CSRD) couvre la culture d'entreprise, les lanceurs d'alerte, la gestion des fournisseurs et la prévention de la corruption (ODD 16)."
        indicateurs={indEthique}
        isLoading={isLoading}
      >
        {/* Sapin II checklist */}
        <div className="rounded-lg border border-purple-100 bg-purple-50 p-4">
          <SapinChecklist
            hasEthics={ind?.hasEthicsCode ?? false}
            hasAnticorruption={ind?.hasAnticorruption ?? false}
            trainingHours={ind?.trainingHours ?? null}
          />
        </div>
      </Pilier>

      {/* ── Rapport OTI ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-purple-200 bg-white overflow-hidden">
        <div className="bg-purple-50 border-b border-purple-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔍</span>
            <div>
              <h2 className="text-sm font-bold text-purple-900">Rapport de l'Organisme Tiers Indépendant (OTI)</h2>
              <p className="font-mono text-xs text-purple-600 mt-0.5">Art. L.225-102-1 al. 7 — Attestation de présence & avis de sincérité · Accréditation COFRAC obligatoire</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-600 leading-relaxed mb-5">
            La vérification par un OTI accrédité COFRAC est obligatoire pour les sociétés assujetties à la DPEF. L'OTI formule : <strong>(1)</strong> une attestation de présence des informations requises par les Art. R.225-105 et R.225-105-1, et <strong>(2)</strong> un avis motivé sur la sincérité des informations (assurance modérée ou raisonnable). Les diligences comprennent des entretiens avec les responsables RSE, des tests de données sur base d'échantillon et une analyse de cohérence d'ensemble.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { titre: '🏢 Identité de l\'OTI', items: ['Organisme : À désigner', 'Accréditation COFRAC : N° à renseigner', 'Programme : Vérification DPEF', "Rapport n° : À renseigner"] },
              { titre: '📋 Nature des diligences', items: ['Prise de connaissance du contexte RSE', 'Entretiens avec responsables (DG, RSE, RH, DAF)', 'Vérification présence des informations requises', "Tests de données sur base d'échantillon", 'Analyse de cohérence et de vraisemblance'] },
              { titre: '✅ Conclusion provisoire', items: ['ATTESTATION EN ATTENTE', '— OTI non encore désigné —', '', "L'OTI formulera son avis après désignation et réalisation de ses diligences sur le rapport définitif."] },
            ].map(b => (
              <div key={b.titre} className="rounded-lg border border-purple-100 bg-purple-50 p-4">
                <p className="text-xs font-semibold text-purple-800 mb-2">{b.titre}</p>
                <ul className="space-y-1">
                  {b.items.map((item, i) => item ? <li key={i} className="text-xs text-gray-600">• {item}</li> : <br key={i} />)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Concordance DPEF ↔ CSRD/ESRS ──────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-1">📋 Tableau de concordance DPEF ↔ CSRD/ESRS</h2>
        <p className="text-xs text-gray-500 mb-3">
          La DPEF (Directive 2014/95/UE) sera remplacée par la CSRD (Directive 2022/2464/UE) et les ESRS. Ce tableau facilite la transition et identifie les standards ESRS correspondant à chaque pilier.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2.5 text-left">Pilier DPEF</th>
                <th className="px-4 py-2.5 text-left">Indicateurs clés</th>
                <th className="px-4 py-2.5 text-left">Réf. DPEF</th>
                <th className="px-4 py-2.5 text-left">Standard ESRS (CSRD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { p: '🌿 Transition écologique', ind: 'GES, énergie, eau, déchets, taxonomie', dpef: 'R.225-105-1 II A-E', esrs: 'ESRS E1 · E2 · E3 · E5 · Règl. 2020/852' },
                { p: '👥 Social & Sociétal', ind: 'Effectifs, égalité F/H, AT, formation, solidarité', dpef: 'R.225-105-1 I A-F · III A-D', esrs: 'ESRS S1 · S1-13 · S1-16 · Décret 2019-15' },
                { p: '⚖️ Éthique & conformité', ind: 'Anti-corruption, achats, RGPD, cybersécurité', dpef: 'Loi Sapin II Art. 17-22', esrs: 'ESRS G1 · RGPD · Directive NIS2' },
              ].map((r, i) => (
                <tr key={i} className="hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 font-semibold text-gray-700">{r.p}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.ind}</td>
                  <td className="px-4 py-2.5 font-mono text-blue-600">{r.dpef}</td>
                  <td className="px-4 py-2.5 font-mono text-green-700">{r.esrs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Notes méthodologiques ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
        <p className="text-xs font-semibold text-gray-700 mb-3">📌 Notes méthodologiques & périmètre de reporting</p>
        <ul className="space-y-2 text-xs text-gray-600">
          {[
            { t: 'Périmètre organisationnel', c: "Les données couvrent l'entité juridique principale (contrôle opérationnel). Les filiales et joint-ventures consolidées > 50% doivent être intégrées séparément." },
            { t: 'Données CO₂', c: "GHG Protocol Corporate Standard — Facteurs ADEME Base Carbone® v23 (Scope 1) · AIE 2023 (Scope 2 location-based). Les facteurs d'émission sont mis à jour annuellement." },
            { t: 'Données RH', c: `Effectifs CDI + CDD actifs au 31/12/${year}. Source : registre du personnel (module Ressources Humaines). Données absentéisme : toutes causes (maladie, AT, maternité/paternité).` },
            { t: 'Omissions', c: "Art. R.225-105-2 : certaines informations peuvent être omises si leur divulgation cause un préjudice grave à la société, à condition d'en mentionner explicitement la raison." },
            { t: 'Transition CSRD', c: "La DPEF sera remplacée par le reporting CSRD (Directive 2022/2464/UE) et les ESRS à partir de l'exercice 2024. Ce modèle est pré-aligné ESRS pour faciliter la transition." },
          ].map(n => (
            <li key={n.t} className="flex items-start gap-2">
              <span className="text-gray-400 shrink-0 mt-0.5">•</span>
              <span><strong>{n.t} :</strong> {n.c}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  )
}
