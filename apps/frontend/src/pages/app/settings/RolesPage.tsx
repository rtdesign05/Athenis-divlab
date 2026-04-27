import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import {
  settingsApi,
  type CompanyRole,
  type SettingsUser,
  type RolePermissions,
  type PermissionLevel,
} from '@/services/settingsApi'

// ── Types accès trésorerie (modèle scopé par agence) ─────────────────────────

type TresoResourceType = 'banque' | 'caisse' | 'mobile_money'
type TresoLevel = 'lecture' | 'ecriture'

interface TresoAccess {
  id: string
  sujet: string
  sujetType: 'role' | 'utilisateur'
  agence: string                    // périmètre géographique strict
  ressourceTypes: TresoResourceType[] // types autorisés dans cette agence
  niveau: TresoLevel
}

// Agences et les types de ressources qu'elles possèdent réellement
const AGENCES_TRESO: { label: string; types: TresoResourceType[] }[] = [
  { label: 'Toutes les agences',         types: ['banque', 'caisse', 'mobile_money'] },
  { label: 'Siège',                       types: ['banque', 'caisse'] },
  { label: 'Agence Douala — Akwa',        types: ['caisse'] },
  { label: 'Succursale Yaoundé — Centre', types: ['caisse'] },
  { label: 'Bureau Bafoussam',            types: ['caisse'] },
]

const TYPE_LABELS: Record<TresoResourceType, string> = {
  banque:       'Comptes bancaires',
  caisse:       'Caisses',
  mobile_money: 'Mobile Money',
}

const TYPE_COLORS: Record<TresoResourceType, string> = {
  banque:       'bg-blue-100 text-blue-700',
  caisse:       'bg-amber-100 text-amber-700',
  mobile_money: 'bg-purple-100 text-purple-700',
}

const LEVEL_COLORS: Record<TresoLevel, string> = {
  lecture:  'bg-blue-100 text-blue-700',
  ecriture: 'bg-green-100 text-green-700',
}

function userDisplayName(u: SettingsUser): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ')
  return full || u.email
}

function buildInitialAccesses(roles: CompanyRole[]): TresoAccess[] {
  const adminName = roles.find(r => /admin/i.test(r.name))?.name ?? roles[0]?.name ?? 'Admin'
  const comptName = roles.find(r => /compt/i.test(r.name))?.name ?? roles[1]?.name ?? 'Comptable'
  return [
    {
      id: 'a1', sujet: adminName, sujetType: 'role',
      agence: 'Toutes les agences', ressourceTypes: ['banque', 'caisse', 'mobile_money'], niveau: 'ecriture',
    },
    {
      id: 'a2', sujet: comptName, sujetType: 'role',
      agence: 'Toutes les agences', ressourceTypes: ['banque', 'caisse', 'mobile_money'], niveau: 'lecture',
    },
  ]
}

// ── Modal ajout / modification accès ─────────────────────────────────────────

function ModalTresoAccess({ initial, sujets, onSave, onClose }: {
  initial?: TresoAccess
  sujets: { label: string; type: 'role' | 'utilisateur' }[]
  onSave: (a: Omit<TresoAccess, 'id'>) => void
  onClose: () => void
}) {
  const editing = !!initial
  const defaultAgence = AGENCES_TRESO[0]!

  const [form, setForm] = useState({
    sujet:          initial?.sujet         ?? sujets[0]?.label ?? '',
    sujetType:      initial?.sujetType     ?? 'role' as 'role' | 'utilisateur',
    agence:         initial?.agence        ?? defaultAgence.label,
    ressourceTypes: initial?.ressourceTypes ?? [...defaultAgence.types],
    niveau:         initial?.niveau        ?? 'lecture' as TresoLevel,
  })

  const agenceInfo = AGENCES_TRESO.find(a => a.label === form.agence) ?? defaultAgence

  // Quand l'agence change, on recalcule les types disponibles
  function handleAgenceChange(label: string) {
    const ag = AGENCES_TRESO.find(a => a.label === label) ?? defaultAgence
    setForm(f => ({ ...f, agence: label, ressourceTypes: [...ag.types] }))
  }

  function toggleType(t: TresoResourceType) {
    setForm(f => ({
      ...f,
      ressourceTypes: f.ressourceTypes.includes(t)
        ? f.ressourceTypes.filter(x => x !== t)
        : [...f.ressourceTypes, t],
    }))
  }

  function handleSujetChange(label: string) {
    const s = sujets.find(s => s.label === label)
    setForm(f => ({ ...f, sujet: label, sujetType: s?.type ?? f.sujetType }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.ressourceTypes.length === 0) return
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            {editing ? 'Modifier l\'accès' : 'Ajouter un accès trésorerie'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">

          {/* Sujet */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rôle ou utilisateur</label>
            <select value={form.sujet} onChange={e => handleSujetChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30">
              <optgroup label="Rôles">
                {sujets.filter(s => s.type === 'role').map(s => (
                  <option key={s.label} value={s.label}>{s.label}</option>
                ))}
              </optgroup>
              <optgroup label="Utilisateurs">
                {sujets.filter(s => s.type === 'utilisateur').map(s => (
                  <option key={s.label} value={s.label}>{s.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Agence — périmètre strict */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Périmètre (agence)
              <span className="ml-1 font-normal text-gray-400">— l'accès est limité à cette agence uniquement</span>
            </label>
            <select value={form.agence} onChange={e => handleAgenceChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30">
              {AGENCES_TRESO.map(a => (
                <option key={a.label} value={a.label}>{a.label}</option>
              ))}
            </select>
            {form.agence !== 'Toutes les agences' && (
              <p className="mt-1 text-[11px] text-amber-600 font-medium">
                ⚠ Cet utilisateur ne verra pas la trésorerie des autres agences.
              </p>
            )}
          </div>

          {/* Types de ressources disponibles dans cette agence */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Ressources accessibles dans {form.agence === 'Toutes les agences' ? 'toutes les agences' : form.agence}
            </label>
            <div className="flex flex-col gap-2">
              {agenceInfo.types.map(t => (
                <label key={t} className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${form.ressourceTypes.includes(t) ? 'border-forest-500 bg-forest-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="checkbox" checked={form.ressourceTypes.includes(t)}
                    onChange={() => toggleType(t)} className="accent-forest-600" />
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_COLORS[t]}`}>
                    {TYPE_LABELS[t]}
                  </span>
                </label>
              ))}
            </div>
            {form.ressourceTypes.length === 0 && (
              <p className="mt-1 text-[11px] text-red-500">Sélectionnez au moins un type de ressource.</p>
            )}
          </div>

          {/* Niveau */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Niveau d'accès</label>
            <div className="flex gap-3">
              {(['lecture', 'ecriture'] as TresoLevel[]).map(lvl => (
                <label key={lvl} className={`flex-1 flex items-center gap-2 rounded-lg border-2 px-3 py-2 cursor-pointer transition-colors ${form.niveau === lvl ? 'border-forest-600 bg-forest-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="niveau" value={lvl} checked={form.niveau === lvl}
                    onChange={() => setForm(f => ({ ...f, niveau: lvl }))} className="accent-forest-600" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800 capitalize">{lvl}</p>
                    <p className="text-[10px] text-gray-400">{lvl === 'lecture' ? 'Consulter seulement' : 'Consulter & modifier'}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={form.ressourceTypes.length === 0}
              className="flex-1 rounded-lg bg-forest-900 py-2 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-40">
              {editing ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Section accès trésorerie ──────────────────────────────────────────────────

function TresoAccessSection({ roles, users }: { roles: CompanyRole[]; users: SettingsUser[] }) {
  const sujets = [
    ...roles.map(r => ({ label: r.name, type: 'role' as const })),
    ...users.map(u => ({ label: userDisplayName(u), type: 'utilisateur' as const })),
  ]

  const [accesses, setAccesses] = useState<TresoAccess[]>([])
  const initialized = useRef(false)
  useEffect(() => {
    if (roles.length > 0 && !initialized.current) {
      initialized.current = true
      setAccesses(buildInitialAccesses(roles))
    }
  }, [roles])

  const [filterSujet, setFilterSujet] = useState('all')
  const [filterAgence, setFilterAgence] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<TresoAccess | null>(null)

  function addOrUpdate(data: Omit<TresoAccess, 'id'>) {
    if (editing) {
      setAccesses(prev => prev.map(a => a.id === editing.id ? { ...a, ...data } : a))
      setEditing(null)
    } else {
      setAccesses(prev => [...prev, { ...data, id: Date.now().toString() }])
      setShowModal(false)
    }
  }

  function remove(id: string) {
    setAccesses(prev => prev.filter(a => a.id !== id))
  }

  const filtered = accesses.filter(a => {
    if (filterSujet !== 'all' && a.sujet !== filterSujet) return false
    if (filterAgence !== 'all' && a.agence !== filterAgence) return false
    return true
  })

  const bySujet = filtered.reduce<Record<string, TresoAccess[]>>((acc, a) => {
    ;(acc[a.sujet] ??= []).push(a)
    return acc
  }, {})

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Accès à la trésorerie</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Chaque accès est limité à une agence — un chef d'agence ne voit pas la trésorerie des autres agences.
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-forest-900 px-3 py-2 text-sm font-medium text-white hover:bg-forest-800 transition-colors">
          <span className="text-base leading-none">+</span> Ajouter un accès
        </button>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={filterSujet} onChange={e => setFilterSujet(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-forest-500/30">
          <option value="all">Tous les utilisateurs / rôles</option>
          {sujets.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
        </select>
        <select value={filterAgence} onChange={e => setFilterAgence(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-forest-500/30">
          <option value="all">Toutes les agences</option>
          {AGENCES_TRESO.map(a => <option key={a.label} value={a.label}>{a.label}</option>)}
        </select>
      </div>

      {/* Tableau */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {Object.keys(bySujet).length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Aucun accès configuré</p>
        ) : (
          Object.entries(bySujet).map(([sujet, rows]) => {
            const first = rows[0]!
            return (
              <div key={sujet} className="border-b border-gray-100 last:border-b-0">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-800">{sujet}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${first.sujetType === 'role' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {first.sujetType === 'role' ? 'Rôle' : 'Utilisateur'}
                  </span>
                  <span className="ml-auto text-[11px] text-gray-400">{rows.length} périmètre{rows.length > 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {rows.map(a => (
                    <div key={a.id} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/60">
                      {/* Agence badge */}
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${a.agence === 'Toutes les agences' ? 'border-green-300 text-green-700 bg-green-50' : 'border-amber-300 text-amber-700 bg-amber-50'}`}>
                        {a.agence === 'Toutes les agences' ? 'Toutes agences' : a.agence}
                      </span>
                      {/* Types */}
                      <div className="flex-1 flex flex-wrap gap-1">
                        {a.ressourceTypes.map(t => (
                          <span key={t} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_COLORS[t]}`}>
                            {TYPE_LABELS[t]}
                          </span>
                        ))}
                      </div>
                      {/* Niveau */}
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${LEVEL_COLORS[a.niveau]}`}>
                        {a.niveau === 'lecture' ? 'Lecture' : 'Écriture'}
                      </span>
                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditing(a)} title="Modifier"
                          className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:bg-blue-50 hover:text-blue-600 text-xs">✎</button>
                        <button onClick={() => remove(a.id)} title="Supprimer"
                          className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500 text-sm font-bold">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {(showModal || editing) && (
        <ModalTresoAccess
          initial={editing ?? undefined}
          sujets={sujets}
          onSave={addOrUpdate}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </section>
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MODULES: (keyof RolePermissions)[] = [
  'gestion',
  'comptabilite',
  'rh',
  'juridique',
  'esg',
  'settings',
]

const MODULE_LABELS: Record<keyof RolePermissions, string> = {
  gestion:      'Gestion',
  comptabilite: 'Comptabilité',
  rh:           'RH',
  juridique:    'Juridique',
  esg:          'ESG',
  settings:     'Paramètres',
}

const LEVELS: PermissionLevel[] = ['none', 'read', 'write', 'admin']

const LEVEL_LABELS: Record<PermissionLevel, string> = {
  none:  'Aucun',
  read:  'Lecture',
  write: 'Écriture',
  admin: 'Admin',
}

const SYSTEM_ROLE_ICONS: Record<string, string> = {
  Admin:    '👑',
  Comptable:'📊',
  RH:       '👥',
  Readonly: '📖',
}

const DEFAULT_PERMISSIONS: RolePermissions = {
  gestion:      'none',
  comptabilite: 'none',
  rh:           'none',
  juridique:    'none',
  esg:          'none',
  settings:     'none',
}

// ── Toggle ────────────────────────────────────────────────────────────────────

// ── Permission badge ──────────────────────────────────────────────────────────

function PermissionBadge({ level }: { level: PermissionLevel }) {
  if (level === 'none') return null
  const styles: Record<Exclude<PermissionLevel, 'none'>, string> = {
    read:  'bg-blue-100 text-blue-700',
    write: 'bg-forest-100 text-forest-700',
    admin: 'bg-purple-100 text-purple-700',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[level as Exclude<PermissionLevel, 'none'>]}`}
    >
      {LEVEL_LABELS[level]}
    </span>
  )
}

// ── System role card ──────────────────────────────────────────────────────────

function SystemRoleCard({ role }: { role: CompanyRole }) {
  const icon =
    SYSTEM_ROLE_ICONS[role.name] ??
    Object.entries(SYSTEM_ROLE_ICONS).find(([k]) =>
      role.name.toLowerCase().includes(k.toLowerCase()),
    )?.[1] ??
    '🔐'

  const activePerms = MODULES.filter((m) => role.permissions[m] !== 'none')

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">
            {icon}
          </span>
          <span className="text-sm font-semibold text-gray-900">{role.name}</span>
        </div>
        <span className="text-xs text-gray-400">
          {role.userCount} utilisateur{role.userCount !== 1 ? 's' : ''}
        </span>
      </div>
      {role.description && (
        <p className="text-xs text-gray-500">{role.description}</p>
      )}
      {activePerms.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activePerms.map((m) => (
            <div key={m} className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                {MODULE_LABELS[m]}:
              </span>
              <PermissionBadge level={role.permissions[m]} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Permission matrix ─────────────────────────────────────────────────────────

function PermissionMatrix({
  permissions,
  onChange,
}: {
  permissions: RolePermissions
  onChange: (p: RolePermissions) => void
}) {
  function setLevel(module: keyof RolePermissions, level: PermissionLevel) {
    onChange({ ...permissions, [module]: level })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 pr-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">
              Module
            </th>
            {LEVELS.map((l) => (
              <th
                key={l}
                className="py-2 px-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >
                {LEVEL_LABELS[l]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {MODULES.map((mod) => (
            <tr key={mod} className="hover:bg-gray-50/50">
              <td className="py-2.5 pr-4 text-sm font-medium text-gray-700">
                {MODULE_LABELS[mod]}
              </td>
              {LEVELS.map((level) => {
                const selected = permissions[mod] === level
                return (
                  <td key={level} className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => setLevel(mod, level)}
                      className={`mx-auto flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                        selected
                          ? 'border-forest-600 bg-forest-600'
                          : 'border-gray-300 bg-white hover:border-forest-400'
                      }`}
                      aria-label={`${MODULE_LABELS[mod]} — ${LEVEL_LABELS[level]}`}
                    >
                      {selected && (
                        <span className="block h-2 w-2 rounded-full bg-white" />
                      )}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Create role modal ─────────────────────────────────────────────────────────

function CreateRoleModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (role: CompanyRole) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<RolePermissions>(DEFAULT_PERMISSIONS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const trimmedDesc = description.trim()
      const role = await settingsApi.createRole(
        trimmedDesc
          ? { name: name.trim(), description: trimmedDesc, permissions }
          : { name: name.trim(), permissions },
      )
      onCreate(role)
    } catch {
      setError('Erreur lors de la création du rôle. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Créer un rôle personnalisé
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex. Responsable commercial"
                required
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description{' '}
                <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez les responsabilités de ce rôle"
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Matrice des permissions
            </h3>
            <PermissionMatrix permissions={permissions} onChange={setPermissions} />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            form=""
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Création…' : 'Créer le rôle'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Custom role card ──────────────────────────────────────────────────────────

function CustomRoleCard({
  role,
  onDelete,
}: {
  role: CompanyRole
  onDelete: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Supprimer le rôle "${role.name}" ? Cette action est irréversible.`)) return
    setDeleting(true)
    try {
      await settingsApi.deleteRole(role.id)
      onDelete(role.id)
    } catch {
      alert('Erreur lors de la suppression du rôle.')
      setDeleting(false)
    }
  }

  const activePerms = MODULES.filter((m) => role.permissions[m] !== 'none')

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{role.name}</span>
            <span className="text-xs text-gray-400">
              {role.userCount} utilisateur{role.userCount !== 1 ? 's' : ''}
            </span>
          </div>
          {role.description && (
            <p className="text-xs text-gray-500 truncate">{role.description}</p>
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
          title="Supprimer ce rôle"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {activePerms.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {activePerms.map((m) => (
            <div key={m} className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                {MODULE_LABELS[m]}:
              </span>
              <PermissionBadge level={role.permissions[m]} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">Aucune permission accordée</p>
      )}
    </div>
  )
}

// ── Upgrade banner ────────────────────────────────────────────────────────────

function UpgradeBanner() {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center space-y-3">
      <div className="flex items-center justify-center gap-2">
        <span className="text-xl" aria-hidden="true">🔒</span>
        <span className="text-sm font-semibold text-gray-800">
          Rôles personnalisés — Forfait Pro requis
        </span>
      </div>
      <p className="text-sm text-gray-500">
        Créez des rôles sur mesure pour votre équipe et définissez des permissions granulaires par module.
      </p>
      <button className="inline-flex items-center gap-2 rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800 transition-colors">
        Découvrir le forfait Pro
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function RolesPage() {
  const { user } = useAuth()
  const [roles, setRoles] = useState<CompanyRole[]>([])
  const [users, setUsers] = useState<SettingsUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const plan = user?.plan ?? 'FREE'
  const canCreateCustom = plan === 'PRO' || plan === 'PREMIUM'

  useEffect(() => {
    setLoading(true)
    Promise.all([settingsApi.listRoles(), settingsApi.listUsers()])
      .then(([r, u]) => { setRoles(r); setUsers(u) })
      .catch(() => setError('Impossible de charger les rôles.'))
      .finally(() => setLoading(false))
  }, [])

  const systemRoles = roles.filter((r) => r.isSystem)
  const customRoles = roles.filter((r) => !r.isSystem)

  function handleCreated(role: CompanyRole) {
    setRoles((prev) => [...prev, role])
    setShowModal(false)
  }

  function handleDeleted(id: string) {
    setRoles((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Rôles &amp; Accès</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez les rôles et les niveaux d'accès des membres de votre équipe.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* System roles */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Rôles système</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Ces rôles sont prédéfinis et ne peuvent pas être modifiés.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-white p-4 h-24 animate-pulse bg-gray-50"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {systemRoles.map((role) => (
              <SystemRoleCard key={role.id} role={role} />
            ))}
          </div>
        )}
      </section>

      {/* Custom roles */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Rôles personnalisés</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Créez des rôles sur mesure adaptés à votre organisation.
            </p>
          </div>
          {canCreateCustom && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-forest-900 px-3 py-2 text-sm font-medium text-white hover:bg-forest-800 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Créer un rôle
            </button>
          )}
        </div>

        {!canCreateCustom ? (
          <UpgradeBanner />
        ) : loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-white p-4 h-24 animate-pulse bg-gray-50"
              />
            ))}
          </div>
        ) : customRoles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">
              Aucun rôle personnalisé pour l'instant.{' '}
              <button
                onClick={() => setShowModal(true)}
                className="text-forest-700 hover:underline font-medium"
              >
                Créer le premier
              </button>
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {customRoles.map((role) => (
              <CustomRoleCard key={role.id} role={role} onDelete={handleDeleted} />
            ))}
          </div>
        )}
      </section>

      {/* Accès trésorerie */}
      <TresoAccessSection roles={roles} users={users} />

      {/* Modal */}
      {showModal && (
        <CreateRoleModal onClose={() => setShowModal(false)} onCreate={handleCreated} />
      )}
    </div>
  )
}
