import { api } from '@/lib/api'
import type { JwtPayload } from '@athenis/shared-types'

export interface LoginData {
  accessToken?: string
  /** Backend field name — true when MFA (TOTP / EMAIL / SMS) is required before full login */
  requiresTotp?: boolean
  tempToken?: string
  /** Quelle méthode MFA est active sur le compte */
  mfaMethod?:   'TOTP' | 'EMAIL' | 'SMS'
  /** Pour EMAIL/SMS : cible masquée (ex: m••••5@gmail.com ou +237***567) — informatif pour l'UI */
  maskedTarget?: string | null
  user?: UserProfile
  requiresEmailVerification?: boolean
}

export interface UserProfile {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  accountType: JwtPayload['accountType']
  role: JwtPayload['role']
  companyId: string | null
  cabinetId: string | null
  plan: string | null
  modules: string[]
  totpEnabled: boolean
}

type ApiWrap<T> = { success: true; data: T }

export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiWrap<LoginData>>('/auth/login', { email, password }),

  loginTotp: (tempToken: string, code: string) =>
    api.post<ApiWrap<LoginData>>('/auth/login/2fa', { tempToken, code }),

  /** Vérifie un code EMAIL/SMS pendant le login (différent de TOTP) */
  loginMfaVerify: (tempToken: string, code: string) =>
    api.post<ApiWrap<LoginData>>('/auth/login/mfa/verify', { tempToken, code }),

  refresh: () =>
    api.post<ApiWrap<{ accessToken: string }>>('/auth/refresh'),

  logout: () =>
    api.post('/auth/logout'),

  register: (data: unknown) =>
    api.post<ApiWrap<LoginData>>('/auth/register', data),

  verifyEmail: (token: string) =>
    api.get<ApiWrap<LoginData>>('/auth/verify-email', { params: { token } }),

  resendVerification: (email: string) =>
    api.post<ApiWrap<null>>('/auth/resend-verification', { email }),

  /** Demande un email de réinitialisation. Toujours 200, ne révèle pas si l'email existe. */
  forgotPassword: (email: string) =>
    api.post<ApiWrap<null>>('/auth/forgot-password', { email }),

  /** Effectue la réinitialisation avec le token reçu par email. */
  resetPassword: (token: string, password: string) =>
    api.post<ApiWrap<null>>('/auth/reset-password', { token, password }),
}
