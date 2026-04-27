import { NavLink, useLocation } from 'react-router-dom'
import { CONTEXTUAL_TABS } from '@/config/navigation'

interface ContextualTabBarProps {
  rightSlot?: React.ReactNode
}

export function ContextualTabBar({ rightSlot }: ContextualTabBarProps) {
  const { pathname } = useLocation()

  const key = Object.keys(CONTEXTUAL_TABS)
    .filter((k) => pathname === k || pathname.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length)[0]

  const tabs = key ? CONTEXTUAL_TABS[key] : null
  if (!tabs) return null

  return (
    <div className="flex items-center bg-slate-100 px-4 py-1.5 gap-0.5 border-b border-slate-200">
      <div className="flex flex-1 overflow-x-auto gap-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end ?? false}
            className={({ isActive }) =>
              `shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-100 ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      {rightSlot && <div className="ml-2 shrink-0">{rightSlot}</div>}
    </div>
  )
}
