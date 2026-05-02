import { useState, useId, type FormEvent } from 'react'
import { useChangePassword } from '@/hooks/useSecurity'

interface Props {
  open: boolean
  onClose: () => void
}

// Password policy (mirrors backend DTO)
function validate(current: string, next: string, confirm: string): string | null {
  if (!current)                     return 'Mot de passe actuel requis'
  if (next.length < 8)             return 'Au moins 8 caractères'
  if (next.length > 128)           return 'Trop long (128 max)'
  if (!/[A-Z]/.test(next))         return 'Doit contenir au moins une majuscule'
  if (!/[0-9]/.test(next))         return 'Doit contenir au moins un chiffre'
  if (next !== confirm)            return 'Les deux mots de passe ne correspondent pas'
  if (next === current)            return 'Le nouveau mot de passe doit être différent de l\'actuel'
  return null
}

export function ChangePasswordModal({ open, onClose }: Props) {
  const currentId = useId()
  const newId     = useId()
  const confirmId = useId()

  const [current, setCurrent]   = useState('')
  const [next, setNext]         = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [clientError, setClientError] = useState('')
  const [success, setSuccess]         = useState(false)

  const mutation = useChangePassword()

  function reset() {
    setCurrent(''); setNext(''); setConfirm('')
    setClientError(''); setSuccess(false)
    mutation.reset()
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setClientError('')
    setSuccess(false)
    mutation.reset()

    const err = validate(current, next, confirm)
    if (err) { setClientError(err); return }

    try {
      await mutation.mutateAsync({ currentPassword: current, newPassword: next })
      setSuccess(true)
      // Clear fields, keep modal open to show success
      setCurrent(''); setNext(''); setConfirm('')
    } catch {
      // error shown via mutation.error below
    }
  }

  if (!open) return null

  const serverError =
    (mutation.error as { response?: { data?: { error?: string } } })
      ?.response?.data?.error ?? null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl mx-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Modifier le mot de passe</h2>
            <p className="text-sm text-gray-500 mt-0.5">Min. 8 caractères, 1 majuscule, 1 chiffre</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Succès */}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            ✓ Mot de passe modifié avec succès. Votre session a été actualisée.
          </div>
        )}

        {/* Erreur serveur */}
        {serverError && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        {/* Erreur client */}
        {clientError && (
          <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {clientError}
          </div>
        )}

        <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">

          {/* Mot de passe actuel */}
          <div>
            <label htmlFor={currentId} className="mb-1 block text-sm font-medium text-gray-700">
              Mot de passe actuel
            </label>
            <div className="relative">
              <input
                id={currentId}
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showCurrent ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Nouveau mot de passe */}
          <div>
            <label htmlFor={newId} className="mb-1 block text-sm font-medium text-gray-700">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                id={newId}
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showNew ? '🙈' : '👁'}
              </button>
            </div>
            {/* Indicateur de force */}
            {next.length > 0 && (
              <div className="mt-1.5 flex gap-1">
                {[
                  next.length >= 8,
                  /[A-Z]/.test(next),
                  /[0-9]/.test(next),
                  next.length >= 12,
                ].map((ok, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${ok ? 'bg-green-500' : 'bg-gray-200'}`} />
                ))}
              </div>
            )}
          </div>

          {/* Confirmation */}
          <div>
            <label htmlFor={confirmId} className="mb-1 block text-sm font-medium text-gray-700">
              Confirmer le nouveau mot de passe
            </label>
            <input
              id={confirmId}
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                confirm && next && confirm !== next
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
              placeholder="••••••••"
            />
            {confirm && next && confirm !== next && (
              <p className="mt-1 text-xs text-red-500">Les mots de passe ne correspondent pas</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-lg bg-green-700 py-2.5 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60 transition"
            >
              {mutation.isPending ? 'Modification…' : 'Modifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
