import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fiscalApi } from '@/services/fiscalApi'
import type { TaxConfig } from '@/services/fiscalApi'

const FISCAL_KEYS = {
  dashboard:  (year: number) => ['fiscal', 'dashboard', year] as const,
  tva:        (year: number, month: number) => ['fiscal', 'tva', year, month] as const,
  tvaHistory: (year: number) => ['fiscal', 'tva-history', year] as const,
  dsf:        (year: number) => ['fiscal', 'dsf', year] as const,
  is:         (year: number) => ['fiscal', 'is', year] as const,
  patente:    (year: number) => ['fiscal', 'patente', year] as const,
  ras:        (year: number) => ['fiscal', 'ras', year] as const,
  cnps:       (year: number, month: number) => ['fiscal', 'cnps', year, month] as const,
  calendrier: (year: number) => ['fiscal', 'calendrier', year] as const,
  liasse:     (year: number) => ['fiscal', 'liasse', year] as const,
  config:     () => ['fiscal', 'config'] as const,
}

export function useFiscalDashboard(year: number) {
  return useQuery({
    queryKey: FISCAL_KEYS.dashboard(year),
    queryFn:  () => fiscalApi.dashboard(year),
    staleTime: 2 * 60_000,
  })
}

export function useTVADeclaration(year: number, month: number) {
  return useQuery({
    queryKey: FISCAL_KEYS.tva(year, month),
    queryFn:  () => fiscalApi.tva(year, month),
    staleTime: 60_000,
  })
}

export function useTVAHistory(year: number) {
  return useQuery({
    queryKey: FISCAL_KEYS.tvaHistory(year),
    queryFn:  () => fiscalApi.tvaHistory(year),
    staleTime: 2 * 60_000,
  })
}

export function useDeclareTVA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      fiscalApi.declareTVA(year, month),
    onSuccess: (_, { year, month }) => {
      void qc.invalidateQueries({ queryKey: FISCAL_KEYS.tva(year, month) })
      void qc.invalidateQueries({ queryKey: FISCAL_KEYS.tvaHistory(year) })
      void qc.invalidateQueries({ queryKey: FISCAL_KEYS.dashboard(year) })
    },
  })
}

export function useDSF(year: number) {
  return useQuery({
    queryKey: FISCAL_KEYS.dsf(year),
    queryFn:  () => fiscalApi.dsf(year),
    staleTime: 5 * 60_000,
  })
}

export function useIS(year: number) {
  return useQuery({
    queryKey: FISCAL_KEYS.is(year),
    queryFn:  () => fiscalApi.is(year),
    staleTime: 5 * 60_000,
  })
}

export function usePatente(year: number) {
  return useQuery({
    queryKey: FISCAL_KEYS.patente(year),
    queryFn:  () => fiscalApi.patente(year),
    staleTime: 10 * 60_000,
  })
}

export function useRAS(year: number) {
  return useQuery({
    queryKey: FISCAL_KEYS.ras(year),
    queryFn:  () => fiscalApi.ras(year),
    staleTime: 2 * 60_000,
  })
}

export function useCNPS(year: number, month: number) {
  return useQuery({
    queryKey: FISCAL_KEYS.cnps(year, month),
    queryFn:  () => fiscalApi.cnps(year, month),
    staleTime: 2 * 60_000,
  })
}

export function useCalendrier(year: number) {
  return useQuery({
    queryKey: FISCAL_KEYS.calendrier(year),
    queryFn:  () => fiscalApi.calendrier(year),
    staleTime: 5 * 60_000,
  })
}

export function useLiasse(year: number) {
  return useQuery({
    queryKey: FISCAL_KEYS.liasse(year),
    queryFn:  () => fiscalApi.liasse(year),
    staleTime: 5 * 60_000,
  })
}

export function useTaxConfig() {
  return useQuery({
    queryKey: FISCAL_KEYS.config(),
    queryFn:  fiscalApi.getConfig,
    staleTime: 10 * 60_000,
  })
}

export function useUpdateTaxConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<TaxConfig>) => fiscalApi.updateConfig(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: FISCAL_KEYS.config() })
    },
  })
}

export function useCompanyInfo() {
  return useQuery({
    queryKey: ['fiscal', 'company-info'] as const,
    queryFn:  fiscalApi.companyInfo,
    staleTime: 30 * 60_000,
  })
}

export function useISHistory() {
  return useQuery({
    queryKey: ['fiscal', 'is-history'] as const,
    queryFn:  fiscalApi.isHistory,
    staleTime: 5 * 60_000,
  })
}

export function useDSFHistory() {
  return useQuery({
    queryKey: ['fiscal', 'dsf-history'] as const,
    queryFn:  fiscalApi.dsfHistory,
    staleTime: 10 * 60_000,
  })
}

export function useRasSuggestions(year: number, month: number) {
  return useQuery({
    queryKey: ['fiscal', 'ras-suggestions', year, month] as const,
    queryFn:  () => fiscalApi.rasSuggestions(year, month),
    staleTime: 2 * 60_000,
    enabled: year > 0 && month > 0,
  })
}
