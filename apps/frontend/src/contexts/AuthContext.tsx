import { createContext, useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { tokenStore } from '@/lib/tokenStore'
import { queryClient } from '@/lib/queryClient'
import type { JwtPayload, LoginRequest, RegisterRequest } from '@athenis/shared-types'

export interface AuthContextValue {
  user: JwtPayload | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (dto: LoginRequest) => Promise<{ requiresTotp?: boolean; tempToken?: string | null }>
  loginVerifyTotp: (tempToken: string, code: string) => Promise<void>
  register: (dto: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  setToken: (token: string) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function decodeJwt(token: string): JwtPayload {
  const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/') ?? ''
  return JSON.parse(atob(base64)) as JwtPayload
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const setToken = useCallback((token: string) => {
    tokenStore.set(token)
    setUser(decodeJwt(token))
  }, [])

  const clearSession = useCallback(() => {
    tokenStore.set(null)
    setUser(null)
    queryClient.clear()
  }, [])

  // Silent token refresh on mount (uses httpOnly refresh cookie)
  useEffect(() => {
    api
      .post<{ success: true; data: { accessToken: string } }>('/auth/refresh')
      .then((res) => setToken(res.data.data.accessToken))
      .catch(() => clearSession())
      .finally(() => setIsLoading(false))
  }, [setToken, clearSession])

  const login = useCallback(
    async (dto: LoginRequest) => {
      const res = await api.post<{
        success: true
        data: { accessToken?: string; requiresTotp?: boolean; tempToken?: string }
      }>('/auth/login', dto)
      const data = res.data.data
      if (data.requiresTotp) return { requiresTotp: true, tempToken: data.tempToken ?? null }
      setToken(data.accessToken!)
      return { requiresTotp: false as const }
    },
    [setToken],
  )

  const loginVerifyTotp = useCallback(
    async (tempToken: string, code: string) => {
      const res = await api.post<{ success: true; data: { accessToken: string } }>('/auth/login/2fa', {
        tempToken,
        code,
      })
      setToken(res.data.data.accessToken)
    },
    [setToken],
  )

  const register = useCallback(
    async (dto: RegisterRequest) => {
      const res = await api.post<{ success: true; data: { accessToken: string } }>('/auth/register', dto)
      setToken(res.data.data.accessToken)
    },
    [setToken],
  )

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => void 0)
    clearSession()
  }, [clearSession])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginVerifyTotp,
        register,
        logout,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
