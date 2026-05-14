import { useState, useMemo, Fragment } from 'react'
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

/**
 * Retourne le préfixe significatif d'un numéro de compte centralisateur.
 * Ex : 401000000 → "401" | 601100000 → "6011" | CLI-GRP → "CLI-GRP"
 */
function getCentralizerRoot(numero: string): string {
  if (/^\d+$/.test(numero)) {
    const stripped = numero.replace(/0+$/, '')
    return stripped.length > 0 ? stripped : numero.charAt(0)
  }
  return numero
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

// ── Add compte modal ──────────────────────────────────────────────────────────

interface AddModalProps {
  existingComptes:  CompteItem[]
  initialNumero?:   string
  initialLabel?:    string
  centralizerMode?: boolean
  onClose:          () => void
}

function inferType(num: string): ChartAccountType {
  if (/^41/.test(num)) return 'ACTIF'
  if (/^4/.test(num))  return 'PASSIF'
  if (/^7/.test(num))  return 'PRODUIT'
  return 'CHARGE'
}

function AddCompteModal({ existingComptes, initialNumero = '', initialLabel = '', centralizerMode = false, onClose }: AddModalProps) {
  const qc = useQueryClient()
  const [numero,   setNumero]   = useState(initialNumero)
  const [intitule, setIntitule] = useState(initialLabel)
  const [error,    setError]    = useState('')

  // Numéro final normalisé (zéros si purement numérique)
  const finalNumero = normalizeNumero(numero)

  // Détection doublon en temps réel
  const existingNums = useMemo(
    () => new Set(existingComptes.map(c => c.numero)),
    [existingComptes],
  )
  const isDuplicate = finalNumero.length > 0 && existingNums.has(finalNumero)

  // Classe et type déduits automatiquement du premier chiffre
  const classe = numero ? (parseInt(numero[0] ?? '4') || 4) : 4
  const type   = inferType(numero)

  const canSubmit =
    numero.trim().length > 0 &&
    intitule.trim().length > 0 &&
    !isDuplicate

  const mutation = useMutation({
    mutationFn: () => accountingApi.addCompte({
      numero:        finalNumero,
      intitule:      intitule.trim(),
      classe,
      type,
      isSystem:      false,
      isCentralizer: centralizerMode,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comptes'] }); onClose() },
    onError:   (err: unknown) => setError(err instanceof Error ? err.message : "Erreur lors de l'ajout"),
  })

  const title = centralizerMode ? 'Nouveau compte centralisateur' : 'Nouveau compte'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {centralizerMode && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              💡 Un compte centralisateur agrège des sous-comptes partageant la même racine
              (ex : <strong>411</strong> regroupe <strong>411-DUPONT</strong>, <strong>411-MARTIN</strong>…).
            </div>
          )}

          {/* Numéro */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Numéro de compte <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={numero}
              onChange={e => { setNumero(e.target.value); setError('') }}
              placeholder={centralizerMode ? 'ex : 401, 411, 512' : 'ex : 6011, 411, CLI-DUPONT'}
              className={`w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 transition-colors ${
                isDuplicate
                  ? 'border-red-400 bg-red-50 focus:ring-red-300'
                  : 'border-gray-200 focus:ring-forest-500'
              }`}
            />
            {/* Feedback en temps réel */}
            {isDuplicate ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600 font-medium">
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Ce numéro existe déjà ({existingComptes.find(c => c.numero === finalNumero)?.intitule})
              </p>
            ) : finalNumero && finalNumero !== numero.trim() ? (
              <p className="mt-1 text-xs text-gray-400">
                → Enregistré comme <span className="font-mono font-semibold text-forest-700">{finalNumero}</span>
              </p>
            ) : finalNumero && (
              <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold">Cl.{classe}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[type]}`}>{TYPE_LABELS[type]}</span>
              </p>
            )}
          </div>

          {/* Intitulé */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Intitulé <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={intitule}
              onChange={e => { setIntitule(e.target.value); setError('') }}
              onKeyDown={e => { if (e.key === 'Enter' && canSubmit) mutation.mutate() }}
              placeholder="Libellé du compte…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !canSubmit}
            className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Enregistrement…' : 'Créer'}
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
  const [editing,           setEditing]           = useState<string | null>(null)
  const [editVal,           setEditVal]           = useState('')
  const [deleting,          setDeleting]          = useState<string | null>(null)
  const [expandedCentralizer, setExpandedCentralizer] = useState<string | null>(null)

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
  // "Tous les comptes" : exclut les centralisateurs (ils ont leur propre onglet)
  // "Centralisateurs"  : uniquement les comptes marqués isCentralizer
  const tabRows = useMemo(() =>
    tab === 'centralizers'
      ? allRows.filter(r => r.kind === 'active' && r.compteItem?.isCentralizer === true)
      : allRows.filter(r => !(r.kind === 'active' && r.compteItem?.isCentralizer === true)),
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
  const centralizersCount = comptes.filter(c => c.isCentralizer).length

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

          {tab !== 'centralizers' && (
            <button onClick={() => setClasse(null)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                classeFilter === null ? 'bg-forest-900 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}>
              Toutes classes
            </button>
          )}
          {tab !== 'centralizers' && classes.map(c => (
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
                const central = c.isCentralizer
                const isExpanded = central && expandedCentralizer === c.id
                const subAccounts = isExpanded
                  ? comptes.filter(sub => {
                      const root = getCentralizerRoot(c.numero)
                      return !sub.isCentralizer && sub.id !== c.id && sub.numero.startsWith(root)
                    })
                  : []

                return (
                  <Fragment key={`active-${c.id}`}>
                    <tr
                      className={`hover:bg-gray-50/50 ${central ? 'cursor-pointer select-none' : ''}`}
                      onClick={central ? () => setExpandedCentralizer(x => x === c.id ? null : c.id) : undefined}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-700 align-middle">
                        <div className="flex items-center gap-1.5">
                          {central && (
                            <span className="text-gray-400 text-[10px] w-3 shrink-0">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          )}
                          {central && (
                            <span className="rounded bg-blue-100 text-blue-700 px-1 py-0.5 text-[9px] font-bold shrink-0" title="Compte centralisateur">⚙</span>
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
                            onClick={e => e.stopPropagation()}
                            className="w-full rounded border border-blue-400 bg-blue-50 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-forest-500"
                          />
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); startEdit(c) }}
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
                      <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                        {(() => {
                          const hasMouvements = c.soldeDebiteur > 0 || c.soldeCrediteur > 0
                          const isCentr = c.isCentralizer
                          if (editing === c.id) {
                            return (
                              <button onClick={e => { e.stopPropagation(); setEditing(null) }}
                                className="text-xs text-gray-400 hover:underline">Annuler</button>
                            )
                          }
                          if (!isCentr && c.isSystem) {
                            return (
                              <span className="text-xs text-gray-300 cursor-not-allowed" title="Compte système — non supprimable">🔒</span>
                            )
                          }
                          if (!isCentr && hasMouvements) {
                            return (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600 cursor-not-allowed" title="Compte mouvementé — non supprimable">
                                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                Mouvementé
                              </span>
                            )
                          }
                          if (deleting === c.id) {
                            return (
                              <div className="flex justify-end gap-2 items-center">
                                <button
                                  onClick={e => { e.stopPropagation(); deleteMutation.mutate(c.id) }}
                                  disabled={deleteMutation.isPending}
                                  className="rounded-md bg-red-600 text-white px-2 py-1 text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                                >
                                  {deleteMutation.isPending ? 'Suppression…' : '✓ Confirmer'}
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); setDeleting(null) }}
                                  className="text-xs text-gray-400 hover:underline"
                                >
                                  Annuler
                                </button>
                              </div>
                            )
                          }
                          return (
                            <button
                              onClick={e => { e.stopPropagation(); setDeleting(c.id) }}
                              title={`Supprimer le compte ${c.numero}`}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2h12a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM5 7a1 1 0 011 1v7a2 2 0 002 2h4a2 2 0 002-2V8a1 1 0 112 0v7a4 4 0 01-4 4H8a4 4 0 01-4-4V8a1 1 0 011-1z" clipRule="evenodd" />
                              </svg>
                              Supprimer
                            </button>
                          )
                        })()}
                      </td>
                    </tr>

                    {/* ── Sous-comptes déroulés ──────────────────────── */}
                    {isExpanded && subAccounts.length === 0 && (
                      <tr>
                        <td colSpan={9} className="pl-12 py-3 text-xs text-gray-400 italic bg-blue-50/30 border-l-4 border-blue-200">
                          Aucun compte auxiliaire trouvé pour la racine «&nbsp;{getCentralizerRoot(c.numero)}&nbsp;»
                        </td>
                      </tr>
                    )}
                    {isExpanded && subAccounts.map(sub => (
                      <tr key={`sub-${sub.id}`} className="bg-blue-50/30 hover:bg-blue-50/60 border-l-4 border-blue-300">
                        <td className="px-4 py-2 align-middle">
                          <div className="flex items-center gap-2 pl-6">
                            <span className="text-blue-300 text-xs leading-none">└</span>
                            <span className="font-mono text-xs text-gray-600">{sub.numero}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-gray-700 text-xs">{sub.intitule}</td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{sub.classe}</td>
                        <td className="px-4 py-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_COLORS[sub.type]}`}>{TYPE_LABELS[sub.type]}</span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-semibold">✓ Actif</span>
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                          {sub.soldeDebiteur > 0 ? fmt(sub.soldeDebiteur) : '—'}
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                          {sub.soldeCrediteur > 0 ? fmt(sub.soldeCrediteur) : '—'}
                        </td>
                        <td className={`px-4 py-2 text-right text-xs font-semibold ${sub.soldeNet > 0 ? 'text-blue-600' : sub.soldeNet < 0 ? 'text-red-500' : 'text-gray-300'}`}>
                          {sub.soldeNet !== 0 ? fmt(Math.abs(sub.soldeNet)) : '—'}
                        </td>
                        <td className="px-4 py-2" />
                      </tr>
                    ))}
                  </Fragment>
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
        <AddCompteModal existingComptes={comptes} onClose={() => setShowAdd(false)} />
      )}
      {showAddCentr && (
        <AddCompteModal existingComptes={comptes} centralizerMode onClose={() => setShowAddCentr(false)} />
      )}
      {addTiers && (
        <AddCompteModal existingComptes={comptes}
          initialNumero={addTiers.numero} initialLabel={addTiers.intitule}
          onClose={() => setAddTiers(null)} />
      )}
      {activatePlan && (
        <AddCompteModal existingComptes={comptes}
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

  const totalAll   = comptes?.filter(c => !c.isCentralizer).length ?? 0
  const totalCentr = comptes?.filter(c =>  c.isCentralizer).length ?? 0

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
