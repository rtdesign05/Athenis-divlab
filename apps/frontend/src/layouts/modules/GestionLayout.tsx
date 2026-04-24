import { Outlet } from 'react-router-dom'
import { SubTabBar, type SubTab } from '@/shared/components/layout/SubTabBar'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'

const TABS: readonly SubTab[] = [
  { label: 'Vue d\'ensemble', to: '/app/gestion', end: true },
  { label: 'Factures',        to: '/app/gestion/factures' },
  { label: 'Devis',           to: '/app/gestion/devis' },
  { label: 'Clients',         to: '/app/gestion/clients' },
  { label: 'Dépenses',        to: '/app/gestion/depenses' },
  { label: 'Trésorerie',      to: '/app/gestion/tresorerie' },
  { label: 'Stock',           to: '/app/gestion/stock' },
]

export function GestionLayout() {
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
