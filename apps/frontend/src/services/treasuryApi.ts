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
