import { useState, useMemo } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useCurrency } from '@/hooks/useCurrency'
import {
  accountingApi,
  type PlanData, type CompteItem, type PlanEntry, type ChartAccountType,
} from '@/services/accountingApi'
import { useGestion } from '@/contexts/GestionContext'

const TYPE_LABELS: Record<ChartAccountType, string> = {
  ACTIF:   'Actif',
  PASSIF:  'Passif',
  CHARGE:  'Charge',
  PRODUIT: 'Produit',
}

const TYPE_COLORS: Record<ChartAccountType, string> = {
  ACTIF:   'bg-blue-100 text-blue-700',
  PASSIF:  'bg-purple-100 text-purple-700',
  CHARGE:  'bg-red-100 text-red-700',
  PRODUIT: 'bg-green-100 text-green-700',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalise un numéro de compte :
 * - Purement numérique → complète avec des zéros jusqu'à 9 chiffres
 * - Alphanumérique (compte tiers) → conservé tel quel
 */
function normalizeNumero(n: string): string {
  const trimmed = n.trim()
  if (!trimmed) return trimmed
  return /^\d+$/.test(trimmed) ? trimmed.padEnd(9, '0') : trimmed
}

function isAlphanumericTiers(n: string): boolean {
  return n.trim().length > 0 && !/^\d+$/.test(n.trim())
}

/**
 * Un compte centralisateur (OHADA / PCG) est un compte principal qui agrège
 * des comptes auxiliaires/divisionnaires. Heuristique : numéro purement
 * numérique de 2-3 chiffres significatifs (ex: 401, 411, 512), ou compte
 * dont le numéro non zéros est ≤ 3 caractères (ex: 401000000).
 */
function isCentralizer(numero: string): boolean {
  if (!/^\d+$/.test(numero)) return false
  // Compte avec uniquement des zéros après les 3 premiers chiffres → centralisateur
  const significant = numero.replace(/0+$/, '')
  return significant.length > 0 && significant.length <= 3
}

// ── React Query hooks ─────────────────────────────────────────────────────────

function usePlan() {
  return useQuery({
    queryKey: ['plan'],
    queryFn:  () => accountingApi.plan(),
    staleTime: 60_000,
  })
}

function useComptes() {
  return useQuery({
    queryKey: ['comptes'],
    queryFn:  () => accountingApi.comptes(),
    staleTime: 30_000,
  })
}

// ── Add / Activate compte modal ───────────────────────────────────────────────

interface AddModalProps {
  planEntries:    PlanEntry[]
  initialNumero?: string
  initialLabel?:  string
  centralizerMode?: boolean
  onClose:        () => void
}

function AddCompteModal({ planEntries, initialNumero = '', initialLabel = '', centralizerMode = false, onClose }: AddModalProps) {
  const qc = useQueryClient()
  const [search, setSearch] = useState(
    initialNumero ? `${initialNumero}${initialLabel ? ' — ' + initialLabel : ''}` : '',
  )
  const [custom, setCustom] = useState(!!initialNumero || centralizerMode)
  const [error,  setError]  = useState('')
  const [form,   setForm]   = useState<{ numero: string; intitule: string; classe: number; type: ChartAccountType }>({
    numero:   initialNumero,
    intitule: initialLabel,
    classe:   initialNumero ? (parseInt(initialNumero[0] ?? '4') || 4) : (centralizerMode ? 4 : 1),
    type:     initialNumero
      ? (/^41/.test(initialNumero) ? 'ACTIF' : /^4/.test(initialNumero) ? 'PASSIF' : /^7/.test(initialNumero) ? 'PRODUIT' : 'CHARGE')
      : 'ACTIF',
  })

  // En mode centralisateur, on ne filtre que les comptes du plan ≤ 3 chiffres significatifs
  const filteredPlan = useMemo(() =>
    centralizerMode ? planEntries.filter(e => isCentralizer(e.numero)) : planEntries,
    [planEntries, centralizerMode],
  )

  const suggestions = useMemo(() =>
    search.length < 2 ? [] :
    filteredPlan
      .filter(e => e.numero.startsWith(search) || e.intitule.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10),
    [search, filteredPlan],
  )

  function selectEntry(e: PlanEntry) {
    setForm({ numero: e.numero, intitule: e.intitule, classe: e.classe, type: e.type })
    setSearch(e.numero + ' — ' + e.intitule)
    setCustom(false)
  }

  // Numéro qui sera réellement enregistré
  const finalNumero = normalizeNumero(form.numero)
  const willBePadded = form.numero.trim().length > 0
    && /^\d+$/.test(form.numero.trim())
    && form.numero.trim().length < 9

  // Validation supplémentaire en mode centralisateur
  const centralizerError = centralizerMode && form.numero.trim().length > 0 && !isCentralizer(finalNumero)
    ? "Un compte centralisateur doit avoir au maximum 3 chiffres significatifs (ex : 401, 411, 512)"
    : ''

  const mutation = useMutation({
    mutationFn: () => accountingApi.addCompte({ ...form, numero: finalNumero, isSystem: false }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comptes'] }); onClose() },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : "Erreur lors de l'ajout"),
  })

  const title = centralizerMode ? 'Créer un compte centralisateur' : 'Activer un compte'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {centralizerMode && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              💡 Un compte centralisateur agrège des comptes auxiliaires (ex : <strong>411</strong> regroupe
              tous les clients <strong>411-DUPONT</strong>, <strong>411-MARTIN</strong>, etc.).
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {centralizerMode ? 'Rechercher un compte centralisateur dans le plan' : 'Rechercher dans le plan'}
            </label>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setCustom(false); setForm(f => ({ ...f, numero: '', intitule: '' })) }}
              placeholder="Numéro ou intitulé…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
            {suggestions.length > 0 && (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                {suggestions.map(e => (
                  <button key={e.numero} onClick={() => selectEntry(e)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50">
                    <span className="font-mono text-xs text-gray-500 w-24 shrink-0">{e.numero}</span>
                    <span className="flex-1 truncate text-gray-800">{e.intitule}</span>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_COLORS[e.type]}`}>{TYPE_LABELS[e.type]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-gray-100" />
            <button onClick={() => { setCustom(c => !c); setSearch('') }}
              className="text-xs text-forest-700 hover:underline">
              {custom ? 'Annuler la saisie manuelle' : 'Saisie manuelle'}
            </button>
            <div className="flex-1 border-t border-gray-100" />
          </div>

          {(custom || form.numero) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Numéro de compte</label>
                <input type="text" value={form.numero}
                  onChange={e => {
                    const val = e.target.value
                    setForm(f => ({
                      ...f,
                      numero: val,
                      classe: val ? (parseInt(val[0] ?? '4') || 4) : f.classe,
                      type: val
                        ? (/^41/.test(val) ? 'ACTIF' : /^4/.test(val) ? 'PASSIF' : /^7/.test(val) ? 'PRODUIT' : 'CHARGE')
                        : f.type,
                    }))
                  }}
                  placeholder={centralizerMode ? 'ex : 401, 411, 512' : 'ex : 411 ou CLI-DUPONT'}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 font-mono" />

                {/* Prévisualisation de la normalisation */}
                {willBePadded && (
                  <p className="mt-1 text-xs text-gray-400">
                    → Sera enregistré comme{' '}
                    <span className="font-mono font-semibold text-forest-700">{finalNumero}</span>
                    {' '}(complété par des zéros)
                  </p>
                )}
                {isAlphanumericTiers(form.numero) && (
                  <p className="mt-1 text-xs text-indigo-500">
                    Compte alphanumérique (tiers) — conservé tel quel
                  </p>
                )}
                {centralizerError && (
                  <p className="mt-1 text-xs text-red-600">{centralizerError}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Classe</label>
                <input type="number" min={1} max={9} value={form.classe}
                  onChange={e => setForm(f => ({ ...f, classe: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as ChartAccountType }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500">
                  {(Object.keys(TYPE_LABELS) as ChartAccountType[]).map(t => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Intitulé</label>
                <input type="text" value={form.intitule}
                  onChange={e => setForm(f => ({ ...f, intitule: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500" />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={() => mutation.mutate()}
            disabled={mutation.isPending || (!form.numero && !custom) || !!centralizerError}
            className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-50">
            {mutation.isPending ? 'Enregistrement…' : centralizerMode ? 'Créer' : 'Activer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Vue unifiée Plan + Mes comptes ────────────────────────────────────────────

interface TiersEntry { id: string; numero: string; intitule: string; type: 'client' | 'fournisseur'; agence: string }

// Trois catégories de lignes dans la vue unifiée
type RowKind = 'active' | 'tiers' | 'plan'

interface UnifiedRow {
  kind:       RowKind
  numero:     string
  intitule:   string
  classe:     number
  type:       ChartAccountType
  // active only
  compteItem?:  CompteItem
  // tiers only
  tiersEntry?:  TiersEntry
}

type TabId = 'all' | 'centralizers'

interface UnifiedTabProps {
  plan:         PlanData
  comptes:      CompteItem[]
  comptesTiers: TiersEntry[]
  tab:          TabId
}

function UnifiedTab({ plan, comptes, comptesTiers, tab }: UnifiedTabProps) {
  const qc = useQueryClient()
  const { fmt } = useCurrency()

  const [search,       setSearch]       = useState('')
  const [classeFilter, setClasse]       = useState<number | null>(null)
  const [showPlan,     setShowPlan]     = useState(false)
  const [showAdd,      setShowAdd]      = useState(false)
  const [showAddCentr, setShowAddCentr] = useState(false)
  const [addTiers,     setAddTiers]     = useState<TiersEntry | null>(null)
  const [activatePlan, setActivatePlan] = useState<PlanEntry | null>(null)
  const [editing,      setEditing]      = useState<string | null>(null)
  const [editVal,      setEditVal]      = useState('')
  const [deleting,     setDeleting]     = useState<string | null>(null)

  // Index des numéros déjà activés
  const activeNums = useMemo(() => new Set(comptes.map(c => c.numero)), [comptes])

  // Tiers non encore dans AccountPlan
  const tiersOnly = useMemo(() =>
    comptesTiers.filter(t => !activeNums.has(t.numero)),
    [comptesTiers, activeNums],
  )

  // Entrées du plan statique pas encore activées
  const planOnly = useMemo(() =>
    plan.entries.filter(e => !activeNums.has(e.numero)),
    [plan.entries, activeNums],
  )

  // Construire la liste fusionnée puis filtrer par tab
  const allRows = useMemo((): UnifiedRow[] => {
    const rows: UnifiedRow[] = []

    // 1. Comptes actifs (AccountPlan)
    for (const c of comptes) {
      rows.push({ kind: 'active', numero: c.numero, intitule: c.intitule, classe: c.classe, type: c.type, compteItem: c })
    }

    // 2. Comptes tiers non enregistrés
    for (const t of tiersOnly) {
      const cls = parseInt(t.numero[0] ?? '4') || 4
      const tp: ChartAccountType = /^41/.test(t.numero) ? 'ACTIF' : /^4/.test(t.numero) ? 'PASSIF' : /^7/.test(t.numero) ? 'PRODUIT' : 'CHARGE'
      rows.push({ kind: 'tiers', numero: t.numero, intitule: t.intitule, classe: cls, type: tp, tiersEntry: t })
    }

    // 3. Plan statique non activé (optionnel)
    if (showPlan) {
      const tiersNums = new Set(tiersOnly.map(t => t.numero))
      for (const e of planOnly) {
        if (!tiersNums.has(e.numero)) {
          rows.push({ kind: 'plan', numero: e.numero, intitule: e.intitule, classe: e.classe, type: e.type })
        }
      }
    }

    return rows
  }, [comptes, tiersOnly, planOnly, showPlan])

  // Filtre par tab (Tous / Centralisateurs)
  const tabRows = useMemo(() =>
    tab === 'centralizers' ? allRows.filter(r => isCentralizer(r.numero)) : allRows,
    [allRows, tab],
  )

  // Filtres recherche + classe
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tabRows.filter(r => {
      const matchClasse = classeFilter === null || r.classe === classeFilter
      const matchSearch = !q || r.numero.toLowerCase().includes(q) || r.intitule.toLowerCase().includes(q)
      return matchClasse && matchSearch
    }).sort((a, b) => a.numero.localeCompare(b.numero))
  }, [tabRows, search, classeFilter])

  // Classes disponibles
  const classes = useMemo(() => {
    const s = new Set(tabRows.map(r => r.classe))
    return Array.from(s).sort((a, b) => a - b)
  }, [tabRows])

  const editMutation = useMutation({
    mutationFn: ({ id, intitule }: { id: string; intitule: string }) => accountingApi.updateCompte(id, intitule),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comptes'] }); setEditing(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountingApi.deleteCompte(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comptes'] }); setDeleting(null) },
  })

  function startEdit(c: CompteItem) {
    // Intitulé éditable pour TOUS les comptes (y compris système) —
    // l'utilisateur peut personnaliser le libellé. Seule la suppression
    // reste verrouillée sur les comptes système.
    setEditing(c.id)
    setEditVal(c.intitule)
  }

  function commitEdit(id: string) {
    const value = editVal.trim()
    if (value) editMutation.mutate({ id, intitule: value })
    else setEditing(null)
  }

  const totalDebit  = comptes.reduce((s, c) => s + c.soldeDebiteur,  0)
  const totalCredit = comptes.reduce((s, c) => s + c.soldeCrediteur, 0)

  // Comptage centralisateurs vs tous
  const centralizersCount = comptes.filter(c => isCentralizer(c.numero)).length

  return (
    <div className="space-y-4">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{plan.zoneLabel.flag}</span>
            <h2 className="text-base font-semibold text-gray-900">
              {tab === 'centralizers' ? 'Comptes centralisateurs' : plan.zoneLabel.label}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {tab === 'centralizers' ? (
              <>{centralizersCount} centralisateur{centralizersCount !== 1 ? 's' : ''} actif{centralizersCount !== 1 ? 's' : ''} sur {comptes.length} comptes</>
            ) : (
              <>
                {comptes.length} compte{comptes.length !== 1 ? 's' : ''} actif{comptes.length !== 1 ? 's' : ''}
                {' · '}{plan.entries.length} disponibles dans le plan
                {tiersOnly.length > 0 && (
                  <> · <span className="text-orange-600 font-medium">{tiersOnly.length} tiers à enregistrer</span></>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'centralizers' ? (
            <button
              onClick={() => setShowAddCentr(true)}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap"
            >
              + Nouveau compte centralisateur
            </button>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors whitespace-nowrap"
            >
              + Nouveau compte
            </button>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Numéro ou intitulé…"
            className="flex-1 min-w-40 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
          />

          <button onClick={() => setClasse(null)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              classeFilter === null ? 'bg-forest-900 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}>
            Toutes classes
          </button>
          {classes.map(c => (
            <button key={c} onClick={() => setClasse(classeFilter === c ? null : c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                classeFilter === c ? 'bg-forest-900 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}>
              Cl. {c}
            </button>
          ))}
        </div>

        {tab === 'all' && (
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input type="checkbox" checked={showPlan} onChange={e => setShowPlan(e.target.checked)}
              className="rounded border-gray-300 text-forest-700 focus:ring-forest-500" />
            <span className="text-xs text-gray-600">
              Afficher tous les comptes du plan ({planOnly.length} non activés)
            </span>
          </label>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
              <th className="px-4 py-3 w-32">N°</th>
              <th className="px-4 py-3">Intitulé</th>
              <th className="px-4 py-3 w-16">Cl.</th>
              <th className="px-4 py-3 w-20">Type</th>
              <th className="px-4 py-3 w-24 text-center">Statut</th>
              <th className="px-4 py-3 w-28 text-right">Solde débit.</th>
              <th className="px-4 py-3 w-28 text-right">Solde crédit.</th>
              <th className="px-4 py-3 w-28 text-right">Solde net</th>
              <th className="px-4 py-3 w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">
                  {search
                    ? `Aucun compte correspondant à « ${search} »`
                    : tab === 'centralizers'
                      ? 'Aucun compte centralisateur actif — cliquez sur « Nouveau compte centralisateur » pour en créer un.'
                      : 'Aucun compte'}
                </td>
              </tr>
            ) : filteredRows.map(row => {

              // ── Compte actif ──────────────────────────────────────────────
              if (row.kind === 'active') {
                const c = row.compteItem!
                const central = isCentralizer(c.numero)
                return (
                  <tr key={`active-${c.id}`} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700 align-middle">
                      <div className="flex items-center gap-1.5">
                        {central && (
                          <span className="rounded bg-blue-100 text-blue-700 px-1 py-0.5 text-[9px] font-bold" title="Compte centralisateur">⚙</span>
                        )}
                        {c.numero}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {editing === c.id ? (
                        <input autoFocus value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={() => commitEdit(c.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit(c.id)
                            if (e.key === 'Escape') setEditing(null)
                          }}
                          className="w-full rounded border border-blue-400 bg-blue-50 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-forest-500"
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(c)}
                          title="Cliquer pour modifier l'intitulé"
                          className="group text-left w-full text-gray-800 font-medium px-1 py-0.5 rounded transition-colors hover:bg-blue-50 hover:text-blue-700 cursor-text"
                        >
                          {c.intitule}
                          <span className="ml-1.5 text-[10px] text-gray-300 group-hover:text-gray-500">✎</span>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{c.classe}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_COLORS[c.type]}`}>
                        {TYPE_LABELS[c.type]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {central ? (
                        <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-semibold">⚙ Centralisateur</span>
                      ) : (
                        <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-semibold">✓ Actif</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                      {c.soldeDebiteur > 0 ? fmt(c.soldeDebiteur) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                      {c.soldeCrediteur > 0 ? fmt(c.soldeCrediteur) : '—'}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${c.soldeNet > 0 ? 'text-blue-700' : c.soldeNet < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {c.soldeNet !== 0 ? fmt(Math.abs(c.soldeNet)) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {editing === c.id ? (
                        <button onClick={() => setEditing(null)}
                          className="text-xs text-gray-400 hover:underline">Annuler</button>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { if (deleting !== c.id) { setDeleting(c.id); return } deleteMutation.mutate(c.id) }}
                            disabled={c.isSystem}
                            className={`text-xs ${
                              c.isSystem ? 'text-gray-300 cursor-not-allowed' :
                              deleting === c.id ? 'text-red-600 font-semibold' : 'text-gray-400 hover:text-red-500'
                            }`}>
                            {deleting === c.id ? 'Confirmer' : c.isSystem ? '—' : 'Désactiver'}
                          </button>
                          {deleting === c.id && (
                            <button onClick={() => setDeleting(null)} className="text-xs text-gray-400 hover:underline">Annuler</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              }

              // ── Compte tiers non enregistré ───────────────────────────────
              if (row.kind === 'tiers') {
                const t = row.tiersEntry!
                return (
                  <tr key={`tiers-${t.id}`} className="bg-orange-50/50 hover:bg-orange-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-orange-700 font-semibold">{t.numero}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 italic">{t.intitule}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          t.type === 'client' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {t.type === 'client' ? '🏢 Client' : '🏭 Fournisseur'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{t.numero.charAt(0)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_COLORS[row.type]}`}>
                        {TYPE_LABELS[row.type]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[10px] font-semibold">Tiers</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-300 text-xs">—</td>
                    <td className="px-4 py-2.5 text-right text-gray-300 text-xs">—</td>
                    <td className="px-4 py-2.5 text-right text-gray-300 text-xs">—</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => setAddTiers(t)}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-700
                                   hover:bg-orange-200 border border-orange-200 transition-colors">
                        + Enregistrer
                      </button>
                    </td>
                  </tr>
                )
              }

              // ── Entrée du plan non activée ────────────────────────────────
              return (
                <tr key={`plan-${row.numero}`} className="opacity-50 hover:opacity-80 transition-opacity">
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">{row.numero}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{row.intitule}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{row.classe}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium opacity-60 ${TYPE_COLORS[row.type]}`}>
                      {TYPE_LABELS[row.type]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className="rounded-full bg-gray-100 text-gray-400 px-2 py-0.5 text-[10px]">Plan</span>
                  </td>
                  <td colSpan={3} className="px-4 py-2 text-center text-gray-300 text-xs">—</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setActivatePlan(plan.entries.find(e => e.numero === row.numero) ?? null)}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600
                                 hover:bg-forest-100 hover:text-forest-800 border border-gray-200 transition-colors">
                      + Activer
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {comptes.length > 0 && tab === 'all' && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600">
                <td colSpan={5} className="px-4 py-3">Total comptes actifs</td>
                <td className="px-4 py-3 text-right">{fmt(totalDebit)}</td>
                <td className="px-4 py-3 text-right">{fmt(totalCredit)}</td>
                <td className="px-4 py-3 text-right">{fmt(Math.abs(totalDebit - totalCredit))}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Modals */}
      {showAdd && (
        <AddCompteModal planEntries={plan.entries} onClose={() => setShowAdd(false)} />
      )}
      {showAddCentr && (
        <AddCompteModal planEntries={plan.entries} centralizerMode onClose={() => setShowAddCentr(false)} />
      )}
      {addTiers && (
        <AddCompteModal planEntries={plan.entries}
          initialNumero={addTiers.numero} initialLabel={addTiers.intitule}
          onClose={() => setAddTiers(null)} />
      )}
      {activatePlan && (
        <AddCompteModal planEntries={plan.entries}
          initialNumero={activatePlan.numero} initialLabel={activatePlan.intitule}
          onClose={() => setActivatePlan(null)} />
      )}
    </div>
  )
}

// ── Onglets horizontaux ───────────────────────────────────────────────────────

interface HorizontalTabsProps {
  active:    TabId
  onChange:  (id: TabId) => void
  totalAll:  number
  totalCentr: number
}

function HorizontalTabs({ active, onChange, totalAll, totalCentr }: HorizontalTabsProps) {
  const items: { id: TabId; icon: string; label: string; count: number }[] = [
    { id: 'all',          icon: '📋', label: 'Tous les comptes',       count: totalAll   },
    { id: 'centralizers', icon: '⚙',  label: 'Comptes centralisateurs', count: totalCentr },
  ]
  return (
    <div className="flex items-center gap-1 border-b border-gray-200">
      {items.map(it => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === it.id
              ? 'border-forest-900 text-forest-900'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
          }`}
        >
          <span className={active === it.id ? '' : 'opacity-70'}>{it.icon}</span>
          <span>{it.label}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-mono font-semibold ${
              active === it.id
                ? 'bg-forest-100 text-forest-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {it.count}
          </span>
        </button>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ComptesPage() {
  const { data: plan,    isLoading: planLoading,    isError: planError }    = usePlan()
  const { data: comptes, isLoading: comptesLoading, isError: comptesError } = useComptes()
  const { comptesTiers } = useGestion()

  const [tab, setTab] = useState<TabId>('all')

  const isLoading = planLoading || comptesLoading
  const isError   = planError   || comptesError

  const totalAll   = comptes?.length ?? 0
  const totalCentr = comptes?.filter(c => isCentralizer(c.numero)).length ?? 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Plan comptable</h1>
        <p className="mt-1 text-sm text-gray-500">Référentiel comptable et comptes actifs de votre entreprise</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest-500 border-t-transparent" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-600">
          Impossible de charger les données
        </div>
      ) : (
        plan && comptes && (
          <div className="space-y-4">
            <HorizontalTabs active={tab} onChange={setTab} totalAll={totalAll} totalCentr={totalCentr} />
            <UnifiedTab plan={plan} comptes={comptes} comptesTiers={comptesTiers} tab={tab} />
          </div>
        )
      )}
    </div>
  )
}
