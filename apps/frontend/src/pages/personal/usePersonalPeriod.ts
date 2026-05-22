import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Hook partagé entre Dashboard / Expenses / Income / Savings.
 * Stocke la période sélectionnée (annee + mois) dans les query params de
 * l'URL : ?annee=2026&mois=6 — donc navigable, partageable, persistant
 * entre les onglets via les liens internes.
 *
 * Si aucun param n'est présent, défaut = mois en cours.
 *
 * Usage :
 *   const { annee, mois, periodString, setPeriod } = usePersonalPeriod()
 *   - periodString : format YYYY-MM (compatible <input type="month">)
 *   - setPeriod('2026-06') : met à jour annee + mois dans l'URL
 */
export function usePersonalPeriod() {
  const [searchParams, setSearchParams] = useSearchParams()

  const { annee, mois, periodString } = useMemo(() => {
    const now      = new Date()
    const a        = searchParams.get('annee')
    const m        = searchParams.get('mois')
    const anneeNum = a ? parseInt(a, 10) || now.getFullYear() : now.getFullYear()
    const moisRaw  = m ? parseInt(m, 10) || (now.getMonth() + 1) : (now.getMonth() + 1)
    const moisNum  = Math.min(12, Math.max(1, moisRaw))
    return {
      annee:        anneeNum,
      mois:         moisNum,
      periodString: `${anneeNum}-${String(moisNum).padStart(2, '0')}`,
    }
  }, [searchParams])

  const setPeriod = useCallback((value: string) => {
    // value au format 'YYYY-MM'
    const [y, m] = value.split('-')
    if (!y || !m) return
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('annee', y)
      next.set('mois',  String(parseInt(m, 10) || 1))
      return next
    })
  }, [setSearchParams])

  return { annee, mois, periodString, setPeriod }
}

/** Format 'YYYY-MM' pour le mois en cours — utile en fallback */
export function currentPeriodString(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

/** Suffixe ?annee=X&mois=Y à ajouter aux liens internes pour préserver la période. */
export function periodQueryString(annee: number, mois: number): string {
  return `?annee=${annee}&mois=${mois}`
}
