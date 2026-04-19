import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { AccountType } from '@athenis/shared-types'

interface Props {
  allow: AccountType[]
  children: React.ReactNode
}

function homeForType(type: AccountType): string {
  switch (type) {
    case 'PERSONAL': return '/personal/dashboard'
    case 'COMPANY': return '/app/dashboard'
    case 'CABINET': return '/cabinet/dashboard'
  }
}

export function AccountTypeGuard({ allow, children }: Props) {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest-900 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />

  if (!allow.includes(user!.accountType as AccountType)) {
    return <Navigate to={homeForType(user!.accountType as AccountType)} replace />
  }

  return <>{children}</>
}

/** Guard for authenticated routes regardless of account type */
export function AuthGuard(_props: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest-900 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />

  // Redirect to appropriate space if accessing root
  return <Navigate to={homeForType(user!.accountType as AccountType)} replace />
}
