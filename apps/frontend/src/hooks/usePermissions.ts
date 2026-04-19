import { useAuth } from './useAuth'
import type { Module, UserRole, AccountType, Plan } from '@athenis/shared-types'

export interface Permissions {
  canAccessModule: (module: Module) => boolean
  hasRole: (...roles: UserRole[]) => boolean
  isPersonal: boolean
  isCompany: boolean
  isCabinet: boolean
  accountType: AccountType | null
  plan: Plan | null
  modules: Module[]
  companyId: string | null
  cabinetId: string | null
}

export function usePermissions(): Permissions {
  const { user } = useAuth()

  return {
    canAccessModule: (module: Module) => user?.modules.includes(module) ?? false,
    hasRole: (...roles: UserRole[]) => !!user && roles.includes(user.role as UserRole),
    isPersonal: user?.accountType === 'PERSONAL',
    isCompany: user?.accountType === 'COMPANY',
    isCabinet: user?.accountType === 'CABINET',
    accountType: (user?.accountType as AccountType) ?? null,
    plan: (user?.plan as Plan) ?? null,
    modules: (user?.modules as Module[]) ?? [],
    companyId: user?.companyId ?? null,
    cabinetId: user?.cabinetId ?? null,
  }
}
