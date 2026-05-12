import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { ProtectedRoute, AdminRoute } from '@/features/auth/ProtectedRoute'
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
  { path: '/auth/verify-email',  lazy: lz(() => import('@/pages/auth/VerifyEmailPage'),    'VerifyEmailPage') },
  { path: '/invitation/cabinet', lazy: lz(() => import('@/pages/invitation/CabinetInvitationPage'), 'CabinetInvitationPage') },
  { path: '/pay/:token',         lazy: lz(() => import('@/pages/pay/PaymentPage'),                  'PaymentPage') },

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

      // ── Cahier des charges (temp download page) ─────────────────────────────
      { path: 'cahier-charges', lazy: lz(() => import('@/pages/app/CahierChargesDownloadPage'), 'CahierChargesDownloadPage') },
      { path: 'analyse-concurrentielle', lazy: lz(() => import('@/pages/app/AnalyseConcurrentielleDownloadPage'), 'AnalyseConcurrentielleDownloadPage') },
      { path: 'cahier-charges-v2', lazy: lz(() => import('@/pages/cahier/CahierChargesV2Page'), 'default') },
      { path: 'investor-deck', lazy: lz(() => import('@/pages/cahier/InvestorDeckPage'), 'default') },

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
      { path: 'esg/csrd',      element: <Navigate to="/app/esg/rapport"       replace /> },

      // ── MODULE: Gestion ──────────────────────────────────────────────────────
      {
        path: 'gestion',
        lazy: lz(() => import('@/layouts/modules/GestionLayout'), 'GestionLayout'),
        children: [
          { index: true, lazy: lz(() => import('@/pages/app/gestion/GestionOverviewPage'), 'GestionOverviewPage') },
          {
            path: 'ventes',
            children: [
              { index: true,           lazy: lz(() => import('@/pages/app/gestion/VentesPage'),         'VentesPage') },
              { path: 'factures',      lazy: lz(() => import('@/pages/app/gestion/FacturesVentesPage'),     'FacturesVentesPage') },
              { path: 'recurrentes',   lazy: lz(() => import('@/pages/app/gestion/VentesRecurrentesPage'), 'VentesRecurrentesPage') },
              { path: 'articles',      lazy: lz(() => import('@/pages/app/gestion/ArticlesPage'),           'ArticlesPage') },
              { path: 'clients',       lazy: lz(() => import('@/pages/app/gestion/ClientsPage'),        'ClientsPage') },
              { path: 'livraisons',    lazy: lz(() => import('@/pages/app/gestion/BonsLivraisonPage'),  'BonsLivraisonPage') },
              { path: 'retours',       lazy: lz(() => import('@/pages/app/gestion/RetoursClientsPage'), 'RetoursClientsPage') },
              { path: 'stock',         lazy: lz(() => import('@/pages/app/gestion/StockPage'),          'StockPage') },
            ],
          },
          {
            path: 'achats',
            children: [
              { index: true,           lazy: lz(() => import('@/pages/app/gestion/AchatsPage'),         'AchatsPage') },
              { path: 'factures',      lazy: lz(() => import('@/pages/app/gestion/FacturesAchatsPage'), 'FacturesAchatsPage') },
              { path: 'articles',      lazy: lz(() => import('@/pages/app/gestion/ArticlesPage'),       'ArticlesPage') },
              { path: 'receptions',    lazy: lz(() => import('@/pages/app/gestion/BonsReceptionPage'),  'BonsReceptionPage') },
              { path: 'fournisseurs',  lazy: lz(() => import('@/pages/app/gestion/FournisseursPage'),   'FournisseursPage') },
              { path: 'stock',         lazy: lz(() => import('@/pages/app/gestion/StockPage'),          'StockPage') },
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
          { path: 'journal', children: [
            { index: true, lazy: lz(() => import('@/pages/app/accounting/JournalPage'), 'JournalPage') },
            { path: 'lettrage',  lazy: lz(() => import('@/pages/app/accounting/JournalLettragehPage'), 'JournalLettragehPage') },
            { path: 'extournes', lazy: lz(() => import('@/pages/app/accounting/JournalExtournesPage'), 'JournalExtournesPage') },
          ]},
          { path: 'grand-livre', lazy: lz(() => import('@/pages/app/accounting/GrandLivrePage'),       'GrandLivrePage') },
          { path: 'balance',     lazy: lz(() => import('@/pages/app/accounting/BalancePage'),           'BalancePage') },
          { path: 'comptes',    lazy: lz(() => import('@/pages/app/accounting/ComptesPage'),          'ComptesPage') },
          { path: 'etats-financiers', lazy: lz(() => import('@/pages/app/accounting/EtatsFinanciersPage'), 'EtatsFinanciersPage') },
          { path: 'revision',         lazy: lz(() => import('@/pages/app/accounting/RevisionPage'),         'RevisionPage') },
          {
            path: 'immobilisations',
            children: [
              { index: true,            lazy: lz(() => import('@/pages/app/accounting/ImmobilisationsPage'), 'ImmobilisationsPage') },
              { path: 'registre',       lazy: lz(() => import('@/pages/app/accounting/ImmobilisationsPage'), 'ImmobilisationsRegistrePage') },
              { path: 'amortissements', lazy: lz(() => import('@/pages/app/accounting/ImmobilisationsPage'), 'ImmobilisationsAmortPage') },
              { path: 'cessions',       lazy: lz(() => import('@/pages/app/accounting/ImmobilisationsPage'), 'ImmobilisationsCessionsPage') },
            ],
          },
        ],
      },

      // ── MODULE: RH ───────────────────────────────────────────────────────────
      {
        path: 'hr',
        lazy: lz(() => import('@/layouts/modules/HRLayout'), 'HRLayout'),
        children: [
          { index: true, lazy: lz(() => import('@/pages/app/hr/HRDashboard'), 'HRDashboard') },
          {
            path: 'employes',
            children: [
              { index: true,             lazy: lz(() => import('@/pages/app/hr/EmployesPage'),        'EmployesPage') },
              { path: 'organigramme',    lazy: lz(() => import('@/pages/app/hr/OrganigrammeHRPage'),  'OrganigrammeHRPage') },
            ],
          },
          { path: 'contrats',  lazy: lz(() => import('@/pages/app/hr/ContratsHRPage'), 'ContratsHRPage') },
          {
            path: 'conges',
            children: [
              { index: true,        lazy: lz(() => import('@/pages/app/hr/LeavesPage'),           'LeavesPage') },
              { path: 'calendrier', lazy: lz(() => import('@/pages/app/hr/CalendrierCongesPage'), 'CalendrierCongesPage') },
              { path: 'historique', lazy: lz(() => import('@/pages/app/hr/HistoriqueCongesPage'), 'HistoriqueCongesPage') },
            ],
          },
          {
            path: 'paie',
            children: [
              { index: true,          lazy: lz(() => import('@/pages/app/hr/PayslipPage'),              'PayslipPage') },
              { path: 'virements',    lazy: lz(() => import('@/pages/app/hr/VirementsPage'),            'VirementsPage') },
              { path: 'declarations', lazy: lz(() => import('@/pages/app/hr/DeclarationsSocialesPage'), 'DeclarationsSocialesPage') },
            ],
          },
          {
            path: 'planning',
            children: [
              { index: true,   lazy: lz(() => import('@/pages/app/hr/PlanningPage'),     'PlanningPage') },
              { path: 'mois',  lazy: lz(() => import('@/pages/app/hr/PlanningMoisPage'), 'PlanningMoisPage') },
            ],
          },
          { path: 'entretiens', lazy: lz(() => import('@/pages/app/hr/ReviewsPage'), 'ReviewsPage') },
        ],
      },

      // ── MODULE: Juridique ────────────────────────────────────────────────────
      {
        path: 'legal',
        lazy: lz(() => import('@/layouts/modules/LegalLayout'), 'LegalLayout'),
        children: [
          { index: true,        lazy: lz(() => import('@/pages/app/legal/LegalDashboard'),  'LegalDashboard') },
          { path: 'contrats', children: [
            { index: true, lazy: lz(() => import('@/pages/app/legal/ContractsPage'), 'ContractsPage') },
            { path: 'expires', lazy: lz(() => import('@/pages/app/legal/ContratsExpiresPage'), 'ContratsExpiresPage') },
            { path: 'modeles', lazy: lz(() => import('@/pages/app/legal/ContratsModelesPage'), 'ContratsModelesPage') },
          ]},
          { path: 'rgpd', children: [
            { index: true, lazy: lz(() => import('@/pages/app/legal/GdprPage'), 'GdprPage') },
            { path: 'consentements', lazy: lz(() => import('@/pages/app/legal/RgpdConsentementsPage'), 'RgpdConsentementsPage') },
            { path: 'demandes',      lazy: lz(() => import('@/pages/app/legal/RgpdDemandesPage'),      'RgpdDemandesPage') },
          ]},
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
          { path: 'scope',         lazy: lz(() => import('@/pages/app/esg/ScopePage'),         'ScopePage') },
          { path: 'benchmark',     lazy: lz(() => import('@/pages/app/esg/BenchmarkPage'),     'BenchmarkPage') },
          { path: 'actions',       lazy: lz(() => import('@/pages/app/esg/ActionPlanPage'),    'ActionPlanPage') },
          { path: 'rapport/csrd',           lazy: lz(() => import('@/pages/app/esg/RapportCsrdPage'),          'RapportCsrdPage') },
          { path: 'rapport/generation',     lazy: lz(() => import('@/pages/app/esg/RapportGenerationPage'),    'RapportGenerationPage') },
          { path: 'rapport/dpef',           lazy: lz(() => import('@/pages/app/esg/RapportDpefPage'),          'RapportDpefPage') },
          { path: 'environnement/energie',  lazy: lz(() => import('@/pages/app/esg/EnvironnementEnergiePage'), 'EnvironnementEnergiePage') },
          { path: 'environnement/dechets',  lazy: lz(() => import('@/pages/app/esg/EnvironnementDechetsPage'), 'EnvironnementDechetsPage') },
          { path: 'social/diversite',       lazy: lz(() => import('@/pages/app/esg/SocialDiversitePage'),      'SocialDiversitePage') },
          { path: 'social/formation',       lazy: lz(() => import('@/pages/app/esg/SocialFormationPage'),      'SocialFormationPage') },
        ],
      },

      // ── MODULE: Fiscalité ────────────────────────────────────────────────────
      {
        path: 'fiscal',
        lazy: lz(() => import('@/layouts/modules/FiscalLayout'), 'FiscalLayout'),
        children: [
          { index: true,       lazy: lz(() => import('@/pages/app/fiscal/FiscalDashboard'), 'FiscalDashboard') },
          { path: 'tva', children: [
            { index: true, lazy: lz(() => import('@/pages/app/fiscal/TVAFiscalPage'), 'TVAFiscalPage') },
            { path: 'historique', lazy: lz(() => import('@/pages/app/fiscal/TVAHistoriquePage'), 'TVAHistoriquePage') },
          ]},
          { path: 'dsf', children: [
            { index: true, lazy: lz(() => import('@/pages/app/fiscal/DSFPage'), 'DSFPage') },
            { path: 'historique', lazy: lz(() => import('@/pages/app/fiscal/DSFHistoriquePage'), 'DSFHistoriquePage') },
          ]},
          { path: 'is', children: [
            { index: true, lazy: lz(() => import('@/pages/app/fiscal/ISPage'), 'ISPage') },
            { path: 'acomptes',   lazy: lz(() => import('@/pages/app/fiscal/ISAcomptesPage'),   'ISAcomptesPage') },
            { path: 'historique', lazy: lz(() => import('@/pages/app/fiscal/ISHistoriquePage'), 'ISHistoriquePage') },
          ]},
          { path: 'patente',   lazy: lz(() => import('@/pages/app/fiscal/PatentePage'),     'PatentePage') },
          { path: 'ras',       lazy: lz(() => import('@/pages/app/fiscal/RASPage'),         'RASPage') },
          { path: 'cnps',      lazy: lz(() => import('@/pages/app/fiscal/CNPSPage'),        'CNPSPage') },
          { path: 'igs',       lazy: lz(() => import('@/pages/app/fiscal/IGSPage'),         'IGSPage') },
          { path: 'calendrier',lazy: lz(() => import('@/pages/app/fiscal/CalendrierPage'),  'CalendrierPage') },
          { path: 'liasse', children: [
            { index: true, lazy: lz(() => import('@/pages/app/fiscal/LiassePage'), 'LiassePage') },
            { path: 'annexes', lazy: lz(() => import('@/pages/app/fiscal/LiasseAnnexesPage'), 'LiasseAnnexesPage') },
          ]},
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

      // ── SUPER_ADMIN : métriques SaaS ────────────────────────────────────────
      { path: 'admin/metrics', lazy: lz(() => import('@/pages/app/admin/MetricsPage'), 'MetricsPage') },

    ]}],
  },

  // ── Admin space — SUPER_ADMIN uniquement ───────────────────────────────────
  {
    element: <AdminRoute />,
    children: [{ path: '/admin', lazy: lz(() => import('@/layouts/AdminLayout'), 'AdminLayout'), children: [
      { index: true, lazy: lz(() => import('@/pages/app/admin/MetricsPage'), 'MetricsPage') },
      { path: 'users',  lazy: lz(() => import('@/pages/app/admin/UsersPage'),  'UsersPage') },
      { path: 'health', lazy: lz(() => import('@/pages/app/admin/HealthPage'), 'HealthPage') },
    ]}],
  },

  // ── Cabinet space ───────────────────────────────────────────────────────────
  {
    element: <ProtectedRoute allow={['CABINET']} />,
    children: [{ path: '/cabinet', lazy: lz(() => import('@/layouts/CabinetLayout'), 'CabinetLayout'), children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', lazy: lz(() => import('@/pages/cabinet/Dashboard'), 'CabinetDashboard') },
      { path: 'clients',   lazy: lz(() => import('@/pages/cabinet/Clients'),   'CabinetClients') },
      { path: 'access',    lazy: lz(() => import('@/pages/cabinet/Access'),    'CabinetAccess') },
      { path: 'billing',   lazy: lz(() => import('@/pages/cabinet/Billing'),   'CabinetBilling') },
    ]}],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])

export function App() {
  return <RouterProvider router={router} />
}
