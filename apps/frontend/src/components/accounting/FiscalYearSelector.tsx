import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { useFiscalYear } from '@/contexts/FiscalYearContext'
import {
  useFiscalYears,
  useCreateFiscalYear,
  useCanCreateFiscalYear,
} from '@/hooks/useFiscalYear'
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

function IconPlus() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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

// ── New fiscal year modal ─────────────────────────────────────────────────────

interface NewFiscalYearModalProps {
  latestYear: number
  onClose: () => void
  onCreated: (year: number) => void
}

function NewFiscalYearModal({ latestYear, onClose, onCreated }: NewFiscalYearModalProps) {
  const nextYear = latestYear + 1
  const [year, setYear] = useState(nextYear)
  const [startDate, setStartDate] = useState(`${nextYear}-01-01`)
  const [endDate, setEndDate] = useState(`${nextYear}-12-31`)
  const createFiscalYear = useCreateFiscalYear()

  const handleYearChange = (val: number) => {
    setYear(val)
    setStartDate(`${val}-01-01`)
    setEndDate(`${val}-12-31`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fy = await createFiscalYear.mutateAsync({ year, startDate, endDate })
    onCreated(fy.year)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Nouvel exercice fiscal</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ann\xe9e</label>
            <input
              type="number" value={year}
              onChange={e => handleYearChange(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date de d\xe9but</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date de fin</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={createFiscalYear.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {createFiscalYear.isPending ? 'Cr\xe9ation\u2026' : 'Cr\xe9er'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Max-open alert ────────────────────────────────────────────────────────────

function MaxOpenAlert({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-3 text-2xl">\u26a0\ufe0f</div>
        <h2 className="mb-2 text-base font-semibold text-gray-900">Limite atteinte</h2>
        <p className="mb-5 text-sm text-gray-600">{message}</p>
        <div className="flex justify-end">
          <button type="button" onClick={onClose}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
            Compris
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function FiscalYearSelector() {
  const { user } = useAuth()
  const { selectedYear, setSelectedYear } = useFiscalYear()
  const { data: years = [], isLoading } = useFiscalYears()
  const { canCreate, blockingMessage } = useCanCreateFiscalYear()

  const [isOpen, setIsOpen]           = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showMaxAlert, setShowMaxAlert] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isAdmin   = user?.role === 'ADMIN'
  const sorted    = [...years].sort((a, b) => b.year - a.year)
  const selected  = years.find(y => y.year === selectedYear)
  const latestYear = years.length > 0 ? Math.max(...years.map(y => y.year)) : selectedYear

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

  const handleNewClick = () => {
    setIsOpen(false)
    if (!canCreate) { setShowMaxAlert(true); return }
    setShowNewModal(true)
  }

  if (isLoading) {
    return <div className="h-9 w-44 animate-pulse rounded-lg bg-gray-200" />
  }

  return (
    <>
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
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-gray-100 bg-white shadow-lg">
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

            {isAdmin && (
              <div className="border-t border-gray-100 py-1">
                <button
                  type="button"
                  onClick={handleNewClick}
                  disabled={!canCreate}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:text-gray-300"
                >
                  <IconPlus />
                  <span>Nouvel exercice</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showNewModal && (
        <NewFiscalYearModal
          latestYear={latestYear}
          onClose={() => setShowNewModal(false)}
          onCreated={year => { setSelectedYear(year); setShowNewModal(false) }}
        />
      )}

      {showMaxAlert && blockingMessage && (
        <MaxOpenAlert message={blockingMessage} onClose={() => setShowMaxAlert(false)} />
      )}
    </>
  )
}
