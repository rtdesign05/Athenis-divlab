/**
 * Page Sécurité dédiée pour les SUPER_ADMIN.
 * Permet d'activer le 2FA + changer son mot de passe sans avoir à naviguer
 * dans /app/settings/securite (qui mélange settings perso + policy d'entreprise).
 */
import { useState, useId, type FormEvent } from 'react'
import { useChangePassword } from '@/hooks/useSecurity'
import { MyTwoFactorSection } from '@/pages/app/settings/MyTwoFactorSection'

function ChangePasswordCard() {
  const currentId = useId()
  const newId     = useId()
  const confirmId = useId()

  const [current, setCurrent]         = useState('')
  const [next, setNext]               = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [clientError, setClientError] = useState('')
  const [success, setSuccess]         = useState(false)

  const mutation = useChangePassword()

  function validate(): string | null {
    if (!current)             return 'Mot de passe actuel requis'
    if (next.length < 8)      return 'Au moins 8 caractères'
    if (next.length > 128)    return 'Trop long (128 max)'
    if (!/[A-Z]/.test(next))  return 'Doit contenir au moins une majuscule'
    if (!/[0-9]/.test(next))  return 'Doit contenir au moins un chiffre'
    if (next !== confirm)     return 'Les deux mots de passe ne correspondent pas'
    if (next === current)     return "Le nouveau mot de passe doit être différent de l'actuel"
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setClientError(''); setSuccess(false); mutation.reset()
    const err = validate()
    if (err) { setClientError(err); return }
    try {
      await mutation.mutateAsync({ currentPassword: current, newPassword: next })
      setSuccess(true); setCurrent(''); setNext(''); setConfirm('')
      setTimeout(() => setSuccess(false), 4000)
    } catch {
      // mutation.error sera affiché par le bloc d'erreur ci-dessous
    }
  }

  const errorMsg =
    clientError ||
    (mutation.error
      ? (mutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erreur lors du changement de mot de passe.'
      : '')

  return (
    <div className="space-y-1">
      <h2 className="text-sm font-semibold text-gray-800">Changer mon mot de passe</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <form onSubmit={handleSubmit} className="space-y-4">

          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              ✓ Mot de passe modifié avec succès. Toutes les autres sessions ont été déconnectées.
            </div>
          )}
          {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div>
            <label htmlFor={currentId} className="block text-xs font-medium text-gray-700 mb-1">Mot de passe actuel</label>
            <div className="relative">
              <input
                id={currentId}
                type={showCurrent ? 'text' : 'password'}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-12 text-sm focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                {showCurrent ? 'Cacher' : 'Afficher'}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor={newId} className="block text-xs font-medium text-gray-700 mb-1">
              Nouveau mot de passe
              <span className="ml-1 font-normal text-gray-400">(min. 8 caractères, 1 majuscule, 1 chiffre)</span>
            </label>
            <div className="relative">
              <input
                id={newId}
                type={showNew ? 'text' : 'password'}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-12 text-sm focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                {showNew ? 'Cacher' : 'Afficher'}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor={confirmId} className="block text-xs font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
            <input
              id={confirmId}
              type={showNew ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 ${
                confirm && next && confirm !== next ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-forest-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-60"
          >
            {mutation.isPending ? 'Modification…' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}

export function SecurityPage() {
  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sécurité de mon compte</h1>
        <p className="mt-1 text-sm text-gray-500">
          Protège ton compte super administrateur — c'est le compte le plus critique de la plateforme.
        </p>
      </div>

      {/* 2FA — la priorité absolue pour un compte admin */}
      <MyTwoFactorSection />

      {/* Mot de passe */}
      <ChangePasswordCard />

      {/* Recommandations */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="text-sm font-bold text-amber-900 mb-2">🛡️ Bonnes pratiques pour un compte SUPER_ADMIN</h3>
        <ul className="space-y-1.5 text-sm text-amber-900">
          <li>• <strong>Active le 2FA dès maintenant</strong> — un attaquant qui obtient ton mot de passe ne pourra pas se connecter sans ton téléphone.</li>
          <li>• <strong>Conserve tes codes de récupération hors-ligne</strong> (imprimés, dans un coffre, ou dans un gestionnaire de mots de passe).</li>
          <li>• <strong>Change ton mot de passe</strong> tous les 3 mois minimum.</li>
          <li>• <strong>Ne partage ce compte avec personne</strong> — crée des comptes admin distincts par cabinet/entreprise.</li>
          <li>• Si tu perds ton téléphone : utilise un code de récupération pour te connecter, puis désactive + réactive le 2FA.</li>
        </ul>
      </div>
    </div>
  )
}
