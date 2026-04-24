import { Outlet } from 'react-router-dom'
import { SubTabBar, type SubTab } from '@/shared/components/layout/SubTabBar'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'

const TABS: readonly SubTab[] = [
  { label: 'Vue d\'ensemble', to: '/app/legal', end: true },
  { label: 'Contrats',        to: '/app/legal/contrats' },
  { label: 'RGPD',            to: '/app/legal/rgpd' },
  { label: 'Conformité',      to: '/app/legal/conformite' },
  { label: 'Documents',       to: '/app/legal/documents' },
]

export function LegalLayout() {
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
