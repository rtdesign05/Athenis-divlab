import { NavLink } from 'react-router-dom'
import { usePermissions } from '@/features/auth/usePermissions'
import type { Module } from '@athenis/shared-types'

interface ModuleTab {
  key: Module
  label: string
  icon: string
  path: string
}

const ALL_TABS: readonly ModuleTab[] = [
  { key: 'gestion',      label: 'Gestion',      icon: '📄', path: '/app/gestion' },
  { key: 'comptabilite', label: 'Comptabilité',  icon: '📊', path: '/app/accounting' },
  { key: 'rh',           label: 'RH',           icon: '👥', path: '/app/hr' },
  { key: 'juridique',    label: 'Juridique',     icon: '⚖️', path: '/app/legal' },
  { key: 'esg',          label: 'ESG',           icon: '🌿', path: '/app/esg' },
  { key: 'fiscalite',    label: 'Fiscalité',     icon: '🏛️', path: '/app/fiscal' },
]

const tabCls = ({ isActive }: { isActive: boolean }) =>
  `flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors duration-150 whitespace-nowrap -mb-px ${
    isActive
      ? 'border-[#1b4332] text-[#1b4332]'
      : 'border-transparent text-slate-500 hover:bg-gray-50 hover:text-slate-800'
  }`

export function ModuleTabBar() {
  const { modules } = usePermissions()
  const visible = ALL_TABS.filter((t) => modules.includes(t.key))

  return (
    <div className="flex h-12 shrink-0 items-stretch border-b border-slate-200 bg-white px-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {visible.map((tab) => (
        <NavLink key={tab.key} to={tab.path} className={tabCls}>
          <span className="text-base leading-none">{tab.icon}</span>
          <span className="hidden sm:inline">{tab.label}</span>
        </NavLink>
      ))}

      {/* Settings — visible for all plans */}
      <div className="ml-auto flex items-stretch">
        <NavLink to="/app/settings" className={tabCls}>
          <span className="text-base leading-none">⚙️</span>
          <span className="hidden sm:inline">Paramètres</span>
        </NavLink>
      </div>
    </div>
  )
}
