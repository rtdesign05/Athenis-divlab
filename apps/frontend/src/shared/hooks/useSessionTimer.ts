import { useEffect, useRef } from 'react'

interface SessionTimerOptions {
  /** JWT exp (seconds since epoch). Pass undefined to disable the timer. */
  exp: number | undefined
  /** Called when the session is about to expire. If omitted, calls onExpired immediately. */
  onWarn?: () => void
  /** Called when the session has expired. */
  onExpired: () => void
  /** Warn N ms before expiry. Default 60 000 (1 min). */
  warnBeforeMs?: number
}

/**
 * Schedules a warn/expired callback based on JWT exp.
 * Uses refs for callbacks so the effect never re-runs due to unstable function references.
 */
export function useSessionTimer({
  exp,
  onWarn,
  onExpired,
  warnBeforeMs = 60_000,
}: SessionTimerOptions) {
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const expiredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onWarnRef = useRef(onWarn)
  const onExpiredRef = useRef(onExpired)

  // Keep refs current without triggering re-runs
  useEffect(() => { onWarnRef.current = onWarn }, [onWarn])
  useEffect(() => { onExpiredRef.current = onExpired }, [onExpired])

  useEffect(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current)
    if (expiredTimerRef.current) clearTimeout(expiredTimerRef.current)

    if (!exp) return

    const msUntilExpiry = exp * 1000 - Date.now()
    if (msUntilExpiry <= 0) {
      onExpiredRef.current()
      return
    }

    const warnMs = Math.max(0, msUntilExpiry - warnBeforeMs)
    warnTimerRef.current = setTimeout(() => {
      if (onWarnRef.current) onWarnRef.current()
    }, warnMs)

    expiredTimerRef.current = setTimeout(() => {
      onExpiredRef.current()
    }, msUntilExpiry)

    return () => {
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current)
      if (expiredTimerRef.current) clearTimeout(expiredTimerRef.current)
    }
  }, [exp, warnBeforeMs])
}
