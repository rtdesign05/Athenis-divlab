import { useState } from 'react'
import { useFiscalYear } from '@/contexts/FiscalYearContext'
import {
  useAssets,
  useAssetSummary,
  useDepreciationTable,
  useAssetSchedule,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useGenerateEntries,
} from '@/hooks/useAssets'
import type { Asset, AssetCategory, AssetInput, AssetStatus } from '@/services/assetsApi'
import { cn } from '@/shared/utils/cn'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('fr-FR') + ' F CFA'
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('fr-FR')
}

function calcCumulAmort(asset: Asset, upToYear: number): number {
  return asset.depreciations
    .filter(d => d.year <= upToYear)
    .reduce((s, d) => s + Number(d.depreciationAmt), 0)
}

// ── Sub-tab type ──────────────────────────────────────────────────────────────

type SubTab = 'dashboard' | 'registre' | 'amortissements'

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AssetStatus }) {
  const map: Record<AssetStatus, { label: string; cls: string }> = {
    IN_SERVICE:  { label: 'En service',  cls: 'bg-green-100 text-green-700'  },
    DISPOSED:    { label: 'Cédé',        cls: 'bg-gray-100 text-gray-500'    },
    SCRAPPED:    { label: 'Mis au rebut',cls: 'bg-red-100 text-red-700'      },
    IN_PROGRESS: { label: 'En cours',    cls: 'bg-amber-100 text-amber-700'  },
  }
  const { label, cls } = map[status]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cls)}>
      {label}
    </span>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-xl font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
    </div>
  )
}

// ── Asset form modal ──────────────────────────────────────────────────────────

interface AssetFormProps {
  initial?: Asset
  onClose: () => void
  onSubmit: (data: AssetInput) => Promise<void>
  loading: boolean
}

function AssetForm({ initial, onClose, onSubmit, loading }: AssetFormProps) {
  const [form, setForm] = useState<AssetInput>({
    designation:      initial?.designation      ?? '',
    accountNumber:    initial?.accountNumber    ?? '',
    category:         initial?.category         ?? 'CORPOREL',
    acquisitionDate:  initial?.acquisitionDate  ? initial.acquisitionDate.slice(0, 10) : '',
    serviceDate:      initial?.serviceDate      ? initial.serviceDate.slice(0, 10) : '',
    grossValue:       initial ? Number(initial.grossValue) : 0,
    residualValue:    initial ? Number(initial.residualValue) : 0,
    depreciationMode: initial?.depreciationMode ?? 'LINEAR',
    usefulLifeYears:  initial?.usefulLifeYears  ?? 5,
    supplier:         initial?.supplier         ?? '',
    serialNumber:     initial?.serialNumber     ?? '',
    location:         initial?.location         ?? '',
    notes:            initial?.notes            ?? '',
  })

  const rate = form.usefulLifeYears > 0
    ? ((Math.round((1 / form.usefulLifeYears) * 10000) / 100)).toFixed(2)
    : '0.00'

  function set<K extends keyof AssetInput>(k: K, v: AssetInput[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit(form)
  }

  const inp = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30'
  const lbl = 'block text-xs font-medium text-gray-700 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            {initial ? "Modifier l'immobilisation" : 'Ajouter une immobilisation'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={e => void handleSubmit(e)} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={lbl}>Désignation *</label>
              <input required className={inp} value={form.designation}
                onChange={e => set('designation', e.target.value)} />
            </div>

            <div>
              <label className={lbl}>Numéro de compte *</label>
              <input required className={inp} value={form.accountNumber}
                onChange={e => set('accountNumber', e.target.value)} placeholder="ex: 2445" />
            </div>

            <div>
              <label className={lbl}>Catégorie *</label>
              <select required className={inp} value={form.category}
                onChange={e => set('category', e.target.value as AssetCategory)}>
                <option value="CORPOREL">Corporelle</option>
                <option value="INCORPOREL">Incorporelle</option>
                <option value="FINANCIER">Financière</option>
                <option value="EN_COURS">En cours</option>
              </select>
            </div>

            <div>
              <label className={lbl}>Date d'acquisition *</label>
              <input required type="date" className={inp} value={form.acquisitionDate}
                onChange={e => set('acquisitionDate', e.target.value)} />
            </div>

            <div>
              <label className={lbl}>Date de mise en service</label>
              <input type="date" className={inp} value={form.serviceDate ?? ''}
                onChange={e => set('serviceDate', e.target.value || undefined)} />
            </div>

            <div>
              <label className={lbl}>Valeur brute (F CFA) *</label>
              <input required type="number" min="0" className={inp} value={form.grossValue}
                onChange={e => set('grossValue', Number(e.target.value))} />
            </div>

            <div>
              <label className={lbl}>Valeur résiduelle (F CFA)</label>
              <input type="number" min="0" className={inp} value={form.residualValue ?? 0}
                onChange={e => set('residualValue', Number(e.target.value))} />
            </div>

            <div>
              <label className={lbl}>Mode d'amortissement</label>
              <select className={inp} value={form.depreciationMode}
                onChange={e => set('depreciationMode', e.target.value as 'LINEAR' | 'DEGRESSIVE')}>
                <option value="LINEAR">Linéaire</option>
                <option value="DEGRESSIVE">Dégressif</option>
              </select>
            </div>

            <div>
              <label className={lbl}>Durée de vie (années) *</label>
              <input required type="number" min="1" max="50" className={inp} value={form.usefulLifeYears}
                onChange={e => set('usefulLifeYears', Number(e.target.value))} />
            </div>

            <div className="col-span-2">
              <p className="text-xs text-gray-500">
                Taux d'amortissement calculé : <strong>{rate}%</strong>
              </p>
            </div>

            <div>
              <label className={lbl}>Fournisseur</label>
              <input className={inp} value={form.supplier ?? ''}
                onChange={e => set('supplier', e.target.value || undefined)} />
            </div>

            <div>
              <label className={lbl}>N° de série</label>
              <input className={inp} value={form.serialNumber ?? ''}
                onChange={e => set('serialNumber', e.target.value || undefined)} />
            </div>

            <div>
              <label className={lbl}>Localisation</label>
              <input className={inp} value={form.location ?? ''}
                onChange={e => set('location', e.target.value || undefined)} />
            </div>

            <div>
              <label className={lbl}>Notes</label>
              <input className={inp} value={form.notes ?? ''}
                onChange={e => set('notes', e.target.value || undefined)} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 h-9 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {loading ? 'Enregistrement…' : (initial ? 'Modifier' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Schedule modal ────────────────────────────────────────────────────────────

function ScheduleModal({ assetId, onClose }: { assetId: string; onClose: () => void }) {
  const { data, isLoading } = useAssetSchedule(assetId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Plan d'amortissement</h2>
            {data && (
              <p className="text-xs text-gray-500 mt-0.5">
                {data.asset.designation} — {data.asset.accountNumber}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {isLoading && <Spinner />}
          {data && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-500">Valeur brute</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{fmt(Number(data.asset.grossValue))}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-500">Durée</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{data.asset.usefulLifeYears} ans</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-500">Taux</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {(Number(data.asset.depreciationRate) * 100).toFixed(2)}%
                  </p>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500">
                    <th className="pb-2 text-left font-medium">Exercice</th>
                    <th className="pb-2 text-right font-medium">Dotation</th>
                    <th className="pb-2 text-right font-medium">Amort. cumulé</th>
                    <th className="pb-2 text-right font-medium">VNC</th>
                  </tr>
                </thead>
                <tbody>
                  {data.schedule.map(row => (
                    <tr key={row.year} className="border-b border-gray-50">
                      <td className="py-2 font-medium text-gray-900">{row.year}</td>
                      <td className="py-2 text-right text-gray-700">{fmt(row.dotation)}</td>
                      <td className="py-2 text-right text-gray-700">{fmt(row.cumulAmort)}</td>
                      <td className="py-2 text-right font-medium text-gray-900">{fmt(row.netValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tab: Tableau de bord ──────────────────────────────────────────────────────

function DashboardTab({ year }: { year: number }) {
  const { data, isLoading, error } = useAssetSummary(year)

  if (isLoading) return <Spinner />
  if (error) return <p className="text-sm text-red-600">Erreur lors du chargement des données.</p>
  if (!data) return null

  const maxBrut = Math.max(...data.byCategory.map(c => c.brut), 1)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Valeur brute"
          value={fmt(data.grossTotal)}
          sub="Total des immobilisations"
        />
        <KpiCard
          label="Amort. cumulés"
          value={fmt(data.cumulAmort)}
          sub={`Au 31/12/${year}`}
        />
        <KpiCard
          label="Valeur nette (VNC)"
          value={fmt(data.netValue)}
          sub={`Au 31/12/${year}`}
        />
        <KpiCard
          label="Dotation exercice"
          value={fmt(data.dotation)}
          sub={`Exercice ${year}`}
        />
      </div>

      {/* Category breakdown */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Répartition par catégorie</h3>
        {data.byCategory.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune immobilisation enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="pb-2 text-left font-medium">Catégorie</th>
                  <th className="pb-2 text-right font-medium">Valeur brute</th>
                  <th className="pb-2 text-right font-medium">Amort. cumulés</th>
                  <th className="pb-2 text-right font-medium">VNC</th>
                  <th className="pb-2 pl-4 font-medium text-left">Répartition</th>
                </tr>
              </thead>
              <tbody>
                {data.byCategory.map(cat => (
                  <tr key={cat.category} className="border-b border-gray-50">
                    <td className="py-3 font-medium text-gray-900">{cat.category}</td>
                    <td className="py-3 text-right text-gray-700">{fmt(cat.brut)}</td>
                    <td className="py-3 text-right text-gray-500">{fmt(cat.amort)}</td>
                    <td className="py-3 text-right font-semibold text-gray-900">{fmt(cat.net)}</td>
                    <td className="py-3 pl-4 w-40">
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${Math.round((cat.brut / maxBrut) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab: Registre ─────────────────────────────────────────────────────────────

const CAT_FILTERS: { label: string; value: AssetCategory | undefined }[] = [
  { label: 'Toutes',        value: undefined     },
  { label: 'Corporelles',   value: 'CORPOREL'    },
  { label: 'Incorporelles', value: 'INCORPOREL'  },
  { label: 'Financières',   value: 'FINANCIER'   },
  { label: 'En cours',      value: 'EN_COURS'    },
]

function RegistreTab({ year }: { year: number }) {
  const [catFilter, setCatFilter] = useState<AssetCategory | undefined>(undefined)
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<Asset | null>(null)

  const { data: assets = [], isLoading, error } = useAssets(catFilter ? { category: catFilter } : undefined)
  const createAsset = useCreateAsset(year)
  const updateAsset = useUpdateAsset(year)
  const deleteAsset = useDeleteAsset(year)

  async function handleCreate(data: AssetInput) {
    await createAsset.mutateAsync(data)
    setShowForm(false)
  }

  async function handleUpdate(data: AssetInput) {
    if (!editing) return
    await updateAsset.mutateAsync({ id: editing.id, data })
    setEditing(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette immobilisation ? Cette action est irréversible.')) return
    await deleteAsset.mutateAsync(id)
  }

  if (isLoading) return <Spinner />
  if (error)     return <p className="text-sm text-red-600">Erreur lors du chargement.</p>

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {CAT_FILTERS.map(f => (
            <button
              key={f.label}
              onClick={() => setCatFilter(f.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                catFilter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + Ajouter une immobilisation
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-x-auto">
        {assets.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Aucune immobilisation enregistrée.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500">
                <th className="px-4 py-3 text-left font-medium">N°</th>
                <th className="px-4 py-3 text-left font-medium">Désignation</th>
                <th className="px-4 py-3 text-left font-medium">N° compte</th>
                <th className="px-4 py-3 text-left font-medium">Date acq.</th>
                <th className="px-4 py-3 text-right font-medium">Valeur brute</th>
                <th className="px-4 py-3 text-right font-medium">Taux</th>
                <th className="px-4 py-3 text-right font-medium">Amort. cumulé</th>
                <th className="px-4 py-3 text-right font-medium">VNC</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a, i) => {
                const gv     = Number(a.grossValue)
                const cumul  = calcCumulAmort(a, year)
                const vnc    = gv - cumul
                return (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-500 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.designation}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{a.accountNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(a.acquisitionDate)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(gv)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {(Number(a.depreciationRate) * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{fmt(Math.round(cumul))}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(Math.round(vnc))}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setEditing(a)}
                          className="rounded p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Modifier"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => void handleDelete(a.id)}
                          className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <AssetForm
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
          loading={createAsset.isPending}
        />
      )}
      {editing && (
        <AssetForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={handleUpdate}
          loading={updateAsset.isPending}
        />
      )}
    </div>
  )
}

// ── Tab: Amortissements ───────────────────────────────────────────────────────

function AmortissementsTab({ year }: { year: number }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: table, isLoading, error } = useDepreciationTable(year)
  const generateEntries = useGenerateEntries(year)

  async function handleGenerate() {
    if (!confirm(`Générer les écritures d'amortissement pour ${year} ?`)) return
    const res = await generateEntries.mutateAsync()
    const generated = (res.data as { data?: { generated?: number } })?.data?.generated ?? 0
    alert(`${generated} écriture(s) générée(s).`)
  }

  if (isLoading) return <Spinner />
  if (error)     return <p className="text-sm text-red-600">Erreur lors du chargement.</p>
  if (!table)    return null

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Tableau d'amortissement — exercice {year}
        </h3>
        <button
          onClick={() => void handleGenerate()}
          disabled={generateEntries.isPending}
          className="rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
        >
          {generateEntries.isPending ? 'Génération…' : 'Générer les écritures'}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-x-auto">
        {table.rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Aucune immobilisation à amortir pour cet exercice.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500">
                <th className="px-4 py-3 text-left font-medium">Désignation</th>
                <th className="px-4 py-3 text-right font-medium">Valeur brute</th>
                <th className="px-4 py-3 text-right font-medium">Amort. déb. ex.</th>
                <th className="px-4 py-3 text-right font-medium">Dotation</th>
                <th className="px-4 py-3 text-right font-medium">Amort. fin ex.</th>
                <th className="px-4 py-3 text-right font-medium">VNC fin ex.</th>
                <th className="px-4 py-3 text-center font-medium">Écriture</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer"
                  onClick={() => setSelectedId(row.id)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div>{row.designation}</div>
                    <div className="text-xs text-gray-400 font-mono">{row.accountNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmt(row.grossValue)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmt(row.openingAmort)}</td>
                  <td className="px-4 py-3 text-right text-blue-700 font-medium">{fmt(row.dotation)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmt(row.closingAmort)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(row.closingValue)}</td>
                  <td className="px-4 py-3 text-center">
                    {row.entryGenerated ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Générée
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-400">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals */}
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                <td className="px-4 py-3 text-gray-900">Total</td>
                <td className="px-4 py-3 text-right text-gray-900">{fmt(table.totals.grossValue)}</td>
                <td className="px-4 py-3 text-right text-gray-500">{fmt(table.totals.openingAmort)}</td>
                <td className="px-4 py-3 text-right text-blue-700">{fmt(table.totals.dotation)}</td>
                <td className="px-4 py-3 text-right text-gray-500">{fmt(table.totals.closingAmort)}</td>
                <td className="px-4 py-3 text-right text-gray-900">{fmt(table.totals.closingValue)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Schedule modal */}
      {selectedId && (
        <ScheduleModal assetId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ImmobilisationsPage() {
  const { selectedYear: year } = useFiscalYear()
  const [tab, setTab] = useState<SubTab>('dashboard')

  const tabs: { id: SubTab; label: string }[] = [
    { id: 'dashboard',      label: 'Tableau de bord'  },
    { id: 'registre',       label: 'Registre'          },
    { id: 'amortissements', label: 'Amortissements'    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Immobilisations</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Gestion du registre des immobilisations et des amortissements — exercice {year}
        </p>
      </div>

      {/* Sub-tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'dashboard'      && <DashboardTab      year={year} />}
      {tab === 'registre'       && <RegistreTab       year={year} />}
      {tab === 'amortissements' && <AmortissementsTab year={year} />}
    </div>
  )
}
