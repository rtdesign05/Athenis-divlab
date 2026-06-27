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

  /**
   * Ouvre une pièce attachée dans un nouvel onglet.
   *
   * Pourquoi un helper et pas un simple <a href="…">  : le clic direct sur un
   * lien n'envoie PAS le header `Authorization: Bearer …` (le JWT est en
   * localStorage, attaché uniquement par l'intercepteur axios). Le backend
   * renvoie alors 401 et — selon le contexte (PWA service worker, Tauri,
   * Nginx fallback) — l'utilisateur retombe sur la home page au lieu du PDF.
   *
   * Ici on fait la requête nous-mêmes via `api` (donc avec JWT), on transforme
   * la réponse en Blob, on génère une object-URL temporaire et on l'ouvre.
   * L'URL est révoquée après ouverture pour libérer la mémoire.
   *
   * Accepte aussi bien un id d'attachment qu'une URL absolue ou relative —
   * permet d'être appelé indifféremment depuis `pieceUrl` (stockée en DB)
   * ou avec un `att.id` direct après un upload.
   */
  openInNewTab: async (urlOrId: string): Promise<void> => {
    // Cas 1 : URL pointant vers une route SPA (deep-link facture vente, etc.)
    //   → on ouvre directement, pas besoin de fetch authentifié.
    if (urlOrId.startsWith('/app/') || urlOrId.startsWith('/auth/')) {
      window.open(urlOrId, '_blank', 'noopener,noreferrer')
      return
    }

    // Cas 2 : URL d'attachment (/api/attachments/XXX/file) ou id brut.
    //   → fetch authentifié + blob URL pour contourner le manque de header
    //     Authorization sur les <a href>/window.open directs.
    let endpoint: string
    if (/^https?:\/\//i.test(urlOrId)) {
      // URL absolue — extrait le chemin après le host.
      const u = new URL(urlOrId)
      endpoint = u.pathname.replace(/^\/api/, '')
    } else if (urlOrId.startsWith('/api/')) {
      endpoint = urlOrId.replace(/^\/api/, '')
    } else if (urlOrId.startsWith('/')) {
      endpoint = urlOrId
    } else {
      // Considéré comme un id attachment brut
      endpoint = `/attachments/${urlOrId}/file`
    }

    const res = await api.get<Blob>(endpoint, { responseType: 'blob' })
    const blobUrl = URL.createObjectURL(res.data)
    const win = window.open(blobUrl, '_blank', 'noopener,noreferrer')
    // Si le navigateur bloque le popup, fallback : on remplace l'URL courante.
    if (!win) {
      window.location.href = blobUrl
    }
    // Libère la mémoire après un délai (laisse le temps au navigateur de charger).
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
  },

  delete: (id: string) => api.delete(`/attachments/${id}`),
}
