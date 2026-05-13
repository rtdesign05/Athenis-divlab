import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useTresorerie } from '@/contexts/TresorerieContext'
import { useEmployees } from '@/hooks/useHr'
import { pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import React from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Horizon = '6m' | '1y' | '3y' | '5y'
type Scenario = 'base' | 'optimiste' | 'pessimiste'
type RowType  = 'header' | 'subheader' | 'data' | 'subtotal' | 'total' | 'solde_net' | 'solde_debut' | 'solde_fin' | 'memo' | 'shield'
type Growth   = 'revenue' | 'variable' | 'fixed' | 'personnel' | 'fiscal_var' | 'fiscal_fix'

interface RowDef {
  id:           string
  label:        string
  type:         RowType
  baseMonthly?: number
  growth?:      Growth
  deps?:        string[]
  indent?:      number
}

// ── Hypothèses configurables ───────────────────────────────────────────────────

export interface HypothesesConfig {
  growth:   Record<Scenario, Record<Growth, number>>
  seasonal: number[]   // 12 coefficients (index 0 = Jan)
  tauxIS:   number
}

// ── Valeurs par défaut ─────────────────────────────────────────────────────────

const ANNUAL_GROWTH_DEFAULT: Record<Scenario, Record<Growth, number>> = {
  base: {
    revenue:    0.10,
    variable:   0.08,
    fixed:      0.04,
    personnel:  0.07,
    fiscal_var: 0.10,
    fiscal_fix: 0.03,
  },
  optimiste: {
    revenue:    0.20,
    variable:   0.15,
    fixed:      0.04,
    personnel:  0.08,
    fiscal_var: 0.20,
    fiscal_fix: 0.03,
  },
  pessimiste: {
    revenue:    0.03,
    variable:   0.03,
    fixed:      0.04,
    personnel:  0.06,
    fiscal_var: 0.03,
    fiscal_fix: 0.03,
  },
}

const SEASONAL_DEFAULT = [0.82, 0.87, 1.04, 1.00, 0.95, 0.89, 0.84, 0.78, 1.06, 1.12, 1.18, 1.28]

const DEFAULT_HYPOTHESES: HypothesesConfig = {
  growth:   ANNUAL_GROWTH_DEFAULT,
  seasonal: SEASONAL_DEFAULT,
  tauxIS:   0.30,
}

// ── Labels des types de croissance ────────────────────────────────────────────

const GROWTH_LABELS: Record<Growth, string> = {
  revenue:    "Chiffre d'affaires",
  variable:   'Charges variables',
  fixed:      'Charges fixes',
  personnel:  'Masse salariale',
  fiscal_var: 'Fiscal (proportionnel CA)',
  fiscal_fix: 'Fiscal (fixe)',
}

const GROWTH_ORDER: Growth[] = ['revenue', 'variable', 'fixed', 'personnel', 'fiscal_var', 'fiscal_fix']

const MONTHS_FR_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

// Fallback tréso initiale
const FALLBACK_BALANCE = 55_785_000

// ── Définition des lignes ─────────────────────────────────────────────────────

const ROWS: RowDef[] = [
  { id: 'h_enc',       label: 'ENCAISSEMENTS',                              type: 'header'   },
  { id: 'h_rec_exp',   label: "Recettes d'exploitation",                    type: 'subheader', indent: 1 },
  { id: 'r_ventes',    label: 'Ventes de marchandises',                     type: 'data',      indent: 2, baseMonthly:  15_000_000, growth: 'revenue'    },
  { id: 'r_presta',    label: 'Prestations de services',                    type: 'data',      indent: 2, baseMonthly:  10_500_000, growth: 'revenue'    },
  { id: 'r_avoirs',    label: 'Remises & avoirs accordés',                  type: 'data',      indent: 2, baseMonthly:    -800_000, growth: 'revenue'    },
  { id: 'st_rec',      label: "Sous-total recettes exploitation",           type: 'subtotal',  indent: 1, deps: ['r_ventes','r_presta','r_avoirs'] },
  { id: 'h_enc_aut',   label: 'Autres encaissements',                       type: 'subheader', indent: 1 },
  { id: 'r_subv',      label: 'Subventions & aides reçues',                 type: 'data',      indent: 2, baseMonthly:          0, growth: 'fixed'      },
  { id: 'r_fin',       label: 'Produits financiers',                        type: 'data',      indent: 2, baseMonthly:     142_000, growth: 'fixed'      },
  { id: 'r_aut',       label: 'Autres entrées exceptionnelles',             type: 'data',      indent: 2, baseMonthly:          0, growth: 'fixed'      },
  { id: 'st_enc_aut',  label: 'Sous-total autres enc.',                     type: 'subtotal',  indent: 1, deps: ['r_subv','r_fin','r_aut'] },
  { id: 'tot_enc',     label: 'TOTAL ENCAISSEMENTS',                        type: 'total',               deps: ['st_rec','st_enc_aut'] },

  { id: 'h_dec',       label: 'DÉCAISSEMENTS',                              type: 'header'   },
  { id: 'h_ach',       label: 'Achats & charges externes',                  type: 'subheader', indent: 1 },
  { id: 'd_achat',     label: 'Achats marchandises / matières',             type: 'data',      indent: 2, baseMonthly:  -8_500_000, growth: 'variable'   },
  { id: 'd_loyer',     label: 'Loyers & charges locatives',                 type: 'data',      indent: 2, baseMonthly:  -3_200_000, growth: 'fixed'      },
  { id: 'd_util',      label: 'Eau, électricité, télécom',                  type: 'data',      indent: 2, baseMonthly:    -580_000, growth: 'fixed'      },
  { id: 'd_assur',     label: 'Assurances',                                 type: 'data',      indent: 2, baseMonthly:    -320_000, growth: 'fixed'      },
  { id: 'd_saas',      label: 'Abonnements & outils SaaS',                  type: 'data',      indent: 2, baseMonthly:    -890_000, growth: 'fixed'      },
  { id: 'd_depla',     label: 'Frais de déplacement & missions',            type: 'data',      indent: 2, baseMonthly:    -450_000, growth: 'variable'   },
  { id: 'd_pub',       label: 'Publicité & communication',                  type: 'data',      indent: 2, baseMonthly:    -600_000, growth: 'variable'   },
  { id: 'd_divers',    label: 'Frais divers & imprévus',                    type: 'data',      indent: 2, baseMonthly:    -380_000, growth: 'variable'   },
  { id: 'st_ach',      label: 'Sous-total achats & charges',                type: 'subtotal',  indent: 1, deps: ['d_achat','d_loyer','d_util','d_assur','d_saas','d_depla','d_pub','d_divers'] },

  { id: 'h_rh',        label: 'Charges de personnel',                       type: 'subheader', indent: 1 },
  { id: 'd_salai',     label: 'Salaires nets versés',                        type: 'data',      indent: 2, baseMonthly:  -9_400_000, growth: 'personnel'  },
  { id: 'd_cnps',      label: 'Cotisations sociales (CNPS / CRTV)',         type: 'data',      indent: 2, baseMonthly:  -2_850_000, growth: 'personnel'  },
  { id: 'd_primes',    label: 'Primes, gratifications, avantages',          type: 'data',      indent: 2, baseMonthly:    -500_000, growth: 'personnel'  },
  { id: 'st_rh',       label: 'Sous-total personnel',                       type: 'subtotal',  indent: 1, deps: ['d_salai','d_cnps','d_primes'] },

  { id: 'h_fisc',      label: 'Charges fiscales',                           type: 'subheader', indent: 1 },
  { id: 'd_tva',       label: 'TVA décaissée (nette de collecte)',          type: 'data',      indent: 2, baseMonthly:  -1_200_000, growth: 'fiscal_var' },
  { id: 'd_is',        label: 'IS/IGS sur résultat (base brute)',           type: 'data',      indent: 2, baseMonthly:    -560_000, growth: 'fiscal_var' },
  { id: 'd_amort',     label: "Dotations aux amortissements (non déc.)",    type: 'memo',      indent: 2, baseMonthly:   1_200_000, growth: 'fixed'      },
  { id: 'd_is_shield', label: "↳ Réduction d'IS (amortissements × IS%)",   type: 'shield',    indent: 2 },
  { id: 'd_paten',     label: 'Patente, centimes additionnels',             type: 'data',      indent: 2, baseMonthly:    -100_000, growth: 'fiscal_fix' },
  { id: 'st_fisc',     label: 'Sous-total fiscal',                          type: 'subtotal',  indent: 1, deps: ['d_tva','d_is','d_is_shield','d_paten'] },

  { id: 'h_inv',       label: 'Investissements & financements',             type: 'subheader', indent: 1 },
  { id: 'd_capex',     label: "Acquisitions d'immobilisations",             type: 'data',      indent: 2, baseMonthly:          0, growth: 'fixed'      },
  { id: 'd_remb',      label: "Remboursements d'emprunts",                  type: 'data',      indent: 2, baseMonthly:  -1_500_000, growth: 'fixed'      },
  { id: 'd_interet',   label: 'Intérêts financiers',                        type: 'data',      indent: 2, baseMonthly:    -200_000, growth: 'fixed'      },
  { id: 'st_inv',      label: 'Sous-total invest. & fin.',                  type: 'subtotal',  indent: 1, deps: ['d_capex','d_remb','d_interet'] },

  { id: 'tot_dec',     label: 'TOTAL DÉCAISSEMENTS',                        type: 'total',               deps: ['st_ach','st_rh','st_fisc','st_inv'] },

  { id: 'h_solde',     label: 'SOLDE PRÉVISIONNEL',                         type: 'header'   },
  { id: 'sol_net',     label: 'Flux net de trésorerie',                     type: 'solde_net'  },
  { id: 'sol_deb',     label: 'Trésorerie en début de période',             type: 'solde_debut'},
  { id: 'sol_fin',     label: '💰 TRÉSORERIE DE FIN DE PÉRIODE',            type: 'solde_fin'  },
]

// ── Générateurs de colonnes ───────────────────────────────────────────────────

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function getColumns(horizon: Horizon): string[] {
  if (horizon === '6m') return MONTHS_FR.slice(4, 10).map(m => `${m} 26`)
  if (horizon === '1y') return MONTHS_FR.map(m => `${m} 26`)
  if (horizon === '3y') {
    const cols: string[] = []
    for (let y = 26; y <= 28; y++)
      for (let q = 1; q <= 4; q++) cols.push(`Q${q} 20${y}`)
    return cols
  }
  return ['2026','2027','2028','2029','2030']
}

// ── Fonctions de génération des valeurs ───────────────────────────────────────

function monthVal(base: number, monthIdx: number, yearOffset: number, annualRate: number, seasonal: number[]): number {
  const sf     = (Math.abs(base) > 0) ? (seasonal[monthIdx % 12] ?? 1) : 1
  const growth = Math.pow(1 + annualRate, yearOffset + monthIdx / 12)
  return Math.round(base * sf * growth)
}

function generateMatrix(horizon: Horizon, scenario: Scenario, hyp: HypothesesConfig): Record<string, number[]> {
  const rates    = hyp.growth[scenario]
  const colCount = getColumns(horizon).length
  const matrix: Record<string, number[]> = {}

  for (const row of ROWS) {
    if ((row.type !== 'data' && row.type !== 'memo') || row.baseMonthly === undefined || !row.growth) continue
    const rate = rates[row.growth]
    const vals: number[] = []

    for (let c = 0; c < colCount; c++) {
      if (horizon === '6m') {
        vals.push(monthVal(row.baseMonthly, c + 4, 0, rate, hyp.seasonal))
      } else if (horizon === '1y') {
        vals.push(monthVal(row.baseMonthly, c, 0, rate, hyp.seasonal))
      } else if (horizon === '3y') {
        const yearOffset = Math.floor(c / 4)
        const qtr        = c % 4
        const sum = [0,1,2].reduce((s, m) => s + monthVal(row.baseMonthly!, qtr * 3 + m, yearOffset, rate, hyp.seasonal), 0)
        vals.push(sum)
      } else {
        const sum = Array.from({ length: 12 }, (_, m) => monthVal(row.baseMonthly!, m, c, rate, hyp.seasonal)).reduce((s, v) => s + v, 0)
        vals.push(sum)
      }
    }
    matrix[row.id] = vals
  }
  return matrix
}

function resolveComputed(
  dataMatrix:     Record<string, number[]>,
  colCount:       number,
  initialBalance: number,
  tauxIS:         number,
): Record<string, number[]> {
  const m = { ...dataMatrix }

  m['d_is_shield'] = Array.from({ length: colCount }, (_, c) =>
    Math.round(Math.abs(m['d_amort']?.[c] ?? 0) * tauxIS),
  )

  for (const row of ROWS) {
    if (row.type === 'subtotal' || row.type === 'total') {
      const deps = row.deps ?? []
      m[row.id] = Array.from({ length: colCount }, (_, c) =>
        deps.reduce((s, dep) => s + (m[dep]?.[c] ?? 0), 0),
      )
    }
  }

  m['sol_net'] = Array.from({ length: colCount }, (_, c) =>
    (m['tot_enc']?.[c] ?? 0) + (m['tot_dec']?.[c] ?? 0),
  )

  const debut: number[] = []
  const fin:   number[] = []
  for (let c = 0; c < colCount; c++) {
    const d = c === 0 ? initialBalance : (fin[c - 1] ?? initialBalance)
    debut.push(d)
    fin.push(d + (m['sol_net']?.[c] ?? 0))
  }
  m['sol_deb'] = debut
  m['sol_fin'] = fin

  return m
}

// ── Cellule éditable ──────────────────────────────────────────────────────────

interface EditableCellProps {
  value:     number
  modified:  boolean
  onChange:  (v: number) => void
  fmt:       (v: number) => string
  positive?: boolean
}

function EditableCell({ value, modified, onChange, fmt, positive }: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw]         = useState('')
  const inputRef              = useRef<HTMLInputElement>(null)

  function startEdit() { setRaw(String(Math.round(value))); setEditing(true); setTimeout(() => inputRef.current?.select(), 0) }
  function commit() {
    const parsed = parseFloat(raw.replace(/\s/g, '').replace(',', '.'))
    if (!isNaN(parsed)) onChange(parsed)
    setEditing(false)
  }

  const isPos    = positive !== undefined ? positive : value >= 0
  const colorCls = isPos ? 'text-green-700' : 'text-red-600'

  if (editing) {
    return (
      <td className="py-1.5 px-2 text-right">
        <input ref={inputRef} value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          className="w-full rounded border border-blue-400 bg-blue-50 px-1.5 py-0.5 text-right text-xs font-mono focus:outline-none"
        />
      </td>
    )
  }
  return (
    <td onClick={startEdit} title="Cliquer pour modifier"
      className={`py-1.5 px-2 text-right text-xs tabular-nums cursor-pointer select-none hover:bg-blue-50 transition-colors ${colorCls} ${modified ? 'font-bold underline decoration-dotted' : 'font-medium'}`}>
      {fmt(value)}{modified && <span className="ml-0.5 text-[8px] text-blue-500">✎</span>}
    </td>
  )
}

// ── Modal Hypothèses ──────────────────────────────────────────────────────────

type HypTab = 'scenarios' | 'saisonnalite' | 'autres'

function pct(v: number) { return `${(v * 100).toFixed(1)}` }
function parsePct(s: string): number { return Math.max(0, Math.min(200, parseFloat(s.replace(',', '.')) || 0)) / 100 }

function HypothesesModal({
  open, onClose, value, onSave,
}: {
  open: boolean; onClose: () => void; value: HypothesesConfig; onSave: (h: HypothesesConfig) => void
}) {
  const [tab,   setTab]   = useState<HypTab>('scenarios')
  const [draft, setDraft] = useState<HypothesesConfig>(value)

  useEffect(() => { if (open) { setDraft(value); setTab('scenarios') } }, [open]) // eslint-disable-line

  function updateGrowth(scen: Scenario, g: Growth, raw: string) {
    const val = parsePct(raw)
    setDraft(prev => ({
      ...prev,
      growth: { ...prev.growth, [scen]: { ...prev.growth[scen], [g]: val } },
    }))
  }

  function updateSeasonal(i: number, raw: string) {
    const val = Math.max(0, Math.min(5, parseFloat(raw.replace(',', '.')) || 0))
    setDraft(prev => ({ ...prev, seasonal: prev.seasonal.map((s, idx) => idx === i ? val : s) }))
  }

  if (!open) return null

  const scenarioCols: { id: Scenario; label: string; color: string }[] = [
    { id: 'pessimiste', label: 'Pessimiste', color: 'text-red-600'   },
    { id: 'base',       label: 'Base',       color: 'text-blue-700'  },
    { id: 'optimiste',  label: 'Optimiste',  color: 'text-green-700' },
  ]

  const tabBtn = (t: HypTab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
        tab === t ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── En-tête ── */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">⚙ Configuration des hypothèses</h2>
            <p className="text-xs text-gray-400 mt-0.5">Paramètres utilisés pour la génération du tableau prévisionnel</p>
          </div>
          <button onClick={onClose} className="ml-4 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-lg leading-none">
            ✕
          </button>
        </div>

        {/* ── Onglets ── */}
        <div className="flex border-b border-gray-100 px-4 shrink-0 overflow-x-auto">
          {tabBtn('scenarios',    '📈 Taux de croissance')}
          {tabBtn('saisonnalite', '📅 Saisonnalité')}
          {tabBtn('autres',       '🔧 Autres paramètres')}
        </div>

        {/* ── Contenu ── */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Tab : Taux de croissance ── */}
          {tab === 'scenarios' && (
            <div>
              <p className="text-xs text-gray-500 mb-4">
                Définissez les taux de croissance annuels (en %) appliqués à chaque catégorie selon le scénario sélectionné.
              </p>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-2 px-3 text-left font-semibold text-gray-600 border border-gray-200">Catégorie</th>
                    {scenarioCols.map(s => (
                      <th key={s.id} className={`py-2 px-3 text-center font-bold border border-gray-200 ${s.color}`}>
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {GROWTH_ORDER.map((g, i) => (
                    <tr key={g} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="py-2 px-3 text-gray-700 border border-gray-200 font-medium">
                        {GROWTH_LABELS[g]}
                      </td>
                      {scenarioCols.map(s => (
                        <td key={s.id} className="py-1.5 px-2 border border-gray-200">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0" max="200" step="0.5"
                              value={pct(draft.growth[s.id][g])}
                              onChange={e => updateGrowth(s.id, g, e.target.value)}
                              className="w-16 rounded border border-gray-300 px-1.5 py-0.5 text-center text-xs focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-200"
                            />
                            <span className="text-gray-400 text-[10px]">%</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[11px] text-gray-400 italic">
                💡 Le taux de croissance du CA est aussi utilisé comme libellé dynamique sur les boutons de scénario.
              </p>
            </div>
          )}

          {/* ── Tab : Saisonnalité ── */}
          {tab === 'saisonnalite' && (
            <div>
              <p className="text-xs text-gray-500 mb-4">
                Coefficients multiplicatifs mensuels appliqués aux encaissements et décaissements variables.
                <strong className="text-gray-700"> 1.00 = mois normal</strong>, 1.28 = pic (+28%), 0.78 = creux (-22%).
              </p>
              <div className="grid grid-cols-3 gap-3">
                {MONTHS_FR_FULL.map((month, i) => {
                  const val = draft.seasonal[i] ?? 1
                  const barW = Math.round(Math.min(100, Math.max(0, (val - 0.5) / 1.0 * 100)))
                  const color = val >= 1.1 ? 'bg-green-500' : val <= 0.9 ? 'bg-amber-400' : 'bg-blue-400'
                  return (
                    <div key={i} className="rounded-lg border border-gray-200 p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">{month}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0.1" max="3" step="0.01"
                            value={val.toFixed(2)}
                            onChange={e => updateSeasonal(i, e.target.value)}
                            className="w-16 rounded border border-gray-300 px-1.5 py-0.5 text-center text-xs focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-200"
                          />
                        </div>
                      </div>
                      {/* Mini barre visuelle */}
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${barW}%` }} />
                      </div>
                      <p className={`text-[10px] mt-1 font-medium ${val >= 1 ? 'text-green-600' : 'text-amber-600'}`}>
                        {val >= 1 ? `+${((val - 1) * 100).toFixed(0)}%` : `${((val - 1) * 100).toFixed(0)}%`}
                      </p>
                    </div>
                  )
                })}
              </div>
              <button
                onClick={() => setDraft(prev => ({ ...prev, seasonal: [...SEASONAL_DEFAULT] }))}
                className="mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ↺ Remettre la saisonnalité par défaut
              </button>
            </div>
          )}

          {/* ── Tab : Autres paramètres ── */}
          {tab === 'autres' && (
            <div className="space-y-6">
              {/* Taux IS */}
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="text-xs font-bold text-gray-800 mb-1">🏛 Taux d'imposition (IS / IGS)</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Utilisé pour calculer le <strong>bouclier fiscal</strong> (réduction d'IS générée par les amortissements).
                  Taux IS Cameroun : 30%. Taux IGS (micro-entreprises) : 5,5%.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0" max="100" step="0.5"
                    value={(draft.tauxIS * 100).toFixed(1)}
                    onChange={e => {
                      const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) / 100
                      setDraft(prev => ({ ...prev, tauxIS: val }))
                    }}
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm font-bold focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                  />
                  <span className="text-sm text-gray-600 font-medium">%</span>
                  <span className="text-xs text-gray-400">
                    → Bouclier fiscal = |Amortissements| × {(draft.tauxIS * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Info sur les valeurs de base */}
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <h3 className="text-xs font-bold text-blue-800 mb-1">📝 Valeurs de base des lignes</h3>
                <p className="text-xs text-blue-700">
                  Les valeurs mensuelles de référence (ex : 15 M FCFA pour les ventes) sont modifiables
                  directement dans le tableau en cliquant sur les cellules. Elles sont mémorisées
                  jusqu'à la prochaine réinitialisation.
                </p>
              </div>

              {/* Rappel des valeurs actives */}
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="text-xs font-bold text-gray-800 mb-3">📊 Résumé des paramètres actifs</h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="flex gap-2">
                    <span className="text-gray-400">CA base :</span>
                    <span className="font-semibold text-blue-700">+{(draft.growth.base.revenue * 100).toFixed(1)}%/an</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400">CA optimiste :</span>
                    <span className="font-semibold text-green-700">+{(draft.growth.optimiste.revenue * 100).toFixed(1)}%/an</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400">CA pessimiste :</span>
                    <span className="font-semibold text-red-600">+{(draft.growth.pessimiste.revenue * 100).toFixed(1)}%/an</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400">Taux IS :</span>
                    <span className="font-semibold">{(draft.tauxIS * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400">Pic saisonnier :</span>
                    <span className="font-semibold text-green-700">+{((Math.max(...draft.seasonal) - 1) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400">Creux saisonnier :</span>
                    <span className="font-semibold text-amber-600">{((Math.min(...draft.seasonal) - 1) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Pied de modal ── */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => setDraft({ ...DEFAULT_HYPOTHESES, growth: JSON.parse(JSON.stringify(DEFAULT_HYPOTHESES.growth)), seasonal: [...DEFAULT_HYPOTHESES.seasonal] })}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
          >
            ↺ Tout réinitialiser
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => { onSave(draft); onClose() }}
              className="rounded-lg bg-green-700 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800 transition-colors flex items-center gap-1.5"
            >
              ✓ Appliquer les hypothèses
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Constantes UI ─────────────────────────────────────────────────────────────

const HORIZON_OPTS: { id: Horizon; label: string }[] = [
  { id: '6m', label: '6 mois' },
  { id: '1y', label: '1 an'   },
  { id: '3y', label: '3 ans'  },
  { id: '5y', label: '5 ans'  },
]

// ── Page principale ───────────────────────────────────────────────────────────

export function PrevisionsPage() {
  const { fmt }        = useCurrency()
  const { totalSolde } = useTresorerie()

  const employees      = useEmployees()
  const masseSalReelle = employees.data?.masseSalarialeMonth ?? 0
  const masseSalModele = 8_500_000
  const ecartSal       = masseSalReelle > 0 ? Math.abs(masseSalReelle - masseSalModele) / masseSalModele * 100 : 0

  const [horizon,   setHorizon]   = useState<Horizon>('1y')
  const [scenario,  setScenario]  = useState<Scenario>('base')
  const [overrides, setOverrides] = useState<Record<string, number>>({})

  // ── Hypothèses configurables ──────────────────────────────────────────────
  const [hypotheses,         setHypotheses]         = useState<HypothesesConfig>({
    growth:   JSON.parse(JSON.stringify(DEFAULT_HYPOTHESES.growth)),
    seasonal: [...DEFAULT_HYPOTHESES.seasonal],
    tauxIS:   DEFAULT_HYPOTHESES.tauxIS,
  })
  const [showHypModal, setShowHypModal] = useState(false)
  const hypothesesModified = JSON.stringify(hypotheses) !== JSON.stringify(DEFAULT_HYPOTHESES)

  // Libellés scénario dynamiques (reflètent les taux configurés)
  const scenarioOpts = useMemo(() => ([
    { id: 'pessimiste' as Scenario, label: `Pessimiste (+${(hypotheses.growth.pessimiste.revenue * 100).toFixed(0)}%/an)`, color: 'text-red-600 border-red-300'    },
    { id: 'base'       as Scenario, label: `Base (+${(hypotheses.growth.base.revenue * 100).toFixed(0)}%/an)`,             color: 'text-blue-700 border-blue-300'  },
    { id: 'optimiste'  as Scenario, label: `Optimiste (+${(hypotheses.growth.optimiste.revenue * 100).toFixed(0)}%/an)`,   color: 'text-green-700 border-green-300' },
  ]), [hypotheses])

  const columns  = useMemo(() => getColumns(horizon), [horizon])
  const colCount = columns.length

  const generated = useMemo(() => generateMatrix(horizon, scenario, hypotheses), [horizon, scenario, hypotheses])

  const dataMatrix = useMemo(() => {
    const m: Record<string, number[]> = {}
    for (const [rowId, vals] of Object.entries(generated)) {
      m[rowId] = vals.map((v, c) => overrides[`${rowId}:${c}`] ?? v)
    }
    return m
  }, [generated, overrides])

  const resolved = useMemo(
    () => resolveComputed(dataMatrix, colCount, totalSolde || FALLBACK_BALANCE, hypotheses.tauxIS),
    [dataMatrix, colCount, totalSolde, hypotheses.tauxIS],
  )

  function setOverride(rowId: string, colIdx: number, val: number) {
    setOverrides(prev => ({ ...prev, [`${rowId}:${colIdx}`]: val }))
  }
  function resetOverrides() { setOverrides({}) }

  const kpi = useMemo(() => {
    const sum = (id: string) => (resolved[id] ?? []).reduce((s, v) => s + v, 0)
    return {
      totalEnc:   sum('tot_enc'),
      totalDec:   sum('tot_dec'),
      fluxNet:    sum('sol_net'),
      tresoFin:   resolved['sol_fin']?.[colCount - 1] ?? totalSolde,
      tresoDebut: resolved['sol_deb']?.[0] ?? totalSolde,
    }
  }, [resolved, colCount, totalSolde])

  const hasOverrides = Object.keys(overrides).length > 0

  const getVal      = useCallback((rowId: string, c: number) => resolved[rowId]?.[c] ?? 0, [resolved])
  const wasModified = useCallback((rowId: string, c: number) => overrides[`${rowId}:${c}`] !== undefined, [overrides])

  // ── Export ────────────────────────────────────────────────────────────────
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting,      setExporting]      = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false)
    }
    if (showExportMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExportMenu])

  function buildExportRows() {
    return ROWS.map(row => {
      const values = columns.map((_, c) => getVal(row.id, c))
      const total: number | null = row.type === 'solde_debut' ? null
        : row.type !== 'header' && row.type !== 'subheader' ? values.reduce((s, v) => s + v, 0)
        : null
      return { id: row.id, label: row.label, type: row.type, ...(row.indent !== undefined ? { indent: row.indent } : {}), values, total }
    })
  }

  function exportCSV() {
    setShowExportMenu(false)
    const horizonLabel  = HORIZON_OPTS.find(h => h.id === horizon)?.label ?? horizon
    const scenarioLabel = scenarioOpts.find(s => s.id === scenario)?.label ?? scenario
    const header = ['"Libellé"', ...columns.map(c => `"${c}"`), '"TOTAL"']
    const lines: string[] = [`"Tableau prévisionnel de trésorerie — ${horizonLabel} — ${scenarioLabel}"`, '', header.join(';')]
    for (const row of buildExportRows()) {
      if (row.type === 'header' || row.type === 'subheader') { lines.push(`"${row.label}"` + ';'.repeat(columns.length + 1)); continue }
      const vals = row.values.map(v => String(Math.round(v)))
      const tot  = row.total !== null ? String(Math.round(row.total)) : ''
      lines.push([`"${row.label}"`, ...vals, tot].join(';'))
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `Previsions_${horizonLabel.replace(/\s/g,'')}_${scenario}_${new Date().toISOString().slice(0,10)}.csv`)
  }

  async function exportPDF() {
    setShowExportMenu(false); setExporting(true)
    try {
      const horizonLabel  = HORIZON_OPTS.find(h => h.id === horizon)?.label ?? horizon
      const scenarioLabel = scenarioOpts.find(s => s.id === scenario)?.label ?? scenario
      const { PrevisionsPdf } = await import('./PrevisionsPdf')
      const element = React.createElement(PrevisionsPdf, {
        horizonLabel, scenarioLabel, columns, rows: buildExportRows(),
        tresoFin: kpi.tresoFin,
        generatedAt: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      })
      const blob = await pdf(element as unknown as Parameters<typeof pdf>[0]).toBlob()
      saveAs(blob, `Previsions_${horizonLabel.replace(/\s/g,'')}_${scenario}_${new Date().toISOString().slice(0,10)}.pdf`)
    } catch (err) { console.error('Erreur export PDF :', err) }
    finally { setExporting(false) }
  }

  // ── Helpers de rendu ──────────────────────────────────────────────────────

  function renderDataRow(row: RowDef) {
    const pad = row.indent ? `pl-${row.indent * 4}` : ''
    return (
      <tr key={row.id} className="hover:bg-gray-50/60 group border-b border-gray-50">
        <td className={`sticky left-0 bg-white group-hover:bg-gray-50/60 py-1.5 pr-2 text-xs text-gray-700 max-w-[220px] truncate z-10 ${pad}`} title={row.label}>
          {row.label}
        </td>
        {columns.map((_, c) => (
          <EditableCell key={c} value={getVal(row.id, c)} modified={wasModified(row.id, c)} onChange={v => setOverride(row.id, c, v)} fmt={fmt} />
        ))}
        <td className={`py-1.5 px-2 text-right text-xs font-semibold tabular-nums border-l border-gray-200 ${columns.reduce((s,_,c) => s + getVal(row.id,c), 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
          {fmt(columns.reduce((s,_,c) => s + getVal(row.id,c), 0))}
        </td>
      </tr>
    )
  }

  function renderComputedRow(row: RowDef, cls: string, textCls?: (v: number) => string) {
    return (
      <tr key={row.id} className={`border-b border-gray-100 ${cls}`}>
        <td className={`sticky left-0 py-1.5 pr-2 text-xs font-semibold text-gray-700 z-10 ${cls} ${row.indent ? `pl-${row.indent * 4}` : ''}`}>{row.label}</td>
        {columns.map((_, c) => {
          const v  = getVal(row.id, c)
          const tc = textCls ? textCls(v) : (v >= 0 ? 'text-green-700' : 'text-red-600')
          return <td key={c} className={`py-1.5 px-2 text-right text-xs font-semibold tabular-nums ${tc}`}>{fmt(v)}</td>
        })}
        <td className={`py-1.5 px-2 text-right text-xs font-bold tabular-nums border-l border-gray-200 ${textCls ? textCls(columns.reduce((s,_,c)=>s+getVal(row.id,c),0)) : (columns.reduce((s,_,c)=>s+getVal(row.id,c),0)>=0?'text-green-700':'text-red-600')}`}>
          {fmt(columns.reduce((s,_,c)=>s+getVal(row.id,c),0))}
        </td>
      </tr>
    )
  }

  function renderSoldeRow(row: RowDef) {
    if (row.type === 'solde_fin') return (
      <tr key={row.id} className="bg-gray-900 border-t-2 border-gray-700">
        <td className="sticky left-0 bg-gray-900 py-2.5 pr-2 text-xs font-bold text-white z-10">{row.label}</td>
        {columns.map((_, c) => {
          const v = getVal(row.id, c)
          return <td key={c} className={`py-2.5 px-2 text-right text-sm font-bold tabular-nums ${v >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(v)}</td>
        })}
        <td className={`py-2.5 px-2 text-right text-sm font-bold tabular-nums border-l border-gray-700 ${kpi.tresoFin >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(kpi.tresoFin)}</td>
      </tr>
    )
    if (row.type === 'solde_net') return renderComputedRow(row, 'bg-slate-50', v => v >= 0 ? 'text-green-700 font-bold' : 'text-red-600 font-bold')
    if (row.type === 'solde_debut') return (
      <tr key={row.id} className="bg-slate-50 border-b border-gray-100">
        <td className="sticky left-0 bg-slate-50 py-1.5 pr-2 text-xs font-semibold text-gray-600 z-10">{row.label}</td>
        {columns.map((_, c) => (
          <td key={c} className="py-1.5 px-2 text-right text-xs font-semibold tabular-nums text-gray-600">{fmt(getVal(row.id, c))}</td>
        ))}
        <td className="py-1.5 px-2 text-right text-xs font-bold tabular-nums text-gray-600 border-l border-gray-200">—</td>
      </tr>
    )
    return null
  }

  function renderMemoRow(row: RowDef) {
    const pad   = row.indent ? `pl-${row.indent * 4}` : ''
    const total = columns.reduce((s,_,c) => s + getVal(row.id,c), 0)
    return (
      <tr key={row.id} className="border-b border-dashed border-amber-100 bg-amber-50/40 group">
        <td className={`sticky left-0 bg-amber-50/40 group-hover:bg-amber-50/70 py-1.5 pr-2 text-xs text-amber-700 italic max-w-[220px] truncate z-10 ${pad}`} title={`${row.label} — charge non décaissée (impact fiscal uniquement)`}>
          <span className="mr-1 text-[9px] not-italic bg-amber-100 text-amber-600 rounded px-1">non-cash</span>{row.label}
        </td>
        {columns.map((_, c) => (
          <EditableCell key={c} value={getVal(row.id,c)} modified={wasModified(row.id,c)} onChange={v => setOverride(row.id,c,v)} fmt={fmt} positive={true} />
        ))}
        <td className="py-1.5 px-2 text-right text-xs font-semibold tabular-nums border-l border-amber-200 text-amber-700">{fmt(total)}</td>
      </tr>
    )
  }

  function renderShieldRow(row: RowDef) {
    const pad   = row.indent ? `pl-${row.indent * 4}` : ''
    const total = columns.reduce((s,_,c) => s + getVal(row.id,c), 0)
    return (
      <tr key={row.id} className="border-b border-green-100 bg-green-50/50">
        <td className={`sticky left-0 bg-green-50/50 py-1.5 pr-2 text-xs font-medium text-green-700 max-w-[220px] truncate z-10 ${pad}`} title="Économie d'IS générée par les amortissements (bouclier fiscal)">
          {row.label}
        </td>
        {columns.map((_, c) => (
          <td key={c} className="py-1.5 px-2 text-right text-xs font-semibold tabular-nums text-green-700">+{fmt(getVal(row.id,c))}</td>
        ))}
        <td className="py-1.5 px-2 text-right text-xs font-bold tabular-nums border-l border-green-200 text-green-700">+{fmt(total)}</td>
      </tr>
    )
  }

  function renderRow(row: RowDef) {
    switch (row.type) {
      case 'header':    return <tr key={row.id} className="bg-gray-800"><td className="sticky left-0 bg-gray-800 py-2 pr-2 text-xs font-bold tracking-wider uppercase text-white z-10">{row.label}</td>{columns.map((_,c)=><td key={c}/>)}<td/></tr>
      case 'subheader': return <tr key={row.id} className="bg-gray-100"><td className="sticky left-0 bg-gray-100 py-1.5 pr-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 z-10 pl-4">{row.label}</td>{columns.map((_,c)=><td key={c}/>)}<td/></tr>
      case 'data':      return renderDataRow(row)
      case 'memo':      return renderMemoRow(row)
      case 'shield':    return renderShieldRow(row)
      case 'subtotal':  return renderComputedRow(row, 'bg-gray-50', v => v >= 0 ? 'text-gray-700' : 'text-red-600')
      case 'total':     return renderComputedRow(row, 'bg-gray-200 border-t-2 border-gray-300', v => v >= 0 ? 'text-gray-900' : 'text-red-700')
      case 'solde_net':
      case 'solde_debut':
      case 'solde_fin': return renderSoldeRow(row)
      default:          return null
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col gap-4">

      {/* ── Modal hypothèses ── */}
      <HypothesesModal
        open={showHypModal}
        onClose={() => setShowHypModal(false)}
        value={hypotheses}
        onSave={setHypotheses}
      />

      {/* ── Titre + actions ── */}
      <div className="shrink-0 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Tableau prévisionnel de trésorerie</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Données pré-remplies — cliquer sur une cellule pour la modifier
            {hasOverrides && <span className="ml-2 text-blue-600 font-medium">· {Object.keys(overrides).length} cellule(s) modifiée(s)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">

          {/* ── Bouton Hypothèses ── */}
          <button
            onClick={() => setShowHypModal(true)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
              hypothesesModified
                ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            ⚙ Hypothèses
            {hypothesesModified && <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />}
          </button>

          {hasOverrides && (
            <button onClick={resetOverrides} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
              ↺ Réinitialiser
            </button>
          )}

          {/* ── Bouton Exporter ── */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(v => !v)}
              disabled={exporting}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {exporting
                ? <><span className="h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent inline-block" /> Génération…</>
                : <><span>⬇</span> Exporter <span className="text-gray-400">▾</span></>
              }
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                <button onClick={exportCSV} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                  <span className="text-base">📊</span>
                  <span><span className="font-medium">Exporter CSV</span><span className="block text-gray-400 text-[10px]">Compatible Excel / Sheets</span></span>
                </button>
                <div className="border-t border-gray-100" />
                <button onClick={exportPDF} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                  <span className="text-base">📄</span>
                  <span><span className="font-medium">Exporter PDF</span><span className="block text-gray-400 text-[10px]">Format paysage A4</span></span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bannière RH ── */}
      {masseSalReelle > 0 && (
        <div className={`shrink-0 rounded-lg px-4 py-2.5 flex items-center justify-between text-xs border ${ecartSal > 20 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          <span>👥 <strong>RH — Masse salariale réelle :</strong> {fmt(masseSalReelle)}/mois{' '}<span className="text-gray-500">· Modèle : {fmt(masseSalModele)}</span></span>
          {ecartSal > 5 && <span className={`font-semibold ${ecartSal > 20 ? 'text-amber-700' : 'text-blue-700'}`}>Écart {ecartSal.toFixed(0)}% — ajustez les hypothèses si nécessaire</span>}
        </div>
      )}

      {/* ── Sélecteurs horizon + scénario ── */}
      <div className="shrink-0 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          {HORIZON_OPTS.map(h => (
            <button key={h.id} onClick={() => setHorizon(h.id)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${horizon === h.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {h.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Scénario :</span>
          {scenarioOpts.map(s => (
            <button key={s.id} onClick={() => setScenario(s.id)}
              className={`rounded-md border px-3 py-1 text-xs font-medium transition-all ${scenario === s.id ? `${s.color} bg-white shadow-sm` : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="shrink-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Total encaissements</p>
          <p className="mt-1 text-lg font-bold text-green-700 tabular-nums">{fmt(kpi.totalEnc)}</p>
          <p className="text-xs text-gray-400 mt-0.5">sur {HORIZON_OPTS.find(h=>h.id===horizon)?.label}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Total décaissements</p>
          <p className="mt-1 text-lg font-bold text-red-600 tabular-nums">{fmt(Math.abs(kpi.totalDec))}</p>
          <p className="text-xs text-gray-400 mt-0.5">sur {HORIZON_OPTS.find(h=>h.id===horizon)?.label}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Flux net cumulé</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${kpi.fluxNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {kpi.fluxNet >= 0 ? '+' : ''}{fmt(kpi.fluxNet)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">encaissements − décaissements</p>
        </div>
        <div className={`rounded-xl border p-3 ${kpi.tresoFin >= kpi.tresoDebut ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <p className="text-xs font-medium text-gray-500">Tréso fin de période</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${kpi.tresoFin >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(kpi.tresoFin)}</p>
          <p className={`text-xs mt-0.5 font-medium ${kpi.tresoFin >= kpi.tresoDebut ? 'text-green-600' : 'text-red-500'}`}>
            {kpi.tresoFin >= kpi.tresoDebut ? '▲' : '▼'} {fmt(Math.abs(kpi.tresoFin - kpi.tresoDebut))} vs aujourd'hui
          </p>
        </div>
      </div>

      {/* ── Tableau ── */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="shrink-0 flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-[11px] text-gray-400">
          <span>📝 Cellules <span className="font-semibold text-gray-600">blanches</span> : modifiables</span>
          <span>🔒 Cellules <span className="font-semibold text-gray-600">grises</span> : calculées automatiquement</span>
          <span>✎ : valeur modifiée manuellement</span>
          <span className="ml-auto text-gray-300">Entrée ou clic ailleurs pour valider</span>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="border-collapse" style={{ minWidth: `${200 + (colCount + 1) * 100}px` }}>
            <thead className="sticky top-0 z-20">
              <tr className="bg-gray-900 text-white">
                <th className="sticky left-0 bg-gray-900 py-2.5 px-2 text-left text-xs font-semibold min-w-[200px] z-30">Ligne de trésorerie</th>
                {columns.map(col => <th key={col} className="py-2.5 px-2 text-right text-xs font-semibold whitespace-nowrap min-w-[92px]">{col}</th>)}
                <th className="py-2.5 px-2 text-right text-xs font-semibold whitespace-nowrap min-w-[100px] border-l border-gray-700 bg-gray-800">TOTAL</th>
              </tr>
            </thead>
            <tbody>{ROWS.map(row => renderRow(row))}</tbody>
          </table>
        </div>
      </div>

      {/* ── Note méthodologique ── */}
      <div className="shrink-0 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        <p className="font-semibold mb-1">
          📌 Hypothèses actives
          {hypothesesModified && <span className="ml-2 text-[10px] font-normal rounded-full bg-green-100 text-green-700 px-2 py-0.5">personnalisées</span>}
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[11px] text-blue-600">
          <span>• Tréso initiale : {fmt(totalSolde || FALLBACK_BALANCE)} (soldes consolidés)</span>
          <span>• Croissance CA scénario de base : +{(hypotheses.growth.base.revenue * 100).toFixed(0)}%/an</span>
          <span>• Saisonnalité : pic {((Math.max(...hypotheses.seasonal) - 1) * 100).toFixed(0)}%, creux {((Math.min(...hypotheses.seasonal) - 1) * 100).toFixed(0)}%</span>
          <span>• Charges fixes : indexées +{(hypotheses.growth.base.fixed * 100).toFixed(0)}%/an (inflation)</span>
          <span>• Masse salariale : +{(hypotheses.growth.base.personnel * 100).toFixed(0)}%/an (revalorisation)</span>
          <span>• Taux IS appliqué : {(hypotheses.tauxIS * 100).toFixed(1)}% (bouclier fiscal)</span>
        </div>
        {hypothesesModified && (
          <button onClick={() => setHypotheses({ growth: JSON.parse(JSON.stringify(DEFAULT_HYPOTHESES.growth)), seasonal: [...DEFAULT_HYPOTHESES.seasonal], tauxIS: DEFAULT_HYPOTHESES.tauxIS })}
            className="mt-2 text-[11px] text-blue-500 hover:text-blue-700 transition-colors">
            ↺ Remettre les hypothèses par défaut
          </button>
        )}
      </div>
    </div>
  )
}
