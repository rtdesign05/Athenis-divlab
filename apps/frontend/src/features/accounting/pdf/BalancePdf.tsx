import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { BalanceData } from '@/services/accountingApi'

const GREEN = '#006633'

const S = StyleSheet.create({
  page:      { fontFamily: 'Helvetica', fontSize: 7.5, padding: 20, backgroundColor: '#fff' },
  title:     { backgroundColor: GREEN, color: 'white', padding: '6 10', fontSize: 12, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 },
  sub:       { backgroundColor: '#E8F5E9', padding: '3 8', fontSize: 7.5, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: GREEN, marginBottom: 8 },
  table:     { borderWidth: 1, borderColor: '#000' },
  colHeader: { flexDirection: 'row', backgroundColor: '#E8F5E9', borderBottomWidth: 1, borderBottomColor: '#000', padding: '3 4' },
  colHdrTxt: { fontSize: 7, fontFamily: 'Helvetica-Bold' },
  row:       { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ddd', padding: '2 4' },
  rowAlt:    { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ddd', padding: '2 4', backgroundColor: '#f9fafb' },
  rowTotal:  { flexDirection: 'row', backgroundColor: GREEN, padding: '3 4', marginTop: 2 },
  totalTxt:  { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  equilibre: { marginTop: 6, padding: '4 8', borderWidth: 1, borderColor: GREEN, backgroundColor: '#E8F5E9' },
  footer:    { position: 'absolute', bottom: 14, left: 20, right: 20, fontSize: 6, color: '#aaa', textAlign: 'center' },
})

const fmt = (n: number) => n.toLocaleString('fr-FR')

export function BalancePdf({ balance }: { balance: BalanceData }) {
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={S.title}>BALANCE DES COMPTES</Text>
        <Text style={S.sub}>Exercice {balance.year} — {balance.rows.length} comptes</Text>

        <View style={S.table}>
          <View style={S.colHeader}>
            <Text style={{ ...S.colHdrTxt, width: 40 }}>N° Cpte</Text>
            <Text style={{ ...S.colHdrTxt, flex: 1 }}>Intitulé</Text>
            <Text style={{ ...S.colHdrTxt, width: 65, textAlign: 'right' }}>Total Débit</Text>
            <Text style={{ ...S.colHdrTxt, width: 65, textAlign: 'right' }}>Total Crédit</Text>
            <Text style={{ ...S.colHdrTxt, width: 65, textAlign: 'right' }}>Solde Déb.</Text>
            <Text style={{ ...S.colHdrTxt, width: 65, textAlign: 'right' }}>Solde Créd.</Text>
          </View>
          {balance.rows.map((row, i) => (
            <View key={row.account} style={i % 2 === 0 ? S.row : S.rowAlt}>
              <Text style={{ width: 40, fontFamily: 'Helvetica-Bold' }}>{row.account}</Text>
              <Text style={{ flex: 1 }}>{row.label}</Text>
              <Text style={{ width: 65, textAlign: 'right' }}>{fmt(row.totalDebit)}</Text>
              <Text style={{ width: 65, textAlign: 'right' }}>{fmt(row.totalCredit)}</Text>
              <Text style={{ width: 65, textAlign: 'right' }}>{row.soldeDebiteur > 0 ? fmt(row.soldeDebiteur) : ''}</Text>
              <Text style={{ width: 65, textAlign: 'right' }}>{row.soldeCrediteur > 0 ? fmt(row.soldeCrediteur) : ''}</Text>
            </View>
          ))}
          <View style={S.rowTotal}>
            <Text style={{ ...S.totalTxt, width: 40 }}> </Text>
            <Text style={{ ...S.totalTxt, flex: 1 }}>TOTAUX</Text>
            <Text style={{ ...S.totalTxt, width: 65, textAlign: 'right' }}>{fmt(balance.totalDebit)}</Text>
            <Text style={{ ...S.totalTxt, width: 65, textAlign: 'right' }}>{fmt(balance.totalCredit)}</Text>
            <Text style={{ ...S.totalTxt, width: 65, textAlign: 'right' }}> </Text>
            <Text style={{ ...S.totalTxt, width: 65, textAlign: 'right' }}> </Text>
          </View>
        </View>

        <View style={{ ...S.equilibre, borderColor: balance.equilibre ? GREEN : '#CE1126', backgroundColor: balance.equilibre ? '#E8F5E9' : '#FFEBEE' }}>
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: balance.equilibre ? GREEN : '#CE1126' }}>
            {balance.equilibre ? '✓ Balance équilibrée' : '⚠ Balance déséquilibrée'}
          </Text>
        </View>

        <Text style={S.footer}>
          Athenis Comptabilité — Balance {balance.year} — Généré le {new Date().toLocaleString('fr-FR')}
        </Text>
      </Page>
    </Document>
  )
}
