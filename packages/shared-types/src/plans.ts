import type { Plan, Module } from './user.js'

export const PLAN_MODULES: Record<Plan, Module[]> = {
  FREE: ['gestion'],
  STARTER: ['gestion', 'rh'],
  PRO: ['gestion', 'rh', 'comptabilite', 'juridique'],
  PREMIUM: ['gestion', 'rh', 'comptabilite', 'juridique', 'esg'],
}

export interface PlanLimits {
  maxUsers: number | null
  maxInvoicesPerMonth: number | null
  maxClients: number | null
  exportPdf: boolean
  exportExcel: boolean
  apiAccess: boolean
  requires2FA: boolean
  auditLog: boolean
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxUsers: 1,
    maxInvoicesPerMonth: 5,
    maxClients: 3,
    exportPdf: false,
    exportExcel: false,
    apiAccess: false,
    requires2FA: false,
    auditLog: false,
  },
  STARTER: {
    maxUsers: 3,
    maxInvoicesPerMonth: null,
    maxClients: null,
    exportPdf: true,
    exportExcel: false,
    apiAccess: false,
    requires2FA: false,
    auditLog: false,
  },
  PRO: {
    maxUsers: 5,
    maxInvoicesPerMonth: null,
    maxClients: null,
    exportPdf: true,
    exportExcel: true,
    apiAccess: false,
    requires2FA: true,
    auditLog: true,
  },
  PREMIUM: {
    maxUsers: null,
    maxInvoicesPerMonth: null,
    maxClients: null,
    exportPdf: true,
    exportExcel: true,
    apiAccess: true,
    requires2FA: true,
    auditLog: true,
  },
}

export interface PlanInfo {
  plan: Plan
  label: string
  price: number
  description: string
  modules: Module[]
  limits: PlanLimits
}

export const PLAN_INFO: PlanInfo[] = [
  {
    plan: 'FREE',
    label: 'Gratuit',
    price: 0,
    description: 'Pour démarrer simplement',
    modules: PLAN_MODULES.FREE,
    limits: PLAN_LIMITS.FREE,
  },
  {
    plan: 'STARTER',
    label: 'Starter',
    price: 19,
    description: 'Pour les petites structures',
    modules: PLAN_MODULES.STARTER,
    limits: PLAN_LIMITS.STARTER,
  },
  {
    plan: 'PRO',
    label: 'Pro',
    price: 49,
    description: 'Pour les PME en croissance',
    modules: PLAN_MODULES.PRO,
    limits: PLAN_LIMITS.PRO,
  },
  {
    plan: 'PREMIUM',
    label: 'Premium',
    price: 99,
    description: 'Pour les entreprises et cabinets',
    modules: PLAN_MODULES.PREMIUM,
    limits: PLAN_LIMITS.PREMIUM,
  },
]
