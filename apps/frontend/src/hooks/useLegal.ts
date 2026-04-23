import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { legalApi, type ContractType, type ContractStatus, type AlertStatus, type AlertSeverity } from '@/services/legalApi'

export const CONTRACT_KEYS = {
  all:    ['legal', 'contracts'] as const,
  list:   (p?: object) => ['legal', 'contracts', 'list', p ?? {}] as const,
  detail: (id: string) => ['legal', 'contracts', 'detail', id] as const,
}

export const GDPR_KEYS = {
  all:    ['legal', 'gdpr'] as const,
  list:   ()           => ['legal', 'gdpr', 'list'] as const,
  stats:  ()           => ['legal', 'gdpr', 'stats'] as const,
  detail: (id: string) => ['legal', 'gdpr', 'detail', id] as const,
}

export const ALERT_KEYS = {
  all:   ['legal', 'alerts'] as const,
  list:  (s?: AlertStatus) => ['legal', 'alerts', 'list', s ?? 'all'] as const,
  stats: ()                 => ['legal', 'alerts', 'stats'] as const,
}

// ── Contracts ────────────────────────────────────────────────────────────────
export function useContracts(params?: { type?: ContractType; status?: ContractStatus }) {
  return useQuery({
    queryKey: CONTRACT_KEYS.list(params),
    queryFn:  () => legalApi.contracts.list(params),
  })
}

export function useContract(id: string) {
  return useQuery({
    queryKey: CONTRACT_KEYS.detail(id),
    queryFn:  () => legalApi.contracts.get(id),
    enabled:  !!id,
  })
}

export function useCreateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: legalApi.contracts.create,
    onSuccess:  () => qc.invalidateQueries({ queryKey: CONTRACT_KEYS.all }),
  })
}

export function useUpdateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: Parameters<typeof legalApi.contracts.update> extends [infer A, infer B] ? { id: A; dto: B } : never) =>
      legalApi.contracts.update(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: CONTRACT_KEYS.all })
      qc.invalidateQueries({ queryKey: CONTRACT_KEYS.detail(id) })
    },
  })
}

export function useDeleteContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => legalApi.contracts.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: CONTRACT_KEYS.all }),
  })
}

export function useSendSignature() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { signerName: string; signerEmail: string; signerRole?: string } }) =>
      legalApi.contracts.sendSignature(id, dto),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: CONTRACT_KEYS.detail(id) }),
  })
}

// ── GDPR ─────────────────────────────────────────────────────────────────────
export function useGdprStats() {
  return useQuery({ queryKey: GDPR_KEYS.stats(), queryFn: legalApi.gdpr.stats })
}

export function useGdprEntries() {
  return useQuery({ queryKey: GDPR_KEYS.list(), queryFn: legalApi.gdpr.list })
}

export function useCreateGdprEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: legalApi.gdpr.create,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: GDPR_KEYS.all })
    },
  })
}

export function useUpdateGdprEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof legalApi.gdpr.update>[1] }) =>
      legalApi.gdpr.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: GDPR_KEYS.all }),
  })
}

export function useDeleteGdprEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => legalApi.gdpr.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: GDPR_KEYS.all }),
  })
}

// ── Alerts ───────────────────────────────────────────────────────────────────
export function useAlertStats() {
  return useQuery({ queryKey: ALERT_KEYS.stats(), queryFn: legalApi.alerts.stats })
}

export function useLegalAlerts(status?: AlertStatus) {
  return useQuery({
    queryKey: ALERT_KEYS.list(status),
    queryFn:  () => legalApi.alerts.list(status),
  })
}

export function useCreateAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { title: string; message: string; severity?: AlertSeverity; dueDate?: string; contractId?: string }) =>
      legalApi.alerts.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ALERT_KEYS.all }),
  })
}

export function useUpdateAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AlertStatus }) => legalApi.alerts.update(id, status),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ALERT_KEYS.all }),
  })
}

export function useSyncAlerts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: legalApi.alerts.sync,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ALERT_KEYS.all }),
  })
}
