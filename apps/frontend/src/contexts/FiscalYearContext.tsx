import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { accountingApi } from '@/services/accountingApi'

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

  // ── Auto-correction de l'année sélectionnée ────────────────────────────────
  // Si l'année stockée n'existe pas dans la société courante (changement de
  // société, FY supprimée, démo, etc.), bascule automatiquement sur l'exercice
  // OPEN couvrant la date du jour, sinon le plus récent.
  const { data: years } = useQuery({
    queryKey: ['fiscal-years', companyId],
    queryFn:  () => accountingApi.listFiscalYears(),
    staleTime: 30_000,
    enabled:   !!user,
  })

  useEffect(() => {
    if (!years || years.length === 0) return
    const exists = years.some(y => y.year === selectedYear)
    if (exists) return  // l'année sélectionnée est valide
    // Bascule sur l'OPEN couvrant aujourd'hui, sinon le plus récent OPEN, sinon le plus récent
    const today = new Date()
    const openCovering = years.find(y =>
      y.status !== 'CLOSED' &&
      new Date(y.startDate) <= today &&
      new Date(y.endDate)   >= today,
    )
    const latestOpen   = [...years].filter(y => y.status !== 'CLOSED').sort((a, b) => b.year - a.year)[0]
    const latest       = [...years].sort((a, b) => b.year - a.year)[0]
    const target       = (openCovering ?? latestOpen ?? latest)?.year
    if (target && target !== selectedYear) setSelectedYear(target)
  }, [years, selectedYear, setSelectedYear])

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
