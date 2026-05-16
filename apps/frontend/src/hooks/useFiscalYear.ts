import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingApi } from '@/services/accountingApi'
import { useFiscalYear } from '@/contexts/FiscalYearContext'

export function useFiscalYears() {
  return useQuery({
    queryKey: ['fiscal-years'],
    queryFn:  () => accountingApi.listFiscalYears(),
    staleTime: 30_000,
  })
}

export function useSelectedFiscalYearData() {
  const { selectedYear } = useFiscalYear()
  const { data: years } = useFiscalYears()
  return years?.find(y => y.year === selectedYear) ?? null
}

export function useFiscalYearGuard() {
  const fy = useSelectedFiscalYearData()
  return {
    isReadOnly: fy?.status === 'CLOSED' || fy?.status === 'LOCKED',
    status:     fy?.status ?? 'OPEN',
  }
}

export function useCreateFiscalYear() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { year: number; startDate?: string; endDate?: string }) =>
      accountingApi.createFiscalYear(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fiscal-years'] }),
  })
}

export function useCloseFiscalYear() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => accountingApi.closeFiscalYear(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['fiscal-years'] })
      qc.invalidateQueries({ queryKey: ['accounting'] })
    },
  })
}

export function useLockFiscalYear() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => accountingApi.lockFiscalYear(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['fiscal-years'] }),
  })
}

export function useReopenFiscalYear() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => accountingApi.reopenFiscalYear(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['fiscal-years'] })
      qc.invalidateQueries({ queryKey: ['journal'] })
      qc.invalidateQueries({ queryKey: ['balance-journal'] })
    },
  })
}

export function useGenerateOpeningEntries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => accountingApi.generateOpeningEntries(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['journal'] })
      qc.invalidateQueries({ queryKey: ['balance-journal'] })
      qc.invalidateQueries({ queryKey: ['grand-livre-journal'] })
      qc.invalidateQueries({ queryKey: ['financial-statements'] })
    },
  })
}

export function useCanCreateFiscalYear() {
  const { data: years = [] } = useFiscalYears()
  const openCount = years.filter(y => y.status === 'OPEN').length
  const canCreate = openCount < 2
  const oldestOpen = years.filter(y => y.status === 'OPEN').sort((a, b) => a.year - b.year)[0]
  return {
    canCreate,
    blockingMessage: canCreate ? null :
      `Maximum 2 exercices ouverts simultan\xe9ment. Cl\xf4turez l\u2019exercice ${oldestOpen?.year ?? ''} avant d\u2019en cr\xe9er un nouveau.`,
    oldestOpenYear: oldestOpen?.year ?? null,
  }
}

export function useInvalidateAccounting() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['journal'] })
    qc.invalidateQueries({ queryKey: ['balance-journal'] })
    qc.invalidateQueries({ queryKey: ['grand-livre-journal'] })
    qc.invalidateQueries({ queryKey: ['financial-statements'] })
    qc.invalidateQueries({ queryKey: ['etats-financiers'] })
    qc.invalidateQueries({ queryKey: ['comptes'] })
  }
}
