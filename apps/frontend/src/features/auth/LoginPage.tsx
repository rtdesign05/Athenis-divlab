import { useState, useId } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './useAuth'
import { homeForType } from './ProtectedRoute'
import { Button } from '@/shared/components/ui/Button'

type Step = 'credentials' | 'totp'

interface FormState {
  email: string
  password: string
  code: string
}

export function LoginPage() {
  const { login, loginVerifyTotp } = useAuth()
  const navigate = useNavigate()
  const emailId = useId()
  const passwordId = useId()
  const codeId = useId()

  const [step, setStep] = useState<Step>('credentials')
  const [tempToken, setTempToken] = useState('')
  const [form, setForm] = useState<FormState>({ email: '', password: '', code: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { requires2fa, tempToken: tt, accountType } = await login(form.email, form.password)
      if (requires2fa && tt) {
        setTempToken(tt)
        setStep('totp')
      } else {
        navigate(homeForType(accountType ?? 'COMPANY'), { replace: true })
      }

    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Identifiants incorrects')
    } finally {
      setLoading(false)
    }
  }

  async function handleTotp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginVerifyTotp(tempToken, form.code)
      // user is now set — navigate to root and let guards redirect
      navigate('/', { replace: true })
    } catch {
      setError('Code incorrect ou expiré')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-forest-50 to-gray-100 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-700 text-white font-bold text-2xl shadow-lg mb-4">
            A
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Athenis</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 'credentials'
              ? 'Connectez-vous à votre espace'
              : 'Vérification en deux étapes'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card-md p-8">
          {step === 'credentials' ? (
            <form onSubmit={handleCredentials} className="space-y-5">
              <div>
                <label htmlFor={emailId} className="block text-sm font-medium text-gray-700 mb-1.5">
                  Adresse email
                </label>
                <input
                  id={emailId}
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={set('email')}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 focus:border-transparent"
                  placeholder="vous@exemple.com"
                />
              </div>

              <div>
                <label htmlFor={passwordId} className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mot de passe
                </label>
                <input
                  id={passwordId}
                  type="password"
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={set('password')}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 focus:border-transparent"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" loading={loading}>
                Se connecter
              </Button>

              <p className="text-center text-sm text-gray-500">
                Pas encore de compte ?{' '}
                <Link to="/auth/register" className="text-forest-700 font-medium hover:underline">
                  Créer un compte
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleTotp} className="space-y-5">
              <div>
                <label htmlFor={codeId} className="block text-sm font-medium text-gray-700 mb-1.5">
                  Code d'authentification
                </label>
                <input
                  id={codeId}
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000 000"
                  autoFocus
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value.replace(/\D/g, '') }))
                  }
                  className="w-full h-14 px-4 rounded-lg border border-gray-300 text-center text-3xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-forest-600 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Entrez le code de votre application d'authentification (6 chiffres)
                </p>
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" loading={loading}>
                Vérifier
              </Button>

              <button
                type="button"
                onClick={() => { setStep('credentials'); setError('') }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Retour à la connexion
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
