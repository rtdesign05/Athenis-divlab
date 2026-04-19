import { useQuery } from '@tanstack/react-query'
import { accountingApi } from '@/services/accountingApi'
import { toSafeAmount } from '@/shared/utils/currency'

export const ACCOUNTING_KEYS = {
  bilan:          (year?: number) => ['accounting', 'bilan', year ?? 'current'] as const,
  compteResultat: (year?: number) => ['accounting', 'cr', year ?? 'current'] as const,
  grandLivre:     ()              => ['accounting', 'gl'] as const,
  balance:        ()              => ['accounting', 'balance'] as const,
  tva:            (year?: number) => ['accounting', 'tva', year ?? 'current'] as const,
}

export function useBilan(year?: number) {
  return useQuery({
    queryKey: ACCOUNTING_KEYS.bilan(year),
    queryFn:  () => accountingApi.bilan(year),
    select:   (data) => ({
      ...data,
      equilibre: Math.abs(toSafeAmount(data.actif.total) - toSafeAmount(data.passif.total)) < 0.01,
    }),
  })
}

export function useCompteResultat(year?: number) {
  return useQuery({
    queryKey: ACCOUNTING_KEYS.compteResultat(year),
    queryFn:  () => accountingApi.compteResultat(year),
    select:   (data) => ({
      ...data,
      margineBrute: toSafeAmount(data.produits.total) - toSafeAmount(data.charges.achatsMarchandises),
      resultatPositif: parseFloat(data.resultatNet) >= 0,
    }),
  })
}

export function useGrandLivre() {
  return useQuery({
    queryKey: ACCOUNTING_KEYS.grandLivre(),
    queryFn:  accountingApi.grandLivre,
  })
}

export function useBalance() {
  return useQuery({
    queryKey: ACCOUNTING_KEYS.balance(),
    queryFn:  accountingApi.balance,
  })
}

export function useTva(year?: number) {
  return useQuery({
    queryKey: ACCOUNTING_KEYS.tva(year),
    queryFn:  () => accountingApi.tva(year),
    select:   (data) => ({
      ...data,
      totalNette: data.quarters.reduce((s, q) => s + parseFloat(q.tvaNette), 0).toFixed(2),
    }),
  })
}
