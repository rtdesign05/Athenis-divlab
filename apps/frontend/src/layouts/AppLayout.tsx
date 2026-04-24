import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { APP_NAV_SECTIONS } from '@/config/navigation'
import type { Module } from '@athenis/shared-types'

const MODULE_LABEL: Record<Module, string> = {
  gestion: 'Gestion',
  rh: 'Ressources humaines',
  comptabilite: 'Comptabilité',
  juridique: 'Juridique',
  esg: 'ESG & CSRD',
  fiscalite: 'Fiscalité',
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const { canAccessModule, plan } = usePermissions()
  const availableSections = APP_NAV_SECTIONS.filter((s) => canAccessModule(s.module))

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-forest-900">
        <div className="flex h-16 items-center px-5">
          <span className="text-xl font-bold tracking-tight text-white">Athenis</span>
          {plan && (
            <span className="ml-2 rounded-full bg-forest-700 px-2 py-0.5 text-xs font-medium text-forest-100">
              {plan}
            </span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {availableSections.map((section) => (
            <div key={section.module} className="mb-4">
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-forest-400">
                {MODULE_LABEL[section.module]}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
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
              </div>
            </div>
          ))}

          {/* Settings always visible */}
          <div className="mt-2 border-t border-forest-800 pt-3">
            <NavLink
              to="/app/settings"
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-forest-800 text-white'
                    : 'text-forest-200 hover:bg-forest-800 hover:text-white'
                }`
              }
            >
              <span className="w-4 text-center text-sm">⚙️</span>
              Paramètres
            </NavLink>
          </div>
        </nav>

        <div className="border-t border-forest-800 p-3">
          <div className="truncate px-3 text-xs text-forest-300">{user?.email}</div>
          <div className="px-3 text-xs text-forest-400">{user?.role}</div>
          <button
            onClick={() => void logout()}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-forest-300 transition-colors hover:bg-forest-800 hover:text-white"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <h1 className="text-base font-semibold text-gray-900">Espace entreprise</h1>
          <span className="text-sm text-gray-500">{user?.email}</span>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
