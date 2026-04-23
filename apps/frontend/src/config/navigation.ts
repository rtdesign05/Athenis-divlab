import type { Module } from '@athenis/shared-types'

export interface NavItem {
  label: string
  path: string
  icon: string
}

export interface NavSection {
  module: Module
  label: string
  items: NavItem[]
}

export const APP_NAV_SECTIONS: NavSection[] = [
  {
    module: 'gestion',
    label: 'Gestion',
    items: [
      { label: 'Tableau de bord', path: '/app/dashboard', icon: '▦' },
      { label: 'Factures', path: '/app/invoices', icon: '🧾' },
      { label: 'Devis', path: '/app/quotes', icon: '📋' },
      { label: 'Clients', path: '/app/clients', icon: '👥' },
      { label: 'Dépenses', path: '/app/expenses', icon: '💸' },
      { label: 'Rapports', path: '/app/reports', icon: '📊' },
    ],
  },
  {
    module: 'rh',
    label: 'Ressources humaines',
    items: [
      { label: 'Employés',  path: '/app/hr/employees', icon: '👤' },
      { label: 'Congés',    path: '/app/hr/leaves',    icon: '🏖️' },
      { label: 'Planning',  path: '/app/hr/planning',  icon: '📅' },
      { label: 'Entretiens', path: '/app/hr/reviews',  icon: '📝' },
      { label: 'Bulletins', path: '/app/hr/payslip',   icon: '💶' },
    ],
  },
  {
    module: 'comptabilite',
    label: 'Comptabilité',
    items: [
      { label: 'Journal', path: '/app/accounting/journal', icon: '📒' },
      { label: 'Grand livre', path: '/app/accounting/ledger', icon: '📚' },
      { label: 'Bilan', path: '/app/accounting/balance-sheet', icon: '⚖️' },
      { label: 'Résultat', path: '/app/accounting/income', icon: '📈' },
      { label: 'Relevé bancaire', path: '/app/accounting/bank', icon: '🏦' },
      { label: 'TVA CA3', path: '/app/accounting/vat', icon: '%' },
      { label: 'Export FEC', path: '/app/accounting/fec', icon: '📤' },
      { label: 'Clôture exercice', path: '/app/accounting/cloture', icon: '🔒' },
    ],
  },
  {
    module: 'juridique',
    label: 'Juridique',
    items: [
      { label: 'Contrats', path: '/app/legal/contracts', icon: '📜' },
      { label: 'Conformité', path: '/app/legal/compliance', icon: '✅' },
      { label: 'RGPD', path: '/app/legal/gdpr', icon: '🔒' },
      { label: 'Documents', path: '/app/legal/documents', icon: '🗂️' },
    ],
  },
  {
    module: 'esg',
    label: 'ESG & CSRD',
    items: [
      { label: 'Score ESG', path: '/app/esg', icon: '🌿' },
      { label: 'Indicateurs', path: '/app/esg/indicators', icon: '📉' },
      { label: 'Risques', path: '/app/esg/risks', icon: '⚠️' },
      { label: 'Rapport CSRD', path: '/app/esg/csrd', icon: '🌍' },
    ],
  },
]

export const PERSONAL_NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', path: '/personal/dashboard', icon: '▦' },
  { label: 'Dépenses', path: '/personal/expenses', icon: '💸' },
  { label: 'Revenus', path: '/personal/income', icon: '📈' },
  { label: 'Épargne', path: '/personal/savings', icon: '🐷' },
]

export const CABINET_NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', path: '/cabinet/dashboard', icon: '▦' },
  { label: 'Portefeuille clients', path: '/cabinet/clients', icon: '💼' },
  { label: 'Accès & mandats', path: '/cabinet/access', icon: '🔑' },
  { label: 'Facturation', path: '/cabinet/billing', icon: '🧾' },
]
