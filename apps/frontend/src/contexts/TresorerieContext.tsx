import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
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

// ── Adaptateurs API → types locaux ────────────────────────────────────────────

const INITIAL_BALANCE_BY_NAME = new Map(INITIAL_BALANCES.map(b => [b.name, b]))

/** 'mobile_money' (backend) → 'mobile-money' (frontend) */
function apiSourceType(t: string): SourceType {
  return t === 'mobile_money' ? 'mobile-money' : (t as SourceType)
}

/** Convertit une entrée API en Transaction locale */
function apiEntryToTx(e: treasuryApi.ApiTreasuryEntry): Transaction {
  const sourceType = apiSourceType(e.sourceType)
  const pieces: PieceJustificative[] = e.pieceName
    ? [{ id: `pj-${e.id}`, nom: e.pieceName, type: 'autre', addedAt: e.createdAt }]
    : []
  return mkTx(
    e.id, e.date.slice(0, 10), e.libelle, Number(e.montant),
    sourceType, e.sourceName,
    e.agence?.nom ?? 'Siège',
    'a_traiter', pieces,
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
}

const TresorerieContext = createContext<TresorerieContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function TresorerieProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balances,     setBalances]     = useState<AccountBalance[]>([])

  const totalSolde = balances.reduce((s, b) => s + b.solde, 0)

  // ── Chargement initial depuis l'API ────────────────────────────────────────
  useEffect(() => {
    // Soldes agrégés par compte
    treasuryApi.getBalances()
      .then(data => {
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
      })
      .catch(() => setBalances([]))

    // Mouvements détaillés
    treasuryApi.listEntries({ limit: 500 })
      .then(({ items }) => {
        setTransactions(items.map(apiEntryToTx))
      })
      .catch(() => setTransactions([]))
  }, [])

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
