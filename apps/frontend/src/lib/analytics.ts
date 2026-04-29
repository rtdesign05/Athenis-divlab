/**
 * PostHog analytics — suivi comportemental et product analytics
 *
 * Variables d'environnement requises :
 *   VITE_POSTHOG_KEY   — clé de projet PostHog (ph_xxx...)
 *   VITE_POSTHOG_HOST  — hôte PostHog (défaut : https://eu.i.posthog.com)
 *
 * Si la clé est absente, tous les appels sont des no-ops silencieux.
 */
import posthog from 'posthog-js'

const KEY  = import.meta.env['VITE_POSTHOG_KEY']  as string | undefined
const HOST = import.meta.env['VITE_POSTHOG_HOST'] as string | undefined ?? 'https://eu.i.posthog.com'

export function initAnalytics() {
  if (!KEY) return
  posthog.init(KEY, {
    api_host: HOST,
    person_profiles: 'identified_only',
    capture_pageview: false,          // on gère manuellement via trackPage()
    capture_pageleave: true,
    autocapture: false,               // évite le bruit — on capture ce qui compte
    session_recording: {
      maskAllInputs: true,            // RGPD — masque tous les champs de saisie
    },
    persistence: 'localStorage',
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.debug()
    },
  })
}

/** Appeler à chaque changement de route */
export function trackPage(path: string) {
  if (!KEY) return
  posthog.capture('$pageview', { $current_url: window.location.origin + path })
}

/** Appeler après login réussi pour lier les events à l'utilisateur */
export function identifyUser(id: string, props: {
  email?: string
  plan?: string
  accountType?: string
  companyId?: string
}) {
  if (!KEY) return
  posthog.identify(id, props)
}

/** Appeler après logout */
export function resetAnalytics() {
  if (!KEY) return
  posthog.reset()
}

/** Tracker un event métier */
export function track(event: string, props?: Record<string, unknown>) {
  if (!KEY) return
  posthog.capture(event, props)
}

export { posthog }
