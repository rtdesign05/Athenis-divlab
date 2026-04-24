import { NavLink } from 'react-router-dom'

export interface SubTab {
  label: string
  to: string
  end?: boolean
}

interface SubTabBarProps {
  tabs: readonly SubTab[]
  rightSlot?: React.ReactNode
}

export function SubTabBar({ tabs, rightSlot }: SubTabBarProps) {
  return (
    <div className="flex items-center bg-slate-100 px-4 py-1.5 gap-0.5">
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
      {rightSlot != null && <div className="ml-2 flex-shrink-0">{rightSlot}</div>}
    </div>
  )
}
