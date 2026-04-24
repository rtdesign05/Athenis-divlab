import { Document, Page, View, Text } from '@react-pdf/renderer'
import { DgiHeaderPdf } from './DgiHeaderPdf'
import { S } from './DgiPdfStyles'
import type { IgsBaremeRow } from '@/services/fiscalApi'

export type { IgsBaremeRow }

export interface IgsPdfData {
  year: number
  niu?: string
  centerImpots?: string
  caN1: number
  igsClass: number | null
  igsAmount: number
  igsAmountCga: number
  adherentCga: boolean
  montantDu: number
  bareme: IgsBaremeRow[]
}

const fmt = (n: number) =>
  n === 0 ? '0' : n.toLocaleString('fr-FR') + ' F CFA'

export function IgsPdf({ data }: { data: IgsPdfData }) {
  const now = new Date().toLocaleString('fr-FR')
  const cgaReduction = data.igsAmount - data.igsAmountCga

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <DgiHeaderPdf
          formRef="IGS/CM-DGI"
          title={`DECLARATION DE L'IMPOT GENERAL SYNTHETIQUE (IGS) — EXERCICE ${data.year}`}
          subtitle={`Exercice ${data.year}  |  Échéance : 30/04/${data.year}  |  Art. 45 à 59 CGI Cameroun`}
          {...(data.centerImpots ? { centerImpots: data.centerImpots } : {})}
          {...(data.niu ? { niu: data.niu } : {})}
        />

        {/* Libératoire notice */}
        <View style={S.greenNotice}>
          <Text style={S.greenNoticeText}>L'IGS est libératoire de : Patente · TVA · IRPP BIC/BNC/BA · Taxe sur le CA</Text>
          <Text style={{ ...S.noticeText, marginTop: 2 }}>
            L'IGS ne dispense pas de : Retenues à la source (RAS) · Cotisations CNPS · FDFP · Taxe foncière (si propriétaire)
          </Text>
        </View>

        {/* Section A — Identification */}
        <Text style={S.sectionHeader}>SECTION A — IDENTIFICATION DU CONTRIBUABLE</Text>
        <View style={S.table}>
          {([
            ['NIU',                  data.niu ?? '—'],
            ['Centre des impôts',   data.centerImpots ?? '—'],
            ['Exercice',            String(data.year)],
            ['Échéance déclaration', `30/04/${data.year}`],
          ] as [string, string][]).map(([label, value], i) => (
            <View key={i} style={S.identRow}>
              <Text style={S.identLabel}>{label}</Text>
              <Text style={S.identValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Section B — Calcul IGS */}
        <Text style={S.sectionHeader}>SECTION B — CALCUL DE L'IGS — BARÈME DGI {data.year} (CGI Art. 45 à 59)</Text>
        <View style={S.table}>
          <View style={S.colHeaderRow}>
            <Text style={{ ...S.colHeaderCell, width: 22 }}>N°</Text>
            <Text style={{ ...S.colHeaderCell, flex: 1 }}>LIBELLÉ</Text>
            <Text style={{ ...S.colHeaderCell, width: 110, textAlign: 'right', borderRightWidth: 0 }}>MONTANT (F CFA)</Text>
          </View>
          <View style={S.row}>
            <Text style={S.cellRef}>1</Text>
            <Text style={S.cellLabel}>CA N-1 ({data.year - 1}) retenu pour calcul de classe IGS</Text>
            <Text style={S.cellAmt}>{fmt(data.caN1)}</Text>
          </View>
          <View style={S.rowAlt}>
            <Text style={S.cellRef}>2</Text>
            <Text style={S.cellLabel}>Classe IGS déterminée</Text>
            <Text style={{ ...S.cellAmt, fontFamily: 'Helvetica-Bold', color: '#006633' }}>
              {data.igsClass ? `Classe ${data.igsClass}` : '—'}
            </Text>
          </View>
          <View style={S.row}>
            <Text style={S.cellRef}>3</Text>
            <Text style={S.cellLabel}>IGS de base (sans CGA)</Text>
            <Text style={S.cellAmt}>{fmt(data.igsAmount)}</Text>
          </View>
          <View style={S.rowAlt}>
            <Text style={S.cellRef}>4</Text>
            <Text style={S.cellLabel}>Adhérent CGA</Text>
            <Text style={{ ...S.cellAmt, color: data.adherentCga ? '#006633' : '#555' }}>
              {data.adherentCga ? 'Oui (réduction 30%)' : 'Non'}
            </Text>
          </View>
          <View style={S.row}>
            <Text style={S.cellRef}>5</Text>
            <Text style={S.cellLabel}>Réduction CGA (30% — art. 119 CGI)</Text>
            <Text style={S.cellAmt}>{data.adherentCga ? `(${fmt(cgaReduction)})` : '—'}</Text>
          </View>
          <View style={S.rowResult}>
            <Text style={S.cellRef} />
            <Text style={S.cellLabelWhiteLg}>MONTANT IGS DÛ</Text>
            <Text style={S.cellAmtWhiteLg}>{fmt(data.montantDu)}</Text>
          </View>
        </View>

        {/* Section C — Barème */}
        <Text style={S.sectionHeader}>SECTION C — BARÈME IGS {data.year} — CLASSES ET MONTANTS (CGI Art. 45)</Text>
        <View style={S.table}>
          <View style={S.colHeaderRow}>
            <Text style={{ ...S.colHeaderCell, width: 45, textAlign: 'center' }}>Classe</Text>
            <Text style={{ ...S.colHeaderCell, width: 90, textAlign: 'right' }}>CA min</Text>
            <Text style={{ ...S.colHeaderCell, width: 90, textAlign: 'right' }}>CA max</Text>
            <Text style={{ ...S.colHeaderCell, width: 90, textAlign: 'right' }}>IGS de base</Text>
            <Text style={{ ...S.colHeaderCell, width: 90, textAlign: 'right', borderRightWidth: 0 }}>Avec CGA (−30%)</Text>
          </View>
          {data.bareme.map((row, i) => {
            const isActive = row.classe === data.igsClass
            const rowStyle = isActive ? S.rowSubtotal : i % 2 === 0 ? S.row : S.rowAlt
            return (
              <View key={row.classe} style={rowStyle}>
                <Text style={{ ...S.cellRef, width: 45, fontFamily: isActive ? 'Helvetica-Bold' : 'Helvetica', textAlign: 'center' }}>
                  {isActive ? '▶ ' : ''}Cl. {row.classe}
                </Text>
                <Text style={{ width: 90, padding: '2 4', borderRightWidth: 0.5, borderRightColor: '#000', textAlign: 'right', fontSize: 7 }}>
                  {row.caMin.toLocaleString('fr-FR')}
                </Text>
                <Text style={{ width: 90, padding: '2 4', borderRightWidth: 0.5, borderRightColor: '#000', textAlign: 'right', fontSize: 7 }}>
                  {row.caMax >= 999_999_999 ? '∞' : row.caMax.toLocaleString('fr-FR')}
                </Text>
                <Text style={{ width: 90, padding: '2 4', borderRightWidth: 0.5, borderRightColor: '#000', textAlign: 'right', fontSize: 7, fontFamily: isActive ? 'Helvetica-Bold' : 'Helvetica' }}>
                  {row.montantBase.toLocaleString('fr-FR')}
                </Text>
                <Text style={{ width: 90, padding: '2 4', textAlign: 'right', fontSize: 7 }}>
                  {row.montantCga.toLocaleString('fr-FR')}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Signature */}
        <View style={[S.signatureBlock, { marginTop: 12 }]}>
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
