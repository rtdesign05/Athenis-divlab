import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { CompteResultat } from '@/services/accountingApi'

const GREEN = '#006633'

const S = StyleSheet.create({
  page:     { fontFamily: 'Helvetica', fontSize: 8.5, padding: 28, backgroundColor: '#fff' },
  title:    { backgroundColor: GREEN, color: 'white', padding: '8 12', fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 },
  sub:      { backgroundColor: '#E8F5E9', padding: '3 8', fontSize: 8, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: GREEN, marginBottom: 10 },
  section:  { backgroundColor: GREEN, color: 'white', padding: '3 6', fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 0 },
  table:    { borderWidth: 1, borderColor: '#000', marginBottom: 10 },
  row:      { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ccc', padding: '3 5' },
  rowAlt:   { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ccc', padding: '3 5', backgroundColor: '#E8F5E9' },
  rowTotal: { flexDirection: 'row', backgroundColor: GREEN, padding: '4 5' },
  lbl:      { flex: 1, fontSize: 8 },
  val:      { width: 100, textAlign: 'right', fontSize: 8 },
  lblBold:  { flex: 1, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: 'white' },
  valBold:  { width: 100, textAlign: 'right', fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: 'white' },
  resultat: { flexDirection: 'row', padding: '8 10', borderWidth: 2, borderColor: GREEN, marginTop: 6 },
  footer:   { position: 'absolute', bottom: 16, left: 28, right: 28, fontSize: 6.5, color: '#aaa', textAlign: 'center' },
})

const fmt = (v: string | number) => Number(v).toLocaleString('fr-FR') + ' F CFA'

export function ResultatPdf({ cr }: { cr: CompteResultat }) {
  // Le résultat brut (avant IS) est l'indicateur principal du CR backend.
  const resultat = cr.resultatBrut

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={S.title}>COMPTE DE RÉSULTAT</Text>
        <Text style={S.sub}>Exercice {cr.year}</Text>

        {/* Produits */}
        <Text style={S.section}>PRODUITS</Text>
        <View style={S.table}>
          {([
            ["Chiffre d'affaires (HT)", cr.produits.chiffreAffaires],
            ['TVA collectée',           cr.produits.tvaCollectee],
          ] as [string, number][]).map(([label, value], i) => (
            <View key={label} style={i % 2 === 0 ? S.row : S.rowAlt}>
              <Text style={S.lbl}>{label}</Text>
              <Text style={S.val}>{fmt(value)}</Text>
            </View>
          ))}
          <View style={S.rowTotal}>
            <Text style={S.lblBold}>TOTAL PRODUITS</Text>
            <Text style={S.valBold}>{fmt(cr.produits.totalProduits)}</Text>
          </View>
        </View>

        {/* Charges */}
        <Text style={S.section}>CHARGES</Text>
        <View style={S.table}>
          {([
            ["Achats & charges d'exploitation", cr.charges.chargesExploitation],
            ['  dont achats fournisseurs (HT)', cr.charges.chargesAchats],
            ['Masse salariale',                 cr.charges.masseSalariale],
          ] as [string, number][]).map(([label, value], i) => (
            <View key={label} style={i % 2 === 0 ? S.row : S.rowAlt}>
              <Text style={S.lbl}>{label}</Text>
              <Text style={S.val}>{fmt(value)}</Text>
            </View>
          ))}
          <View style={S.rowTotal}>
            <Text style={S.lblBold}>TOTAL CHARGES</Text>
            <Text style={S.valBold}>{fmt(cr.charges.chargesTotal)}</Text>
          </View>
        </View>

        {/* Résultat brut (avant IS) */}
        <View style={{ ...S.resultat, backgroundColor: resultat >= 0 ? '#E8F5E9' : '#FFEBEE' }}>
          <Text style={{ flex: 1, fontSize: 10, fontFamily: 'Helvetica-Bold', color: resultat >= 0 ? GREEN : '#CE1126' }}>
            RÉSULTAT BRUT {resultat >= 0 ? 'BÉNÉFICIAIRE' : 'DÉFICITAIRE'}
          </Text>
          <Text style={{ width: 120, textAlign: 'right', fontSize: 11, fontFamily: 'Helvetica-Bold', color: resultat >= 0 ? GREEN : '#CE1126' }}>
            {fmt(resultat)}
          </Text>
        </View>

        <Text style={S.footer}>
          Athenis Comptabilité — Compte de résultat {cr.year} — Généré le {new Date().toLocaleString('fr-FR')}
        </Text>
      </Page>
    </Document>
  )
}
