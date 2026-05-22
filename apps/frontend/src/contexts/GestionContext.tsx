import { createContext, useContext, useState, useMemo, useEffect, useRef, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as purchasesApi from '@/services/purchasesApi'
import * as invoicesApi  from '@/services/invoicesApi'
import { clientsApi }    from '@/services/clientsApi'
import { stocksApi }     from '@/services/stocksApi'
import { fournisseursApi, type FournisseurCategorieApi } from '@/services/fournisseursApi'
import { deliveryNotesApi,   type DeliveryNoteStatusApi  } from '@/services/deliveryNotesApi'
import { goodsReceiptsApi,   type GoodsReceiptStatusApi  } from '@/services/goodsReceiptsApi'
import { customerReturnsApi, type CustomerReturnStatusApi } from '@/services/customerReturnsApi'
import { TVA_CM }        from '@athenis/shared-types'

// ── Mappings categorie/statut <-> backend enum ────────────────────────────────

const FOURNISSEUR_CAT_TO_API: Record<string, FournisseurCategorieApi> = {
  'Matières premières': 'MATIERES_PREMIERES',
  'Services':           'SERVICES',
  'Équipement':         'EQUIPEMENT',
  'Logistique':         'LOGISTIQUE',
  'Informatique':       'INFORMATIQUE',
  'Autre':              'AUTRE',
}
const FOURNISSEUR_CAT_FROM_API: Record<FournisseurCategorieApi, string> = {
  MATIERES_PREMIERES: 'Matières premières',
  SERVICES:           'Services',
  EQUIPEMENT:         'Équipement',
  LOGISTIQUE:         'Logistique',
  INFORMATIQUE:       'Informatique',
  AUTRE:              'Autre',
}
const BL_STATUT_TO_API: Record<string, DeliveryNoteStatusApi> = {
  'En préparation': 'EN_PREPARATION',
  'Expédié':        'EXPEDIE',
  'Livré':          'LIVRE',
  'Retourné':       'RETOURNE',
}
const BL_STATUT_FROM_API: Record<DeliveryNoteStatusApi, string> = {
  EN_PREPARATION: 'En préparation',
  EXPEDIE:        'Expédié',
  LIVRE:          'Livré',
  RETOURNE:       'Retourné',
}
const BR_STATUT_TO_API: Record<string, GoodsReceiptStatusApi> = {
  'Attendu':       'ATTENDU',
  'Reçu partiel':  'RECU_PARTIEL',
  'Reçu':          'RECU',
  'Litige':        'LITIGE',
}
const BR_STATUT_FROM_API: Record<GoodsReceiptStatusApi, string> = {
  ATTENDU:      'Attendu',
  RECU_PARTIEL: 'Reçu partiel',
  RECU:         'Reçu',
  LITIGE:       'Litige',
}
const RETOUR_STATUT_TO_API: Record<string, CustomerReturnStatusApi> = {
  'En cours':  'EN_COURS',
  'Validé':    'VALIDE',
  'Remboursé': 'REMBOURSE',
  'Refusé':    'REFUSE',
}
const RETOUR_STATUT_FROM_API: Record<CustomerReturnStatusApi, string> = {
  EN_COURS:  'En cours',
  VALIDE:    'Validé',
  REMBOURSE: 'Remboursé',
  REFUSE:    'Refusé',
}

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
  /** FK vers l'agence — résolu par la page via useCompanySettings depuis le nom. */
  agenceId?:    string | null
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

  // ── Hydratation entités nouvellement persistées ─────────────────────────────
  // Fournisseurs, BL, BR, Retours Clients : maintenant chargés depuis l'API au mount
  // (l'API a été ajoutée par la migration 20260522240000_fournisseur_bl_br_retour).
  useEffect(() => {
    let cancelled = false

    fournisseursApi.list()
      .then(items => {
        if (cancelled) return
        setFournisseurs(items.map(f => ({
          id:        f.id,
          nom:       f.nom,
          categorie: (FOURNISSEUR_CAT_FROM_API[f.categorie] ?? 'Autre') as FournisseurCategorie,
          email:     f.email ?? '',
          telephone: f.telephone ?? '',
          adresse:   f.adresse ?? '',
          agence:    f.agence?.nom ?? 'Siège',
          notes:     f.notes ?? '',
          ...(f.accountingCode ? { compte: f.accountingCode } : {}),
          createdAt: f.createdAt.slice(0, 10),
        })))
      })
      .catch(err => console.error('[fournisseurs] list error', err))

    deliveryNotesApi.list()
      .then(items => {
        if (cancelled) return
        setBonsLivraison(items.map(b => ({
          id:               b.id,
          commande:         b.commande ?? '',
          client:           b.clientNom,
          agence:           b.agence?.nom ?? 'Siège',
          dateCreation:     b.dateCreation,
          datePrevue:       b.datePrevue ?? '',
          dateLivraison:    b.dateLivraison,
          statut:           (BL_STATUT_FROM_API[b.statut] ?? 'En préparation') as BLStatut,
          lignes:           (b.lignes ?? []).map(l => ({
            id:          l.id,
            articleId:   l.articleId ?? '',
            reference:   l.reference ?? '',
            designation: l.designation,
            quantite:    l.quantite,
            unite:       l.unite ?? '',
          })),
          adresseLivraison: b.adresseLivraison ?? '',
          notes:            b.notes ?? '',
        })))
      })
      .catch(err => console.error('[delivery-notes] list error', err))

    goodsReceiptsApi.list()
      .then(items => {
        if (cancelled) return
        setBonsReception(items.map(b => ({
          id:                  b.id,
          commande:            b.commande ?? '',
          fournisseur:         b.fournisseurNom,
          agence:              b.agence?.nom ?? 'Siège',
          dateCreation:        b.dateCreation,
          datePrevue:          b.datePrevue ?? '',
          dateReception:       b.dateReception,
          statut:              (BR_STATUT_FROM_API[b.statut] ?? 'Attendu') as BRStatut,
          lignes:              (b.lignes ?? []).map(l => ({
            id:            l.id,
            reference:     l.reference ?? '',
            designation:   l.designation,
            quantite:      l.quantite,
            quantiteRecue: l.quantiteRecue,
            unite:         l.unite ?? '',
          })),
          notes:               b.notes ?? '',
          conditionsLivraison: '',
        })))
      })
      .catch(err => console.error('[goods-receipts] list error', err))

    customerReturnsApi.list()
      .then(items => {
        if (cancelled) return
        setRetoursClients(items.map(r => ({
          id:      r.id,
          facture: r.facture ?? '',
          client:  r.clientNom,
          agence:  r.agence?.nom ?? 'Siège',
          date:    r.date,
          motif:   r.motif ?? '',
          montant: r.montant,
          statut:  (RETOUR_STATUT_FROM_API[r.statut] ?? 'En cours') as RetourStatut,
        })))
      })
      .catch(err => console.error('[customer-returns] list error', err))

    return () => { cancelled = true }
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
    const localId = `BL-${String(num).padStart(4, '0')}`
    const next: BonLivraison = { id: localId, ...b }
    setBonsLivraison(prev => [next, ...prev])
    // Persistance API en background
    deliveryNotesApi.create({
      clientNom:        b.client,
      dateCreation:     b.dateCreation,
      datePrevue:       b.datePrevue || null,
      dateLivraison:    b.dateLivraison ?? null,
      statut:           BL_STATUT_TO_API[b.statut] ?? 'EN_PREPARATION',
      lignes:           b.lignes.map(l => ({
        id: l.id, articleId: l.articleId, reference: l.reference,
        designation: l.designation, quantite: l.quantite, unite: l.unite,
      })),
      ...(b.commande         ? { commande:         b.commande }         : {}),
      ...(b.adresseLivraison ? { adresseLivraison: b.adresseLivraison } : {}),
      ...(b.notes            ? { notes:            b.notes }            : {}),
    })
      .then(created => {
        setBonsLivraison(prev => prev.map(x =>
          x.id === localId ? { ...x, id: created.id } : x,
        ))
      })
      .catch(err => console.error('[delivery-notes] create error', err))
    return next
  }

  function addRetourClient(r: Omit<RetourClient, 'id'>): RetourClient {
    const last = retoursClients[0]?.id ?? 'RET-0000'
    const num  = parseInt(last.replace('RET-', ''), 10) + 1
    const localId = `RET-${String(num).padStart(4, '0')}`
    const next: RetourClient = { id: localId, ...r }
    setRetoursClients(prev => [next, ...prev])
    customerReturnsApi.create({
      clientNom: r.client,
      date:      r.date,
      montant:   r.montant,
      statut:    RETOUR_STATUT_TO_API[r.statut] ?? 'EN_COURS',
      ...(r.facture ? { facture: r.facture } : {}),
      ...(r.motif   ? { motif:   r.motif }   : {}),
    })
      .then(created => {
        setRetoursClients(prev => prev.map(x =>
          x.id === localId ? { ...x, id: created.id } : x,
        ))
      })
      .catch(err => console.error('[customer-returns] create error', err))
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
    const localId = `BR-${String(num).padStart(4, '0')}`
    const next: BonReception = { id: localId, ...b }
    setBonsReception(prev => [next, ...prev])
    goodsReceiptsApi.create({
      fournisseurNom: b.fournisseur,
      dateCreation:   b.dateCreation,
      datePrevue:     b.datePrevue || null,
      dateReception:  b.dateReception ?? null,
      statut:         BR_STATUT_TO_API[b.statut] ?? 'ATTENDU',
      lignes:         b.lignes.map(l => ({
        id: l.id, reference: l.reference, designation: l.designation,
        quantite: l.quantite, quantiteRecue: l.quantiteRecue, unite: l.unite,
      })),
      ...(b.commande ? { commande: b.commande } : {}),
      ...(b.notes    ? { notes:    b.notes }    : {}),
    })
      .then(created => {
        setBonsReception(prev => prev.map(x =>
          x.id === localId ? { ...x, id: created.id } : x,
        ))
      })
      .catch(err => console.error('[goods-receipts] create error', err))
    return next
  }

  function addMouvementStock(m: Omit<MouvementStock, 'id'>): MouvementStock {
    const last = mouvementsStock[0]?.id ?? 'MVT-000'
    const num  = parseInt(last.replace('MVT-', ''), 10) + 1
    const localId = `MVT-${String(num).padStart(3, '0')}`
    const next: MouvementStock = { id: localId, ...m }
    setMouvementsStock(prev => [next, ...prev])
    // Met à jour le stock de l'article correspondant
    setArticles(prev => prev.map(a =>
      a.id === m.articleId ? { ...a, stock: Math.max(0, a.stock + m.quantite) } : a
    ))
    // Persiste via stocksApi seulement si articleId est un CUID backend (pas ART-xxx local)
    if (!/^ART-/.test(m.articleId)) {
      const apiType = m.type === 'Entrée'
        ? (m.quantite >= 0 ? 'ENTREE_INVENTAIRE' : 'SORTIE_INVENTAIRE')
        : m.type === 'Sortie'
          ? 'SORTIE_INVENTAIRE'
          : 'AJUSTEMENT'
      stocksApi.createMouvement({
        articleId:    m.articleId,
        type:         apiType,
        quantite:     Math.abs(m.quantite),
        prixUnitaire: 0,
        ...(m.reference ? { reference: m.reference } : {}),
        ...(m.notes     ? { description: m.notes }   : {}),
      })
        .then(created => {
          setMouvementsStock(prev => prev.map(x =>
            x.id === localId ? { ...x, id: created.id } : x,
          ))
        })
        .catch(err => console.error('[stocks] createMouvement error', err))
    }
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
      ...(a.agenceId ? { agenceId: a.agenceId } : {}),
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
      if (patch.agenceId    !== undefined) apiPatch.agenceId     = patch.agenceId ?? null
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
      // Invalide les vues consommatrices. ['invoices'] couvre les sous-clés
      // ['invoices','list',...], ['invoices','dashboard',...], etc.
      // Note : une facture DRAFT n'est PAS comptée dans le CA du tableau de bord
      // (conforme SYSCOHADA — reconnaissance à l'émission/SENT). Le tableau de
      // bord ne "bouge" qu'au passage de la facture en SENT/PAID.
      ;[
        'invoices',
        'accounting',           // SIG / compte de résultat
        'dashboard',
        'fiscal-years',
        'comptes-tiers',
      ].forEach(k => qc.invalidateQueries({ queryKey: [k] }))
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
    const num     = clients.length + 1
    const localId = `CLI-${String(num).padStart(3, '0')}`
    const next: Client = { id: localId, ...c, createdAt: new Date().toISOString().slice(0, 10) }
    if (c.compte) saveCompteToLS(localId, c.compte)
    setClients(prev => [next, ...prev])
    // Persistance API en background (best-effort)
    clientsApi.create({
      name: c.nom,
      ...(c.email     ? { email:   c.email }     : {}),
      ...(c.telephone ? { phone:   c.telephone } : {}),
      ...(c.adresse   ? { address: c.adresse }   : {}),
      ...(c.compte    ? { accountingCode: c.compte } : {}),
    })
      .then(created => {
        // Remplace l'id local par le CUID backend (préserve référence comptable)
        setClients(prev => prev.map(x =>
          x.id === localId ? { ...x, id: created.id } : x,
        ))
        if (c.compte) {
          saveCompteToLS(localId, undefined)
          saveCompteToLS(created.id, c.compte)
        }
        clientNomToId.current[c.nom.toLowerCase()] = created.id
      })
      .catch(err => console.error('[clients] addClient API error', err))
    return next
  }

  function updateClient(id: string, patch: Partial<Omit<Client, 'id' | 'createdAt'>>) {
    if ('compte' in patch) saveCompteToLS(id, patch.compte)
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
    // Persistance backend si l'id est un CUID (pas CLI-xxx local)
    if (!/^CLI-/.test(id)) {
      const apiPatch: Parameters<typeof clientsApi.update>[1] = {}
      if (patch.nom       !== undefined) apiPatch.name           = patch.nom
      if (patch.email     !== undefined) apiPatch.email          = patch.email
      if (patch.telephone !== undefined) apiPatch.phone          = patch.telephone
      if (patch.adresse   !== undefined) apiPatch.address        = patch.adresse
      if (patch.compte    !== undefined) apiPatch.accountingCode = patch.compte
      if (Object.keys(apiPatch).length > 0) {
        clientsApi.update(id, apiPatch).catch(err =>
          console.error('[clients] updateClient API error', err),
        )
      }
    }
  }

  function deleteClient(id: string) {
    saveCompteToLS(id, undefined)
    setClients(prev => prev.filter(c => c.id !== id))
    if (!/^CLI-/.test(id)) {
      clientsApi.remove(id).catch(err =>
        console.error('[clients] deleteClient API error', err),
      )
    }
  }

  function addFournisseur(f: Omit<Fournisseur, 'id' | 'createdAt'>): Fournisseur {
    const num     = fournisseurs.length + 1
    const localId = `FRN-${String(num).padStart(3, '0')}`
    const next: Fournisseur = { id: localId, ...f, createdAt: new Date().toISOString().slice(0, 10) }
    if (f.compte) saveCompteToLS(localId, f.compte)
    setFournisseurs(prev => [next, ...prev])
    fournisseursApi.create({
      nom:       f.nom,
      categorie: FOURNISSEUR_CAT_TO_API[f.categorie] ?? 'AUTRE',
      ...(f.email     ? { email:     f.email }     : {}),
      ...(f.telephone ? { telephone: f.telephone } : {}),
      ...(f.adresse   ? { adresse:   f.adresse }   : {}),
      ...(f.notes     ? { notes:     f.notes }     : {}),
      ...(f.compte    ? { accountingCode: f.compte } : {}),
    })
      .then(created => {
        setFournisseurs(prev => prev.map(x =>
          x.id === localId ? { ...x, id: created.id } : x,
        ))
        if (f.compte) {
          saveCompteToLS(localId, undefined)
          saveCompteToLS(created.id, f.compte)
        }
      })
      .catch(err => console.error('[fournisseurs] addFournisseur API error', err))
    return next
  }

  function updateFournisseur(id: string, patch: Partial<Omit<Fournisseur, 'id' | 'createdAt'>>) {
    if ('compte' in patch) saveCompteToLS(id, patch.compte)
    setFournisseurs(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
    if (!/^FRN-/.test(id)) {
      const apiPatch: Parameters<typeof fournisseursApi.update>[1] = {}
      if (patch.nom       !== undefined) apiPatch.nom            = patch.nom
      if (patch.categorie !== undefined) apiPatch.categorie      = FOURNISSEUR_CAT_TO_API[patch.categorie] ?? 'AUTRE'
      if (patch.email     !== undefined) apiPatch.email          = patch.email
      if (patch.telephone !== undefined) apiPatch.telephone      = patch.telephone
      if (patch.adresse   !== undefined) apiPatch.adresse        = patch.adresse
      if (patch.notes     !== undefined) apiPatch.notes          = patch.notes
      if (patch.compte    !== undefined) apiPatch.accountingCode = patch.compte
      if (Object.keys(apiPatch).length > 0) {
        fournisseursApi.update(id, apiPatch).catch(err =>
          console.error('[fournisseurs] updateFournisseur API error', err),
        )
      }
    }
  }

  function deleteFournisseur(id: string) {
    saveCompteToLS(id, undefined)
    setFournisseurs(prev => prev.filter(f => f.id !== id))
    if (!/^FRN-/.test(id)) {
      fournisseursApi.remove(id).catch(err =>
        console.error('[fournisseurs] deleteFournisseur API error', err),
      )
    }
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
