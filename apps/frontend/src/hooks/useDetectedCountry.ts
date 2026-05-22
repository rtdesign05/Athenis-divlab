import { useEffect, useState } from 'react'
import { ALL_COUNTRIES } from '@athenis/shared-types'

const LS_KEY = 'athenis_detected_country_v1'
const LS_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 jours — la géoloc IP change rarement

interface Cached {
  code: string
  fetchedAt: number
}

function readCache(): string | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cached
    if (!parsed?.code) return null
    if (Date.now() - parsed.fetchedAt > LS_TTL_MS) return null
    return parsed.code
  } catch { return null }
}

function writeCache(code: string) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ code, fetchedAt: Date.now() } satisfies Cached))
  } catch { /* ignore — quota / private browsing */ }
}

/**
 * Détecte le pays de l'utilisateur via son IP (ipapi.co) — gratuit, sans clé.
 * Résultat caché 7 jours dans localStorage pour éviter de re-fetcher à chaque mount.
 *
 * @param defaultCountry  Code ISO-2 utilisé tant que la détection n'a pas répondu.
 *                        Par défaut 'CM' (audience prioritaire Athenis).
 *
 * Retourne `{ countryCode, setCountryCode, loaded }` :
 *   - countryCode : le code en vigueur (détecté ou défaut)
 *   - setCountryCode : override manuel (ex : sélecteur pays sur PricingPage)
 *   - loaded : true quand la détection IP a abouti (succès ou échec)
 */
export function useDetectedCountry(defaultCountry: string = 'CM') {
  const [countryCode, setCountryCode] = useState<string>(() => readCache() ?? defaultCountry)
  const [loaded,      setLoaded]      = useState<boolean>(readCache() !== null)

  useEffect(() => {
    // Si on a déjà un cache valide, ne pas re-fetcher
    if (readCache()) return

    const controller = new AbortController()
    fetch('https://ipapi.co/json/', { signal: controller.signal })
      .then(r => r.json())
      .then((data: { country_code?: string }) => {
        const code = data.country_code?.toUpperCase()
        if (code && ALL_COUNTRIES.some(c => c.code === code)) {
          setCountryCode(code)
          writeCache(code)
        }
      })
      .catch(() => { /* keep default — offline / API down */ })
      .finally(() => setLoaded(true))

    return () => controller.abort()
  }, [])

  return { countryCode, setCountryCode, loaded }
}
