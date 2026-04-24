import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { GrandLivreData } from '@/services/accountingApi'

const GREEN = '#006633'

const S = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 7, padding: 18, backgroundColor: '#fff' },
  title:      { backgroundColor: GREEN, color: 'white', padding: '6 10', fontSize: 12, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 },
  sub:        { backgroundColor: '#E8F5E9', padding: '3 8', fontSize: 7.5, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: GREEN, marginBottom: 6 },
  compteHdr:  { backgroundColor: '#1a5c3a', color: 'white', padding: '3 6', marginTop: 6, flexDirection: 'row' },
  table:      { borderWidth: 1, borderColor: '#000', marginTop: 0 },
  colHeader:  { flexDirection: 'row', backgroundColor: '#E8F5E9', borderBottomWidth: 0.5, borderBottomColor: '#000', padding: '2 3' },
  colHdrTxt:  { fontSize: 6.5, fontFamily: 'Helvetica-Bold' },
  row:        { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: '#ddd', padding: '2 3' },
  rowAlt:     { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: '#ddd', padding: '2 3', backgroundColor: '#f9fafb' },
  rowSolde:   { flexDirection: 'row', backgroundColor: '#C8E6C9', borderBottomWidth: 0.5, borderBottomColor: '#000', padding: '2 3' },
  footer:     { position: 'absolute', bottom: 12, left: 18, right: 18, fontSize: 6, color: '#aaa', textAlign: 'center' },
})

const fmt = (n: number) => n === 0 ? '—' : n.toLocaleString('fr-FR')

export function GrandLivrePdf({ grandLivre }: { grandLivre: GrandLivreData }) {
  return (
    <Document>
      <Page size="A4" style={S.page} wrap>
        <Text style={S.title}>GRAND LIVRE</Text>
        <Text style={S.sub}>Exercice {grandLivre.year} — {grandLivre.comptes.length} comptes</Text>

        {grandLivre.comptes.map(compte => (
          <View key={compte.account} wrap={false}>
            <View style={S.compteHdr}>
              <Text style={{ color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 7.5 }}>
                {compte.account} — {compte.label}
              </Text>
            </View>
            <View style={S.table}>
              <View style={S.colHeader}>
                <Text style={{ ...S.colHdrTxt, width: 45 }}>Date</Text>
                <Text style={{ ...S.colHdrTxt, width: 25 }}>Jnal</Text>
                <Text style={{ ...S.colHdrTxt, flex: 1 }}>Libellé</Text>
                <Text style={{ ...S.colHdrTxt, width: 55, textAlign: 'right' }}>Débit</Text>
                <Text style={{ ...S.colHdrTxt, width: 55, textAlign: 'right' }}>Crédit</Text>
                <Text style={{ ...S.colHdrTxt, width: 55, textAlign: 'right' }}>Solde</Text>
              </View>
              {compte.lignes.map((ligne, i) => (
                <View key={ligne.id} style={i % 2 === 0 ? S.row : S.rowAlt}>
                  <Text style={{ width: 45 }}>{new Date(ligne.date).toLocaleDateString('fr-FR')}</Text>
                  <Text style={{ width: 25, color: '#666' }}>{ligne.journalCode}</Text>
                  <Text style={{ flex: 1 }}>{ligne.label}</Text>
                  <Text style={{ width: 55, textAlign: 'right' }}>{fmt(ligne.debit)}</Text>
                  <Text style={{ width: 55, textAlign: 'right' }}>{fmt(ligne.credit)}</Text>
                  <Text style={{ width: 55, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>{fmt(ligne.solde)}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <Text style={S.footer} render={({ pageNumber, totalPages }) =>
          `Athenis Comptabilité — Grand Livre ${grandLivre.year} — Page ${pageNumber}/${totalPages} — Généré le ${new Date().toLocaleString('fr-FR')}`
        } fixed />
      </Page>
    </Document>
  )
}
