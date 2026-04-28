/**
 * EtatsFinanciersPdf
 *
 * Modèles d'impression réglementaires par zone comptable :
 *  - OHADA  → SYSCOHADA révisé (Acte Uniforme OHADA 2017)
 *  - FRANCE → Plan Comptable Général (PCG — Règlement ANC 2014-03)
 *  - IFRS   → IAS 1 (Présentation des états financiers — révision 2007)
 */
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { FinancialStatements, FSPair } from '@/services/accountingApi'

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
  ohada:   { dark: '#1b5e20', mid: '#2e7d32', light: '#e8f5e9', line: '#a5d6a7' },
  pcg:     { dark: '#0d47a1', mid: '#1565c0', light: '#e3f2fd', line: '#90caf9' },
  ifrs:    { dark: '#4a148c', mid: '#6a1b9a', light: '#f3e5f5', line: '#ce93d8' },
  neutral: { dark: '#37474f', mid: '#546e7a', light: '#eceff1', line: '#b0bec5' },
}

// ── Shared styles ─────────────────────────────────────────────────────────────

function makeStyles(primary: typeof C.ohada) {
  return StyleSheet.create({
    page:      { fontFamily: 'Helvetica', fontSize: 7.5, padding: '18 22', backgroundColor: '#fff', color: '#111' },
    coverBand: { backgroundColor: primary.dark, color: '#fff', padding: '8 12', marginBottom: 2 },
    coverTitle:{ fontFamily: 'Helvetica-Bold', fontSize: 13, letterSpacing: 0.5 },
    coverSub:  { fontSize: 7.5, marginTop: 2, color: '#d0f0c0', opacity: 0.9 },
    infoRow:   { flexDirection: 'row', gap: 16, fontSize: 7, color: '#555', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: primary.line, marginBottom: 6 },
    infoItem:  { flexDirection: 'row', gap: 3 },
    infoLabel: { fontFamily: 'Helvetica-Bold' },
    section:   { backgroundColor: primary.dark, color: '#fff', padding: '3 6', fontFamily: 'Helvetica-Bold', fontSize: 7.5, marginTop: 10, marginBottom: 0 },
    subSection:{ backgroundColor: primary.mid, color: '#fff', padding: '2 6', fontSize: 7, fontFamily: 'Helvetica-Bold' },
    th:        { flexDirection: 'row', backgroundColor: primary.light, borderBottomWidth: 0.8, borderBottomColor: primary.dark, padding: '2.5 5' },
    thTxt:     { fontFamily: 'Helvetica-Bold', fontSize: 6.5 },
    row:       { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: '#e0e0e0', padding: '2 5' },
    rowAlt:    { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: '#e0e0e0', padding: '2 5', backgroundColor: '#fafafa' },
    rowBold:   { flexDirection: 'row', borderBottomWidth: 0.7, borderBottomColor: '#999', padding: '2.5 5', backgroundColor: primary.light },
    rowTotal:  { flexDirection: 'row', backgroundColor: primary.dark, padding: '3 5' },
    totalTxt:  { color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
    table:     { borderWidth: 0.5, borderColor: primary.line },
    grid2:     { flexDirection: 'row', gap: 8, marginTop: 0 },
    col:       { flex: 1 },
    note:      { backgroundColor: '#fffde7', borderWidth: 0.5, borderColor: '#f9a825', padding: '4 8', marginTop: 8, fontSize: 7, color: '#555' },
    footer:    { position: 'absolute', bottom: 10, left: 22, right: 22, fontSize: 6, color: '#aaa', textAlign: 'center', borderTopWidth: 0.3, borderTopColor: '#ddd', paddingTop: 3 },
    legalMention: { fontSize: 6.5, color: '#777', marginTop: 6, fontStyle: 'italic' },
  })
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const fmtN = (n: number) => n === 0 ? '—' : (n < 0 ? `(${Math.abs(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 })})` : n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }))

type S = ReturnType<typeof makeStyles>

interface RowDef {
  label:    string
  ref?:     string
  values?:  FSPair | undefined
  bold?:    boolean
  indent?:  number
  section?: boolean
  sub?:     boolean
  total?:   boolean
}

function TableBlock({ S: s, title, rows, year, prevYear, showVar = false }: {
  S: S; title: string; rows: RowDef[]; year: number; prevYear: number; showVar?: boolean
}) {
  return (
    <View>
      <Text style={s.section}>{title}</Text>
      <View style={s.table}>
        <View style={s.th}>
          <Text style={{ ...s.thTxt, flex: 1 }}>Libellé</Text>
          {rows.some(r => r.ref) && <Text style={{ ...s.thTxt, width: 22 }}>Réf.</Text>}
          <Text style={{ ...s.thTxt, width: 62, textAlign: 'right' }}>N ({year})</Text>
          <Text style={{ ...s.thTxt, width: 62, textAlign: 'right' }}>N-1 ({prevYear})</Text>
          {showVar && <Text style={{ ...s.thTxt, width: 38, textAlign: 'right' }}>Var. %</Text>}
        </View>
        {rows.map((row, i) => {
          if (row.section) {
            return (
              <View key={i} style={s.subSection}>
                <Text>{row.label}</Text>
              </View>
            )
          }
          if (row.total) {
            return (
              <View key={i} style={s.rowTotal}>
                <Text style={{ ...s.totalTxt, flex: 1, paddingLeft: (row.indent ?? 0) * 8 }}>{row.label}</Text>
                {row.ref && <Text style={{ ...s.totalTxt, width: 22 }}>{row.ref}</Text>}
                <Text style={{ ...s.totalTxt, width: 62, textAlign: 'right' }}>{row.values ? fmtN(row.values.n) : ''}</Text>
                <Text style={{ ...s.totalTxt, width: 62, textAlign: 'right' }}>{row.values ? fmtN(row.values.nm1) : ''}</Text>
                {showVar && <Text style={{ ...s.totalTxt, width: 38, textAlign: 'right' }}></Text>}
              </View>
            )
          }
          const style = row.bold ? s.rowBold : i % 2 === 0 ? s.row : s.rowAlt
          const varPct = showVar && row.values && row.values.nm1 !== 0
            ? (((row.values.n - row.values.nm1) / Math.abs(row.values.nm1)) * 100).toFixed(1) + '%'
            : ''
          return (
            <View key={i} style={style}>
              <Text style={{ flex: 1, paddingLeft: (row.indent ?? 0) * 8, fontFamily: row.bold ? 'Helvetica-Bold' : 'Helvetica' }}>
                {row.label}
              </Text>
              {rows.some(r => r.ref) && <Text style={{ width: 22, fontSize: 6, color: '#888' }}>{row.ref ?? ''}</Text>}
              <Text style={{ width: 62, textAlign: 'right', fontFamily: row.bold ? 'Helvetica-Bold' : 'Helvetica' }}>
                {row.values !== undefined ? fmtN(row.values.n) : ''}
              </Text>
              <Text style={{ width: 62, textAlign: 'right', color: '#666' }}>
                {row.values !== undefined ? fmtN(row.values.nm1) : ''}
              </Text>
              {showVar && <Text style={{ width: 38, textAlign: 'right', color: '#888', fontSize: 6.5 }}>{varPct}</Text>}
            </View>
          )
        })}
      </View>
    </View>
  )
}

function CompanyHeader({ S: s, fs, zoneLabel, refText }: { S: S; fs: FinancialStatements; zoneLabel: string; refText: string }) {
  return (
    <View style={s.coverBand}>
      <Text style={s.coverTitle}>{zoneLabel}</Text>
      <Text style={s.coverSub}>Exercice {fs.year} | Comparatif N-1 ({fs.prevYear}) | {fs.entryCount} écritures | Statut : {fs.status}</Text>
      <Text style={{ ...s.coverSub, marginTop: 2, fontSize: 6.5 }}>{refText}</Text>
    </View>
  )
}

// ── OHADA — SYSCOHADA révisé ──────────────────────────────────────────────────

function OhadaDoc({ fs }: { fs: FinancialStatements }) {
  const s  = makeStyles(C.ohada)
  const a  = fs.bilan?.actif  as Record<string, FSPair> | undefined
  const p  = fs.bilan?.passif as Record<string, FSPair> | undefined
  const pr = fs.compteDeResultat?.produits as Record<string, FSPair> | undefined
  const ch = fs.compteDeResultat?.charges  as Record<string, FSPair> | undefined
  const res = fs.compteDeResultat?.resultat as FSPair | undefined
  const tf  = fs.tafire as Record<string, FSPair> | undefined

  const bilanRows: RowDef[] = a ? [
    { label: 'ACTIF IMMOBILISÉ', section: true },
    { label: 'Charges immobilisées',              ref: 'AA', values: a['chargesImmobilisees'],          indent: 1 },
    { label: 'Immobilisations incorporelles',      ref: 'AB', values: a['immobilisationsIncorporelles'], indent: 1 },
    { label: 'Terrains',                            ref: 'AC', values: a['terrains'],                     indent: 1 },
    { label: 'Bâtiments & agencements',             ref: 'AD', values: a['batimentsAgencements'],         indent: 1 },
    { label: 'Matériel & équipement',               ref: 'AE', values: a['materielEquipement'],           indent: 1 },
    { label: 'Matériel de transport',               ref: 'AF', values: a['materielTransport'],            indent: 1 },
    { label: 'Autres immobilisations',              ref: 'AG', values: a['autresImmobilisations'],        indent: 1 },
    { label: 'Avances & acomptes / immo.',          ref: 'AH', values: a['avancesAcomptesImmo'],          indent: 1 },
    { label: 'TOTAL ACTIF IMMOBILISÉ',              ref: 'AI', values: a['totalActifImmobilise'],         bold: true },
    { label: 'ACTIF CIRCULANT', section: true },
    { label: 'Stocks',                              ref: 'BA', values: a['stocks'],                       indent: 1 },
    { label: 'Créances clients et comptes rattachés',ref:'BB', values: a['creancesClients'],              indent: 1 },
    { label: 'Autres créances',                     ref: 'BC', values: a['autresCreances'],               indent: 1 },
    { label: 'Trésorerie active',                   ref: 'BD', values: a['tresorerie'],                   indent: 1 },
    { label: 'TOTAL ACTIF CIRCULANT',               ref: 'BE', values: a['totalActifCirculant'],          bold: true },
    { label: 'TOTAL ACTIF',                         ref: 'BF', values: a['totalActif'],                   total: true },
  ] : []

  const passifRows: RowDef[] = p ? [
    { label: 'CAPITAUX PROPRES ET RESSOURCES ASSIMILÉES', section: true },
    { label: 'Capital social',                      ref: 'CA', values: p['capitalSocial'],                indent: 1 },
    { label: 'Réserves',                            ref: 'CB', values: p['reserves'],                     indent: 1 },
    { label: 'Report à nouveau',                    ref: 'CC', values: p['reportANouveau'],               indent: 1 },
    { label: 'Résultat net de l\'exercice',         ref: 'CD', values: p['resultatNet'],                  indent: 1 },
    { label: 'Subventions d\'investissement',       ref: 'CE', values: p['subventionsInvestissement'],    indent: 1 },
    { label: 'TOTAL CAPITAUX PROPRES',              ref: 'CF', values: p['totalCapitauxPropres'],         bold: true },
    { label: 'DETTES FINANCIÈRES ET RESSOURCES ASSIMILÉES', section: true },
    { label: 'Emprunts et dettes financières LT',  ref: 'DA', values: p['dettesLongTerme'],              indent: 1 },
    { label: 'Dettes à court terme',                ref: 'DB', values: p['dettesCurtTerme'],              indent: 1 },
    { label: 'TOTAL PASSIF',                        ref: 'DC', values: p['totalPassif'],                  total: true },
  ] : []

  const crRows: RowDef[] = pr && ch ? [
    { label: 'PRODUITS D\'EXPLOITATION', section: true },
    { label: 'Chiffre d\'affaires',                 ref: 'RA', values: pr['chiffreAffaires'],             indent: 1 },
    { label: 'Autres produits',                     ref: 'RB', values: pr['autresProduits'],              indent: 1 },
    { label: 'Produits financiers',                 ref: 'RC', values: pr['produitsFinanciers'],          indent: 1 },
    { label: 'TOTAL PRODUITS',                      ref: 'RD', values: pr['totalProduits'],               bold: true },
    { label: 'CHARGES D\'EXPLOITATION', section: true },
    { label: 'Achats consommés',                    ref: 'TA', values: ch['achatsConsommes'],             indent: 1 },
    { label: 'Charges de personnel',                ref: 'TB', values: ch['chargesPersonnel'],            indent: 1 },
    { label: 'Transports',                          ref: 'TC', values: ch['transports'],                  indent: 1 },
    { label: 'Autres charges',                      ref: 'TD', values: ch['autresCharges'],               indent: 1 },
    { label: 'Dotations aux amortissements',        ref: 'TE', values: ch['dotations'],                   indent: 1 },
    { label: 'Charges financières',                 ref: 'TF', values: ch['chargesFinancieres'],          indent: 1 },
    { label: 'Impôt sur le résultat (IS/IRPP)',     ref: 'TG', values: ch['impotSurResultat'],            indent: 1 },
    { label: 'TOTAL CHARGES',                       ref: 'TH', values: ch['totalCharges'],                bold: true },
    { label: 'RÉSULTAT NET DE L\'EXERCICE',         ref: 'TI', values: res,                              total: true },
  ] : []

  const tafireRows: RowDef[] = tf ? [
    { label: 'FLUX D\'EXPLOITATION', section: true },
    { label: 'Capacité d\'autofinancement brute (CAF)',values: tf['cafBrute'],         indent: 1 },
    { label: 'Variation des stocks',                    values: tf['variationStocks'], indent: 1 },
    { label: 'FLUX NET D\'EXPLOITATION',                values: tf['fluxExploitation'],bold: true },
    { label: 'FLUX D\'INVESTISSEMENT', section: true },
    { label: 'Acquisitions d\'immobilisations',         values: tf['investissements'], indent: 1 },
    { label: 'FLUX D\'INVESTISSEMENT NET',              values: tf['fluxInvestissement'] ?? { n: 0, nm1: 0 }, bold: true },
    { label: 'FLUX DE FINANCEMENT', section: true },
    { label: 'Variation des dettes financières',        values: tf['financements'],    indent: 1 },
    { label: 'FLUX DE FINANCEMENT NET',                 values: tf['fluxFinancement'] ?? { n: 0, nm1: 0 }, bold: true },
    { label: 'VARIATION NETTE DE TRÉSORERIE',           values: tf['variationTresorerie'], total: true },
  ] : []

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        <CompanyHeader S={s} fs={fs}
          zoneLabel="ÉTATS FINANCIERS SYSCOHADA — Acte Uniforme OHADA (révisé 2017)"
          refText="Établi conformément au Système Comptable OHADA — SYSCOHADA révisé | Acte Uniforme relatif au Droit Comptable et à l'Information Financière"
        />

        {/* Bilan côte à côte */}
        {(a || p) && (
          <View style={s.grid2}>
            {a && <View style={s.col}><TableBlock S={s} title="BILAN — ACTIF" rows={bilanRows} year={fs.year} prevYear={fs.prevYear} /></View>}
            {p && <View style={s.col}><TableBlock S={s} title="BILAN — PASSIF" rows={passifRows} year={fs.year} prevYear={fs.prevYear} /></View>}
          </View>
        )}

        {/* Compte de résultat */}
        {crRows.length > 0 && (
          <TableBlock S={s} title="COMPTE DE RÉSULTAT — PRÉSENTATION FONCTIONNELLE" rows={crRows} year={fs.year} prevYear={fs.prevYear} showVar />
        )}

        {/* TAFIRE */}
        {tafireRows.length > 0 && (
          <TableBlock S={s} title="TAFIRE — Tableau de Financement par les Ressources" rows={tafireRows} year={fs.year} prevYear={fs.prevYear} />
        )}

        {/* Note légale OHADA */}
        <View style={s.note}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>Notes annexes requises (SYSCOHADA) :</Text>
          {[
            'Note 1 — Règles et méthodes comptables applicables',
            'Note 2 — Tableau des immobilisations et amortissements (réf. AI)',
            'Note 3 — État des provisions pour risques et charges',
            'Note 4 — Tableau des créances et dettes (réf. BB/DB)',
            'Note 5 — Charges à payer et produits à recevoir',
            'Note 6 — Effectifs et charges de personnel',
            'Note 7 — Engagements hors bilan (cautions, avals)',
            'Note 8 — Tableau de passage du résultat à la CAF',
          ].map(n => <Text key={n} style={{ marginTop: 1 }}>• {n}</Text>)}
        </View>

        <Text style={s.legalMention}>
          Document établi conformément à l'Acte Uniforme de l'OHADA relatif au Droit Comptable et à l'Information Financière (AUDCIF).
          Les états financiers doivent être certifiés par un Commissaire aux Comptes agréé (si applicable).
          Exercice {fs.year} — Généré le {new Date().toLocaleDateString('fr-FR')}.
        </Text>

        <Text style={s.footer} render={({ pageNumber, totalPages }) =>
          `SYSCOHADA — États financiers ${fs.year} — Page ${pageNumber}/${totalPages} — Généré le ${new Date().toLocaleString('fr-FR')}`
        } fixed />
      </Page>
    </Document>
  )
}

// ── France — Plan Comptable Général ──────────────────────────────────────────

function FranceDoc({ fs }: { fs: FinancialStatements }) {
  const s  = makeStyles(C.pcg)
  const a  = fs.bilan?.actif  as Record<string, FSPair> | undefined
  const p  = fs.bilan?.passif as Record<string, FSPair> | undefined
  const pr = fs.compteDeResultat?.produits as Record<string, FSPair> | undefined
  const ch = fs.compteDeResultat?.charges  as Record<string, FSPair> | undefined
  const res = fs.compteDeResultat?.resultatNet as FSPair | undefined

  const actifRows: RowDef[] = a ? [
    { label: 'ACTIF IMMOBILISÉ', section: true },
    { label: 'Immobilisations incorporelles',       values: a['immobilisationsIncorporelles'], indent: 1 },
    { label: 'Immobilisations corporelles',         values: a['immobilisationsCorporelles'],   indent: 1 },
    { label: 'Immobilisations financières',         values: a['immobilisationsFinancieres'],   indent: 1 },
    { label: 'Total actif immobilisé',              values: a['totalActifImmobilise'],          bold: true },
    { label: 'ACTIF CIRCULANT', section: true },
    { label: 'Stocks et en-cours',                  values: a['stocks'],                        indent: 1 },
    { label: 'Créances clients et comptes rattachés',values: a['creancesClients'],              indent: 1 },
    { label: 'Autres créances',                     values: a['autresCreances'],                indent: 1 },
    { label: 'Disponibilités (trésorerie)',          values: a['tresorerie'],                    indent: 1 },
    { label: 'Total actif circulant',               values: a['totalActifCirculant'],           bold: true },
    { label: 'TOTAL ACTIF (I + II)',                values: a['totalActif'],                    total: true },
  ] : []

  const passifRows: RowDef[] = p ? [
    { label: 'CAPITAUX PROPRES', section: true },
    { label: 'Capital social (ou individuel)',      values: p['capital'],                       indent: 1 },
    { label: 'Réserves',                            values: p['reserves'],                      indent: 1 },
    { label: 'Report à nouveau',                    values: p['reportANouveau'],                indent: 1 },
    { label: 'Résultat de l\'exercice',             values: p['resultatExercice'],              indent: 1 },
    { label: 'Total capitaux propres',              values: p['totalCapitauxPropres'],          bold: true },
    { label: 'Provisions pour risques et charges',  values: p['provisions'],                    indent: 1 },
    { label: 'DETTES', section: true },
    { label: 'Emprunts et dettes financières',      values: p['emprunts'],                      indent: 1 },
    { label: 'Dettes fournisseurs et comptes ratt.',values: p['dettesFournisseurs'],            indent: 1 },
    { label: 'Dettes fiscales et sociales',         values: p['dettesFiscalesSociales'],        indent: 1 },
    { label: 'Autres dettes',                       values: p['autresDettes'],                  indent: 1 },
    { label: 'Total dettes',                        values: p['totalDettes'],                   bold: true },
    { label: 'TOTAL PASSIF',                        values: p['totalPassif'],                   total: true },
  ] : []

  const crRows: RowDef[] = pr && ch ? [
    { label: 'PRODUITS D\'EXPLOITATION', section: true },
    { label: 'Ventes de marchandises / productions', values: pr['ventesEtProductions'],        indent: 1 },
    { label: 'Autres produits d\'exploitation',     values: pr['autresProduits'],              indent: 1 },
    { label: 'Produits financiers',                 values: pr['produitsFinanciers'],          indent: 1 },
    { label: 'Produits exceptionnels',              values: pr['produitsExceptionnels'],       indent: 1 },
    { label: 'Reprises sur provisions',             values: pr['reprisesSurProvisions'],       indent: 1 },
    { label: 'TOTAL PRODUITS',                      values: pr['totalProduits'],               bold: true },
    { label: 'CHARGES D\'EXPLOITATION', section: true },
    { label: 'Achats de marchandises (60)',         values: ch['achatsMarchandises'],          indent: 1 },
    { label: 'Autres achats et charges externes',   values: ch['autresAchats'],               indent: 1 },
    { label: 'Impôts, taxes et versements assimilés',values: ch['impotsTaxes'],               indent: 1 },
    { label: 'Salaires et traitements (641)',       values: ch['chargesPersonnel'],            indent: 1 },
    { label: 'Dotations aux amortissements (68)',   values: ch['dotationsAmortissements'],     indent: 1 },
    { label: 'Autres charges',                      values: ch['autresCharges'],              indent: 1 },
    { label: 'Charges financières',                 values: ch['chargesFinancieres'],          indent: 1 },
    { label: 'Charges exceptionnelles',             values: ch['chargesExceptionnelles'],      indent: 1 },
    { label: 'Impôt sur les bénéfices (695)',       values: ch['impotBenefices'],              indent: 1 },
    { label: 'TOTAL CHARGES',                       values: ch['totalCharges'],               bold: true },
    { label: 'RÉSULTAT NET DE L\'EXERCICE',         values: res,                              total: true },
  ] : []

  const net = res?.n ?? 0

  const affectRows: RowDef[] = [
    { label: 'ORIGINE', section: true },
    { label: 'Résultat net de l\'exercice',         values: { n: net, nm1: res?.nm1 ?? 0 }, indent: 1 },
    { label: 'Report à nouveau antérieur',          values: { n: 0, nm1: 0 }, indent: 1 },
    { label: 'TOTAL À AFFECTER',                    values: { n: net, nm1: res?.nm1 ?? 0 }, bold: true },
    { label: 'AFFECTATION', section: true },
    { label: 'Réserve légale (5 % — art. L. 232-10)',values: { n: net > 0 ? +(net * 0.05).toFixed(0) : 0, nm1: 0 }, indent: 1 },
    { label: 'Autres réserves statutaires',         values: { n: 0, nm1: 0 }, indent: 1 },
    { label: 'Dividendes distribués',               values: { n: 0, nm1: 0 }, indent: 1 },
    { label: 'Report à nouveau',                    values: { n: net > 0 ? +(net * 0.95).toFixed(0) : net, nm1: 0 }, indent: 1 },
  ]

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        <CompanyHeader S={s} fs={fs}
          zoneLabel="ÉTATS FINANCIERS — Plan Comptable Général (PCG)"
          refText="Établi conformément au Règlement ANC n° 2014-03 relatif au PCG | Arrêté au 31 décembre — Comparatif N / N-1"
        />

        {/* Bilan */}
        {(a || p) && (
          <View style={s.grid2}>
            {a && <View style={s.col}><TableBlock S={s} title="BILAN — ACTIF (Cerfa 2050)" rows={actifRows} year={fs.year} prevYear={fs.prevYear} /></View>}
            {p && <View style={s.col}><TableBlock S={s} title="BILAN — PASSIF (Cerfa 2050)" rows={passifRows} year={fs.year} prevYear={fs.prevYear} /></View>}
          </View>
        )}
      </Page>

      <Page size="A4" style={s.page} wrap>
        {/* Compte de résultat */}
        {crRows.length > 0 && (
          <TableBlock S={s} title="COMPTE DE RÉSULTAT (Cerfa 2052 / 2053)" rows={crRows} year={fs.year} prevYear={fs.prevYear} showVar />
        )}

        {/* Affectation */}
        <TableBlock S={s} title="AFFECTATION DU RÉSULTAT" rows={affectRows} year={fs.year} prevYear={fs.prevYear} />

        {/* Note légale PCG */}
        <View style={s.note}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>Annexe et éléments complémentaires (art. L. 123-14 C. com.) :</Text>
          {[
            'Méthodes comptables et principes retenus (continuité d\'exploitation, coûts historiques)',
            'Tableau des immobilisations et amortissements (art. R. 123-200)',
            'État des provisions (dotations, reprises)',
            'Tableau des créances et dettes par échéance',
            'Tableau des engagements hors bilan (art. L. 233-23)',
            'Informations relatives aux parties liées (IAS 24 si applicable)',
            'Événements postérieurs à la clôture (art. L. 232-1)',
          ].map(n => <Text key={n} style={{ marginTop: 1 }}>• {n}</Text>)}
        </View>

        <Text style={s.legalMention}>
          Les présents états financiers ont été établis conformément aux dispositions du Code de commerce (art. L. 123-12 à L. 123-28)
          et du Plan Comptable Général (PCG — Règlement ANC n° 2014-03). Exercice {fs.year} — Généré le {new Date().toLocaleDateString('fr-FR')}.
        </Text>

        <Text style={s.footer} render={({ pageNumber, totalPages }) =>
          `PCG France — États financiers ${fs.year} — Page ${pageNumber}/${totalPages} — Généré le ${new Date().toLocaleString('fr-FR')}`
        } fixed />
      </Page>
    </Document>
  )
}

// ── IFRS ──────────────────────────────────────────────────────────────────────

function IfrsDoc({ fs }: { fs: FinancialStatements }) {
  const s   = makeStyles(C.ifrs)
  const as_ = fs.statementOfFinancialPosition?.assets              as Record<string, FSPair> | undefined
  const eq  = fs.statementOfFinancialPosition?.equityAndLiabilities as Record<string, FSPair> | undefined
  const pl  = fs.statementOfProfitOrLoss      as Record<string, FSPair> | undefined
  const cf  = fs.statementOfCashFlows         as Record<string, FSPair> | undefined
  const ce  = fs.statementOfChangesInEquity   as Record<string, FSPair> | undefined

  const assetRows: RowDef[] = as_ ? [
    { label: 'NON-CURRENT ASSETS', section: true },
    { label: 'Property, plant & equipment (IAS 16)',values: as_['ppe'],                      indent: 1 },
    { label: 'Intangible assets (IAS 38)',           values: as_['intangibleAssets'],         indent: 1 },
    { label: 'Financial investments (IAS 39)',       values: as_['investments'],              indent: 1 },
    { label: 'Deferred tax assets (IAS 12)',         values: as_['deferredTaxAssets'],        indent: 1 },
    { label: 'Total non-current assets',             values: as_['totalNonCurrentAssets'],    bold: true },
    { label: 'CURRENT ASSETS', section: true },
    { label: 'Inventories (IAS 2)',                  values: as_['inventories'],              indent: 1 },
    { label: 'Trade and other receivables',          values: as_['tradeAndOtherReceivables'], indent: 1 },
    { label: 'Cash and cash equivalents (IAS 7)',    values: as_['cashAndEquivalents'],       indent: 1 },
    { label: 'Total current assets',                 values: as_['totalCurrentAssets'],       bold: true },
    { label: 'TOTAL ASSETS',                         values: as_['totalAssets'],              total: true },
  ] : []

  const eqRows: RowDef[] = eq ? [
    { label: 'EQUITY', section: true },
    { label: 'Share capital',                        values: eq['shareCapital'],              indent: 1 },
    { label: 'Retained earnings',                    values: eq['retainedEarnings'],          indent: 1 },
    { label: 'Other equity components',              values: eq['otherEquity'],               indent: 1 },
    { label: 'Total equity',                         values: eq['totalEquity'],               bold: true },
    { label: 'NON-CURRENT LIABILITIES', section: true },
    { label: 'Borrowings — long term',               values: eq['borrowingsLongTerm'],        indent: 1 },
    { label: 'Deferred tax liabilities',             values: eq['deferredTaxLiabilities'],    indent: 1 },
    { label: 'Total non-current liabilities',        values: eq['totalNonCurrentLiabilities'],bold: true },
    { label: 'CURRENT LIABILITIES', section: true },
    { label: 'Trade and other payables',             values: eq['tradeAndOtherPayables'],     indent: 1 },
    { label: 'Other current liabilities',            values: eq['otherCurrentLiabilities'],   indent: 1 },
    { label: 'Total current liabilities',            values: eq['totalCurrentLiabilities'],   bold: true },
    { label: 'TOTAL EQUITY AND LIABILITIES',         values: eq['totalEquityAndLiabilities'], total: true },
  ] : []

  const plRows: RowDef[] = pl ? [
    { label: 'Revenue',                              values: pl['revenue'] },
    { label: 'Other income',                         values: pl['otherIncome'] },
    { label: 'Cost of sales',                        values: pl['costOfSales'],               indent: 1 },
    { label: 'Distribution & selling expenses',      values: pl['distributionSellingExpenses'],indent: 1 },
    { label: 'Administrative expenses',              values: pl['administrativeExpenses'],    indent: 1 },
    { label: 'Finance charges (IFRS 9)',             values: pl['financeCharges'],            indent: 1 },
    { label: 'Depreciation & amortisation',          values: pl['depreciationAmortisation'],  indent: 1 },
    { label: 'Income tax expense (IAS 12)',          values: pl['incomeTaxExpense'],          indent: 1 },
    { label: 'Total expenses',                       values: pl['totalExpenses'],             bold: true },
    { label: 'PROFIT / (LOSS) FOR THE YEAR',        values: pl['profitForYear'],             total: true },
  ] : []

  const cfRows: RowDef[] = cf ? [
    { label: 'OPERATING ACTIVITIES', section: true },
    { label: 'Cash generated from operations',       values: cf['operatingActivities'],       indent: 1 },
    { label: 'INVESTING ACTIVITIES', section: true },
    { label: 'Net cash from investing',              values: cf['investingActivities'],       indent: 1 },
    { label: 'FINANCING ACTIVITIES', section: true },
    { label: 'Net cash from financing',              values: cf['financingActivities'],       indent: 1 },
    { label: 'NET INCREASE IN CASH',                values: cf['netIncreaseInCash'],         bold: true },
    { label: 'Opening cash and equivalents',         values: cf['openingCash'] },
    { label: 'CLOSING CASH AND EQUIVALENTS',        values: cf['closingCash'],               total: true },
  ] : []

  const ceRows: RowDef[] = ce ? [
    { label: 'Equity at beginning of period',        values: ce['openingEquity'] },
    { label: 'Profit / (loss) for the year',         values: ce['profitForYear'],             indent: 1 },
    { label: 'Dividends paid',                       values: ce['dividendsPaid'],             indent: 1 },
    { label: 'Other comprehensive income',           values: ce['otherChanges'],              indent: 1 },
    { label: 'EQUITY AT END OF PERIOD',             values: ce['closingEquity'],             total: true },
  ] : []

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        <CompanyHeader S={s} fs={fs}
          zoneLabel="FINANCIAL STATEMENTS — International Financial Reporting Standards (IFRS)"
          refText="Prepared in accordance with IAS 1 (Presentation of Financial Statements) | IASB Standards as adopted"
        />

        <View style={s.grid2}>
          {as_ && <View style={s.col}><TableBlock S={s} title="STATEMENT OF FINANCIAL POSITION — ASSETS" rows={assetRows} year={fs.year} prevYear={fs.prevYear} /></View>}
          {eq  && <View style={s.col}><TableBlock S={s} title="EQUITY AND LIABILITIES" rows={eqRows} year={fs.year} prevYear={fs.prevYear} /></View>}
        </View>

        {pl && <TableBlock S={s} title="STATEMENT OF PROFIT OR LOSS (IAS 1)" rows={plRows} year={fs.year} prevYear={fs.prevYear} showVar />}
        {cf && <TableBlock S={s} title="STATEMENT OF CASH FLOWS — indirect method (IAS 7)" rows={cfRows} year={fs.year} prevYear={fs.prevYear} />}
        {ce && <TableBlock S={s} title="STATEMENT OF CHANGES IN EQUITY" rows={ceRows} year={fs.year} prevYear={fs.prevYear} />}

        <View style={s.note}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>Required IFRS disclosures (IAS 1 §112):</Text>
          {[
            'Note 1 — Basis of preparation and statement of compliance with IFRS',
            'Note 2 — Significant accounting policies and judgements',
            'Note 3 — Property, plant and equipment — reconciliation (IAS 16)',
            'Note 4 — Intangible assets (IAS 38)',
            'Note 5 — Financial instruments and risk management (IFRS 7 / IFRS 9)',
            'Note 6 — Employee benefits (IAS 19)',
            'Note 7 — Income taxes and deferred taxes (IAS 12)',
            'Note 8 — Related party transactions (IAS 24)',
            'Note 9 — Contingent liabilities and provisions (IAS 37)',
            'Note 10 — Events after the reporting period (IAS 10)',
          ].map(n => <Text key={n} style={{ marginTop: 1 }}>• {n}</Text>)}
        </View>

        <Text style={s.legalMention}>
          These financial statements have been prepared in accordance with International Financial Reporting Standards (IFRS)
          as issued by the IASB. Year ended {fs.year} — Generated {new Date().toLocaleDateString('en-GB')}.
        </Text>

        <Text style={s.footer} render={({ pageNumber, totalPages }) =>
          `IFRS Financial Statements ${fs.year} — Page ${pageNumber}/${totalPages} — Generated ${new Date().toLocaleString('en-GB')}`
        } fixed />
      </Page>
    </Document>
  )
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function EtatsFinanciersPdf({ fs }: { fs: FinancialStatements }) {
  if (fs.zone === 'OHADA')  return <OhadaDoc  fs={fs} />
  if (fs.zone === 'IFRS')   return <IfrsDoc   fs={fs} />
  return <FranceDoc fs={fs} />
}
