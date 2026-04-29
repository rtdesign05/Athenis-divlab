import { api } from '@/lib/api'
import type { JwtPayload } from '@athenis/shared-types'

export interface LoginData {
  accessToken?: string
  /** Backend field name — true when TOTP is required before full login */
  requiresTotp?: boolean
  tempToken?: string
  user?: UserProfile
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

  refresh: () =>
    api.post<ApiWrap<{ accessToken: string }>>('/auth/refresh'),

  logout: () =>
    api.post('/auth/logout'),

  register: (data: unknown) =>
    api.post<ApiWrap<LoginData>>('/auth/register', data),
}
