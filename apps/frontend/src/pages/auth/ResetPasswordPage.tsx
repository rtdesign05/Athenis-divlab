import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/features/auth/authApi'

function validatePassword(pw: string): string | null {
  if (pw.length < 8)         return 'Au moins 8 caractères.'
  if (!/[A-Z]/.test(pw))     return 'Doit contenir une majuscule.'
  if (!/[0-9]/.test(pw))     return 'Doit contenir un chiffre.'
  return null
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState(false)
  const [tokenMissing, setTokenMissing] = useState(false)

  useEffect(() => {
    if (!token) setTokenMissing(true)
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const pwError = validatePassword(password)
    if (pwError) { setError(pwError); return }
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return }

    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setSuccess(true)
      // Redirige vers login après 3s
      setTimeout(() => navigate('/auth/login', { replace: true }), 3000)
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string; code?: string } } }
      const code = err?.response?.data?.code
      if (code === 'INVALID_RESET_TOKEN' || code === 'RESET_TOKEN_EXPIRED' || code === 'RESET_TOKEN_USED') {
        setError('Ce lien est invalide ou expiré. Demandez un nouveau lien de réinitialisation.')
      } else if (err?.response?.status === 429) {
        setError('Trop de tentatives — réessayez dans quelques minutes.')
      } else {
        setError(err?.response?.data?.error ?? 'Une erreur est survenue. Réessayez plus tard.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (tokenMissing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-4">
          <h1 className="text-xl font-semibold text-gray-900">Lien invalide</h1>
          <p className="text-sm text-gray-500">
            Ce lien de réinitialisation est invalide. Demandez un nouveau lien depuis la page Mot de passe oublié.
          </p>
          <Link to="/auth/forgot-password" className="btn-primary w-full inline-block text-center">
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-5">

        <div>
          <h1 className="text-xl font-semibold text-gray-900">Choisir un nouveau mot de passe</h1>
          <p className="mt-1 text-sm text-gray-500">
            Votre nouveau mot de passe doit contenir au minimum 8 caractères, une majuscule et un chiffre.
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nouveau mot de passe</label>
              <input
                type="password"
                required
                autoFocus
                autoComplete="new-password"
                className="input mt-1 w-full"
                placeholder="Min. 8 car., 1 majuscule, 1 chiffre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Confirmer le mot de passe</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                className={`input mt-1 w-full ${confirm && confirm !== password ? 'border-red-300 focus:ring-red-500/30' : ''}`}
                placeholder="Retapez le même mot de passe"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {confirm && confirm !== password && (
                <p className="mt-1 text-xs text-red-600">Les deux mots de passe ne correspondent pas.</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Réinitialisation…' : 'Réinitialiser mon mot de passe'}
            </button>
          </form>
        ) : (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <p className="font-medium">✓ Mot de passe réinitialisé</p>
            <p className="mt-1">
              Votre mot de passe a été modifié avec succès. Vous allez être redirigé(e) vers la page de connexion…
            </p>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 pt-2 border-t border-gray-100">
          <Link to="/auth/login" className="text-forest-700 hover:text-forest-900 hover:underline">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
