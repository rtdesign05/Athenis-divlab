export type AccountType = 'PERSONAL' | 'COMPANY' | 'CABINET'

export type UserRole = 'ADMIN' | 'COMPTABLE' | 'READONLY' | 'RH' | 'JURIDIQUE'

export type Plan = 'FREE' | 'STARTER' | 'PRO' | 'PREMIUM'

export type CompanySize = 'TPE' | 'PME' | 'ETI' | 'GE'

export type MandatType = 'COMPLET' | 'COMPTABILITE' | 'GESTION' | 'DECLARATIONS'

export type Module = 'gestion' | 'rh' | 'comptabilite' | 'juridique' | 'esg' | 'fiscalite'

export interface UserProfile {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  accountType: AccountType
  role: UserRole
  companyId: string | null
  cabinetId: string | null
  plan: Plan | null
  modules: Module[]
  totpEnabled: boolean
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  atheisNumber: string | null
}

export interface CompanyProfile {
  id: string
  name: string
  siren: string | null
  secteur: string | null
  taille: CompanySize
  plan: Plan
  modules: Module[]
  cabinetId: string | null
}

export interface CabinetProfile {
  id: string
  name: string
  siret: string | null
}

export interface MandatProfile {
  id: string
  cabinetId: string
  companyId: string
  company: Pick<CompanyProfile, 'id' | 'name' | 'siren'>
  type: MandatType
  modules: Module[]
  actif: boolean
}

export interface UpdateProfileRequest {
  firstName?: string
  lastName?: string
  email?: string
}
