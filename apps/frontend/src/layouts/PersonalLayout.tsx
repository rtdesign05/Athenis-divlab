import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PERSONAL_NAV_ITEMS } from '@/config/navigation'
import { ChangePasswordModal } from '@/shared/components/ChangePasswordModal'

interface SidebarProps {
  onNavigate?: () => void
}

function PersonalSidebar({ onNavigate }: SidebarProps) {
  const { user, logout } = useAuth()
  const [pwOpen, setPwOpen] = useState(false)

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-forest-900">
      <div className="flex h-16 items-center px-5">
        <span className="text-xl font-bold tracking-tight text-white">Athenis</span>
        <span className="ml-2 rounded-full bg-forest-700 px-2 py-0.5 text-xs font-medium text-forest-100">
          Personnel
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {PERSONAL_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-forest-800 text-white'
                  : 'text-forest-200 hover:bg-forest-800 hover:text-white'
              }`
            }
          >
            <span className="w-4 text-center text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-forest-800 p-3">
        <div className="mb-1 truncate px-3 text-xs text-forest-300">{user?.email}</div>
        <button
          onClick={() => setPwOpen(true)}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-forest-300 transition-colors hover:bg-forest-800 hover:text-white"
        >
          🔑 Changer le mot de passe
        </button>
        <button
          onClick={() => void logout()}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-forest-300 transition-colors hover:bg-forest-800 hover:text-white"
        >
          Déconnexion
        </button>
      </div>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </aside>
  )
}

export function PersonalLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="athenis-app-shell flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar desktop (>= lg) */}
      <div className="hidden lg:flex">
        <PersonalSidebar />
      </div>

      {/* Sidebar mobile (drawer overlay) */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <PersonalSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header with hamburger */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-gray-900">Mon espace financier</h1>
        </header>

        {/* Desktop header */}
        <header className="hidden h-16 shrink-0 items-center border-b border-gray-200 bg-white px-6 lg:flex">
          <h1 className="text-base font-semibold text-gray-900">Mon espace financier</h1>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
