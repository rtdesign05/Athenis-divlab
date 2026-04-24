import { Document, Page, View, Text } from '@react-pdf/renderer'
import { DgiHeaderPdf } from './DgiHeaderPdf'
import { S } from './DgiPdfStyles'
import type { DSFData } from '@/services/fiscalApi'

const fmt = (n: number | undefined | null) =>
  (n ?? 0) === 0 ? '0' : (n ?? 0).toLocaleString('fr-FR') + ' F CFA'

function SectionTitle({ children }: { children: string }) {
  return <Text style={S.sectionHeader}>{children}</Text>
}

function IdentRows({ rows }: { rows: [string, string][] }) {
  return (
    <View style={S.table}>
      {rows.map(([label, value], i) => (
        <View key={i} style={S.identRow}>
          <Text style={S.identLabel}>{label}</Text>
          <Text style={S.identValue}>{value}</Text>
        </View>
      ))}
    </View>
  )
}

interface BilanRow {
  ref: string
  label: string
  cols: (number | undefined)[]
  type: 'section' | 'subtotal' | 'total' | 'row'
}

function BilanTable({ title, cols, rows }: { title: string; cols: string[]; rows: BilanRow[] }) {
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <View style={S.table}>
        <View style={S.colHeaderRow}>
          <Text style={{ ...S.colHeaderCell, width: 32, textAlign: 'center' }}>RÉF</Text>
          <Text style={{ ...S.colHeaderCell, flex: 1 }}>LIBELLÉ</Text>
          {cols.map((c, i) => (
            <Text key={i} style={{ ...S.colHeaderCell, width: 80, textAlign: 'right', borderRightWidth: i === cols.length - 1 ? 0 : 0.5 }}>
              {c}
            </Text>
          ))}
        </View>
        {rows.map((r, i) => {
          const isSection = r.type === 'section'
          const isTotal   = r.type === 'total'
          const isSub     = r.type === 'subtotal'
          const rowStyle  = isTotal ? S.rowResult : isSub ? S.rowSubtotal : isSection ? S.rowSection : i % 2 === 0 ? S.row : S.rowAlt
          const labelStyle = isTotal ? S.cellLabelWhite : isSub ? S.cellLabelBold : S.cellLabel
          const amtStyle   = isTotal ? S.cellAmtWhite : isSub ? S.cellAmtBold : S.cellAmt
          return (
            <View key={i} style={rowStyle}>
              <Text style={{ ...S.cellRef, width: 32, color: isTotal ? 'white' : isSub ? '#333' : '#666' }}>{r.ref}</Text>
              {isSection
                ? <Text style={{ flex: 1, padding: '2 4', fontSize: 7, fontFamily: 'Helvetica-Bold' }}>{r.label}</Text>
                : (
                  <>
                    <Text style={labelStyle}>{r.label}</Text>
                    {r.cols.map((v, ci) => (
                      <Text key={ci} style={{ ...amtStyle, width: 80, borderRightWidth: ci < r.cols.length - 1 ? 0.5 : 0, borderRightColor: '#000' }}>
                        {v !== undefined ? fmt(v) : ''}
                      </Text>
                    ))}
                  </>
                )
              }
            </View>
          )
        })}
      </View>
    </>
  )
}

export function DsfPdf({ data, year }: { data: DSFData; year: number }) {
  const now = new Date().toLocaleString('fr-FR')
  const id  = data.identification
  const b   = data.bilan
  const cr  = data.compteResultat
  const prf = data.passageResultatFiscal
  const ci  = data.calcIS

  const bilanActifRows: BilanRow[] = [
    { ref: 'AA', label: 'ACTIF IMMOBILISÉ',          cols: [],                                              type: 'section'  },
    { ref: 'AW', label: 'Total Actif Immobilisé',    cols: [undefined, undefined, b.actifImmoNet],          type: 'subtotal' },
    { ref: 'BB', label: 'ACTIF CIRCULANT',           cols: [],                                              type: 'section'  },
    { ref: 'BK', label: 'Total Actif Circulant',     cols: [b.actifCirculant, 0, b.actifCirculant],         type: 'subtotal' },
    { ref: 'BT', label: 'Trésorerie Actif',          cols: [b.tresorerie, 0, b.tresorerie],                 type: 'row'      },
    { ref: 'BZ', label: 'TOTAL GÉNÉRAL ACTIF',       cols: [undefined, undefined, b.totalActif],            type: 'total'    },
  ]

  const bilanPassifRows: BilanRow[] = [
    { ref: 'CA', label: 'RESSOURCES DURABLES',       cols: [],                                              type: 'section'  },
    { ref: 'CP', label: 'Capitaux Propres',          cols: [b.capitauxPropres],                             type: 'subtotal' },
    { ref: 'DT', label: 'Dettes Financières',        cols: [b.dettesFinancieres],                           type: 'row'      },
    { ref: 'EB', label: 'DETTES CIRCULANTES',        cols: [],                                              type: 'section'  },
    { ref: 'EK', label: 'Total Dettes Circulantes',  cols: [b.dettesCirculantes],                           type: 'subtotal' },
    { ref: 'TA', label: 'TOTAL GÉNÉRAL PASSIF',      cols: [b.totalPassif],                                 type: 'total'    },
  ]

  const crRows: BilanRow[] = [
    { ref: '',   label: 'PRODUITS',                  cols: [],                                              type: 'section'  },
    { ref: 'TA', label: 'Chiffre d\'affaires ventes',cols: [cr.caVentes],                                   type: 'row'      },
    { ref: 'TB', label: 'CA prestations de services',cols: [cr.caPrestations],                              type: 'row'      },
    { ref: 'TC', label: 'Autres produits',           cols: [cr.autresProduits],                             type: 'row'      },
    { ref: 'TX', label: 'TOTAL PRODUITS',            cols: [cr.totalProduits],                              type: 'subtotal' },
    { ref: '',   label: 'CHARGES',                   cols: [],                                              type: 'section'  },
    { ref: 'RA', label: 'Achats de marchandises',    cols: [cr.achats],                                     type: 'row'      },
    { ref: 'RB', label: 'Transports',                cols: [cr.transports],                                 type: 'row'      },
    { ref: 'RC', label: 'Services extérieurs',       cols: [cr.servicesExt],                                type: 'row'      },
    { ref: 'RD', label: 'Impôts et taxes',           cols: [cr.impotsTaxes],                                type: 'row'      },
    { ref: 'RE', label: 'Charges de personnel',      cols: [cr.chargesPersonnel],                           type: 'row'      },
    { ref: 'RF', label: 'Dot. amortissements',       cols: [cr.dotationsAmort],                             type: 'row'      },
    { ref: 'RG', label: 'Charges financières',       cols: [cr.chargesFinancieres],                         type: 'row'      },
    { ref: 'RY', label: 'IS sur exercice',           cols: [cr.isSurExercice],                              type: 'row'      },
    { ref: 'RZ', label: 'TOTAL CHARGES',             cols: [cr.totalCharges],                               type: 'subtotal' },
    { ref: 'ZZ', label: 'RÉSULTAT NET',              cols: [cr.resultatNet],                                type: 'total'    },
  ]

  const isEquilibre = Math.abs(b.totalActif - b.totalPassif) < 1

  return (
    <Document>
      {/* ═══════════════════════════════════════════════ PAGE 1 — Identification + Bilan */}
      <Page size="A4" style={S.page}>
        <DgiHeaderPdf
          formRef="DSF/SN-DGI"
          title={`DECLARATION STATISTIQUE ET FISCALE — SYSTÈME NORMAL — EXERCICE ${year - 1}`}
          subtitle={`Dépôt avant le 15/03/${year}  |  SYSCOHADA Révisé  |  Art. 18 CGI Cameroun`}
          centerImpots={id.centreImpots}
          niu={id.niu}
        />

        {/* FICHE 1 — Identification */}
        <SectionTitle>FICHE 1 — INFORMATIONS GÉNÉRALES SUR L'ENTREPRISE</SectionTitle>
        <IdentRows rows={[
          ['Raison sociale',          id.raisonSociale],
          ['NIU',                     id.niu],
          ['RCCM',                    id.rccm],
          ['Forme juridique',         id.formeJuridique],
          ['Code activité (NACAM)',   id.codeActivite],
          ['Activité principale',     id.activite],
          ['Adresse siège social',    `${id.adresse}, ${id.ville}`],
          ['Centre des impôts',       id.centreImpots],
          ["Régime d'imposition",     id.regimeFiscal],
          ['Exercice comptable',      `01/01/${year - 1}–31/12/${year - 1}`],
          ['Devise',                  'XAF — Franc CFA BEAC'],
          ['Capital social (F CFA)',  (id.capital ?? 0).toLocaleString('fr-FR') + ' F CFA'],
        ]} />

        {/* FICHE 2 — Bilan Actif */}
        <BilanTable
          title={`FICHE 2 — BILAN AU 31/12/${year - 1} — ACTIF (SYSCOHADA RÉVISÉ)`}
          cols={['BRUT', 'AMORT', 'NET']}
          rows={bilanActifRows}
        />

        {/* FICHE 3 — Bilan Passif */}
        <BilanTable
          title={`FICHE 3 — BILAN AU 31/12/${year - 1} — PASSIF (SYSCOHADA RÉVISÉ)`}
          cols={['MONTANT']}
          rows={bilanPassifRows}
        />

        {isEquilibre
          ? <View style={{ ...S.greenNotice, marginTop: 4 }}><Text style={S.greenNoticeText}>✅ Bilan équilibré — Actif = Passif = {fmt(b.totalActif)}</Text></View>
          : <View style={{ ...S.noticeBox, marginTop: 4 }}><Text style={S.noticeText}>⚠ Bilan non équilibré — Actif : {fmt(b.totalActif)} ≠ Passif : {fmt(b.totalPassif)}</Text></View>
        }

        <Text style={S.watermark}>
          Préparé via Athenis — Dépôt officiel obligatoire sur www.impots.cm (Harmony 2 DGI) — Généré le {now}
        </Text>
        <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {/* ═══════════════════════════════════════════════ PAGE 2 — CR + Tableau Fiscal */}
      <Page size="A4" style={S.page}>
        <DgiHeaderPdf
          formRef="DSF/SN-DGI"
          title={`DECLARATION STATISTIQUE ET FISCALE — EXERCICE ${year - 1}`}
          centerImpots={id.centreImpots}
          niu={id.niu}
        />

        {/* FICHE 4 — Compte de Résultat */}
        <BilanTable
          title={`FICHE 4 — COMPTE DE RÉSULTAT AU 31/12/${year - 1}`}
          cols={['MONTANT N']}
          rows={crRows}
        />

        {/* FICHE 7 — Tableau Fiscal */}
        <SectionTitle>FICHE 7 — PASSAGE DU RÉSULTAT COMPTABLE AU RÉSULTAT FISCAL</SectionTitle>
        <View style={S.table}>
          {([
            ['T1',  'Résultat net comptable',                     prf.resultatNetComptable],
            ['T2',  'Réintégrations — Amendes & pénalités',       prf.amendes],
            ['T3',  'Réintégrations — Charges personnelles',      prf.chargesPersonnelles],
            ['T4',  'Réintégrations — Provisions non conformes',  prf.provisionsNonConformes],
            ['T5',  'Réintégrations — Dépenses somptuaires',      prf.depensesSomptuaires],
            ['T6',  'Total réintégrations',                       prf.totalReintegrations],
            ['T7',  'Déductions — Produits non imposables',       prf.produitsNonImposables],
            ['T8',  'Déductions — Déficits reportés',             prf.deficitsReportes],
            ['T18', 'RÉSULTAT FISCAL NET',                        prf.resultatFiscalNet],
          ] as [string, string, number][]).map(([ref, label, val], i) => {
            const isLast = ref === 'T18'
            const rowStyle = isLast ? S.rowResult : i % 2 === 0 ? S.row : S.rowAlt
            return (
              <View key={ref} style={rowStyle}>
                <Text style={{ ...S.cellRef, color: isLast ? 'white' : '#666' }}>{ref}</Text>
                <Text style={isLast ? S.cellLabelWhite : S.cellLabel}>{label}</Text>
                <Text style={isLast ? S.cellAmtWhite : S.cellAmt}>{fmt(val)}</Text>
              </View>
            )
          })}
        </View>

        {/* FICHE 8 — Récapitulatif IS */}
        <SectionTitle>FICHE 8 — CALCUL DE L'IMPÔT SUR LES SOCIÉTÉS (IS)</SectionTitle>
        <View style={S.table}>
          {([
            ['I1', 'Base imposable',          ci.baseImposable],
            ['I2', `Taux IS (${(ci.tauxIS * 100).toFixed(0)}%)`,  ci.isTheorique],
            ['I3', 'IS théorique calculé',    ci.isTheorique],
            ['I4', 'IS minimum légal (1%)',   ci.isMinimum],
            ['I5', 'IS DÛ (max I3, I4)',      ci.isPayer],
            ['I6', 'Acomptes IS versés',      ci.acomptesVerses],
            ['I9', 'SOLDE IS À PAYER',        ci.soldeAPayer],
          ] as [string, string, number][]).map(([ref, label, val], i) => {
            const isLast = ref === 'I9'
            const rowStyle = isLast ? S.rowResult : i % 2 === 0 ? S.row : S.rowAlt
            return (
              <View key={ref} style={rowStyle}>
                <Text style={{ ...S.cellRef, color: isLast ? 'white' : '#666' }}>{ref}</Text>
                <Text style={isLast ? S.cellLabelWhite : S.cellLabel}>{label}</Text>
                <Text style={isLast ? S.cellAmtWhite : S.cellAmt}>{fmt(val)}</Text>
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
        <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  )
}
