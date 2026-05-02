import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Payslip } from '@/services/hrApi'

const BLUE = '#003F88'

const S = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 8.5, padding: 28, backgroundColor: '#fff' },
  headerBand: { backgroundColor: BLUE, color: 'white', padding: '8 12', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle:{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: 'white' },
  headerSub:  { fontSize: 8, color: '#cce0ff' },
  section:    { backgroundColor: BLUE, color: 'white', padding: '3 8', fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 8 },
  table:      { borderWidth: 1, borderColor: '#000', marginTop: 0 },
  colHeader:  { flexDirection: 'row', backgroundColor: '#E8EEF7', borderBottomWidth: 1, borderBottomColor: '#000', padding: '3 4' },
  colHdrTxt:  { fontSize: 7, fontFamily: 'Helvetica-Bold' },
  row:        { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ccc', padding: '2.5 4' },
  rowAlt:     { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ccc', padding: '2.5 4', backgroundColor: '#f0f4fb' },
  rowTotal:   { flexDirection: 'row', backgroundColor: BLUE, padding: '4 4' },
  totalTxt:   { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
  identRow:   { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ddd', padding: '2.5 6' },
  identLabel: { width: 130, fontSize: 7.5, color: '#555', fontFamily: 'Helvetica-Bold' },
  identValue: { flex: 1, fontSize: 7.5 },
  netBox:     { backgroundColor: BLUE, color: 'white', padding: '8 12', marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netLabel:   { fontSize: 12, color: 'white', fontFamily: 'Helvetica-Bold' },
  netValue:   { fontSize: 14, color: 'white', fontFamily: 'Helvetica-Bold' },
  footer:     { position: 'absolute', bottom: 16, left: 28, right: 28, fontSize: 6.5, color: '#aaa', textAlign: 'center' },
})

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' F CFA'
const pct = (n: number) => (n > 0 ? n.toFixed(3) + '%' : '—')

const empTypeLabel: Record<string, string> = {
  FULL_TIME: 'CDI Temps plein', PART_TIME: 'CDI Temps partiel',
  CONTRACT: 'CDD', INTERN: 'Stagiaire',
}

export function BulletinPaiePdf({ payslip, companyName = 'Votre Entreprise' }: { payslip: Payslip; companyName?: string }) {
  const month = new Date(payslip.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.headerBand}>
          <View>
            <Text style={S.headerTitle}>BULLETIN DE PAIE</Text>
            <Text style={S.headerSub}>Période : {month}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: 'white', fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{companyName.toUpperCase()}</Text>
            <Text style={S.headerSub}>Douala, Cameroun</Text>
          </View>
        </View>

        {/* Identification employé */}
        <Text style={S.section}>IDENTIFICATION DE L'EMPLOYÉ</Text>
        <View style={{ borderWidth: 1, borderColor: '#000' }}>
          {([
            ['Nom & Prénom',     `${payslip.employee.lastName} ${payslip.employee.firstName}`],
            ['Email',            payslip.employee.email],
            ['Contrat',          empTypeLabel[payslip.employee.employmentType] ?? payslip.employee.employmentType],
            ['Salaire brut',     fmt(payslip.grossSalary)],
            ['Période',          month],
          ] as [string, string][]).map(([label, value], i) => (
            <View key={label} style={{ ...S.identRow, backgroundColor: i % 2 === 0 ? '#fff' : '#f5f7fc' }}>
              <Text style={S.identLabel}>{label}</Text>
              <Text style={S.identValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Cotisations */}
        <Text style={S.section}>DÉTAIL DES COTISATIONS</Text>
        <View style={S.table}>
          <View style={S.colHeader}>
            <Text style={{ ...S.colHdrTxt, flex: 1 }}>Libellé</Text>
            <Text style={{ ...S.colHdrTxt, width: 55, textAlign: 'right' }}>Base</Text>
            <Text style={{ ...S.colHdrTxt, width: 45, textAlign: 'right' }}>Tx. Sal.</Text>
            <Text style={{ ...S.colHdrTxt, width: 65, textAlign: 'right' }}>Ret. Sal.</Text>
            <Text style={{ ...S.colHdrTxt, width: 45, textAlign: 'right' }}>Tx. Pat.</Text>
            <Text style={{ ...S.colHdrTxt, width: 65, textAlign: 'right' }}>Ch. Pat.</Text>
          </View>
          {payslip.lines.map((line, i) => (
            <View key={i} style={i % 2 === 0 ? S.row : S.rowAlt}>
              <Text style={{ flex: 1 }}>{line.label}</Text>
              <Text style={{ width: 55, textAlign: 'right' }}>{line.base > 0 ? line.base.toLocaleString('fr-FR') : '—'}</Text>
              <Text style={{ width: 45, textAlign: 'right' }}>{pct(line.salRate)}</Text>
              <Text style={{ width: 65, textAlign: 'right' }}>{line.salAmt > 0 ? line.salAmt.toLocaleString('fr-FR') : '—'}</Text>
              <Text style={{ width: 45, textAlign: 'right' }}>{pct(line.empRate)}</Text>
              <Text style={{ width: 65, textAlign: 'right' }}>{line.empAmt > 0 ? line.empAmt.toLocaleString('fr-FR') : '—'}</Text>
            </View>
          ))}
          <View style={S.rowTotal}>
            <Text style={{ ...S.totalTxt, flex: 1 }}>TOTAUX</Text>
            <Text style={{ ...S.totalTxt, width: 55, textAlign: 'right' }}> </Text>
            <Text style={{ ...S.totalTxt, width: 45, textAlign: 'right' }}> </Text>
            <Text style={{ ...S.totalTxt, width: 65, textAlign: 'right' }}>{payslip.totalSalariale.toLocaleString('fr-FR')}</Text>
            <Text style={{ ...S.totalTxt, width: 45, textAlign: 'right' }}> </Text>
            <Text style={{ ...S.totalTxt, width: 65, textAlign: 'right' }}>{payslip.totalPatronale.toLocaleString('fr-FR')}</Text>
          </View>
        </View>

        {/* Récapitulatif */}
        <Text style={S.section}>RÉCAPITULATIF</Text>
        <View style={{ borderWidth: 1, borderColor: '#000' }}>
          {([
            ['Salaire brut',                      fmt(payslip.grossSalary)],
            ['Total cotisations salariales CNPS',  `- ${fmt(payslip.totalSalariale)}`],
            ['Net imposable (avant IRPP)',          fmt(payslip.netImposable)],
          ] as [string, string][]).map(([label, value], i) => (
            <View key={label} style={{ ...S.identRow, backgroundColor: i % 2 === 0 ? '#fff' : '#f5f7fc' }}>
              <Text style={S.identLabel}>{label}</Text>
              <Text style={{ ...S.identValue, textAlign: 'right', paddingRight: 8 }}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Net à payer */}
        <View style={S.netBox}>
          <Text style={S.netLabel}>NET À PAYER</Text>
          <Text style={S.netValue}>{fmt(payslip.netToPay)}</Text>
        </View>

        <View style={{ marginTop: 6, padding: '3 6', backgroundColor: '#E8EEF7', borderWidth: 0.5, borderColor: BLUE }}>
          <Text style={{ fontSize: 7, color: '#003F88' }}>
            Coût total employeur : {fmt(payslip.totalCost)} | Cotisations patronales : {fmt(payslip.totalPatronale)}
          </Text>
        </View>

        <Text style={S.footer}>
          Athenis RH — Bulletin de paie confidentiel — {month} — Généré le {new Date().toLocaleString('fr-FR')}
        </Text>
      </Page>
    </Document>
  )
}
