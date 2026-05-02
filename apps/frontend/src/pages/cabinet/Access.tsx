import { useEffect, useState, useRef, useCallback } from 'react'
import {
  cabinetApi,
  MANDAT_TYPE_LABELS,
  MANDAT_TYPE_COLORS,
  PLAN_COLORS,
  ALL_MODULES,
} from '@/services/cabinetApi'
import type { Mandat, MandatType, CompanySearchResult, CabinetInvitation } from '@/services/cabinetApi'

// ── Constants ─────────────────────────────────────────────────────────────────

const INVITE_STATUS_LABELS: Record<string, string> = {
  PENDING:   'En attente',
  ACCEPTED:  'Acceptée',
  REJECTED:  'Refusée',
  CANCELLED: 'Annulée',
}

const INVITE_STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-700',
  ACCEPTED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

// ── Company Search ────────────────────────────────────────────────────────────

function CompanySearch({
  selected,
  onSelect,
}: {
  selected: CompanySearchResult | null
  onSelect: (c: CompanySearchResult | null) => void
}) {
  const [q, setQ]             = useState('')
  const [results, setResults] = useState<CompanySearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const timer                 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef          = useRef<HTMLDivElement>(null)

  const search = useCallback((val: string) => {
    if (val.trim().length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    cabinetApi.searchCompanies(val)
      .then((r) => { setResults(r); setOpen(r.length > 0) })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [])

  function handleChange(val: string) {
    setQ(val)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => search(val), 350)
  }

  function handleSelect(c: CompanySearchResult) {
    onSelect(c)
    setQ(''); setResults([]); setOpen(false)
  }

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOut)
    return () => document.removeEventListener('mousedown', onOut)
  }, [])

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-forest-200 bg-forest-50 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-gray-900">{selected.nom}</p>
          <p className="text-xs text-gray-500">
            {selected.siren ? `SIREN ${selected.siren}` : selected.niu ? `NIU ${selected.niu}` : selected.secteur ?? selected.taille}
            {selected.ville ? ` · ${selected.ville}` : ''}
          </p>
        </div>
        <button type="button" onClick={() => onSelect(null)} className="ml-3 text-xs text-gray-400 hover:text-gray-700">
          Changer
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="search"
          autoFocus
          placeholder="Nom de l'entreprise, SIREN, NIU…"
          value={q}
          onChange={(e) => handleChange(e.target.value)}
          className="input w-full pr-8 text-sm"
        />
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-forest-600 border-t-transparent" />
          </div>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{c.nom}</p>
                <p className="text-xs text-gray-400">
                  {c.siren ? `SIREN ${c.siren}` : c.niu ? `NIU ${c.niu}` : c.secteur ?? c.taille}
                  {c.ville ? ` · ${c.ville}` : ''}
                </p>
              </div>
              <span className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_COLORS[c.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                {c.plan}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && !loading && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-500 shadow-lg">
          Aucune entreprise trouvée pour « {q} »
        </div>
      )}
    </div>
  )
}

// ── Invitation Form ───────────────────────────────────────────────────────────

interface InviteForm {
  type: MandatType
  modules: string[]
  notes: string
}

const EMPTY_FORM: InviteForm = { type: 'COMPLET', modules: [], notes: '' }

function InvitationForm({ form, onChange }: { form: InviteForm; onChange: (f: InviteForm) => void }) {
  function toggleModule(key: string) {
    onChange({
      ...form,
      modules: form.modules.includes(key)
        ? form.modules.filter((m) => m !== key)
        : [...form.modules, key],
    })
  }
  return (
    <div className="space-y-4">
      <div>
        <label className="label">Type de mission</label>
        <select
          value={form.type}
          onChange={(e) => onChange({ ...form, type: e.target.value as MandatType })}
          className="input w-full"
        >
          {(Object.keys(MANDAT_TYPE_LABELS) as MandatType[]).map((k) => (
            <option key={k} value={k}>{MANDAT_TYPE_LABELS[k]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Modules accessibles</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ALL_MODULES.map(({ key, label }) => {
            const checked = form.modules.includes(key)
            return (
              <label
                key={key}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  checked ? 'border-forest-400 bg-forest-50 text-forest-900' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <input type="checkbox" className="h-3.5 w-3.5 accent-forest-700" checked={checked} onChange={() => toggleModule(key)} />
                {label}
              </label>
            )
          })}
        </div>
        <p className="mt-1 text-xs text-gray-400">Vide = accès à tous les modules</p>
      </div>
      <div>
        <label className="label">Message pour l'entreprise <span className="font-normal text-gray-400">(optionnel)</span></label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          placeholder="Présentez votre cabinet, le contexte de la mission…"
          className="input w-full resize-none"
        />
      </div>
    </div>
  )
}

// ── Send Invitation Modal ─────────────────────────────────────────────────────

function SendInvitationModal({
  onClose,
  onSent,
}: {
  onClose: () => void
  onSent:  (inv: CabinetInvitation) => void
}) {
  const [company, setCompany] = useState<CompanySearchResult | null>(null)
  const [form, setForm]       = useState<InviteForm>(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!company) { setError('Veuillez sélectionner une entreprise'); return }
    setSaving(true); setError('')
    try {
      const inv = await cabinetApi.sendInvitation({
        companyId: company.id,
        type:      form.type,
        modules:   form.modules,
        ...(form.notes ? { notes: form.notes } : {}),
      })
      onSent(inv)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Une erreur est survenue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl sm:my-8">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="font-semibold text-gray-900">Inviter une entreprise</h3>
            <p className="text-xs text-gray-400 mt-0.5">Un e-mail sera envoyé à l'entreprise pour valider la connexion</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-5 py-5">
            <div>
              <label className="label">Entreprise</label>
              <CompanySearch selected={company} onSelect={setCompany} />
            </div>
            <InvitationForm form={form} onChange={setForm} />
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Envoi…
                </span>
              ) : '📨 Envoyer l\'invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Mandat Edit Modal ─────────────────────────────────────────────────────────

interface MandatEditForm {
  type: MandatType
  modules: string[]
  notes: string
  dateDebut: string
  dateFin: string
}

function MandatEditModal({
  mandat,
  onClose,
  onSaved,
}: {
  mandat:  Mandat
  onClose: () => void
  onSaved: (m: Mandat) => void
}) {
  const [form, setForm]     = useState<MandatEditForm>({
    type:      mandat.type,
    modules:   mandat.modules,
    notes:     mandat.notes ?? '',
    dateDebut: mandat.dateDebut?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    dateFin:   mandat.dateFin?.slice(0, 10) ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function toggleModule(key: string) {
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(key) ? f.modules.filter((m) => m !== key) : [...f.modules, key],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const saved = await cabinetApi.updateMandat(mandat.companyId, {
        type:    form.type,
        modules: form.modules,
        notes:   form.notes || null,
        ...(form.dateDebut ? { dateDebut: form.dateDebut } : {}),
        dateFin: form.dateFin || null,
      })
      onSaved(saved)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl sm:my-8">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="font-semibold text-gray-900">Modifier le mandat — {mandat.company.nom}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-5 py-5">
            <div>
              <label className="label">Type de mission</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as MandatType }))} className="input w-full">
                {(Object.keys(MANDAT_TYPE_LABELS) as MandatType[]).map((k) => (
                  <option key={k} value={k}>{MANDAT_TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Modules accessibles</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ALL_MODULES.map(({ key, label }) => {
                  const checked = form.modules.includes(key)
                  return (
                    <label key={key} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${checked ? 'border-forest-400 bg-forest-50 text-forest-900' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                      <input type="checkbox" className="h-3.5 w-3.5 accent-forest-700" checked={checked} onChange={() => toggleModule(key)} />
                      {label}
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date de début</label>
                <input type="date" value={form.dateDebut} onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))} className="input w-full" />
              </div>
              <div>
                <label className="label">Date de fin <span className="font-normal text-gray-400">(opt.)</span></label>
                <input type="date" value={form.dateFin} onChange={(e) => setForm((f) => ({ ...f, dateFin: e.target.value }))} className="input w-full" />
              </div>
            </div>
            <div>
              <label className="label">Notes internes <span className="font-normal text-gray-400">(opt.)</span></label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="input w-full resize-none" />
            </div>
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ mandat, onClose, onDeleted }: { mandat: Mandat; onClose: () => void; onDeleted: (id: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  async function go() {
    setLoading(true)
    try { await cabinetApi.deleteMandat(mandat.companyId); onDeleted(mandat.companyId) }
    catch (err: any) { setError(err?.response?.data?.message ?? 'Erreur'); setLoading(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <p className="font-semibold text-gray-900">Supprimer ce mandat ?</p>
        <p className="mt-2 text-sm text-gray-500">Le mandat avec <strong>{mandat.company.nom}</strong> sera définitivement supprimé. L'entreprise conserve ses données.</p>
        {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={go} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
            {loading ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Suppression…</> : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function CabinetAccess() {
  const [mandats, setMandats]         = useState<Mandat[]>([])
  const [invitations, setInvitations] = useState<CabinetInvitation[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [toggling, setToggling]       = useState<string | null>(null)
  const [cancelling, setCancelling]   = useState<string | null>(null)
  const [mandatFilter, setMandatFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editTarget, setEditTarget]           = useState<Mandat | null>(null)
  const [deleteTarget, setDeleteTarget]       = useState<Mandat | null>(null)

  useEffect(() => {
    Promise.all([cabinetApi.mandats(), cabinetApi.invitations()])
      .then(([m, i]) => { setMandats(m); setInvitations(i) })
      .catch(() => setError('Impossible de charger les données'))
      .finally(() => setLoading(false))
  }, [])

  async function handleToggle(mandat: Mandat) {
    setToggling(mandat.companyId)
    try {
      const updated = await cabinetApi.toggleMandat(mandat.companyId)
      setMandats((prev) => prev.map((m) => (m.companyId === mandat.companyId ? { ...m, isActive: updated.isActive } : m)))
    } catch { /* silent */ }
    finally { setToggling(null) }
  }

  async function handleCancelInvite(inv: CabinetInvitation) {
    setCancelling(inv.id)
    try {
      const updated = await cabinetApi.cancelInvitation(inv.id)
      setInvitations((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    } catch { /* silent */ }
    finally { setCancelling(null) }
  }

  const filteredMandats = mandats.filter((m) =>
    mandatFilter === 'ACTIVE' ? m.isActive : mandatFilter === 'INACTIVE' ? !m.isActive : true
  )
  const pendingInvites  = invitations.filter((i) => i.status === 'PENDING')
  const pastInvites     = invitations.filter((i) => i.status !== 'PENDING')

  return (
    <>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Accès & Mandats</h2>
            <p className="mt-1 text-sm text-gray-500">Gérez vos mandats et invitations d'entreprises clientes</p>
          </div>
          <button onClick={() => setShowInviteModal(true)} className="btn-primary">
            + Inviter une entreprise
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-forest-900 border-t-transparent" />
            Chargement…
          </div>
        )}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* ── Pending invitations ─────────────────────────────────────────── */}
        {pendingInvites.length > 0 && (
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">{pendingInvites.length}</span>
              Invitations en attente
            </h3>
            <div className="space-y-2">
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{inv.company.nom}</p>
                    <p className="text-xs text-gray-500">
                      <span className={`mr-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${MANDAT_TYPE_COLORS[inv.type]}`}>
                        {MANDAT_TYPE_LABELS[inv.type]}
                      </span>
                      Envoyée à {inv.sentTo} · expire le {new Date(inv.expiresAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    ⏳ En attente
                  </span>
                  <button
                    onClick={() => handleCancelInvite(inv)}
                    disabled={cancelling === inv.id}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    {cancelling === inv.id ? 'Annulation…' : 'Annuler'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Active mandats ──────────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Mandats ({mandats.length})
            </h3>
            {mandats.length > 0 && (
              <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
                {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setMandatFilter(f)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      mandatFilter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {f === 'ALL' ? 'Tous' : f === 'ACTIVE' ? 'Actifs' : 'Inactifs'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!loading && mandats.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
              <p className="text-3xl">🔑</p>
              <p className="mt-2 font-semibold text-gray-700">Aucun mandat actif</p>
              <p className="mt-1 text-sm text-gray-500">
                Invitez une entreprise — le mandat sera créé automatiquement une fois son invitation acceptée.
              </p>
              <button onClick={() => setShowInviteModal(true)} className="btn-primary mt-4">
                + Inviter une entreprise
              </button>
            </div>
          )}

          {filteredMandats.length > 0 && (
            <div className="card overflow-hidden p-0">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Entreprise', 'Mission', 'Modules', 'Depuis', 'Statut', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredMandats.map((m) => {
                    const isToggling = toggling === m.companyId
                    return (
                      <tr key={m.id} className={`transition-colors hover:bg-gray-50 ${!m.isActive ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{m.company.nom}</p>
                          {m.company.siren && <p className="text-xs text-gray-400">SIREN {m.company.siren}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${MANDAT_TYPE_COLORS[m.type]}`}>
                            {MANDAT_TYPE_LABELS[m.type]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {m.modules.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {m.modules.slice(0, 3).map((mod) => (
                                <span key={mod} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{mod}</span>
                              ))}
                              {m.modules.length > 3 && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">+{m.modules.length - 3}</span>}
                            </div>
                          ) : <span className="text-xs text-gray-400">Tous</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {new Date(m.dateDebut ?? m.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${m.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${m.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {m.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button onClick={() => setEditTarget(m)} className="text-xs font-medium text-gray-500 hover:text-gray-800">Modifier</button>
                            <button onClick={() => handleToggle(m)} disabled={isToggling} className={`text-xs font-medium disabled:opacity-50 ${m.isActive ? 'text-amber-600 hover:text-amber-800' : 'text-forest-700 hover:text-forest-900'}`}>
                              {isToggling ? '…' : m.isActive ? 'Désactiver' : 'Activer'}
                            </button>
                            <button onClick={() => setDeleteTarget(m)} className="text-xs font-medium text-red-500 hover:text-red-700">Supprimer</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Past invitations ────────────────────────────────────────────── */}
        {pastInvites.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Historique des invitations
            </h3>
            <div className="card overflow-hidden p-0">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Entreprise', 'Mission', 'Envoyée à', 'Date', 'Statut'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pastInvites.map((inv) => (
                    <tr key={inv.id} className="opacity-70">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.company.nom}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${MANDAT_TYPE_COLORS[inv.type]}`}>
                          {MANDAT_TYPE_LABELS[inv.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{inv.sentTo}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {new Date(inv.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${INVITE_STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {INVITE_STATUS_LABELS[inv.status] ?? inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && !error && mandats.length > 0 && (
          <p className="text-xs text-gray-400">
            La désactivation suspend l'accès du cabinet. La suppression est définitive mais l'entreprise conserve ses données.
          </p>
        )}
      </div>

      {/* Modals */}
      {showInviteModal && (
        <SendInvitationModal
          onClose={() => setShowInviteModal(false)}
          onSent={(inv) => { setInvitations((prev) => [inv, ...prev]); setShowInviteModal(false) }}
        />
      )}
      {editTarget && (
        <MandatEditModal
          mandat={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(saved) => { setMandats((prev) => prev.map((m) => (m.id === saved.id ? saved : m))); setEditTarget(null) }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          mandat={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(cid) => { setMandats((prev) => prev.filter((m) => m.companyId !== cid)); setDeleteTarget(null) }}
        />
      )}
    </>
  )
}
