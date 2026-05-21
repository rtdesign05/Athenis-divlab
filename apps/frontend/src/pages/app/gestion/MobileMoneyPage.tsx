import { useState, useMemo } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useTresorerie } from '@/contexts/TresorerieContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PieceJustificative {
  name: string
  url:  string
  type: string
}

interface Operation {
  id:      string
  date:    string
  libelle: string
  montant: number
  piece?:  PieceJustificative
}

interface Portefeuille {
  id: string
  operateur: string
  couleur: string
  textColor: string
  numero: string
  responsable: string
  agence: string
  solde: number
  operations: Operation[]
}

// ── Opérateurs disponibles ────────────────────────────────────────────────────

const OPERATEURS: { label: string; couleur: string; textColor: string }[] = [
  { label: 'MTN Mobile Money', couleur: 'bg-yellow-400',  textColor: 'text-yellow-900' },
  { label: 'Orange Money',     couleur: 'bg-orange-500',  textColor: 'text-white'      },
  { label: 'Moov Money',       couleur: 'bg-blue-600',    textColor: 'text-white'      },
  { label: 'Wave',             couleur: 'bg-sky-400',     textColor: 'text-white'      },
]

const AGENCES = ['Siège', 'Agence Douala — Akwa', 'Succursale Yaoundé — Centre', 'Bureau Bafoussam']

// ── Données initiales ─────────────────────────────────────────────────────────

// ── Modal nouveau portefeuille ────────────────────────────────────────────────

function ModalPortefeuille({ onSave, onClose, defaultAgence }: {
  onSave: (p: Omit<Portefeuille, 'id' | 'operations'>) => void
  onClose: () => void
  defaultAgence?: string
}) {
  const [form, setForm] = useState({
    operateur:   OPERATEURS[0]!.label,
    numero:      '',
    responsable: '',
    agence:      defaultAgence ?? AGENCES[0]!,
    solde:       '',
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.numero) return
    const op = OPERATEURS.find(o => o.label === form.operateur) ?? OPERATEURS[0]!
    onSave({ ...form, couleur: op.couleur, textColor: op.textColor, solde: Number(form.solde) || 0 })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Nouveau portefeuille</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Opérateur *</label>
            <select value={form.operateur} onChange={set('operateur')}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
              {OPERATEURS.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Numéro de compte *</label>
            <input value={form.numero} onChange={set('numero')} required placeholder="ex: +237 6 70 12 34 56"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Agence *</label>
            {defaultAgence
              ? (
                <div className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  {defaultAgence}
                </div>
              )
              : (
                <select value={form.agence} onChange={set('agence')}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                  {AGENCES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              )
            }
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Responsable</label>
            <input value={form.responsable} onChange={set('responsable')} placeholder="Prénom Nom"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Solde initial (XAF)</label>
            <input value={form.solde} onChange={set('solde')} type="number" placeholder="0"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              className="flex-1 rounded-lg bg-green-700 py-2 text-sm font-medium text-white hover:bg-green-800">
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal opération (ajout + modification) ────────────────────────────────────

function ModalOperation({ portefeuille, initialOp, onSave, onClose }: {
  portefeuille: Portefeuille
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
            <p className="text-xs text-gray-400">{portefeuille.operateur} — {portefeuille.agence}</p>
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
                <option value="in">Entrée (recette)</option>
                <option value="out">Sortie (dépense)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Libellé *</label>
            <input value={form.libelle} onChange={set('libelle')} required placeholder="ex: Paiement reçu — Client Doe" className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Montant (XAF) *</label>
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

export function MobileMoneyPage() {
  const { fmt } = useCurrency()
  const { user } = useAuth()
  const agenceNom = user?.agenceNom ?? null
  const { addTransaction } = useTresorerie()

  const [portefeuilles, setPortefeuilles] = useState<Portefeuille[]>([])
  const [showAddPorte, setShowAddPorte]   = useState(false)
  const [showAddOp, setShowAddOp]         = useState(false)
  const [editingOp, setEditingOp]         = useState<Operation | null>(null)
  // Filtre par date sur les mouvements (yyyy-mm-dd, inclusif)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const portesVisibles = agenceNom ? portefeuilles.filter(p => p.agence === agenceNom) : portefeuilles
  const [selectedId, setSelectedId] = useState<string>(
    () => (agenceNom ? portefeuilles.find(p => p.agence === agenceNom)?.id : portefeuilles[0]?.id) ?? portefeuilles[0]!.id
  )

  const selected   = portesVisibles.find(p => p.id === selectedId) ?? portesVisibles[0]!
  const totalSolde = portesVisibles.reduce((s, p) => s + p.solde, 0)

  // Filtre par date sur les mouvements du portefeuille sélectionné
  const filteredOperations = useMemo(() => {
    if (!selected) return []
    return selected.operations.filter(op => {
      if (dateFrom && op.date < dateFrom) return false
      if (dateTo   && op.date > dateTo)   return false
      return true
    })
  }, [selected, dateFrom, dateTo])
  const isFiltered = dateFrom !== '' || dateTo !== ''
  const filteredTotal = filteredOperations.reduce((s, o) => s + o.montant, 0)

  const agencesPresentes = Array.from(new Set(portesVisibles.map(p => p.agence)))

  function addPortefeuille(data: Omit<Portefeuille, 'id' | 'operations'>) {
    const np: Portefeuille = { ...data, id: Date.now().toString(), operations: [] }
    setPortefeuilles(ps => [...ps, np])
    setSelectedId(np.id)
    setShowAddPorte(false)
  }

  function addOperation(op: Omit<Operation, 'id'>) {
    const newOp: Operation = { ...op, id: Date.now().toString() }
    setPortefeuilles(ps => ps.map(p =>
      p.id === selectedId
        ? { ...p, solde: p.solde + op.montant, operations: [newOp, ...p.operations] }
        : p
    ))
    // Propager vers le contexte trésorerie → visible dans Transactions comptabilité
    addTransaction(
      { date: op.date, libelle: op.libelle, montant: op.montant },
      selected.operateur,
      'mobile-money',
      selected.agence,
      op.piece?.name,
    )
    setShowAddOp(false)
  }

  function updateOperation(updated: Omit<Operation, 'id'>) {
    if (!editingOp) return
    setPortefeuilles(ps => ps.map(p => {
      if (p.id !== selectedId) return p
      const diff = updated.montant - editingOp.montant
      return {
        ...p,
        solde: p.solde + diff,
        operations: p.operations.map(op =>
          op.id === editingOp.id ? { ...op, ...updated } : op
        ),
      }
    }))
    setEditingOp(null)
  }

  function deleteOperation(opId: string) {
    setPortefeuilles(ps => ps.map(p => {
      if (p.id !== selectedId) return p
      const op = p.operations.find(o => o.id === opId)
      if (!op) return p
      if (op.piece) URL.revokeObjectURL(op.piece.url)
      return {
        ...p,
        solde: p.solde - op.montant,
        operations: p.operations.filter(o => o.id !== opId),
      }
    }))
  }

  function attachPiece(opId: string, file: File) {
    const url = URL.createObjectURL(file)
    setPortefeuilles(ps => ps.map(p =>
      p.id === selectedId
        ? { ...p, operations: p.operations.map(op =>
            op.id === opId
              ? { ...op, piece: { name: file.name, url, type: file.type } }
              : op
          )}
        : p
    ))
  }

  function removePieceFromOp(opId: string) {
    setPortefeuilles(ps => ps.map(p => {
      if (p.id !== selectedId) return p
      return {
        ...p,
        operations: p.operations.map(op => {
          if (op.id !== opId) return op
          if (op.piece) URL.revokeObjectURL(op.piece.url)
          const { piece: _p, ...rest } = op
          return rest
        }),
      }
    }))
  }

  if (!selected) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        Aucun portefeuille disponible
      </div>
    )
  }

  return (
    <div className="h-full flex gap-3 overflow-hidden">

      {/* ── Liste des portefeuilles (gauche) ──────────────────────────────── */}
      <div className="w-64 shrink-0 flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold text-gray-700">
              Mobile Money {agenceNom && <span className="font-normal text-amber-600">— {agenceNom}</span>}
            </p>
            <p className="text-[10px] text-gray-400">Total : {fmt(totalSolde)}</p>
          </div>
          <button
            onClick={() => setShowAddPorte(true)}
            title="Nouveau portefeuille"
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-green-700 text-white text-base font-bold hover:bg-green-800"
          >
            +
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {agencesPresentes.map(agence => {
            const portesAgence = portesVisibles.filter(p => p.agence === agence)
            return (
              <div key={agence}>
                <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  {agence}
                </p>
                <div className="divide-y divide-gray-50">
                  {portesAgence.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full text-left px-3 py-2 transition-colors ${p.id === selectedId ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-5 w-5 shrink-0 rounded-full ${p.couleur} flex items-center justify-center text-[10px] font-bold ${p.textColor}`}>
                          {p.operateur.charAt(0)}
                        </div>
                        <p className={`text-xs font-semibold truncate ${p.id === selectedId ? 'text-green-800' : 'text-gray-800'}`}>
                          {p.operateur}
                        </p>
                      </div>
                      {p.numero && (
                        <p className="text-[11px] text-gray-400 truncate mt-0.5 pl-7">{p.numero}</p>
                      )}
                      <p className={`text-sm font-bold mt-0.5 pl-7 ${p.id === selectedId ? 'text-green-700' : 'text-gray-900'}`}>
                        {fmt(p.solde)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Détail du portefeuille sélectionné (droite) ────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">

        {/* En-tête portefeuille */}
        <div className={`shrink-0 rounded-xl ${selected.couleur} px-5 py-4 flex items-center justify-between`}>
          <div>
            <p className={`text-xs font-medium ${selected.textColor} opacity-75`}>{selected.agence}</p>
            <p className={`text-sm font-semibold ${selected.textColor} mt-0.5`}>{selected.operateur}</p>
            {selected.numero && (
              <p className={`text-[11px] ${selected.textColor} opacity-75 mt-0.5`}>{selected.numero}</p>
            )}
            {selected.responsable && (
              <p className={`text-[11px] ${selected.textColor} opacity-60 mt-0.5`}>Resp. : {selected.responsable}</p>
            )}
          </div>
          <div className="text-right">
            <p className={`text-xs ${selected.textColor} opacity-75`}>Solde actuel</p>
            <p className={`text-2xl font-black ${selected.textColor}`}>{fmt(selected.solde)}</p>
          </div>
        </div>

        {/* Opérations */}
        <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-100 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-gray-900">
              Opérations
              <span className="ml-2 text-xs font-normal text-gray-400">
                {isFiltered
                  ? `${filteredOperations.length} / ${selected.operations.length}`
                  : selected.operations.length} mouvement{(isFiltered ? filteredOperations.length : selected.operations.length) !== 1 ? 's' : ''}
              </span>
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtre par date */}
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1">
                <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Du</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="text-xs bg-transparent focus:outline-none text-gray-700"
                />
                <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">au</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="text-xs bg-transparent focus:outline-none text-gray-700"
                />
                {isFiltered && (
                  <button
                    onClick={() => { setDateFrom(''); setDateTo('') }}
                    title="Réinitialiser le filtre"
                    className="ml-0.5 rounded text-gray-400 hover:text-red-500 px-1 text-sm leading-none"
                  >×</button>
                )}
              </div>
              <button
                onClick={() => setShowAddOp(true)}
                className="flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
              >
                <span className="text-base leading-none">+</span> Saisir une opération
              </button>
            </div>
          </div>

          {filteredOperations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              {selected.operations.length === 0
                ? 'Aucune opération enregistrée'
                : `Aucune opération entre ${dateFrom || '—'} et ${dateTo || '—'}`}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Libellé</th>
                    <th className="px-4 py-2.5 text-right">Sortie</th>
                    <th className="px-4 py-2.5 text-right">Entrée</th>
                    <th className="px-2 py-2.5 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOperations.map(op => (
                    <tr key={op.id} className="group hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(op.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        <button onClick={() => setEditingOp(op)}
                          className="text-left hover:text-green-700 hover:underline transition-colors"
                          title="Modifier">
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
                        {op.montant < 0 ? fmt(Math.abs(op.montant)) : ''}
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

          {isFiltered && filteredOperations.length > 0 && (
            <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs">
              <span className="text-gray-500">
                Total période : <strong className="text-gray-700">{filteredOperations.length}</strong> opération{filteredOperations.length > 1 ? 's' : ''}
              </span>
              <span className={`font-semibold ${filteredTotal >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                Solde net : {fmt(filteredTotal)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddPorte && (
        <ModalPortefeuille
          onSave={addPortefeuille}
          onClose={() => setShowAddPorte(false)}
          {...(agenceNom ? { defaultAgence: agenceNom } : {})}
        />
      )}
      {showAddOp && (
        <ModalOperation
          portefeuille={selected}
          onSave={addOperation}
          onClose={() => setShowAddOp(false)}
        />
      )}
      {editingOp && (
        <ModalOperation
          portefeuille={selected}
          initialOp={editingOp}
          onSave={updateOperation}
          onClose={() => setEditingOp(null)}
        />
      )}
    </div>
  )
}
