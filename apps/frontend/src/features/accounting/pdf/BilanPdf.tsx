import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Bilan } from '@/services/accountingApi'

const GREEN = '#006633'

const S = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 8.5, padding: 28, backgroundColor: '#fff' },
  title:      { backgroundColor: GREEN, color: 'white', padding: '8 12', fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 },
  sub:        { backgroundColor: '#E8F5E9', padding: '3 8', fontSize: 8, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: GREEN, marginBottom: 10 },
  twoCol:     { flexDirection: 'row', gap: 8 },
  col:        { flex: 1 },
  section:    { backgroundColor: GREEN, color: 'white', padding: '3 6', fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 0 },
  table:      { borderWidth: 1, borderColor: '#000' },
  row:        { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ccc', padding: '3 5' },
  rowAlt:     { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ccc', padding: '3 5', backgroundColor: '#E8F5E9' },
  rowTotal:   { flexDirection: 'row', backgroundColor: GREEN, padding: '4 5' },
  lbl:        { flex: 1, fontSize: 8 },
  val:        { width: 80, textAlign: 'right', fontSize: 8 },
  valBold:    { width: 80, textAlign: 'right', fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: 'white' },
  lblBold:    { flex: 1, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: 'white' },
  footer:     { position: 'absolute', bottom: 16, left: 28, right: 28, fontSize: 6.5, color: '#aaa', textAlign: 'center' },
})

const fmt = (v: string | number) => Number(v).toLocaleString('fr-FR') + ' F CFA'

export function BilanPdf({ bilan }: { bilan: Bilan }) {
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={S.title}>BILAN COMPTABLE</Text>
        <Text style={S.sub}>Exercice {bilan.year}</Text>

        <View style={S.twoCol}>
          {/* ACTIF */}
          <View style={S.col}>
            <Text style={S.section}>ACTIF</Text>
            <View style={S.table}>
              {([
                ['Immobilisations',  bilan.actif.immobilisations],
                ['Créances',         bilan.actif.creances],
                ['Trésorerie',       bilan.actif.tresorerie],
              ] as [string, string][]).map(([label, value], i) => (
                <View key={label} style={i % 2 === 0 ? S.row : S.rowAlt}>
                  <Text style={S.lbl}>{label}</Text>
                  <Text style={S.val}>{fmt(value)}</Text>
                </View>
              ))}
              <View style={S.rowTotal}>
                <Text style={S.lblBold}>TOTAL ACTIF</Text>
                <Text style={S.valBold}>{fmt(bilan.actif.total)}</Text>
              </View>
            </View>
          </View>

          {/* PASSIF */}
          <View style={S.col}>
            <Text style={S.section}>PASSIF</Text>
            <View style={S.table}>
              {([
                ['Capitaux propres', bilan.passif.capitaux, false],
                ['Dettes',           bilan.passif.dettes,   false],
              ] as [string, string, boolean][]).map(([label, value], i) => (
                <View key={label} style={i % 2 === 0 ? S.row : S.rowAlt}>
                  <Text style={S.lbl}>{label}</Text>
                  <Text style={S.val}>{fmt(value)}</Text>
                </View>
              ))}
              <View style={S.rowTotal}>
                <Text style={S.lblBold}>TOTAL PASSIF</Text>
                <Text style={S.valBold}>{fmt(bilan.passif.total)}</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={S.footer}>
          Athenis Comptabilité — Bilan {bilan.year} — Généré le {new Date().toLocaleString('fr-FR')}
        </Text>
      </Page>
    </Document>
  )
}
