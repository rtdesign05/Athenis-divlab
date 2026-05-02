import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { tokenStore } from '@/lib/tokenStore'
import { authApi } from './authApi'
import type { JwtPayload, RegisterRequest } from '@athenis/shared-types'

export interface AuthContextValue {
  user: JwtPayload | null
  isLoading: boolean
  /** True when a cabinet user is viewing a company's space */
  isViewingAsCompany: boolean
  /** Name of the company being viewed (only set in cabinet view mode) */
  companyViewName: string | null
  login: (
    email: string,
    password: string,
  ) => Promise<{ requires2fa: boolean; tempToken: string | null; user: import('@athenis/shared-types').JwtPayload | null }>
  loginVerifyTotp: (tempToken: string, code: string) => Promise<void>
  register: (data: RegisterRequest) => Promise<{ requiresEmailVerification: boolean }>
  logout: () => Promise<void>
  setToken: (token: string) => void
  /** Cabinet switches to view a company: swaps the active token, stores the cabinet token */
  enterCompanyView: (viewToken: string, companyName: string) => void
  /** Returns from company view back to cabinet space */
  exitCompanyView: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function decodeJwt(token: string): JwtPayload | null {
  try {
    const segment = token.split('.')[1]
    if (!segment) return null
    const bytes = Uint8Array.from(atob(segment.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as JwtPayload
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                 = useState<JwtPayload | null>(null)
  const [isLoading, setIsLoading]       = useState(true)
  const [companyViewName, setCompanyViewName] = useState<string | null>(null)

  // Cabinet token saved while viewing a company — stored in a ref so it
  // doesn't trigger re-renders and survives callback recreation
  const savedCabinetToken = useRef<string | null>(null)

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
      const { accessToken, requiresTotp, tempToken } = res.data.data
      const requires2fa = requiresTotp ?? false
      if (!requires2fa && accessToken) setToken(accessToken)
      const decodedUser = accessToken ? decodeJwt(accessToken) : null
      return { requires2fa, tempToken: tempToken ?? null, user: decodedUser }
    },
    [setToken],
  )

  const loginVerifyTotp = useCallback(
    async (tempToken: string, code: string) => {
      const res = await authApi.loginTotp(tempToken, code)
      if (res.data.data.accessToken) setToken(res.data.data.accessToken)
    },
    [setToken],
  )

  const register = useCallback(
    async (data: RegisterRequest) => {
      const res = await authApi.register(data)
      const { accessToken, requiresEmailVerification } = res.data.data
      if (accessToken) setToken(accessToken)
      return { requiresEmailVerification: requiresEmailVerification ?? false }
    },
    [setToken],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore
    }
    savedCabinetToken.current = null
    setCompanyViewName(null)
    tokenStore.set(null)
    setUser(null)
  }, [])

  // Cabinet view mode ─────────────────────────────────────────────────────────

  const enterCompanyView = useCallback(
    (viewToken: string, companyName: string) => {
      savedCabinetToken.current = tokenStore.get() // save current cabinet token
      setCompanyViewName(companyName)
      setToken(viewToken)
    },
    [setToken],
  )

  const exitCompanyView = useCallback(() => {
    const cabinetToken = savedCabinetToken.current
    if (cabinetToken) {
      savedCabinetToken.current = null
      setCompanyViewName(null)
      setToken(cabinetToken)
    }
  }, [setToken])

  // Derived flag: we are in cabinet view mode when the active JWT has
  // accountType=COMPANY AND cabinetId set (cabinet token keeps cabinetId)
  const isViewingAsCompany =
    user?.accountType === 'COMPANY' && user?.cabinetId != null

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isViewingAsCompany,
        companyViewName,
        login,
        loginVerifyTotp,
        register,
        logout,
        setToken,
        enterCompanyView,
        exitCompanyView,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
