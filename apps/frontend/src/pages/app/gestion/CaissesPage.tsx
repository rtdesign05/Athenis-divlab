import { useState, useMemo, useEffect } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useTresorerie } from '@/contexts/TresorerieContext'
import {
  listSources as apiListSources,
  createSource as apiCreateSource,
  listEntries as apiListEntries,
  createEntry as apiCreateEntry,
  updateEntry as apiUpdateEntry,
  deleteEntry as apiDeleteEntry,
  type ApiTreasurySource,
  type ApiTreasuryEntry,
} from '@/services/treasuryApi'

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

interface Caisse {
  id: string
  nom: string
  agence: string
  responsable: string
  solde: number
  operations: Operation[]
}

// ── Données initiales ─────────────────────────────────────────────────────────

const AGENCES = ['Siège']

// ── Modal nouvelle caisse ─────────────────────────────────────────────────────

function ModalCaisse({ onSave, onClose, defaultAgence }: {
  onSave: (c: Omit<Caisse, 'id' | 'operations'>) => void
  onClose: () => void
  defaultAgence?: string
}) {
  const [form, setForm] = useState({ nom: '', agence: defaultAgence ?? AGENCES[0]!, responsable: '', solde: '' })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom) return
    onSave({ ...form, solde: Number(form.solde) || 0 })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Nouvelle caisse</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom de la caisse *</label>
            <input value={form.nom} onChange={set('nom')} required placeholder="ex: Caisse principale"
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

function ModalOperation({ caisse, initialOp, onSave, onClose }: {
  caisse: Caisse
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
            <p className="text-xs text-gray-400">{caisse.nom} — {caisse.agence}</p>
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
            <input value={form.libelle} onChange={set('libelle')} required placeholder="ex: Encaissement vente comptoir" className={INPUT} />
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

export function CaissesPage() {
  const { fmt } = useCurrency()
  const { user } = useAuth()
  const agenceNom = user?.agenceNom ?? null
  const { addTransaction } = useTresorerie()

  const [caisses, setCaisses]       = useState<Caisse[]>([])
  const [showAddCaisse, setShowAddCaisse] = useState(false)
  const [showAddOp, setShowAddOp]         = useState(false)
  const [editingOp, setEditingOp]         = useState<Operation | null>(null)
  // Filtre par date sur les mouvements (yyyy-mm-dd, inclusif)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  // Filtrer les caisses accessibles à cet utilisateur
  const caissesVisibles = agenceNom ? caisses.filter(c => c.agence === agenceNom) : caisses
  const [selectedId, setSelectedId] = useState<string>(
    () => (agenceNom ? caisses.find(c => c.agence === agenceNom)?.id : caisses[0]?.id) ?? ''
  )

  const selected   = caissesVisibles.find(c => c.id === selectedId) ?? caissesVisibles[0]
  const totalSolde = caissesVisibles.reduce((s, c) => s + c.solde, 0)

  // Filtre par date sur les mouvements du compte sélectionné
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

  // Grouper par agence
  const agencesPresentes = Array.from(new Set(caissesVisibles.map(c => c.agence)))

  // ── Persistance des caisses + mouvements via API ───────────────────────────
  const mapEntryToOp = (e: ApiTreasuryEntry): Operation => ({
    id:      e.id,
    date:    e.date.slice(0, 10),
    libelle: e.libelle,
    montant: Number(e.montant),
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiListSources('caisse'),
      apiListEntries({ sourceType: 'caisse', limit: 500 }),
    ])
      .then(([sources, entriesPage]) => {
        if (cancelled) return
        const entriesBySource = new Map<string, Operation[]>()
        for (const e of entriesPage.items) {
          const arr = entriesBySource.get(e.sourceName) ?? []
          arr.push(mapEntryToOp(e))
          entriesBySource.set(e.sourceName, arr)
        }
        const mapped: Caisse[] = (sources as ApiTreasurySource[]).map(s => {
          const ops      = entriesBySource.get(s.nom) ?? []
          const opsSolde = ops.reduce((sum, o) => sum + o.montant, 0)
          return {
            id:          s.id,
            nom:         s.nom,
            agence:      s.agence?.nom ?? 'Siège',
            responsable: s.responsable ?? '',
            solde:       Number(s.solde) + opsSolde,
            operations:  ops,
          }
        })
        setCaisses(mapped)
        if (mapped.length > 0 && !selectedId) setSelectedId(mapped[0]!.id)
      })
      .catch(() => { /* erreur silencieuse */ })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addCaisse(data: Omit<Caisse, 'id' | 'operations'>) {
    try {
      const created = await apiCreateSource({
        type:  'caisse',
        nom:   data.nom,
        solde: data.solde,
        ...(data.responsable ? { responsable: data.responsable } : {}),
      })
      const nc: Caisse = {
        id:          created.id,
        nom:         created.nom,
        agence:      created.agence?.nom ?? data.agence,
        responsable: created.responsable ?? '',
        solde:       Number(created.solde),
        operations:  [],
      }
      setCaisses(cs => [...cs, nc])
      setSelectedId(nc.id)
    } catch (e) {
      console.error('createSource caisse', e)
      alert('Erreur lors de la création de la caisse')
    } finally {
      setShowAddCaisse(false)
    }
  }

  async function addOperation(op: Omit<Operation, 'id'>) {
    if (!selected) return
    try {
      const created = await apiCreateEntry({
        date:       op.date,
        libelle:    op.libelle,
        montant:    op.montant,
        sourceType: 'caisse',
        sourceName: selected.nom,
        ...(op.piece?.name ? { pieceName: op.piece.name } : {}),
      })
      const persistedOp: Operation = { ...op, id: created.id }
      setCaisses(cs => cs.map(c =>
        c.id === selectedId
          ? { ...c, solde: c.solde + op.montant, operations: [persistedOp, ...c.operations] }
          : c
      ))
      addTransaction(
        { date: op.date, libelle: op.libelle, montant: op.montant },
        selected.nom,
        'caisse',
        selected.agence,
        op.piece?.name,
      )
    } catch (e) {
      console.error('createEntry caisse', e)
      alert("Erreur lors de l'enregistrement du mouvement")
    } finally {
      setShowAddOp(false)
    }
  }

  async function updateOperation(updated: Omit<Operation, 'id'>) {
    if (!editingOp) return
    const previous = editingOp
    try {
      await apiUpdateEntry(previous.id, {
        date:    updated.date,
        libelle: updated.libelle,
        montant: updated.montant,
        ...(updated.piece?.name !== undefined ? { pieceName: updated.piece.name } : {}),
      })
      setCaisses(cs => cs.map(c => {
        if (c.id !== selectedId) return c
        const diff = updated.montant - previous.montant
        return {
          ...c,
          solde: c.solde + diff,
          operations: c.operations.map(op =>
            op.id === previous.id ? { ...op, ...updated } : op
          ),
        }
      }))
    } catch (e) {
      console.error('updateEntry caisse', e)
      alert('Erreur lors de la modification du mouvement')
    } finally {
      setEditingOp(null)
    }
  }

  async function deleteOperation(opId: string) {
    const caisse = caisses.find(c => c.id === selectedId)
    const op     = caisse?.operations.find(o => o.id === opId)
    if (!op) return
    try {
      await apiDeleteEntry(opId)
      setCaisses(cs => cs.map(c => {
        if (c.id !== selectedId) return c
        if (op.piece) URL.revokeObjectURL(op.piece.url)
        return {
          ...c,
          solde: c.solde - op.montant,
          operations: c.operations.filter(o => o.id !== opId),
        }
      }))
    } catch (e) {
      console.error('deleteEntry caisse', e)
      alert('Erreur lors de la suppression')
    }
  }

  function attachPiece(opId: string, file: File) {
    const url = URL.createObjectURL(file)
    setCaisses(cs => cs.map(c =>
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
    setCaisses(cs => cs.map(c => {
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

  // Empty state : aucune caisse créée (la liste 2-colonnes a besoin d'au moins
  // une caisse pour afficher quelque chose)
  if (caissesVisibles.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white px-8 py-12 text-center max-w-md">
          <p className="text-5xl mb-3">💵</p>
          <p className="text-base font-semibold text-gray-900">Aucune caisse</p>
          <p className="mt-2 text-sm text-gray-500">
            {agenceNom
              ? <>Votre agence <span className="font-medium">{agenceNom}</span> n'a pas encore de caisse.</>
              : 'Créez votre première caisse pour suivre les entrées et sorties d\'espèces.'}
          </p>
          <button
            onClick={() => setShowAddCaisse(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            + Ajouter une caisse
          </button>
        </div>
        {showAddCaisse && (
          <ModalCaisse
            onSave={addCaisse}
            onClose={() => setShowAddCaisse(false)}
            {...(agenceNom ? { defaultAgence: agenceNom } : {})}
          />
        )}
      </div>
    )
  }

  if (!selected) return null

  return (
    <div className="h-full flex gap-3 overflow-hidden">

      {/* ── Liste des caisses (gauche) ─────────────────────────────────────── */}
      <div className="w-64 shrink-0 flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold text-gray-700">
              Caisses {agenceNom && <span className="font-normal text-amber-600">— {agenceNom}</span>}
            </p>
            <p className="text-[10px] text-gray-400">Total : {fmt(totalSolde)}</p>
          </div>
          <button
            onClick={() => setShowAddCaisse(true)}
            title="Nouvelle caisse"
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-green-700 text-white text-base font-bold hover:bg-green-800"
          >
            +
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {agencesPresentes.map(agence => {
            const caissesAgence = caissesVisibles.filter(c => c.agence === agence)
            return (
              <div key={agence}>
                <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  {agence}
                </p>
                <div className="divide-y divide-gray-50">
                  {caissesAgence.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left px-3 py-2 transition-colors ${c.id === selectedId ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                    >
                      <p className={`text-xs font-semibold ${c.id === selectedId ? 'text-green-800' : 'text-gray-800'}`}>
                        {c.nom}
                      </p>
                      {c.responsable && (
                        <p className="text-[11px] text-gray-400 truncate">{c.responsable}</p>
                      )}
                      <p className={`text-sm font-bold mt-0.5 ${c.id === selectedId ? 'text-green-700' : 'text-gray-900'}`}>
                        {fmt(c.solde)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Détail de la caisse sélectionnée (droite) ─────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">

        {/* En-tête caisse */}
        <div className="shrink-0 rounded-xl bg-green-900 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-green-400">{selected.agence}</p>
            <p className="text-sm font-semibold text-white mt-0.5">{selected.nom}</p>
            {selected.responsable && (
              <p className="text-[11px] text-green-400 mt-0.5">Resp. : {selected.responsable}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-green-400">Solde actuel</p>
            <p className="text-2xl font-black text-white">{fmt(selected.solde)}</p>
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
      {showAddCaisse && <ModalCaisse onSave={addCaisse} onClose={() => setShowAddCaisse(false)} {...(agenceNom ? { defaultAgence: agenceNom } : {})} />}
      {showAddOp && <ModalOperation caisse={selected} onSave={addOperation} onClose={() => setShowAddOp(false)} />}
      {editingOp && <ModalOperation caisse={selected} initialOp={editingOp} onSave={updateOperation} onClose={() => setEditingOp(null)} />}
    </div>
  )
}
