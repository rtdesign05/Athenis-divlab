import { useState, useMemo, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CompteCombobox, useAllComptes, normalizeCompteCode } from '@/components/accounting/CompteCombobox'
import { useCurrency } from '@/hooks/useCurrency'
import { formatDate } from '@/shared/utils/date'
import { accountingApi } from '@/services/accountingApi'
import { useInvalidateAccounting } from '@/hooks/useFiscalYear'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion } from '@/contexts/GestionContext'
import {
  useTresorerie,
  type Transaction,
  type Contrepartie,
  type PieceJustificative,
  type SourceType,
  type TxStatus,
  type PieceType,
} from '@/contexts/TresorerieContext'

// (Plans statiques supprimés — CompteCombobox charge le plan via API)

// ── Métadonnées visuelles par source ──────────────────────────────────────────

const SOURCE_META: Record<SourceType, { label: string; icon: string; bg: string }> = {
  'banque':       { label: 'Banque',        icon: '🏦', bg: 'bg-blue-50 text-blue-700 ring-blue-200'      },
  'caisse':       { label: 'Caisse',        icon: '💵', bg: 'bg-amber-50 text-amber-700 ring-amber-200'   },
  'mobile-money': { label: 'Mobile Money', icon: '📱', bg: 'bg-purple-50 text-purple-700 ring-purple-200' },
}

const PIECE_TYPE_LABELS: Record<PieceType, string> = {
  facture:      'Facture', recu: 'Reçu', bon_commande: 'Bon de commande',
  virement:     'Ordre de virement', contrat: 'Contrat', autre: 'Autre',
}

const PIECE_TYPE_ICONS: Record<PieceType, string> = {
  facture:'🧾', recu:'📜', bon_commande:'📋', virement:'💸', contrat:'📑', autre:'📎',
}

type SortKey = 'date' | 'montant' | 'sourceName' | 'status'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300 text-[10px]">↕</span>
  return <span className="ml-1 text-green-600 text-[10px]">{dir === 'asc' ? '↑' : '↓'}</span>
}

// ── Badge statut ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TxStatus }) {
  if (status === 'traite') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700 ring-1 ring-inset ring-green-200">
        <span className="text-[8px]">●</span> Traité
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
      <span className="text-[8px]">○</span> À traiter
    </span>
  )
}

// ── Panneau droit — Section PIÈCE (moitié haute) ──────────────────────────────

function PieceSection({ tx }: { tx: Transaction }) {
  const { fmt } = useCurrency()
  const amount  = Math.abs(tx.montant)

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {/* Métadonnées */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <p className="text-gray-400 mb-0.5">Référence</p>
            <p className="font-mono font-medium text-gray-800">{tx.ref}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">Date</p>
            <p className="font-medium text-gray-800">{formatDate(tx.date)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-400 mb-0.5">Libellé</p>
            <p className="font-medium text-gray-800">{tx.libelle}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">Montant</p>
            <p className={`font-bold tabular-nums ${tx.montant >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {tx.montant >= 0 ? '+' : '−'}{fmt(amount)}
            </p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">Journal</p>
            <p className="font-medium text-gray-800">{tx.journalCode} — {tx.journalLabel}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-400 mb-0.5">Compte trésorerie</p>
            <p className="font-mono text-gray-700 text-[11px]">{tx.accountTresorerie} — {tx.accountTresorerieLabel}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">Source</p>
            <p className="text-gray-700">{tx.sourceName}</p>
          </div>
        </div>
      </div>

      {/* Pièces existantes */}
      {tx.pieces.length > 0 ? (
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Pièces justificatives ({tx.pieces.length})
          </p>
          <div className="space-y-1.5">
            {tx.pieces.map(pj => (
              <div key={pj.id} className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                <span className="text-sm">{PIECE_TYPE_ICONS[pj.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{pj.nom}</p>
                  <p className="text-[10px] text-gray-400">{PIECE_TYPE_LABELS[pj.type]} · {new Date(pj.addedAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <button className="text-xs text-blue-600 hover:underline shrink-0">Voir</button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 py-6 flex flex-col items-center justify-center text-gray-400">
          <span className="text-2xl mb-1">📎</span>
          <p className="text-xs">Aucune pièce justificative</p>
        </div>
      )}
    </div>
  )
}

// ── Panneau droit — Section TRAITEMENT : À valider ────────────────────────────

interface TraitementValidateProps {
  tx:           Transaction
  fiscalYearId: string | null
  onValidate:   (txId: string, contrepartie: Contrepartie, newPieces: PieceJustificative[]) => void
}

type AccountOption = { code: string; label: string }

function TraitementValidate({ tx, fiscalYearId, onValidate }: TraitementValidateProps) {
  const { fmt }              = useCurrency()
  const invalidateAccounting = useInvalidateAccounting()
  const { addFournisseur, addClient } = useGestion()
  const qc = useQueryClient()

  const isEncaissement = tx.montant > 0
  const amount         = Math.abs(tx.montant)

  // ── Lignes confirmées ─────────────────────────────────────────────────────
  type CLine = { id: string; account: AccountOption; montant: number }

  const [lines,     setLines]     = useState<CLine[]>([])
  const [libelle,   setLibelle]   = useState(tx.libelle)
  const [newPieces, setNewPieces] = useState<PieceJustificative[]>([])
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // ── Formulaire de saisie en cours ─────────────────────────────────────────
  const [curAccount,  setCurAccount]  = useState<AccountOption | null>(null)
  const [curQuery,    setCurQuery]    = useState('')
  const [curMontant,  setCurMontant]  = useState(amount)
  const [formError,   setFormError]   = useState('')

  // ── Création de compte inline ─────────────────────────────────────────────
  const { comptes } = useAllComptes()
  const [showCreate,       setShowCreate]       = useState(false)
  const [createLabel,      setCreateLabel]      = useState('')
  const [createLabelError, setCreateLabelError] = useState(false)

  // Code normalisé à afficher / utiliser pour la création
  const normalizedCurQuery = normalizeCompteCode(curQuery.trim())
  const exactMatch   = comptes.some(c => c.code === normalizedCurQuery)
  const canCreateCpt = curQuery.trim().length >= 2 && !curAccount && !exactMatch && !showCreate

  function typeFromCode(code: string) {
    if (/^41/.test(code)) return 'ACTIF' as const
    if (/^4/.test(code))  return 'PASSIF' as const
    if (/^7/.test(code))  return 'PRODUIT' as const
    if (/^[123]/.test(code)) return 'ACTIF' as const
    return 'CHARGE' as const
  }

  const createCompteMutation = useMutation({
    mutationFn: () => accountingApi.addCompte({
      numero:   normalizedCurQuery,     // ← code normalisé (9 chiffres si numérique)
      intitule: createLabel.trim(),
      classe:   parseInt(normalizedCurQuery[0] ?? '4') || 4,
      type:     typeFromCode(normalizedCurQuery),
      isSystem: false,
    }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['comptes'] })
      const account: AccountOption = { code: data.numero, label: data.intitule }
      // Enregistrement automatique tiers
      if (/^40/.test(data.numero))
        addFournisseur({ nom: data.intitule, categorie: 'Autre', email: '', telephone: '', adresse: '', agence: 'Siège', notes: '', compte: data.numero })
      if (/^41/.test(data.numero))
        addClient({ nom: data.intitule, type: 'entreprise', email: '', telephone: '', adresse: '', agence: 'Siège', notes: '', compte: data.numero })
      setCurAccount(account)
      setCurQuery(data.numero)
      setShowCreate(false)
      setCreateLabel('')
      setCreateLabelError(false)
      setFormError('')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? 'Erreur lors de la création du compte.')
    },
  })

  function handleCreateCompte() {
    if (!createLabel.trim()) { setCreateLabelError(true); return }
    setCreateLabelError(false)
    createCompteMutation.mutate()
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalLines = lines.reduce((s, l) => s + l.montant, 0)
  const remaining  = parseFloat((amount - totalLines).toFixed(2))
  const isBalanced = Math.abs(remaining) < 0.01

  // ── Supprimer une ligne confirmée → recalcule le solde ────────────────────
  function removeLine(id: string) {
    setLines(prev => {
      const next         = prev.filter(l => l.id !== id)
      const newTotal     = next.reduce((s, l) => s + l.montant, 0)
      const newRemaining = parseFloat((amount - newTotal).toFixed(2))
      setCurMontant(Math.max(0, newRemaining))
      return next
    })
  }

  // ── Confirmer la ligne en cours ───────────────────────────────────────────
  function handleAddLine() {
    if (!curAccount)             { setFormError('Sélectionnez un compte.');                             return }
    if (curMontant <= 0)         { setFormError('Le montant doit être supérieur à 0.');                  return }
    if (curMontant > remaining + 0.01) {
      setFormError(`Le montant dépasse le solde restant (${fmt(remaining)}).`); return
    }
    setFormError('')
    setLines(prev => [...prev, { id: `l${Date.now()}`, account: curAccount, montant: curMontant }])
    const afterAdd = parseFloat((remaining - curMontant).toFixed(2))
    setCurAccount(null)
    setCurQuery('')
    setCurMontant(Math.max(0, afterAdd))
    setShowCreate(false)
    setCreateLabel('')
  }

  function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const added: PieceJustificative[] = Array.from(e.target.files ?? []).map(f => ({
      id: `pj-new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, nom: f.name, type: 'autre' as PieceType, addedAt: new Date().toISOString(),
    }))
    setNewPieces(prev => [...prev, ...added])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleValidate() {
    if (lines.length === 0) { setError('Saisissez au moins une contrepartie.'); return }
    if (!isBalanced) { setError(`Solde restant : ${fmt(remaining)}. Ajoutez une ligne pour équilibrer.`); return }
    setSaving(true); setError(null)
    try {
      if (fiscalYearId) {
        const journalLines = isEncaissement
          ? [
              { compte: tx.accountTresorerie, libelle, intituleCompte: tx.accountTresorerieLabel, debit: amount, credit: 0 },
              ...lines.map(l => ({ compte: l.account.code, libelle, intituleCompte: l.account.label, debit: 0, credit: l.montant })),
            ]
          : [
              ...lines.map(l => ({ compte: l.account.code, libelle, intituleCompte: l.account.label, debit: l.montant, credit: 0 })),
              { compte: tx.accountTresorerie, libelle, intituleCompte: tx.accountTresorerieLabel, debit: 0, credit: amount },
            ]
        await accountingApi.createJournalEntryBatch({ fiscalYearId, date: tx.date, journal: tx.journalCode, reference: tx.ref, lines: journalLines })
        invalidateAccounting()
      }
      const first = lines[0]
      onValidate(tx.id, { accountCode: first?.account.code ?? '', accountLabel: first?.account.label ?? '', libelle, addedAt: new Date().toISOString() }, newPieces)
    } catch {
      setError("Erreur lors de la création de l'écriture comptable. Vérifiez l'exercice fiscal ouvert.")
    } finally { setSaving(false) }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* ── En-tête : montant + solde restant ── */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Transaction</p>
            <p className={`text-sm font-bold tabular-nums ${tx.montant >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {tx.montant >= 0 ? '+' : '−'}{fmt(amount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Reste à ventiler</p>
            <p className={`text-sm font-bold tabular-nums ${isBalanced ? 'text-green-600' : 'text-amber-600'}`}>
              {isBalanced ? '✓ Équilibré' : fmt(remaining)}
            </p>
          </div>
        </div>

        {/* Libellé global */}
        <div className="px-4 pt-3 pb-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Libellé de l'écriture</label>
          <input value={libelle} onChange={e => setLibelle(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-forest-500/30" />
        </div>

        {/* ── Lignes confirmées ── */}
        <div className="px-4 pb-2">
          {lines.length > 0 && (
            <div className="rounded-xl border border-gray-200 overflow-hidden mb-3">
              {lines.map((l, idx) => (
                <div key={l.id} className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 last:border-0 bg-white hover:bg-gray-50/50">
                  <span className="text-[10px] text-gray-400 w-4 shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-semibold text-gray-800">{l.account.code}</p>
                    <p className="text-[10px] text-gray-500 truncate">{l.account.label}</p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-gray-700 tabular-nums shrink-0">{fmt(l.montant)}</span>
                  <button
                    onClick={() => removeLine(l.id)}
                    className="shrink-0 text-gray-300 hover:text-red-400 text-xs leading-none ml-1"
                    title="Supprimer cette ligne"
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          {/* ── Formulaire saisie ligne suivante ── */}
          {!isBalanced && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-3 space-y-2 bg-gray-50/40">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                {lines.length === 0 ? 'Contrepartie' : `Ligne ${lines.length + 1}`}
                {lines.length > 0 && (
                  <span className="ml-2 normal-case font-normal text-amber-600">— Reste {fmt(remaining)}</span>
                )}
              </p>

              {/* Compte */}
              <CompteCombobox
                value={curQuery}
                disableCreate
                onChange={v => {
                  setCurQuery(v)
                  setCurAccount(prev => (prev?.code === v ? prev : null))
                  setShowCreate(false)
                  setCreateLabel('')
                  setFormError('')
                }}
                onSelect={c => {
                  const account: AccountOption = { code: c.code, label: c.label }
                  if (/^40/.test(c.code) && c.isCustom)
                    addFournisseur({ nom: c.label, categorie: 'Autre', email: '', telephone: '', adresse: '', agence: 'Siège', notes: '', compte: c.code })
                  if (/^41/.test(c.code) && c.isCustom)
                    addClient({ nom: c.label, type: 'entreprise', email: '', telephone: '', adresse: '', agence: 'Siège', notes: '', compte: c.code })
                  setCurAccount(account)
                  setCurQuery(c.code)
                  setShowCreate(false)
                  setFormError('')
                }}
                placeholder="Code ou intitulé du compte…"
                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-forest-500/30"
              />

              {/* Bouton "Créer ce compte" — visible quand aucune correspondance */}
              {canCreateCpt && (
                <button
                  type="button"
                  onClick={() => { setShowCreate(true); setCreateLabel('') }}
                  className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-[#1b4332]/40 bg-green-50/30 text-xs text-[#1b4332] hover:bg-green-50 transition-colors flex items-center gap-2"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded border border-[#1b4332]/40 text-sm leading-none shrink-0">+</span>
                  Créer le compte <span className="font-mono font-semibold">{normalizedCurQuery}</span>
                </button>
              )}

              {/* Formulaire de création de compte inline */}
              {showCreate && (
                <div className="rounded-lg border border-[#1b4332]/25 bg-green-50/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[#1b4332]">
                      Nouveau compte · <span className="font-mono">{normalizedCurQuery}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => { setShowCreate(false); setCreateLabel('') }}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >✕</button>
                  </div>
                  <input
                    autoFocus
                    type="text"
                    value={createLabel}
                    onChange={e => { setCreateLabel(e.target.value); setCreateLabelError(false) }}
                    onKeyDown={e => {
                      if (e.key === 'Enter')  { e.preventDefault(); handleCreateCompte() }
                      if (e.key === 'Escape') { setShowCreate(false); setCreateLabel('') }
                    }}
                    placeholder="Intitulé du compte (ex : Achats de marchandises)"
                    className={`w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30 ${
                      createLabelError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                    }`}
                  />
                  {createLabelError && (
                    <p className="text-[10px] text-red-500">L'intitulé est obligatoire.</p>
                  )}
                  {createCompteMutation.isError && (
                    <p className="text-[10px] text-red-500">{formError || 'Erreur lors de la création.'}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowCreate(false); setCreateLabel('') }}
                      className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateCompte}
                      disabled={createCompteMutation.isPending}
                      className="flex-1 rounded-lg bg-[#1b4332] py-1.5 text-xs font-semibold text-white hover:bg-[#2d6a4f] disabled:opacity-50 transition-colors"
                    >
                      {createCompteMutation.isPending ? 'Création…' : 'Créer'}
                    </button>
                  </div>
                </div>
              )}

              {/* Compte sélectionné / créé */}
              {curAccount && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5">
                  <span className="font-mono text-xs font-semibold text-blue-800">{curAccount.code}</span>
                  <span className="text-xs text-blue-600 truncate flex-1">{curAccount.label}</span>
                  <button
                    type="button"
                    onClick={() => { setCurAccount(null); setCurQuery('') }}
                    className="text-blue-300 hover:text-blue-500 text-xs shrink-0"
                  >✕</button>
                </div>
              )}

              {/* Montant + bouton Ajouter */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={curMontant}
                  onChange={e => { setCurMontant(parseFloat(e.target.value) || 0); setFormError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddLine() } }}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-forest-500/30"
                />
                <button
                  type="button"
                  onClick={handleAddLine}
                  disabled={!curAccount || curMontant <= 0}
                  className="shrink-0 rounded-lg bg-[#1b4332] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2d6a4f] disabled:opacity-40 transition-colors"
                >
                  + Ajouter
                </button>
              </div>

              {formError && !createCompteMutation.isError && (
                <p className="text-[10px] text-red-500">{formError}</p>
              )}
            </div>
          )}

          {/* Bandeau équilibré */}
          {isBalanced && lines.length > 0 && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-2">
              <span className="text-green-600 text-sm">✓</span>
              <div>
                <p className="text-xs font-semibold text-green-700">Contrepartie équilibrée</p>
                <p className="text-[10px] text-green-600">{lines.length} ligne{lines.length > 1 ? 's' : ''} · {fmt(amount)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Pièces justificatives */}
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">Joindre des pièces</p>
          {newPieces.length > 0 && (
            <div className="space-y-1 mb-2">
              {newPieces.map(pj => (
                <div key={pj.id} className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5">
                  <span className="text-sm">📎</span>
                  <p className="text-xs text-blue-800 flex-1 truncate">{pj.nom}</p>
                  <button onClick={() => setNewPieces(p => p.filter(x => x.id !== pj.id))} className="text-blue-400 hover:text-blue-600 text-xs">✕</button>
                </div>
              ))}
            </div>
          )}
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileAdd} accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" />
          <button onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border-2 border-dashed border-gray-200 px-3 py-2 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors text-center">
            📎 Glisser-déposer ou cliquer (PDF, image, Excel…)
          </button>
        </div>
      </div>

      {/* Footer épinglé */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-100 bg-white">
        {!fiscalYearId && (
          <div className="mb-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
            ⚠️ Aucun exercice fiscal ouvert. L'écriture sera enregistrée localement.
          </div>
        )}
        {error && <div className="mb-2 text-xs text-red-600">{error}</div>}
        <button onClick={handleValidate} disabled={saving || !isBalanced || lines.length === 0}
          className="w-full rounded-lg bg-forest-900 px-4 py-2 text-xs font-semibold text-white hover:bg-forest-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
          {saving ? <><span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" /> Enregistrement…</> : '✓ Valider et reverser au journal'}
        </button>
      </div>

    </div>
  )
}

// ── Panneau droit — Section TRAITEMENT : Vue (traité) ─────────────────────────

function TraitementView({ tx }: { tx: Transaction }) {
  const { fmt }        = useCurrency()
  const isEncaissement = tx.montant > 0
  const amount         = Math.abs(tx.montant)

  if (!tx.contrepartie) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-gray-400 px-4 py-6">
        <span className="text-2xl mb-1">📊</span>
        <p className="text-xs">Aucune écriture comptable enregistrée</p>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">

      {/* Écriture générée */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-700 mb-2">Écriture comptable générée</p>
        <div className="rounded-lg border border-gray-200 overflow-hidden mb-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Compte</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Libellé</th>
                <th className="px-2 py-1.5 text-right font-medium text-gray-500">Débit</th>
                <th className="px-2 py-1.5 text-right font-medium text-gray-500">Crédit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isEncaissement ? (
                <>
                  <tr>
                    <td className="px-2 py-1.5 font-mono text-gray-700">{tx.accountTresorerie}</td>
                    <td className="px-2 py-1.5 text-gray-600 truncate">{tx.accountTresorerieLabel}</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-green-700">{fmt(amount)}</td>
                    <td className="px-2 py-1.5 text-right text-gray-400">—</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5 font-mono text-gray-700">{tx.contrepartie.accountCode}</td>
                    <td className="px-2 py-1.5 text-gray-600 truncate">{tx.contrepartie.accountLabel}</td>
                    <td className="px-2 py-1.5 text-right text-gray-400">—</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-red-600">{fmt(amount)}</td>
                  </tr>
                </>
              ) : (
                <>
                  <tr>
                    <td className="px-2 py-1.5 font-mono text-gray-700">{tx.contrepartie.accountCode}</td>
                    <td className="px-2 py-1.5 text-gray-600 truncate">{tx.contrepartie.accountLabel}</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-green-700">{fmt(amount)}</td>
                    <td className="px-2 py-1.5 text-right text-gray-400">—</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5 font-mono text-gray-700">{tx.accountTresorerie}</td>
                    <td className="px-2 py-1.5 text-gray-600 truncate">{tx.accountTresorerieLabel}</td>
                    <td className="px-2 py-1.5 text-right text-gray-400">—</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-red-600">{fmt(amount)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-gray-400">
          Reversé au journal le {new Date(tx.contrepartie.addedAt).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>

      {/* Détail contrepartie */}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-gray-700 mb-2">Contrepartie</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex gap-2">
            <span className="text-gray-400 w-14 shrink-0">Compte</span>
            <span className="font-mono text-gray-700">{tx.contrepartie.accountCode} — {tx.contrepartie.accountLabel}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-14 shrink-0">Libellé</span>
            <span className="text-gray-700">{tx.contrepartie.libelle}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function TransactionsPage() {
  const { fmt }  = useCurrency()
  const { user } = useAuth()

  // Restriction agence — identique à BanquesPage / CaissesPage / MobileMoneyPage
  const agenceNom = user?.agenceNom ?? null

  // Transactions partagées via TresorerieContext
  const { transactions: allTransactions, validateTransaction } = useTresorerie()

  // Filtrer par agence dès la source (prioritaire sur tous les autres filtres)
  const transactions = useMemo(
    () => agenceNom ? allTransactions.filter(t => t.agence === agenceNom) : allTransactions,
    [allTransactions, agenceNom],
  )

  // Exercice fiscal ouvert
  const [fiscalYearId, setFiscalYearId] = useState<string | null>(null)
  useEffect(() => {
    accountingApi.listFiscalYears()
      .then(years => {
        const open = years.find(y => y.status === 'OPEN')
        if (open) setFiscalYearId(open.id)
      })
      .catch(() => {/* pas d'exercice ouvert — mode dégradé */})
  }, [])

  // Panneau latéral : on stocke l'id pour toujours lire le dernier état de la tx
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)
  const selectedTx = useMemo(
    () => selectedTxId ? (transactions.find(t => t.id === selectedTxId) ?? null) : null,
    [selectedTxId, transactions],
  )

  function openPanel(tx: Transaction) {
    setSelectedTxId(tx.id)
  }

  function handleValidate(txId: string, contrepartie: Contrepartie, newPieces: PieceJustificative[]) {
    validateTransaction(txId, contrepartie, newPieces)
    // Le panneau reste ouvert — il bascule automatiquement sur TraitementView
  }

  // Filtres
  const [search,       setSearch]       = useState('')
  const [typeFilter,   setTypeFilter]   = useState<SourceType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<TxStatus | 'all'>('all')
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')

  // Tri
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const rows = useMemo(() => {
    let list = transactions
    if (typeFilter !== 'all')   list = list.filter(t => t.sourceType === typeFilter)
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter)
    if (dateFrom) list = list.filter(t => t.date >= dateFrom)
    if (dateTo)   list = list.filter(t => t.date <= dateTo)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(t =>
        t.libelle.toLowerCase().includes(q) ||
        t.sourceName.toLowerCase().includes(q) ||
        t.ref.toLowerCase().includes(q) ||
        t.accountTresorerie.includes(q),
      )
    }
    return [...list].sort((a, b) => {
      let cmp = 0
      if      (sortKey === 'date')       cmp = a.date.localeCompare(b.date)
      else if (sortKey === 'montant')    cmp = a.montant - b.montant
      else if (sortKey === 'sourceName') cmp = a.sourceName.localeCompare(b.sourceName)
      else if (sortKey === 'status')     cmp = a.status.localeCompare(b.status)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [transactions, typeFilter, statusFilter, dateFrom, dateTo, search, sortKey, sortDir])

  // Statistiques
  const stats = useMemo(() => {
    const totals: Record<SourceType, { credit: number; debit: number }> = {
      'banque': { credit: 0, debit: 0 }, 'caisse': { credit: 0, debit: 0 }, 'mobile-money': { credit: 0, debit: 0 },
    }
    let traite = 0, aTraiter = 0
    for (const t of transactions) {
      if (t.montant > 0) totals[t.sourceType].credit += t.montant
      else               totals[t.sourceType].debit  += Math.abs(t.montant)
      if (t.status === 'traite') traite++; else aTraiter++
    }
    const globalCredit = Object.values(totals).reduce((s, v) => s + v.credit, 0)
    const globalDebit  = Object.values(totals).reduce((s, v) => s + v.debit, 0)
    return { totals, globalCredit, globalDebit, globalNet: globalCredit - globalDebit, traite, aTraiter }
  }, [transactions])

  const hasFilters = typeFilter !== 'all' || statusFilter !== 'all' || search || dateFrom || dateTo

  // ── Navigation entre transactions ────────────────────────────────────────
  const currentIndex = selectedTxId ? rows.findIndex(t => t.id === selectedTxId) : -1
  const prevTx = currentIndex > 0              ? rows[currentIndex - 1] : null
  const nextTx = currentIndex < rows.length - 1 ? rows[currentIndex + 1] : null

  // Flèches clavier ← →
  useEffect(() => {
    if (!selectedTxId) return
    function onKey(e: KeyboardEvent) {
      // Ne pas capturer si le focus est dans un input / textarea / select
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.key === 'ArrowLeft'  && prevTx) setSelectedTxId(prevTx.id)
      if (e.key === 'ArrowRight' && nextTx) setSelectedTxId(nextTx.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedTxId, prevTx, nextTx])

  // ── Vue pleine page : transaction sélectionnée ────────────────────────────
  if (selectedTx) {
    const sourceMeta = SOURCE_META[selectedTx.sourceType]
    return (
      <div className="h-full flex flex-col gap-3">

        {/* ── Barre de navigation ── */}
        <div className="shrink-0 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">

          {/* Retour */}
          <button
            onClick={() => setSelectedTxId(null)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          >
            ← Liste
          </button>

          <span className="text-gray-200 shrink-0">|</span>

          {/* Précédent */}
          <button
            onClick={() => prevTx && setSelectedTxId(prevTx.id)}
            disabled={!prevTx}
            title={prevTx ? `← ${prevTx.ref} — ${prevTx.libelle}` : undefined}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            ‹ Préc.
          </button>

          {/* Indicateur de position */}
          <span className="text-xs text-gray-400 tabular-nums shrink-0">
            {currentIndex + 1} / {rows.length}
          </span>

          {/* Suivant */}
          <button
            onClick={() => nextTx && setSelectedTxId(nextTx.id)}
            disabled={!nextTx}
            title={nextTx ? `${nextTx.ref} — ${nextTx.libelle} →` : undefined}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            Suiv. ›
          </button>

          <span className="text-gray-200 shrink-0">|</span>

          {/* Infos transaction courante */}
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset shrink-0 ${sourceMeta.bg}`}>
            {sourceMeta.icon} {sourceMeta.label}
          </span>
          <span className="font-mono text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">{selectedTx.ref}</span>
          <span className="text-xs text-gray-600 truncate flex-1">{selectedTx.libelle}</span>
          <StatusBadge status={selectedTx.status} />

          {/* Astuce clavier */}
          <span className="hidden lg:inline-flex items-center gap-1 text-[10px] text-gray-300 shrink-0">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono">←</kbd>
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono">→</kbd>
          </span>
        </div>

        {/* ── Deux panneaux égaux ── */}
        <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">

          {/* Gauche — PIÈCE */}
          <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white flex flex-col overflow-hidden">
            <div className="shrink-0 px-4 py-2 bg-blue-50/80 border-b border-blue-100 flex items-center gap-2">
              <span className="text-sm">📄</span>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Pièce</p>
            </div>
            <PieceSection tx={selectedTx} />
          </div>

          {/* Droite — TRAITEMENT */}
          <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white flex flex-col overflow-hidden">
            <div className="shrink-0 px-4 py-2 bg-amber-50/80 border-b border-amber-100 flex items-center gap-2">
              <span className="text-sm">⚙️</span>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Traitement</p>
            </div>
            {selectedTx.status === 'a_traiter'
              ? <TraitementValidate key={selectedTx.id} tx={selectedTx} fiscalYearId={fiscalYearId} onValidate={handleValidate} />
              : <TraitementView tx={selectedTx} />
            }
          </div>

        </div>
      </div>
    )
  }

  // ── Vue liste : tableau des transactions ─────────────────────────────────
  return (
    <div className="h-full flex flex-col gap-4">

      {/* ── En-tête ── */}
      <div className="shrink-0 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Transactions de trésorerie</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Banques · Caisses · Mobile Money — cliquer sur une ligne pour ouvrir la pièce et le traitement
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 px-2.5 py-1 font-semibold">
            {stats.aTraiter} à traiter
          </span>
          <span className="rounded-full bg-green-50 text-green-700 ring-1 ring-green-200 px-2.5 py-1 font-semibold">
            {stats.traite} traité{stats.traite > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Bandeau vue restreinte ── */}
      {agenceNom && (
        <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center gap-3">
          <span className="text-sm">🔒</span>
          <p className="text-xs text-amber-800">
            Vue restreinte — seules les transactions de l'agence <strong>{agenceNom}</strong> sont affichées.
          </p>
        </div>
      )}

      {/* ── Cartes résumé ── */}
      <div className="shrink-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(Object.entries(stats.totals) as [SourceType, { credit: number; debit: number }][]).map(([type, v]) => {
          const meta = SOURCE_META[type]
          const net  = v.credit - v.debit
          return (
            <div key={type} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span>{meta.icon}</span>
                <p className="text-xs font-medium text-gray-500">{meta.label}</p>
              </div>
              <p className={`text-lg font-bold tabular-nums ${net >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {net >= 0 ? '+' : ''}{fmt(net)}
              </p>
              <p className="mt-0.5 text-xs text-gray-400 tabular-nums">
                <span className="text-green-600">+{fmt(v.credit)}</span> / <span className="text-red-500">−{fmt(v.debit)}</span>
              </p>
            </div>
          )
        })}
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-1.5 mb-1"><span>📊</span><p className="text-xs font-medium text-gray-500">Net global</p></div>
          <p className={`text-lg font-bold tabular-nums ${stats.globalNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {stats.globalNet >= 0 ? '+' : ''}{fmt(stats.globalNet)}
          </p>
          <p className="mt-0.5 text-xs text-gray-400 tabular-nums">
            <span className="text-green-600">+{fmt(stats.globalCredit)}</span> / <span className="text-red-500">−{fmt(stats.globalDebit)}</span>
          </p>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="shrink-0 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Référence, libellé, compte…"
            className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
        </div>

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as SourceType | 'all')}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
          <option value="all">Tous les types</option>
          <option value="banque">🏦 Banque</option>
          <option value="caisse">💵 Caisse</option>
          <option value="mobile-money">📱 Mobile Money</option>
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as TxStatus | 'all')}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
          <option value="all">Tous les statuts</option>
          <option value="a_traiter">○ À traiter</option>
          <option value="traite">● Traité</option>
        </select>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">Du</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">Au</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
        </div>

        {hasFilters && (
          <button onClick={() => { setTypeFilter('all'); setStatusFilter('all'); setSearch(''); setDateFrom(''); setDateTo('') }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
            Réinitialiser
          </button>
        )}
      </div>

      {/* ── Tableau des transactions ── */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400">
              <span className="text-3xl mb-2">🔍</span>
              <p className="text-sm font-medium">Aucune transaction trouvée</p>
              <p className="text-xs mt-1">Modifiez les filtres pour élargir la recherche</p>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                <tr>
                  <th onClick={() => toggleSort('date')} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap">
                    Date <SortIcon active={sortKey === 'date'} dir={sortDir} />
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Réf.</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Type</th>
                  <th onClick={() => toggleSort('sourceName')} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none">
                    Compte <SortIcon active={sortKey === 'sourceName'} dir={sortDir} />
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[160px]">Libellé</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">PJ</th>
                  <th onClick={() => toggleSort('status')} className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap">
                    Statut <SortIcon active={sortKey === 'status'} dir={sortDir} />
                  </th>
                  <th onClick={() => toggleSort('montant')} className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap">
                    Montant <SortIcon active={sortKey === 'montant'} dir={sortDir} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(tx => {
                  const meta       = SOURCE_META[tx.sourceType]
                  const isATraiter = tx.status === 'a_traiter'
                  return (
                    <tr
                      key={tx.id}
                      onClick={() => openPanel(tx)}
                      className={`transition-colors cursor-pointer ${
                        isATraiter ? 'hover:bg-amber-50/50' : 'hover:bg-green-50/30'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap tabular-nums text-xs">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{tx.ref}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.bg}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-[160px]">
                        <p className="text-xs text-gray-700 truncate" title={tx.sourceName}>{tx.sourceName}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{tx.accountTresorerie}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-xs text-gray-800 truncate max-w-[180px]" title={tx.libelle}>{tx.libelle}</p>
                        {tx.contrepartie && (
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                            ↔ {tx.contrepartie.accountCode} — {tx.contrepartie.accountLabel}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {tx.pieces.length > 0 ? (
                          <span className="text-xs text-blue-600 font-medium" title={tx.pieces.map(p => p.nom).join(', ')}>
                            📎 {tx.pieces.length}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className={`px-4 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap text-xs ${tx.montant >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {tx.montant >= 0 ? '+' : '−'}{fmt(Math.abs(tx.montant))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={7} className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Total ({rows.length} ligne{rows.length > 1 ? 's' : ''})
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold tabular-nums whitespace-nowrap text-sm ${
                      rows.reduce((s, t) => s + t.montant, 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {(() => {
                        const net = rows.reduce((s, t) => s + t.montant, 0)
                        return `${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}`
                      })()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
