import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { invitationApi } from '@/services/invitationApi'
import { MANDAT_TYPE_LABELS, ALL_MODULES } from '@/services/cabinetApi'
import type { InvitationDetail } from '@/services/cabinetApi'

type PageState = 'loading' | 'ready' | 'accepting' | 'rejecting' | 'accepted' | 'rejected' | 'already_handled' | 'error'

const STATUS_LABELS: Record<string, string> = {
  ACCEPTED:  'Invitation acceptée',
  REJECTED:  'Invitation refusée',
  CANCELLED: 'Invitation annulée',
}

export function CabinetInvitationPage() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const token      = params.get('token') ?? ''

  const [state, setState]       = useState<PageState>('loading')
  const [invite, setInvite]     = useState<InvitationDetail | null>(null)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (!token) { setState('error'); setError('Lien invalide : token manquant.'); return }

    invitationApi.getByToken(token)
      .then((data) => {
        setInvite(data)
        if (data.status !== 'PENDING') setState('already_handled')
        else setState('ready')
      })
      .catch((err) => {
        const code = err?.response?.data?.code
        const msg  = err?.response?.data?.message ?? 'Lien invalide ou expiré.'
        if (code === 'EXPIRED') setError('Cette invitation a expiré.')
        else setError(msg)
        setState('error')
      })
  }, [token])

  async function handleAccept() {
    if (!user || user.accountType !== 'COMPANY') return
    setState('accepting')
    try {
      await invitationApi.accept(token)
      setState('accepted')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Une erreur est survenue.')
      setState('ready')
    }
  }

  async function handleReject() {
    if (!user || user.accountType !== 'COMPANY') return
    setState('rejecting')
    try {
      await invitationApi.reject(token)
      setState('rejected')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Une erreur est survenue.')
      setState('ready')
    }
  }

  const isCompanyUser = user?.accountType === 'COMPANY'
  const isRightCompany = invite ? user?.companyId === invite.company.id : false

  // ── Render helpers ──────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <PageShell>
        <div className="flex items-center justify-center gap-3 py-16 text-gray-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-forest-900 border-t-transparent" />
          Chargement de l'invitation…
        </div>
      </PageShell>
    )
  }

  if (state === 'error') {
    return (
      <PageShell>
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-3xl">⚠️</p>
          <p className="mt-3 font-semibold text-gray-900">Invitation introuvable</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <Link to="/" className="mt-5 inline-block text-sm text-forest-700 hover:underline">
            Retour à l'accueil
          </Link>
        </div>
      </PageShell>
    )
  }

  if (state === 'accepted') {
    return (
      <PageShell>
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <p className="text-4xl">✅</p>
          <p className="mt-3 text-xl font-bold text-gray-900">Invitation acceptée !</p>
          <p className="mt-2 text-sm text-gray-600">
            Le cabinet <strong>{invite?.cabinet.nom}</strong> a désormais accès à votre comptabilité.
          </p>
          <button onClick={() => navigate('/app')} className="btn-primary mt-6">
            Aller à mon espace
          </button>
        </div>
      </PageShell>
    )
  }

  if (state === 'rejected') {
    return (
      <PageShell>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-4xl">🚫</p>
          <p className="mt-3 text-xl font-bold text-gray-900">Invitation refusée</p>
          <p className="mt-2 text-sm text-gray-600">
            Vous avez refusé l'invitation du cabinet <strong>{invite?.cabinet.nom}</strong>.
          </p>
          <button onClick={() => navigate('/app')} className="btn-secondary mt-6">
            Retour à mon espace
          </button>
        </div>
      </PageShell>
    )
  }

  if (state === 'already_handled' && invite) {
    const label = STATUS_LABELS[invite.status] ?? invite.status
    return (
      <PageShell>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-3xl">ℹ️</p>
          <p className="mt-3 font-semibold text-gray-900">{label}</p>
          <p className="mt-1 text-sm text-gray-500">
            Cette invitation a déjà été traitée et ne peut plus être modifiée.
          </p>
          <Link to="/" className="mt-5 inline-block text-sm text-forest-700 hover:underline">
            Retour à l'accueil
          </Link>
        </div>
      </PageShell>
    )
  }

  if (!invite) return null

  // ── Main invitation display ─────────────────────────────────────────────────

  const moduleLabels = ALL_MODULES
    .filter(({ key }) => invite.modules.length === 0 || invite.modules.includes(key))
    .map(({ label }) => label)

  const expireDate = new Date(invite.expiresAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <PageShell>
      {/* Cabinet info */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

        <div className="border-b border-gray-100 bg-forest-900 px-6 py-5 text-center">
          <p className="text-sm font-medium text-forest-200">Invitation de cabinet comptable</p>
          <p className="mt-1 text-2xl font-bold text-white">{invite.cabinet.nom}</p>
          {invite.cabinet.siret && (
            <p className="mt-0.5 text-sm text-forest-300">SIRET {invite.cabinet.siret}</p>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* What they want */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Demande</p>
            <p className="mt-1 text-gray-800">
              Gérer la comptabilité de <strong>{invite.company.nom}</strong>
              {invite.company.siren ? ` (SIREN ${invite.company.siren})` : ''}
            </p>
          </div>

          {/* Mandat type */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Type de mission</p>
            <p className="mt-1 font-medium text-gray-900">
              {MANDAT_TYPE_LABELS[invite.type]}
            </p>
          </div>

          {/* Modules */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Modules accessibles</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {moduleLabels.length > 0 ? moduleLabels.map((m) => (
                <span key={m} className="rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-medium text-forest-800">
                  {m}
                </span>
              )) : (
                <span className="text-sm text-gray-500">Tous les modules</span>
              )}
            </div>
          </div>

          {/* Notes */}
          {invite.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Message du cabinet</p>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{invite.notes}</p>
            </div>
          )}

          {/* Expiry */}
          <p className="text-xs text-gray-400">Invitation valable jusqu'au {expireDate}</p>
        </div>

        {/* Action area */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-5">
          {!user && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Connectez-vous à votre espace entreprise pour accepter ou refuser cette invitation.
              </p>
              <Link
                to={`/auth/login?next=/invitation/cabinet?token=${encodeURIComponent(token)}`}
                className="btn-primary mt-3 inline-block"
              >
                Se connecter
              </Link>
            </div>
          )}

          {user && !isCompanyUser && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 text-center">
              Cette invitation est destinée à un compte entreprise. Connectez-vous avec le bon compte pour y répondre.
            </div>
          )}

          {user && isCompanyUser && !isRightCompany && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 text-center">
              Cette invitation est adressée à <strong>{invite.company.nom}</strong>, pas à votre entreprise.
            </div>
          )}

          {user && isCompanyUser && isRightCompany && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleReject}
                disabled={state === 'accepting' || state === 'rejecting'}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {state === 'rejecting' ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
                    Refus en cours…
                  </span>
                ) : 'Refuser'}
              </button>
              <button
                onClick={handleAccept}
                disabled={state === 'accepting' || state === 'rejecting'}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {state === 'accepting' ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Acceptation…
                  </span>
                ) : 'Accepter l\'invitation'}
              </button>
            </div>
          )}

          {error && (
            <p className="mt-3 text-center text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>
    </PageShell>
  )
}

// ── Layout wrapper ────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-lg">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight text-forest-900">Athenis</span>
        </div>
        {children}
      </div>
    </div>
  )
}
