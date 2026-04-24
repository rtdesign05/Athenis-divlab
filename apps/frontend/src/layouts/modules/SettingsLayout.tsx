import { Outlet } from 'react-router-dom'
import { SubTabBar, type SubTab } from '@/shared/components/layout/SubTabBar'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'

const TABS: readonly SubTab[] = [
  { label: 'Entreprise',      to: '/app/settings/entreprise' },
  { label: 'Utilisateurs',    to: '/app/settings/utilisateurs' },
  { label: 'Rôles & Accès',   to: '/app/settings/roles' },
  { label: 'Sécurité',        to: '/app/settings/securite' },
  { label: 'Facturation',     to: '/app/settings/facturation' },
  { label: 'Localisation',    to: '/app/settings/localisation' },
  { label: 'Fiscalité',       to: '/app/settings/fiscalite' },
]

export function SettingsLayout() {
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
