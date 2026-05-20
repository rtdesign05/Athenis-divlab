/**
 * Bannière "Nouvelle version disponible" — incite l'utilisateur à reload
 * pour récupérer les derniers fixes/features.
 *
 * Pour quoi ?
 * Sans ça, un user qui a un onglet Athenis ouvert depuis longtemps continue
 * à utiliser une vieille version du JS (cache + service worker). Si on a
 * déployé un fix de sécurité ou un correctif important, il ne le récupère
 * pas — il rapporte que "ça marche pas".
 *
 * Comment ça marche :
 * - vite-plugin-pwa avec registerType:'autoUpdate' enregistre le SW
 *   automatiquement. À chaque nouveau déploiement, le SW détecte une
 *   nouvelle version → on capture l'événement et on affiche le banner.
 * - Si le user clique "Recharger", on appelle skipWaiting + reload.
 */
import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

export function UpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updateSW, setUpdateSW]       = useState<((reloadPage?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    // En Tauri ou si pas de SW (mode dev), on skip
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    try {
      const fn = registerSW({
        immediate: true,
        onNeedRefresh() {
          setNeedRefresh(true)
        },
        onOfflineReady() {
          // Première install du SW, pas besoin de notifier
        },
        onRegisterError(err: unknown) {
          // Pas critique — log silent
          console.debug('SW register error', err)
        },
      })
      setUpdateSW(() => fn)
    } catch (e) {
      console.debug('registerSW unavailable', e)
    }
  }, [])

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-xl bg-gray-900 text-white shadow-2xl border border-gray-700 animate-in slide-in-from-bottom">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-green-500/20 text-green-400">
            ✨
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Nouvelle version disponible</p>
            <p className="mt-1 text-xs text-gray-300 leading-relaxed">
              Une mise à jour d'Athenis vient d'être publiée. Rechargez pour récupérer
              les derniers correctifs et fonctionnalités.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  if (updateSW) {
                    void updateSW(true)
                  } else {
                    window.location.reload()
                  }
                }}
                className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold hover:bg-green-400 transition-colors"
              >
                Recharger maintenant
              </button>
              <button
                onClick={() => setNeedRefresh(false)}
                className="rounded-lg border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
