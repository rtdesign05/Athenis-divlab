import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFiscalYear } from '@/contexts/FiscalYearContext'
import { useFiscalYears } from '@/hooks/useFiscalYear'
import type { FiscalYearStatus } from '@/services/accountingApi'

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<FiscalYearStatus, string> = {
  OPEN:   'En cours',
  CLOSED: 'Cl\xf4tur\xe9',
  LOCKED: 'Verrouill\xe9',
  DRAFT:  'Brouillon',
}

const STATUS_COLORS: Record<FiscalYearStatus, string> = {
  OPEN:   'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-500',
  LOCKED: 'bg-amber-100 text-amber-700',
  DRAFT:  'bg-amber-100 text-amber-700',
}

function StatusBadge({ status, size = 'md' }: { status: FiscalYearStatus; size?: 'md' | 'sm' }) {
  const text = size === 'sm' ? 'text-[11px] px-1.5 py-0' : 'text-xs px-2 py-0.5'
  return (
    <span className={`rounded-full font-medium ${text} ${STATUS_COLORS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
//
// Sélection de l'exercice comptable actif. La création est volontairement
// retirée de ce composant : un nouvel exercice ne peut être créé QUE depuis
// Paramètres › Comptabilité › onglet « Exercices ».

export function FiscalYearSelector() {
  const { selectedYear, setSelectedYear } = useFiscalYear()
  const { data: years = [], isLoading } = useFiscalYears()

  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const sorted   = [...years].sort((a, b) => b.year - a.year)
  const selected = years.find(y => y.year === selectedYear)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isLoading) {
    return <div className="h-9 w-44 animate-pulse rounded-lg bg-gray-200" />
  }

  return (
    <div ref={ref} className="relative">
      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="flex h-9 min-w-[200px] items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm transition-colors hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
      >
        <div className="flex items-center gap-2 text-gray-500">
          <IconCalendar />
          <span className="font-medium text-gray-900">
            Exercice {selected?.year ?? selectedYear}
          </span>
          {selected && <StatusBadge status={selected.status} />}
        </div>
        <IconChevron open={isOpen} />
      </button>

      {/* ── Dropdown ── */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[240px] rounded-lg border border-gray-100 bg-white shadow-lg">
          {sorted.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-gray-400">
              Aucun exercice configur\xe9
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto py-1">
              {sorted.map(fy => {
                const isSel = fy.year === selectedYear
                return (
                  <button
                    key={fy.id}
                    type="button"
                    onClick={() => { setSelectedYear(fy.year); setIsOpen(false) }}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`flex w-3 items-center justify-center ${isSel ? 'text-green-600' : ''}`}>
                        {isSel ? <IconCheck /> : null}
                      </span>
                      <span className={fy.status === 'CLOSED' ? 'text-gray-400' : 'font-medium text-gray-800'}>
                        {fy.year}
                      </span>
                      <StatusBadge status={fy.status} size="sm" />
                    </div>
                    {fy.status === 'CLOSED' && (
                      <span className="text-gray-400"><IconLock /></span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Lien vers les param\xe8tres pour cr\xe9er un nouvel exercice */}
          <div className="border-t border-gray-100">
            <Link
              to="/app/settings/comptabilite?tab=exercices"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            >
              <IconSettings />
              <span>G\xe9rer les exercices dans les param\xe8tres</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
