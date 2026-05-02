/**
 * CompteCombobox — saisie universelle de compte comptable
 *
 * • Fusionne plan statique (zone de l'entreprise) + comptes personnalisés (AccountPlan)
 * • Recherche par numéro (préfixe) OU intitulé (sous-chaîne)
 * • Si aucun compte exact trouvé → option "Créer le compte XXXXX" avec intitulé obligatoire
 * • Utilise un portal pour le dropdown (échappe les overflow/clip des modals)
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal }                         from 'react-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { accountingApi }                         from '@/services/accountingApi'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompteOption {
  code:     string
  label:    string
  isCustom: boolean   // true = dans AccountPlan de l'entreprise, false = plan statique
}

export interface CompteComboboxProps {
  /** Valeur affichée dans l'input (code seul ou "code — intitulé") */
  value:          string
  onChange:       (raw: string) => void
  /** Appelé quand un compte existant ou fraîchement créé est sélectionné */
  onSelect:       (compte: CompteOption) => void
  placeholder?:   string
  className?:     string
  /** Restreindre aux comptes dont le code commence par ces caractères, ex : ['4','6','7'] */
  filterClasses?: string[]
  autoFocus?:     boolean
  disabled?:      boolean
  /** Désactive l'option "Créer le compte" dans le dropdown (pour gérer la création côté parent) */
  disableCreate?: boolean
}

// ── Normalisation du numéro de compte ─────────────────────────────────────────
// • Purement numérique (tous chiffres) → complète à 9 caractères avec des 0 à droite
// • Alphanumérique (contient une lettre) → conserve tel quel, longueur libre
//   (ex : comptes tiers libres comme "401CLIENT1", "41DUPONT")
export function normalizeCompteCode(code: string): string {
  const c = code.trim()
  if (!c) return c
  return /^\d+$/.test(c) ? c.padEnd(9, '0') : c
}

// ── Badge couleur par type ────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  ACTIF:   'bg-blue-100 text-blue-700',
  PASSIF:  'bg-purple-100 text-purple-700',
  CHARGE:  'bg-red-100 text-red-700',
  PRODUIT: 'bg-green-100 text-green-700',
}

function typeFromCode(code: string): string {
  if (/^41/.test(code)) return 'ACTIF'
  if (/^4/.test(code))  return 'PASSIF'
  if (/^7/.test(code))  return 'PRODUIT'
  if (/^[123]/.test(code)) return 'ACTIF'
  return 'CHARGE'
}

function classeFromCode(code: string): number {
  return parseInt(code[0] ?? '4') || 4
}

// ── Hook : liste fusionnée plan statique + comptes personnalisés ──────────────

export function useAllComptes(): { comptes: CompteOption[]; isLoading: boolean } {
  const { data: planData,    isLoading: planLoading }    = useQuery({
    queryKey: ['plan'],
    queryFn:  accountingApi.plan,
    staleTime: 10 * 60_000,
  })
  const { data: comptesData, isLoading: comptesLoading } = useQuery({
    queryKey: ['comptes'],
    queryFn:  accountingApi.comptes,
    staleTime: 5 * 60_000,
  })

  const comptes = useMemo<CompteOption[]>(() => {
    const custom      = comptesData ?? []
    const customCodes = new Set(custom.map(c => c.numero))

    const customOpts: CompteOption[] = custom.map(c => ({
      code:     c.numero,
      label:    c.intitule,
      isCustom: true,
    }))

    const planOpts: CompteOption[] = (planData?.entries ?? [])
      .filter(e => !customCodes.has(e.numero))
      .map(e => ({
        code:     e.numero,
        label:    e.intitule,
        isCustom: false,
      }))

    return [...customOpts, ...planOpts].sort((a, b) => a.code.localeCompare(b.code))
  }, [planData, comptesData])

  return { comptes, isLoading: planLoading || comptesLoading }
}

// ── Composant principal ───────────────────────────────────────────────────────

export function CompteCombobox({
  value,
  onChange,
  onSelect,
  placeholder   = 'ex. 401100',
  className     = '',
  filterClasses,
  autoFocus     = false,
  disabled      = false,
  disableCreate = false,
}: CompteComboboxProps) {
  const qc = useQueryClient()

  const { comptes } = useAllComptes()

  const [open,       setOpen]       = useState(false)
  const [creating,   setCreating]   = useState(false)   // mode création inline
  const [newLabel,   setNewLabel]   = useState('')
  const [labelError, setLabelError] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const inputRef    = useRef<HTMLInputElement>(null)
  const newLabelRef = useRef<HTMLInputElement>(null)

  // ── Suggestions ─────────────────────────────────────────────────────────────

  const query = value.trim().toLowerCase()

  const suggestions = useMemo(() => {
    let pool = comptes
    if (filterClasses?.length) {
      pool = pool.filter(c => filterClasses.includes(c.code.charAt(0)))
    }
    if (!query) return pool.slice(0, 12)
    return pool
      .filter(c =>
        c.code.toLowerCase().startsWith(query) ||
        c.label.toLowerCase().includes(query),
      )
      .slice(0, 15)
  }, [comptes, query, filterClasses])

  const normalizedQuery = normalizeCompteCode(value.trim())
  const exactMatch  = comptes.some(c => c.code === normalizedQuery)
  const canCreate   = value.trim().length >= 2 && !exactMatch && !disableCreate
  const showDrop    = open && (suggestions.length > 0 || canCreate)

  // ── Position du portal ───────────────────────────────────────────────────────

  function syncRect() {
    if (inputRef.current) setAnchorRect(inputRef.current.getBoundingClientRect())
  }

  useEffect(() => {
    if (!open) return
    syncRect()
    window.addEventListener('scroll', syncRect, true)
    window.addEventListener('resize', syncRect)
    return () => {
      window.removeEventListener('scroll', syncRect, true)
      window.removeEventListener('resize', syncRect)
    }
  }, [open])

  // ── Fermeture au clic extérieur ──────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (inputRef.current?.contains(t)) return
      if (document.getElementById('_cc-portal')?.contains(t)) return
      setOpen(false)
      setCreating(false)
      setNewLabel('')
      setLabelError(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── Focus sur l'input libellé quand on passe en mode création ────────────────

  useEffect(() => {
    if (creating) setTimeout(() => newLabelRef.current?.focus(), 50)
  }, [creating])

  // ── Mutation création de compte ──────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: ({ code, label }: { code: string; label: string }) =>
      accountingApi.addCompte({
        numero:   code,
        intitule: label,
        classe:   classeFromCode(code),
        type:     typeFromCode(code) as 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT',
        isSystem: false,
      }),
    onSuccess: (_, { code, label }) => {
      qc.invalidateQueries({ queryKey: ['comptes'] })
      onSelect({ code, label, isCustom: true })
      setOpen(false)
      setCreating(false)
      setNewLabel('')
    },
  })

  function handleCreate() {
    const code  = normalizeCompteCode(value.trim())   // ← normalisé avant création
    const label = newLabel.trim()
    if (!label) { setLabelError(true); newLabelRef.current?.focus(); return }
    setLabelError(false)
    createMutation.mutate({ code, label })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        autoComplete="off"
        className={className}
        onChange={e => {
          onChange(e.target.value)
          setCreating(false)
          setNewLabel('')
          setLabelError(false)
          syncRect()
          setOpen(e.target.value.trim().length > 0)
        }}
        onBlur={() => {
          // Normalise le code à la sortie du champ (si non vide et pas de sélection en cours)
          const normalized = normalizeCompteCode(value)
          if (normalized !== value) onChange(normalized)
          // Ferme le dropdown avec un léger délai pour laisser les clics du portal s'exécuter
          setTimeout(() => { setOpen(false); setCreating(false) }, 150)
        }}
        onFocus={() => { syncRect(); setOpen(true) }}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); setCreating(false) }
          if (e.key === 'Enter' && creating) { e.preventDefault(); handleCreate() }
        }}
      />

      {showDrop && anchorRect && createPortal(
        <div
          id="_cc-portal"
          style={{
            position: 'fixed',
            top:      anchorRect.bottom + 4,
            left:     anchorRect.left,
            width:    Math.max(anchorRect.width, 360),
            zIndex:   9999,
          }}
          className="rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden"
        >
          {/* ── Liste de suggestions ── */}
          {!creating && suggestions.length > 0 && (
            <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
              {suggestions.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); onSelect(c); onChange(c.code); setOpen(false) }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <span className="font-mono text-xs font-semibold text-gray-900 w-20 shrink-0">{c.code}</span>
                  <span className="text-xs text-gray-600 truncate flex-1">{c.label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.isCustom && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-green-100 text-green-700 font-medium">Actif</span>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[typeFromCode(c.code)] ?? 'bg-gray-100 text-gray-600'}`}>
                      {typeFromCode(c.code)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Option Créer ── */}
          {canCreate && !creating && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setCreating(true) }}
              className="w-full text-left px-3 py-2.5 text-xs font-medium text-[#1b4332] hover:bg-green-50 transition-colors flex items-center gap-2 border-t border-gray-100"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded border border-[#1b4332]/40 text-sm leading-none shrink-0">+</span>
              Créer le compte{' '}
              <span className="font-mono font-semibold">{normalizedQuery}</span>
            </button>
          )}

          {/* ── Formulaire de création inline ── */}
          {creating && (
            <div className="p-3 space-y-2 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-[#1b4332]">{normalizedQuery}</span>
                <span className="text-xs text-gray-400">— nouveau compte</span>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Intitulé <span className="text-red-500">*</span>
                </label>
                <input
                  ref={newLabelRef}
                  type="text"
                  value={newLabel}
                  onChange={e => { setNewLabel(e.target.value); setLabelError(false) }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } if (e.key === 'Escape') setCreating(false) }}
                  placeholder="Ex : Fournisseur ACME"
                  className={`w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30 ${
                    labelError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {labelError && <p className="text-[10px] text-red-500 mt-0.5">L'intitulé est obligatoire</p>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); setCreating(false); setNewLabel('') }}
                  className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); handleCreate() }}
                  disabled={createMutation.isPending}
                  className="flex-1 rounded-lg bg-[#1b4332] py-1.5 text-xs font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Création…' : 'Créer'}
                </button>
              </div>
              {createMutation.isError && (
                <p className="text-[10px] text-red-500">
                  {(createMutation.error as Error)?.message ?? 'Erreur'}
                </p>
              )}
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
