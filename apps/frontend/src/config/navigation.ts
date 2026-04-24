import type { Module } from '@athenis/shared-types'

export interface NavItem {
  label: string
  path: string
  icon: string
  end?: boolean
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
      { label: 'Vue d\'ensemble', path: '/app/gestion',          icon: '▦',  end: true },
      { label: 'Factures',        path: '/app/gestion/factures', icon: '🧾' },
      { label: 'Devis',           path: '/app/gestion/devis',    icon: '📋' },
      { label: 'Clients',         path: '/app/gestion/clients',  icon: '👥' },
      { label: 'Dépenses',        path: '/app/gestion/depenses', icon: '💸' },
      { label: 'Trésorerie',      path: '/app/gestion/tresorerie', icon: '💰' },
    ],
  },
  {
    module: 'rh',
    label: 'Ressources humaines',
    items: [
      { label: 'Vue d\'ensemble', path: '/app/hr',            icon: '▦',  end: true },
      { label: 'Employés',        path: '/app/hr/employes',   icon: '👤' },
      { label: 'Congés',          path: '/app/hr/conges',     icon: '🏖️' },
      { label: 'Paie',            path: '/app/hr/paie',       icon: '💶' },
      { label: 'Planning',        path: '/app/hr/planning',   icon: '📅' },
    ],
  },
  {
    module: 'comptabilite',
    label: 'Comptabilité',
    items: [
      { label: 'Tableau de bord', path: '/app/accounting',              icon: '▦',  end: true },
      { label: 'Bilan',           path: '/app/accounting/bilan',        icon: '⚖️' },
      { label: 'Journal',         path: '/app/accounting/journal',      icon: '📒' },
    ],
  },
  {
    module: 'juridique',
    label: 'Juridique',
    items: [
      { label: 'Vue d\'ensemble', path: '/app/legal',           icon: '▦',  end: true },
      { label: 'Contrats',        path: '/app/legal/contrats',  icon: '📜' },
      { label: 'RGPD',            path: '/app/legal/rgpd',      icon: '🔒' },
      { label: 'Conformité',      path: '/app/legal/conformite', icon: '✓' },
    ],
  },
  {
    module: 'esg',
    label: 'ESG & CSRD',
    items: [
      { label: 'Vue d\'ensemble', path: '/app/esg',                   icon: '🌿', end: true },
      { label: 'Environnemental', path: '/app/esg/environnement',     icon: '🌱' },
      { label: 'Risques',         path: '/app/esg/risques',           icon: '⚠️' },
      { label: 'Rapport',         path: '/app/esg/rapport',           icon: '🌍' },
    ],
  },
]

export const PERSONAL_NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', path: '/personal/dashboard', icon: '▦', end: true },
  { label: 'Dépenses',        path: '/personal/expenses',  icon: '💸' },
  { label: 'Revenus',         path: '/personal/income',    icon: '📈' },
  { label: 'Épargne',         path: '/personal/savings',   icon: '🐷' },
]

export const CABINET_NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord',      path: '/cabinet/dashboard', icon: '▦', end: true },
  { label: 'Portefeuille clients', path: '/cabinet/clients',   icon: '💼' },
  { label: 'Accès & mandats',      path: '/cabinet/access',    icon: '🔑' },
  { label: 'Facturation',          path: '/cabinet/billing',   icon: '🧾' },
]
