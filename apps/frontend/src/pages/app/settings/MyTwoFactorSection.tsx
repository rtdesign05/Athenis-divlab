import { useState, useEffect, useId, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { securityApi, type TotpSetup, type MfaMethod } from '@/services/securityApi'

// ── Subcomponents ─────────────────────────────────────────────────────────────

function CodeInput({
  value, onChange, onSubmit, disabled,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit?: () => void
  disabled?: boolean
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={6}
      autoComplete="one-time-code"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      onKeyDown={(e) => { if (e.key === 'Enter' && value.length === 6) onSubmit?.() }}
      placeholder="000000"
      disabled={disabled}
      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20 disabled:bg-gray-50 disabled:text-gray-400"
    />
  )
}

function BackupCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false)

  function copyAll() {
    const text = codes.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => { /* ignore */ })
  }

  function downloadTxt() {
    const blob = new Blob(
      [
        'Athenis — Codes de récupération 2FA\n',
        `Généré le : ${new Date().toLocaleString('fr-FR')}\n\n`,
        'Important :\n',
        '- Chaque code ne peut être utilisé qu\'une seule fois.\n',
        '- Conserve ces codes dans un endroit sûr.\n',
        '- Si tu perds ton téléphone / accès email, ces codes te permettent de te reconnecter.\n\n',
        ...codes.map((c, i) => `${String(i + 1).padStart(2, ' ')}. ${c}\n`),
      ],
      { type: 'text/plain;charset=utf-8' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `athenis-codes-2fa-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">
          ⚠️ Sauvegarde ces codes maintenant — ils ne seront plus jamais affichés.
        </p>
        <p className="mt-1 text-xs text-amber-800">
          Si tu perds ton téléphone / accès email, chaque code te permet de te reconnecter UNE fois.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
        {codes.map((code, i) => (
          <div key={i} className="font-mono text-sm tracking-wider text-gray-800 select-all">
            <span className="text-gray-400 mr-2">{String(i + 1).padStart(2, '0')}.</span>
            {code}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copyAll}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {copied ? '✓ Copié !' : '📋 Copier tous'}
        </button>
        <button type="button" onClick={downloadTxt}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          ⬇️ Télécharger (.txt)
        </button>
        <button type="button" onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          🖨️ Imprimer
        </button>
      </div>
    </div>
  )
}

// ── Method card (sélecteur) ───────────────────────────────────────────────────

function MethodCard({
  icon, title, description, badge, recommended, disabled, onClick,
}: {
  icon: string
  title: string
  description: string
  badge?: string | undefined
  recommended?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative w-full text-left rounded-xl border-2 p-4 transition-all ${
        disabled
          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
          : 'border-gray-200 bg-white hover:border-forest-500 hover:shadow-sm'
      }`}
    >
      {recommended && (
        <span className="absolute -top-2 right-3 rounded-full bg-forest-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Recommandé
        </span>
      )}
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{description}</p>
          {badge && (
            <p className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
              {badge}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

type Step =
  | 'loading'
  | 'disabled'              // pas de MFA, choix de méthode
  | 'setup_totp'            // QR code + saisie code
  | 'setup_email'           // demande code → saisie code
  | 'setup_email_verify'
  | 'setup_sms_phone'       // saisie téléphone
  | 'setup_sms_verify'      // saisie code SMS
  | 'just_enabled'          // affichage backup codes
  | 'enabled'               // MFA actif
  | 'disable_form'          // form pour désactiver

export function MyTwoFactorSection() {
  const qc = useQueryClient()
  const codeInputId = useId()
  const phoneInputId = useId()

  const [step, setStep] = useState<Step>('loading')
  const [totpData, setTotpData] = useState<TotpSetup | null>(null)
  const [code, setCode] = useState('')
  const [phoneInput, setPhoneInput] = useState('+237')
  const [maskedTarget, setMaskedTarget] = useState<string>('')
  const [smsConfiguredWarning, setSmsConfiguredWarning] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [activeMethod, setActiveMethod] = useState<MfaMethod>('NONE')

  // Disable flow
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [disableError, setDisableError] = useState('')

  // ── Initial status fetch ────────────────────────────────────────────────────

  const statusQuery = useQuery({
    queryKey: ['auth', 'mfa', 'status'],
    queryFn:  () => securityApi.mfaStatus(),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (statusQuery.data) {
      setActiveMethod(statusQuery.data.method)
      setStep(statusQuery.data.enabled ? 'enabled' : 'disabled')
    }
  }, [statusQuery.data])

  // ── Mutations ──────────────────────────────────────────────────────────────

  const totpSetupMut = useMutation({
    mutationFn: () => securityApi.totpSetup(),
    onSuccess: (data) => { setTotpData(data); setStep('setup_totp'); setErrorMsg('') },
    onError:   () => setErrorMsg('Impossible de démarrer la configuration TOTP. Réessaie.'),
  })

  const totpEnableMut = useMutation({
    mutationFn: (c: string) => securityApi.totpEnable(c),
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes); setStep('just_enabled'); setCode(''); setErrorMsg('')
      qc.invalidateQueries({ queryKey: ['auth', 'mfa', 'status'] })
    },
    onError: (err: { response?: { data?: { error?: string; code?: string } } }) => {
      const c = err.response?.data?.code
      setErrorMsg(c === 'TOTP_INVALID' ? 'Code incorrect. Vérifie l\'heure de ton téléphone.' : (err.response?.data?.error ?? 'Erreur.'))
    },
  })

  const setupEmailMut = useMutation({
    mutationFn: () => securityApi.setupEmailMfa(),
    onSuccess: (data) => { setMaskedTarget(data.maskedEmail); setStep('setup_email_verify'); setErrorMsg('') },
    onError:   (err: { response?: { data?: { error?: string } } }) => setErrorMsg(err.response?.data?.error ?? 'Erreur d\'envoi.'),
  })

  const setupSmsMut = useMutation({
    mutationFn: (phone: string) => securityApi.setupSmsMfa(phone),
    onSuccess: (data) => {
      setMaskedTarget(data.maskedPhone)
      setSmsConfiguredWarning(!data.smsConfigured)
      setStep('setup_sms_verify')
      setErrorMsg('')
    },
    onError: (err: { response?: { data?: { error?: string } } }) => setErrorMsg(err.response?.data?.error ?? 'Erreur d\'envoi SMS.'),
  })

  const verifySetupMut = useMutation({
    mutationFn: ({ method, code }: { method: 'EMAIL' | 'SMS'; code: string }) => securityApi.verifyMfaSetup(method, code),
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes); setStep('just_enabled'); setCode(''); setErrorMsg('')
      qc.invalidateQueries({ queryKey: ['auth', 'mfa', 'status'] })
    },
    onError: (err: { response?: { data?: { error?: string; code?: string } } }) => {
      const c = err.response?.data?.code
      setErrorMsg(
        c === 'MFA_CODE_INVALID'      ? 'Code incorrect.'
        : c === 'MFA_CODE_EXPIRED'    ? 'Code expiré. Demande un nouveau code.'
        : c === 'MFA_TOO_MANY_ATTEMPTS' ? 'Trop de tentatives. Recommence la configuration.'
        : (err.response?.data?.error ?? 'Erreur de vérification.'),
      )
    },
  })

  const disableMut = useMutation({
    mutationFn: ({ password, code }: { password: string; code: string }) => securityApi.disableMfa(password, code),
    onSuccess: () => {
      setStep('disabled'); setDisablePassword(''); setDisableCode(''); setDisableError(''); setBackupCodes([]); setTotpData(null); setActiveMethod('NONE')
      qc.invalidateQueries({ queryKey: ['auth', 'mfa', 'status'] })
    },
    onError: (err: { response?: { data?: { error?: string; code?: string } } }) => {
      const c = err.response?.data?.code
      setDisableError(
        c === 'INVALID_CREDENTIALS' ? 'Mot de passe incorrect.'
        : c === 'MFA_CODE_INVALID'  ? 'Code 2FA incorrect.'
        : c === 'MFA_NO_CODE'       ? 'Demande un nouveau code d\'abord.'
        : (err.response?.data?.error ?? 'Erreur.'),
      )
    },
  })

  const sendCodeForDisableMut = useMutation({
    mutationFn: () => securityApi.sendMfaCode(),
    onError:    () => setDisableError('Impossible d\'envoyer un nouveau code.'),
  })

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleVerifyEmail(e?: FormEvent) {
    e?.preventDefault()
    if (code.length !== 6) { setErrorMsg('Entre un code à 6 chiffres.'); return }
    verifySetupMut.mutate({ method: 'EMAIL', code })
  }

  function handleVerifySms(e?: FormEvent) {
    e?.preventDefault()
    if (code.length !== 6) { setErrorMsg('Entre un code à 6 chiffres.'); return }
    verifySetupMut.mutate({ method: 'SMS', code })
  }

  function handleSubmitPhone(e: FormEvent) {
    e.preventDefault()
    const cleaned = phoneInput.replace(/[\s\-().]/g, '')
    if (!/^\+\d{8,15}$/.test(cleaned)) {
      setErrorMsg('Format invalide. Utilise le format international (ex : +237691234567).')
      return
    }
    setErrorMsg('')
    setupSmsMut.mutate(cleaned)
  }

  function handleConfirmTotp(e?: FormEvent) {
    e?.preventDefault()
    if (code.length !== 6) { setErrorMsg('Entre un code à 6 chiffres.'); return }
    totpEnableMut.mutate(code)
  }

  function handleDisable(e: FormEvent) {
    e.preventDefault()
    setDisableError('')
    if (!disablePassword)             { setDisableError('Mot de passe requis.'); return }
    if (disableCode.length !== 6)     { setDisableError('Code à 6 chiffres requis.'); return }
    disableMut.mutate({ password: disablePassword, code: disableCode })
  }

  function startDisable() {
    setStep('disable_form')
    setDisableError(''); setDisablePassword(''); setDisableCode('')
    // Pour EMAIL/SMS : on demande au backend d'envoyer un code de validation
    if (activeMethod === 'EMAIL' || activeMethod === 'SMS') {
      sendCodeForDisableMut.mutate()
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const smsStatus = statusQuery.data
  const methodLabel: Record<MfaMethod, string> = {
    NONE:  'Aucune',
    TOTP:  'Application d\'authentification',
    EMAIL: 'Code par e-mail',
    SMS:   'Code par SMS',
  }

  return (
    <div className="space-y-1">
      <h2 className="text-sm font-semibold text-gray-800">Authentification à deux facteurs (2FA)</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">

        {step === 'loading' && <p className="text-sm text-gray-400">Chargement…</p>}

        {/* ── DÉSACTIVÉ : choix de méthode ────────────────────────────────── */}
        {step === 'disabled' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">● Désactivé</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Choisis comment recevoir ton code à 6 chiffres à chaque connexion. Le 2FA empêche
              quelqu'un qui aurait ton mot de passe de se connecter sans accès à ton téléphone ou ta boîte mail.
            </p>

            <div className="space-y-3 pt-1">
              <MethodCard
                icon="🔑"
                title="Application d'authentification"
                description="Google Authenticator, Authy, 1Password… Génère un code 6 chiffres toutes les 30 sec. Fonctionne sans internet, sans frais."
                recommended
                onClick={() => totpSetupMut.mutate()}
              />
              <MethodCard
                icon="✉️"
                title="Code par e-mail"
                description={`Reçois un code par e-mail à ${smsStatus?.maskedEmail ?? 'ton adresse'} à chaque connexion. Pas d'app à installer.`}
                onClick={() => setupEmailMut.mutate()}
              />
              <MethodCard
                icon="📱"
                title="Code par SMS"
                description="Reçois un code par SMS sur ton téléphone à chaque connexion. Pratique mais nécessite du réseau."
                badge={smsStatus?.smsConfigured === false ? 'Provider SMS non configuré côté serveur (mode test)' : undefined}
                onClick={() => { setPhoneInput('+237'); setErrorMsg(''); setStep('setup_sms_phone') }}
              />
            </div>

            {errorMsg && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>}
          </div>
        )}

        {/* ── SETUP TOTP : QR code ────────────────────────────────────────── */}
        {step === 'setup_totp' && totpData && (
          <form onSubmit={handleConfirmTotp} className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">🔑 Application d'authentification</p>
              <button type="button" onClick={() => { setStep('disabled'); setCode(''); setErrorMsg('') }}
                className="text-xs text-gray-500 hover:text-gray-700">← Changer de méthode</button>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900">1. Scanne le QR code</p>
              <p className="mt-1 text-xs text-gray-500">Ouvre Google Authenticator, Authy ou 1Password puis scanne ce QR code.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <img src={totpData.qrCodeDataUrl} alt="QR code 2FA" className="w-44 h-44 rounded-lg border border-gray-200 bg-white" />
              <div className="text-xs text-gray-500 space-y-2">
                <p><strong className="text-gray-700">Pas de scanner ?</strong> Entre ce code manuellement :</p>
                <code className="block break-all rounded bg-gray-100 px-2 py-1.5 font-mono text-[11px] text-gray-800">{totpData.secret}</code>
                <p className="text-gray-400 italic">Chiffré AES-256 côté serveur.</p>
              </div>
            </div>

            <div>
              <label htmlFor={codeInputId} className="block text-sm font-semibold text-gray-900 mb-1">2. Code à 6 chiffres</label>
              <CodeInput value={code} onChange={setCode} onSubmit={handleConfirmTotp} disabled={totpEnableMut.isPending} />
            </div>

            {errorMsg && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>}

            <div className="flex gap-2">
              <button type="submit" disabled={totpEnableMut.isPending || code.length !== 6}
                className="rounded-lg bg-forest-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50">
                {totpEnableMut.isPending ? 'Vérification…' : 'Activer'}
              </button>
              <button type="button" onClick={() => { setStep('disabled'); setTotpData(null); setCode(''); setErrorMsg('') }}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
            </div>
          </form>
        )}

        {/* ── SETUP EMAIL : confirmation ──────────────────────────────────── */}
        {step === 'setup_email_verify' && (
          <form onSubmit={handleVerifyEmail} className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">✉️ Vérification e-mail</p>
              <button type="button" onClick={() => { setStep('disabled'); setCode(''); setErrorMsg('') }}
                className="text-xs text-gray-500 hover:text-gray-700">← Changer de méthode</button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Un code à 6 chiffres a été envoyé à <strong>{maskedTarget}</strong>. Vérifie ta boîte mail (et les spams).
              Le code expire dans 10 min.
            </p>

            <div>
              <label htmlFor={codeInputId} className="block text-sm font-semibold text-gray-900 mb-1">Code reçu par e-mail</label>
              <CodeInput value={code} onChange={setCode} onSubmit={handleVerifyEmail} disabled={verifySetupMut.isPending} />
            </div>

            {errorMsg && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>}

            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={verifySetupMut.isPending || code.length !== 6}
                className="rounded-lg bg-forest-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50">
                {verifySetupMut.isPending ? 'Vérification…' : 'Activer'}
              </button>
              <button type="button" onClick={() => setupEmailMut.mutate()}
                disabled={setupEmailMut.isPending}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                {setupEmailMut.isPending ? '…' : 'Renvoyer un code'}
              </button>
              <button type="button" onClick={() => { setStep('disabled'); setCode(''); setErrorMsg('') }}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50">Annuler</button>
            </div>
          </form>
        )}

        {/* ── SETUP SMS : étape 1 saisie téléphone ────────────────────────── */}
        {step === 'setup_sms_phone' && (
          <form onSubmit={handleSubmitPhone} className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">📱 Vérification SMS — étape 1</p>
              <button type="button" onClick={() => { setStep('disabled'); setErrorMsg('') }}
                className="text-xs text-gray-500 hover:text-gray-700">← Changer de méthode</button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Entre ton numéro de téléphone au format international.
              Exemples : <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">+237691234567</code> (Cameroun),
              <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs ml-1">+33612345678</code> (France).
            </p>

            <div>
              <label htmlFor={phoneInputId} className="block text-sm font-semibold text-gray-900 mb-1">Numéro de téléphone</label>
              <input
                id={phoneInputId}
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+237691234567"
                inputMode="tel"
                autoComplete="tel"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base font-mono focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
              />
            </div>

            {errorMsg && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>}

            <div className="flex gap-2">
              <button type="submit" disabled={setupSmsMut.isPending}
                className="rounded-lg bg-forest-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50">
                {setupSmsMut.isPending ? 'Envoi du SMS…' : 'Envoyer le code'}
              </button>
              <button type="button" onClick={() => { setStep('disabled'); setErrorMsg('') }}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50">Annuler</button>
            </div>
          </form>
        )}

        {/* ── SETUP SMS : étape 2 saisie code ─────────────────────────────── */}
        {step === 'setup_sms_verify' && (
          <form onSubmit={handleVerifySms} className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">📱 Vérification SMS — étape 2</p>
              <button type="button" onClick={() => { setStep('setup_sms_phone'); setCode(''); setErrorMsg('') }}
                className="text-xs text-gray-500 hover:text-gray-700">← Changer de numéro</button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Un code à 6 chiffres a été envoyé au <strong>{maskedTarget}</strong>. Le code expire dans 10 min.
            </p>

            {smsConfiguredWarning && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                ⚠️ <strong>Mode test</strong> : le provider SMS n'est pas encore configuré côté serveur,
                le code apparaît uniquement dans les logs serveur. Demande à ton administrateur de
                configurer Twilio / Africa's Talking / Vonage.
              </div>
            )}

            <div>
              <label htmlFor={codeInputId} className="block text-sm font-semibold text-gray-900 mb-1">Code reçu par SMS</label>
              <CodeInput value={code} onChange={setCode} onSubmit={handleVerifySms} disabled={verifySetupMut.isPending} />
            </div>

            {errorMsg && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>}

            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={verifySetupMut.isPending || code.length !== 6}
                className="rounded-lg bg-forest-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50">
                {verifySetupMut.isPending ? 'Vérification…' : 'Activer'}
              </button>
              <button type="button" onClick={() => setupSmsMut.mutate(phoneInput.replace(/[\s\-().]/g, ''))}
                disabled={setupSmsMut.isPending}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                {setupSmsMut.isPending ? '…' : 'Renvoyer un code'}
              </button>
            </div>
          </form>
        )}

        {/* ── JUST ENABLED : backup codes ─────────────────────────────────── */}
        {step === 'just_enabled' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <span className="text-xl">✅</span>
              <p className="font-semibold">2FA activé avec succès !</p>
            </div>
            <p className="text-sm text-gray-600">
              À ta prochaine connexion, on te demandera un code à 6 chiffres en plus de ton mot de passe.
            </p>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Tes 8 codes de récupération</p>
              <BackupCodes codes={backupCodes} />
            </div>

            <button onClick={() => setStep('enabled')}
              className="rounded-lg bg-forest-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-forest-800">
              J'ai sauvegardé mes codes — Terminer
            </button>
          </div>
        )}

        {/* ── ENABLED ─────────────────────────────────────────────────────── */}
        {step === 'enabled' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">● Activé</span>
                  <span className="text-xs text-gray-500">Méthode : <strong className="text-gray-700">{methodLabel[activeMethod]}</strong></span>
                </div>
                <p className="text-sm text-gray-600">
                  {activeMethod === 'TOTP'  && `Tu utilises ton application d'authentification pour générer un code à chaque connexion.`}
                  {activeMethod === 'EMAIL' && `Tu reçois un code par e-mail (${smsStatus?.maskedEmail ?? ''}) à chaque connexion.`}
                  {activeMethod === 'SMS'   && `Tu reçois un code par SMS (${smsStatus?.maskedPhone ?? ''}) à chaque connexion.`}
                </p>
              </div>
              <button onClick={startDisable}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                Désactiver
              </button>
            </div>
          </div>
        )}

        {/* ── DISABLE FORM ───────────────────────────────────────────────── */}
        {step === 'disable_form' && (
          <form onSubmit={handleDisable} className="rounded-lg border border-red-200 bg-red-50/40 p-4 space-y-3">
            <p className="text-sm font-semibold text-red-900">⚠️ Désactiver le 2FA réduit la sécurité de ton compte</p>
            <p className="text-xs text-red-800">
              Pour confirmer, entre ton mot de passe ET un code 2FA valide. Toutes tes sessions actives
              seront déconnectées.
            </p>

            {(activeMethod === 'EMAIL' || activeMethod === 'SMS') && (
              <p className="text-xs text-red-800 bg-red-100 rounded p-2">
                Un nouveau code 2FA t'a été envoyé par {activeMethod === 'EMAIL' ? 'e-mail' : 'SMS'}. Saisis-le ci-dessous.
              </p>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mot de passe</label>
              <input type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20" placeholder="••••••••" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Code 2FA à 6 chiffres</label>
              <CodeInput value={disableCode} onChange={setDisableCode} disabled={disableMut.isPending} />
              {(activeMethod === 'EMAIL' || activeMethod === 'SMS') && (
                <button type="button" onClick={() => sendCodeForDisableMut.mutate()}
                  disabled={sendCodeForDisableMut.isPending}
                  className="mt-1 text-xs text-red-600 hover:underline">
                  Renvoyer un code
                </button>
              )}
            </div>

            {disableError && <p className="text-sm text-red-700">{disableError}</p>}

            <div className="flex gap-2">
              <button type="submit" disabled={disableMut.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {disableMut.isPending ? 'Désactivation…' : 'Confirmer la désactivation'}
              </button>
              <button type="button" onClick={() => setStep('enabled')}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
