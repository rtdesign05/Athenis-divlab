import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PERSONAL_NAV_ITEMS } from '@/config/navigation'

export function PersonalLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="flex w-60 flex-col border-r border-gray-200 bg-forest-900">
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
            onClick={() => void logout()}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-forest-300 transition-colors hover:bg-forest-800 hover:text-white"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center border-b border-gray-200 bg-white px-6">
          <h1 className="text-base font-semibold text-gray-900">Mon espace financier</h1>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
