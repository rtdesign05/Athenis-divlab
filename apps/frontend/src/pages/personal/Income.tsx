import { useEffect, useState, useCallback } from 'react'
import { personalApi, CATEGORIES_REVENUS } from '@/services/personalApi'
import type { PersonalRevenu } from '@/services/personalApi'
import { usePersonalPeriod } from './usePersonalPeriod'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

// ── Formulaire ────────────────────────────────────────────────────────────────

interface FormData {
  libelle: string; montant: string; categorie: string; date: string; recurrent: boolean
}

const defaultForm = (): FormData => ({
  libelle: '', montant: '', categorie: 'SALAIRE',
  date: new Date().toISOString().slice(0, 10), recurrent: false,
})

function set<K extends keyof FormData>(setter: React.Dispatch<React.SetStateAction<FormData>>, k: K, v: FormData[K]) {
  setter((f) => ({ ...f, [k]: v }))
}

interface ModalProps {
  initial?: PersonalRevenu | null
  onSave: (data: FormData) => Promise<void>
  onClose: () => void
}

function RevenuModal({ initial, onSave, onClose }: ModalProps) {
  const [form, setForm]     = useState<FormData>(
    initial
      ? { libelle: initial.libelle, montant: String(initial.montant), categorie: initial.categorie, date: initial.date.slice(0, 10), recurrent: initial.recurrent }
      : defaultForm()
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.libelle || !form.montant) { setErr('Libellé et montant requis'); return }
    const montant = parseFloat(form.montant)
    if (isNaN(montant) || montant <= 0) { setErr('Montant invalide'); return }
    setSaving(true); setErr('')
    try { await onSave(form) } catch { setErr('Erreur lors de l\'enregistrement'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <form onSubmit={(e) => { void submit(e) }}>
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="font-semibold text-gray-900">{initial ? 'Modifier le revenu' : 'Nouveau revenu'}</h3>
          </div>
          <div className="space-y-4 px-6 py-5">
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div>
              <label className="label">Libellé *</label>
              <input className="input mt-1" value={form.libelle} onChange={(e) => set(setForm, 'libelle', e.target.value)} placeholder="Ex: Salaire janvier, Freelance…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Montant (€) *</label>
                <input type="number" step="0.01" min="0" className="input mt-1" value={form.montant} onChange={(e) => set(setForm, 'montant', e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <label className="label">Date *</label>
                <input type="date" className="input mt-1" value={form.date} onChange={(e) => set(setForm, 'date', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Catégorie</label>
              <select className="input mt-1" value={form.categorie} onChange={(e) => set(setForm, 'categorie', e.target.value)}>
                {CATEGORIES_REVENUS.map((c) => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={form.recurrent} onChange={(e) => set(setForm, 'recurrent', e.target.checked)} className="h-4 w-4 rounded" />
              <span className="text-sm text-gray-700">Revenu récurrent (mensuel)</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement…' : initial ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function PersonalIncome() {
  // Période synchronisée avec Dashboard / Expenses via les query params de l'URL
  const { annee, mois, periodString: filterMois, setPeriod } = usePersonalPeriod()
  const [items, setItems]       = useState<PersonalRevenu[]>([])
  const [loading, setLoading]   = useState(true)
  const [filterCat, setFilterCat] = useState('')
  const [modal, setModal]       = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing]   = useState<PersonalRevenu | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: { annee: number; mois: number; categorie?: string } = { annee, mois }
      if (filterCat) params.categorie = filterCat
      const data = await personalApi.revenus.list(params)
      setItems(data)
    } finally { setLoading(false) }
  }, [annee, mois, filterCat])

  useEffect(() => { void load() }, [load])

  async function handleSave(form: FormData) {
    if (editing) {
      await personalApi.revenus.update(editing.id, { libelle: form.libelle, montant: parseFloat(form.montant), categorie: form.categorie, date: form.date, recurrent: form.recurrent })
    } else {
      await personalApi.revenus.create({ libelle: form.libelle, montant: parseFloat(form.montant), categorie: form.categorie, date: form.date, recurrent: form.recurrent })
    }
    setModal(null); setEditing(null)
    await load()
  }

  async function handleDelete(id: string) {
    await personalApi.revenus.remove(id)
    setDeleting(null)
    await load()
  }

  const total   = items.reduce((a, i) => a + i.montant, 0)
  const catInfo = (v: string) => CATEGORIES_REVENUS.find((c) => c.value === v)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Revenus</h2>
          <p className="mt-1 text-sm text-gray-500">Suivi de vos revenus personnels</p>
        </div>
        <button onClick={() => { setEditing(null); setModal('add') }} className="btn-primary">
          + Nouveau revenu
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <input
          type="month"
          className="input w-full sm:w-44"
          value={filterMois}
          onChange={(e) => e.target.value && setPeriod(e.target.value)}
        />
        <select className="input w-full sm:w-52" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {CATEGORIES_REVENUS.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
        </select>
      </div>

      {/* Résumé */}
      {!loading && (
        <div className="flex items-center justify-between rounded-xl bg-green-50 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-green-700">Total revenus</p>
            <p className="mt-0.5 text-2xl font-bold text-green-600">{fmt(total)}</p>
          </div>
          <p className="text-sm text-green-400">{items.length} entrée{items.length > 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Répartition par catégorie */}
      {!loading && items.length > 0 && (() => {
        const byCat: Record<string, number> = {}
        for (const i of items) byCat[i.categorie] = (byCat[i.categorie] ?? 0) + i.montant
        const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1])
        return (
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Répartition par catégorie</h3>
            <div className="space-y-2">
              {sorted.map(([cat, val]) => {
                const info = catInfo(cat)
                const pct  = total > 0 ? Math.round((val / total) * 100) : 0
                return (
                  <div key={cat}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-gray-600">{info?.emoji} {info?.label ?? cat}</span>
                      <span className="font-medium text-gray-900">{fmt(val)} <span className="text-gray-400">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-green-100">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Liste */}
      {loading ? (
        <div className="flex items-center gap-3 py-8 text-sm text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-forest-900 border-t-transparent" />Chargement…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
          <p className="text-3xl">📈</p>
          <p className="mt-2 text-sm text-gray-500">Aucun revenu pour cette période</p>
          <button onClick={() => { setEditing(null); setModal('add') }} className="btn-primary mt-4 text-sm">+ Ajouter</button>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Libellé', 'Catégorie', 'Montant', ''].map((h) => (
                  <th key={h} className={`px-4 py-3 text-xs font-medium uppercase text-gray-500 ${h === 'Montant' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => {
                const cat = catInfo(item.categorie)
                return (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{new Date(item.date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">{item.libelle}</span>
                      {item.recurrent && <span className="ml-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Récurrent</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                        {cat?.emoji} {cat?.label ?? item.categorie}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-green-600">+{fmt(item.montant)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button onClick={() => { setEditing(item); setModal('edit') }} className="mr-2 text-xs text-gray-400 hover:text-gray-700">Modifier</button>
                      <button onClick={() => setDeleting(item.id)} className="text-xs text-red-400 hover:text-red-600">Supprimer</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {(modal === 'add' || modal === 'edit') && (
        <RevenuModal initial={editing} onSave={handleSave} onClose={() => { setModal(null); setEditing(null) }} />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-semibold text-gray-900">Supprimer ce revenu ?</h3>
            <p className="mt-2 text-sm text-gray-500">Cette action est irréversible.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDeleting(null)} className="btn-secondary">Annuler</button>
              <button onClick={() => { void handleDelete(deleting) }} className="btn-primary bg-red-600 hover:bg-red-700">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
