import { api } from '@/lib/api'

export type GoodsReceiptStatusApi = 'ATTENDU' | 'RECU_PARTIEL' | 'RECU' | 'LITIGE'

export interface ApiGoodsReceiptLine {
  id:            string
  reference?:    string
  designation:   string
  quantite:      number
  quantiteRecue: number
  unite?:        string
}

export interface ApiGoodsReceipt {
  id:             string
  agenceId:       string | null
  agence:         { id: string; nom: string } | null
  commande:       string | null
  fournisseurNom: string
  dateCreation:   string
  datePrevue:     string | null
  dateReception:  string | null
  statut:         GoodsReceiptStatusApi
  lignes:         ApiGoodsReceiptLine[]
  notes:          string | null
  createdAt:      string
  updatedAt:      string
}

export interface CreateGoodsReceiptPayload {
  commande?:      string
  fournisseurNom: string
  dateCreation:   string
  datePrevue?:    string | null
  dateReception?: string | null
  statut?:        GoodsReceiptStatusApi
  lignes?:        ApiGoodsReceiptLine[]
  notes?:         string
  agenceId?:      string | null
}

export type UpdateGoodsReceiptPayload = Partial<CreateGoodsReceiptPayload>

const d = <T>(r: { data: { data: T } }) => r.data.data

export const goodsReceiptsApi = {
  list:   () => api.get<{ data: ApiGoodsReceipt[] }>('/goods-receipts').then(d),
  create: (p: CreateGoodsReceiptPayload) =>
            api.post<{ data: ApiGoodsReceipt }>('/goods-receipts', p).then(d),
  update: (id: string, p: UpdateGoodsReceiptPayload) =>
            api.patch<{ data: ApiGoodsReceipt }>(`/goods-receipts/${id}`, p).then(d),
  remove: (id: string) => api.delete(`/goods-receipts/${id}`),
}
