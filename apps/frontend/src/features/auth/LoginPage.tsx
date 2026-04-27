import { useState, useId, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './useAuth'
import { homeForType } from './ProtectedRoute'
import { cn } from '@/shared/utils/cn'
import type { FormEvent } from 'react'

type Step = 'credentials' | 'totp'

// ── Static data ───────────────────────────────────────────────────────────────

const FEATURES = [
  { title: 'Sécurisée & conforme',  desc: '2FA, JWT, AES-256' },
  { title: 'Données fiables',       desc: 'SYSCOHADA, CSRD, ESG' },
  { title: 'Accessible partout',    desc: 'Cloud sécurisé' },
  { title: 'Performance optimale',  desc: 'Haute disponibilité' },
]

const STATS = [
  { value: '1 250+', label: 'Clients' },
  { value: '2,8M+',  label: 'Transactions' },
  { value: '99,9%',  label: 'Disponibilité' },
]

// ── Small components ──────────────────────────────────────────────────────────

function FeatureItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-800 text-white">
        ✓
      </div>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="text-sm text-green-200">{desc}</p>
      </div>
    </div>
  )
}


function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-green-600" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

// ── LoginPage ─────────────────────────────────────────────────────────────────

export function LoginPage() {
  const { login, loginVerifyTotp } = useAuth()
  const navigate = useNavigate()

  const emailId    = useId()
  const passwordId = useId()
  const codeId     = useId()

  const [step, setStep]           = useState<Step>('credentials')
  const [tempToken, setTempToken] = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [otp, setOtp]             = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [shake, setShake]         = useState(false)

  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!shake) return
    const t = setTimeout(() => setShake(false), 500)
    return () => clearTimeout(t)
  }, [shake])

  useEffect(() => {
    if (otp.length === 6) void handleVerify2FA()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  async function handleCredentials(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { requires2fa, tempToken: tt, accountType } = await login(email, password)
      if (requires2fa && tt) {
        setTempToken(tt)
        setStep('totp')
      } else {
        navigate(homeForType(accountType ?? 'COMPANY'), { replace: true })
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Identifiants incorrects')
      setShake(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify2FA() {
    if (loading) return
    setError('')
    setLoading(true)
    try {
      await loginVerifyTotp(tempToken, otp)
      navigate('/', { replace: true })
    } catch {
      setError('Code incorrect ou expiré')
      setShake(true)
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0) }
          20%     { transform: translateX(-7px) }
          40%     { transform: translateX(7px) }
          60%     { transform: translateX(-4px) }
          80%     { transform: translateX(4px) }
        }
      `}</style>

      {/* ── Colonne gauche ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-green-950 via-green-900 to-green-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.15),transparent)]" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo-athenis.svg" alt="Athenis" className="w-10 h-10" />
            <span className="text-white text-2xl font-bold">Athenis</span>
          </div>

          <span className="text-green-200 text-xs bg-green-800 px-3 py-1 rounded-full">
            PLATEFORME FINANCIÈRE INTELLIGENTE
          </span>

          <h2 className="text-4xl font-bold text-white mt-6 mb-4">
            Pilotez votre activité financière avec précision
          </h2>

          <p className="text-green-200 mb-8">
            Plateforme tout-en-un pour la gestion financière, comptable et ESG.
          </p>

          <div className="space-y-4">
            {FEATURES.map((f) => <FeatureItem key={f.title} {...f} />)}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-8">
            {STATS.map((s) => (
              <div key={s.label} className="bg-green-800/40 backdrop-blur-md p-5 rounded-xl text-center border border-green-700/30 hover:scale-105 transition">
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-green-200">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 relative flex justify-center">
            {/* tablette */}
            <img
              src="/mockup-dashboard.svg"
              alt="dashboard"
              className="rounded-xl shadow-2xl w-[420px]"
            />
            {/* mobile */}
            <img
              src="/mockup-mobile.svg"
              alt="mobile"
              className="absolute bottom-0 right-[10%] w-[160px] rounded-xl shadow-xl border border-white/10"
            />
          </div>
        </div>

        <div className="text-green-200 text-xs mt-6">
          OHADA • ISO 27001 • GDPR • SOC2
        </div>
      </div>

      {/* ── Colonne droite ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">

          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
            Bienvenue sur Athenis
          </h2>
          <p className="mb-6 text-center text-gray-500">
            Connectez-vous ou créez un compte
          </p>

          {/* Tabs */}
          {step === 'credentials' && (
            <div className="mb-6 flex overflow-hidden rounded-lg border">
              <button
                type="button"
                className="flex-1 py-2 bg-green-700 text-white font-medium transition"
              >
                Se connecter
              </button>
              <Link
                to="/auth/register"
                className="flex flex-1 items-center justify-center py-2 bg-gray-100 text-gray-600 font-medium transition hover:bg-gray-200"
              >
                Créer un compte
              </Link>
            </div>
          )}

          {/* Étape 2 : indicateur TOTP */}
          {step === 'totp' && (
            <div className="mb-5 flex gap-1.5">
              <div className="h-1 flex-1 rounded-full bg-green-700" />
              <div className="h-1 flex-1 rounded-full bg-green-700" />
            </div>
          )}

          {/* Formulaire avec animation shake */}
          <div
            ref={formRef}
            style={shake ? { animation: 'shake 0.4s ease-in-out' } : undefined}
          >
            {step === 'credentials' ? (
              <form onSubmit={handleCredentials} className="space-y-4">
                {/* Email */}
                <div>
                  <label htmlFor={emailId} className="mb-1 block text-sm font-medium text-gray-600">
                    Adresse email
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="vous@entreprise.cm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>

                {/* Mot de passe */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label htmlFor={passwordId} className="text-sm font-medium text-gray-600">
                      Mot de passe
                    </label>
                    <button type="button" className="text-xs text-green-700 hover:underline">
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id={passwordId}
                      type={showPw ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                    <button
                      type="button"
                      aria-label={showPw ? 'Masquer' : 'Afficher'}
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <EyeIcon open={showPw} />
                    </button>
                  </div>
                </div>

                {/* Erreur */}
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                    <span className="text-red-400 text-sm">⚠</span>
                    <p role="alert" className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Bouton connexion */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 py-3 text-sm font-medium text-white transition hover:bg-green-800 disabled:opacity-70"
                >
                  {loading ? <><Spinner />Connexion…</> : 'Se connecter'}
                </button>

                <div className="text-center text-sm text-gray-400">ou</div>

                {/* Google */}
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2.5 rounded-lg border py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  <GoogleIcon />
                  Continuer avec Google
                </button>

              </form>
            ) : (
              /* ── Étape TOTP ────────────────────────────────────────────── */
              <div className="space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50">
                  <ShieldIcon />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">Vérification en 2 étapes</p>
                  <p className="mt-1 text-sm text-gray-400">Entrez le code de votre application d'authentification</p>
                </div>
                <input
                  id={codeId}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="h-14 w-full rounded-lg border-2 border-gray-200 text-center text-2xl font-mono tracking-[10px] focus:border-green-600 focus:outline-none"
                  placeholder="······"
                  aria-label="Code 2FA à 6 chiffres"
                />
                {error && (
                  <p role="alert" className="text-center text-sm text-red-600">{error}</p>
                )}
                {loading && <div className="flex justify-center text-gray-400"><Spinner /></div>}
                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setError(''); setOtp('') }}
                  className="w-full text-center text-sm text-gray-400 transition hover:text-gray-600"
                >
                  ← Retour à la connexion
                </button>
              </div>
            )}
          </div>

          {/* CTA inscription */}
          {step === 'credentials' && (
            <div className="mt-6 rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-700 mb-1">Nouveau sur Athenis ?</p>
              <Link to="/auth/register" className="text-sm font-semibold text-green-700 hover:underline">
                Créer un compte gratuit
              </Link>
            </div>
          )}

          {/* Footer */}
          <div className={cn('flex justify-between text-xs text-gray-400', step === 'credentials' ? 'mt-4' : 'mt-6')}>
            <span>🔒 Sécurisé</span>
            <span>🛡️ Données protégées</span>
            <span>💬 Support 24/7</span>
          </div>
        </div>
      </div>
    </div>
  )
}
