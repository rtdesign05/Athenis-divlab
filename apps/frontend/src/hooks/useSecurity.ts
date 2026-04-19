import { useMutation } from '@tanstack/react-query'
import { securityApi } from '@/services/securityApi'

export function useTotpSetup() {
  return useMutation({ mutationFn: securityApi.totpSetup })
}

export function useTotpEnable() {
  return useMutation({ mutationFn: (code: string) => securityApi.totpEnable(code) })
}

export function useTotpDisable() {
  return useMutation({
    mutationFn: ({ password, code }: { password: string; code: string }) =>
      securityApi.totpDisable(password, code),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      securityApi.changePassword(currentPassword, newPassword),
  })
}
