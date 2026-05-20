import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { authApi } from '@/features/auth/authApi'

type State = 'pending' | 'verifying' | 'success' | 'awaiting_approval' | 'error'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()

  const token   = searchParams.get('token')
  const pending = searchParams.get('pending') === '1'
  const email   = searchParams.get('email') ?? ''

  const [state, setState]           = useState<State>(token ? 'verifying' : 'pending')
  const [errorMsg, setErrorMsg]     = useState('')
  const [resendSent, setResendSent] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  // Auto-verify when token is present in URL
  useEffect(() => {
    if (!token) return

    setState('verifying')
    authApi
      .verifyEmail(token)
      .then(() => {
        // En phase de test : email vérifié = on attend la validation admin.
        // Aucun token JWT n'est émis : on affiche un écran "compte en attente".
        setState('awaiting_approval')
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        setErrorMsg(msg ?? 'Lien invalide ou expiré.')
        setState('error')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleResend() {
    setResendLoading(true)
    try {
      await authApi.resendVerification(email)
      setResendSent(true)
    } catch {
      // silent
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-8 text-center">

        {/* Logo */}
        <div className="mb-6">
          <span className="text-2xl font-bold text-gray-900">Athenis</span>
        </div>

        {/* Verifying */}
        {state === 'verifying' && (
          <>
            <div className="mb-4 flex justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-forest-900 border-t-transparent" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Vérification en cours…</h1>
            <p className="mt-2 text-sm text-gray-500">Nous confirmons votre adresse e-mail.</p>
          </>
        )}

        {/* Success — login direct (cas hérité, désactivé en phase de test) */}
        {state === 'success' && (
          <>
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">✅</div>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Adresse e-mail confirmée !</h1>
            <p className="mt-2 text-sm text-gray-500">Vous êtes connecté(e). Redirection en cours…</p>
          </>
        )}

        {/* Awaiting admin approval — flow phase de test */}
        {state === 'awaiting_approval' && (
          <>
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-3xl">⏳</div>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">E-mail confirmé ✅</h1>
            <p className="mt-3 text-sm text-gray-500">
              Merci d'avoir vérifié votre adresse e-mail. Votre compte est désormais en
              <strong className="text-gray-700"> attente de validation</strong> par notre équipe.
            </p>
            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-left text-sm text-blue-900">
              <p className="font-semibold mb-1">Prochaine étape</p>
              <p className="text-blue-800">
                Athenis est en phase de test fermée — chaque inscription est examinée manuellement.
                Vous recevrez un <strong>e-mail dès l'activation</strong>, généralement sous 24-48 h.
              </p>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Pas besoin de revenir ici. On vous écrira directement.
            </p>
            <Link to="/auth/login" className="mt-6 block text-sm text-forest-700 hover:underline">
              Retour à la connexion
            </Link>
          </>
        )}

        {/* Error */}
        {state === 'error' && (
          <>
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl">❌</div>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Lien invalide ou expiré</h1>
            <p className="mt-2 text-sm text-gray-500">{errorMsg}</p>
            <div className="mt-6 space-y-3">
              {email && (
                resendSent ? (
                  <p className="text-sm text-green-700">✓ Un nouvel e-mail a été envoyé à <strong>{email}</strong>.</p>
                ) : (
                  <button
                    onClick={() => { void handleResend() }}
                    disabled={resendLoading}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {resendLoading ? 'Envoi…' : 'Renvoyer l\'e-mail de confirmation'}
                  </button>
                )
              )}
              <Link to="/auth/login" className="block text-sm text-forest-700 hover:underline">
                Retour à la connexion
              </Link>
            </div>
          </>
        )}

        {/* Pending — user just registered, waiting for email */}
        {state === 'pending' && pending && (
          <>
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-3xl">📧</div>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Vérifiez votre boîte e-mail</h1>
            <p className="mt-2 text-sm text-gray-500">
              Un lien de confirmation a été envoyé à{' '}
              {email ? <strong>{email}</strong> : 'votre adresse e-mail'}.
              {' '}Cliquez sur ce lien pour activer votre compte.
            </p>
            <p className="mt-3 text-xs text-gray-400">
              Pensez à vérifier vos spams si vous ne voyez rien dans les prochaines minutes.
            </p>
            <div className="mt-6 space-y-3">
              {email && (
                resendSent ? (
                  <p className="text-sm text-green-700">✓ E-mail renvoyé à <strong>{email}</strong>.</p>
                ) : (
                  <button
                    onClick={() => { void handleResend() }}
                    disabled={resendLoading}
                    className="btn-secondary w-full disabled:opacity-50"
                  >
                    {resendLoading ? 'Envoi…' : 'Renvoyer l\'e-mail'}
                  </button>
                )
              )}
              <Link to="/auth/login" className="block text-sm text-gray-400 hover:underline">
                Retour à la connexion
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
