import { useState } from 'react'
import { useIGSDeclaration } from '@/hooks/useFiscalRegime'
import { DgiFormHeader } from '@/components/fiscal/DgiFormHeader'
import { FormPageViewer } from '@/components/fiscal/FormPageViewer'
import { usePdfDownload } from '@/hooks/usePdfDownload'

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
const numCell: React.CSSProperties      = { ...cellBase, color: '#666', fontSize: 8, width: 28, textAlign: 'center' }
const tblStyle: React.CSSProperties     = { borderCollapse: 'collapse', width: '100%', fontSize: 9, fontFamily: 'Arial, sans-serif' }

function fmt(n: number) { return n.toLocaleString('fr-FR') }

export function IGSPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data, isLoading } = useIGSDeclaration(year)
  const { downloadIgs }     = usePdfDownload()

  const [caN1Input, setCaN1Input]     = useState(0)
  const [adherentCga, setAdherentCga] = useState(false)
  const [payMode, setPayMode]         = useState<'ANNUEL' | 'TRIMESTRIEL'>('ANNUEL')
  const [prefilled, setPrefilled]     = useState(false)

  const handlePrefill = () => {
    if (!data) return
    setCaN1Input(data.caN1)
    setAdherentCga(data.adherentCga)
    setPayMode(data.paymentMode)
    setPrefilled(true)
  }

  if (isLoading) return <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
  if (!data) return null

  const montantDu = prefilled
    ? (adherentCga ? data.igsAmountCga : data.igsAmount)
    : (data.adherentCga ? data.igsAmountCga : data.igsAmount)

  const isPaid = data.status === 'PAID'
  const effectiveCgaReduction = data.igsAmount - data.igsAmountCga

  const IGS_BAREME = data.bareme
  const activeClass = prefilled
    ? IGS_BAREME.find(r => caN1Input >= r.caMin && caN1Input <= r.caMax)
    : IGS_BAREME.find(r => r.classe === data.igsClass)

  const periodLabel = `Exercice ${year} | Échéance 30/04/${year}`

  const yearSelector = (
    <div className="flex flex-wrap items-center gap-2">
      {YEARS.map(y => (
        <button key={y} onClick={() => { setYear(y); setPrefilled(false) }}
          className={`rounded border px-3 py-1.5 text-sm font-medium ${y === year ? 'border-[#006633] bg-[#E8F5E9] text-[#006633]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          {y}
        </button>
      ))}
      <span className={`ml-auto self-center rounded-full px-3 py-1 text-xs font-semibold ${isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
        {isPaid ? '✓ Payé' : '⏳ À payer'}
      </span>
    </div>
  )

  const page1 = (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Libératoire notice */}
      <div style={{ border: '1px solid #006633', background: DGI_SECTION_BG, padding: '8px 12px', fontSize: 9, fontFamily: 'Arial', marginBottom: 8 }}>
        <strong style={{ color: DGI_GREEN }}>L'IGS est libératoire de :</strong>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 20px', marginTop: 4 }}>
          <span>✓ Patente — 0 F CFA</span>
          <span>✓ TVA — Pas de déclaration</span>
          <span>✓ IRPP BIC/BNC/BA — Inclus dans IGS</span>
          <span>✓ Taxe sur le CA — Non applicable</span>
        </div>
        <div style={{ borderTop: '1px solid #a5d6a7', marginTop: 6, paddingTop: 4, fontSize: 8.5, color: '#555' }}>
          <strong>L'IGS ne dispense pas de :</strong> Retenues à la source (RAS) · Cotisations CNPS employeur · FDFP · Taxe foncière (si propriétaire)
        </div>
      </div>

      <DgiFormHeader
        formRef="IGS/CM-DGI"
        title={`DECLARATION DE L'IMPOT GENERAL SYNTHETIQUE (IGS) — EXERCICE ${year}`}
        subtitle={`Exercice ${year}  |  Échéance : 30/04/${year}  |  Art. 45 à 59 CGI Cameroun`}
        {...(data.centerImpots ? { centerImpots: data.centerImpots } : {})}
        {...(data.niu ? { niu: data.niu } : {})}
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
            ['NIU',                   data.niu ?? '—'],
            ['Centre des impôts',     data.centerImpots ?? '—'],
            ['Exercice',              String(year)],
            ['Échéance déclaration',  `30/04/${year}`],
          ].map(([label, value], i) => (
            <tr key={label} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={{ ...cellBase, width: '40%', background: DGI_SECTION_BG, fontWeight: 600 }}>{label}</td>
              <td style={{ ...cellBase, fontFamily: label === 'NIU' ? 'monospace' : undefined }}>
                {label === 'Exercice' ? <strong style={{ color: DGI_GREEN }}>{value}</strong> : value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Section B — Calcul IGS */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={3} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION B — CALCUL DE L'IGS — BARÈME DGI {year} (CGI Art. 45 à 59)
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
            <td style={cellBase}>CA N-1 ({year - 1}) retenu pour calcul de classe IGS</td>
            <td style={{ ...cellBase, textAlign: 'right' }}>
              {prefilled ? (
                <input type="number" value={caN1Input || ''}
                  onChange={e => setCaN1Input(Number(e.target.value))}
                  style={{ width: 130, border: '1px solid #006633', padding: '1px 4px', fontSize: 9, fontFamily: 'monospace', textAlign: 'right' }} />
              ) : (
                <span style={{ fontFamily: 'monospace' }}>{fmt(data.caN1)}</span>
              )}
            </td>
          </tr>
          <tr style={{ background: DGI_ROW_ALT }}>
            <td style={numCell}>2</td>
            <td style={cellBase}>Classe IGS déterminée</td>
            <td style={{ ...cellBase, textAlign: 'right', fontWeight: 'bold', color: DGI_GREEN }}>
              {activeClass ? `Classe ${activeClass.classe}` : '—'}
            </td>
          </tr>
          <tr>
            <td style={numCell}>3</td>
            <td style={cellBase}>IGS de base (sans CGA)</td>
            <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(data.igsAmount)}</td>
          </tr>
          <tr style={{ background: DGI_ROW_ALT }}>
            <td style={numCell}>4</td>
            <td style={cellBase}>Adhérent CGA ?</td>
            <td style={{ ...cellBase, textAlign: 'right' }}>
              {prefilled ? (
                <>
                  <label style={{ marginRight: 12, cursor: 'pointer' }}>
                    <input type="radio" checked={adherentCga} onChange={() => setAdherentCga(true)} /> Oui
                  </label>
                  <label style={{ cursor: 'pointer' }}>
                    <input type="radio" checked={!adherentCga} onChange={() => setAdherentCga(false)} /> Non
                  </label>
                </>
              ) : (
                <span style={{ fontWeight: 600, color: data.adherentCga ? DGI_GREEN : '#555' }}>
                  {data.adherentCga ? 'Oui (réduction 30% applicable)' : 'Non'}
                </span>
              )}
            </td>
          </tr>
          <tr>
            <td style={numCell}>5</td>
            <td style={cellBase}>Réduction CGA (30% — art. 119 CGI)</td>
            <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>
              {(adherentCga || data.adherentCga) ? `(${fmt(effectiveCgaReduction)})` : '—'}
            </td>
          </tr>
          <tr>
            <td style={numCell}>6</td>
            <td style={{ ...resultCell, fontSize: 11 }}>MONTANT IGS DÛ</td>
            <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace', fontSize: 11 }}>{fmt(montantDu)}</td>
          </tr>
        </tbody>
      </table>

      {/* Section C — Barème */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={5} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION C — BARÈME IGS {year} — CLASSES ET MONTANTS (CGI Art. 45)
          </th></tr>
          <tr style={{ background: DGI_SECTION_BG }}>
            <th style={{ ...cellBase, textAlign: 'center' }}>Classe</th>
            <th style={{ ...cellBase, textAlign: 'right' }}>CA min (F CFA)</th>
            <th style={{ ...cellBase, textAlign: 'right' }}>CA max (F CFA)</th>
            <th style={{ ...cellBase, textAlign: 'right' }}>IGS de base</th>
            <th style={{ ...cellBase, textAlign: 'right' }}>Avec CGA (−30%)</th>
          </tr>
        </thead>
        <tbody>
          {IGS_BAREME.map((row, i) => {
            const isActive = row.classe === (activeClass?.classe ?? data.igsClass)
            return (
              <tr key={row.classe} style={{ background: isActive ? DGI_TOTAL_BG : i % 2 === 0 ? '#fff' : DGI_ROW_ALT, fontWeight: isActive ? 'bold' : 'normal' }}>
                <td style={{ ...cellBase, textAlign: 'center' }}>
                  {isActive && <span style={{ color: DGI_GREEN, marginRight: 4 }}>▶</span>}
                  Classe {row.classe}
                </td>
                <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(row.caMin)}</td>
                <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(row.caMax)}</td>
                <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(row.montantBase)}</td>
                <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', color: DGI_GREEN }}>{fmt(row.montantCga)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} style={{ ...cellBase, fontSize: 8, color: '#666', fontStyle: 'italic' }}>
              CGA = Centre de Gestion Agréé — Réduction de 30% sur le montant IGS (Art. 119 CGI) — Pénalité non-paiement : 50% + fermeture + 1 000 000 F CFA
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Section D — Mode de paiement */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={2} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION D — MODE DE PAIEMENT
          </th></tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={2} style={{ ...cellBase, paddingTop: 6, paddingBottom: 6 }}>
              <label style={{ marginRight: 24, cursor: 'pointer', fontWeight: payMode === 'ANNUEL' ? 'bold' : 'normal' }}>
                <input type="radio" checked={payMode === 'ANNUEL'} onChange={() => setPayMode('ANNUEL')} />{' '}
                Paiement annuel unique (avant le 30/04/{year})
              </label>
              <label style={{ cursor: 'pointer', fontWeight: payMode === 'TRIMESTRIEL' ? 'bold' : 'normal' }}>
                <input type="radio" checked={payMode === 'TRIMESTRIEL'} onChange={() => setPayMode('TRIMESTRIEL')} />{' '}
                Paiement trimestriel (4 versements égaux)
              </label>
            </td>
          </tr>
          {payMode === 'ANNUEL' ? (
            <tr>
              <td style={{ ...subtotalCell, width: '60%' }}>Montant annuel à payer avant le 30/04/{year}</td>
              <td style={{ ...resultCell, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(montantDu)} F CFA</td>
            </tr>
          ) : (
            <>
              {data.trimestres.map(t => (
                <tr key={t.num} style={{ background: t.num % 2 === 0 ? DGI_ROW_ALT : '#fff' }}>
                  <td style={cellBase}>Versement {t.num}/4 — {t.label}</td>
                  <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(t.amount)} F CFA</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...subtotalCell }}>TOTAL IGS ANNUEL</td>
                <td style={{ ...subtotalCell, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(montantDu)} F CFA</td>
              </tr>
            </>
          )}
          <tr style={{ background: DGI_ROW_ALT }}>
            <td style={cellBase}>Statut du paiement</td>
            <td style={{ ...cellBase, textAlign: 'right', fontWeight: 'bold', color: isPaid ? DGI_GREEN : '#CE1126' }}>
              {isPaid ? '✅ Payé' : '⏳ À payer'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signature */}
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

  return (
    <FormPageViewer
      formRef="IGS/CM-DGI"
      formTitle="Déclaration Impôt Général Synthétique"
      periodLabel={periodLabel}
      pages={[{ pageNumber: 1, title: 'Identification, Calcul & Barème', component: page1 }]}
      currentPage={1}
      onPageChange={() => {}}
      onDownloadPdf={() => downloadIgs({
        year,
        caN1:         prefilled ? caN1Input : data.caN1,
        igsClass:     activeClass?.classe ?? data.igsClass ?? 1,
        igsAmount:    data.igsAmount,
        igsAmountCga: data.igsAmountCga,
        adherentCga:  prefilled ? adherentCga : data.adherentCga,
        montantDu,
        bareme:       data.bareme,
        ...(data.niu          ? { niu: data.niu }                   : {}),
        ...(data.centerImpots ? { centerImpots: data.centerImpots } : {}),
      })}
      extraControls={yearSelector}
    />
  )
}
