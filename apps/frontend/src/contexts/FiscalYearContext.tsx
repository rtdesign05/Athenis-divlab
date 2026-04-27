import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/useAuth'

interface FiscalYearContextValue {
  selectedYear:    number
  setSelectedYear: (year: number) => void
}

export const FiscalYearContext = createContext<FiscalYearContextValue | null>(null)

export function FiscalYearProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const companyId = user?.companyId ?? 'default'
  const userId    = user?.sub ?? 'anon'
  const key = `athenis_fy_${userId}_${companyId}`

  const [selectedYear, setSelectedYearState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) return parseInt(stored, 10)
    } catch { /* ignore */ }
    return new Date().getFullYear()
  })

  const setSelectedYear = useCallback((year: number) => {
    try { localStorage.setItem(key, String(year)) } catch { /* ignore */ }
    setSelectedYearState(year)
  }, [key])

  return (
    <FiscalYearContext.Provider value={{ selectedYear, setSelectedYear }}>
      {children}
    </FiscalYearContext.Provider>
  )
}

export function useFiscalYear() {
  const ctx = useContext(FiscalYearContext)
  if (!ctx) throw new Error('useFiscalYear must be used within FiscalYearProvider')
  return ctx
}
