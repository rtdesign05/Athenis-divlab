import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Invoice } from '@/services/billingApi'

const S = StyleSheet.create({
  page:         { fontFamily: 'Helvetica', fontSize: 9, padding: 30, backgroundColor: '#fff' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  company:      { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#006633' },
  subText:      { fontSize: 8, color: '#555', marginTop: 2 },
  badge:        { backgroundColor: '#006633', color: 'white', padding: '3 8', fontSize: 8, fontFamily: 'Helvetica-Bold', alignSelf: 'flex-start' },
  divider:      { borderBottomWidth: 1, borderBottomColor: '#006633', marginVertical: 10 },
  twoCol:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  blockLabel:   { fontSize: 7, color: '#999', fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  blockValue:   { fontSize: 9 },
  table:        { borderWidth: 1, borderColor: '#000', marginTop: 10 },
  colHeader:    { flexDirection: 'row', backgroundColor: '#006633', padding: '3 6' },
  colHeaderTxt: { color: 'white', fontSize: 8, fontFamily: 'Helvetica-Bold' },
  row:          { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: '#ccc', padding: '4 6' },
  rowAlt:       { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: '#ccc', padding: '4 6', backgroundColor: '#f9fafb' },
  totalRow:     { flexDirection: 'row', backgroundColor: '#006633', padding: '5 6' },
  totalTxt:     { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  note:         { marginTop: 14, padding: '6 8', backgroundColor: '#f9fafb', borderWidth: 0.5, borderColor: '#ccc', fontSize: 7.5, color: '#555' },
  footer:       { position: 'absolute', bottom: 20, left: 30, right: 30, fontSize: 7, color: '#aaa', textAlign: 'center' },
})

const fmt = (v: string | number) =>
  Number(v).toLocaleString('fr-FR') + ' F CFA'

const statusLabel: Record<string, string> = {
  DRAFT: 'Brouillon', SENT: 'Envoyée', PAID: 'Payée', OVERDUE: 'En retard', CANCELLED: 'Annulée',
}

export function InvoicePdf({ invoice }: { invoice: Invoice }) {
  const issued = new Date(invoice.issueDate).toLocaleDateString('fr-FR')
  const due    = new Date(invoice.dueDate).toLocaleDateString('fr-FR')

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View>
            <Text style={S.company}>VOTRE ENTREPRISE</Text>
            <Text style={S.subText}>Douala, Cameroun</Text>
          </View>
          <View>
            <Text style={S.badge}>FACTURE</Text>
            <Text style={{ ...S.subText, marginTop: 4 }}>N° {invoice.number}</Text>
            <Text style={S.subText}>Statut : {statusLabel[invoice.status] ?? invoice.status}</Text>
          </View>
        </View>

        <View style={S.divider} />

        <View style={S.twoCol}>
          <View>
            <Text style={S.blockLabel}>CLIENT</Text>
            <Text style={S.blockValue}>{invoice.client?.name ?? '—'}</Text>
            {invoice.client?.email ? <Text style={S.subText}>{invoice.client.email}</Text> : null}
          </View>
          <View>
            <Text style={S.blockLabel}>DATES</Text>
            <Text style={S.blockValue}>Émission : {issued}</Text>
            <Text style={S.blockValue}>Échéance : {due}</Text>
          </View>
        </View>

        <View style={S.table}>
          <View style={S.colHeader}>
            <Text style={{ ...S.colHeaderTxt, flex: 1 }}>Description</Text>
            <Text style={{ ...S.colHeaderTxt, width: 100, textAlign: 'right' }}>Montant HT</Text>
          </View>
          <View style={S.row}>
            <Text style={{ flex: 1 }}>Prestations / Services</Text>
            <Text style={{ width: 100, textAlign: 'right' }}>{fmt(invoice.subtotal)}</Text>
          </View>
          <View style={S.rowAlt}>
            <Text style={{ flex: 1 }}>TVA ({parseFloat(invoice.taxRate).toFixed(2)}%)</Text>
            <Text style={{ width: 100, textAlign: 'right' }}>{fmt(invoice.taxAmount)}</Text>
          </View>
          <View style={S.totalRow}>
            <Text style={{ ...S.totalTxt, flex: 1 }}>TOTAL TTC</Text>
            <Text style={{ ...S.totalTxt, width: 100, textAlign: 'right' }}>{fmt(invoice.total)}</Text>
          </View>
        </View>

        {invoice.notes ? (
          <View style={S.note}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        ) : null}

        <Text style={S.footer}>
          Athenis — Document généré le {new Date().toLocaleString('fr-FR')}
        </Text>
      </Page>
    </Document>
  )
}
