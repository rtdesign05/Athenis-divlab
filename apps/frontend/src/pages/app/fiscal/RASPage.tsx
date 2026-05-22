import { useState } from 'react'
import { useRAS, useTaxConfig, useRasSuggestions } from '@/hooks/useFiscal'
import { DgiFormHeader } from '@/components/fiscal/DgiFormHeader'
import { FormPageViewer } from '@/components/fiscal/FormPageViewer'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const RAS_TYPES = [
  { code: 'SERVICES',      label: 'Prestataires services locaux',     taux: 5.5,  base: '5% + 0,5% CAC' },
  { code: 'HONORAIRES',    label: 'Honoraires professions libérales', taux: 11,   base: '10% + 1% CAC' },
  { code: 'LOYERS',        label: 'Loyers (personnes physiques)',      taux: 10,   base: 'Art. 71 CGI' },
  { code: 'NON_RESIDENTS', label: 'Revenus non-résidents',            taux: 16.5, base: 'Art. 77 CGI' },
  { code: 'DIVIDENDES',    label: 'Dividendes distribués',            taux: 16.5, base: 'Art. 68 CGI' },
]

interface RASRow {
  id: string; beneficiaire: string; type: string; base: number; taux: number; retenue: number
}

const DGI_GREEN      = '#006633'
const DGI_SECTION_BG = '#E8F5E9'
const DGI_TOTAL_BG   = '#C8E6C9'
const DGI_ROW_ALT    = '#F1F8E9'
const DGI_BORDER     = '1px solid #000'

const cellBase: React.CSSProperties     = { border: DGI_BORDER, padding: '3px 6px', fontSize: 9, fontFamily: 'Arial, sans-serif' }
const sectionHdr: React.CSSProperties   = { ...cellBase, background: DGI_GREEN, color: '#fff', fontWeight: 'bold', fontSize: 10 }
const tblStyle: React.CSSProperties     = { borderCollapse: 'collapse', width: '100%', fontSize: 9, fontFamily: 'Arial, sans-serif' }

function fmt(n: number) { return n.toLocaleString('fr-FR') }

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PAID:     { bg: DGI_TOTAL_BG, color: DGI_GREEN,   label: '✓ Versée' },
  DECLARED: { bg: '#DBEAFE',    color: '#1d4ed8',    label: 'Déclarée' },
  PENDING:  { bg: '#FEF3C7',    color: '#b45309',    label: 'En attente' },
  LATE:     { bg: '#FFEBEE',    color: '#CE1126',    label: '🔴 En retard' },
}

export function RASPage() {
  const { country } = useCompanySettings()
  const year = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const { data, isLoading } = useRAS(year)
  const { data: config }    = useTaxConfig()
  const { data: suggestions, isLoading: loadingSugg, refetch: fetchSugg } = useRasSuggestions(year, selectedMonth)

  // RAS (Retenue À la Source) avec taux Cameroun (5.5%, 11%, 16.5%, CGI art. 68/71/77).
  // FR utilise un système différent (prélèvement à la source géré par la DGFiP).
  if (country && country !== 'CM') {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 px-8 py-12 text-center max-w-lg">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-base font-semibold text-amber-900">RAS spécifique au Cameroun</p>
          <p className="mt-2 text-sm text-amber-800">
            La <strong>Retenue À la Source</strong> (taux 5,5% / 11% / 16,5%) est régie par le CGI camerounais.
            Pour la France, le prélèvement à la source sur les revenus est géré directement par la DGFiP.
          </p>
          <p className="mt-3 text-xs text-amber-700">Pays détecté : <strong>{country}</strong>.</p>
        </div>
      </div>
    )
  }

  const [rows, setRows] = useState<RASRow[]>([
    { id: '1', beneficiaire: '', type: 'SERVICES', base: 0, taux: 5.5, retenue: 0 },
  ])

  const addRow = () => setRows(r => [...r, { id: Date.now().toString(), beneficiaire: '', type: 'SERVICES', base: 0, taux: 5.5, retenue: 0 }])
  const removeRow = (id: string) => setRows(r => r.filter(row => row.id !== id))
  const updateRow = (id: string, field: keyof RASRow, value: string | number) => {
    setRows(r => r.map(row => {
      if (row.id !== id) return row
      const updated = { ...row, [field]: value }
      if (field === 'type') {
        const found = RAS_TYPES.find(t => t.code === value)
        if (found) { updated.taux = found.taux; updated.retenue = Math.round(updated.base * found.taux / 100) }
      }
      if (field === 'base' || field === 'taux') {
        updated.retenue = Math.round(Number(updated.base) * Number(updated.taux) / 100)
      }
      return updated
    }))
  }

  const totalBase    = rows.reduce((s, r) => s + r.base, 0)
  const totalRetenue = rows.reduce((s, r) => s + r.retenue, 0)

  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
  if (!data) return null

  const monthLabel  = MONTHS[selectedMonth - 1] ?? ''
  const period      = `${monthLabel} ${year}`
  const periodLabel = `Période : ${period} | Échéance 15/${String(selectedMonth + 1).padStart(2, '0')}/${year}`

  const monthSelector = (
    <div className="flex flex-wrap gap-2">
      {MONTHS.map((m, i) => (
        <button key={i} onClick={() => setSelectedMonth(i + 1)}
          className={`rounded border px-3 py-1.5 text-xs font-medium ${selectedMonth === i + 1 ? 'border-[#006633] bg-[#E8F5E9] text-[#006633]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
          {m.slice(0, 3)}
        </button>
      ))}
    </div>
  )

  const importButton = (
    <button
      onClick={async () => {
        const result = await fetchSugg()
        const sugg = result.data?.suggestions ?? []
        if (sugg.length === 0) { alert('Aucune dépense avec RAS détectée ce mois'); return }
        const newRows = sugg.map((s: { beneficiaire: string; type: string; base: number; taux: number; retenue: number }) => ({
          id: Date.now().toString() + Math.random(),
          beneficiaire: s.beneficiaire,
          type: s.type,
          base: s.base,
          taux: s.taux,
          retenue: s.retenue,
        }))
        setRows(r => [...r, ...newRows])
      }}
      disabled={loadingSugg}
      className="flex items-center gap-2 rounded-lg border border-[#006633] bg-[#E8F5E9] px-3 py-1.5 text-xs font-medium text-[#006633] hover:bg-[#C8E6C9] transition-colors disabled:opacity-50"
    >
      {loadingSugg ? 'Chargement…' : 'Importer depuis les achats'}
    </button>
  )

  void suggestions

  const page1 = (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <DgiFormHeader
        formRef="RAS/CM-DGI"
        title="RETENUES À LA SOURCE — BORDEREAU DE VERSEMENT (CGI Art. 63 à 78)"
        subtitle={`Période : ${period} | Échéance : 15 du mois suivant | Art. 63 à 78 CGI Cameroun`}
        {...(config?.centerImpots ? { centerImpots: config.centerImpots } : {})}
        {...(config?.niu ? { niu: config.niu } : {})}
      />

      {/* Section A — Identification */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={2} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION A — IDENTIFICATION DU REDEVABLE
          </th></tr>
        </thead>
        <tbody>
          {[
            ['NIU',              config?.niu ?? '—'],
            ['RCCM',             config?.rccm ?? '—'],
            ['Centre des impôts', config?.centerImpots ?? '—'],
            ['Période',          period],
          ].map(([label, value], i) => (
            <tr key={label} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={{ ...cellBase, width: '40%', background: DGI_SECTION_BG, fontWeight: 600 }}>{label}</td>
              <td style={{ ...cellBase, fontFamily: label === 'NIU' || label === 'RCCM' ? 'monospace' : undefined }}>
                {label === 'Période' ? <strong style={{ color: DGI_GREEN }}>{value}</strong> : value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Section B — Taux applicables */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={3} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION B — TAUX RAS APPLICABLES — CGI {year}
          </th></tr>
          <tr style={{ background: DGI_SECTION_BG }}>
            <th style={{ ...cellBase, textAlign: 'left' }}>Nature de la rémunération</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 60 }}>Taux</th>
            <th style={{ ...cellBase, textAlign: 'left', width: 140 }}>Référence</th>
          </tr>
        </thead>
        <tbody>
          {data.types.map((t, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={cellBase}>{t.type}</td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: DGI_GREEN }}>{t.taux}%</td>
              <td style={{ ...cellBase, fontSize: 8, color: '#555' }}>{t.applicabilite}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Section C — Bordereau de saisie */}
      <table style={{ ...tblStyle, marginTop: 8 }}>
        <thead>
          <tr><th colSpan={6} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
            SECTION C — BORDEREAU DE RETENUES — {period.toUpperCase()}
          </th></tr>
          <tr style={{ background: DGI_SECTION_BG }}>
            <th style={{ ...cellBase, textAlign: 'left' }}>Bénéficiaire</th>
            <th style={{ ...cellBase, textAlign: 'left', width: 130 }}>Type RAS</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 110 }}>Base HT (F CFA)</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 50 }}>Taux</th>
            <th style={{ ...cellBase, textAlign: 'right', width: 110 }}>Retenue (F CFA)</th>
            <th style={{ ...cellBase, width: 24 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
              <td style={{ ...cellBase, padding: 2 }}>
                <input value={row.beneficiaire} onChange={e => updateRow(row.id, 'beneficiaire', e.target.value)}
                  placeholder="Nom / raison sociale"
                  style={{ width: '100%', border: '1px solid #006633', padding: '1px 4px', fontSize: 9, fontFamily: 'Arial' }} />
              </td>
              <td style={{ ...cellBase, padding: 2 }}>
                <select value={row.type} onChange={e => updateRow(row.id, 'type', e.target.value)}
                  style={{ width: '100%', border: '1px solid #006633', padding: '1px', fontSize: 8, fontFamily: 'Arial' }}>
                  {RAS_TYPES.map(t => <option key={t.code} value={t.code}>{t.label} ({t.taux}%)</option>)}
                </select>
              </td>
              <td style={{ ...cellBase, padding: 2 }}>
                <input type="number" value={row.base || ''}
                  onChange={e => updateRow(row.id, 'base', Number(e.target.value))}
                  style={{ width: '100%', border: '1px solid #006633', padding: '1px 4px', fontSize: 9, fontFamily: 'monospace', textAlign: 'right' }} />
              </td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', color: DGI_GREEN }}>{row.taux}%</td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmt(row.retenue)}</td>
              <td style={{ ...cellBase, textAlign: 'center', padding: 2 }}>
                <button onClick={() => removeRow(row.id)} style={{ fontSize: 12, color: '#CE1126', border: 'none', background: 'transparent', cursor: 'pointer' }}>×</button>
              </td>
            </tr>
          ))}
          <tr style={{ background: DGI_TOTAL_BG, fontWeight: 'bold' }}>
            <td colSpan={2} style={cellBase}>TOTAL</td>
            <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totalBase)}</td>
            <td style={cellBase} />
            <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', color: DGI_GREEN }}>{fmt(totalRetenue)}</td>
            <td style={cellBase} />
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={6} style={{ ...cellBase, padding: 4 }}>
              <button onClick={addRow} style={{ border: '1px dashed #999', background: '#fff', padding: '3px 10px', fontSize: 9, fontFamily: 'Arial', cursor: 'pointer', color: '#666' }}>
                + Ajouter un bénéficiaire
              </button>
            </td>
          </tr>
        </tfoot>
      </table>

      {/* TOTAL À VERSER */}
      <table style={{ ...tblStyle, marginTop: 0 }}>
        <tbody>
          <tr>
            <td style={{ ...cellBase, background: DGI_GREEN, color: '#fff', fontWeight: 'bold', fontSize: 11 }}>TOTAL RAS À VERSER — {period.toUpperCase()}</td>
            <td style={{ ...cellBase, background: DGI_GREEN, color: '#fff', fontWeight: 'bold', fontSize: 11, textAlign: 'right', fontFamily: 'monospace', width: 160 }}>{fmt(totalRetenue)} F CFA</td>
          </tr>
        </tbody>
      </table>

      {/* Section D — Historique */}
      {data.declarations.length > 0 && (
        <table style={{ ...tblStyle, marginTop: 8 }}>
          <thead>
            <tr><th colSpan={5} style={{ ...sectionHdr, textAlign: 'left', letterSpacing: 1 }}>
              SECTION D — HISTORIQUE DES DÉCLARATIONS RAS — {year}
            </th></tr>
            <tr style={{ background: DGI_SECTION_BG }}>
              <th style={cellBase}>Période</th>
              <th style={{ ...cellBase, textAlign: 'right' }}>Base</th>
              <th style={{ ...cellBase, textAlign: 'right' }}>RAS versée</th>
              <th style={{ ...cellBase, textAlign: 'center' }}>Statut</th>
              <th style={cellBase}>Référence</th>
            </tr>
          </thead>
          <tbody>
            {data.declarations.map((d, i) => {
              const badge = STATUS_BADGE[d.status] ?? { bg: '#f3f4f6', color: '#555', label: d.status }
              return (
                <tr key={d.id} style={{ background: i % 2 === 0 ? '#fff' : DGI_ROW_ALT }}>
                  <td style={cellBase}>{d.period}</td>
                  <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(d.baseAmount)}</td>
                  <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmt(d.taxAmount)}</td>
                  <td style={{ ...cellBase, textAlign: 'center', background: badge.bg, color: badge.color, fontWeight: 'bold' }}>{badge.label}</td>
                  <td style={{ ...cellBase, fontFamily: 'monospace', fontSize: 8 }}>{d.reference ?? '—'}</td>
                </tr>
              )
            })}
            <tr style={{ background: DGI_SECTION_BG }}>
              <td colSpan={4} style={{ ...cellBase, fontWeight: 'bold' }}>Cumul versé {year}</td>
              <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: DGI_GREEN }}>
                {fmt(data.cumulVerse)} F CFA
              </td>
            </tr>
          </tbody>
        </table>
      )}

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
    </div>
  )

  return (
    <FormPageViewer
      formRef="RAS/CM-DGI"
      formTitle="Retenues à la Source — Bordereau de versement"
      periodLabel={periodLabel}
      pages={[{ pageNumber: 1, title: 'Bordereau & Historique', component: page1 }]}
      currentPage={1}
      onPageChange={() => {}}
      extraControls={<div className="flex flex-wrap items-center gap-3">{monthSelector}{importButton}</div>}
    />
  )
}
