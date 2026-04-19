import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hrApi, type CreateEmployeeDto, type UpdateEmployeeDto } from '@/services/hrApi'
import { toSafeAmount } from '@/shared/utils/currency'

export const HR_KEYS = {
  all:    ['employees'] as const,
  list:   (activeOnly?: boolean) => ['employees', 'list', activeOnly ?? 'all'] as const,
  stats:  ()                     => ['employees', 'stats'] as const,
  detail: (id: string)           => ['employees', 'detail', id] as const,
}

export function useEmployees(activeOnly?: boolean) {
  return useQuery({
    queryKey: HR_KEYS.list(activeOnly),
    queryFn:  () => hrApi.list(activeOnly),
    select:   (data) => ({
      items:              data,
      masseSalarialeMonth: data.filter(e => e.isActive).reduce((s, e) => s + toSafeAmount(e.salary), 0),
    }),
  })
}

export function useEmployeeStats() {
  return useQuery({
    queryKey: HR_KEYS.stats(),
    queryFn:  hrApi.stats,
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateEmployeeDto) => hrApi.create(dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: HR_KEYS.all }),
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateEmployeeDto }) => hrApi.update(id, dto),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: HR_KEYS.all })
      qc.invalidateQueries({ queryKey: HR_KEYS.detail(id) })
    },
  })
}

export function useToggleEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => hrApi.toggle(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: HR_KEYS.all }),
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => hrApi.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: HR_KEYS.all }),
  })
}
