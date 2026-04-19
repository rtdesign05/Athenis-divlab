import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/services/dashboardApi'

export const DASHBOARD_KEYS = {
  kpis:   () => ['dashboard', 'kpis'] as const,
  recent: () => ['dashboard', 'recent'] as const,
}

export function useDashboardKpis() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.kpis(),
    queryFn:  dashboardApi.kpis,
    staleTime: 2 * 60 * 1000,
  })
}

export function useRecentInvoices() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.recent(),
    queryFn:  dashboardApi.recentInvoices,
    select:   (data) => data.items,
    staleTime: 60 * 1000,
  })
}
