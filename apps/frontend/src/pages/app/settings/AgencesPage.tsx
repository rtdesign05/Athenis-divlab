import { useState, useEffect, useCallback } from 'react'
import { settingsApi, type Agence, type CreateAgenceDto } from '@/services/settingsApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 px-5 py-3 text-sm text-white shadow-lg">
      {message}
    </div>
  )
}

// ── Agence Modal ──────────────────────────────────────────────────────────────

const EMPTY_FORM: CreateAgenceDto = {
  code:      '',
  nom:       '',
  adresse:   '',
  ville:     '',
  telephone: '',
  email:     '',
  isSiege:   false,
}

interface AgenceModalProps {
  initial?: Agence | null
  onClose: () => void
  onSuccess: (agence: Agence) => void
}

function AgenceModal({ initial, onClose, onSuccess }: AgenceModalProps) {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState<CreateAgenceDto>(() =>
    initial
      ? {
          code:      initial.code,
          nom:       initial.nom,
          adresse:   initial.adresse ?? '',
          ville:     initial.ville ?? '',
          telephone: initial.telephone ?? '',
          email:     initial.email ?? '',
          isSiege:   initial.isSiege,
        }
      : { ...EMPTY_FORM },
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof CreateAgenceDto, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim()) { setError('Le code est requis'); return }
    if (!form.nom.trim())  { setError('Le nom est requis');  return }

    setLoading(true)
    setError(null)
    try {
      const body: CreateAgenceDto = {
        code:    form.code.trim().toUpperCase(),
        nom:     form.nom.trim(),
        isSiege: form.isSiege ?? false,
        ...(form.adresse?.trim()   ? { adresse:   form.adresse.trim() }   : {}),
        ...(form.ville?.trim()     ? { ville:     form.ville.trim() }     : {}),
        ...(form.telephone?.trim() ? { telephone: form.telephone.trim() } : {}),
        ...(form.email?.trim()     ? { email:     form.email.trim() }     : {}),
      }

      const result = isEdit && initial
        ? await settingsApi.updateAgence(initial.id, body)
        : await settingsApi.createAgence(body)

      onSuccess(result as Agence)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Modifier l\'agence' : 'Nouvelle agence'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Code + Nom */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder="HQ"
                maxLength={20}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => set('nom', e.target.value)}
                placeholder="Siège social"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          {/* Ville + Adresse */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input
                type="text"
                value={form.ville ?? ''}
                onChange={(e) => set('ville', e.target.value)}
                placeholder="Douala"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="text"
                value={form.telephone ?? ''}
                onChange={(e) => set('telephone', e.target.value)}
                placeholder="+237 6XX XXX XXX"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <input
              type="text"
              value={form.adresse ?? ''}
              onChange={(e) => set('adresse', e.target.value)}
              placeholder="123 Rue de la Paix, Bonanjo"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email ?? ''}
              onChange={(e) => set('email', e.target.value)}
              placeholder="agence@exemple.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {/* Siège toggle */}
          <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={form.isSiege ?? false}
              onChange={(e) => set('isSiege', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Siège social</p>
              <p className="text-xs text-gray-500">Cette agence est le siège principal de l'entreprise</p>
            </div>
          </label>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </form>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={loading}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Enregistrement…' : isEdit ? 'Modifier' : 'Créer l\'agence'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Confirm Delete ────────────────────────────────────────────────────────────

interface ConfirmDeleteProps {
  agence: Agence
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

function ConfirmDelete({ agence, onConfirm, onCancel, loading }: ConfirmDeleteProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Supprimer l'agence</h3>
        <p className="text-sm text-gray-600">
          Supprimer <strong>{agence.nom}</strong> ({agence.code}) ? Cette action est irréversible.
        </p>
        {agence._count.members > 0 && (
          <p className="mt-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            ⚠️ {agence._count.members} membre(s) rattaché(s) — vous devez les retirer d'abord.
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || agence._count.members > 0}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            {loading ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AgencesPage() {
  const [agences, setAgences] = useState<Agence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Agence | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Agence | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await settingsApi.listAgences()
      setAgences(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function openCreate() { setEditTarget(null); setShowModal(true) }
  function openEdit(a: Agence) { setEditTarget(a); setShowModal(true) }

  function handleSuccess(agence: Agence) {
    setAgences((prev) => {
      const idx = prev.findIndex((a) => a.id === agence.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = agence
        return next.sort((a, b) => (b.isSiege ? 1 : 0) - (a.isSiege ? 1 : 0) || a.nom.localeCompare(b.nom))
      }
      return [...prev, agence].sort((a, b) => (b.isSiege ? 1 : 0) - (a.isSiege ? 1 : 0) || a.nom.localeCompare(b.nom))
    })
    setToast(editTarget ? 'Agence modifiée' : 'Agence créée')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await settingsApi.deleteAgence(deleteTarget.id)
      setAgences((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      setToast('Agence supprimée')
      setDeleteTarget(null)
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Erreur lors de la suppression')
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleToggleActive(a: Agence) {
    try {
      const updated = await settingsApi.updateAgence(a.id, { isActive: !a.isActive })
      setAgences((prev) => prev.map((x) => (x.id === a.id ? (updated as Agence) : x)))
      setToast(a.isActive ? 'Agence désactivée' : 'Agence activée')
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Erreur')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
    )
  }

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {showModal && (
        <AgenceModal
          initial={editTarget}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {deleteTarget && (
        <ConfirmDelete
          agence={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Agences ({agences.length})
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gérez les agences, succursales et points de vente de votre entreprise.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle agence
          </button>
        </div>

        {agences.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
            <p className="text-2xl mb-3">🏢</p>
            <p className="text-sm font-medium text-gray-700">Aucune agence configurée</p>
            <p className="mt-1 text-xs text-gray-400 mb-5">
              Créez vos agences pour gérer plusieurs sites et isoler les données par site.
            </p>
            <button
              onClick={openCreate}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
              Créer la première agence
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {agences.map((agence) => (
              <div
                key={agence.id}
                className={`rounded-xl border bg-white p-5 transition-all ${
                  agence.isActive
                    ? 'border-gray-200 shadow-sm hover:shadow-md'
                    : 'border-gray-100 opacity-60'
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600 font-bold text-sm shrink-0">
                      {agence.code.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">{agence.nom}</p>
                        {agence.isSiege && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            SIÈGE
                          </span>
                        )}
                        {!agence.isActive && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                            INACTIF
                          </span>
                        )}
                      </div>
                      {agence.ville && (
                        <p className="text-xs text-gray-400 mt-0.5">{agence.ville}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1 mb-4">
                  {agence.telephone && (
                    <p className="text-xs text-gray-500">📞 {agence.telephone}</p>
                  )}
                  {agence.email && (
                    <p className="text-xs text-gray-500 truncate">✉️ {agence.email}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    👥 {agence._count.members} membre{agence._count.members !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openEdit(agence)}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => void handleToggleActive(agence)}
                    className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      agence.isActive
                        ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                        : 'border-green-200 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    {agence.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                  {!agence.isSiege && (
                    <button
                      onClick={() => setDeleteTarget(agence)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
