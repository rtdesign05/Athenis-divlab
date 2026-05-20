import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { ChangePasswordModal } from '@/shared/components/ChangePasswordModal'

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV: Array<{ to: string; label: string; icon: string; end: boolean }> = [
  { to: '/admin',                label: 'Tableau de bord',  icon: '📊', end: true  },
  { to: '/admin/users/pending',  label: 'À valider',        icon: '⏳', end: false },
  { to: '/admin/users',          label: 'Utilisateurs',     icon: '👥', end: false },
  { to: '/admin/health',         label: 'Santé système',    icon: '🔧', end: false },
  { to: '/admin/security',       label: 'Sécurité',         icon: '🔒', end: false },
]

// ── Layout ────────────────────────────────────────────────────────────────────

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [pwOpen, setPwOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/auth/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-gray-100 px-4">
          <span className="text-xl">🛡️</span>
          <div>
            <p className="text-sm font-bold text-gray-900">Athenis Admin</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-green-600">Super Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {NAV.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-gray-100 p-3">
          <div className="mb-2 rounded-lg bg-gray-50 px-3 py-2">
            <p className="truncate text-xs font-medium text-gray-700">{user?.email}</p>
            <p className="text-[10px] text-gray-400">Opérateur plateforme</p>
          </div>
          <button
            type="button"
            onClick={() => setPwOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <span>🔑</span> Changer le mot de passe
          </button>
          <button
            type="button"
            onClick={() => { void handleLogout() }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <span>↩</span> Déconnexion
          </button>
        </div>
        <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
