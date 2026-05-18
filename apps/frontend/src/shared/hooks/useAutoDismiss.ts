/**
 * useAutoDismiss — hook pour gérer un état "toast/message" qui s'efface
 * automatiquement après un délai, avec cleanup correct au unmount.
 *
 * Remplace le pattern fragile :
 *   setError(msg); setTimeout(() => setError(null), 3000)
 * qui provoque un setState sur composant démonté si l'utilisateur navigue
 * avant la fin du délai.
 *
 * Usage :
 *   const [msg, showMsg] = useAutoDismiss<string>(3000)
 *   showMsg('Enregistré ✓')
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export function useAutoDismiss<T>(delayMs: number = 3000) {
  const [value, setValue] = useState<T | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const set = useCallback((next: T | null) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setValue(next)
    if (next !== null) {
      timerRef.current = setTimeout(() => {
        setValue(null)
        timerRef.current = null
      }, delayMs)
    }
  }, [delayMs])

  // Cleanup au unmount — empêche setState sur composant démonté.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return [value, set] as const
}
