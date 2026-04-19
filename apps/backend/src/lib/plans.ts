import type { Plan, Module, AccountType } from '@athenis/shared-types'
import { prisma } from './prisma.js'

export const PLAN_MODULES: Record<Plan, Module[]> = {
  FREE: ['gestion'],
  STARTER: ['gestion', 'rh'],
  PRO: ['gestion', 'rh', 'comptabilite', 'juridique'],
  PREMIUM: ['gestion', 'rh', 'comptabilite', 'juridique', 'esg'],
}

export type Action = 'read' | 'write' | 'delete'

/** Role → module → allowed actions */
export const MODULE_ROLE_ACCESS: Record<string, Record<Module, Action[]>> = {
  ADMIN: {
    gestion: ['read', 'write', 'delete'],
    rh: ['read', 'write', 'delete'],
    comptabilite: ['read', 'write', 'delete'],
    juridique: ['read', 'write', 'delete'],
    esg: ['read', 'write', 'delete'],
  },
  COMPTABLE: {
    gestion: ['read', 'write'],
    rh: ['read'],
    comptabilite: ['read', 'write', 'delete'],
    juridique: ['read'],
    esg: ['read'],
  },
  READONLY: {
    gestion: ['read'],
    rh: ['read'],
    comptabilite: ['read'],
    juridique: ['read'],
    esg: ['read'],
  },
  RH: {
    gestion: ['read'],
    rh: ['read', 'write', 'delete'],
    comptabilite: ['read'],
    juridique: ['read'],
    esg: ['read'],
  },
  JURIDIQUE: {
    gestion: ['read'],
    rh: ['read'],
    comptabilite: ['read'],
    juridique: ['read', 'write', 'delete'],
    esg: ['read'],
  },
}

/** Returns the effective plan for a user based on their account type */
export async function getEffectivePlan(
  accountType: AccountType,
  companyId: string | null,
): Promise<Plan | null> {
  if (accountType === 'PERSONAL') return null
  if (accountType === 'CABINET') return 'PREMIUM'
  if (companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    })
    return (company?.plan as Plan) ?? 'FREE'
  }
  return null
}

/** Returns the effective modules for a user */
export async function getEffectiveModules(
  accountType: AccountType,
  companyId: string | null,
): Promise<Module[]> {
  if (accountType === 'PERSONAL') return []
  if (accountType === 'CABINET') return PLAN_MODULES['PREMIUM']
  if (companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { modules: true },
    })
    return (company?.modules ?? []) as Module[]
  }
  return []
}

/** Default modules when creating a company on a given plan */
export function getDefaultModules(plan: Plan): Module[] {
  return PLAN_MODULES[plan]
}
