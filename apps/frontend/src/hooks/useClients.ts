import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi, type CreateClientDto, type UpdateClientDto } from '@/services/clientsApi'

export const CLIENT_KEYS = {
  all:    ['clients'] as const,
  list:   (search?: string) => ['clients', 'list', search ?? ''] as const,
  detail: (id: string)      => ['clients', 'detail', id] as const,
}

export function useClients(search?: string) {
  return useQuery({
    queryKey: CLIENT_KEYS.list(search),
    queryFn:  () => clientsApi.list(search),
    select:   (data) => data.sort((a, b) => a.name.localeCompare(b.name)),
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: CLIENT_KEYS.detail(id),
    queryFn:  () => clientsApi.get(id),
    enabled:  !!id,
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateClientDto) => clientsApi.create(dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: CLIENT_KEYS.all }),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateClientDto }) => clientsApi.update(id, dto),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: CLIENT_KEYS.all })
      qc.invalidateQueries({ queryKey: CLIENT_KEYS.detail(id) })
    },
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: CLIENT_KEYS.all }),
  })
}
