import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { AiWidget } from '@/features/ai/AiWidget'

interface AppLayoutProps {
  variant?: 'app' | 'personal' | 'cabinet'
}

export function AppLayout({ variant = 'app' }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar variant={variant} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      {variant === 'app' && <AiWidget />}
    </div>
  )
}

// Named variant exports consumed by lazy route loader
export function CabinetAppLayout() {
  return <AppLayout variant="cabinet" />
}

export function PersonalAppLayout() {
  return <AppLayout variant="personal" />
}
