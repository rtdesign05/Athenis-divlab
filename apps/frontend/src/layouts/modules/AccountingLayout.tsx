import { Outlet } from 'react-router-dom'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { ContextualTabBar } from '@/shared/components/layout/ContextualTabBar'
import { useFiscalYear } from '@/contexts/FiscalYearContext'
import { FiscalYearSelector } from '@/components/accounting/FiscalYearSelector'
import { useFiscalYearGuard, useFiscalYears } from '@/hooks/useFiscalYear'

function ReadOnlyBanner({
  selectedYear,
  status,
  onSwitchToOpen,
  openYear,
}: {
  selectedYear: number
  status: string
  onSwitchToOpen?: () => void
  openYear?: number
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm font-medium text-amber-800">
      <div className="flex items-center gap-2">
        <span>⚠️</span>
        <span>
          Exercice <strong>{selectedYear}</strong>{' '}
          {status === 'CLOSED' ? 'clôturé' : 'verrouillé'} — Lecture seule.
          {openYear && (
            <span className="ml-2 text-amber-700">
              Les écritures récentes sont sur l'exercice {openYear}.
            </span>
          )}
        </span>
      </div>
      {openYear && onSwitchToOpen && (
        <button
          onClick={onSwitchToOpen}
          className="shrink-0 rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
        >
          → Basculer sur {openYear}
        </button>
      )}
    </div>
  )
}

function AccountingLayoutInner() {
  const { isReadOnly, status } = useFiscalYearGuard()
  const { selectedYear, setSelectedYear } = useFiscalYear()
  const { data: years = [] } = useFiscalYears()

  // Identifie l'exercice OPEN couvrant aujourd'hui (ou le plus récent OPEN)
  const today = new Date()
  const openCovering = years.find(y =>
    y.status !== 'CLOSED' &&
    new Date(y.startDate) <= today &&
    new Date(y.endDate) >= today,
  )
  const fallbackOpen = [...years].filter(y => y.status !== 'CLOSED').sort((a, b) => b.year - a.year)[0]
  const targetOpen = openCovering ?? fallbackOpen

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {isReadOnly && (
        <ReadOnlyBanner
          selectedYear={selectedYear}
          status={status}
          {...(targetOpen && targetOpen.year !== selectedYear ? {
            openYear: targetOpen.year,
            onSwitchToOpen: () => setSelectedYear(targetOpen.year),
          } : {})}
        />
      )}
      <ContextualTabBar rightSlot={<FiscalYearSelector />} />
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  )
}

export function AccountingLayout() {
  return <AccountingLayoutInner />
}
