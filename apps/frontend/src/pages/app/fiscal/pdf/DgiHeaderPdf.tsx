import { View, Text, Svg, Rect, Polygon } from '@react-pdf/renderer'
import { S } from './DgiPdfStyles'

interface Props {
  formRef: string
  title: string
  subtitle?: string | undefined
  centerImpots?: string | undefined
  niu?: string | undefined
  dgeRef?: string | undefined
}

export function DgiHeaderPdf({ formRef, title, subtitle, centerImpots, niu, dgeRef }: Props) {
  return (
    <View style={{ borderWidth: 1.5, borderColor: '#006633', marginBottom: 6 }}>
      {/* Top green band */}
      <View style={S.headerBand}>
        <Text>Réf : {formRef}</Text>
        <Text>MINISTERE DES FINANCES — DIRECTION GÉNÉRALE DES IMPÔTS</Text>
        <Text style={{ fontSize: 6, opacity: 0.8 }}>Formulaire DGI CM</Text>
      </View>

      {/* Flag + title + lion */}
      <View style={S.headerMain}>
        {/* Cameroon flag SVG */}
        <Svg width={42} height={28} viewBox="0 0 3 2">
          <Rect x="0" y="0" width="1" height="2" fill="#006633" />
          <Rect x="1" y="0" width="1" height="2" fill="#CE1126" />
          <Rect x="2" y="0" width="1" height="2" fill="#FCD116" />
          <Polygon
            points="1.5,0.45 1.61,0.80 1.97,0.80 1.68,1.01 1.79,1.36 1.5,1.15 1.21,1.36 1.32,1.01 1.03,0.80 1.39,0.80"
            fill="#FCD116"
          />
        </Svg>

        {/* Central text */}
        <View style={S.headerCenter}>
          <Text style={S.headerTitleGreen}>REPUBLIQUE DU CAMEROUN</Text>
          <Text style={S.headerSubItalic}>Paix — Travail — Patrie</Text>
          <View style={{ borderTopWidth: 0.5, borderTopColor: '#006633', marginVertical: 2, marginHorizontal: 30, width: '60%' }} />
          <Text style={{ fontSize: 7, color: '#006633' }}>MINISTERE DES FINANCES</Text>
          <Text style={S.headerDgi}>DIRECTION GENERALE DES IMPOTS</Text>
        </View>

        {/* Coat-of-arms placeholder */}
        <View style={{ width: 42, height: 28, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 5, color: '#006633', fontFamily: 'Helvetica-Bold' }}>CM</Text>
        </View>
      </View>

      {/* DGE / CDI row */}
      <View style={S.cdiRow}>
        <Text style={S.cdiCell}>D.G.E./C.R.I. : {dgeRef ?? '_______________'}</Text>
        <Text style={S.cdiCellLast}>CDI/CSI/CIME : {centerImpots ?? '_______________'}</Text>
      </View>

      {/* NIU row (optional) */}
      {niu ? (
        <View style={S.niuRow}>
          <Text>NIU : <Text style={{ fontFamily: 'Helvetica-Bold' }}>{niu}</Text></Text>
        </View>
      ) : null}

      {/* Form title */}
      <Text style={S.formTitle}>{title}</Text>

      {/* Subtitle */}
      {subtitle ? <Text style={S.formSubtitle}>{subtitle}</Text> : null}
    </View>
  )
}
