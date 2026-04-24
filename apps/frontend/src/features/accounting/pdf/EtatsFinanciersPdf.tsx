import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { FinancialStatements, FSPair } from '@/services/accountingApi'

const GREEN = '#006633'

const S = StyleSheet.create({
  page:      { fontFamily: 'Helvetica', fontSize: 7.5, padding: 20, backgroundColor: '#fff' },
  title:     { backgroundColor: GREEN, color: 'white', padding: '6 10', fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 },
  sub:       { backgroundColor: '#E8F5E9', padding: '2 8', fontSize: 7, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: GREEN, marginBottom: 8 },
  section:   { backgroundColor: GREEN, color: 'white', padding: '3 6', fontSize: 7.5, fontFamily: 'Helvetica-Bold', marginTop: 8, marginBottom: 0 },
  subSection:{ backgroundColor: '#1a5c3a', color: 'white', padding: '2 6', fontSize: 7, fontFamily: 'Helvetica-Bold', marginBottom: 0 },
  table:     { borderWidth: 1, borderColor: '#000' },
  colHeader: { flexDirection: 'row', backgroundColor: '#E8F5E9', borderBottomWidth: 1, borderBottomColor: '#000', padding: '2 4' },
  colHdrTxt: { fontSize: 6.5, fontFamily: 'Helvetica-Bold' },
  row:       { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: '#ddd', padding: '2 4' },
  rowAlt:    { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: '#ddd', padding: '2 4', backgroundColor: '#f9fafb' },
  rowBold:   { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#999', padding: '2 4', backgroundColor: '#E8F5E9' },
  rowTotal:  { flexDirection: 'row', backgroundColor: GREEN, padding: '3 4' },
  totalTxt:  { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  footer:    { position: 'absolute', bottom: 12, left: 20, right: 20, fontSize: 6, color: '#aaa', textAlign: 'center' },
})

const fmtNum = (n: number) => n === 0 ? '—' : n.toLocaleString('fr-FR', { minimumFractionDigits: 0 })

function SectionTable({ title, sections, year, prevYear }: {
  title: string
  sections: Record<string, Record<string, FSPair>>
  year: number
  prevYear: number
}) {
  return (
    <>
      <Text style={S.section}>{title}</Text>
      <View style={S.table}>
        <View style={S.colHeader}>
          <Text style={{ ...S.colHdrTxt, flex: 1 }}>Libellé</Text>
          <Text style={{ ...S.colHdrTxt, width: 70, textAlign: 'right' }}>N ({year})</Text>
          <Text style={{ ...S.colHdrTxt, width: 70, textAlign: 'right' }}>N-1 ({prevYear})</Text>
        </View>
        {Object.entries(sections).map(([sectionKey, rows]) => (
          <View key={sectionKey}>
            <View style={{ flexDirection: 'row', backgroundColor: '#C8E6C9', padding: '2 4', borderBottomWidth: 0.5, borderBottomColor: '#000' }}>
              <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', flex: 1 }}>{sectionKey}</Text>
            </View>
            {Object.entries(rows).map(([label, pair], i) => (
              <View key={label} style={i % 2 === 0 ? S.row : S.rowAlt}>
                <Text style={{ flex: 1, paddingLeft: 8 }}>{label}</Text>
                <Text style={{ width: 70, textAlign: 'right' }}>{fmtNum(pair.n)}</Text>
                <Text style={{ width: 70, textAlign: 'right', color: '#666' }}>{fmtNum(pair.nm1)}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </>
  )
}

function SimpleTable({ title, rows, year, prevYear }: {
  title: string
  rows: Record<string, FSPair>
  year: number
  prevYear: number
}) {
  return (
    <>
      <Text style={S.section}>{title}</Text>
      <View style={S.table}>
        <View style={S.colHeader}>
          <Text style={{ ...S.colHdrTxt, flex: 1 }}>Libellé</Text>
          <Text style={{ ...S.colHdrTxt, width: 70, textAlign: 'right' }}>N ({year})</Text>
          <Text style={{ ...S.colHdrTxt, width: 70, textAlign: 'right' }}>N-1 ({prevYear})</Text>
        </View>
        {Object.entries(rows).map(([label, pair], i) => (
          <View key={label} style={i % 2 === 0 ? S.row : S.rowAlt}>
            <Text style={{ flex: 1 }}>{label}</Text>
            <Text style={{ width: 70, textAlign: 'right' }}>{fmtNum(pair.n)}</Text>
            <Text style={{ width: 70, textAlign: 'right', color: '#666' }}>{fmtNum(pair.nm1)}</Text>
          </View>
        ))}
      </View>
    </>
  )
}

export function EtatsFinanciersPdf({ fs }: { fs: FinancialStatements }) {
  return (
    <Document>
      <Page size="A4" style={S.page} wrap>
        <Text style={S.title}>ÉTATS FINANCIERS — {fs.zone}</Text>
        <Text style={S.sub}>Exercice {fs.year} / N-1 {fs.prevYear} — {fs.entryCount} écritures</Text>

        {fs.bilan && <SectionTable title="BILAN" sections={fs.bilan} year={fs.year} prevYear={fs.prevYear} />}
        {fs.compteDeResultat && <SectionTable title="COMPTE DE RÉSULTAT" sections={fs.compteDeResultat} year={fs.year} prevYear={fs.prevYear} />}
        {fs.tafire && <SimpleTable title="TAFIRE" rows={fs.tafire} year={fs.year} prevYear={fs.prevYear} />}
        {fs.statementOfFinancialPosition && <SectionTable title="STATEMENT OF FINANCIAL POSITION" sections={fs.statementOfFinancialPosition} year={fs.year} prevYear={fs.prevYear} />}
        {fs.statementOfProfitOrLoss && <SimpleTable title="STATEMENT OF PROFIT OR LOSS" rows={fs.statementOfProfitOrLoss} year={fs.year} prevYear={fs.prevYear} />}
        {fs.statementOfCashFlows && <SimpleTable title="STATEMENT OF CASH FLOWS" rows={fs.statementOfCashFlows} year={fs.year} prevYear={fs.prevYear} />}
        {fs.statementOfChangesInEquity && <SimpleTable title="STATEMENT OF CHANGES IN EQUITY" rows={fs.statementOfChangesInEquity} year={fs.year} prevYear={fs.prevYear} />}

        <Text style={S.footer} render={({ pageNumber, totalPages }) =>
          `Athenis Comptabilité — États financiers ${fs.year} — Page ${pageNumber}/${totalPages} — Généré le ${new Date().toLocaleString('fr-FR')}`
        } fixed />
      </Page>
    </Document>
  )
}
