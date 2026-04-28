import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import type React from 'react'

const lz =
  <K extends string>(f: () => Promise<Record<K, React.ComponentType>>, k: K) =>
  () =>
    f().then((m) => ({ Component: m[k] }))

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/auth/login" replace /> },

  // ── Auth (public) ───────────────────────────────────────────────────────────
  { path: '/auth/login',         lazy: lz(() => import('@/features/auth/LoginPage'),       'LoginPage') },
  { path: '/auth/register',      lazy: lz(() => import('@/pages/auth/AccountTypePage'),    'AccountTypePage') },
  { path: '/auth/register/form', lazy: lz(() => import('@/pages/auth/Register'),           'Register') },

  // ── Personal space ──────────────────────────────────────────────────────────
  {
    element: <ProtectedRoute allow={['PERSONAL']} />,
    children: [{ path: '/personal', lazy: lz(() => import('@/layouts/PersonalLayout'), 'PersonalLayout'), children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', lazy: lz(() => import('@/pages/personal/Dashboard'), 'PersonalDashboard') },
      { path: 'expenses',  lazy: lz(() => import('@/pages/personal/Expenses'),  'PersonalExpenses') },
      { path: 'income',    lazy: lz(() => import('@/pages/personal/Income'),    'PersonalIncome') },
      { path: 'savings',   lazy: lz(() => import('@/pages/personal/Savings'),   'PersonalSavings') },
    ]}],
  },

  // ── Company space ───────────────────────────────────────────────────────────
  {
    element: <ProtectedRoute allow={['COMPANY']} />,
    children: [{ path: '/app', lazy: lz(() => import('@/shared/components/layout/AppLayout'), 'AppLayout'), children: [

      { index: true, lazy: lz(() => import('@/pages/app/Dashboard'), 'AppDashboard') },

      // ── Redirects from legacy paths ──────────────────────────────────────────
      { path: 'dashboard',  element: <Navigate to="/app/gestion/ventes"     replace /> },
      { path: 'invoices',   element: <Navigate to="/app/gestion/ventes"     replace /> },
      { path: 'quotes',     element: <Navigate to="/app/gestion/ventes"     replace /> },
      { path: 'clients',    element: <Navigate to="/app/gestion/ventes"     replace /> },
      { path: 'expenses',   element: <Navigate to="/app/gestion/achats"     replace /> },
      { path: 'reports',    element: <Navigate to="/app/gestion/ventes"     replace /> },
      { path: 'hr/leaves',  element: <Navigate to="/app/hr/conges"          replace /> },
      { path: 'hr/payslip', element: <Navigate to="/app/hr/paie"            replace /> },
      { path: 'hr/reviews', element: <Navigate to="/app/hr/entretiens"      replace /> },
      { path: 'accounting/bank',    element: <Navigate to="/app/accounting"        replace /> },
      { path: 'accounting/fec',     element: <Navigate to="/app/accounting"        replace /> },
      { path: 'accounting/cloture', element: <Navigate to="/app/accounting"        replace /> },
      { path: 'legal/contracts',    element: <Navigate to="/app/legal/contrats"    replace /> },
      { path: 'legal/gdpr',         element: <Navigate to="/app/legal/rgpd"        replace /> },
      { path: 'legal/alerts',       element: <Navigate to="/app/legal/conformite"  replace /> },
      { path: 'esg/scope',     element: <Navigate to="/app/esg/environnement" replace /> },
      { path: 'esg/csrd',      element: <Navigate to="/app/esg/rapport"       replace /> },
      { path: 'esg/benchmark', element: <Navigate to="/app/esg/risques"       replace /> },
      { path: 'esg/actions',   element: <Navigate to="/app/esg/rapport"       replace /> },

      // ── MODULE: Gestion ──────────────────────────────────────────────────────
      {
        path: 'gestion',
        lazy: lz(() => import('@/layouts/modules/GestionLayout'), 'GestionLayout'),
        children: [
          { index: true, lazy: lz(() => import('@/pages/app/gestion/GestionOverviewPage'), 'GestionOverviewPage') },
          {
            path: 'ventes',
            children: [
              { index: true,           lazy: lz(() => import('@/pages/app/gestion/VentesPage'),        'VentesPage') },
              { path: 'clients',       lazy: lz(() => import('@/pages/app/gestion/ClientsPage'),       'ClientsPage') },
              { path: 'livraisons',    lazy: lz(() => import('@/pages/app/Placeholder'),               'Placeholder') },
              { path: 'retours',       lazy: lz(() => import('@/pages/app/Placeholder'),               'Placeholder') },
            ],
          },
          {
            path: 'achats',
            children: [
              { index: true,           lazy: lz(() => import('@/pages/app/gestion/AchatsPage'),        'AchatsPage') },
              { path: 'receptions',    lazy: lz(() => import('@/pages/app/Placeholder'),               'Placeholder') },
              { path: 'fournisseurs',  lazy: lz(() => import('@/pages/app/gestion/FournisseursPage'),  'FournisseursPage') },
            ],
          },
          {
            path: 'tresorerie',
            children: [
              { index: true,           lazy: lz(() => import('@/pages/app/gestion/TresoreriePage'),        'TresoreriePage') },
              { path: 'banques',       lazy: lz(() => import('@/pages/app/gestion/BanquesPage'),           'BanquesPage') },
              { path: 'caisses',       lazy: lz(() => import('@/pages/app/gestion/CaissesPage'),           'CaissesPage') },
              { path: 'mobile-money',  lazy: lz(() => import('@/pages/app/gestion/MobileMoneyPage'),       'MobileMoneyPage') },
              { path: 'previsions',    lazy: lz(() => import('@/pages/app/gestion/PrevisionsPage'),        'PrevisionsPage') },
            ],
          },
        ],
      },

      // ── MODULE: Comptabilité ─────────────────────────────────────────────────
      {
        path: 'accounting',
        lazy: lz(() => import('@/layouts/modules/AccountingLayout'), 'AccountingLayout'),
        children: [
          { index: true,              lazy: lz(() => import('@/pages/app/accounting/AccountingDashboard'), 'AccountingDashboard') },
          { path: 'transactions',     lazy: lz(() => import('@/pages/app/accounting/TransactionsPage'),    'TransactionsPage') },
          { path: 'bilan',       lazy: lz(() => import('@/pages/app/accounting/BilanPage'),           'BilanPage') },
          { path: 'resultat',    lazy: lz(() => import('@/pages/app/accounting/ResultatPage'),         'ResultatPage') },
          { path: 'journal',     lazy: lz(() => import('@/pages/app/accounting/JournalPage'),          'JournalPage') },
          { path: 'grand-livre', lazy: lz(() => import('@/pages/app/accounting/GrandLivrePage'),       'GrandLivrePage') },
          { path: 'balance',     lazy: lz(() => import('@/pages/app/accounting/BalancePage'),           'BalancePage') },
          { path: 'comptes',    lazy: lz(() => import('@/pages/app/accounting/ComptesPage'),          'ComptesPage') },
          { path: 'etats-financiers', lazy: lz(() => import('@/pages/app/accounting/EtatsFinanciersPage'), 'EtatsFinanciersPage') },
          { path: 'revision',         lazy: lz(() => import('@/pages/app/accounting/RevisionPage'),         'RevisionPage') },
          { path: 'immobilisations',  lazy: lz(() => import('@/pages/app/accounting/ImmobilisationsPage'), 'ImmobilisationsPage') },
        ],
      },

      // ── MODULE: RH ───────────────────────────────────────────────────────────
      {
        path: 'hr',
        lazy: lz(() => import('@/layouts/modules/HRLayout'), 'HRLayout'),
        children: [
          { index: true,       lazy: lz(() => import('@/pages/app/hr/HRDashboard'),    'HRDashboard') },
          { path: 'employes',  lazy: lz(() => import('@/pages/app/hr/EmployesPage'),   'EmployesPage') },
          { path: 'contrats',  lazy: lz(() => import('@/pages/app/hr/ContratsHRPage'), 'ContratsHRPage') },
          { path: 'conges',    lazy: lz(() => import('@/pages/app/hr/LeavesPage'),     'LeavesPage') },
          { path: 'paie',      lazy: lz(() => import('@/pages/app/hr/PayslipPage'),    'PayslipPage') },
          { path: 'planning',  lazy: lz(() => import('@/pages/app/hr/PlanningPage'),   'PlanningPage') },
          { path: 'entretiens',lazy: lz(() => import('@/pages/app/hr/ReviewsPage'),    'ReviewsPage') },
        ],
      },

      // ── MODULE: Juridique ────────────────────────────────────────────────────
      {
        path: 'legal',
        lazy: lz(() => import('@/layouts/modules/LegalLayout'), 'LegalLayout'),
        children: [
          { index: true,        lazy: lz(() => import('@/pages/app/legal/LegalDashboard'),  'LegalDashboard') },
          { path: 'contrats',   lazy: lz(() => import('@/pages/app/legal/ContractsPage'),   'ContractsPage') },
          { path: 'rgpd',       lazy: lz(() => import('@/pages/app/legal/GdprPage'),        'GdprPage') },
          { path: 'conformite', lazy: lz(() => import('@/pages/app/legal/ConformitePage'),  'ConformitePage') },
          { path: 'documents',  lazy: lz(() => import('@/pages/app/legal/DocumentsPage'),   'DocumentsPage') },
        ],
      },

      // ── MODULE: ESG ──────────────────────────────────────────────────────────
      {
        path: 'esg',
        lazy: lz(() => import('@/layouts/modules/ESGLayout'), 'ESGLayout'),
        children: [
          { index: true,           lazy: lz(() => import('@/pages/app/esg/EsgDashboard'),      'EsgDashboard') },
          { path: 'environnement', lazy: lz(() => import('@/pages/app/esg/EnvironnementPage'), 'EnvironnementPage') },
          { path: 'social',        lazy: lz(() => import('@/pages/app/esg/SocialPage'),        'SocialPage') },
          { path: 'gouvernance',   lazy: lz(() => import('@/pages/app/esg/GouvernancePage'),   'GouvernancePage') },
          { path: 'risques',       lazy: lz(() => import('@/pages/app/esg/RisquesPage'),       'RisquesPage') },
          { path: 'rapport',       lazy: lz(() => import('@/pages/app/esg/RapportPage'),       'RapportPage') },
        ],
      },

      // ── MODULE: Fiscalité ────────────────────────────────────────────────────
      {
        path: 'fiscal',
        lazy: lz(() => import('@/layouts/modules/FiscalLayout'), 'FiscalLayout'),
        children: [
          { index: true,       lazy: lz(() => import('@/pages/app/fiscal/FiscalDashboard'), 'FiscalDashboard') },
          { path: 'tva',       lazy: lz(() => import('@/pages/app/fiscal/TVAFiscalPage'),   'TVAFiscalPage') },
          { path: 'dsf',       lazy: lz(() => import('@/pages/app/fiscal/DSFPage'),         'DSFPage') },
          { path: 'is',        lazy: lz(() => import('@/pages/app/fiscal/ISPage'),          'ISPage') },
          { path: 'patente',   lazy: lz(() => import('@/pages/app/fiscal/PatentePage'),     'PatentePage') },
          { path: 'ras',       lazy: lz(() => import('@/pages/app/fiscal/RASPage'),         'RASPage') },
          { path: 'cnps',      lazy: lz(() => import('@/pages/app/fiscal/CNPSPage'),        'CNPSPage') },
          { path: 'igs',       lazy: lz(() => import('@/pages/app/fiscal/IGSPage'),         'IGSPage') },
          { path: 'calendrier',lazy: lz(() => import('@/pages/app/fiscal/CalendrierPage'),  'CalendrierPage') },
          { path: 'liasse',    lazy: lz(() => import('@/pages/app/fiscal/LiassePage'),      'LiassePage') },
        ],
      },

      // ── MODULE: Paramètres ──────────────────────────────────────────────────
      {
        path: 'settings',
        lazy: lz(() => import('@/layouts/modules/SettingsLayout'), 'SettingsLayout'),
        children: [
          { index: true,           element: <Navigate to="entreprise" replace /> },
          { path: 'entreprise',    lazy: lz(() => import('@/pages/app/settings/EntreprisePage'),    'EntreprisePage') },
          { path: 'utilisateurs',  lazy: lz(() => import('@/pages/app/settings/UtilisateursPage'),  'UtilisateursPage') },
          { path: 'agences',       lazy: lz(() => import('@/pages/app/settings/AgencesPage'),       'AgencesPage') },
          { path: 'roles',         lazy: lz(() => import('@/pages/app/settings/RolesPage'),         'RolesPage') },
          { path: 'securite',      lazy: lz(() => import('@/pages/app/settings/SecuritePage'),      'SecuritePage') },
          { path: 'facturation',   lazy: lz(() => import('@/pages/app/settings/FacturationPage'),   'FacturationPage') },
          { path: 'localisation',  lazy: lz(() => import('@/pages/app/settings/LocalisationPage'),  'LocalisationPage') },
          { path: 'fiscalite',     lazy: lz(() => import('@/pages/app/settings/FiscalitePage'),     'FiscalitePage') },
        ],
      },
    ]}],
  },

  // ── Cabinet space ───────────────────────────────────────────────────────────
  {
    element: <ProtectedRoute allow={['CABINET']} />,
    children: [{ path: '/cabinet', lazy: lz(() => import('@/layouts/CabinetLayout'), 'CabinetLayout'), children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', lazy: lz(() => import('@/pages/cabinet/Dashboard'), 'CabinetDashboard') },
      { path: 'clients',   lazy: lz(() => import('@/pages/cabinet/Clients'),   'CabinetClients') },
      { path: 'access',    lazy: lz(() => import('@/pages/app/Placeholder'),   'Placeholder') },
      { path: 'billing',   lazy: lz(() => import('@/pages/app/Placeholder'),   'Placeholder') },
    ]}],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])

export function App() {
  return <RouterProvider router={router} />
}
