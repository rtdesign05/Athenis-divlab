import { useState, useId, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './useAuth'
import { homeForType } from './ProtectedRoute'
import { cn } from '@/shared/utils/cn'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'credentials' | 'totp'

// ── Left panel features ───────────────────────────────────────────────────────

const FEATURES = [
  'Conforme SYSCOHADA · CSRD · ESRS · GRI',
  'Formulaires DGI Cameroun intégrés',
  'Sécurité 2FA · JWT · AES-256',
  'Données hébergées et sécurisées',
]

const BADGES = ['Cameroun', 'France', 'OHADA', 'ISO 27001']

// ── Shield SVG icon ───────────────────────────────────────────────────────────

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-green-600" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ── Eye toggle icon ───────────────────────────────────────────────────────────

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

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

  // Shake animation trigger
  useEffect(() => {
    if (!shake) return
    const t = setTimeout(() => setShake(false), 500)
    return () => clearTimeout(t)
  }, [shake])

  // Auto-submit on 6-digit OTP
  useEffect(() => {
    if (otp.length === 6) void handleVerify2FA()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  async function handleCredentials(e: React.FormEvent) {
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

  function handleDemoLogin() {
    setEmail('ubm@comptalia.fr')
    setPassword('UBM2026!')
    setError('')
    setTimeout(() => {
      const form = formRef.current?.querySelector('form')
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    }, 300)
  }

  return (
    <div className="flex h-screen">
      {/* ── Left column ─────────────────────────────────────────────────────── */}
      <div
        className="hidden md:flex relative w-[42%] flex-col justify-between p-7 overflow-hidden"
        style={{ backgroundColor: '#1b4332' }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Decorative circle */}
        <div
          className="absolute -top-16 -right-16 h-[220px] w-[220px] rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        />
        <div
          className="absolute -top-24 -right-24 h-[280px] w-[280px] rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(255,255,255,0.03)' }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg font-medium text-white text-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.20)' }}
          >
            A
          </div>
          <span className="text-[15px] font-medium text-white">Athenis</span>
        </div>

        {/* Hero */}
        <div className="relative space-y-4">
          <h2 className="text-[17px] font-medium leading-snug text-white">
            Pilotez votre activité financière
            <br />avec précision
          </h2>
          <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
            Gestion financière, comptabilité, RH et ESG dans une plateforme
            sécurisée adaptée à votre pays.
          </p>

          <ul className="mt-5 space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#74c69d' }} />
                </span>
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Country badges */}
        <div className="relative flex flex-wrap gap-1.5">
          {BADGES.map((b) => (
            <span
              key={b}
              className="rounded-full px-2 py-0.5 text-[10px]"
              style={{
                backgroundColor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right column ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 p-6">
        {/* Mobile logo */}
        <div className="absolute top-5 left-5 flex items-center gap-2 md:hidden">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: '#1b4332' }}
          >
            A
          </div>
          <span className="text-[14px] font-medium text-gray-800">Athenis</span>
        </div>

        <div className="w-full max-w-[280px]" ref={formRef}>
          {/* Progress bar */}
          <div className="mb-5 flex gap-1">
            <div className="h-[3px] flex-1 rounded-full" style={{ backgroundColor: '#1b4332' }} />
            <div
              className={cn('h-[3px] flex-1 rounded-full transition-colors duration-200',
                step === 'totp' ? '' : 'bg-gray-200')}
              style={step === 'totp' ? { backgroundColor: '#1b4332' } : {}}
            />
          </div>

          {/* Title */}
          <p className="text-[17px] font-medium text-gray-900">Bon retour</p>
          <p className="mb-5 text-[12px] text-gray-400">
            Connectez-vous à votre espace Athenis
          </p>

          {/* Shake wrapper */}
          <div
            className={cn('transition-transform', shake && 'animate-[shake_0.4s_ease-in-out]')}
            style={shake ? { animation: 'shake 0.4s ease-in-out' } : {}}
          >
            <style>{`
              @keyframes shake {
                0%,100%{transform:translateX(0)}
                20%{transform:translateX(-6px)}
                40%{transform:translateX(6px)}
                60%{transform:translateX(-4px)}
                80%{transform:translateX(4px)}
              }
            `}</style>

            {step === 'credentials' ? (
              <form onSubmit={handleCredentials} className="space-y-3">
                {/* Email */}
                <div>
                  <label htmlFor={emailId} className="mb-1 block text-[11px] font-medium text-gray-500">
                    Adresse email
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@entreprise.cm"
                    className="h-9 w-full rounded-lg border border-gray-200 px-3 text-[12px] text-gray-900 placeholder-gray-400 outline-none focus:border-[#1b4332] focus:ring-1 focus:ring-[#1b4332]/20 transition-colors"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label htmlFor={passwordId} className="text-[11px] font-medium text-gray-500">
                      Mot de passe
                    </label>
                    <button
                      type="button"
                      className="text-[10px] hover:underline focus-visible:outline-none"
                      style={{ color: '#1b4332' }}
                    >
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
                      className="h-9 w-full rounded-lg border border-gray-200 px-3 pr-9 text-[12px] text-gray-900 outline-none focus:border-[#1b4332] focus:ring-1 focus:ring-[#1b4332]/20 transition-colors"
                    />
                    <button
                      type="button"
                      aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-none"
                    >
                      <EyeIcon open={showPw} />
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p role="alert" className="text-[11px] text-red-600">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-lg text-[12px] font-medium text-white transition-colors disabled:opacity-70"
                  style={{ backgroundColor: loading ? '#1b4332' : '#1b4332' }}
                  onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0a2e1f' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1b4332' }}
                >
                  {loading ? <><Spinner />Connexion…</> : 'Se connecter'}
                </button>

                {/* Demo separator */}
                <div className="flex items-center gap-2 py-1">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-[10px] text-gray-400">Accès démo</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {/* Demo block */}
                <div className="rounded-lg border border-green-100 bg-white p-2.5">
                  <p className="mb-1.5 text-[11px] font-medium text-green-800">Accès démo instantané</p>
                  <div className="space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-[10px]" style={{ color: 'rgba(22,101,52,0.70)' }}>Email</span>
                      <span className="font-mono text-[10px] text-green-700">ubm@comptalia.fr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px]" style={{ color: 'rgba(22,101,52,0.70)' }}>Mot de passe</span>
                      <span className="font-mono text-[10px] text-green-700">UBM2026!</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={loading}
                    className="mt-2 flex h-7 w-full items-center justify-center rounded-md bg-green-800 text-[11px] text-white transition-colors hover:bg-green-900 disabled:opacity-60"
                  >
                    Se connecter en démo
                  </button>
                </div>

                {/* Register link */}
                <p className="mt-3 text-center text-[10px] text-gray-400">
                  <Link
                    to="/auth/register"
                    className="hover:underline focus-visible:outline-none"
                    style={{ color: '#1b4332' }}
                  >
                    Créer un compte gratuit
                  </Link>
                </p>
              </form>
            ) : (
              /* ── Step 2: TOTP ─────────────────────────────────────────── */
              <div className="space-y-3">
                {/* Icon */}
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-green-50">
                  <ShieldIcon />
                </div>

                <p className="text-center text-[15px] font-medium text-gray-900">
                  Vérification en 2 étapes
                </p>
                <p className="mb-4 text-center text-[12px] text-gray-400">
                  Entrez le code de votre application
                </p>

                {/* OTP input */}
                <input
                  id={codeId}
                  aria-label="Code d'authentification à 6 chiffres"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="h-12 w-full rounded-lg border-2 border-gray-200 text-center text-xl font-mono tracking-[8px] outline-none transition-colors focus:border-[#1b4332]"
                  placeholder="······"
                />

                {error && (
                  <p role="alert" className="text-center text-[11px] text-red-600">
                    {error}
                  </p>
                )}

                {loading && (
                  <div className="flex justify-center">
                    <Spinner />
                  </div>
                )}

                {/* Back */}
                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setError(''); setOtp('') }}
                  className="mt-3 w-full text-center text-[11px] text-gray-400 hover:text-gray-600 transition-colors focus-visible:outline-none"
                >
                  ← Retour
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
