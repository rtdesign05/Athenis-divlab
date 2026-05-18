import axios, { type AxiosRequestConfig } from 'axios'
import { tokenStore } from './tokenStore'
import { queryClient } from './queryClient'

/**
 * URL de base de l'API.
 *
 * - **Web** : `/api` (URL relative) — Nginx ou Vite proxy redirige vers le backend.
 * - **Desktop (Tauri)** : doit pointer sur le domaine de production
 *   (ex. `https://ton-domaine.com/api`) car il n'y a pas de proxy local.
 * - **Mobile** : idem desktop.
 *
 * La valeur peut être surchargée via la variable d'environnement `VITE_API_URL`
 * au moment du build, ou via une configuration au premier démarrage côté Tauri.
 */
const API_BASE_URL = (() => {
  // Si défini au build (CI / .env.production), prioritaire
  const envUrl = import.meta.env.VITE_API_URL?.trim()
  if (envUrl) return envUrl
  // Si on est dans Tauri (desktop/mobile), on lit la config locale
  // (renseignée au premier lancement par l'utilisateur)
  if (typeof window !== 'undefined' && (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
    const saved = localStorage.getItem('athenis:api-url')
    if (saved) return saved
  }
  // Défaut : URL relative pour le web
  return '/api'
})()

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

export { API_BASE_URL }

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Silent refresh on 401
let isRefreshing = false
let pendingQueue: Array<{ resolve: () => void; reject: (err: unknown) => void }> = []

function drainQueue(err: unknown) {
  pendingQueue.forEach((p) => (err ? p.reject(err) : p.resolve()))
  pendingQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)

    const config = error.config as AxiosRequestConfig & { _retry?: boolean }
    const status = error.response?.status

    if (status !== 401 || config._retry || config.url === '/auth/refresh') {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<void>((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then(() => api(config))
    }

    config._retry = true
    isRefreshing = true

    try {
      const res = await api.post<{ success: true; data: { accessToken: string } }>('/auth/refresh')
      tokenStore.set(res.data.data.accessToken)
      drainQueue(null)
      return api(config)
    } catch (refreshError) {
      tokenStore.set(null)
      drainQueue(refreshError)
      queryClient.clear()
      window.location.href = '/auth/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)
