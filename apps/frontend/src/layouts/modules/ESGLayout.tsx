import { Outlet } from 'react-router-dom'
import { SubTabBar, type SubTab } from '@/shared/components/layout/SubTabBar'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'

const TABS: readonly SubTab[] = [
  { label: 'Vue d\'ensemble', to: '/app/esg', end: true },
  { label: 'Environnemental', to: '/app/esg/environnement' },
  { label: 'Social',          to: '/app/esg/social' },
  { label: 'Gouvernance',     to: '/app/esg/gouvernance' },
  { label: 'Risques',         to: '/app/esg/risques' },
  { label: 'Rapport',         to: '/app/esg/rapport' },
]

export function ESGLayout() {
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
