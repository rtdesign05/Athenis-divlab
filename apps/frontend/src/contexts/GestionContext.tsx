import { createContext, useContext, useState, type ReactNode } from 'react'

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

export interface Achat {
  id:          string
  fournisseur: string
  agence:      string
  date:        string        // ISO date
  montant:     number        // XAF
  statut:      AchatStatut
  reception:   string | null // ISO date or null
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
  createdAt:   string  // ISO date
}

// ── Factures ventes ───────────────────────────────────────────────────────────
export type FactureVenteStatut = 'Brouillon' | 'Envoyée' | 'Payée' | 'En retard' | 'Annulée'
export interface FactureVente {
  id:         string
  commande:   string        // ref CMD-xxxx
  client:     string
  agence:     string
  date:       string        // ISO
  echeance:   string        // ISO
  montantHT:  number
  tva:        number        // taux ex: 19.25
  montantTTC: number
  statut:     FactureVenteStatut
}

// ── Bons de livraison ─────────────────────────────────────────────────────────
export type BLStatut = 'En préparation' | 'Expédié' | 'Livré' | 'Retourné'
export interface BonLivraison {
  id:            string
  commande:      string
  client:        string
  agence:        string
  dateCreation:  string
  datePrevue:    string
  dateLivraison: string | null
  statut:        BLStatut
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
}

// ── Bons de réception ─────────────────────────────────────────────────────────
export type BRStatut = 'Attendu' | 'Reçu partiel' | 'Reçu' | 'Litige'
export interface BonReception {
  id:            string
  commande:      string
  fournisseur:   string
  agence:        string
  dateCreation:  string
  datePrevue:    string
  dateReception: string | null
  statut:        BRStatut
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
  { id: 'ACH-0034', fournisseur: 'Import Express',      agence: 'Siège',                       date: '2026-04-25', montant: 5_600_000, statut: 'Reçue',      reception: '2026-04-25' },
  { id: 'ACH-0033', fournisseur: 'Ebobolo SARL',        agence: 'Agence Douala — Akwa',        date: '2026-04-24', montant: 2_800_000, statut: 'En cours',   reception: '2026-04-30' },
  { id: 'ACH-0032', fournisseur: 'Africa Tech Supply',  agence: 'Siège',                       date: '2026-04-23', montant: 9_200_000, statut: 'En attente', reception: '2026-05-10' },
  { id: 'ACH-0031', fournisseur: 'Manutention Pro',     agence: 'Succursale Yaoundé — Centre', date: '2026-04-22', montant: 1_450_000, statut: 'Reçue',      reception: '2026-04-22' },
  { id: 'ACH-0030', fournisseur: 'Intertrans Cm',       agence: 'Agence Douala — Akwa',        date: '2026-04-20', montant: 3_300_000, statut: 'En cours',   reception: '2026-04-28' },
  { id: 'ACH-0018', fournisseur: 'Supplies Pro',        agence: 'Siège',                       date: '2026-04-23', montant:   780_000, statut: 'En cours',   reception: '2026-04-28' },
  { id: 'ACH-0017', fournisseur: 'Tech Matériaux',      agence: 'Siège',                       date: '2026-04-20', montant: 1_350_000, statut: 'Reçue',      reception: '2026-04-24' },
  { id: 'ACH-0016', fournisseur: 'Distrib Central',     agence: 'Agence Douala — Akwa',        date: '2026-04-18', montant:   420_000, statut: 'En attente', reception: '2026-05-05' },
  { id: 'ACH-0015', fournisseur: 'Fournisseur XYZ',     agence: 'Siège',                       date: '2026-04-15', montant: 2_600_000, statut: 'Reçue',      reception: '2026-04-19' },
  { id: 'ACH-0014', fournisseur: 'Import Express',      agence: 'Siège',                       date: '2026-04-10', montant:   195_000, statut: 'Annulée',    reception: null },
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
  { id: 'FAV-0010', commande: 'CMD-0050', client: 'TechX Sarl',          agence: 'Agence Douala — Akwa',        date: '2026-04-24', echeance: '2026-05-24', montantHT: 3_524_958, tva: 19.25, montantTTC: 4_200_000, statut: 'Payée' },
  { id: 'FAV-0009', commande: 'CMD-0047', client: 'Mengueme & Fils',      agence: 'Agence Douala — Akwa',        date: '2026-04-21', echeance: '2026-05-21', montantHT: 1_584_906, tva: 19.25, montantTTC: 1_890_000, statut: 'Payée' },
  { id: 'FAV-0008', commande: 'CMD-0038', client: 'Sonatec SA',           agence: 'Succursale Yaoundé — Centre', date: '2026-04-18', echeance: '2026-05-18', montantHT: 1_760_502, tva: 19.25, montantTTC: 2_100_000, statut: 'Envoyée' },
  { id: 'FAV-0007', commande: 'CMD-0040', client: 'TechX Sarl',           agence: 'Agence Douala — Akwa',        date: '2026-04-22', echeance: '2026-05-22', montantHT: 2_682_927, tva: 19.25, montantTTC: 3_200_000, statut: 'Payée' },
  { id: 'FAV-0006', commande: 'CMD-0039', client: 'Groupe Delta',         agence: 'Siège',                       date: '2026-04-20', echeance: '2026-05-05', montantHT:   746_444, tva: 19.25, montantTTC:   890_000, statut: 'En retard' },
  { id: 'FAV-0005', commande: 'CMD-0049', client: 'Groupe Delta',         agence: 'Siège',                       date: '2026-04-23', echeance: '2026-05-23', montantHT: 10_063_694, tva: 19.25, montantTTC: 12_000_000, statut: 'Envoyée' },
  { id: 'FAV-0004', commande: 'CMD-0051', client: 'ACME Corp',            agence: 'Siège',                       date: '2026-04-25', echeance: '2026-05-25', montantHT:  7_044_025, tva: 19.25, montantTTC:  8_400_000, statut: 'Brouillon' },
  { id: 'FAV-0003', commande: 'CMD-0048', client: 'Sodiko Distribution',  agence: 'Succursale Yaoundé — Centre', date: '2026-04-22', echeance: '2026-04-30', montantHT:  2_641_509, tva: 19.25, montantTTC:  3_150_000, statut: 'En retard' },
  { id: 'FAV-0002', commande: 'CMD-0041', client: 'ACME Corp',            agence: 'Siège',                       date: '2026-04-24', echeance: '2026-05-24', montantHT:  1_216_301, tva: 19.25, montantTTC:  1_450_000, statut: 'Brouillon' },
  { id: 'FAV-0001', commande: 'CMD-0037', client: 'Infra Bâtiment',       agence: 'Agence Douala — Akwa',        date: '2026-04-15', echeance: '2026-05-15', montantHT:   469_665, tva: 19.25, montantTTC:   560_000, statut: 'Annulée' },
]

const INIT_BONS_LIVRAISON: BonLivraison[] = [
  { id: 'BL-0008', commande: 'CMD-0050', client: 'TechX Sarl',          agence: 'Agence Douala — Akwa',        dateCreation: '2026-04-24', datePrevue: '2026-04-28', dateLivraison: '2026-04-28', statut: 'Livré' },
  { id: 'BL-0007', commande: 'CMD-0047', client: 'Mengueme & Fils',      agence: 'Agence Douala — Akwa',        dateCreation: '2026-04-21', datePrevue: '2026-04-26', dateLivraison: '2026-04-26', statut: 'Livré' },
  { id: 'BL-0006', commande: 'CMD-0040', client: 'TechX Sarl',           agence: 'Agence Douala — Akwa',        dateCreation: '2026-04-22', datePrevue: '2026-04-25', dateLivraison: '2026-04-25', statut: 'Livré' },
  { id: 'BL-0005', commande: 'CMD-0038', client: 'Sonatec SA',           agence: 'Succursale Yaoundé — Centre', dateCreation: '2026-04-18', datePrevue: '2026-04-22', dateLivraison: '2026-04-22', statut: 'Livré' },
  { id: 'BL-0004', commande: 'CMD-0051', client: 'ACME Corp',            agence: 'Siège',                       dateCreation: '2026-04-25', datePrevue: '2026-05-05', dateLivraison: null,          statut: 'En préparation' },
  { id: 'BL-0003', commande: 'CMD-0049', client: 'Groupe Delta',         agence: 'Siège',                       dateCreation: '2026-04-23', datePrevue: '2026-05-10', dateLivraison: null,          statut: 'En préparation' },
  { id: 'BL-0002', commande: 'CMD-0048', client: 'Sodiko Distribution',  agence: 'Succursale Yaoundé — Centre', dateCreation: '2026-04-22', datePrevue: '2026-05-08', dateLivraison: null,          statut: 'Expédié' },
  { id: 'BL-0001', commande: 'CMD-0041', client: 'ACME Corp',            agence: 'Siège',                       dateCreation: '2026-04-24', datePrevue: '2026-04-30', dateLivraison: null,          statut: 'Expédié' },
]

const INIT_RETOURS_CLIENTS: RetourClient[] = [
  { id: 'RET-0004', facture: 'FAV-0007', client: 'TechX Sarl',          agence: 'Agence Douala — Akwa',        date: '2026-04-26', motif: 'Produit défectueux',    montant:   320_000, statut: 'Remboursé' },
  { id: 'RET-0003', facture: 'FAV-0006', client: 'Groupe Delta',         agence: 'Siège',                       date: '2026-04-24', motif: 'Erreur de référence',   montant:   890_000, statut: 'Validé' },
  { id: 'RET-0002', facture: 'FAV-0003', client: 'Sodiko Distribution',  agence: 'Succursale Yaoundé — Centre', date: '2026-04-25', motif: 'Quantité non conforme', montant:   450_000, statut: 'En cours' },
  { id: 'RET-0001', facture: 'FAV-0001', client: 'Infra Bâtiment',       agence: 'Agence Douala — Akwa',        date: '2026-04-16', motif: 'Commande annulée',      montant:   560_000, statut: 'Remboursé' },
]

const INIT_FACTURES_ACHATS: FactureAchat[] = [
  { id: 'FAA-0010', commande: 'ACH-0034', fournisseur: 'Import Express',      agence: 'Siège',                       date: '2026-04-25', echeance: '2026-05-25', montantHT: 4_696_652, tva: 19.25, montantTTC: 5_600_000, statut: 'Payée' },
  { id: 'FAA-0009', commande: 'ACH-0031', fournisseur: 'Manutention Pro',     agence: 'Succursale Yaoundé — Centre', date: '2026-04-22', echeance: '2026-05-22', montantHT: 1_216_301, tva: 19.25, montantTTC: 1_450_000, statut: 'Payée' },
  { id: 'FAA-0008', commande: 'ACH-0017', fournisseur: 'Tech Matériaux',      agence: 'Siège',                       date: '2026-04-20', echeance: '2026-05-20', montantHT: 1_132_075, tva: 19.25, montantTTC: 1_350_000, statut: 'Payée' },
  { id: 'FAA-0007', commande: 'ACH-0015', fournisseur: 'Fournisseur XYZ',     agence: 'Siège',                       date: '2026-04-15', echeance: '2026-05-15', montantHT: 2_179_540, tva: 19.25, montantTTC: 2_600_000, statut: 'Payée' },
  { id: 'FAA-0006', commande: 'ACH-0033', fournisseur: 'Ebobolo SARL',        agence: 'Agence Douala — Akwa',        date: '2026-04-24', echeance: '2026-05-24', montantHT: 2_346_500, tva: 19.25, montantTTC: 2_800_000, statut: 'Validée' },
  { id: 'FAA-0005', commande: 'ACH-0030', fournisseur: 'Intertrans Cm',       agence: 'Agence Douala — Akwa',        date: '2026-04-20', echeance: '2026-05-05', montantHT: 2_766_246, tva: 19.25, montantTTC: 3_300_000, statut: 'En retard' },
  { id: 'FAA-0004', commande: 'ACH-0032', fournisseur: 'Africa Tech Supply',  agence: 'Siège',                       date: '2026-04-23', echeance: '2026-05-23', montantHT: 7_717_908, tva: 19.25, montantTTC: 9_200_000, statut: 'À valider' },
  { id: 'FAA-0003', commande: 'ACH-0018', fournisseur: 'Supplies Pro',        agence: 'Siège',                       date: '2026-04-23', echeance: '2026-05-23', montantHT:   654_006, tva: 19.25, montantTTC:   780_000, statut: 'Validée' },
  { id: 'FAA-0002', commande: 'ACH-0016', fournisseur: 'Distrib Central',     agence: 'Agence Douala — Akwa',        date: '2026-04-18', echeance: '2026-04-25', montantHT:   352_160, tva: 19.25, montantTTC:   420_000, statut: 'En retard' },
  { id: 'FAA-0001', commande: 'ACH-0014', fournisseur: 'Import Express',      agence: 'Siège',                       date: '2026-04-10', echeance: '2026-05-10', montantHT:   163_556, tva: 19.25, montantTTC:   195_000, statut: 'Annulée' },
]

const INIT_BONS_RECEPTION: BonReception[] = [
  { id: 'BR-0010', commande: 'ACH-0034', fournisseur: 'Import Express',      agence: 'Siège',                       dateCreation: '2026-04-22', datePrevue: '2026-04-25', dateReception: '2026-04-25', statut: 'Reçu' },
  { id: 'BR-0009', commande: 'ACH-0031', fournisseur: 'Manutention Pro',     agence: 'Succursale Yaoundé — Centre', dateCreation: '2026-04-20', datePrevue: '2026-04-22', dateReception: '2026-04-22', statut: 'Reçu' },
  { id: 'BR-0008', commande: 'ACH-0017', fournisseur: 'Tech Matériaux',      agence: 'Siège',                       dateCreation: '2026-04-18', datePrevue: '2026-04-24', dateReception: '2026-04-24', statut: 'Reçu' },
  { id: 'BR-0007', commande: 'ACH-0015', fournisseur: 'Fournisseur XYZ',     agence: 'Siège',                       dateCreation: '2026-04-12', datePrevue: '2026-04-19', dateReception: '2026-04-19', statut: 'Reçu' },
  { id: 'BR-0006', commande: 'ACH-0033', fournisseur: 'Ebobolo SARL',        agence: 'Agence Douala — Akwa',        dateCreation: '2026-04-24', datePrevue: '2026-04-30', dateReception: null,          statut: 'Attendu' },
  { id: 'BR-0005', commande: 'ACH-0030', fournisseur: 'Intertrans Cm',       agence: 'Agence Douala — Akwa',        dateCreation: '2026-04-20', datePrevue: '2026-04-28', dateReception: null,          statut: 'Attendu' },
  { id: 'BR-0004', commande: 'ACH-0032', fournisseur: 'Africa Tech Supply',  agence: 'Siège',                       dateCreation: '2026-04-23', datePrevue: '2026-05-10', dateReception: null,          statut: 'Attendu' },
  { id: 'BR-0003', commande: 'ACH-0018', fournisseur: 'Supplies Pro',        agence: 'Siège',                       dateCreation: '2026-04-23', datePrevue: '2026-04-28', dateReception: null,          statut: 'Reçu partiel' },
  { id: 'BR-0002', commande: 'ACH-0016', fournisseur: 'Distrib Central',     agence: 'Agence Douala — Akwa',        dateCreation: '2026-04-16', datePrevue: '2026-05-05', dateReception: null,          statut: 'Litige' },
  { id: 'BR-0001', commande: 'ACH-0014', fournisseur: 'Import Express',      agence: 'Siège',                       dateCreation: '2026-04-08', datePrevue: '2026-04-15', dateReception: null,          statut: 'Litige' },
]

// ── Context ───────────────────────────────────────────────────────────────────

interface GestionContextValue {
  commandes:      Commande[]
  achats:         Achat[]
  clients:        Client[]
  fournisseurs:   Fournisseur[]
  facturesVentes: FactureVente[]
  bonsLivraison:  BonLivraison[]
  retoursClients: RetourClient[]
  facturesAchats: FactureAchat[]
  bonsReception:  BonReception[]
  addCommande(c: Omit<Commande, 'id'>): Commande
  addAchat(a: Omit<Achat, 'id'>): Achat
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
}

const GestionContext = createContext<GestionContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function GestionProvider({ children }: { children: ReactNode }) {
  const [commandes,      setCommandes]      = useState<Commande[]>(INIT_COMMANDES)
  const [achats,         setAchats]         = useState<Achat[]>(INIT_ACHATS)
  const [clients,        setClients]        = useState<Client[]>(INIT_CLIENTS)
  const [fournisseurs,   setFournisseurs]   = useState<Fournisseur[]>(INIT_FOURNISSEURS)
  const [facturesVentes, setFacturesVentes] = useState<FactureVente[]>(INIT_FACTURES_VENTES)
  const [bonsLivraison,  setBonsLivraison]  = useState<BonLivraison[]>(INIT_BONS_LIVRAISON)
  const [retoursClients, setRetoursClients] = useState<RetourClient[]>(INIT_RETOURS_CLIENTS)
  const [facturesAchats, setFacturesAchats] = useState<FactureAchat[]>(INIT_FACTURES_ACHATS)
  const [bonsReception,  setBonsReception]  = useState<BonReception[]>(INIT_BONS_RECEPTION)

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

  function addClient(c: Omit<Client, 'id' | 'createdAt'>): Client {
    const num  = clients.length + 1
    const id   = `CLI-${String(num).padStart(3, '0')}`
    const next: Client = { id, ...c, createdAt: new Date().toISOString().slice(0, 10) }
    setClients(prev => [next, ...prev])
    return next
  }

  function updateClient(id: string, patch: Partial<Omit<Client, 'id' | 'createdAt'>>) {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  function deleteClient(id: string) {
    setClients(prev => prev.filter(c => c.id !== id))
  }

  function addFournisseur(f: Omit<Fournisseur, 'id' | 'createdAt'>): Fournisseur {
    const num  = fournisseurs.length + 1
    const id   = `FRN-${String(num).padStart(3, '0')}`
    const next: Fournisseur = { id, ...f, createdAt: new Date().toISOString().slice(0, 10) }
    setFournisseurs(prev => [next, ...prev])
    return next
  }

  function updateFournisseur(id: string, patch: Partial<Omit<Fournisseur, 'id' | 'createdAt'>>) {
    setFournisseurs(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  function deleteFournisseur(id: string) {
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

  return (
    <GestionContext.Provider value={{
      commandes, achats, clients, fournisseurs,
      facturesVentes, bonsLivraison, retoursClients, facturesAchats, bonsReception,
      addCommande, addAchat,
      addClient, updateClient, deleteClient,
      addFournisseur, updateFournisseur, deleteFournisseur,
      updateCommandeStatut, updateAchatStatut,
      updateFactureVenteStatut, updateBLStatut, updateRetourStatut,
      updateFactureAchatStatut, updateBRStatut,
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
