import { useState } from 'react'
import {
  useLeaves, useLeaveStats, useLeaveBalance,
  useCreateLeave, useReviewLeave, useCancelLeave,
} from '@/hooks/useHr'
import { useEmployees } from '@/hooks/useHr'
import type { LeaveStatus, LeaveType, CreateLeaveDto } from '@/services/hrApi'

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

interface CreateModalProps { onClose: () => void; employeeId?: string }
function CreateModal({ onClose, employeeId }: CreateModalProps) {
  const employees = useEmployees(true)
  const create = useCreateLeave()
  const [form, setForm] = useState<CreateLeaveDto>({
    employeeId: employeeId ?? '',
    type: 'CP',
    startDate: '',
    endDate: '',
    reason: '',
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await create.mutateAsync(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Nouvelle demande de congé</h2>
        <form onSubmit={submit} className="space-y-4">
          {!employeeId && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Employé</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.employeeId}
                onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                required
              >
                <option value="">Sélectionner…</option>
                {employees.data?.items.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}
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
              value={form.reason ?? ''}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={create.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              {create.isPending ? 'Envoi…' : 'Soumettre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface BalancePanelProps { empId: string; name: string }
function BalancePanel({ empId, name }: BalancePanelProps) {
  const { data } = useLeaveBalance(empId)
  if (!data) return null
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500 mb-2">{name}</p>
      <div className="flex gap-6">
        <div>
          <span className="text-2xl font-bold text-blue-600">{data.balance.cp.balance}</span>
          <span className="ml-1 text-xs text-gray-500">j CP</span>
        </div>
        <div>
          <span className="text-2xl font-bold text-purple-600">{data.balance.rtt.balance}</span>
          <span className="ml-1 text-xs text-gray-500">j RTT</span>
        </div>
      </div>
      {data.pendingRequests > 0 && (
        <p className="mt-2 text-xs text-yellow-600">{data.pendingRequests} demande(s) en attente</p>
      )}
    </div>
  )
}

export function LeavesPage() {
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'ALL'>('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [balanceEmpId, setBalanceEmpId] = useState('')

  const employees = useEmployees(true)
  const stats  = useLeaveStats()
  const leaves = useLeaves(statusFilter !== 'ALL' ? { status: statusFilter } : undefined)
  const reviewLeave = useReviewLeave()
  const cancelLeave = useCancelLeave()

  const statuses: (LeaveStatus | 'ALL')[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">En attente</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.data?.pending ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Approuvés ce mois</p>
          <p className="text-3xl font-bold text-green-600">{stats.data?.approvedThisMonth ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Jours ouvrés</p>
          <p className="text-3xl font-bold text-blue-600">{stats.data?.totalBusinessDays ?? '—'}</p>
        </div>
      </div>

      {/* Balance checker */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-3">
          <p className="text-sm font-medium text-gray-700">Vérifier le solde d'un employé</p>
          <select
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            value={balanceEmpId}
            onChange={e => setBalanceEmpId(e.target.value)}
          >
            <option value="">Sélectionner…</option>
            {employees.data?.items.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
            ))}
          </select>
        </div>
        {balanceEmpId && (() => {
          const emp = employees.data?.items.find(e => e.id === balanceEmpId)
          return emp ? <BalancePanel empId={balanceEmpId} name={`${emp.firstName} ${emp.lastName}`} /> : null
        })()}
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
        {leaves.isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : leaves.data?.length === 0 ? (
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
              {leaves.data?.map(leave => (
                <tr key={leave.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {leave.employee
                      ? `${leave.employee.firstName} ${leave.employee.lastName}`
                      : leave.employeeId.slice(0, 8)}
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
                            onClick={() => reviewLeave.mutate({ id: leave.id, dto: { status: 'APPROVED' } })}
                            className="rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50">
                            Approuver
                          </button>
                          <button
                            onClick={() => reviewLeave.mutate({ id: leave.id, dto: { status: 'REJECTED' } })}
                            className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
                            Refuser
                          </button>
                        </>
                      )}
                      {(leave.status === 'PENDING' || leave.status === 'APPROVED') && (
                        <button
                          onClick={() => cancelLeave.mutate(leave.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100">
                          Annuler
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
