import { useState } from 'react'
import {
  useEsgActions, useActionStats, useCreateAction, useUpdateAction, useDeleteAction,
} from '@/hooks/useEsg'
import type { EsgAction, EsgActionStatus, EsgActionPriority, EsgPilier } from '@/services/esgApi'

const STATUS_LABEL: Record<EsgActionStatus, string>   = { TODO: 'À faire', IN_PROGRESS: 'En cours', DONE: 'Terminé', CANCELLED: 'Annulé' }
const STATUS_BADGE: Record<EsgActionStatus, string>   = { TODO: 'bg-gray-100 text-gray-600', IN_PROGRESS: 'bg-blue-100 text-blue-700', DONE: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-600' }
const PRIO_BADGE:  Record<EsgActionPriority, string>  = { LOW: 'bg-gray-100 text-gray-500', MEDIUM: 'bg-yellow-100 text-yellow-700', HIGH: 'bg-orange-100 text-orange-700', CRITICAL: 'bg-red-100 text-red-700' }
const PRIO_LABEL:  Record<EsgActionPriority, string>  = { LOW: 'Faible', MEDIUM: 'Moyen', HIGH: 'Élevé', CRITICAL: 'Critique' }
const PILIER_BADGE: Record<EsgPilier, string>         = { E: 'bg-green-100 text-green-700', S: 'bg-blue-100 text-blue-700', G: 'bg-purple-100 text-purple-700' }
const PILIER_LABEL: Record<EsgPilier, string>         = { E: 'Environnement', S: 'Social', G: 'Gouvernance' }

type CreateForm = {
  title: string; description: string; pilier: EsgPilier
  priority: EsgActionPriority; targetYear: number; deadline: string
  owner: string; kpiTarget: string; co2Saving: string
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const create = useCreateAction()
  const [form, setForm] = useState<CreateForm>({
    title: '', description: '', pilier: 'E', priority: 'MEDIUM',
    targetYear: new Date().getFullYear(), deadline: '', owner: '', kpiTarget: '', co2Saving: '',
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await create.mutateAsync({
      title:       form.title,
      description: form.description || null,
      pilier:      form.pilier,
      priority:    form.priority,
      status:      'TODO',
      targetYear:  form.targetYear,
      deadline:    form.deadline || null,
      owner:       form.owner || null,
      kpiTarget:   form.kpiTarget || null,
      ...(form.co2Saving ? { co2Saving: Number(form.co2Saving) } : {}),
    })
    onClose()
  }

  const f = (field: keyof CreateForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(x => ({ ...x, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Nouvelle action ESG</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Titre</label>
            <input required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.title} onChange={f('title')} placeholder="Ex : Installer panneaux solaires" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Pilier</label>
              <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.pilier} onChange={f('pilier')}>
                {(['E', 'S', 'G'] as EsgPilier[]).map(p => <option key={p} value={p}>{PILIER_LABEL[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Priorité</label>
              <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.priority} onChange={f('priority')}>
                {(['LOW','MEDIUM','HIGH','CRITICAL'] as EsgActionPriority[]).map(p => <option key={p} value={p}>{PRIO_LABEL[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Année cible</label>
              <input type="number" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.targetYear} onChange={f('targetYear')} min={2024} max={2035} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.description} onChange={f('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Responsable</label>
              <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.owner} onChange={f('owner')} placeholder="Nom / service" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Échéance</label>
              <input type="date" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.deadline} onChange={f('deadline')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">KPI cible</label>
              <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.kpiTarget} onChange={f('kpiTarget')} placeholder="Ex : -20% CO₂" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">CO₂ évité (tCO2e)</label>
              <input type="number" min={0} step="0.1" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.co2Saving} onChange={f('co2Saving')} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={create.isPending}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50">
              {create.isPending ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ActionRow({ action }: { action: EsgAction }) {
  const update = useUpdateAction()
  const remove = useDeleteAction()
  const [kpiCurrent, setKpiCurrent] = useState(action.kpiCurrent ?? '')
  const [editing, setEditing] = useState(false)

  const nextStatus: Record<EsgActionStatus, EsgActionStatus | null> = {
    TODO: 'IN_PROGRESS', IN_PROGRESS: 'DONE', DONE: null, CANCELLED: null,
  }

  const isOverdue = action.deadline && new Date(action.deadline) < new Date() && action.status !== 'DONE'

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900">{action.title}</p>
        {action.description && <p className="text-xs text-gray-400">{action.description}</p>}
        {action.owner && <p className="text-xs text-gray-400">👤 {action.owner}</p>}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PILIER_BADGE[action.pilier]}`}>
          {action.pilier}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIO_BADGE[action.priority]}`}>
          {PRIO_LABEL[action.priority]}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[action.status]}`}>
          {STATUS_LABEL[action.status]}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        {action.deadline ? (
          <span className={`text-xs ${isOverdue ? 'font-medium text-red-600' : 'text-gray-500'}`}>
            {isOverdue ? '⚠ ' : ''}{new Date(action.deadline).toLocaleDateString('fr-FR')}
          </span>
        ) : <span className="text-xs text-gray-400">—</span>}
      </td>
      <td className="px-4 py-3">
        <div className="text-xs text-gray-600">
          {action.kpiTarget && <p>Cible : {action.kpiTarget}</p>}
          {editing ? (
            <div className="flex gap-1 mt-1">
              <input className="rounded border border-gray-300 px-1 py-0.5 text-xs w-24"
                value={kpiCurrent} onChange={e => setKpiCurrent(e.target.value)} placeholder="Actuel" />
              <button onClick={() => { update.mutate({ id: action.id, dto: { kpiCurrent } }); setEditing(false) }}
                className="text-xs text-blue-600 hover:text-blue-700">✓</button>
            </div>
          ) : (
            <p className="cursor-pointer hover:text-blue-600" onClick={() => setEditing(true)}>
              Actuel : {action.kpiCurrent ?? <span className="text-gray-400">—</span>}
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center text-xs text-green-700 font-medium">
        {action.co2Saving ? `${Number(action.co2Saving).toFixed(1)} t` : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-1">
          {nextStatus[action.status] && (
            <button
              onClick={() => update.mutate({ id: action.id, dto: { status: nextStatus[action.status]! } })}
              className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
              {action.status === 'TODO' ? 'Démarrer' : 'Terminer'}
            </button>
          )}
          {action.status !== 'CANCELLED' && action.status !== 'DONE' && (
            <button
              onClick={() => update.mutate({ id: action.id, dto: { status: 'CANCELLED' } })}
              className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">
              Annuler
            </button>
          )}
          <button onClick={() => { if (window.confirm('Supprimer cette action ?')) remove.mutate(action.id) }}
            className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50">
            Suppr.
          </button>
        </div>
      </td>
    </tr>
  )
}

export function ActionPlanPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [pilierFilter, setPilierFilter] = useState<EsgPilier | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<EsgActionStatus | 'ALL'>('ALL')

  const stats   = useActionStats()
  const actions = useEsgActions()

  const filtered = actions.data?.filter(a =>
    (pilierFilter === 'ALL' || a.pilier === pilierFilter) &&
    (statusFilter === 'ALL' || a.status === statusFilter)
  ) ?? []

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan d'action ESG</h1>
          <p className="text-sm text-gray-500">Initiatives, KPIs et suivi d'avancement</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          + Nouvelle action
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total',     value: stats.data?.total,       color: 'text-gray-900' },
          { label: 'À faire',   value: stats.data?.todo,        color: 'text-gray-600' },
          { label: 'En cours',  value: stats.data?.inProgress,  color: 'text-blue-600' },
          { label: 'Terminées', value: stats.data?.done,        color: 'text-green-600' },
          { label: 'CO₂ évité', value: stats.data ? `${stats.data.co2Saving.toFixed(1)} t` : '—', color: 'text-green-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {(['ALL', 'E', 'S', 'G'] as (EsgPilier | 'ALL')[]).map(p => (
            <button key={p}
              onClick={() => setPilierFilter(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                pilierFilter === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {p === 'ALL' ? 'Tous' : PILIER_LABEL[p]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {(['ALL', 'TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as (EsgActionStatus | 'ALL')[]).map(s => (
            <button key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {s === 'ALL' ? 'Tous' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        {actions.isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucune action</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Action</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Pilier</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Priorité</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Échéance</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">KPI</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">CO₂ évité</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(action => <ActionRow key={action.id} action={action} />)}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
