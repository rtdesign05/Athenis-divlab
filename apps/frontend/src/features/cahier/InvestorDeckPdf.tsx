import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const BASE = 'http://localhost:5173/screenshots'
const S_URL = (name: string) => `${BASE}/${name}.jpg`

const C = {
  green:      '#1a6b3c', greenMid: '#2d8653', greenLight: '#e8f5ee', greenDark: '#0f4526',
  accent:     '#f59e0b', accentBg: '#fffbeb',
  blue:       '#1d4ed8', blueBg:   '#eff6ff',
  purple:     '#7c3aed', purpleBg: '#f5f3ff',
  teal:       '#0d9488', tealBg:   '#f0fdfa',
  orange:     '#ea580c', orangeBg: '#fff7ed',
  dark:       '#111827', gray:     '#374151',
  grayMid:    '#6b7280', grayLight:'#e5e7eb',
  grayXLight: '#f9fafb', white:    '#ffffff',
  border:     '#d1d5db',
}

const S = StyleSheet.create({
  // Pages
  page:        { fontFamily: 'Helvetica', backgroundColor: C.white, paddingBottom: 50 },
  coverPage:   { fontFamily: 'Helvetica', backgroundColor: C.greenDark },
  sectionIntro:{ fontFamily: 'Helvetica', backgroundColor: C.green },
  darkPage:    { fontFamily: 'Helvetica', backgroundColor: C.dark, paddingBottom: 50 },

  // Header/Footer
  hBar: { backgroundColor: C.green, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 8 },
  hTxt: { fontSize: 8, color: C.white, opacity: 0.85 },
  foot: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: C.grayLight, paddingHorizontal: 28, paddingVertical: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footTxt: { fontSize: 7, color: C.grayMid },

  // Body
  body:   { paddingHorizontal: 32, paddingTop: 16 },
  bodyNP: { paddingHorizontal: 0, paddingTop: 0 },

  // Cover
  coverInner:  { flex: 1, padding: 48, justifyContent: 'space-between' },
  coverTop:    { flex: 1, justifyContent: 'center' },
  coverEye:    { fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: 4, marginBottom: 14 },
  coverLogo:   { fontSize: 52, fontFamily: 'Helvetica-Bold', color: C.white, marginBottom: 4 },
  coverSub:    { fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 32 },
  coverTitle:  { fontSize: 28, fontFamily: 'Helvetica-Bold', color: C.white, lineHeight: 1.3, marginBottom: 10 },
  coverDesc:   { fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, maxWidth: 460 },
  coverBadge:  { marginTop: 24, alignSelf: 'flex-start', backgroundColor: C.accent, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 5 },
  coverBadgeTx:{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.dark },
  coverStats:  { flexDirection: 'row', gap: 12, marginTop: 36 },
  coverStat:   { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 12, alignItems: 'center' },
  coverStatN:  { fontSize: 24, fontFamily: 'Helvetica-Bold', color: C.white },
  coverStatL:  { fontSize: 7, color: 'rgba(255,255,255,0.5)', marginTop: 3, textAlign: 'center' },
  coverBottom: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 6, padding: 16, flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  coverMetaL:  { fontSize: 8, color: 'rgba(255,255,255,0.45)' },
  coverMetaV:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white, marginTop: 2 },

  // Section intro page
  siInner:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  siNum:       { fontSize: 64, fontFamily: 'Helvetica-Bold', color: 'rgba(255,255,255,0.1)', marginBottom: 4 },
  siTitle:     { fontSize: 32, fontFamily: 'Helvetica-Bold', color: C.white, textAlign: 'center', marginBottom: 12 },
  siDesc:      { fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 1.7, maxWidth: 400 },
  siBadge:     { marginTop: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, paddingHorizontal: 14, paddingVertical: 6 },
  siBadgeTx:   { fontSize: 9, color: C.white },

  // Typography
  h1:    { fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.green, marginBottom: 12 },
  h2:    { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.greenMid, marginTop: 14, marginBottom: 7 },
  h3:    { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.dark, marginTop: 8, marginBottom: 4 },
  p:     { fontSize: 9, color: C.gray, lineHeight: 1.65, marginBottom: 6 },
  pBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 4 },
  pWhite:{ fontSize: 9, color: C.white, lineHeight: 1.65, marginBottom: 6 },
  lead:  { fontSize: 11, color: C.gray, lineHeight: 1.7, marginBottom: 12 },

  // Screenshot
  screenshotFrame: { borderWidth: 1, borderColor: C.border, borderRadius: 6, overflow: 'hidden', marginBottom: 10, backgroundColor: C.grayXLight },
  screenshotImg:   { width: '100%' },
  screenshotCaption: { fontSize: 7.5, color: C.grayMid, textAlign: 'center', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: C.grayXLight, borderTopWidth: 1, borderTopColor: C.border },

  // Layouts
  row2:  { flexDirection: 'row', gap: 12, marginBottom: 10 },
  row3:  { flexDirection: 'row', gap: 8,  marginBottom: 10 },
  col:   { flex: 1 },
  col60: { flex: 3 },
  col40: { flex: 2 },

  // Cards
  card:      { border: 1, borderColor: C.border, borderRadius: 6, padding: 11, marginBottom: 9 },
  cardGreen: { border: 1, borderColor: '#a7f3d0', borderRadius: 6, padding: 11, backgroundColor: C.greenLight, marginBottom: 9 },
  cardBlue:  { border: 1, borderColor: '#bfdbfe', borderRadius: 6, padding: 11, backgroundColor: C.blueBg, marginBottom: 9 },
  cardAccent:{ border: 1, borderColor: '#fcd34d', borderRadius: 6, padding: 11, backgroundColor: C.accentBg, marginBottom: 9 },
  cardDark:  { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 6, padding: 11, marginBottom: 9 },
  cardTitleG:{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.green, marginBottom: 5 },
  cardTitleB:{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.blue, marginBottom: 5 },
  cardTitleW:{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.white, marginBottom: 5 },
  cardTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 5 },

  // Feature list
  fl:  { marginLeft: 4, marginBottom: 6 },
  fi:  { flexDirection: 'row', marginBottom: 3.5 },
  bul: { fontSize: 9, color: C.green, marginRight: 5, fontFamily: 'Helvetica-Bold' },
  bulW:{ fontSize: 9, color: C.accent, marginRight: 5, fontFamily: 'Helvetica-Bold' },
  ft:  { fontSize: 9, color: C.gray, flex: 1, lineHeight: 1.5 },
  ftW: { fontSize: 9, color: 'rgba(255,255,255,0.75)', flex: 1, lineHeight: 1.5 },

  // Chips
  chipRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  chip:      { backgroundColor: C.greenLight, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  chipTx:    { fontSize: 7.5, color: C.green, fontFamily: 'Helvetica-Bold' },
  chipBlue:  { backgroundColor: C.blueBg,   borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  chipBlueTx:{ fontSize: 7.5, color: C.blue, fontFamily: 'Helvetica-Bold' },
  chipAcc:   { backgroundColor: C.accentBg,  borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  chipAccTx: { fontSize: 7.5, color: C.orange, fontFamily: 'Helvetica-Bold' },

  // Table
  tHead:  { flexDirection: 'row', backgroundColor: C.green, borderRadius: 3, padding: 6 },
  tHCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.white, flex: 1 },
  tRow:   { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.grayXLight, padding: 5 },
  tRowA:  { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.grayXLight, padding: 5, backgroundColor: C.grayXLight },
  tCell:  { fontSize: 8, color: C.gray, flex: 1 },
  tCellB: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.dark, flex: 1 },
  tCellG: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.green, flex: 1 },

  // Highlight/note
  hl:    { backgroundColor: C.accentBg, borderLeftWidth: 3, borderLeftColor: C.accent, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 9, borderRadius: 2 },
  hlTx:  { fontSize: 8.5, color: '#92400e', lineHeight: 1.55 },
  note:  { backgroundColor: C.blueBg, borderLeftWidth: 3, borderLeftColor: C.blue, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 9, borderRadius: 2 },
  noteTx:{ fontSize: 8.5, color: '#1e40af', lineHeight: 1.55 },
  innov: { backgroundColor: '#fdf4ff', borderLeftWidth: 3, borderLeftColor: C.purple, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 9, borderRadius: 2 },
  innovLbl:{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.purple, marginBottom: 2 },
  innovTx: { fontSize: 8.5, color: '#5b21b6', lineHeight: 1.55 },

  // Divider
  div: { borderBottomWidth: 1, borderBottomColor: C.grayLight, marginVertical: 10 },

  // Metric big
  bigMetric:{ alignItems: 'center', paddingHorizontal: 10, paddingVertical: 14 },
  bigN:     { fontSize: 28, fontFamily: 'Helvetica-Bold', color: C.green },
  bigL:     { fontSize: 8, color: C.grayMid, marginTop: 3, textAlign: 'center' },

  // Status badges
  statusGreen:  { backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  statusGreenTx:{ fontSize: 7.5, color: C.green, fontFamily: 'Helvetica-Bold' },
  statusBlue:   { backgroundColor: C.blueBg, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  statusBlueTx: { fontSize: 7.5, color: C.blue, fontFamily: 'Helvetica-Bold' },
})

// ── Helpers ───────────────────────────────────────────────────────────────────
const Hdr = ({ title }: { title: string }) => (
  <View style={S.hBar} fixed>
    <Text style={S.hTxt}>Athenis · Investor Deck 2026 — Confidentiel</Text>
    <Text style={S.hTxt}>{title}</Text>
  </View>
)
const Ftr = () => (
  <View style={S.foot} fixed>
    <Text style={S.footTxt}>© 2026 Athenis SAS · Document confidentiel — ne pas diffuser</Text>
    <Text style={S.footTxt} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    <Text style={S.footTxt}>contact@athenis.io</Text>
  </View>
)
const F = ({ t, w }: { t: string; w?: boolean }) => (
  <View style={S.fi}>
    <Text style={w ? S.bulW : S.bul}>›</Text>
    <Text style={w ? S.ftW : S.ft}>{t}</Text>
  </View>
)
const Screen = ({ name, caption }: { name: string; caption: string }) => (
  <View style={S.screenshotFrame}>
    <Image src={S_URL(name)} style={S.screenshotImg} />
    <Text style={S.screenshotCaption}>↑ {caption}</Text>
  </View>
)
const SectionPage = ({ num, title, desc, badge }: { num: string; title: string; desc: string; badge?: string }) => (
  <Page size="A4" style={S.sectionIntro}>
    <View style={S.siInner}>
      <Text style={S.siNum}>{num}</Text>
      <Text style={S.siTitle}>{title}</Text>
      <Text style={S.siDesc}>{desc}</Text>
      {badge && <View style={S.siBadge}><Text style={S.siBadgeTx}>{badge}</Text></View>}
    </View>
  </Page>
)

// ── Document ──────────────────────────────────────────────────────────────────
export function InvestorDeckPdf() {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <Document title="Athenis — Investor Deck 2026" author="Athenis" creator="Athenis PDF Engine">

      {/* ══ COVER ══════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.coverPage}>
        <View style={S.coverInner}>
          <View style={S.coverTop}>
            <Text style={S.coverEye}>DOSSIER D'INVESTISSEMENT · CONFIDENTIEL · 2026</Text>
            <Text style={S.coverLogo}>Athenis</Text>
            <Text style={S.coverSub}>Plateforme financière intelligente pour l'Afrique</Text>
            <Text style={S.coverTitle}>La gestion d'entreprise{'\n'}réinventée pour l'Afrique{'\n'}subsaharienne</Text>
            <Text style={S.coverDesc}>
              Athenis centralise comptabilité, gestion commerciale, RH, juridique, ESG et
              fiscalité dans une plateforme unifiée — conçue pour les réalités africaines :
              OHADA, Mobile Money, SYSCOHADA et connectivité limitée.
            </Text>
            <View style={S.coverBadge}><Text style={S.coverBadgeTx}>LEVÉE DE FONDS · SÉRIE A</Text></View>
            <View style={S.coverStats}>
              {([['9', 'Modules\nfonctionnels'],['90+','Écrans\nlivrés'],['25','Innovations\nroadmap'],['18 mois','Roadmap\ncomplète'],['3','Marchés\ncibles']] as [string,string][]).map(([v,l])=>(
                <View key={l} style={S.coverStat}>
                  <Text style={S.coverStatN}>{v}</Text>
                  <Text style={S.coverStatL}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={S.coverBottom}>
            <View><Text style={S.coverMetaL}>Date</Text><Text style={S.coverMetaV}>{today}</Text></View>
            <View><Text style={S.coverMetaL}>Version</Text><Text style={S.coverMetaV}>1.0</Text></View>
            <View><Text style={S.coverMetaL}>Statut</Text><Text style={S.coverMetaV}>CONFIDENTIEL</Text></View>
            <View><Text style={S.coverMetaL}>Contact</Text><Text style={S.coverMetaV}>contact@athenis.io</Text></View>
          </View>
        </View>
      </Page>

      {/* ══ SOMMAIRE ═══════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <Hdr title="Sommaire" />
        <View style={S.body}>
          <Text style={S.h1}>Sommaire</Text>
          {([
            ['01','Résumé exécutif','Le projet, le marché, l\'opportunité'],
            ['02','Le Problème & Le Marché','50M PME africaines sans outil adapté'],
            ['03','La Solution Athenis','Vision produit et avantages compétitifs'],
            ['04','Module Gestion Commerciale','Ventes, achats, stock, clients, trésorerie'],
            ['05','Module Comptabilité & Finance','SYSCOHADA, états financiers, révision'],
            ['06','Module Ressources Humaines','Paie OHADA, congés, contrats, planning'],
            ['07','Module Juridique & Conformité','Contrats, OHADA, RGPD/APDP'],
            ['08','Module ESG & RSE','Reporting, benchmarking, CSRD'],
            ['09','Module Fiscalité OHADA','TVA, IS, DSF, calendrier fiscal'],
            ['10','Innovations Roadmap','IA, Mobile Money, Athenis Go mobile'],
            ['11','Modèle Économique','Plans tarifaires, revenus récurrents'],
            ['12','Traction & Métriques','Ce qui est livré aujourd\'hui'],
            ['13','Utilisation des Fonds','Allocation de la levée'],
            ['14','Appel à l\'Action','Rejoignez l\'aventure Athenis'],
          ] as [string,string,string][]).map(([n,t,d])=>(
            <View key={n} style={{ flexDirection:'row', alignItems:'center', paddingVertical:6, borderBottomWidth:1, borderBottomColor:C.grayXLight }}>
              <Text style={{ fontSize:9, color:C.green, fontFamily:'Helvetica-Bold', width:24 }}>{n}</Text>
              <Text style={{ fontSize:10, fontFamily:'Helvetica-Bold', color:C.dark, width:180 }}>{t}</Text>
              <View style={{ flex:1, borderBottomWidth:1, borderBottomStyle:'dotted', borderBottomColor:C.grayLight, marginHorizontal:6 }} />
              <Text style={{ fontSize:8.5, color:C.grayMid, flex:2 }}>{d}</Text>
            </View>
          ))}
        </View>
        <Ftr />
      </Page>

      {/* ══ 01 RÉSUMÉ EXÉCUTIF ════════════════════════════════════════════════ */}
      <SectionPage num="01" title="Résumé Exécutif" desc="La thèse d'investissement en une page" badge="OPPORTUNITÉ" />
      <Page size="A4" style={S.page}>
        <Hdr title="01 · Résumé Exécutif" />
        <View style={S.body}>
          <View style={S.row3}>
            {([
              ['Le Problème','Les 50 millions de PME africaines utilisent Excel, des logiciels obsolètes (SAARI, Sage 2005) ou des cahiers papier. Aucune solution actuelle ne couvre l\'ensemble du cycle : gestion + comptabilité + RH + fiscal en une plateforme.'],
              ['La Solution','Athenis est la première plateforme financière tout-en-un conçue nativement pour l\'Afrique : SYSCOHADA, Mobile Money, OHADA, offline-first. Déjà fonctionnelle avec 9 modules complets.'],
              ['Le Marché','TAM : 12 Mds USD. SAM : 850 M USD (Afrique subsaharienne francophone). SOM 3 ans : 42 M USD. 5 pays cibles : Cameroun, Côte d\'Ivoire, Sénégal, Gabon, Togo.'],
            ] as [string,string][]).map(([t,d])=>(
              <View key={t} style={[S.col,S.cardGreen]}>
                <Text style={S.cardTitleG}>{t}</Text>
                <Text style={S.p}>{d}</Text>
              </View>
            ))}
          </View>

          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h2}>Ce qui est livré aujourd'hui</Text>
              <View style={S.fl}>
                <F t="✅ Module Gestion Commerciale complet (factures, devis, BL, stocks, clients)" />
                <F t="✅ Module Comptabilité SYSCOHADA (journal, balance, grand livre, états financiers)" />
                <F t="✅ Module RH (employés, contrats, congés, paie OHADA, planning)" />
                <F t="✅ Module Juridique (contrats, conformité OHADA, RGPD/APDP)" />
                <F t="✅ Module ESG & RSE (3 piliers, scoring, CSRD, DPEF)" />
                <F t="✅ Module Fiscalité (TVA, IS, IGS, DSF, calendrier fiscal)" />
                <F t="✅ Module Cabinet comptable multi-clients" />
                <F t="✅ Finance personnelle (comptes, épargne, transactions)" />
                <F t="✅ Auth sécurisée (2FA TOTP, RBAC 6 rôles, multi-agences)" />
                <F t="✅ Infrastructure production (Docker, nginx, Sentry, PostgreSQL)" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h2}>Ce qui sera livré (Roadmap)</Text>
              <View style={S.fl}>
                <F t="🔜 AutoBook IA — comptabilité auto depuis relevés bancaires" />
                <F t="🔜 ScanAI — OCR factures fournisseurs (photo → saisie auto)" />
                <F t="🔜 MoMo Hub — Orange Money, MTN, Wave, Moov unifiés" />
                <F t="🔜 TaxGPT OHADA — assistant fiscal IA en langage naturel" />
                <F t="🔜 Athenis Go — application mobile iOS & Android" />
                <F t="🔜 e-Invoice DGI — certification électronique des factures" />
                <F t="🔜 WhatsApp Business API — envoi factures/devis" />
                <F t="🔜 CashFlow Intelligence — prévision trésorerie IA 90 jours" />
                <F t="🔜 Expansion CI, SN, GH — 2 nouvelles juridictions" />
              </View>
            </View>
          </View>

          <View style={S.row3}>
            <View style={[S.col,S.card,S.bigMetric]}>
              <Text style={S.bigN}>12 Mds$</Text>
              <Text style={S.bigL}>TAM — Marché adressable total</Text>
            </View>
            <View style={[S.col,S.card,S.bigMetric]}>
              <Text style={S.bigN}>50M</Text>
              <Text style={S.bigL}>PME cibles en Afrique subsaharienne</Text>
            </View>
            <View style={[S.col,S.card,S.bigMetric]}>
              <Text style={S.bigN}>9</Text>
              <Text style={S.bigL}>Modules fonctionnels livrés</Text>
            </View>
            <View style={[S.col,S.cardGreen,S.bigMetric]}>
              <Text style={[S.bigN,{color:C.green}]}>Série A</Text>
              <Text style={S.bigL}>Levée de fonds en cours</Text>
            </View>
          </View>
        </View>
        <Ftr />
      </Page>

      {/* ══ 02 PROBLÈME & MARCHÉ ══════════════════════════════════════════════ */}
      <SectionPage num="02" title="Le Problème & Le Marché" desc="Une opportunité de 12 milliards de dollars mal servie" badge="MARCHÉ" />
      <Page size="A4" style={S.page}>
        <Hdr title="02 · Le Problème & Le Marché" />
        <View style={S.body}>
          <Text style={S.h1}>50 millions de PME africaines sans solution adaptée</Text>
          <Text style={S.lead}>
            L'Afrique subsaharienne compte 50 millions de petites et moyennes entreprises.
            98% d'entre elles n'utilisent aucun logiciel de gestion digne de ce nom.
            Les solutions existantes (Sage, QuickBooks, Xero) sont conçues pour
            l'Europe ou l'Amérique — inadaptées aux réalités africaines.
          </Text>

          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h2}>Les douleurs des PME africaines</Text>
              <View style={S.fl}>
                <F t="📊 Comptabilité faite sur Excel ou cahier papier : erreurs, perte de données" />
                <F t="💸 Paiements Mobile Money non tracés dans la comptabilité" />
                <F t="📋 Déclarations fiscales (TVA, IS) faites manuellement : risque de redressement" />
                <F t="👥 RH & paie sur Excel : bulletins de paie inexistants, CNPS non conforme" />
                <F t="📄 Contrats jamais tracés, alertes d'expiration manquées" />
                <F t="🌍 Aucun reporting ESG malgré les exigences croissantes des banques" />
                <F t="🔌 Connectivité limitée : impossible d'utiliser des solutions cloud SaaS" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h2}>Pourquoi les solutions actuelles échouent</Text>
              <View style={S.tHead}>
                <Text style={[S.tHCell,{flex:2}]}>Solution</Text>
                <Text style={S.tHCell}>Limite principale</Text>
              </View>
              {([
                ['Sage / Ciel','Pas de Mobile Money, pas SYSCOHADA natif'],
                ['QuickBooks','Aucune localisation africaine'],
                ['Xero','Pas de paie OHADA, pas de TVA africaine'],
                ['Wave','Limité à la facturation, pas de compta'],
                ['SAARI','Ancienne génération, pas de cloud'],
                ['Excel','Pas scalable, zéro collaboration'],
              ] as [string,string][]).map(([s,l],i)=>(
                <View key={s} style={i%2===0?S.tRow:S.tRowA}>
                  <Text style={[S.tCellB,{flex:2}]}>{s}</Text>
                  <Text style={S.tCell}>{l}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={S.h2}>Taille du marché</Text>
          <View style={S.row3}>
            {([
              ['TAM','12 Mds USD','Logiciels de gestion PME en Afrique subsaharienne (2026)'],
              ['SAM','850 M USD','Afrique francophone + anglophone OHADA — PME 5–500 employés'],
              ['SOM (3 ans)','42 M USD','10 000 PME à 350 USD/an moyenne — objectif réaliste'],
            ] as [string,string,string][]).map(([l,v,d])=>(
              <View key={l} style={[S.col,S.cardGreen]}>
                <Text style={{fontSize:8,color:C.grayMid,marginBottom:4}}>{l}</Text>
                <Text style={{fontSize:22,fontFamily:'Helvetica-Bold',color:C.green,marginBottom:4}}>{v}</Text>
                <Text style={S.p}>{d}</Text>
              </View>
            ))}
          </View>

          <View style={S.hl}>
            <Text style={S.hlTx}>
              📈 Le marché africain des logiciels de gestion croît de 18% par an (IDC 2025).
              La digitalisation des PME est une priorité des gouvernements africains dans leurs plans de développement 2030.
              Athenis est positionné pour capturer cette vague avec une longueur d'avance technologique.
            </Text>
          </View>
        </View>
        <Ftr />
      </Page>

      {/* ══ 03 SOLUTION & AVANTAGES ═══════════════════════════════════════════ */}
      <SectionPage num="03" title="La Solution Athenis" desc="9 modules fonctionnels, livrés, utilisables aujourd'hui" badge="PRODUIT" />
      <Page size="A4" style={S.page}>
        <Hdr title="03 · La Solution Athenis" />
        <View style={S.body}>
          <Text style={S.h1}>Un écosystème complet — fonctionnel aujourd'hui</Text>
          <Screen name="01_dashboard" caption="Tableau de bord Athenis — Vue consolidée en temps réel de l'activité de l'entreprise" />
          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>Architecture technique</Text>
              <View style={S.fl}>
                <F t="Backend : Node.js + Express + Prisma + PostgreSQL" />
                <F t="Frontend : React 18 + TypeScript + TailwindCSS" />
                <F t="Auth : JWT 15min + Refresh token HttpOnly + 2FA TOTP" />
                <F t="Multi-tenant : isolation totale par companyId" />
                <F t="Desktop : Tauri v2 (Windows / macOS / Linux)" />
                <F t="Monitoring : Sentry + PostHog analytics" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>Avantages concurrentiels uniques</Text>
              <View style={S.fl}>
                <F t="✦ SYSCOHADA natif (seul produit sur le marché)" />
                <F t="✦ Mobile Money Hub (Orange, MTN, Wave, Moov)" />
                <F t="✦ IA générative locale (AutoBook, TaxGPT, ScanAI)" />
                <F t="✦ Offline-first pour zones à faible connectivité" />
                <F t="✦ Multi-entités : entreprise + cabinet + personnel" />
                <F t="✦ Application mobile Athenis Go (iOS + Android)" />
              </View>
            </View>
          </View>
        </View>
        <Ftr />
      </Page>

      {/* ══ 04 GESTION COMMERCIALE ════════════════════════════════════════════ */}
      <SectionPage num="04" title="Gestion Commerciale" desc="Cycle de vente complet — de la commande au paiement" badge="MODULE LIVRÉ ✅" />

      <Page size="A4" style={S.page}>
        <Hdr title="04 · Gestion — Commandes & Factures" />
        <View style={S.body}>
          <Text style={S.h2}>4.1 Commandes clients & Factures de vente</Text>
          <Screen name="02_gestion_commandes" caption="Commandes clients — CA total 37,28M€ | Statuts En cours / En attente / Livrées — Multi-agences" />
          <View style={S.row2}>
            <View style={S.col}>
              <View style={S.fl}>
                <F t="Commandes avec statuts : En cours, En attente, Livrée" />
                <F t="CA total en temps réel avec indicateurs par statut" />
                <F t="Multi-agences : filtre par agence / succursale" />
                <F t="Numérotation automatique (CMD-0051, CMD-0050…)" />
                <F t="Clients : ACME Corp, Groupe Delta, TechX Sarl…" />
              </View>
            </View>
            <View style={S.col}>
              <View style={S.fl}>
                <F t="Conversion commande → Bon de livraison → Facture" />
                <F t="Montants de 890K à 12M par commande" />
                <F t="Dates de livraison prévue tracées" />
                <F t="Recherche et filtres avancés en temps réel" />
              </View>
            </View>
          </View>
          <Screen name="03_gestion_factures_ventes" caption="Factures ventes — Création, gestion des statuts, export PDF avec QR code, envoi email intégré" />
        </View>
        <Ftr />
      </Page>

      <Page size="A4" style={S.page}>
        <Hdr title="04 · Gestion — Achats & Fournisseurs" />
        <View style={S.body}>
          <Text style={S.h2}>4.2 Factures d'achat</Text>
          <Screen name="04_gestion_factures_achats" caption="Factures achats — Import, validation 2 étapes, catégorisation comptable automatique, paiement MoMo" />
          <View style={S.row2}>
            <View style={S.col}>
              <View style={S.fl}>
                <F t="Saisie manuelle ou import depuis bon de réception" />
                <F t="ScanAI (roadmap) : OCR depuis photo facture fournisseur" />
                <F t="Validation 2 étapes : saisie → approbation manager" />
                <F t="Catégorisation comptable automatique par compte OHADA" />
              </View>
            </View>
            <View style={S.col}>
              <View style={S.fl}>
                <F t="Statuts : Reçue → Validée → Payée" />
                <F t="Paiement direct Mobile Money depuis la plateforme" />
                <F t="Rapprochement automatique avec les écritures comptables" />
              </View>
            </View>
          </View>
          <Text style={S.h2}>4.3 Gestion des fournisseurs</Text>
          <Screen name="06_gestion_fournisseurs" caption="Fournisseurs — Fiches complètes, NIU/RCCM, historique achats, encours, coordonnées WhatsApp" />
        </View>
        <Ftr />
      </Page>

      <Page size="A4" style={S.page}>
        <Hdr title="04 · Gestion — Clients, Stocks & Trésorerie" />
        <View style={S.body}>
          <Text style={S.h2}>4.4 Base clients</Text>
          <Screen name="05_gestion_clients" caption="Clients — Base complète avec encours, catégories VIP/Standard, NIU, historique transactions" />
          <Text style={S.h2}>4.5 Stock & Inventaire</Text>
          <Screen name="07_gestion_stock" caption="Stock — Familles d'articles, niveaux, alertes seuil minimum, valorisation FIFO/CMUP" />
          <Text style={S.h2}>4.6 Trésorerie temps réel</Text>
          <Screen name="08_gestion_tresorerie" caption="Trésorerie — Soldes banque/caisse/MoMo, historique flux, prévisions 30 jours (IA roadmap)" />
        </View>
        <Ftr />
      </Page>

      <Page size="A4" style={S.page}>
        <Hdr title="04 · Gestion — Livraisons & Récurrences" />
        <View style={S.body}>
          <Text style={S.h2}>4.7 Bons de livraison</Text>
          <Screen name="09_gestion_bons_livraison" caption="Bons de livraison — Générés depuis factures validées, signature électronique client, suivi livraisons partielles" />
          <View style={S.row2}>
            <View style={[S.col,S.cardGreen]}>
              <Text style={S.cardTitleG}>Flux de documents intégré</Text>
              <View style={S.fl}>
                <F t="Devis → Commande → Bon de livraison → Facture" />
                <F t="Chaque étape met à jour le stock automatiquement" />
                <F t="Conversion entre documents en 1 clic" />
                <F t="Historique complet par client" />
              </View>
            </View>
            <View style={[S.col,S.cardBlue]}>
              <Text style={S.cardTitleB}>Ventes récurrentes</Text>
              <View style={S.fl}>
                <F t="Abonnements, loyers, forfaits mensuels" color="blue" />
                <F t="Fréquence : mensuelle, trimestrielle, annuelle" color="blue" />
                <F t="Génération automatique à l'échéance" color="blue" />
                <F t="Notification email + push mobile" color="blue" />
              </View>
            </View>
          </View>
          <View style={S.innov}>
            <Text style={S.innovLbl}>★ INNOVATION ROADMAP — WhatsApp Business</Text>
            <Text style={S.innovTx}>Envoi de chaque facture / devis directement via WhatsApp Business API depuis la fiche client. Lien de paiement Mobile Money inclus. Taux d'ouverture 5× supérieur à l'email.</Text>
          </View>
        </View>
        <Ftr />
      </Page>

      {/* ══ 05 COMPTABILITÉ ═══════════════════════════════════════════════════ */}
      <SectionPage num="05" title="Comptabilité & Finance" desc="SYSCOHADA révisé 2017 — États financiers normatifs" badge="MODULE LIVRÉ ✅" />

      <Page size="A4" style={S.page}>
        <Hdr title="05 · Comptabilité — Journal & Balance" />
        <View style={S.body}>
          <Text style={S.h2}>5.1 Journal des écritures</Text>
          <Screen name="10_compta_journal" caption="Journal comptable — Saisie SYSCOHADA, 5 journaux (HA/VE/BQ/CA/OD), verrouillage période, lettrage" />
          <View style={S.row2}>
            <View style={S.col}>
              <View style={S.fl}>
                <F t="Journaux : Achats (HA), Ventes (VE), Banque (BQ), Caisse (CA), OD" />
                <F t="Autocomplétion plan de comptes SYSCOHADA (comptes 4, 6, 7…)" />
                <F t="Contrôle débit = crédit avant validation" />
                <F t="Verrouillage exercice clôturé (non modifiable)" />
              </View>
            </View>
            <View style={S.col}>
              <View style={S.fl}>
                <F t="Lettrage manuel et automatique des comptes tiers" />
                <F t="Import OFX/CSV relevé bancaire avec AutoBook IA (roadmap)" />
                <F t="Export Excel pour expert-comptable" />
                <F t="Écritures générées automatiquement depuis Gestion & Paie" />
              </View>
            </View>
          </View>
          <Text style={S.h2}>5.2 Balance générale</Text>
          <Screen name="11_compta_balance" caption="Balance générale SYSCOHADA — Tous comptes, débit/crédit/solde, export PDF/Excel" />
        </View>
        <Ftr />
      </Page>

      <Page size="A4" style={S.page}>
        <Hdr title="05 · Comptabilité — Grand Livre & États Financiers" />
        <View style={S.body}>
          <Text style={S.h2}>5.3 Grand Livre analytique</Text>
          <Screen name="12_compta_grand_livre" caption="Grand Livre — Détail de chaque compte avec toutes les écritures, solde progressif, lettrage" />
          <Text style={S.h2}>5.4 États financiers SYSCOHADA</Text>
          <Screen name="13_compta_etats_financiers" caption="États financiers normés — Bilan, Compte de résultat, Tableau de flux — conformes SYSCOHADA révisé 2017" />
          <View style={S.row2}>
            <View style={[S.col,S.cardGreen]}>
              <Text style={S.cardTitleG}>Documents produits</Text>
              <View style={S.fl}>
                <F t="Bilan actif / passif normé SYSCOHADA" />
                <F t="Compte de résultat avec charges et produits" />
                <F t="Tableau de flux de trésorerie" />
                <F t="Balance générale exportable PDF/Excel" />
              </View>
            </View>
            <View style={[S.col,S.innov]}>
              <Text style={S.innovLbl}>★ INNOVATION — AutoBook IA</Text>
              <Text style={S.innovTx}>Import relevé bancaire → classification automatique des opérations dans les bons comptes OHADA. Score de confiance affiché. L'expert-comptable valide en lot. Gain : 4h/semaine.</Text>
            </View>
          </View>
        </View>
        <Ftr />
      </Page>

      <Page size="A4" style={S.page}>
        <Hdr title="05 · Comptabilité — Révision & Immobilisations" />
        <View style={S.body}>
          <Text style={S.h2}>5.5 Révision comptable collaborative</Text>
          <Screen name="14_compta_revision" caption="Révision — Outil collaboratif cabinet/entreprise : statuts À réviser/Révisé/Validé, commentaires, pièces jointes" />
          <Text style={S.h2}>5.6 Registre des immobilisations</Text>
          <Screen name="15_compta_immobilisations" caption="Immobilisations — Registre complet, amortissements linéaire/dégressif, cessions, tableau d'amortissement PDF" />
          <View style={S.hl}>
            <Text style={S.hlTx}>
              💡 La révision comptable collaborative est un avantage clé pour l'acquisition du segment Cabinet :
              l'expert-comptable accède aux dossiers clients directement depuis sa console Athenis, sans échanges de fichiers Excel.
              Chaque commentaire et chaque validation sont horodatés et traçables.
            </Text>
          </View>
        </View>
        <Ftr />
      </Page>

      {/* ══ 06 RH ════════════════════════════════════════════════════════════ */}
      <SectionPage num="06" title="Ressources Humaines" desc="Paie OHADA, congés, planning — conforme CNPS" badge="MODULE LIVRÉ ✅" />

      <Page size="A4" style={S.page}>
        <Hdr title="06 · RH — Employés & Contrats" />
        <View style={S.body}>
          <Text style={S.h2}>6.1 Dossiers employés</Text>
          <Screen name="16_rh_employes" caption="Employés — Dossiers complets : état civil, contrat, salaire, CNPS, documents, historique évolutions salariales" />
          <Text style={S.h2}>6.2 Gestion des contrats</Text>
          <Screen name="17_rh_contrats" caption="Contrats RH — CDI, CDD, stagiaires avec alertes fin de contrat, renouvellement, génération PDF, signature électronique" />
          <View style={S.row2}>
            <View style={S.col}>
              <View style={S.fl}>
                <F t="Types : CDI, CDD, Stage, Freelance, Intérimaire" />
                <F t="Alertes automatiques fin de contrat (J-90, J-30, J-7)" />
                <F t="Renouvellement avec historique complet" />
              </View>
            </View>
            <View style={S.col}>
              <View style={S.fl}>
                <F t="Génération du contrat PDF depuis template OHADA" />
                <F t="Signature électronique intégrée" />
                <F t="Archivage sécurisé des documents signés" />
              </View>
            </View>
          </View>
        </View>
        <Ftr />
      </Page>

      <Page size="A4" style={S.page}>
        <Hdr title="06 · RH — Congés, Paie & Planning" />
        <View style={S.body}>
          <Text style={S.h2}>6.3 Gestion des congés</Text>
          <Screen name="18_rh_conges" caption="Congés — Demandes en ligne, validation manager, calendrier équipe, soldes temps réel, détection chevauchements" />
          <Text style={S.h2}>6.4 Bulletins de paie OHADA</Text>
          <Screen name="19_rh_paie" caption="Paie OHADA — Calcul CNPS (2,8%/4,2%), IRPP progressif, CAC, bulletin PDF normatif, virement MoMo masse" />
          <View style={S.innov}>
            <Text style={S.innovLbl}>★ INNOVATION ROADMAP — Virement de salaires Mobile Money</Text>
            <Text style={S.innovTx}>Depuis la page de paie, l'employeur vire tous les salaires en 1 clic via MTN MoMo ou Orange Money. Plus besoin de virements bancaires individuels. Les employés reçoivent leur salaire directement sur leur téléphone.</Text>
          </View>
        </View>
        <Ftr />
      </Page>

      <Page size="A4" style={S.page}>
        <Hdr title="06 · RH — Planning & Présence" />
        <View style={S.body}>
          <Text style={S.h2}>6.5 Planning mensuel</Text>
          <Screen name="20_rh_planning" caption="Planning — Calendrier mensuel par département/agence, absences visuelles, heures supplémentaires, rapport présence PDF" />
          <View style={S.row2}>
            <View style={[S.col,S.cardGreen]}>
              <Text style={S.cardTitleG}>Conformité CNPS</Text>
              <View style={S.fl}>
                <F t="CNPS salarial : 2,8% du brut" />
                <F t="CNPS patronal : 4,2% à 7% selon pays" />
                <F t="IRPP : barème progressif automatique" />
                <F t="CAC (CRTV) : 1% du brut" />
                <F t="DSF mensuelle CNPS générée automatiquement" />
                <F t="État 301 annuel (récapitulatif paie)" />
              </View>
            </View>
            <View style={[S.col,S.cardBlue]}>
              <Text style={S.cardTitleB}>Pointage mobile (Athenis Go)</Text>
              <View style={S.fl}>
                <F t="QR code affiché en entreprise = badge numérique" color="blue" />
                <F t="L'employé scanne depuis son téléphone" color="blue" />
                <F t="Géolocalisation optionnelle pour télétravail" color="blue" />
                <F t="Rapport de présence mensuel automatique" color="blue" />
              </View>
            </View>
          </View>
        </View>
        <Ftr />
      </Page>

      {/* ══ 07 JURIDIQUE ══════════════════════════════════════════════════════ */}
      <SectionPage num="07" title="Juridique & Conformité" desc="Contrats, OHADA, RGPD — alertes automatiques" badge="MODULE LIVRÉ ✅" />

      <Page size="A4" style={S.page}>
        <Hdr title="07 · Juridique & Conformité" />
        <View style={S.body}>
          <Text style={S.h2}>7.1 Contrats d'entreprise</Text>
          <Screen name="21_juridique_contrats" caption="Contrats — Gestion cycle de vie complet : Brouillon→Négociation→Signé→Expiré, alertes échéances, signature électronique" />
          <Text style={S.h2}>7.2 Conformité & Alertes</Text>
          <Screen name="22_juridique_conformite" caption="Conformité — Checklist OHADA par type d'entreprise, rappels AG, déclarations obligatoires, registre RGPD/APDP" />
          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>Templates de contrats OHADA</Text>
              <View style={S.fl}>
                <F t="NDA (accord de confidentialité)" />
                <F t="Contrat de prestation de services" />
                <F t="Bail commercial OHADA" />
                <F t="Contrat de distribution" />
                <F t="Partenariat et joint-venture" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>Protection données (RGPD/APDP)</Text>
              <View style={S.fl}>
                <F t="Registre des traitements exportable PDF" />
                <F t="Gestion des droits d'accès/rectification" />
                <F t="Anonymisation sur demande d'effacement" />
                <F t="DPA disponible pour clients cabinet" />
              </View>
            </View>
          </View>
        </View>
        <Ftr />
      </Page>

      {/* ══ 08 ESG ════════════════════════════════════════════════════════════ */}
      <SectionPage num="08" title="ESG & RSE" desc="Premier module ESG adapté aux PME africaines" badge="MODULE LIVRÉ ✅" />

      <Page size="A4" style={S.page}>
        <Hdr title="08 · ESG & RSE" />
        <View style={S.body}>
          <Text style={S.h2}>8.1 Pilier Environnement</Text>
          <Screen name="23_esg_dashboard" caption="ESG Environnement — Consommation énergie, émissions CO₂ (scopes 1/2/3), déchets, empreinte eau — scoring automatique" />
          <Text style={S.h2}>8.2 Pilier Social</Text>
          <Screen name="24_esg_social" caption="ESG Social — Diversité, heures de formation, accidents du travail, ratio salaire médian/minimum légal" />
          <View style={S.innov}>
            <Text style={S.innovLbl}>★ INNOVATION UNIQUE — Benchmark sectoriel anonymisé</Text>
            <Text style={S.innovTx}>Athenis agrège anonymement les données ESG de toutes les entreprises du même secteur pour produire une médiane sectorielle. Chaque PME peut se comparer à ses pairs. Fonctionnalité inexistante sur le marché africain.</Text>
          </View>
        </View>
        <Ftr />
      </Page>

      <Page size="A4" style={S.page}>
        <Hdr title="08 · ESG — Gouvernance & Reporting" />
        <View style={S.body}>
          <Text style={S.h2}>8.3 Pilier Gouvernance</Text>
          <Screen name="25_esg_gouvernance" caption="ESG Gouvernance — Indépendance CA, politique anticorruption, audit externe, taux de conformité réglementaire" />
          <View style={S.row2}>
            <View style={[S.col,S.cardGreen]}>
              <Text style={S.cardTitleG}>Documents générés</Text>
              <View style={S.fl}>
                <F t="Rapport ESG annuel PDF (personnalisé)" />
                <F t="DPEF — Déclaration de Performance Extra-Financière" />
                <F t="Rapport CSRD simplifié (filiales UE)" />
                <F t="Plan d'action ESG avec suivi objectifs SMART" />
              </View>
            </View>
            <View style={[S.col,S.card]}>
              <Text style={S.cardTitle}>Référentiels supportés</Text>
              <View style={S.fl}>
                <F t="GRI Standards (Global Reporting Initiative)" />
                <F t="CSRD — Corporate Sustainability Reporting Directive" />
                <F t="AURG (Afrique — Union Africaine Reporting Guidelines)" />
                <F t="Score global 0–100 avec décomposition E/S/G" />
              </View>
            </View>
          </View>
          <View style={S.hl}>
            <Text style={S.hlTx}>
              🌍 Les banques de développement africaines (BAD, BEI) conditionnent de plus en plus leurs prêts à des critères ESG.
              Athenis permet aux PME d'accéder à ces financements en produisant les rapports requis automatiquement.
            </Text>
          </View>
        </View>
        <Ftr />
      </Page>

      {/* ══ 09 FISCALITÉ ══════════════════════════════════════════════════════ */}
      <SectionPage num="09" title="Fiscalité OHADA" desc="TVA, IS, DSF — déclarations pré-remplies depuis la comptabilité" badge="MODULE LIVRÉ ✅" />

      <Page size="A4" style={S.page}>
        <Hdr title="09 · Fiscalité OHADA" />
        <View style={S.body}>
          <Text style={S.h2}>9.1 Déclaration TVA mensuelle</Text>
          <Screen name="26_fiscal_tva" caption="TVA — Collectée vs déductible, base imposable, TVA à payer — pré-remplie depuis la comptabilité, export PDF DGI" />
          <Text style={S.h2}>9.2 Impôt sur les Sociétés (IS)</Text>
          <Screen name="27_fiscal_is" caption="IS annuel — Résultat fiscal, taux 33% (Cameroun), acomptes trimestriels, report déficitaire automatique" />
          <View style={S.innov}>
            <Text style={S.innovLbl}>★ INNOVATION ROADMAP — TaxGPT OHADA</Text>
            <Text style={S.innovTx}>Assistant IA spécialisé en fiscalité africaine. Répond en langage naturel : "Suis-je soumis à la TVA ?", "Ma DSF est due quand ?", "Comment optimiser mon IS ?". Formé sur les CGI de 5 pays africains.</Text>
          </View>
          <View style={S.innov}>
            <Text style={S.innovLbl}>★ INNOVATION ROADMAP — e-Invoice DGI</Text>
            <Text style={S.innovTx}>Connexion directe à l'API DGI pour certification électronique des factures. Chaque facture reçoit un QR code officiel vérifiable par les agents fiscaux. Anticipe la facturation électronique obligatoire 2027.</Text>
          </View>
        </View>
        <Ftr />
      </Page>

      {/* ══ 10 INNOVATIONS ROADMAP ════════════════════════════════════════════ */}
      <SectionPage num="10" title="Innovations Roadmap" desc="25 innovations différenciantes — les 18 mois qui nous mettent 5 ans en avance" badge="AVANTAGE COMPÉTITIF" />

      <Page size="A4" style={S.page}>
        <Hdr title="10 · Innovations — IA & Automatisation" />
        <View style={S.body}>
          <Text style={S.h1}>Intelligence Artificielle embarquée</Text>
          <Text style={S.lead}>4 agents IA conçus pour les PME africaines — aucun concurrent ne les propose</Text>

          <View style={S.row2}>
            <View style={[S.col,S.cardBlue]}>
              <Text style={S.cardTitleB}>🤖 AutoBook</Text>
              <Text style={S.p}>Import relevé bancaire → classification automatique dans les comptes SYSCOHADA. Score de confiance + validation en lot. Gain : 4h/semaine/entreprise.</Text>
              <View style={S.fl}>
                <F t="Import OFX / CSV toutes banques africaines" color="blue" />
                <F t="GPT-4o-mini + plan de comptes OHADA" color="blue" />
                <F t="Apprentissage sur historique de l'entreprise" color="blue" />
              </View>
            </View>
            <View style={[S.col,S.cardBlue]}>
              <Text style={S.cardTitleB}>📷 ScanAI</Text>
              <Text style={S.p}>Photo d'une facture fournisseur → extraction automatique de toutes les données. Compatible factures manuscrites (fréquentes en Afrique).</Text>
              <View style={S.fl}>
                <F t="Extraction : vendeur, NIU, date, montant, TVA" color="blue" />
                <F t="85% taux de succès factures imprimées" color="blue" />
                <F t="Disponible sur mobile (Athenis Go)" color="blue" />
              </View>
            </View>
          </View>

          <View style={S.row2}>
            <View style={[S.col,{...S.cardBlue, borderColor:'#ddd6fe', backgroundColor:'#f5f3ff'}]}>
              <Text style={{...S.cardTitleB, color:'#7c3aed'}}>💡 TaxGPT OHADA</Text>
              <Text style={S.p}>Assistant IA fiscal en langage naturel. Formé sur les CGI du Cameroun, Côte d'Ivoire, Sénégal, Gabon, Togo.</Text>
              <View style={S.fl}>
                <F t="Réponses sourcées avec article de loi" />
                <F t="Calendrier fiscal personnalisé" />
                <F t="Simulation de scénarios fiscaux" />
              </View>
            </View>
            <View style={[S.col,{...S.cardBlue, borderColor:'#99f6e4', backgroundColor:'#f0fdfa'}]}>
              <Text style={{...S.cardTitleB, color:'#0d9488'}}>📈 CashFlow Intelligence</Text>
              <Text style={S.p}>Prévision de trésorerie à 30/60/90 jours. Détection des tensions avant qu'elles arrivent. Recommandations actionnables.</Text>
              <View style={S.fl}>
                <F t="Modèle : saisonnalité + tendance + récurrences" />
                <F t="Alerte creux de trésorerie préventive" />
                <F t="Intégré au dashboard trésorerie" />
              </View>
            </View>
          </View>
        </View>
        <Ftr />
      </Page>

      <Page size="A4" style={S.page}>
        <Hdr title="10 · Innovations — MoMo Hub & Mobile" />
        <View style={S.body}>
          <Text style={S.h1}>MoMo Hub — Mobile Money unifié</Text>
          <View style={S.hl}>
            <Text style={S.hlTx}>
              💳 Différentiateur absolu : aucun concurrent (Sage, QuickBooks, Xero, Wave) n'a d'intégration native Mobile Money.
              Le Mobile Money représente 67% des paiements B2B en Afrique subsaharienne (GSMA 2025).
              Athenis est la première plateforme à unifier Orange Money, MTN, Wave et Moov dans un hub unique.
            </Text>
          </View>

          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>Opérateurs intégrés</Text>
              <View style={S.tHead}>
                <Text style={S.tHCell}>Opérateur</Text>
                <Text style={S.tHCell}>Pays couverts</Text>
              </View>
              {([
                ['Orange Money','Cameroun, CI, Sénégal, Mali, Guinée'],
                ['MTN MoMo','Cameroun, Ghana, Uganda, Rwanda'],
                ['Wave','Sénégal, CI, Burkina Faso'],
                ['Moov Money','Cameroun, Togo, Bénin'],
                ['Airtel Money','Zambie, Malawi, Madagascar'],
              ] as [string,string][]).map(([op,pays],i)=>(
                <View key={op} style={i%2===0?S.tRow:S.tRowA}>
                  <Text style={S.tCellB}>{op}</Text>
                  <Text style={S.tCell}>{pays}</Text>
                </View>
              ))}
            </View>
            <View style={S.col}>
              <Text style={S.h3}>Cas d'usage MoMo Hub</Text>
              <View style={S.fl}>
                <F t="Encaissement : QR code de paiement par facture" />
                <F t="Paiement fournisseur : virement direct depuis la plateforme" />
                <F t="Paie : virement de salaires en masse (1 clic)" />
                <F t="Réconciliation automatique → écriture comptable" />
                <F t="Dashboard soldes par opérateur en temps réel" />
              </View>
            </View>
          </View>

          <Text style={S.h2}>Athenis Go — Application mobile</Text>
          <View style={S.row2}>
            <View style={[S.col,S.cardGreen]}>
              <Text style={S.cardTitleG}>React Native + Expo (iOS & Android)</Text>
              <View style={S.fl}>
                <F t="Création facture terrain en 30 secondes" />
                <F t="ScanAI : photo facture → saisie auto" />
                <F t="Encaissement MoMo direct (QR code)" />
                <F t="Approbations congés en 1 swipe" />
                <F t="Dashboard KPIs critiques" />
              </View>
            </View>
            <View style={[S.col,S.cardGreen]}>
              <Text style={S.cardTitleG}>Offline-first</Text>
              <View style={S.fl}>
                <F t="Toutes les données cachées localement" />
                <F t="Mutations en file d'attente si offline" />
                <F t="Sync automatique au retour réseau" />
                <F t="Biométrie (Face ID / Touch ID)" />
                <F t="Chiffrement AES-256 local" />
              </View>
            </View>
          </View>
        </View>
        <Ftr />
      </Page>

      {/* ══ 11 MODÈLE ÉCONOMIQUE ══════════════════════════════════════════════ */}
      <SectionPage num="11" title="Modèle Économique" desc="SaaS récurrent, 4 plans tarifaires, 3 segments" badge="REVENUS" />

      <Page size="A4" style={S.page}>
        <Hdr title="11 · Modèle Économique" />
        <View style={S.body}>
          <Text style={S.h1}>SaaS récurrent — revenus prévisibles</Text>

          <Text style={S.h2}>Plans tarifaires (XAF/mois)</Text>
          <View style={S.tHead}>
            {['Plan','Prix/mois','Cible','Modules inclus','MRR cible'].map(h=>(
              <Text key={h} style={S.tHCell}>{h}</Text>
            ))}
          </View>
          {([
            ['FREE','Gratuit','Test/découverte','Gestion basique, 50 fact.','—'],
            ['STARTER','9 990 XAF','Micro-entreprise','+ Compta + Fiscal + 200 fact.','~15€/mois'],
            ['PRO','24 990 XAF','PME','+ RH + Juridique + ESG + illimité','~38€/mois'],
            ['PREMIUM','49 990 XAF','Groupe/Export','+ IA + Athenis Go + API + support','~76€/mois'],
          ] as [string,string,string,string,string][]).map(([p,pr,t,m,mrr],i)=>(
            <View key={p} style={i%2===0?S.tRow:S.tRowA}>
              <Text style={S.tCellB}>{p}</Text>
              <Text style={S.tCell}>{pr}</Text>
              <Text style={S.tCell}>{t}</Text>
              <Text style={S.tCell}>{m}</Text>
              <Text style={S.tCellG}>{mrr}</Text>
            </View>
          ))}

          <Text style={S.h2}>Projections financières (3 ans)</Text>
          <View style={S.tHead}>
            {['','Année 1','Année 2','Année 3'].map(h=>(
              <Text key={h} style={S.tHCell}>{h}</Text>
            ))}
          </View>
          {([
            ['Clients payants','500','2 500','8 000'],
            ['ARPU moyen/mois','25€','32€','42€'],
            ['MRR','12 500€','80 000€','336 000€'],
            ['ARR','150 000€','960 000€','4 032 000€'],
            ['Churn mensuel','< 8%','< 5%','< 3%'],
          ] as [string,string,string,string][]).map(([l,a1,a2,a3],i)=>(
            <View key={l} style={i%2===0?S.tRow:S.tRowA}>
              <Text style={S.tCellB}>{l}</Text>
              <Text style={S.tCell}>{a1}</Text>
              <Text style={S.tCell}>{a2}</Text>
              <Text style={S.tCellG}>{a3}</Text>
            </View>
          ))}

          <View style={S.row2} wrap={false}>
            <View style={[S.col,S.cardGreen]}>
              <Text style={S.cardTitleG}>Sources de revenus additionnelles</Text>
              <View style={S.fl}>
                <F t="Commission MoMo Hub : 0,5% par transaction" />
                <F t="API access : 199€/mois pour intégrateurs" />
                <F t="Formation & onboarding : 299€ par entreprise" />
                <F t="White-label pour banques africaines" />
              </View>
            </View>
            <View style={[S.col,S.cardBlue]}>
              <Text style={S.cardTitleB}>Coût d'acquisition client (CAC)</Text>
              <View style={S.fl}>
                <F t="Partenariats cabinets comptables : ~30€ CAC" color="blue" />
                <F t="Digital marketing Afrique : ~45€ CAC" color="blue" />
                <F t="Bouche à oreille / referral : ~0€ CAC" color="blue" />
                <F t="LTV/CAC cible Année 2 : > 5x" color="blue" />
              </View>
            </View>
          </View>
        </View>
        <Ftr />
      </Page>

      {/* ══ 12 TRACTION ═══════════════════════════════════════════════════════ */}
      <SectionPage num="12" title="Traction & Métriques" desc="Ce qui est livré et fonctionnel aujourd'hui" badge="PROOF OF WORK" />

      <Page size="A4" style={S.page}>
        <Hdr title="12 · Traction — Paramètres & Inscription" />
        <View style={S.body}>
          <Text style={S.h2}>Paramétrage localisation</Text>
          <Screen name="28_settings_localisation" caption="Paramètres — Pays, devise (XAF/EUR/USD), NIU, exercice fiscal, référentiel comptable, logo, couleur de marque" />
          <Text style={S.h2}>Inscription multi-type</Text>
          <Screen name="29_auth_register" caption="Inscription — 3 types de compte (Personnel/Entreprise/Cabinet), plan tarifaire, NIU/SIREN, pays OHADA" />
          <View style={S.row3}>
            {([
              ['9 modules\nlivrés','Tous fonctionnels\net testés en production'],
              ['90+ écrans','Interface complète\navec données réelles'],
              ['2FA TOTP','Sécurité\nentreprise-grade'],
              ['Multi-agences','Multi-tenant\nisolation totale'],
              ['PDF exports','15 types de\ndocuments PDF'],
            ] as [string,string][]).map(([v,d])=>(
              <View key={v} style={[S.col,S.cardGreen,{alignItems:'center',paddingVertical:12}]}>
                <Text style={{fontSize:16,fontFamily:'Helvetica-Bold',color:C.green,textAlign:'center'}}>{v}</Text>
                <Text style={{fontSize:7.5,color:C.grayMid,marginTop:4,textAlign:'center'}}>{d}</Text>
              </View>
            ))}
          </View>
        </View>
        <Ftr />
      </Page>

      {/* ══ 13 UTILISATION DES FONDS ══════════════════════════════════════════ */}
      <SectionPage num="13" title="Utilisation des Fonds" desc="Allocation précise de la levée de fonds Série A" badge="INVESTISSEMENT" />

      <Page size="A4" style={S.page}>
        <Hdr title="13 · Utilisation des Fonds" />
        <View style={S.body}>
          <Text style={S.h1}>Allocation de la levée — Série A</Text>
          <Text style={S.lead}>
            La levée Série A permet d'accélérer le développement des innovations roadmap,
            le recrutement d'une équipe commerciale Afrique et l'expansion dans 3 nouveaux pays.
          </Text>

          <View style={S.tHead}>
            {['Poste','Allocation','Montant','Livrable'].map(h=>(
              <Text key={h} style={S.tHCell}>{h}</Text>
            ))}
          </View>
          {([
            ['R&D — IA & Mobile','35%','350K€','AutoBook, ScanAI, TaxGPT, Athenis Go'],
            ['R&D — MoMo Hub','15%','150K€','Orange, MTN, Wave, Moov intégrés'],
            ['Commercial & Marketing','25%','250K€','Équipe vente Cameroun, CI, Sénégal'],
            ['Infrastructure & Sécurité','10%','100K€','Infra prod, redondance, certifications'],
            ['Expansion géographique','10%','100K€','Localisation CI, SN, GH, juridictions'],
            ['Fonds de roulement','5%','50K€','18 mois de runway opérationnel'],
          ] as [string,string,string,string][]).map(([p,a,m,l],i)=>(
            <View key={p} style={i%2===0?S.tRow:S.tRowA}>
              <Text style={S.tCellB}>{p}</Text>
              <Text style={S.tCellG}>{a}</Text>
              <Text style={S.tCellB}>{m}</Text>
              <Text style={S.tCell}>{l}</Text>
            </View>
          ))}

          <Text style={S.h2}>Milestones post-financement</Text>
          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.h3}>M1–M6</Text>
              <View style={S.fl}>
                <F t="MoMo Hub v1 (Orange + MTN) en production" />
                <F t="AutoBook IA beta — 50 entreprises pilotes" />
                <F t="Athenis Go iOS/Android en App Store" />
                <F t="100 clients payants Cameroun" />
              </View>
            </View>
            <View style={S.col}>
              <Text style={S.h3}>M6–M18</Text>
              <View style={S.fl}>
                <F t="Expansion Côte d'Ivoire et Sénégal" />
                <F t="TaxGPT + e-Invoice DGI en production" />
                <F t="500 clients payants, ARR > 150K€" />
                <F t="Partenariats avec 3 banques africaines" />
              </View>
            </View>
          </View>
        </View>
        <Ftr />
      </Page>

      {/* ══ 14 CALL TO ACTION ══════════════════════════════════════════════════ */}
      <Page size="A4" style={S.coverPage}>
        <View style={[S.coverInner, {justifyContent:'center', alignItems:'center'}]}>
          <Text style={[S.coverEye, {textAlign:'center'}]}>REJOIGNEZ L'AVENTURE</Text>
          <Text style={[S.coverLogo, {textAlign:'center', marginBottom:16}]}>Athenis</Text>
          <Text style={[S.coverTitle, {textAlign:'center', fontSize:22}]}>
            La prochaine licorne{'\n'}financière africaine{'\n'}se construit maintenant
          </Text>
          <Text style={[S.coverDesc, {textAlign:'center', marginTop:16}]}>
            9 modules livrés. 90+ écrans fonctionnels. Architecture production-ready.{'\n'}
            Un marché de 12 milliards de dollars quasi-intact.{'\n'}
            25 innovations en roadmap que personne d'autre ne propose.
          </Text>
          <View style={[S.coverBadge, {alignSelf:'center', marginTop:24}]}>
            <Text style={S.coverBadgeTx}>SÉRIE A — OPPORTUNITÉ UNIQUE</Text>
          </View>

          <View style={{marginTop:40, gap:12}}>
            {([
              ['📧 Email','contact@athenis.io'],
              ['🌐 Web','www.athenis.io'],
              ['📞 Téléphone','+237 6XX XXX XXX'],
              ['📍 Siège','Douala, Cameroun'],
            ] as [string,string][]).map(([l,v])=>(
              <View key={l} style={{flexDirection:'row', justifyContent:'center', gap:16}}>
                <Text style={{fontSize:10,color:'rgba(255,255,255,0.5)',width:100,textAlign:'right'}}>{l}</Text>
                <Text style={{fontSize:10,fontFamily:'Helvetica-Bold',color:C.white}}>{v}</Text>
              </View>
            ))}
          </View>

          <View style={{marginTop:32, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:8, padding:16, width:'100%'}}>
            <Text style={{fontSize:8,color:'rgba(255,255,255,0.4)',textAlign:'center',lineHeight:1.6}}>
              Ce document est confidentiel et destiné exclusivement aux investisseurs potentiels identifiés.
              Il ne constitue pas une offre d'investissement au sens réglementaire. Les projections financières
              sont basées sur des hypothèses raisonnables mais non garanties.
            </Text>
          </View>
        </View>
      </Page>

    </Document>
  )
}
