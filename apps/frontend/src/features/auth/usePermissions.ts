import { useAuth } from './useAuth'
import type { Module, PermissionLevel, RolePermissions } from '@athenis/shared-types'

const MODULE_ORDER: readonly Module[] = ['gestion', 'comptabilite', 'rh', 'juridique', 'esg', 'fiscalite']

/**
 * Hook unique pour vérifier ce qu'un user peut voir ou faire.
 *
 * 3 sources d'autorisation :
 *   - `modules` : modules activés par le plan de la company (depuis JWT.modules)
 *   - `permissions` : niveau par module pour ce user spécifique
 *     ('none' | 'read' | 'write' | 'admin'). Si undefined → on retombe sur
 *     la matrice par rôle (côté backend).
 *   - `agenceIds + isRestricted` : restriction géographique (gérée backend)
 *
 * Un module est visible si :
 *   1. Il est dans le plan
 *   2. ET (pas de permissions définies OU permissions[module] !== 'none')
 */
export function usePermissions() {
  const { user } = useAuth()
  const userModules     = (user?.modules ?? []) as Module[]
  const perms           = (user?.permissions ?? null) as Partial<RolePermissions> | null

  const moduleVisible = (m: Module): boolean => {
    if (!userModules.includes(m)) return false
    if (!perms) return true                            // fallback : module dans le plan = OK
    const level = (perms as Record<string, PermissionLevel>)[m]
    if (level === undefined || level === null) return true
    return level !== 'none'
  }

  // Niveau effectif (PermissionLevel) pour un module donné.
  // Si non défini, retourne 'admin' (permission max = on délègue au backend
  // qui appliquera MODULE_ROLE_ACCESS[role]).
  const moduleLevel = (m: Module): PermissionLevel => {
    if (!perms) return 'admin'
    const lvl = (perms as Record<string, PermissionLevel>)[m]
    return (lvl ?? 'admin') as PermissionLevel
  }

  const canWrite  = (m: Module): boolean => {
    const lvl = moduleLevel(m)
    return lvl === 'write' || lvl === 'admin'
  }
  const canDelete = (m: Module): boolean => moduleLevel(m) === 'admin'

  return {
    canAccessModule: moduleVisible,
    canWrite,
    canDelete,
    moduleLevel,
    hasRole: (...roles: string[]): boolean =>
      user != null && roles.includes(user.role),
    isPersonal: user?.accountType === 'PERSONAL',
    isCompany:  user?.accountType === 'COMPANY',
    isCabinet:  user?.accountType === 'CABINET',
    plan:       user?.plan ?? null,
    modules:    MODULE_ORDER.filter(moduleVisible),         // ← seulement les modules visibles
    getVisibleModules: (): Module[] => MODULE_ORDER.filter(moduleVisible),
    companyId:  user?.companyId ?? null,
    cabinetId:  user?.cabinetId ?? null,
    role:       user?.role ?? null,
    isRestricted: user?.isRestricted ?? false,
    agenceIds:    user?.agenceIds ?? [],
  }
}
