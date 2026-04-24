import { useAuth } from '@/features/auth/useAuth'
import { getFlagEmoji } from '@athenis/shared-types'

export function Topbar() {
  const { user, logout } = useAuth()
  const displayName = user?.email ?? ''
  const initial = displayName.charAt(0).toUpperCase() || '?'

  const showLocale = user?.accountType === 'COMPANY' && user.country && user.currencySymbol

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

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-100 text-sm font-semibold text-forest-700">
            {initial}
          </div>
          <span className="hidden text-sm font-medium text-gray-700 sm:block max-w-[160px] truncate">
            {displayName}
          </span>
        </div>

        <button
          onClick={() => void logout()}
          className="ml-1 text-xs text-gray-400 transition-colors hover:text-gray-600"
        >
          Déconnexion
        </button>
      </div>
    </header>
  )
}
