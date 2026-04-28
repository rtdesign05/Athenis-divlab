import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'
import type { AccountType } from '@athenis/shared-types'

export function homeForType(type: string): string {
  if (type === 'PERSONAL') return '/personal/dashboard'
  if (type === 'CABINET') return '/cabinet/dashboard'
  return '/app'
}

interface Props {
  allow?: AccountType[]
}

export function ProtectedRoute({ allow }: Props) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <svg className="h-8 w-8 animate-spin text-forest-700" viewBox="0 0 24 24" fill="none" aria-label="Chargement">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth/login" replace />

  if (allow && !allow.includes(user.accountType as AccountType)) {
    return <Navigate to={homeForType(user.accountType)} replace />
  }

  return <Outlet />
}
