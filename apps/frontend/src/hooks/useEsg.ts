import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { esgApi, type UpdateEsgDto } from '@/services/esgApi'

export const ESG_KEYS = {
  score:      (year?: number) => ['esg', 'score', year ?? 'current'] as const,
  risques:    ()              => ['esg', 'risques'] as const,
  materialite: ()             => ['esg', 'materialite'] as const,
  rapport:    (year?: number) => ['esg', 'rapport', year ?? 'current'] as const,
}

export function useEsgScore(year?: number) {
  return useQuery({
    queryKey: ESG_KEYS.score(year),
    queryFn:  () => esgApi.score(year),
    select:   (data) => ({
      ...data,
      scoreLabel: (s: number | null) =>
        s === null ? '—'
        : s >= 80 ? 'Excellent'
        : s >= 60 ? 'Bon'
        : s >= 40 ? 'Moyen'
        : 'Insuffisant',
    }),
  })
}

export function useEsgRisques() {
  return useQuery({
    queryKey: ESG_KEYS.risques(),
    queryFn:  esgApi.risques,
  })
}

export function useEsgMaterialite() {
  return useQuery({
    queryKey: ESG_KEYS.materialite(),
    queryFn:  esgApi.materialite,
  })
}

export function useUpdateEsg() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdateEsgDto) => esgApi.update(dto),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['esg', 'score'] })
    },
  })
}
