import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import type React from 'react'

// Helper: lazy-load a named export via react-router route.lazy
const lz =
  <K extends string>(f: () => Promise<Record<K, React.ComponentType>>, k: K) =>
  () =>
    f().then((m) => ({ Component: m[k] }))

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/auth/login" replace /> },

  // ── Auth (public) ───────────────────────────────────────────────────────────
  { path: '/auth/login',    lazy: lz(() => import('@/features/auth/LoginPage'), 'LoginPage') },
  { path: '/auth/register', lazy: lz(() => import('@/pages/auth/Register'), 'Register') },

  // ── Personal space ──────────────────────────────────────────────────────────
  {
    element: <ProtectedRoute allow={['PERSONAL']} />,
    children: [{ path: '/personal', lazy: lz(() => import('@/layouts/PersonalLayout'), 'PersonalLayout'), children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', lazy: lz(() => import('@/pages/personal/Dashboard'), 'PersonalDashboard') },
      { path: 'expenses',  lazy: lz(() => import('@/pages/personal/Expenses'), 'PersonalExpenses') },
      { path: 'income',    lazy: lz(() => import('@/pages/personal/Income'), 'PersonalIncome') },
      { path: 'savings',   lazy: lz(() => import('@/pages/personal/Savings'), 'PersonalSavings') },
    ]}],
  },

  // ── Company space ───────────────────────────────────────────────────────────
  {
    element: <ProtectedRoute allow={['COMPANY']} />,
    children: [{ path: '/app', lazy: lz(() => import('@/shared/components/layout/AppLayout'), 'AppLayout'), children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard',    lazy: lz(() => import('@/pages/app/Dashboard'), 'AppDashboard') },
      { path: 'invoices',     lazy: lz(() => import('@/pages/app/Placeholder'), 'Placeholder') },
      { path: 'clients',      lazy: lz(() => import('@/pages/app/Placeholder'), 'Placeholder') },
      { path: 'expenses',     lazy: lz(() => import('@/pages/app/Placeholder'), 'Placeholder') },
      { path: 'reports',      lazy: lz(() => import('@/pages/app/Placeholder'), 'Placeholder') },
      { path: 'hr/*',         lazy: lz(() => import('@/pages/app/Placeholder'), 'Placeholder') },
      { path: 'accounting/*', lazy: lz(() => import('@/pages/app/Placeholder'), 'Placeholder') },
      { path: 'legal/*',      lazy: lz(() => import('@/pages/app/Placeholder'), 'Placeholder') },
      { path: 'esg/*',        lazy: lz(() => import('@/pages/app/Placeholder'), 'Placeholder') },
      { path: 'settings',     lazy: lz(() => import('@/pages/app/Placeholder'), 'Placeholder') },
    ]}],
  },

  // ── Cabinet space ───────────────────────────────────────────────────────────
  {
    element: <ProtectedRoute allow={['CABINET']} />,
    children: [{ path: '/cabinet', lazy: lz(() => import('@/layouts/CabinetLayout'), 'CabinetLayout'), children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', lazy: lz(() => import('@/pages/cabinet/Dashboard'), 'CabinetDashboard') },
      { path: 'clients',   lazy: lz(() => import('@/pages/cabinet/Clients'), 'CabinetClients') },
      { path: 'access',    lazy: lz(() => import('@/pages/app/Placeholder'), 'Placeholder') },
      { path: 'billing',   lazy: lz(() => import('@/pages/app/Placeholder'), 'Placeholder') },
    ]}],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])

export function App() {
  return <RouterProvider router={router} />
}
