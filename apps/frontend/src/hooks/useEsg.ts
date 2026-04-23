import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { esgApi, type UpsertEsgDto, type EsgActionStatus, type EsgActionPriority, type EsgPilier } from '@/services/esgApi'

export const ESG_KEYS = {
  years:     ()            => ['esg', 'years'] as const,
  score:     (year: number)=> ['esg', 'score', year] as const,
  benchmark: (year: number)=> ['esg', 'benchmark', year] as const,
  csrd:      (year: number)=> ['esg', 'csrd', year] as const,
  actions:   (year?: number) => ['esg', 'actions', year ?? 'all'] as const,
  actionStats: ()          => ['esg', 'actions', 'stats'] as const,
}

export function useEsgYears() {
  return useQuery({ queryKey: ESG_KEYS.years(), queryFn: esgApi.years })
}

export function useEsgScore(year: number) {
  return useQuery({
    queryKey: ESG_KEYS.score(year),
    queryFn:  () => esgApi.score(year),
    enabled:  !!year,
    retry:    false,
  })
}

export function useEsgBenchmark(year: number) {
  return useQuery({
    queryKey: ESG_KEYS.benchmark(year),
    queryFn:  () => esgApi.benchmark(year),
    enabled:  !!year,
    retry:    false,
  })
}

export function useCsrdReport(year: number) {
  return useQuery({
    queryKey: ESG_KEYS.csrd(year),
    queryFn:  () => esgApi.csrd(year),
    enabled:  !!year,
    retry:    false,
  })
}

export function useUpsertEsg() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpsertEsgDto) => esgApi.upsert(dto),
    onSuccess: (_, dto) => {
      qc.invalidateQueries({ queryKey: ESG_KEYS.score(dto.year) })
      qc.invalidateQueries({ queryKey: ESG_KEYS.benchmark(dto.year) })
      qc.invalidateQueries({ queryKey: ESG_KEYS.csrd(dto.year) })
      qc.invalidateQueries({ queryKey: ESG_KEYS.years() })
    },
  })
}

export function useEsgActions(year?: number) {
  return useQuery({
    queryKey: ESG_KEYS.actions(year),
    queryFn:  () => esgApi.actions.list(year),
  })
}

export function useActionStats() {
  return useQuery({ queryKey: ESG_KEYS.actionStats(), queryFn: esgApi.actions.stats })
}

export function useCreateAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: esgApi.actions.create,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['esg', 'actions'] })
    },
  })
}

export function useUpdateAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof esgApi.actions.update>[1] }) =>
      esgApi.actions.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['esg', 'actions'] }),
  })
}

export function useDeleteAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => esgApi.actions.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['esg', 'actions'] }),
  })
}

export { type EsgActionStatus, type EsgActionPriority, type EsgPilier }
