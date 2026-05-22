import { api } from '@/lib/api'

export type DeliveryNoteStatusApi =
  'EN_PREPARATION' | 'EXPEDIE' | 'LIVRE' | 'RETOURNE'

export interface ApiDeliveryLine {
  id:          string
  articleId?:  string
  reference?:  string
  designation: string
  quantite:    number
  unite?:      string
}

export interface ApiDeliveryNote {
  id:               string
  agenceId:         string | null
  agence:           { id: string; nom: string } | null
  commande:         string | null
  clientNom:        string
  dateCreation:     string
  datePrevue:       string | null
  dateLivraison:    string | null
  statut:           DeliveryNoteStatusApi
  lignes:           ApiDeliveryLine[]
  adresseLivraison: string | null
  notes:            string | null
  createdAt:        string
  updatedAt:        string
}

export interface CreateDeliveryNotePayload {
  commande?:         string
  clientNom:         string
  dateCreation:      string
  datePrevue?:       string | null
  dateLivraison?:    string | null
  statut?:           DeliveryNoteStatusApi
  lignes?:           ApiDeliveryLine[]
  adresseLivraison?: string
  notes?:            string
  agenceId?:         string | null
}

export type UpdateDeliveryNotePayload = Partial<CreateDeliveryNotePayload>

const d = <T>(r: { data: { data: T } }) => r.data.data

export const deliveryNotesApi = {
  list:   () => api.get<{ data: ApiDeliveryNote[] }>('/delivery-notes').then(d),
  create: (p: CreateDeliveryNotePayload) =>
            api.post<{ data: ApiDeliveryNote }>('/delivery-notes', p).then(d),
  update: (id: string, p: UpdateDeliveryNotePayload) =>
            api.patch<{ data: ApiDeliveryNote }>(`/delivery-notes/${id}`, p).then(d),
  remove: (id: string) => api.delete(`/delivery-notes/${id}`),
}
