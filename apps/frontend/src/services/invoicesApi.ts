import { api } from '@/lib/api'

// ── Types backend ─────────────────────────────────────────────────────────────

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
export type InvoiceModele = 'standard' | 'proforma' | 'avoir' | 'acompte'

export interface ApiInvoiceLine {
  id:             string
  description:    string
  quantite:       number | string
  unite:          string
  prixUnitaireHT: number | string
  tvaRate:        number | string
  montantHT:      number | string
}

export interface ApiInvoice {
  id:                 string
  reference:          string       // "FA-2026-001"
  modele:             string
  clientId:           string
  client:             { id: string; nom: string; email: string }
  agenceId:           string | null
  agence:             { nom: string } | null
  status:             InvoiceStatus
  amountHT:           number | string
  vatRate:            number | string
  amountTTC:          number | string
  taxAmount:          number | string
  issuedAt:           string
  dueAt:              string
  paidAt:             string | null
  description:        string | null
  conditionsPaiement: string | null
  lines:              ApiInvoiceLine[]
}

// ── Mapping statuts ───────────────────────────────────────────────────────────

export const STATUS_TO_STATUT: Record<InvoiceStatus, string> = {
  DRAFT:     'Brouillon',
  SENT:      'Envoyée',
  PAID:      'Payée',
  OVERDUE:   'En retard',
  CANCELLED: 'Annulée',
}

export const STATUT_TO_STATUS: Record<string, InvoiceStatus> = {
  'Brouillon': 'DRAFT',
  'Envoyée':   'SENT',
  'Payée':     'PAID',
  'En retard': 'OVERDUE',
  'Annulée':   'CANCELLED',
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface CreateInvoicePayload {
  clientId:           string
  modele?:            InvoiceModele
  issueDate:          string
  dueDate:            string
  subtotal:           number
  taxRate?:           number
  conditionsPaiement?: string
  notes?:             string
  lines: Array<{
    description:    string
    quantite:       number
    unite:          string
    prixUnitaireHT: number
    tvaRate:        number
    montantHT:      number
    articleId?:     string
  }>
}

export type UpdateInvoicePayload = Partial<CreateInvoicePayload>

// ── Appels API ────────────────────────────────────────────────────────────────

export function listInvoices(params?: { page?: number; limit?: number; status?: InvoiceStatus }) {
  return api
    .get<{ success: true; data: { items: ApiInvoice[]; total: number } }>(
      '/invoices',
      { params: { limit: 200, ...params } },
    )
    .then(r => r.data.data)
}

export function createInvoice(payload: CreateInvoicePayload) {
  return api
    .post<{ success: true; data: ApiInvoice }>('/invoices', payload)
    .then(r => r.data.data)
}

export function updateInvoice(id: string, payload: UpdateInvoicePayload) {
  return api
    .patch<{ success: true; data: ApiInvoice }>(`/invoices/${id}`, payload)
    .then(r => r.data.data)
}

export function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  return api
    .patch<{ success: true; data: ApiInvoice }>(`/invoices/${id}/status`, { status })
    .then(r => r.data.data)
}

export function deleteInvoice(id: string) {
  return api.delete(`/invoices/${id}`)
}
