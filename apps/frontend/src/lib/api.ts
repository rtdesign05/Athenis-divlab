import axios, { type AxiosRequestConfig } from 'axios'
import { tokenStore } from './tokenStore'
import { queryClient } from './queryClient'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

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
