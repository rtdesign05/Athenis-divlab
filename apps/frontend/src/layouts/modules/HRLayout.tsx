import { Outlet } from 'react-router-dom'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { ContextualTabBar } from '@/shared/components/layout/ContextualTabBar'
import { HRProvider } from '@/contexts/HRContext'
import { ContractsProvider } from '@/contexts/ContractsContext'

export function HRLayout() {
  return (
    <HRProvider>
      <ContractsProvider>
        <div className="flex flex-col h-full animate-fade-in">
          <ContextualTabBar />
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </div>
      </ContractsProvider>
    </HRProvider>
  )
}
