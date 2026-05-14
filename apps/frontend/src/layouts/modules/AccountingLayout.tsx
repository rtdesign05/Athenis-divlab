import { Outlet } from 'react-router-dom'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { ContextualTabBar } from '@/shared/components/layout/ContextualTabBar'
import { useFiscalYear } from '@/contexts/FiscalYearContext'
import { FiscalYearSelector } from '@/components/accounting/FiscalYearSelector'
import { useFiscalYearGuard } from '@/hooks/useFiscalYear'

function ReadOnlyBanner({ selectedYear, status }: { selectedYear: number; status: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm font-medium text-amber-800">
      <span>⚠️</span>
      <span>
        Exercice {selectedYear}{' '}
        {status === 'CLOSED' ? 'clôturé' : 'verrouillé'} — Lecture seule
      </span>
    </div>
  )
}

function AccountingLayoutInner() {
  const { isReadOnly, status } = useFiscalYearGuard()
  const { selectedYear } = useFiscalYear()

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {isReadOnly && (
        <ReadOnlyBanner selectedYear={selectedYear} status={status} />
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
