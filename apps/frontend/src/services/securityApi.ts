import { api } from '@/lib/api'

export interface TotpSetup {
  secret: string
  otpauthUrl: string
  qrCodeDataUrl: string
}

const d = <T>(r: { data: { data: T } }) => r.data.data

export const securityApi = {
  totpStatus:      ()                                       => api.get<{ data: { enabled: boolean } }>('/auth/totp/status').then(d),
  totpSetup:       ()                                       => api.post<{ data: TotpSetup }>('/auth/totp/setup').then(d),
  totpEnable:      (code: string)                           => api.post<{ data: { enabled: boolean; backupCodes: string[] } }>('/auth/totp/enable', { code }).then(d),
  totpDisable:     (password: string, code: string)         => api.post('/auth/totp/disable', { password, code }).then(() => undefined),
  changePassword:  (currentPassword: string, newPassword: string) =>
    api.post('/auth/password', { currentPassword, newPassword }),
}
