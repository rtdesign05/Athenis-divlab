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
