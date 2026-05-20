import { api } from '@/lib/api'

export interface TotpSetup {
  secret: string
  otpauthUrl: string
  qrCodeDataUrl: string
}

const d = <T>(r: { data: { data: T } }) => r.data.data

export type MfaMethod = 'NONE' | 'TOTP' | 'EMAIL' | 'SMS'

export interface MfaStatus {
  enabled:        boolean
  method:         MfaMethod
  maskedPhone:    string | null
  maskedEmail:    string | null
  smsConfigured:  boolean
}

export const securityApi = {
  // Legacy TOTP (utilisé par le flow setup avec QR code)
  totpStatus:      ()                                       => api.get<{ data: { enabled: boolean } }>('/auth/totp/status').then(d),
  totpSetup:       ()                                       => api.post<{ data: TotpSetup }>('/auth/totp/setup').then(d),
  totpEnable:      (code: string)                           => api.post<{ data: { enabled: boolean; backupCodes: string[] } }>('/auth/totp/enable', { code }).then(d),
  totpDisable:     (password: string, code: string)         => api.post('/auth/totp/disable', { password, code }).then(() => undefined),
  // MFA multi-méthode (EMAIL / SMS / TOTP)
  mfaStatus:       ()                                       => api.get<{ data: MfaStatus }>('/auth/mfa/status').then(d),
  setupEmailMfa:   ()                                       => api.post<{ data: { maskedEmail: string } }>('/auth/mfa/setup/email').then(d),
  setupSmsMfa:     (phone: string)                          => api.post<{ data: { maskedPhone: string; smsConfigured: boolean } }>('/auth/mfa/setup/sms', { phone }).then(d),
  verifyMfaSetup:  (method: 'EMAIL' | 'SMS', code: string)  => api.post<{ data: { enabled: true; backupCodes: string[] } }>('/auth/mfa/setup/verify', { method, code }).then(d),
  disableMfa:      (password: string, code: string)         => api.post('/auth/mfa/disable', { password, code }).then(() => undefined),
  sendMfaCode:     ()                                       => api.post<{ data: { method: 'EMAIL' | 'SMS'; maskedTarget: string } }>('/auth/mfa/send-code').then(d),
  changePassword:  (currentPassword: string, newPassword: string) =>
    api.post('/auth/password', { currentPassword, newPassword }),
}
