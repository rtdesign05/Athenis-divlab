/**
 * Sentry — monitoring des erreurs frontend
 *
 * Variable d'environnement :
 *   VITE_SENTRY_DSN — DSN Sentry (https://xxx@sentry.io/yyy)
 *
 * Si absent → no-op silencieux.
 */
import * as Sentry from '@sentry/react'

const DSN = import.meta.env['VITE_SENTRY_DSN'] as string | undefined

export function initSentry() {
  if (!DSN) return

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    // Traces de performance sur 10% des requêtes en prod, 100% en dev
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Enregistrement de sessions sur 5% en prod
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Ne pas loguer en dev pour éviter le bruit
    debug: false,
    // Ignorer les erreurs non-actionnables
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      /^Network Error/,
      /ChunkLoadError/,
    ],
    // Filtre les AxiosError 4xx (attendus : 401 token expiré, 403 perms,
    // 404 ressource déjà supprimée, 409 conflit, 422 validation, 429 rate-limit).
    // On ne capture QUE les 5xx (vraies pannes serveur) + les erreurs réseau.
    beforeSend(event, hint) {
      const err = hint?.originalException as { isAxiosError?: boolean; response?: { status?: number } } | undefined
      if (err?.isAxiosError) {
        const status = err.response?.status
        if (typeof status === 'number' && status >= 400 && status < 500) {
          return null  // drop : 4xx = problème utilisateur, pas un bug
        }
        if (!status) return null  // erreur sans status = network/timeout (déjà filtré par ignoreErrors)
      }
      return event
    },
  })
}

export function setSentryUser(id: string, email?: string) {
  if (!DSN) return
  Sentry.setUser({ id, ...(email ? { email } : {}) })
}

export function clearSentryUser() {
  if (!DSN) return
  Sentry.setUser(null)
}

export { Sentry }
