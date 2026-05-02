import { useEffect, useState, useCallback } from 'react'
import { personalApi, TYPES_COMPTES } from '@/services/personalApi'
import type { PersonalObjectif, PersonalCompte } from '@/services/personalApi'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

// ── Modal Objectif ────────────────────────────────────────────────────────────

interface ObjectifForm { nom: string; montantCible: string; dateEcheance: string }
const defaultObjectifForm = (): ObjectifForm => ({ nom: '', montantCible: '', dateEcheance: '' })

interface ObjectifModalProps {
  initial?: PersonalObjectif | null
  onSave: (f: ObjectifForm) => Promise<void>
  onClose: () => void
}

function ObjectifModal({ initial, onSave, onClose }: ObjectifModalProps) {
  const [form, setForm]     = useState<ObjectifForm>(
    initial
      ? { nom: initial.nom, montantCible: String(initial.montantCible), dateEcheance: initial.dateEcheance ? initial.dateEcheance.slice(0, 10) : '' }
      : defaultObjectifForm()
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  function set<K extends keyof ObjectifForm>(k: K, v: ObjectifForm[K]) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom || !form.montantCible) { setErr('Nom et montant cible requis'); return }
    const montantCible = parseFloat(form.montantCible)
    if (isNaN(montantCible) || montantCible <= 0) { setErr('Montant invalide'); return }
    setSaving(true); setErr('')
    try { await onSave(form) } catch { setErr('Erreur lors de l\'enregistrement'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <form onSubmit={(e) => { void submit(e) }}>
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="font-semibold text-gray-900">{initial ? 'Modifier l\'objectif' : 'Nouvel objectif d\'épargne'}</h3>
          </div>
          <div className="space-y-4 px-6 py-5">
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div>
              <label className="label">Nom de l'objectif *</label>
              <input className="input mt-1" value={form.nom} onChange={(e) => set('nom', e.target.value)} placeholder="Ex: Voyage, Voiture, Fonds d'urgence…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Montant cible (€) *</label>
                <input type="number" step="0.01" min="0" className="input mt-1" value={form.montantCible} onChange={(e) => set('montantCible', e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <label className="label">Date d'échéance</label>
                <input type="date" className="input mt-1" value={form.dateEcheance} onChange={(e) => set('dateEcheance', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : initial ? 'Modifier' : 'Créer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Dépôt (ajouter au montant actuel) ───────────────────────────────────

function DepotModal({ objectif, onSave, onClose }: { objectif: PersonalObjectif; onSave: (montant: number) => Promise<void>; onClose: () => void }) {
  const [montant, setMontant] = useState('')
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const restant = objectif.montantCible - objectif.montantActuel

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const val = parseFloat(montant)
    if (isNaN(val) || val <= 0) { setErr('Montant invalide'); return }
    setSaving(true); setErr('')
    try { await onSave(val) } catch { setErr('Erreur'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <form onSubmit={(e) => { void submit(e) }}>
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="font-semibold text-gray-900">Ajouter un versement</h3>
            <p className="mt-0.5 text-sm text-gray-500">{objectif.nom} — Il reste {fmt(restant)}</p>
          </div>
          <div className="px-6 py-5">
            {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
            <label className="label">Montant à verser (€)</label>
            <input type="number" step="0.01" min="0" className="input mt-1 w-full" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="0,00" autoFocus />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? '…' : 'Verser'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Compte ──────────────────────────────────────────────────────────────

interface CompteForm { nom: string; type: string; solde: string }
const defaultCompteForm = (): CompteForm => ({ nom: '', type: 'COURANT', solde: '0' })

function CompteModal({ initial, onSave, onClose }: { initial?: PersonalCompte | null; onSave: (f: CompteForm) => Promise<void>; onClose: () => void }) {
  const [form, setForm]     = useState<CompteForm>(
    initial ? { nom: initial.nom, type: initial.type, solde: String(initial.solde) } : defaultCompteForm()
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  function set<K extends keyof CompteForm>(k: K, v: CompteForm[K]) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom) { setErr('Nom requis'); return }
    setSaving(true); setErr('')
    try { await onSave(form) } catch { setErr('Erreur'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <form onSubmit={(e) => { void submit(e) }}>
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="font-semibold text-gray-900">{initial ? 'Modifier le compte' : 'Nouveau compte'}</h3>
          </div>
          <div className="space-y-4 px-6 py-5">
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div>
              <label className="label">Nom du compte *</label>
              <input className="input mt-1" value={form.nom} onChange={(e) => set('nom', e.target.value)} placeholder="Ex: Compte principal, Livret A…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select className="input mt-1" value={form.type} onChange={(e) => set('type', e.target.value)}>
                  {TYPES_COMPTES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Solde actuel (€)</label>
                <input type="number" step="0.01" className="input mt-1" value={form.solde} onChange={(e) => set('solde', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : initial ? 'Modifier' : 'Ajouter'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

type ModalType = 'add-obj' | 'edit-obj' | 'depot' | 'add-cpt' | 'edit-cpt' | null

export function PersonalSavings() {
  const [objectifs, setObjectifs]   = useState<PersonalObjectif[]>([])
  const [comptes, setComptes]       = useState<PersonalCompte[]>([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState<ModalType>(null)
  const [editingObj, setEditingObj] = useState<PersonalObjectif | null>(null)
  const [editingCpt, setEditingCpt] = useState<PersonalCompte | null>(null)
  const [depotFor, setDepotFor]     = useState<PersonalObjectif | null>(null)
  const [deletingObj, setDeletingObj] = useState<string | null>(null)
  const [deletingCpt, setDeletingCpt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [obj, cpt] = await Promise.all([personalApi.objectifs.list(), personalApi.comptes.list()])
      setObjectifs(obj); setComptes(cpt)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleSaveObjectif(form: ObjectifForm) {
    const body = {
      nom: form.nom,
      montantCible: parseFloat(form.montantCible),
      ...(form.dateEcheance ? { dateEcheance: form.dateEcheance } : {}),
    }
    if (editingObj) await personalApi.objectifs.update(editingObj.id, body)
    else await personalApi.objectifs.create(body)
    setModal(null); setEditingObj(null)
    await load()
  }

  async function handleDepot(montant: number) {
    if (!depotFor) return
    const nouveau = Math.min(depotFor.montantActuel + montant, depotFor.montantCible)
    await personalApi.objectifs.update(depotFor.id, { montantActuel: nouveau })
    setModal(null); setDepotFor(null)
    await load()
  }

  async function handleSaveCompte(form: CompteForm) {
    const body = { nom: form.nom, type: form.type, solde: parseFloat(form.solde) }
    if (editingCpt) await personalApi.comptes.update(editingCpt.id, body)
    else await personalApi.comptes.create(body)
    setModal(null); setEditingCpt(null)
    await load()
  }

  const soldeTotalComptes = comptes.reduce((a, c) => a + c.solde, 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Épargne & Comptes</h2>
        <p className="mt-1 text-sm text-gray-500">Gérez vos objectifs d'épargne et vos comptes bancaires</p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-forest-900 border-t-transparent" />Chargement…
        </div>
      )}

      {/* ── Section Objectifs ──────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">🎯 Objectifs d'épargne</h3>
          <button onClick={() => { setEditingObj(null); setModal('add-obj') }} className="btn-primary text-sm">
            + Nouvel objectif
          </button>
        </div>

        {!loading && objectifs.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center">
            <p className="text-3xl">🐷</p>
            <p className="mt-2 text-sm text-gray-500">Aucun objectif d'épargne pour l'instant</p>
            <button onClick={() => { setEditingObj(null); setModal('add-obj') }} className="btn-primary mt-4 text-sm">
              Créer un objectif
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {objectifs.map((o) => {
              const pct      = Math.min(Math.round((o.montantActuel / o.montantCible) * 100), 100)
              const atteint  = pct >= 100
              const restant  = Math.max(o.montantCible - o.montantActuel, 0)
              const overdue  = o.dateEcheance ? new Date(o.dateEcheance) < new Date() && !atteint : false
              return (
                <div key={o.id} className={`card border-l-4 ${atteint ? 'border-l-green-500' : overdue ? 'border-l-red-400' : 'border-l-forest-500'}`}>
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{o.nom}</p>
                      {o.dateEcheance && (
                        <p className={`text-xs ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                          {overdue ? '⚠️ ' : '📅 '}
                          {new Date(o.dateEcheance).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                    {atteint && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">✅ Atteint !</span>}
                  </div>

                  {/* Barre de progression */}
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>{fmt(o.montantActuel)}</span>
                    <span className="font-medium">{pct}%</span>
                    <span>{fmt(o.montantCible)}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${atteint ? 'bg-green-500' : 'bg-forest-600'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {!atteint && (
                    <p className="mt-1 text-xs text-gray-400">Il reste {fmt(restant)} à atteindre</p>
                  )}

                  <div className="mt-4 flex gap-2">
                    {!atteint && (
                      <button
                        onClick={() => { setDepotFor(o); setModal('depot') }}
                        className="flex-1 rounded-lg bg-forest-50 px-3 py-1.5 text-xs font-medium text-forest-800 hover:bg-forest-100 transition-colors"
                      >
                        + Verser
                      </button>
                    )}
                    <button
                      onClick={() => { setEditingObj(o); setModal('edit-obj') }}
                      className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => setDeletingObj(o.id)}
                      className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Section Comptes ────────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">🏦 Mes comptes</h3>
            {comptes.length > 0 && (
              <p className="text-sm text-gray-500">
                Solde total : <span className={`font-semibold ${soldeTotalComptes >= 0 ? 'text-gray-900' : 'text-red-500'}`}>{fmt(soldeTotalComptes)}</span>
              </p>
            )}
          </div>
          <button onClick={() => { setEditingCpt(null); setModal('add-cpt') }} className="btn-secondary text-sm">
            + Ajouter un compte
          </button>
        </div>

        {!loading && comptes.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center">
            <p className="text-3xl">🏦</p>
            <p className="mt-2 text-sm text-gray-500">Aucun compte enregistré</p>
            <button onClick={() => { setEditingCpt(null); setModal('add-cpt') }} className="btn-secondary mt-4 text-sm">
              Ajouter un compte
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {comptes.map((c) => {
              const typeInfo = TYPES_COMPTES.find((t) => t.value === c.type)
              return (
                <div key={c.id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{c.nom}</p>
                    <p className="text-xs text-gray-400">{typeInfo?.label ?? c.type}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${c.solde >= 0 ? 'text-gray-900' : 'text-red-500'}`}>{fmt(c.solde)}</p>
                    <div className="mt-1 flex gap-2 justify-end">
                      <button onClick={() => { setEditingCpt(c); setModal('edit-cpt') }} className="text-xs text-gray-400 hover:text-gray-700">Modifier</button>
                      <button onClick={() => setDeletingCpt(c.id)} className="text-xs text-red-400 hover:text-red-600">Supprimer</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {(modal === 'add-obj' || modal === 'edit-obj') && (
        <ObjectifModal initial={editingObj} onSave={handleSaveObjectif} onClose={() => { setModal(null); setEditingObj(null) }} />
      )}
      {modal === 'depot' && depotFor && (
        <DepotModal objectif={depotFor} onSave={handleDepot} onClose={() => { setModal(null); setDepotFor(null) }} />
      )}
      {(modal === 'add-cpt' || modal === 'edit-cpt') && (
        <CompteModal initial={editingCpt} onSave={handleSaveCompte} onClose={() => { setModal(null); setEditingCpt(null) }} />
      )}

      {deletingObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-semibold text-gray-900">Supprimer cet objectif ?</h3>
            <p className="mt-2 text-sm text-gray-500">Cette action est irréversible.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDeletingObj(null)} className="btn-secondary">Annuler</button>
              <button onClick={async () => { await personalApi.objectifs.remove(deletingObj); setDeletingObj(null); await load() }} className="btn-primary bg-red-600 hover:bg-red-700">Supprimer</button>
            </div>
          </div>
        </div>
      )}
      {deletingCpt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-semibold text-gray-900">Supprimer ce compte ?</h3>
            <p className="mt-2 text-sm text-gray-500">Cette action est irréversible.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDeletingCpt(null)} className="btn-secondary">Annuler</button>
              <button onClick={async () => { await personalApi.comptes.remove(deletingCpt); setDeletingCpt(null); await load() }} className="btn-primary bg-red-600 hover:bg-red-700">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
