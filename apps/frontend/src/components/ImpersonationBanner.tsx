/**
 * Banner sticky en haut de page quand un SUPER_ADMIN agit en tant qu'un user.
 * Visible sur toutes les pages tant que la session impersonation est active.
 *
 * Décoré en orange/rouge pour qu'on ne l'oublie JAMAIS. Toute action faite
 * dans cet état est tracée côté backend + le user impersonné a reçu un mail.
 */
import { useAuth } from '@/features/auth/useAuth'

export function ImpersonationBanner() {
  const { user, isImpersonating, stopImpersonation } = useAuth()

  if (!isImpersonating || !user) return null

  function handleStop() {
    stopImpersonation()
    // Hard nav vers /admin/users — pas besoin de useNavigate ici (le banner
    // est rendu hors du Router pour être global)
    window.location.href = '/admin/users'
  }

  return (
    <div className="sticky top-0 z-[200] bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg border-b border-orange-700">
      <div className="mx-auto max-w-7xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl animate-pulse">🎭</span>
          <div className="text-sm">
            <span className="font-bold">Mode admin — Vous agissez en tant que </span>
            <span className="font-mono bg-black/20 px-2 py-0.5 rounded text-xs">{user.email}</span>
            <span className="ml-2 hidden sm:inline opacity-90">
              ({user.accountType === 'PERSONAL' ? '👤 Personnel' :
                user.accountType === 'CABINET'  ? '⚖️ Cabinet' :
                                                   '🏢 Entreprise'})
            </span>
          </div>
        </div>
        <button
          onClick={handleStop}
          className="rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur px-3 py-1.5 text-xs font-semibold transition-colors border border-white/40"
        >
          ✕ Quitter ce mode
        </button>
      </div>
      <div className="bg-amber-900/30 text-amber-50 text-[10px] text-center py-1 px-4">
        ℹ️ Cette session expire dans 30 min. Toutes les actions sont tracées dans le journal d'audit + le user a reçu un email de notification.
      </div>
    </div>
  )
}
