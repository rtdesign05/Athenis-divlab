import { createContext, useContext, useState, useMemo, useEffect, useRef, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as purchasesApi from '@/services/purchasesApi'
import * as invoicesApi  from '@/services/invoicesApi'
import { clientsApi }    from '@/services/clientsApi'
import { stocksApi }     from '@/services/stocksApi'
import { TVA_CM }        from '@athenis/shared-types'

/** Taux TVA par défaut en pourcent (19,25 pour le Cameroun) — source : taxConstants. */
const DEFAULT_VAT_PCT = TVA_CM * 100

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
  /** Compte de charge SYSCOHADA (classe 6) — utilisé lors des factures d'achat */
  compteAchat?: string
  /** Compte de produit SYSCOHADA (classe 7) — utilisé lors des factures de vente */
  compteVente?: string
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
  /** ID de l'article (référence vers Article) — obligatoire pour les ventes */
  articleId?:     string
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
  /** ID de l'article backend (CUID) — déclenche un mouvement de stock ENTREE_ACHAT
   *  lors de la comptabilisation. Optionnel pour les achats de services. */
  articleId?:     string
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
  /** URL du PDF/image de la facture fournisseur (uploadée après création) */
  pieceUrl?:   string
  pieceName?:  string
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

// ── Adaptateurs API achats ────────────────────────────────────────────────────

function apiOrderToAchat(o: purchasesApi.ApiPurchaseOrder): Achat {
  return {
    id:                 o.reference,
    fournisseur:        o.fournisseur,
    agence:             o.agence?.nom ?? 'Siège',
    date:               o.date.slice(0, 10),
    montant:            Number(o.montantTTC),
    statut:             (purchasesApi.STATUS_TO_STATUT[o.status] ?? 'En cours') as AchatStatut,
    reception:          o.receptionAt ? o.receptionAt.slice(0, 10) : null,
    objet:              o.objet,
    notes:              o.notes ?? '',
    conditionsPaiement: o.conditionsPaiement ?? '',
    lignes:             o.lines.map(l => ({
      id:             l.id,
      reference:      l.reference ?? '',
      designation:    l.designation,
      quantite:       Number(l.quantite),
      unite:          l.unite,
      prixUnitaireHT: Number(l.prixUnitaireHT),
      montantHT:      Number(l.montantHT),
    })),
  }
}

/** Convertit un PurchaseOrder backend en FactureAchat frontend. */
function apiOrderToFactureAchat(o: purchasesApi.ApiPurchaseOrder): FactureAchat {
  // Status mapping pour les factures d'achat
  const statutMap: Record<purchasesApi.PurchaseStatus, FactureAchatStatut> = {
    DRAFT:     'À valider',
    SENT:      'Validée',
    RECEIVED:  'Validée',
    PARTIAL:   'Validée',
    CANCELLED: 'Annulée',
  }
  const vatRate = Number(o.vatRate) || DEFAULT_VAT_PCT
  return {
    id:          o.reference,
    commande:    o.reference,
    fournisseur: o.fournisseur,
    agence:      o.agence?.nom ?? 'Siège',
    date:        o.date.slice(0, 10),
    echeance:    o.receptionAt?.slice(0, 10) ?? o.date.slice(0, 10),
    montantHT:   Number(o.montantHT),
    tva:         vatRate,
    montantTTC:  Number(o.montantTTC),
    statut:      statutMap[o.status] ?? 'À valider',
    lignes:      o.lines.map(l => ({
      id:             l.id,
      ...(l.articleId ? { articleId: l.articleId } : {}),
      description:    l.designation,
      quantite:       Number(l.quantite),
      unite:          l.unite,
      prixUnitaireHT: Number(l.prixUnitaireHT),
      tvaRate:        vatRate,
      montantHT:      Number(l.montantHT),
    })),
    notes:       o.notes ?? '',
    ...(o.pieceUrl ? { pieceUrl: o.pieceUrl } : {}),
    ...(o.pieceName ? { pieceName: o.pieceName } : {}),
  }
}

function achatToCreatePayload(a: Omit<Achat, 'id'>): purchasesApi.CreateOrderPayload {
  const totalHT = a.lignes.reduce((s, l) => s + l.montantHT, 0)
  return {
    fournisseur:        a.fournisseur,
    objet:              a.objet,
    date:               a.date,
    receptionAt:        a.reception ?? null,
    montantHT:          totalHT,
    vatRate:            DEFAULT_VAT_PCT,
    montantTTC:         a.montant,
    conditionsPaiement: a.conditionsPaiement,
    notes:              a.notes,
    lines: a.lignes.map(l => ({
      ...(l.reference ? { reference: l.reference } : {}),
      designation:    l.designation,
      quantite:       l.quantite,
      unite:          l.unite,
      prixUnitaireHT: l.prixUnitaireHT,
      montantHT:      l.montantHT,
    })),
  }
}

function achatPatchToApi(patch: Partial<Omit<Achat, 'id'>>): purchasesApi.UpdateOrderPayload {
  const out: purchasesApi.UpdateOrderPayload = {}
  if (patch.fournisseur        !== undefined) out.fournisseur        = patch.fournisseur
  if (patch.objet              !== undefined) out.objet              = patch.objet
  if (patch.date               !== undefined) out.date               = patch.date
  if ('reception'    in patch)               out.receptionAt        = patch.reception ?? null
  if (patch.conditionsPaiement !== undefined) out.conditionsPaiement = patch.conditionsPaiement
  if (patch.notes              !== undefined) out.notes              = patch.notes
  if (patch.statut             !== undefined) {
    const status = purchasesApi.STATUT_TO_STATUS[patch.statut]
    if (status !== undefined) out.status = status
  }
  if (patch.lignes             !== undefined) {
    const totalHT  = patch.lignes.reduce((s, l) => s + l.montantHT, 0)
    out.montantHT  = totalHT
    out.vatRate    = DEFAULT_VAT_PCT
    out.montantTTC = patch.montant ?? totalHT * (1 + TVA_CM)
    out.lines      = patch.lignes.map(l => ({
      ...(l.reference ? { reference: l.reference } : {}),
      designation:    l.designation,
      quantite:       l.quantite,
      unite:          l.unite,
      prixUnitaireHT: l.prixUnitaireHT,
      montantHT:      l.montantHT,
    }))
  } else if (patch.montant !== undefined) {
    out.montantTTC = patch.montant
  }
  return out
}

// ── Adaptateurs API factures ventes ──────────────────────────────────────────

function apiInvoiceToFactureVente(inv: invoicesApi.ApiInvoice): FactureVente {
  return {
    id:                 inv.reference,
    modele:             (inv.modele as ModeleFacture) ?? 'standard',
    commande:           '',
    client:             inv.client.nom,
    agence:             inv.agence?.nom ?? 'Siège',
    date:               inv.issuedAt.slice(0, 10),
    echeance:           inv.dueAt.slice(0, 10),
    montantHT:          Number(inv.amountHT),
    tva:                Number(inv.vatRate),
    montantTTC:         Number(inv.amountTTC),
    statut:             (invoicesApi.STATUS_TO_STATUT[inv.status] ?? 'Brouillon') as FactureVenteStatut,
    lignes:             inv.lines.map(l => ({
      id:             l.id,
      description:    l.description,
      quantite:       Number(l.quantite),
      unite:          l.unite,
      prixUnitaireHT: Number(l.prixUnitaireHT),
      tvaRate:        Number(l.tvaRate),
      montantHT:      Number(l.montantHT),
    })),
    notes:              inv.description ?? '',
    conditionsPaiement: inv.conditionsPaiement ?? '',
  }
}

// ── Données canoniques — clients ──────────────────────────────────────────────

// ── Données canoniques — fournisseurs ─────────────────────────────────────────

// ── Données canoniques — factures ventes (conservées comme référence uniquement) ─
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-ignore — retained for reference, not used in production code
const _INIT_FACTURES_VENTES: FactureVente[] = [
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

// ── Données canoniques — articles ────────────────────────────────────────────

// ── Données canoniques — ventes récurrentes ───────────────────────────────────

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
  addFactureAchat(f: Omit<FactureAchat, 'id'>): Promise<FactureAchat>
  addBonReception(b: Omit<BonReception, 'id'>): BonReception
  addArticle(a: Omit<Article, 'id' | 'createdAt'>): Article
  updateArticle(id: string, patch: Partial<Omit<Article, 'id' | 'createdAt'>>): void
  deleteArticle(id: string): void
  addCommande(c: Omit<Commande, 'id'>): Commande
  addAchat(a: Omit<Achat, 'id'>): Promise<Achat>
  addFactureVente(f: Omit<FactureVente, 'id'>): Promise<FactureVente>
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
  attachPieceToFactureAchat(id: string, pieceUrl: string | null, pieceName: string | null): Promise<void>
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
  // QueryClient pour invalider les caches comptabilité/dashboard après mutations
  const qc = useQueryClient()
  const [commandes,      setCommandes]      = useState<Commande[]>([])
  // achats chargés depuis l'API ; INIT_ACHATS sert de fallback si la requête échoue
  const [achats,         setAchats]         = useState<Achat[]>([])
  // Map interne reference → UUID (pour les mutations API sans changer l'interface)
  const achatDbIds   = useRef<Record<string, string>>({})
  // Map interne reference → UUID pour les factures ventes
  const invoiceDbIds = useRef<Record<string, string>>({})
  // Map interne reference → UUID pour les factures d'achat (PurchaseOrder backend)
  const factureAchatDbIds = useRef<Record<string, string>>({})
  // Map nom client (lowercase) → UUID en base
  const clientNomToId = useRef<Record<string, string>>({})

  useEffect(() => {
    // Bons de commande : documentType=ORDER
    purchasesApi.listOrders({ limit: 100, documentType: 'ORDER' })
      .then(({ items }) => {
        const idMap: Record<string, string> = {}
        const list = items.map(o => {
          idMap[o.reference] = o.id
          return apiOrderToAchat(o)
        })
        achatDbIds.current = idMap
        setAchats(list)
      })
      .catch((err) => {
        console.error('[achats] purchasesApi.listOrders ORDER error', err)
        setAchats([])
      })
  }, [])

  // Factures d'achat : documentType=INVOICE (saisies manuellement ou importées,
  // numéro de référence imposé par le fournisseur)
  useEffect(() => {
    purchasesApi.listOrders({ limit: 100, documentType: 'INVOICE' })
      .then(({ items }) => {
        const idMap: Record<string, string> = {}
        const list = items.map(o => {
          idMap[o.reference] = o.id
          return apiOrderToFactureAchat(o)
        })
        factureAchatDbIds.current = idMap
        setFacturesAchats(list)
      })
      .catch((err) => {
        console.error('[factures-achats] purchasesApi.listOrders INVOICE error', err)
        setFacturesAchats([])
      })
  }, [])

  // Articles : chargés depuis l'API. Si succès → uniquement les vrais articles
  // backend (CUIDs valides pour les FK et le décrément de stock). Si échec
  // (offline, démo) → fallback sur INIT_ARTICLES.
  useEffect(() => {
    stocksApi.listArticles({ limit: 100 })
      .then(({ items }) => {
        const list: Article[] = (items ?? []).map(a => ({
          id:           a.id,                                          // ← CUID backend (valide pour FK)
          reference:    a.reference ?? '',
          nom:          a.designation,
          categorie:    (a.famille?.nom ?? 'Marchandise') as ArticleCategorie,
          unite:        (a.unite ?? 'pièce') as ArticleUnite,
          prixVenteHT:  Number(a.prixVente ?? 0),
          prixAchatHT:  Number(a.prixAchat ?? 0),
          stock:        Number(a.stockActuel ?? 0),
          stockMin:     Number(a.stockMin ?? 0),
          agence:       'Siège',
          description:  a.description ?? '',
          actif:        a.isActive ?? true,
          createdAt:    a.createdAt ?? new Date().toISOString(),
          ...(a.compteAchat ? { compteAchat: a.compteAchat } : {}),
          ...(a.compteVente ? { compteVente: a.compteVente } : {}),
        }))
        setArticles(list)  // toujours définir, même si liste vide (DB sans articles)
      })
      .catch(err => {
        console.error('[articles] listArticles API error', err)
        setArticles([])
      })
  }, [])

  // Factures ventes + clients DB (pour le lookup clientId)
  useEffect(() => {
    // Charger les clients en base pour la résolution nom → UUID
    clientsApi.list().then(list => {
      const map: Record<string, string> = {}
      list.forEach(c => { map[c.name.toLowerCase()] = c.id })
      clientNomToId.current = map
    }).catch(() => { /* non bloquant */ })

    // Charger les factures depuis l'API
    invoicesApi.listInvoices({ limit: 100 })
      .then(({ items }) => {
        const idMap: Record<string, string> = {}
        const list = items.map(inv => {
          idMap[inv.reference] = inv.id
          return apiInvoiceToFactureVente(inv)
        })
        invoiceDbIds.current = idMap
        setFacturesVentes(list)
      })
      .catch(() => setFacturesVentes([]))
  }, [])

  // Clients & fournisseurs : initialisés vides — peuplés via les mutations utilisateur
  // (l'API clientsApi est utilisée pour le lookup nom→UUID dans le useEffect plus haut)
  const [clients,        setClients]        = useState<Client[]>([])
  const [fournisseurs,   setFournisseurs]   = useState<Fournisseur[]>([])
  // Articles initialisés à vide — peuplés par l'API au mount (cf. useEffect plus bas).
  // INIT_ARTICLES sert UNIQUEMENT de fallback si la connexion API échoue,
  // pour éviter que l'autocomplete propose des articles inexistants en DB
  // (ce qui empêchait le décrément de stock lors de la facturation).
  const [articles,       setArticles]       = useState<Article[]>([])
  // Factures ventes : chargées depuis l'API (fallback sur données démo)
  const [facturesVentes, setFacturesVentes] = useState<FactureVente[]>([])

  const [ventesRecurrentes, setVentesRecurrentes] = useState<VenteRecurrente[]>([])
  const [bonsLivraison,  setBonsLivraison]  = useState<BonLivraison[]>([])
  const [retoursClients, setRetoursClients] = useState<RetourClient[]>([])
  const [facturesAchats, setFacturesAchats] = useState<FactureAchat[]>([])
  const [bonsReception,       setBonsReception]       = useState<BonReception[]>([])
  const [mouvementsStock,     setMouvementsStock]     = useState<MouvementStock[]>([])
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

  async function addFactureAchat(f: Omit<FactureAchat, 'id'>): Promise<FactureAchat> {
    // Création immédiate dans l'état local (réactivité UI)
    const localId = `FAA-LOCAL-${Date.now()}`
    const next: FactureAchat = { id: localId, ...f }
    setFacturesAchats(prev => [next, ...prev])

    // Persistance backend (PurchaseOrder = bon de commande + facture d'achat).
    // Le numéro fourni par l'utilisateur (f.id si rempli, sinon f.commande, sinon généré
    // par le backend) sert de référence. Articles avec CUID seulement (les ART-xxx locaux
    // sont strippés pour éviter une erreur de FK).
    try {
      const order = await purchasesApi.createOrder({
      documentType: 'INVOICE',                                            // ← facture d'achat (pas un bon)
      // Numéro saisi manuellement par l'utilisateur (numéro du fournisseur)
      ...(f.commande?.trim() ? { reference: f.commande.trim() } : {}),
      fournisseur: f.fournisseur,
      objet:       f.notes?.trim() || `Facture ${f.fournisseur}`,
      date:        f.date,
      receptionAt: f.echeance,                                            // échéance stockée dans receptionAt
      montantHT:   f.montantHT,
      vatRate:     f.tva,
      montantTTC:  f.montantTTC,
      ...(f.notes ? { notes: f.notes } : {}),
      lines: (f.lignes ?? []).map(l => ({
        designation:    l.description,
        quantite:       l.quantite,
        unite:          l.unite,
        prixUnitaireHT: l.prixUnitaireHT,
        montantHT:      l.montantHT,
        // articleId : seul un CUID backend est valide pour la FK
        ...((l as LigneFactureAchat & { articleId?: string }).articleId
          && !/^ART-/i.test((l as LigneFactureAchat & { articleId?: string }).articleId!)
          ? { articleId: (l as LigneFactureAchat & { articleId?: string }).articleId! }
          : {}),
      })),
      })
      // Remplace l'entrée locale par l'entrée backend (avec sa référence finale)
      factureAchatDbIds.current[order.reference] = order.id
      const realFa: FactureAchat = { ...next, id: order.reference }
      setFacturesAchats(prev => prev.map(x => x.id === localId ? realFa : x))
      return realFa
    } catch (err) {
      console.error('[facturesAchats] addFactureAchat API error', err)
      throw err  // propage l'erreur pour que l'UI puisse l'afficher
    }
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
    // Création immédiate locale (UI réactive), puis persistance backend.
    const num     = articles.length + 1
    const localId = `ART-${String(num).padStart(3, '0')}`
    const next: Article = { id: localId, ...a, createdAt: new Date().toISOString().slice(0, 10) }
    setArticles(prev => [next, ...prev])

    // Persistance backend : nécessaire pour que les écritures comptables
    // (factures vente/achat) puissent référencer l'article via son CUID.
    stocksApi.createArticle({
      designation:  a.nom,
      reference:    a.reference,
      unite:        a.unite,
      prixAchat:    a.prixAchatHT,
      prixVente:    a.prixVenteHT,
      tvaAchat:     0.1925,
      tvaVente:     0.1925,
      stockInitial: a.stock,
      stockMin:     a.stockMin,
      methodeValuation: 'CMUP',
      ...(a.description ? { description: a.description } : {}),
      ...(a.compteAchat?.trim() ? { compteAchat: a.compteAchat.trim() } : {}),
      ...(a.compteVente?.trim() ? { compteVente: a.compteVente.trim() } : {}),
    })
      .then(created => {
        // Remplace l'entrée locale par celle du backend (avec son CUID)
        setArticles(prev => prev.map(x => {
          if (x.id !== localId) return x
          const updated: Article = {
            ...x,
            id:        created.id,
            reference: created.reference,
          }
          if (created.compteAchat) updated.compteAchat = created.compteAchat
          if (created.compteVente) updated.compteVente = created.compteVente
          return updated
        }))
      })
      .catch(err => {
        console.error('[articles] addArticle API error', err)
      })
    return next
  }

  function updateArticle(id: string, patch: Partial<Omit<Article, 'id' | 'createdAt'>>) {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))

    // Si l'id ressemble à un CUID backend (commence par 'c' et pas 'ART-'),
    // on synchronise la modification côté backend.
    if (!/^ART-/.test(id)) {
      const apiPatch: Parameters<typeof stocksApi.updateArticle>[1] = {}
      if (patch.nom         !== undefined) apiPatch.designation  = patch.nom
      if (patch.reference   !== undefined) apiPatch.reference    = patch.reference
      if (patch.unite       !== undefined) apiPatch.unite        = patch.unite
      if (patch.prixVenteHT !== undefined) apiPatch.prixVente    = patch.prixVenteHT
      if (patch.prixAchatHT !== undefined) apiPatch.prixAchat    = patch.prixAchatHT
      if (patch.stockMin    !== undefined) apiPatch.stockMin     = patch.stockMin
      if (patch.description !== undefined) apiPatch.description  = patch.description
      if (patch.compteAchat !== undefined) apiPatch.compteAchat  = patch.compteAchat
      if (patch.compteVente !== undefined) apiPatch.compteVente  = patch.compteVente
      if (Object.keys(apiPatch).length > 0) {
        stocksApi.updateArticle(id, apiPatch).catch(err =>
          console.error('[articles] updateArticle API error', err),
        )
      }
    }
  }

  function deleteArticle(id: string) {
    setArticles(prev => prev.filter(a => a.id !== id))
    if (!/^ART-/.test(id)) {
      stocksApi.deleteArticle(id).catch(err =>
        console.error('[articles] deleteArticle API error', err),
      )
    }
  }

  function addCommande(c: Omit<Commande, 'id'>): Commande {
    const last = commandes[0]?.id ?? 'CMD-0000'
    const num  = parseInt(last.replace('CMD-', ''), 10) + 1
    const id   = `CMD-${String(num).padStart(4, '0')}`
    const next: Commande = { id, ...c }
    setCommandes(prev => [next, ...prev])
    return next
  }

  async function addAchat(a: Omit<Achat, 'id'>): Promise<Achat> {
    try {
      const order = await purchasesApi.createOrder(achatToCreatePayload(a))
      const achat = apiOrderToAchat(order)
      achatDbIds.current[achat.id] = order.id
      setAchats(prev => [achat, ...prev])
      return achat
    } catch (err) {
      console.error('addAchat API error', err)
      // Fallback local (non persisté)
      const id   = `BC-LOCAL-${Date.now()}`
      const next: Achat = { id, ...a }
      setAchats(prev => [next, ...prev])
      return next
    }
  }

  async function addFactureVente(f: Omit<FactureVente, 'id'>): Promise<FactureVente> {
    // Résoudre le clientId (nom → UUID en base)
    const clientNom = f.client.trim()
    let clientId    = clientNomToId.current[clientNom.toLowerCase()]

    if (!clientId) {
      // Client inconnu : le créer en base à la volée
      try {
        const created = await clientsApi.create({ name: clientNom })
        clientId = created.id
        clientNomToId.current[clientNom.toLowerCase()] = clientId
      } catch {
        // Pas de connexion API → création locale uniquement
        const localId = `FAV-${Date.now()}`
        const next: FactureVente = { id: localId, ...f }
        setFacturesVentes(prev => [next, ...prev])
        return next
      }
    }

    try {
      const payload: invoicesApi.CreateInvoicePayload = {
        clientId,
        modele:   f.modele as invoicesApi.InvoiceModele,
        issueDate: f.date,
        dueDate:   f.echeance,
        subtotal:  f.montantHT,
        taxRate:   f.tva,
        ...(f.conditionsPaiement ? { conditionsPaiement: f.conditionsPaiement } : {}),
        ...(f.notes              ? { notes: f.notes }                           : {}),
        lines: f.lignes.map(l => ({
          description:    l.description,
          quantite:       l.quantite,
          unite:          l.unite,
          prixUnitaireHT: l.prixUnitaireHT,
          tvaRate:        l.tvaRate,
          montantHT:      l.montantHT,
          // articleId : seul un CUID backend est valide pour la FK.
          // Les IDs locaux hardcodés (ART-xxx) doivent être omis pour éviter
          // un échec P2003 sur invoice_lines_article_id_fkey.
          ...(l.articleId && !/^ART-/i.test(l.articleId) ? { articleId: l.articleId } : {}),
        })),
      }
      const created = await invoicesApi.createInvoice(payload)
      invoiceDbIds.current[created.reference] = created.id
      const next = apiInvoiceToFactureVente(created)
      setFacturesVentes(prev => [next, ...prev])
      // Invalide les vues consommatrices (liste factures, dashboard) — important
      // pour que la nouvelle facture apparaisse immédiatement après création.
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['billing'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      return next
    } catch (err) {
      // Échec API : on remonte l'erreur au lieu d'un fallback local silencieux
      // (qui créait des factures fantômes perdues au prochain refresh).
      console.error('[invoices] addFactureVente API error', err)
      throw err
    }
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

  function updateAchatStatut(reference: string, statut: AchatStatut) {
    setAchats(prev => prev.map(a => a.id === reference ? { ...a, statut } : a))
    const dbId  = achatDbIds.current[reference]
    const status = purchasesApi.STATUT_TO_STATUS[statut]
    if (dbId && status) {
      purchasesApi.updateOrder(dbId, { status }).catch(err =>
        console.error('updateAchatStatut API error', err),
      )
    }
  }

  function updateFactureVenteStatut(id: string, statut: FactureVenteStatut) {
    setFacturesVentes(prev => prev.map(f => f.id === id ? { ...f, statut } : f))
    const dbId  = invoiceDbIds.current[id]
    const status = invoicesApi.STATUT_TO_STATUS[statut]
    if (dbId && status) {
      invoicesApi.updateInvoiceStatus(dbId, status)
        .then(() => {
          // Le passage en SENT/PAID déclenche la comptabilisation (postSaleInvoice)
          // côté backend → on rafraîchit toutes les vues comptables, dashboard et stocks.
          ;[
            'journal', 'balance-journal', 'grand-livre-journal', 'grand-livre-situation',
            'financial-statements', 'etats-financiers', 'comptes', 'comptes-tiers',
            'billing', 'dashboard', 'invoices', 'fiscal-years',
            'stocks', 'stocks-articles',  // stock peut bouger via inventaire permanent
          ].forEach(k => qc.invalidateQueries({ queryKey: [k] }))
        })
        .catch(err =>
          console.error('[invoices] updateFactureVenteStatut API error', err),
        )
    }
  }

  function updateBLStatut(id: string, statut: BLStatut) {
    setBonsLivraison(prev => prev.map(b => b.id === id ? { ...b, statut } : b))
  }

  function updateRetourStatut(id: string, statut: RetourStatut) {
    setRetoursClients(prev => prev.map(r => r.id === id ? { ...r, statut } : r))
  }

  function updateFactureAchatStatut(id: string, statut: FactureAchatStatut) {
    setFacturesAchats(prev => prev.map(f => f.id === id ? { ...f, statut } : f))
    // Persistance backend → déclenche postPurchaseOrder (journal ACH + stock)
    const dbId = factureAchatDbIds.current[id]
    const status = purchasesApi.STATUT_TO_STATUS[statut]
    if (dbId && status) {
      purchasesApi.updateOrder(dbId, { status })
        .then(() => {
          // Invalidation des vues comptables et dashboard
          ;[
            'journal', 'balance-journal', 'grand-livre-journal', 'grand-livre-situation',
            'financial-statements', 'etats-financiers', 'comptes', 'comptes-tiers',
            'billing', 'dashboard', 'invoices', 'fiscal-years',
            'stocks', 'stocks-articles',
          ].forEach(k => qc.invalidateQueries({ queryKey: [k] }))
        })
        .catch(err =>
          console.error('[facturesAchats] updateFactureAchatStatut API error', err),
        )
    }
  }

  /** Attache (ou détache si pieceUrl=null) le fichier justificatif d'une facture d'achat. */
  async function attachPieceToFactureAchat(id: string, pieceUrl: string | null, pieceName: string | null): Promise<void> {
    const dbId = factureAchatDbIds.current[id]
    if (!dbId) {
      console.warn('[facturesAchats] attachPiece : facture introuvable en base', id)
      return
    }
    const patch: purchasesApi.UpdateOrderPayload = {}
    if (pieceUrl)  patch.pieceUrl  = pieceUrl
    if (pieceName) patch.pieceName = pieceName
    await purchasesApi.updateOrder(dbId, patch)
    setFacturesAchats(prev => prev.map(f => f.id === id
      ? { ...f, ...(pieceUrl ? { pieceUrl, pieceName: pieceName ?? '' } : {}) }
      : f,
    ))
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

  function updateAchat(reference: string, patch: Partial<Omit<Achat, 'id'>>) {
    setAchats(prev => prev.map(a => a.id === reference ? { ...a, ...patch } : a))
    const dbId = achatDbIds.current[reference]
    if (dbId) {
      purchasesApi.updateOrder(dbId, achatPatchToApi(patch)).catch(err =>
        console.error('updateAchat API error', err),
      )
    }
  }

  function deleteAchat(reference: string) {
    setAchats(prev => prev.filter(a => a.id !== reference))
    const dbId = achatDbIds.current[reference]
    if (dbId) {
      delete achatDbIds.current[reference]
      purchasesApi.deleteOrder(dbId).catch(err =>
        console.error('deleteAchat API error', err),
      )
    }
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
      updateFactureAchatStatut, attachPieceToFactureAchat, updateBRStatut,
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
