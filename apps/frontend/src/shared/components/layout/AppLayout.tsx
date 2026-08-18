import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { Topbar } from './Topbar'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { AiWidget } from '@/features/ai/AiWidget'
import { TresorerieProvider } from '@/contexts/TresorerieContext'
import { GestionProvider } from '@/contexts/GestionContext'
import { CompanySettingsProvider } from '@/contexts/CompanySettingsContext'
import { ContractsProvider } from '@/contexts/ContractsContext'
import { FiscalYearProvider } from '@/contexts/FiscalYearContext'
import { CabinetViewBanner } from '@/features/cabinet/CabinetViewBanner'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="athenis-app-shell flex h-screen overflow-hidden bg-slate-50">

      {/* Sidebar desktop */}
      <div className="relative z-10 hidden lg:flex">
        <AppSidebar />
      </div>

      {/* Sidebar mobile — overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <AppSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <CabinetViewBanner />
        <Topbar onMenuClick={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 overflow-hidden">
          <ErrorBoundary>
            <FiscalYearProvider>
              <CompanySettingsProvider>
                <TresorerieProvider>
                  <GestionProvider>
                    <ContractsProvider>
                      <Outlet />
                    </ContractsProvider>
                  </GestionProvider>
                </TresorerieProvider>
              </CompanySettingsProvider>
            </FiscalYearProvider>
          </ErrorBoundary>
        </main>
      </div>

      <AiWidget />
    </div>
  )
}
