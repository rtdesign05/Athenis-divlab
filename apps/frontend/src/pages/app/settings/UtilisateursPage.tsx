import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  settingsApi,
  type SettingsUser,
  type UserStatus,
  type RolePermissions,
  type PermissionLevel,
  type InviteRole,
  type Agence,
  type CompanyRole,
} from '@/services/settingsApi'

// ── Constants ─────────────────────────────────────────────────────────────────

const USER_LIMITS: Record<string, number> = {
  FREE: 1, STARTER: 3, PRO: 5, PREMIUM: 99,
}

// NOTE : la liste ROLES/DEFAULT_PERMISSIONS hardcodée a été retirée — les rôles
// sont maintenant chargés via settingsApi.listRoles() (cohérent avec RolesPage).
// Seul DEFAULT_PERMISSIONS.READONLY est conservé comme état initial du mode
// "Personnalisé" si l'admin choisit de partir d'un canevas vide.

const MODULES: { key: keyof RolePermissions; label: string }[] = [
  { key: 'gestion',      label: 'Gestion' },
  { key: 'comptabilite', label: 'Comptabilité' },
  { key: 'rh',           label: 'Ressources humaines' },
  { key: 'juridique',    label: 'Juridique' },
  { key: 'esg',          label: 'ESG & CSRD' },
  { key: 'fiscalite',    label: 'Fiscalité' },
  { key: 'settings',     label: 'Paramètres' },
]

const PERMISSION_LEVELS: { value: PermissionLevel; label: string }[] = [
  { value: 'none',  label: 'Aucun' },
  { value: 'read',  label: 'Lecture' },
  { value: 'write', label: 'Écriture' },
  { value: 'admin', label: 'Admin' },
]

const DEFAULT_PERMISSIONS: Record<InviteRole, RolePermissions> = {
  ADMIN:      { gestion: 'admin', comptabilite: 'admin', rh: 'admin',  juridique: 'admin', esg: 'admin',  fiscalite: 'admin', settings: 'admin'  },
  MANAGER:    { gestion: 'write', comptabilite: 'read',  rh: 'read',   juridique: 'read',  esg: 'read',   fiscalite: 'read',  settings: 'read'   },
  ACCOUNTANT: { gestion: 'read',  comptabilite: 'write', rh: 'none',   juridique: 'none',  esg: 'none',   fiscalite: 'write', settings: 'none'   },
  HR:         { gestion: 'none',  comptabilite: 'none',  rh: 'write',  juridique: 'read',  esg: 'none',   fiscalite: 'none',  settings: 'none'   },
  SALES:      { gestion: 'write', comptabilite: 'none',  rh: 'none',   juridique: 'none',  esg: 'none',   fiscalite: 'none',  settings: 'none'   },
  READONLY:   { gestion: 'read',  comptabilite: 'read',  rh: 'read',   juridique: 'read',  esg: 'read',   fiscalite: 'read',  settings: 'none'   },
  CUSTOM:     { gestion: 'none',  comptabilite: 'none',  rh: 'none',   juridique: 'none',  esg: 'none',   fiscalite: 'none',  settings: 'none'   },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

function getInitials(user: SettingsUser): string {
  if (user.firstName || user.lastName) {
    const f = user.firstName?.[0] ?? ''
    const l = user.lastName?.[0] ?? ''
    const initials = (f + l).toUpperCase()
    return initials !== '' ? initials : (user.email[0]?.toUpperCase() ?? '?')
  }
  return user.email[0]?.toUpperCase() ?? '?'
}

function getDisplayName(user: SettingsUser): string {
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ')
  }
  return user.email
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: UserStatus }) {
  const map: Record<UserStatus, { label: string; cls: string }> = {
    ACTIVE:    { label: 'Actif',     cls: 'bg-green-100 text-green-700' },
    INACTIVE:  { label: 'Inactif',   cls: 'bg-gray-100 text-gray-500' },
    SUSPENDED: { label: 'Suspendu',  cls: 'bg-red-100 text-red-700' },
    INVITED:   { label: 'Invité',    cls: 'bg-amber-100 text-amber-700' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

function RoleBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
      {name}
    </span>
  )
}

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

// ── Invite Modal ──────────────────────────────────────────────────────────────

interface InviteModalProps {
  onClose: () => void
  onSuccess: () => void
}

function InviteModal({ onClose, onSuccess }: InviteModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 — Identity
  const [prenom, setPrenom]       = useState('')
  const [nom, setNom]             = useState('')
  const [email, setEmail]         = useState('')
  const [telephone, setTelephone] = useState('')

  // Step 2 — Role & Permissions
  //   roleSource = 'existing'  → on choisit un CompanyRole déjà créé via RolesPage
  //   roleSource = 'custom'    → on définit des permissions ad-hoc (un nouveau
  //                              CompanyRole sera créé côté backend pour ce user)
  const [roleSource, setRoleSource]       = useState<'existing' | 'custom'>('existing')
  const [companyRoles, setCompanyRoles]   = useState<CompanyRole[]>([])
  const [rolesLoading, setRolesLoading]   = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [customRoleName, setCustomRoleName] = useState('')
  const [permissions, setPermissions] = useState<RolePermissions>({ ...DEFAULT_PERMISSIONS.READONLY })

  // Step 3 — Agences
  const [agences, setAgences]         = useState<Agence[]>([])
  const [agencesLoading, setAgencesLoading] = useState(false)
  const [selectedAgences, setSelectedAgences] = useState<Set<string>>(new Set())
  const [isRestricted, setIsRestricted]       = useState(false)

  // Load CompanyRoles when reaching step 2 (single source of truth — partagé avec RolesPage)
  useEffect(() => {
    if (step !== 2 || companyRoles.length > 0) return
    setRolesLoading(true)
    settingsApi.listRoles()
      .then((data) => {
        setCompanyRoles(data)
        // Auto-sélectionne le premier rôle (généralement Administrateur ou ADMIN)
        const first = data[0]
        if (first && !selectedRoleId) {
          setSelectedRoleId(first.id)
          setPermissions({ ...first.permissions })
        }
      })
      .catch(() => { /* fallback : roleSource reste sur custom */ })
      .finally(() => setRolesLoading(false))
  }, [step, companyRoles.length, selectedRoleId])

  // Load agences when reaching step 3
  useEffect(() => {
    if (step === 3 && agences.length === 0) {
      setAgencesLoading(true)
      settingsApi.listAgences()
        .then((data) => setAgences(data))
        .catch(() => { /* non-blocking */ })
        .finally(() => setAgencesLoading(false))
    }
  }, [step, agences.length])

  function handleExistingRoleChange(roleId: string) {
    const found = companyRoles.find(r => r.id === roleId)
    setSelectedRoleId(roleId)
    if (found) setPermissions({ ...found.permissions })
  }

  function handlePermissionChange(mod: keyof RolePermissions, level: PermissionLevel) {
    setPermissions((p) => ({ ...p, [mod]: level }))
  }

  function toggleAgence(id: string) {
    setSelectedAgences((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleNext() {
    setError(null)
    if (step === 1) {
      if (!prenom.trim()) { setError('Le prénom est requis');          return }
      if (!nom.trim())    { setError('Le nom est requis');             return }
      if (!email.trim())  { setError('L\'email est requis');           return }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Email invalide'); return
      }
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  async function handleSend() {
    setLoading(true)
    setError(null)
    try {
      // Calcule le payload "role" envoyé au backend.
      //   - existing : on envoie l'id CUID du CompanyRole déjà créé
      //   - custom   : on envoie le nom saisi ; le backend va créer un nouveau
      //                CompanyRole avec ce nom et les permissions modifiées
      let roleField: string
      if (roleSource === 'existing') {
        if (!selectedRoleId) { setError('Sélectionnez un rôle'); setLoading(false); return }
        roleField = selectedRoleId
      } else {
        const name = customRoleName.trim()
        if (!name) { setError('Nommez le rôle personnalisé'); setLoading(false); return }
        roleField = name
      }
      await settingsApi.inviteUser({
        prenom:       prenom.trim(),
        nom:          nom.trim(),
        email:        email.trim(),
        ...(telephone.trim() ? { telephone: telephone.trim() } : {}),
        role:         roleField as InviteRole,
        permissions,
        agenceIds:    [...selectedAgences],
        isRestricted: isRestricted && selectedAgences.size > 0,
      })
      onSuccess()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const STEP_LABELS = ['Identité', 'Rôle & Accès', 'Agences']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Inviter un utilisateur</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 px-6 pt-5 shrink-0">
          {([1, 2, 3] as const).map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    step === s
                      ? 'bg-gray-900 text-white'
                      : step > s
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step > s ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s}
                </div>
                <span className={`text-[10px] font-medium ${step >= s ? 'text-gray-700' : 'text-gray-400'}`}>
                  {STEP_LABELS[s - 1]}
                </span>
              </div>
              {i < 2 && (
                <div className={`h-px w-16 mx-1 mb-4 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── STEP 1: Identité ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Renseignez les coordonnées de l'utilisateur à inviter.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Jean"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Nkomo"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean.nkomo@exemple.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="text"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="+237 6XX XXX XXX"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: Rôle + Permissions ── */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">
                Choisissez un rôle existant (définis dans <strong>Paramètres → Rôles & accès</strong>)
                ou créez un rôle personnalisé.
              </p>

              {/* Source du rôle */}
              <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setRoleSource('existing')}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    roleSource === 'existing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Rôle existant
                </button>
                <button
                  type="button"
                  onClick={() => setRoleSource('custom')}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    roleSource === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Personnalisé
                </button>
              </div>

              {/* Existing role selector */}
              {roleSource === 'existing' && (
                <>
                  {rolesLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                    </div>
                  ) : companyRoles.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 py-6 text-center">
                      <p className="text-sm text-gray-500">Aucun rôle défini pour cette entreprise.</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Créez-en dans <strong>Paramètres → Rôles & accès</strong> ou basculez sur "Personnalisé".
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {companyRoles.map((r) => (
                        <label
                          key={r.id}
                          className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                            selectedRoleId === r.id
                              ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="companyRole"
                            checked={selectedRoleId === r.id}
                            onChange={() => handleExistingRoleChange(r.id)}
                            className="mt-0.5 accent-gray-900"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{r.name}</span>
                              {r.isSystem && (
                                <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                  Système
                                </span>
                              )}
                              <span className="text-xs text-gray-400">· {r.userCount} membre{r.userCount > 1 ? 's' : ''}</span>
                            </div>
                            {r.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Aperçu permissions du rôle sélectionné (read-only) */}
                  {selectedRoleId && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Permissions héritées du rôle
                      </p>
                      <div className="rounded-xl border border-gray-100 overflow-hidden">
                        {MODULES.map(({ key, label }, i) => (
                          <div
                            key={key}
                            className={`flex items-center justify-between px-4 py-2 ${i > 0 ? 'border-t border-gray-100' : ''}`}
                          >
                            <span className="text-sm text-gray-700">{label}</span>
                            <span className={`rounded-md px-2.5 py-0.5 text-xs font-medium ${
                              permissions[key] === 'none'  ? 'bg-gray-200 text-gray-700'
                              : permissions[key] === 'read'  ? 'bg-green-100 text-green-700'
                              : permissions[key] === 'write' ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                            }`}>
                              {PERMISSION_LEVELS.find(p => p.value === permissions[key])?.label ?? '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Custom role : nom + permissions éditables */}
              {roleSource === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom du rôle personnalisé <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customRoleName}
                      onChange={(e) => setCustomRoleName(e.target.value)}
                      placeholder="Ex: Chef d'agence Douala"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Un nouveau rôle sera créé avec les permissions ci-dessous et apparaîtra dans Rôles & accès.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Permissions par module
                    </p>
                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                      {MODULES.map(({ key, label }, i) => (
                        <div
                          key={key}
                          className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}
                        >
                          <span className="text-sm text-gray-700 w-36">{label}</span>
                          <div className="flex gap-1">
                            {PERMISSION_LEVELS.map(({ value, label: lvlLabel }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => handlePermissionChange(key, value)}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                  permissions[key] === value
                                    ? value === 'none'  ? 'bg-gray-200 text-gray-700'
                                      : value === 'read'  ? 'bg-green-100 text-green-700'
                                      : value === 'write' ? 'bg-blue-100 text-blue-700'
                                      : 'bg-purple-100 text-purple-700'
                                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                }`}
                              >
                                {lvlLabel}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP 3: Agences ── */}
          {step === 3 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">
                Assignez cet utilisateur à une ou plusieurs agences pour restreindre sa vue.
              </p>

              {agencesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                </div>
              ) : agences.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
                  <p className="text-sm text-gray-400">Aucune agence configurée.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Créez des agences dans <strong>Paramètres → Agences</strong> pour activer l'isolation.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    {agences.map((agence, i) => (
                      <label
                        key={agence.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                          i > 0 ? 'border-t border-gray-100' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAgences.has(agence.id)}
                          onChange={() => toggleAgence(agence.id)}
                          className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{agence.nom}</span>
                            <span className="text-xs text-gray-400">{agence.code}</span>
                            {agence.isSiege && (
                              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                SIÈGE
                              </span>
                            )}
                          </div>
                          {agence.ville && <p className="text-xs text-gray-400">{agence.ville}</p>}
                        </div>
                      </label>
                    ))}
                  </div>

                  {selectedAgences.size > 0 && (
                    <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRestricted}
                        onChange={(e) => setIsRestricted(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Restreindre la vue</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          L'utilisateur ne pourra voir <strong>que les données des agences sélectionnées</strong>.
                          Sans cette option, il peut voir toutes les agences mais sera quand même rattaché à celles sélectionnées.
                        </p>
                      </div>
                    </label>
                  )}
                </>
              )}

              {/* Recap */}
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Récapitulatif</p>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500">Utilisateur</span>
                    <span className="font-medium text-gray-900">{prenom} {nom}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium text-gray-900">{email}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500">Rôle</span>
                    <span className="font-medium text-gray-900">
                      {roleSource === 'existing'
                        ? (companyRoles.find((r) => r.id === selectedRoleId)?.name ?? '—')
                        : (customRoleName || '— Personnalisé')}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500">Agences</span>
                    <span className="font-medium text-gray-900">
                      {selectedAgences.size === 0
                        ? 'Toutes (aucune restriction)'
                        : `${selectedAgences.size} agence${selectedAgences.size > 1 ? 's' : ''}${isRestricted ? ' (restreint)' : ''}`}
                    </span>
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}

          {step !== 3 && error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 shrink-0">
          <button
            onClick={() => {
              if (step === 1) onClose()
              else setStep((s) => (s - 1) as 1 | 2 | 3)
            }}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {step === 1 ? 'Annuler' : '← Précédent'}
          </button>
          {step < 3 ? (
            <button
              onClick={handleNext}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
              Suivant →
            </button>
          ) : (
            <button
              onClick={() => void handleSend()}
              disabled={loading}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Envoi…' : 'Envoyer l\'invitation'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Edit Agences Modal ────────────────────────────────────────────────────────

interface EditAgencesModalProps {
  user: SettingsUser
  onClose: () => void
  onSuccess: (agenceIds: string[], isRestricted: boolean) => void
}

function EditAgencesModal({ user, onClose, onSuccess }: EditAgencesModalProps) {
  const [agences, setAgences] = useState<Agence[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAgences, setSelectedAgences] = useState<Set<string>>(new Set(user.agenceIds))
  const [isRestricted, setIsRestricted] = useState(user.isRestricted)

  useEffect(() => {
    settingsApi.listAgences()
      .then(setAgences)
      .catch(() => setError('Impossible de charger les agences'))
      .finally(() => setLoading(false))
  }, [])

  function toggleAgence(id: string) {
    setSelectedAgences((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const agenceIds = [...selectedAgences]
      const restricted = isRestricted && agenceIds.length > 0
      await settingsApi.updateUserAgences(user.id, agenceIds, restricted)
      onSuccess(agenceIds, restricted)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue')
    } finally {
      setSaving(false)
    }
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Agences de l'utilisateur</h2>
            <p className="text-xs text-gray-500 mt-0.5">{displayName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <p className="text-sm text-gray-500">
            Sélectionnez les agences auxquelles rattacher cet utilisateur.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
            </div>
          ) : agences.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
              <p className="text-sm text-gray-400">Aucune agence configurée.</p>
              <p className="text-xs text-gray-400 mt-1">
                Créez des agences dans <strong>Paramètres → Agences</strong>.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                {agences.map((agence, i) => (
                  <label
                    key={agence.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      i > 0 ? 'border-t border-gray-100' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAgences.has(agence.id)}
                      onChange={() => toggleAgence(agence.id)}
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{agence.nom}</span>
                        <span className="text-xs text-gray-400">{agence.code}</span>
                        {agence.isSiege && (
                          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                            SIÈGE
                          </span>
                        )}
                      </div>
                      {agence.ville && <p className="text-xs text-gray-400">{agence.ville}</p>}
                    </div>
                    <span className="text-xs text-gray-400">
                      {agence._count.members} membre{agence._count.members !== 1 ? 's' : ''}
                    </span>
                  </label>
                ))}
              </div>

              {selectedAgences.size > 0 && (
                <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRestricted}
                    onChange={(e) => setIsRestricted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Restreindre la vue</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      L'utilisateur ne verra <strong>que les données des agences sélectionnées</strong>.
                    </p>
                  </div>
                </label>
              )}

              {selectedAgences.size === 0 && (
                <p className="text-xs text-gray-400 rounded-lg bg-gray-50 px-4 py-3">
                  Aucune agence sélectionnée — l'utilisateur aura accès à toutes les données.
                </p>
              )}
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 shrink-0">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || loading}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Sauvegarde…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

function ConfirmDialog({ message, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-sm text-gray-700">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Suppression…' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── User Row ──────────────────────────────────────────────────────────────────

interface UserRowProps {
  user: SettingsUser
  isSelf: boolean
  agenceMap: Map<string, string>   // id → nom
  onStatusToggled: (userId: string, current: UserStatus) => Promise<void>
  onDeleted: (userId: string) => Promise<void>
  onCancelInvite: (userId: string) => Promise<void>
  onAgencesUpdated: (userId: string, agenceIds: string[], isRestricted: boolean) => void
}

function UserRow({
  user, isSelf, agenceMap,
  onStatusToggled, onDeleted, onCancelInvite, onAgencesUpdated,
}: UserRowProps) {
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showEditAgences, setShowEditAgences] = useState(false)

  const displayRole = user.companyRoleName ?? user.globalRole

  async function handleStatusToggle() {
    setActionLoading(true)
    try { await onStatusToggled(user.id, user.status) }
    finally { setActionLoading(false) }
  }

  async function handleDelete() {
    setActionLoading(true)
    try { await onDeleted(user.id); setConfirmDelete(false) }
    finally { setActionLoading(false) }
  }

  async function handleCancelInvite() {
    setActionLoading(true)
    try { await onCancelInvite(user.id) }
    finally { setActionLoading(false) }
  }

  const lastActivity = user.isInvitation
    ? formatDate(user.invitedAt)
    : formatDate(user.lastLoginAt)

  // Agences label for the table cell
  const agenceLabel = user.agenceIds.length === 0
    ? <span className="text-xs text-gray-400">Toutes</span>
    : (
      <div className="flex flex-wrap gap-1">
        {user.agenceIds.slice(0, 2).map(id => (
          <span key={id} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
            {agenceMap.get(id) ?? id.slice(0, 6)}
          </span>
        ))}
        {user.agenceIds.length > 2 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
            +{user.agenceIds.length - 2}
          </span>
        )}
        {user.isRestricted && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            restreint
          </span>
        )}
      </div>
    )

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          message={`Supprimer l'utilisateur "${getDisplayName(user)}" ? Cette action est irréversible.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          loading={actionLoading}
        />
      )}
      {showEditAgences && (
        <EditAgencesModal
          user={user}
          onClose={() => setShowEditAgences(false)}
          onSuccess={(ids, restricted) => {
            onAgencesUpdated(user.id, ids, restricted)
            setShowEditAgences(false)
          }}
        />
      )}
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="py-3 pl-4 pr-3">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 rounded-full h-8 w-8 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
              {getInitials(user)}
            </div>
            <span className="text-sm font-medium text-gray-900">{getDisplayName(user)}</span>
          </div>
        </td>
        <td className="py-3 px-3">
          <span className="text-sm text-gray-500">{user.email}</span>
        </td>
        <td className="py-3 px-3">
          <RoleBadge name={displayRole} />
        </td>
        <td className="py-3 px-3">
          <StatusBadge status={user.status} />
        </td>
        <td className="py-3 px-3">
          <button
            onClick={() => !user.isInvitation && setShowEditAgences(true)}
            className={`text-left ${!user.isInvitation ? 'hover:opacity-70 cursor-pointer' : 'cursor-default'}`}
            title={!user.isInvitation ? 'Modifier les agences' : undefined}
          >
            {agenceLabel}
          </button>
        </td>
        <td className="py-3 px-3">
          <span className="text-sm text-gray-500">{lastActivity}</span>
        </td>
        <td className="py-3 px-3 text-center">
          {user.totpEnabled ? (
            <span className="text-green-600 font-bold">✓</span>
          ) : (
            <span className="text-gray-300 font-bold">✗</span>
          )}
        </td>
        <td className="py-3 pl-3 pr-4">
          {isSelf ? (
            <span className="text-xs text-gray-300">Vous</span>
          ) : user.isInvitation ? (
            <button
              onClick={handleCancelInvite}
              disabled={actionLoading}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              {actionLoading ? '…' : 'Annuler invitation'}
            </button>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setShowEditAgences(true)}
                className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Agences
              </button>
              <button
                onClick={handleStatusToggle}
                disabled={actionLoading}
                className={`text-sm transition-colors disabled:opacity-50 ${
                  user.status === 'SUSPENDED'
                    ? 'text-green-600 hover:text-green-800'
                    : 'text-amber-600 hover:text-amber-800'
                }`}
              >
                {actionLoading ? '…' : user.status === 'SUSPENDED' ? 'Activer' : 'Suspendre'}
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          )}
        </td>
      </tr>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function UtilisateursPage() {
  const { user: authUser } = useAuth()
  const [users, setUsers] = useState<SettingsUser[]>([])
  const [agenceMap, setAgenceMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const plan = authUser?.plan ?? 'FREE'
  const limit = USER_LIMITS[plan] ?? 1

  const activeAndInvited = users.filter(
    (u) => u.status === 'ACTIVE' || u.status === 'INVITED',
  ).length

  const limitReached = activeAndInvited >= limit

  const loadData = useCallback(async () => {
    try {
      const [fetchedUsers, fetchedAgences] = await Promise.all([
        settingsApi.listUsers(),
        settingsApi.listAgences(),
      ])
      setUsers(fetchedUsers)
      setAgenceMap(new Map(fetchedAgences.map(a => [a.id, a.nom])))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  /** Extrait un message d'erreur exploitable d'une erreur axios/JS. */
  function extractApiError(e: unknown, fallback: string): string {
    const err = e as { response?: { data?: { error?: string } }; message?: string }
    return err?.response?.data?.error ?? err?.message ?? fallback
  }

  const handleStatusToggled = useCallback(async (userId: string, current: UserStatus) => {
    const next: UserStatus = current === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'
    try {
      await settingsApi.updateUserStatus(userId, next)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: next } : u)))
    } catch (e) {
      setToast(extractApiError(e, 'Impossible de changer le statut'))
    }
  }, [])

  const handleDeleted = useCallback(async (userId: string) => {
    try {
      await settingsApi.deleteUser(userId)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      setToast('Utilisateur supprimé')
    } catch (e) {
      setToast(extractApiError(e, 'Impossible de supprimer l\'utilisateur'))
    }
  }, [])

  const handleCancelInvite = useCallback(async (invitationId: string) => {
    // L'id passé est l'id de la row Invitation (pour les lignes user.isInvitation=true)
    try {
      await settingsApi.cancelInvitation(invitationId)
      setUsers((prev) => prev.filter((u) => u.id !== invitationId))
      setToast('Invitation annulée')
    } catch (e) {
      // 404 = invitation déjà annulée ou acceptée par quelqu'un d'autre — on retire
      // quand même la ligne de la liste pour rafraîchir l'UI
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 404 || status === 410) {
        setUsers((prev) => prev.filter((u) => u.id !== invitationId))
        setToast('Invitation déjà annulée ou expirée')
        return
      }
      setToast(extractApiError(e, 'Impossible d\'annuler l\'invitation'))
    }
  }, [])

  const handleAgencesUpdated = useCallback((userId: string, agenceIds: string[], isRestricted: boolean) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, agenceIds, isRestricted } : u))
    setToast('Agences mises à jour')
  }, [])

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

      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setToast('Invitation envoyée avec succès !')
            void loadData()
          }}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Utilisateurs ({activeAndInvited}/{limit})
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gérez les membres de votre équipe et leurs accès.
            </p>
          </div>
          {!limitReached && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Inviter un utilisateur
            </button>
          )}
        </div>

        {/* Limit warning */}
        {limitReached && (
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  Limite atteinte ({activeAndInvited}/{limit} utilisateurs)
                </p>
                <p className="mt-0.5 text-sm text-amber-700">
                  Passez au forfait supérieur pour ajouter d'autres utilisateurs.
                </p>
              </div>
              <button className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 transition-colors">
                Voir les forfaits
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Utilisateur</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rôle</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Agences</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Dernière connexion</th>
                  <th className="py-3 px-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">2FA</th>
                  <th className="py-3 pl-3 pr-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-gray-400">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      isSelf={user.email === authUser?.email}
                      agenceMap={agenceMap}
                      onStatusToggled={handleStatusToggled}
                      onDeleted={handleDeleted}
                      onCancelInvite={handleCancelInvite}
                      onAgencesUpdated={handleAgencesUpdated}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
