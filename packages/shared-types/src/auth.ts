import type { AccountType, UserRole, Plan, Module, UserProfile } from './user.js'

export type PermissionLevel = 'none' | 'read' | 'write' | 'admin'

export interface RolePermissions {
  gestion:      PermissionLevel
  comptabilite: PermissionLevel
  rh:           PermissionLevel
  juridique:    PermissionLevel
  esg:          PermissionLevel
  fiscalite?:   PermissionLevel
  settings:     PermissionLevel
}

export interface JwtPayload {
  sub: string
  email: string
  accountType: AccountType
  role: UserRole
  /** Rôle plateforme — null sur les anciens tokens, 'SUPER_ADMIN' pour les opérateurs */
  platformRole?: 'USER' | 'SUPER_ADMIN' | null
  companyId: string | null
  cabinetId: string | null
  plan: Plan | null
  modules: Module[]
  /** Permissions individuelles par module (depuis CompanyMember.role.permissions).
   *  Surcharge MODULE_ROLE_ACCESS[role] dans checkModule middleware. */
  permissions?: Partial<RolePermissions> | null
  country?: string | null
  currencySymbol?: string | null
  atheisNumber?: string | null
  agenceId?: string | null
  agenceNom?: string | null
  /** IDs des agences auxquelles l'utilisateur est rattaché ([] = accès à toutes) */
  agenceIds: string[]
  /** true → l'utilisateur ne voit que ses agences rattachées */
  isRestricted: boolean
  /** Impersonation : si défini, c'est l'ID du SUPER_ADMIN qui agit en tant
   *  que cet user. Présent uniquement sur les tokens issus de
   *  POST /admin/users/:id/impersonate. Permet d'auditer toutes les actions
   *  sous cet alias et d'afficher un banner UI. */
  impersonatedBy?: string | null
  /** Email du SUPER_ADMIN qui impersonne (pour affichage UI) */
  impersonatorEmail?: string | null
  iat?: number
  exp?: number
}

// ── Registration ──────────────────────────────────────────────────────────────

export interface RegisterPersonalRequest {
  accountType: 'PERSONAL'
  email: string
  password: string
  firstName?: string
  lastName?: string
  country?: string
}

export interface RegisterCompanyRequest {
  accountType: 'COMPANY'
  email: string
  password: string
  firstName?: string
  lastName?: string
  companyName: string
  siren?: string
  niu?: string
  secteur?: string
  taille?: 'TPE' | 'PME' | 'ETI' | 'GE'
  plan?: Plan
  country?: string
}

export interface RegisterCabinetRequest {
  accountType: 'CABINET'
  email: string
  password: string
  firstName?: string
  lastName?: string
  cabinetName: string
  siret?: string
  niu?: string
  country?: string
}

export type RegisterRequest =
  | RegisterPersonalRequest
  | RegisterCompanyRequest
  | RegisterCabinetRequest

export interface RegisterResponse {
  accessToken: string
  user: UserProfile
}

// ── Login ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: UserProfile
  requiresTotp?: boolean
  tempToken?: string
}

export interface RefreshTokenResponse {
  accessToken: string
}

// ── TOTP ──────────────────────────────────────────────────────────────────────

export interface TotpSetupResponse {
  secret: string
  otpauthUrl: string
  qrCodeDataUrl: string
}

export interface TotpVerifyRequest {
  tempToken: string
  code: string
}

export interface TotpVerifyResponse {
  enabled: boolean
  backupCodes: string[]
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
