import { useState, useEffect, useId, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { securityApi, type TotpSetup } from '@/services/securityApi'

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
        `Généré le : ${new Date().toLocaleString('fr-FR')}\n`,
        '\n',
        'Important :\n',
        '- Chaque code ne peut être utilisé qu\'une seule fois.\n',
        '- Conserve ces codes dans un endroit sûr (gestionnaire de mots de passe, coffre).\n',
        '- Si tu perds ton téléphone, ces codes te permettent de te reconnecter.\n',
        '\n',
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
          Si tu perds ton téléphone, chaque code te permet de te reconnecter UNE seule fois.
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
        <button
          type="button"
          onClick={copyAll}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {copied ? '✓ Copié !' : '📋 Copier tous'}
        </button>
        <button
          type="button"
          onClick={downloadTxt}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ⬇️ Télécharger (.txt)
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          🖨️ Imprimer
        </button>
      </div>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

type Step = 'loading' | 'disabled' | 'setting_up' | 'just_enabled' | 'enabled'

export function MyTwoFactorSection() {
  const qc = useQueryClient()
  const codeInputId = useId()

  const [step, setStep] = useState<Step>('loading')
  const [setupData, setSetupData] = useState<TotpSetup | null>(null)
  const [code, setCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  // Disable flow
  const [showDisable, setShowDisable] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [disableError, setDisableError] = useState('')

  // ── Initial status fetch ────────────────────────────────────────────────────

  const statusQuery = useQuery({
    queryKey: ['auth', 'totp', 'status'],
    queryFn:  () => securityApi.totpStatus(),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (statusQuery.data) {
      setStep(statusQuery.data.enabled ? 'enabled' : 'disabled')
    }
  }, [statusQuery.data])

  // ── Mutations ──────────────────────────────────────────────────────────────

  const setupMut = useMutation({
    mutationFn: () => securityApi.totpSetup(),
    onSuccess: (data) => {
      setSetupData(data)
      setStep('setting_up')
      setErrorMsg('')
    },
    onError: () => setErrorMsg('Impossible de démarrer la configuration. Réessaie.'),
  })

  const enableMut = useMutation({
    mutationFn: (c: string) => securityApi.totpEnable(c),
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes)
      setStep('just_enabled')
      setCode('')
      setErrorMsg('')
      qc.invalidateQueries({ queryKey: ['auth', 'totp', 'status'] })
    },
    onError: (err: { response?: { data?: { error?: string; code?: string } } }) => {
      const code = err.response?.data?.code
      setErrorMsg(
        code === 'TOTP_INVALID'
          ? 'Code incorrect. Vérifie que l\'heure de ton téléphone est synchronisée.'
          : (err.response?.data?.error ?? 'Erreur. Réessaie.')
      )
    },
  })

  const disableMut = useMutation({
    mutationFn: ({ password, code }: { password: string; code: string }) =>
      securityApi.totpDisable(password, code),
    onSuccess: () => {
      setStep('disabled')
      setShowDisable(false)
      setDisablePassword('')
      setDisableCode('')
      setDisableError('')
      setBackupCodes([])
      setSetupData(null)
      qc.invalidateQueries({ queryKey: ['auth', 'totp', 'status'] })
    },
    onError: (err: { response?: { data?: { error?: string; code?: string } } }) => {
      const code = err.response?.data?.code
      setDisableError(
        code === 'INVALID_CREDENTIALS' ? 'Mot de passe incorrect.'
          : code === 'TOTP_INVALID'    ? 'Code 2FA incorrect.'
          : (err.response?.data?.error ?? 'Erreur. Réessaie.')
      )
    },
  })

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleConfirmEnable(e?: FormEvent) {
    e?.preventDefault()
    if (code.length !== 6) {
      setErrorMsg('Entre un code à 6 chiffres.')
      return
    }
    enableMut.mutate(code)
  }

  function handleDisable(e: FormEvent) {
    e.preventDefault()
    setDisableError('')
    if (!disablePassword) { setDisableError('Mot de passe requis.'); return }
    if (disableCode.length !== 6) { setDisableError('Code à 6 chiffres requis.'); return }
    disableMut.mutate({ password: disablePassword, code: disableCode })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-1">
      <h2 className="text-sm font-semibold text-gray-800">Authentification à deux facteurs (2FA)</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">

        {step === 'loading' && (
          <p className="text-sm text-gray-400">Chargement…</p>
        )}

        {/* ── État : DÉSACTIVÉ ──────────────────────────────────────────── */}
        {step === 'disabled' && (
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  ● Désactivé
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Renforce la sécurité de ton compte avec une application d'authentification
                <strong> (Google Authenticator, Authy, 1Password, etc.)</strong>. À chaque connexion,
                tu devras saisir un code à 6 chiffres généré sur ton téléphone.
              </p>
            </div>
            <button
              onClick={() => setupMut.mutate()}
              disabled={setupMut.isPending}
              className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50"
            >
              {setupMut.isPending ? 'Préparation…' : '🔒 Activer le 2FA'}
            </button>
          </div>
        )}

        {/* ── État : SETTING UP (QR code + code) ──────────────────────────── */}
        {step === 'setting_up' && setupData && (
          <form onSubmit={handleConfirmEnable} className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-gray-900">Étape 1 — Scanner le QR code</p>
              <p className="mt-1 text-xs text-gray-500">
                Ouvre ton application d'authentification (Google Authenticator, Authy, 1Password…) et scanne ce QR code.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <img
                src={setupData.qrCodeDataUrl}
                alt="QR code 2FA"
                className="w-48 h-48 rounded-lg border border-gray-200 bg-white"
              />
              <div className="text-xs text-gray-500 space-y-2">
                <p>
                  <strong className="text-gray-700">Pas de scanner ?</strong> Entre ce code manuellement
                  dans ton app :
                </p>
                <code className="block break-all rounded bg-gray-100 px-2 py-1.5 font-mono text-[11px] text-gray-800">
                  {setupData.secret}
                </code>
                <p className="text-gray-400 italic">
                  Athenis ne stocke pas ce code en clair — il est chiffré (AES-256) côté serveur.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor={codeInputId} className="block text-sm font-semibold text-gray-900 mb-1">
                Étape 2 — Entrer le code à 6 chiffres
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Saisi le code que ton app vient d'afficher pour confirmer.
              </p>
              <CodeInput
                value={code}
                onChange={setCode}
                onSubmit={handleConfirmEnable}
                disabled={enableMut.isPending}
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={enableMut.isPending || code.length !== 6}
                className="rounded-lg bg-forest-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50"
              >
                {enableMut.isPending ? 'Vérification…' : 'Activer'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('disabled'); setSetupData(null); setCode(''); setErrorMsg('') }}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* ── État : JUST ENABLED (afficher backup codes) ─────────────────── */}
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

            <button
              onClick={() => setStep('enabled')}
              className="rounded-lg bg-forest-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-forest-800"
            >
              J'ai sauvegardé mes codes — Terminer
            </button>
          </div>
        )}

        {/* ── État : ENABLED ─────────────────────────────────────────────── */}
        {step === 'enabled' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                    ● Activé
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Ton compte est protégé par une authentification à deux facteurs. À chaque connexion,
                  un code à 6 chiffres te sera demandé.
                </p>
              </div>
              {!showDisable && (
                <button
                  onClick={() => setShowDisable(true)}
                  className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Désactiver
                </button>
              )}
            </div>

            {showDisable && (
              <form onSubmit={handleDisable} className="rounded-lg border border-red-200 bg-red-50/40 p-4 space-y-3">
                <p className="text-sm font-semibold text-red-900">
                  ⚠️ Désactiver le 2FA réduit la sécurité de ton compte
                </p>
                <p className="text-xs text-red-800">
                  Pour confirmer, entre ton mot de passe ET un code de ton app 2FA.
                  Toutes tes sessions actives seront déconnectées.
                </p>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mot de passe</label>
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Code 2FA à 6 chiffres</label>
                  <CodeInput
                    value={disableCode}
                    onChange={setDisableCode}
                    disabled={disableMut.isPending}
                  />
                </div>

                {disableError && (
                  <p className="text-sm text-red-700">{disableError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={disableMut.isPending}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {disableMut.isPending ? 'Désactivation…' : 'Confirmer la désactivation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDisable(false)
                      setDisablePassword('')
                      setDisableCode('')
                      setDisableError('')
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
