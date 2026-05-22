import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export type TreasurySourceType = 'banque' | 'caisse' | 'mobile_money'

export interface ApiTreasuryEntry {
  id:         string
  date:       string
  libelle:    string
  montant:    number | string
  sourceType: TreasurySourceType
  sourceName: string
  pieceName:  string | null
  agenceId:   string | null
  agence:     { nom: string } | null
  createdAt:  string
}

export interface ApiBalance {
  sourceName: string
  sourceType: TreasurySourceType
  solde:      number
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface CreateEntryPayload {
  date:       string
  libelle:    string
  montant:    number
  sourceType: TreasurySourceType
  sourceName: string
  pieceName?: string
}

// ── API ───────────────────────────────────────────────────────────────────────

export function getBalances() {
  return api
    .get<{ success: true; data: ApiBalance[] }>('/treasury/balances')
    .then(r => r.data.data)
}

export function listEntries(params?: { sourceType?: TreasurySourceType; sourceName?: string; limit?: number }) {
  return api
    .get<{ success: true; data: { items: ApiTreasuryEntry[]; total: number } }>(
      '/treasury',
      { params: { limit: 500, ...params } },
    )
    .then(r => r.data.data)
}

export function createEntry(payload: CreateEntryPayload) {
  return api
    .post<{ success: true; data: ApiTreasuryEntry }>('/treasury', payload)
    .then(r => r.data.data)
}

export function deleteEntry(id: string) {
  return api.delete(`/treasury/${id}`)
}

// ── Sources (comptes bancaires / caisses / mobile money) ──────────────────────

export interface ApiTreasurySource {
  id:              string
  type:            TreasurySourceType
  nom:             string
  solde:           number | string
  devise:          string
  banque:          string | null
  numero:          string | null
  responsable:     string | null
  operateur:       string | null
  numeroTelephone: string | null
  agenceId:        string | null
  agence:          { id: string; nom: string } | null
  isActive:        boolean
  createdAt:       string
  updatedAt:       string
}

export interface CreateSourcePayload {
  type:             TreasurySourceType
  nom:              string
  solde?:           number
  devise?:          string
  banque?:          string
  numero?:          string
  responsable?:     string
  operateur?:       string
  numeroTelephone?: string
  agenceId?:        string
}

export type UpdateSourcePayload = Partial<Omit<CreateSourcePayload, 'type'>>

export function listSources(type?: TreasurySourceType) {
  return api
    .get<{ success: true; data: ApiTreasurySource[] }>('/treasury/sources', {
      params: type ? { type } : {},
    })
    .then(r => r.data.data)
}

export function createSource(payload: CreateSourcePayload) {
  return api
    .post<{ success: true; data: ApiTreasurySource }>('/treasury/sources', payload)
    .then(r => r.data.data)
}

export function updateSource(id: string, payload: UpdateSourcePayload) {
  return api
    .put<{ success: true; data: ApiTreasurySource }>(`/treasury/sources/${id}`, payload)
    .then(r => r.data.data)
}

export function deleteSource(id: string) {
  return api.delete(`/treasury/sources/${id}`)
}
