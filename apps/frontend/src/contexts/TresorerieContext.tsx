import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import * as treasuryApi from '@/services/treasuryApi'

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

// ── Soldes par compte (source unique de vérité pour TresoreriePage, GestionOverview, Prévisions) ──

export interface AccountBalance {
  name:      string      // clé dans ACCOUNT_MAP (ex: 'Caisse principale')
  label:     string      // libellé d'affichage
  type:      SourceType
  agence:    string
  solde:     number
}

// ── Adaptateurs API → types locaux ────────────────────────────────────────────

// Lookup vide par défaut — les soldes proviennent uniquement de l'API.
const INITIAL_BALANCE_BY_NAME = new Map<string, AccountBalance>()

/** 'mobile_money' (backend) → 'mobile-money' (frontend) */
function apiSourceType(t: string): SourceType {
  return t === 'mobile_money' ? 'mobile-money' : (t as SourceType)
}

/** Convertit une entrée API en Transaction locale */
function apiEntryToTx(e: treasuryApi.ApiTreasuryEntry): Transaction {
  const sourceType = apiSourceType(e.sourceType)
  const basePieces: PieceJustificative[] = e.pieceName
    ? [{ id: `pj-${e.id}`, nom: e.pieceName, type: 'autre', addedAt: e.createdAt }]
    : []
  const extra: PieceJustificative[] = (e.extraPieces ?? []).map(p => ({
    id: p.id, nom: p.nom, type: p.type, addedAt: p.addedAt,
  }))
  return mkTx(
    e.id, e.date.slice(0, 10), e.libelle, Number(e.montant),
    sourceType, e.sourceName,
    e.agence?.nom ?? 'Siège',
    e.status, [...basePieces, ...extra],
    e.contrepartie ?? undefined,
  )
}

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
  /** Force le rechargement des soldes + transactions depuis l'API.
   *  À appeler par les pages Banques / Caisses / Mobile Money après la
   *  création d'un nouveau compte (avec son solde initial) pour que la
   *  trésorerie consolidée (Accueil + Vue d'ensemble) reflète l'apport. */
  refresh(): Promise<void>
}

const TresorerieContext = createContext<TresorerieContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function TresorerieProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balances,     setBalances]     = useState<AccountBalance[]>([])

  const totalSolde = balances.reduce((s, b) => s + b.solde, 0)

  // ── Chargement / rechargement depuis l'API ─────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const data = await treasuryApi.getBalances()
      const newBal: AccountBalance[] = data.map(b => {
        const existing = INITIAL_BALANCE_BY_NAME.get(b.sourceName)
        const acc      = accountInfo(b.sourceName)
        return {
          name:   b.sourceName,
          label:  (acc.label !== b.sourceName ? acc.label : null) ?? existing?.label ?? b.sourceName,
          type:   apiSourceType(b.sourceType),
          agence: existing?.agence ?? 'Siège',
          solde:  b.solde,
        }
      })
      setBalances(newBal)
    } catch {
      setBalances([])
    }
    try {
      const { items } = await treasuryApi.listEntries({ limit: 500 })
      setTransactions(items.map(apiEntryToTx))
    } catch {
      setTransactions([])
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

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
        return [...prev, { name: sourceName, label: sourceName, type: sourceType, agence, solde: op.montant }]
      }
      return prev.map((b, i) => i === idx ? { ...b, solde: b.solde + op.montant } : b)
    })

    // Insérer en tête de liste (plus récent d'abord)
    setTransactions(prev => [tx, ...prev])

    // Persister en base (background)
    const apiType = sourceType === 'mobile-money' ? 'mobile_money' : sourceType
    treasuryApi.createEntry({
      date:      op.date,
      libelle:   op.libelle,
      montant:   op.montant,
      sourceType: apiType as treasuryApi.TreasurySourceType,
      sourceName,
      ...(pieceName ? { pieceName } : {}),
    }).catch(err => console.error('[treasury] addTransaction API error', err))
  }

  function validateTransaction(id: string, contrepartie: Contrepartie, newPieces: PieceJustificative[]) {
    // Mise à jour optimiste locale
    setTransactions(prev =>
      prev.map(tx =>
        tx.id === id
          ? { ...tx, status: 'traite', contrepartie, pieces: [...tx.pieces, ...newPieces] }
          : tx,
      ),
    )
    // Persistance en base — status + contrepartie + nouvelles pièces
    treasuryApi.updateEntry(id, {
      status:       'traite',
      contrepartie,
      extraPieces:  newPieces.map(p => ({
        id: p.id, nom: p.nom, type: p.type, addedAt: p.addedAt,
      })),
    }).catch(err => console.error('[treasury] validateTransaction API error', err))
  }

  return (
    <TresorerieContext.Provider value={{ transactions, balances, totalSolde, addTransaction, validateTransaction, refresh }}>
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
