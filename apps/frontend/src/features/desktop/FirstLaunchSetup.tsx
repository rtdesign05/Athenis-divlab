/**
 * FirstLaunchSetup — écran de configuration au premier démarrage de l'app
 * desktop / mobile Tauri. Permet à l'utilisateur final de renseigner l'URL
 * du serveur Athenis (ex. https://athenis-monentreprise.com/api) qu'on
 * stocke dans localStorage. Tant que la config n'est pas faite, on bloque
 * l'app sur cet écran.
 */
import { useEffect, useState } from 'react'
import type React from 'react'

const STORAGE_KEY = 'athenis:api-url'

/** True si on tourne dans l'enveloppe Tauri (desktop ou mobile). */
export function isTauri(): boolean {
  return typeof window !== 'undefined' &&
         !!(window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
}

/** Récupère l'URL serveur configurée (ou null si pas encore renseignée). */
export function getConfiguredApiUrl(): string | null {
  if (!isTauri()) return null
  return localStorage.getItem(STORAGE_KEY)
}

/** Affiche l'écran de configuration au premier lancement Tauri. */
export function FirstLaunchSetup({ onConfigured }: { onConfigured: () => void }) {
  const [url, setUrl]         = useState('')
  const [testing, setTesting] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [hint, setHint]       = useState<string | null>(null)

  useEffect(() => {
    // Préremplit avec la valeur existante (cas de re-configuration)
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing) setUrl(existing.replace(/\/api\/?$/, ''))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setHint(null)
    const trimmed = url.trim().replace(/\/+$/, '')
    if (!trimmed) {
      setError('Veuillez saisir l\'URL de votre serveur Athenis.')
      return
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setError('L\'URL doit commencer par https:// (ou http:// en interne).')
      return
    }
    // Test de la connexion via /api/health
    setTesting(true)
    const apiUrl = trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(`${apiUrl}/health`, { signal: ctrl.signal })
      clearTimeout(timer)
      if (!res.ok) {
        setError(`Le serveur répond mais avec un code d'erreur ${res.status}. Vérifiez l'URL.`)
        return
      }
      const data = await res.json().catch(() => null) as { success?: boolean } | null
      if (data && data.success === false) {
        setError('Le serveur a refusé la requête de test.')
        return
      }
      // OK — enregistre et continue
      localStorage.setItem(STORAGE_KEY, apiUrl)
      setHint('Connexion réussie ! Redémarrage…')
      setTimeout(() => {
        onConfigured()
        // Recharge la page pour appliquer la nouvelle baseURL d'axios
        window.location.reload()
      }, 800)
    } catch (e) {
      const err = e as { name?: string; message?: string }
      if (err.name === 'AbortError') {
        setError('Délai dépassé. Vérifiez l\'URL et votre connexion internet.')
      } else {
        setError(`Impossible de joindre le serveur. Détail : ${err.message || 'erreur inconnue'}`)
      }
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-8 space-y-5">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-green-700 flex items-center justify-center text-white text-3xl font-bold mb-3">
            A
          </div>
          <h1 className="text-xl font-bold text-gray-900">Bienvenue sur Athenis</h1>
          <p className="mt-1 text-sm text-gray-500">Configuration au premier lancement</p>
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 leading-relaxed">
          <p className="font-semibold mb-1">💡 Renseignez l'adresse de votre serveur Athenis</p>
          <p>
            C'est l'URL qui vous a été communiquée par votre administrateur, par exemple :
            <br/><code className="bg-blue-100 px-1.5 py-0.5 rounded mt-1 inline-block">https://athenis-monentreprise.com</code>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">URL du serveur</label>
            <input
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setError(null) }}
              placeholder="https://athenis.monentreprise.com"
              autoFocus
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
            <p className="mt-1 text-[10px] text-gray-400">
              Pas besoin de <code>/api</code> à la fin — il sera ajouté automatiquement.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              ⚠ {error}
            </div>
          )}
          {hint && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700">
              ✓ {hint}
            </div>
          )}

          <button
            type="submit"
            disabled={testing}
            className="w-full rounded-lg bg-green-700 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60 transition-colors"
          >
            {testing ? 'Test de connexion…' : 'Connecter Athenis'}
          </button>
        </form>

        <p className="text-center text-[10px] text-gray-400">
          Cette information sera mémorisée pour vos prochains lancements.
          <br/>Vous pourrez la modifier dans Paramètres → Connexion serveur.
        </p>
      </div>
    </div>
  )
}
