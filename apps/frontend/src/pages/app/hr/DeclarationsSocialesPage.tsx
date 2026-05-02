import { useState, useMemo } from 'react'
import { useHR, type HREmployee } from '@/contexts/HRContext'

// ── Helpers ───────────────────────────────────────────────────────────────────
const CNPS_PLAFOND = 750_000
const fmtN = (n: number) => new Intl.NumberFormat('fr-CM').format(Math.round(n))
const fmt  = (n: number) => fmtN(n) + ' FCFA'

// ── Types ─────────────────────────────────────────────────────────────────────
type PeriodType = 'MOIS' | 'TRIMESTRE'
type Statut     = 'BROUILLON' | 'A_DEPOSER' | 'DEPOSEE'

interface Declaration {
  id:          string
  periodType:  PeriodType
  periodKey:   string        // 'YYYY-MM' or 'YYYY-QN'
  periodLabel: string
  echeance:    string
  statut:      Statut
  reference:   string
  overrides:   Record<string, number>   // empId → gross amount for the period
}

interface ComputedLine {
  empId:    string
  empName:  string
  poste:    string
  gross:    number   // effective gross for the period
  base:     number   // min(gross, CNPS_PLAFOND)
  cnpsSal:  number   // 4.2% of base  → salarié vieillesse
  vieilEmp: number   // 7.0% of base  → employeur vieillesse
  atEmp:    number   // 1.75% of gross → employeur AT/MP
  afEmp:    number   // 7.0% of gross  → employeur AF
  totalSal: number   // = cnpsSal
  totalEmp: number   // = vieilEmp + atEmp + afEmp
  total:    number   // totalSal + totalEmp
}

// ── CNPS computation ──────────────────────────────────────────────────────────
function computeLine(emp: HREmployee, gross: number): ComputedLine {
  const base     = Math.min(gross, CNPS_PLAFOND)
  const cnpsSal  = Math.round(base * 0.042)
  const vieilEmp = Math.round(base * 0.07)
  const atEmp    = Math.round(gross * 0.0175)
  const afEmp    = Math.round(gross * 0.07)
  const totalSal = cnpsSal
  const totalEmp = vieilEmp + atEmp + afEmp
  return {
    empId: emp.id, empName: `${emp.firstName} ${emp.lastName}`, poste: emp.poste,
    gross, base, cnpsSal, vieilEmp, atEmp, afEmp, totalSal, totalEmp,
    total: totalSal + totalEmp,
  }
}

// ── Period helpers ────────────────────────────────────────────────────────────
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const Q_LABELS: Record<string, string> = {
  Q1: 'T1 (Jan-Mar)', Q2: 'T2 (Avr-Jun)', Q3: 'T3 (Jul-Sep)', Q4: 'T4 (Oct-Déc)',
}

function makePeriodLabel(type: PeriodType, key: string): string {
  const parts = key.split('-')
  if (type === 'MOIS') {
    const y = parts[0] ?? ''
    const m = parseInt(parts[1] ?? '1') - 1
    return `${MONTHS_FR[m] ?? ''} ${y}`
  }
  const y = parts[0] ?? ''
  const q = parts[1] ?? 'Q1'
  return `${Q_LABELS[q] ?? q} ${y}`
}

function makeEcheance(type: PeriodType, key: string): string {
  const parts = key.split('-')
  if (type === 'MOIS') {
    const y = parseInt(parts[0] ?? '2026')
    const m = parseInt(parts[1] ?? '1')
    const nm = m === 12 ? 1 : m + 1
    const ny = m === 12 ? y + 1 : y
    return `15/${String(nm).padStart(2, '0')}/${ny}`
  }
  const y = parseInt(parts[0] ?? '2026')
  const q = parts[1] ?? 'Q1'
  const map: Record<string, string> = {
    Q1: `15/04/${y}`, Q2: `15/07/${y}`, Q3: `15/10/${y}`, Q4: `15/01/${y + 1}`,
  }
  return map[q] ?? '—'
}

function periodMultiplier(type: PeriodType): number {
  return type === 'TRIMESTRE' ? 3 : 1
}

// ── Initial data ──────────────────────────────────────────────────────────────
const INIT_DECL: Declaration[] = [
  { id: 'd-1', periodType: 'TRIMESTRE', periodKey: '2026-Q2', periodLabel: makePeriodLabel('TRIMESTRE', '2026-Q2'), echeance: '15/07/2026', statut: 'A_DEPOSER', reference: '',             overrides: {} },
  { id: 'd-2', periodType: 'TRIMESTRE', periodKey: '2026-Q1', periodLabel: makePeriodLabel('TRIMESTRE', '2026-Q1'), echeance: '15/04/2026', statut: 'DEPOSEE',   reference: 'CNPS-2026-T1', overrides: {} },
  { id: 'd-3', periodType: 'TRIMESTRE', periodKey: '2025-Q4', periodLabel: makePeriodLabel('TRIMESTRE', '2025-Q4'), echeance: '15/01/2026', statut: 'DEPOSEE',   reference: 'CNPS-2025-T4', overrides: {} },
  { id: 'd-4', periodType: 'TRIMESTRE', periodKey: '2025-Q3', periodLabel: makePeriodLabel('TRIMESTRE', '2025-Q3'), echeance: '15/10/2025', statut: 'DEPOSEE',   reference: 'CNPS-2025-T3', overrides: {} },
]

// ── Status config ─────────────────────────────────────────────────────────────
const STATUT_LABEL: Record<Statut, string> = {
  BROUILLON: 'Brouillon', A_DEPOSER: 'À déposer', DEPOSEE: 'Déposée',
}
const STATUT_COLOR: Record<Statut, string> = {
  BROUILLON: 'bg-gray-100 text-gray-600',
  A_DEPOSER: 'bg-yellow-100 text-yellow-700',
  DEPOSEE:   'bg-green-100 text-green-700',
}

// ── New Declaration Form ──────────────────────────────────────────────────────
interface NewDeclFormProps {
  onClose:  () => void
  onCreate: (d: Declaration) => void
}

function NewDeclForm({ onClose, onCreate }: NewDeclFormProps) {
  const [periodType, setPeriodType] = useState<PeriodType>('TRIMESTRE')
  const [year,    setYear]    = useState('2026')
  const [month,   setMonth]   = useState('01')
  const [quarter, setQuarter] = useState('Q2')

  function handleCreate() {
    const key   = periodType === 'MOIS' ? `${year}-${month}` : `${year}-${quarter}`
    const label = makePeriodLabel(periodType, key)
    const ech   = makeEcheance(periodType, key)
    onCreate({
      id:          `d-${Date.now()}`,
      periodType,
      periodKey:   key,
      periodLabel: label,
      echeance:    ech,
      statut:      'BROUILLON',
      reference:   '',
      overrides:   {},
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Nouvelle déclaration CNPS</h3>

        <div className="space-y-4">
          {/* Period type toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type de période</label>
            <div className="flex gap-2">
              {(['MOIS', 'TRIMESTRE'] as PeriodType[]).map(t => (
                <button key={t} onClick={() => setPeriodType(t)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    periodType === t
                      ? 'bg-forest-900 text-white border-forest-900'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {t === 'MOIS' ? 'Mensuel' : 'Trimestriel'}
                </button>
              ))}
            </div>
          </div>

          {/* Year */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Année</label>
            <select value={year} onChange={e => setYear(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest-600">
              {['2024', '2025', '2026', '2027'].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>

          {/* Month or Quarter */}
          {periodType === 'MOIS' ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mois</label>
              <select value={month} onChange={e => setMonth(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest-600">
                {MONTHS_FR.map((m, i) => (
                  <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Trimestre</label>
              <select value={quarter} onChange={e => setQuarter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest-600">
                <option value="Q1">T1 — Janvier à Mars</option>
                <option value="Q2">T2 — Avril à Juin</option>
                <option value="Q3">T3 — Juillet à Septembre</option>
                <option value="Q4">T4 — Octobre à Décembre</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={handleCreate}
            className="flex-1 py-2 rounded-lg bg-forest-900 text-white text-sm font-medium hover:bg-forest-800">
            Créer et éditer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
interface EditModalProps {
  declaration: Declaration
  employees:   HREmployee[]
  onSave:      (updated: Declaration) => void
  onClose:     () => void
}

function EditModal({ declaration, employees, onSave, onClose }: EditModalProps) {
  const mult = periodMultiplier(declaration.periodType)

  const [statut,    setStatut]    = useState<Statut>(declaration.statut)
  const [reference, setReference] = useState(declaration.reference)
  const [overrides, setOverrides] = useState<Record<string, number>>(declaration.overrides)
  // raw text during typing (empId → raw string), cleared on blur
  const [inputs,    setInputs]    = useState<Record<string, string>>({})
  const [saved,     setSaved]     = useState(false)

  function getGross(emp: HREmployee): number {
    return (emp.id in overrides) ? (overrides[emp.id] as number) : emp.grossSalary * mult
  }

  const lines = useMemo(
    () => employees.map(emp => computeLine(emp, getGross(emp))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, overrides, mult],
  )

  const totals = useMemo(() => ({
    gross:    lines.reduce((s, l) => s + l.gross,    0),
    cnpsSal:  lines.reduce((s, l) => s + l.cnpsSal,  0),
    vieilEmp: lines.reduce((s, l) => s + l.vieilEmp, 0),
    atEmp:    lines.reduce((s, l) => s + l.atEmp,    0),
    afEmp:    lines.reduce((s, l) => s + l.afEmp,    0),
    totalSal: lines.reduce((s, l) => s + l.totalSal, 0),
    totalEmp: lines.reduce((s, l) => s + l.totalEmp, 0),
    total:    lines.reduce((s, l) => s + l.total,    0),
  }), [lines])

  function handleGrossInput(empId: string, raw: string) {
    setInputs(p => ({ ...p, [empId]: raw }))
    const cleaned = raw.replace(/\s/g, '').replace(',', '.')
    const n = parseFloat(cleaned)
    if (!isNaN(n) && n >= 0) {
      setOverrides(p => ({ ...p, [empId]: Math.round(n) }))
      setSaved(false)
    }
  }

  function handleGrossFocus(emp: HREmployee, line: ComputedLine) {
    setInputs(p => ({ ...p, [emp.id]: String(line.gross) }))
  }

  function handleGrossBlur(empId: string) {
    setInputs(p => {
      const { [empId]: _removed, ...rest } = p
      return rest as Record<string, string>
    })
  }

  function resetGross(empId: string) {
    setOverrides(p => {
      const { [empId]: _removed, ...rest } = p
      return rest as Record<string, number>
    })
    setInputs(p => {
      const { [empId]: _removed, ...rest } = p
      return rest as Record<string, string>
    })
    setSaved(false)
  }

  function handleSave() {
    onSave({ ...declaration, statut, reference, overrides })
    setSaved(true)
  }

  function handleDepose() {
    onSave({ ...declaration, statut: 'DEPOSEE', reference, overrides })
    onClose()
  }

  const isReadOnly = declaration.statut === 'DEPOSEE' && statut === 'DEPOSEE'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Déclaration CNPS — {declaration.periodLabel}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Échéance&nbsp;: <strong>{declaration.echeance}</strong>
              {declaration.periodType === 'TRIMESTRE' && (
                <span className="ml-3 text-gray-400 text-xs">brut = salaire mensuel × 3</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Controls bar ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Référence CNPS :</label>
            <input
              value={reference}
              onChange={e => { setReference(e.target.value); setSaved(false) }}
              placeholder="ex. CNPS-2026-T2"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-forest-600 w-44"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Statut :</label>
            <select
              value={statut}
              onChange={e => { setStatut(e.target.value as Statut); setSaved(false) }}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-forest-600">
              <option value="BROUILLON">Brouillon</option>
              <option value="A_DEPOSER">À déposer</option>
              <option value="DEPOSEE">Déposée</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {saved && <span className="text-xs text-green-600 font-medium">✓ Enregistré</span>}
            {!isReadOnly && (
              <button onClick={handleSave}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                Enregistrer
              </button>
            )}
            {statut !== 'DEPOSEE' && (
              <button onClick={handleDepose}
                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors">
                ✓ Marquer déposée
              </button>
            )}
          </div>
        </div>

        {/* ── Employee table ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs min-w-max">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600 min-w-44">Employé</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 min-w-36">
                  Brut période
                  <div className="font-normal text-gray-400">{isReadOnly ? '' : '(modifiable)'}</div>
                </th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-500 min-w-28">
                  Base plaf.
                  <div className="font-normal text-gray-400">max 750 000</div>
                </th>
                <th className="px-3 py-2.5 text-right font-semibold text-blue-700 min-w-28">
                  CNPS Sal.
                  <div className="font-normal text-blue-400">4,2 % plaf.</div>
                </th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 min-w-28">
                  Vieil. Emp.
                  <div className="font-normal text-gray-400">7,0 % plaf.</div>
                </th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 min-w-28">
                  AT/MP Emp.
                  <div className="font-normal text-gray-400">1,75 % brut</div>
                </th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600 min-w-28">
                  AF Emp.
                  <div className="font-normal text-gray-400">7,0 % brut</div>
                </th>
                <th className="px-3 py-2.5 text-right font-semibold text-blue-700 min-w-28">Total Sal.</th>
                <th className="px-3 py-2.5 text-right font-semibold text-orange-700 min-w-28">Total Emp.</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-800 min-w-28">Total CNPS</th>
                {!isReadOnly && <th className="px-2 py-2.5 w-6"></th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {employees.map((emp, idx) => {
                const line        = lines[idx]!
                const isOverride  = emp.id in overrides
                const defaultGross = emp.grossSalary * mult
                const rawInput    = (emp.id in inputs) ? (inputs[emp.id] as string) : null

                return (
                  <tr key={emp.id} className={`hover:bg-gray-50 transition-colors ${isOverride ? 'bg-blue-50/40' : ''}`}>
                    {/* Employé */}
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-gray-800">{emp.firstName} {emp.lastName}</p>
                      <p className="text-gray-400 text-xs">{emp.poste}</p>
                    </td>

                    {/* Brut période — editable */}
                    <td className="px-3 py-2 text-right">
                      {isReadOnly ? (
                        <span className="font-medium text-gray-700">{fmtN(line.gross)}</span>
                      ) : (
                        <>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={rawInput !== null ? rawInput : fmtN(line.gross)}
                            onChange={e => handleGrossInput(emp.id, e.target.value)}
                            onFocus={e => { handleGrossFocus(emp, line); e.target.select() }}
                            onBlur={() => handleGrossBlur(emp.id)}
                            className={`w-32 text-right rounded-lg border px-2 py-1 text-xs focus:outline-none focus:border-forest-600 transition-colors ${
                              isOverride
                                ? 'border-blue-300 bg-blue-50 text-blue-700 font-semibold'
                                : 'border-gray-200 bg-white text-gray-700'
                            }`}
                          />
                          {isOverride && (
                            <div className="text-gray-400 mt-0.5 text-right">
                              défaut : {fmtN(defaultGross)}
                            </div>
                          )}
                        </>
                      )}
                    </td>

                    {/* Computed columns */}
                    <td className="px-3 py-2.5 text-right text-gray-500">{fmtN(line.base)}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-blue-700">{fmtN(line.cnpsSal)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{fmtN(line.vieilEmp)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{fmtN(line.atEmp)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{fmtN(line.afEmp)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-blue-700">{fmtN(line.totalSal)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-orange-700">{fmtN(line.totalEmp)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-gray-800">{fmtN(line.total)}</td>

                    {/* Reset button */}
                    {!isReadOnly && (
                      <td className="px-2 py-2.5 text-center">
                        {isOverride && (
                          <button
                            onClick={() => resetGross(emp.id)}
                            title="Remettre au brut mensuel par défaut"
                            className="text-gray-300 hover:text-red-400 transition-colors text-sm leading-none">
                            ✕
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>

            {/* Totals */}
            <tfoot className="border-t-2 border-gray-300 bg-gray-100 sticky bottom-0">
              <tr className="font-bold">
                <td className="px-4 py-3 text-gray-700">
                  TOTAL
                  <span className="font-normal text-gray-500 ml-1">({employees.length} employés)</span>
                </td>
                <td className="px-3 py-3 text-right text-gray-800">{fmtN(totals.gross)}</td>
                <td className="px-3 py-3 text-right text-gray-400">—</td>
                <td className="px-3 py-3 text-right text-blue-700">{fmtN(totals.cnpsSal)}</td>
                <td className="px-3 py-3 text-right text-gray-700">{fmtN(totals.vieilEmp)}</td>
                <td className="px-3 py-3 text-right text-gray-700">{fmtN(totals.atEmp)}</td>
                <td className="px-3 py-3 text-right text-gray-700">{fmtN(totals.afEmp)}</td>
                <td className="px-3 py-3 text-right text-blue-700">{fmtN(totals.totalSal)}</td>
                <td className="px-3 py-3 text-right text-orange-700">{fmtN(totals.totalEmp)}</td>
                <td className="px-3 py-3 text-right text-gray-900 text-sm">{fmtN(totals.total)}</td>
                {!isReadOnly && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Summary footer ──────────────────────────────────────────────── */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 shrink-0">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs text-gray-500">Masse salariale totale</p>
              <p className="text-xl font-bold text-gray-800">{fmt(totals.gross)}</p>
            </div>
            <div className="w-px h-8 bg-gray-300"></div>
            <div>
              <p className="text-xs text-blue-600">Part salariale (CNPS vieillesse)</p>
              <p className="text-xl font-bold text-blue-700">{fmt(totals.totalSal)}</p>
            </div>
            <div>
              <p className="text-xs text-orange-600">Part patronale (vieil. + AT + AF)</p>
              <p className="text-xl font-bold text-orange-700">{fmt(totals.totalEmp)}</p>
            </div>
            <div className="w-px h-8 bg-gray-300"></div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total à verser à la CNPS</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(totals.total)}</p>
            </div>
            {!isReadOnly && (
              <div className="ml-auto flex items-center gap-2">
                {saved && <span className="text-xs text-green-600 font-medium">✓ Enregistré</span>}
                <button onClick={handleSave}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                  Enregistrer
                </button>
                {statut !== 'DEPOSEE' && (
                  <button onClick={handleDepose}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors">
                    ✓ Marquer déposée
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function DeclarationsSocialesPage() {
  const { employees } = useHR()
  const [declarations, setDeclarations] = useState<Declaration[]>(INIT_DECL)
  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [showNew,      setShowNew]      = useState(false)

  const activeEmployees = employees.filter(e => !e.endDate || new Date(e.endDate) > new Date())
  const editingDecl     = editingId ? (declarations.find(d => d.id === editingId) ?? null) : null
  const aDeposer        = declarations.filter(d => d.statut === 'A_DEPOSER')
  const totalDeposee    = declarations.filter(d => d.statut === 'DEPOSEE').length
  const prochaine       = aDeposer[0] ?? null

  function handleCreate(d: Declaration) {
    setDeclarations(prev => [d, ...prev])
    setShowNew(false)
    setEditingId(d.id)
  }

  function handleSave(updated: Declaration) {
    setDeclarations(prev => prev.map(d => d.id === updated.id ? updated : d))
  }

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Déclarations sociales — CNPS</h1>
          <p className="text-sm text-gray-500 mt-1">Caisse Nationale de Prévoyance Sociale du Cameroun</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-forest-900 text-white rounded-lg text-sm font-medium hover:bg-forest-800 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle déclaration
        </button>
      </div>

      {/* ── CNPS rates ─────────────────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-blue-800 mb-3">Taux CNPS en vigueur — Cameroun</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Vieillesse salarié',    taux: '4,2 %',  note: 'Sur brut plafonné (750 000)' },
            { label: 'Vieillesse employeur',   taux: '7,0 %',  note: 'Sur brut plafonné (750 000)' },
            { label: 'AT/MP employeur',        taux: '1,75 %', note: 'Sur brut total (non plafonné)' },
            { label: 'Allocations familiales', taux: '7,0 %',  note: 'Sur brut total (non plafonné)' },
          ].map(t => (
            <div key={t.label} className="bg-white rounded-lg p-3 border border-blue-100">
              <p className="text-xs text-gray-500">{t.label}</p>
              <p className="text-xl font-bold text-blue-700 mt-0.5">{t.taux}</p>
              <p className="text-xs text-gray-400 mt-0.5 italic">{t.note}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-blue-600 mt-3">
          Charge patronale totale : <strong>15,75 %</strong> (7 + 1,75 + 7) ·
          Charge salariale : <strong>4,2 %</strong> ·
          Plafond mensuel CNPS : <strong>750 000 FCFA</strong>
        </p>
      </div>

      {/* ── Alert ──────────────────────────────────────────────────────────── */}
      {aDeposer.length > 0 && (
        <div className="flex gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <svg className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              {aDeposer.length} déclaration{aDeposer.length > 1 ? 's' : ''} à déposer
            </p>
            {aDeposer.map(d => (
              <p key={d.id} className="text-xs text-yellow-700 mt-0.5 flex items-center gap-2">
                <span>{d.periodLabel} — échéance {d.echeance}</span>
                <button
                  onClick={() => setEditingId(d.id)}
                  className="underline hover:text-yellow-900 font-medium">
                  Éditer →
                </button>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── KPIs ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Déclarations déposées</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{totalDeposee}</p>
          <p className="text-xs text-gray-400 mt-0.5">sur {declarations.length} au total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">En attente</p>
          <p className={`text-3xl font-bold mt-1 ${aDeposer.length > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
            {aDeposer.length}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">déclaration{aDeposer.length !== 1 ? 's' : ''} à déposer</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Prochaine échéance</p>
          {prochaine ? (
            <>
              <p className="text-xl font-bold text-yellow-600 mt-1">{prochaine.echeance}</p>
              <p className="text-xs text-gray-400 mt-0.5">{prochaine.periodLabel}</p>
            </>
          ) : (
            <p className="text-xl font-semibold text-green-600 mt-1">À jour ✓</p>
          )}
        </div>
      </div>

      {/* ── History table ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Historique des déclarations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Période</th>
                <th className="px-4 py-2 text-center font-medium">Échéance</th>
                <th className="px-4 py-2 text-left font-medium">Référence</th>
                <th className="px-4 py-2 text-center font-medium">Statut</th>
                <th className="px-4 py-2 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {declarations.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{d.periodLabel}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{d.echeance}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {d.reference !== '' ? d.reference : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUT_COLOR[d.statut]}`}>
                      {STATUT_LABEL[d.statut]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setEditingId(d.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors">
                      {d.statut === 'DEPOSEE' ? '👁 Voir' : '✏️ Éditer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        * Plafond cotisable CNPS Cameroun : 750 000 FCFA/mois (vieillesse). AT/MP et AF calculés sur le salaire brut total non plafonné.
      </p>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showNew && (
        <NewDeclForm onClose={() => setShowNew(false)} onCreate={handleCreate} />
      )}
      {editingDecl && (
        <EditModal
          declaration={editingDecl}
          employees={activeEmployees}
          onSave={handleSave}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  )
}
