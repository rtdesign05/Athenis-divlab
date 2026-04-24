import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { LegalContract } from '@/services/legalApi'

const NAVY = '#1e3a5f'

const S = StyleSheet.create({
  page:      { fontFamily: 'Helvetica', fontSize: 8.5, padding: 30, backgroundColor: '#fff' },
  headerBand:{ backgroundColor: NAVY, padding: '8 14', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTtl: { color: 'white', fontSize: 12, fontFamily: 'Helvetica-Bold' },
  headerSub: { color: '#a0b8d8', fontSize: 8 },
  badge:     { backgroundColor: '#4a7fbc', color: 'white', padding: '2 8', fontSize: 8, fontFamily: 'Helvetica-Bold', alignSelf: 'flex-start' },
  section:   { backgroundColor: NAVY, color: 'white', padding: '3 6', fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 10 },
  table:     { borderWidth: 1, borderColor: '#000' },
  row:       { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ccc', padding: '3 5' },
  rowAlt:    { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ccc', padding: '3 5', backgroundColor: '#f0f4fa' },
  label:     { width: 110, fontSize: 7.5, color: '#555', fontFamily: 'Helvetica-Bold' },
  value:     { flex: 1, fontSize: 7.5 },
  content:   { marginTop: 10, padding: '8 10', borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fafafa' },
  sigRow:    { flexDirection: 'row', marginTop: 20, gap: 20 },
  sigBox:    { flex: 1, borderTopWidth: 1, borderTopColor: '#000', paddingTop: 4 },
  sigLabel:  { fontSize: 7.5, color: '#666', fontFamily: 'Helvetica-Bold' },
  sigValue:  { fontSize: 7.5, marginTop: 2 },
  footer:    { position: 'absolute', bottom: 16, left: 30, right: 30, fontSize: 6.5, color: '#aaa', textAlign: 'center' },
})

const typeLabel: Record<string, string> = {
  EMPLOYMENT: 'Contrat de travail', SERVICE: 'Contrat de service', NDA: 'Accord de confidentialité',
  PARTNERSHIP: 'Partenariat', LEASE: 'Bail', SUPPLIER: 'Fournisseur', CLIENT: 'Client', OTHER: 'Autre',
}

const statusLabel: Record<string, string> = {
  DRAFT: 'Brouillon', PENDING_SIGNATURE: 'En attente de signature',
  SIGNED: 'Signé', EXPIRED: 'Expiré', TERMINATED: 'Résilié',
}

export function ContratPdf({ contrat }: { contrat: LegalContract }) {
  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.headerBand}>
          <View>
            <Text style={S.headerTtl}>{contrat.title}</Text>
            <Text style={S.headerSub}>{typeLabel[contrat.type] ?? contrat.type}</Text>
          </View>
          <Text style={S.badge}>{statusLabel[contrat.status] ?? contrat.status}</Text>
        </View>

        {/* Informations générales */}
        <Text style={S.section}>INFORMATIONS GÉNÉRALES</Text>
        <View style={S.table}>
          {([
            ['Titre',    contrat.title],
            ['Type',     typeLabel[contrat.type] ?? contrat.type],
            ['Statut',   statusLabel[contrat.status] ?? contrat.status],
            ['Créé le',  new Date(contrat.createdAt).toLocaleDateString('fr-FR')],
            ...(contrat.signedAt    ? [['Signé le',    new Date(contrat.signedAt).toLocaleDateString('fr-FR')]]    : []),
            ...(contrat.expiresAt   ? [['Expire le',   new Date(contrat.expiresAt).toLocaleDateString('fr-FR')]]   : []),
            ...(contrat.terminatedAt ? [['Résilié le', new Date(contrat.terminatedAt).toLocaleDateString('fr-FR')]] : []),
          ] as [string, string][]).map(([label, value], i) => (
            <View key={label} style={i % 2 === 0 ? S.row : S.rowAlt}>
              <Text style={S.label}>{label}</Text>
              <Text style={S.value}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Parties */}
        {contrat.parties.length > 0 && (
          <>
            <Text style={S.section}>PARTIES AU CONTRAT</Text>
            <View style={S.table}>
              <View style={{ flexDirection: 'row', backgroundColor: '#d0dcea', padding: '2 5', borderBottomWidth: 0.5, borderBottomColor: '#000' }}>
                <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold' }}>Nom</Text>
                <Text style={{ width: 120, fontSize: 7, fontFamily: 'Helvetica-Bold' }}>Email</Text>
                <Text style={{ width: 80, fontSize: 7, fontFamily: 'Helvetica-Bold' }}>Rôle</Text>
              </View>
              {contrat.parties.map((party, i) => (
                <View key={i} style={i % 2 === 0 ? S.row : S.rowAlt}>
                  <Text style={{ flex: 1 }}>{party.name}</Text>
                  <Text style={{ width: 120 }}>{party.email}</Text>
                  <Text style={{ width: 80, color: '#666' }}>{party.role ?? '—'}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Contenu */}
        {contrat.content && (
          <>
            <Text style={S.section}>CONTENU DU CONTRAT</Text>
            <View style={S.content}>
              <Text style={{ fontSize: 8, lineHeight: 1.5 }}>{contrat.content}</Text>
            </View>
          </>
        )}

        {/* Notes */}
        {contrat.notes && (
          <>
            <Text style={S.section}>NOTES</Text>
            <View style={{ ...S.content, backgroundColor: '#fffbf0', borderColor: '#d97706' }}>
              <Text style={{ fontSize: 8 }}>{contrat.notes}</Text>
            </View>
          </>
        )}

        {/* Signatures */}
        {contrat.signatures.length > 0 && (
          <>
            <Text style={S.section}>SIGNATURES</Text>
            <View style={S.table}>
              <View style={{ flexDirection: 'row', backgroundColor: '#d0dcea', padding: '2 5', borderBottomWidth: 0.5, borderBottomColor: '#000' }}>
                <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold' }}>Signataire</Text>
                <Text style={{ width: 120, fontSize: 7, fontFamily: 'Helvetica-Bold' }}>Email</Text>
                <Text style={{ width: 60, fontSize: 7, fontFamily: 'Helvetica-Bold' }}>Statut</Text>
                <Text style={{ width: 65, fontSize: 7, fontFamily: 'Helvetica-Bold' }}>Date</Text>
              </View>
              {contrat.signatures.map((sig, i) => (
                <View key={i} style={i % 2 === 0 ? S.row : S.rowAlt}>
                  <Text style={{ flex: 1 }}>{sig.signerName}</Text>
                  <Text style={{ width: 120 }}>{sig.signerEmail}</Text>
                  <Text style={{ width: 60, color: sig.status === 'SIGNED' ? '#006633' : '#b45309' }}>{sig.status === 'SIGNED' ? 'Signé' : 'En attente'}</Text>
                  <Text style={{ width: 65 }}>{sig.signedAt ? new Date(sig.signedAt).toLocaleDateString('fr-FR') : '—'}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={S.footer}>
          Athenis Juridique — Document confidentiel — Généré le {new Date().toLocaleString('fr-FR')}
        </Text>
      </Page>
    </Document>
  )
}
