import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

/**
 * Shown in the company AppLayout when a cabinet user is browsing a company's space.
 * Displays context info and a "Back to cabinet" button.
 */
export function CabinetViewBanner() {
  const { isViewingAsCompany, companyViewName, exitCompanyView } = useAuth()
  const navigate = useNavigate()

  if (!isViewingAsCompany) return null

  function handleExit() {
    exitCompanyView()
    navigate('/cabinet/clients')
  }

  return (
    <div className="flex items-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm">
      <span className="shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">
        Mode cabinet
      </span>
      <p className="min-w-0 truncate text-amber-900">
        Vous consultez la comptabilité de{' '}
        <strong>{companyViewName ?? 'cette entreprise'}</strong>
      </p>
      <button
        onClick={handleExit}
        className="ml-auto shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
      >
        ← Retour au cabinet
      </button>
    </div>
  )
}
