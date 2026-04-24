import { Document, Page, View, Text } from '@react-pdf/renderer'
import { DgiHeaderPdf } from './DgiHeaderPdf'
import { S } from './DgiPdfStyles'

export interface TvaPdfData {
  periode: string
  niu?: string
  centerImpots?: string
  raisonSociale: string
  rccm?: string
  adresse?: string
  codeActivite?: string
  collecteeRows: Array<{ ref: number; label: string; baseHT: number; tva: number; exempt?: boolean }>
  totalCollectee: number
  deductibleRows: Array<{ ref: number; label: string; amount: number }>
  totalDeductible: number
  tvaNette: number
  penalites: number
  totalAPayer: number
  creditReporter: number
}

const fmt = (n: number) =>
  n === 0 ? '0' : n.toLocaleString('fr-FR') + ' F CFA'

export function TvaPdf({ data }: { data: TvaPdfData }) {
  const now = new Date().toLocaleString('fr-FR')

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <DgiHeaderPdf
          formRef="I/TVA-IR"
          title="DECLARATION MENSUELLE DE LA TAXE SUR LA VALEUR AJOUTEE (TVA)"
          subtitle={`Période : ${data.periode}  |  Taux applicable : 19,25%  |  Échéance : 15 du mois suivant`}
          {...(data.centerImpots ? { centerImpots: data.centerImpots } : {})}
          {...(data.niu ? { niu: data.niu } : {})}
        />

        {/* SECTION A — Identification */}
        <Text style={S.sectionHeader}>SECTION A — IDENTIFICATION DU CONTRIBUABLE</Text>
        <View style={S.table}>
          {([
            ['Raison sociale / Nom',        data.raisonSociale],
            ['N° Identifiant Unique (NIU)', data.niu ?? '—'],
            ['RCCM',                        data.rccm ?? '—'],
            ['Adresse',                     data.adresse ?? '—'],
            ["Code d'activité",             data.codeActivite ?? '7020Z'],
            ["Régime d'imposition",         'Réel Normal'],
            ['PERIODE DE DECLARATION',      data.periode],
          ] as [string, string][]).map(([label, value], i) => (
            <View key={i} style={S.identRow}>
              <Text style={S.identLabel}>{label}</Text>
              <Text style={S.identValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* SECTION B — TVA Collectée */}
        <Text style={S.sectionHeader}>SECTION B — CHIFFRE D'AFFAIRES TAXABLES ET TVA COLLECTEE</Text>
        <View style={S.table}>
          {/* Column headers */}
          <View style={S.colHeaderRow}>
            <Text style={{ ...S.colHeaderCell, width: 22 }}>N°</Text>
            <Text style={{ ...S.colHeaderCell, flex: 1 }}>LIBELLÉ</Text>
            <Text style={{ ...S.colHeaderCell, width: 90, textAlign: 'right' }}>BASE HT (F CFA)</Text>
            <Text style={{ ...S.colHeaderCell, width: 90, textAlign: 'right', borderRightWidth: 0 }}>TVA 19,25%</Text>
          </View>

          {data.collecteeRows.map((r, i) => (
            <View key={i} style={i % 2 === 0 ? S.row : S.rowAlt}>
              <Text style={S.cellRef}>{r.ref}</Text>
              <Text style={S.cellLabel}>{r.label}</Text>
              <Text style={S.cellBase2}>{fmt(r.baseHT)}</Text>
              <Text style={S.cellAmt}>{r.exempt ? '—' : fmt(r.tva)}</Text>
            </View>
          ))}

          <View style={S.rowSubtotal}>
            <Text style={S.cellRef} />
            <Text style={S.cellLabelBold}>TOTAL TVA BRUTE COLLECTÉE (A)</Text>
            <Text style={S.cellBase2Bold} />
            <Text style={S.cellAmtBold}>{fmt(data.totalCollectee)}</Text>
          </View>
        </View>

        {/* SECTION C — TVA Déductible */}
        <Text style={S.sectionHeader}>SECTION C — TVA DEDUCTIBLE</Text>
        <View style={S.table}>
          {data.deductibleRows.map((r, i) => (
            <View key={i} style={i % 2 === 0 ? S.row : S.rowAlt}>
              <Text style={S.cellRef}>{r.ref}</Text>
              <Text style={S.cellLabel}>{r.label}</Text>
              <Text style={S.cellAmt}>{fmt(r.amount)}</Text>
            </View>
          ))}
          <View style={S.rowSubtotal}>
            <Text style={S.cellRef} />
            <Text style={S.cellLabelBold}>TOTAL TVA DÉDUCTIBLE (B)</Text>
            <Text style={S.cellAmtBold}>{fmt(data.totalDeductible)}</Text>
          </View>
        </View>

        <View style={S.noticeBox}>
          <Text style={S.noticeText}>
            ⚠ Non déductibles (art. 149 CGI) : logement, hôtel, restaurant, location véhicule tourisme (sauf professionnels du secteur).
          </Text>
        </View>

        {/* SECTION D — Liquidation */}
        <Text style={S.sectionHeader}>SECTION D — LIQUIDATION DE LA TVA</Text>
        <View style={S.table}>
          <View style={S.row}>
            <Text style={S.cellRef} />
            <Text style={S.cellLabel}>TVA brute collectée (A)</Text>
            <Text style={S.cellAmt}>{fmt(data.totalCollectee)}</Text>
          </View>
          <View style={S.rowAlt}>
            <Text style={S.cellRef} />
            <Text style={S.cellLabel}>TVA déductible (B)</Text>
            <Text style={S.cellAmt}>({fmt(data.totalDeductible)})</Text>
          </View>
          <View style={S.rowResult}>
            <Text style={S.cellRef} />
            <Text style={S.cellLabelWhite}>TVA NETTE (A — B)</Text>
            <Text style={S.cellAmtWhite}>{fmt(data.tvaNette)}</Text>
          </View>
          {data.creditReporter > 0 ? (
            <View style={S.rowWarn}>
              <Text style={S.cellRef} />
              <Text style={{ ...S.cellLabelBold, backgroundColor: 'transparent' }}>CRÉDIT DE TVA À REPORTER</Text>
              <Text style={S.cellAmtBold}>{fmt(data.creditReporter)}</Text>
            </View>
          ) : null}
          <View style={S.row}>
            <Text style={S.cellRef}>12</Text>
            <Text style={S.cellLabel}>Pénalités de retard</Text>
            <Text style={S.cellAmt}>{fmt(data.penalites)}</Text>
          </View>
          <View style={S.rowResult}>
            <Text style={S.cellRef} />
            <Text style={S.cellLabelWhiteLg}>TOTAL À PAYER</Text>
            <Text style={S.cellAmtWhiteLg}>{fmt(data.totalAPayer)}</Text>
          </View>
        </View>

        {/* Signature */}
        <View style={S.signatureBlock}>
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
