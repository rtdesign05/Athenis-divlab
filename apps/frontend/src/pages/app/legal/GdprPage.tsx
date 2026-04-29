import { useState } from 'react'
import {
  useGdprStats, useGdprEntries, useCreateGdprEntry, useUpdateGdprEntry, useDeleteGdprEntry,
} from '@/hooks/useLegal'
import type { GdprEntry, GdprLegalBasis, GdprRiskLevel } from '@/services/legalApi'

const BASIS_LABEL: Record<GdprLegalBasis, string> = {
  CONSENT:              'Consentement',
  CONTRACT:             'Exécution contrat',
  LEGAL_OBLIGATION:     'Obligation légale',
  VITAL_INTEREST:       'Intérêt vital',
  PUBLIC_TASK:          'Mission d\'intérêt public',
  LEGITIMATE_INTEREST:  'Intérêt légitime',
}

const RISK_BADGE: Record<GdprRiskLevel, string> = {
  LOW:    'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH:   'bg-red-100 text-red-700',
}

const RISK_LABEL: Record<GdprRiskLevel, string> = {
  LOW: 'Faible', MEDIUM: 'Moyen', HIGH: 'Élevé',
}

const COMMON_CATEGORIES = ['Données d\'identification', 'Données de contact', 'Données financières', 'Données de santé', 'Données RH', 'Données de navigation', 'Données biométriques']
const COMMON_SUBJECTS = ['Clients', 'Employés', 'Prospects', 'Fournisseurs', 'Visiteurs web', 'Partenaires']
const COMMON_SECURITY = ['Chiffrement', 'Authentification 2FA', 'Contrôle d\'accès', 'Journalisation', 'Pseudonymisation', 'Sauvegarde sécurisée']

function TagInput({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')

  const add = (val: string) => {
    const v = val.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setInput('')
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1 mb-1">
        {values.map(v => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
            {v}
            <button type="button" onClick={() => onChange(values.filter(x => x !== v))} className="hover:text-red-500">✕</button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add(input))}
          placeholder="Taper et Entrée…" />
      </div>
    </div>
  )
}

interface EntryFormData {
  treatmentName:   string
  purpose:         string
  legalBasis:      GdprLegalBasis
  dataCategories:  string[]
  dataSubjects:    string[]
  retentionMonths: number
  responsible:     string
  subcontractors:  string[]
  securityMeasures: string[]
  riskLevel:       GdprRiskLevel
  dpiaRequired:    boolean
  notes:           string
}

function EntryModal({ entry, onClose }: { entry?: GdprEntry; onClose: () => void }) {
  const create = useCreateGdprEntry()
  const update = useUpdateGdprEntry()

  const [form, setForm] = useState<EntryFormData>({
    treatmentName:   entry?.treatmentName   ?? '',
    purpose:         entry?.purpose         ?? '',
    legalBasis:      entry?.legalBasis      ?? 'CONTRACT',
    dataCategories:  entry?.dataCategories  ?? [],
    dataSubjects:    entry?.dataSubjects    ?? [],
    retentionMonths: entry?.retentionMonths ?? 24,
    responsible:     entry?.responsible     ?? '',
    subcontractors:  entry?.subcontractors  ?? [],
    securityMeasures: entry?.securityMeasures ?? [],
    riskLevel:       entry?.riskLevel       ?? 'LOW',
    dpiaRequired:    entry?.dpiaRequired    ?? false,
    notes:           entry?.notes           ?? '',
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (entry) {
      await update.mutateAsync({ id: entry.id, dto: form })
    } else {
      await create.mutateAsync(form)
    }
    onClose()
  }

  const isPending = create.isPending || update.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {entry ? 'Modifier le traitement' : 'Nouveau traitement RGPD'}
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Nom du traitement</label>
              <input required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.treatmentName}
                onChange={e => setForm(f => ({ ...f, treatmentName: e.target.value }))}
                placeholder="Ex : Gestion de la paie" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Finalité</label>
              <textarea rows={2} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.purpose}
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                placeholder="Décrire l'objectif du traitement…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Base légale</label>
              <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.legalBasis}
                onChange={e => setForm(f => ({ ...f, legalBasis: e.target.value as GdprLegalBasis }))}>
                {(Object.entries(BASIS_LABEL) as [GdprLegalBasis, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Responsable</label>
              <input required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.responsible}
                onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))}
                placeholder="Service ou personne" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Durée de conservation (mois)</label>
              <input type="number" min={1} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.retentionMonths}
                onChange={e => setForm(f => ({ ...f, retentionMonths: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Niveau de risque</label>
              <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.riskLevel}
                onChange={e => setForm(f => ({ ...f, riskLevel: e.target.value as GdprRiskLevel }))}>
                {(Object.entries(RISK_LABEL) as [GdprRiskLevel, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <TagInput label="Catégories de données" values={form.dataCategories}
            onChange={v => setForm(f => ({ ...f, dataCategories: v }))} />
          <div className="flex flex-wrap gap-1">
            {COMMON_CATEGORIES.filter(c => !form.dataCategories.includes(c)).map(c => (
              <button key={c} type="button"
                onClick={() => setForm(f => ({ ...f, dataCategories: [...f.dataCategories, c] }))}
                className="rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600">
                + {c}
              </button>
            ))}
          </div>

          <TagInput label="Personnes concernées" values={form.dataSubjects}
            onChange={v => setForm(f => ({ ...f, dataSubjects: v }))} />
          <div className="flex flex-wrap gap-1">
            {COMMON_SUBJECTS.filter(c => !form.dataSubjects.includes(c)).map(c => (
              <button key={c} type="button"
                onClick={() => setForm(f => ({ ...f, dataSubjects: [...f.dataSubjects, c] }))}
                className="rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600">
                + {c}
              </button>
            ))}
          </div>

          <TagInput label="Mesures de sécurité" values={form.securityMeasures}
            onChange={v => setForm(f => ({ ...f, securityMeasures: v }))} />
          <div className="flex flex-wrap gap-1">
            {COMMON_SECURITY.filter(c => !form.securityMeasures.includes(c)).map(c => (
              <button key={c} type="button"
                onClick={() => setForm(f => ({ ...f, securityMeasures: [...f.securityMeasures, c] }))}
                className="rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600">
                + {c}
              </button>
            ))}
          </div>

          <TagInput label="Sous-traitants" values={form.subcontractors}
            onChange={v => setForm(f => ({ ...f, subcontractors: v }))} />

          <div className="flex items-center gap-2">
            <input type="checkbox" id="dpia" className="accent-blue-600"
              checked={form.dpiaRequired}
              onChange={e => setForm(f => ({ ...f, dpiaRequired: e.target.checked }))} />
            <label htmlFor="dpia" className="text-sm text-gray-700">AIPD requise (Analyse d'Impact)</label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Sauvegarde…' : entry ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function GdprPage() {
  const stats   = useGdprStats()
  const entries = useGdprEntries()
  const remove  = useDeleteGdprEntry()
  const [editing, setEditing] = useState<GdprEntry | 'new' | null>(null)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registre RGPD</h1>
          <p className="text-sm text-gray-500">Registre des activités de traitement (Art. 30 RGPD)</p>
        </div>
        <button onClick={() => setEditing('new')}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Nouveau traitement
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Traitements</p>
          <p className="text-3xl font-bold text-gray-900">{stats.data?.total ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Risque élevé</p>
          <p className="text-3xl font-bold text-red-600">{stats.data?.highRisk ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">AIPD requises</p>
          <p className="text-3xl font-bold text-orange-600">{stats.data?.dpiaRequired ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Bases légales</p>
          <p className="text-3xl font-bold text-blue-600">{stats.data ? Object.keys(stats.data.byBasis).length : '—'}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        {entries.isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : entries.data?.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucun traitement enregistré</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Traitement</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Base légale</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Personnes</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Conservation</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Risque</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">AIPD</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.data?.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{entry.treatmentName}</p>
                    <p className="text-xs text-gray-400">{entry.responsible}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{BASIS_LABEL[entry.legalBasis]}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {entry.dataSubjects.map(s => (
                        <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">{entry.retentionMonths} mois</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RISK_BADGE[entry.riskLevel]}`}>
                      {RISK_LABEL[entry.riskLevel]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {entry.dpiaRequired
                      ? <span className="text-xs font-medium text-orange-600">Oui</span>
                      : <span className="text-xs text-gray-400">Non</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(entry)}
                        className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
                        Modifier
                      </button>
                      <button onClick={() => { if (confirm('Supprimer ce traitement ?')) remove.mutate(entry.id) }}
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                        Suppr.
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <EntryModal
          {...(editing !== 'new' ? { entry: editing } : {})}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
