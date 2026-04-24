import { useAuth } from './useAuth'
import type { Module } from '@athenis/shared-types'

const MODULE_ORDER: readonly Module[] = ['gestion', 'comptabilite', 'rh', 'juridique', 'esg', 'fiscalite']

export function usePermissions() {
  const { user } = useAuth()
  const userModules = (user?.modules ?? []) as Module[]

  return {
    canAccessModule: (module: Module): boolean => userModules.includes(module),
    hasRole: (...roles: string[]): boolean =>
      user != null && roles.includes(user.role),
    isPersonal: user?.accountType === 'PERSONAL',
    isCompany: user?.accountType === 'COMPANY',
    isCabinet: user?.accountType === 'CABINET',
    plan: user?.plan ?? null,
    modules: userModules,
    getVisibleModules: (): Module[] =>
      MODULE_ORDER.filter((m) => userModules.includes(m)),
    companyId: user?.companyId ?? null,
    cabinetId: user?.cabinetId ?? null,
    role: user?.role ?? null,
  }
}
