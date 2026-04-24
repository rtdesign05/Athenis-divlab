import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SubTabBar, type SubTab } from '@/shared/components/layout/SubTabBar'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { settingsApi } from '@/services/settingsApi'
import { fiscalApi } from '@/services/fiscalApi'

const base = '/app/fiscal'

const FALLBACK_TABS_CM: readonly SubTab[] = [
  { label: 'Tableau de bord',      to: base,                    end: true },
  { label: 'TVA',                  to: `${base}/tva` },
  { label: 'DSF',                  to: `${base}/dsf` },
  { label: 'IS',                   to: `${base}/is` },
  { label: 'Patente',              to: `${base}/patente` },
  { label: 'Retenues à la source', to: `${base}/ras` },
  { label: 'CNPS',                 to: `${base}/cnps` },
  { label: 'Calendrier fiscal',    to: `${base}/calendrier` },
  { label: 'Liasse fiscale',       to: `${base}/liasse` },
]

const FALLBACK_TABS_FR: readonly SubTab[] = [
  { label: 'Tableau de bord', to: base,                    end: true },
  { label: 'TVA',             to: `${base}/tva` },
  { label: 'IS/IR',           to: `${base}/is` },
  { label: 'CFE/CVAE',        to: `${base}/patente` },
  { label: 'Liasse fiscale',  to: `${base}/liasse` },
  { label: 'Calendrier',      to: `${base}/calendrier` },
]

const FALLBACK_TABS_DEFAULT: readonly SubTab[] = [
  { label: 'Tableau de bord', to: base,                    end: true },
  { label: 'TVA',             to: `${base}/tva` },
  { label: 'IS',              to: `${base}/is` },
  { label: 'Déclarations',    to: `${base}/dsf` },
  { label: 'Calendrier',      to: `${base}/calendrier` },
]

function getFallbackTabs(country: string | undefined): readonly SubTab[] {
  if (country === 'CM') return FALLBACK_TABS_CM
  if (country === 'FR') return FALLBACK_TABS_FR
  return FALLBACK_TABS_DEFAULT
}

export function FiscalLayout() {
  const { data: company } = useQuery({
    queryKey: ['company-settings'],
    queryFn:  () => settingsApi.getCompany(),
    staleTime: 5 * 60_000,
  })

  const { data: modulesData } = useQuery({
    queryKey: ['fiscal', 'visible-modules'],
    queryFn:  fiscalApi.visibleModules,
    staleTime: 5 * 60_000,
    enabled:  company?.country === 'CM',
  })

  const tabs: readonly SubTab[] = modulesData?.tabs?.length
    ? modulesData.tabs
    : getFallbackTabs(company?.country)

  return (
    <div className="flex flex-col min-h-full animate-fade-in">
      <SubTabBar tabs={tabs} />
      <div className="p-6">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  )
}
