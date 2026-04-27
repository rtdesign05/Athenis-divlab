import { Document, Page, View, Text } from '@react-pdf/renderer'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PrevisionsPdfRow {
  id:      string
  label:   string
  type:    string
  indent?: number
  values:  number[]
  total:   number | null   // null = afficher "—" (ex: sol_deb)
}

export interface PrevisionsPdfProps {
  horizonLabel:  string
  scenarioLabel: string
  columns:       string[]
  rows:          PrevisionsPdfRow[]
  tresoFin:      number
  generatedAt:   string
}

// ── Formatage compact (ex: 25 600 000 → 25.6M) ────────────────────────────────

function fmt(v: number): string {
  if (v === 0) return '0'
  const a    = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toFixed(1)}M`
  if (a >= 1_000)     return `${sign}${Math.round(a / 1_000)}k`
  return `${sign}${Math.round(a)}`
}

// ── Couleurs ───────────────────────────────────────────────────────────────────

const C = {
  white:    '#ffffff',
  gray50:   '#f9fafb',
  gray100:  '#f3f4f6',
  gray200:  '#e5e7eb',
  gray400:  '#9ca3af',
  gray500:  '#6b7280',
  gray700:  '#374151',
  gray800:  '#1f2937',
  gray900:  '#111827',
  slate100: '#f1f5f9',
  green700: '#15803d',
  green400: '#4ade80',
  red600:   '#dc2626',
  red400:   '#f87171',
  amber400: '#fbbf24',
}

// ── Composant principal ────────────────────────────────────────────────────────

export function PrevisionsPdf({
  horizonLabel,
  scenarioLabel,
  columns,
  rows,
  tresoFin,
  generatedAt,
}: PrevisionsPdfProps) {
  const MARGIN     = 20
  const PAGE_W     = 841.89   // A4 landscape en points
  const CONTENT_W  = PAGE_W - MARGIN * 2
  const LABEL_W    = 158
  const NUM_W      = (CONTENT_W - LABEL_W) / (columns.length + 1)

  // ── Styles de base (objets simples, pas de tableau) ────────────────────────

  const base = {
    row:  { flexDirection: 'row' as const },
    lbl:  { width: LABEL_W, padding: '2 4', justifyContent: 'center' as const },
    num:  { width: NUM_W,   padding: '2 2', justifyContent: 'center' as const },
    tot:  { width: NUM_W,   padding: '2 2', justifyContent: 'center' as const, borderLeftWidth: 0.5, borderLeftColor: C.gray200 },
    txtXs:   { fontSize: 5.5, textAlign: 'right' as const },
    txtXsBold: { fontSize: 5.5, fontFamily: 'Helvetica-Bold', textAlign: 'right' as const },
    txtSm:   { fontSize: 6,   textAlign: 'right' as const },
    txtSmBold: { fontSize: 6, fontFamily: 'Helvetica-Bold', textAlign: 'right' as const },
  }

  function numColor(v: number) { return v >= 0 ? C.green700 : C.red600 }

  // Cellule numérique de période
  function NumCell({ v, bold = false, lg = false }: { v: number; bold?: boolean; lg?: boolean }) {
    const txt = { ...( lg ? base.txtSmBold : bold ? base.txtXsBold : base.txtXs ), color: numColor(v) }
    return <View style={base.num}><Text style={txt}>{fmt(v)}</Text></View>
  }

  // Cellule TOTAL (dernière colonne)
  function TotCell({ total, bold = false, lg = false, lightColor = false }: { total: number | null; bold?: boolean; lg?: boolean; lightColor?: boolean }) {
    if (total === null) {
      return <View style={base.tot}><Text style={{ ...base.txtXs, color: C.gray400 }}>—</Text></View>
    }
    const color = lightColor ? (total >= 0 ? C.green400 : C.red400) : numColor(total)
    const txt = { ...( lg ? base.txtSmBold : bold ? base.txtXsBold : base.txtXs ), color }
    return <View style={{ ...base.tot, borderLeftColor: lightColor ? C.gray700 : C.gray200 }}>
      <Text style={txt}>{fmt(total)}</Text>
    </View>
  }

  // ── Rendu d'une ligne selon son type ───────────────────────────────────────

  function renderRow(row: PrevisionsPdfRow) {
    const pl = 4 + (row.indent ?? 0) * 7

    switch (row.type) {

      case 'header':
        return (
          <View key={row.id} style={{ ...base.row, backgroundColor: C.gray800 }}>
            <View style={{ ...base.lbl, paddingLeft: 4 }}>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.white }}>
                {row.label.toUpperCase()}
              </Text>
            </View>
            {row.values.map((_, i) => <View key={i} style={base.num} />)}
            <View style={base.tot} />
          </View>
        )

      case 'subheader':
        return (
          <View key={row.id} style={{ ...base.row, backgroundColor: C.gray100 }}>
            <View style={{ ...base.lbl, paddingLeft: 8 }}>
              <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: C.gray500 }}>
                {row.label.toUpperCase()}
              </Text>
            </View>
            {row.values.map((_, i) => <View key={i} style={base.num} />)}
            <View style={base.tot} />
          </View>
        )

      case 'data':
        return (
          <View key={row.id} style={{ ...base.row, backgroundColor: C.white }}>
            <View style={{ ...base.lbl, paddingLeft: pl }}>
              <Text style={{ fontSize: 5.5, color: C.gray700 }}>{row.label}</Text>
            </View>
            {row.values.map((v, i) => <NumCell key={i} v={v} />)}
            <TotCell total={row.total} bold />
          </View>
        )

      case 'subtotal':
        return (
          <View key={row.id} style={{ ...base.row, backgroundColor: C.gray50 }}>
            <View style={{ ...base.lbl, paddingLeft: pl }}>
              <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: C.gray700 }}>{row.label}</Text>
            </View>
            {row.values.map((v, i) => <NumCell key={i} v={v} bold />)}
            <TotCell total={row.total} bold />
          </View>
        )

      case 'total':
        return (
          <View key={row.id} style={{ ...base.row, backgroundColor: C.gray200, borderTopWidth: 0.5, borderTopColor: C.gray400 }}>
            <View style={{ ...base.lbl, paddingLeft: 4 }}>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.gray900 }}>{row.label}</Text>
            </View>
            {row.values.map((v, i) => <NumCell key={i} v={v} bold lg />)}
            <TotCell total={row.total} bold lg />
          </View>
        )

      case 'solde_net':
        return (
          <View key={row.id} style={{ ...base.row, backgroundColor: C.slate100 }}>
            <View style={{ ...base.lbl, paddingLeft: 4 }}>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.gray700 }}>{row.label}</Text>
            </View>
            {row.values.map((v, i) => <NumCell key={i} v={v} bold lg />)}
            <TotCell total={row.total} bold lg />
          </View>
        )

      case 'solde_debut':
        return (
          <View key={row.id} style={{ ...base.row, backgroundColor: C.slate100 }}>
            <View style={{ ...base.lbl, paddingLeft: 4 }}>
              <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: C.gray500 }}>{row.label}</Text>
            </View>
            {row.values.map((v, i) => (
              <View key={i} style={base.num}>
                <Text style={{ ...base.txtXs, color: C.gray700 }}>{fmt(v)}</Text>
              </View>
            ))}
            <TotCell total={null} />
          </View>
        )

      case 'solde_fin':
        return (
          <View key={row.id} style={{ ...base.row, backgroundColor: C.gray900, borderTopWidth: 1, borderTopColor: C.gray700 }}>
            <View style={{ ...base.lbl, paddingLeft: 4 }}>
              <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.white }}>{row.label}</Text>
            </View>
            {row.values.map((v, i) => (
              <View key={i} style={base.num}>
                <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', textAlign: 'right', color: v >= 0 ? C.green400 : C.red400 }}>
                  {fmt(v)}
                </Text>
              </View>
            ))}
            <TotCell total={row.total} bold lg lightColor />
          </View>
        )

      // Ligne memo : charge non décaissée (amortissements)
      case 'memo':
        return (
          <View key={row.id} style={{ ...base.row, backgroundColor: '#fffbeb', borderBottomWidth: 0.5, borderBottomColor: '#fde68a', borderBottomStyle: 'dashed' }}>
            <View style={{ ...base.lbl, paddingLeft: pl }}>
              <Text style={{ fontSize: 5.5, color: '#92400e', fontStyle: 'italic' }}>
                {'[non-cash]  '}{row.label}
              </Text>
            </View>
            {row.values.map((v, i) => (
              <View key={i} style={base.num}>
                <Text style={{ ...base.txtXs, color: '#b45309' }}>{fmt(v)}</Text>
              </View>
            ))}
            <View style={{ ...base.tot, borderLeftColor: '#fde68a' }}>
              <Text style={{ ...base.txtXsBold, color: '#b45309' }}>{row.total !== null ? fmt(row.total) : '—'}</Text>
            </View>
          </View>
        )

      // Ligne shield : bouclier fiscal IS auto-calculé
      case 'shield':
        return (
          <View key={row.id} style={{ ...base.row, backgroundColor: '#f0fdf4' }}>
            <View style={{ ...base.lbl, paddingLeft: pl }}>
              <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: '#15803d' }}>{row.label}</Text>
            </View>
            {row.values.map((v, i) => (
              <View key={i} style={base.num}>
                <Text style={{ ...base.txtXsBold, color: '#15803d' }}>+{fmt(v)}</Text>
              </View>
            ))}
            <View style={{ ...base.tot, borderLeftColor: '#bbf7d0' }}>
              <Text style={{ ...base.txtXsBold, color: '#15803d' }}>{row.total !== null ? `+${fmt(row.total)}` : '—'}</Text>
            </View>
          </View>
        )

      default:
        return null
    }
  }

  return (
    <Document>
      <Page
        size="A4"
        orientation="landscape"
        style={{ flexDirection: 'column', backgroundColor: C.white, padding: MARGIN, fontSize: 6, fontFamily: 'Helvetica' }}
      >
        {/* ── En-tête ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: C.gray200 }}>
          <View>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.gray800 }}>
              Tableau prévisionnel de trésorerie
            </Text>
            <Text style={{ fontSize: 7, color: C.gray500, marginTop: 2 }}>
              {horizonLabel} · {scenarioLabel}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 6, color: C.gray500, textAlign: 'right' }}>
              Généré le {generatedAt}
            </Text>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.gray700, textAlign: 'right', marginTop: 2 }}>
              Tréso fin de période : {fmt(tresoFin)} FCFA
            </Text>
          </View>
        </View>

        {/* ── En-tête des colonnes ── */}
        <View style={{ ...base.row, backgroundColor: C.gray700 }}>
          <View style={{ ...base.lbl, paddingLeft: 4 }}>
            <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.white }}>LIBELLÉ</Text>
          </View>
          {columns.map((col, i) => (
            <View key={i} style={base.num}>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.white, textAlign: 'right' }}>{col}</Text>
            </View>
          ))}
          <View style={{ ...base.tot, borderLeftColor: C.gray500 }}>
            <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.amber400, textAlign: 'right' }}>TOTAL</Text>
          </View>
        </View>

        {/* ── Lignes de données ── */}
        {rows.map(row => renderRow(row))}

        {/* ── Pied de page ── */}
        <View style={{ marginTop: 8, borderTopWidth: 0.5, borderTopColor: C.gray200, paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 5, color: C.gray400 }}>
            Prévisions indicatives basées sur données historiques avec facteurs saisonniers. Document non contractuel.
          </Text>
          <Text style={{ fontSize: 5, color: C.gray400 }}>Athenis · Confidentiel</Text>
        </View>

      </Page>
    </Document>
  )
}
