import { useState, useEffect, useMemo } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { accountingApi, type PlanData, type CompteItem, type PlanEntry, type ChartAccountType } from '@/services/accountingApi'
import { useGestion } from '@/contexts/GestionContext'

type SubTab = 'plan' | 'comptes' | 'tiers'

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

// ── Add compte modal ──────────────────────────────────────────────────────────

interface AddModalProps {
  planEntries: PlanEntry[]
  onClose: () => void
  onSaved: () => void
}

function AddCompteModal({ planEntries, onClose, onSaved }: AddModalProps) {
  const [search, setSearch]   = useState('')
  const [custom, setCustom]   = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({ numero: '', intitule: '', classe: 1, type: 'ACTIF' as ChartAccountType })

  const suggestions = useMemo(() =>
    search.length < 2 ? [] :
    planEntries
      .filter(e => e.numero.startsWith(search) || e.intitule.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10),
    [search, planEntries]
  )

  function selectEntry(e: PlanEntry) {
    setForm({ numero: e.numero, intitule: e.intitule, classe: e.classe, type: e.type })
    setSearch(e.numero + ' — ' + e.intitule)
    setCustom(false)
  }

  async function handleSave() {
    if (!form.numero || !form.intitule) { setError('Numéro et intitulé requis'); return }
    setSaving(true)
    setError('')
    try {
      await accountingApi.addCompte({ ...form, isSystem: false })
      onSaved()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'ajout'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Ajouter un compte</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rechercher dans le plan</label>
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
                  <button
                    key={e.numero}
                    onClick={() => selectEntry(e)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <span className="font-mono text-xs text-gray-500 w-16 shrink-0">{e.numero}</span>
                    <span className="flex-1 truncate text-gray-800">{e.intitule}</span>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_COLORS[e.type]}`}>{TYPE_LABELS[e.type]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-gray-100" />
            <button
              onClick={() => { setCustom(c => !c); setSearch('') }}
              className="text-xs text-forest-700 hover:underline"
            >
              {custom ? 'Annuler la saisie manuelle' : 'Saisie manuelle'}
            </button>
            <div className="flex-1 border-t border-gray-100" />
          </div>

          {(custom || form.numero) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Numéro</label>
                <input
                  type="text"
                  value={form.numero}
                  onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Classe</label>
                <input
                  type="number"
                  min={1} max={9}
                  value={form.classe}
                  onChange={e => setForm(f => ({ ...f, classe: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Intitulé</label>
                <input
                  type="text"
                  value={form.intitule}
                  onChange={e => setForm(f => ({ ...f, intitule: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as ChartAccountType }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
                >
                  {(Object.keys(TYPE_LABELS) as ChartAccountType[]).map(t => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!form.numero && !custom)}
            className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Plan comptable sub-tab ────────────────────────────────────────────────────

interface PlanTabProps { plan: PlanData }

function PlanTab({ plan }: PlanTabProps) {
  const [search, setSearch]       = useState('')
  const [classeFilter, setClasse] = useState<number | null>(null)

  const classes = useMemo(() => {
    const s = new Set(plan.entries.map(e => e.classe))
    return Array.from(s).sort((a, b) => a - b)
  }, [plan.entries])

  const filtered = useMemo(() =>
    plan.entries.filter(e => {
      const matchClasse = classeFilter === null || e.classe === classeFilter
      const q = search.toLowerCase()
      const matchSearch = !q || e.numero.includes(q) || e.intitule.toLowerCase().includes(q)
      return matchClasse && matchSearch
    }),
    [plan.entries, search, classeFilter]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <span className="text-2xl">{plan.zoneLabel.flag}</span>
        <div>
          <p className="text-sm font-semibold text-gray-900">{plan.zoneLabel.label}</p>
          <p className="text-xs text-gray-500">{plan.entries.length} comptes disponibles</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher N° ou intitulé…"
          className="flex-1 min-w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
        />
        <button
          onClick={() => setClasse(null)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            classeFilter === null ? 'bg-forest-900 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Tous
        </button>
        {classes.map(c => (
          <button
            key={c}
            onClick={() => setClasse(classeFilter === c ? null : c)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              classeFilter === c ? 'bg-forest-900 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Classe {c}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Intitulé</th>
              <th className="px-4 py-3">Classe</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-center">Utilisé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Aucun compte trouvé</td>
              </tr>
            ) : filtered.map(e => (
              <tr key={e.numero} className="hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{e.numero}</td>
                <td className="px-4 py-2.5 text-gray-800">{e.intitule}</td>
                <td className="px-4 py-2.5 text-gray-500">{e.classe}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_COLORS[e.type]}`}>
                    {TYPE_LABELS[e.type]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  {e.utilisé ? (
                    <span className="text-green-600 font-bold">✓</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Mes comptes sub-tab ───────────────────────────────────────────────────────

interface ComptesTabProps {
  comptes:     CompteItem[]
  planEntries: PlanEntry[]
  onRefresh:   () => void
}

function ComptesTab({ comptes, planEntries, onRefresh }: ComptesTabProps) {
  const { fmt } = useCurrency()
  const [showAdd, setShowAdd]   = useState(false)
  const [editing, setEditing]   = useState<string | null>(null)
  const [editVal, setEditVal]   = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleSaveEdit(id: string) {
    if (!editVal.trim()) return
    try {
      await accountingApi.updateCompte(id, editVal.trim())
      setEditing(null)
      onRefresh()
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    if (deleting !== id) { setDeleting(id); return }
    try {
      await accountingApi.deleteCompte(id)
      setDeleting(null)
      onRefresh()
    } catch { /* ignore */ }
  }

  const totalDebit  = comptes.reduce((s, c) => s + c.soldeDebiteur,  0)
  const totalCredit = comptes.reduce((s, c) => s + c.soldeCrediteur, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Mes comptes actifs</h2>
          <p className="mt-0.5 text-xs text-gray-500">{comptes.length} compte{comptes.length !== 1 ? 's' : ''} activés</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors"
        >
          + Ajouter un compte
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Intitulé</th>
              <th className="px-4 py-3">Classe</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Solde débiteur</th>
              <th className="px-4 py-3 text-right">Solde créditeur</th>
              <th className="px-4 py-3 text-right">Solde net</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {comptes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                  Aucun compte actif — cliquez sur « Ajouter un compte »
                </td>
              </tr>
            ) : comptes.map(c => (
              <tr key={c.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{c.numero}</td>
                <td className="px-4 py-2.5">
                  {editing === c.id ? (
                    <input
                      autoFocus
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(c.id); if (e.key === 'Escape') setEditing(null) }}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-forest-500"
                    />
                  ) : (
                    <span className="text-gray-800">{c.intitule}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-gray-500">{c.classe}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_COLORS[c.type]}`}>
                    {TYPE_LABELS[c.type]}
                  </span>
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
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleSaveEdit(c.id)} className="text-xs text-green-600 hover:underline">Sauvegarder</button>
                      <button onClick={() => setEditing(null)} className="text-xs text-gray-400 hover:underline">Annuler</button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      {!c.isSystem && (
                        <button
                          onClick={() => { setEditing(c.id); setEditVal(c.intitule) }}
                          className="text-xs text-gray-500 hover:text-gray-800"
                        >
                          Modifier
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(c.id)}
                        className={`text-xs ${deleting === c.id ? 'text-red-600 font-semibold' : 'text-gray-400 hover:text-red-500'}`}
                      >
                        {deleting === c.id ? 'Confirmer' : 'Désactiver'}
                      </button>
                      {deleting === c.id && (
                        <button onClick={() => setDeleting(null)} className="text-xs text-gray-400 hover:underline">Annuler</button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {comptes.length > 0 && (
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600">
                <td colSpan={4} className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">{fmt(totalDebit)}</td>
                <td className="px-4 py-3 text-right">{fmt(totalCredit)}</td>
                <td className="px-4 py-3 text-right">{fmt(Math.abs(totalDebit - totalCredit))}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showAdd && (
        <AddCompteModal
          planEntries={planEntries}
          onClose={() => setShowAdd(false)}
          onSaved={onRefresh}
        />
      )}
    </div>
  )
}

// ── Comptes tiers tab ─────────────────────────────────────────────────────────

function TiersTab() {
  const { comptesTiers } = useGestion()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return comptesTiers
    return comptesTiers.filter(c =>
      c.numero.includes(q) ||
      c.intitule.toLowerCase().includes(q),
    )
  }, [comptesTiers, search])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Comptes tiers</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Alimenté automatiquement depuis les clients et fournisseurs ayant un compte renseigné
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          {comptesTiers.length} compte{comptesTiers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {comptesTiers.length > 0 && (
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Numéro ou intitulé…"
          className="w-56 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
        />
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
              <th className="px-4 py-3">N° compte</th>
              <th className="px-4 py-3">Intitulé</th>
              <th className="px-4 py-3">Type tiers</th>
              <th className="px-4 py-3">Agence</th>
              <th className="px-4 py-3">Classe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                  {comptesTiers.length === 0
                    ? 'Aucun compte tiers — renseignez un numéro de compte sur un client ou fournisseur'
                    : 'Aucun résultat'}
                </td>
              </tr>
            ) : filtered.map(c => {
              const classe = c.numero.charAt(0)
              const isClient = c.type === 'client'
              return (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-800">{c.numero}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{c.intitule}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      isClient
                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 ring-inset'
                        : 'bg-orange-50 text-orange-700 ring-1 ring-orange-200 ring-inset'
                    }`}>
                      {isClient ? '🏢 Client' : '🏭 Fournisseur'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{c.agence}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{classe || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {comptesTiers.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-8 text-center">
          <p className="text-sm font-medium text-gray-600 mb-1">Comment alimenter cette liste ?</p>
          <p className="text-xs text-gray-400">
            Dans <strong>Gestion › Clients</strong> ou <strong>Gestion › Fournisseurs</strong>,
            ouvrez le formulaire de création ou de modification et renseignez le champ{' '}
            <strong>Compte comptable</strong> (ex&nbsp;: 411100 pour un client, 401100 pour un fournisseur).
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ComptesPage() {
  const [tab, setTab]         = useState<SubTab>('plan')
  const [plan, setPlan]       = useState<PlanData | null>(null)
  const [comptes, setComptes] = useState<CompteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [p, c] = await Promise.all([accountingApi.plan(), accountingApi.comptes()])
      setPlan(p)
      setComptes(c)
    } catch {
      setError('Impossible de charger les données')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Plan comptable</h1>
        <p className="mt-1 text-sm text-gray-500">Référentiel comptable adapté à votre zone géographique</p>
      </div>

      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit">
        <button
          onClick={() => setTab('plan')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === 'plan' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Plan comptable
        </button>
        <button
          onClick={() => setTab('comptes')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === 'comptes' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Mes comptes
        </button>
        <button
          onClick={() => setTab('tiers')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === 'tiers' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Comptes tiers
        </button>
      </div>

      {tab === 'tiers' ? (
        <TiersTab />
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-600">
          {error}
          <button onClick={loadAll} className="ml-2 underline">Réessayer</button>
        </div>
      ) : tab === 'plan' ? (
        plan && <PlanTab plan={plan} />
      ) : (
        plan && <ComptesTab comptes={comptes} planEntries={plan.entries} onRefresh={loadAll} />
      )}
    </div>
  )
}
