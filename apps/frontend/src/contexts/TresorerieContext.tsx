import { createContext, useContext, useState, type ReactNode } from 'react'

// ── Types partagés ─────────────────────────────────────────────────────────────

export type SourceType = 'banque' | 'caisse' | 'mobile-money'
export type TxStatus   = 'a_traiter' | 'traite'
export type PieceType  = 'facture' | 'recu' | 'bon_commande' | 'virement' | 'contrat' | 'autre'

export interface PieceJustificative {
  id:      string
  nom:     string
  type:    PieceType
  addedAt: string
}

export interface Contrepartie {
  accountCode:  string
  accountLabel: string
  libelle:      string
  addedAt:      string
}

export interface Transaction {
  id:                     string
  ref:                    string
  date:                   string
  libelle:                string
  montant:                number
  sourceType:             SourceType
  sourceName:             string
  agence:                 string
  journalCode:            string
  journalLabel:           string
  accountTresorerie:      string
  accountTresorerieLabel: string
  status:                 TxStatus
  contrepartie?:          Contrepartie
  pieces:                 PieceJustificative[]
}

// ── Mapping compte/journal par source ─────────────────────────────────────────

export const ACCOUNT_MAP: Record<string, { code: string; label: string; journalCode: string; journalLabel: string }> = {
  'BICEC — Compte courant entreprise': { code: '521100', label: 'Banque BICEC — Compte courant',       journalCode: 'BQ',  journalLabel: 'Journal de Banque'           },
  'UBA Cameroun — Compte épargne':     { code: '521200', label: 'Banque UBA — Compte épargne',          journalCode: 'BQ',  journalLabel: 'Journal de Banque'           },
  'Ecobank — Compte devises (EUR)':    { code: '521300', label: 'Ecobank — Compte devises (EUR)',        journalCode: 'BQ',  journalLabel: 'Journal de Banque'           },
  'Caisse principale':                 { code: '571000', label: 'Caisse principale (siège)',              journalCode: 'CAI', journalLabel: 'Journal de Caisse'           },
  'Petite caisse':                     { code: '571100', label: 'Petite caisse (siège)',                  journalCode: 'CAI', journalLabel: 'Journal de Caisse'           },
  'Caisse Agence':                     { code: '571200', label: 'Caisse Agence',                          journalCode: 'CAI', journalLabel: 'Journal de Caisse'           },
  'Caisse Succursale':                 { code: '571300', label: 'Caisse Succursale',                      journalCode: 'CAI', journalLabel: 'Journal de Caisse'           },
  'MTN Mobile Money':                  { code: '517100', label: 'Disponibilités MTN Mobile Money',       journalCode: 'OD',  journalLabel: 'Journal Opérations Diverses' },
  'Orange Money':                      { code: '517200', label: 'Disponibilités Orange Money',            journalCode: 'OD',  journalLabel: 'Journal Opérations Diverses' },
  'Moov Money':                        { code: '517300', label: 'Disponibilités Moov Money',              journalCode: 'OD',  journalLabel: 'Journal Opérations Diverses' },
  'Wave':                              { code: '517400', label: 'Disponibilités Wave',                    journalCode: 'OD',  journalLabel: 'Journal Opérations Diverses' },
}

export function accountInfo(sourceName: string) {
  return ACCOUNT_MAP[sourceName] ?? { code: '512000', label: sourceName, journalCode: 'BQ', journalLabel: 'Journal de Banque' }
}

// ── Helper mkTx ───────────────────────────────────────────────────────────────

function mkTx(
  id: string, date: string, libelle: string, montant: number,
  sourceType: SourceType, sourceName: string, agence: string,
  status: TxStatus,
  pieces: PieceJustificative[],
  contrepartie?: Contrepartie,
): Transaction {
  const acc      = accountInfo(sourceName)
  const datePart = date.replace(/-/g, '').slice(2)
  const ref      = `${acc.journalCode}-${date.slice(0, 4)}-${datePart}`
  return {
    id, ref, date, libelle, montant, sourceType, sourceName, agence,
    journalCode: acc.journalCode, journalLabel: acc.journalLabel,
    accountTresorerie: acc.code, accountTresorerieLabel: acc.label,
    status, ...(contrepartie !== undefined ? { contrepartie } : {}), pieces,
  }
}

// ── Données initiales (synchronisées avec Banques / Caisses / MobileMoney) ────

const INIT_TRANSACTIONS: Transaction[] = [
  // ── Banque BICEC ─────────────────────────────────────────────────────────────
  mkTx('b-o1', '2026-04-24', 'Virement reçu — ACME Corp (FAC-0041)',  8_400_000, 'banque', 'BICEC — Compte courant entreprise', 'Siège', 'traite',
    [{ id:'pj-b1-1', nom:'FAC-0041_ACME_CORP.pdf',       type:'facture',  addedAt:'2026-04-24T09:00:00Z' }],
    { accountCode:'411100', accountLabel:'Clients — ventes ordinaires',       libelle:'Règlement FAC-0041 ACME Corp',       addedAt:'2026-04-24T10:30:00Z' }),

  mkTx('b-o2', '2026-04-22', 'Prélèvement loyer bureaux avril',      -3_200_000, 'banque', 'BICEC — Compte courant entreprise', 'Siège', 'traite',
    [{ id:'pj-b2-1', nom:'BAIL_COMMERCIAL_2026.pdf',     type:'contrat',  addedAt:'2026-04-01T08:00:00Z' },
     { id:'pj-b2-2', nom:'QUITTANCE_LOYER_AVR26.pdf',    type:'recu',     addedAt:'2026-04-22T08:15:00Z' }],
    { accountCode:'612000', accountLabel:'Locations et charges locatives',    libelle:'Loyer bureaux — avril 2026',         addedAt:'2026-04-22T09:00:00Z' }),

  mkTx('b-o3', '2026-04-20', 'Virement reçu — TechX Sarl (FAC-0038)', 6_100_000, 'banque', 'BICEC — Compte courant entreprise', 'Siège', 'traite',
    [{ id:'pj-b3-1', nom:'FAC-0038_TECHX.pdf',           type:'facture',  addedAt:'2026-04-20T14:00:00Z' }],
    { accountCode:'411200', accountLabel:'Clients — prestations de services', libelle:'Règlement FAC-0038 TechX Sarl',      addedAt:'2026-04-20T15:00:00Z' }),

  mkTx('b-o4', '2026-04-18', 'Charges sociales CNPS mars',           -2_850_000, 'banque', 'BICEC — Compte courant entreprise', 'Siège', 'a_traiter',
    [{ id:'pj-b4-1', nom:'BORDEREAU_CNPS_MARS2026.pdf',  type:'autre',    addedAt:'2026-04-18T07:30:00Z' }]),

  mkTx('b-o5', '2026-04-15', 'Frais bancaires avril',                   -25_000, 'banque', 'BICEC — Compte courant entreprise', 'Siège', 'a_traiter',
    [{ id:'pj-b5-1', nom:'RELEVE_FRAIS_BICEC_AVR26.pdf', type:'recu',     addedAt:'2026-04-15T08:00:00Z' }]),

  // ── Banque UBA ────────────────────────────────────────────────────────────────
  mkTx('b-o6', '2026-04-01', 'Intérêts trimestriels Q1 2026',            142_000, 'banque', 'UBA Cameroun — Compte épargne', 'Siège', 'traite',
    [{ id:'pj-b6-1', nom:'AVIS_INTERETS_Q1_UBA.pdf',     type:'recu',     addedAt:'2026-04-01T10:00:00Z' }],
    { accountCode:'771000', accountLabel:'Intérêts et produits assimilés',    libelle:'Intérêts Q1 2026 — UBA Épargne',    addedAt:'2026-04-01T11:00:00Z' }),

  mkTx('b-o7', '2026-03-15', 'Virement depuis compte BICEC',           5_000_000, 'banque', 'UBA Cameroun — Compte épargne', 'Siège', 'traite',
    [{ id:'pj-b7-1', nom:'ORDRE_VIREMENT_BICEC_UBA.pdf', type:'virement', addedAt:'2026-03-15T09:00:00Z' }],
    { accountCode:'521100', accountLabel:'Banque BICEC — Compte courant',     libelle:'Virement interne BICEC → UBA',      addedAt:'2026-03-15T09:30:00Z' }),

  mkTx('b-o8', '2026-01-01', 'Intérêts trimestriels Q4 2025',            138_500, 'banque', 'UBA Cameroun — Compte épargne', 'Siège', 'a_traiter',
    [{ id:'pj-b8-1', nom:'AVIS_INTERETS_Q4_2025_UBA.pdf',type:'recu',     addedAt:'2026-01-01T09:00:00Z' }]),

  // ── Banque Ecobank ────────────────────────────────────────────────────────────
  mkTx('b-o9', '2026-04-19', 'Encaissement export — Groupe Delta',     3_200_000, 'banque', 'Ecobank — Compte devises (EUR)', 'Siège', 'traite',
    [{ id:'pj-b9-1', nom:'CONTRAT_EXPORT_DELTA.pdf',     type:'contrat',  addedAt:'2026-04-10T08:00:00Z' },
     { id:'pj-b9-2', nom:'FACTURE_EXPORT_GRP_DELTA.pdf', type:'facture',  addedAt:'2026-04-15T14:00:00Z' }],
    { accountCode:'411100', accountLabel:'Clients — ventes ordinaires',       libelle:'Export Groupe Delta — avr. 2026',   addedAt:'2026-04-19T10:00:00Z' }),

  mkTx('b-o10', '2026-04-10', 'Règlement fournisseur Import Express', -1_950_000, 'banque', 'Ecobank — Compte devises (EUR)', 'Siège', 'a_traiter',
    [{ id:'pj-b10-1', nom:'FACT_IMPORT_EXPRESS_0312.pdf',type:'facture',  addedAt:'2026-04-10T08:30:00Z' }]),

  mkTx('b-o11', '2026-04-05', 'Commission change EUR/XAF',               -18_000, 'banque', 'Ecobank — Compte devises (EUR)', 'Siège', 'a_traiter',
    [{ id:'pj-b11-1', nom:'AVIS_COMMISSION_CHANGE.pdf',  type:'recu',     addedAt:'2026-04-05T09:15:00Z' }]),

  // ── Caisse principale ─────────────────────────────────────────────────────────
  mkTx('c-op1', '2026-04-25', 'Achat fournitures de bureau',             -45_000, 'caisse', 'Caisse principale', 'Siège', 'a_traiter',
    [{ id:'pj-c1-1', nom:'TICKET_CAISSE_FOURNITURES.pdf',type:'recu',     addedAt:'2026-04-25T10:00:00Z' }]),

  mkTx('c-op2', '2026-04-25', 'Versement espèces client Diop',           380_000, 'caisse', 'Caisse principale', 'Siège', 'traite',
    [{ id:'pj-c2-1', nom:'RECU_CLIENT_DIOP_250426.pdf',  type:'recu',     addedAt:'2026-04-25T11:30:00Z' }],
    { accountCode:'411100', accountLabel:'Clients — ventes ordinaires',       libelle:'Versement espèces — M. Diop',       addedAt:'2026-04-25T12:00:00Z' }),

  mkTx('c-op3', '2026-04-24', 'Frais de déplacement commercial',         -85_000, 'caisse', 'Caisse principale', 'Siège', 'a_traiter',
    [{ id:'pj-c3-1', nom:'NOTES_FRAIS_COMMERCIAL_24AVR.pdf',type:'autre', addedAt:'2026-04-24T18:00:00Z' }]),

  mkTx('c-op4', '2026-04-24', 'Alimentation caisse (virement BICEC)',    500_000, 'caisse', 'Caisse principale', 'Siège', 'traite',
    [{ id:'pj-c4-1', nom:'ORDRE_ALIMENTATION_CAISSE.pdf',type:'virement', addedAt:'2026-04-24T08:00:00Z' }],
    { accountCode:'521100', accountLabel:'Banque BICEC — Compte courant',     libelle:'Alimentation caisse — 24/04/2026',  addedAt:'2026-04-24T08:30:00Z' }),

  mkTx('c-op5', '2026-04-23', 'Paiement prestataire nettoyage',          -75_000, 'caisse', 'Caisse principale', 'Siège', 'a_traiter',
    [{ id:'pj-c5-1', nom:'FACT_NETTOYAGE_AVRIL2026.pdf', type:'facture',  addedAt:'2026-04-23T09:00:00Z' }]),

  mkTx('c-op6', '2026-04-23', 'Encaissement vente comptoir',             210_000, 'caisse', 'Caisse principale', 'Siège', 'traite',
    [{ id:'pj-c6-1', nom:'TICKET_Z_CAISSE_230426.pdf',   type:'recu',     addedAt:'2026-04-23T18:00:00Z' }],
    { accountCode:'701000', accountLabel:'Ventes de marchandises',            libelle:'Ventes comptoir — 23/04/2026',      addedAt:'2026-04-23T18:30:00Z' }),

  // ── Petite caisse ─────────────────────────────────────────────────────────────
  mkTx('c-op7', '2026-04-25', 'Café et collations réunion',              -15_000, 'caisse', 'Petite caisse', 'Siège', 'a_traiter',
    [{ id:'pj-c7-1', nom:'TICKET_CAFE_250426.pdf',        type:'recu',    addedAt:'2026-04-25T14:00:00Z' }]),

  mkTx('c-op8', '2026-04-24', 'Alimentation petite caisse',             100_000, 'caisse', 'Petite caisse', 'Siège', 'traite',
    [{ id:'pj-c8-1', nom:'BON_ALIMENTATION_PETITE_CAISSE.pdf',type:'virement',addedAt:'2026-04-24T08:00:00Z' }],
    { accountCode:'571000', accountLabel:'Caisse principale (siège)',          libelle:'Alimentation petite caisse — 24/04', addedAt:'2026-04-24T08:15:00Z' }),

  mkTx('c-op9', '2026-04-23', 'Timbres et envoi courrier',               -8_500, 'caisse', 'Petite caisse', 'Siège', 'a_traiter',
    [{ id:'pj-c9-1', nom:'RECU_POSTE_230426.pdf',         type:'recu',    addedAt:'2026-04-23T11:00:00Z' }]),

  // ── MTN Mobile Money ──────────────────────────────────────────────────────────
  mkTx('m-op1', '2026-04-25', 'Paiement reçu — Fournisseur Ebobolo',  1_200_000, 'mobile-money', 'MTN Mobile Money', 'Siège', 'traite',
    [{ id:'pj-m1-1', nom:'FACTURE_EBOBOLO_0045.pdf',     type:'facture',  addedAt:'2026-04-25T09:30:00Z' }],
    { accountCode:'411200', accountLabel:'Clients — prestations de services', libelle:'Règlement Ebobolo SARL — avr. 2026', addedAt:'2026-04-25T10:00:00Z' }),

  mkTx('m-op2', '2026-04-25', 'Retrait agence MTN Akwa',               -500_000, 'mobile-money', 'MTN Mobile Money', 'Siège', 'a_traiter',
    [{ id:'pj-m2-1', nom:'RECU_RETRAIT_MTN_250426.pdf',  type:'recu',     addedAt:'2026-04-25T14:30:00Z' }]),

  mkTx('m-op3', '2026-04-24', 'Paiement reçu — Client Ayissi P.',       380_000, 'mobile-money', 'MTN Mobile Money', 'Siège', 'traite',
    [{ id:'pj-m3-1', nom:'RECU_AYISSI_240426.pdf',       type:'recu',     addedAt:'2026-04-24T16:00:00Z' }],
    { accountCode:'411100', accountLabel:'Clients — ventes ordinaires',       libelle:'Paiement M. Ayissi P. — 24/04',     addedAt:'2026-04-24T16:30:00Z' }),

  mkTx('m-op4', '2026-04-24', 'Transfert vers compte BICEC',          -1_000_000, 'mobile-money', 'MTN Mobile Money', 'Siège', 'a_traiter',
    [{ id:'pj-m4-1', nom:'ORDRE_TRANSFERT_MTN_BICEC.pdf',type:'virement', addedAt:'2026-04-24T09:00:00Z' }]),

  mkTx('m-op5', '2026-04-23', 'Paiement facture eau et électricité',    -98_000, 'mobile-money', 'MTN Mobile Money', 'Siège', 'a_traiter',
    [{ id:'pj-m5-1', nom:'FACTURE_AES_SONEL_AVR26.pdf',  type:'facture',  addedAt:'2026-04-23T08:00:00Z' }]),

  // ── Orange Money ─────────────────────────────────────────────────────────────
  mkTx('m-op6', '2026-04-25', 'Encaissement client Fouda L.',            650_000, 'mobile-money', 'Orange Money', 'Siège', 'traite',
    [{ id:'pj-m6-1', nom:'RECU_FOUDA_250426.pdf',        type:'recu',     addedAt:'2026-04-25T10:00:00Z' }],
    { accountCode:'411200', accountLabel:'Clients — prestations de services', libelle:'Règlement M. Fouda L. — 25/04',    addedAt:'2026-04-25T10:30:00Z' }),

  mkTx('m-op7', '2026-04-24', 'Paiement prestataire design',            -180_000, 'mobile-money', 'Orange Money', 'Siège', 'a_traiter',
    [{ id:'pj-m7-1', nom:'FACT_DESIGN_STUDIO_PIXEL.pdf', type:'facture',  addedAt:'2026-04-24T08:00:00Z' }]),

  mkTx('m-op8', '2026-04-22', 'Encaissement vente directe',              320_000, 'mobile-money', 'Orange Money', 'Siège', 'a_traiter',
    [{ id:'pj-m8-1', nom:'BON_VENTE_DIRECTE_220426.pdf', type:'recu',     addedAt:'2026-04-22T17:00:00Z' }]),
]

// ── Soldes par compte (source unique de vérité pour TresoreriePage, GestionOverview, Prévisions) ──

export interface AccountBalance {
  name:      string      // clé dans ACCOUNT_MAP (ex: 'Caisse principale')
  label:     string      // libellé d'affichage
  type:      SourceType
  agence:    string
  solde:     number
}

/** Soldes initiaux synchronisés avec les INITIAL des pages sources */
const INITIAL_BALANCES: AccountBalance[] = [
  { name: 'BICEC — Compte courant entreprise', label: 'BICEC — Compte courant',       type: 'banque',       agence: 'Siège',                       solde: 28_450_000 },
  { name: 'UBA Cameroun — Compte épargne',     label: 'UBA — Épargne',                type: 'banque',       agence: 'Siège',                       solde: 14_200_000 },
  { name: 'Ecobank — Compte devises (EUR)',     label: 'Ecobank — Devises (EUR)',       type: 'banque',       agence: 'Siège',                       solde:  5_600_000 },
  { name: 'Caisse principale',                 label: 'Caisse principale',             type: 'caisse',       agence: 'Siège',                       solde:  1_250_000 },
  { name: 'Petite caisse',                     label: 'Petite caisse',                 type: 'caisse',       agence: 'Siège',                       solde:     85_000 },
  { name: 'Caisse Agence',                     label: 'Caisse Agence Douala',          type: 'caisse',       agence: 'Agence Douala — Akwa',        solde:    420_000 },
  { name: 'Caisse Succursale',                 label: 'Caisse Succursale Yaoundé',     type: 'caisse',       agence: 'Succursale Yaoundé — Centre', solde:    310_000 },
  { name: 'MTN Mobile Money',                  label: 'MTN Mobile Money',              type: 'mobile-money', agence: 'Siège',                       solde:  3_850_000 },
  { name: 'Orange Money',                      label: 'Orange Money',                  type: 'mobile-money', agence: 'Siège',                       solde:  1_620_000 },
]

// ── Interface du contexte ─────────────────────────────────────────────────────

interface TresorerieContextValue {
  transactions: Transaction[]
  /** Soldes en temps réel par compte — suit les nouvelles opérations */
  balances:     AccountBalance[]
  /** Somme de tous les soldes (banques + caisses + mobile money) */
  totalSolde:   number
  /** Appelé depuis Caisses / Banques / MobileMoney lors d'une nouvelle opération */
  addTransaction(
    op:         { date: string; libelle: string; montant: number },
    sourceName: string,
    sourceType: SourceType,
    agence:     string,
    pieceName?: string,
  ): void
  /** Appelé depuis TransactionsPage lors de la validation d'une contrepartie */
  validateTransaction(id: string, contrepartie: Contrepartie, newPieces: PieceJustificative[]): void
}

const TresorerieContext = createContext<TresorerieContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function TresorerieProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(INIT_TRANSACTIONS)
  const [balances,     setBalances]     = useState<AccountBalance[]>(INITIAL_BALANCES)

  const totalSolde = balances.reduce((s, b) => s + b.solde, 0)

  function addTransaction(
    op:         { date: string; libelle: string; montant: number },
    sourceName: string,
    sourceType: SourceType,
    agence:     string,
    pieceName?: string,
  ) {
    const acc      = accountInfo(sourceName)
    const datePart = op.date.replace(/-/g, '').slice(2)
    const id       = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const ref      = `${acc.journalCode}-${op.date.slice(0, 4)}-${datePart}`

    const pieces: PieceJustificative[] = pieceName
      ? [{ id: `pj-${Date.now()}`, nom: pieceName, type: 'autre', addedAt: new Date().toISOString() }]
      : []

    const tx: Transaction = {
      id, ref,
      date:    op.date,
      libelle: op.libelle,
      montant: op.montant,
      sourceType, sourceName, agence,
      journalCode:            acc.journalCode,
      journalLabel:           acc.journalLabel,
      accountTresorerie:      acc.code,
      accountTresorerieLabel: acc.label,
      status: 'a_traiter',
      pieces,
    }

    // Mettre à jour le solde du compte concerné
    setBalances(prev => {
      const idx = prev.findIndex(b => b.name === sourceName)
      if (idx === -1) {
        // Compte non encore connu → l'ajouter dynamiquement
        return [...prev, { name: sourceName, label: sourceName, type: sourceType, agence, solde: op.montant }]
      }
      return prev.map((b, i) => i === idx ? { ...b, solde: b.solde + op.montant } : b)
    })

    // Insérer en tête de liste (plus récent d'abord)
    setTransactions(prev => [tx, ...prev])
  }

  function validateTransaction(id: string, contrepartie: Contrepartie, newPieces: PieceJustificative[]) {
    setTransactions(prev =>
      prev.map(tx =>
        tx.id === id
          ? { ...tx, status: 'traite', contrepartie, pieces: [...tx.pieces, ...newPieces] }
          : tx,
      ),
    )
  }

  return (
    <TresorerieContext.Provider value={{ transactions, balances, totalSolde, addTransaction, validateTransaction }}>
      {children}
    </TresorerieContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTresorerie() {
  const ctx = useContext(TresorerieContext)
  if (!ctx) throw new Error('useTresorerie doit être utilisé dans <TresorerieProvider>')
  return ctx
}
