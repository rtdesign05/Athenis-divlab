import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attachmentsApi, type Attachment, type UploadProgress } from '@/services/attachmentsApi'

type ResourceType = 'invoice' | 'expense'

export function useAttachments(resourceType: ResourceType, resourceId: string | null) {
  return useQuery({
    queryKey: ['attachments', resourceType, resourceId],
    queryFn: () => {
      if (!resourceId) return []
      return resourceType === 'invoice'
        ? attachmentsApi.listForInvoice(resourceId)
        : attachmentsApi.listForExpense(resourceId)
    },
    enabled: !!resourceId,
    staleTime: 30_000,
  })
}

export function useUploadAttachment(resourceType: ResourceType, resourceId: string) {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<UploadProgress | null>(null)

  const mutation = useMutation({
    mutationFn: (files: File[]) =>
      attachmentsApi.upload(
        files,
        resourceType === 'invoice' ? { invoiceId: resourceId } : { expenseId: resourceId },
        setProgress,
      ),
    onSuccess: () => {
      setProgress(null)
      queryClient.invalidateQueries({ queryKey: ['attachments', resourceType, resourceId] })
    },
    onError: () => setProgress(null),
  })

  return { ...mutation, progress }
}

export function useDeleteAttachment(resourceType: ResourceType, resourceId: string) {
  const queryClient = useQueryClient()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (id: string) => attachmentsApi.delete(id),
    onSuccess: () => {
      setConfirmId(null)
      queryClient.invalidateQueries({ queryKey: ['attachments', resourceType, resourceId] })
    },
  })

  function requestDelete(id: string) {
    if (confirmId === id) {
      mutation.mutate(id)
    } else {
      setConfirmId(id)
    }
  }

  function cancelDelete() { setConfirmId(null) }

  return { requestDelete, cancelDelete, confirmId, isPending: mutation.isPending }
}

export type { Attachment }
