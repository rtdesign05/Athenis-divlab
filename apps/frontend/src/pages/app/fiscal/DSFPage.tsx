import { useState } from 'react'
import { useDSF } from '@/hooks/useFiscal'
import { DgiFormHeader } from '@/components/fiscal/DgiFormHeader'
import { FormPageViewer } from '@/components/fiscal/FormPageViewer'
import { usePdfDownload } from '@/hooks/usePdfDownload'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'

const YEARS = [2024, 2025, 2026]

const DGI_GREEN      = '#006633'
const DGI_SECTION_BG = '#E8F5E9'
const DGI_TOTAL_BG   = '#C8E6C9'
const DGI_ROW_ALT    = '#F1F8E9'
const DGI_BORDER     = '1px solid #000'

const cellBase: React.CSSProperties     = { border: DGI_BORDER, padding: '3px 6px', fontSize: 9, fontFamily: 'Arial, sans-serif' }
const sectionHdr: React.CSSProperties   = { ...cellBase, background: DGI_GREEN, color: '#fff', fontWeight: 'bold', fontSize: 10 }
const subtotalCell: React.CSSProperties = { ...cellBase, background: DGI_TOTAL_BG, fontWeight: 'bold' }
const resultCell: React.CSSProperties   = { ...cellBase, background: DGI_GREEN, color: '#fff', fontWeight: 'bold', fontSize: 10 }
const refCell: React.CSSProperties      = { ...cellBase, color: '#666', fontSize: 8, width: 32, textAlign: 'center', fontFamily: 'monospace' }
const tblStyle: React.CSSProperties     = { borderCollapse: 'collapse', width: '100%', fontSize: 9, fontFamily: 'Arial, sans-serif' }

function fmt(n: number | undefined | null) { return (n ?? 0).toLocaleString('fr-FR') }

function MiniHeader({ title, period, fiche }: { title: string; period: string; fiche: number }) {
  return (
    <div style={{ borderBottom: '2px solid #006633', paddingBottom: 4, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#006633', fontWeight: 'bold' }}>DSF/SN-DGI — Fiche {fiche}/8</span>
        <span style={{ fontSize: 8, color: '#555' }}>{period}</span>
      </div>
      <div style={{ fontSize: 8, color: '#333', marginTop: 2 }}>{title}</div>
    </div>
  )
}

// ── Fiche 1 — Identification ─────────────────────────────────────────────────
function Fiche1({ data, year }: { data: NonNullable<ReturnType<typeof useDSF>['data']>; year: number }) {
  const id = data.identification
  return (
    <table style={{ ...tblStyle, marginTop: 8 }}>
      <thead>
        <tr><th colSpan={2} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
          INFORMATIONS GÉNÉRALES SUR L'ENTREPRISE
        </th></tr>
      </thead>
      <tbody>
        {[
          ['Raison sociale',              id.raisonSociale],
          ['NIU',                         id.niu],
          ['RCCM',                        id.rccm],
          ['Forme juridique',             id.formeJuridique],
          ['Date de création',            '01/01/2020'],
          ['Code activité (NACAM)',        id.codeActivite],
          ['Activité principale',          id.activite],
          ['Adresse siège social',         `${id.adresse}, ${id.ville}`],
          ['Téléphone',                    id.telephone],
          ['Email',                        id.email],
          ['Centre des impôts',            id.centreImpots],
          ["Régime d'imposition",          id.regimeFiscal],
          ['Exercice comptable',           `01/01/${year - 1}–31/12/${year - 1}`],
          ['Devise',                       'XAF — Franc CFA'],
          ['Code pays OHADA',              '09 (Cameroun)'],
          ['Capital social (F CFA)',       fmt(id.capital)],
        ].map(([label, value], i) => (
          <tr key={label} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
            <td style={{ ...cellBase, width: '40%', background: DGI_SECTION_BG, fontWeight: 600 }}>{label}</td>
            <td style={{ ...cellBase, fontFamily: label === 'NIU' || label === 'RCCM' ? 'monospace' : undefined }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Fiche 2 — Bilan Actif ────────────────────────────────────────────────────
function Fiche2({ data }: { data: NonNullable<ReturnType<typeof useDSF>['data']> }) {
  const b = data.bilan
  const im = data.immobilisations

  type BilanRow = [string, string, number | undefined, number | undefined, number | undefined, 'section' | 'subtotal' | 'total' | 'row']
  const rows: BilanRow[] = [
    ['AA', 'ACTIF IMMOBILISÉ',                       undefined,            undefined,                undefined,                    'section'],
    ['AJ', 'Immobilisations corporelles',             im.valeurBruteDebut, im.amortsCumDebut,        im.valeurNette,               'row'],
    ['AP', 'Matériel de bureau & informatique',       im.valeurBruteDebut, im.dotationsExercice,     im.valeurNette,               'row'],
    ['AT', 'Immobilisations financières',             0,                   0,                        0,                            'row'],
    ['AW', 'TOTAL ACTIF IMMOBILISÉ',                 im.valeurBruteFin,   im.amortsCumFin,          b.actifImmoNet,               'subtotal'],
    ['BB', 'STOCKS',                                 0,                   0,                        0,                            'section'],
    ['BI', 'Clients et comptes rattachés',           b.actifCirculant,    0,                        b.actifCirculant,             'row'],
    ['BK', 'TOTAL ACTIF CIRCULANT',                  b.actifCirculant,    0,                        b.actifCirculant,             'subtotal'],
    ['BT', 'Banques, CCP, caisse',                   b.tresorerie,        0,                        b.tresorerie,                 'row'],
    ['BU', 'TOTAL TRÉSORERIE ACTIF',                 b.tresorerie,        0,                        b.tresorerie,                 'subtotal'],
    ['BZ', 'TOTAL GÉNÉRAL ACTIF',                    undefined,           im.amortsCumFin,          b.totalActif,                 'total'],
  ]

  return (
    <table style={{ ...tblStyle, marginTop: 8 }}>
      <thead>
        <tr><th colSpan={5} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
          BILAN AU 31/12 — ACTIF (SYSCOHADA RÉVISÉ)
        </th></tr>
        <tr style={{ background: DGI_SECTION_BG }}>
          <th style={{ ...cellBase, width: 36, textAlign: 'center', fontSize: 8 }}>RÉF</th>
          <th style={{ ...cellBase, textAlign: 'left' }}>ACTIF</th>
          <th style={{ ...cellBase, textAlign: 'right', width: 120 }}>BRUT (F CFA)</th>
          <th style={{ ...cellBase, textAlign: 'right', width: 120 }}>AMORT/DEP</th>
          <th style={{ ...cellBase, textAlign: 'right', width: 120 }}>NET (F CFA)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([ref, label, brut, amort, net, type], i) => {
          if (type === 'section') return (
            <tr key={ref}><td style={{ ...refCell, background: DGI_SECTION_BG }}>{ref}</td>
              <td colSpan={4} style={{ ...cellBase, background: DGI_SECTION_BG, fontWeight: 'bold' }}>{label}</td></tr>
          )
          if (type === 'total') return (
            <tr key={ref}>
              <td style={{ ...refCell, background: DGI_GREEN, color: '#fff' }}>{ref}</td>
              <td style={resultCell}>{label}</td>
              <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace' }}>{brut !== undefined ? fmt(brut) : ''}</td>
              <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace' }}>{amort !== undefined ? fmt(amort) : ''}</td>
              <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace' }}>{net !== undefined ? fmt(net) : ''}</td>
            </tr>
          )
          if (type === 'subtotal') return (
            <tr key={ref}>
              <td style={{ ...refCell, background: DGI_TOTAL_BG }}>{ref}</td>
              <td style={subtotalCell}>{label}</td>
              <td style={{ ...subtotalCell, textAlign: 'right', fontFamily: 'monospace' }}>{brut !== undefined ? fmt(brut) : ''}</td>
              <td style={{ ...subtotalCell, textAlign: 'right', fontFamily: 'monospace' }}>{amort !== undefined ? fmt(amort) : ''}</td>
              <td style={{ ...subtotalCell, textAlign: 'right', fontFamily: 'monospace' }}>{net !== undefined ? fmt(net) : ''}</td>
            </tr>
          )
          return (
            <tr key={ref} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={refCell}>{ref}</td>
              <td style={cellBase}>{label}</td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{brut !== undefined ? fmt(brut) : '0'}</td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{amort !== undefined ? fmt(amort) : '0'}</td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{net !== undefined ? fmt(net) : '0'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Fiche 3 — Bilan Passif ───────────────────────────────────────────────────
function Fiche3({ data }: { data: NonNullable<ReturnType<typeof useDSF>['data']> }) {
  const b = data.bilan

  type PassifRow = [string, string, number | undefined, 'section' | 'subtotal' | 'total' | 'row']
  const rows: PassifRow[] = [
    ['CA', 'RESSOURCES DURABLES',                   undefined,           'section'],
    ['CC', 'Capital',                               b.capitauxPropres,   'row'],
    ['CH', 'Réserves libres',                       0,                   'row'],
    ['CI', 'Report à nouveau',                      0,                   'row'],
    ['CJ', 'Résultat net de l\'exercice',           data.compteResultat.resultatNet, 'row'],
    ['CM', 'TOTAL CAPITAUX PROPRES',                b.capitauxPropres,   'subtotal'],
    ['DA', 'Dettes financières',                    b.dettesFinancieres, 'section'],
    ['DC', 'Emprunts établissements de crédit',     b.dettesFinancieres, 'row'],
    ['DF', 'TOTAL RESSOURCES DURABLES',             b.capitauxPropres + b.dettesFinancieres, 'subtotal'],
    ['DH', 'Clients avances reçues',                0,                   'section'],
    ['DI', 'Fournisseurs',                          0,                   'row'],
    ['DJ', 'Dettes fiscales',                       b.dettesCirculantes, 'row'],
    ['DK', 'Dettes sociales (CNPS)',                0,                   'row'],
    ['DM', 'TOTAL PASSIF CIRCULANT',                b.dettesCirculantes, 'subtotal'],
    ['DQ', 'TRÉSORERIE PASSIF',                     0,                   'section'],
    ['',   'TOTAL GÉNÉRAL PASSIF',                  b.totalPassif,       'total'],
  ]

  const balanced = b.totalActif === b.totalPassif

  return (
    <>
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={3} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            BILAN AU 31/12 — PASSIF (SYSCOHADA RÉVISÉ)
          </th></tr>
          <tr style={{ background: DGI_SECTION_BG }}>
            <th style={{ ...cellBase, width: 36, textAlign: 'center', fontSize: 8 }}>RÉF</th>
            <th style={{ ...cellBase, textAlign: 'left' }}>PASSIF</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 150 }}>MONTANT NET (F CFA)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([ref, label, amount, type], i) => {
            if (type === 'section') return (
              <tr key={ref + label}><td style={{ ...refCell, background: DGI_SECTION_BG }}>{ref}</td>
                <td colSpan={2} style={{ ...cellBase, background: DGI_SECTION_BG, fontWeight: 'bold' }}>{label}</td></tr>
            )
            if (type === 'total') return (
              <tr key={ref + label}>
                <td style={{ ...refCell, background: DGI_GREEN, color: '#fff' }}>{ref}</td>
                <td style={resultCell}>{label}</td>
                <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace' }}>{amount !== undefined ? fmt(amount) : ''}</td>
              </tr>
            )
            if (type === 'subtotal') return (
              <tr key={ref + label}>
                <td style={{ ...refCell, background: DGI_TOTAL_BG }}>{ref}</td>
                <td style={subtotalCell}>{label}</td>
                <td style={{ ...subtotalCell, textAlign: 'right', fontFamily: 'monospace' }}>{amount !== undefined ? fmt(amount) : ''}</td>
              </tr>
            )
            return (
              <tr key={ref + label} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
                <td style={refCell}>{ref}</td>
                <td style={cellBase}>{label}</td>
                <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{amount !== undefined ? fmt(amount) : '0'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{
        marginTop: 6, padding: '6px 10px', fontSize: 9, fontFamily: 'Arial',
        background: balanced ? DGI_TOTAL_BG : '#FFEBEE',
        border: `1px solid ${balanced ? DGI_GREEN : '#CE1126'}`,
      }}>
        {balanced
          ? `✅ Bilan équilibré — Actif net = ${fmt(data.bilan.totalActif)} = Passif = ${fmt(data.bilan.totalPassif)} F CFA`
          : `⚠ Bilan non équilibré — Actif : ${fmt(data.bilan.totalActif)} ≠ Passif : ${fmt(data.bilan.totalPassif)} F CFA`}
      </div>
    </>
  )
}

// ── Fiche 4 — Compte de Résultat ─────────────────────────────────────────────
function Fiche4({ data, year }: { data: NonNullable<ReturnType<typeof useDSF>['data']>; year: number }) {
  const cr = data.compteResultat

  type CrRow = [string, string, number, number, 'section' | 'subtotal' | 'total' | 'row']
  const rows: CrRow[] = [
    ['RA', 'Ventes de marchandises (703)',          0,                      0,                  'row'],
    ['RE', 'Travaux et services vendus (706)',       cr.caPrestations,       cr.caPrestations * 0.85, 'row'],
    ['RH', 'CHIFFRE D\'AFFAIRES',                  cr.caPrestations,       cr.caPrestations * 0.85, 'subtotal'],
    ['RK', '— Autres achats',                       cr.achats,              cr.achats * 0.9,    'row'],
    ['RL', '— Transports',                          cr.transports,          cr.transports * 0.9,'row'],
    ['RM', '— Services extérieurs',                 cr.servicesExt,         cr.servicesExt * 0.9,'row'],
    ['RN', '— Impôts et taxes',                     cr.impotsTaxes,         cr.impotsTaxes * 0.9,'row'],
    ['RP', 'VALEUR AJOUTÉE',                        cr.totalProduits - cr.achats - cr.transports - cr.servicesExt - cr.impotsTaxes,
                                                    (cr.totalProduits - cr.achats - cr.transports - cr.servicesExt - cr.impotsTaxes) * 0.85, 'subtotal'],
    ['RQ', '— Charges de personnel (661/664)',      cr.chargesPersonnel,    cr.chargesPersonnel * 0.9, 'row'],
    ['RR', 'EXCÉDENT BRUT D\'EXPLOITATION',        cr.totalProduits - cr.achats - cr.transports - cr.servicesExt - cr.impotsTaxes - cr.chargesPersonnel,
                                                    0,                      'subtotal'],
    ['RU', '— Dotations amortissements (68)',       cr.dotationsAmort,      cr.dotationsAmort * 0.9, 'row'],
    ['RV', 'RÉSULTAT D\'EXPLOITATION',             cr.totalProduits - cr.totalCharges + cr.isSurExercice,
                                                    0,                      'subtotal'],
    ['SC', '— Impôts sur résultat (IS)',            cr.isSurExercice,       cr.isSurExercice * 0.9, 'row'],
    ['SD', 'RÉSULTAT NET DE L\'EXERCICE',          cr.resultatNet,         0,                  'total'],
  ]

  return (
    <table style={{ ...tblStyle, marginTop: 8 }}>
      <thead>
        <tr><th colSpan={4} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
          COMPTE DE RÉSULTAT AU 31/12/{year - 1} (SYSCOHADA RÉVISÉ)
        </th></tr>
        <tr style={{ background: DGI_SECTION_BG }}>
          <th style={{ ...cellBase, width: 36, textAlign: 'center', fontSize: 8 }}>RÉF</th>
          <th style={{ ...cellBase, textAlign: 'left' }}>LIBELLÉ</th>
          <th style={{ ...cellBase, textAlign: 'right', width: 140 }}>Exercice N (F CFA)</th>
          <th style={{ ...cellBase, textAlign: 'right', width: 140 }}>Exercice N-1 (F CFA)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([ref, label, n, n1, type], i) => {
          if (type === 'total') return (
            <tr key={ref}>
              <td style={{ ...refCell, background: DGI_GREEN, color: '#fff' }}>{ref}</td>
              <td style={{ ...resultCell, fontSize: 11 }}>{label}</td>
              <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace', fontSize: 11 }}>{fmt(n)}</td>
              <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace', fontSize: 11 }}>{fmt(n1)}</td>
            </tr>
          )
          if (type === 'subtotal') return (
            <tr key={ref}>
              <td style={{ ...refCell, background: DGI_TOTAL_BG }}>{ref}</td>
              <td style={subtotalCell}>{label}</td>
              <td style={{ ...subtotalCell, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(n)}</td>
              <td style={{ ...subtotalCell, textAlign: 'right', fontFamily: 'monospace' }}>{n1 ? fmt(n1) : '—'}</td>
            </tr>
          )
          return (
            <tr key={ref} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={refCell}>{ref}</td>
              <td style={cellBase}>{label}</td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(n)}</td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', color: '#888' }}>{n1 ? fmt(n1) : '0'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Fiche 5 — TAFIRE ─────────────────────────────────────────────────────────
function Fiche5({ data, year }: { data: NonNullable<ReturnType<typeof useDSF>['data']>; year: number }) {
  const cr = data.compteResultat
  const b  = data.bilan
  const im = data.immobilisations
  const fluxOp   = cr.resultatNet + cr.dotationsAmort
  const tresoFin = b.tresorerie
  const tresoDebut = tresoFin - fluxOp

  type TafireRow = [string, string, number, number, 'section' | 'subtotal' | 'total' | 'row']
  const rows: TafireRow[] = [
    ['', 'ACTIVITÉS OPÉRATIONNELLES',              0,            0,          'section'],
    ['FA','Résultat net',                           cr.resultatNet, 0,        'row'],
    ['FB','+ Dotations amortissements',             cr.dotationsAmort, 0,     'row'],
    ['FC','+ Dotations provisions',                 0,            0,          'row'],
    ['FE','± Variation stocks',                     0,            0,          'row'],
    ['FF','± Variation clients (créances)',         -(b.actifCirculant * 0.1), 0, 'row'],
    ['FG','± Variation fournisseurs (dettes)',      b.dettesCirculantes * 0.05, 0, 'row'],
    ['FI','FLUX OPÉRATIONNELS NETS',               fluxOp,       0,          'subtotal'],
    ['', 'ACTIVITÉS D\'INVESTISSEMENT',             0,            0,          'section'],
    ['FJ','— Acquisitions immobilisations',         -(im.acquisitions), -(im.acquisitions * 1.1), 'row'],
    ['FK','+ Cessions immobilisations',             im.cessions,  0,          'row'],
    ['FL','FLUX INVESTISSEMENT NETS',               im.cessions - im.acquisitions, 0, 'subtotal'],
    ['', 'ACTIVITÉS DE FINANCEMENT',               0,            0,          'section'],
    ['FM','+ Augmentation capital',                 0,            0,          'row'],
    ['FN','+ Nouveaux emprunts',                    0,            0,          'row'],
    ['FO','— Remboursement emprunts',               0,            0,          'row'],
    ['FQ','FLUX FINANCEMENT NETS',                  0,            0,          'subtotal'],
    ['FR','VARIATION TRÉSORERIE',                   fluxOp + (im.cessions - im.acquisitions), 0, 'subtotal'],
    ['FS','Trésorerie début d\'exercice',           tresoDebut,   0,          'row'],
    ['FT','TRÉSORERIE FIN D\'EXERCICE',             tresoFin,     0,          'total'],
  ]

  return (
    <table style={{ ...tblStyle, marginTop: 8 }}>
      <thead>
        <tr><th colSpan={4} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
          TABLEAU DES FLUX DE TRÉSORERIE (TAFIRE) — EXERCICE {year - 1}
        </th></tr>
        <tr style={{ background: DGI_SECTION_BG }}>
          <th style={{ ...cellBase, width: 36, textAlign: 'center', fontSize: 8 }}>RÉF</th>
          <th style={{ ...cellBase, textAlign: 'left' }}>LIBELLÉ</th>
          <th style={{ ...cellBase, textAlign: 'right', width: 140 }}>Exercice N (F CFA)</th>
          <th style={{ ...cellBase, textAlign: 'right', width: 140 }}>Exercice N-1 (F CFA)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([ref, label, n, n1, type], i) => {
          if (type === 'section') return (
            <tr key={ref + label}><td colSpan={4} style={{ ...sectionHdr }}>{label}</td></tr>
          )
          if (type === 'total') return (
            <tr key={ref}>
              <td style={{ ...refCell, background: DGI_GREEN, color: '#fff' }}>{ref}</td>
              <td style={resultCell}>{label}</td>
              <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(n)}</td>
              <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace' }}>{n1 ? fmt(n1) : '—'}</td>
            </tr>
          )
          if (type === 'subtotal') return (
            <tr key={ref + label}>
              <td style={{ ...refCell, background: DGI_TOTAL_BG }}>{ref}</td>
              <td style={subtotalCell}>{label}</td>
              <td style={{ ...subtotalCell, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(n)}</td>
              <td style={{ ...subtotalCell, textAlign: 'right', fontFamily: 'monospace' }}>{n1 ? fmt(n1) : '—'}</td>
            </tr>
          )
          return (
            <tr key={ref + label} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={refCell}>{ref}</td>
              <td style={cellBase}>{label}</td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(n)}</td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', color: '#888' }}>{n1 ? fmt(n1) : '0'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Fiche 6 — Notes Annexes ──────────────────────────────────────────────────
const NOTES_SECTIONS = [
  { n: 1, title: 'Cadre juridique et activité' },
  { n: 2, title: 'Règles et méthodes comptables' },
  { n: 3, title: 'Immobilisations (tableau détaillé)' },
  { n: 4, title: 'Amortissements' },
  { n: 5, title: 'Créances' },
  { n: 6, title: 'Capitaux propres' },
  { n: 7, title: 'Dettes' },
  { n: 8, title: 'Engagements hors bilan' },
  { n: 9, title: 'Effectifs et charges de personnel' },
  { n: 10, title: 'Événements postérieurs à la clôture' },
]

function Fiche6() {
  const [notes, setNotes] = useState<Record<number, string>>({})
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ ...sectionHdr, marginBottom: 8, padding: '6px 10px', display: 'block' }}>
        NOTES ANNEXES — EXERCICE (SYSCOHADA RÉVISÉ)
      </div>
      {NOTES_SECTIONS.map(s => (
        <div key={s.n} style={{ marginBottom: 10 }}>
          <div style={{ ...cellBase, background: DGI_SECTION_BG, fontWeight: 'bold' }}>
            Note {s.n} — {s.title}
          </div>
          <textarea
            value={notes[s.n] ?? ''}
            onChange={e => setNotes(prev => ({ ...prev, [s.n]: e.target.value }))}
            style={{
              width: '100%', minHeight: 60, border: DGI_BORDER, padding: 6,
              fontSize: 9, fontFamily: 'Arial', resize: 'vertical', boxSizing: 'border-box',
            }}
            placeholder={`Saisir le contenu de la Note ${s.n}…`}
          />
        </div>
      ))}
    </div>
  )
}

// ── Fiche 7 — Tableau Fiscal ─────────────────────────────────────────────────
function Fiche7({ data }: { data: NonNullable<ReturnType<typeof useDSF>['data']> }) {
  const pf = data.passageResultatFiscal
  const is = data.calcIS

  type FiscRow = [string, string, number, 'section' | 'subtotal' | 'total' | 'row']
  const rows: FiscRow[] = [
    ['T1',  'Résultat comptable net',                    pf.resultatNetComptable,    'row'],
    ['',    'RÉINTÉGRATIONS (+)',                        0,                           'section'],
    ['T2',  'Amendes et pénalités fiscales',             pf.amendes,                  'row'],
    ['T3',  'Dépenses somptuaires',                      pf.depensesSomptuaires,      'row'],
    ['T4',  'Provisions non déductibles',                pf.provisionsNonConformes,   'row'],
    ['T5',  'Charges personnelles dirigeants',           pf.chargesPersonnelles,      'row'],
    ['T7',  'TOTAL RÉINTÉGRATIONS',                     pf.totalReintegrations,      'subtotal'],
    ['',    'DÉDUCTIONS (−)',                            0,                           'section'],
    ['T8',  'Produits non imposables',                   pf.produitsNonImposables,    'row'],
    ['T11', 'TOTAL DÉDUCTIONS',                         pf.produitsNonImposables,    'subtotal'],
    ['T12', 'Déficits antérieurs reportés',              pf.deficitsReportes,         'row'],
    ['T13', 'RÉSULTAT FISCAL NET',                      pf.resultatFiscalNet,        'total'],
    ['',    'CALCUL IS',                                 0,                           'section'],
    ['T14', `IS calculé (T13 × ${(is.tauxIS * 100).toFixed(0)}%)`, is.isTheorique,  'row'],
    ['T15', 'IS minimum (CA × 2.2% × 12/mois)',         is.isMinimum,               'row'],
    ['T16', 'IS DÛ (max T14, T15)',                     is.isPayer,                  'subtotal'],
    ['T17', 'Acomptes IS versés',                        -(is.acomptesVerses),        'row'],
    ['T18', 'SOLDE IS À PAYER',                         is.soldeAPayer,              'total'],
  ]

  return (
    <table style={{ ...tblStyle, marginTop: 8 }}>
      <thead>
        <tr><th colSpan={3} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
          PASSAGE DU RÉSULTAT COMPTABLE AU RÉSULTAT FISCAL
        </th></tr>
        <tr style={{ background: DGI_SECTION_BG }}>
          <th style={{ ...cellBase, width: 36, textAlign: 'center', fontSize: 8 }}>N°</th>
          <th style={{ ...cellBase, textAlign: 'left' }}>LIBELLÉ</th>
          <th style={{ ...cellBase, textAlign: 'right', width: 160 }}>MONTANT (F CFA)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([ref, label, amount, type], i) => {
          if (type === 'section') return (
            <tr key={ref + label}><td colSpan={3} style={{ ...cellBase, background: DGI_SECTION_BG, fontWeight: 'bold' }}>{label}</td></tr>
          )
          if (type === 'total') return (
            <tr key={ref}>
              <td style={{ ...refCell, background: DGI_GREEN, color: '#fff' }}>{ref}</td>
              <td style={{ ...resultCell, fontSize: 11 }}>{label}</td>
              <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace', fontSize: 11 }}>{fmt(amount)}</td>
            </tr>
          )
          if (type === 'subtotal') return (
            <tr key={ref + label}>
              <td style={{ ...refCell, background: DGI_TOTAL_BG }}>{ref}</td>
              <td style={subtotalCell}>{label}</td>
              <td style={{ ...subtotalCell, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(amount)}</td>
            </tr>
          )
          return (
            <tr key={ref + label} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={refCell}>{ref}</td>
              <td style={cellBase}>{label}</td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(amount)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Fiche 8 — Récapitulatif impôts ───────────────────────────────────────────
function Fiche8({ data, year }: { data: NonNullable<ReturnType<typeof useDSF>['data']>; year: number }) {
  const tv = data.tvaRecap
  const ef = data.effectifs

  const impots: [string, number, number][] = [
    ['TVA nette annuelle',             tv.tvaNetteVersee,      tv.tvaNetteVersee],
    ['IS (solde)',                     data.calcIS.soldeAPayer, data.calcIS.soldeAPayer],
    ['IRPP retenu sur salaires',       ef.irppRetenu,          ef.irppRetenu],
    ['Retenues à la source (RAS)',     0,                      0],
    ['Patente',                        0,                      0],
    ['Taxe foncière',                  0,                      0],
    ['CNPS (cotisations)',             ef.cnpsPatronal,        ef.cnpsPatronal],
    ['FDFP (formation professionnelle)',ef.fdfpVerse,          ef.fdfpVerse],
    ['Autres impôts et taxes',         0,                      0],
  ]

  const totalDec = impots.reduce((s, r) => s + r[1], 0)
  const totalPay = impots.reduce((s, r) => s + r[2], 0)

  return (
    <>
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={4} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            RÉCAPITULATIF DES IMPÔTS ET TAXES DÉCLARÉS ET PAYÉS — EXERCICE {year - 1}
          </th></tr>
          <tr style={{ background: DGI_SECTION_BG }}>
            <th style={{ ...cellBase, width: 28, textAlign: 'center', fontSize: 8 }}>N°</th>
            <th style={{ ...cellBase, textAlign: 'left' }}>NATURE IMPÔT / TAXE</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 130 }}>DÉCLARÉ (F CFA)</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 130 }}>PAYÉ (F CFA)</th>
          </tr>
        </thead>
        <tbody>
          {impots.map(([label, declared, paid], i) => (
            <tr key={label} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={{ ...refCell, fontSize: 9 }}>I{i + 1}</td>
              <td style={cellBase}>{label}</td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(declared)}</td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(paid)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} style={resultCell}>TOTAL</td>
            <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totalDec)}</td>
            <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totalPay)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Signature block */}
      <table style={{ ...tblStyle, marginTop: 12 }}>
        <tbody>
          <tr>
            <td style={{ ...cellBase, padding: '14px 10px', fontSize: 9, lineHeight: 2.2 }}>
              Je soussigné(e) <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 200 }}>&nbsp;</span> certifie l'exactitude des renseignements portés dans la présente déclaration.<br/>
              Fait à <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 120 }}>&nbsp;</span>, le <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 100 }}>&nbsp;</span><br/><br/>
              <div style={{ marginTop: 8, textAlign: 'center', border: '1px dashed #999', padding: 28, color: '#aaa', fontSize: 10 }}>
                Signature et cachet du contribuable
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </>
  )
}

// ── Main DSF Page ─────────────────────────────────────────────────────────────
export function DSFPage() {
  const { country } = useCompanySettings()
  const [year, setYear]           = useState(new Date().getFullYear())
  const [currentPage, setCurrentPage] = useState(1)
  const { data, isLoading }       = useDSF(year)
  const { downloadDsf }           = usePdfDownload()

  // DSF est un formulaire DGI Cameroun (Déclaration Statistique et Fiscale).
  // Pour la France l'équivalent est la liasse fiscale (BIC/BNC) via téléTVA.
  if (country && country !== 'CM') {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 px-8 py-12 text-center max-w-lg">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-base font-semibold text-amber-900">DSF spécifique au Cameroun</p>
          <p className="mt-2 text-sm text-amber-800">
            La <strong>Déclaration Statistique et Fiscale (DSF)</strong> est un formulaire
            DGI propre au Cameroun. Pour la France, utilisez la <strong>Liasse fiscale</strong>
            (formulaires CERFA 2050+ via téléTVA).
          </p>
          <p className="mt-3 text-xs text-amber-700">
            Pays détecté : <strong>{country}</strong>. Modifiable dans Paramètres → Localisation.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) return <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
  if (!data) return null

  const periodLabel = `Exercice ${year - 1} | Dépôt avant 15/03/${year}`

  const yearSelector = (
    <div className="flex flex-wrap items-center gap-2">
      {YEARS.map(y => (
        <button key={y} onClick={() => setYear(y)}
          className={`rounded border px-3 py-1.5 text-sm font-medium ${y === year ? 'border-[#006633] bg-[#E8F5E9] text-[#006633]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          Dépôt {y}
        </button>
      ))}
      <span className={`ml-auto self-center rounded-full px-3 py-1 text-xs font-semibold ${
        data.status === 'PAID' ? 'bg-green-100 text-green-700' :
        data.status === 'DECLARED' ? 'bg-blue-100 text-blue-700' :
        'bg-amber-100 text-amber-700'
      }`}>
        {data.status === 'PAID' ? '✓ Payée' : data.status === 'DECLARED' ? 'Déclarée' : 'À déposer'}
      </span>
    </div>
  )

  const makeHeader = (fiche: number) => fiche === 1
    ? (
      <DgiFormHeader
        formRef="DSF/SN-DGI"
        title="DECLARATION STATISTIQUE ET FISCALE — SYSTÈME NORMAL"
        subtitle={`${periodLabel} | SYSCOHADA Révisé | Art. 18 CGI Cameroun`}
        {...(data.identification.centreImpots ? { centerImpots: data.identification.centreImpots } : {})}
        {...(data.identification.niu ? { niu: data.identification.niu } : {})}
      />
    ) : (
      <MiniHeader
        title="DECLARATION STATISTIQUE ET FISCALE — SYSTÈME NORMAL"
        period={periodLabel}
        fiche={fiche}
      />
    )

  const pages = [
    { pageNumber: 1, title: 'Fiche 1 — Identification', component: <div style={{ fontFamily: 'Arial, sans-serif' }}>{makeHeader(1)}<Fiche1 data={data} year={year} /></div> },
    { pageNumber: 2, title: 'Fiche 2 — Bilan Actif',    component: <div style={{ fontFamily: 'Arial, sans-serif' }}>{makeHeader(2)}<Fiche2 data={data} /></div> },
    { pageNumber: 3, title: 'Fiche 3 — Bilan Passif',   component: <div style={{ fontFamily: 'Arial, sans-serif' }}>{makeHeader(3)}<Fiche3 data={data} /></div> },
    { pageNumber: 4, title: 'Fiche 4 — Compte de Résultat', component: <div style={{ fontFamily: 'Arial, sans-serif' }}>{makeHeader(4)}<Fiche4 data={data} year={year} /></div> },
    { pageNumber: 5, title: 'Fiche 5 — TAFIRE',         component: <div style={{ fontFamily: 'Arial, sans-serif' }}>{makeHeader(5)}<Fiche5 data={data} year={year} /></div> },
    { pageNumber: 6, title: 'Fiche 6 — Notes Annexes',  component: <div style={{ fontFamily: 'Arial, sans-serif' }}>{makeHeader(6)}<Fiche6 /></div> },
    { pageNumber: 7, title: 'Fiche 7 — Tableau Fiscal', component: <div style={{ fontFamily: 'Arial, sans-serif' }}>{makeHeader(7)}<Fiche7 data={data} /></div> },
    { pageNumber: 8, title: 'Fiche 8 — Récapitulatif',  component: <div style={{ fontFamily: 'Arial, sans-serif' }}>{makeHeader(8)}<Fiche8 data={data} year={year} /></div> },
  ]

  return (
    <FormPageViewer
      formRef="DSF/SN-DGI"
      formTitle="Déclaration Statistique et Fiscale — Système Normal"
      periodLabel={periodLabel}
      pages={pages}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      onDownloadPdf={() => downloadDsf(data, year)}
      extraControls={yearSelector}
    />
  )
}
