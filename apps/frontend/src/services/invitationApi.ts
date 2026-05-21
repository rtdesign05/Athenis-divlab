import { api } from '@/lib/api'
import type { InvitationDetail, Mandat } from './cabinetApi'

const d = <T>(r: { data: { data: T } }) => r.data.data

// ── Invitations cabinet → company ────────────────────────────────────────────

export const invitationApi = {
  /** Public — no auth needed. Returns invitation details. */
  getByToken: (token: string) =>
    api.get<{ data: InvitationDetail }>(`/invitations/cabinet?token=${encodeURIComponent(token)}`).then(d),

  /** Requires COMPANY auth. Creates the mandat + links company to cabinet. */
  accept: (token: string) =>
    api.post<{ data: Mandat }>(`/invitations/cabinet/accept?token=${encodeURIComponent(token)}`).then(d),

  /** Requires COMPANY auth. Marks invitation as rejected. */
  reject: (token: string) =>
    api.post(`/invitations/cabinet/reject?token=${encodeURIComponent(token)}`),
}

// ── Invitations user (chef d'agence, comptable interne, etc.) ────────────────

export interface UserInvitationDetail {
  email:        string
  companyName:  string
  roleName:     string | null
  agences:      { id: string; nom: string }[]
  isRestricted: boolean
  expiresAt:    string
}

export const userInvitationApi = {
  /** Public — récupère les détails d'une invitation user via son token. */
  getByToken: (token: string) =>
    api.get<{ data: UserInvitationDetail }>(`/invitations/user?token=${encodeURIComponent(token)}`).then(d),

  /** Public — accepte une invitation user en créant le compte. */
  accept: (body: { token: string; prenom: string; nom: string; password: string }) =>
    api.post<{ data: { email: string; accountCreated: boolean } }>('/invitations/user/accept', body).then(d),
}
