import { Outlet } from 'react-router-dom'
import { Topbar } from './Topbar'
import { ModuleTabBar } from './ModuleTabBar'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { AiWidget } from '@/features/ai/AiWidget'

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <Topbar />
      <ModuleTabBar />
      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <AiWidget />
    </div>
  )
}
