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

// ── Context ───────────────────────────────────────────────────────────────────

interface GestionContextValue {
  commandes:   Commande[]
  achats:      Achat[]
  clients:     Client[]
  fournisseurs: Fournisseur[]
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
}

const GestionContext = createContext<GestionContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function GestionProvider({ children }: { children: ReactNode }) {
  const [commandes,    setCommandes]    = useState<Commande[]>(INIT_COMMANDES)
  const [achats,       setAchats]       = useState<Achat[]>(INIT_ACHATS)
  const [clients,      setClients]      = useState<Client[]>(INIT_CLIENTS)
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>(INIT_FOURNISSEURS)

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

  return (
    <GestionContext.Provider value={{
      commandes, achats, clients, fournisseurs,
      addCommande, addAchat,
      addClient, updateClient, deleteClient,
      addFournisseur, updateFournisseur, deleteFournisseur,
      updateCommandeStatut, updateAchatStatut,
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
