import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  green:       '#1a6b3c',
  greenLight:  '#e8f5ee',
  greenMid:    '#2d8653',
  greenDark:   '#0f4526',
  accent:      '#f59e0b',
  accentBg:    '#fffbeb',
  blue:        '#1d4ed8',
  blueBg:      '#eff6ff',
  purple:      '#7c3aed',
  purpleBg:    '#f5f3ff',
  teal:        '#0d9488',
  tealBg:      '#f0fdfa',
  orange:      '#ea580c',
  orangeBg:    '#fff7ed',
  dark:        '#111827',
  gray:        '#374151',
  grayMid:     '#6b7280',
  grayLight:   '#e5e7eb',
  grayXLight:  '#f9fafb',
  white:       '#ffffff',
  border:      '#d1d5db',
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page:      { fontFamily: 'Helvetica', backgroundColor: C.white, paddingBottom: 52 },
  coverPage: { fontFamily: 'Helvetica', backgroundColor: C.greenDark },

  pageHeaderBar: {
    backgroundColor: C.green, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 9,
  },
  pageHeaderTitle: { fontSize: 8, color: C.white, opacity: 0.9 },

  pageFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopWidth: 1, borderTopColor: C.grayLight,
    paddingHorizontal: 32, paddingVertical: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  footerText: { fontSize: 7, color: C.grayMid },

  body: { paddingHorizontal: 34, paddingTop: 18 },

  // Cover
  coverTop:      { flex: 1, padding: 48, justifyContent: 'center' },
  coverEyebrow:  { fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 4, marginBottom: 12 },
  coverLogo:     { fontSize: 46, fontFamily: 'Helvetica-Bold', color: C.white, marginBottom: 6 },
  coverTitle:    { fontSize: 26, fontFamily: 'Helvetica-Bold', color: C.white, lineHeight: 1.3, marginBottom: 10 },
  coverDesc:     { fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, maxWidth: 440 },
  coverV2Badge:  {
    marginTop: 16, alignSelf: 'flex-start',
    backgroundColor: C.accent, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4,
  },
  coverV2Text:   { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.dark },
  coverStatsRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
  coverStat: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center',
  },
  coverStatNum: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: C.white },
  coverStatLbl: { fontSize: 7, color: 'rgba(255,255,255,0.55)', marginTop: 3, textAlign: 'center' },
  coverBottom: {
    backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 48, paddingVertical: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  coverMeta:    { fontSize: 8, color: 'rgba(255,255,255,0.5)' },
  coverMetaVal: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white, marginTop: 2 },

  // TOC
  tocTitle:   { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.green, marginBottom: 18 },
  tocGroup:   { marginBottom: 4 },
  tocItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.grayXLight,
  },
  tocItemSub: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 3, paddingLeft: 16, borderBottomWidth: 1, borderBottomColor: C.grayXLight,
  },
  tocNum:      { fontSize: 9, color: C.green, fontFamily: 'Helvetica-Bold', width: 26 },
  tocLabel:    { fontSize: 10, color: C.dark, flex: 1, fontFamily: 'Helvetica-Bold' },
  tocLabelSub: { fontSize: 9, color: C.gray, flex: 1 },
  tocDots: {
    flex: 1, borderBottomWidth: 1, borderBottomStyle: 'dotted',
    borderBottomColor: C.grayLight, marginHorizontal: 4,
  },
  tocPage: { fontSize: 9, color: C.grayMid, width: 20, textAlign: 'right' },
  tocNew: {
    backgroundColor: C.accent, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 6,
  },
  tocNewText: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.dark },

  // Section banners
  sectionBanner: {
    borderRadius: 6, paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 4,
  },
  sectionNum:       { fontSize: 20, fontFamily: 'Helvetica-Bold', color: 'rgba(255,255,255,0.25)', marginRight: 12 },
  sectionTitle:     { fontSize: 15, fontFamily: 'Helvetica-Bold', color: C.white, flex: 1 },
  sectionBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3,
  },
  sectionBadgeText: { fontSize: 8, color: C.white },

  h2:    { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.greenMid, marginTop: 16, marginBottom: 8 },
  h3:    { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.dark, marginTop: 10, marginBottom: 5 },
  p:     { fontSize: 9, color: C.gray, lineHeight: 1.65, marginBottom: 7 },
  pBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 4 },

  // Cards
  card:      { border: 1, borderColor: C.border, borderRadius: 6, padding: 11, marginBottom: 9 },
  cardGreen: { border: 1, borderColor: '#a7f3d0', borderRadius: 6, padding: 11, backgroundColor: C.greenLight, marginBottom: 9 },
  cardBlue:  { border: 1, borderColor: '#bfdbfe', borderRadius: 6, padding: 11, backgroundColor: C.blueBg, marginBottom: 9 },
  cardPurple:{ border: 1, borderColor: '#ddd6fe', borderRadius: 6, padding: 11, backgroundColor: C.purpleBg, marginBottom: 9 },
  cardAccent:{ border: 1, borderColor: '#fcd34d', borderRadius: 6, padding: 11, backgroundColor: C.accentBg, marginBottom: 9 },
  cardOrange:{ border: 1, borderColor: '#fdba74', borderRadius: 6, padding: 11, backgroundColor: C.orangeBg, marginBottom: 9 },
  cardTeal:  { border: 1, borderColor: '#99f6e4', borderRadius: 6, padding: 11, backgroundColor: C.tealBg, marginBottom: 9 },
  cardTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 6 },
  cardTitleGreen:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.green, marginBottom: 5 },
  cardTitleBlue:   { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.blue, marginBottom: 5 },
  cardTitlePurple: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.purple, marginBottom: 5 },
  cardTitleOrange: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.orange, marginBottom: 5 },
  cardTitleTeal:   { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.teal, marginBottom: 5 },

  // Grid
  row2: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  row3: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  col:  { flex: 1 },

  // Feature list
  featureList: { marginLeft: 6, marginBottom: 8 },
  featureItem: { flexDirection: 'row', marginBottom: 4 },
  bullet:      { fontSize: 9, color: C.green, marginRight: 6, fontFamily: 'Helvetica-Bold' },
  bulletBlue:  { fontSize: 9, color: C.blue, marginRight: 6, fontFamily: 'Helvetica-Bold' },
  bulletPurple:{ fontSize: 9, color: C.purple, marginRight: 6, fontFamily: 'Helvetica-Bold' },
  featureText: { fontSize: 9, color: C.gray, flex: 1, lineHeight: 1.5 },

  // Chips
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  chip:         { backgroundColor: C.greenLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  chipText:     { fontSize: 8, color: C.green, fontFamily: 'Helvetica-Bold' },
  chipBlue:     { backgroundColor: C.blueBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  chipBlueText: { fontSize: 8, color: C.blue, fontFamily: 'Helvetica-Bold' },
  chipPurple:   { backgroundColor: C.purpleBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  chipPurpleText:{ fontSize: 8, color: C.purple, fontFamily: 'Helvetica-Bold' },
  chipAccent:   { backgroundColor: C.accentBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  chipAccentText:{ fontSize: 8, color: C.orange, fontFamily: 'Helvetica-Bold' },
  chipGray:     { backgroundColor: C.grayXLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  chipGrayText: { fontSize: 8, color: C.grayMid },

  // Table
  table:         { marginBottom: 10 },
  tableHead:     { flexDirection: 'row', backgroundColor: C.green, borderRadius: 3, padding: 6 },
  tableHeadCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.white, flex: 1 },
  tableRow:      { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.grayXLight, padding: 6 },
  tableRowAlt:   { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.grayXLight, padding: 6, backgroundColor: C.grayXLight },
  tableCell:     { fontSize: 8, color: C.gray, flex: 1 },
  tableCellBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.dark, flex: 1 },
  tableCellGreen:{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.green, flex: 1 },

  // Highlight / note boxes
  highlight: {
    backgroundColor: C.accentBg, borderLeftWidth: 3, borderLeftColor: C.accent,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, borderRadius: 2,
  },
  highlightText: { fontSize: 9, color: '#92400e', lineHeight: 1.5 },
  devNote: {
    backgroundColor: C.blueBg, borderLeftWidth: 3, borderLeftColor: C.blue,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, borderRadius: 2,
  },
  devNoteLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.blue, marginBottom: 3 },
  devNoteText:  { fontSize: 9, color: '#1e40af', lineHeight: 1.5 },
  innovBadge: {
    backgroundColor: C.purpleBg, borderLeftWidth: 3, borderLeftColor: C.purple,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, borderRadius: 2,
  },
  innovLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.purple, marginBottom: 3 },
  innovText:  { fontSize: 9, color: '#5b21b6', lineHeight: 1.5 },

  // Divider
  divider: { borderBottomWidth: 1, borderBottomColor: C.grayLight, marginVertical: 10 },

  // Roadmap
  roadmapRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.grayXLight,
    paddingVertical: 7, alignItems: 'flex-start',
  },
  roadmapPhase: {
    width: 70, fontSize: 8, fontFamily: 'Helvetica-Bold',
    color: C.white, textAlign: 'center', borderRadius: 3, paddingVertical: 2,
  },
  roadmapTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark, flex: 1, paddingLeft: 10 },
  roadmapDesc:  { fontSize: 8, color: C.gray, flex: 2, paddingLeft: 10, lineHeight: 1.5 },

  // Priority badge
  prioHigh:   { backgroundColor: '#fef2f2', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 },
  prioMed:    { backgroundColor: C.accentBg, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 },
  prioLow:    { backgroundColor: C.grayXLight, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 },
  prioHighText:{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#dc2626' },
  prioMedText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.orange },
  prioLowText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.grayMid },
})

// ── Helpers ───────────────────────────────────────────────────────────────────
const PageHeader = ({ title }: { title: string }) => (
  <View style={S.pageHeaderBar} fixed>
    <Text style={S.pageHeaderTitle}>Athenis · Cahier des Charges v2.0 — Intégration Stratégique</Text>
    <Text style={S.pageHeaderTitle}>{title}</Text>
  </View>
)

const PageFooter = () => (
  <View style={S.pageFooter} fixed>
    <Text style={S.footerText}>© 2026 Athenis · Document Confidentiel</Text>
    <Text style={S.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
    <Text style={S.footerText}>Version 2.0 · Mai 2026</Text>
  </View>
)

const Feat = ({ text, color = 'green' }: { text: string; color?: 'green' | 'blue' | 'purple' }) => (
  <View style={S.featureItem}>
    <Text style={color === 'blue' ? S.bulletBlue : color === 'purple' ? S.bulletPurple : S.bullet}>›</Text>
    <Text style={S.featureText}>{text}</Text>
  </View>
)

const Chip = ({ label }: { label: string }) => (
  <View style={S.chip}><Text style={S.chipText}>{label}</Text></View>
)

const Banner = ({ num, title, tag, color = C.green }: { num: string; title: string; tag: string; color?: string }) => (
  <View style={[S.sectionBanner, { backgroundColor: color }]}>
    <Text style={S.sectionNum}>{num}</Text>
    <Text style={S.sectionTitle}>{title}</Text>
    <View style={S.sectionBadge}><Text style={S.sectionBadgeText}>{tag}</Text></View>
  </View>
)

const DevNote = ({ text }: { text: string }) => (
  <View style={S.devNote}>
    <Text style={S.devNoteLabel}>NOTE DÉVELOPPEUR</Text>
    <Text style={S.devNoteText}>{text}</Text>
  </View>
)

const Innov = ({ text }: { text: string }) => (
  <View style={S.innovBadge}>
    <Text style={S.innovLabel}>★ INNOVATION CONCURRENTIELLE</Text>
    <Text style={S.innovText}>{text}</Text>
  </View>
)

const Highlight = ({ text }: { text: string }) => (
  <View style={S.highlight}>
    <Text style={S.highlightText}>{text}</Text>
  </View>
)

// ── Document principal ────────────────────────────────────────────────────────
export function CahierChargesV2Pdf() {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <Document
      title="Athenis – Cahier des Charges Fonctionnel & Technique v2.0"
      author="Athenis"
      subject="Spécifications intégrales + Recommandations stratégiques"
      creator="Athenis PDF Engine v2"
    >

      {/* ════════════════════════════════════════════════════════════════════
          PAGE DE COUVERTURE
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.coverPage}>
        <View style={S.coverTop}>
          <Text style={S.coverEyebrow}>DOCUMENT OFFICIEL — CONFIDENTIEL</Text>
          <Text style={S.coverLogo}>Athenis</Text>
          <Text style={S.coverTitle}>Cahier des Charges{'\n'}Fonctionnel & Technique</Text>
          <Text style={S.coverDesc}>
            Version 2.0 — Intégration complète des recommandations de l'analyse concurrentielle.
            Spécifications exhaustives de tous les modules, innovations différenciantes,
            flows UX détaillés et notes techniques à destination des développeurs.
          </Text>
          <View style={S.coverV2Badge}>
            <Text style={S.coverV2Text}>VERSION 2.0 — STRATÉGIQUE</Text>
          </View>
          <View style={S.coverStatsRow}>
            {([
              ['16', 'Sections'],
              ['9', 'Modules'],
              ['25', 'Innovations'],
              ['100+', 'Écrans'],
              ['18 mois', 'Roadmap'],
            ] as [string, string][]).map(([v, l]) => (
              <View key={l} style={S.coverStat}>
                <Text style={S.coverStatNum}>{v}</Text>
                <Text style={S.coverStatLbl}>{l}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={S.coverBottom}>
          <View><Text style={S.coverMeta}>Date d'édition</Text><Text style={S.coverMetaVal}>{today}</Text></View>
          <View><Text style={S.coverMeta}>Version</Text><Text style={S.coverMetaVal}>2.0</Text></View>
          <View><Text style={S.coverMeta}>Statut</Text><Text style={S.coverMetaVal}>CONFIDENTIEL</Text></View>
          <View><Text style={S.coverMeta}>Marché cible</Text><Text style={S.coverMetaVal}>Afrique Subsaharienne</Text></View>
          <View><Text style={S.coverMeta}>Branche</Text><Text style={S.coverMetaVal}>claude/naughty-noyce</Text></View>
        </View>
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          TABLE DES MATIÈRES
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="Sommaire" />
        <View style={S.body}>
          <Text style={S.tocTitle}>Table des matières</Text>

          {([
            ['01', 'Présentation & Positionnement Stratégique', '3'],
            ['02', 'Architecture Technique v2', '5'],
            ['03', 'Module Gestion Commerciale', '7'],
            ['04', 'Module Comptabilité & Finance', '11'],
            ['05', 'Module Ressources Humaines', '15'],
            ['06', 'Module Juridique & Conformité', '19'],
            ['07', 'Module ESG & RSE', '22'],
            ['08', 'Module Fiscalité OHADA', '25'],
            ['09', 'Module Cabinet Comptable', '28'],
            ['10', 'Finance Personnelle', '31'],
            ['11', 'IA & Automatisation ★', '34', true],
            ['12', 'Intégrations Africaines ★', '38', true],
            ['13', 'Application Mobile Athenis Go ★', '42', true],
            ['14', 'Auth, RBAC & Paramètres', '45'],
            ['15', 'Sécurité & Conformité', '48'],
            ['16', 'Roadmap Implémentation 18 Mois', '50'],
          ] as [string, string, string, boolean?][]).map(([num, label, page, isNew]) => (
            <View key={num} style={S.tocItem}>
              <Text style={S.tocNum}>{num}</Text>
              <Text style={S.tocLabel}>{label}</Text>
              {isNew && <View style={S.tocNew}><Text style={S.tocNewText}>NOUVEAU</Text></View>}
              <View style={S.tocDots} />
              <Text style={S.tocPage}>{page}</Text>
            </View>
          ))}
        </View>
        <PageFooter />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1 — PRÉSENTATION & POSITIONNEMENT
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="01 · Présentation" />
        <View style={S.body}>
          <Banner num="01" title="Présentation & Positionnement Stratégique" tag="Contexte" />

          <Text style={S.h2}>1.1 Vision produit</Text>
          <Text style={S.p}>
            Athenis est une plateforme financière intelligente tout-en-un conçue pour les PME,
            TPE, cabinets comptables et entrepreneurs d'Afrique subsaharienne. Elle centralise
            gestion commerciale, comptabilité, RH, juridique, ESG et fiscalité dans une interface
            unifiée, multilingue et adaptée aux réalités locales (OHADA, Mobile Money, SYSCOHADA).
          </Text>
          <Text style={S.p}>
            La version 2.0 intègre les 25 innovations identifiées dans l'analyse concurrentielle :
            intelligence artificielle embarquée, intégrations Mobile Money, application mobile,
            e-facturation DGI et automatisation comptable avancée.
          </Text>

          <Text style={S.h2}>1.2 Positionnement concurrentiel</Text>
          <View style={S.row2}>
            <View style={[S.col, S.cardGreen]}>
              <Text style={S.cardTitleGreen}>Points forts différenciants</Text>
              <View style={S.featureList}>
                <Feat text="Seule plateforme couvrant OHADA + SYSCOHADA natif" />
                <Feat text="IA générative locale (TaxGPT, AutoBook, ScanAI)" />
                <Feat text="Mobile Money Hub : Orange, MTN, Wave, Moov unifiés" />
                <Feat text="Multi-entités : entreprise, cabinet, personnel" />
                <Feat text="Offline-first pour zones à faible connectivité" />
                <Feat text="Application mobile Athenis Go (iOS + Android)" />
              </View>
            </View>
            <View style={[S.col, S.card]}>
              <Text style={S.cardTitle}>Concurrents analysés (12)</Text>
              <View style={S.featureList}>
                <Feat text="Sage, QuickBooks, Xero — leaders mondiaux non localisés" color="blue" />
                <Feat text="Odoo, ERPNext — complexité élevée, implémentation longue" color="blue" />
                <Feat text="Wave — gratuit mais limité, sans comptabilité avancée" color="blue" />
                <Feat text="Zoho Books, FreshBooks — orientés facturation" color="blue" />
                <Feat text="Inqom, Pennylane — cabinets France, hors Afrique" color="blue" />
                <Feat text="Sage Cameroun, SAARI — ancienne génération" color="blue" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>1.3 Cibles utilisateurs</Text>
          <View style={S.row3}>
            {([
              ['Entreprise', 'TPE/PME (5–500 employés)\nGestion complète : ventes, achats, RH, compta, fiscal'],
              ['Cabinet', 'Cabinets comptables\nMulti-clients, collaboration, facturation cabinet'],
              ['Personnel', 'Entrepreneurs & particuliers\nBudget, épargne, revenus, dépenses'],
            ] as [string, string][]).map(([t, d]) => (
              <View key={t} style={[S.col, S.card]}>
                <Text style={S.cardTitle}>{t}</Text>
                <Text style={S.p}>{d}</Text>
              </View>
            ))}
          </View>

          <Text style={S.h2}>1.4 Plans tarifaires</Text>
          <View style={S.table}>
            <View style={S.tableHead}>
              {['Plan', 'Prix/mois', 'Cible', 'Modules inclus'].map(h => (
                <Text key={h} style={S.tableHeadCell}>{h}</Text>
              ))}
            </View>
            {([
              ['FREE', 'Gratuit', 'Test/découverte', 'Gestion basique, 50 factures/mois'],
              ['STARTER', '9 990 XAF', 'Micro-entreprise', '+ Comptabilité, Fiscal, 200 factures'],
              ['PRO', '24 990 XAF', 'PME', '+ RH, Juridique, ESG, illimité'],
              ['PREMIUM', '49 990 XAF', 'Groupe / Export', '+ IA avancée, Athenis Go, API, support dédié'],
            ] as [string, string, string, string][]).map(([p, pr, t, m], i) => (
              <View key={p} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={S.tableCellBold}>{p}</Text>
                <Text style={S.tableCell}>{pr}</Text>
                <Text style={S.tableCell}>{t}</Text>
                <Text style={S.tableCell}>{m}</Text>
              </View>
            ))}
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2 — ARCHITECTURE TECHNIQUE
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="02 · Architecture" />
        <View style={S.body}>
          <Banner num="02" title="Architecture Technique v2" tag="Tech" color={C.blue} />

          <Text style={S.h2}>2.1 Stack technologique</Text>
          <View style={S.row2}>
            <View style={[S.col, S.cardBlue]}>
              <Text style={S.cardTitleBlue}>Backend</Text>
              <View style={S.featureList}>
                <Feat text="Node.js + Express + TypeScript" color="blue" />
                <Feat text="Prisma ORM + PostgreSQL 15" color="blue" />
                <Feat text="JWT (access 15min) + Refresh token (HttpOnly cookie)" color="blue" />
                <Feat text="Zod validation sur tous les DTOs" color="blue" />
                <Feat text="Winston logger + Sentry error tracking" color="blue" />
                <Feat text="BullMQ pour files d'attente (emails, OCR, sync)" color="blue" />
                <Feat text="Redis cache (sessions, rate-limit, agrégats)" color="blue" />
              </View>
            </View>
            <View style={[S.col, S.cardBlue]}>
              <Text style={S.cardTitleBlue}>Frontend</Text>
              <View style={S.featureList}>
                <Feat text="React 18 + TypeScript + Vite" color="blue" />
                <Feat text="TailwindCSS + shadcn/ui" color="blue" />
                <Feat text="TanStack Query v5 (cache + mutations)" color="blue" />
                <Feat text="Recharts pour graphiques" color="blue" />
                <Feat text="@react-pdf/renderer pour exports PDF" color="blue" />
                <Feat text="Tauri v2 pour build desktop (Windows/Mac/Linux)" color="blue" />
                <Feat text="PostHog analytics + Sentry frontend" color="blue" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>2.2 Architecture mobile (Athenis Go)</Text>
          <View style={S.row2}>
            <View style={[S.col, S.cardPurple]}>
              <Text style={S.cardTitlePurple}>React Native + Expo</Text>
              <View style={S.featureList}>
                <Feat text="iOS 14+ et Android 8+" color="purple" />
                <Feat text="Expo Router (file-based navigation)" color="purple" />
                <Feat text="MMKV storage offline-first" color="purple" />
                <Feat text="Reanimated 3 pour animations fluides" color="purple" />
                <Feat text="Camera API pour ScanAI (OCR factures)" color="purple" />
                <Feat text="Push notifications (Expo Notifications)" color="purple" />
              </View>
            </View>
            <View style={[S.col, S.card]}>
              <Text style={S.cardTitle}>Synchronisation offline</Text>
              <View style={S.featureList}>
                <Feat text="Mode offline complet pour saisie factures/dépenses" />
                <Feat text="Queue locale SQLite avec sync auto au retour réseau" />
                <Feat text="Conflits résolus par timestamp (last-write-wins)" />
                <Feat text="Indicateur visuel de statut sync en header" />
              </View>
              <DevNote text="Utiliser Watermelon DB (SQLite) pour le stockage local mobile. Sync incrémentale via endpoint /api/sync/pull et /sync/push." />
            </View>
          </View>

          <Text style={S.h2}>2.3 Infrastructure & Déploiement</Text>
          <View style={S.row3}>
            {([
              ['Production', 'Docker Compose\nnginx reverse proxy\nPostgreSQL + Redis\nSentry + PostHog'],
              ['CI/CD', 'GitHub Actions\nBuild + test + deploy\nMigrations auto\nSemver releases'],
              ['Sécurité', 'HTTPS TLS 1.3\nCSRF protection\nHelmet.js headers\nRate limiting'],
            ] as [string, string][]).map(([t, d]) => (
              <View key={t} style={[S.col, S.card]}>
                <Text style={S.cardTitle}>{t}</Text>
                <Text style={S.p}>{d}</Text>
              </View>
            ))}
          </View>

          <DevNote text="Architecture multi-tenant : tous les enregistrements portent un companyId (ou cabinetId / userId pour les types perso). Les middlewares authenticate.ts et checkModule.ts enforcentl'isolation. Ne jamais exposer de données cross-tenant." />

          <Text style={S.h2}>2.4 Modèles de données principaux</Text>
          <Text style={S.p}>
            Schema Prisma centralisé. Entités racines : User, Company, Cabinet, PersonalProfile.
            Chaque module dispose de ses tables propres avec FK vers Company/Cabinet.
            Multi-agences : table Agency avec relation many-to-many User↔Agency via UserAgency.
            Invitations : table Invitation pour onboarding client cabinet.
          </Text>
          <Highlight text="Règle architecturale : tout endpoint API (sauf /auth/*, /invitation/accept) doit impérativement passer par le middleware authenticate puis checkModule. Les routes admin vérifient platformRole = SUPER_ADMIN en base (pas dans le JWT)." />
        </View>
        <PageFooter />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 3 — GESTION COMMERCIALE
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="03 · Gestion Commerciale" />
        <View style={S.body}>
          <Banner num="03" title="Module Gestion Commerciale" tag="gestion" />

          <Text style={S.h2}>3.1 Vue d'ensemble</Text>
          <Text style={S.p}>
            Module cœur de la plateforme. Gestion complète du cycle de vente et d'achat :
            clients, fournisseurs, devis, factures, bons de livraison, retours, récurrences.
            Toutes les pièces génèrent des écritures comptables automatiques via le module comptabilité.
          </Text>
          <View style={S.chipRow}>
            <Chip label="Factures ventes" /><Chip label="Factures achats" /><Chip label="Devis" />
            <Chip label="BL / BR" /><Chip label="Récurrences" /><Chip label="Clients & Fournisseurs" />
            <Chip label="Articles & Stocks" /><Chip label="Retours clients" /><Chip label="Caisse" />
          </View>

          <Text style={S.h2}>3.2 Gestion des factures</Text>
          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>Factures de vente</Text>
              <View style={S.featureList}>
                <Feat text="Création avec sélection client (autocomplétion)" />
                <Feat text="Lignes : article/service, quantité, prix HT, TVA, remise" />
                <Feat text="Calcul automatique HT/TVA/TTC" />
                <Feat text="Numérotation automatique (ex: FAC-2026-0042)" />
                <Feat text="Statuts : BROUILLON → ENVOYÉE → PAYÉE → ANNULÉE" />
                <Feat text="Export PDF avec QR code DGI (e-Invoice)" />
                <Feat text="Envoi par email intégré depuis la plateforme" />
                <Feat text="Relance automatique configurable (J+7, J+14, J+30)" />
                <Feat text="Paiement partiel avec suivi du reste dû" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>Factures d'achat</Text>
              <View style={S.featureList}>
                <Feat text="Import depuis bon de réception" />
                <Feat text="ScanAI : OCR depuis photo facture fournisseur" />
                <Feat text="Validation en 2 étapes (saisie → approbation)" />
                <Feat text="Catégorisation comptable automatique par IA" />
                <Feat text="Statuts : REÇUE → VALIDÉE → PAYÉE" />
                <Feat text="Intégration paiement Mobile Money direct" />
              </View>
              <Innov text="ScanAI : l'utilisateur photographie une facture fournisseur, l'OCR extrait automatiquement date, montant, TVA, fournisseur et pré-remplit le formulaire. Réduction de 90% du temps de saisie." />
            </View>
          </View>

          <Text style={S.h2}>3.3 Ventes récurrentes</Text>
          <Text style={S.p}>
            Automatisation des factures périodiques (abonnements, loyers, forfaits).
            L'utilisateur configure un modèle de facture avec fréquence (mensuelle, trimestrielle,
            annuelle), date de début/fin et règles de numérotation. Le système génère automatiquement
            les factures à l'échéance et notifie par email/mobile.
          </Text>
          <DevNote text="Table RecurringInvoice avec champs: templateId, frequency (MONTHLY|QUARTERLY|ANNUALLY), nextRunAt, lastRunAt. Cron BullMQ qui tourne toutes les nuits à 00h00 et génère les factures dues." />

          <Text style={S.h2}>3.4 Gestion des stocks</Text>
          <View style={S.row2}>
            <View style={[S.col, S.featureList]}>
              <Feat text="Familles et sous-familles d'articles" />
              <Feat text="Stock par entrepôt / agence" />
              <Feat text="Mouvements : entrées, sorties, transferts" />
              <Feat text="Valorisation FIFO / CMUP configurable" />
              <Feat text="Alertes seuil minimum (email + push mobile)" />
            </View>
            <View style={[S.col, S.featureList]}>
              <Feat text="Inventaire physique assisté (scan code-barres)" />
              <Feat text="Rapport de valorisation exportable PDF/Excel" />
              <Feat text="Historique complet des mouvements" />
              <Feat text="Intégration automatique avec factures ventes/achats" />
            </View>
          </View>
        </View>
        <PageFooter />
      </Page>

      <Page size="A4" style={S.page}>
        <PageHeader title="03 · Gestion Commerciale (suite)" />
        <View style={S.body}>
          <Text style={S.h2}>3.5 Trésorerie & Caisses</Text>
          <Text style={S.p}>
            Tableau de bord de trésorerie en temps réel : solde banque, solde caisse,
            Mobile Money, prévisions 30 jours par IA. Rapprochement bancaire semi-automatique.
          </Text>
          <View style={S.row2}>
            <View style={[S.col, S.card]}>
              <Text style={S.cardTitle}>Gestion de caisse</Text>
              <View style={S.featureList}>
                <Feat text="Ouverture/fermeture de caisse journalière" />
                <Feat text="Enregistrement des entrées/sorties espèces" />
                <Feat text="Ticket de caisse imprimable" />
                <Feat text="Rapport de caisse quotidien PDF" />
                <Feat text="Plusieurs caisses par entreprise (multi-point de vente)" />
              </View>
            </View>
            <View style={[S.col, S.cardTeal]}>
              <Text style={S.cardTitleTeal}>CashFlow Intelligence (IA)</Text>
              <View style={S.featureList}>
                <Feat text="Prévision de trésorerie 30/60/90 jours" color="blue" />
                <Feat text="Détection des périodes de tension de trésorerie" color="blue" />
                <Feat text="Recommandations : décaler paiement, accélérer recouvrement" color="blue" />
                <Feat text="Historique vs prévu pour calibration du modèle" color="blue" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>3.6 Devis & Bons de livraison</Text>
          <View style={S.featureList}>
            <Feat text="Devis avec validité configurable (ex: 30 jours)" />
            <Feat text="Conversion en facture en 1 clic" />
            <Feat text="Bon de livraison généré depuis la facture validée" />
            <Feat text="Signature électronique client sur BL (pad numérique ou photo)" />
            <Feat text="Bon de réception : confirmation livraison fournisseur avec contrôle quantité" />
            <Feat text="Suivi des livraisons partielles avec reliquats" />
          </View>
          <DevNote text="Flux : Devis → Commande client (optionnel) → BL → Facture. Chaque étape met à jour le stock. La conversion entre documents conserve l'intégralité des lignes et du contexte client." />

          <Text style={S.h2}>3.7 Clients & Fournisseurs</Text>
          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>Fiche client enrichie</Text>
              <View style={S.featureList}>
                <Feat text="Informations légales (NIU, RCCM, numéro TVA)" />
                <Feat text="Coordonnées multiples (téléphone, email, WhatsApp)" />
                <Feat text="Historique complet des transactions" />
                <Feat text="Encours client (montant total impayé)" />
                <Feat text="Catégorie (VIP, Grand compte, Standard)" />
                <Feat text="Notes et pièces jointes" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>Intégration WhatsApp Business</Text>
              <Innov text="Envoi de factures/devis directement via WhatsApp Business API depuis la fiche client. Réponses automatiques pour statut de paiement. Taux d'ouverture 5× supérieur à l'email." />
              <View style={S.featureList}>
                <Feat text="Bouton 'Envoyer sur WhatsApp' sur toute pièce" color="purple" />
                <Feat text="Template de message configurable par type de document" color="purple" />
                <Feat text="Confirmation de lecture intégrée" color="purple" />
              </View>
            </View>
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 4 — COMPTABILITÉ & FINANCE
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="04 · Comptabilité & Finance" />
        <View style={S.body}>
          <Banner num="04" title="Module Comptabilité & Finance" tag="comptabilite" />

          <Text style={S.h2}>4.1 Saisie comptable</Text>
          <Text style={S.p}>
            Conformité SYSCOHADA révisé 2017. Plan comptable OHADA intégré avec 9 classes.
            Saisie manuelle, import bancaire et alimentation automatique depuis les modules Gestion et Paie.
          </Text>
          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>Journal des écritures</Text>
              <View style={S.featureList}>
                <Feat text="Journals : Achats (HA), Ventes (VE), Banque (BQ), Caisse (CA), Opérations diverses (OD)" />
                <Feat text="Saisie avec autocomplétion du plan de comptes (400, 401, 411…)" />
                <Feat text="Contrôle débit = crédit avant validation" />
                <Feat text="Verrouillage de période (exercice clôturé non modifiable)" />
                <Feat text="Lettrage manuel et automatique des comptes tiers" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>AutoBook (IA)</Text>
              <Innov text="AutoBook analyse les relevés bancaires importés et génère automatiquement les écritures comptables avec le bon compte OHADA, le bon journal et le bon tiers. L'expert-comptable n'a qu'à valider. Gain estimé : 4h/semaine par PME." />
              <View style={S.featureList}>
                <Feat text="Import OFX/CSV relevé bancaire" color="purple" />
                <Feat text="Classification ML par historique de l'entreprise" color="purple" />
                <Feat text="Taux de confiance affiché + suggestion alternative" color="purple" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>4.2 États financiers SYSCOHADA</Text>
          <View style={S.row3}>
            {([
              ['Bilan', 'Actif immobilisé, actif circulant, capitaux propres, dettes. Export PDF normé SYSCOHADA.'],
              ['Compte de résultat', 'Charges, produits, résultat net. Comparaison N vs N-1. Marge par activité.'],
              ['Tableau de flux', 'Flux opérationnels, investissement, financement. Calcul automatique.'],
              ['Balance générale', 'Tous les comptes avec débit/crédit/solde. Export Excel pour expert-comptable.'],
            ] as [string, string][]).map(([t, d]) => (
              <View key={t} style={[S.col, S.card]}>
                <Text style={S.cardTitle}>{t}</Text>
                <Text style={S.p}>{d}</Text>
              </View>
            ))}
          </View>

          <Text style={S.h2}>4.3 Révision comptable</Text>
          <Text style={S.p}>
            Outil collaboratif entre l'entreprise et son cabinet comptable. Chaque compte
            peut être marqué "à réviser", "révisé", "en attente". L'expert-comptable ajoute
            des notes, demande des justificatifs, valide les écritures.
          </Text>
          <View style={S.featureList}>
            <Feat text="Tableau de révision par période (mois/trimestre/année)" />
            <Feat text="Statuts : À réviser → En cours → Validé → Rejeté" />
            <Feat text="Commentaires et pièces jointes par écriture" />
            <Feat text="Rapport de révision exportable PDF pour dossier annuel" />
            <Feat text="Alertes automatiques sur anomalies (compte débiteur anormal, etc.)" />
          </View>

          <Text style={S.h2}>4.4 Immobilisations</Text>
          <View style={S.featureList}>
            <Feat text="Registre des immobilisations (matériels, logiciels, véhicules, bâtiments)" />
            <Feat text="Amortissements linéaire et dégressif avec calcul automatique" />
            <Feat text="Cessions et mises au rebut avec écriture comptable générée" />
            <Feat text="Tableau d'amortissement exportable PDF" />
            <Feat text="Alerte fin d'amortissement 90 jours avant" />
          </View>
          <DevNote text="Table Asset avec fields: category, acquisitionDate, acquisitionCost, residualValue, usefulLifeYears, method (LINEAR|DECLINING), depreciations[]. Calcul mensuel en cron BullMQ." />
        </View>
        <PageFooter />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 5 — RESSOURCES HUMAINES
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="05 · Ressources Humaines" />
        <View style={S.body}>
          <Banner num="05" title="Module Ressources Humaines" tag="rh" />

          <Text style={S.h2}>5.1 Gestion des employés</Text>
          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>Dossier employé complet</Text>
              <View style={S.featureList}>
                <Feat text="État civil, coordonnées, photo" />
                <Feat text="Informations contractuelles (type, poste, salaire brut)" />
                <Feat text="Documents : CNI, diplômes, contrat signé" />
                <Feat text="Banque et modalités de paiement" />
                <Feat text="Historique des évolutions salariales" />
                <Feat text="Certifications et formations suivies" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>Contrats & types</Text>
              <View style={S.featureList}>
                <Feat text="CDI, CDD (avec alertes de fin de contrat)" />
                <Feat text="Stagiaire, freelance, intérimaire" />
                <Feat text="Renouvellement en 1 clic avec historique" />
                <Feat text="Génération du contrat PDF depuis template" />
                <Feat text="Signature électronique intégrée" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>5.2 Paie OHADA</Text>
          <Text style={S.p}>
            Calcul de la paie conforme CNPS (Cameroun, Côte d'Ivoire, Sénégal...).
            Prend en charge IRPP, CNPS salarial et patronal, CRTV, RAS selon le pays configuré.
          </Text>
          <View style={S.table}>
            <View style={S.tableHead}>
              {['Élément', 'Base de calcul', 'Taux', 'Charge'].map(h => (
                <Text key={h} style={S.tableHeadCell}>{h}</Text>
              ))}
            </View>
            {([
              ['Salaire brut', 'Contrat', 'Configurable', 'Employeur'],
              ['CNPS (part salariale)', 'Salaire brut', '2,8%', 'Salarié'],
              ['CNPS (part patronale)', 'Salaire brut', '4,2% – 7%', 'Employeur'],
              ['IRPP', 'Net imposable', 'Barème progressif', 'Salarié'],
              ['CAC (CRTV)', 'Salaire brut', '1%', 'Salarié'],
            ] as [string, string, string, string][]).map(([e, b, t, c], i) => (
              <View key={e} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={S.tableCellBold}>{e}</Text>
                <Text style={S.tableCell}>{b}</Text>
                <Text style={S.tableCellGreen}>{t}</Text>
                <Text style={S.tableCell}>{c}</Text>
              </View>
            ))}
          </View>
          <View style={S.featureList}>
            <Feat text="Bulletin de paie PDF aux normes légales (nom employeur, NIU, CNPS)" />
            <Feat text="Virement en masse via Mobile Money (MTN MoMo, Orange Money)" />
            <Feat text="Génération automatique des fichiers CNPS (DSF mensuelle)" />
            <Feat text="Récapitulatif paie annuel (état 301)" />
          </View>

          <Text style={S.h2}>5.3 Congés & Absences</Text>
          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>Gestion des congés</Text>
              <View style={S.featureList}>
                <Feat text="Demande en ligne avec validation manager" />
                <Feat text="Calendrier des congés de l'équipe" />
                <Feat text="Solde de congés en temps réel (acquis − pris)" />
                <Feat text="Types : congé annuel, maladie, maternité, sans solde" />
                <Feat text="Chevauchement détecté et alerté automatiquement" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>Planning & Présence</Text>
              <View style={S.featureList}>
                <Feat text="Planning mensuel par département/agence" />
                <Feat text="Pointage via QR code (Athenis Go mobile)" />
                <Feat text="Heures supplémentaires calculées automatiquement" />
                <Feat text="Rapport de présence mensuel exportable" />
              </View>
            </View>
          </View>
          <DevNote text="Workflow approbation congés : Employee → Manager (notification push) → RH. Chaque étape envoie un email + push mobile. Refus déclenche une notification avec motif obligatoire." />
        </View>
        <PageFooter />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 6 — JURIDIQUE
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="06 · Juridique & Conformité" />
        <View style={S.body}>
          <Banner num="06" title="Module Juridique & Conformité" tag="juridique" color={C.purple} />

          <Text style={S.h2}>6.1 Contrats d'entreprise</Text>
          <Text style={S.p}>
            Gestion du cycle de vie complet des contrats commerciaux, partenariats, baux,
            contrats de prestations. Alertes automatiques sur échéances et renouvellements.
          </Text>
          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>Fonctionnalités clés</Text>
              <View style={S.featureList}>
                <Feat text="Bibliothèque de templates (NDA, prestation, bail commercial)" color="purple" />
                <Feat text="Éditeur de contrat avec variables dynamiques" color="purple" />
                <Feat text="Signature électronique (Docusign-like intégré)" color="purple" />
                <Feat text="Statuts : Brouillon → En négociation → Signé → Expiré" color="purple" />
                <Feat text="Alertes : 90j, 30j, 7j avant expiration" color="purple" />
                <Feat text="Historique des versions avec diff" color="purple" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>Dashboard alertes</Text>
              <View style={S.featureList}>
                <Feat text="Contrats expirant dans les 30 jours (widget)" color="purple" />
                <Feat text="Contrats à renouveler (flagués)" color="purple" />
                <Feat text="Litiges en cours avec statut" color="purple" />
                <Feat text="Obligations réglementaires en retard" color="purple" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>6.2 Conformité réglementaire</Text>
          <View style={S.featureList}>
            <Feat text="Checklist OHADA par type d'entreprise (SA, SARL, SAS, GIE)" color="purple" />
            <Feat text="Rappels AG annuelle (assemblée générale)" color="purple" />
            <Feat text="Suivi des déclarations obligatoires (RCCM, NIU, patente)" color="purple" />
            <Feat text="Alerte renouvellement documents (carte patronale, licence)" color="purple" />
          </View>

          <Text style={S.h2}>6.3 Protection des données (RGPD/APDP)</Text>
          <View style={S.row2}>
            <View style={[S.col, S.cardPurple]}>
              <Text style={S.cardTitlePurple}>Registre des traitements</Text>
              <View style={S.featureList}>
                <Feat text="Inventaire des traitements de données personnelles" color="purple" />
                <Feat text="Finalité, durée de conservation, base légale" color="purple" />
                <Feat text="Export registre PDF pour audit APDP/CNIL" color="purple" />
              </View>
            </View>
            <View style={[S.col, S.card]}>
              <Text style={S.cardTitle}>Droits des personnes</Text>
              <View style={S.featureList}>
                <Feat text="Formulaire de demande d'accès/rectification" />
                <Feat text="Suivi des demandes avec délai légal 30 jours" />
                <Feat text="Anonymisation sur demande d'effacement" />
              </View>
            </View>
          </View>
          <DevNote text="Module juridique orienté PME africaines. Les templates OHADA couvrent SARL, SA, SAS. La signature électronique utilise un hash SHA-256 du document + timestamp serveur stocké en base. Pas de PKI externe requis pour le MVP." />
        </View>
        <PageFooter />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 7 — ESG
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="07 · ESG & RSE" />
        <View style={S.body}>
          <Banner num="07" title="Module ESG & RSE" tag="esg" color={C.teal} />

          <Text style={S.h2}>7.1 Positionnement ESG Afrique</Text>
          <Text style={S.p}>
            Premier module ESG adapté aux PME africaines. Compatible CSRD européen (pour les filiales)
            et GRI Standards allégé. Collecte des données environnementales, sociales et de gouvernance
            avec scoring automatique et rapport annuel exportable.
          </Text>

          <Text style={S.h2}>7.2 Piliers ESG</Text>
          <View style={S.row3}>
            {([
              ['Environnement', 'Consommation énergie (kWh, litres carburant)\nÉmissions CO₂ (scopes 1, 2, 3)\nDéchets générés/recyclés\nEmpreinte eau'],
              ['Social', 'Diversité & inclusion (genre, âge)\nFormation (heures/employé)\nAccidents du travail (taux FR)\nSalaire médian vs minimum légal'],
              ['Gouvernance', 'Indépendance du CA\nPolitique anticorruption\nAudit externe\nConformité réglementaire %'],
            ] as [string, string][]).map(([t, d]) => (
              <View key={t} style={[S.col, S.cardTeal]}>
                <Text style={S.cardTitleTeal}>{t}</Text>
                <Text style={S.p}>{d}</Text>
              </View>
            ))}
          </View>

          <Text style={S.h2}>7.3 Reporting & Benchmarking</Text>
          <View style={S.featureList}>
            <Feat text="Score ESG global (0–100) avec décomposition par pilier" />
            <Feat text="Benchmark sectoriel anonymisé (médiane des entreprises du même secteur)" />
            <Feat text="Rapport DPEF (Déclaration de Performance Extra-financière) exportable PDF" />
            <Feat text="Rapport CSRD simplifié pour filiales européennes" />
            <Feat text="Plan d'action : objectifs SMART avec suivi des indicateurs" />
            <Feat text="Historique annuel avec courbes d'évolution" />
          </View>
          <Innov text="Benchmark sectoriel anonymisé : en s'appuyant sur l'agrégation anonyme des données de toutes les entreprises Athenis du même secteur (SYSCOHADA), chaque PME peut se situer et se fixer des objectifs réalistes. Fonctionnalité unique sur le marché africain." />

          <Text style={S.h2}>7.4 Plan d'action & objectifs</Text>
          <Text style={S.p}>
            Chaque indicateur ESG peut recevoir un objectif chiffré avec date cible.
            Le module suit l'avancement et génère des alertes en cas de retard.
            Les actions correctrices sont documentées et traçables pour les audits.
          </Text>
          <DevNote text="Table EsgIndicator avec fields: pillar (E|S|G), name, unit, currentValue, targetValue, targetDate, history[{date, value}]. Score calculé côté serveur par une formule pondérée configurable par référentiel (CSRD, GRI, AURG)." />
        </View>
        <PageFooter />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 8 — FISCALITÉ
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="08 · Fiscalité OHADA" />
        <View style={S.body}>
          <Banner num="08" title="Module Fiscalité OHADA" tag="fiscal" color={C.orange} />

          <Text style={S.h2}>8.1 Vue d'ensemble</Text>
          <Text style={S.p}>
            Module de déclaration fiscale pré-rempli depuis la comptabilité. Couvre TVA,
            IS (Impôt sur les Sociétés), IGS (Impôt Global Synthétique), DSF (Déclaration Statistique
            et Fiscale) avec export aux formats acceptés par les administrations fiscales africaines.
          </Text>

          <Text style={S.h2}>8.2 Déclarations supportées</Text>
          <View style={S.row2}>
            <View style={S.col}>
              {([
                ['TVA mensuelle', 'Collectée − déductible = à payer. Déclaration M+10.'],
                ['IS annuel', 'Résultat fiscal × taux (33% Cameroun). Acomptes trimestriels.'],
                ['IGS', 'Régime simplifié pour TPE/artisans. Basé sur chiffre d\'affaires.'],
                ['DSF', 'Déclaration annuelle combinant IS + états financiers SYSCOHADA.'],
              ] as [string, string][]).map(([t, d]) => (
                <View key={t} style={S.card}>
                  <Text style={S.cardTitle}>{t}</Text>
                  <Text style={S.p}>{d}</Text>
                </View>
              ))}
            </View>
            <View style={S.col}>
              <Text style={S.h3}>TaxGPT OHADA</Text>
              <Innov text="TaxGPT est un assistant IA spécialisé en fiscalité africaine (OHADA). Il répond aux questions en langage naturel : 'Suis-je soumis à la TVA?', 'Comment calculer mon IRPP?', 'Quelle est la date limite pour ma DSF?'. Formé sur le CGI camerounais, ivoirien et sénégalais." />
              <View style={S.featureList}>
                <Feat text="Chatbot intégré dans le module fiscal" color="purple" />
                <Feat text="Réponses sourcées avec article du CGI" color="purple" />
                <Feat text="Alertes calendrier fiscal personnalisé" color="purple" />
                <Feat text="Simulation de scénarios fiscaux" color="purple" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>8.3 Calendrier fiscal automatique</Text>
          <Text style={S.p}>
            Calendrier personnalisé selon le régime fiscal et le pays. Rappels automatiques
            30 jours, 7 jours et la veille de chaque échéance fiscale. Historique des déclarations
            avec preuve de dépôt.
          </Text>
          <DevNote text="La date limite de chaque déclaration est calculée dynamiquement selon le pays, le régime (RNI/RIS/IGS) et la période. Table FiscalCalendar alimentée par admin. Alertes via cron BullMQ + email + push mobile." />

          <Text style={S.h2}>8.4 e-Facturation DGI (innovation)</Text>
          <Innov text="e-Invoice DGI : connexion directe à l'API de la DGI (Direction Générale des Impôts) pour la certification électronique des factures. Chaque facture reçoit un QR code certifié qui peut être scanné par les agents DGI pour vérification. Prépare les entreprises à la facturation électronique obligatoire." />
          <View style={S.featureList}>
            <Feat text="Signature des factures avec certificat numérique DGI" color="purple" />
            <Feat text="QR code sur chaque facture (encode: NIU vendeur, montant, date, hash)" color="purple" />
            <Feat text="Journal de certification exportable pour audit" color="purple" />
            <Feat text="Mode dégradé offline avec synchronisation différée" color="purple" />
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 9 — CABINET COMPTABLE
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="09 · Cabinet Comptable" />
        <View style={S.body}>
          <Banner num="09" title="Module Cabinet Comptable" tag="cabinet" color={C.greenDark} />

          <Text style={S.h2}>9.1 Espace cabinet multi-clients</Text>
          <Text style={S.p}>
            Le cabinet dispose d'un espace distinct avec vue consolidée de tous ses clients.
            Il peut accéder aux données de chaque entreprise cliente via invitation sécurisée,
            gérer sa propre facturation, et collaborer avec ses clients sur la révision comptable.
          </Text>

          <Text style={S.h2}>9.2 Gestion des clients cabinet</Text>
          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>Dashboard clients</Text>
              <View style={S.featureList}>
                <Feat text="Liste clients avec indicateurs clés (CA, plan, statut révision)" />
                <Feat text="Alertes : révisions en retard, déclarations à venir" />
                <Feat text="Filtres par secteur, pays, taille d'entreprise" />
                <Feat text="Accès direct au dossier client en 1 clic (switch context)" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>Invitations & accès</Text>
              <View style={S.featureList}>
                <Feat text="Invitation client par email avec rôle (READONLY / FULL)" />
                <Feat text="Lien d'invitation sécurisé (token UUID, expiration 7 jours)" />
                <Feat text="Acceptation par le client depuis son espace" />
                <Feat text="Révocation d'accès en 1 clic" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>9.3 Multi-agences cabinet</Text>
          <Text style={S.p}>
            Un cabinet peut avoir plusieurs agences géographiques. Chaque collaborateur
            est rattaché à une ou plusieurs agences. L'accès aux dossiers clients peut
            être restreint par agence.
          </Text>
          <View style={S.featureList}>
            <Feat text="Création d'agences (ville, responsable, équipe)" />
            <Feat text="Affectation des clients par agence" />
            <Feat text="Collaborateurs : rôles ADMIN, COMPTABLE, READONLY" />
            <Feat text="Rapport de charge par collaborateur (nb clients, nb révisions)" />
          </View>
          <DevNote text="Relation UserAgency many-to-many avec champ isRestricted dans le JWT. Si isRestricted=true, le middleware filtre automatiquement les données par agenceIds[]. Les super-admins cabinet ont agenceIds=[] (accès tout)." />

          <Text style={S.h2}>9.4 Facturation cabinet</Text>
          <View style={S.featureList}>
            <Feat text="Honoraires mensuels par client configurables" />
            <Feat text="Génération automatique des factures clients en fin de mois" />
            <Feat text="Suivi des paiements et relances automatiques" />
            <Feat text="Rapport CA cabinet mensuel/annuel" />
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 10 — FINANCE PERSONNELLE
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="10 · Finance Personnelle" />
        <View style={S.body}>
          <Banner num="10" title="Finance Personnelle" tag="personal" color={C.teal} />

          <Text style={S.h2}>10.1 Vue d'ensemble</Text>
          <Text style={S.p}>
            Module destiné aux entrepreneurs individuels et particuliers. Suivi du budget personnel,
            gestion des comptes, objectifs d'épargne, revenus et dépenses. Interface simplifiée
            et mobile-first.
          </Text>

          <Text style={S.h2}>10.2 Dashboard personnel</Text>
          <View style={S.row2}>
            <View style={S.col}>
              <View style={S.featureList}>
                <Feat text="Solde total de tous les comptes" />
                <Feat text="Revenus du mois vs dépenses du mois" />
                <Feat text="Taux d'épargne mensuel (graphique gauge)" />
                <Feat text="Transactions récentes (5 dernières)" />
                <Feat text="Progression des objectifs d'épargne" />
              </View>
            </View>
            <View style={S.col}>
              <View style={S.featureList}>
                <Feat text="Répartition des dépenses par catégorie (camembert)" />
                <Feat text="Alerte dépassement de budget par catégorie" />
                <Feat text="Courbe de solde sur 12 mois" />
                <Feat text="Comparaison mois en cours vs mois précédent" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>10.3 Comptes & Transactions</Text>
          <View style={S.featureList}>
            <Feat text="Types de comptes : Espèces, Banque, Mobile Money, Épargne" />
            <Feat text="Ajout de transactions manuelles avec catégorie et note" />
            <Feat text="Import relevé bancaire CSV/OFX" />
            <Feat text="Catégories personnalisables avec icônes et couleurs" />
            <Feat text="Recherche et filtres avancés sur transactions" />
          </View>

          <Text style={S.h2}>10.4 Objectifs d'épargne</Text>
          <View style={S.featureList}>
            <Feat text="Création d'objectifs : Achat voiture, Fonds urgence, Vacances…" />
            <Feat text="Montant cible + date d'échéance + versements réguliers" />
            <Feat text="Barre de progression visuelle et % atteint" />
            <Feat text="Suggestion de versement mensuel pour atteindre l'objectif en temps" />
            <Feat text="Notification de félicitations à l'atteinte de l'objectif" />
          </View>
          <DevNote text="API GET /personal/dashboard retourne : { revenusMois, depensesMois, soldeTotalComptes, tauxEpargne, comptes[], objectifs[], transactionsRecentes[] }. Voir personal.service.ts getDashboard pour le mapping DB → DTO." />
        </View>
        <PageFooter />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 11 — IA & AUTOMATISATION
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="11 · IA & Automatisation" />
        <View style={S.body}>
          <Banner num="11" title="IA & Automatisation" tag="NOUVEAU" color={C.purple} />

          <Highlight text="Section nouvelle en v2.0 — Les 4 agents IA d'Athenis constituent le principal avantage concurrentiel face aux solutions concurrentes qui n'offrent pas de traitement IA natif adapté au contexte africain." />

          <Text style={S.h2}>11.1 AutoBook — Comptabilité automatique</Text>
          <Innov text="AutoBook est un agent IA qui analyse les relevés bancaires importés et génère automatiquement les écritures comptables SYSCOHADA correctes. Il apprend des corrections de l'utilisateur pour s'améliorer continuellement." />

          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>Fonctionnement</Text>
              <View style={S.featureList}>
                <Feat text="Import OFX / CSV relevé bancaire (toutes banques)" color="purple" />
                <Feat text="Analyse NLP de chaque libellé de transaction" color="purple" />
                <Feat text="Association automatique : compte OHADA + journal + tiers" color="purple" />
                <Feat text="Score de confiance affiché (ex: 94%)" color="purple" />
                <Feat text="Validation en lot : accepter tout / réviser les incertains" color="purple" />
                <Feat text="Apprentissage : chaque correction améliore le modèle" color="purple" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>UX Flow</Text>
              <View style={S.featureList}>
                <Feat text="1. Import fichier (drag & drop ou depuis banque liée)" color="purple" />
                <Feat text="2. AutoBook analyse (spinner 2–5 secondes)" color="purple" />
                <Feat text="3. Tableau des suggestions : libellé → compte proposé" color="purple" />
                <Feat text="4. Utilisateur valide / modifie ligne par ligne" color="purple" />
                <Feat text="5. Confirmation génère les écritures dans le journal" color="purple" />
              </View>
              <DevNote text="Utiliser GPT-4o-mini (coût ~0.0001$/transaction) avec un prompt system incluant le plan de comptes OHADA et l'historique des 100 dernières affectations de cette entreprise." />
            </View>
          </View>

          <Text style={S.h2}>11.2 ScanAI — OCR factures</Text>
          <Innov text="ScanAI extrait automatiquement les données des factures photographiées : vendeur, date, montant HT/TVA/TTC, numéro de facture. Compatible avec les factures handwritten fréquentes en Afrique." />

          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>Données extraites</Text>
              <View style={S.featureList}>
                <Feat text="Nom et NIU du fournisseur" color="purple" />
                <Feat text="Date de facture et numéro" color="purple" />
                <Feat text="Lignes de détail (article, quantité, PU, montant)" color="purple" />
                <Feat text="TVA collectée et taux" color="purple" />
                <Feat text="Total TTC" color="purple" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>Intégration</Text>
              <View style={S.featureList}>
                <Feat text="Disponible sur mobile (Athenis Go) et web" color="purple" />
                <Feat text="Pré-remplit le formulaire facture achat" color="purple" />
                <Feat text="Taux de succès : ~85% factures imprimées, ~65% manuscrites" color="purple" />
                <Feat text="Toujours modifiable avant validation" color="purple" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>11.3 CashFlow Intelligence</Text>
          <View style={S.featureList}>
            <Feat text="Prévision de trésorerie 30/60/90 jours basée sur l'historique" color="purple" />
            <Feat text="Détection des creux de trésorerie à venir avec alerte préventive" color="purple" />
            <Feat text="Recommandations actionnables : relancer facture X, décaler paiement Y" color="purple" />
            <Feat text="Modèle : régression sur saisonnalité + tendance + récurrences connues" color="purple" />
          </View>

          <Text style={S.h2}>11.4 Athenis AI Widget</Text>
          <Text style={S.p}>
            Assistant IA contextuel accessible depuis n'importe quelle page. Répondaux
            questions en langage naturel sur les données de l'entreprise et la plateforme.
          </Text>
          <View style={S.featureList}>
            <Feat text="'Quel est mon chiffre d'affaires ce mois?' → réponse avec données réelles" color="purple" />
            <Feat text="'Génère-moi une facture pour Dupont SA pour 500 000 XAF de prestation'" color="purple" />
            <Feat text="'Quelles sont mes charges les plus importantes ce trimestre?'" color="purple" />
            <Feat text="'Rappelle-moi les dates de déclaration TVA pour ce mois'" color="purple" />
          </View>
          <DevNote text="Widget global en position fixe (bottom-right). Context = page courante + dernières données API chargées. Utiliser streaming (SSE) pour afficher la réponse mot par mot. Limite 50 messages/jour en FREE, illimité PREMIUM." />
        </View>
        <PageFooter />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 12 — INTÉGRATIONS AFRICAINES
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="12 · Intégrations Africaines" />
        <View style={S.body}>
          <Banner num="12" title="Intégrations Africaines" tag="NOUVEAU" color={C.teal} />

          <Highlight text="Différentiateur clé v2.0 : les solutions concurrentes (Sage, QuickBooks, Xero) n'ont aucune intégration native Mobile Money. Athenis est la première plateforme africaine à unifier Orange Money, MTN MoMo, Wave et Moov dans un hub unique." />

          <Text style={S.h2}>12.1 MoMo Hub — Mobile Money unifié</Text>
          <Innov text="MoMo Hub agrège toutes les APIs Mobile Money africaines dans une interface unique. L'entreprise encaisse via Orange, MTN, Wave ou Moov sans changer d'outil. Les transactions sont automatiquement réconciliées en comptabilité." />

          <View style={S.row2}>
            <View style={[S.col, S.cardTeal]}>
              <Text style={S.cardTitleTeal}>Opérateurs supportés</Text>
              <View style={S.featureList}>
                <Feat text="Orange Money (Cameroun, Côte d'Ivoire, Sénégal, Mali)" />
                <Feat text="MTN Mobile Money (Cameroun, Ghana, Uganda, Rwanda)" />
                <Feat text="Wave (Sénégal, Côte d'Ivoire, Burkina Faso)" />
                <Feat text="Moov Money (Cameroun, Togo, Bénin)" />
                <Feat text="Airtel Money (Zambie, Malawi, Madagascar)" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>Fonctionnalités MoMo Hub</Text>
              <View style={S.featureList}>
                <Feat text="Encaissement : génération lien de paiement QR par facture" color="blue" />
                <Feat text="Paiement fournisseurs : virement direct depuis la plateforme" color="blue" />
                <Feat text="Paie Mobile Money : virement de salaires en masse" color="blue" />
                <Feat text="Réconciliation auto : chaque transaction importée = écriture comptable" color="blue" />
                <Feat text="Dashboard MoMo : solde par opérateur, historique, alertes" color="blue" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>12.2 UX Flow — Encaissement Mobile Money</Text>
          <View style={S.table}>
            <View style={S.tableHead}>
              {['Étape', 'Action utilisateur', 'Action système'].map(h => (
                <Text key={h} style={S.tableHeadCell}>{h}</Text>
              ))}
            </View>
            {([
              ['1', 'Clic "Recevoir paiement" sur une facture', 'Génère un lien de paiement unique'],
              ['2', 'Choisit l\'opérateur (Orange/MTN/Wave)', 'Appel API opérateur, crée la transaction'],
              ['3', 'Partage QR code au client (WhatsApp/print)', 'QR encode le lien de paiement'],
              ['4', 'Client paie sur son téléphone', 'Webhook opérateur → confirmation'],
              ['5', 'Notification temps réel dans Athenis', 'Facture → PAYÉE + écriture compta auto'],
            ] as [string, string, string][]).map(([e, a, s], i) => (
              <View key={e} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={S.tableCellBold}>{e}</Text>
                <Text style={S.tableCell}>{a}</Text>
                <Text style={S.tableCell}>{s}</Text>
              </View>
            ))}
          </View>

          <Text style={S.h2}>12.3 WhatsApp Business</Text>
          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>Envoi de documents</Text>
              <View style={S.featureList}>
                <Feat text="Factures, devis, BL envoyés en PDF via WhatsApp" color="blue" />
                <Feat text="Lien de paiement MoMo inclus dans le message" color="blue" />
                <Feat text="Accusé de lecture tracé dans Athenis" color="blue" />
                <Feat text="Template de message personnalisable (en français, anglais, arabe)" color="blue" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>Chatbot client automatique</Text>
              <View style={S.featureList}>
                <Feat text="Réponse automatique au '1' : 'Statut de ma commande'" color="blue" />
                <Feat text="Envoi automatique de rappel de paiement J+7" color="blue" />
                <Feat text="Confirmation de réception de paiement automatisée" color="blue" />
              </View>
            </View>
          </View>
          <DevNote text="WhatsApp Business API via Meta (anciennement Twilio). Nécessite un compte WhatsApp Business vérifié. Les templates de messages doivent être pré-approuvés par Meta. Coût ~0.05 USD/conversation (24h window)." />

          <Text style={S.h2}>12.4 Banques africaines — Open Banking</Text>
          <View style={S.featureList}>
            <Feat text="Import de relevés : Afriland First Bank, SCB Cameroun, UBA, Ecobank" />
            <Feat text="Connexion directe (quand API disponible) pour import auto" />
            <Feat text="Import CSV universel avec mapping de colonnes configurable" />
            <Feat text="Détection des doublons à l'import" />
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 13 — APPLICATION MOBILE ATHENIS GO
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="13 · Athenis Go (Mobile)" />
        <View style={S.body}>
          <Banner num="13" title="Application Mobile Athenis Go" tag="NOUVEAU" color={C.purple} />

          <Text style={S.h2}>13.1 Vision & Positionnement</Text>
          <Text style={S.p}>
            Athenis Go est l'application mobile native (iOS + Android) d'Athenis. Elle est conçue
            pour les dirigeants et commerciaux en déplacement. Accès complet aux données,
            saisie rapide, approbations et notifications. Mode offline-first pour les zones
            à faible connectivité.
          </Text>

          <Text style={S.h2}>13.2 Fonctionnalités mobiles clés</Text>
          <View style={S.row2}>
            <View style={[S.col, S.cardPurple]}>
              <Text style={S.cardTitlePurple}>Gestion terrain</Text>
              <View style={S.featureList}>
                <Feat text="Création de facture / devis en quelques secondes" color="purple" />
                <Feat text="ScanAI : photo facture → données extraites" color="purple" />
                <Feat text="Encaissement MoMo direct (QR code ou lien)" color="purple" />
                <Feat text="Signature électronique client sur l'écran" color="purple" />
                <Feat text="Catalogue articles avec recherche vocale" color="purple" />
              </View>
            </View>
            <View style={[S.col, S.card]}>
              <Text style={S.cardTitle}>Approbations & Alertes</Text>
              <View style={S.featureList}>
                <Feat text="Push notifications pour chaque événement clé" />
                <Feat text="Approbation de congés en 1 swipe" />
                <Feat text="Validation de factures en attente" />
                <Feat text="Alertes fiscales urgentes" />
                <Feat text="Dashboard résumé avec KPIs critiques" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>13.3 Pointage & RH mobile</Text>
          <View style={S.featureList}>
            <Feat text="Pointage par QR code : l'employé scanne le QR affiché en entreprise" color="purple" />
            <Feat text="Géolocalisation optionnelle pour télétravail" color="purple" />
            <Feat text="Consultation planning et congés" color="purple" />
            <Feat text="Demande de congé avec justificatif photo" color="purple" />
            <Feat text="Fiche de paie consultable et téléchargeable" color="purple" />
          </View>

          <Text style={S.h2}>13.4 Architecture technique mobile</Text>
          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>Stack</Text>
              <View style={S.featureList}>
                <Feat text="React Native 0.74 + Expo SDK 51" color="blue" />
                <Feat text="TypeScript strict mode" color="blue" />
                <Feat text="Expo Router v3 (navigation fichier)" color="blue" />
                <Feat text="TanStack Query (cache + sync offline)" color="blue" />
                <Feat text="Zustand (state management local)" color="blue" />
                <Feat text="MMKV (storage ultra-rapide)" color="blue" />
                <Feat text="Vision Camera + MLKit (OCR)" color="blue" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>Offline-first</Text>
              <View style={S.featureList}>
                <Feat text="Toutes les lectures cachées localement (TTL 5min)" color="blue" />
                <Feat text="Mutations en file d'attente si offline" color="blue" />
                <Feat text="Sync auto au retour réseau (avec retry expo)" color="blue" />
                <Feat text="Badge de statut connexion visible" color="blue" />
              </View>
              <DevNote text="Pattern : useNetInfo() pour détecter offline. Mutations dans une queue persistante MMKV. Au retour en ligne, flush séquentiel avec gestion des conflits." />
            </View>
          </View>

          <Text style={S.h2}>13.5 Sécurité mobile</Text>
          <View style={S.featureList}>
            <Feat text="Biométrie (Face ID / Touch ID) pour déverrouillage" color="blue" />
            <Feat text="PIN de secours chiffré (AES-256)" color="blue" />
            <Feat text="Session auto-expirée après 30 min d'inactivité" color="blue" />
            <Feat text="Chiffrement AES-256 du stockage local MMKV" color="blue" />
            <Feat text="Certificate pinning pour l'API Athenis" color="blue" />
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 14 — AUTH, RBAC & PARAMÈTRES
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="14 · Auth, RBAC & Paramètres" />
        <View style={S.body}>
          <Banner num="14" title="Auth, RBAC & Paramètres" tag="transversal" />

          <Text style={S.h2}>14.1 Inscription multi-type</Text>
          <View style={S.row3}>
            {([
              ['PERSONAL', 'Entrepreneur / particulier\nEmail + mot de passe\nPas de société requise'],
              ['COMPANY', 'PME / TPE\nNom société, NIU/SIREN optionnel\nSélection plan tarifaire'],
              ['CABINET', 'Cabinet comptable\nNom cabinet, SIRET optionnel\nAccès multi-clients'],
            ] as [string, string][]).map(([t, d]) => (
              <View key={t} style={[S.col, S.card]}>
                <Text style={S.cardTitle}>{t}</Text>
                <Text style={S.p}>{d}</Text>
              </View>
            ))}
          </View>

          <Text style={S.h2}>14.2 Authentification & Sécurité</Text>
          <View style={S.featureList}>
            <Feat text="JWT access token (15 min) + Refresh token HttpOnly cookie (7 jours)" />
            <Feat text="TOTP 2FA (Google Authenticator / Authy) activable par l'utilisateur" />
            <Feat text="Codes de récupération 2FA (10 codes single-use)" />
            <Feat text="Vérification email obligatoire avant accès complet" />
            <Feat text="Rotation automatique des refresh tokens (rolling)" />
            <Feat text="Invalidation de session depuis la liste des appareils actifs" />
          </View>
          <DevNote text="Flow login : POST /auth/login → si 2FA activé, retourne { requiresTotp: true, tempToken }. Le client redirige vers /auth/totp avec le tempToken. POST /auth/totp/verify → retourne accessToken + set-cookie refreshToken." />

          <Text style={S.h2}>14.3 RBAC — Rôles et permissions</Text>
          <View style={S.table}>
            <View style={S.tableHead}>
              {['Rôle', 'Scope', 'Accès'].map(h => (
                <Text key={h} style={S.tableHeadCell}>{h}</Text>
              ))}
            </View>
            {([
              ['SUPER_ADMIN', 'Plateforme', 'Tous les comptes, métriques SaaS, gestion plans'],
              ['ADMIN', 'Entreprise/Cabinet', 'Tous les modules, paramètres, gestion utilisateurs'],
              ['MANAGER', 'Entreprise', 'Lecture + écriture sur son département, approbations'],
              ['EMPLOYEE', 'Entreprise', 'Lecture de ses propres données, demandes congés'],
              ['COMPTABLE', 'Cabinet', 'Accès révision + comptabilité clients assignés'],
              ['READONLY', 'Cabinet', 'Lecture seule sur clients assignés'],
            ] as [string, string, string][]).map(([r, s, a], i) => (
              <View key={r} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={S.tableCellBold}>{r}</Text>
                <Text style={S.tableCell}>{s}</Text>
                <Text style={S.tableCell}>{a}</Text>
              </View>
            ))}
          </View>

          <Text style={S.h2}>14.4 Paramètres entreprise</Text>
          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>Localisation & Fiscal</Text>
              <View style={S.featureList}>
                <Feat text="Pays (détermine TVA, paie, fiscal)" />
                <Feat text="Devise et symbole (XAF, EUR, USD, GHS…)" />
                <Feat text="Numéro de TVA, NIU/SIREN affiché sur factures" />
                <Feat text="Exercice fiscal (janvier-décembre ou juillet-juin)" />
                <Feat text="Référentiel comptable (SYSCOHADA, OHADA, IFRS)" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>Personnalisation</Text>
              <View style={S.featureList}>
                <Feat text="Logo entreprise sur factures et documents" />
                <Feat text="Couleur principale de marque sur les PDFs" />
                <Feat text="Mentions légales personnalisées (pied de facture)" />
                <Feat text="Numérotation des pièces (préfixe configurable)" />
                <Feat text="Politique de sécurité (2FA obligatoire, durée session)" />
              </View>
            </View>
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 15 — SÉCURITÉ & CONFORMITÉ
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="15 · Sécurité & Conformité" />
        <View style={S.body}>
          <Banner num="15" title="Sécurité & Conformité" tag="securite" color={C.greenDark} />

          <Text style={S.h2}>15.1 Mesures de sécurité backend</Text>
          <View style={S.row2}>
            <View style={S.col}>
              <View style={S.featureList}>
                <Feat text="Bcrypt (cost 12) pour hachage des mots de passe" />
                <Feat text="Helmet.js : sécurisation des headers HTTP" />
                <Feat text="CORS strict : origines whitelist configurables" />
                <Feat text="Rate limiting : 100 req/15min par IP" />
                <Feat text="Input validation Zod sur tous les endpoints" />
                <Feat text="Paramétrage Prisma (requêtes préparées, pas d'injection SQL)" />
              </View>
            </View>
            <View style={S.col}>
              <View style={S.featureList}>
                <Feat text="HTTPS TLS 1.3 obligatoire en production" />
                <Feat text="CSP (Content Security Policy) stricte" />
                <Feat text="Logs d'audit sur actions sensibles (connexions, suppressions)" />
                <Feat text="Sentry error monitoring avec scrubbing PII" />
                <Feat text="Pas de secrets dans les JWT (platformRole vérifié en DB)" />
                <Feat text="Refresh token rotation avec invalidation de famille" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>15.2 Isolation multi-tenant</Text>
          <Text style={S.p}>
            Architecture multi-tenant par discriminant (shared database, separate schemas logically).
            Chaque requête est automatiquement filtrée par companyId/cabinetId/userId grâce
            aux middlewares authenticate et à des helpers Prisma centralisés.
          </Text>
          <Highlight text="Règle absolue : aucun endpoint ne doit retourner des données appartenant à un tenant différent de celui authentifié. Les tests de régression doivent inclure des scénarios cross-tenant explicites (IDOR tests)." />

          <Text style={S.h2}>15.3 Conformité réglementaire</Text>
          <View style={S.row2}>
            <View style={[S.col, S.card]}>
              <Text style={S.cardTitle}>RGPD / APDP (Afrique)</Text>
              <View style={S.featureList}>
                <Feat text="Consentement explicite à l'inscription" />
                <Feat text="Droit à l'effacement (anonymisation)" />
                <Feat text="Export de données utilisateur (DSAR)" />
                <Feat text="Registre des traitements dans le module Juridique" />
                <Feat text="DPA (Data Processing Agreement) disponible" />
              </View>
            </View>
            <View style={[S.col, S.card]}>
              <Text style={S.cardTitle}>Données financières</Text>
              <View style={S.featureList}>
                <Feat text="Aucune donnée bancaire stockée (PCI-DSS N/A)" />
                <Feat text="Données Mobile Money : tokens opérateurs (pas de mots de passe)" />
                <Feat text="Chiffrement AES-256 en base pour les champs sensibles" />
                <Feat text="Sauvegarde chiffrée quotidienne (backup + restore testé)" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>15.4 Audit & Traçabilité</Text>
          <View style={S.featureList}>
            <Feat text="Table AuditLog : chaque mutation (create/update/delete) est tracée avec userId, timestamp, avant/après" />
            <Feat text="Période de rétention des logs : 7 ans (obligation légale comptable)" />
            <Feat text="Journal d'accès cabinet : chaque consultation d'un dossier client est enregistrée" />
            <Feat text="Impossible de supprimer une écriture comptable validée (soft delete uniquement)" />
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 16 — ROADMAP 18 MOIS
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="16 · Roadmap 18 Mois" />
        <View style={S.body}>
          <Banner num="16" title="Roadmap Implémentation 18 Mois" tag="Planning" color={C.orange} />

          <Text style={S.h2}>16.1 Vue d'ensemble par phase</Text>

          <View style={S.table}>
            <View style={S.tableHead}>
              {['Phase', 'Période', 'Priorité', 'Livrable clé'].map(h => (
                <Text key={h} style={S.tableHeadCell}>{h}</Text>
              ))}
            </View>
            {([
              ['Phase 1 — Fondations', 'M1–M3', '🔴 CRITIQUE', 'Auth robuste, Gestion, Compta SYSCOHADA, Fiscal'],
              ['Phase 2 — RH & Paie', 'M3–M5', '🔴 CRITIQUE', 'Paie OHADA, Congés, Bulletin PDF, CNPS'],
              ['Phase 3 — IA Core', 'M5–M7', '🟠 HAUTE', 'AutoBook, ScanAI, TaxGPT, CashFlow Intel.'],
              ['Phase 4 — MoMo Hub', 'M6–M8', '🟠 HAUTE', 'Orange Money, MTN MoMo, Wave intégrés'],
              ['Phase 5 — Athenis Go', 'M8–M11', '🟠 HAUTE', 'App iOS + Android (React Native Expo)'],
              ['Phase 6 — Cabinet v2', 'M9–M11', '🟡 MOYENNE', 'Multi-agences, révision collaborative'],
              ['Phase 7 — WhatsApp', 'M11–M13', '🟡 MOYENNE', 'WhatsApp Business API + chatbot'],
              ['Phase 8 — e-Invoice DGI', 'M12–M14', '🟡 MOYENNE', 'Certif. DGI, QR code fiscal'],
              ['Phase 9 — Expansion', 'M14–M18', '🟢 FUTURE', 'CI, SN, GH (nouvelles juridictions)'],
            ] as [string, string, string, string][]).map(([p, d, pr, l], i) => (
              <View key={p} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={S.tableCellBold}>{p}</Text>
                <Text style={S.tableCell}>{d}</Text>
                <Text style={S.tableCell}>{pr}</Text>
                <Text style={S.tableCell}>{l}</Text>
              </View>
            ))}
          </View>

          <Text style={S.h2}>16.2 Phase 1 — Fondations (M1–M3)</Text>
          <View style={S.row2}>
            <View style={S.col}>
              <View style={S.featureList}>
                <Feat text="Inscription multi-type (PERSONAL, COMPANY, CABINET)" />
                <Feat text="2FA TOTP + vérification email" />
                <Feat text="Module Gestion : factures, devis, clients, fournisseurs" />
                <Feat text="Stocks & inventaire" />
                <Feat text="Comptabilité SYSCOHADA complète" />
              </View>
            </View>
            <View style={S.col}>
              <View style={S.featureList}>
                <Feat text="États financiers (Bilan, Résultat, Balance, Grand-livre)" />
                <Feat text="Module Fiscal (TVA, IS, DSF, calendrier)" />
                <Feat text="Module ESG basique" />
                <Feat text="Module Juridique (contrats, alertes)" />
                <Feat text="Paramètres localisation + logo" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>16.3 Phase 3 — IA Core (M5–M7)</Text>
          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>AutoBook</Text>
              <View style={S.featureList}>
                <Feat text="Import OFX/CSV relevé banque" color="purple" />
                <Feat text="Classification GPT-4o-mini + OHADA" color="purple" />
                <Feat text="Validation en lot par l'utilisateur" color="purple" />
                <Feat text="Feedback loop pour amélioration modèle" color="purple" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>ScanAI + TaxGPT</Text>
              <View style={S.featureList}>
                <Feat text="OCR via Google Vision ou Mistral Vision" color="purple" />
                <Feat text="Extraction structurée des données factures" color="purple" />
                <Feat text="TaxGPT : fine-tuned sur CGI OHADA" color="purple" />
                <Feat text="Widget AI global avec streaming SSE" color="purple" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>16.4 KPIs de succès</Text>
          <View style={S.row3}>
            {([
              ['Adoption MoMo', '60% des paiements reçus via MoMo Hub à M12'],
              ['AutoBook', '85% des écritures auto-générées sans correction à M9'],
              ['Athenis Go', '70% des utilisateurs actifs sur mobile à M14'],
              ['NPS', 'Score ≥ 50 (promoteurs − détracteurs) à M12'],
              ['Rétention', '< 5% churn mensuel STARTER/PRO à M18'],
            ] as [string, string][]).map(([k, v]) => (
              <View key={k} style={[S.col, S.cardGreen]}>
                <Text style={S.cardTitleGreen}>{k}</Text>
                <Text style={S.p}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
        <PageFooter />
      </Page>

    </Document>
  )
}
