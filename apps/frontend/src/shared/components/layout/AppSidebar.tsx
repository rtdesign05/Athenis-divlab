import { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { usePermissions } from '@/features/auth/usePermissions'
import { APP_NAV_SECTIONS } from '@/config/navigation'
import { AtheisId } from '@/shared/components/ui/AtheisId'
import { getFlagEmoji } from '@athenis/shared-types'
import type { Module } from '@athenis/shared-types'

interface ModuleEntry {
  key: Module
  label: string
  icon: string
  path: string
}

const MODULES: ModuleEntry[] = [
  { key: 'gestion',      label: 'Gestion',      icon: '📄', path: '/app/gestion' },
  { key: 'comptabilite', label: 'Comptabilité',  icon: '📊', path: '/app/accounting' },
  { key: 'rh',           label: 'RH',            icon: '👥', path: '/app/hr' },
  { key: 'juridique',    label: 'Juridique',     icon: '⚖️', path: '/app/legal' },
  { key: 'esg',          label: 'ESG',           icon: '🌿', path: '/app/esg' },
  { key: 'fiscalite',    label: 'Fiscalité',     icon: '🏛️', path: '/app/fiscal' },
]

export function AppSidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth()
  const { modules } = usePermissions()
  const location = useLocation()
  const navigate = useNavigate()
  const flyoutRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  const fullName    = [(user as { firstName?: string } | null)?.firstName, (user as { lastName?: string } | null)?.lastName].filter(Boolean).join(' ') || user?.email || ''
  const companyName = (user as { companyName?: string } | null)?.companyName ?? null
  const initial     = ((user as { firstName?: string } | null)?.firstName ?? user?.email ?? '?').charAt(0).toUpperCase()
  const showLocale  = user?.accountType === 'COMPANY' && user.country && user.currencySymbol

  const visibleModules = MODULES.filter((m) => modules.includes(m.key))
  const navSections    = APP_NAV_SECTIONS.filter((s) => modules.includes(s.module))

  const [flyoutModule, setFlyoutModule] = useState<Module | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setFlyoutModule(null), 120)
  }, [])

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

  function handleModuleClick(mod: ModuleEntry) {
    navigate(mod.path)
    onClose?.()
  }

  const flyoutSection  = flyoutModule ? navSections.find((s) => s.module === flyoutModule) : null
  const flyoutModEntry = flyoutModule ? visibleModules.find((m) => m.key === flyoutModule) : null

  return (
    <>
      <aside
        ref={sidebarRef}
        className="flex h-full w-[220px] shrink-0 flex-col bg-gradient-to-b from-green-950 via-green-900 to-green-900 z-30 relative"
      >
        {/* Logo */}
        <div className="flex h-[52px] shrink-0 items-center gap-2.5 px-5 border-b border-green-800/60">
          <img src="/logo-athenis.svg" alt="Athenis" className="h-7 w-7 rounded-lg" />
          <span className="text-base font-bold text-white tracking-tight">Athenis</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavLink
            to="/app"
            end
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-white/15 text-white' : 'text-green-200 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span className="text-base leading-none">🏠</span>
            <span>Tableau de bord</span>
          </NavLink>

          <div className="my-2 border-t border-green-800/50" />

          {visibleModules.map((mod) => {
            const isModuleActive = location.pathname.startsWith(mod.path)
            const isFlyoutOpen   = flyoutModule === mod.key
            const hasItems = (navSections.find((s) => s.module === mod.key)?.items ?? []).length > 0
            return (
              <button
                key={mod.key}
                onClick={() => handleModuleClick(mod)}
                onMouseEnter={() => { cancelClose(); if (hasItems) setFlyoutModule(mod.key) }}
                onMouseLeave={scheduleClose}
                className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isModuleActive || isFlyoutOpen
                    ? 'bg-white/15 text-white'
                    : 'text-green-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                {isModuleActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-green-400" />
                )}
                <span className="text-base leading-none">{mod.icon}</span>
                <span className="flex-1 text-left">{mod.label}</span>
                {hasItems && (
                  <svg className="h-3 w-3 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02z" />
                  </svg>
                )}
              </button>
            )
          })}
        </nav>

        {/* ── Account section (tout ce qui était dans la Topbar) ── */}
        <div className="shrink-0 border-t border-green-800/60">

          {/* Infos utilisateur */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-green-800/40">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-700 text-sm font-bold text-white">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[12px] font-semibold text-white">{companyName || fullName}</p>
              <p className="truncate text-[11px] text-green-300">{user?.email}</p>
              {showLocale && (
                <p className="text-[11px] text-green-400 mt-0.5">
                  {getFlagEmoji(user.country!)} {user.currencySymbol}
                </p>
              )}
            </div>
            {/* Notifications */}
            <button
              aria-label="Notifications"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-green-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              🔔
            </button>
          </div>

          {/* Actions */}
          <div className="px-2 py-2 space-y-0.5">
            <Link
              to="/app/settings"
              onClick={onClose}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-green-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span>⚙️</span> Paramètres
            </Link>
            <Link
              to="/app/settings/securite"
              onClick={onClose}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-green-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span>🔒</span> Sécurité
            </Link>
            {user?.plan && (
              <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-green-300">
                <span>📋</span> Forfait : <span className="font-semibold text-white">{user.plan}</span>
              </div>
            )}
          </div>

          {/* Athenis ID + Déconnexion */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-green-800/40">
            {user?.atheisNumber
              ? <AtheisId number={user.atheisNumber} size="sm" dark />
              : <span />
            }
            <button
              onClick={() => void logout()}
              className="flex items-center gap-1.5 text-[11px] text-red-400 transition-colors hover:text-red-300"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Flyout panel */}
      {flyoutSection && flyoutModEntry && (
        <div
          ref={flyoutRef}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="absolute left-[220px] top-0 z-20 flex h-full w-[200px] flex-col bg-white border-r border-gray-200 shadow-xl"
        >
          <div className="flex h-[52px] shrink-0 items-center gap-2 px-4 border-b border-gray-100">
            <span className="text-base leading-none">{flyoutModEntry.icon}</span>
            <span className="text-sm font-semibold text-gray-800">{flyoutModEntry.label}</span>
          </div>
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {flyoutSection.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                {...(item.end !== undefined ? { end: item.end } : {})}
                onClick={() => setFlyoutModule(null)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-green-50 text-green-800'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <span className="text-sm leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}
