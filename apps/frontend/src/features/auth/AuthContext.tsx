import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { tokenStore } from '@/lib/tokenStore'
import { authApi } from './authApi'
import type { JwtPayload } from '@athenis/shared-types'

export interface AuthContextValue {
  user: JwtPayload | null
  isLoading: boolean
  login: (
    email: string,
    password: string,
  ) => Promise<{ requires2fa: boolean; tempToken: string | null; accountType: string | null }>
  loginVerifyTotp: (tempToken: string, code: string) => Promise<void>
  logout: () => Promise<void>
  setToken: (token: string) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function decodeJwt(token: string): JwtPayload | null {
  try {
    const segment = token.split('.')[1]
    if (!segment) return null
    return JSON.parse(
      atob(segment.replace(/-/g, '+').replace(/_/g, '/')),
    ) as JwtPayload
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const setToken = useCallback((token: string) => {
    tokenStore.set(token)
    setUser(decodeJwt(token))
  }, [])

  // Silent refresh on mount — relies on httpOnly refresh cookie
  useEffect(() => {
    authApi
      .refresh()
      .then((res) => setToken(res.data.data.accessToken))
      .catch(() => {
        tokenStore.set(null)
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [setToken])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password)
      const { accessToken, requires2fa, tempToken } = res.data.data
      if (!requires2fa && accessToken) setToken(accessToken)
      const accountType = decodeJwt(accessToken)?.accountType ?? null
      return { requires2fa, tempToken: tempToken ?? null, accountType }
    },
    [setToken],
  )

  const loginVerifyTotp = useCallback(
    async (tempToken: string, code: string) => {
      const res = await authApi.loginTotp(tempToken, code)
      setToken(res.data.data.accessToken)
    },
    [setToken],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore — server may already have revoked the token
    }
    tokenStore.set(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginVerifyTotp, logout, setToken }}>
      {children}
    </AuthContext.Provider>
  )
}
