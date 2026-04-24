import { api } from '@/lib/api'

export interface Attachment {
  id:         string
  companyId:  string
  fileName:   string
  fileSize:   number
  mimeType:   string
  storageKey: string
  uploadedBy: string
  uploadedAt: string
  invoiceId:  string | null
  expenseId:  string | null
  url:        string
}

export interface UploadProgress {
  loaded:  number
  total:   number
  percent: number
}

const d = <T>(r: { data: { data: T } }) => r.data.data

export const attachmentsApi = {
  listForInvoice: (invoiceId: string) =>
    api.get<{ data: Attachment[] }>(`/attachments/invoice/${invoiceId}`).then(d),

  listForExpense: (expenseId: string) =>
    api.get<{ data: Attachment[] }>(`/attachments/expense/${expenseId}`).then(d),

  upload: (
    files: File[],
    opts: { invoiceId?: string; expenseId?: string },
    onProgress?: (p: UploadProgress) => void,
  ) => {
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    if (opts.invoiceId) form.append('invoiceId', opts.invoiceId)
    if (opts.expenseId) form.append('expenseId', opts.expenseId)
    const config = onProgress
      ? {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e: { loaded: number; total?: number }) =>
            onProgress({ loaded: e.loaded, total: e.total ?? e.loaded, percent: Math.round((e.loaded / (e.total ?? e.loaded)) * 100) }),
        }
      : { headers: { 'Content-Type': 'multipart/form-data' } }
    return api.post<{ data: Attachment[] }>('/attachments/upload', form, config).then(
      (r: { data: { data: Attachment[] } }) => r.data.data,
    )
  },

  fileUrl:      (id: string) => `/api/attachments/${id}/file`,
  downloadUrl:  (id: string) => `/api/attachments/${id}/download`,

  delete: (id: string) => api.delete(`/attachments/${id}`),
}
