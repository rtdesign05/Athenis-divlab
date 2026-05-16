import { api } from '@/lib/api'

// ── Types backend ─────────────────────────────────────────────────────────────

export type PurchaseStatus = 'DRAFT' | 'SENT' | 'RECEIVED' | 'PARTIAL' | 'CANCELLED'

export interface ApiPurchaseLine {
  id:             string
  reference:      string | null
  designation:    string
  quantite:       number | string   // Prisma Decimal serialisé en string
  unite:          string
  prixUnitaireHT: number | string
  montantHT:      number | string
}

export interface ApiPurchaseOrder {
  id:                 string               // UUID (clé DB)
  reference:          string               // "BC-2026-001" (clé d'affichage)
  fournisseur:        string
  agenceId:           string | null
  agence:             { nom: string } | null
  date:               string               // ISO datetime
  receptionAt:        string | null
  montantHT:          number | string
  vatRate:            number | string
  montantTTC:         number | string
  status:             PurchaseStatus
  objet:              string
  notes:              string | null
  conditionsPaiement: string | null
  lines:              ApiPurchaseLine[]
}

// ── Mapping statuts ───────────────────────────────────────────────────────────

export const STATUS_TO_STATUT: Record<PurchaseStatus, string> = {
  DRAFT:     'En attente',
  SENT:      'En cours',
  RECEIVED:  'Reçue',
  PARTIAL:   'En cours',
  CANCELLED: 'Annulée',
}

export const STATUT_TO_STATUS: Record<string, PurchaseStatus> = {
  'En attente': 'DRAFT',
  'En cours':   'SENT',
  'Reçue':      'RECEIVED',
  'Annulée':    'CANCELLED',
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface CreateOrderPayload {
  fournisseur:         string
  objet:               string
  date:                string
  receptionAt?:        string | null
  montantHT:           number
  vatRate?:            number
  montantTTC:          number
  conditionsPaiement?: string
  notes?:              string
  lines: Array<{
    reference?:     string
    designation:    string
    quantite:       number
    unite:          string
    prixUnitaireHT: number
    montantHT:      number
  }>
}

export type UpdateOrderPayload = Partial<CreateOrderPayload & { status: PurchaseStatus }>

// ── Appels API ────────────────────────────────────────────────────────────────

export function listOrders(params?: { page?: number; limit?: number }) {
  return api
    .get<{ success: true; data: { items: ApiPurchaseOrder[]; total: number } }>(
      '/purchases',
      { params: { limit: 200, ...params } },
    )
    .then(r => r.data.data)
}

export function createOrder(payload: CreateOrderPayload) {
  return api
    .post<{ success: true; data: ApiPurchaseOrder }>('/purchases', payload)
    .then(r => r.data.data)
}

export function updateOrder(dbId: string, payload: UpdateOrderPayload) {
  return api
    .patch<{ success: true; data: ApiPurchaseOrder }>(`/purchases/${dbId}`, payload)
    .then(r => r.data.data)
}

export function deleteOrder(dbId: string) {
  return api.delete(`/purchases/${dbId}`)
}
