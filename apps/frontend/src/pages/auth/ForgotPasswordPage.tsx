import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '@/features/auth/authApi'

export function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Email requis'); return }
    setLoading(true); setError('')
    try {
      await authApi.forgotPassword(email.trim().toLowerCase())
      // L'API renvoie 200 même si l'email n'existe pas (anti-énumération)
      setSent(true)
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } } }
      if (err?.response?.status === 429) {
        setError('Trop de demandes — réessayez dans quelques minutes.')
      } else {
        setError(err?.response?.data?.error ?? 'Une erreur est survenue. Réessayez plus tard.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-5">

        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mot de passe oublié</h1>
          <p className="mt-1 text-sm text-gray-500">
            Entrez votre email — si un compte Athenis existe, nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                className="input mt-1 w-full"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-medium">✓ Email envoyé</p>
              <p className="mt-1">
                Si <strong>{email}</strong> correspond à un compte Athenis, vous recevrez d'ici quelques minutes
                un email contenant un lien pour choisir un nouveau mot de passe.
              </p>
              <p className="mt-2 text-xs text-green-700">
                Le lien est valable <strong>1 heure</strong>. Pensez à vérifier vos spams.
              </p>
            </div>
            <button onClick={() => { setSent(false); setEmail('') }} className="btn-secondary w-full">
              Renvoyer à une autre adresse
            </button>
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
