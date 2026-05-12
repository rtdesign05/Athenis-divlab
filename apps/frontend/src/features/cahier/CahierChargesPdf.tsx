import {
  Document, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer'

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  green:        '#1a6b3c',
  greenLight:   '#e8f5ee',
  greenMid:     '#2d8653',
  accent:       '#f59e0b',
  dark:         '#111827',
  gray:         '#374151',
  grayMid:      '#6b7280',
  grayLight:    '#e5e7eb',
  grayXLight:   '#f9fafb',
  white:        '#ffffff',
  border:       '#d1d5db',
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  /* Page */
  page: { fontFamily: 'Helvetica', backgroundColor: C.white, paddingBottom: 48 },
  coverPage: { fontFamily: 'Helvetica', backgroundColor: C.green },

  /* Header bande verte sur les pages normales */
  pageHeader: {
    backgroundColor: C.green, height: 8, marginBottom: 0,
  },
  pageHeaderBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 32, paddingVertical: 8, backgroundColor: C.greenMid,
  },
  pageHeaderTitle: { fontSize: 8, color: C.white, opacity: 0.9 },
  pageNum: { fontSize: 8, color: C.white, opacity: 0.9 },

  /* Footer */
  pageFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopWidth: 1, borderTopColor: C.grayLight,
    paddingHorizontal: 32, paddingVertical: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  footerText: { fontSize: 7, color: C.grayMid },

  /* Body */
  body: { paddingHorizontal: 36, paddingTop: 20 },

  /* Cover */
  coverTop: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48,
  },
  coverLogo: { fontSize: 52, fontFamily: 'Helvetica-Bold', color: C.white, letterSpacing: 2 },
  coverTagline: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center' },
  coverTitleBlock: {
    marginTop: 48, paddingTop: 32, paddingBottom: 32, paddingHorizontal: 40,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8,
    alignItems: 'center', width: '100%',
  },
  coverLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, textTransform: 'uppercase' },
  coverTitle: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: C.white, marginTop: 8, textAlign: 'center' },
  coverSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center' },
  coverBottom: {
    backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 48, paddingVertical: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  coverMeta: { fontSize: 9, color: 'rgba(255,255,255,0.7)' },
  coverMetaVal: { fontSize: 10, color: C.white, fontFamily: 'Helvetica-Bold' },
  coverBadge: {
    backgroundColor: C.accent, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4,
  },
  coverBadgeText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark },

  /* TOC */
  tocTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.green, marginBottom: 24 },
  tocSection: { marginBottom: 6 },
  tocItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.grayXLight,
  },
  tocItemSub: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 3, paddingLeft: 14,
  },
  tocNum: { fontSize: 9, color: C.green, fontFamily: 'Helvetica-Bold', width: 24 },
  tocLabel: { fontSize: 10, color: C.dark, flex: 1, fontFamily: 'Helvetica-Bold' },
  tocLabelSub: { fontSize: 9, color: C.gray, flex: 1 },
  tocPage: { fontSize: 9, color: C.grayMid },
  tocDots: { flex: 1, borderBottomWidth: 1, borderBottomStyle: 'dotted', borderBottomColor: C.grayLight, marginHorizontal: 4 },

  /* Section headings */
  sectionBanner: {
    backgroundColor: C.green, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: 4,
  },
  sectionNum: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: 'rgba(255,255,255,0.3)', marginRight: 12 },
  sectionTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.white },
  sectionTag: {
    marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  sectionTagText: { fontSize: 8, color: C.white },

  h2: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.greenMid, marginTop: 16, marginBottom: 6 },
  h3: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.dark, marginTop: 10, marginBottom: 4 },
  p: { fontSize: 9, color: C.gray, lineHeight: 1.6, marginBottom: 6 },
  pBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 4 },

  /* Chips / badges */
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  chip: {
    backgroundColor: C.greenLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  chipText: { fontSize: 8, color: C.green, fontFamily: 'Helvetica-Bold' },
  chipGray: {
    backgroundColor: C.grayXLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  chipGrayText: { fontSize: 8, color: C.grayMid },

  /* Cards */
  card: {
    border: 1, borderColor: C.border, borderRadius: 6, padding: 12, marginBottom: 10,
  },
  cardGreen: {
    border: 1, borderColor: C.greenLight, borderRadius: 6, padding: 12,
    backgroundColor: C.greenLight, marginBottom: 10,
  },
  cardTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 6 },

  /* 2-col grid */
  row2: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  col: { flex: 1 },

  /* Feature list */
  featureList: { marginLeft: 8, marginBottom: 8 },
  featureItem: { flexDirection: 'row', marginBottom: 3 },
  bullet: { fontSize: 9, color: C.green, marginRight: 6, fontFamily: 'Helvetica-Bold' },
  featureText: { fontSize: 9, color: C.gray, flex: 1, lineHeight: 1.5 },

  /* Table */
  table: { marginBottom: 10 },
  tableHead: { flexDirection: 'row', backgroundColor: C.green, borderRadius: 3, padding: 6 },
  tableHeadCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.white, flex: 1 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.grayXLight, padding: 6 },
  tableRowAlt: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.grayXLight,
    padding: 6, backgroundColor: C.grayXLight,
  },
  tableCell: { fontSize: 8, color: C.gray, flex: 1 },
  tableCellBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.dark, flex: 1 },

  /* Divider */
  divider: { borderBottomWidth: 1, borderBottomColor: C.grayLight, marginVertical: 12 },

  /* Highlight box */
  highlight: {
    backgroundColor: '#fffbeb', borderLeftWidth: 3, borderLeftColor: C.accent,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, borderRadius: 2,
  },
  highlightText: { fontSize: 9, color: '#92400e', lineHeight: 1.5 },

  /* Tech stack */
  techGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  techBadge: {
    border: 1, borderColor: C.border, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5,
    minWidth: 80, alignItems: 'center',
  },
  techLabel: { fontSize: 7, color: C.grayMid, marginBottom: 2 },
  techValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark },
})

// ── Helpers ───────────────────────────────────────────────────────────────────
const PageHeader = ({ title }: { title: string }) => (
  <View fixed>
    <View style={S.pageHeader} />
    <View style={S.pageHeaderBar}>
      <Text style={S.pageHeaderTitle}>Athenis · Cahier des Charges Fonctionnel</Text>
      <Text style={S.pageHeaderTitle}>{title}</Text>
    </View>
  </View>
)

const PageFooter = () => (
  <View style={S.pageFooter} fixed>
    <Text style={S.footerText}>© 2026 Athenis · Confidentiel</Text>
    <Text style={S.footerText} render={({ pageNumber, totalPages }) =>
      `Page ${pageNumber} / ${totalPages}`
    } />
    <Text style={S.footerText}>Version 1.0 · Mai 2026</Text>
  </View>
)

const Feature = ({ text }: { text: string }) => (
  <View style={S.featureItem}>
    <Text style={S.bullet}>›</Text>
    <Text style={S.featureText}>{text}</Text>
  </View>
)

const Chip = ({ label }: { label: string }) => (
  <View style={S.chip}><Text style={S.chipText}>{label}</Text></View>
)

const ChipGray = ({ label }: { label: string }) => (
  <View style={S.chipGray}><Text style={S.chipGrayText}>{label}</Text></View>
)

const SectionBanner = ({ num, title, tag }: { num: string; title: string; tag: string }) => (
  <View style={S.sectionBanner}>
    <Text style={S.sectionNum}>{num}</Text>
    <Text style={S.sectionTitle}>{title}</Text>
    <View style={S.sectionTag}><Text style={S.sectionTagText}>{tag}</Text></View>
  </View>
)

// ── Composant principal ───────────────────────────────────────────────────────
export function CahierChargesPdf() {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <Document
      title="Athenis – Cahier des Charges Fonctionnel"
      author="Athenis"
      subject="Spécifications fonctionnelles complètes"
      creator="Athenis PDF Engine"
    >
      {/* ═══ PAGE DE COUVERTURE ══════════════════════════════════════════════ */}
      <Page size="A4" style={S.coverPage}>
        <View style={S.coverTop}>
          <Text style={S.coverLogo}>Athenis</Text>
          <Text style={S.coverTagline}>Plateforme financière intelligente tout-en-un</Text>

          <View style={S.coverTitleBlock}>
            <Text style={S.coverLabel}>Document Officiel</Text>
            <Text style={S.coverTitle}>Cahier des Charges{'\n'}Fonctionnel</Text>
            <Text style={S.coverSubtitle}>Spécifications complètes — tous modules</Text>
          </View>

          <View style={{ marginTop: 32, flexDirection: 'row', gap: 20 }}>
            {[
              ['9', 'Modules'],
              ['90+', 'Écrans'],
              ['6', 'Entités métier'],
              ['Multi', 'Agences'],
            ].map(([val, lbl]) => (
              <View key={lbl} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: C.white }}>{val}</Text>
                <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{lbl}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={S.coverBottom}>
          <View>
            <Text style={S.coverMeta}>Date d'édition</Text>
            <Text style={S.coverMetaVal}>{today}</Text>
          </View>
          <View>
            <Text style={S.coverMeta}>Version</Text>
            <Text style={S.coverMetaVal}>1.0</Text>
          </View>
          <View>
            <Text style={S.coverMeta}>Statut</Text>
            <View style={S.coverBadge}><Text style={S.coverBadgeText}>CONFIDENTIEL</Text></View>
          </View>
          <View>
            <Text style={S.coverMeta}>Branche</Text>
            <Text style={S.coverMetaVal}>claude/naughty-noyce</Text>
          </View>
        </View>
      </Page>

      {/* ═══ TABLE DES MATIÈRES ═════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="Sommaire" />
        <View style={S.body}>
          <Text style={S.tocTitle}>Table des matières</Text>

          {[
            { num: '1', label: 'Présentation du projet', page: '4' },
            { num: '2', label: 'Architecture technique', page: '5' },
            { num: '3', label: 'Module Gestion commerciale', page: '6', subs: [
              'Commandes & Facturation', 'Stock & Inventaire', 'Trésorerie',
            ] },
            { num: '4', label: 'Module Comptabilité', page: '9', subs: [
              'Journaux & Écritures', 'Immobilisations', 'États financiers',
            ] },
            { num: '5', label: 'Module Ressources Humaines', page: '11', subs: [
              'Employés & Contrats', 'Congés & Planning', 'Paie',
            ] },
            { num: '6', label: 'Module Juridique', page: '13', subs: [
              'Contrats & Signatures', 'RGPD & Conformité',
            ] },
            { num: '7', label: 'Module ESG & CSRD', page: '14', subs: [
              'Environnement', 'Social & Gouvernance', 'Rapports',
            ] },
            { num: '8', label: 'Module Fiscalité', page: '16', subs: [
              'Déclarations TVA / IS', 'Charges sociales', 'Calendrier fiscal',
            ] },
            { num: '9', label: 'Module Cabinet comptable', page: '18' },
            { num: '10', label: 'Module Finance personnelle', page: '19' },
            { num: '11', label: 'Authentification & Paramètres', page: '20' },
            { num: '12', label: 'Fonctionnalités transversales', page: '21' },
            { num: '13', label: 'Sécurité & Conformité', page: '22' },
          ].map(item => (
            <View key={item.num} style={S.tocSection}>
              <View style={S.tocItem}>
                <Text style={S.tocNum}>{item.num}.</Text>
                <Text style={S.tocLabel}>{item.label}</Text>
                <View style={S.tocDots} />
                <Text style={S.tocPage}>{item.page}</Text>
              </View>
              {item.subs?.map(sub => (
                <View key={sub} style={S.tocItemSub}>
                  <Text style={{ fontSize: 9, color: C.grayMid, width: 16 }}>—</Text>
                  <Text style={S.tocLabelSub}>{sub}</Text>
                  <View style={S.tocDots} />
                  <Text style={S.tocPage}>-</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
        <PageFooter />
      </Page>

      {/* ═══ 1 — PRÉSENTATION DU PROJET ════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="Présentation" />
        <View style={S.body}>
          <SectionBanner num="01" title="Présentation du projet" tag="Vision & Objectifs" />

          <Text style={S.p}>
            Athenis est une plateforme SaaS financière et de gestion d'entreprise tout-en-un conçue
            pour les PME africaines (zone OHADA) et internationales. Elle centralise la gestion
            commerciale, la comptabilité, les RH, le juridique, l'ESG et la fiscalité dans une
            interface unique, multi-agences et multi-utilisateurs.
          </Text>

          <View style={S.highlight}>
            <Text style={S.highlightText}>
              Mission : Donner aux entrepreneurs et cabinets comptables africains un outil
              professionnel de niveau international, adapté aux réglementations locales (OHADA,
              SYSCOHADA, DGI Cameroun), accessible depuis le cloud ou en mode desktop (Tauri).
            </Text>
          </View>

          <Text style={S.h2}>Utilisateurs cibles</Text>
          <View style={S.row2}>
            {[
              { title: 'PME & TPE', desc: 'Entreprises de 1 à 500 employés souhaitant digitaliser leur gestion' },
              { title: 'Cabinets comptables', desc: 'Experts-comptables gérant un portefeuille de plusieurs sociétés clientes' },
              { title: 'Entrepreneurs', desc: 'Créateurs d\'entreprise cherchant un outil complet dès le démarrage' },
              { title: 'Directions financières', desc: 'DAF et contrôleurs de gestion pour le reporting et le pilotage' },
            ].map(u => (
              <View key={u.title} style={[S.card, { flex: 1 }]}>
                <Text style={S.cardTitle}>{u.title}</Text>
                <Text style={S.p}>{u.desc}</Text>
              </View>
            ))}
          </View>

          <Text style={S.h2}>Périmètre fonctionnel</Text>
          <View style={S.chipRow}>
            {['Gestion commerciale', 'Comptabilité OHADA/IFRS', 'Ressources Humaines',
              'Juridique & RGPD', 'ESG & CSRD', 'Fiscalité Cameroun', 'Cabinet comptable',
              'Finance personnelle', 'Multi-agences', 'Mode hors-ligne (Desktop)'].map(f => (
              <Chip key={f} label={f} />
            ))}
          </View>

          <Text style={S.h2}>Modèle de déploiement</Text>
          <View style={S.row2}>
            <View style={[S.cardGreen, { flex: 1 }]}>
              <Text style={S.cardTitle}>☁ SaaS Cloud</Text>
              <Text style={S.p}>Hébergement centralisé, accès via navigateur web. Mises à jour automatiques. Multi-tenant avec isolation des données par société.</Text>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>🖥 Desktop (Tauri)</Text>
              <Text style={S.p}>Application native Windows/Mac/Linux via Tauri. Peut fonctionner en mode hors-ligne avec synchronisation locale.</Text>
            </View>
          </View>

          <Text style={S.h2}>Normes comptables supportées</Text>
          <View style={S.table}>
            <View style={S.tableHead}>
              {['Norme', 'Périmètre', 'Plan comptable'].map(h => (
                <Text key={h} style={S.tableHeadCell}>{h}</Text>
              ))}
            </View>
            {[
              ['OHADA / SYSCOHADA', 'Afrique subsaharienne francophone', 'Plan comptable OHADA'],
              ['FRANCE (PCG)', 'France métropolitaine', 'Plan comptable général français'],
              ['IFRS', 'International / cotées', 'Normes IFRS complètes'],
            ].map(([n, p, pc], i) => (
              <View key={n} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={S.tableCellBold}>{n}</Text>
                <Text style={S.tableCell}>{p}</Text>
                <Text style={S.tableCell}>{pc}</Text>
              </View>
            ))}
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ═══ 2 — ARCHITECTURE TECHNIQUE ════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="Architecture technique" />
        <View style={S.body}>
          <SectionBanner num="02" title="Architecture technique" tag="Stack & Infrastructure" />

          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Frontend</Text>
              <View style={S.featureList}>
                {['React 18 + TypeScript', 'Vite 5 (build tool)', 'Tailwind CSS 3',
                  'React Router v6', '@react-pdf/renderer', 'Tauri 2 (desktop)'].map(t => <Feature key={t} text={t} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Backend</Text>
              <View style={S.featureList}>
                {['Node.js + Express', 'TypeScript strict', 'Prisma ORM',
                  'PostgreSQL 17', 'JWT + Refresh tokens', 'Zod validation'].map(t => <Feature key={t} text={t} />)}
              </View>
            </View>
          </View>

          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Infrastructure</Text>
              <View style={S.featureList}>
                {['Nginx (reverse proxy)', 'Docker / Compose', 'Sentry (monitoring erreurs)',
                  'PostHog (analytics)', 'SMTP email (Nodemailer)', 'Rate limiting'].map(t => <Feature key={t} text={t} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Sécurité</Text>
              <View style={S.featureList}>
                {['TOTP 2FA (authentifié)', 'Helmet.js (headers HTTP)', 'CORS configuré',
                  'Bcrypt (mots de passe)', 'RBAC multi-niveaux', 'Politique de sécurité DB'].map(t => <Feature key={t} text={t} />)}
              </View>
            </View>
          </View>

          <Text style={S.h2}>Architecture applicative</Text>
          <View style={S.table}>
            <View style={S.tableHead}>
              {['Couche', 'Port', 'Rôle', 'Technologie'].map(h => (
                <Text key={h} style={S.tableHeadCell}>{h}</Text>
              ))}
            </View>
            {[
              ['Frontend SPA', ':5173 (dev)', 'Interface utilisateur React', 'Vite + React'],
              ['API REST', ':3001', 'Logique métier et accès DB', 'Express + Prisma'],
              ['Base de données', ':5432', 'Persistance des données', 'PostgreSQL 17'],
              ['Proxy', ':80/443', 'Routage + SSL termination', 'Nginx'],
              ['Desktop shell', 'local', 'Encapsulation native', 'Tauri 2 (Rust)'],
            ].map(([c, p, r, t], i) => (
              <View key={c} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={S.tableCellBold}>{c}</Text>
                <Text style={S.tableCell}>{p}</Text>
                <Text style={S.tableCell}>{r}</Text>
                <Text style={S.tableCell}>{t}</Text>
              </View>
            ))}
          </View>

          <Text style={S.h2}>Modèle de données — entités principales</Text>
          <View style={S.chipRow}>
            {['User', 'Company', 'Agence', 'CompanyMember', 'FiscalYear', 'JournalEntry',
              'Invoice', 'Quote', 'Order', 'Employee', 'Payslip', 'LegalContract',
              'Asset', 'StockMouvement', 'TaxDeclaration', 'EsgData'].map(e => (
              <ChipGray key={e} label={e} />
            ))}
          </View>

          <Text style={S.h2}>Gestion multi-tenant</Text>
          <Text style={S.p}>
            Chaque société dispose d'un espace isolé. Les données sont filtrées par
            <Text style={{ fontFamily: 'Helvetica-Bold' }}> companyId </Text>
            à chaque requête backend via middleware. Les utilisateurs peuvent être membres
            de plusieurs sociétés avec des rôles différents dans chacune.
          </Text>
          <View style={S.chipRow}>
            {['Isolation par companyId', 'Rôles par société', 'Contexte agence', 'Exercice fiscal configurable', 'Devise par société'].map(f => <Chip key={f} label={f} />)}
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ═══ 3 — MODULE GESTION ════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="Module Gestion commerciale" />
        <View style={S.body}>
          <SectionBanner num="03" title="Module Gestion commerciale" tag="Ventes · Achats · Stock · Trésorerie" />

          <Text style={S.h2}>3.1 Ventes & Facturation clients</Text>
          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Commandes clients</Text>
              <View style={S.featureList}>
                {['Création de commandes avec lignes détaillées', 'Suivi statut : En cours / Livrée / Annulée',
                  'Association automatique aux bons de livraison', 'Filtrage par agence',
                  'Conversion en facture en 1 clic'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Factures de vente</Text>
              <View style={S.featureList}>
                {['Modèles : Standard, Pro forma, Acompte, Avoir',
                  'Calcul automatique TVA (19.25% Cameroun)',
                  'Statuts : Brouillon / Envoyée / Payée / En retard',
                  'Export PDF avec QR code de vérification',
                  'Envoi par email intégré', 'Import/export CSV'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
          </View>

          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Devis (Quotes)</Text>
              <View style={S.featureList}>
                {['Création et gestion des devis', 'Date de validité configurable',
                  'Conversion en commande/facture', 'Export PDF avec QR code',
                  'Historique et suivi de conversion'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Ventes récurrentes</Text>
              <View style={S.featureList}>
                {['Configuration d\'abonnements et contrats récurrents',
                  'Fréquences : mensuel / trimestriel / annuel',
                  'Génération automatique des factures', 'Suivi des échéances',
                  'Activation/désactivation'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
          </View>

          <Text style={S.h2}>3.2 Achats & Fournisseurs</Text>
          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Bons de commande fournisseurs</Text>
              <View style={S.featureList}>
                {['Création de commandes d\'achat multi-lignes',
                  'Suivi livraisons et réceptions', 'Statuts workflow complet',
                  'Lien automatique avec bons de réception'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Factures d\'achat</Text>
              <View style={S.featureList}>
                {['Enregistrement et suivi des factures fournisseurs',
                  'Validation workflow (À valider → Validée → Payée)',
                  'Export PDF avec QR code', 'Import CSV/batch',
                  'Relances et alertes de retard'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
          </View>

          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Bons de livraison (BL)</Text>
              <View style={S.featureList}>
                {['Génération automatique depuis commandes', 'Suivi livraison réelle vs prévue',
                  'Signature expéditeur + destinataire', 'QR code de vérification',
                  'Export PDF professionnel'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Bons de réception (BR)</Text>
              <View style={S.featureList}>
                {['Réception partielle ou totale', 'Contrôle conformité article par article',
                  'Gestion des litiges et retours fournisseurs',
                  'QR code de vérification', 'Impact automatique sur le stock'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
          </View>

          <Text style={S.h2}>3.3 Stock & Inventaire</Text>
          <View style={S.chipRow}>
            <Chip label="Valorisation CMUP" /><Chip label="Valorisation FIFO" />
            <Chip label="Alertes seuil bas" /><Chip label="Familles d'articles" />
            <Chip label="Multi-agences" /><Chip label="Mouvements tracés" />
          </View>
          <View style={S.featureList}>
            {['Dashboard stock avec valeur totale et articles critiques',
              'Mouvements : Entrée, Sortie, Ajustement avec références',
              'Valorisation de stock : méthode CMUP ou FIFO (configurable)',
              'Alertes automatiques sur seuils de stock minimum',
              'Gestion des familles et sous-familles d\'articles',
              'Catalogue articles avec SKU, prix HT, TVA, unité'].map(f => <Feature key={f} text={f} />)}
          </View>

          <Text style={S.h2}>3.4 Trésorerie & Flux financiers</Text>
          <View style={S.row2}>
            {[
              { title: 'Banques', items: ['Comptes bancaires multi-devises', 'Rapprochement bancaire', 'Historique des transactions'] },
              { title: 'Caisses', items: ['Gestion de caisses physiques par agence', 'Entrées/sorties de caisse', 'Soldes en temps réel'] },
              { title: 'Mobile Money', items: ['MTN Mobile Money', 'Orange Money', 'Suivi des transactions numériques'] },
              { title: 'Prévisions', items: ['Trésorerie prévisionnelle 90 jours', 'Graphiques de flux', 'Export PDF'] },
            ].map(b => (
              <View key={b.title} style={[S.card, { flex: 1 }]}>
                <Text style={S.cardTitle}>{b.title}</Text>
                <View style={S.featureList}>{b.items.map(i => <Feature key={i} text={i} />)}</View>
              </View>
            ))}
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ═══ 4 — MODULE COMPTABILITÉ ══════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="Module Comptabilité" />
        <View style={S.body}>
          <SectionBanner num="04" title="Module Comptabilité" tag="OHADA · FRANCE · IFRS" />

          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Saisie & Journaux</Text>
              <View style={S.featureList}>
                {['Saisie manuelle d\'écritures comptables (débit/crédit)',
                  'Journaux configurables : Achat, Vente, Banque, OD, Paie',
                  'Pièce jointe sur les écritures',
                  'Numérotation automatique des pièces',
                  'Extourne automatique des écritures'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Lettrage & Rapprochement</Text>
              <View style={S.featureList}>
                {['Lettrage des comptes clients/fournisseurs',
                  'Rapprochement bancaire automatisé',
                  'Pointage des relevés bancaires',
                  'Détection des écarts non réconciliés',
                  'Rapport de rapprochement exportable'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
          </View>

          <Text style={S.h2}>4.1 États & Éditions comptables</Text>
          <View style={S.table}>
            <View style={S.tableHead}>
              {['État', 'Description', 'Export'].map(h => (
                <Text key={h} style={S.tableHeadCell}>{h}</Text>
              ))}
            </View>
            {[
              ['Grand Livre', 'Détail des mouvements par compte, filtrable par période', 'PDF'],
              ['Balance des comptes', 'Soldes débiteurs/créditeurs par compte avec totaux', 'PDF / Excel'],
              ['Bilan comptable', 'Actif / Passif au format OHADA ou PCG', 'PDF'],
              ['Compte de résultat', 'Produits / Charges avec résultat net', 'PDF'],
              ['TAFIRE', 'Tableau de financement des ressources et emplois (OHADA)', 'PDF'],
              ['États financiers complets', 'Bilan + CR + Flux + Notes', 'PDF unifié'],
              ['FEC', 'Fichier des Écritures Comptables (norme DGFiP)', 'CSV/TXT'],
            ].map(([e, d, x], i) => (
              <View key={e} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={S.tableCellBold}>{e}</Text>
                <Text style={S.tableCell}>{d}</Text>
                <Text style={S.tableCell}>{x}</Text>
              </View>
            ))}
          </View>

          <Text style={S.h2}>4.2 Immobilisations</Text>
          <View style={S.featureList}>
            {['Registre des immobilisations corporelles et incorporelles',
              'Calcul automatique des amortissements (linéaire / dégressif)',
              'Plan d\'amortissement sur la durée de vie',
              'Gestion des cessions et mises au rebut',
              'Tableau récapitulatif avec VNC (Valeur Nette Comptable)',
              'Intégration automatique dans le bilan'].map(f => <Feature key={f} text={f} />)}
          </View>

          <Text style={S.h2}>4.3 Révision & Contrôle qualité</Text>
          <View style={S.featureList}>
            {['Revue de comptes avec statut : En attente / Révisé / Anomalie',
              'Commentaires et notes de révision par compte',
              'Tableau de bord de progression de la révision',
              'Alertes sur les écritures inhabituelles',
              'Clôture d\'exercice avec archivage des soldes d\'ouverture'].map(f => <Feature key={f} text={f} />)}
          </View>

          <View style={S.highlight}>
            <Text style={S.highlightText}>
              Le module comptabilité supporte les exercices fiscaux décalés (non-calendaires).
              Chaque exercice peut être en statut BROUILLON → OUVERT → VERROUILLÉ → CLÔTURÉ.
              Les données sont isolées par exercice et par société.
            </Text>
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ═══ 5 — MODULE RH ══════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="Module Ressources Humaines" />
        <View style={S.body}>
          <SectionBanner num="05" title="Module Ressources Humaines" tag="Employés · Congés · Paie · Déclarations" />

          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Gestion des employés</Text>
              <View style={S.featureList}>
                {['Fiche employé complète (infos personnelles, poste, contrat)',
                  'Types de contrat : CDI, CDD, Stage, Freelance',
                  'Organigramme hiérarchique visuel',
                  'Historique des postes et avenants',
                  'Gestion des pièces justificatives'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Contrats RH</Text>
              <View style={S.featureList}>
                {['Création et gestion des contrats de travail',
                  'Alertes d\'expiration et renouvellement',
                  'Périodes d\'essai avec dates de fin',
                  'Avenants et modifications contractuelles',
                  'Archivage et historique des contrats'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
          </View>

          <Text style={S.h2}>5.1 Congés & Absences</Text>
          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Gestion des demandes</Text>
              <View style={S.featureList}>
                {['Types : CP, RTT, Maladie, Maternité, Sans solde',
                  'Workflow : Soumis → Approuvé / Refusé',
                  'Calcul automatique du solde de congés',
                  'Calendrier mensuel et annuel des absences'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Planning</Text>
              <View style={S.featureList}>
                {['Vue hebdomadaire des plannings',
                  'Vue mensuelle consolidée',
                  'Gestion des horaires et shifts',
                  'Suivi des présences et retards'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
          </View>

          <Text style={S.h2}>5.2 Paie & Rémunération</Text>
          <View style={S.featureList}>
            {['Génération des bulletins de paie mensuels avec calculs automatiques',
              'Décomposition : Salaire brut, CNPS salarial (2.8%), IRPP, net à payer',
              'Charges patronales : CNPS (16.2%), FDFP (1.5%), allocations familiales',
              'Export PDF des bulletins de paie individuels',
              'Virements salaires : bordereau de virement groupé',
              'Déclarations sociales CNPS mensuelles auto-calculées',
              'Historique des paies et archives par période'].map(f => <Feature key={f} text={f} />)}
          </View>

          <Text style={S.h2}>5.3 Évaluations de performance</Text>
          <View style={S.featureList}>
            {['Entretiens annuels d\'évaluation structurés',
              'Grilles d\'évaluation par compétences',
              'Objectifs et KPI individuels',
              'Historique des évaluations par employé'].map(f => <Feature key={f} text={f} />)}
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ═══ 6 — MODULE JURIDIQUE ══════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="Module Juridique" />
        <View style={S.body}>
          <SectionBanner num="06" title="Module Juridique" tag="Contrats · Signatures · RGPD · Conformité" />

          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Gestion des contrats</Text>
              <View style={S.featureList}>
                {['Types : Travail, Prestation, NDA, Partenariat, Bail, Fournisseur, Client',
                  'Workflow de signature électronique (token sécurisé)',
                  'Statuts : Actif / Expiré / Résilié / En révision',
                  'Alertes d\'expiration paramétrables (30/60/90 jours avant)',
                  'Bibliothèque de modèles de contrats réutilisables',
                  'Export PDF professionnel'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Conformité & Alertes</Text>
              <View style={S.featureList}>
                {['Tableau de bord de conformité avec score',
                  'Checklists de conformité par domaine',
                  'Alertes légales et réglementaires',
                  'Registre des documents légaux',
                  'Suivi des obligations contractuelles',
                  'Historique des actions de conformité'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
          </View>

          <Text style={S.h2}>6.1 RGPD & Protection des données</Text>
          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Registre des traitements</Text>
              <View style={S.featureList}>
                {['Inventaire des traitements de données personnelles',
                  'Base légale : consentement, contrat, obligation légale…',
                  'Durées de conservation des données',
                  'Sous-traitants et transferts hors UE'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Droits des personnes</Text>
              <View style={S.featureList}>
                {['Gestion des consentements (recueil, retrait)',
                  'Demandes d\'accès aux données (SAR)',
                  'Demandes de suppression (droit à l\'oubli)',
                  'Demandes de portabilité des données',
                  'Suivi et traçabilité des demandes'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ═══ 7 — MODULE ESG ════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="Module ESG & CSRD" />
        <View style={S.body}>
          <SectionBanner num="07" title="Module ESG & CSRD" tag="Environnement · Social · Gouvernance · Reporting" />

          <Text style={S.p}>
            Le module ESG permet aux entreprises de mesurer, suivre et reporter leurs indicateurs
            de performance extra-financière selon les référentiels CSRD, GRI et DPEF.
          </Text>

          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>🌱 Environnement</Text>
              <View style={S.featureList}>
                {['Consommation énergétique (électricité, gaz, fioul)',
                  'Émissions CO₂ : Scope 1, Scope 2, Scope 3',
                  'Gestion des déchets (recyclage, mise en décharge)',
                  'Consommation d\'eau',
                  'Bilan carbone annuel avec évolution'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>👥 Social</Text>
              <View style={S.featureList}>
                {['Indicateurs de diversité (genre, âge, origine)',
                  'Heures de formation par employé',
                  'Taux d\'accidents du travail',
                  'Index d\'égalité professionnelle',
                  'Taux de turnover et absentéisme'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
          </View>

          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>🏛 Gouvernance</Text>
              <View style={S.featureList}>
                {['Code d\'éthique et politiques anti-corruption',
                  'Composition du conseil d\'administration',
                  'Indépendance des administrateurs',
                  'Politique de rémunération des dirigeants',
                  'Audits internes et contrôle interne'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>📊 Plan d'action</Text>
              <View style={S.featureList}>
                {['Actions ESG avec propriétaire et échéance',
                  'KPI cibles vs réalisés',
                  'Priorité : Critique / Haute / Moyenne / Faible',
                  'Tableau de bord de progression',
                  'Évaluation des risques ESG'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
          </View>

          <Text style={S.h2}>7.1 Reporting ESG</Text>
          <View style={S.table}>
            <View style={S.tableHead}>
              {['Rapport', 'Référentiel', 'Format', 'Fréquence'].map(h => (
                <Text key={h} style={S.tableHeadCell}>{h}</Text>
              ))}
            </View>
            {[
              ['Rapport ESG complet', 'GRI Standards', 'PDF multi-pages', 'Annuel'],
              ['CSRD Compliance', 'CSRD / ESRS', 'PDF structuré', 'Annuel'],
              ['DPEF', 'Code de commerce FR', 'PDF légal', 'Annuel'],
              ['Benchmark sectoriel', 'Propriétaire', 'Dashboard + PDF', 'À la demande'],
            ].map(([r, ref, f, fq], i) => (
              <View key={r} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={S.tableCellBold}>{r}</Text>
                <Text style={S.tableCell}>{ref}</Text>
                <Text style={S.tableCell}>{f}</Text>
                <Text style={S.tableCell}>{fq}</Text>
              </View>
            ))}
          </View>

          <View style={S.highlight}>
            <Text style={S.highlightText}>
              Le score ESG est calculé automatiquement sur 100 points (E: 40pts, S: 35pts, G: 25pts).
              Le module intègre un outil de benchmark pour comparer la performance de l'entreprise
              face à ses pairs sectoriels.
            </Text>
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ═══ 8 — MODULE FISCALITÉ ══════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="Module Fiscalité" />
        <View style={S.body}>
          <SectionBanner num="08" title="Module Fiscalité" tag="TVA · IS · CNPS · Calendrier · Cameroun" />

          <Text style={S.p}>
            Module spécialisé pour les obligations fiscales et sociales du Cameroun, avec support
            des différents régimes d'imposition (Réel Normal, Réel Simplifié, IGS, Forfait).
          </Text>

          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>TVA (Taxe sur la Valeur Ajoutée)</Text>
              <View style={S.featureList}>
                {['Taux TVA Cameroun : 19,25% (configurable)',
                  'Périodicité : mensuelle ou trimestrielle',
                  'Calcul automatique depuis les factures',
                  'Déclaration 0 (si CA nul)',
                  'Historique complet des déclarations',
                  'Export PDF de la déclaration'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>IS (Impôt sur les Sociétés)</Text>
              <View style={S.featureList}>
                {['Taux IS Cameroun : 33% (Réel Normal)',
                  'Calcul du résultat fiscal imposable',
                  'Acomptes provisionnels trimestriels',
                  'Minimum de perception (impôt minimum forfaitaire)',
                  'Historique des déclarations annuelles',
                  'Export PDF de la liasse fiscale'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
          </View>

          <Text style={S.h2}>8.1 Charges sociales & Parafiscales</Text>
          <View style={S.table}>
            <View style={S.tableHead}>
              {['Taxe / Prélèvement', 'Taux', 'Fréquence', 'Bénéficiaire'].map(h => (
                <Text key={h} style={S.tableHeadCell}>{h}</Text>
              ))}
            </View>
            {[
              ['CNPS Patronal', '16,2% masse salariale', 'Mensuel', 'CNPS Cameroun'],
              ['CNPS Salarial', '2,8% salaire brut', 'Mensuel', 'CNPS Cameroun'],
              ['FDFP Patronal', '1,5% masse salariale', 'Mensuel', 'FDFP'],
              ['FDFP Salarial', '0,5% salaire brut', 'Mensuel', 'FDFP'],
              ['Patente', 'Variable selon CA', 'Annuel (fin fév.)', 'DGI'],
              ['RAS (Retenues à la source)', 'Variable', 'Mensuel', 'DGI'],
              ['DSF (Déclaration Stat. Fiscale)', 'Déclaratif', 'Annuel (15 mars)', 'DGI / INS'],
            ].map(([t, tx, f, b], i) => (
              <View key={t} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={S.tableCellBold}>{t}</Text>
                <Text style={S.tableCell}>{tx}</Text>
                <Text style={S.tableCell}>{f}</Text>
                <Text style={S.tableCell}>{b}</Text>
              </View>
            ))}
          </View>

          <Text style={S.h2}>8.2 Calendrier fiscal</Text>
          <View style={S.featureList}>
            {['Calendrier annuel de toutes les échéances fiscales et sociales',
              'Alertes automatiques avant chaque échéance (J-30, J-15, J-7)',
              'Calcul automatique du dernier jour ouvrable pour chaque déclaration',
              'Vue mensuelle avec filtrage par type de déclaration',
              'Export PDF du planning fiscal annuel',
              'Support des exercices décalés'].map(f => <Feature key={f} text={f} />)}
          </View>

          <View style={S.highlight}>
            <Text style={S.highlightText}>
              Le module fiscal détecte automatiquement le régime d'imposition applicable (IGS, Réel Normal,
              Réel Simplifié, Forfait) selon le chiffre d'affaires de la société et propose les obligations
              déclaratives correspondantes.
            </Text>
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ═══ 9 — MODULE CABINET ════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="Cabinet Comptable & Finance personnelle" />
        <View style={S.body}>
          <SectionBanner num="09" title="Module Cabinet Comptable" tag="Multi-mandats · Portefeuille · Accès délégué" />

          <Text style={S.p}>
            Le module Cabinet permet aux experts-comptables et cabinets d'audit de gérer un
            portefeuille de sociétés clientes, avec accès délégué contrôlé par type de mandat.
          </Text>

          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Portefeuille clients</Text>
              <View style={S.featureList}>
                {['Vue consolidée de toutes les sociétés mandatées',
                  'KPIs synthétiques par client (CA, trésorerie, statut)',
                  'Alertes sur les échéances fiscales de chaque client',
                  'Basculement rapide entre les contextes société',
                  'Tableau de bord cabinet avec statistiques globales'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Gestion des mandats</Text>
              <View style={S.featureList}>
                {['Types de mandat : Complet, Comptabilité, Gestion, Déclarations',
                  'Invitation des sociétés avec workflow d\'acceptation',
                  'Droits par module selon le type de mandat',
                  'Rôle cabinet : ADMIN, COMPTABLE, LECTEUR',
                  'Révocation et modification des mandats'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
          </View>

          <View style={S.divider} />

          <SectionBanner num="10" title="Module Finance Personnelle" tag="Tableau de bord · Dépenses · Épargne" />

          <Text style={S.p}>
            Espace personnel isolé pour les dirigeants et collaborateurs souhaitant gérer
            leurs finances personnelles en parallèle de leurs activités professionnelles.
          </Text>

          <View style={S.row2}>
            {[
              { title: 'Tableau de bord', items: ['Solde patrimonial global', 'Graphiques revenus vs dépenses', 'Progression objectifs d\'épargne'] },
              { title: 'Dépenses & Revenus', items: ['Catégorisation des dépenses', 'Sources de revenus multiples', 'Historique et recherche'] },
              { title: 'Objectifs d\'épargne', items: ['Création d\'objectifs avec montant cible', 'Suivi de progression', 'Comptes d\'épargne dédiés'] },
            ].map(b => (
              <View key={b.title} style={[S.card, { flex: 1 }]}>
                <Text style={S.cardTitle}>{b.title}</Text>
                <View style={S.featureList}>{b.items.map(i => <Feature key={i} text={i} />)}</View>
              </View>
            ))}
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ═══ 11 — AUTH & SETTINGS ══════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="Authentification & Paramètres" />
        <View style={S.body}>
          <SectionBanner num="11" title="Authentification & Paramètres" tag="Sécurité · RBAC · Multi-agences" />

          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Authentification</Text>
              <View style={S.featureList}>
                {['Inscription avec vérification email',
                  'Connexion email/mot de passe',
                  'Connexion Google (OAuth SSO)',
                  'Double authentification TOTP (Google Authenticator, Authy)',
                  'Réinitialisation de mot de passe sécurisée',
                  'Tokens JWT + Refresh tokens rotatifs',
                  'Déconnexion de tous les appareils'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Gestion des utilisateurs</Text>
              <View style={S.featureList}>
                {['Invitation par email avec rôle prédéfini',
                  'Rôles standards : ADMIN, MANAGER, USER, READONLY',
                  'Rôles personnalisés avec permissions granulaires',
                  'Affectation par agence',
                  'Désactivation / Suppression de compte',
                  'Journal des connexions et actions'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
          </View>

          <Text style={S.h2}>11.1 Paramétrage société</Text>
          <View style={S.row2}>
            {[
              { title: 'Informations société', items: ['Raison sociale, NIU, RCCM', 'Logo et charte graphique', 'Adresse et contacts', 'Secteur d\'activité'] },
              { title: 'Comptabilité & Fiscalité', items: ['Zone comptable (OHADA/FRANCE/IFRS)', 'Taux TVA par défaut', 'Régime d\'imposition', 'Exercice fiscal (dates)'] },
              { title: 'Multi-agences', items: ['Création d\'agences/succursales', 'Affectation utilisateurs par agence', 'Stocks et documents par agence', 'Consolidation multi-agences'] },
              { title: 'Localisation', items: ['Devise par défaut (XAF, EUR, USD)', 'Fuseau horaire', 'Format de date et heure', 'Langue interface (FR)'] },
            ].map(b => (
              <View key={b.title} style={[S.card, { flex: 1 }]}>
                <Text style={S.cardTitle}>{b.title}</Text>
                <View style={S.featureList}>{b.items.map(i => <Feature key={i} text={i} />)}</View>
              </View>
            ))}
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* ═══ 12 & 13 — TRANSVERSAL & SÉCURITÉ ══════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <PageHeader title="Fonctionnalités transversales & Sécurité" />
        <View style={S.body}>
          <SectionBanner num="12" title="Fonctionnalités transversales" tag="PDF · QR · IA · Exports · Notifications" />

          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Génération PDF & QR Codes</Text>
              <View style={S.featureList}>
                {['Export PDF pour tous les documents : factures, devis, bulletins, rapports',
                  'QR code de vérification sur chaque document (encode toutes les métadonnées)',
                  'Impression HTML haute fidélité (documents commerciaux)',
                  'react-pdf/renderer pour les rapports structurés',
                  'Nommage automatique des fichiers'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>IA & Assistance</Text>
              <View style={S.featureList}>
                {['Widget IA contextuel (AiWidget)',
                  'Conversations scoped par société',
                  'Assistance à l\'analyse financière',
                  'Suggestions intelligentes',
                  'Historique des conversations'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
          </View>

          <View style={S.row2}>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Exports & Imports de données</Text>
              <View style={S.featureList}>
                {['Import CSV pour factures, clients, fournisseurs',
                  'Export FEC (Fichier des Écritures Comptables)',
                  'Export Excel pour tableaux de bord',
                  'Export PDF pour tous les états',
                  'Sauvegarde et restauration des données'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
            <View style={[S.card, { flex: 1 }]}>
              <Text style={S.cardTitle}>Notifications & Alertes</Text>
              <View style={S.featureList}>
                {['Alertes d\'échéances fiscales (30/15/7 jours avant)',
                  'Notifications de contrats expirants',
                  'Alertes de stock bas',
                  'Relances automatiques clients (factures en retard)',
                  'Emails transactionnels (SMTP)'].map(f => <Feature key={f} text={f} />)}
              </View>
            </View>
          </View>

          <View style={S.divider} />

          <SectionBanner num="13" title="Sécurité & Conformité" tag="RGPD · RBAC · Audit · Chiffrement" />

          <View style={S.table}>
            <View style={S.tableHead}>
              {['Mesure de sécurité', 'Description', 'Niveau'].map(h => (
                <Text key={h} style={S.tableHeadCell}>{h}</Text>
              ))}
            </View>
            {[
              ['Authentification forte', 'TOTP 2FA + tokens JWT rotatifs', '🔒 Critique'],
              ['Chiffrement mots de passe', 'Bcrypt avec salt (facteur 12)', '🔒 Critique'],
              ['Isolation multi-tenant', 'Filtrage par companyId à chaque requête', '🔒 Critique'],
              ['RBAC granulaire', 'Rôles et permissions par module et agence', '⚡ Élevé'],
              ['Protection HTTP', 'Helmet.js : CSP, HSTS, XSS, CSRF prevention', '⚡ Élevé'],
              ['Rate limiting', 'Limitation des requêtes par IP et utilisateur', '⚡ Élevé'],
              ['Audit logging', 'Journal des actions critiques (auth, modifications)', '⚡ Élevé'],
              ['Politique de sécurité', 'Complexité mot de passe, durée de session', '📋 Standard'],
              ['Monitoring erreurs', 'Sentry : alertes temps réel + stack traces', '📋 Standard'],
              ['Validation des données', 'Zod (backend) + TypeScript strict (frontend)', '📋 Standard'],
            ].map(([m, d, n], i) => (
              <View key={m} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={S.tableCellBold}>{m}</Text>
                <Text style={S.tableCell}>{d}</Text>
                <Text style={S.tableCell}>{n}</Text>
              </View>
            ))}
          </View>

          <View style={S.highlight}>
            <Text style={S.highlightText}>
              Trois vulnérabilités critiques identifiées et corrigées en mai 2026 :
              (1) Élévation de privilèges sur switchToCompany (rôle hardcodé ADMIN),
              (2) IDOR sur acceptation/rejet d'invitation cabinet,
              (3) Accès admin par rôle société au lieu de platformRole SUPER_ADMIN.
              Toutes corrigées dans le commit de sécurité 8eab4c0.
            </Text>
          </View>
        </View>
        <PageFooter />
      </Page>

    </Document>
  )
}
