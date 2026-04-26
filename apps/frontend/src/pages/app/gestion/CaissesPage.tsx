import { useState } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Operation {
  id: string
  date: string
  libelle: string
  montant: number
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

const INITIAL: Caisse[] = [
  {
    id: 'c-siege-principale',
    nom: 'Caisse principale',
    agence: 'Siège',
    responsable: 'Marie Nguema',
    solde: 1_250_000,
    operations: [
      { id: 'op1', date: '2026-04-25', libelle: 'Achat fournitures de bureau',       montant:    -45_000 },
      { id: 'op2', date: '2026-04-25', libelle: 'Versement espèces client Diop',      montant:   380_000 },
      { id: 'op3', date: '2026-04-24', libelle: 'Frais de déplacement commercial',    montant:    -85_000 },
      { id: 'op4', date: '2026-04-24', libelle: 'Alimentation caisse (virement)',     montant:   500_000 },
      { id: 'op5', date: '2026-04-23', libelle: 'Paiement prestataire nettoyage',     montant:    -75_000 },
      { id: 'op6', date: '2026-04-23', libelle: 'Encaissement vente comptoir',         montant:   210_000 },
    ],
  },
  {
    id: 'c-siege-petite',
    nom: 'Petite caisse',
    agence: 'Siège',
    responsable: 'Assistante de direction',
    solde: 85_000,
    operations: [
      { id: 'op7', date: '2026-04-25', libelle: 'Café et collations réunion',          montant:    -15_000 },
      { id: 'op8', date: '2026-04-24', libelle: 'Alimentation petite caisse',          montant:   100_000 },
      { id: 'op9', date: '2026-04-23', libelle: 'Timbres et envoi courrier',            montant:     -8_500 },
    ],
  },
  {
    id: 'c-douala-bassa',
    nom: 'Caisse Agence',
    agence: 'Agence Douala — Akwa',
    responsable: 'Jean-Pierre Ekambi',
    solde: 420_000,
    operations: [
      { id: 'op10', date: '2026-04-25', libelle: 'Vente marchandise client Bakary',    montant:   165_000 },
      { id: 'op11', date: '2026-04-25', libelle: 'Remboursement frais taxi livraison', montant:    -12_000 },
      { id: 'op12', date: '2026-04-24', libelle: 'Encaissement commande CMD-0039',     montant:   280_000 },
      { id: 'op13', date: '2026-04-24', libelle: 'Achat petit matériel',               montant:    -38_000 },
    ],
  },
  {
    id: 'c-yaounde',
    nom: 'Caisse Succursale',
    agence: 'Succursale Yaoundé — Centre',
    responsable: 'Marie-Claire Atangana',
    solde: 310_000,
    operations: [
      { id: 'op14', date: '2026-04-25', libelle: 'Encaissement client Mvondo',         montant:   150_000 },
      { id: 'op15', date: '2026-04-24', libelle: 'Frais de port livraison locale',     montant:    -22_000 },
      { id: 'op16', date: '2026-04-23', libelle: 'Vente comptoir — réf. ART-088',      montant:   182_000 },
    ],
  },
]

const AGENCES = ['Siège', 'Agence Douala — Akwa', 'Succursale Yaoundé — Centre', 'Bureau Bafoussam']

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
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const raw = Number(form.montant)
    if (!raw || !form.libelle) return
    onSave({ date: form.date, libelle: form.libelle, montant: form.type === 'out' ? -Math.abs(raw) : Math.abs(raw) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {editing ? 'Modifier l\'opération' : 'Saisir une opération'}
            </h2>
            <p className="text-xs text-gray-400">{caisse.nom} — {caisse.agence}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <input type="date" value={form.date} onChange={set('date')} required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
              <select value={form.type} onChange={set('type')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                <option value="in">Entrée (recette)</option>
                <option value="out">Sortie (dépense)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Libellé *</label>
            <input value={form.libelle} onChange={set('libelle')} required placeholder="ex: Encaissement vente comptoir"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Montant (XAF) *</label>
            <input value={form.montant} onChange={set('montant')} required placeholder="0" type="number" min="0"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
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

  const [caisses, setCaisses]       = useState<Caisse[]>(INITIAL)
  const [showAddCaisse, setShowAddCaisse] = useState(false)
  const [showAddOp, setShowAddOp]         = useState(false)
  const [editingOp, setEditingOp]         = useState<Operation | null>(null)

  // Filtrer les caisses accessibles à cet utilisateur
  const caissesVisibles = agenceNom ? caisses.filter(c => c.agence === agenceNom) : caisses
  const [selectedId, setSelectedId] = useState<string>(
    () => (agenceNom ? caisses.find(c => c.agence === agenceNom)?.id : caisses[0]?.id) ?? caisses[0]!.id
  )

  const selected   = caissesVisibles.find(c => c.id === selectedId) ?? caissesVisibles[0]!
  const totalSolde = caissesVisibles.reduce((s, c) => s + c.solde, 0)

  // Grouper par agence
  const agencesPresentes = Array.from(new Set(caissesVisibles.map(c => c.agence)))

  function addCaisse(data: Omit<Caisse, 'id' | 'operations'>) {
    const nc: Caisse = { ...data, id: Date.now().toString(), operations: [] }
    setCaisses(cs => [...cs, nc])
    setSelectedId(nc.id)
    setShowAddCaisse(false)
  }

  function addOperation(op: Omit<Operation, 'id'>) {
    const newOp: Operation = { ...op, id: Date.now().toString() }
    setCaisses(cs => cs.map(c =>
      c.id === selectedId
        ? { ...c, solde: c.solde + op.montant, operations: [newOp, ...c.operations] }
        : c
    ))
    setShowAddOp(false)
  }

  function updateOperation(updated: Omit<Operation, 'id'>) {
    if (!editingOp) return
    setCaisses(cs => cs.map(c => {
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
    setCaisses(cs => cs.map(c => {
      if (c.id !== selectedId) return c
      const op = c.operations.find(o => o.id === opId)
      if (!op) return c
      return {
        ...c,
        solde: c.solde - op.montant,
        operations: c.operations.filter(o => o.id !== opId),
      }
    }))
  }

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
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Opérations
              <span className="ml-2 text-xs font-normal text-gray-400">
                {selected.operations.length} mouvement{selected.operations.length !== 1 ? 's' : ''}
              </span>
            </h2>
            <button
              onClick={() => setShowAddOp(true)}
              className="flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
            >
              <span className="text-base leading-none">+</span> Saisir une opération
            </button>
          </div>

          {selected.operations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              Aucune opération enregistrée
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Libellé</th>
                    <th className="px-4 py-2.5 text-right">Sortie</th>
                    <th className="px-4 py-2.5 text-right">Entrée</th>
                    <th className="px-2 py-2.5 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {selected.operations.map(op => (
                    <tr key={op.id} className="group hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(op.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        <button
                          onClick={() => setEditingOp(op)}
                          className="text-left hover:text-green-700 hover:underline transition-colors"
                          title="Modifier"
                        >
                          {op.libelle}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-red-500">
                        {op.montant < 0 ? fmt(Math.abs(op.montant)) : ''}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-green-600">
                        {op.montant >= 0 ? fmt(op.montant) : ''}
                      </td>
                      <td className="px-2 py-2.5 w-16">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button
                            onClick={() => setEditingOp(op)}
                            title="Modifier"
                            className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:bg-blue-50 hover:text-blue-600 text-xs"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => deleteOperation(op.id)}
                            title="Supprimer"
                            className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500 text-sm font-bold"
                          >
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
      {showAddCaisse && <ModalCaisse onSave={addCaisse} onClose={() => setShowAddCaisse(false)} {...(agenceNom ? { defaultAgence: agenceNom } : {})} />}
      {showAddOp && <ModalOperation caisse={selected} onSave={addOperation} onClose={() => setShowAddOp(false)} />}
      {editingOp && <ModalOperation caisse={selected} initialOp={editingOp} onSave={updateOperation} onClose={() => setEditingOp(null)} />}
    </div>
  )
}
