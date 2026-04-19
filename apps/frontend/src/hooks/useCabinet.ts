import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cabinetApi, type MandatType } from '@/services/cabinetApi'
import { toSafeAmount } from '@/shared/utils/currency'

export const CABINET_KEYS = {
  dashboard: () => ['cabinet', 'dashboard'] as const,
  portfolio: () => ['cabinet', 'portfolio'] as const,
  mandats:   () => ['cabinet', 'mandats'] as const,
}

export function useCabinetDashboard() {
  return useQuery({
    queryKey: CABINET_KEYS.dashboard(),
    queryFn:  cabinetApi.dashboard,
  })
}

export function useCabinetPortfolio() {
  return useQuery({
    queryKey: CABINET_KEYS.portfolio(),
    queryFn:  cabinetApi.portfolio,
    select:   (data) => ({
      companies: data,
      totalRevenu: data.reduce((s, c) => s + toSafeAmount(c.kpis.paidAmount), 0),
      totalPending: data.reduce((s, c) => s + toSafeAmount(c.kpis.pendingAmount), 0),
    }),
  })
}

export function useCabinetMandats() {
  return useQuery({
    queryKey: CABINET_KEYS.mandats(),
    queryFn:  cabinetApi.mandats,
  })
}

export function useToggleMandat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mandatId: string) => cabinetApi.toggleMandat(mandatId),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: CABINET_KEYS.portfolio() })
      qc.invalidateQueries({ queryKey: CABINET_KEYS.mandats() })
    },
  })
}

export function useCreateMandat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { companyId: string; type: MandatType; modules: string[] }) =>
      cabinetApi.createMandat(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: CABINET_KEYS.mandats() }),
  })
}
