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
  articleId:      string | null
  compteAchat:    string | null
}

export interface ApiPurchaseOrder {
  id:                 string               // UUID (clé DB)
  reference:          string               // "BC-2026-001" (clé d'affichage)
  /** ORDER = bon de commande (auto-incrément), INVOICE = facture d'achat (référence manuelle) */
  documentType?:      'ORDER' | 'INVOICE'
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
  pieceUrl:           string | null
  pieceName:          string | null
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
  // Achat (bon de commande)
  'En attente': 'DRAFT',
  'En cours':   'SENT',
  'Reçue':      'RECEIVED',
  // FactureAchat (facture)
  'À valider':  'DRAFT',
  'Validée':    'RECEIVED',     // ← passage en RECEIVED déclenche la comptabilisation
  'Payée':      'RECEIVED',     // ← reste posté (règlement = écriture séparée à venir)
  'En retard':  'SENT',
  // Commun
  'Annulée':    'CANCELLED',
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface CreateOrderPayload {
  /** Numéro de facture fournisseur (manuel) — si omis, auto-incrément */
  reference?:          string
  /** ORDER (défaut) = bon de commande. INVOICE = facture d'achat. */
  documentType?:       'ORDER' | 'INVOICE'
  /** URL et nom du fichier PDF/image de la facture (pièce justificative) */
  pieceUrl?:           string
  pieceName?:          string
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
    articleId?:     string
    compteAchat?:   string
  }>
}

export type UpdateOrderPayload = Partial<CreateOrderPayload & { status: PurchaseStatus }>

// ── Appels API ────────────────────────────────────────────────────────────────

export function listOrders(params?: { page?: number; limit?: number; documentType?: 'ORDER' | 'INVOICE' }) {
  return api
    .get<{ success: true; data: { items: ApiPurchaseOrder[]; total: number } }>(
      '/purchases',
      { params: { limit: 100, ...params } },
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

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface PurchaseStats {
  total: number
  byStatus: { draft: number; sent: number; received: number; partial: number; cancelled: number }
  totalMontantTTC: number
  periodMontantTTC: number
  /** Montant HT des achats de la période — conforme SYSCOHADA art. 38 / PCG :
   *  les achats sont reconnus en HT, la TVA étant un crédit déductible. */
  periodMontantHT:  number
  periodCount: number
  dettesFournisseurs: number
  dettesCount: number
}

export function getStats(params?: { from?: string; to?: string }) {
  return api
    .get<{ success: true; data: PurchaseStats }>('/purchases/stats', { params })
    .then(r => r.data.data)
}
