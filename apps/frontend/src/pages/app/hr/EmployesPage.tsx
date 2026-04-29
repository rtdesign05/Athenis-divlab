import { useState } from 'react'
import { useEmployees, useCreateEmployee } from '@/hooks/useHr'
import { useCurrency } from '@/hooks/useCurrency'
import type { Employee, EmploymentType } from '@/services/hrApi'

const TYPE_LABEL: Record<EmploymentType, string> = {
  FULL_TIME: 'Temps plein',
  PART_TIME:  'Temps partiel',
  CONTRACT:   'CDD',
  INTERN:     'Stage',
}

const TYPE_COLOR: Record<EmploymentType, string> = {
  FULL_TIME: 'bg-green-100 text-green-700',
  PART_TIME:  'bg-blue-100 text-blue-700',
  CONTRACT:   'bg-amber-100 text-amber-700',
  INTERN:     'bg-purple-100 text-purple-700',
}

export function EmployesPage() {
  const { fmt } = useCurrency()
  const employees = useEmployees()
  const createEmployee = useCreateEmployee()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    employmentType: 'FULL_TIME' as EmploymentType,
    grossSalary: '',
    startDate: '',
  })

  const list: Employee[] = employees.data?.items ?? []
  const filtered = list.filter(
    (e) =>
      !search ||
      `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleCreate() {
    await createEmployee.mutateAsync({
      firstName: form.firstName,
      lastName:  form.lastName,
      email:     form.email || undefined,
      employmentType: form.employmentType,
      grossSalary: Number(form.grossSalary),
      startDate:   form.startDate,
    })
    setCreating(false)
    setForm({ firstName: '', lastName: '', email: '', employmentType: 'FULL_TIME', grossSalary: '', startDate: '' })
  }

  if (employees.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-40 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Employés</h1>
          <p className="mt-1 text-sm text-gray-500">
            {list.filter((e) => !e.endDate).length} actifs sur {list.length}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors"
        >
          + Nouvel employé
        </button>
      </div>

      <input
        type="search"
        placeholder="Rechercher un employé…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input w-full max-w-sm"
      />

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
              <th className="px-5 py-3">Nom</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Entrée</th>
              <th className="px-5 py-3 text-right">Salaire brut</th>
              <th className="px-5 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                  {search ? 'Aucun résultat' : 'Aucun employé'}
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-forest-100 flex items-center justify-center text-xs font-bold text-forest-700">
                        {e.firstName[0]}{e.lastName[0]}
                      </div>
                      <span className="font-medium text-gray-900">{e.firstName} {e.lastName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{e.email}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLOR[e.employmentType]}`}>
                      {TYPE_LABEL[e.employmentType]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {new Date(e.startDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {fmt(Number(e.grossSalary))}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${e.endDate ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                      {e.endDate ? 'Inactif' : 'Actif'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nouvel employé</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Prénom *</label><input className="input mt-1" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} /></div>
              <div><label className="label">Nom *</label><input className="input mt-1" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} /></div>
              <div className="col-span-2"><label className="label">Email</label><input type="email" className="input mt-1" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
              <div>
                <label className="label">Type de contrat *</label>
                <select className="input mt-1" value={form.employmentType} onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value as EmploymentType }))}>
                  {(Object.keys(TYPE_LABEL) as EmploymentType[]).map((t) => (
                    <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </div>
              <div><label className="label">Salaire brut mensuel *</label><input type="number" className="input mt-1" placeholder="3000" value={form.grossSalary} onChange={(e) => setForm((f) => ({ ...f, grossSalary: e.target.value }))} /></div>
              <div className="col-span-2"><label className="label">Date d'entrée *</label><input type="date" className="input mt-1" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
            </div>
            <div className="mt-5 flex gap-3 justify-end">
              <button onClick={() => setCreating(false)} className="btn-secondary">Annuler</button>
              <button
                onClick={() => void handleCreate()}
                disabled={createEmployee.isPending || !form.firstName || !form.lastName || !form.grossSalary || !form.startDate}
                className="btn-primary"
              >
                {createEmployee.isPending ? 'Création…' : 'Créer'}
              </button>
            </div>
            {createEmployee.isError && (
              <p className="mt-2 text-sm text-red-600">Erreur lors de la création</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
