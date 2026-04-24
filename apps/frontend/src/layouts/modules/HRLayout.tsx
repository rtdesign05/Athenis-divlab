import { Outlet } from 'react-router-dom'
import { SubTabBar, type SubTab } from '@/shared/components/layout/SubTabBar'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'

const TABS: readonly SubTab[] = [
  { label: 'Vue d\'ensemble', to: '/app/hr', end: true },
  { label: 'Employés',        to: '/app/hr/employes' },
  { label: 'Contrats',        to: '/app/hr/contrats' },
  { label: 'Congés',          to: '/app/hr/conges' },
  { label: 'Paie',            to: '/app/hr/paie' },
  { label: 'Planning',        to: '/app/hr/planning' },
]

export function HRLayout() {
  return (
    <div className="flex flex-col min-h-full animate-fade-in">
      <SubTabBar tabs={TABS} />
      <div className="p-6">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  )
}
