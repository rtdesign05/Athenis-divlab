import { useState } from 'react'
import { useHR, type HRLeave } from '@/contexts/HRContext'

type LeaveStatus = HRLeave['status']
type LeaveType   = HRLeave['type']

const TYPE_LABEL: Record<LeaveType, string> = {
  CP: 'Congés payés', RTT: 'RTT', SICK: 'Maladie',
  MATERNITY: 'Maternité', UNPAID: 'Sans solde',
}

const STATUS_BADGE: Record<LeaveStatus, string> = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  APPROVED:  'bg-green-100 text-green-800',
  REJECTED:  'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

const STATUS_LABEL: Record<LeaveStatus, string> = {
  PENDING: 'En attente', APPROVED: 'Approuvé',
  REJECTED: 'Refusé', CANCELLED: 'Annulé',
}

interface CreateModalProps { onClose: () => void }
function CreateModal({ onClose }: CreateModalProps) {
  const { employees, addLeave } = useHR()
  const [form, setForm] = useState<{
    employeeId: string; type: LeaveType; startDate: string; endDate: string; reason: string
  }>({ employeeId: '', type: 'CP', startDate: '', endDate: '', reason: '' })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const start = new Date(form.startDate)
    const end   = new Date(form.endDate)
    const days  = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    addLeave({
      employeeId: form.employeeId,
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      days,
      status: 'PENDING',
      ...(form.reason ? { reason: form.reason } : {}),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Nouvelle demande de congé</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Employé</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.employeeId}
              onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
              required
            >
              <option value="">Sélectionner…</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as LeaveType }))}
            >
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Début</label>
              <input type="date" required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fin</label>
              <input type="date" required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Motif (optionnel)</label>
            <textarea rows={2}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={!form.employeeId || !form.startDate || !form.endDate}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              Soumettre
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function LeavesPage() {
  const { leaves, employees, updateLeave } = useHR()
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'ALL'>('ALL')
  const [showCreate, setShowCreate] = useState(false)

  const statuses: (LeaveStatus | 'ALL')[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']

  const filtered = statusFilter === 'ALL' ? leaves : leaves.filter(l => l.status === statusFilter)

  // Stats
  const pending = leaves.filter(l => l.status === 'PENDING').length
  const now = new Date()
  const approvedThisMonth = leaves
    .filter(l => l.status === 'APPROVED')
    .filter(l => {
      const start = new Date(l.startDate)
      return start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth()
    }).length
  const totalDays = leaves.filter(l => l.status === 'APPROVED').reduce((s, l) => s + l.days, 0)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Congés & absences</h1>
          <p className="text-sm text-gray-500">Demandes, soldes et validation</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Nouvelle demande
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">En attente</p>
          <p className="text-3xl font-bold text-yellow-600">{pending}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Approuvés ce mois</p>
          <p className="text-3xl font-bold text-green-600">{approvedThisMonth}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Jours approuvés (total)</p>
          <p className="text-3xl font-bold text-blue-600">{totalDays}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {statuses.map(s => (
          <button key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {s === 'ALL' ? 'Toutes' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucune demande</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Employé</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Période</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Jours</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(leave => {
                const emp = employees.find(e => e.id === leave.employeeId)
                return (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {emp ? `${emp.firstName} ${emp.lastName}` : leave.employeeId}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{TYPE_LABEL[leave.type]}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(leave.startDate).toLocaleDateString('fr-FR')} →{' '}
                      {new Date(leave.endDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{leave.days}j</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[leave.status]}`}>
                        {STATUS_LABEL[leave.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {leave.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => updateLeave(leave.id, { status: 'APPROVED' })}
                              className="rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50">
                              Approuver
                            </button>
                            <button
                              onClick={() => updateLeave(leave.id, { status: 'REJECTED' })}
                              className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
                              Refuser
                            </button>
                          </>
                        )}
                        {(leave.status === 'PENDING' || leave.status === 'APPROVED') && (
                          <button
                            onClick={() => updateLeave(leave.id, { status: 'CANCELLED' })}
                            className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100">
                            Annuler
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
