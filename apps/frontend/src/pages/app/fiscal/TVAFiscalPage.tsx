import { useState } from 'react'
import { useTVADeclaration, useDeclareTVA, useTaxConfig } from '@/hooks/useFiscal'
import { DgiFormHeader } from '@/components/fiscal/DgiFormHeader'
import { FormPageViewer } from '@/components/fiscal/FormPageViewer'
import { CM_TAX } from '@/lib/taxConstants'
import { usePdfDownload } from '@/hooks/usePdfDownload'
import type { TvaPdfData } from '@/pages/app/fiscal/pdf/TvaPdf'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

// ── DGI palette ──────────────────────────────────────────────────────────────
const DGI_GREEN      = '#006633'
const DGI_SECTION_BG = '#E8F5E9'
const DGI_TOTAL_BG   = '#C8E6C9'
const DGI_ROW_ALT    = '#F1F8E9'
const DGI_BORDER     = '1px solid #000'

const cellBase: React.CSSProperties    = { border: DGI_BORDER, padding: '3px 6px', fontSize: 9, fontFamily: 'Arial, sans-serif' }
const sectionHdr: React.CSSProperties  = { ...cellBase, background: DGI_GREEN, color: '#fff', fontWeight: 'bold', fontSize: 10 }
const subtotalCell: React.CSSProperties= { ...cellBase, background: DGI_TOTAL_BG, fontWeight: 'bold' }
const resultCell: React.CSSProperties  = { ...cellBase, background: DGI_GREEN, color: '#fff', fontWeight: 'bold', fontSize: 10 }
const numCell: React.CSSProperties     = { ...cellBase, color: '#666', fontSize: 8, width: 28, textAlign: 'center' }
const tblStyle: React.CSSProperties    = { borderCollapse: 'collapse', width: '100%', fontSize: 9, fontFamily: 'Arial, sans-serif' }

function AmtInput({ value, onChange, readOnly }: { value: number; onChange: (v: number) => void; readOnly: boolean }) {
  if (readOnly) return <span style={{ fontFamily: 'monospace' }}>{value.toLocaleString('fr-FR')}</span>
  return (
    <input type="number" value={value || ''} onChange={e => onChange(Number(e.target.value))}
      style={{ width: 130, border: `1px solid ${DGI_GREEN}`, padding: '1px 4px', fontSize: 9, fontFamily: 'monospace', textAlign: 'right' }} />
  )
}

function fmt(n: number) { return n.toLocaleString('fr-FR') }

// ── Mini header for continuation pages ───────────────────────────────────────
function MiniHeader({ formRef, title, page, total }: { formRef: string; title: string; page: number; total: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${DGI_GREEN}`, paddingBottom: 4, marginBottom: 8, fontFamily: 'Arial', fontSize: 9 }}>
      <span style={{ color: DGI_GREEN, fontWeight: 'bold' }}>{formRef} — {title}</span>
      <span style={{ color: '#666' }}>Page {page} / {total}</span>
    </div>
  )
}

interface CollRow { label: string; baseHT: number; taux: number; zeroTax?: boolean; exempt?: boolean }
interface DeductRow { label: string; amount: number }

const DEFAULT_COLL_ROWS: CollRow[] = [
  { label: 'Ventes de marchandises',            baseHT: 0, taux: 19.25 },
  { label: 'Prestations de services',           baseHT: 0, taux: 19.25 },
  { label: 'Importations taxables',             baseHT: 0, taux: 19.25 },
  { label: 'Autres opérations imposables',      baseHT: 0, taux: 19.25 },
  { label: 'Opérations au taux zéro (exports)', baseHT: 0, taux: 0, zeroTax: true },
  { label: 'Opérations exonérées',              baseHT: 0, taux: 0, exempt: true },
]

const DEFAULT_DED_ROWS: DeductRow[] = [
  { label: 'TVA sur achats locaux biens/services',  amount: 0 },
  { label: 'TVA sur importations (douanes)',         amount: 0 },
  { label: 'TVA retenue à la source subie',         amount: 0 },
  { label: 'Crédit TVA reporté (mois précédent)',   amount: 0 },
]

export function TVAFiscalPage() {
  const now   = new Date()
  const [year, setYear]     = useState(now.getFullYear())
  const [month, setMonth]   = useState(now.getMonth() === 0 ? 12 : now.getMonth())
  const [currentPage, setCurrentPage] = useState(1)

  const { data, isLoading }  = useTVADeclaration(year, month)
  const { data: config }     = useTaxConfig()
  const declareTVA           = useDeclareTVA()
  const { downloadTva }      = usePdfDownload()

  const [collRows, setCollRows]   = useState<CollRow[]>(DEFAULT_COLL_ROWS)
  const [dedRows, setDedRows]     = useState<DeductRow[]>(DEFAULT_DED_ROWS)
  const [penalty, setPenalty]     = useState(0)
  const [payMode, setPayMode]     = useState<'virement' | 'cheque' | 'especes'>('virement')
  const [prefilled, setPrefilled] = useState(false)

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  const handlePrefill = () => {
    if (!data) return
    const newColl = [...DEFAULT_COLL_ROWS]
    data.collectee.forEach(line => {
      if (line.label.toLowerCase().includes('prest') && newColl[1]) newColl[1] = { ...newColl[1]!, baseHT: line.baseHT }
      else if (line.label.toLowerCase().includes('vente') && newColl[0]) newColl[0] = { ...newColl[0]!, baseHT: line.baseHT }
    })
    setCollRows(newColl)
    setDedRows([
      { label: 'TVA sur achats locaux biens/services', amount: data.totalDeductible > 0 ? data.totalDeductible - data.creditReporte : 0 },
      { label: 'TVA sur importations (douanes)',        amount: 0 },
      { label: 'TVA retenue à la source subie',         amount: 0 },
      { label: 'Crédit TVA reporté (mois précédent)',  amount: data.creditReporte },
    ])
    setPrefilled(true)
  }

  const isReadOnly = data?.status === 'DECLARED' || data?.status === 'PAID'
  const canDeclare = data?.status === 'PENDING' || data?.status === 'LATE'
  const isDeclared = data?.status === 'DECLARED' || data?.status === 'PAID'
  const isPaid     = data?.status === 'PAID'

  const totalCollectee  = collRows.reduce((s, r) => s + (r.exempt ? 0 : Math.round(r.baseHT * r.taux / 100)), 0)
  const totalDeductible = dedRows.reduce((s, r) => s + r.amount, 0)
  const tvaNette        = totalCollectee - totalDeductible
  const totalAPayer     = Math.max(0, tvaNette) + penalty
  const creditReporter  = tvaNette < 0 ? Math.abs(tvaNette) : 0
  const periodLabel     = `${MONTHS[month - 1]} ${year}`
  const subtitle        = `Période de déclaration : ${periodLabel}  |  Réf : I/TVA-IR  |  Échéance : le 15 du mois suivant`

  const buildPdfData = (): TvaPdfData => ({
    periode: periodLabel,
    ...(config?.niu          ? { niu: config.niu }                   : {}),
    ...(config?.centerImpots ? { centerImpots: config.centerImpots } : {}),
    ...(config?.rccm         ? { rccm: config.rccm }                 : {}),
    ...(config?.codeActivite ? { codeActivite: config.codeActivite } : {}),
    raisonSociale: 'UBM Consulting SARL',
    collecteeRows: collRows.map((r, i) => ({
      ref: i + 1, label: r.label, baseHT: r.baseHT,
      tva: r.exempt ? 0 : Math.round(r.baseHT * r.taux / 100),
      ...(r.exempt ? { exempt: true } : {}),
    })),
    totalCollectee,
    deductibleRows: dedRows.map((r, i) => ({ ref: i + 7, label: r.label, amount: r.amount })),
    totalDeductible,
    tvaNette,
    penalites: penalty,
    totalAPayer,
    creditReporter,
  })

  // ── PAGE 1 — Identification + TVA Collectée ────────────────────────────────
  const page1 = (
    <div>
      <DgiFormHeader
        formRef="I/TVA-IR"
        title="DECLARATION MENSUELLE DE LA TAXE SUR LA VALEUR AJOUTEE (TVA)"
        subtitle={subtitle}
        {...(config?.centerImpots ? { centerImpots: config.centerImpots } : {})}
        {...(config?.niu ? { niu: config.niu } : {})}
      />

      {isLoading && (
        <div style={{ ...cellBase, padding: 20, textAlign: 'center', color: '#888', background: '#fafafa' }}>
          Chargement des données fiscales…
        </div>
      )}

      {/* Section A — Identification */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={4} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION A — IDENTIFICATION DU CONTRIBUABLE
          </th></tr>
        </thead>
        <tbody>
          {[
            ['Raison sociale / Nom',        'UBM Consulting SARL'],
            ['N° Identifiant Unique (NIU)', config?.niu ?? '—'],
            ['RCCM',                        config?.rccm ?? '—'],
            ['Adresse',                     'Rue Joss, Akwa, Douala'],
            ["Code d'activité",             config?.codeActivite ?? '7020Z'],
            ["Régime d'imposition",         'Réel Normal'],
            ['PERIODE DE DECLARATION',      periodLabel.toUpperCase()],
          ].map(([label, value], i) => (
            <tr key={label} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={{ ...cellBase, width: '40%', background: DGI_SECTION_BG, fontWeight: 600 }}>{label}</td>
              <td style={{ ...cellBase, fontFamily: label === 'N° Identifiant Unique (NIU)' ? 'monospace' : undefined }}>
                {label === 'PERIODE DE DECLARATION' ? <strong style={{ color: DGI_GREEN }}>{value}</strong> : value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Section B — TVA Collectée */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={4} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION B — CHIFFRES D'AFFAIRES TAXABLES ET TVA COLLECTÉE
          </th></tr>
          <tr style={{ background: DGI_SECTION_BG }}>
            <th style={{ ...cellBase, width: 28, textAlign: 'center', fontSize: 8 }}>N°</th>
            <th style={{ ...cellBase, textAlign: 'left' }}>LIBELLÉ</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 160 }}>BASE HT (F CFA)</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 160 }}>TVA 19,25% (F CFA)</th>
          </tr>
        </thead>
        <tbody>
          {collRows.map((row, i) => {
            const tva = row.exempt ? 0 : Math.round(row.baseHT * row.taux / 100)
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
                <td style={numCell}>{i + 1}</td>
                <td style={cellBase}>{row.label}</td>
                <td style={{ ...cellBase, textAlign: 'right' }}>
                  <AmtInput value={row.baseHT} readOnly={isReadOnly}
                    onChange={v => setCollRows(rows => rows.map((r, j) => j === i ? { ...r, baseHT: v } : r))} />
                </td>
                <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>
                  {row.zeroTax ? '0' : row.exempt ? '—' : fmt(tva)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} style={{ ...subtotalCell, textAlign: 'right' }}>TOTAL TVA BRUTE COLLECTÉE (A)</td>
            <td style={{ ...subtotalCell, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totalCollectee)}</td>
          </tr>
        </tfoot>
      </table>

      {!prefilled && (
        <div style={{ marginTop: 12 }}>
          <button onClick={handlePrefill}
            className="rounded px-4 py-2 text-sm font-medium text-white"
            style={{ background: DGI_GREEN }}>
            📥 Pré-remplir depuis les données comptables
          </button>
        </div>
      )}
    </div>
  )

  // ── PAGE 2 — TVA Déductible + Liquidation + Paiement + Signature ───────────
  const page2 = (
    <div>
      <MiniHeader formRef="I/TVA-IR" title="DÉCLARATION MENSUELLE TVA" page={2} total={2} />

      {/* Section C — TVA Déductible */}
      <table style={tblStyle}>
        <thead>
          <tr><th colSpan={3} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION C — TVA DÉDUCTIBLE
          </th></tr>
          <tr style={{ background: DGI_SECTION_BG }}>
            <th style={{ ...cellBase, width: 28, textAlign: 'center', fontSize: 8 }}>N°</th>
            <th style={{ ...cellBase, textAlign: 'left' }}>LIBELLÉ</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 160 }}>MONTANT TVA (F CFA)</th>
          </tr>
        </thead>
        <tbody>
          {dedRows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={numCell}>{i + 7}</td>
              <td style={cellBase}>{row.label}</td>
              <td style={{ ...cellBase, textAlign: 'right' }}>
                <AmtInput value={row.amount} readOnly={isReadOnly}
                  onChange={v => setDedRows(rows => rows.map((r, j) => j === i ? { ...r, amount: v } : r))} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} style={{ ...subtotalCell, textAlign: 'right' }}>TOTAL TVA DÉDUCTIBLE (B)</td>
            <td style={{ ...subtotalCell, textAlign: 'right', fontFamily: 'monospace' }}>({fmt(totalDeductible)})</td>
          </tr>
        </tfoot>
      </table>

      <div style={{ border: '1px solid #FCD116', background: '#FFFDE7', padding: '6px 10px', fontSize: 9, fontFamily: 'Arial', marginTop: 4 }}>
        <strong>ℹ Charges non déductibles — Art. 149 CGI :</strong> Logement, hôtel, restaurant, location véhicule tourisme → à exclure de la ligne 7.
      </div>

      {/* Section D — Liquidation */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={3} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION D — LIQUIDATION DE LA TVA
          </th></tr>
        </thead>
        <tbody>
          <tr>
            <td style={numCell}></td>
            <td style={cellBase}>TVA brute collectée (A)</td>
            <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totalCollectee)}</td>
          </tr>
          <tr style={{ background: DGI_ROW_ALT }}>
            <td style={numCell}></td>
            <td style={cellBase}>TVA déductible (B)</td>
            <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>({fmt(totalDeductible)})</td>
          </tr>
          <tr>
            <td style={numCell}>11</td>
            <td style={resultCell}>TVA NETTE (A — B)</td>
            <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(tvaNette)}</td>
          </tr>
          <tr style={{ background: DGI_ROW_ALT }}>
            <td style={numCell}>12</td>
            <td style={cellBase}>Pénalités de retard</td>
            <td style={{ ...cellBase, textAlign: 'right' }}>
              <AmtInput value={penalty} readOnly={isReadOnly} onChange={setPenalty} />
            </td>
          </tr>
          <tr>
            <td style={numCell}></td>
            <td style={{ ...resultCell, fontSize: 11 }}>TOTAL À PAYER</td>
            <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace', fontSize: 11 }}>{fmt(totalAPayer)}</td>
          </tr>
        </tbody>
        {creditReporter > 0 && (
          <tfoot>
            <tr>
              <td style={numCell}>13</td>
              <td style={{ ...cellBase, background: '#FFF9C4', fontWeight: 'bold' }}>CRÉDIT DE TVA À REPORTER</td>
              <td style={{ ...cellBase, background: '#FFF9C4', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmt(creditReporter)}</td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* Section E — Mode de paiement */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={2} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION E — MODE DE PAIEMENT
          </th></tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={2} style={{ ...cellBase, background: '#FFF3E0', color: '#E65100' }}>
              ⚠ Tout paiement supérieur à {CM_TAX.vatPaymentThreshold.toLocaleString('fr-FR')} F CFA doit être effectué par virement bancaire (art. 94 CGI Cameroun).
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...cellBase, paddingTop: 6, paddingBottom: 6 }}>
              {(['virement', 'cheque', 'especes'] as const).map(m => (
                <label key={m} style={{ marginRight: 20, cursor: 'pointer' }}>
                  <input type="radio" name="payMode" checked={payMode === m} onChange={() => setPayMode(m)} />{' '}
                  {m === 'virement' ? 'Virement bancaire' : m === 'cheque' ? 'Chèque certifié' : 'Espèces (≤ 100 000 F CFA)'}
                </label>
              ))}
            </td>
          </tr>
          <tr style={{ background: DGI_ROW_ALT }}>
            <td style={{ ...cellBase, width: '30%', background: DGI_SECTION_BG }}>Banque</td>
            <td style={cellBase}><input type="text" style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 9 }} placeholder="________________" /></td>
          </tr>
          <tr>
            <td style={{ ...cellBase, background: DGI_SECTION_BG }}>N° compte Trésor</td>
            <td style={cellBase}><input type="text" style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 9 }} placeholder="________________" /></td>
          </tr>
        </tbody>
      </table>

      {/* Section F — Signature */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={1} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION F — ATTESTATION ET SIGNATURE
          </th></tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...cellBase, padding: '16px 10px', fontSize: 9, lineHeight: 2 }}>
              Je soussigné(e) <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 200 }}>&nbsp;</span> certifie l'exactitude des informations portées dans la présente déclaration.<br />
              Fait à <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 120 }}>&nbsp;</span>, le <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 100 }}>&nbsp;</span><br /><br />
              <div style={{ marginTop: 8, textAlign: 'center', border: '1px dashed #999', padding: 30, color: '#aaa', fontSize: 10 }}>
                Signature et cachet du contribuable
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {canDeclare && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => declareTVA.mutate({ year, month })} disabled={declareTVA.isPending}
            className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ borderColor: DGI_GREEN, color: DGI_GREEN }}>
            {declareTVA.isPending ? 'En cours…' : '✅ Marquer comme déclarée'}
          </button>
        </div>
      )}
    </div>
  )

  // ── Period selector (extraControls) ────────────────────────────────────────
  const periodSelector = (
    <div className="flex items-center gap-2 flex-wrap">
      <button onClick={prevMonth} className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">←</button>
      {[-1, 0, 1].map(offset => {
        const tm = month + offset
        const dm = ((tm - 1 + 12) % 12) + 1
        const dy = year + Math.floor((tm - 1) / 12)
        const active = dm === month && dy === year
        return (
          <button key={offset} onClick={() => { setMonth(dm); setYear(dy); setPrefilled(false) }}
            className={`rounded border px-3 py-1.5 text-sm font-medium ${active ? 'border-[#006633] bg-[#E8F5E9] text-[#006633]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {MONTHS[dm - 1]} {dy}
          </button>
        )
      })}
      <button onClick={nextMonth} className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">→</button>
      {data?.status && (
        <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${
          isPaid ? 'bg-green-100 text-green-700' :
          data.status === 'DECLARED' ? 'bg-blue-100 text-blue-700' :
          data.status === 'LATE' ? 'bg-red-100 text-red-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {isPaid ? '✓ Payée' : data.status === 'DECLARED' ? 'Déclarée' : data.status === 'LATE' ? 'En retard' : 'À déclarer'}
        </span>
      )}
    </div>
  )

  return (
    <FormPageViewer
      formRef="I/TVA-IR"
      formTitle="Déclaration mensuelle TVA"
      periodLabel={periodLabel}
      pages={[
        { pageNumber: 1, title: 'Identification & TVA collectée',    component: page1 },
        { pageNumber: 2, title: 'TVA déductible & Liquidation',      component: page2 },
      ]}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      onDownloadPdf={() => downloadTva(buildPdfData())}
      {...(canDeclare ? { onMarkDeclared: () => declareTVA.mutate({ year, month }) } : {})}
      isDeclared={isDeclared}
      isPaid={isPaid}
      extraControls={periodSelector}
    />
  )
}
