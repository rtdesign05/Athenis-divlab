import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useTresorerie } from '@/contexts/TresorerieContext'
import { pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import React from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Horizon = '6m' | '1y' | '3y' | '5y'
type Scenario = 'base' | 'optimiste' | 'pessimiste'
type RowType  = 'header' | 'subheader' | 'data' | 'subtotal' | 'total' | 'solde_net' | 'solde_debut' | 'solde_fin' | 'memo' | 'shield'
type Growth   = 'revenue' | 'variable' | 'fixed' | 'personnel' | 'fiscal_var' | 'fiscal_fix'

interface RowDef {
  id:          string
  label:       string
  type:        RowType
  baseMonthly?: number   // valeur mensuelle de référence (mai 2026)
  growth?:     Growth    // type de croissance applicable
  deps?:       string[]  // identifiants des lignes à sommer (computed)
  indent?:     number    // niveau d'indentation
}

// ── Paramètres de croissance par scénario ─────────────────────────────────────

const ANNUAL_GROWTH: Record<Scenario, Record<Growth, number>> = {
  base: {
    revenue:     0.10,   // +10%/an
    variable:    0.08,   // charges variables: croissent moins vite
    fixed:       0.04,   // charges fixes: indexation inflation
    personnel:   0.07,   // masse salariale: +7%/an
    fiscal_var:  0.10,   // proportionnel au CA
    fiscal_fix:  0.03,
  },
  optimiste: {
    revenue:     0.20,
    variable:    0.15,
    fixed:       0.04,
    personnel:   0.08,
    fiscal_var:  0.20,
    fiscal_fix:  0.03,
  },
  pessimiste: {
    revenue:     0.03,
    variable:    0.03,
    fixed:       0.04,
    personnel:   0.06,
    fiscal_var:  0.03,
    fiscal_fix:  0.03,
  },
}

// Facteurs saisonniers par mois (0 = Janv, 11 = Déc)
const SEASONAL = [0.82, 0.87, 1.04, 1.00, 0.95, 0.89, 0.84, 0.78, 1.06, 1.12, 1.18, 1.28]

// Trésorerie initiale — valeur de secours (remplacée dynamiquement dans le composant)
const FALLBACK_BALANCE = 55_785_000

// Taux IS Cameroun (Impôt sur les Sociétés)
const TAUX_IS = 0.30

// ── Définition des lignes ─────────────────────────────────────────────────────

const ROWS: RowDef[] = [
  // ════ ENCAISSEMENTS ═══════════════════════════════════════════════════════
  { id: 'h_enc',      label: 'ENCAISSEMENTS',                        type: 'header'   },
  { id: 'h_rec_exp',  label: 'Recettes d\'exploitation',             type: 'subheader', indent: 1 },
  { id: 'r_ventes',   label: 'Ventes de marchandises',               type: 'data',      indent: 2, baseMonthly:  15_000_000, growth: 'revenue'    },
  { id: 'r_presta',   label: 'Prestations de services',              type: 'data',      indent: 2, baseMonthly:  10_500_000, growth: 'revenue'    },
  { id: 'r_avoirs',   label: 'Remises & avoirs accordés',            type: 'data',      indent: 2, baseMonthly:    -800_000, growth: 'revenue'    },
  { id: 'st_rec',     label: 'Sous-total recettes exploitation',     type: 'subtotal',  indent: 1, deps: ['r_ventes','r_presta','r_avoirs'] },
  { id: 'h_enc_aut',  label: 'Autres encaissements',                 type: 'subheader', indent: 1 },
  { id: 'r_subv',     label: 'Subventions & aides reçues',           type: 'data',      indent: 2, baseMonthly:          0, growth: 'fixed'      },
  { id: 'r_fin',      label: 'Produits financiers',                  type: 'data',      indent: 2, baseMonthly:     142_000, growth: 'fixed'      },
  { id: 'r_aut',      label: 'Autres entrées exceptionnelles',       type: 'data',      indent: 2, baseMonthly:          0, growth: 'fixed'      },
  { id: 'st_enc_aut', label: 'Sous-total autres enc.',               type: 'subtotal',  indent: 1, deps: ['r_subv','r_fin','r_aut'] },
  { id: 'tot_enc',    label: 'TOTAL ENCAISSEMENTS',                  type: 'total',               deps: ['st_rec','st_enc_aut'] },

  // ════ DÉCAISSEMENTS ═══════════════════════════════════════════════════════
  { id: 'h_dec',      label: 'DÉCAISSEMENTS',                        type: 'header'   },
  { id: 'h_ach',      label: 'Achats & charges externes',            type: 'subheader', indent: 1 },
  { id: 'd_achat',    label: 'Achats marchandises / matières',       type: 'data',      indent: 2, baseMonthly:  -8_500_000, growth: 'variable'   },
  { id: 'd_loyer',    label: 'Loyers & charges locatives',           type: 'data',      indent: 2, baseMonthly:  -3_200_000, growth: 'fixed'      },
  { id: 'd_util',     label: 'Eau, électricité, télécom',            type: 'data',      indent: 2, baseMonthly:    -580_000, growth: 'fixed'      },
  { id: 'd_assur',    label: 'Assurances',                           type: 'data',      indent: 2, baseMonthly:    -320_000, growth: 'fixed'      },
  { id: 'd_saas',     label: 'Abonnements & outils SaaS',            type: 'data',      indent: 2, baseMonthly:    -890_000, growth: 'fixed'      },
  { id: 'd_depla',    label: 'Frais de déplacement & missions',      type: 'data',      indent: 2, baseMonthly:    -450_000, growth: 'variable'   },
  { id: 'd_pub',      label: 'Publicité & communication',            type: 'data',      indent: 2, baseMonthly:    -600_000, growth: 'variable'   },
  { id: 'd_divers',   label: 'Frais divers & imprévus',              type: 'data',      indent: 2, baseMonthly:    -380_000, growth: 'variable'   },
  { id: 'st_ach',     label: 'Sous-total achats & charges',          type: 'subtotal',  indent: 1, deps: ['d_achat','d_loyer','d_util','d_assur','d_saas','d_depla','d_pub','d_divers'] },

  { id: 'h_rh',       label: 'Charges de personnel',                 type: 'subheader', indent: 1 },
  { id: 'd_salai',    label: 'Salaires nets versés',                  type: 'data',      indent: 2, baseMonthly:  -9_400_000, growth: 'personnel'  },
  { id: 'd_cnps',     label: 'Cotisations sociales (CNPS / CRTV)',   type: 'data',      indent: 2, baseMonthly:  -2_850_000, growth: 'personnel'  },
  { id: 'd_primes',   label: 'Primes, gratifications, avantages',    type: 'data',      indent: 2, baseMonthly:    -500_000, growth: 'personnel'  },
  { id: 'st_rh',      label: 'Sous-total personnel',                 type: 'subtotal',  indent: 1, deps: ['d_salai','d_cnps','d_primes'] },

  { id: 'h_fisc',     label: 'Charges fiscales',                          type: 'subheader', indent: 1 },
  { id: 'd_tva',      label: 'TVA décaissée (nette de collecte)',         type: 'data',      indent: 2, baseMonthly:  -1_200_000, growth: 'fiscal_var' },
  { id: 'd_is',       label: 'IS/IGS sur résultat (base brute)',          type: 'data',      indent: 2, baseMonthly:    -560_000, growth: 'fiscal_var' },
  { id: 'd_amort',    label: 'Dotations aux amortissements (non déc.)',   type: 'memo',      indent: 2, baseMonthly:   1_200_000, growth: 'fixed'      },
  { id: 'd_is_shield',label: '↳ Réduction d\'IS (amortissements × 30%)', type: 'shield',    indent: 2 },
  { id: 'd_paten',    label: 'Patente, centimes additionnels',            type: 'data',      indent: 2, baseMonthly:    -100_000, growth: 'fiscal_fix' },
  { id: 'st_fisc',    label: 'Sous-total fiscal',                         type: 'subtotal',  indent: 1, deps: ['d_tva','d_is','d_is_shield','d_paten'] },

  { id: 'h_inv',      label: 'Investissements & financements',       type: 'subheader', indent: 1 },
  { id: 'd_capex',    label: 'Acquisitions d\'immobilisations',      type: 'data',      indent: 2, baseMonthly:          0, growth: 'fixed'      },
  { id: 'd_remb',     label: 'Remboursements d\'emprunts',           type: 'data',      indent: 2, baseMonthly:  -1_500_000, growth: 'fixed'      },
  { id: 'd_interet',  label: 'Intérêts financiers',                  type: 'data',      indent: 2, baseMonthly:    -200_000, growth: 'fixed'      },
  { id: 'st_inv',     label: 'Sous-total invest. & fin.',            type: 'subtotal',  indent: 1, deps: ['d_capex','d_remb','d_interet'] },

  { id: 'tot_dec',    label: 'TOTAL DÉCAISSEMENTS',                  type: 'total',               deps: ['st_ach','st_rh','st_fisc','st_inv'] },

  // ════ SOLDE ═══════════════════════════════════════════════════════════════
  { id: 'h_solde',    label: 'SOLDE PRÉVISIONNEL',                   type: 'header'   },
  { id: 'sol_net',    label: 'Flux net de trésorerie',               type: 'solde_net'  },
  { id: 'sol_deb',    label: 'Trésorerie en début de période',       type: 'solde_debut'},
  { id: 'sol_fin',    label: '💰 TRÉSORERIE DE FIN DE PÉRIODE',      type: 'solde_fin'  },
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
  // 5y
  return ['2026','2027','2028','2029','2030']
}

// ── Fonctions de génération des valeurs ───────────────────────────────────────

/** Valeur mensuelle avec croissance et saisonnalité */
function monthVal(base: number, monthIdx: number, yearOffset: number, annualRate: number): number {
  const seasonal = (Math.abs(base) > 0 && base !== 0) ? (SEASONAL[monthIdx % 12] ?? 1) : 1
  const growth   = Math.pow(1 + annualRate, yearOffset + monthIdx / 12)
  return Math.round(base * seasonal * growth)
}

/** Génère la matrice de valeurs initiales [rowId → number[]] */
function generateMatrix(horizon: Horizon, scenario: Scenario): Record<string, number[]> {
  const rates = ANNUAL_GROWTH[scenario]
  const colCount = getColumns(horizon).length

  const matrix: Record<string, number[]> = {}

  for (const row of ROWS) {
    // Génère les valeurs pour les lignes data ET memo (charges non-décaissées)
    if ((row.type !== 'data' && row.type !== 'memo') || row.baseMonthly === undefined || !row.growth) continue
    const rate = rates[row.growth]
    const vals: number[] = []

    for (let c = 0; c < colCount; c++) {
      if (horizon === '6m') {
        // Cols 0-5 = mai-oct 2026 (month index 4-9)
        vals.push(monthVal(row.baseMonthly, c + 4, 0, rate))
      } else if (horizon === '1y') {
        // Cols 0-11 = jan-déc 2026
        vals.push(monthVal(row.baseMonthly, c, 0, rate))
      } else if (horizon === '3y') {
        // Cols 0-11 = Q1-26 à Q4-28 (3 mois agrégés)
        const yearOffset = Math.floor(c / 4)
        const qtr        = c % 4
        const sum = [0,1,2].reduce((s, m) => s + monthVal(row.baseMonthly!, qtr * 3 + m, yearOffset, rate), 0)
        vals.push(sum)
      } else {
        // Cols 0-4 = 2026-2030 (12 mois agrégés)
        const sum = Array.from({ length: 12 }, (_, m) => monthVal(row.baseMonthly!, m, c, rate)).reduce((s, v) => s + v, 0)
        vals.push(sum)
      }
    }
    matrix[row.id] = vals
  }
  return matrix
}

/** Résout les lignes calculées depuis une matrice de données */
function resolveComputed(
  dataMatrix:     Record<string, number[]>,
  colCount:       number,
  initialBalance: number = FALLBACK_BALANCE,
): Record<string, number[]> {
  const m = { ...dataMatrix }

  // Réduction d'IS via amortissements : bouclier fiscal = |dotations| × TAUX_IS
  // (valeur positive = économie sur IS, réduit le décaissement fiscal net)
  m['d_is_shield'] = Array.from({ length: colCount }, (_, c) =>
    Math.round(Math.abs(m['d_amort']?.[c] ?? 0) * TAUX_IS),
  )

  // Subtotals & totals
  for (const row of ROWS) {
    if (row.type === 'subtotal' || row.type === 'total') {
      const deps = row.deps ?? []
      m[row.id] = Array.from({ length: colCount }, (_, c) =>
        deps.reduce((s, dep) => s + (m[dep]?.[c] ?? 0), 0),
      )
    }
  }

  // Flux net = enc + dec (dec already negative)
  m['sol_net'] = Array.from({ length: colCount }, (_, c) =>
    (m['tot_enc']?.[c] ?? 0) + (m['tot_dec']?.[c] ?? 0),
  )

  // Tréso début + fin (cumul)
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
  positive?: boolean  // force color
}

function EditableCell({ value, modified, onChange, fmt, positive }: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw]         = useState('')
  const inputRef              = useRef<HTMLInputElement>(null)

  function startEdit() {
    setRaw(String(Math.round(value)))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commit() {
    const parsed = parseFloat(raw.replace(/\s/g, '').replace(',', '.'))
    if (!isNaN(parsed)) onChange(parsed)
    setEditing(false)
  }

  const isPos = positive !== undefined ? positive : value >= 0
  const colorCls = isPos ? 'text-green-700' : 'text-red-600'

  if (editing) {
    return (
      <td className="py-1.5 px-2 text-right">
        <input
          ref={inputRef}
          value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          className="w-full rounded border border-blue-400 bg-blue-50 px-1.5 py-0.5 text-right text-xs font-mono focus:outline-none"
        />
      </td>
    )
  }

  return (
    <td
      onClick={startEdit}
      title="Cliquer pour modifier"
      className={`py-1.5 px-2 text-right text-xs tabular-nums cursor-pointer select-none hover:bg-blue-50 transition-colors ${colorCls} ${modified ? 'font-bold underline decoration-dotted' : 'font-medium'}`}
    >
      {fmt(value)}
      {modified && <span className="ml-0.5 text-[8px] text-blue-500">✎</span>}
    </td>
  )
}

// ── Constantes de labels (niveau module pour les export functions) ────────────

const HORIZON_OPTS: { id: Horizon; label: string }[] = [
  { id: '6m', label: '6 mois' },
  { id: '1y', label: '1 an'   },
  { id: '3y', label: '3 ans'  },
  { id: '5y', label: '5 ans'  },
]

const SCENARIO_OPTS: { id: Scenario; label: string; color: string }[] = [
  { id: 'pessimiste', label: 'Pessimiste (+3%/an)',  color: 'text-red-600 border-red-300'    },
  { id: 'base',       label: 'Base (+10%/an)',        color: 'text-blue-700 border-blue-300'  },
  { id: 'optimiste',  label: 'Optimiste (+20%/an)',  color: 'text-green-700 border-green-300' },
]

// ── Page principale ───────────────────────────────────────────────────────────

export function PrevisionsPage() {
  const { fmt }        = useCurrency()
  const { totalSolde } = useTresorerie()

  const [horizon,   setHorizon]   = useState<Horizon>('1y')
  const [scenario,  setScenario]  = useState<Scenario>('base')
  const [overrides, setOverrides] = useState<Record<string, number>>({})

  const columns  = useMemo(() => getColumns(horizon), [horizon])
  const colCount = columns.length

  // Matrice générée
  const generated = useMemo(() => generateMatrix(horizon, scenario), [horizon, scenario])

  // Matrice avec overrides appliqués
  const dataMatrix = useMemo(() => {
    const m: Record<string, number[]> = {}
    for (const [rowId, vals] of Object.entries(generated)) {
      m[rowId] = vals.map((v, c) => overrides[`${rowId}:${c}`] ?? v)
    }
    return m
  }, [generated, overrides])

  // Toutes les valeurs résolues (computed incluses) — solde initial depuis TresorerieContext
  const resolved = useMemo(
    () => resolveComputed(dataMatrix, colCount, totalSolde),
    [dataMatrix, colCount, totalSolde],
  )

  function setOverride(rowId: string, colIdx: number, val: number) {
    setOverrides(prev => ({ ...prev, [`${rowId}:${colIdx}`]: val }))
  }

  function resetOverrides() {
    setOverrides({})
  }

  // KPI : agréger sur toute la période
  const kpi = useMemo(() => {
    const sum = (id: string) => (resolved[id] ?? []).reduce((s, v) => s + v, 0)
    return {
      totalEnc:    sum('tot_enc'),
      totalDec:    sum('tot_dec'),
      fluxNet:     sum('sol_net'),
      tresoFin:    resolved['sol_fin']?.[colCount - 1] ?? totalSolde,
      tresoDebut:  resolved['sol_deb']?.[0] ?? totalSolde,
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
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    if (showExportMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExportMenu])

  /** Construit le tableau de lignes pour le PDF / CSV */
  function buildExportRows() {
    return ROWS.map(row => {
      const values = columns.map((_, c) => getVal(row.id, c))
      let total: number | null = null
      if (row.type === 'solde_debut') {
        total = null
      } else if (row.type !== 'header' && row.type !== 'subheader') {
        total = values.reduce((s, v) => s + v, 0)
      }
      return {
        id:    row.id,
        label: row.label,
        type:  row.type,
        ...(row.indent !== undefined ? { indent: row.indent } : {}),
        values,
        total,
      }
    })
  }

  /** Export CSV — téléchargement direct dans le navigateur */
  function exportCSV() {
    setShowExportMenu(false)
    const horizonLabel = HORIZON_OPTS.find(h => h.id === horizon)?.label ?? horizon
    const scenarioLabel = SCENARIO_OPTS.find(s => s.id === scenario)?.label ?? scenario

    // En-têtes
    const header = ['"Libellé"', ...columns.map(c => `"${c}"`), '"TOTAL"']
    const lines: string[] = [
      `"Tableau prévisionnel de trésorerie — ${horizonLabel} — ${scenarioLabel}"`,
      '',
      header.join(';'),
    ]

    for (const row of buildExportRows()) {
      if (row.type === 'header' || row.type === 'subheader') {
        lines.push(`"${row.label}"` + ';'.repeat(columns.length + 1))
        continue
      }
      const vals = row.values.map(v => String(Math.round(v)))
      const tot  = row.total !== null ? String(Math.round(row.total)) : ''
      lines.push([`"${row.label}"`, ...vals, tot].join(';'))
    }

    const csv  = lines.join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const horizonSlug = horizonLabel.replace(/\s/g, '')
    saveAs(blob, `Previsions_${horizonSlug}_${scenario}_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  /** Export PDF via @react-pdf/renderer */
  async function exportPDF() {
    setShowExportMenu(false)
    setExporting(true)
    try {
      const horizonLabel  = HORIZON_OPTS.find(h => h.id === horizon)?.label ?? horizon
      const scenarioLabel = SCENARIO_OPTS.find(s => s.id === scenario)?.label ?? scenario
      const { PrevisionsPdf } = await import('./PrevisionsPdf')

      const element = React.createElement(PrevisionsPdf, {
        horizonLabel,
        scenarioLabel,
        columns,
        rows:         buildExportRows(),
        tresoFin:     kpi.tresoFin,
        generatedAt:  new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      })

      const blob = await pdf(element as unknown as Parameters<typeof pdf>[0]).toBlob()
      const horizonSlug = horizonLabel.replace(/\s/g, '')
      saveAs(blob, `Previsions_${horizonSlug}_${scenario}_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('Erreur export PDF :', err)
    } finally {
      setExporting(false)
    }
  }

  // ── Rendering helpers ────────────────────────────────────────────────────

  function renderDataRow(row: RowDef) {
    const pad = row.indent ? `pl-${(row.indent) * 4}` : ''
    return (
      <tr key={row.id} className="hover:bg-gray-50/60 group border-b border-gray-50">
        <td className={`sticky left-0 bg-white group-hover:bg-gray-50/60 py-1.5 pr-2 text-xs text-gray-700 max-w-[220px] truncate z-10 ${pad}`}
            title={row.label}>
          {row.label}
        </td>
        {columns.map((_, c) => (
          <EditableCell
            key={c}
            value={getVal(row.id, c)}
            modified={wasModified(row.id, c)}
            onChange={v => setOverride(row.id, c, v)}
            fmt={fmt}
          />
        ))}
        <td className={`py-1.5 px-2 text-right text-xs font-semibold tabular-nums border-l border-gray-200
          ${columns.reduce((s, _, c) => s + getVal(row.id, c), 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
          {fmt(columns.reduce((s, _, c) => s + getVal(row.id, c), 0))}
        </td>
      </tr>
    )
  }

  function renderComputedRow(row: RowDef, cls: string, textCls?: (v: number) => string) {
    return (
      <tr key={row.id} className={`border-b border-gray-100 ${cls}`}>
        <td className={`sticky left-0 py-1.5 pr-2 text-xs font-semibold text-gray-700 z-10 ${cls} ${row.indent ? `pl-${row.indent * 4}` : ''}`}>
          {row.label}
        </td>
        {columns.map((_, c) => {
          const v = getVal(row.id, c)
          const tc = textCls ? textCls(v) : (v >= 0 ? 'text-green-700' : 'text-red-600')
          return (
            <td key={c} className={`py-1.5 px-2 text-right text-xs font-semibold tabular-nums ${tc}`}>
              {fmt(v)}
            </td>
          )
        })}
        <td className={`py-1.5 px-2 text-right text-xs font-bold tabular-nums border-l border-gray-200
          ${textCls ? textCls(columns.reduce((s,_,c)=>s+getVal(row.id,c),0)) : (columns.reduce((s,_,c)=>s+getVal(row.id,c),0)>=0?'text-green-700':'text-red-600')}`}>
          {fmt(columns.reduce((s,_,c)=>s+getVal(row.id,c),0))}
        </td>
      </tr>
    )
  }

  function renderSoldeRow(row: RowDef) {
    if (row.type === 'solde_fin') {
      return (
        <tr key={row.id} className="bg-gray-900 border-t-2 border-gray-700">
          <td className="sticky left-0 bg-gray-900 py-2.5 pr-2 text-xs font-bold text-white z-10">
            {row.label}
          </td>
          {columns.map((_, c) => {
            const v = getVal(row.id, c)
            return (
              <td key={c} className={`py-2.5 px-2 text-right text-sm font-bold tabular-nums ${v >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmt(v)}
              </td>
            )
          })}
          <td className={`py-2.5 px-2 text-right text-sm font-bold tabular-nums border-l border-gray-700 ${kpi.tresoFin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmt(kpi.tresoFin)}
          </td>
        </tr>
      )
    }
    if (row.type === 'solde_net') {
      return renderComputedRow(row, 'bg-slate-50', v => v >= 0 ? 'text-green-700 font-bold' : 'text-red-600 font-bold')
    }
    if (row.type === 'solde_debut') {
      return (
        <tr key={row.id} className="bg-slate-50 border-b border-gray-100">
          <td className="sticky left-0 bg-slate-50 py-1.5 pr-2 text-xs font-semibold text-gray-600 z-10">{row.label}</td>
          {columns.map((_, c) => (
            <td key={c} className="py-1.5 px-2 text-right text-xs font-semibold tabular-nums text-gray-600">
              {fmt(getVal(row.id, c))}
            </td>
          ))}
          <td className="py-1.5 px-2 text-right text-xs font-bold tabular-nums text-gray-600 border-l border-gray-200">
            —
          </td>
        </tr>
      )
    }
    return null
  }

  function renderRow(row: RowDef) {
    switch (row.type) {
      case 'header':
        return (
          <tr key={row.id} className="bg-gray-800">
            <td className="sticky left-0 bg-gray-800 py-2 pr-2 text-xs font-bold tracking-wider uppercase text-white z-10">
              {row.label}
            </td>
            {columns.map((_, c) => <td key={c} />)}
            <td />
          </tr>
        )
      case 'subheader':
        return (
          <tr key={row.id} className="bg-gray-100">
            <td className="sticky left-0 bg-gray-100 py-1.5 pr-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 z-10 pl-4">
              {row.label}
            </td>
            {columns.map((_, c) => <td key={c} />)}
            <td />
          </tr>
        )
      case 'data':
        return renderDataRow(row)
      case 'memo':
        return renderMemoRow(row)
      case 'shield':
        return renderShieldRow(row)
      case 'subtotal':
        return renderComputedRow(row, 'bg-gray-50', v => v >= 0 ? 'text-gray-700' : 'text-red-600')
      case 'total':
        return renderComputedRow(row, 'bg-gray-200 border-t-2 border-gray-300', v => v >= 0 ? 'text-gray-900' : 'text-red-700')
      case 'solde_net':
      case 'solde_debut':
      case 'solde_fin':
        return renderSoldeRow(row)
      default:
        return null
    }
  }

  /** Ligne memo : charge non décaissée (amortissement) — éditable, style distinctif */
  function renderMemoRow(row: RowDef) {
    const pad = row.indent ? `pl-${row.indent * 4}` : ''
    const total = columns.reduce((s, _, c) => s + getVal(row.id, c), 0)
    return (
      <tr key={row.id} className="border-b border-dashed border-amber-100 bg-amber-50/40 group">
        <td className={`sticky left-0 bg-amber-50/40 group-hover:bg-amber-50/70 py-1.5 pr-2 text-xs text-amber-700 italic max-w-[220px] truncate z-10 ${pad}`}
            title={`${row.label} — charge non décaissée (impact fiscal uniquement)`}>
          <span className="mr-1 text-[9px] not-italic bg-amber-100 text-amber-600 rounded px-1">non-cash</span>
          {row.label}
        </td>
        {columns.map((_, c) => (
          <EditableCell
            key={c}
            value={getVal(row.id, c)}
            modified={wasModified(row.id, c)}
            onChange={v => setOverride(row.id, c, v)}
            fmt={fmt}
            positive={true}
          />
        ))}
        <td className="py-1.5 px-2 text-right text-xs font-semibold tabular-nums border-l border-amber-200 text-amber-700">
          {fmt(total)}
        </td>
      </tr>
    )
  }

  /** Ligne shield : bouclier fiscal IS auto-calculé — non éditable */
  function renderShieldRow(row: RowDef) {
    const pad = row.indent ? `pl-${row.indent * 4}` : ''
    const total = columns.reduce((s, _, c) => s + getVal(row.id, c), 0)
    return (
      <tr key={row.id} className="border-b border-green-100 bg-green-50/50">
        <td className={`sticky left-0 bg-green-50/50 py-1.5 pr-2 text-xs font-medium text-green-700 max-w-[220px] truncate z-10 ${pad}`}
            title="Économie d'IS générée par les amortissements (bouclier fiscal)">
          {row.label}
        </td>
        {columns.map((_, c) => {
          const v = getVal(row.id, c)
          return (
            <td key={c} className="py-1.5 px-2 text-right text-xs font-semibold tabular-nums text-green-700">
              +{fmt(v)}
            </td>
          )
        })}
        <td className="py-1.5 px-2 text-right text-xs font-bold tabular-nums border-l border-green-200 text-green-700">
          +{fmt(total)}
        </td>
      </tr>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col gap-4">

      {/* ── Titre ── */}
      <div className="shrink-0 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Tableau prévisionnel de trésorerie</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Données pré-remplies — cliquer sur une cellule pour la modifier
            {hasOverrides && <span className="ml-2 text-blue-600 font-medium">· {Object.keys(overrides).length} cellule(s) modifiée(s)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasOverrides && (
            <button
              onClick={resetOverrides}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
            >
              ↺ Réinitialiser
            </button>
          )}
          {/* ── Bouton Exporter avec menu déroulant ── */}
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
                <button
                  onClick={exportCSV}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-base">📊</span>
                  <span>
                    <span className="font-medium">Exporter CSV</span>
                    <span className="block text-gray-400 text-[10px]">Compatible Excel / Sheets</span>
                  </span>
                </button>
                <div className="border-t border-gray-100" />
                <button
                  onClick={exportPDF}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-base">📄</span>
                  <span>
                    <span className="font-medium">Exporter PDF</span>
                    <span className="block text-gray-400 text-[10px]">Format paysage A4</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sélecteurs horizon + scénario ── */}
      <div className="shrink-0 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          {HORIZON_OPTS.map(h => (
            <button
              key={h.id}
              onClick={() => setHorizon(h.id)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                horizon === h.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Scénario :</span>
          {SCENARIO_OPTS.map(s => (
            <button
              key={s.id}
              onClick={() => setScenario(s.id)}
              className={`rounded-md border px-3 py-1 text-xs font-medium transition-all ${
                scenario === s.id
                  ? `${s.color} bg-white shadow-sm`
                  : 'border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
            >
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
          <p className={`mt-1 text-lg font-bold tabular-nums ${kpi.tresoFin >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {fmt(kpi.tresoFin)}
          </p>
          <p className={`text-xs mt-0.5 font-medium ${kpi.tresoFin >= kpi.tresoDebut ? 'text-green-600' : 'text-red-500'}`}>
            {kpi.tresoFin >= kpi.tresoDebut ? '▲' : '▼'} {fmt(Math.abs(kpi.tresoFin - kpi.tresoDebut))} vs aujourd'hui
          </p>
        </div>
      </div>

      {/* ── Tableau ── */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">

        {/* Légende */}
        <div className="shrink-0 flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-[11px] text-gray-400">
          <span>📝 Cellules <span className="font-semibold text-gray-600">blanches</span> : modifiables</span>
          <span>🔒 Cellules <span className="font-semibold text-gray-600">grises</span> : calculées automatiquement</span>
          <span>✎ : valeur modifiée manuellement</span>
          <span className="ml-auto text-gray-300">Appuyer sur Entrée ou cliquer ailleurs pour valider</span>
        </div>

        {/* Table avec scroll horizontal */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="border-collapse" style={{ minWidth: `${200 + (colCount + 1) * 100}px` }}>
            {/* Header */}
            <thead className="sticky top-0 z-20">
              <tr className="bg-gray-900 text-white">
                <th className="sticky left-0 bg-gray-900 py-2.5 px-2 text-left text-xs font-semibold min-w-[200px] z-30">
                  Ligne de trésorerie
                </th>
                {columns.map(col => (
                  <th key={col} className="py-2.5 px-2 text-right text-xs font-semibold whitespace-nowrap min-w-[92px]">
                    {col}
                  </th>
                ))}
                <th className="py-2.5 px-2 text-right text-xs font-semibold whitespace-nowrap min-w-[100px] border-l border-gray-700 bg-gray-800">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(row => renderRow(row))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Note méthodologique ── */}
      <div className="shrink-0 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        <p className="font-semibold mb-1">📌 Hypothèses du modèle</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[11px] text-blue-600">
          <span>• Tréso initiale : {fmt(totalSolde)} (soldes consolidés au {new Date(2026,3,27).toLocaleDateString('fr-FR')})</span>
          <span>• Croissance scénario de base : +10%/an sur les recettes</span>
          <span>• Saisonnalité : pic décembre (+28%), creux août (-22%)</span>
          <span>• Charges fixes : indexées +4%/an (inflation)</span>
          <span>• Masse salariale : +7%/an (revalorisation annuelle)</span>
          <span>• TVA : taux effectif net calculé mensuellement</span>
        </div>
      </div>
    </div>
  )
}
