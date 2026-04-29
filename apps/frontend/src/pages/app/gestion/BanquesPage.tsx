import { useState } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useTresorerie } from '@/contexts/TresorerieContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PieceJustificative {
  name: string
  url:  string   // blob: URL — valide pour la session courante
  type: string   // MIME
}

interface Operation {
  id:      string
  date:    string
  libelle: string
  montant: number
  piece?:  PieceJustificative
}

interface Compte {
  id: string
  banque: string
  intitule: string
  numero: string
  solde: number
  devise: string
  agence: string
  operations: Operation[]
}

// ── Données initiales ─────────────────────────────────────────────────────────

const INITIAL: Compte[] = [
  {
    id: 'bicec',
    banque: 'BICEC',
    intitule: 'Compte courant entreprise',
    numero: 'CM 021 10023 00412876001 45',
    solde: 28_450_000,
    devise: 'XAF',
    agence: 'Siège',
    operations: [
      { id: 'o1', date: '2026-04-24', libelle: 'Virement reçu — ACME Corp (FAC-0041)',   montant:  8_400_000 },
      { id: 'o2', date: '2026-04-22', libelle: 'Prélèvement loyer bureaux avril',         montant: -3_200_000 },
      { id: 'o3', date: '2026-04-20', libelle: 'Virement reçu — TechX Sarl (FAC-0038)',  montant:  6_100_000 },
      { id: 'o4', date: '2026-04-18', libelle: 'Charges sociales CNPS mars',              montant: -2_850_000 },
      { id: 'o5', date: '2026-04-15', libelle: 'Frais bancaires avril',                   montant:    -25_000 },
    ],
  },
  {
    id: 'uba',
    banque: 'UBA Cameroun',
    intitule: 'Compte épargne',
    numero: 'CM 021 30015 00089234002 72',
    solde: 14_200_000,
    devise: 'XAF',
    agence: 'Siège',
    operations: [
      { id: 'o6', date: '2026-04-01', libelle: 'Intérêts trimestriels Q1 2026',           montant:    142_000 },
      { id: 'o7', date: '2026-03-15', libelle: 'Virement depuis compte BICEC',             montant:  5_000_000 },
      { id: 'o8', date: '2026-01-01', libelle: 'Intérêts trimestriels Q4 2025',            montant:    138_500 },
    ],
  },
  {
    id: 'ecobank',
    banque: 'Ecobank',
    intitule: 'Compte devises (EUR)',
    numero: 'CM 021 50007 00031188003 29',
    solde: 5_600_000,
    devise: 'XAF',
    agence: 'Siège',
    operations: [
      { id: 'o9',  date: '2026-04-19', libelle: 'Encaissement export — Groupe Delta',     montant:  3_200_000 },
      { id: 'o10', date: '2026-04-10', libelle: 'Règlement fournisseur Import Express',   montant: -1_950_000 },
      { id: 'o11', date: '2026-04-05', libelle: 'Commission change EUR/XAF',               montant:    -18_000 },
    ],
  },
]

// ── Modals ────────────────────────────────────────────────────────────────────

function ModalCompte({ onSave, onClose, defaultAgence }: {
  onSave: (c: Omit<Compte, 'id' | 'operations'>) => void
  onClose: () => void
  defaultAgence?: string
}) {
  const [form, setForm] = useState({ banque: '', intitule: '', numero: '', solde: '', devise: 'XAF', agence: defaultAgence ?? 'Siège' })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.banque || !form.intitule) return
    onSave({ ...form, solde: Number(form.solde.replace(/\s/g, '')) || 0 })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Nouveau compte bancaire</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Banque *</label>
              <input value={form.banque} onChange={set('banque')} required placeholder="ex: BICEC"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Devise</label>
              <select value={form.devise} onChange={set('devise')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                <option>XAF</option><option>EUR</option><option>USD</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Intitulé du compte *</label>
            <input value={form.intitule} onChange={set('intitule')} required placeholder="ex: Compte courant entreprise"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Numéro de compte</label>
            <input value={form.numero} onChange={set('numero')} placeholder="ex: CM 021 10023 00412876001 45"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Solde initial</label>
            <input value={form.solde} onChange={set('solde')} placeholder="0" type="number"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              className="flex-1 rounded-lg bg-green-700 py-2 text-sm font-medium text-white hover:bg-green-800">
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalOperation({ compte, initialOp, onSave, onClose }: {
  compte: Compte
  initialOp?: Operation
  onSave: (op: Omit<Operation, 'id'>) => void
  onClose: () => void
}) {
  const editing = !!initialOp
  const [form, setForm] = useState(() => ({
    date:    initialOp ? initialOp.date : new Date().toISOString().slice(0, 10),
    libelle: initialOp ? initialOp.libelle : '',
    montant: initialOp ? String(Math.abs(initialOp.montant)) : '',
    type:    initialOp ? (initialOp.montant >= 0 ? 'in' : 'out') : 'in',
  }))
  const [newFile, setNewFile]               = useState<File | null>(null)
  const [removePieceFlag, setRemovePieceFlag] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const displayPiece: { name: string } | null =
    removePieceFlag ? null : newFile ?? initialOp?.piece ?? null

  function handleFile(f: File | undefined) {
    if (!f) return
    setNewFile(f)
    setRemovePieceFlag(false)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const raw = Number(form.montant)
    if (!raw || !form.libelle) return
    let piece: PieceJustificative | undefined
    if (removePieceFlag) {
      if (initialOp?.piece) URL.revokeObjectURL(initialOp.piece.url)
    } else if (newFile) {
      if (initialOp?.piece) URL.revokeObjectURL(initialOp.piece.url)
      piece = { name: newFile.name, url: URL.createObjectURL(newFile), type: newFile.type }
    } else {
      piece = initialOp?.piece
    }
    const montant = form.type === 'out' ? -Math.abs(raw) : Math.abs(raw)
    onSave({ date: form.date, libelle: form.libelle, montant, ...(piece ? { piece } : {}) })
  }

  const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {editing ? "Modifier l'opération" : 'Saisir une opération'}
            </h2>
            <p className="text-xs text-gray-400">{compte.banque} — {compte.intitule}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <input type="date" value={form.date} onChange={set('date')} required className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
              <select value={form.type} onChange={set('type')} className={INPUT}>
                <option value="in">Crédit (entrée)</option>
                <option value="out">Débit (sortie)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Libellé *</label>
            <input value={form.libelle} onChange={set('libelle')} required placeholder="ex: Virement reçu client ACME" className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Montant ({compte.devise}) *</label>
            <input value={form.montant} onChange={set('montant')} required placeholder="0" type="number" min="0" className={INPUT} />
          </div>

          {/* Pièce justificative */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pièce justificative</label>
            {displayPiece ? (
              <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                <span className="text-base shrink-0">📎</span>
                <span className="text-xs text-blue-700 flex-1 truncate">{displayPiece.name}</span>
                <label className="text-xs text-blue-500 hover:text-blue-700 cursor-pointer underline shrink-0">
                  Remplacer
                  <input type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }} />
                </label>
                <button type="button" onClick={() => { setNewFile(null); setRemovePieceFlag(true) }}
                  className="shrink-0 text-gray-400 hover:text-red-500 text-base leading-none">×</button>
              </div>
            ) : (
              <label className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2.5 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                <span className="text-gray-400 text-base">📎</span>
                <span className="text-xs text-gray-500">Joindre une pièce justificative (PDF, image…)</span>
                <input type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }} />
              </label>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              className={`flex-1 rounded-lg py-2 text-sm font-medium text-white ${form.type === 'in' ? 'bg-green-700 hover:bg-green-800' : 'bg-red-600 hover:bg-red-700'}`}>
              {editing ? 'Enregistrer les modifications' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function BanquesPage() {
  const { fmt } = useCurrency()
  const { user } = useAuth()
  const agenceNom = user?.agenceNom ?? null
  const { addTransaction } = useTresorerie()

  const [comptes, setComptes] = useState<Compte[]>(INITIAL)
  const [selectedId, setSelectedId] = useState<string>(INITIAL[0]!.id)
  const [showAddCompte, setShowAddCompte] = useState(false)
  const [showAddOp, setShowAddOp] = useState(false)
  const [editingOp, setEditingOp] = useState<Operation | null>(null)

  const comptesVisibles = agenceNom ? comptes.filter(c => c.agence === agenceNom) : comptes
  const selected = comptesVisibles.find(c => c.id === selectedId) ?? comptesVisibles[0]
  const totalSolde = comptesVisibles.reduce((s, c) => s + c.solde, 0)

  // L'utilisateur est scopé à une agence qui n'a pas de comptes bancaires
  if (agenceNom && comptesVisibles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-3">🔒</p>
          <p className="text-sm font-semibold text-gray-700">Accès non autorisé</p>
          <p className="mt-1 text-xs text-gray-500">
            Votre agence <span className="font-medium text-amber-700">{agenceNom}</span> n'a pas accès aux comptes bancaires.
            Les comptes bancaires sont gérés au niveau du Siège.
          </p>
        </div>
      </div>
    )
  }

  if (!selected) return null

  function addCompte(data: Omit<Compte, 'id' | 'operations'>) {
    const nc: Compte = { ...data, id: Date.now().toString(), operations: [] }
    setComptes(cs => [...cs, nc])
    setSelectedId(nc.id)
    setShowAddCompte(false)
  }

  function addOperation(op: Omit<Operation, 'id'>) {
    const newOp: Operation = { ...op, id: Date.now().toString() }
    setComptes(cs => cs.map(c =>
      c.id === selectedId
        ? { ...c, solde: c.solde + op.montant, operations: [newOp, ...c.operations] }
        : c
    ))
    // Propager vers le contexte trésorerie → visible dans Transactions comptabilité
    if (selected) {
      addTransaction(
        { date: op.date, libelle: op.libelle, montant: op.montant },
        `${selected.banque} — ${selected.intitule}`,
        'banque',
        selected.agence,
        op.piece?.name,
      )
    }
    setShowAddOp(false)
  }

  function updateOperation(updated: Omit<Operation, 'id'>) {
    if (!editingOp) return
    setComptes(cs => cs.map(c => {
      if (c.id !== selectedId) return c
      const diff = updated.montant - editingOp.montant
      return {
        ...c,
        solde: c.solde + diff,
        operations: c.operations.map(op =>
          op.id === editingOp.id ? { ...op, ...updated } : op
        ),
      }
    }))
    setEditingOp(null)
  }

  function deleteOperation(opId: string) {
    setComptes(cs => cs.map(c => {
      if (c.id !== selectedId) return c
      const op = c.operations.find(o => o.id === opId)
      if (!op) return c
      if (op.piece) URL.revokeObjectURL(op.piece.url)
      return {
        ...c,
        solde: c.solde - op.montant,
        operations: c.operations.filter(o => o.id !== opId),
      }
    }))
  }

  function attachPiece(opId: string, file: File) {
    const url = URL.createObjectURL(file)
    setComptes(cs => cs.map(c =>
      c.id === selectedId
        ? { ...c, operations: c.operations.map(op =>
            op.id === opId
              ? { ...op, piece: { name: file.name, url, type: file.type } }
              : op
          )}
        : c
    ))
  }

  function removePieceFromOp(opId: string) {
    setComptes(cs => cs.map(c => {
      if (c.id !== selectedId) return c
      return {
        ...c,
        operations: c.operations.map(op => {
          if (op.id !== opId) return op
          if (op.piece) URL.revokeObjectURL(op.piece.url)
          const { piece: _p, ...rest } = op
          return rest
        }),
      }
    }))
  }

  return (
    <div className="h-full flex gap-3 overflow-hidden">

      {/* ── Liste des comptes (gauche) ─────────────────────────────────────── */}
      <div className="w-64 shrink-0 flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold text-gray-700">Comptes bancaires</p>
            <p className="text-[10px] text-gray-400">Total : {fmt(totalSolde)}</p>
          </div>
          <button onClick={() => setShowAddCompte(true)}
            title="Ajouter un compte"
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-green-700 text-white text-base font-bold hover:bg-green-800">
            +
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
          {comptesVisibles.map(c => (
            <button key={c.id} onClick={() => setSelectedId(c.id)}
              className={`w-full text-left px-3 py-2.5 transition-colors ${c.id === selectedId ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
              <p className={`text-xs font-semibold ${c.id === selectedId ? 'text-green-800' : 'text-gray-800'}`}>{c.banque}</p>
              <p className="text-[11px] text-gray-500 truncate">{c.intitule}</p>
              <p className={`text-sm font-bold mt-0.5 ${c.id === selectedId ? 'text-green-700' : 'text-gray-900'}`}>{fmt(c.solde)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Détail du compte sélectionné (droite) ─────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">

        {/* En-tête compte */}
        <div className="shrink-0 rounded-xl bg-green-900 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-green-400">{selected.banque} · {selected.devise}</p>
            <p className="text-sm font-semibold text-white mt-0.5">{selected.intitule}</p>
            <p className="text-[11px] font-mono text-green-400 mt-0.5">{selected.numero || '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-green-400">Solde actuel</p>
            <p className="text-2xl font-black text-white">{fmt(selected.solde)}</p>
          </div>
        </div>

        {/* Opérations */}
        <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Opérations
              <span className="ml-2 text-xs font-normal text-gray-400">{selected.operations.length} mouvement{selected.operations.length !== 1 ? 's' : ''}</span>
            </h2>
            <button onClick={() => setShowAddOp(true)}
              className="flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
              <span className="text-base leading-none">+</span> Saisir une opération
            </button>
          </div>

          {selected.operations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              Aucune opération enregistrée
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Libellé</th>
                    <th className="px-4 py-2.5 text-right">Débit</th>
                    <th className="px-4 py-2.5 text-right">Crédit</th>
                    <th className="px-2 py-2.5 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {selected.operations.map(op => (
                    <tr key={op.id} className="group hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(op.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        <button onClick={() => setEditingOp(op)}
                          className="text-left hover:text-green-700 hover:underline transition-colors"
                          title="Modifier cette opération">
                          {op.libelle}
                        </button>
                        {op.piece && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <a href={op.piece.url} target="_blank" rel="noreferrer"
                              title={op.piece.name}
                              className="flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-800 hover:underline max-w-[180px]">
                              <span>📎</span>
                              <span className="truncate">{op.piece.name}</span>
                            </a>
                            <button onClick={() => removePieceFromOp(op.id)} title="Retirer la pièce"
                              className="text-gray-300 hover:text-red-500 text-xs leading-none transition-colors">×</button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-red-500">
                        {op.montant < 0 ? fmt(op.montant) : ''}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-green-600">
                        {op.montant >= 0 ? fmt(op.montant) : ''}
                      </td>
                      <td className="px-2 py-2.5 w-20">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <label title="Joindre une pièce justificative"
                            className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:bg-blue-50 hover:text-blue-600 cursor-pointer text-xs">
                            <input type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.webp"
                              onChange={e => { const f = e.target.files?.[0]; if (f) attachPiece(op.id, f); e.target.value = '' }} />
                            📎
                          </label>
                          <button onClick={() => setEditingOp(op)} title="Modifier"
                            className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:bg-blue-50 hover:text-blue-600 text-xs">
                            ✎
                          </button>
                          <button onClick={() => deleteOperation(op.id)} title="Supprimer"
                            className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500 text-sm font-bold">
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddCompte && <ModalCompte onSave={addCompte} onClose={() => setShowAddCompte(false)} {...(agenceNom ? { defaultAgence: agenceNom } : {})} />}
      {showAddOp && <ModalOperation compte={selected} onSave={addOperation} onClose={() => setShowAddOp(false)} />}
      {editingOp && <ModalOperation compte={selected} initialOp={editingOp} onSave={updateOperation} onClose={() => setEditingOp(null)} />}
    </div>
  )
}
