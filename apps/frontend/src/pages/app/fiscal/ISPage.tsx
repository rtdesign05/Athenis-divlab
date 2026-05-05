import { useState } from 'react'
import { useIS, useTaxConfig, useCompanyInfo } from '@/hooks/useFiscal'
import { DgiFormHeader } from '@/components/fiscal/DgiFormHeader'
import { FormPageViewer } from '@/components/fiscal/FormPageViewer'
import { usePdfDownload } from '@/hooks/usePdfDownload'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const YEARS  = [2024, 2025, 2026]

const DGI_GREEN      = '#006633'
const DGI_SECTION_BG = '#E8F5E9'
const DGI_TOTAL_BG   = '#C8E6C9'
const DGI_ROW_ALT    = '#F1F8E9'
const DGI_BORDER     = '1px solid #000'

const cellBase: React.CSSProperties      = { border: DGI_BORDER, padding: '3px 6px', fontSize: 9, fontFamily: 'Arial, sans-serif' }
const sectionHdr: React.CSSProperties   = { ...cellBase, background: DGI_GREEN, color: '#fff', fontWeight: 'bold', fontSize: 10 }
const subtotalCell: React.CSSProperties = { ...cellBase, background: DGI_TOTAL_BG, fontWeight: 'bold' }
const resultCell: React.CSSProperties   = { ...cellBase, background: DGI_GREEN, color: '#fff', fontWeight: 'bold', fontSize: 10 }
const numCell: React.CSSProperties      = { ...cellBase, color: '#666', fontSize: 8, width: 28, textAlign: 'center' }
const tblStyle: React.CSSProperties     = { borderCollapse: 'collapse', width: '100%', fontSize: 9, fontFamily: 'Arial, sans-serif' }

function fmt(n: number) { return n.toLocaleString('fr-FR') }

function AmtInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input type="number" value={value || ''} onChange={e => onChange(Number(e.target.value))}
      style={{ width: 130, border: '1px solid #006633', padding: '1px 4px', fontSize: 9, fontFamily: 'monospace', textAlign: 'right' }} />
  )
}

function MiniHeader({ formRef, title, period }: { formRef: string; title: string; period: string }) {
  return (
    <div style={{ borderBottom: '2px solid #006633', paddingBottom: 4, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#006633', fontWeight: 'bold' }}>{formRef}</span>
        <span style={{ fontSize: 8, color: '#555' }}>{period}</span>
      </div>
      <div style={{ fontSize: 8, color: '#333', marginTop: 2 }}>{title} (suite)</div>
    </div>
  )
}

export function ISPage() {
  const now = new Date()
  const [year, setYear]       = useState(now.getFullYear())
  const [month, setMonth]     = useState(now.getMonth() + 1)
  const [currentPage, setCurrentPage] = useState(1)
  const { data, isLoading }   = useIS(year)
  const { data: config }      = useTaxConfig()
  const { data: company }     = useCompanyInfo()
  const { downloadIs }        = usePdfDownload()

  const [caMonthly, setCaMonthly] = useState(0)
  const [rasImput, setRasImput]   = useState(0)
  const [penalite, setPenalite]   = useState(0)
  const [prefilled, setPrefilled] = useState(false)

  const handlePrefill = () => {
    if (!data) return
    setCaMonthly(data.caMonthly)
    setRasImput(0)
    setPrefilled(true)
  }

  // API returns tauxAcompte as a percentage (e.g. 2.2 = 2.2%), convert to decimal for math
  const TAUX_ACOMPTE = (data?.tauxAcompte ?? 2.2) / 100
  const acompteBrut  = Math.round(caMonthly * TAUX_ACOMPTE)
  const acompteNet   = Math.max(0, acompteBrut - rasImput)
  const totalAPayer  = acompteNet + penalite
  const monthLabel   = MONTHS[month - 1] ?? ''
  const periodLabel  = `Acompte mensuel — ${monthLabel} ${year}`

  if (isLoading) return <div className="h-96 animate-pulse rounded-xl bg-gray-100" />

  const periodSelector = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1">
        {YEARS.map(y => (
          <button key={y} onClick={() => { setYear(y); setPrefilled(false) }}
            className={`rounded border px-3 py-1.5 text-sm font-medium ${y === year ? 'border-[#006633] bg-[#E8F5E9] text-[#006633]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {y}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {MONTHS.map((m, i) => (
          <button key={i} onClick={() => { setMonth(i + 1); setPrefilled(false) }}
            className={`rounded border px-2.5 py-1 text-xs font-medium ${month === i + 1 ? 'border-[#006633] bg-[#E8F5E9] text-[#006633]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {m.slice(0, 3)}
          </button>
        ))}
      </div>
    </div>
  )

  /* ── PAGE 1 — Identification + Calcul acompte ─────────────────────────── */
  const page1 = (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <DgiFormHeader
        formRef="I/PL-TVA-IR"
        title="DECLARATION DES ACOMPTES MENSUELS D'IMPOT SUR LES SOCIETES (IS)"
        subtitle={`Période : ${periodLabel}  |  Taux acompte : ${(TAUX_ACOMPTE * 100).toFixed(1)}%  |  Art. 23 CGI Cameroun`}
        {...(config?.centerImpots ? { centerImpots: config.centerImpots } : {})}
        {...(config?.niu ? { niu: config.niu } : {})}
      />

      {/* Section A — Identification */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={2} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION A — IDENTIFICATION DU CONTRIBUABLE
          </th></tr>
        </thead>
        <tbody>
          {[
            ['Raison sociale / Nom',        company?.nom ?? (config?.niu ? 'Entreprise' : '—')],
            ['N° Identifiant Unique (NIU)', config?.niu ?? '—'],
            ['RCCM',                        config?.rccm ?? '—'],
            ["Code d'activité",             config?.codeActivite ?? '—'],
            ["Régime d'imposition",         config?.taxRegime === 'REEL_NORMAL' ? 'Réel Normal' : config?.taxRegime === 'REEL_SIMPLIFIE' ? 'Réel Simplifié' : config?.taxRegime === 'IGS' ? 'IGS' : config?.taxRegime ?? '—'],
            ['PERIODE DE DECLARATION',      `${monthLabel.toUpperCase()} ${year}`],
          ].map(([label = '', value = ''], i) => (
            <tr key={label} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={{ ...cellBase, width: '40%', background: DGI_SECTION_BG, fontWeight: 600 }}>{label}</td>
              <td style={{ ...cellBase, fontFamily: label.includes('NIU') ? 'monospace' : undefined }}>
                {label === 'PERIODE DE DECLARATION' ? <strong style={{ color: DGI_GREEN }}>{value}</strong> : value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Section B — Calcul acompte IS */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={3} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION B — CALCUL DE L'ACOMPTE IS DU MOIS
          </th></tr>
          <tr style={{ background: DGI_SECTION_BG }}>
            <th style={{ ...cellBase, width: 28, textAlign: 'center', fontSize: 8 }}>N°</th>
            <th style={{ ...cellBase, textAlign: 'left' }}>LIBELLÉ</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 180 }}>MONTANT (F CFA)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={numCell}>1</td>
            <td style={cellBase}>CA HT réalisé au cours du mois de {monthLabel} {year}</td>
            <td style={{ ...cellBase, textAlign: 'right' }}>
              <AmtInput value={caMonthly} onChange={setCaMonthly} />
            </td>
          </tr>
          <tr style={{ background: DGI_ROW_ALT }}>
            <td style={numCell}>2</td>
            <td style={cellBase}>Taux de l'acompte IS (art. 23 CGI Cameroun)</td>
            <td style={{ ...cellBase, textAlign: 'right', fontWeight: 'bold', color: DGI_GREEN }}>
              {(TAUX_ACOMPTE * 100).toFixed(1)}%
            </td>
          </tr>
          <tr>
            <td style={numCell}>3</td>
            <td style={{ ...cellBase, background: DGI_SECTION_BG, fontWeight: 600 }}>ACOMPTE IS BRUT (1 × 2)</td>
            <td style={{ ...subtotalCell, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(acompteBrut)}</td>
          </tr>
          <tr style={{ background: DGI_ROW_ALT }}>
            <td style={numCell}>4</td>
            <td style={cellBase}>Retenues à la source imputables</td>
            <td style={{ ...cellBase, textAlign: 'right' }}>
              <AmtInput value={rasImput} onChange={setRasImput} />
            </td>
          </tr>
          <tr>
            <td style={numCell}>5</td>
            <td style={resultCell}>ACOMPTE IS NET À PAYER</td>
            <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(acompteNet)}</td>
          </tr>
          <tr style={{ background: DGI_ROW_ALT }}>
            <td style={numCell}>6</td>
            <td style={cellBase}>Pénalités de retard</td>
            <td style={{ ...cellBase, textAlign: 'right' }}>
              <AmtInput value={penalite} onChange={setPenalite} />
            </td>
          </tr>
          <tr>
            <td style={numCell}></td>
            <td style={{ ...resultCell, fontSize: 11 }}>TOTAL À PAYER</td>
            <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace', fontSize: 11 }}>{fmt(totalAPayer)}</td>
          </tr>
        </tbody>
      </table>

      {!prefilled && (
        <div style={{ marginTop: 10 }}>
          <button onClick={handlePrefill}
            className="rounded px-4 py-2 text-sm font-medium text-white"
            style={{ background: DGI_GREEN }}>
            📥 Pré-remplir depuis les données
          </button>
        </div>
      )}
    </div>
  )

  /* ── PAGE 2 — Cumul exercice + Signature ──────────────────────────────── */
  const page2 = (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <MiniHeader
        formRef="I/PL-TVA-IR"
        title="DECLARATION DES ACOMPTES MENSUELS IS"
        period={periodLabel}
      />

      {/* Section C — Informations complémentaires */}
      {data && (
        <table style={{ ...tblStyle, marginTop: 8 }}>
          <thead>
            <tr><th colSpan={2} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
              SECTION C — INFORMATIONS COMPLÉMENTAIRES — EXERCICE {year}
            </th></tr>
          </thead>
          <tbody>
            {[
              [`Cumul CA exercice ${year} (jan–${monthLabel})`,  fmt(data.caAnnuel)        + ' F CFA'],
              ['Cumul acomptes IS versés (jan–mois précédent)',   fmt(data.cumulsAcomptes)  + ' F CFA'],
              ['IS estimé annuel (33% × résultat comptable)',     fmt(data.isCalculeAnnuel) + ' F CFA'],
              ['IS minimum légal (1% du CA annuel estimé)',       fmt(data.isMinimumAnnuel) + ' F CFA'],
              ['IS dû estimé (max IS calculé, IS minimum)',       fmt(data.isEstimeAnnuel)  + ' F CFA'],
            ].map(([label, value], i) => (
              <tr key={label} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
                <td style={{ ...cellBase, background: DGI_SECTION_BG }}>{label}</td>
                <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Section D — Tableau des acomptes */}
      {data?.acomptes && data.acomptes.length > 0 && (
        <table style={{ ...tblStyle, marginTop: 8 }}>
          <thead>
            <tr><th colSpan={4} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
              SECTION D — TABLEAU DES ACOMPTES IS — EXERCICE {year}
            </th></tr>
            <tr style={{ background: DGI_SECTION_BG }}>
              <th style={cellBase}>Versement N°</th>
              <th style={cellBase}>Montant (F CFA)</th>
              <th style={cellBase}>Échéance</th>
              <th style={cellBase}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {data.acomptes.map((a, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
                <td style={{ ...cellBase, textAlign: 'center' }}>Versement {a.number}</td>
                <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(a.amount)}</td>
                <td style={{ ...cellBase, textAlign: 'center' }}>{new Date(a.dueDate).toLocaleDateString('fr-FR')}</td>
                <td style={{ ...cellBase, textAlign: 'center', color: a.status === 'PAID' ? DGI_GREEN : a.status === 'LATE' ? '#CE1126' : '#555' }}>
                  {a.status === 'PAID' ? '✓ Payé' : a.status === 'DECLARED' ? 'Déclaré' : a.status === 'LATE' ? 'En retard' : 'À payer'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Section E — Mode de paiement */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={2} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION E — MODE DE PAIEMENT
          </th></tr>
        </thead>
        <tbody>
          {[
            ['Virement bancaire (compte Trésor Public)', ''],
            ['Chèque certifié (à l\'ordre du Receveur des impôts)', ''],
            ['Espèces (guichet CDI)', ''],
          ].map(([label], i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={{ ...cellBase, background: DGI_SECTION_BG }}>☐ {label}</td>
              <td style={{ ...cellBase, width: 140, textAlign: 'center', color: '#aaa', fontSize: 8 }}>Référence paiement</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Signature block */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
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
    </div>
  )

  return (
    <FormPageViewer
      formRef="I/PL-TVA-IR"
      formTitle="Déclaration acomptes mensuels IS"
      periodLabel={periodLabel}
      pages={[
        { pageNumber: 1, title: 'Identification & Calcul acompte', component: page1 },
        { pageNumber: 2, title: 'Cumul exercice & Signature',      component: page2 },
      ]}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      onDownloadPdf={() => downloadIs({
        periode:       periodLabel,
        monthLabel,
        year,
        raisonSociale: company?.nom ?? 'Entreprise',
        tauxAcompte:   TAUX_ACOMPTE,
        caMonthly,
        acompteBrut,
        rasImput,
        acompteNet,
        penalite,
        totalAPayer,
        ...(config?.niu          ? { niu: config.niu }                   : {}),
        ...(config?.centerImpots ? { centerImpots: config.centerImpots } : {}),
        ...(config?.rccm         ? { rccm: config.rccm }                 : {}),
        ...(config?.codeActivite ? { codeActivite: config.codeActivite } : {}),
      })}
      extraControls={periodSelector}
    />
  )
}
