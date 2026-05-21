import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { userInvitationApi, type UserInvitationDetail } from '@/services/invitationApi'
import { useAuth } from '@/hooks/useAuth'

type Phase = 'loading' | 'ready' | 'submitting' | 'done' | 'error'

export function UserInvitationPage() {
  const [params]    = useSearchParams()
  const navigate    = useNavigate()
  const { login }   = useAuth()
  const token       = params.get('token') ?? ''

  const [phase, setPhase]       = useState<Phase>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [details, setDetails]   = useState<UserInvitationDetail | null>(null)

  const [prenom, setPrenom]     = useState('')
  const [nom, setNom]           = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // ── 1. Charger les détails de l'invitation ──────────────────────────────────
  useEffect(() => {
    if (!token) {
      setPhase('error')
      setErrorMsg('Lien invalide : token manquant.')
      return
    }
    userInvitationApi.getByToken(token)
      .then((d) => { setDetails(d); setPhase('ready') })
      .catch((e) => {
        const code = e?.response?.data?.code
        const msg  = e?.response?.data?.error
        setPhase('error')
        if (code === 'EXPIRED')          setErrorMsg('Cette invitation a expiré. Demande à ton administrateur de t\'en envoyer une nouvelle.')
        else if (code === 'ALREADY_ACCEPTED') setErrorMsg('Cette invitation a déjà été acceptée. Connecte-toi avec ton mot de passe.')
        else if (code === 'NOT_FOUND')   setErrorMsg('Invitation introuvable. Vérifie que le lien est correct.')
        else                              setErrorMsg(msg ?? 'Impossible de charger l\'invitation.')
      })
  }, [token])

  // ── 2. Soumission du formulaire ──────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (!prenom.trim() || !nom.trim()) {
      setErrorMsg('Prénom et nom requis.')
      return
    }
    if (password.length < 8) {
      setErrorMsg('Mot de passe — 8 caractères minimum.')
      return
    }
    if (password !== confirm) {
      setErrorMsg('Les deux mots de passe ne correspondent pas.')
      return
    }

    setPhase('submitting')

    try {
      await userInvitationApi.accept({ token, prenom: prenom.trim(), nom: nom.trim(), password })
      // Connexion automatique avec le compte fraîchement créé
      try {
        await login(details!.email, password)
        setPhase('done')
        setTimeout(() => navigate('/app/dashboard', { replace: true }), 600)
      } catch {
        // Si le login auto échoue, on bascule sur la page login
        setPhase('done')
        setTimeout(() => navigate('/auth/login', { replace: true }), 1200)
      }
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; code?: string } } }
      const code = err?.response?.data?.code
      const msg  = err?.response?.data?.error
      setPhase('ready')
      if (code === 'EMAIL_TAKEN')      setErrorMsg('Un compte existe déjà avec cet email — connecte-toi directement.')
      else if (code === 'EXPIRED')     setErrorMsg('L\'invitation vient d\'expirer.')
      else if (code === 'ALREADY_ACCEPTED') setErrorMsg('Cette invitation a déjà été acceptée.')
      else                             setErrorMsg(msg ?? 'Erreur lors de la création du compte.')
    }
  }

  // ── 3. Rendu ─────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-forest-900 border-t-transparent" />
          Chargement de l'invitation…
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Invitation invalide</h1>
          <p className="mt-3 text-sm text-gray-600">{errorMsg}</p>
          <Link
            to="/auth/login"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-forest-900 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-800"
          >
            Aller à la page de connexion
          </Link>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Compte créé !</h1>
          <p className="mt-3 text-sm text-gray-600">Redirection vers ton tableau de bord…</p>
        </div>
      </div>
    )
  }

  // phase === 'ready' || 'submitting'
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="rounded-t-2xl bg-forest-900 px-8 py-6 text-center">
          <h1 className="text-xl font-bold text-white">Bienvenue sur Athenis</h1>
          <p className="mt-1 text-sm text-forest-200">Activez votre compte</p>
        </div>

        {/* Détails */}
        {details && (
          <div className="border-b border-gray-100 px-8 py-5 space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Entreprise</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-900">{details.companyName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</p>
              <p className="mt-0.5 text-sm text-gray-900">{details.email}</p>
            </div>
            {details.roleName && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Rôle</p>
                <p className="mt-0.5 text-sm text-gray-900">{details.roleName}</p>
              </div>
            )}
            {details.agences.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Agence{details.agences.length > 1 ? 's' : ''} attribuée{details.agences.length > 1 ? 's' : ''}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {details.agences.map((a) => (
                    <span key={a.id} className="rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-medium text-forest-700">
                      {a.nom}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4 px-8 py-6">
          {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Prénom *</label>
              <input
                type="text"
                className="input mt-1 w-full"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Jean"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Nom *</label>
              <input
                type="text"
                className="input mt-1 w-full"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Dupont"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Mot de passe *</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input w-full pr-16"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
              >
                {showPassword ? 'Cacher' : 'Afficher'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Confirmer le mot de passe *</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="input mt-1 w-full"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirmez votre mot de passe"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={phase === 'submitting'}
            className="w-full rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {phase === 'submitting' ? 'Création en cours…' : 'Activer mon compte'}
          </button>

          <p className="text-center text-xs text-gray-400">
            En activant votre compte, vous acceptez les conditions d'utilisation d'Athenis.
          </p>
        </form>
      </div>
    </div>
  )
}
