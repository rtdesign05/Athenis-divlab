import { NavLink } from 'react-router-dom'

export interface Tab {
  label: string
  to: string
  end?: boolean
}

interface TabBarProps {
  tabs: readonly Tab[]
}

export function TabBar({ tabs }: TabBarProps) {
  return (
    <div className="flex overflow-x-auto border-b border-gray-200 bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end ?? false}
          className={({ isActive }) =>
            `shrink-0 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? 'border-forest-900 text-forest-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  )
}
