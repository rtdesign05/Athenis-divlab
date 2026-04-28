import { createContext, useContext, useState, type ReactNode } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Données canoniques ────────────────────────────────────────────────────────
// Source unique de vérité — fusionné depuis GestionOverviewPage + VentesPage

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

// ── Context ───────────────────────────────────────────────────────────────────

interface GestionContextValue {
  commandes: Commande[]
  achats:    Achat[]
  addCommande(c: Omit<Commande, 'id'>): Commande
  addAchat(a: Omit<Achat, 'id'>): Achat
  updateCommandeStatut(id: string, statut: CommandeStatut): void
  updateAchatStatut(id: string, statut: AchatStatut): void
}

const GestionContext = createContext<GestionContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function GestionProvider({ children }: { children: ReactNode }) {
  const [commandes, setCommandes] = useState<Commande[]>(INIT_COMMANDES)
  const [achats,    setAchats]    = useState<Achat[]>(INIT_ACHATS)

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

  function updateCommandeStatut(id: string, statut: CommandeStatut) {
    setCommandes(prev => prev.map(c => c.id === id ? { ...c, statut } : c))
  }

  function updateAchatStatut(id: string, statut: AchatStatut) {
    setAchats(prev => prev.map(a => a.id === id ? { ...a, statut } : a))
  }

  return (
    <GestionContext.Provider value={{ commandes, achats, addCommande, addAchat, updateCommandeStatut, updateAchatStatut }}>
      {children}
    </GestionContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGestion(): GestionContextValue {
  const ctx = useContext(GestionContext)
  if (!ctx) throw new Error('useGestion must be used inside <GestionProvider>')
  return ctx
}
