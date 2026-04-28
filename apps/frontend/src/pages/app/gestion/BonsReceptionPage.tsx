import { useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion, type BRStatut } from '@/contexts/GestionContext'

const STATUT_STYLE: Record<BRStatut, string> = {
  'Attendu':      'bg-amber-100 text-amber-700',
  'Reçu partiel': 'bg-blue-100 text-blue-700',
  'Reçu':         'bg-green-100 text-green-700',
  'Litige':       'bg-red-100 text-red-600',
}

const STATUTS: BRStatut[] = ['Attendu', 'Reçu partiel', 'Reçu', 'Litige']
const AGENCES = ['Siège', 'Agence Douala — Akwa', 'Succursale Yaoundé — Centre', 'Agence Bafoussam']

// ── Modal nouveau BR ──────────────────────────────────────────────────────────

interface ModalBRProps {
  achats:    { id: string; fournisseur: string; agence: string }[]
  agenceNom: string | null
  onSave: (data: { commande: string; fournisseur: string; agence: string; dateCreation: string; datePrevue: string; dateReception: null; statut: BRStatut }) => void
  onClose: () => void
}

function ModalBR({ achats, agenceNom, onSave, onClose }: ModalBRProps) {
  const today = new Date().toISOString().slice(0, 10)

  const availableAchats = useMemo(
    () => agenceNom ? achats.filter(a => a.agence === agenceNom) : achats,
    [achats, agenceNom],
  )

  const [form, setForm] = useState({
    commande:    availableAchats[0]?.id ?? '',
    fournisseur: availableAchats[0]?.fournisseur ?? '',
    agence:      agenceNom ?? availableAchats[0]?.agence ?? 'Siège',
    datePrevue:  '',
  })

  function handleCommandeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const cmd = availableAchats.find(a => a.id === e.target.value)
    setForm(f => ({
      ...f,
      commande:    e.target.value,
      fournisseur: cmd?.fournisseur ?? f.fournisseur,
      agence:      agenceNom ?? cmd?.agence ?? f.agence,
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.commande || !form.datePrevue) return
    onSave({
      commande:      form.commande,
      fournisseur:   form.fournisseur,
      agence:        form.agence,
      dateCreation:  today,
      datePrevue:    form.datePrevue,
      dateReception: null,
      statut:        'Attendu',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Nouveau bon de réception</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Commande fournisseur *</label>
            {availableAchats.length > 0 ? (
              <select value={form.commande} onChange={handleCommandeChange}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                {availableAchats.map(a => (
                  <option key={a.id} value={a.id}>{a.id} — {a.fournisseur}</option>
                ))}
              </select>
            ) : (
              <input value={form.commande}
                onChange={e => setForm(f => ({ ...f, commande: e.target.value }))}
                placeholder="ACH-xxxx"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fournisseur</label>
              <input value={form.fournisseur}
                onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))}
                placeholder="Nom du fournisseur"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Réception prévue *</label>
              <input type="date" value={form.datePrevue}
                onChange={e => setForm(f => ({ ...f, datePrevue: e.target.value }))} required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Agence</label>
            {agenceNom ? (
              <input value={agenceNom} readOnly
                className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
            ) : (
              <select value={form.agence} onChange={e => setForm(f => ({ ...f, agence: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                {AGENCES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            )}
          </div>
          <p className="text-[11px] text-gray-400">Statut initial : <strong>Attendu</strong></p>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              className="flex-1 rounded-lg bg-green-700 py-2 text-xs font-semibold text-white hover:bg-green-800">
              Créer le BR
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function BonsReceptionPage() {
  const { user } = useAuth()
  const { bonsReception, achats, updateBRStatut, addBonReception } = useGestion()

  const agenceNom = user?.agenceNom ?? null
  const [search, setSearch] = useState('')
  const [modal,  setModal]  = useState(false)

  const items = useMemo(() => {
    let list = agenceNom ? bonsReception.filter(b => b.agence === agenceNom) : bonsReception
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.fournisseur.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q),
      )
    }
    return list
  }, [bonsReception, agenceNom, search])

  const total    = items.length
  const recus    = items.filter(b => b.statut === 'Reçu').length
  const attendus = items.filter(b => b.statut === 'Attendu').length
  const litiges  = items.filter(b => b.statut === 'Litige').length

  return (
    <div className="h-full flex flex-col gap-3">

      {/* En-tête */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-gray-900">Bons de réception</h1>
          {agenceNom && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              🏢 {agenceNom}
            </span>
          )}
        </div>
        <button onClick={() => setModal(true)}
          className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
          + Nouveau BR
        </button>
      </div>

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Total BR</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-xs text-green-600">Reçus</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{recus}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-600">Attendus</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{attendus}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-600">Litiges</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{litiges}</p>
        </div>
      </div>

      {/* Tableau */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="shrink-0 flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Fournisseur, N° BR…"
              className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="px-4 py-2.5">N° BR</th>
                <th className="px-4 py-2.5">Commande</th>
                <th className="px-4 py-2.5">Fournisseur</th>
                {!agenceNom && <th className="px-4 py-2.5">Agence</th>}
                <th className="px-4 py-2.5">Date création</th>
                <th className="px-4 py-2.5">Date prévue</th>
                <th className="px-4 py-2.5">Date réception</th>
                <th className="px-4 py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Aucun bon de réception trouvé</td></tr>
              ) : items.map(b => (
                <tr key={b.id} className="hover:bg-gray-50/60 cursor-pointer">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-green-700">{b.id}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{b.commande}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{b.fournisseur}</td>
                  {!agenceNom && <td className="px-4 py-2.5 text-[11px] text-gray-500">{b.agence}</td>}
                  <td className="px-4 py-2.5 text-gray-500">{new Date(b.dateCreation).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2.5 text-gray-500">{new Date(b.datePrevue).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {b.dateReception ? new Date(b.dateReception).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    <select value={b.statut}
                      onChange={e => updateBRStatut(b.id, e.target.value as BRStatut)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer appearance-none ${STATUT_STYLE[b.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ModalBR
          achats={achats}
          agenceNom={agenceNom}
          onSave={data => { addBonReception(data); setModal(false) }}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  )
}
