import { api } from '@/lib/api'
import type { InvitationDetail, Mandat } from './cabinetApi'

const d = <T>(r: { data: { data: T } }) => r.data.data

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
