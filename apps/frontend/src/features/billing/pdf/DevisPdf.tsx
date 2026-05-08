import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { Quote } from '@/services/billingApi'

const S = StyleSheet.create({
  page:         { fontFamily: 'Helvetica', fontSize: 9, padding: 30, backgroundColor: '#fff' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  company:      { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#006633' },
  subText:      { fontSize: 8, color: '#555', marginTop: 2 },
  badge:        { backgroundColor: '#b45309', color: 'white', padding: '3 8', fontSize: 8, fontFamily: 'Helvetica-Bold', alignSelf: 'flex-start' },
  divider:      { borderBottomWidth: 1, borderBottomColor: '#b45309', marginVertical: 10 },
  twoCol:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  blockLabel:   { fontSize: 7, color: '#999', fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  blockValue:   { fontSize: 9 },
  table:        { borderWidth: 1, borderColor: '#000', marginTop: 10 },
  colHeader:    { flexDirection: 'row', backgroundColor: '#b45309', padding: '3 6' },
  colHeaderTxt: { color: 'white', fontSize: 8, fontFamily: 'Helvetica-Bold' },
  row:          { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: '#ccc', padding: '4 6' },
  rowAlt:       { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: '#ccc', padding: '4 6', backgroundColor: '#fffbeb' },
  totalRow:     { flexDirection: 'row', backgroundColor: '#b45309', padding: '5 6' },
  totalTxt:     { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  note:         { marginTop: 14, padding: '6 8', backgroundColor: '#fffbeb', borderWidth: 0.5, borderColor: '#d97706', fontSize: 7.5, color: '#555' },
  validity:     { marginTop: 8, padding: '4 6', backgroundColor: '#fffbeb', borderWidth: 0.5, borderColor: '#d97706' },
  // QR code
  qrSection:    { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  qrBox:        { alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e7eb', padding: '6 6', backgroundColor: '#fffbeb' },
  qrImage:      { width: 80, height: 80 },
  qrLabel:      { fontSize: 6, color: '#92400e', marginTop: 3, textAlign: 'center', fontFamily: 'Helvetica-Bold' },
  qrSubLabel:   { fontSize: 5.5, color: '#d97706', textAlign: 'center', marginTop: 1 },
  footer:       { position: 'absolute', bottom: 20, left: 30, right: 30, fontSize: 7, color: '#aaa', textAlign: 'center' },
})

const fmt = (v: string | number) =>
  Number(v).toLocaleString('fr-FR') + ' F CFA'

const statusLabel: Record<string, string> = {
  DRAFT: 'Brouillon', SENT: 'Envoyé', ACCEPTED: 'Accepté', REJECTED: 'Refusé', CONVERTED: 'Converti',
}

interface DevisPdfProps {
  quote: Quote
  qrDataUrl?: string
}

export function DevisPdf({ quote, qrDataUrl }: DevisPdfProps) {
  const issued = new Date(quote.issueDate).toLocaleDateString('fr-FR')
  const valid  = new Date(quote.validUntil).toLocaleDateString('fr-FR')

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View>
            <Text style={S.company}>VOTRE ENTREPRISE</Text>
            <Text style={S.subText}>Douala, Cameroun</Text>
          </View>
          <View>
            <Text style={S.badge}>DEVIS</Text>
            <Text style={{ ...S.subText, marginTop: 4 }}>N° {quote.number}</Text>
            <Text style={S.subText}>Statut : {statusLabel[quote.status] ?? quote.status}</Text>
          </View>
        </View>

        <View style={S.divider} />

        <View style={S.twoCol}>
          <View>
            <Text style={S.blockLabel}>CLIENT</Text>
            <Text style={S.blockValue}>{quote.client?.name ?? '—'}</Text>
            {quote.client?.email ? <Text style={S.subText}>{quote.client.email}</Text> : null}
          </View>
          <View>
            <Text style={S.blockLabel}>DATES</Text>
            <Text style={S.blockValue}>Émission : {issued}</Text>
            <Text style={S.blockValue}>Validité : {valid}</Text>
          </View>
        </View>

        <View style={S.table}>
          <View style={S.colHeader}>
            <Text style={{ ...S.colHeaderTxt, flex: 1 }}>Description</Text>
            <Text style={{ ...S.colHeaderTxt, width: 100, textAlign: 'right' }}>Montant HT</Text>
          </View>
          <View style={S.row}>
            <Text style={{ flex: 1 }}>Prestations / Services</Text>
            <Text style={{ width: 100, textAlign: 'right' }}>{fmt(quote.subtotal)}</Text>
          </View>
          <View style={S.rowAlt}>
            <Text style={{ flex: 1 }}>TVA ({parseFloat(quote.taxRate).toFixed(2)}%)</Text>
            <Text style={{ width: 100, textAlign: 'right' }}>{fmt(quote.taxAmount)}</Text>
          </View>
          <View style={S.totalRow}>
            <Text style={{ ...S.totalTxt, flex: 1 }}>TOTAL TTC</Text>
            <Text style={{ ...S.totalTxt, width: 100, textAlign: 'right' }}>{fmt(quote.total)}</Text>
          </View>
        </View>

        {quote.notes ? (
          <View style={S.note}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>Notes</Text>
            <Text>{quote.notes}</Text>
          </View>
        ) : null}

        {/* ── Ligne de bas : validité + QR ── */}
        <View style={S.qrSection}>
          <View style={{ flex: 1, marginRight: qrDataUrl ? 12 : 0 }}>
            <View style={S.validity}>
              <Text style={{ fontSize: 7.5, color: '#92400e' }}>
                Ce devis est valable jusqu'au {valid}. Signature et cachet du client requis pour acceptation.
              </Text>
            </View>
          </View>
          {qrDataUrl ? (
            <View style={S.qrBox}>
              <Image src={qrDataUrl} style={S.qrImage} />
              <Text style={S.qrLabel}>Scanner pour vérifier</Text>
              <Text style={S.qrSubLabel}>{quote.number}</Text>
            </View>
          ) : null}
        </View>

        <Text style={S.footer}>
          Athenis — Document généré le {new Date().toLocaleString('fr-FR')}
        </Text>
      </Page>
    </Document>
  )
}
