import { useState } from 'react'
import { useCNPS } from '@/hooks/useFiscal'
import { FormPageViewer } from '@/components/fiscal/FormPageViewer'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const CNPS_BLUE   = '#003F88'
const CNPS_LIGHT  = '#E8EEF7'
const CNPS_TOTAL  = '#BDD0F0'
const CNPS_ALT    = '#F0F4FB'
const CNPS_BORDER = '1px solid #003F88'
const DGI_BORDER  = '1px solid #000'

const cellBase: React.CSSProperties     = { border: DGI_BORDER, padding: '3px 6px', fontSize: 9, fontFamily: 'Arial, sans-serif' }
const sectionHdr: React.CSSProperties   = { ...cellBase, background: CNPS_BLUE, color: '#fff', fontWeight: 'bold', fontSize: 10 }
const subtotalCell: React.CSSProperties = { ...cellBase, background: CNPS_TOTAL, fontWeight: 'bold' }
const resultCell: React.CSSProperties   = { ...cellBase, background: CNPS_BLUE, color: '#fff', fontWeight: 'bold', fontSize: 10 }
const tblStyle: React.CSSProperties     = { borderCollapse: 'collapse', width: '100%', fontSize: 9, fontFamily: 'Arial, sans-serif' }

function fmt(n: number) { return n.toLocaleString('fr-FR') }

function CNPSHeader({ immatriculation, period }: { immatriculation: string; period: string }) {
  return (
    <div style={{ border: CNPS_BORDER, marginBottom: 8 }}>
      {/* Blue top band */}
      <div style={{ background: CNPS_BLUE, color: '#fff', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 11, letterSpacing: 1 }}>CAISSE NATIONALE DE PRÉVOYANCE SOCIALE</div>
          <div style={{ fontSize: 8, marginTop: 2 }}>République du Cameroun — Cameroon Social Insurance Fund</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 8 }}>
          <div style={{ fontWeight: 'bold' }}>CNPS/BDC</div>
          <div>Bordereau de Déclaration des Cotisations</div>
        </div>
      </div>
      {/* Identity bar */}
      <div style={{ display: 'flex', borderTop: CNPS_BORDER, background: CNPS_LIGHT }}>
        <div style={{ flex: 1, padding: '4px 8px', borderRight: CNPS_BORDER, fontSize: 9 }}>
          <span style={{ color: '#555' }}>N° Immatriculation CNPS : </span>
          <strong style={{ fontFamily: 'monospace', color: CNPS_BLUE }}>{immatriculation}</strong>
        </div>
        <div style={{ padding: '4px 8px', fontSize: 9 }}>
          <span style={{ color: '#555' }}>Période : </span>
          <strong style={{ color: CNPS_BLUE }}>{period}</strong>
        </div>
      </div>
    </div>
  )
}

export function CNPSPage() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const { data, isLoading } = useCNPS(year, month)

  const isPaid = data?.status === 'PAID'
  const isLate = !isPaid && data && new Date(data.dueDate) < now

  const periodLabel = `${MONTHS[month - 1]} ${year}`

  const periodSelector = (
    <div className="flex flex-wrap items-center gap-3">
      <select value={year} onChange={e => setYear(Number(e.target.value))}
        className="rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300">
        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <div className="flex flex-wrap gap-1.5">
        {MONTHS.map((m, i) => (
          <button key={i} onClick={() => setMonth(i + 1)}
            className={`rounded border px-3 py-1.5 text-xs font-medium ${month === i + 1 ? 'border-[#003F88] bg-[#E8EEF7] text-[#003F88]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {m.slice(0, 3)}
          </button>
        ))}
      </div>
    </div>
  )

  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
  if (!data) return null

  const page1 = (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <CNPSHeader immatriculation={data.immatriculation} period={periodLabel} />

      {/* Late alert */}
      {isLate && (
        <div style={{ border: '1px solid #CE1126', background: '#FFEBEE', padding: '6px 10px', fontSize: 9, marginBottom: 8 }}>
          ⚠ CNPS {MONTHS[month - 1]} {year} — En retard. Échéance dépassée le {new Date(data.dueDate).toLocaleDateString('fr-FR')}
        </div>
      )}

      {/* Section A — Identification */}
      <table style={{ ...tblStyle }}>
        <thead>
          <tr><th colSpan={2} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION A — IDENTIFICATION DE L'EMPLOYEUR
          </th></tr>
        </thead>
        <tbody>
          {[
            ["N° Immatriculation CNPS", data.immatriculation],
            ['Période',                 data.period],
            ['Effectif déclaré',        `${data.employees.length} employé${data.employees.length > 1 ? 's' : ''}`],
            ['Échéance',                new Date(data.dueDate).toLocaleDateString('fr-FR')],
          ].map(([label, value], i) => (
            <tr key={label} style={{ background: i % 2 === 0 ? '#fff' : CNPS_ALT }}>
              <td style={{ ...cellBase, width: '40%', background: CNPS_LIGHT, fontWeight: 600 }}>{label}</td>
              <td style={{ ...cellBase, fontFamily: (label ?? '').includes('Immatriculation') ? 'monospace' : undefined }}>
                {label === 'Période' ? <strong style={{ color: CNPS_BLUE }}>{value}</strong> : value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Section B — Taux */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={4} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION B — TAUX DE COTISATION APPLICABLES — DÉCRET CNPS
          </th></tr>
          <tr style={{ background: CNPS_LIGHT }}>
            <th style={cellBase}>Nature de la cotisation</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 90 }}>Taux patronal</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 90 }}>Taux salarial</th>
            <th style={{ ...cellBase, textAlign: 'left', width: 130 }}>Base</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cellBase}>Cotisation CNPS (retraite + maladie + AT)</td>
            <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: CNPS_BLUE }}>{data.tauxPatronal}%</td>
            <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: CNPS_BLUE }}>{data.tauxSalarial}%</td>
            <td style={{ ...cellBase, fontSize: 8, color: '#555' }}>Salaire brut plafonné</td>
          </tr>
          <tr style={{ background: CNPS_ALT }}>
            <td style={cellBase}>FDFP (Formation professionnelle)</td>
            <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: CNPS_BLUE }}>{data.tauxFdfpPatronal}%</td>
            <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: CNPS_BLUE }}>{data.tauxFdfpSalarial}%</td>
            <td style={{ ...cellBase, fontSize: 8, color: '#555' }}>Masse salariale brute totale</td>
          </tr>
        </tbody>
      </table>

      {/* Section C — Bordereau nominatif */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={5} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION C — BORDEREAU NOMINATIF DES SALARIÉS
          </th></tr>
          <tr style={{ background: CNPS_LIGHT }}>
            <th style={cellBase}>Nom et prénom</th>
            <th style={cellBase}>Poste</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 110 }}>Salaire brut</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 110 }}>CNPS patronal</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 110 }}>CNPS salarial</th>
          </tr>
        </thead>
        <tbody>
          {data.employees.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ ...cellBase, textAlign: 'center', color: '#999', padding: '20px 0', fontStyle: 'italic' }}>
                Aucun employé enregistré — Ajoutez des employés dans le module RH
              </td>
            </tr>
          ) : (
            data.employees.map((emp, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : CNPS_ALT }}>
                <td style={{ ...cellBase, fontWeight: 600 }}>{emp.nom}</td>
                <td style={{ ...cellBase, color: '#555' }}>{emp.poste || '—'}</td>
                <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(emp.salaireBrut)}</td>
                <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(emp.cnpsPatronal)}</td>
                <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(emp.cnpsSalarial)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Section D — Récapitulatif */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={4} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION D — RÉCAPITULATIF DES COTISATIONS À VERSER
          </th></tr>
          <tr style={{ background: CNPS_LIGHT }}>
            <th style={cellBase}>Rubrique</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 120 }}>Patronal</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 120 }}>Salarial</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 120 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cellBase}>Masse salariale brute</td>
            <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }} colSpan={2}>{fmt(data.totals.masseSalariale)}</td>
            <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmt(data.totals.masseSalariale)}</td>
          </tr>
          <tr style={{ background: CNPS_ALT }}>
            <td style={cellBase}>Cotisations CNPS ({data.tauxPatronal}% / {data.tauxSalarial}%)</td>
            <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(data.totals.cnpsPatronal)}</td>
            <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(data.totals.cnpsSalarial)}</td>
            <td style={{ ...subtotalCell, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(data.totals.cnpsPatronal + data.totals.cnpsSalarial)}</td>
          </tr>
          <tr>
            <td style={cellBase}>FDFP ({data.tauxFdfpPatronal}% / {data.tauxFdfpSalarial}%)</td>
            <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(data.totals.fdfpPatronal)}</td>
            <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(data.totals.fdfpSalarial)}</td>
            <td style={{ ...subtotalCell, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(data.totals.fdfpPatronal + data.totals.fdfpSalarial)}</td>
          </tr>
          <tr>
            <td style={resultCell}>TOTAL À VERSER À LA CNPS</td>
            <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(data.totals.cnpsPatronal + data.totals.fdfpPatronal)}</td>
            <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(data.totals.cnpsSalarial + data.totals.fdfpSalarial)}</td>
            <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace', fontSize: 11 }}>{fmt(data.totals.total)}</td>
          </tr>
        </tbody>
      </table>

      {/* Section E — Statut */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={2} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION E — STATUT DU VERSEMENT
          </th></tr>
        </thead>
        <tbody>
          {[
            ['Montant à verser',  `${fmt(data.totals.total)} F CFA`],
            ['Échéance légale',   new Date(data.dueDate).toLocaleDateString('fr-FR')],
            ['Statut',            isPaid ? '✅ Versé' : isLate ? '🔴 En retard' : '⏳ À verser'],
          ].map(([label, value], i) => (
            <tr key={label} style={{ background: i % 2 === 0 ? '#fff' : CNPS_ALT }}>
              <td style={{ ...cellBase, width: '45%', background: CNPS_LIGHT, fontWeight: 600 }}>{label}</td>
              <td style={{ ...cellBase, fontWeight: label === 'Statut' ? 'bold' : 'normal', color: label === 'Statut' ? (isPaid ? CNPS_BLUE : isLate ? '#CE1126' : '#b45309') : '#000' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 4, fontSize: 8, color: '#555', fontStyle: 'italic', padding: '4px 0' }}>
        Le paiement doit être effectué avant le dernier jour du mois suivant la période déclarée.
      </div>

      {/* Signature */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <tbody>
          <tr>
            <td style={{ ...cellBase, padding: '14px 10px', fontSize: 9, lineHeight: 2.2 }}>
              Je soussigné(e) <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 200 }}>&nbsp;</span> certifie l'exactitude des renseignements portés dans le présent bordereau.<br/>
              Fait à <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 120 }}>&nbsp;</span>, le <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 100 }}>&nbsp;</span><br/><br/>
              <div style={{ marginTop: 8, textAlign: 'center', border: '1px dashed #999', padding: 28, color: '#aaa', fontSize: 10 }}>
                Signature et cachet de l'employeur
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  return (
    <FormPageViewer
      formRef="CNPS/BDC"
      formTitle="Bordereau de Déclaration des Cotisations CNPS"
      periodLabel={periodLabel}
      pages={[{ pageNumber: 1, title: 'Identification, Cotisations & Récapitulatif', component: page1 }]}
      currentPage={1}
      onPageChange={() => {}}
      extraControls={periodSelector}
    />
  )
}
