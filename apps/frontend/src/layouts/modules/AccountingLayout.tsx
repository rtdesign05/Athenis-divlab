import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SubTabBar, type SubTab } from '@/shared/components/layout/SubTabBar'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { FiscalYearProvider, useFiscalYear } from '@/contexts/FiscalYearContext'
import { FiscalYearSelector } from '@/components/accounting/FiscalYearSelector'
import { useFiscalYearGuard } from '@/hooks/useFiscalYear'
import { settingsApi } from '@/services/settingsApi'

const BASE_TABS: readonly SubTab[] = [
  { label: 'Tableau de bord', to: '/app/accounting', end: true },
  { label: 'Journal',         to: '/app/accounting/journal' },
  { label: 'Grand livre',     to: '/app/accounting/grand-livre' },
  { label: 'Balance',         to: '/app/accounting/balance' },
  { label: 'Comptes',         to: '/app/accounting/comptes' },
]

function etatsFinanciersLabel(zone?: string): string {
  if (zone === 'OHADA') return 'États financiers'
  if (zone === 'IFRS')  return 'Financial Statements'
  return 'Plaquette'
}

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
  const { data: company } = useQuery({
    queryKey: ['company-settings'],
    queryFn:  () => settingsApi.getCompany(),
    staleTime: 5 * 60_000,
  })

  const tabs: SubTab[] = [
    ...BASE_TABS,
    { label: etatsFinanciersLabel(company?.accountingZone), to: '/app/accounting/etats-financiers' },
  ]

  return (
    <div className="flex flex-col min-h-full animate-fade-in">
      {isReadOnly && (
        <ReadOnlyBanner selectedYear={selectedYear} status={status} />
      )}
      <SubTabBar tabs={tabs} rightSlot={<FiscalYearSelector />} />
      <div className="p-6">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  )
}

export function AccountingLayout() {
  return (
    <FiscalYearProvider>
      <AccountingLayoutInner />
    </FiscalYearProvider>
  )
}
