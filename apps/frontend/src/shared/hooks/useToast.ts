import { useState, useEffect, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration: number
}

// Module-level store — all hook instances share the same state
let _listeners: Array<(toasts: Toast[]) => void> = []
let _toasts: Toast[] = []

function broadcast(next: Toast[]) {
  _toasts = next
  _listeners.forEach((fn) => fn(next))
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(_toasts)

  useEffect(() => {
    _listeners.push(setToasts)
    return () => {
      _listeners = _listeners.filter((fn) => fn !== setToasts)
    }
  }, [])

  const add = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).slice(2)
    broadcast([..._toasts, { id, message, type, duration }])
    const timer = setTimeout(() => broadcast(_toasts.filter((t) => t.id !== id)), duration)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = useCallback((id: string) => {
    broadcast(_toasts.filter((t) => t.id !== id))
  }, [])

  return {
    toasts,
    dismiss,
    success: useCallback((msg: string, dur?: number) => add(msg, 'success', dur), [add]),
    error: useCallback((msg: string, dur?: number) => add(msg, 'error', dur), [add]),
    info: useCallback((msg: string, dur?: number) => add(msg, 'info', dur), [add]),
    warning: useCallback((msg: string, dur?: number) => add(msg, 'warning', dur), [add]),
  }
}
