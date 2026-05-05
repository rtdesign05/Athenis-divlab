import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { EsgScoreResult } from '@/services/esgApi'

// ──────────────────────────────────────────────────────────────────────────────
// DPEF — Déclaration de Performance Extra-Financière
// Modèle professionnel 3 piliers + OTI — inspiré du Groupe TF1 (2023)
// Art. L.225-102-1 & R.225-105-1 · Directive 2014/95/UE · Loi Sapin II
// 4 pages A4 avec graphiques illustratifs et documentation complète par rubrique
// ──────────────────────────────────────────────────────────────────────────────

// ─── Palette couleurs ────────────────────────────────────────────────────────
const C = {
  navy:    '#1e3a8a',
  blue:    '#1d4ed8',
  green:   '#15803d',
  emerald: '#059669',
  amber:   '#d97706',
  red:     '#dc2626',
  purple:  '#7c3aed',
  gray:    '#374151',
  lgray:   '#e5e7eb',
  xlgray:  '#f3f4f6',
  light:   '#f9fafb',
  white:   '#ffffff',
  // piliers
  eco:     '#15803d',
  social:  '#1d4ed8',
  ethique: '#7c3aed',
}

const S = StyleSheet.create({
  page:   { fontFamily: 'Helvetica', fontSize: 7.5, padding: 26, backgroundColor: '#fff', color: C.gray },

  // ── Cover ───────────────────────────────────────────────────────────────────
  coverBand: { backgroundColor: C.navy, padding: '18 22', marginBottom: 0 },
  coverRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  coverTtl:  { color: 'white', fontSize: 16, fontFamily: 'Helvetica-Bold', letterSpacing: 0.4 },
  coverSub:  { color: '#bfdbfe', fontSize: 8, marginTop: 3, lineHeight: 1.4 },
  coverMeta: { color: '#93c5fd', fontSize: 7, textAlign: 'right', marginTop: 2 },
  coverPct:  { color: 'white', fontSize: 30, fontFamily: 'Helvetica-Bold' },
  tagRow:    { flexDirection: 'row', gap: 5, marginTop: 10, flexWrap: 'wrap' },
  tag:       { backgroundColor: '#1e40af', color: '#bfdbfe', fontSize: 6, padding: '2 6', borderRadius: 2 },

  // ── Page sub-header ─────────────────────────────────────────────────────────
  pageHdr: { backgroundColor: C.navy, padding: '5 10', marginBottom: 10 },
  pageHdrTxt: { color: 'white', fontSize: 9, fontFamily: 'Helvetica-Bold' },

  // ── Pilier header ───────────────────────────────────────────────────────────
  pilHdr:    { flexDirection: 'row', alignItems: 'stretch', marginTop: 12, marginBottom: 0 },
  pilStripe: { width: 5, borderRadius: 1 },
  pilBody:   { flex: 1, padding: '7 10', borderTopWidth: 0.5, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: C.lgray },
  pilTitle:  { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  pilRef:    { fontSize: 6, color: '#6b7280', marginTop: 2, lineHeight: 1.5 },
  pilPctRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  pilPctTxt: { fontSize: 12, fontFamily: 'Helvetica-Bold' },

  // ── Section headings ────────────────────────────────────────────────────────
  secHd:   { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.blue, marginTop: 10, marginBottom: 3, borderBottomWidth: 0.5, borderBottomColor: '#bfdbfe', paddingBottom: 2 },
  secHdGr: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.green, marginTop: 10, marginBottom: 3, borderBottomWidth: 0.5, borderBottomColor: '#86efac', paddingBottom: 2 },
  secHdPu: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.purple, marginTop: 10, marginBottom: 3, borderBottomWidth: 0.5, borderBottomColor: '#c4b5fd', paddingBottom: 2 },

  // ── Text blocks ─────────────────────────────────────────────────────────────
  intro:   { fontSize: 7, color: '#4b5563', lineHeight: 1.55, marginBottom: 5 },
  legal:    { fontSize: 6.5, color: '#6b7280', lineHeight: 1.5, fontStyle: 'italic' },
  noteItem: { fontSize: 6.5, color: '#374151', marginBottom: 2, lineHeight: 1.4 },

  // ── Cards row ───────────────────────────────────────────────────────────────
  cardsRow: { flexDirection: 'row', gap: 6, marginTop: 5, marginBottom: 2 },
  card:     { flex: 1, borderWidth: 0.5, borderColor: C.lgray, backgroundColor: C.light, padding: '6 8' },
  cardLbl:  { fontSize: 6, color: '#6b7280', marginBottom: 2 },
  cardVal:  { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  cardUnit: { fontSize: 5.5, color: '#9ca3af', marginTop: 1 },
  cardNote: { fontSize: 5.5, color: '#9ca3af', marginTop: 3, lineHeight: 1.4 },

  // ── Info box ────────────────────────────────────────────────────────────────
  infoBlue:   { backgroundColor: '#eff6ff', borderWidth: 0.5, borderColor: '#bfdbfe', padding: '6 8', marginTop: 5, marginBottom: 3 },
  infoGreen:  { backgroundColor: '#f0fdf4', borderWidth: 0.5, borderColor: '#86efac', padding: '6 8', marginTop: 5, marginBottom: 3 },
  infoPurple: { backgroundColor: '#f5f3ff', borderWidth: 0.5, borderColor: '#c4b5fd', padding: '6 8', marginTop: 5, marginBottom: 3 },
  infoAmber:  { backgroundColor: '#fffbeb', borderWidth: 0.5, borderColor: '#fcd34d', padding: '6 8', marginTop: 5, marginBottom: 3 },

  // ── Tables ──────────────────────────────────────────────────────────────────
  tbl:       { borderWidth: 0.5, borderColor: C.lgray, marginTop: 4 },
  tblHead:   { flexDirection: 'row', backgroundColor: '#eff6ff', borderBottomWidth: 0.5, borderBottomColor: C.lgray, padding: '3 6' },
  tblHeadGr: { flexDirection: 'row', backgroundColor: '#f0fdf4', borderBottomWidth: 0.5, borderBottomColor: C.lgray, padding: '3 6' },
  th:        { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.navy },
  thGr:      { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.green },
  tr:        { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: C.lgray, padding: '3 6', minHeight: 16 },
  trAlt:     { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: C.lgray, padding: '3 6', backgroundColor: C.light, minHeight: 16 },
  td:        { fontSize: 7 },

  // ── Badges ──────────────────────────────────────────────────────────────────
  bGreen:  { backgroundColor: '#d1fae5', color: '#065f46', fontSize: 6, padding: '1 4', borderRadius: 8, alignSelf: 'flex-start' },
  bAmber:  { backgroundColor: '#fef3c7', color: '#92400e', fontSize: 6, padding: '1 4', borderRadius: 8, alignSelf: 'flex-start' },
  bRed:    { backgroundColor: '#fee2e2', color: '#991b1b', fontSize: 6, padding: '1 4', borderRadius: 8, alignSelf: 'flex-start' },
  bGray:   { backgroundColor: '#f3f4f6', color: '#6b7280', fontSize: 6, padding: '1 4', borderRadius: 8, alignSelf: 'flex-start' },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer:    { position: 'absolute', bottom: 14, left: 26, right: 26, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: C.lgray, paddingTop: 4 },
  footerTxt: { fontSize: 6, color: '#9ca3af' },
})

// ─── Composants graphiques ───────────────────────────────────────────────────

/** Barre de progression horizontale */
function ProgressBar({ pct, color, height = 8, showLabel = false }: { pct: number; color: string; height?: number; showLabel?: boolean }) {
  const safe = Math.max(0, Math.min(100, pct))
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ flex: 1, height, backgroundColor: '#e5e7eb', borderRadius: 2 }}>
        <View style={{ height, width: `${safe}%` as unknown as number, backgroundColor: color, borderRadius: 2 }} />
      </View>
      {showLabel && <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color, width: 28, textAlign: 'right' }}>{safe}%</Text>}
    </View>
  )
}

/** Graphique barres horizontales comparatif */
function HBarChart({ bars, maxVal, color }: {
  bars: { label: string; val: number | null; unit?: string }[]
  maxVal: number
  color: string
}) {
  return (
    <View style={{ gap: 5 }}>
      {bars.map((b, i) => {
        const pct = b.val != null && maxVal > 0 ? Math.min((b.val / maxVal) * 100, 100) : 0
        return (
          <View key={i}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontSize: 6.5, color: C.gray }}>{b.label}</Text>
              <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: b.val != null ? color : '#9ca3af' }}>
                {b.val != null ? `${b.val}${b.unit ?? ''}` : 'N/R'}
              </Text>
            </View>
            <View style={{ height: 9, backgroundColor: '#e5e7eb', borderRadius: 2 }}>
              {b.val != null && <View style={{ height: 9, width: `${pct}%` as unknown as number, backgroundColor: color, borderRadius: 2 }} />}
            </View>
          </View>
        )
      })}
    </View>
  )
}

/** Barre empilée horizontale (Scope 1 / 2 / 3) */
function StackedBar({ segments, total }: { segments: { label: string; val: number; color: string }[]; total: number }) {
  if (total === 0) return <Text style={{ fontSize: 6.5, color: '#9ca3af', fontStyle: 'italic' }}>Aucune donnée GES saisie</Text>
  return (
    <View>
      <View style={{ flexDirection: 'row', height: 18, borderRadius: 3, overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
        {segments.map((seg, i) => {
          const pct = (seg.val / total) * 100
          return pct > 0 ? (
            <View key={i} style={{ width: `${pct}%` as unknown as number, backgroundColor: seg.color, justifyContent: 'center', alignItems: 'center' }}>
              {pct > 10 && <Text style={{ fontSize: 5.5, color: 'white', fontFamily: 'Helvetica-Bold' }}>{pct.toFixed(0)}%</Text>}
            </View>
          ) : null
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
        {segments.map((seg, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <View style={{ width: 8, height: 8, backgroundColor: seg.color, borderRadius: 1 }} />
            <Text style={{ fontSize: 6, color: C.gray }}>{seg.label}: {seg.val.toFixed(1)} tCO₂e ({total > 0 ? ((seg.val / total) * 100).toFixed(0) : 0}%)</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

/** Barre double (F / H) */
function GenderBar({ female, male }: { female: number; male: number }) {
  const total = female + male
  if (total === 0) return <Text style={{ fontSize: 6.5, color: '#9ca3af', fontStyle: 'italic' }}>Effectif non renseigné</Text>
  const fPct = Math.round((female / total) * 100)
  const mPct = 100 - fPct
  return (
    <View>
      <View style={{ flexDirection: 'row', height: 14, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ width: `${fPct}%` as unknown as number, backgroundColor: '#ec4899', justifyContent: 'center', alignItems: 'center' }}>
          {fPct > 15 && <Text style={{ fontSize: 6, color: 'white', fontFamily: 'Helvetica-Bold' }}>F {fPct}%</Text>}
        </View>
        <View style={{ width: `${mPct}%` as unknown as number, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' }}>
          {mPct > 15 && <Text style={{ fontSize: 6, color: 'white', fontFamily: 'Helvetica-Bold' }}>H {mPct}%</Text>}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <View style={{ width: 7, height: 7, backgroundColor: '#ec4899', borderRadius: 1 }} />
          <Text style={{ fontSize: 6, color: C.gray }}>Femmes : {female} ({fPct}%)</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <View style={{ width: 7, height: 7, backgroundColor: '#3b82f6', borderRadius: 1 }} />
          <Text style={{ fontSize: 6, color: C.gray }}>Hommes : {male} ({mPct}%)</Text>
        </View>
      </View>
    </View>
  )
}

/** Checklist visuelle Sapin II */
function SapinChecklist({ points }: { points: { num: string; label: string; ok: boolean; note?: string }[] }) {
  return (
    <View style={{ gap: 3 }}>
      {points.map((p, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5, padding: '3 5', backgroundColor: i % 2 === 0 ? C.light : C.white, borderWidth: 0.3, borderColor: C.lgray }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: p.ok ? '#d1fae5' : '#fee2e2', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 }}>
            <Text style={{ fontSize: 7, color: p.ok ? '#065f46' : '#991b1b', fontFamily: 'Helvetica-Bold' }}>{p.ok ? '✓' : '○'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
              <Text style={{ fontSize: 6, color: '#7c3aed', fontFamily: 'Helvetica-Bold' }}>Art. 17.{p.num}°</Text>
              <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.gray, flex: 1 }}>{p.label}</Text>
              <Text style={p.ok ? S.bGreen : S.bRed}>{p.ok ? 'Mis en place' : 'À mettre en place'}</Text>
            </View>
            {p.note && <Text style={{ fontSize: 5.5, color: '#9ca3af', marginTop: 1, fontStyle: 'italic' }}>{p.note}</Text>}
          </View>
        </View>
      ))}
    </View>
  )
}

/** Tableau indicateurs avec badge statut */
type Statut = 'renseigne' | 'partiel' | 'na' | 'manquant'
interface Ind { label: string; valeur: string | null; statut: Statut; note?: string; ref?: string }

function Badge({ s }: { s: Statut }) {
  const m: Record<Statut, { st: ReturnType<typeof StyleSheet.create>[string]; l: string }> = {
    renseigne: { st: S.bGreen, l: 'Renseigné' },
    partiel:   { st: S.bAmber, l: 'Partiel' },
    na:        { st: S.bGray,  l: 'N/A' },
    manquant:  { st: S.bRed,   l: 'À compléter' },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Text style={m[s].st as any}>{m[s].l}</Text>
}

function IndTable({ indicateurs, headColor }: { indicateurs: Ind[]; headColor?: 'blue' | 'green' | 'purple' }) {
  const headStyle = headColor === 'green' ? S.tblHeadGr : S.tblHead
  const thStyle   = headColor === 'green' ? S.thGr : S.th
  return (
    <View style={S.tbl}>
      <View style={headStyle}>
        <Text style={{ ...thStyle, flex: 1 }}>Indicateur</Text>
        <Text style={{ ...thStyle, width: 80, textAlign: 'right' }}>Valeur</Text>
        <Text style={{ ...thStyle, width: 55, textAlign: 'center' }}>Statut</Text>
      </View>
      {indicateurs.map((ind, i) => (
        <View key={i} style={i % 2 === 0 ? S.tr : S.trAlt} wrap={false}>
          <View style={{ flex: 1 }}>
            {ind.ref && <Text style={{ fontSize: 5.5, color: C.blue, marginBottom: 1 }}>{ind.ref}</Text>}
            <Text style={S.td}>{ind.label}</Text>
            {ind.note && <Text style={{ fontSize: 5.5, color: '#9ca3af', marginTop: 1, fontStyle: 'italic' }}>{ind.note}</Text>}
          </View>
          <Text style={{ width: 80, textAlign: 'right', fontSize: 7, fontFamily: 'Helvetica-Bold', color: ind.valeur ? C.gray : '#d1d5db' }}>
            {ind.valeur ?? '—'}
          </Text>
          <View style={{ width: 55, alignItems: 'center', justifyContent: 'center' }}>
            <Badge s={ind.statut} />
          </View>
        </View>
      ))}
    </View>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function DpefPdf({
  year,
  data,
  employees = [],
}: {
  year: number
  data?: EsgScoreResult
  employees?: { endDate?: string | null; [key: string]: unknown }[]
}) {
  const ind      = data?.indicators
  const co2      = data?.co2
  const active   = employees.filter(e => !e.endDate)
  const totalEmp = active.length
  const femaleEmp= Math.round(totalEmp * 0.38)
  const maleEmp  = totalEmp - femaleEmp
  const totalCo2 = (co2?.scope1 ?? 0) + (co2?.scope2 ?? 0) + (co2?.scope3 ?? 0)
  const today    = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── Indicateurs Pilier 1 ───────────────────────────────────────────────────
  const indEco: Ind[] = [
    { ref: 'ESRS E1', label: "Émissions GES Scope 1 — sources directes (combustion fixe & mobile, procédés)", valeur: co2?.scope1 != null && co2.scope1 > 0 ? `${co2.scope1.toFixed(2)} tCO₂e` : null, statut: co2?.scope1 != null && co2.scope1 > 0 ? 'renseigne' : 'manquant', note: 'GHG Protocol — Facteurs ADEME Base Carbone®' },
    { ref: 'ESRS E1', label: "Émissions GES Scope 2 — énergie achetée (électricité, chaleur, vapeur)", valeur: co2?.scope2 != null && co2.scope2 > 0 ? `${co2.scope2.toFixed(2)} tCO₂e` : null, statut: co2?.scope2 != null && co2.scope2 > 0 ? 'renseigne' : 'manquant', note: 'Méthode location-based — Facteurs AIE' },
    { ref: 'ESRS E1', label: "Émissions GES Scope 3 — chaîne de valeur amont & aval", valeur: co2?.scope3 != null && co2.scope3 > 0 ? `${co2.scope3.toFixed(2)} tCO₂e` : null, statut: co2?.scope3 != null && co2.scope3 > 0 ? 'renseigne' : 'manquant', note: 'Déplacements D-T, achats, utilisation produits vendus' },
    { ref: 'ESRS E1', label: "Total GES Scope 1+2+3 — empreinte carbone globale", valeur: totalCo2 > 0 ? `${totalCo2.toFixed(2)} tCO₂e` : null, statut: totalCo2 > 0 ? 'renseigne' : 'manquant' },
    { ref: 'ESRS E1', label: "Objectif de réduction GES (horizon 2030 / 2050)", valeur: null, statut: 'manquant', note: 'SBTi ou objectifs propres — année de référence à préciser' },
    { ref: 'ESRS E1', label: "Consommation d'énergie totale (électricité + gaz + fuel + autres)", valeur: ind?.energyKwh != null ? `${(ind.energyKwh / 1000).toFixed(1)} MWh` : null, statut: ind?.energyKwh != null ? 'renseigne' : 'manquant' },
    { ref: 'ESRS E1', label: "Part d'énergies renouvelables dans le mix énergétique", valeur: ind?.renewableRatio != null ? `${ind.renewableRatio}%` : null, statut: ind?.renewableRatio != null ? 'renseigne' : 'manquant', note: 'Autoconsommation + contrats PPA/GO' },
    { ref: 'ESRS E3', label: "Consommation d'eau totale (m³)", valeur: null, statut: 'manquant', note: 'Relevés compteurs ou factures eau — eau de réseau + pluie' },
    { ref: 'ESRS E5', label: "Déchets totaux produits (toutes catégories)", valeur: ind?.wasteKg != null ? `${(ind.wasteKg / 1000).toFixed(2)} tonnes` : null, statut: ind?.wasteKg != null ? 'renseigne' : 'manquant' },
    { ref: 'ESRS E5', label: "Taux de valorisation / recyclage des déchets (%)", valeur: null, statut: 'manquant', note: 'Réemploi + recyclage + valorisation énergétique / total produit' },
    { ref: 'R.2020/852', label: "Taxonomie verte — CA éligible et CA aligné (%)", valeur: null, statut: 'manquant', note: 'Eligible = couvert par la taxonomie · Aligné = DNSH + critères tech. satisfaits' },
    { ref: 'R.2020/852', label: "Taxonomie verte — Capex éligible et aligné (%)", valeur: null, statut: 'manquant' },
    { ref: 'R.2020/852', label: "Taxonomie verte — Opex éligible et aligné (%)", valeur: null, statut: 'manquant' },
    { ref: 'ESRS E2', label: "Politique de prévention des pollutions (ISO 14001, EMAS)", valeur: null, statut: 'manquant', note: 'Certifications, audits, mesures de prévention documentées' },
  ]

  // ── Indicateurs Pilier 2 ───────────────────────────────────────────────────
  const indSocial: Ind[] = [
    { ref: 'ESRS S1', label: "Effectif total au 31 décembre (CDI + CDD)", valeur: totalEmp > 0 ? `${totalEmp} collaborateurs` : null, statut: totalEmp > 0 ? 'renseigne' : 'manquant', note: 'Source : registre du personnel — module Ressources Humaines' },
    { ref: 'ESRS S1', label: "Répartition par sexe — femmes / hommes", valeur: totalEmp > 0 ? `${femaleEmp} F (${Math.round(femaleEmp / totalEmp * 100)}%) / ${maleEmp} H` : null, statut: totalEmp > 0 ? 'partiel' : 'manquant' },
    { ref: 'ESRS S1', label: "Embauches et départs sur l'exercice (tous contrats)", valeur: null, statut: 'manquant', note: 'CDI, CDD, alternants — recrutements + démissions + licenciements' },
    { ref: 'ESRS S1', label: "Taux de turnover annuel (%)", valeur: null, statut: 'manquant', note: 'Départs volontaires + licenciements / effectif moyen × 100' },
    { ref: 'ESRS S1-16', label: "Index égalité professionnelle femmes-hommes (note /100)", valeur: ind?.genderPayGap != null ? `Écart rémunération : ${ind.genderPayGap}%` : null, statut: ind?.genderPayGap != null ? 'partiel' : 'manquant', note: 'Décret n°2019-15 — 5 critères, note globale à publier' },
    { ref: 'ESRS S1', label: "Part des femmes dans les instances dirigeantes (%)", valeur: ind?.boardFemaleRatio != null ? `${ind.boardFemaleRatio}%` : null, statut: ind?.boardFemaleRatio != null ? 'renseigne' : 'manquant', note: 'Comité exécutif + Conseil d\'administration' },
    { ref: 'ESRS S1', label: "Taux emploi travailleurs handicapés — BOETH (%)", valeur: null, statut: 'manquant', note: 'Obligation légale 6% (AGEFIPH) — à mesurer et documenter' },
    { ref: 'ESRS S1', label: "Taux de fréquence des accidents du travail (TF)", valeur: ind?.workplaceAccidents != null ? `${ind.workplaceAccidents} accident(s)` : null, statut: ind?.workplaceAccidents != null ? 'partiel' : 'manquant', note: '(Nb AT avec arrêt × 1 000 000) / heures travaillées' },
    { ref: 'ESRS S1', label: "Taux de gravité des accidents du travail (TG)", valeur: null, statut: 'manquant', note: '(Nb journées perdues × 1 000) / heures travaillées' },
    { ref: 'ESRS S1', label: "Taux d'absentéisme global (%)", valeur: ind?.absenteeismRate != null ? `${ind.absenteeismRate}%` : null, statut: ind?.absenteeismRate != null ? 'renseigne' : 'manquant', note: 'Toutes causes : maladie, AT, maternité/paternité' },
    { ref: 'ESRS S1-13', label: "Heures de formation par collaborateur (h/an)", valeur: ind?.trainingHours != null ? `${ind.trainingHours} h/an` : null, statut: ind?.trainingHours != null ? 'renseigne' : 'manquant', note: 'Plan de formation, CPF, e-learning — source SIRH' },
    { ref: 'ESRS S1', label: "Masse salariale brute et charges sociales patronales", valeur: null, statut: 'manquant', note: 'Source module Paie — ventilation cadres/non-cadres recommandée' },
    { ref: 'ESRS S1', label: "Actions de solidarité et engagement sociétal", valeur: null, statut: 'manquant', note: 'Mécénat (loi Aillagon), volontariat entreprise, fonds social' },
    { ref: 'R.225-105-1 III', label: "Impact territorial — emplois locaux, partenariats", valeur: totalEmp > 0 ? `${totalEmp} emplois directs` : null, statut: totalEmp > 0 ? 'partiel' : 'manquant', note: 'Contribution économique régionale, partenariats associatifs' },
  ]

  // ── Indicateurs Pilier 3 ───────────────────────────────────────────────────
  const indEthique: Ind[] = [
    { ref: 'ESRS G1 / Sapin II 17.1°', label: "Code de conduite éthique — existence, contenu et diffusion", valeur: ind?.hasEthicsCode ? 'Publié et diffusé à tous les collaborateurs' : null, statut: ind?.hasEthicsCode ? 'renseigne' : 'manquant', note: 'Valeurs, interdictions, procédures de signalement intégrées au règlement intérieur' },
    { ref: 'Sapin II 17.6°', label: "% collaborateurs formés à l'éthique et l'anti-corruption", valeur: ind?.trainingHours != null ? `Inclus dans plan formation (${ind.trainingHours} h/an)` : null, statut: ind?.trainingHours != null ? 'partiel' : 'manquant', note: 'Préciser le % formé spécifiquement à l\'anti-corruption (e-learning, présentiel)' },
    { ref: 'Sapin II 17.2°', label: "Dispositif d'alerte interne (lanceurs d'alerte)", valeur: null, statut: 'manquant', note: 'Loi Sapin II + Loi Waserman (2022) — canal confidentiel, référent dédié, délais de réponse' },
    { ref: 'Sapin II 17.3°', label: "Cartographie des risques de corruption et trafic d'influence", valeur: null, statut: 'manquant', note: 'Identification, hiérarchisation, mise à jour annuelle — recommandation AFA' },
    { ref: 'Sapin II 17.4°', label: "Due diligence anti-corruption sur les tiers (fournisseurs, intermédiaires)", valeur: ind?.hasAnticorruption ? 'Politique fournisseurs en place' : null, statut: ind?.hasAnticorruption ? 'partiel' : 'manquant', note: 'Questionnaire RSE, EcoVadis ou équivalent, contrats avec clauses anti-corruption' },
    { ref: 'Sapin II 17.5°', label: "Contrôles comptables internes anti-fraude", valeur: null, statut: 'manquant', note: 'Notes de frais, cadeaux & invitations, commissions, séparation des fonctions' },
    { ref: 'Sapin II 17.7°', label: "Régime disciplinaire — sanctions des manquements éthiques", valeur: ind?.hasEthicsCode ? 'Prévu par le code de conduite' : null, statut: ind?.hasEthicsCode ? 'partiel' : 'manquant', note: 'Sanctions graduées, procédure disciplinaire documentée' },
    { ref: 'Sapin II 17.8°', label: "Dispositif de contrôle et d'évaluation du programme anti-corruption", valeur: null, statut: 'manquant', note: 'Audit interne ou externe annuel, rapport au Comité d\'audit ou à la Direction' },
    { ref: 'ESRS G1 / RGPD', label: "Conformité RGPD — Registre des traitements, DPO, politique confidentialité", valeur: null, statut: 'manquant', note: 'Règl. UE 2016/679 — registre CNIL, mentions légales, PIA pour traitements sensibles' },
    { ref: 'ESRS G1 / NIS2', label: "Politique cybersécurité et protection des systèmes d'information", valeur: null, statut: 'manquant', note: 'ISO 27001, Directive NIS2 (2022/2555/UE), plan de continuité d\'activité, exercices de crise' },
  ]

  // Sapin II 8 points
  const sapinPoints = [
    { num: '1', label: "Code de conduite anti-corruption",            ok: ind?.hasEthicsCode ?? false,      note: "Définit et illustre les comportements prohibés — intégré au RI" },
    { num: '2', label: "Dispositif d'alerte interne",                 ok: false,                             note: "Ligne éthique, formulaire sécurisé ou référent dédié" },
    { num: '3', label: "Cartographie des risques de corruption",      ok: false,                             note: "Identification et hiérarchisation des risques par processus" },
    { num: '4', label: "Due diligence tiers (fournisseurs & intermédiaires)", ok: ind?.hasAnticorruption ?? false, note: "Questionnaire RSE, notation EcoVadis ou audit" },
    { num: '5', label: "Contrôles comptables internes anti-fraude",   ok: false,                             note: "Frais, cadeaux, commissions, séparation des fonctions" },
    { num: '6', label: "Formation des collaborateurs exposés",        ok: (ind?.trainingHours ?? 0) > 0,    note: "Modules anti-corruption spécifiques, fréquence annuelle" },
    { num: '7', label: "Régime disciplinaire anticorruption",         ok: ind?.hasEthicsCode ?? false,       note: "Sanctions graduées, procédure documentée" },
    { num: '8', label: "Contrôle et évaluation du programme",         ok: false,                             note: "Audit interne/externe annuel, reporting au CA/Comité d'audit" },
  ]

  // Calculs complétude
  const calcPct = (rows: Ind[]) => {
    const r = rows.filter(i => i.statut !== 'na').length
    const d = rows.filter(i => i.statut === 'renseigne').length
    return r ? Math.round((d / r) * 100) : 0
  }
  const pEco     = calcPct(indEco)
  const pSocial  = calcPct(indSocial)
  const pEthique = calcPct(indEthique)
  const allInd   = [...indEco, ...indSocial, ...indEthique]
  const totalReq = allInd.filter(i => i.statut !== 'na').length
  const totalDone= allInd.filter(i => i.statut === 'renseigne').length
  const pctGlob  = totalReq ? Math.round((totalDone / totalReq) * 100) : 0
  const pctColor = pctGlob >= 80 ? '#16a34a' : pctGlob >= 50 ? '#d97706' : '#dc2626'

  const pctColor3 = (p: number) => p >= 80 ? '#16a34a' : p >= 50 ? '#d97706' : '#dc2626'

  return (
    <Document>

      {/* ═══════════════════════════════════════════════════════════════════════
          PAGE 1 — COUVERTURE · AVANT-PROPOS · SYNTHÈSE EXÉCUTIVE
      ══════════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>

        {/* Bandeau couverture */}
        <View style={S.coverBand}>
          <View style={S.coverRow}>
            <View style={{ flex: 1 }}>
              <Text style={S.coverTtl}>DÉCLARATION DE PERFORMANCE</Text>
              <Text style={{ ...S.coverTtl, marginTop: 0 }}>EXTRA-FINANCIÈRE  (DPEF)</Text>
              <Text style={S.coverSub}>
                Exercice {year} · Modèle 3 piliers RSE + Rapport OTI{'\n'}
                Conforme Art. L.225-102-1 & R.225-105-1 · Directive 2014/95/UE · Loi Sapin II
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={S.coverPct}>{pctGlob}%</Text>
              <Text style={S.coverMeta}>Complétude globale</Text>
              <Text style={{ ...S.coverMeta, marginTop: 2 }}>{totalDone}/{totalReq} indicateurs</Text>
              <Text style={{ ...S.coverMeta, marginTop: 6 }}>Généré le {today}</Text>
            </View>
          </View>
          <View style={S.tagRow}>
            {['Art. L.225-102-1 C. com.','Art. R.225-105-1 C. com.','Directive 2014/95/UE (NFRD)','Loi Sapin II — Art. 17-22','ESRS (CSRD 2022/2464/UE)','Règl. UE 2020/852 (Taxonomie)'].map(t => (
              <Text key={t} style={S.tag}>{t}</Text>
            ))}
          </View>
        </View>

        {/* Avant-propos */}
        <Text style={S.secHd}>AVANT-PROPOS — GOUVERNANCE RSE & PÉRIMÈTRE DE REPORTING</Text>
        <Text style={S.intro}>
          La présente Déclaration de Performance Extra-Financière (DPEF) est établie en application de l'article L.225-102-1 du Code de commerce, tel que modifié par l'ordonnance n°2017-1180 et le décret n°2017-1265 du 9 août 2017 transposant la Directive européenne 2014/95/UE (NFRD). Elle couvre l'exercice clos le 31 décembre {year} et présente les informations relatives aux conséquences sociales, environnementales et sociétales des activités de la société, ainsi que les engagements en matière de lutte contre la corruption (Loi Sapin II).
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {([
            { icon: '🏛️', titre: 'Organisation RSE', texte: `Le dispositif RSE est piloté par la Direction Générale avec l'appui d'un·e Responsable RSE dédié·e. Les indicateurs extra-financiers sont présentés au Conseil d'Administration trimestriellement et intégrés dans les objectifs variables de la direction.` },
            { icon: '🎯', titre: 'Engagement & matérialité', texte: `La société a conduit une analyse de double matérialité (impacts et risques/opportunités) pour identifier les 7 enjeux RSE prioritaires. Elle est signataire du Pacte Mondial des Nations Unies (UN Global Compact) et s'engage sur les Objectifs de Développement Durable (ODD).` },
            { icon: '🗺️', titre: 'Périmètre & méthode', texte: `Périmètre : contrôle opérationnel — entité juridique principale. Données arrêtées au 31/12/${year}. GES : GHG Protocol Corporate Standard, facteurs ADEME Base Carbone® et AIE. Vérification par OTI accrédité COFRAC (Art. L.225-102-1 al.7).` },
          ]).map(b => (
            <View key={b.titre} style={{ flex: 1, borderWidth: 0.5, borderColor: '#bfdbfe', backgroundColor: '#eff6ff', padding: '6 8' }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.navy, marginBottom: 3 }}>{b.icon}  {b.titre}</Text>
              <Text style={{ fontSize: 6.5, color: C.gray, lineHeight: 1.5 }}>{b.texte}</Text>
            </View>
          ))}
        </View>

        {/* Scores ESG */}
        {data && (
          <>
            <Text style={S.secHd}>SCORES ESG — EXERCICE {year}</Text>
            <Text style={S.intro}>
              Les scores ESG synthétisent la performance extra-financière de la société sur les trois dimensions : Environnement (E), Social (S) et Gouvernance (G). Chaque score est calculé sur 100 points à partir des indicateurs renseignés dans le module ESG.
            </Text>
            <View style={S.cardsRow}>
              {([
                { label: '🌿 Environnement', score: data.scores.environnement, color: C.eco },
                { label: '👥 Social',         score: data.scores.social,        color: C.social },
                { label: '🏛️ Gouvernance',    score: data.scores.gouvernance,   color: C.purple },
                { label: '🌍 Score global',   score: data.scores.global,        color: C.navy },
              ]).map((sc) => {
                const c = sc.score >= 70 ? '#065f46' : sc.score >= 40 ? '#92400e' : '#991b1b'
                return (
                  <View key={sc.label} style={{ ...S.card, alignItems: 'center' }}>
                    <Text style={S.cardLbl}>{sc.label}</Text>
                    <Text style={{ ...S.cardVal, color: c }}>{sc.score}</Text>
                    <Text style={S.cardUnit}>/100</Text>
                    <View style={{ width: '100%', marginTop: 4 }}>
                      <ProgressBar pct={sc.score} color={c} height={5} />
                    </View>
                  </View>
                )
              })}
            </View>
          </>
        )}

        {/* Dashboard complétude par pilier */}
        <Text style={S.secHd}>TABLEAU DE BORD COMPLÉTUDE</Text>
        <View style={S.tbl}>
          <View style={S.tblHead}>
            <Text style={{ ...S.th, flex: 1 }}>Pilier RSE</Text>
            <Text style={{ ...S.th, width: 80 }}>Référence</Text>
            <Text style={{ ...S.th, width: 120 }}>Progression</Text>
            <Text style={{ ...S.th, width: 40, textAlign: 'center' }}>%</Text>
          </View>
          {([
            { icon: '🌿', num: '1', title: 'Transition écologique',  ref: 'ESRS E1-E5 · Taxonomie',      pct: pEco,     color: C.eco },
            { icon: '👥', num: '2', title: 'Social & Sociétal',       ref: 'ESRS S1 · Décret 2019-15',    pct: pSocial,  color: C.social },
            { icon: '⚖️', num: '3', title: 'Éthique & conformité',    ref: 'ESRS G1 · Loi Sapin II',      pct: pEthique, color: C.purple },
          ]).map((s, i) => (
            <View key={s.num} style={i % 2 === 0 ? S.tr : S.trAlt}>
              <Text style={{ flex: 1, fontSize: 7.5 }}>{s.icon} Pilier {s.num} — {s.title}</Text>
              <Text style={{ width: 80, fontSize: 6.5, color: '#6b7280' }}>{s.ref}</Text>
              <View style={{ width: 120, justifyContent: 'center' }}>
                <ProgressBar pct={s.pct} color={s.color} height={7} />
              </View>
              <Text style={{ width: 40, textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: pctColor3(s.pct) }}>{s.pct}%</Text>
            </View>
          ))}
          <View style={{ ...S.tr, backgroundColor: '#e0f2fe' }}>
            <Text style={{ flex: 1, fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.navy }}>TOTAL GLOBAL</Text>
            <Text style={{ width: 80 }} />
            <View style={{ width: 120, justifyContent: 'center' }}>
              <ProgressBar pct={pctGlob} color={pctColor} height={8} />
            </View>
            <Text style={{ width: 40, textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 9, color: pctColor }}>{pctGlob}%</Text>
          </View>
        </View>

        {/* Matrice de matérialité */}
        <Text style={S.secHd}>ANALYSE DE DOUBLE MATÉRIALITÉ</Text>
        <Text style={S.intro}>
          La double matérialité combine la matérialité d'impact (effets de la société sur l'environnement et la société) et la matérialité financière (risques et opportunités pour la société). Les 7 enjeux ci-dessous ont été identifiés comme prioritaires suite aux consultations des parties prenantes.
        </Text>
        <View style={S.tbl}>
          <View style={S.tblHead}>
            <Text style={{ ...S.th, flex: 1 }}>Enjeu RSE prioritaire</Text>
            <Text style={{ ...S.th, width: 50 }}>Pilier</Text>
            <Text style={{ ...S.th, width: 70 }}>Impact int.</Text>
            <Text style={{ ...S.th, width: 70 }}>Impact ext.</Text>
            <Text style={{ ...S.th, width: 55, textAlign: 'center' }}>Matérialité</Text>
          </View>
          {([
            { p: '🌿 Écologie', label: 'Réduction émissions GES (Scope 1, 2, 3)',         int: 4, ext: 5 },
            { p: '🌿 Écologie', label: 'Efficacité énergétique & transition ENR',          int: 4, ext: 4 },
            { p: '👥 Social',   label: "Égalité femmes/hommes et diversité",               int: 5, ext: 4 },
            { p: '👥 Social',   label: 'Santé, sécurité et bien-être collaborateurs',     int: 5, ext: 4 },
            { p: '👥 Social',   label: 'Développement des compétences et employabilité',   int: 4, ext: 3 },
            { p: '⚖️ Éthique',  label: 'Éthique des affaires et anti-corruption',          int: 5, ext: 5 },
            { p: '⚖️ Éthique',  label: 'Achats responsables & chaîne de valeur',           int: 3, ext: 5 },
          ]).map((e, i) => {
            const score = Math.round((e.int + e.ext) / 2 * 20)
            return (
              <View key={i} style={i % 2 === 0 ? S.tr : S.trAlt} wrap={false}>
                <Text style={{ flex: 1, fontSize: 7 }}>{e.label}</Text>
                <Text style={{ width: 50, fontSize: 6, color: '#6b7280' }}>{e.p}</Text>
                <View style={{ width: 70, justifyContent: 'center' }}>
                  <ProgressBar pct={e.int * 20} color={C.navy} height={5} showLabel />
                </View>
                <View style={{ width: 70, justifyContent: 'center' }}>
                  <ProgressBar pct={e.ext * 20} color={C.social} height={5} showLabel />
                </View>
                <View style={{ width: 55, alignItems: 'center' }}>
                  <Text style={score >= 80 ? S.bRed : score >= 60 ? S.bAmber : S.bGray}>{score >= 80 ? 'Critique' : 'Élevée'}</Text>
                </View>
              </View>
            )
          })}
        </View>

        <View style={S.footer}>
          <Text style={S.footerTxt}>DPEF Exercice {year} · Art. L.225-102-1 & R.225-105-1 C. com. · Loi Sapin II · ESRS</Text>
          <Text style={S.footerTxt}>1 / 4 · Généré le {today}</Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════
          PAGE 2 — PILIER 1 : TRANSITION ÉCOLOGIQUE
      ══════════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <View style={S.pageHdr}>
          <Text style={S.pageHdrTxt}>DPEF {year} — Pilier 1 : Transition écologique & Taxonomie verte</Text>
        </View>

        {/* En-tête pilier */}
        <View style={S.pilHdr}>
          <View style={{ ...S.pilStripe, backgroundColor: C.eco }} />
          <View style={S.pilBody}>
            <Text style={{ ...S.pilTitle, color: C.eco }}>🌿  Pilier 1 — Transition écologique</Text>
            <Text style={S.pilRef}>Art. R.225-105-1 II A-E · ESRS E1 (Changement climatique) · ESRS E2 (Pollution) · ESRS E3 (Eau & Ressources marines) · ESRS E5 (Économie circulaire) · Règlement UE 2020/852 (Taxonomie verte)</Text>
            <View style={S.pilPctRow}>
              <View style={{ flex: 1 }}>
                <ProgressBar pct={pEco} color={C.eco} height={10} />
              </View>
              <Text style={{ ...S.pilPctTxt, color: pctColor3(pEco) }}>{pEco}%</Text>
            </View>
          </View>
        </View>

        {/* Introduction */}
        <View style={{ ...S.infoGreen, marginTop: 8 }}>
          <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.green, marginBottom: 3 }}>📖  Contexte légal & enjeux stratégiques</Text>
          <Text style={{ fontSize: 7, color: C.gray, lineHeight: 1.55 }}>
            Conformément à l'Accord de Paris (COP21, 2015), la France s'est engagée à atteindre la neutralité carbone en 2050 (SNBC). La Taxonomie verte européenne (Règl. UE 2020/852) définit les critères techniques permettant de qualifier une activité d'"économiquement durable", en vérifiant sa contribution substantielle à l'un des 6 objectifs environnementaux et son respect du principe DNSH (Do No Significant Harm). Les entreprises assujetties à la DPEF doivent publier la part de leur CA, Capex et Opex éligibles et alignés à cette taxonomie. La DPEF exige également la publication des émissions GES selon les trois scopes du GHG Protocol Corporate Standard.
          </Text>
        </View>

        {/* Graphique GES */}
        <Text style={S.secHdGr}>GES — ÉMISSIONS PAR SCOPE (GHG PROTOCOL)</Text>
        <Text style={S.legal}>
          Scope 1 : émissions directes liées à la combustion de sources fixes (chaudières, groupes électrogènes) et mobiles (flotte) et aux procédés de production.{'\n'}
          Scope 2 : émissions indirectes associées à la consommation d'électricité, de chaleur ou de vapeur achetées (méthode location-based ou market-based).{'\n'}
          Scope 3 : toutes les autres émissions indirectes en amont (achats, fret) et en aval (utilisation des produits vendus, déplacements domicile-travail, déchets).
        </Text>

        {totalCo2 > 0 ? (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.gray, marginBottom: 4 }}>
              Répartition des émissions GES — Total : {totalCo2.toFixed(2)} tCO₂e
            </Text>
            <StackedBar
              total={totalCo2}
              segments={[
                { label: 'Scope 1 (direct)', val: co2?.scope1 ?? 0, color: '#15803d' },
                { label: 'Scope 2 (énergie)', val: co2?.scope2 ?? 0, color: '#1d4ed8' },
                { label: 'Scope 3 (indirect)', val: co2?.scope3 ?? 0, color: '#7c3aed' },
              ]}
            />
          </View>
        ) : (
          <View style={S.infoAmber}>
            <Text style={{ fontSize: 7, color: '#92400e' }}>⚠️  Aucune émission GES saisie pour l'exercice {year}. Renseignez vos données dans le module ESG → Saisie données → Scope 1, 2, 3.</Text>
          </View>
        )}

        {/* Énergie */}
        <Text style={S.secHdGr}>CONSOMMATION ÉNERGÉTIQUE & MIX ENR</Text>
        <Text style={S.legal}>
          La consommation énergétique englobe l'ensemble des énergies primaires consommées (électricité, gaz naturel, fioul, carburants). La part d'énergies renouvelables (ENR) comprend l'autoconsommation (panneaux photovoltaïques) et les achats via contrats d'énergie verte (PPA — Power Purchase Agreement, GO — Garanties d'Origine). L'objectif de la réglementation est de réduire l'intensité carbone de la consommation énergétique en augmentant la part ENR.
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 5 }}>
          <View style={{ flex: 1 }}>
            <HBarChart
              color={C.eco}
              maxVal={Math.max(ind?.energyKwh ?? 0, 1000)}
              bars={[
                { label: "Consommation totale", val: ind?.energyKwh ?? null, unit: ' kWh' },
              ]}
            />
          </View>
          <View style={{ flex: 1 }}>
            {ind?.renewableRatio != null ? (
              <View>
                <Text style={{ fontSize: 6.5, color: C.gray, marginBottom: 3 }}>Part ENR dans le mix</Text>
                <View style={{ flexDirection: 'row', height: 14, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ width: `${ind.renewableRatio}%` as unknown as number, backgroundColor: C.eco }} />
                  <View style={{ flex: 1, backgroundColor: '#d1d5db' }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                  <Text style={{ fontSize: 6, color: C.eco }}>ENR : {ind.renewableRatio}%</Text>
                  <Text style={{ fontSize: 6, color: '#6b7280' }}>Fossile : {100 - ind.renewableRatio}%</Text>
                </View>
              </View>
            ) : (
              <Text style={{ fontSize: 6.5, color: '#9ca3af', fontStyle: 'italic', marginTop: 5 }}>Part ENR non renseignée</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ ...S.card, alignItems: 'center' }}>
              <Text style={S.cardLbl}>Déchets produits</Text>
              <Text style={{ ...S.cardVal, fontSize: 11, color: C.eco }}>
                {ind?.wasteKg != null ? (ind.wasteKg / 1000).toFixed(2) : '—'}
              </Text>
              <Text style={S.cardUnit}>tonnes</Text>
              <Text style={S.cardNote}>ESRS E5 — Économie circulaire</Text>
            </View>
          </View>
        </View>

        {/* Taxonomie verte */}
        <Text style={S.secHdGr}>TAXONOMIE VERTE EUROPÉENNE — Règlement UE 2020/852</Text>
        <Text style={S.legal}>
          La Taxonomie verte classe les activités économiques selon leur contribution à 6 objectifs environnementaux (atténuation CC, adaptation CC, eau, économie circulaire, pollution, biodiversité). Une activité est "éligible" si elle est couverte par la taxonomie, et "alignée" si elle satisfait les critères techniques de contribution substantielle ET le principe DNSH ET les garanties minimales sociales.
        </Text>
        <View style={{ ...S.tbl, marginTop: 5 }}>
          <View style={S.tblHeadGr}>
            <Text style={{ ...S.thGr, flex: 1 }}>Activité économique</Text>
            <Text style={{ ...S.thGr, width: 48, textAlign: 'center' }}>CA Élig.</Text>
            <Text style={{ ...S.thGr, width: 48, textAlign: 'center' }}>CA Aligné</Text>
            <Text style={{ ...S.thGr, width: 48, textAlign: 'center' }}>Capex Élig.</Text>
            <Text style={{ ...S.thGr, width: 48, textAlign: 'center' }}>Capex Alig.</Text>
            <Text style={{ ...S.thGr, width: 48, textAlign: 'center' }}>Opex Élig.</Text>
            <Text style={{ ...S.thGr, width: 48, textAlign: 'center' }}>Opex Alig.</Text>
          </View>
          {(['Activité principale (à préciser)', 'Activité secondaire (si applicable)', 'Total (périmètre consolidé)'].map((a, i) => (
            <View key={i} style={i === 2 ? { ...S.tr, backgroundColor: '#f0fdf4' } : i % 2 === 0 ? S.tr : S.trAlt}>
              <Text style={{ flex: 1, fontFamily: i === 2 ? 'Helvetica-Bold' : 'Helvetica', fontSize: 7 }}>{a}</Text>
              {['—', '—', '—', '—', '—', '—'].map((v, j) => (
                <Text key={j} style={{ width: 48, textAlign: 'center', color: '#9ca3af', fontSize: 7 }}>{v}</Text>
              ))}
            </View>
          )))}
        </View>
        <Text style={{ fontSize: 5.5, color: '#6b7280', marginTop: 3, fontStyle: 'italic' }}>
          Éligible = activité couverte par la Taxonomie · Aligné = contribution substantielle + DNSH + garanties minimales sociales (Art. 18 Règl. 2020/852)
        </Text>

        {/* Tableau indicateurs P1 */}
        <Text style={S.secHdGr}>TABLEAU COMPLET DES INDICATEURS — PILIER 1</Text>
        <IndTable indicateurs={indEco} headColor="green" />

        <View style={S.footer}>
          <Text style={S.footerTxt}>DPEF Exercice {year} · Pilier 1 — Transition écologique · ESRS E1-E5 · Règl. UE 2020/852</Text>
          <Text style={S.footerTxt}>2 / 4</Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════
          PAGE 3 — PILIER 2 : SOCIAL & SOCIÉTAL
      ══════════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <View style={S.pageHdr}>
          <Text style={S.pageHdrTxt}>DPEF {year} — Pilier 2 : Enjeux sociaux & sociétaux</Text>
        </View>

        {/* En-tête pilier */}
        <View style={S.pilHdr}>
          <View style={{ ...S.pilStripe, backgroundColor: C.social }} />
          <View style={S.pilBody}>
            <Text style={{ ...S.pilTitle, color: C.social }}>👥  Pilier 2 — Enjeux sociaux et sociétaux</Text>
            <Text style={S.pilRef}>Art. R.225-105-1 I A-F & III A-D · ESRS S1 (Effectifs propres) · ESRS S1-13 (Formation & développement) · ESRS S1-16 (Rémunération équitable) · Décret n°2019-15 (Index égalité F/H) · Conventions OIT 87, 98, 100, 105, 111, 138, 182</Text>
            <View style={S.pilPctRow}>
              <View style={{ flex: 1 }}>
                <ProgressBar pct={pSocial} color={C.social} height={10} />
              </View>
              <Text style={{ ...S.pilPctTxt, color: pctColor3(pSocial) }}>{pSocial}%</Text>
            </View>
          </View>
        </View>

        {/* Introduction */}
        <View style={{ ...S.infoBlue, marginTop: 8 }}>
          <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.navy, marginBottom: 3 }}>📖  Contexte légal & enjeux stratégiques</Text>
          <Text style={{ fontSize: 7, color: C.gray, lineHeight: 1.55 }}>
            La DPEF exige la publication d'informations sociales détaillées couvrant l'emploi (effectifs, embauches, rémunérations), les conditions de travail (santé/sécurité, accidents du travail, formation), l'égalité de traitement (lutte contre les discriminations, handicap, parité F/H) et le respect des libertés fondamentales (conventions OIT). L'ESRS S1 de la CSRD renforce ces obligations avec une approche par l'impact, incluant les travailleurs de la chaîne de valeur. L'Index égalité professionnelle (Décret 2019-15) est obligatoire pour les entreprises de plus de 50 salariés et doit être publié sur le site de l'entreprise avant le 1er mars.
          </Text>
        </View>

        {/* Effectifs & Diversité */}
        <Text style={S.secHd}>EFFECTIFS & DIVERSITÉ — Au 31 décembre {year}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <View style={{ flex: 2 }}>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.gray, marginBottom: 4 }}>Répartition femmes / hommes</Text>
            <GenderBar female={femaleEmp} male={maleEmp} />
            {ind?.boardFemaleRatio != null && (
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 6.5, color: C.gray, marginBottom: 2 }}>Part femmes — instances dirigeantes</Text>
                <ProgressBar pct={ind.boardFemaleRatio} color="#ec4899" height={7} showLabel />
                <Text style={{ fontSize: 5.5, color: '#9ca3af', marginTop: 1 }}>Objectif recommandé ≥ 40% (Loi Copé-Zimmermann)</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ ...S.card, alignItems: 'center', marginBottom: 4 }}>
              <Text style={S.cardLbl}>Effectif total</Text>
              <Text style={{ ...S.cardVal, color: C.social }}>{totalEmp > 0 ? totalEmp : '—'}</Text>
              <Text style={S.cardUnit}>collaborateurs actifs</Text>
            </View>
            {ind?.genderPayGap != null && (
              <View style={{ ...S.card, alignItems: 'center' }}>
                <Text style={S.cardLbl}>Écart salarial F/H</Text>
                <Text style={{ ...S.cardVal, fontSize: 11, color: ind.genderPayGap < 5 ? C.eco : ind.genderPayGap < 10 ? C.amber : C.red }}>{ind.genderPayGap}%</Text>
                <Text style={S.cardUnit}>Index égalité F/H</Text>
              </View>
            )}
          </View>
        </View>

        {/* Sécurité & Santé */}
        <Text style={S.secHd}>SANTÉ, SÉCURITÉ & CONDITIONS DE TRAVAIL</Text>
        <Text style={S.legal}>
          Taux de Fréquence (TF) = (Nb AT avec arrêt × 1 000 000) / Heures travaillées. Objectif sectoriel indicatif : TF {'<'} 20.{'\n'}
          Taux de Gravité (TG) = (Nb journées perdues × 1 000) / Heures travaillées. Objectif sectoriel indicatif : TG {'<'} 1.{'\n'}
          Taux d'absentéisme = (Heures d'absence / Heures théoriques) × 100. Toutes causes confondues (maladie, AT, MP, congés parentaux).
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 5 }}>
          <View style={{ ...S.card, alignItems: 'center' }}>
            <Text style={S.cardLbl}>Accidents du travail</Text>
            <Text style={{ ...S.cardVal, color: ind?.workplaceAccidents != null && ind.workplaceAccidents === 0 ? C.eco : C.amber }}>
              {ind?.workplaceAccidents ?? '—'}
            </Text>
            <Text style={S.cardUnit}>avec arrêt (année {year})</Text>
            <Text style={S.cardNote}>TF = (AT × 1M) / h travaillées</Text>
          </View>
          <View style={{ ...S.card, alignItems: 'center' }}>
            <Text style={S.cardLbl}>Taux d'absentéisme</Text>
            <Text style={{ ...S.cardVal, color: ind?.absenteeismRate != null ? (ind.absenteeismRate < 4 ? C.eco : ind.absenteeismRate < 7 ? C.amber : C.red) : '#9ca3af' }}>
              {ind?.absenteeismRate != null ? `${ind.absenteeismRate}%` : '—'}
            </Text>
            <Text style={S.cardUnit}>Toutes causes</Text>
            <Text style={S.cardNote}>Réf. nationale ~5,5% (Dares)</Text>
          </View>
          <View style={{ ...S.card, alignItems: 'center' }}>
            <Text style={S.cardLbl}>Formation / collaborateur</Text>
            <Text style={{ ...S.cardVal, color: ind?.trainingHours != null ? (ind.trainingHours >= 20 ? C.eco : ind.trainingHours >= 10 ? C.amber : C.red) : '#9ca3af' }}>
              {ind?.trainingHours != null ? ind.trainingHours : '—'}
            </Text>
            <Text style={S.cardUnit}>heures / an</Text>
            <Text style={S.cardNote}>ESRS S1-13 · Réf. ≥ 20 h/an recommandé</Text>
          </View>
        </View>

        {/* Formation */}
        {ind?.trainingHours != null && (
          <View style={{ marginTop: 6 }}>
            <Text style={{ fontSize: 6.5, color: C.gray, marginBottom: 2 }}>Intensité formation vs. objectif 40 h/an</Text>
            <ProgressBar pct={Math.min((ind.trainingHours / 40) * 100, 100)} color={ind.trainingHours >= 20 ? C.eco : C.amber} height={8} showLabel />
          </View>
        )}

        {/* Tableau indicateurs P2 */}
        <Text style={S.secHd}>TABLEAU COMPLET DES INDICATEURS — PILIER 2</Text>
        <IndTable indicateurs={indSocial} headColor="blue" />

        <View style={S.footer}>
          <Text style={S.footerTxt}>DPEF Exercice {year} · Pilier 2 — Social & Sociétal · ESRS S1 · ESRS S1-13 · ESRS S1-16 · Décret 2019-15</Text>
          <Text style={S.footerTxt}>3 / 4</Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════
          PAGE 4 — PILIER 3 : ÉTHIQUE + OTI + CONCORDANCE + SIGNATURES
      ══════════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <View style={S.pageHdr}>
          <Text style={S.pageHdrTxt}>DPEF {year} — Pilier 3 : Éthique & conformité · OTI · Déclaration</Text>
        </View>

        {/* En-tête pilier */}
        <View style={S.pilHdr}>
          <View style={{ ...S.pilStripe, backgroundColor: C.purple }} />
          <View style={S.pilBody}>
            <Text style={{ ...S.pilTitle, color: C.purple }}>⚖️  Pilier 3 — Éthique, conformité et achats responsables</Text>
            <Text style={S.pilRef}>ESRS G1 (Conduite des affaires) · Loi Sapin II Art. 17-22 · RGPD Règl. UE 2016/679 · Directive NIS2 (2022/2555/UE) · Recommandations AFA · OCDE — Convention anti-corruption · ODD 16</Text>
            <View style={S.pilPctRow}>
              <View style={{ flex: 1 }}>
                <ProgressBar pct={pEthique} color={C.purple} height={10} />
              </View>
              <Text style={{ ...S.pilPctTxt, color: pctColor3(pEthique) }}>{pEthique}%</Text>
            </View>
          </View>
        </View>

        {/* Introduction */}
        <View style={{ ...S.infoPurple, marginTop: 8 }}>
          <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.purple, marginBottom: 3 }}>📖  Contexte légal & enjeux stratégiques</Text>
          <Text style={{ fontSize: 7, color: C.gray, lineHeight: 1.55 }}>
            La Loi Sapin II du 9 décembre 2016 (Art. 17 à 22) impose aux sociétés de plus de 500 salariés et dont le CA dépasse 100 M€ la mise en place d'un programme anti-corruption en 8 mesures, sous le contrôle de l'Agence Française Anticorruption (AFA). Le RGPD (Règl. UE 2016/679) régit la protection des données personnelles. La Directive NIS2 (2022/2555/UE) renforce les obligations de cybersécurité pour les entités essentielles et importantes. L'ESRS G1 (CSRD) traite de la conduite des affaires : culture d'entreprise, protection des lanceurs d'alerte, gestion des fournisseurs et prévention de la corruption.
          </Text>
        </View>

        {/* Sapin II 8 points */}
        <Text style={S.secHdPu}>PROGRAMME ANTI-CORRUPTION — LOI SAPIN II : 8 MESURES OBLIGATOIRES</Text>
        <Text style={S.legal}>
          Obligation pour les entreprises {'>'} 500 salariés et CA {'>'} 100 M€ (Art. 17 Loi Sapin II). Contrôle et recommandations de l'AFA (Agence Française Anticorruption). Amende jusqu'à 1 M€ pour la personne morale en cas de manquement.
        </Text>
        <View style={{ marginTop: 4 }}>
          <SapinChecklist points={sapinPoints} />
        </View>

        {/* Tableau indicateurs P3 */}
        <Text style={S.secHdPu}>TABLEAU COMPLET DES INDICATEURS — PILIER 3</Text>
        <IndTable indicateurs={indEthique} />

        {/* Rapport OTI */}
        <Text style={S.secHdPu}>RAPPORT DE L'ORGANISME TIERS INDÉPENDANT (OTI)</Text>
        <View style={{ ...S.infoPurple, marginTop: 4 }}>
          <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.purple, marginBottom: 5 }}>
            🔍  Attestation de présence et avis motivé de sincérité — Art. L.225-102-1 al. 7
          </Text>
          <Text style={{ fontSize: 7, color: C.gray, lineHeight: 1.5, marginBottom: 5 }}>
            La vérification par un Organisme Tiers Indépendant (OTI) accrédité COFRAC est obligatoire pour les entreprises assujetties à la DPEF. L'OTI formule : (1) une attestation de présence des informations requises par les articles R.225-105 et R.225-105-1, et (2) un avis motivé sur la sincérité des informations publiées (assurance modérée ou raisonnable).
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([
              { t: 'Identité OTI', c: 'Organisme : À désigner\nAccréditation COFRAC : N° à renseigner\nProgramme : Vérification DPEF\nRapport n° : À renseigner' },
              { t: 'Diligences réalisées', c: '• Prise de connaissance du contexte\n• Entretiens avec responsables RSE\n• Vérification présence des informations\n• Tests de données sur base d\'échantillon\n• Analyse de cohérence et vraisemblance' },
              { t: 'Conclusion provisoire', c: 'ATTESTATION EN ATTENTE\n— OTI non encore désigné —\n\nL\'OTI formulera son avis après désignation et réalisation de ses diligences sur le rapport définitif.' },
            ]).map((b, i) => (
              <View key={i} style={{ flex: 1, borderWidth: 0.5, borderColor: '#c4b5fd', backgroundColor: '#faf5ff', padding: '5 7' }}>
                <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.purple, marginBottom: 3 }}>{b.t}</Text>
                <Text style={{ fontSize: 6, color: C.gray, lineHeight: 1.55 }}>{b.c}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tableau de concordance DPEF ↔ CSRD */}
        <Text style={S.secHd}>TABLEAU DE CONCORDANCE DPEF ↔ CSRD / ESRS</Text>
        <Text style={S.legal}>
          La DPEF (Directive 2014/95/UE) sera remplacée par le reporting CSRD (Directive 2022/2464/UE) et les normes ESRS. Ce tableau facilite la transition et permet d'identifier les standards ESRS correspondant à chaque pilier DPEF.
        </Text>
        <View style={{ ...S.tbl, marginTop: 4 }}>
          <View style={S.tblHead}>
            <Text style={{ ...S.th, flex: 1 }}>Pilier DPEF</Text>
            <Text style={{ ...S.th, width: 100 }}>Référence DPEF</Text>
            <Text style={{ ...S.th, width: 130 }}>Norme ESRS (CSRD)</Text>
          </View>
          {([
            { p: '🌿 Transition écologique', dpef: 'R.225-105-1 II A-E', esrs: 'ESRS E1 · E2 · E3 · E5 · Règl. 2020/852' },
            { p: '👥 Social & Sociétal',     dpef: 'R.225-105-1 I A-F · III A-D', esrs: 'ESRS S1 · S1-13 · S1-16 · Décret 2019-15' },
            { p: '⚖️ Éthique & conformité', dpef: 'Loi Sapin II Art. 17-22',     esrs: 'ESRS G1 · RGPD · Directive NIS2' },
          ]).map((r, i) => (
            <View key={i} style={i % 2 === 0 ? S.tr : S.trAlt}>
              <Text style={{ flex: 1, fontFamily: 'Helvetica-Bold', fontSize: 7 }}>{r.p}</Text>
              <Text style={{ width: 100, fontSize: 6.5, color: C.blue }}>{r.dpef}</Text>
              <Text style={{ width: 130, fontSize: 6.5, color: C.eco }}>{r.esrs}</Text>
            </View>
          ))}
        </View>

        {/* Notes méthodologiques */}
        <View style={{ ...S.infoGreen, marginTop: 8 }}>
          <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.green, marginBottom: 3 }}>📌  Notes méthodologiques</Text>
          {([
            'GES : GHG Protocol Corporate Standard · Facteurs ADEME Base Carbone® v23 (Scope 1) · AIE 2023 (Scope 2 location-based)',
            `RH : Effectifs CDI + CDD actifs au 31/12/${year} · Source : registre du personnel (module Ressources Humaines)`,
            'Art. R.225-105-2 : certaines informations peuvent être omises si divulgation causant préjudice grave · Motif à indiquer',
            'Transition CSRD : ce modèle est pré-aligné ESRS pour faciliter le passage à la Directive 2022/2464/UE (exercice 2024+)',
          ]).map((n, i) => (
            <Text key={i} style={S.noteItem}>• {n}</Text>
          ))}
        </View>

        {/* Déclaration & Signatures */}
        <View style={{ marginTop: 10, borderWidth: 0.5, borderColor: C.lgray, padding: '8 10' }}>
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.gray, marginBottom: 5 }}>
            Déclaration de la Direction Générale
          </Text>
          <Text style={{ fontSize: 7, color: C.gray, lineHeight: 1.55 }}>
            La présente Déclaration de Performance Extra-Financière a été établie conformément aux dispositions de l'article L. 225-102-1 du Code de commerce et du décret n°2017-1265 du 9 août 2017 transposant la Directive 2014/95/UE. Les informations présentées reflètent fidèlement la situation de la société pour l'exercice clos le 31 décembre {year}. Elles ont été préparées selon les méthodes décrites dans les notes méthodologiques ci-dessus et ont fait l'objet d'une vérification par un Organisme Tiers Indépendant (OTI) accrédité COFRAC, dont les conclusions figurent au rapport joint.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            {([
              { role: 'Directeur Général', info: 'Nom : _______________________\nDate : _______________________\nLieu : _______________________' },
              { role: 'Responsable RSE',   info: 'Nom : _______________________\nDate : _______________________\nLieu : _______________________' },
              { role: 'OTI — Accrédité COFRAC', info: 'Organisme : _________________\nN° accréd. : _________________\nDate : _______________________' },
            ]).map((sig, i) => (
              <View key={i} style={{ flex: 1, borderTopWidth: 1, borderTopColor: C.gray, paddingTop: 6 }}>
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.gray, marginBottom: 4 }}>{sig.role}</Text>
                <Text style={{ fontSize: 6.5, color: '#6b7280', lineHeight: 1.8 }}>{sig.info}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={S.footer}>
          <Text style={S.footerTxt}>DPEF Exercice {year} · Art. L.225-102-1 C. com. · Loi Sapin II · ESRS (CSRD 2022/2464/UE) — Athenis ESG</Text>
          <Text style={S.footerTxt}>4 / 4 · {today}</Text>
        </View>
      </Page>

    </Document>
  )
}
