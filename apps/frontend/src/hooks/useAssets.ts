import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assetsApi } from '@/services/assetsApi'
import type { AssetCategory, AssetInput, AssetStatus } from '@/services/assetsApi'

export const ASSET_KEYS = {
  all:               ['assets'] as const,
  list:              (f?: { category?: AssetCategory; status?: AssetStatus }) => ['assets', 'list', f] as const,
  summary:           (year: number) => ['assets', 'summary', year] as const,
  depreciationTable: (year: number) => ['assets', 'depreciation', year] as const,
  schedule:          (id: string)   => ['assets', 'schedule', id] as const,
}

export function useAssets(filters?: { category?: AssetCategory; status?: AssetStatus }) {
  return useQuery({ queryKey: ASSET_KEYS.list(filters), queryFn: () => assetsApi.list(filters) })
}

export function useAssetSummary(year: number) {
  return useQuery({ queryKey: ASSET_KEYS.summary(year), queryFn: () => assetsApi.summary(year) })
}

export function useDepreciationTable(year: number) {
  return useQuery({ queryKey: ASSET_KEYS.depreciationTable(year), queryFn: () => assetsApi.depreciationTable(year) })
}

export function useAssetSchedule(id: string | null) {
  return useQuery({
    queryKey: ASSET_KEYS.schedule(id ?? ''),
    queryFn:  () => assetsApi.schedule(id!),
    enabled:  !!id,
  })
}

function useInvalidateAssets(year: number) {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ASSET_KEYS.all })
    void qc.invalidateQueries({ queryKey: ASSET_KEYS.summary(year) })
    void qc.invalidateQueries({ queryKey: ASSET_KEYS.depreciationTable(year) })
  }
}

export function useCreateAsset(year: number) {
  const inv = useInvalidateAssets(year)
  return useMutation({ mutationFn: (data: AssetInput) => assetsApi.create(data), onSuccess: inv })
}

export function useUpdateAsset(year: number) {
  const inv = useInvalidateAssets(year)
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AssetInput> }) => assetsApi.update(id, data),
    onSuccess: inv,
  })
}

export function useDeleteAsset(year: number) {
  const inv = useInvalidateAssets(year)
  return useMutation({ mutationFn: (id: string) => assetsApi.delete(id), onSuccess: inv })
}

export function useGenerateEntries(year: number) {
  const inv = useInvalidateAssets(year)
  return useMutation({ mutationFn: () => assetsApi.generateEntries(year), onSuccess: inv })
}
