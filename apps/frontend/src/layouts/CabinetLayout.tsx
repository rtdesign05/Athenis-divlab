import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { CABINET_NAV_ITEMS } from '@/config/navigation'
import { ChangePasswordModal } from '@/shared/components/ChangePasswordModal'

export function CabinetLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [pwOpen, setPwOpen] = useState(false)

  const isClientView = location.pathname.startsWith('/cabinet/clients/')
  const clientId = isClientView ? location.pathname.split('/')[3] : null

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-forest-900">
        <div className="flex h-16 items-center px-5">
          <span className="text-xl font-bold tracking-tight text-white">Athenis</span>
          <span className="ml-2 rounded-full bg-amber-600 px-2 py-0.5 text-xs font-medium text-white">
            Cabinet
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {CABINET_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-forest-800 text-white'
                    : 'text-forest-200 hover:bg-forest-800 hover:text-white'
                }`
              }
            >
              <span className="w-4 text-center text-sm">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-forest-800 p-3">
          <div className="truncate px-3 text-xs text-forest-300">{user?.email}</div>
          <div className="px-3 text-xs text-forest-400">Cabinet</div>
          <button
            onClick={() => setPwOpen(true)}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-forest-300 transition-colors hover:bg-forest-800 hover:text-white"
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

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Cabinet mode banner when viewing a client */}
        {isClientView && clientId && (
          <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-2">
            <span className="text-sm font-medium text-amber-800">Mode Cabinet</span>
            <span className="text-amber-400">·</span>
            <span className="text-sm text-amber-700">Entreprise cliente #{clientId.slice(0, 8)}</span>
            <NavLink
              to="/cabinet/clients"
              className="ml-auto text-xs font-medium text-amber-700 underline hover:text-amber-900"
            >
              ← Retour au portefeuille
            </NavLink>
          </div>
        )}

        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <h1 className="text-base font-semibold text-gray-900">Espace cabinet comptable</h1>
          <span className="text-sm text-gray-500">{user?.email}</span>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
