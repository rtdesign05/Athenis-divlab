import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fiscalApi } from '@/services/fiscalApi'
import type { IgsBaremeRow } from '@/services/fiscalApi'

const REGIME_KEYS = {
  visibleModules:  () => ['fiscal', 'visible-modules'] as const,
  regimeDetection: (year: number) => ['fiscal', 'regime-detection', year] as const,
  igsBareme:       () => ['fiscal', 'igs-bareme'] as const,
  igs:             (year: number) => ['fiscal', 'igs', year] as const,
}

export function useVisibleModules() {
  return useQuery({
    queryKey: REGIME_KEYS.visibleModules(),
    queryFn:  fiscalApi.visibleModules,
    staleTime: 5 * 60_000,
  })
}

export function useFiscalRegime() {
  const { data, ...rest } = useVisibleModules()
  return {
    ...rest,
    regime:          data?.regime ?? 'REEL_NORMAL',
    tabs:            data?.tabs ?? [],
    isIGS:           data?.regime === 'IGS',
    isReelNormal:    data?.regime === 'REEL_NORMAL',
    isReelSimplifie: data?.regime === 'REEL_SIMPLIFIE',
  }
}

export function useRegimeDetection(year: number) {
  return useQuery({
    queryKey: REGIME_KEYS.regimeDetection(year),
    queryFn:  () => fiscalApi.regimeDetection(year),
    staleTime: 5 * 60_000,
  })
}

export function useIgsBareme() {
  const { data: bareme = [], ...rest } = useQuery({
    queryKey: REGIME_KEYS.igsBareme(),
    queryFn:  fiscalApi.igsBareme,
    staleTime: 60 * 60_000,
  })

  const getClassFromCA = (ca: number): IgsBaremeRow | null =>
    bareme.find(r => ca >= r.caMin && ca <= r.caMax) ?? null

  const calculateIgsAmount = (ca: number, adherentCga: boolean): number => {
    const row = getClassFromCA(ca)
    if (!row) return 0
    return adherentCga ? row.montantCga : row.montantBase
  }

  return { ...rest, bareme, getClassFromCA, calculateIgsAmount }
}

export function useIGSDeclaration(year: number) {
  return useQuery({
    queryKey: REGIME_KEYS.igs(year),
    queryFn:  () => fiscalApi.igs(year),
    staleTime: 60_000,
  })
}

export function useConfirmRegime() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { year: number; regime: string; igsClass?: number; paymentMode?: string; adherentCga?: boolean }) =>
      fiscalApi.confirmRegime(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fiscal'] })
    },
  })
}
