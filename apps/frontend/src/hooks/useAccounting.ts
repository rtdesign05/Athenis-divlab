import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingApi, bankApi } from '@/services/accountingApi'
import { toSafeAmount } from '@/shared/utils/currency'

export const ACCOUNTING_KEYS = {
  bilan:          (year?: number) => ['accounting', 'bilan', year ?? 'current'] as const,
  compteResultat: (year?: number) => ['accounting', 'cr', year ?? 'current'] as const,
  grandLivre:     (year?: number) => ['accounting', 'gl', year ?? 'current'] as const,
  balance:        (year?: number) => ['accounting', 'balance', year ?? 'current'] as const,
  tva:            (year?: number) => ['accounting', 'tva', year ?? 'current'] as const,
  ca3:            (year: number, quarter: number) => ['accounting', 'ca3', year, quarter] as const,
  cloture:        (year: number)  => ['accounting', 'cloture', year] as const,
}

const BANK_KEYS = {
  all:   ['bank'] as const,
  stats: ['bank', 'stats'] as const,
  list:  (p?: object) => ['bank', 'list', p ?? {}] as const,
}

// ── Existing reports ───────────────────────────────────────────────────────────

export function useBilan(year?: number) {
  return useQuery({
    queryKey: ACCOUNTING_KEYS.bilan(year),
    queryFn:  () => accountingApi.bilan(year),
    select:   (data) => ({
      ...data,
      equilibre: Math.abs(toSafeAmount((data as never as { actif: { total: string } }).actif.total) - toSafeAmount((data as never as { passif: { total: string } }).passif.total)) < 0.01,
    }),
  })
}

export function useCompteResultat(year?: number) {
  return useQuery({
    queryKey: ACCOUNTING_KEYS.compteResultat(year),
    queryFn:  () => accountingApi.compteResultat(year),
    // Le compte de résultat alimente les SIG du tableau de bord ; doit
    // refléter immédiatement toute facture émise / achat comptabilisé.
    staleTime:      0,
    refetchOnMount: 'always',
  })
}

export function useGrandLivre(year?: number) {
  return useQuery({
    queryKey: ACCOUNTING_KEYS.grandLivre(year),
    queryFn:  () => accountingApi.grandLivre(year),
  })
}

export function useBalance(year?: number) {
  return useQuery({
    queryKey: ACCOUNTING_KEYS.balance(year),
    queryFn:  () => accountingApi.balance(year),
  })
}

export function useTva(year?: number) {
  return useQuery({
    queryKey: ACCOUNTING_KEYS.tva(year),
    queryFn:  () => accountingApi.tva(year),
  })
}

// ── CA3 TVA ───────────────────────────────────────────────────────────────────

export function useCA3(year: number, quarter: number) {
  return useQuery({
    queryKey: ACCOUNTING_KEYS.ca3(year, quarter),
    queryFn:  () => accountingApi.ca3(year, quarter),
  })
}

// ── Clôture exercice ──────────────────────────────────────────────────────────

export function useClotureStatus(year: number) {
  return useQuery({
    queryKey: ACCOUNTING_KEYS.cloture(year),
    queryFn:  () => accountingApi.clotureStatus(year),
  })
}

export function useCloseExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ year, notes }: { year: number; notes?: string }) =>
      accountingApi.clotureClose(year, notes),
    onSuccess: (_, { year }) => qc.invalidateQueries({ queryKey: ACCOUNTING_KEYS.cloture(year) }),
  })
}

// ── Bank ──────────────────────────────────────────────────────────────────────

export function useBankStats() {
  return useQuery({ queryKey: BANK_KEYS.stats, queryFn: () => bankApi.stats() })
}

export function useBankTransactions(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: BANK_KEYS.list(params),
    queryFn:  () => bankApi.list(params),
  })
}

export function useImportBank() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ format, content }: { format: 'CSV' | 'OFX'; content: string }) =>
      bankApi.import(format, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: BANK_KEYS.all }),
  })
}

export function useAutoReconcile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => bankApi.autoReconcile(),
    onSuccess:  () => qc.invalidateQueries({ queryKey: BANK_KEYS.all }),
  })
}

export function useReconcileTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ transactionId, invoiceId, expenseId }: { transactionId: string; invoiceId?: string; expenseId?: string }) =>
      bankApi.reconcile(transactionId, invoiceId, expenseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: BANK_KEYS.all }),
  })
}

export function useSetBankTxStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, lettrage }: { id: string; status: string; lettrage?: string }) =>
      bankApi.setStatus(id, status, lettrage),
    onSuccess: () => qc.invalidateQueries({ queryKey: BANK_KEYS.all }),
  })
}

export function useDeleteBankTx() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => bankApi.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: BANK_KEYS.all }),
  })
}
