import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  green:      '#1a6b3c',
  greenLight: '#e8f5ee',
  greenMid:   '#2d8653',
  greenDark:  '#0f4526',
  accent:     '#f59e0b',
  accentBg:   '#fffbeb',
  blue:       '#1d4ed8',
  blueBg:     '#eff6ff',
  purple:     '#7c3aed',
  purpleBg:   '#f5f3ff',
  red:        '#dc2626',
  redBg:      '#fef2f2',
  orange:     '#ea580c',
  orangeBg:   '#fff7ed',
  dark:       '#111827',
  gray:       '#374151',
  grayMid:    '#6b7280',
  grayLight:  '#e5e7eb',
  grayXLight: '#f9fafb',
  white:      '#ffffff',
  border:     '#d1d5db',
}

const S = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', backgroundColor: C.white, paddingBottom: 50 },
  coverPage:  { fontFamily: 'Helvetica', backgroundColor: C.greenDark },

  /* Header */
  pageHeaderBar: {
    backgroundColor: C.green, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 9,
  },
  pageHeaderTitle: { fontSize: 8, color: C.white, opacity: 0.9 },

  /* Footer */
  pageFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopWidth: 1, borderTopColor: C.grayLight,
    paddingHorizontal: 32, paddingVertical: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  footerText: { fontSize: 7, color: C.grayMid },

  body: { paddingHorizontal: 34, paddingTop: 18 },

  /* Cover */
  coverTop: { flex: 1, padding: 48, justifyContent: 'center' },
  coverEyebrow: { fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 4, marginBottom: 12 },
  coverLogo: { fontSize: 44, fontFamily: 'Helvetica-Bold', color: C.white, marginBottom: 6 },
  coverTitle: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: C.white, lineHeight: 1.3, marginBottom: 16 },
  coverDesc: { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, maxWidth: 420 },
  coverStatsRow: { flexDirection: 'row', gap: 20, marginTop: 36 },
  coverStat: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center',
  },
  coverStatNum: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: C.white },
  coverStatLbl: { fontSize: 8, color: 'rgba(255,255,255,0.55)', marginTop: 3, textAlign: 'center' },
  coverBottom: {
    backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 48, paddingVertical: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  coverMeta: { fontSize: 8, color: 'rgba(255,255,255,0.5)' },
  coverMetaVal: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white, marginTop: 2 },

  /* TOC */
  tocTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: C.green, marginBottom: 20 },
  tocItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.grayXLight,
  },
  tocNum: { fontSize: 10, color: C.green, fontFamily: 'Helvetica-Bold', width: 28 },
  tocLabel: { fontSize: 10, color: C.dark, flex: 1, fontFamily: 'Helvetica-Bold' },
  tocSub: { fontSize: 9, color: C.grayMid, flex: 1, paddingLeft: 14 },
  tocDots: { flex: 1, borderBottomWidth: 1, borderBottomStyle: 'dotted', borderBottomColor: C.grayLight, marginHorizontal: 6 },
  tocPage: { fontSize: 9, color: C.grayMid, width: 20, textAlign: 'right' },

  /* Section headers */
  sectionBanner: {
    borderRadius: 6, paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 4,
  },
  sectionNum: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: 'rgba(255,255,255,0.25)', marginRight: 12 },
  sectionTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.white, flex: 1 },
  sectionBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3,
  },
  sectionBadgeText: { fontSize: 8, color: C.white },

  h2: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.green, marginTop: 16, marginBottom: 8 },
  h3: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.dark, marginTop: 10, marginBottom: 5 },
  p:  { fontSize: 9, color: C.gray, lineHeight: 1.65, marginBottom: 7 },

  /* Cards */
  card:       { border: 1, borderColor: C.border, borderRadius: 6, padding: 11, marginBottom: 9 },
  cardGreen:  { border: 1, borderColor: '#a7f3d0', borderRadius: 6, padding: 11, backgroundColor: C.greenLight, marginBottom: 9 },
  cardBlue:   { border: 1, borderColor: '#bfdbfe', borderRadius: 6, padding: 11, backgroundColor: C.blueBg, marginBottom: 9 },
  cardPurple: { border: 1, borderColor: '#ddd6fe', borderRadius: 6, padding: 11, backgroundColor: C.purpleBg, marginBottom: 9 },
  cardOrange: { border: 1, borderColor: '#fed7aa', borderRadius: 6, padding: 11, backgroundColor: C.orangeBg, marginBottom: 9 },
  cardTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 6 },

  row2: { flexDirection: 'row', gap: 9, marginBottom: 9 },
  row3: { flexDirection: 'row', gap: 8, marginBottom: 9 },
  col:  { flex: 1 },

  /* Feature bullets */
  fl: { marginLeft: 6, marginBottom: 7 },
  fi: { flexDirection: 'row', marginBottom: 3 },
  fb: { fontSize: 9, color: C.green, marginRight: 5, fontFamily: 'Helvetica-Bold' },
  ft: { fontSize: 9, color: C.gray, flex: 1, lineHeight: 1.5 },
  ft2: { fontSize: 8.5, color: C.gray, flex: 1, lineHeight: 1.5 },

  /* Chips */
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  chip:       { backgroundColor: C.greenLight,  borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  chipT:      { fontSize: 8, color: C.green,    fontFamily: 'Helvetica-Bold' },
  chipRed:    { backgroundColor: C.redBg,       borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  chipRedT:   { fontSize: 8, color: C.red,      fontFamily: 'Helvetica-Bold' },
  chipBlue:   { backgroundColor: C.blueBg,      borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  chipBlueT:  { fontSize: 8, color: C.blue,     fontFamily: 'Helvetica-Bold' },
  chipGray:   { backgroundColor: C.grayXLight,  borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  chipGrayT:  { fontSize: 8, color: C.grayMid },

  /* Table */
  table: { marginBottom: 12 },
  tHead:   { flexDirection: 'row', backgroundColor: C.green,      borderRadius: 4, padding: 7 },
  tHeadDk: { flexDirection: 'row', backgroundColor: C.greenDark,  borderRadius: 4, padding: 7 },
  tHc:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.white },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.grayXLight, paddingVertical: 6, paddingHorizontal: 7 },
  tAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.grayXLight, paddingVertical: 6, paddingHorizontal: 7, backgroundColor: C.grayXLight },
  tc:  { fontSize: 8, color: C.gray, lineHeight: 1.5 },
  tcB: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.dark },

  /* Score / rating */
  scoreRow: { flexDirection: 'row', gap: 5, marginBottom: 3 },
  scoreDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.green },
  scoreDotEmpty: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.grayLight },

  /* Innovation card */
  innovCard: {
    border: 1, borderRadius: 8, padding: 12, marginBottom: 11,
  },
  innovCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 },
  innovIcon: {
    width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  innovTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark, flex: 1 },
  innovBadge: { borderRadius: 3, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 6 },
  innovBadgeText: { fontSize: 7, fontFamily: 'Helvetica-Bold' },
  innovDesc: { fontSize: 9, color: C.gray, lineHeight: 1.6, marginBottom: 7 },
  innovMeta: { flexDirection: 'row', gap: 12 },
  innovMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  innovMetaLabel: { fontSize: 7.5, color: C.grayMid },
  innovMetaVal: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.dark },

  /* Highlight */
  highlight: {
    backgroundColor: C.accentBg, borderLeftWidth: 3, borderLeftColor: C.accent,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10, borderRadius: 2,
  },
  highlightT: { fontSize: 9, color: '#78350f', lineHeight: 1.6 },

  divider: { borderBottomWidth: 1, borderBottomColor: C.grayLight, marginVertical: 12 },

  /* Roadmap */
  roadmapPhase: {
    flexDirection: 'row', marginBottom: 12,
  },
  roadmapLeft: {
    width: 90, alignItems: 'center', paddingTop: 4,
  },
  roadmapDot: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  roadmapLine: { width: 2, flex: 1, marginTop: 4, marginBottom: -8 },
  roadmapContent: { flex: 1, paddingLeft: 10 },
  roadmapPhaseTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 4 },
  roadmapPeriod: { fontSize: 9, color: C.grayMid, marginBottom: 6 },
})

// ── Helpers ───────────────────────────────────────────────────────────────────
const PH = ({ title, section }: { title: string; section: string }) => (
  <View fixed>
    <View style={S.pageHeaderBar}>
      <Text style={S.pageHeaderTitle}>Athenis · Analyse Concurrentielle & Stratégie d'Innovation</Text>
      <Text style={S.pageHeaderTitle}>{section} — {title}</Text>
    </View>
  </View>
)
const PF = () => (
  <View style={S.pageFooter} fixed>
    <Text style={S.footerText}>© 2026 Athenis · Document stratégique confidentiel</Text>
    <Text style={S.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
    <Text style={S.footerText}>Mai 2026 · Version 1.0</Text>
  </View>
)
const F = ({ t }: { t: string }) => <View style={S.fi}><Text style={S.fb}>›</Text><Text style={S.ft}>{t}</Text></View>
const F2 = ({ t }: { t: string }) => <View style={S.fi}><Text style={S.fb}>›</Text><Text style={S.ft2}>{t}</Text></View>
const Chip = ({ l }: { l: string }) => <View style={S.chip}><Text style={S.chipT}>{l}</Text></View>
const ChipG = ({ l }: { l: string }) => <View style={S.chipGray}><Text style={S.chipGrayT}>{l}</Text></View>

const SB = ({ num, title, badge, bg }: { num: string; title: string; badge: string; bg: string }) => (
  <View style={[S.sectionBanner, { backgroundColor: bg }]}>
    <Text style={S.sectionNum}>{num}</Text>
    <Text style={S.sectionTitle}>{title}</Text>
    <View style={S.sectionBadge}><Text style={S.sectionBadgeText}>{badge}</Text></View>
  </View>
)

// ── Innovation card ───────────────────────────────────────────────────────────
type Priority = 'CRITIQUE' | 'HAUTE' | 'MOYENNE'
const InnovCard = ({
  icon, title, desc, impact, effort, priority, color, borderColor, tags
}: {
  icon: string; title: string; desc: string
  impact: string; effort: string; priority: Priority
  color: string; borderColor: string; tags: string[]
}) => {
  const pColors: Record<Priority, { bg: string; text: string }> = {
    CRITIQUE: { bg: C.red,    text: C.white },
    HAUTE:    { bg: C.accent, text: C.dark  },
    MOYENNE:  { bg: C.green,  text: C.white },
  }
  const pc = pColors[priority]
  return (
    <View style={[S.innovCard, { borderColor }]}>
      <View style={S.innovCardHeader}>
        <View style={[S.innovIcon, { backgroundColor: color }]}>
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={S.innovTitle}>{title}</Text>
            <View style={[S.innovBadge, { backgroundColor: pc.bg }]}>
              <Text style={[S.innovBadgeText, { color: pc.text }]}>{priority}</Text>
            </View>
          </View>
          <View style={[S.chipRow, { marginTop: 4, marginBottom: 0 }]}>
            {tags.map(t => <ChipG key={t} l={t} />)}
          </View>
        </View>
      </View>
      <Text style={S.innovDesc}>{desc}</Text>
      <View style={S.innovMeta}>
        <View style={S.innovMetaItem}>
          <Text style={S.innovMetaLabel}>Impact :</Text>
          <Text style={S.innovMetaVal}>{impact}</Text>
        </View>
        <View style={S.innovMetaItem}>
          <Text style={S.innovMetaLabel}>Effort :</Text>
          <Text style={S.innovMetaVal}>{effort}</Text>
        </View>
      </View>
    </View>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export function AnalyseConcurrentielleePdf() {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <Document
      title="Athenis – Analyse Concurrentielle & Stratégie d'Innovation 2026"
      author="Athenis Strategy"
    >
      {/* ═══ COUVERTURE ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.coverPage}>
        <View style={S.coverTop}>
          <Text style={S.coverEyebrow}>DOCUMENT STRATÉGIQUE CONFIDENTIEL</Text>
          <Text style={S.coverLogo}>Athenis</Text>
          <Text style={S.coverTitle}>Analyse Concurrentielle{'\n'}& Stratégie d'Innovation 2026</Text>
          <Text style={S.coverDesc}>
            Étude comparative des acteurs leaders du marché mondial des logiciels de
            gestion et comptabilité, analyse des lacunes, et feuille de route des
            innovations pour positionner Athenis comme leader incontesté sur le marché
            africain et au-delà.
          </Text>
          <View style={S.coverStatsRow}>
            {[['12', 'Concurrents\nanalysés'], ['8', 'Marchés\ncouerts'], ['25', 'Innovations\nproposées'], ['#1', 'Objectif\nmarché Afrique']].map(([n, l]) => (
              <View key={l} style={S.coverStat}>
                <Text style={S.coverStatNum}>{n}</Text>
                <Text style={S.coverStatLbl}>{l}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={S.coverBottom}>
          {[['Date', today], ['Version', '1.0'], ['Confidentialité', 'RESTREINT'], ['Marché cible', 'Afrique + International']].map(([l, v]) => (
            <View key={l}>
              <Text style={S.coverMeta}>{l}</Text>
              <Text style={S.coverMetaVal}>{v}</Text>
            </View>
          ))}
        </View>
      </Page>

      {/* ═══ TABLE DES MATIÈRES ═════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PH title="Sommaire" section="0" />
        <View style={S.body}>
          <Text style={S.tocTitle}>Sommaire exécutif</Text>

          {[
            { n: '1', l: 'Résumé exécutif & Positionnement stratégique' },
            { n: '2', l: 'Paysage concurrentiel — Les 12 acteurs clés' },
            { n: '3', l: 'Analyse comparative détaillée par fonctionnalité' },
            { n: '4', l: 'Carte des forces & faiblesses d\'Athenis' },
            { n: '5', l: 'Tendances de marché 2026 — Ce que les concurrents font' },
            { n: '6', l: '25 innovations proposées pour Athenis' },
            { n: '6.1', l: 'IA & Automatisation avancée', sub: true },
            { n: '6.2', l: 'Écosystème financier africain', sub: true },
            { n: '6.3', l: 'UX & Accessibilité nouvelle génération', sub: true },
            { n: '6.4', l: 'Conformité & Intelligence réglementaire', sub: true },
            { n: '6.5', l: 'Fonctionnalités différenciantes uniques', sub: true },
            { n: '7', l: 'Feuille de route — Plan sur 18 mois' },
            { n: '8', l: 'Conclusion & Avantages compétitifs visés' },
          ].map(item => (
            <View key={item.n} style={S.tocItem}>
              <Text style={item.sub ? { ...S.tocNum, color: C.grayMid, fontSize: 9 } : S.tocNum}>{item.n}.</Text>
              <Text style={item.sub ? S.tocSub : S.tocLabel}>{item.l}</Text>
              <View style={S.tocDots} />
            </View>
          ))}

          <View style={[S.highlight, { marginTop: 24 }]}>
            <Text style={S.highlightT}>
              Ce document est basé sur une recherche approfondie des plateformes Odoo, Sage, Pennylane,
              QuickBooks, Xero, FreshBooks, Zoho Books, Wave, Dext, SAP Business One, Mobility Cloud
              et des solutions émergentes africaines (mai 2026). Les propositions d'innovation sont
              classées par priorité stratégique et impact business.
            </Text>
          </View>
        </View>
        <PF />
      </Page>

      {/* ═══ 1 — RÉSUMÉ EXÉCUTIF ══════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PH title="Résumé exécutif" section="01" />
        <View style={S.body}>
          <SB num="01" title="Résumé exécutif & Positionnement" badge="Vue d'ensemble" bg={C.green} />

          <Text style={S.p}>
            Le marché mondial des logiciels ERP et comptabilité atteindra <Text style={{ fontFamily: 'Helvetica-Bold' }}>847 milliards USD en 2026</Text>,
            avec l'Afrique subsaharienne affichant une croissance de <Text style={{ fontFamily: 'Helvetica-Bold' }}>8,7% par an</Text> — le taux le
            plus élevé au monde. Le marché africain est massivement sous-servi : moins de 12% des PME
            utilisent un logiciel de gestion dédié.
          </Text>

          <View style={S.row2}>
            <View style={[S.cardGreen, { flex: 1 }]}>
              <Text style={S.cardTitle}>🏆 Opportunité Athenis</Text>
              <Text style={S.p}>
                Premier logiciel tout-en-un pensé Africa-first avec conformité OHADA native, intégration
                Mobile Money et support multi-agences. Aucun concurrent global ne couvre ce trifecta.
              </Text>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>⚠ Risques identifiés</Text>
              <Text style={S.p}>
                Odoo accélère sur l'Afrique. Pennylane (valorisée 4,25 Md$ en 2026) étend sa couverture
                géographique. SAP propose des offres SME à prix réduits. La fenêtre d'avance est de
                18 à 24 mois.
              </Text>
            </View>
          </View>

          <Text style={S.h2}>Verdict stratégique en 5 points</Text>
          <View style={[S.table]}>
            <View style={S.tHead}>
              {['Point clé', 'Situation actuelle', 'Action requise'].map(h => (
                <Text key={h} style={[S.tHc, { flex: h === 'Point clé' ? 1.2 : h === 'Action requise' ? 1.5 : 1 }]}>{h}</Text>
              ))}
            </View>
            {[
              ['IA Comptable', 'Widget IA basique', 'Agent IA autonome — PRIORITÉ #1'],
              ['Mobile Money', 'Saisie manuelle', 'API temps réel MTN/Orange/Wave'],
              ['OCR & Scan', 'Absent', 'Scan de reçus par smartphone — CRITIQUE'],
              ['App Mobile', 'Absente', 'Application iOS/Android native'],
              ['Facturation e-légale', 'PDF standard', 'Connecteur DGI / e-Invoice API'],
            ].map(([p, s, a], i) => (
              <View key={p} style={i % 2 === 0 ? S.tRow : S.tAlt}>
                <Text style={[S.tcB, { flex: 1.2 }]}>{p}</Text>
                <Text style={[S.tc, { flex: 1 }]}>{s}</Text>
                <Text style={[S.tcB, { flex: 1.5, color: C.green }]}>{a}</Text>
              </View>
            ))}
          </View>

          <Text style={S.h2}>Positionnement cible après innovations</Text>
          <View style={S.chipRow}>
            <Chip l="N°1 Afrique francophone" /><Chip l="OHADA natif" />
            <Chip l="AI-First" /><Chip l="Mobile Money intégré" />
            <Chip l="Agent IA comptable" /><Chip l="E-facture légale" />
            <Chip l="App mobile native" /><Chip l="Offline-first" />
          </View>
        </View>
        <PF />
      </Page>

      {/* ═══ 2 — PAYSAGE CONCURRENTIEL ═══════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PH title="Paysage concurrentiel" section="02" />
        <View style={S.body}>
          <SB num="02" title="Les 12 concurrents analysés" badge="Benchmark 2026" bg={C.greenDark} />

          <View style={S.row3}>
            {[
              { name: 'Odoo 18', origin: '🇧🇪 Belgique', type: 'ERP complet open-source', segment: 'PME–ETI mondiale', price: '0–80 €/mois' },
              { name: 'Sage 100', origin: '🇬🇧 UK/Afrique', type: 'Comptabilité + ERP', segment: 'PME–ETI', price: '50–200 €/mois' },
              { name: 'Pennylane', origin: '🇫🇷 France', type: 'Compta + Fintech', segment: 'PME France', price: '99–299 €/mois' },
              { name: 'QuickBooks', origin: '🇺🇸 USA', type: 'Comptabilité SaaS', segment: 'TPE–PME', price: '30–200 $/mois' },
            ].map(c => (
              <View key={c.name} style={[S.card, { flex: 1 }]}>
                <Text style={S.cardTitle}>{c.name}</Text>
                <View style={S.fl}>
                  <F2 t={`Origine : ${c.origin}`} />
                  <F2 t={`Type : ${c.type}`} />
                  <F2 t={`Segment : ${c.segment}`} />
                  <F2 t={`Prix : ${c.price}`} />
                </View>
              </View>
            ))}
          </View>

          <View style={S.row3}>
            {[
              { name: 'Xero', origin: '🇳🇿 Nouvelle-Zélande', type: 'Comptabilité SaaS', segment: 'PME internationale', price: '15–70 $/mois' },
              { name: 'FreshBooks', origin: '🇨🇦 Canada', type: 'Factu + Comptabilité', segment: 'Freelance–TPE', price: '17–55 $/mois' },
              { name: 'Zoho Books', origin: '🇮🇳 Inde', type: 'Compta + Suite Zoho', segment: 'PME mondiale', price: '0–60 $/mois' },
              { name: 'Wave', origin: '🇨🇦 Canada', type: 'Compta gratuite', segment: 'Micro–TPE', price: '0 (freemium)' },
            ].map(c => (
              <View key={c.name} style={[S.card, { flex: 1 }]}>
                <Text style={S.cardTitle}>{c.name}</Text>
                <View style={S.fl}>
                  <F2 t={`Origine : ${c.origin}`} />
                  <F2 t={`Type : ${c.type}`} />
                  <F2 t={`Segment : ${c.segment}`} />
                  <F2 t={`Prix : ${c.price}`} />
                </View>
              </View>
            ))}
          </View>

          <View style={S.row3}>
            {[
              { name: 'Dext', origin: '🇬🇧 UK', type: 'OCR + Capture docs', segment: 'Cabinets compta', price: '25–120 £/mois' },
              { name: 'Mobility Cloud', origin: '🌍 Afrique', type: 'ERP OHADA Cloud', segment: 'PME africaines', price: 'Non public' },
              { name: 'SAP Business One', origin: '🇩🇪 Allemagne', type: 'ERP enterprise', segment: 'ETI–Grands comptes', price: '1000 $/mois+' },
              { name: 'ERPNext/Frappe', origin: '🇮🇳 Inde/Mondial', type: 'ERP open-source', segment: 'PME–ETI', price: '0 (hébergé)' },
            ].map(c => (
              <View key={c.name} style={[S.card, { flex: 1 }]}>
                <Text style={S.cardTitle}>{c.name}</Text>
                <View style={S.fl}>
                  <F2 t={`Origine : ${c.origin}`} />
                  <F2 t={`Type : ${c.type}`} />
                  <F2 t={`Segment : ${c.segment}`} />
                  <F2 t={`Prix : ${c.price}`} />
                </View>
              </View>
            ))}
          </View>
        </View>
        <PF />
      </Page>

      {/* ═══ 3 — TABLEAU COMPARATIF ══════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PH title="Analyse comparative" section="03" />
        <View style={S.body}>
          <SB num="03" title="Tableau comparatif par fonctionnalité" badge="Feature Matrix" bg={C.green} />
          <Text style={S.p}>Légende : ✅ Oui complet · ⚡ Partiel · ❌ Absent · 🔄 En développement</Text>

          <View style={S.table}>
            <View style={S.tHeadDk}>
              {['Fonctionnalité', 'Athenis', 'Odoo', 'Sage', 'Pennylane', 'QBooks', 'Xero'].map((h, i) => (
                <Text key={h} style={[S.tHc, { flex: i === 0 ? 2.2 : 0.8, textAlign: i > 0 ? 'center' : 'left' }]}>{h}</Text>
              ))}
            </View>
            {[
              ['Comptabilité OHADA',     '✅', '⚡', '⚡', '❌', '❌', '❌'],
              ['Facturation + Devis',    '✅', '✅', '✅', '✅', '✅', '✅'],
              ['Multi-agences',          '✅', '✅', '⚡', '❌', '❌', '⚡'],
              ['Mobile Money natif',     '✅', '❌', '❌', '❌', '❌', '❌'],
              ['ESG / CSRD',             '✅', '⚡', '❌', '❌', '❌', '❌'],
              ['Fiscalité Cameroun',     '✅', '❌', '⚡', '❌', '❌', '❌'],
              ['RH + Paie',             '✅', '✅', '✅', '❌', '⚡', '⚡'],
              ['Module Juridique',       '✅', '⚡', '❌', '❌', '❌', '❌'],
              ['Desktop offline',        '✅', '❌', '⚡', '❌', '❌', '❌'],
              ['Agent IA autonome',      '❌', '🔄', '🔄', '✅', '⚡', '🔄'],
              ['OCR scan reçus',         '❌', '⚡', '⚡', '✅', '✅', '✅'],
              ['App mobile native',      '❌', '✅', '✅', '✅', '✅', '✅'],
              ['Rapprochement bancaire auto', '⚡', '✅', '✅', '✅', '✅', '✅'],
              ['E-facture légale',       '❌', '⚡', '⚡', '✅', '🔄', '🔄'],
              ['Finance personnelle',    '✅', '❌', '❌', '❌', '❌', '❌'],
            ].map(([feat, ...vals], i) => (
              <View key={feat} style={i % 2 === 0 ? S.tRow : S.tAlt}>
                <Text style={[S.tcB, { flex: 2.2 }]}>{feat}</Text>
                {vals.map((v, j) => (
                  <Text key={j} style={[S.tc, { flex: 0.8, textAlign: 'center' }]}>{v}</Text>
                ))}
              </View>
            ))}
          </View>

          <View style={S.highlight}>
            <Text style={S.highlightT}>
              Athenis est le SEUL logiciel du marché à combiner nativement : comptabilité OHADA,
              Mobile Money, ESG/CSRD, fiscalité Cameroun, module juridique et mode desktop offline.
              C'est un avantage concurrentiel inégalé — aucun concurrent ne peut répliquer ce périmètre
              en moins de 2 ans.
            </Text>
          </View>
        </View>
        <PF />
      </Page>

      {/* ═══ 4 — FORCES & FAIBLESSES ═════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PH title="SWOT Athenis" section="04" />
        <View style={S.body}>
          <SB num="04" title="Carte des forces & faiblesses d'Athenis" badge="Analyse SWOT" bg={C.green} />

          <View style={S.row2}>
            <View style={[S.cardGreen, { flex: 1 }]}>
              <Text style={[S.cardTitle, { color: C.green }]}>💪 Forces (Strengths)</Text>
              <View style={S.fl}>
                {['Seul logiciel tout-en-un Africa-first avec OHADA natif',
                  'Module ESG/CSRD absent chez TOUS les concurrents directs africains',
                  'Mobile Money (MTN, Orange, Wave) intégré nativement',
                  'Fiscalité Cameroun préconfigurée (TVA 19.25%, CNPS, patente, DSF)',
                  'Multi-agences natif avec isolation des données par site',
                  'Cabinet comptable dédié avec gestion de portefeuille',
                  'Mode desktop (Tauri) pour zones à faible connectivité',
                  'Finance personnelle — aucun concurrent ne propose cela'].map(f => <F key={f} t={f} />)}
              </View>
            </View>
            <View style={[S.cardOrange, { flex: 1 }]}>
              <Text style={[S.cardTitle, { color: C.orange }]}>🔴 Faiblesses (Weaknesses)</Text>
              <View style={S.fl}>
                {['Pas d\'application mobile native (iOS/Android)',
                  'Pas d\'OCR / scan de documents par smartphone',
                  'Agent IA comptable basique vs Pennylane/Xero JAX',
                  'Rapprochement bancaire encore manuel',
                  'Pas d\'e-facturation légale connectée aux API gouvernementales',
                  'Pas de marketplace d\'intégrations tierce',
                  'Pas de portail client self-service',
                  'Notoriété limitée — besoin d\'accélération marketing'].map(f => <F key={f} t={f} />)}
              </View>
            </View>
          </View>

          <View style={S.row2}>
            <View style={[S.cardBlue, { flex: 1 }]}>
              <Text style={[S.cardTitle, { color: C.blue }]}>🚀 Opportunités (Opportunities)</Text>
              <View style={S.fl}>
                {['Marché ERP Afrique : +8,7% CAGR, quasi-inexploité',
                  '$1,4 trillion transités en Mobile Money Afrique en 2025',
                  'CSRD obligatoire Europe 2026 → besoin reporting ESG massif',
                  'AI accounting : marché $10,87 Mds en 2026 (+44,6% CAGR)',
                  'Moins de 12% des PME africaines ont un logiciel de gestion',
                  'E-facture obligatoire dans nombreux pays africains d\'ici 2027',
                  'Consolidation du secteur : opportunité de rachats/partenariats'].map(f => <F key={f} t={f} />)}
              </View>
            </View>
            <View style={[S.cardOrange, { flex: 1 }]}>
              <Text style={[S.cardTitle, { color: C.red }]}>⚡ Menaces (Threats)</Text>
              <View style={S.fl}>
                {['Odoo 18 accélère sa pénétration africaine avec offres low-cost',
                  'Pennylane (4,25 Md$) lève 200M$ en jan. 2026 → expansion géo.',
                  'QuickBooks/Xero intègrent agents IA autonomes en 2026',
                  'Géants tech (Google, Intuit) entrent sur la compta africaine',
                  'Solutions locales low-cost émergent (Mobility Cloud, Baobab)',
                  'Inflation et coûts cloud en Afrique ralentissent l\'adoption SaaS',
                  'Déficit de compétences numériques : 72% des PME africaines'].map(f => <F key={f} t={f} />)}
              </View>
            </View>
          </View>
        </View>
        <PF />
      </Page>

      {/* ═══ 5 — TENDANCES MARCHÉ ════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PH title="Tendances 2026" section="05" />
        <View style={S.body}>
          <SB num="05" title="Ce que les leaders font en 2026" badge="Market Trends" bg={C.purple} />

          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>🤖 IA Agentique — La révolution comptable</Text>
              <View style={S.fl}>
                <F t="Xero lance JAX (Just Ask Xero) : agent IA génératif qui rédige des emails, génère des rapports et répond en langage naturel" />
                <F t="Pilot déploie un comptable IA 100% autonome — clôture mensuelle sans intervention humaine" />
                <F t="Intuit lance Intuit Assist Agents : détection d'anomalies et catégorisation automatique" />
                <F t="BlackLine Studio360 : réconciliation + écritures automatiques par IA" />
                <F t="Résultat : clôtures mensuelles réduites de 12 jours → 3 jours en moyenne" />
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>📱 Mobile-First & OCR universel</Text>
              <View style={S.fl}>
                <F t="Dext : 320 millions de documents traités/an, 99.9% de précision OCR, upload via WhatsApp" />
                <F t="QuickBooks Lens : scan de reçus en 1 photo depuis smartphone" />
                <F t="Pennylane app mobile : capture reçu + saisie automatique en temps réel" />
                <F t="Zoho Books : application mobile complète avec facturation offline" />
                <F t="Wave : captures de reçus par photo sur mobile, gratuitement" />
              </View>
            </View>
          </View>

          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>🏦 Fintech embarquée</Text>
              <View style={S.fl}>
                <F t="Pennylane : compte bancaire pro intégré + carte de paiement dans la plateforme" />
                <F t="Xero : paiements instantanés et financement de factures (invoice financing)" />
                <F t="FreshBooks : Instant Payouts — accès aux fonds immédiat, même week-end" />
                <F t="QuickBooks : prêts aux PME directement depuis le dashboard" />
                <F t="Mouvement : de logiciel comptable → plateforme financière tout-en-un" />
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>⚖ Conformité réglementaire IA</Text>
              <View style={S.fl}>
                <F t="Pennylane : e-facture Factur-X pour obligation légale France 2026" />
                <F t="Sage Copilot : assistant IA pour questions fiscales et conformité en temps réel" />
                <F t="Zoho : gestion TVA/GST/sales tax multi-pays automatique" />
                <F t="Tendance : LLM spécialisés par réglementation (OHADA, SYSCOHADA, IFRS)" />
                <F t="Audit Trail IA : explication automatique de chaque décision fiscale" />
              </View>
            </View>
          </View>

          <View style={S.highlight}>
            <Text style={S.highlightT}>
              La tendance majeure 2026 : les logiciels de comptabilité deviennent des
              « systèmes d'exploitation financiers » avec IA ambiante, banque intégrée,
              et automatisation totale des tâches répétitives. Celui qui contrôle le flux
              de données financières contrôle l'ensemble de l'écosystème PME.
              Athenis peut prendre cette position en Afrique avant les géants mondiaux.
            </Text>
          </View>
        </View>
        <PF />
      </Page>

      {/* ═══ 6.1 — INNOVATIONS IA ═════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PH title="Innovations IA" section="06.1" />
        <View style={S.body}>
          <SB num="06.1" title="IA & Automatisation avancée" badge="AI-First · Priorité #1" bg={C.purple} />
          <Text style={S.p}>Ces innovations placent Athenis à la pointe de l'automatisation comptable mondiale, en surpassant même Xero JAX et Pennylane AI sur les marchés africains.</Text>

          <InnovCard
            icon="🧠" priority="CRITIQUE"
            title="Agent Comptable IA Autonome — Athenis AutoBook"
            color={C.purpleBg} borderColor="#ddd6fe"
            desc="Un agent IA qui analyse en temps réel toutes les transactions, propose les imputations comptables (compte débit/crédit, journal, libellé), et les comptabilise automatiquement après validation en 1 clic. Apprend les habitudes de chaque société. Spécialisé OHADA/SYSCOHADA. Intègre un LLM fine-tuné sur la fiscalité camerounaise et l'OHADA. Signale les anomalies et risques en amont."
            impact="Réduction 80% du temps de saisie" effort="4 mois (LLM + intégration)" tags={['LLM', 'OHADA', 'Auto-comptabilisation', 'Anomalies']}
          />

          <InnovCard
            icon="📸" priority="CRITIQUE"
            title="Scan & Capture Intelligente — Athenis ScanAI"
            color="#fef3c7" borderColor="#fde68a"
            desc="Module OCR IA intégré directement dans l'app (et futur app mobile) : prendre une photo d'une facture fournisseur, d'un reçu ou d'un bordereau de banque → extraction automatique de tous les champs (montant, TVA, fournisseur, date, IBAN) → création de la facture et écriture comptable correspondante en 3 secondes. Support WhatsApp Business : envoyer une photo par WhatsApp → comptabilisé automatiquement."
            impact="Saisie 0 pour 90% des achats courants" effort="3 mois (OCR + parsing)" tags={['OCR', 'WhatsApp', 'Photo', 'Auto-saisie']}
          />

          <InnovCard
            icon="🔮" priority="HAUTE"
            title="Prévision IA de Trésorerie — CashFlow Intelligence"
            color={C.greenLight} borderColor="#a7f3d0"
            desc="Modèle de machine learning entraîné sur les données historiques de chaque société pour prédire le solde de trésorerie à 30, 60, 90 et 180 jours avec intervalles de confiance. Intègre saisonnalité, tendances, comportement des clients (délais de paiement réels). Alertes proactives : « Votre trésorerie sera négative le 15/07 — voici 3 actions recommandées ». Comparaison prévision vs réel avec score de précision."
            impact="Zéro surprise de trésorerie" effort="3 mois (ML model)" tags={['ML', 'Prédiction', '180 jours', 'Alertes IA']}
          />

          <InnovCard
            icon="💬" priority="HAUTE"
            title="Assistant Fiscal IA Cameroun — TaxGPT OHADA"
            color={C.blueBg} borderColor="#bfdbfe"
            desc="Chatbot IA spécialisé dans la fiscalité camerounaise et le droit OHADA, accessible depuis toute l'interface. Répond instantanément à des questions comme « Quel est le taux de CNPS pour un CDD ? », « Quelle est l'échéance de ma déclaration TVA ce mois-ci ? », « Mon entreprise est-elle assujettie à la patente ? ». Base de connaissances mise à jour avec les circulaires DGI. 10x plus rapide qu'un appel au cabinet comptable."
            impact="Réduction 60% des questions au cabinet" effort="2 mois (RAG + DGI docs)" tags={['RAG', 'Fiscalité CM', 'DGI', 'OHADA']}
          />
        </View>
        <PF />
      </Page>

      {/* ═══ 6.2 — ÉCOSYSTÈME AFRICAIN ═══════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PH title="Innovations Africa" section="06.2" />
        <View style={S.body}>
          <SB num="06.2" title="Écosystème financier africain" badge="Africa-First · Différenciation maximale" bg={C.green} />

          <InnovCard
            icon="📲" priority="CRITIQUE"
            title="Mobile Money Hub Temps Réel — MoMo Intelligence"
            color={C.greenLight} borderColor="#a7f3d0"
            desc="Connexion API temps réel avec MTN Mobile Money, Orange Money, Wave Cameroun et les principales plateformes africaines. Les transactions Mobile Money sont importées automatiquement, rapprochées avec les factures existantes, et comptabilisées sans saisie. Tableau de bord unifié banque + mobile money + caisse. Génération automatique des récépissés de paiement. Seul logiciel mondial à proposer ce niveau d'intégration Mobile Money."
            impact="$1,4T de transactions réconciliables en Afrique" effort="3 mois (API MoMo)" tags={['MTN', 'Orange', 'Wave', 'Temps réel', 'Réconciliation']}
          />

          <InnovCard
            icon="📱" priority="CRITIQUE"
            title="Application Mobile Native — Athenis Go"
            color="#fef3c7" borderColor="#fde68a"
            desc="Application iOS et Android complète avec toutes les fonctions essentielles : scan de reçus, facturation sur le terrain, consultation des tableaux de bord, approbation de congés, relance client, suivi stock. Mode offline-first avec synchronisation différée pour les zones à faible connectivité (crucial en Afrique). Notifications push pour les alertes critiques. Interface simplifiée adaptée au mobile."
            impact="Couverture 100% des utilisateurs mobiles" effort="5 mois (React Native)" tags={['iOS', 'Android', 'Offline-first', 'Push notifs']}
          />

          <InnovCard
            icon="🧾" priority="HAUTE"
            title="Facturation WhatsApp Business"
            color={C.greenLight} borderColor="#a7f3d0"
            desc="Envoi de factures directement depuis Athenis vers WhatsApp du client. Le client reçoit la facture en PDF + bouton de paiement Mobile Money intégré dans WhatsApp. Suivi de lecture et confirmation de paiement automatique. En Afrique, 90% des communications business passent par WhatsApp. Aucun concurrent mondial n'a cette intégration. Résultat : délais de paiement réduits de 40% en moyenne."
            impact="Réduction 40% délais paiement" effort="2 mois (WhatsApp Business API)" tags={['WhatsApp', 'Paiement', 'PDF', 'Mobile Money']}
          />

          <InnovCard
            icon="🌐" priority="MOYENNE"
            title="Mode Ultra-Low Bandwidth — Athenis Lite"
            color={C.blueBg} borderColor="#bfdbfe"
            desc="Interface progressive web app fonctionnant avec moins de 100 Ko par page, pensée pour les connexions 2G/3G africaines. Compression agressive des assets, mise en cache intelligente, synchronisation par delta uniquement. Interface textuelle alternative pour les zones très dégradées. Accès basique via USSD (*123*ATHENIS#) pour les zones sans internet : consultation solde, envoi facture SMS."
            impact="Accessibilité 100% des zones africaines" effort="3 mois" tags={['2G/3G', 'PWA', 'USSD', 'SMS']}
          />
        </View>
        <PF />
      </Page>

      {/* ═══ 6.3 — UX INNOVATION ══════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PH title="Innovations UX" section="06.3" />
        <View style={S.body}>
          <SB num="06.3" title="UX & Accessibilité nouvelle génération" badge="UX Innovation" bg={C.blue} />

          <InnovCard
            icon="🎙" priority="HAUTE"
            title="Comptabilité Vocale — Athenis Voice"
            color={C.blueBg} borderColor="#bfdbfe"
            desc="Saisie d'écritures comptables, création de factures et consultation de soldes par commande vocale en français et en langues locales (fula, bassa, duala à terme). « Athenis, crée une facture de 500 000 FCFA pour TechX Sarl » → facture générée en 3 secondes. Dictée de notes sur les transactions. Accessible via smartphone ou assistant vocal sur desktop. Idéal pour dirigeants en déplacement."
            impact="Saisie 5x plus rapide en mobilité" effort="2 mois (Web Speech API + NLP)" tags={['Voice', 'Français', 'Langues locales', 'NLP']}
          />

          <InnovCard
            icon="📊" priority="HAUTE"
            title="Tableau de Bord Prédictif Personnalisable — Smart Dashboard"
            color={C.purpleBg} borderColor="#ddd6fe"
            desc="Dashboard entièrement personnalisable par drag-and-drop avec des widgets IA : chiffre d'affaires attendu ce mois (basé sur récurrents + tendances), score de santé financière Athenis (0-100), probabilité de paiement par client, alertes anticipatoires. Partage du dashboard avec le cabinet comptable ou les actionnaires via lien sécurisé. Mode présentation pour réunions de direction."
            impact="Décisions 3x plus rapides" effort="2 mois" tags={['Drag&drop', 'KPI prédictifs', 'Partage', 'Score santé']}
          />

          <InnovCard
            icon="🔗" priority="HAUTE"
            title="Portail Client Self-Service — Athenis Connect"
            color={C.greenLight} borderColor="#a7f3d0"
            desc="Portail web accessible à vos clients sans inscription : consultation de leurs factures, téléchargement des PDFs, paiement en ligne (Mobile Money, carte), demande d'avoir ou de remboursement. L'entreprise gagne un accès pro au portail dédié avec son logo. Les cabinets comptables peuvent partager les états financiers avec leurs clients via ce portail. Réduit de 80% les demandes de renvoi de factures."
            impact="Réduction 80% des demandes client" effort="2 mois" tags={['Portail', 'Self-service', 'Paiement', 'PDF']}
          />

          <InnovCard
            icon="🏢" priority="MOYENNE"
            title="Consolidation Multi-Sociétés — Group Finance"
            color={C.accentBg} borderColor="#fde68a"
            desc="Pour les groupes de sociétés et holdings : consolidation automatique des états financiers de plusieurs entités en un bilan consolidé. Élimination des transactions inter-sociétés. Tableau de bord groupe avec drill-down par filiale. Comparatif inter-filiales. Rapport consolidé PDF en un clic. Aucun logiciel africain ne propose cela à ce prix."
            impact="Ouverture segment ETI & holdings" effort="4 mois" tags={['Groupe', 'Consolidation', 'Holding', 'Interco']}
          />
        </View>
        <PF />
      </Page>

      {/* ═══ 6.4 — CONFORMITÉ & RÉGLEMENTATION ══════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PH title="Innovations Conformité" section="06.4" />
        <View style={S.body}>
          <SB num="06.4" title="Conformité & Intelligence réglementaire" badge="RegTech · Compliance" bg={C.orange} />

          <InnovCard
            icon="🔏" priority="CRITIQUE"
            title="E-Facture Légale Connectée DGI — Athenis e-Invoice"
            color="#fff7ed" borderColor="#fed7aa"
            desc="Connexion directe à l'API de la Direction Générale des Impôts du Cameroun pour la déclaration électronique des factures en temps réel (obligatoire dès 2027). Génération automatique du numéro d'enregistrement fiscal unique sur chaque facture. Support Factur-X pour les échanges avec partenaires français. QR code fiscal officiel (DGI-compliant). Premier logiciel en Afrique centrale à proposer cette intégration."
            impact="Conformité légale 2027 assurée" effort="4 mois (API DGI)" tags={['DGI', 'e-Invoice', 'Factur-X', 'QR fiscal']}
          />

          <InnovCard
            icon="✍" priority="HAUTE"
            title="Signature Électronique Avancée — Athenis Sign"
            color={C.blueBg} borderColor="#bfdbfe"
            desc="Intégration d'un service de signature électronique à valeur légale (conforme eIDAS et CAMPOST pour le Cameroun) directement dans le module Juridique. Signature de contrats, factures proforma, bons de commande depuis l'interface. Carnet de témoins avec OTP SMS. Archivage légal horodaté. Actuellement Athenis utilise des tokens simples — passage à une signature certifiée confère une valeur probante en justice."
            impact="Valeur légale des contrats garantie" effort="3 mois (partenaire e-sign)" tags={['eIDAS', 'CAMPOST', 'OTP', 'Archivage légal']}
          />

          <InnovCard
            icon="🌱" priority="HAUTE"
            title="Calcul Carbone Automatique depuis les Données Financières"
            color={C.greenLight} borderColor="#a7f3d0"
            desc="Conversion automatique des dépenses comptabilisées en empreinte carbone (CO₂eq) en utilisant les facteurs d'émission standard (GHG Protocol, ADEME). Achats fournisseurs → Scope 3 estimé. Factures d'énergie → Scope 1 & 2. Tableau de bord carbone mis à jour en temps réel depuis la comptabilité, sans double saisie. Export compatible CSRD. Permet d'alimenter le module ESG automatiquement depuis la compta."
            impact="Zéro saisie manuelle pour le bilan carbone" effort="2 mois" tags={['CO₂', 'Scope 1-2-3', 'CSRD', 'Auto-calcul']}
          />

          <InnovCard
            icon="🤝" priority="MOYENNE"
            title="API Ouverte & Marketplace — Athenis App Store"
            color={C.purpleBg} borderColor="#ddd6fe"
            desc="Publication d'une API REST publique documentée pour permettre aux développeurs tiers de construire des intégrations. Marketplace d'applications tierces : connecteurs pour plateformes e-commerce (Jumia, Amazon), outils de facturation sectoriels, systèmes de caisse physiques (mPOS), banques partenaires. Programme partenaires avec revshare. Construit un écosystème autour d'Athenis impossible à répliquer rapidement."
            impact="Effet réseau + 100+ intégrations" effort="5 mois (API docs + marketplace)" tags={['API', 'Marketplace', 'Partenaires', 'Écosystème']}
          />
        </View>
        <PF />
      </Page>

      {/* ═══ 6.5 — FONCTIONNALITÉS DIFFÉRENCIANTES ════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PH title="Innovations différenciantes" section="06.5" />
        <View style={S.body}>
          <SB num="06.5" title="Fonctionnalités différenciantes uniques" badge="Blue Ocean · Aucun concurrent" bg={C.greenDark} />

          <View style={S.row2}>
            <InnovCard
              icon="💳" priority="HAUTE"
              title="Scoring Crédit Client IA"
              color="#fff7ed" borderColor="#fed7aa"
              desc="Score de solvabilité automatique pour chaque client basé sur son historique de paiement, délais moyens, montants impayés. Aide à décider les conditions de paiement (délai, acompte) pour chaque client. Alerte si un client à risque passe une grosse commande. Exportable pour les banques partenaires."
              impact="Réduction 30% des impayés" effort="2 mois" tags={['Scoring', 'Risque', 'IA', 'Crédit']}
            />
            <InnovCard
              icon="🔄" priority="HAUTE"
              title="Clôture Comptable Automatique"
              color={C.purpleBg} borderColor="#ddd6fe"
              desc="Clôture mensuelle automatisée : vérification de toutes les pièces, lettrage des comptes, extournes automatiques, génération des états. Clôture en 1 clic au lieu de 3 jours. Rapport de clôture avec liste des anomalies détectées."
              impact="Clôture 12 jours → 1 jour" effort="3 mois" tags={['Clôture', 'Auto', 'Lettrage', 'Vérif']}
            />
          </View>

          <View style={S.row2}>
            <InnovCard
              icon="💰" priority="MOYENNE"
              title="Financement de Factures Intégré"
              color={C.greenLight} borderColor="#a7f3d0"
              desc="Partenariat avec des institutions de microfinance et banques africaines pour permettre le financement de factures (invoice factoring) directement depuis Athenis. Une facture impayée à 30 jours peut être cédée à un partenaire financier en 1 clic pour obtenir 80% de son montant immédiatement."
              impact="Liquidité immédiate pour les PME" effort="4 mois (partenariats)" tags={['Factoring', 'Banques', 'Liquidité', 'PME']}
            />
            <InnovCard
              icon="🧩" priority="MOYENNE"
              title="Athenis pour Associations & ONG"
              color={C.blueBg} borderColor="#bfdbfe"
              desc="Module spécialisé pour les associations et ONGs : comptabilité en fonds (Fund Accounting), suivi des subventions par projet, rapports aux bailleurs de fonds, conformité avec les exigences des ONG internationales. Marché africain énorme et totalement inexploité par les logiciels actuels."
              impact="Nouveau segment de marché" effort="3 mois" tags={['ONG', 'Fonds', 'Subventions', 'Bailleurs']}
            />
          </View>

          <View style={S.row2}>
            <InnovCard
              icon="📈" priority="MOYENNE"
              title="Benchmarking Sectoriel Anonymisé"
              color={C.accentBg} borderColor="#fde68a"
              desc="Comparaison de vos KPIs financiers (marge brute, DSO, ratio dette/CA) avec la médiane des sociétés similaires dans Athenis (anonymisées). « Votre DSO est 45 jours — la médiane de votre secteur est 28 jours ». Insights actionnables pour améliorer la performance."
              impact="Décisions stratégiques data-driven" effort="2 mois" tags={['Benchmark', 'KPI', 'Secteur', 'Anonymisé']}
            />
            <InnovCard
              icon="🎓" priority="MOYENNE"
              title="Athenis Academy — Formation intégrée"
              color={C.greenLight} borderColor="#a7f3d0"
              desc="Tutoriels vidéo et guides interactifs intégrés directement dans l'interface, contextuels à chaque page. Certification Athenis pour les comptables. Programme de formation pour les cabinets partenaires. Réduit le temps d'onboarding de 3 semaines à 3 jours. Fidélise les utilisateurs et les rend ambassadeurs."
              impact="Réduction churn -40%" effort="3 mois (contenu)" tags={['Formation', 'Onboarding', 'Certification', 'Vidéo']}
            />
          </View>
        </View>
        <PF />
      </Page>

      {/* ═══ 7 — ROADMAP ════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PH title="Roadmap 18 mois" section="07" />
        <View style={S.body}>
          <SB num="07" title="Feuille de route — Plan sur 18 mois" badge="Execution Plan 2026–2027" bg={C.green} />

          {[
            {
              phase: 'PHASE 1', period: 'Mois 1–4 · Rattrapage critique',
              color: C.red, bg: C.redBg,
              items: [
                '🤖 Agent Comptable IA Autonome (AutoBook) — LLM OHADA fine-tuné',
                '📸 Scan & OCR IA (ScanAI) — Photo → facture comptabilisée',
                '📲 Mobile Money Hub Temps Réel (API MTN + Orange + Wave)',
                '📱 Application Mobile Native iOS/Android (Athenis Go) — MVP',
                '🧾 Facturation WhatsApp Business API',
              ]
            },
            {
              phase: 'PHASE 2', period: 'Mois 5–10 · Différenciation',
              color: C.accent, bg: C.accentBg,
              items: [
                '🔏 E-Facture DGI connectée (API gouvernementale)',
                '✍ Signature électronique avancée (eIDAS / CAMPOST)',
                '🔮 Prévision IA de trésorerie ML 180 jours',
                '💬 TaxGPT OHADA — Assistant fiscal IA spécialisé',
                '🔗 Portail Client Self-Service (Athenis Connect)',
                '🌱 Calcul carbone automatique depuis la comptabilité',
              ]
            },
            {
              phase: 'PHASE 3', period: 'Mois 11–18 · Domination',
              color: C.green, bg: C.greenLight,
              items: [
                '🎙 Comptabilité Vocale multi-langue (Français + Fula + Bassa)',
                '🔄 Clôture Comptable Automatique (1 clic)',
                '🏢 Consolidation Multi-Sociétés (Group Finance)',
                '💳 Scoring Crédit Client IA',
                '💰 Financement de Factures (Invoice Factoring)',
                '🤝 API Ouverte + Marketplace App Store Athenis',
                '📊 Benchmarking sectoriel anonymisé',
                '🎓 Athenis Academy — Formation & Certification',
              ]
            },
          ].map(ph => (
            <View key={ph.phase} style={[S.card, { borderColor: ph.color, borderLeftWidth: 4 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ backgroundColor: ph.color, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginRight: 10 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.white }}>{ph.phase}</Text>
                </View>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.dark }}>{ph.period}</Text>
              </View>
              <View style={S.fl}>
                {ph.items.map(item => <F key={item} t={item} />)}
              </View>
            </View>
          ))}
        </View>
        <PF />
      </Page>

      {/* ═══ 8 — CONCLUSION ═══════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PH title="Conclusion" section="08" />
        <View style={S.body}>
          <SB num="08" title="Conclusion & Avantages compétitifs visés" badge="Objectif N°1 Afrique" bg={C.greenDark} />

          <Text style={S.p}>
            Athenis dispose aujourd'hui d'une fondation technique et fonctionnelle exceptionnelle
            qui surpasse tous les acteurs locaux africains et rivalise avec les leaders mondiaux
            sur les dimensions spécifiques au marché africain. Les 25 innovations proposées créent
            un avantage compétitif durable et difficile à répliquer.
          </Text>

          <Text style={S.h2}>Les 5 avantages compétitifs décisifs post-roadmap</Text>

          <View style={S.row2}>
            {[
              {
                num: '01', title: 'Africa-First\ninavigable',
                desc: 'OHADA + Mobile Money + Fiscalité CM + Langues locales + Mode offline : aucun concurrent mondial ne peut répliquer ce périmètre en moins de 3 ans.',
                color: C.green,
              },
              {
                num: '02', title: 'IA Comptable\nautonome OHADA',
                desc: 'Seul agent IA fine-tuné spécifiquement sur le droit OHADA et la fiscalité camerounaise. Avantage data moat : plus les clients l\'utilisent, plus l\'IA s\'améliore.',
                color: C.purple,
              },
            ].map(c => (
              <View key={c.num} style={[S.card, { flex: 1, borderTopWidth: 4, borderTopColor: c.color }]}>
                <Text style={[S.cardTitle, { color: c.color, fontSize: 14 }]}>{c.num}</Text>
                <Text style={[S.h3, { marginTop: 4 }]}>{c.title}</Text>
                <Text style={S.p}>{c.desc}</Text>
              </View>
            ))}
          </View>

          <View style={S.row3}>
            {[
              {
                num: '03', title: 'Plateforme financière complète',
                desc: 'Gestion + Compta + RH + Juridique + ESG + Fiscal + Cabinet + Personnel = valeur impossible à quitter. Les concurrents sont des outils, Athenis devient le système nerveux de l\'entreprise.',
                color: C.blue,
              },
              {
                num: '04', title: 'Écosystème Mobile Money',
                desc: 'Avec $1,4T de transactions Mobile Money en Afrique, être la seule plateforme ERP connectée en temps réel à MTN/Orange/Wave est un avantage structurel unique.',
                color: C.orange,
              },
              {
                num: '05', title: 'Conformité proactive',
                desc: 'E-facture DGI, CSRD, OHADA, CNPS : Athenis anticipe chaque réglementation avant qu\'elle soit obligatoire, créant un lock-in légal pour ses clients.',
                color: C.green,
              },
            ].map(c => (
              <View key={c.num} style={[S.card, { flex: 1, borderTopWidth: 4, borderTopColor: c.color }]}>
                <Text style={[S.cardTitle, { color: c.color, fontSize: 12 }]}>{c.num}</Text>
                <Text style={[S.h3, { marginTop: 4 }]}>{c.title}</Text>
                <Text style={[S.p, { fontSize: 8.5 }]}>{c.desc}</Text>
              </View>
            ))}
          </View>

          <View style={[S.highlight, { borderLeftColor: C.green }]}>
            <Text style={[S.highlightT, { color: C.greenDark, fontFamily: 'Helvetica-Bold', fontSize: 10 }]}>
              Objectif : Dans 18 mois, Athenis sera la seule plateforme financière au monde à
              combiner comptabilité OHADA, Mobile Money temps réel, agent IA autonome spécialisé
              Africa, e-facture légale DGI, et mode offline-first — une combinaison introuvable
              chez Odoo, Sage, QuickBooks ou Xero. La fenêtre d'opportunité est maintenant.
            </Text>
          </View>

          <View style={S.chipRow}>
            {['Agent IA OHADA', 'OCR Scan Mobile', 'App Mobile Native', 'API MoMo Temps Réel',
              'WhatsApp Facturation', 'E-Invoice DGI', 'TaxGPT Cameroun', 'Clôture Auto',
              'Portail Client', 'Calcul CO₂ Auto', 'Scoring Crédit', 'API Ouverte'].map(f => (
              <Chip key={f} l={f} />
            ))}
          </View>
        </View>
        <PF />
      </Page>

    </Document>
  )
}
