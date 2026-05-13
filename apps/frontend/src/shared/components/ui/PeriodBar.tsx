/**
 * Sélecteur exercice / période — partagé entre le Tableau de bord et la Vue d'ensemble Gestion.
 * Expose :
 *   - usePeriod()    → state + helpers + from/to calculés
 *   - PeriodBar      → composant UI
 *   - MONTH_LABELS   → constante (export pour les labels dynamiques)
 *   - PeriodMode     → type
 */
import { useState, useMemo } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

export type PeriodMode = 'full' | 'month' | 'week'

export const MONTH_LABELS = [
  'Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc',
]

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getMonday(d: Date): Date {
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m    = new Date(d)
  m.setDate(d.getDate() + diff)
  m.setHours(0, 0, 0, 0)
  return m
}

export function fmtWeekDay(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ── Hook usePeriod ─────────────────────────────────────────────────────────────

export interface PeriodState {
  selectedYear:   number
  periodMode:     PeriodMode
  selectedMonth:  number   // 1-12
  weekStart:      Date

  setSelectedYear:  (y: number)      => void
  setPeriodMode:    (m: PeriodMode)  => void
  setSelectedMonth: (m: number)      => void
  setWeekStart:     (d: Date)        => void
  shiftWeek:        (dir: -1 | 1)   => void

  periodFrom: string   // YYYY-MM-DD
  periodTo:   string   // YYYY-MM-DD
}

export function usePeriod(currentYear: number): PeriodState {
  const now = new Date()

  const [selectedYear,  setSelectedYear]  = useState(currentYear)
  const [periodMode,    setPeriodMode]    = useState<PeriodMode>('full')
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [weekStart,     setWeekStart]     = useState<Date>(() => getMonday(now))

  const shiftWeek = (dir: -1 | 1) =>
    setWeekStart(prev => new Date(prev.getTime() + dir * 7 * 86_400_000))

  const { periodFrom, periodTo } = useMemo(() => {
    if (periodMode === 'full') {
      return {
        periodFrom: `${selectedYear}-01-01`,
        periodTo:   `${selectedYear}-12-31`,
      }
    }
    if (periodMode === 'month') {
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
      const mm      = String(selectedMonth).padStart(2, '0')
      return {
        periodFrom: `${selectedYear}-${mm}-01`,
        periodTo:   `${selectedYear}-${mm}-${String(lastDay).padStart(2, '0')}`,
      }
    }
    // week
    const sunday = new Date(weekStart.getTime() + 6 * 86_400_000)
    return {
      periodFrom: weekStart.toISOString().slice(0, 10),
      periodTo:   sunday.toISOString().slice(0, 10),
    }
  }, [selectedYear, periodMode, selectedMonth, weekStart])

  return {
    selectedYear, periodMode, selectedMonth, weekStart,
    setSelectedYear, setPeriodMode, setSelectedMonth, setWeekStart, shiftWeek,
    periodFrom, periodTo,
  }
}

// ── PeriodBar component ────────────────────────────────────────────────────────

export function PeriodBar({
  selectedYear, currentYear, onYearChange,
  mode, onModeChange,
  selectedMonth, onMonthChange,
  weekStart, onWeekShift,
}: {
  selectedYear: number; currentYear: number; onYearChange: (y: number) => void
  mode: PeriodMode; onModeChange: (m: PeriodMode) => void
  selectedMonth: number; onMonthChange: (m: number) => void
  weekStart: Date; onWeekShift: (dir: -1 | 1) => void
}) {
  const nav = 'flex h-6 w-6 items-center justify-center rounded text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
  const tabBase   = 'px-3 py-1 text-xs font-medium transition-colors'
  const tabActive = 'bg-green-700 text-white'
  const tabInact  = 'text-gray-600 hover:bg-gray-50'
  const sunday    = new Date(weekStart.getTime() + 6 * 86_400_000)

  return (
    <div className="shrink-0 flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">

      {/* ── Year navigator ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white px-1 py-0.5 shadow-sm">
        <button onClick={() => onYearChange(selectedYear - 1)} className={nav} title="Exercice précédent">‹</button>
        <span className="w-11 text-center text-sm font-bold text-gray-800">{selectedYear}</span>
        <button
          onClick={() => onYearChange(selectedYear + 1)}
          disabled={selectedYear >= currentYear}
          className={nav}
          title="Exercice suivant"
        >›</button>
      </div>

      <span className="text-gray-300 select-none">|</span>

      {/* ── Period mode tabs ───────────────────────────────────────────── */}
      <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
        {(['full', 'month', 'week'] as const).map(t => (
          <button key={t} onClick={() => onModeChange(t)}
            className={`${tabBase} ${mode === t ? tabActive : tabInact}`}>
            {t === 'full' ? 'Exercice' : t === 'month' ? 'Mois' : 'Semaine'}
          </button>
        ))}
      </div>

      {/* ── Month chips ────────────────────────────────────────────────── */}
      {mode === 'month' && (
        <div className="flex flex-wrap gap-1">
          {MONTH_LABELS.map((label, i) => (
            <button key={i} onClick={() => onMonthChange(i + 1)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                selectedMonth === i + 1
                  ? 'bg-green-700 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50'
              }`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Week navigator ─────────────────────────────────────────────── */}
      {mode === 'week' && (
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-0.5 shadow-sm">
          <button onClick={() => onWeekShift(-1)} className={nav} title="Semaine précédente">‹</button>
          <span className="text-xs font-medium text-gray-700 px-1 whitespace-nowrap">
            {fmtWeekDay(weekStart)} – {fmtWeekDay(sunday)} {selectedYear}
          </span>
          <button onClick={() => onWeekShift(1)} className={nav} title="Semaine suivante">›</button>
        </div>
      )}
    </div>
  )
}
