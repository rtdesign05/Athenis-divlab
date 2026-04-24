import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { revisionApi } from '@/services/revisionApi'

const cyclesKey  = (year: number) => ['revision-cycles',   year] as const
const progressKey = (year: number) => ['revision-progress', year] as const

function invalidate(qc: ReturnType<typeof useQueryClient>, year: number) {
  void qc.invalidateQueries({ queryKey: cyclesKey(year) })
  void qc.invalidateQueries({ queryKey: progressKey(year) })
}

export function useRevisionCycles(year: number) {
  return useQuery({
    queryKey: cyclesKey(year),
    queryFn:  () => revisionApi.cycles(year),
    staleTime: 30_000,
  })
}

export function useRevisionProgress(year: number) {
  return useQuery({
    queryKey: progressKey(year),
    queryFn:  () => revisionApi.progress(year),
    staleTime: 30_000,
  })
}

export function useReviewAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ accountNumber, year, note }: { accountNumber: string; year: number; note?: string }) =>
      revisionApi.review(accountNumber, year, note),
    onSuccess: (_, { year }) => invalidate(qc, year),
  })
}

export function useUnreviewAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ accountNumber, year }: { accountNumber: string; year: number }) =>
      revisionApi.unreview(accountNumber, year),
    onSuccess: (_, { year }) => invalidate(qc, year),
  })
}

export function useMarkAnomaly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ accountNumber, year, anomalyNote }: { accountNumber: string; year: number; anomalyNote: string }) =>
      revisionApi.markAnomaly(accountNumber, year, anomalyNote),
    onSuccess: (_, { year }) => invalidate(qc, year),
  })
}

export function useResolveAnomaly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ accountNumber, year, resolutionNote }: { accountNumber: string; year: number; resolutionNote: string }) =>
      revisionApi.resolveAnomaly(accountNumber, year, resolutionNote),
    onSuccess: (_, { year }) => invalidate(qc, year),
  })
}

export function useMarkAllReviewed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (year: number) => revisionApi.markAll(year),
    onSuccess: (_, year) => invalidate(qc, year),
  })
}
