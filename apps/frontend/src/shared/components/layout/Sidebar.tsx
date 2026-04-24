import { NavLink } from 'react-router-dom'
import { cn } from '@/shared/utils/cn'
import { useAuth } from '@/features/auth/useAuth'
import { usePermissions } from '@/features/auth/usePermissions'
import { APP_NAV_SECTIONS, CABINET_NAV_ITEMS, PERSONAL_NAV_ITEMS, type NavItem } from '@/config/navigation'

interface SidebarProps {
  variant?: 'app' | 'personal' | 'cabinet'
}

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.path}
      end={item.end ?? false}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-white/20 text-white'
            : 'text-forest-200 hover:bg-white/10 hover:text-white',
        )
      }
    >
      <span className="text-base leading-none w-5 text-center shrink-0">{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  )
}

export function Sidebar({ variant = 'app' }: SidebarProps) {
  const { user, logout } = useAuth()
  const { canAccessModule } = usePermissions()

  const displayName = user?.email ?? ''
  const roleLabel = user?.role ?? ''
  const planLabel = user?.plan ?? (user?.accountType === 'CABINET' ? 'CABINET' : '')

  const navContent =
    variant === 'app' ? (
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5 scrollbar-thin">
        {APP_NAV_SECTIONS.filter((s) => canAccessModule(s.module)).map((section) => (
          <div key={section.module}>
            <p className="px-3 mb-1 text-[10px] font-semibold text-forest-400 uppercase tracking-widest">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItemLink key={item.path} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    ) : variant === 'cabinet' ? (
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {CABINET_NAV_ITEMS.map((item) => (
          <NavItemLink key={item.path} item={item} />
        ))}
      </nav>
    ) : (
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {PERSONAL_NAV_ITEMS.map((item) => (
          <NavItemLink key={item.path} item={item} />
        ))}
      </nav>
    )

  return (
    <aside className="w-60 bg-forest-900 text-white flex flex-col shrink-0 h-full">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-forest-800 shrink-0">
        <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center text-forest-900 font-bold text-base shrink-0">
          A
        </div>
        <span className="font-semibold text-base tracking-tight">Athenis</span>
      </div>

      {navContent}

      {/* User footer */}
      <div className="px-4 py-4 border-t border-forest-800 shrink-0">
        <div className="text-sm font-medium text-white truncate">{displayName}</div>
        <div className="text-xs text-forest-400 mt-0.5 truncate">
          {[roleLabel, planLabel].filter(Boolean).join(' · ')}
        </div>
        <button
          onClick={() => void logout()}
          className="mt-3 text-xs text-forest-300 hover:text-white transition-colors flex items-center gap-1"
        >
          <span>Se déconnecter</span>
          <span aria-hidden>→</span>
        </button>
      </div>
    </aside>
  )
}
