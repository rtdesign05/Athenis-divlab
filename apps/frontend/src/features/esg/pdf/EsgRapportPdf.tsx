import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { EsgScoreResult } from '@/services/esgApi'

const GREEN = '#006633'

const SECTIONS = [
  { esrs: 'ESRS 1',  titre: 'Exigences générales',                  pct: 100 },
  { esrs: 'ESRS 2',  titre: 'Informations générales',                pct: 100 },
  { esrs: 'ESRS E1', titre: 'Changement climatique',                 pct: 72  },
  { esrs: 'ESRS E3', titre: 'Ressources en eau',                     pct: 55  },
  { esrs: 'ESRS E5', titre: 'Ressources et économie circulaire',     pct: 48  },
  { esrs: 'ESRS S1', titre: "Personnel de l'entreprise",             pct: 90  },
  { esrs: 'ESRS S2', titre: 'Travailleurs chaîne de valeur',         pct: 40  },
  { esrs: 'ESRS G1', titre: 'Conduite des affaires',                 pct: 85  },
]

const S = StyleSheet.create({
  page:      { fontFamily: 'Helvetica', fontSize: 8.5, padding: 28, backgroundColor: '#fff' },
  headerBand:{ backgroundColor: GREEN, padding: '10 14', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTtl: { color: 'white', fontSize: 13, fontFamily: 'Helvetica-Bold' },
  headerSub: { color: '#cce8d0', fontSize: 8 },
  section:   { backgroundColor: GREEN, color: 'white', padding: '3 6', fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 10 },
  table:     { borderWidth: 1, borderColor: '#000' },
  colHeader: { flexDirection: 'row', backgroundColor: '#E8F5E9', borderBottomWidth: 1, borderBottomColor: '#000', padding: '3 5' },
  colHdrTxt: { fontSize: 7, fontFamily: 'Helvetica-Bold' },
  row:       { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ddd', padding: '3 5' },
  rowAlt:    { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ddd', padding: '3 5', backgroundColor: '#f4faf6' },
  scoreCard: { flexDirection: 'row', gap: 6, marginTop: 10 },
  card:      { flex: 1, padding: '6 8', borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  cardLbl:   { fontSize: 7, color: '#666', marginBottom: 2 },
  cardVal:   { fontSize: 16, fontFamily: 'Helvetica-Bold', color: GREEN },
  footer:    { position: 'absolute', bottom: 16, left: 28, right: 28, fontSize: 6.5, color: '#aaa', textAlign: 'center' },
})

const pctColor = (p: number) => p >= 80 ? '#006633' : p >= 60 ? '#b45309' : '#CE1126'

export function EsgRapportPdf({
  esgData,
  year,
  referentiel = 'CSRD',
}: {
  esgData?: EsgScoreResult
  year: number
  referentiel?: string
}) {
  const overall = Math.round(SECTIONS.reduce((s, r) => s + r.pct, 0) / SECTIONS.length)

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.headerBand}>
          <View>
            <Text style={S.headerTtl}>RAPPORT ESG — {referentiel}</Text>
            <Text style={S.headerSub}>Rapport de durabilité — exercice {year}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: 'white', fontSize: 22, fontFamily: 'Helvetica-Bold' }}>{overall}%</Text>
            <Text style={S.headerSub}>Complétude globale</Text>
          </View>
        </View>

        {/* Scores ESG */}
        {esgData && (
          <>
            <Text style={S.section}>SCORES ESG</Text>
            <View style={S.scoreCard}>
              {([
                ['Environnement', esgData.scores.environnement],
                ['Social',        esgData.scores.social],
                ['Gouvernance',   esgData.scores.gouvernance],
                ['Score global',  esgData.scores.global],
              ] as [string, number][]).map(([label, score]) => (
                <View key={label} style={S.card}>
                  <Text style={S.cardLbl}>{label}</Text>
                  <Text style={{ ...S.cardVal, color: pctColor(score) }}>{score}</Text>
                  <Text style={{ fontSize: 6.5, color: '#999' }}>/100</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* CO2 */}
        {esgData && (
          <>
            <Text style={S.section}>ÉMISSIONS CO₂ (tCO₂eq)</Text>
            <View style={S.table}>
              <View style={S.colHeader}>
                <Text style={{ ...S.colHdrTxt, flex: 1 }}>Scope</Text>
                <Text style={{ ...S.colHdrTxt, width: 80, textAlign: 'right' }}>tCO₂eq</Text>
              </View>
              {([
                ['Scope 1 — Émissions directes', esgData.co2.scope1],
                ['Scope 2 — Énergie achetée',    esgData.co2.scope2],
                ['Scope 3 — Chaîne de valeur',   esgData.co2.scope3],
              ] as [string, number][]).map(([label, val], i) => (
                <View key={label} style={i % 2 === 0 ? S.row : S.rowAlt}>
                  <Text style={{ flex: 1 }}>{label}</Text>
                  <Text style={{ width: 80, textAlign: 'right' }}>{val.toLocaleString('fr-FR')}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', backgroundColor: GREEN, padding: '3 5' }}>
                <Text style={{ flex: 1, color: 'white', fontFamily: 'Helvetica-Bold' }}>TOTAL</Text>
                <Text style={{ width: 80, textAlign: 'right', color: 'white', fontFamily: 'Helvetica-Bold' }}>{esgData.co2.total.toLocaleString('fr-FR')}</Text>
              </View>
            </View>
          </>
        )}

        {/* Sections rapport */}
        <Text style={S.section}>SECTIONS DU RAPPORT {referentiel}</Text>
        <View style={S.table}>
          <View style={S.colHeader}>
            <Text style={{ ...S.colHdrTxt, width: 55 }}>ESRS</Text>
            <Text style={{ ...S.colHdrTxt, flex: 1 }}>Titre</Text>
            <Text style={{ ...S.colHdrTxt, width: 50, textAlign: 'right' }}>Complétude</Text>
            <Text style={{ ...S.colHdrTxt, width: 50, textAlign: 'center' }}>Statut</Text>
          </View>
          {SECTIONS.map((s, i) => (
            <View key={s.esrs} style={i % 2 === 0 ? S.row : S.rowAlt}>
              <Text style={{ width: 55, fontFamily: 'Helvetica-Bold', fontSize: 7.5 }}>{s.esrs}</Text>
              <Text style={{ flex: 1 }}>{s.titre}</Text>
              <Text style={{ width: 50, textAlign: 'right', color: pctColor(s.pct), fontFamily: 'Helvetica-Bold' }}>{s.pct}%</Text>
              <Text style={{ width: 50, textAlign: 'center', fontSize: 7, color: pctColor(s.pct) }}>
                {s.pct >= 85 ? 'Complet' : s.pct >= 50 ? 'Partiel' : 'Manquant'}
              </Text>
            </View>
          ))}
        </View>

        <Text style={S.footer}>
          Athenis ESG — Rapport {referentiel} {year} — Généré le {new Date().toLocaleString('fr-FR')}
        </Text>
      </Page>
    </Document>
  )
}
