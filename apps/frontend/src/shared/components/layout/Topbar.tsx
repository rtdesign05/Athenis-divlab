import { useLocation } from 'react-router-dom'
import { Badge } from '@/shared/components/ui/Badge'
import { useAuth } from '@/features/auth/useAuth'

const ROUTE_TITLES: Record<string, string> = {
  '/app/dashboard': 'Tableau de bord',
  '/app/invoices': 'Factures',
  '/app/clients': 'Clients',
  '/app/expenses': 'Dépenses',
  '/app/reports': 'Rapports',
  '/app/hr/employees': 'Employés',
  '/app/hr/contracts': 'Contrats',
  '/app/hr/payroll': 'Paie',
  '/app/hr/leaves': 'Congés',
  '/app/accounting/journal': 'Journal',
  '/app/accounting/ledger': 'Grand livre',
  '/app/accounting/balance-sheet': 'Bilan',
  '/app/accounting/income': 'Compte de résultat',
  '/app/accounting/vat': 'TVA',
  '/app/legal/contracts': 'Contrats',
  '/app/legal/compliance': 'Conformité',
  '/app/legal/gdpr': 'RGPD',
  '/app/legal/documents': 'Documents juridiques',
  '/app/esg': 'Score ESG',
  '/app/esg/indicators': 'Indicateurs',
  '/app/esg/risks': 'Risques',
  '/app/esg/csrd': 'Rapport CSRD',
  '/app/settings': 'Paramètres',
  '/cabinet/dashboard': 'Tableau de bord',
  '/cabinet/clients': 'Portefeuille clients',
  '/cabinet/access': 'Accès & mandats',
  '/cabinet/billing': 'Facturation',
  '/personal/dashboard': 'Tableau de bord',
  '/personal/expenses': 'Mes dépenses',
  '/personal/income': 'Mes revenus',
  '/personal/savings': 'Mon épargne',
}

const PLAN_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'purple'> = {
  FREE: 'neutral' as never,
  STARTER: 'info',
  PRO: 'success',
  PREMIUM: 'purple',
  CABINET: 'default',
}

export function Topbar() {
  const { pathname } = useLocation()
  const { user } = useAuth()

  const title = ROUTE_TITLES[pathname] ?? 'Athenis'
  const plan = user?.plan ?? (user?.accountType === 'CABINET' ? 'CABINET' : null)
  const displayName = user?.email ?? ''

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-3">
        {plan && (
          <Badge variant={PLAN_VARIANT[plan] ?? 'neutral'}>
            {plan}
          </Badge>
        )}
        <div className="h-8 w-8 rounded-full bg-forest-100 flex items-center justify-center text-forest-700 font-semibold text-sm">
          {displayName?.charAt(0).toUpperCase() ?? '?'}
        </div>
        <span className="text-sm font-medium text-gray-700 hidden sm:block">
          {displayName}
        </span>
      </div>
    </header>
  )
}
