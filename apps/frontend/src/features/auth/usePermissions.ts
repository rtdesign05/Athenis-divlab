import { useAuth } from './useAuth'
import type { Module } from '@athenis/shared-types'

export function usePermissions() {
  const { user } = useAuth()

  return {
    canAccessModule: (module: Module): boolean =>
      (user?.modules as Module[] | undefined)?.includes(module) ?? false,
    hasRole: (...roles: string[]): boolean =>
      user != null && roles.includes(user.role),
    isPersonal: user?.accountType === 'PERSONAL',
    isCompany: user?.accountType === 'COMPANY',
    isCabinet: user?.accountType === 'CABINET',
    plan: user?.plan ?? null,
    modules: (user?.modules ?? []) as Module[],
    companyId: user?.companyId ?? null,
    cabinetId: user?.cabinetId ?? null,
    role: user?.role ?? null,
  }
}
