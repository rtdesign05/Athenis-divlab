import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider } from '@/features/auth/AuthContext'
import { Toaster } from '@/shared/components/feedback/Toaster'
import { App } from './App'
import { queryClient } from './lib/queryClient'
import { initAnalytics } from './lib/analytics'
import { initSentry } from './lib/sentry'
import './index.css'

// ── Monitoring & analytics (no-ops si variables d'env absentes) ──────────────
initSentry()
initAnalytics()

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster />
      </AuthProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>,
)
