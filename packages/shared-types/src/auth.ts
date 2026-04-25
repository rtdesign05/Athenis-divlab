import type { AccountType, UserRole, Plan, Module, UserProfile } from './user.js'

export interface JwtPayload {
  sub: string
  email: string
  accountType: AccountType
  role: UserRole
  companyId: string | null
  cabinetId: string | null
  plan: Plan | null
  modules: Module[]
  country?: string | null
  currencySymbol?: string | null
  atheisNumber?: string | null
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
}

export interface RegisterCompanyRequest {
  accountType: 'COMPANY'
  email: string
  password: string
  firstName?: string
  lastName?: string
  companyName: string
  siren?: string
  secteur?: string
  taille?: 'TPE' | 'PME' | 'ETI' | 'GE'
  plan: Plan
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
