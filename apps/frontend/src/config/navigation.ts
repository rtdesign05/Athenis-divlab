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
      { label: 'Vue d\'ensemble', path: '/app/gestion',           icon: '▦',  end: true },
      { label: 'Ventes',          path: '/app/gestion/ventes',    icon: '💹' },
      { label: 'Achats',          path: '/app/gestion/achats',    icon: '🛒' },
      { label: 'Trésorerie',      path: '/app/gestion/tresorerie',icon: '💰' },
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
      { label: 'Transactions',     path: '/app/accounting/transactions',        icon: '↔️' },
      { label: 'Tableau de bord',  path: '/app/accounting',                    icon: '▦',  end: true },
      { label: 'Journal',          path: '/app/accounting/journal',             icon: '📒' },
      { label: 'Grand livre',      path: '/app/accounting/grand-livre',         icon: '📗' },
      { label: 'Balance',          path: '/app/accounting/balance',             icon: '⚖️' },
      { label: 'Comptes',          path: '/app/accounting/comptes',             icon: '🗂️' },
      { label: 'Immobilisations',  path: '/app/accounting/immobilisations',     icon: '🏗️' },
      { label: 'Révision',         path: '/app/accounting/revision',            icon: '🔍' },
      { label: 'États financiers', path: '/app/accounting/etats-financiers',    icon: '📊' },
    ],
  },
  {
    module: 'rh',
    label: 'Ressources humaines',
    items: [
      { label: 'Vue d\'ensemble', path: '/app/hr',            icon: '▦',  end: true },
      { label: 'Employés',        path: '/app/hr/employes',   icon: '👤' },
      { label: 'Contrats',        path: '/app/hr/contrats',   icon: '📜' },
      { label: 'Congés',          path: '/app/hr/conges',     icon: '🏖️' },
      { label: 'Paie',            path: '/app/hr/paie',       icon: '💶' },
      { label: 'Planning',        path: '/app/hr/planning',   icon: '📅' },
    ],
  },
  {
    module: 'juridique',
    label: 'Juridique',
    items: [
      { label: 'Vue d\'ensemble', path: '/app/legal',              icon: '▦',  end: true },
      { label: 'Contrats',        path: '/app/legal/contrats',     icon: '📜' },
      { label: 'RGPD',            path: '/app/legal/rgpd',         icon: '🔒' },
      { label: 'Conformité',      path: '/app/legal/conformite',   icon: '✓'  },
      { label: 'Documents',       path: '/app/legal/documents',    icon: '📁' },
    ],
  },
  {
    module: 'esg',
    label: 'ESG & CSRD',
    items: [
      { label: 'Vue d\'ensemble', path: '/app/esg',                icon: '🌿', end: true },
      { label: 'Environnemental', path: '/app/esg/environnement',  icon: '🌱' },
      { label: 'Social',          path: '/app/esg/social',         icon: '🤝' },
      { label: 'Gouvernance',     path: '/app/esg/gouvernance',    icon: '🏛️' },
      { label: 'Risques',         path: '/app/esg/risques',        icon: '⚠️' },
      { label: 'Rapport',         path: '/app/esg/rapport',        icon: '🌍' },
    ],
  },
  {
    module: 'fiscalite',
    label: 'Fiscalité',
    items: [
      { label: 'Tableau de bord',      path: '/app/fiscal',            icon: '▦',  end: true },
      { label: 'TVA',                  path: '/app/fiscal/tva',        icon: '🧾' },
      { label: 'DSF',                  path: '/app/fiscal/dsf',        icon: '📋' },
      { label: 'IS',                   path: '/app/fiscal/is',         icon: '🏦' },
      { label: 'Patente',              path: '/app/fiscal/patente',    icon: '📜' },
      { label: 'Retenues à la source', path: '/app/fiscal/ras',        icon: '✂️' },
      { label: 'CNPS',                 path: '/app/fiscal/cnps',       icon: '👷' },
      { label: 'Calendrier fiscal',    path: '/app/fiscal/calendrier', icon: '📅' },
      { label: 'Liasse fiscale',       path: '/app/fiscal/liasse',     icon: '🗂️' },
    ],
  },
]

// ── Troisième niveau : barre horizontale contextuelle ─────────────────────────
// Clé = préfixe de route → onglets affichés dans la barre horizontale

export interface ContextualTab {
  label: string
  to: string
  end?: boolean
}

export const CONTEXTUAL_TABS: Record<string, ContextualTab[]> = {

  // ── Gestion ────────────────────────────────────────────────────────────────
  '/app/gestion/tresorerie': [
    { label: 'Tableau de bord',   to: '/app/gestion/tresorerie',             end: true },
    { label: 'Comptes bancaires', to: '/app/gestion/tresorerie/banques' },
    { label: 'Caisses',           to: '/app/gestion/tresorerie/caisses' },
    { label: 'Mobile Money',      to: '/app/gestion/tresorerie/mobile-money' },
    { label: 'Prévisions',        to: '/app/gestion/tresorerie/previsions' },
  ],
  '/app/gestion/ventes': [
    { label: 'Commandes clients',  to: '/app/gestion/ventes',              end: true },
    { label: 'Clients',            to: '/app/gestion/ventes/clients' },
    { label: 'Bons de livraison',  to: '/app/gestion/ventes/livraisons' },
    { label: 'Retours clients',    to: '/app/gestion/ventes/retours' },
  ],
  '/app/gestion/achats': [
    { label: 'Commandes fournisseurs', to: '/app/gestion/achats',          end: true },
    { label: 'Réceptions',             to: '/app/gestion/achats/receptions' },
    { label: 'Fournisseurs',           to: '/app/gestion/achats/fournisseurs' },
  ],
  // ── Comptabilité ───────────────────────────────────────────────────────────
  '/app/accounting/journal': [
    { label: 'Saisie',               to: '/app/accounting/journal',              end: true },
    { label: 'À lettrer',            to: '/app/accounting/journal/lettrage' },
    { label: 'Extournes',            to: '/app/accounting/journal/extournes' },
  ],
  '/app/accounting/immobilisations': [
    { label: 'Registre',             to: '/app/accounting/immobilisations',      end: true },
    { label: 'Amortissements',       to: '/app/accounting/immobilisations/amortissements' },
    { label: 'Cessions',             to: '/app/accounting/immobilisations/cessions' },
  ],
  '/app/accounting/etats-financiers': [
    { label: 'Bilan',                to: '/app/accounting/etats-financiers',     end: true },
    { label: 'Compte de résultat',   to: '/app/accounting/etats-financiers/resultat' },
    { label: 'Flux de trésorerie',   to: '/app/accounting/etats-financiers/flux' },
  ],

  // ── RH ────────────────────────────────────────────────────────────────────
  '/app/hr/employes': [
    { label: 'Liste',                to: '/app/hr/employes',                     end: true },
    { label: 'Organigramme',         to: '/app/hr/employes/organigramme' },
  ],
  '/app/hr/conges': [
    { label: 'En cours',             to: '/app/hr/conges',                       end: true },
    { label: 'Calendrier',           to: '/app/hr/conges/calendrier' },
    { label: 'Historique',           to: '/app/hr/conges/historique' },
  ],
  '/app/hr/paie': [
    { label: 'Bulletins',            to: '/app/hr/paie',                         end: true },
    { label: 'Virements',            to: '/app/hr/paie/virements' },
    { label: 'Déclarations sociales', to: '/app/hr/paie/declarations' },
  ],
  '/app/hr/planning': [
    { label: 'Vue semaine',          to: '/app/hr/planning',                     end: true },
    { label: 'Vue mois',             to: '/app/hr/planning/mois' },
  ],

  // ── Juridique ─────────────────────────────────────────────────────────────
  '/app/legal/contrats': [
    { label: 'Actifs',               to: '/app/legal/contrats',                  end: true },
    { label: 'Expirés',              to: '/app/legal/contrats/expires' },
    { label: 'Modèles',              to: '/app/legal/contrats/modeles' },
  ],
  '/app/legal/rgpd': [
    { label: 'Registre',             to: '/app/legal/rgpd',                      end: true },
    { label: 'Consentements',        to: '/app/legal/rgpd/consentements' },
    { label: 'Demandes',             to: '/app/legal/rgpd/demandes' },
  ],

  // ── ESG ───────────────────────────────────────────────────────────────────
  '/app/esg/environnement': [
    { label: 'Émissions CO₂',        to: '/app/esg/environnement',               end: true },
    { label: 'Énergie',              to: '/app/esg/environnement/energie' },
    { label: 'Déchets',              to: '/app/esg/environnement/dechets' },
  ],
  '/app/esg/social': [
    { label: 'Indicateurs',          to: '/app/esg/social',                      end: true },
    { label: 'Diversité',            to: '/app/esg/social/diversite' },
    { label: 'Formation',            to: '/app/esg/social/formation' },
  ],
  '/app/esg/rapport': [
    { label: 'Aperçu',               to: '/app/esg/rapport',                     end: true },
    { label: 'Indicateurs CSRD',     to: '/app/esg/rapport/csrd' },
    { label: 'Génération',           to: '/app/esg/rapport/generation' },
  ],

  // ── Fiscalité ─────────────────────────────────────────────────────────────
  '/app/fiscal/tva': [
    { label: 'Déclaration',          to: '/app/fiscal/tva',                      end: true },
    { label: 'Historique',           to: '/app/fiscal/tva/historique' },
  ],
  '/app/fiscal/dsf': [
    { label: 'DSF courante',         to: '/app/fiscal/dsf',                      end: true },
    { label: 'Historique',           to: '/app/fiscal/dsf/historique' },
  ],
  '/app/fiscal/is': [
    { label: 'Calcul IS',            to: '/app/fiscal/is',                       end: true },
    { label: 'Acomptes',             to: '/app/fiscal/is/acomptes' },
    { label: 'Historique',           to: '/app/fiscal/is/historique' },
  ],
  '/app/fiscal/liasse': [
    { label: 'Liasse fiscale',       to: '/app/fiscal/liasse',                   end: true },
    { label: 'Tableaux annexes',     to: '/app/fiscal/liasse/annexes' },
  ],
}

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
