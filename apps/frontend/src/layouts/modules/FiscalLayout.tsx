import { Outlet } from 'react-router-dom'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { ContextualTabBar } from '@/shared/components/layout/ContextualTabBar'

export function FiscalLayout() {
  return (
    <div className="flex flex-col h-full animate-fade-in">
      <ContextualTabBar />
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  )
}
