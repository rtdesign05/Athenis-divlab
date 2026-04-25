import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { getFlagEmoji } from '@athenis/shared-types'
import { AtheisId } from '@/shared/components/ui/AtheisId'

export function Topbar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const displayName = user?.email ?? ''
  const initial = displayName.charAt(0).toUpperCase() || '?'
  const companyName = (user as { companyName?: string } | null)?.companyName ?? null
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || displayName

  const showLocale = user?.accountType === 'COMPANY' && user.country && user.currencySymbol

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest-900 text-sm font-bold text-white">
          A
        </div>
        <span className="text-sm font-semibold text-gray-900 tracking-tight">Athenis</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
        >
          🔔
        </button>

        {showLocale && (
          <>
            <div className="mx-1 h-4 w-px bg-gray-200" />
            <span className="flex items-center gap-1 text-sm text-gray-600">
              <span>{getFlagEmoji(user.country!)}</span>
              <span className="font-medium">{user.currencySymbol}</span>
            </span>
          </>
        )}

        <div className="mx-1 h-4 w-px bg-gray-200" />

        {/* Account dropdown trigger */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-1 py-0.5 transition-colors hover:bg-gray-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-100 text-sm font-semibold text-forest-700">
              {initial}
            </div>
            <div className="hidden text-left sm:block">
              {user?.atheisNumber && (
                <AtheisId number={user.atheisNumber} size="sm" />
              )}
              <span className="block max-w-[160px] truncate text-[12px] font-medium text-gray-700">
                {companyName || fullName}
              </span>
            </div>
            <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z" />
            </svg>
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
              {/* Account header */}
              <div className="px-4 py-3 border-b border-gray-100">
                {user?.atheisNumber && (
                  <AtheisId number={user.atheisNumber} size="sm" />
                )}
                <p className="mt-0.5 text-[13px] font-semibold text-gray-900">
                  {companyName || fullName}
                </p>
                <p className="text-[11px] text-gray-400">{user?.email}</p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button className="flex w-full items-center gap-2.5 px-4 py-2 text-[12px] text-gray-700 hover:bg-gray-50">
                  <span>⚙️</span> Paramètres
                </button>
                <button className="flex w-full items-center gap-2.5 px-4 py-2 text-[12px] text-gray-700 hover:bg-gray-50">
                  <span>🔒</span> Sécurité
                </button>
                {user?.plan && (
                  <button className="flex w-full items-center gap-2.5 px-4 py-2 text-[12px] text-gray-700 hover:bg-gray-50">
                    <span>📋</span> Mon forfait : {user.plan}
                  </button>
                )}
              </div>

              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={() => { setOpen(false); void logout() }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-[12px] text-red-600 hover:bg-red-50"
                >
                  <span>🚪</span> Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
