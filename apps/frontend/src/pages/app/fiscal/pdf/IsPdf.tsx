import { Document, Page, View, Text } from '@react-pdf/renderer'
import { DgiHeaderPdf } from './DgiHeaderPdf'
import { S } from './DgiPdfStyles'

export interface IsPdfData {
  periode: string
  monthLabel: string
  year: number
  niu?: string
  centerImpots?: string
  raisonSociale: string
  rccm?: string
  codeActivite?: string
  tauxAcompte: number
  caMonthly: number
  acompteBrut: number
  rasImput: number
  acompteNet: number
  penalite: number
  totalAPayer: number
}

const fmt = (n: number) =>
  n === 0 ? '0' : n.toLocaleString('fr-FR') + ' F CFA'

export function IsPdf({ data }: { data: IsPdfData }) {
  const now = new Date().toLocaleString('fr-FR')
  const tauxPct = (data.tauxAcompte * 100).toFixed(1)

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <DgiHeaderPdf
          formRef="I/PL-TVA-IR"
          title="DECLARATION DES ACOMPTES MENSUELS D'IMPOT SUR LES SOCIETES (IS)"
          subtitle={`Période : Acompte mensuel — ${data.monthLabel} ${data.year}  |  Taux : ${tauxPct}%  |  Art. 23 CGI Cameroun`}
          {...(data.centerImpots ? { centerImpots: data.centerImpots } : {})}
          {...(data.niu ? { niu: data.niu } : {})}
        />

        {/* Section A — Identification */}
        <Text style={S.sectionHeader}>SECTION A — IDENTIFICATION DU CONTRIBUABLE</Text>
        <View style={S.table}>
          {([
            ['Raison sociale / Nom',        data.raisonSociale],
            ['N° Identifiant Unique (NIU)', data.niu ?? '—'],
            ['RCCM',                        data.rccm ?? '—'],
            ["Code d'activité",             data.codeActivite ?? '7020Z'],
            ["Régime d'imposition",         'Réel Normal'],
            ['PERIODE DE DECLARATION',      `${data.monthLabel.toUpperCase()} ${data.year}`],
          ] as [string, string][]).map(([label, value], i) => (
            <View key={i} style={S.identRow}>
              <Text style={S.identLabel}>{label}</Text>
              <Text style={S.identValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Section B — Calcul acompte IS */}
        <Text style={S.sectionHeader}>SECTION B — CALCUL DE L'ACOMPTE IS DU MOIS</Text>
        <View style={S.table}>
          {/* Column headers */}
          <View style={S.colHeaderRow}>
            <Text style={{ ...S.colHeaderCell, width: 22 }}>N°</Text>
            <Text style={{ ...S.colHeaderCell, flex: 1 }}>LIBELLÉ</Text>
            <Text style={{ ...S.colHeaderCell, width: 110, textAlign: 'right', borderRightWidth: 0 }}>MONTANT (F CFA)</Text>
          </View>

          <View style={S.row}>
            <Text style={S.cellRef}>1</Text>
            <Text style={S.cellLabel}>CA HT réalisé au cours du mois de {data.monthLabel} {data.year}</Text>
            <Text style={S.cellAmt}>{fmt(data.caMonthly)}</Text>
          </View>
          <View style={S.rowAlt}>
            <Text style={S.cellRef}>2</Text>
            <Text style={S.cellLabel}>Taux de l'acompte IS (art. 23 CGI Cameroun)</Text>
            <Text style={{ ...S.cellAmt, fontFamily: 'Helvetica-Bold', color: '#006633' }}>{tauxPct}%</Text>
          </View>
          <View style={S.rowSection}>
            <Text style={S.cellRef}>3</Text>
            <Text style={S.cellLabelBold}>ACOMPTE IS BRUT (1 × 2)</Text>
            <Text style={S.cellAmtBold}>{fmt(data.acompteBrut)}</Text>
          </View>
          <View style={S.rowAlt}>
            <Text style={S.cellRef}>4</Text>
            <Text style={S.cellLabel}>Retenues à la source imputables</Text>
            <Text style={S.cellAmt}>{fmt(data.rasImput)}</Text>
          </View>
          <View style={S.rowResult}>
            <Text style={S.cellRef} />
            <Text style={S.cellLabelWhite}>ACOMPTE IS NET À PAYER</Text>
            <Text style={S.cellAmtWhite}>{fmt(data.acompteNet)}</Text>
          </View>
          <View style={S.rowAlt}>
            <Text style={S.cellRef}>6</Text>
            <Text style={S.cellLabel}>Pénalités de retard</Text>
            <Text style={S.cellAmt}>{fmt(data.penalite)}</Text>
          </View>
          <View style={S.rowResult}>
            <Text style={S.cellRef} />
            <Text style={S.cellLabelWhiteLg}>TOTAL À PAYER</Text>
            <Text style={S.cellAmtWhiteLg}>{fmt(data.totalAPayer)}</Text>
          </View>
        </View>

        {/* Signature */}
        <View style={[S.signatureBlock, { marginTop: 16 }]}>
          <Text style={{ fontSize: 7 }}>
            Je soussigné(e) _________________________________ certifie l'exactitude des informations portées dans la présente déclaration.
          </Text>
          <View style={S.signatureArea}>
            <Text style={{ fontSize: 7 }}>Fait à Douala, le _______________</Text>
            <View style={{ width: 120, height: 40, borderWidth: 0.5, borderColor: '#999', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 6, color: '#AAAAAA' }}>Signature et cachet</Text>
            </View>
          </View>
        </View>

        <Text style={S.watermark}>
          Préparé via Athenis — Dépôt officiel obligatoire sur www.impots.cm (Harmony 2 DGI) — Généré le {now}
        </Text>
        <Text
          style={S.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
