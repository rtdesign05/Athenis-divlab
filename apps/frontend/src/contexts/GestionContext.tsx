import { createContext, useContext, useState, useMemo, type ReactNode } from 'react'

// ── Helpers ventes récurrentes ────────────────────────────────────────────────

/** Avance une date ISO d'un certain nombre de mois */
function addMonthsISO(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

const FREQ_MOIS_INIT: Record<string, number> = {
  mensuel: 1, trimestriel: 3, semestriel: 6, annuel: 12,
}

// ── Persistance localStorage : comptes comptables tiers ───────────────────────
// On ne persiste QUE le champ `compte` (N° comptable) pour ne pas stocker toutes
// les données démo. Clé : "athenis_comptes_tiers_v1"
// Structure : { "FRN-001": "401import", "CLI-003": "411000", ... }

const LS_KEY_COMPTES_TIERS = 'athenis_comptes_tiers_v1'

function loadComptesFromLS(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_COMPTES_TIERS) ?? '{}')
  } catch { return {} }
}

function saveCompteToLS(id: string, compte: string | undefined) {
  try {
    const map = loadComptesFromLS()
    if (compte?.trim()) {
      map[id] = compte.trim()
    } else {
      delete map[id]
    }
    localStorage.setItem(LS_KEY_COMPTES_TIERS, JSON.stringify(map))
  } catch { /* ignore */ }
}

function applyComptes<T extends { id: string; compte?: string }>(items: T[], map: Record<string, string>): T[] {
  return items.map(item => map[item.id] ? { ...item, compte: map[item.id] } : item)
}

// ── Types commandes / achats ───────────────────────────────────────────────────

export type CommandeStatut = 'En cours' | 'Livrée' | 'En attente' | 'Annulée'
export type AchatStatut    = 'En cours' | 'Reçue'  | 'En attente' | 'Annulée'

export interface Commande {
  id:        string
  client:    string
  agence:    string
  date:      string        // ISO date
  montant:   number        // XAF
  statut:    CommandeStatut
  livraison: string | null // ISO date or null
}

export interface LigneAchat {
  id:             string
  reference:      string
  designation:    string
  quantite:       number
  unite:          string
  prixUnitaireHT: number
  montantHT:      number
}

export interface Achat {
  id:                  string
  fournisseur:         string
  agence:              string
  date:                string        // ISO date
  montant:             number        // XAF
  statut:              AchatStatut
  reception:           string | null // ISO date or null
  objet:               string
  lignes:              LigneAchat[]
  notes:               string
  conditionsPaiement:  string
}

// ── Types articles ────────────────────────────────────────────────────────────

export type ArticleCategorie = string
export type ArticleUnite     = 'pièce' | 'kg' | 'litre' | 'm²' | 'heure' | 'forfait'

export const DEFAULT_CATEGORIES: string[] = ['Produit fini', 'Matière première', 'Service', 'Consommable', 'Équipement']

export interface Article {
  id:           string
  reference:    string
  nom:          string
  categorie:    ArticleCategorie
  unite:        ArticleUnite
  prixVenteHT:  number   // XAF HT
  prixAchatHT:  number   // XAF HT
  stock:        number
  stockMin:     number   // seuil alerte rupture
  agence:       string
  description:  string
  actif:        boolean
  createdAt:    string   // ISO date
}

// ── Types clients / fournisseurs ──────────────────────────────────────────────

export type ClientType = 'entreprise' | 'particulier'

export interface Client {
  id:          string
  nom:         string
  type:        ClientType
  email:       string
  telephone:   string
  adresse:     string
  agence:      string
  notes:       string
  compte?:     string  // N° de compte comptable (ex: 411000) — facultatif
  createdAt:   string  // ISO date
}

export type FournisseurCategorie = 'Matières premières' | 'Services' | 'Équipement' | 'Logistique' | 'Informatique' | 'Autre'

export interface Fournisseur {
  id:          string
  nom:         string
  categorie:   FournisseurCategorie
  email:       string
  telephone:   string
  adresse:     string
  agence:      string
  notes:       string
  compte?:     string  // N° de compte comptable (ex: 401000) — facultatif
  createdAt:   string  // ISO date
}

// Compte tiers dérivé des clients/fournisseurs ayant un compte renseigné
export interface CompteTiers {
  id:      string           // CLI-xxx ou FRN-xxx
  numero:  string           // numéro de compte
  intitule: string          // nom du tiers
  type:    'client' | 'fournisseur'
  agence:  string
}

// ── Factures ventes ───────────────────────────────────────────────────────────

export interface LigneFacture {
  id:             string
  description:    string
  quantite:       number
  unite:          string
  prixUnitaireHT: number
  tvaRate:        number
  montantHT:      number
}

export type ModeleFacture = 'standard' | 'proforma' | 'avoir' | 'acompte'

export type FactureVenteStatut = 'Brouillon' | 'Envoyée' | 'Payée' | 'En retard' | 'Annulée'
export interface FactureVente {
  id:                 string
  modele:             ModeleFacture
  commande:           string
  client:             string
  agence:             string
  date:               string
  echeance:           string
  montantHT:          number
  tva:                number
  montantTTC:         number
  statut:             FactureVenteStatut
  lignes:             LigneFacture[]
  notes:              string
  conditionsPaiement: string
}

// ── Ventes récurrentes (abonnements) ─────────────────────────────────────────

export type VenteRecurrenteFrequence = 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel'
export type VenteRecurrenteStatut    = 'Actif' | 'En pause' | 'Annulé' | 'Expiré'

export interface VenteRecurrente {
  id:                string
  client:            string
  agence:            string
  description:       string
  montantHT:         number
  tvaRate:           number
  montantTTC:        number
  frequence:         VenteRecurrenteFrequence
  dateDebut:         string        // ISO date
  dateFin:           string | null // ISO date or null (indéfini)
  prochaineEcheance: string        // ISO date
  statut:            VenteRecurrenteStatut
  lignes:            LigneFacture[]
  conditionsPaiement: string
  notes:             string
  facturesGenerees:  number        // nombre de factures déjà générées
}

// ── Bons de livraison ─────────────────────────────────────────────────────────
export type BLStatut = 'En préparation' | 'Expédié' | 'Livré' | 'Retourné'

export interface LigneLivraison {
  id:          string
  articleId:   string
  reference:   string
  designation: string
  quantite:    number
  unite:       string
}

export interface BonLivraison {
  id:               string
  commande:         string
  client:           string
  agence:           string
  dateCreation:     string
  datePrevue:       string
  dateLivraison:    string | null
  statut:           BLStatut
  lignes:           LigneLivraison[]
  adresseLivraison: string
  notes:            string
}

// ── Retours clients ───────────────────────────────────────────────────────────
export type RetourStatut = 'En cours' | 'Validé' | 'Remboursé' | 'Refusé'
export interface RetourClient {
  id:      string
  facture: string
  client:  string
  agence:  string
  date:    string
  motif:   string
  montant: number
  statut:  RetourStatut
}

// ── Factures achats ───────────────────────────────────────────────────────────
export type FactureAchatStatut = 'À valider' | 'Validée' | 'Payée' | 'En retard' | 'Annulée'

export interface LigneFactureAchat {
  id:             string
  description:    string
  quantite:       number
  unite:          string
  prixUnitaireHT: number
  tvaRate:        number
  montantHT:      number
}

export interface FactureAchat {
  id:          string
  commande:    string
  fournisseur: string
  agence:      string
  date:        string
  echeance:    string
  montantHT:   number
  tva:         number
  montantTTC:  number
  statut:      FactureAchatStatut
  lignes:      LigneFactureAchat[]
  notes:       string
}

// ── Mouvements de stock ───────────────────────────────────────────────────────
export type MouvementType = 'Entrée' | 'Sortie' | 'Ajustement'
export interface MouvementStock {
  id:          string
  articleId:   string
  articleNom:  string
  type:        MouvementType
  quantite:    number   // positif = entrée/ajust+, négatif = sortie/ajust-
  reference:   string   // CMD-xxxx / ACH-xxxx / BR-xxxx / manuel
  agence:      string
  date:        string   // ISO date
  notes:       string
}

// ── Bons de réception ─────────────────────────────────────────────────────────
export type BRStatut = 'Attendu' | 'Reçu partiel' | 'Reçu' | 'Litige'

export interface LigneBR {
  id:            string
  reference:     string
  designation:   string
  quantite:      number
  quantiteRecue: number
  unite:         string
}

export interface BonReception {
  id:                  string
  commande:            string
  fournisseur:         string
  agence:              string
  dateCreation:        string
  datePrevue:          string
  dateReception:       string | null
  statut:              BRStatut
  lignes:              LigneBR[]
  notes:               string
  conditionsLivraison: string
}

// ── Données canoniques — commandes ────────────────────────────────────────────

const INIT_COMMANDES: Commande[] = [
  { id: 'CMD-0051', client: 'ACME Corp',           agence: 'Siège',                       date: '2026-04-25', montant:  8_400_000, statut: 'En cours',   livraison: '2026-05-05' },
  { id: 'CMD-0050', client: 'TechX Sarl',           agence: 'Agence Douala — Akwa',        date: '2026-04-24', montant:  4_200_000, statut: 'Livrée',     livraison: '2026-04-28' },
  { id: 'CMD-0049', client: 'Groupe Delta',          agence: 'Siège',                       date: '2026-04-23', montant: 12_000_000, statut: 'En cours',   livraison: '2026-05-10' },
  { id: 'CMD-0048', client: 'Sodiko Distribution',   agence: 'Succursale Yaoundé — Centre', date: '2026-04-22', montant:  3_150_000, statut: 'En attente', livraison: '2026-05-08' },
  { id: 'CMD-0047', client: 'Mengueme & Fils',       agence: 'Agence Douala — Akwa',        date: '2026-04-21', montant:  1_890_000, statut: 'Livrée',     livraison: '2026-04-26' },
  { id: 'CMD-0041', client: 'ACME Corp',             agence: 'Siège',                       date: '2026-04-24', montant:  1_450_000, statut: 'En cours',   livraison: '2026-04-30' },
  { id: 'CMD-0040', client: 'TechX Sarl',            agence: 'Agence Douala — Akwa',        date: '2026-04-22', montant:  3_200_000, statut: 'Livrée',     livraison: '2026-04-25' },
  { id: 'CMD-0039', client: 'Groupe Delta',          agence: 'Siège',                       date: '2026-04-20', montant:    890_000, statut: 'En attente', livraison: '2026-05-02' },
  { id: 'CMD-0038', client: 'Sonatec SA',            agence: 'Succursale Yaoundé — Centre', date: '2026-04-18', montant:  2_100_000, statut: 'Livrée',     livraison: '2026-04-22' },
  { id: 'CMD-0037', client: 'Infra Bâtiment',        agence: 'Agence Douala — Akwa',        date: '2026-04-15', montant:    560_000, statut: 'Annulée',    livraison: null },
]

const INIT_ACHATS: Achat[] = [
  {
    id: 'ACH-0034', fournisseur: 'Import Express', agence: 'Siège',
    date: '2026-04-25', montant: 5_600_000, statut: 'Reçue', reception: '2026-04-25',
    objet: 'Importation pompes submersibles et câblage électrique',
    conditionsPaiement: 'Paiement à 30 jours', notes: 'Dédouanement effectué par Import Express — Quai 4.',
    lignes: [
      { id: 'l1', reference: 'IMP-001', designation: 'Pompe immergée 2" — 750W',           quantite: 5,   unite: 'pièce',   prixUnitaireHT: 750_000, montantHT: 3_750_000 },
      { id: 'l2', reference: 'IMP-002', designation: 'Câbles électriques H07 2.5 mm²',     quantite: 200, unite: 'm',       prixUnitaireHT:     420, montantHT:    84_000 },
      { id: 'l3', reference: 'IMP-003', designation: 'Frais de dédouanement et port',      quantite: 1,   unite: 'forfait', prixUnitaireHT: 862_652, montantHT:   862_652 },
    ],
  },
  {
    id: 'ACH-0033', fournisseur: 'Ebobolo SARL', agence: 'Agence Douala — Akwa',
    date: '2026-04-24', montant: 2_800_000, statut: 'En cours', reception: '2026-04-30',
    objet: 'Fourniture groupe électrogène 10 kVA et accessoires',
    conditionsPaiement: 'Acompte 50% — solde à la livraison', notes: 'Confirmer arrivée au port avant livraison.',
    lignes: [
      { id: 'l1', reference: 'EBO-012', designation: 'Groupe électrogène 10 kVA',          quantite: 1, unite: 'pièce',   prixUnitaireHT: 1_900_000, montantHT: 1_900_000 },
      { id: 'l2', reference: 'EBO-013', designation: 'Kit démarrage et câblage',            quantite: 1, unite: 'forfait', prixUnitaireHT:   446_500, montantHT:   446_500 },
    ],
  },
  {
    id: 'ACH-0032', fournisseur: 'Africa Tech Supply', agence: 'Siège',
    date: '2026-04-23', montant: 9_200_000, statut: 'En attente', reception: '2026-05-10',
    objet: 'Acquisition onduleurs et batteries AGM',
    conditionsPaiement: 'Virement bancaire à 30 jours', notes: 'Commande en cours de fabrication chez le fournisseur.',
    lignes: [
      { id: 'l1', reference: 'ATS-330', designation: 'Onduleur 3 kVA Online',               quantite:  4, unite: 'pièce', prixUnitaireHT: 1_500_000, montantHT: 6_000_000 },
      { id: 'l2', reference: 'ATS-331', designation: 'Batterie 12V 100Ah AGM',              quantite: 16, unite: 'pièce', prixUnitaireHT:   107_369, montantHT: 1_717_908 },
    ],
  },
  {
    id: 'ACH-0031', fournisseur: 'Manutention Pro', agence: 'Succursale Yaoundé — Centre',
    date: '2026-04-22', montant: 1_450_000, statut: 'Reçue', reception: '2026-04-22',
    objet: 'Achat transpalettes et sangles de sécurité',
    conditionsPaiement: 'Paiement comptant', notes: 'Palette sécurisée, emballage intact.',
    lignes: [
      { id: 'l1', reference: 'MAN-010', designation: 'Transpalette manuel 2,5 T',           quantite:  2, unite: 'pièce', prixUnitaireHT: 580_000, montantHT: 1_160_000 },
      { id: 'l2', reference: 'MAN-011', designation: 'Sangles de sécurité 5 m',             quantite: 10, unite: 'pièce', prixUnitaireHT:   5_630, montantHT:    56_301 },
    ],
  },
  {
    id: 'ACH-0030', fournisseur: 'Intertrans Cm', agence: 'Agence Douala — Akwa',
    date: '2026-04-20', montant: 3_300_000, statut: 'En cours', reception: '2026-04-28',
    objet: 'Fourniture matériel de conditionnement et transport',
    conditionsPaiement: 'Paiement à 30 jours', notes: '',
    lignes: [
      { id: 'l1', reference: 'INT-200', designation: 'Palettes Europe 120×80 cm',           quantite: 50, unite: 'pièce',  prixUnitaireHT:  25_000, montantHT: 1_250_000 },
      { id: 'l2', reference: 'INT-201', designation: 'Film étirable industriel (500 m)',     quantite: 10, unite: 'rouleau', prixUnitaireHT:  85_000, montantHT:   850_000 },
      { id: 'l3', reference: 'INT-202', designation: 'Frais de transport',                  quantite:  1, unite: 'forfait', prixUnitaireHT: 666_246, montantHT:   666_246 },
    ],
  },
  {
    id: 'ACH-0018', fournisseur: 'Supplies Pro', agence: 'Siège',
    date: '2026-04-23', montant: 780_000, statut: 'En cours', reception: '2026-04-28',
    objet: 'Fournitures de bureau et consommables',
    conditionsPaiement: 'Paiement à réception', notes: '10 articles en rupture — relance fournisseur le 25/04.',
    lignes: [
      { id: 'l1', reference: 'SUP-055', designation: 'Cartouches imprimante HP 305XL (noir)', quantite: 20, unite: 'pièce',   prixUnitaireHT:  15_000, montantHT: 300_000 },
      { id: 'l2', reference: 'SUP-056', designation: 'Ramette papier A4 80g (500 feuilles)', quantite: 30, unite: 'ramette',  prixUnitaireHT:   8_500, montantHT: 255_000 },
      { id: 'l3', reference: 'SUP-057', designation: 'Stylos et fournitures bureau',          quantite:  1, unite: 'forfait',  prixUnitaireHT:  99_006, montantHT:  99_006 },
    ],
  },
  {
    id: 'ACH-0017', fournisseur: 'Tech Matériaux', agence: 'Siège',
    date: '2026-04-20', montant: 1_350_000, statut: 'Reçue', reception: '2026-04-24',
    objet: 'Approvisionnement matériaux de construction',
    conditionsPaiement: 'Paiement à 15 jours', notes: '',
    lignes: [
      { id: 'l1', reference: 'TM-045', designation: 'Ciment CPA 42.5 (sac 50 kg)',         quantite: 200, unite: 'sac',   prixUnitaireHT:   3_000, montantHT:   600_000 },
      { id: 'l2', reference: 'TM-046', designation: 'Fer à béton ø10 (barre 12 m)',        quantite:  40, unite: 'barre', prixUnitaireHT:  12_000, montantHT:   480_000 },
      { id: 'l3', reference: 'TM-047', designation: 'Sable de rivière (m³)',               quantite:   4, unite: 'm³',   prixUnitaireHT:  13_019, montantHT:    52_075 },
    ],
  },
  {
    id: 'ACH-0016', fournisseur: 'Distrib Central', agence: 'Agence Douala — Akwa',
    date: '2026-04-18', montant: 420_000, statut: 'En attente', reception: '2026-05-05',
    objet: 'Achat écrans LCD 24" pour agence Akwa',
    conditionsPaiement: 'Paiement comptant', notes: 'Marchandises reçues endommagées — litige en cours.',
    lignes: [
      { id: 'l1', reference: 'DC-011', designation: 'Écran LCD 24" Full HD',               quantite: 2, unite: 'pièce', prixUnitaireHT: 176_080, montantHT: 352_160 },
    ],
  },
  {
    id: 'ACH-0015', fournisseur: 'Fournisseur XYZ', agence: 'Siège',
    date: '2026-04-15', montant: 2_600_000, statut: 'Reçue', reception: '2026-04-19',
    objet: 'Fourniture système de détection incendie',
    conditionsPaiement: 'Paiement à 30 jours', notes: 'À réévaluer — qualité variable.',
    lignes: [
      { id: 'l1', reference: 'XYZ-088', designation: 'Détecteur de fumée 230V',            quantite: 20, unite: 'pièce', prixUnitaireHT:  75_000, montantHT: 1_500_000 },
      { id: 'l2', reference: 'XYZ-089', designation: 'Centrale incendie 8 zones',          quantite:  1, unite: 'pièce', prixUnitaireHT: 679_540, montantHT:   679_540 },
    ],
  },
  {
    id: 'ACH-0014', fournisseur: 'Import Express', agence: 'Siège',
    date: '2026-04-10', montant: 195_000, statut: 'Annulée', reception: null,
    objet: 'Commande disques durs SSD et clés USB',
    conditionsPaiement: 'Paiement à réception', notes: 'Commande annulée suite à litige sur quantité reçue.',
    lignes: [
      { id: 'l1', reference: 'IMP-099', designation: 'Disque dur SSD 1 To',                quantite:  5, unite: 'pièce', prixUnitaireHT: 28_000, montantHT: 140_000 },
      { id: 'l2', reference: 'IMP-100', designation: 'Clé USB 64 Go — USB 3.0',            quantite: 10, unite: 'pièce', prixUnitaireHT:  2_356, montantHT:  23_556 },
    ],
  },
]

// ── Données canoniques — clients ──────────────────────────────────────────────

const INIT_CLIENTS: Client[] = [
  {
    id: 'CLI-001', nom: 'ACME Corp', type: 'entreprise',
    email: 'contact@acme-corp.cm', telephone: '+237 233 42 11 00',
    adresse: 'Rue de la Réunification, Douala', agence: 'Siège',
    notes: 'Client prioritaire — paiement 30j', createdAt: '2025-01-15',
  },
  {
    id: 'CLI-002', nom: 'Groupe Delta', type: 'entreprise',
    email: 'achat@groupe-delta.cm', telephone: '+237 222 23 45 67',
    adresse: 'Avenue Kennedy, Yaoundé', agence: 'Siège',
    notes: 'Contrat cadre annuel renouvelable', createdAt: '2025-03-01',
  },
  {
    id: 'CLI-003', nom: 'TechX Sarl', type: 'entreprise',
    email: 'info@techx.cm', telephone: '+237 6 77 88 99 00',
    adresse: 'Quartier Akwa, Douala', agence: 'Agence Douala — Akwa',
    notes: 'Spécialisé informatique et télécom', createdAt: '2025-02-10',
  },
  {
    id: 'CLI-004', nom: 'Mengueme & Fils', type: 'entreprise',
    email: 'mengueme.fils@gmail.com', telephone: '+237 6 55 44 33 22',
    adresse: 'Bassa, Douala', agence: 'Agence Douala — Akwa',
    notes: '', createdAt: '2025-04-12',
  },
  {
    id: 'CLI-005', nom: 'Sodiko Distribution', type: 'entreprise',
    email: 'sodiko@sodiko.cm', telephone: '+237 222 31 00 12',
    adresse: 'Centre commercial Yaoundé', agence: 'Succursale Yaoundé — Centre',
    notes: 'Délai livraison max 7 jours', createdAt: '2025-06-20',
  },
  {
    id: 'CLI-006', nom: 'Sonatec SA', type: 'entreprise',
    email: 'direction@sonatec.cm', telephone: '+237 222 22 88 55',
    adresse: 'Nlongkak, Yaoundé', agence: 'Succursale Yaoundé — Centre',
    notes: 'BTP — factures avec TVA', createdAt: '2025-07-08',
  },
  {
    id: 'CLI-007', nom: 'Infra Bâtiment', type: 'entreprise',
    email: 'infra@infrabtp.cm', telephone: '+237 6 70 11 22 33',
    adresse: 'Zone industrielle, Douala', agence: 'Agence Douala — Akwa',
    notes: 'Compte suspendu — en attente régularisation', createdAt: '2025-09-01',
  },
]

// ── Données canoniques — fournisseurs ─────────────────────────────────────────

const INIT_FOURNISSEURS: Fournisseur[] = [
  {
    id: 'FRN-001', nom: 'Import Express', categorie: 'Logistique',
    email: 'ops@import-express.cm', telephone: '+237 233 10 20 30',
    adresse: 'Port de Douala, Quai 4', agence: 'Siège',
    notes: 'Dédouanement inclus — délai 5 jours', createdAt: '2025-01-10',
  },
  {
    id: 'FRN-002', nom: 'Africa Tech Supply', categorie: 'Informatique',
    email: 'sales@africatech.cm', telephone: '+237 222 50 60 70',
    adresse: 'Quartier Bastos, Yaoundé', agence: 'Siège',
    notes: 'Fournisseur matériel IT agréé', createdAt: '2025-02-14',
  },
  {
    id: 'FRN-003', nom: 'Supplies Pro', categorie: 'Matières premières',
    email: 'commandes@suppliespro.cm', telephone: '+237 6 88 77 66 55',
    adresse: 'Bonabéri, Douala', agence: 'Siège',
    notes: 'Paiement comptant exigé', createdAt: '2025-03-20',
  },
  {
    id: 'FRN-004', nom: 'Tech Matériaux', categorie: 'Matières premières',
    email: 'contact@techmat.cm', telephone: '+237 6 99 11 22 44',
    adresse: 'Zone industrielle, Douala', agence: 'Siège',
    notes: '', createdAt: '2025-04-05',
  },
  {
    id: 'FRN-005', nom: 'Fournisseur XYZ', categorie: 'Autre',
    email: 'xyz@fournisseur.cm', telephone: '+237 6 60 70 80 90',
    adresse: 'Ngousso, Yaoundé', agence: 'Siège',
    notes: 'À réévaluer — qualité variable', createdAt: '2025-05-01',
  },
  {
    id: 'FRN-006', nom: 'Ebobolo SARL', categorie: 'Services',
    email: 'ebobolo@ebobolo.cm', telephone: '+237 6 55 66 77 88',
    adresse: 'Akwa, Douala', agence: 'Agence Douala — Akwa',
    notes: 'Prestation de services techniques', createdAt: '2025-03-15',
  },
  {
    id: 'FRN-007', nom: 'Intertrans Cm', categorie: 'Logistique',
    email: 'intertrans@intertrans.cm', telephone: '+237 6 44 33 22 11',
    adresse: 'Akwa nord, Douala', agence: 'Agence Douala — Akwa',
    notes: 'Transport routier national', createdAt: '2025-06-10',
  },
  {
    id: 'FRN-008', nom: 'Distrib Central', categorie: 'Matières premières',
    email: 'distrib@distribcentral.cm', telephone: '+237 6 22 33 44 55',
    adresse: 'Bassa, Douala', agence: 'Agence Douala — Akwa',
    notes: '', createdAt: '2025-08-22',
  },
  {
    id: 'FRN-009', nom: 'Manutention Pro', categorie: 'Équipement',
    email: 'manutention@manutpro.cm', telephone: '+237 222 30 40 50',
    adresse: 'Étoa-Meki, Yaoundé', agence: 'Succursale Yaoundé — Centre',
    notes: 'Location et vente matériel manutention', createdAt: '2025-07-01',
  },
]

// ── Données canoniques — factures ventes ─────────────────────────────────────

const INIT_FACTURES_VENTES: FactureVente[] = [
  {
    id: 'FAV-0010', modele: 'standard', commande: 'CMD-0050', client: 'TechX Sarl',
    agence: 'Agence Douala — Akwa', date: '2026-04-24', echeance: '2026-05-24',
    montantHT: 3_524_958, tva: 19.25, montantTTC: 4_200_000, statut: 'Payée',
    notes: '', conditionsPaiement: 'Paiement à 30 jours',
    lignes: [
      { id: 'l1', description: 'Pompe submersible 2"', quantite: 5, unite: 'pièce', prixUnitaireHT: 420_000, tvaRate: 19.25, montantHT: 2_100_000 },
      { id: 'l2', description: 'Câbles et accessoires', quantite: 1, unite: 'forfait', prixUnitaireHT: 1_000_000, tvaRate: 19.25, montantHT: 1_000_000 },
      { id: 'l3', description: 'Installation et mise en service', quantite: 17, unite: 'heure', prixUnitaireHT: 25_000, tvaRate: 19.25, montantHT: 424_958 },
    ],
  },
  {
    id: 'FAV-0009', modele: 'standard', commande: 'CMD-0047', client: 'Mengueme & Fils',
    agence: 'Agence Douala — Akwa', date: '2026-04-21', echeance: '2026-05-21',
    montantHT: 1_584_906, tva: 19.25, montantTTC: 1_890_000, statut: 'Payée',
    notes: '', conditionsPaiement: 'Paiement comptant',
    lignes: [
      { id: 'l1', description: 'Ciment CPA 42.5 (sac 50 kg)', quantite: 120, unite: 'pièce', prixUnitaireHT: 7_500, tvaRate: 19.25, montantHT: 900_000 },
      { id: 'l2', description: 'Fer à béton ø12 (barre 12 m)', quantite: 38, unite: 'pièce', prixUnitaireHT: 18_000, tvaRate: 19.25, montantHT: 684_000 },
      { id: 'l3', description: 'Transport et livraison', quantite: 1, unite: 'forfait', prixUnitaireHT: 906, tvaRate: 19.25, montantHT: 906 },
    ],
  },
  {
    id: 'FAV-0008', modele: 'standard', commande: 'CMD-0038', client: 'Sonatec SA',
    agence: 'Succursale Yaoundé — Centre', date: '2026-04-18', echeance: '2026-05-18',
    montantHT: 1_760_502, tva: 19.25, montantTTC: 2_100_000, statut: 'Envoyée',
    notes: 'Facture établie suite au bon de commande BC-2026-038', conditionsPaiement: 'Paiement à 30 jours',
    lignes: [
      { id: 'l1', description: 'Prestation installation électrique', quantite: 40, unite: 'heure', prixUnitaireHT: 25_000, tvaRate: 19.25, montantHT: 1_000_000 },
      { id: 'l2', description: 'Câble électrique H07V-K 2.5mm²', quantite: 500, unite: 'm²', prixUnitaireHT: 650, tvaRate: 19.25, montantHT: 325_000 },
      { id: 'l3', description: 'Fournitures et consommables', quantite: 1, unite: 'forfait', prixUnitaireHT: 435_502, tvaRate: 19.25, montantHT: 435_502 },
    ],
  },
  {
    id: 'FAV-0007', modele: 'standard', commande: 'CMD-0040', client: 'TechX Sarl',
    agence: 'Agence Douala — Akwa', date: '2026-04-22', echeance: '2026-05-22',
    montantHT: 2_682_927, tva: 19.25, montantTTC: 3_200_000, statut: 'Payée',
    notes: '', conditionsPaiement: 'Virement bancaire à 30 jours',
    lignes: [
      { id: 'l1', description: 'Groupe électrogène 10 kVA', quantite: 1, unite: 'pièce', prixUnitaireHT: 2_800_000, tvaRate: 19.25, montantHT: 2_800_000 },
      { id: 'l2', description: 'Livraison et installation', quantite: 1, unite: 'forfait', prixUnitaireHT: 82_927, tvaRate: 19.25, montantHT: 82_927 },
    ],
  },
  {
    id: 'FAV-0006', modele: 'standard', commande: 'CMD-0039', client: 'Groupe Delta',
    agence: 'Siège', date: '2026-04-20', echeance: '2026-05-05',
    montantHT: 746_444, tva: 19.25, montantTTC: 890_000, statut: 'En retard',
    notes: 'Relance envoyée le 10/05/2026', conditionsPaiement: 'Paiement à 15 jours',
    lignes: [
      { id: 'l1', description: 'Maintenance préventive annuelle', quantite: 2, unite: 'forfait', prixUnitaireHT: 350_000, tvaRate: 19.25, montantHT: 700_000 },
      { id: 'l2', description: 'Pièces de rechange', quantite: 1, unite: 'forfait', prixUnitaireHT: 46_444, tvaRate: 19.25, montantHT: 46_444 },
    ],
  },
  {
    id: 'FAV-0005', modele: 'proforma', commande: 'CMD-0049', client: 'Groupe Delta',
    agence: 'Siège', date: '2026-04-23', echeance: '2026-05-23',
    montantHT: 10_063_694, tva: 19.25, montantTTC: 12_000_000, statut: 'Envoyée',
    notes: 'Pro forma — ce document ne constitue pas une facture définitive', conditionsPaiement: 'Acompte 30% à la commande — solde à livraison',
    lignes: [
      { id: 'l1', description: 'Chariot élévateur 2T', quantite: 1, unite: 'pièce', prixUnitaireHT: 8_500_000, tvaRate: 19.25, montantHT: 8_500_000 },
      { id: 'l2', description: 'Formation opérateur (2 jours)', quantite: 16, unite: 'heure', prixUnitaireHT: 25_000, tvaRate: 19.25, montantHT: 400_000 },
      { id: 'l3', description: 'Contrat maintenance 1 an', quantite: 1, unite: 'forfait', prixUnitaireHT: 1_163_694, tvaRate: 19.25, montantHT: 1_163_694 },
    ],
  },
  {
    id: 'FAV-0004', modele: 'acompte', commande: 'CMD-0051', client: 'ACME Corp',
    agence: 'Siège', date: '2026-04-25', echeance: '2026-05-25',
    montantHT: 7_044_025, tva: 19.25, montantTTC: 8_400_000, statut: 'Brouillon',
    notes: 'Acompte de 30% sur commande CMD-0051', conditionsPaiement: 'Acompte 30% — solde à la livraison',
    lignes: [
      { id: 'l1', description: 'Acompte 30% — Groupe électrogène 10 kVA × 3', quantite: 1, unite: 'forfait', prixUnitaireHT: 7_044_025, tvaRate: 19.25, montantHT: 7_044_025 },
    ],
  },
  {
    id: 'FAV-0003', modele: 'standard', commande: 'CMD-0048', client: 'Sodiko Distribution',
    agence: 'Succursale Yaoundé — Centre', date: '2026-04-22', echeance: '2026-04-30',
    montantHT: 2_641_509, tva: 19.25, montantTTC: 3_150_000, statut: 'En retard',
    notes: '', conditionsPaiement: 'Paiement à 8 jours',
    lignes: [
      { id: 'l1', description: 'Sable de rivière (m³)', quantite: 80, unite: 'm²', prixUnitaireHT: 22_000, tvaRate: 19.25, montantHT: 1_760_000 },
      { id: 'l2', description: 'Fer à béton ø12 (barre 12 m)', quantite: 49, unite: 'pièce', prixUnitaireHT: 18_000, tvaRate: 19.25, montantHT: 882_000 },
      { id: 'l3', description: 'Frais de transport', quantite: 1, unite: 'forfait', prixUnitaireHT: -509, tvaRate: 0, montantHT: -509 },
    ],
  },
  {
    id: 'FAV-0002', modele: 'acompte', commande: 'CMD-0041', client: 'ACME Corp',
    agence: 'Siège', date: '2026-04-24', echeance: '2026-05-24',
    montantHT: 1_216_301, tva: 19.25, montantTTC: 1_450_000, statut: 'Brouillon',
    notes: 'Acompte 50% sur commande CMD-0041', conditionsPaiement: 'Acompte 50% — solde à la livraison',
    lignes: [
      { id: 'l1', description: 'Acompte 50% — Climatiseur split 12 000 BTU × 3', quantite: 1, unite: 'forfait', prixUnitaireHT: 1_216_301, tvaRate: 19.25, montantHT: 1_216_301 },
    ],
  },
  {
    id: 'FAV-0001', modele: 'avoir', commande: 'CMD-0037', client: 'Infra Bâtiment',
    agence: 'Agence Douala — Akwa', date: '2026-04-15', echeance: '2026-05-15',
    montantHT: 469_665, tva: 19.25, montantTTC: 560_000, statut: 'Annulée',
    notes: 'Avoir suite à annulation commande CMD-0037', conditionsPaiement: 'Remboursement sous 15 jours',
    lignes: [
      { id: 'l1', description: 'Avoir — Filtre à air universel × 20', quantite: 20, unite: 'pièce', prixUnitaireHT: -8_500, tvaRate: 19.25, montantHT: -170_000 },
      { id: 'l2', description: 'Avoir — Huile moteur 15W40 × 21', quantite: 21, unite: 'pièce', prixUnitaireHT: -14_000, tvaRate: 19.25, montantHT: -294_000 },
      { id: 'l3', description: 'Frais de dossier', quantite: 1, unite: 'forfait', prixUnitaireHT: -5_665, tvaRate: 0, montantHT: -5_665 },
    ],
  },
]

const INIT_BONS_LIVRAISON: BonLivraison[] = [
  {
    id: 'BL-0008', commande: 'CMD-0050', client: 'TechX Sarl', agence: 'Agence Douala — Akwa',
    dateCreation: '2026-04-24', datePrevue: '2026-04-28', dateLivraison: '2026-04-28', statut: 'Livré',
    adresseLivraison: 'Quartier Akwa, Douala', notes: '',
    lignes: [
      { id: 'l1', articleId: 'ART-002', reference: 'PF-0012', designation: 'Pompe submersible 2"',            quantite: 5, unite: 'pièce' },
      { id: 'l2', articleId: '',        reference: 'DIV-001', designation: 'Câbles et accessoires',           quantite: 1, unite: 'forfait' },
      { id: 'l3', articleId: 'ART-006', reference: 'SV-0032', designation: 'Installation et mise en service', quantite: 17, unite: 'heure' },
    ],
  },
  {
    id: 'BL-0007', commande: 'CMD-0047', client: 'Mengueme & Fils', agence: 'Agence Douala — Akwa',
    dateCreation: '2026-04-21', datePrevue: '2026-04-26', dateLivraison: '2026-04-26', statut: 'Livré',
    adresseLivraison: 'Bassa, Douala', notes: 'Livraison avec camion — déchargement client',
    lignes: [
      { id: 'l1', articleId: 'ART-003', reference: 'MP-0021', designation: 'Ciment CPA 42.5 (sac 50 kg)',   quantite: 120, unite: 'pièce' },
      { id: 'l2', articleId: 'ART-004', reference: 'MP-0022', designation: 'Fer à béton ø12 (barre 12 m)',  quantite: 38,  unite: 'pièce' },
    ],
  },
  {
    id: 'BL-0006', commande: 'CMD-0040', client: 'TechX Sarl', agence: 'Agence Douala — Akwa',
    dateCreation: '2026-04-22', datePrevue: '2026-04-25', dateLivraison: '2026-04-25', statut: 'Livré',
    adresseLivraison: 'Quartier Akwa, Douala', notes: 'Groupe à tester sur site avant réception définitive',
    lignes: [
      { id: 'l1', articleId: 'ART-001', reference: 'PF-0011', designation: 'Groupe électrogène 10 kVA', quantite: 1, unite: 'pièce' },
      { id: 'l2', articleId: '',        reference: 'DIV-002', designation: 'Livraison et installation',   quantite: 1, unite: 'forfait' },
    ],
  },
  {
    id: 'BL-0005', commande: 'CMD-0038', client: 'Sonatec SA', agence: 'Succursale Yaoundé — Centre',
    dateCreation: '2026-04-18', datePrevue: '2026-04-22', dateLivraison: '2026-04-22', statut: 'Livré',
    adresseLivraison: 'Nlongkak, Yaoundé', notes: '',
    lignes: [
      { id: 'l1', articleId: 'ART-010', reference: 'CS-0043', designation: 'Câble électrique H07V-K 2.5mm²',        quantite: 500, unite: 'm²' },
      { id: 'l2', articleId: '',        reference: 'DIV-003', designation: 'Fournitures et consommables électriques', quantite: 1,   unite: 'forfait' },
    ],
  },
  {
    id: 'BL-0004', commande: 'CMD-0051', client: 'ACME Corp', agence: 'Siège',
    dateCreation: '2026-04-25', datePrevue: '2026-05-05', dateLivraison: null, statut: 'En préparation',
    adresseLivraison: 'Rue de la Réunification, Douala', notes: 'Vérifier la puissance secteur avant installation',
    lignes: [
      { id: 'l1', articleId: 'ART-001', reference: 'PF-0011', designation: 'Groupe électrogène 10 kVA', quantite: 3, unite: 'pièce' },
    ],
  },
  {
    id: 'BL-0003', commande: 'CMD-0049', client: 'Groupe Delta', agence: 'Siège',
    dateCreation: '2026-04-23', datePrevue: '2026-05-10', dateLivraison: null, statut: 'En préparation',
    adresseLivraison: 'Avenue Kennedy, Yaoundé', notes: 'Formation opérateur 2 jours incluse',
    lignes: [
      { id: 'l1', articleId: 'ART-009', reference: 'EQ-0051', designation: 'Chariot élévateur 2T', quantite: 1, unite: 'pièce' },
    ],
  },
  {
    id: 'BL-0002', commande: 'CMD-0048', client: 'Sodiko Distribution', agence: 'Succursale Yaoundé — Centre',
    dateCreation: '2026-04-22', datePrevue: '2026-05-08', dateLivraison: null, statut: 'Expédié',
    adresseLivraison: 'Centre commercial Yaoundé', notes: '',
    lignes: [
      { id: 'l1', articleId: 'ART-011', reference: 'MP-0023', designation: 'Sable de rivière (m³)',          quantite: 80, unite: 'm²' },
      { id: 'l2', articleId: 'ART-004', reference: 'MP-0022', designation: 'Fer à béton ø12 (barre 12 m)',  quantite: 49, unite: 'pièce' },
    ],
  },
  {
    id: 'BL-0001', commande: 'CMD-0041', client: 'ACME Corp', agence: 'Siège',
    dateCreation: '2026-04-24', datePrevue: '2026-04-30', dateLivraison: null, statut: 'Expédié',
    adresseLivraison: 'Rue de la Réunification, Douala', notes: '',
    lignes: [
      { id: 'l1', articleId: 'ART-012', reference: 'PF-0013', designation: 'Climatiseur split 12 000 BTU', quantite: 3, unite: 'pièce' },
    ],
  },
]

const INIT_RETOURS_CLIENTS: RetourClient[] = [
  { id: 'RET-0004', facture: 'FAV-0007', client: 'TechX Sarl',          agence: 'Agence Douala — Akwa',        date: '2026-04-26', motif: 'Produit défectueux',    montant:   320_000, statut: 'Remboursé' },
  { id: 'RET-0003', facture: 'FAV-0006', client: 'Groupe Delta',         agence: 'Siège',                       date: '2026-04-24', motif: 'Erreur de référence',   montant:   890_000, statut: 'Validé' },
  { id: 'RET-0002', facture: 'FAV-0003', client: 'Sodiko Distribution',  agence: 'Succursale Yaoundé — Centre', date: '2026-04-25', motif: 'Quantité non conforme', montant:   450_000, statut: 'En cours' },
  { id: 'RET-0001', facture: 'FAV-0001', client: 'Infra Bâtiment',       agence: 'Agence Douala — Akwa',        date: '2026-04-16', motif: 'Commande annulée',      montant:   560_000, statut: 'Remboursé' },
]

const INIT_FACTURES_ACHATS: FactureAchat[] = [
  {
    id: 'FAA-0010', commande: 'ACH-0034', fournisseur: 'Import Express', agence: 'Siège',
    date: '2026-04-25', echeance: '2026-05-25', montantHT: 4_696_652, tva: 19.25, montantTTC: 5_600_000, statut: 'Payée',
    notes: 'Facture réglée par virement bancaire le 25/04.',
    lignes: [
      { id: 'l1', description: 'Pompe immergée 2" — 750W',         quantite: 5,   unite: 'pièce',   prixUnitaireHT: 750_000, tvaRate: 19.25, montantHT: 3_750_000 },
      { id: 'l2', description: 'Câbles électriques H07 2.5 mm²',   quantite: 200, unite: 'm',       prixUnitaireHT:     420, tvaRate: 19.25, montantHT:    84_000 },
      { id: 'l3', description: 'Frais de dédouanement et port',    quantite: 1,   unite: 'forfait', prixUnitaireHT: 862_652, tvaRate:     0, montantHT:   862_652 },
    ],
  },
  {
    id: 'FAA-0009', commande: 'ACH-0031', fournisseur: 'Manutention Pro', agence: 'Succursale Yaoundé — Centre',
    date: '2026-04-22', echeance: '2026-05-22', montantHT: 1_216_301, tva: 19.25, montantTTC: 1_450_000, statut: 'Payée',
    notes: '',
    lignes: [
      { id: 'l1', description: 'Transpalette manuel 2,5 T',         quantite:  2, unite: 'pièce', prixUnitaireHT: 580_000, tvaRate: 19.25, montantHT: 1_160_000 },
      { id: 'l2', description: 'Sangles de sécurité 5 m',           quantite: 10, unite: 'pièce', prixUnitaireHT:   5_630, tvaRate: 19.25, montantHT:    56_301 },
    ],
  },
  {
    id: 'FAA-0008', commande: 'ACH-0017', fournisseur: 'Tech Matériaux', agence: 'Siège',
    date: '2026-04-20', echeance: '2026-05-20', montantHT: 1_132_075, tva: 19.25, montantTTC: 1_350_000, statut: 'Payée',
    notes: '',
    lignes: [
      { id: 'l1', description: 'Ciment CPA 42.5 (sac 50 kg)',       quantite: 200, unite: 'sac',   prixUnitaireHT:  3_000, tvaRate: 19.25, montantHT:   600_000 },
      { id: 'l2', description: 'Fer à béton ø10 (barre 12 m)',      quantite:  40, unite: 'barre', prixUnitaireHT: 12_000, tvaRate: 19.25, montantHT:   480_000 },
      { id: 'l3', description: 'Sable de rivière (m³)',              quantite:   4, unite: 'm³',   prixUnitaireHT: 13_019, tvaRate: 19.25, montantHT:    52_075 },
    ],
  },
  {
    id: 'FAA-0007', commande: 'ACH-0015', fournisseur: 'Fournisseur XYZ', agence: 'Siège',
    date: '2026-04-15', echeance: '2026-05-15', montantHT: 2_179_540, tva: 19.25, montantTTC: 2_600_000, statut: 'Payée',
    notes: 'À réévaluer — qualité variable.',
    lignes: [
      { id: 'l1', description: 'Détecteur de fumée 230V',            quantite: 20, unite: 'pièce', prixUnitaireHT:  75_000, tvaRate: 19.25, montantHT: 1_500_000 },
      { id: 'l2', description: 'Centrale incendie 8 zones',          quantite:  1, unite: 'pièce', prixUnitaireHT: 679_540, tvaRate: 19.25, montantHT:   679_540 },
    ],
  },
  {
    id: 'FAA-0006', commande: 'ACH-0033', fournisseur: 'Ebobolo SARL', agence: 'Agence Douala — Akwa',
    date: '2026-04-24', echeance: '2026-05-24', montantHT: 2_346_500, tva: 19.25, montantTTC: 2_800_000, statut: 'Validée',
    notes: '',
    lignes: [
      { id: 'l1', description: 'Groupe électrogène 10 kVA',          quantite: 1, unite: 'pièce',   prixUnitaireHT: 1_900_000, tvaRate: 19.25, montantHT: 1_900_000 },
      { id: 'l2', description: 'Kit démarrage et câblage',           quantite: 1, unite: 'forfait', prixUnitaireHT:   446_500, tvaRate: 19.25, montantHT:   446_500 },
    ],
  },
  {
    id: 'FAA-0005', commande: 'ACH-0030', fournisseur: 'Intertrans Cm', agence: 'Agence Douala — Akwa',
    date: '2026-04-20', echeance: '2026-05-05', montantHT: 2_766_246, tva: 19.25, montantTTC: 3_300_000, statut: 'En retard',
    notes: 'Relance envoyée le 08/05/2026.',
    lignes: [
      { id: 'l1', description: 'Palettes Europe 120×80 cm',          quantite: 50, unite: 'pièce',   prixUnitaireHT:  25_000, tvaRate: 19.25, montantHT: 1_250_000 },
      { id: 'l2', description: 'Film étirable industriel (500 m)',   quantite: 10, unite: 'rouleau', prixUnitaireHT:  85_000, tvaRate: 19.25, montantHT:   850_000 },
      { id: 'l3', description: 'Frais de transport',                 quantite:  1, unite: 'forfait', prixUnitaireHT: 666_246, tvaRate:     0, montantHT:   666_246 },
    ],
  },
  {
    id: 'FAA-0004', commande: 'ACH-0032', fournisseur: 'Africa Tech Supply', agence: 'Siège',
    date: '2026-04-23', echeance: '2026-05-23', montantHT: 7_717_908, tva: 19.25, montantTTC: 9_200_000, statut: 'À valider',
    notes: 'En attente de validation par la direction financière.',
    lignes: [
      { id: 'l1', description: 'Onduleur 3 kVA Online',              quantite:  4, unite: 'pièce', prixUnitaireHT: 1_500_000, tvaRate: 19.25, montantHT: 6_000_000 },
      { id: 'l2', description: 'Batterie 12V 100Ah AGM',             quantite: 16, unite: 'pièce', prixUnitaireHT:   107_369, tvaRate: 19.25, montantHT: 1_717_908 },
    ],
  },
  {
    id: 'FAA-0003', commande: 'ACH-0018', fournisseur: 'Supplies Pro', agence: 'Siège',
    date: '2026-04-23', echeance: '2026-05-23', montantHT: 654_006, tva: 19.25, montantTTC: 780_000, statut: 'Validée',
    notes: '',
    lignes: [
      { id: 'l1', description: 'Cartouches imprimante HP 305XL (noir)', quantite: 20, unite: 'pièce',   prixUnitaireHT:  15_000, tvaRate: 19.25, montantHT: 300_000 },
      { id: 'l2', description: 'Ramette papier A4 80g (500 feuilles)', quantite: 30, unite: 'ramette',  prixUnitaireHT:   8_500, tvaRate: 19.25, montantHT: 255_000 },
      { id: 'l3', description: 'Stylos et fournitures bureau',          quantite:  1, unite: 'forfait',  prixUnitaireHT:  99_006, tvaRate: 19.25, montantHT:  99_006 },
    ],
  },
  {
    id: 'FAA-0002', commande: 'ACH-0016', fournisseur: 'Distrib Central', agence: 'Agence Douala — Akwa',
    date: '2026-04-18', echeance: '2026-04-25', montantHT: 352_160, tva: 19.25, montantTTC: 420_000, statut: 'En retard',
    notes: 'Litige en cours — marchandises reçues endommagées.',
    lignes: [
      { id: 'l1', description: 'Écran LCD 24" Full HD',              quantite: 2, unite: 'pièce', prixUnitaireHT: 176_080, tvaRate: 19.25, montantHT: 352_160 },
    ],
  },
  {
    id: 'FAA-0001', commande: 'ACH-0014', fournisseur: 'Import Express', agence: 'Siège',
    date: '2026-04-10', echeance: '2026-05-10', montantHT: 163_556, tva: 19.25, montantTTC: 195_000, statut: 'Annulée',
    notes: 'Facture annulée suite à litige sur quantité reçue.',
    lignes: [
      { id: 'l1', description: 'Disque dur SSD 1 To',                quantite:  5, unite: 'pièce', prixUnitaireHT: 28_000, tvaRate: 19.25, montantHT: 140_000 },
      { id: 'l2', description: 'Clé USB 64 Go — USB 3.0',            quantite: 10, unite: 'pièce', prixUnitaireHT:  2_356, tvaRate: 19.25, montantHT:  23_556 },
    ],
  },
]

// ── Données canoniques — articles ────────────────────────────────────────────

const INIT_ARTICLES: Article[] = [
  { id: 'ART-001', reference: 'PF-0011', nom: 'Groupe électrogène 10 kVA',     categorie: 'Produit fini',    unite: 'pièce',   prixVenteHT: 2_800_000, prixAchatHT: 1_900_000, stock: 8,   stockMin: 3,  agence: 'Siège',                       description: 'Groupe électrogène diesel 10 kVA monophasé',        actif: true,  createdAt: '2025-01-10' },
  { id: 'ART-002', reference: 'PF-0012', nom: 'Pompe submersible 2"',           categorie: 'Produit fini',    unite: 'pièce',   prixVenteHT:   420_000, prixAchatHT:   280_000, stock: 15,  stockMin: 5,  agence: 'Siège',                       description: 'Pompe submersible inox 2 pouces 750W',              actif: true,  createdAt: '2025-01-10' },
  { id: 'ART-003', reference: 'MP-0021', nom: 'Ciment CPA 42.5 (sac 50 kg)',   categorie: 'Matière première', unite: 'pièce',   prixVenteHT:     7_500, prixAchatHT:     5_800, stock: 500, stockMin: 100, agence: 'Siège',                      description: 'Ciment Portland artificiel 42.5 MPa',               actif: true,  createdAt: '2025-02-01' },
  { id: 'ART-004', reference: 'MP-0022', nom: 'Fer à béton ø12 (barre 12 m)',  categorie: 'Matière première', unite: 'pièce',   prixVenteHT:    18_000, prixAchatHT:    13_500, stock: 200, stockMin: 50,  agence: 'Siège',                      description: 'Barre de fer à béton diamètre 12 mm longueur 12 m', actif: true,  createdAt: '2025-02-01' },
  { id: 'ART-005', reference: 'SV-0031', nom: 'Maintenance préventive annuelle', categorie: 'Service',        unite: 'forfait', prixVenteHT:   350_000, prixAchatHT:         0, stock: 0,   stockMin: 0,  agence: 'Siège',                       description: 'Contrat maintenance préventive matériel industriel', actif: true,  createdAt: '2025-03-15' },
  { id: 'ART-006', reference: 'SV-0032', nom: 'Prestation installation électrique', categorie: 'Service',    unite: 'heure',   prixVenteHT:    25_000, prixAchatHT:         0, stock: 0,   stockMin: 0,  agence: 'Siège',                       description: 'Main d\'œuvre installation et câblage électrique',  actif: true,  createdAt: '2025-03-15' },
  { id: 'ART-007', reference: 'CS-0041', nom: 'Huile moteur 15W40 (bidon 5L)',  categorie: 'Consommable',    unite: 'pièce',   prixVenteHT:    14_000, prixAchatHT:     9_500, stock: 2,   stockMin: 10, agence: 'Agence Douala — Akwa',        description: 'Huile moteur minérale 15W40 bidon 5 litres',        actif: true,  createdAt: '2025-04-01' },
  { id: 'ART-008', reference: 'CS-0042', nom: 'Filtre à air universel',         categorie: 'Consommable',    unite: 'pièce',   prixVenteHT:     8_500, prixAchatHT:     5_200, stock: 25,  stockMin: 10, agence: 'Agence Douala — Akwa',        description: 'Filtre à air universel pour moteurs thermiques',    actif: true,  createdAt: '2025-04-01' },
  { id: 'ART-009', reference: 'EQ-0051', nom: 'Chariot élévateur 2T',           categorie: 'Équipement',     unite: 'pièce',   prixVenteHT: 8_500_000, prixAchatHT: 6_200_000, stock: 2,   stockMin: 1,  agence: 'Agence Douala — Akwa',        description: 'Chariot élévateur électrique 2 tonnes 4,5 m',      actif: true,  createdAt: '2025-05-20' },
  { id: 'ART-010', reference: 'CS-0043', nom: 'Câble électrique H07V-K 2.5mm²', categorie: 'Consommable',   unite: 'm²',      prixVenteHT:       650, prixAchatHT:       420, stock: 0,   stockMin: 50, agence: 'Succursale Yaoundé — Centre', description: 'Câble souple cuivre 2.5mm² gaine rouge',            actif: true,  createdAt: '2025-06-10' },
  { id: 'ART-011', reference: 'MP-0023', nom: 'Sable de rivière (m³)',          categorie: 'Matière première', unite: 'm²',    prixVenteHT:    22_000, prixAchatHT:    14_000, stock: 80,  stockMin: 20, agence: 'Succursale Yaoundé — Centre', description: 'Sable de rivière lavé pour béton et maçonnerie',    actif: true,  createdAt: '2025-07-01' },
  { id: 'ART-012', reference: 'PF-0013', nom: 'Climatiseur split 12 000 BTU',   categorie: 'Produit fini',    unite: 'pièce',  prixVenteHT:   480_000, prixAchatHT:   320_000, stock: 6,   stockMin: 2,  agence: 'Succursale Yaoundé — Centre', description: 'Climatiseur inverter 12 000 BTU R32',               actif: false, createdAt: '2025-08-15' },
]

const INIT_MOUVEMENTS_STOCK: MouvementStock[] = [
  // Entrées liées aux réceptions
  { id: 'MVT-020', articleId: 'ART-001', articleNom: 'Groupe électrogène 10 kVA',      type: 'Entrée',     quantite:  3, reference: 'BR-0010', agence: 'Siège',                       date: '2026-04-25', notes: 'Réception ACH-0034' },
  { id: 'MVT-019', articleId: 'ART-003', articleNom: 'Ciment CPA 42.5 (sac 50 kg)',    type: 'Entrée',     quantite: 200, reference: 'BR-0008', agence: 'Siège',                      date: '2026-04-24', notes: 'Réception ACH-0017' },
  { id: 'MVT-018', articleId: 'ART-004', articleNom: 'Fer à béton ø12 (barre 12 m)',   type: 'Entrée',     quantite:  80, reference: 'BR-0008', agence: 'Siège',                      date: '2026-04-24', notes: 'Réception ACH-0017' },
  { id: 'MVT-017', articleId: 'ART-009', articleNom: 'Chariot élévateur 2T',            type: 'Entrée',     quantite:  1, reference: 'BR-0009', agence: 'Succursale Yaoundé — Centre', date: '2026-04-22', notes: 'Réception ACH-0031' },
  { id: 'MVT-016', articleId: 'ART-002', articleNom: 'Pompe submersible 2"',             type: 'Entrée',     quantite: 10, reference: 'BR-0007', agence: 'Siège',                      date: '2026-04-19', notes: 'Réception ACH-0015' },
  { id: 'MVT-015', articleId: 'ART-008', articleNom: 'Filtre à air universel',           type: 'Entrée',     quantite: 30, reference: 'BR-0007', agence: 'Siège',                      date: '2026-04-19', notes: 'Réception ACH-0015' },
  { id: 'MVT-014', articleId: 'ART-007', articleNom: 'Huile moteur 15W40 (bidon 5L)',   type: 'Entrée',     quantite: 15, reference: 'BR-0003', agence: 'Siège',                      date: '2026-04-23', notes: 'Réception partielle ACH-0018' },
  // Sorties liées aux livraisons
  { id: 'MVT-013', articleId: 'ART-002', articleNom: 'Pompe submersible 2"',             type: 'Sortie',     quantite: -5, reference: 'BL-0008', agence: 'Agence Douala — Akwa',       date: '2026-04-28', notes: 'Livraison CMD-0050' },
  { id: 'MVT-012', articleId: 'ART-003', articleNom: 'Ciment CPA 42.5 (sac 50 kg)',    type: 'Sortie',     quantite: -120, reference: 'BL-0007', agence: 'Agence Douala — Akwa',      date: '2026-04-26', notes: 'Livraison CMD-0047' },
  { id: 'MVT-011', articleId: 'ART-004', articleNom: 'Fer à béton ø12 (barre 12 m)',   type: 'Sortie',     quantite: -38, reference: 'BL-0007', agence: 'Agence Douala — Akwa',       date: '2026-04-26', notes: 'Livraison CMD-0047' },
  { id: 'MVT-010', articleId: 'ART-001', articleNom: 'Groupe électrogène 10 kVA',      type: 'Sortie',     quantite: -1, reference: 'BL-0006', agence: 'Agence Douala — Akwa',        date: '2026-04-25', notes: 'Livraison CMD-0040' },
  { id: 'MVT-009', articleId: 'ART-010', articleNom: 'Câble électrique H07V-K 2.5mm²', type: 'Sortie',     quantite: -500, reference: 'BL-0005', agence: 'Succursale Yaoundé — Centre', date: '2026-04-22', notes: 'Livraison CMD-0038' },
  { id: 'MVT-008', articleId: 'ART-011', articleNom: 'Sable de rivière (m³)',           type: 'Sortie',     quantite: -80, reference: 'BL-0002', agence: 'Succursale Yaoundé — Centre', date: '2026-04-22', notes: 'Livraison CMD-0048' },
  // Ajustements manuels
  { id: 'MVT-007', articleId: 'ART-007', articleNom: 'Huile moteur 15W40 (bidon 5L)',   type: 'Ajustement', quantite: -13, reference: 'INV-2026-04', agence: 'Agence Douala — Akwa',   date: '2026-04-20', notes: 'Inventaire — écart constaté' },
  { id: 'MVT-006', articleId: 'ART-010', articleNom: 'Câble électrique H07V-K 2.5mm²', type: 'Ajustement', quantite: -50, reference: 'INV-2026-04', agence: 'Succursale Yaoundé — Centre', date: '2026-04-20', notes: 'Inventaire — stock consommé chantier' },
  { id: 'MVT-005', articleId: 'ART-012', articleNom: 'Climatiseur split 12 000 BTU',    type: 'Entrée',     quantite:  6, reference: 'BR-0001', agence: 'Succursale Yaoundé — Centre', date: '2026-04-15', notes: 'Réception initiale' },
  { id: 'MVT-004', articleId: 'ART-009', articleNom: 'Chariot élévateur 2T',            type: 'Entrée',     quantite:  2, reference: 'BR-0001', agence: 'Agence Douala — Akwa',        date: '2026-04-12', notes: 'Stock initial magasin' },
  { id: 'MVT-003', articleId: 'ART-008', articleNom: 'Filtre à air universel',           type: 'Sortie',     quantite: -20, reference: 'BL-0001', agence: 'Agence Douala — Akwa',       date: '2026-04-16', notes: 'Retour client CMD-0037 annulée' },
  { id: 'MVT-002', articleId: 'ART-007', articleNom: 'Huile moteur 15W40 (bidon 5L)',   type: 'Sortie',     quantite: -21, reference: 'BL-0001', agence: 'Agence Douala — Akwa',        date: '2026-04-16', notes: 'Retour client CMD-0037 annulée' },
  { id: 'MVT-001', articleId: 'ART-011', articleNom: 'Sable de rivière (m³)',           type: 'Entrée',     quantite: 160, reference: 'BR-0007', agence: 'Succursale Yaoundé — Centre', date: '2026-04-10', notes: 'Stock initial' },
]

const INIT_BONS_RECEPTION: BonReception[] = [
  {
    id: 'BR-0010', commande: 'ACH-0034', fournisseur: 'Import Express', agence: 'Siège',
    dateCreation: '2026-04-22', datePrevue: '2026-04-25', dateReception: '2026-04-25', statut: 'Reçu',
    notes: '', conditionsLivraison: 'Franco de port',
    lignes: [
      { id: 'l1', reference: 'IMP-001', designation: 'Pompe immergée 2" — 750W', quantite: 5, quantiteRecue: 5, unite: 'pièce' },
      { id: 'l2', reference: 'IMP-002', designation: 'Câbles électriques H07 2.5 mm²', quantite: 200, quantiteRecue: 200, unite: 'm' },
    ],
  },
  {
    id: 'BR-0009', commande: 'ACH-0031', fournisseur: 'Manutention Pro', agence: 'Succursale Yaoundé — Centre',
    dateCreation: '2026-04-20', datePrevue: '2026-04-22', dateReception: '2026-04-22', statut: 'Reçu',
    notes: 'Palette sécurisée, emballage intact.', conditionsLivraison: 'Livraison à domicile',
    lignes: [
      { id: 'l1', reference: 'MAN-010', designation: 'Transpalette manuel 2,5 T', quantite: 2, quantiteRecue: 2, unite: 'pièce' },
      { id: 'l2', reference: 'MAN-011', designation: 'Sangles de sécurité 5 m', quantite: 10, quantiteRecue: 10, unite: 'pièce' },
    ],
  },
  {
    id: 'BR-0008', commande: 'ACH-0017', fournisseur: 'Tech Matériaux', agence: 'Siège',
    dateCreation: '2026-04-18', datePrevue: '2026-04-24', dateReception: '2026-04-24', statut: 'Reçu',
    notes: '', conditionsLivraison: '',
    lignes: [
      { id: 'l1', reference: 'TM-045', designation: 'Ciment CPA 42.5 (sac 50 kg)', quantite: 300, quantiteRecue: 300, unite: 'sac' },
      { id: 'l2', reference: 'TM-046', designation: 'Fer à béton ø10 (barre 12 m)', quantite: 120, quantiteRecue: 120, unite: 'barre' },
      { id: 'l3', reference: 'TM-047', designation: 'Sable de rivière (m³)', quantite: 40, quantiteRecue: 40, unite: 'm³' },
    ],
  },
  {
    id: 'BR-0007', commande: 'ACH-0015', fournisseur: 'Fournisseur XYZ', agence: 'Siège',
    dateCreation: '2026-04-12', datePrevue: '2026-04-19', dateReception: '2026-04-19', statut: 'Reçu',
    notes: '', conditionsLivraison: 'Ex-works',
    lignes: [
      { id: 'l1', reference: 'XYZ-088', designation: 'Détecteur de fumée 230V', quantite: 20, quantiteRecue: 20, unite: 'pièce' },
    ],
  },
  {
    id: 'BR-0006', commande: 'ACH-0033', fournisseur: 'Ebobolo SARL', agence: 'Agence Douala — Akwa',
    dateCreation: '2026-04-24', datePrevue: '2026-04-30', dateReception: null, statut: 'Attendu',
    notes: 'Confirmer arrivée au port avant livraison.', conditionsLivraison: 'CIF Douala',
    lignes: [
      { id: 'l1', reference: 'EBO-012', designation: 'Groupe électrogène 10 kVA', quantite: 1, quantiteRecue: 0, unite: 'pièce' },
      { id: 'l2', reference: 'EBO-013', designation: 'Kit démarrage et câblage', quantite: 1, quantiteRecue: 0, unite: 'forfait' },
    ],
  },
  {
    id: 'BR-0005', commande: 'ACH-0030', fournisseur: 'Intertrans Cm', agence: 'Agence Douala — Akwa',
    dateCreation: '2026-04-20', datePrevue: '2026-04-28', dateReception: null, statut: 'Attendu',
    notes: '', conditionsLivraison: '',
    lignes: [
      { id: 'l1', reference: 'INT-200', designation: 'Palettes Europe 120×80 cm', quantite: 50, quantiteRecue: 0, unite: 'pièce' },
      { id: 'l2', reference: 'INT-201', designation: 'Film étirable industriel (rouleau 500 m)', quantite: 10, quantiteRecue: 0, unite: 'rouleau' },
    ],
  },
  {
    id: 'BR-0004', commande: 'ACH-0032', fournisseur: 'Africa Tech Supply', agence: 'Siège',
    dateCreation: '2026-04-23', datePrevue: '2026-05-10', dateReception: null, statut: 'Attendu',
    notes: 'Commande en cours de fabrication chez le fournisseur.', conditionsLivraison: 'DDP Douala',
    lignes: [
      { id: 'l1', reference: 'ATS-330', designation: 'Onduleur 3 kVA Online', quantite: 4, quantiteRecue: 0, unite: 'pièce' },
      { id: 'l2', reference: 'ATS-331', designation: 'Batterie 12V 100Ah AGM', quantite: 16, quantiteRecue: 0, unite: 'pièce' },
    ],
  },
  {
    id: 'BR-0003', commande: 'ACH-0018', fournisseur: 'Supplies Pro', agence: 'Siège',
    dateCreation: '2026-04-23', datePrevue: '2026-04-28', dateReception: null, statut: 'Reçu partiel',
    notes: '10 articles en rupture — relance fournisseur le 25/04.', conditionsLivraison: 'Franco de port',
    lignes: [
      { id: 'l1', reference: 'SUP-055', designation: 'Cartouches imprimante HP 305XL (noir)', quantite: 20, quantiteRecue: 12, unite: 'pièce' },
      { id: 'l2', reference: 'SUP-056', designation: 'Ramette papier A4 80g (500 feuilles)', quantite: 30, quantiteRecue: 18, unite: 'ramette' },
    ],
  },
  {
    id: 'BR-0002', commande: 'ACH-0016', fournisseur: 'Distrib Central', agence: 'Agence Douala — Akwa',
    dateCreation: '2026-04-16', datePrevue: '2026-05-05', dateReception: null, statut: 'Litige',
    notes: 'Marchandises reçues endommagées — photos transmises au fournisseur.', conditionsLivraison: 'Livraison à domicile',
    lignes: [
      { id: 'l1', reference: 'DC-011', designation: 'Écrans LCD 24" Full HD', quantite: 10, quantiteRecue: 10, unite: 'pièce' },
    ],
  },
  {
    id: 'BR-0001', commande: 'ACH-0014', fournisseur: 'Import Express', agence: 'Siège',
    dateCreation: '2026-04-08', datePrevue: '2026-04-15', dateReception: null, statut: 'Litige',
    notes: 'Quantité reçue inférieure à la commande — litige ouvert le 16/04.', conditionsLivraison: 'CIF Douala',
    lignes: [
      { id: 'l1', reference: 'IMP-099', designation: 'Disques durs SSD 1 To', quantite: 20, quantiteRecue: 14, unite: 'pièce' },
      { id: 'l2', reference: 'IMP-100', designation: 'Clés USB 64 Go — USB 3.0', quantite: 50, quantiteRecue: 50, unite: 'pièce' },
    ],
  },
]

// ── Données canoniques — ventes récurrentes ───────────────────────────────────

const INIT_VENTES_RECURRENTES: VenteRecurrente[] = [
  {
    id: 'VR-0003', client: 'ACME Corp', agence: 'Siège',
    description: 'Contrat maintenance préventive annuelle',
    montantHT: 1_050_000, tvaRate: 19.25, montantTTC: 1_252_125,
    frequence: 'mensuel', dateDebut: '2026-01-01', dateFin: null,
    prochaineEcheance: '2026-05-01', statut: 'Actif',
    lignes: [
      { id: 'l1', description: 'Maintenance préventive équipements', quantite: 1, unite: 'forfait', prixUnitaireHT: 1_050_000, tvaRate: 19.25, montantHT: 1_050_000 },
    ],
    conditionsPaiement: 'Paiement à 30 jours',
    notes: 'Contrat cadre — renouvellement automatique',
    facturesGenerees: 4,
  },
  {
    id: 'VR-0002', client: 'Groupe Delta', agence: 'Siège',
    description: 'Abonnement logiciel de gestion',
    montantHT: 350_000, tvaRate: 19.25, montantTTC: 417_375,
    frequence: 'trimestriel', dateDebut: '2025-10-01', dateFin: '2026-09-30',
    prochaineEcheance: '2026-07-01', statut: 'Actif',
    lignes: [
      { id: 'l1', description: 'Licence logiciel ERP (trimestre)', quantite: 1, unite: 'forfait', prixUnitaireHT: 350_000, tvaRate: 19.25, montantHT: 350_000 },
    ],
    conditionsPaiement: 'Paiement comptant',
    notes: '',
    facturesGenerees: 2,
  },
  {
    id: 'VR-0001', client: 'TechX Sarl', agence: 'Agence Douala — Akwa',
    description: 'Contrat de support technique',
    montantHT: 200_000, tvaRate: 19.25, montantTTC: 238_500,
    frequence: 'mensuel', dateDebut: '2025-06-01', dateFin: null,
    prochaineEcheance: '2026-05-01', statut: 'En pause',
    lignes: [
      { id: 'l1', description: 'Support technique mensuel', quantite: 1, unite: 'forfait', prixUnitaireHT: 200_000, tvaRate: 19.25, montantHT: 200_000 },
    ],
    conditionsPaiement: 'Paiement à 15 jours',
    notes: 'En pause — client en attente de régularisation',
    facturesGenerees: 10,
  },
]

// ── Context ───────────────────────────────────────────────────────────────────

interface GestionContextValue {
  commandes:      Commande[]
  achats:         Achat[]
  clients:        Client[]
  fournisseurs:   Fournisseur[]
  articles:       Article[]
  categoriesArticles: string[]
  addCategorieArticle(nom: string): void
  comptesTiers:   CompteTiers[]
  facturesVentes:      FactureVente[]
  ventesRecurrentes:   VenteRecurrente[]
  addVenteRecurrente(v: Omit<VenteRecurrente, 'id' | 'facturesGenerees'>): VenteRecurrente
  updateVenteRecurrente(id: string, patch: Partial<Omit<VenteRecurrente, 'id'>>): void
  updateVenteRecurrenteStatut(id: string, statut: VenteRecurrenteStatut): void
  bonsLivraison:    BonLivraison[]
  retoursClients:   RetourClient[]
  facturesAchats:   FactureAchat[]
  bonsReception:    BonReception[]
  mouvementsStock:  MouvementStock[]
  addMouvementStock(m: Omit<MouvementStock, 'id'>): MouvementStock
  addBonLivraison(b: Omit<BonLivraison, 'id'>): BonLivraison
  addRetourClient(r: Omit<RetourClient, 'id'>): RetourClient
  addFactureAchat(f: Omit<FactureAchat, 'id'>): FactureAchat
  addBonReception(b: Omit<BonReception, 'id'>): BonReception
  addArticle(a: Omit<Article, 'id' | 'createdAt'>): Article
  updateArticle(id: string, patch: Partial<Omit<Article, 'id' | 'createdAt'>>): void
  deleteArticle(id: string): void
  addCommande(c: Omit<Commande, 'id'>): Commande
  addAchat(a: Omit<Achat, 'id'>): Achat
  addFactureVente(f: Omit<FactureVente, 'id'>): FactureVente
  addClient(c: Omit<Client, 'id' | 'createdAt'>): Client
  updateClient(id: string, patch: Partial<Omit<Client, 'id' | 'createdAt'>>): void
  deleteClient(id: string): void
  addFournisseur(f: Omit<Fournisseur, 'id' | 'createdAt'>): Fournisseur
  updateFournisseur(id: string, patch: Partial<Omit<Fournisseur, 'id' | 'createdAt'>>): void
  deleteFournisseur(id: string): void
  updateCommandeStatut(id: string, statut: CommandeStatut): void
  updateAchatStatut(id: string, statut: AchatStatut): void
  updateFactureVenteStatut(id: string, statut: FactureVenteStatut): void
  updateBLStatut(id: string, statut: BLStatut): void
  updateRetourStatut(id: string, statut: RetourStatut): void
  updateFactureAchatStatut(id: string, statut: FactureAchatStatut): void
  updateBRStatut(id: string, statut: BRStatut): void
  updateBonReception(id: string, patch: Partial<Omit<BonReception, 'id'>>): void
  deleteBonReception(id: string): void
  updateAchat(id: string, patch: Partial<Omit<Achat, 'id'>>): void
  deleteAchat(id: string): void
  updateFactureAchat(id: string, patch: Partial<Omit<FactureAchat, 'id'>>): void
  deleteFactureAchat(id: string): void
}

const GestionContext = createContext<GestionContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function GestionProvider({ children }: { children: ReactNode }) {
  const [commandes,      setCommandes]      = useState<Commande[]>(INIT_COMMANDES)
  const [achats,         setAchats]         = useState<Achat[]>(INIT_ACHATS)
  // Clients & fournisseurs : comptes comptables persistés en localStorage
  // Utiliser la forme fonctionnelle de useState pour ne lire localStorage qu'une seule fois
  const [clients,        setClients]        = useState<Client[]>(() => applyComptes(INIT_CLIENTS, loadComptesFromLS()))
  const [fournisseurs,   setFournisseurs]   = useState<Fournisseur[]>(() => applyComptes(INIT_FOURNISSEURS, loadComptesFromLS()))
  const [articles,       setArticles]       = useState<Article[]>(INIT_ARTICLES)
  // ── Auto-génération des factures récurrentes au premier chargement ───────────
  // Utilise l'initialiseur lazy de useState : s'exécute une seule fois, sans
  // useEffect, ce qui évite les problèmes avec StrictMode / HMR.
  const [facturesVentes, setFacturesVentes] = useState<FactureVente[]>(() => {
    const todayStr  = new Date().toISOString().slice(0, 10)
    const autoList: FactureVente[] = []
    let nextNum = parseInt(
      (INIT_FACTURES_VENTES[0]?.id ?? 'FAV-0000').replace('FAV-', ''), 10
    )
    INIT_VENTES_RECURRENTES.forEach(vr => {
      if (vr.statut !== 'Actif') return
      let echeance = vr.prochaineEcheance
      while (echeance <= todayStr) {
        if (vr.dateFin && echeance > vr.dateFin) break
        nextNum++
        autoList.push({
          id:                 `FAV-${String(nextNum).padStart(4, '0')}`,
          modele:             'standard',
          commande:           '',
          client:             vr.client,
          agence:             vr.agence,
          date:               echeance,
          echeance:           addMonthsISO(echeance, 1),
          montantHT:          vr.montantHT,
          tva:                vr.tvaRate,
          montantTTC:         vr.montantTTC,
          statut:             'Envoyée',
          lignes:             vr.lignes,
          notes:              `Facture récurrente — ${vr.description}`,
          conditionsPaiement: vr.conditionsPaiement,
        })
        echeance = addMonthsISO(echeance, FREQ_MOIS_INIT[vr.frequence] ?? 1)
      }
    })
    // Ordre : plus récent en premier — puis factures initiales
    return [...autoList.reverse(), ...INIT_FACTURES_VENTES]
  })

  const [ventesRecurrentes, setVentesRecurrentes] = useState<VenteRecurrente[]>(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    return INIT_VENTES_RECURRENTES.map(vr => {
      if (vr.statut !== 'Actif') return vr
      let echeance = vr.prochaineEcheance
      let count    = 0
      while (echeance <= todayStr) {
        if (vr.dateFin && echeance > vr.dateFin) break
        echeance = addMonthsISO(echeance, FREQ_MOIS_INIT[vr.frequence] ?? 1)
        count++
      }
      return count > 0
        ? { ...vr, prochaineEcheance: echeance, facturesGenerees: vr.facturesGenerees + count }
        : vr
    })
  })
  const [bonsLivraison,  setBonsLivraison]  = useState<BonLivraison[]>(INIT_BONS_LIVRAISON)
  const [retoursClients, setRetoursClients] = useState<RetourClient[]>(INIT_RETOURS_CLIENTS)
  const [facturesAchats, setFacturesAchats] = useState<FactureAchat[]>(INIT_FACTURES_ACHATS)
  const [bonsReception,       setBonsReception]       = useState<BonReception[]>(INIT_BONS_RECEPTION)
  const [mouvementsStock,     setMouvementsStock]     = useState<MouvementStock[]>(INIT_MOUVEMENTS_STOCK)
  const [categoriesArticles,  setCategoriesArticles]  = useState<string[]>(DEFAULT_CATEGORIES)

  function addCategorieArticle(nom: string) {
    const n = nom.trim()
    if (!n || categoriesArticles.includes(n)) return
    setCategoriesArticles(prev => [...prev, n])
  }

  // Comptes tiers dérivés des clients et fournisseurs ayant un compte renseigné
  const comptesTiers = useMemo((): CompteTiers[] => [
    ...clients
      .filter(c => c.compte?.trim())
      .map(c => ({ id: c.id, numero: c.compte!, intitule: c.nom, type: 'client'  as const, agence: c.agence })),
    ...fournisseurs
      .filter(f => f.compte?.trim())
      .map(f => ({ id: f.id, numero: f.compte!, intitule: f.nom, type: 'fournisseur' as const, agence: f.agence })),
  ], [clients, fournisseurs])

  function addBonLivraison(b: Omit<BonLivraison, 'id'>): BonLivraison {
    const last = bonsLivraison[0]?.id ?? 'BL-0000'
    const num  = parseInt(last.replace('BL-', ''), 10) + 1
    const id   = `BL-${String(num).padStart(4, '0')}`
    const next: BonLivraison = { id, ...b }
    setBonsLivraison(prev => [next, ...prev])
    return next
  }

  function addRetourClient(r: Omit<RetourClient, 'id'>): RetourClient {
    const last = retoursClients[0]?.id ?? 'RET-0000'
    const num  = parseInt(last.replace('RET-', ''), 10) + 1
    const id   = `RET-${String(num).padStart(4, '0')}`
    const next: RetourClient = { id, ...r }
    setRetoursClients(prev => [next, ...prev])
    return next
  }

  function addFactureAchat(f: Omit<FactureAchat, 'id'>): FactureAchat {
    const last = facturesAchats[0]?.id ?? 'FAA-0000'
    const num  = parseInt(last.replace('FAA-', ''), 10) + 1
    const id   = `FAA-${String(num).padStart(4, '0')}`
    const next: FactureAchat = { id, ...f }
    setFacturesAchats(prev => [next, ...prev])
    return next
  }

  function addBonReception(b: Omit<BonReception, 'id'>): BonReception {
    const last = bonsReception[0]?.id ?? 'BR-0000'
    const num  = parseInt(last.replace('BR-', ''), 10) + 1
    const id   = `BR-${String(num).padStart(4, '0')}`
    const next: BonReception = { id, ...b }
    setBonsReception(prev => [next, ...prev])
    return next
  }

  function addMouvementStock(m: Omit<MouvementStock, 'id'>): MouvementStock {
    const last = mouvementsStock[0]?.id ?? 'MVT-000'
    const num  = parseInt(last.replace('MVT-', ''), 10) + 1
    const id   = `MVT-${String(num).padStart(3, '0')}`
    const next: MouvementStock = { id, ...m }
    setMouvementsStock(prev => [next, ...prev])
    // Met à jour le stock de l'article correspondant
    setArticles(prev => prev.map(a =>
      a.id === m.articleId ? { ...a, stock: Math.max(0, a.stock + m.quantite) } : a
    ))
    return next
  }

  function addArticle(a: Omit<Article, 'id' | 'createdAt'>): Article {
    const num  = articles.length + 1
    const id   = `ART-${String(num).padStart(3, '0')}`
    const next: Article = { id, ...a, createdAt: new Date().toISOString().slice(0, 10) }
    setArticles(prev => [next, ...prev])
    return next
  }

  function updateArticle(id: string, patch: Partial<Omit<Article, 'id' | 'createdAt'>>) {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
  }

  function deleteArticle(id: string) {
    setArticles(prev => prev.filter(a => a.id !== id))
  }

  function addCommande(c: Omit<Commande, 'id'>): Commande {
    const last = commandes[0]?.id ?? 'CMD-0000'
    const num  = parseInt(last.replace('CMD-', ''), 10) + 1
    const id   = `CMD-${String(num).padStart(4, '0')}`
    const next: Commande = { id, ...c }
    setCommandes(prev => [next, ...prev])
    return next
  }

  function addAchat(a: Omit<Achat, 'id'>): Achat {
    const last = achats[0]?.id ?? 'ACH-0000'
    const num  = parseInt(last.replace('ACH-', ''), 10) + 1
    const id   = `ACH-${String(num).padStart(4, '0')}`
    const next: Achat = { id, ...a }
    setAchats(prev => [next, ...prev])
    return next
  }

  function addFactureVente(f: Omit<FactureVente, 'id'>): FactureVente {
    const last = facturesVentes[0]?.id ?? 'FAV-0000'
    const num  = parseInt(last.replace('FAV-', ''), 10) + 1
    const id   = `FAV-${String(num).padStart(4, '0')}`
    const next: FactureVente = { id, ...f }
    setFacturesVentes(prev => [next, ...prev])
    return next
  }

  function addVenteRecurrente(v: Omit<VenteRecurrente, 'id' | 'facturesGenerees'>): VenteRecurrente {
    const last = ventesRecurrentes[0]?.id ?? 'VR-0000'
    const num  = parseInt(last.replace('VR-', ''), 10) + 1
    const id   = `VR-${String(num).padStart(4, '0')}`
    const next: VenteRecurrente = { id, ...v, facturesGenerees: 0 }
    setVentesRecurrentes(prev => [next, ...prev])
    return next
  }

  function updateVenteRecurrente(id: string, patch: Partial<Omit<VenteRecurrente, 'id'>>) {
    setVentesRecurrentes(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v))
  }

  function updateVenteRecurrenteStatut(id: string, statut: VenteRecurrenteStatut) {
    setVentesRecurrentes(prev => prev.map(v => v.id === id ? { ...v, statut } : v))
  }

  function addClient(c: Omit<Client, 'id' | 'createdAt'>): Client {
    const num  = clients.length + 1
    const id   = `CLI-${String(num).padStart(3, '0')}`
    const next: Client = { id, ...c, createdAt: new Date().toISOString().slice(0, 10) }
    if (c.compte) saveCompteToLS(id, c.compte)
    setClients(prev => [next, ...prev])
    return next
  }

  function updateClient(id: string, patch: Partial<Omit<Client, 'id' | 'createdAt'>>) {
    if ('compte' in patch) saveCompteToLS(id, patch.compte)
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  function deleteClient(id: string) {
    saveCompteToLS(id, undefined) // supprime de localStorage
    setClients(prev => prev.filter(c => c.id !== id))
  }

  function addFournisseur(f: Omit<Fournisseur, 'id' | 'createdAt'>): Fournisseur {
    const num  = fournisseurs.length + 1
    const id   = `FRN-${String(num).padStart(3, '0')}`
    const next: Fournisseur = { id, ...f, createdAt: new Date().toISOString().slice(0, 10) }
    if (f.compte) saveCompteToLS(id, f.compte)
    setFournisseurs(prev => [next, ...prev])
    return next
  }

  function updateFournisseur(id: string, patch: Partial<Omit<Fournisseur, 'id' | 'createdAt'>>) {
    if ('compte' in patch) saveCompteToLS(id, patch.compte)
    setFournisseurs(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  function deleteFournisseur(id: string) {
    saveCompteToLS(id, undefined) // supprime de localStorage
    setFournisseurs(prev => prev.filter(f => f.id !== id))
  }

  function updateCommandeStatut(id: string, statut: CommandeStatut) {
    setCommandes(prev => prev.map(c => c.id === id ? { ...c, statut } : c))
  }

  function updateAchatStatut(id: string, statut: AchatStatut) {
    setAchats(prev => prev.map(a => a.id === id ? { ...a, statut } : a))
  }

  function updateFactureVenteStatut(id: string, statut: FactureVenteStatut) {
    setFacturesVentes(prev => prev.map(f => f.id === id ? { ...f, statut } : f))
  }

  function updateBLStatut(id: string, statut: BLStatut) {
    setBonsLivraison(prev => prev.map(b => b.id === id ? { ...b, statut } : b))
  }

  function updateRetourStatut(id: string, statut: RetourStatut) {
    setRetoursClients(prev => prev.map(r => r.id === id ? { ...r, statut } : r))
  }

  function updateFactureAchatStatut(id: string, statut: FactureAchatStatut) {
    setFacturesAchats(prev => prev.map(f => f.id === id ? { ...f, statut } : f))
  }

  function updateBRStatut(id: string, statut: BRStatut) {
    setBonsReception(prev => prev.map(b => b.id === id ? { ...b, statut } : b))
  }

  function updateBonReception(id: string, patch: Partial<Omit<BonReception, 'id'>>) {
    setBonsReception(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b))
  }

  function deleteBonReception(id: string) {
    setBonsReception(prev => prev.filter(b => b.id !== id))
  }

  function updateAchat(id: string, patch: Partial<Omit<Achat, 'id'>>) {
    setAchats(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
  }

  function deleteAchat(id: string) {
    setAchats(prev => prev.filter(a => a.id !== id))
  }

  function updateFactureAchat(id: string, patch: Partial<Omit<FactureAchat, 'id'>>) {
    setFacturesAchats(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  function deleteFactureAchat(id: string) {
    setFacturesAchats(prev => prev.filter(f => f.id !== id))
  }

  return (
    <GestionContext.Provider value={{
      commandes, achats, clients, fournisseurs, articles, categoriesArticles, addCategorieArticle, comptesTiers,
      facturesVentes, ventesRecurrentes, addVenteRecurrente, updateVenteRecurrente, updateVenteRecurrenteStatut,
      bonsLivraison, retoursClients, facturesAchats, bonsReception,
      mouvementsStock, addMouvementStock,
      addBonLivraison, addRetourClient, addFactureAchat, addBonReception,
      addArticle, updateArticle, deleteArticle,
      addCommande, addAchat, addFactureVente,
      addClient, updateClient, deleteClient,
      addFournisseur, updateFournisseur, deleteFournisseur,
      updateCommandeStatut, updateAchatStatut,
      updateFactureVenteStatut, updateBLStatut, updateRetourStatut,
      updateFactureAchatStatut, updateBRStatut,
      updateBonReception, deleteBonReception,
      updateAchat, deleteAchat,
      updateFactureAchat, deleteFactureAchat,
    }}>
      {children}
    </GestionContext.Provider>
  )
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGestion(): GestionContextValue {
  const ctx = useContext(GestionContext)
  if (!ctx) throw new Error('useGestion must be used inside <GestionProvider>')
  return ctx
}
