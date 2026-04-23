import React, { useState, useCallback } from 'react'
import {
  useInvoices,
  useCreateInvoice,
  useUpdateInvoiceStatus,
  useDeleteInvoice,
  useRecurringInvoices,
  useCreateRecurring,
  useUpdateRecurring,
  useDeleteRecurring,
  useGenerateFromRecurring,
} from '@/hooks/useBilling'
import { useClients } from '@/hooks/useClients'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { SkeletonTable } from '@/shared/components/feedback/Skeleton'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Modal } from '@/shared/components/ui/Modal'
import { formatCurrency } from '@/shared/utils/currency'
import { formatDate } from '@/shared/utils/date'
import type {
  InvoiceStatus,
  Invoice,
  CreateInvoiceDto,
  RecurringInvoice,
  CreateRecurringDto,
  RecurringFrequency,
} from '@/services/billingApi'

const STATUS_TABS: { key: InvoiceStatus | 'ALL'; label: string }[] = [
  { key: 'ALL',     label: 'Toutes' },
  { key: 'DRAFT',   label: 'Brouillons' },
  { key: 'SENT',    label: 'Envoyées' },
  { key: 'PAID',    label: 'Payées' },
  { key: 'OVERDUE', label: 'En retard' },
]

const MAIN_TABS = ['Factures', 'Récurrentes'] as const
type MainTab = (typeof MAIN_TABS)[number]

const STATUS_BADGE: Record<InvoiceStatus, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  PAID: 'success', SENT: 'info', DRAFT: 'neutral', OVERDUE: 'danger', CANCELLED: 'neutral',
}
const STATUS_LABEL: Record<InvoiceStatus, string> = {
  PAID: 'Payée', SENT: 'Envoyée', DRAFT: 'Brouillon', OVERDUE: 'En retard', CANCELLED: 'Annulée',
}
const FREQ_LABEL: Record<RecurringFrequency, string> = {
  MONTHLY: 'Mensuelle', QUARTERLY: 'Trimestrielle', ANNUAL: 'Annuelle',
}

// ── Invoice row ───────────────────────────────────────────────────────────────

interface RowProps {
  invoice: Invoice
  onStatus: (id: string, s: InvoiceStatus) => void
  onDelete: (id: string) => void
}

const InvoiceRow = React.memo(function InvoiceRow({ invoice, onStatus, onDelete }: RowProps) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-forest-700">
        <span>{invoice.number}</span>
        {invoice.recurringInvoiceId && (
          <span className="ml-1.5 text-xs text-indigo-500 font-normal">↺ récur.</span>
        )}
        {invoice.quoteId && (
          <span className="ml-1.5 text-xs text-amber-500 font-normal">↳ devis</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{invoice.client?.name ?? <span className="text-gray-400">—</span>}</td>
      <td className="px-4 py-3">
        <Badge variant={STATUS_BADGE[invoice.status]}>{STATUS_LABEL[invoice.status]}</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(invoice.total)}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(invoice.dueDate)}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2 justify-end">
          {invoice.status === 'DRAFT' && (
            <button onClick={() => onStatus(invoice.id, 'SENT')} className="text-xs text-forest-700 hover:text-forest-900 font-medium">Envoyer</button>
          )}
          {invoice.status === 'SENT' && (
            <button onClick={() => onStatus(invoice.id, 'PAID')} className="text-xs text-green-600 hover:text-green-800 font-medium">Marquer payée</button>
          )}
          {invoice.status === 'DRAFT' && (
            <button onClick={() => onDelete(invoice.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Supprimer</button>
          )}
        </div>
      </td>
    </tr>
  )
})

// ── Recurring row ─────────────────────────────────────────────────────────────

interface RecurringRowProps {
  rec: RecurringInvoice
  onToggle: (id: string, active: boolean) => void
  onGenerate: (id: string) => void
  onDelete: (id: string) => void
}

const RecurringRow = React.memo(function RecurringRow({ rec, onToggle, onGenerate, onDelete }: RecurringRowProps) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-700">{rec.client?.name ?? '—'}</td>
      <td className="px-4 py-3">
        <Badge variant="info">{FREQ_LABEL[rec.frequency]}</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(rec.subtotal)}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(rec.nextDueDate)}</td>
      <td className="px-4 py-3">
        <Badge variant={rec.active ? 'success' : 'neutral'}>{rec.active ? 'Active' : 'Inactive'}</Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2 justify-end flex-wrap">
          <button onClick={() => onGenerate(rec.id)} className="text-xs text-forest-700 hover:text-forest-900 font-medium">Générer</button>
          <button onClick={() => onToggle(rec.id, !rec.active)} className="text-xs text-gray-500 hover:text-gray-700 font-medium">
            {rec.active ? 'Pause' : 'Reprendre'}
          </button>
          <button onClick={() => onDelete(rec.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Suppr.</button>
        </div>
      </td>
    </tr>
  )
})

// ── Modals ────────────────────────────────────────────────────────────────────

function CreateInvoiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: clients } = useClients()
  const create = useCreateInvoice()
  const [form, setForm] = useState<CreateInvoiceDto>({
    subtotal: 0, taxRate: 20,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate:   new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
  })

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    await create.mutateAsync(form)
    onClose()
  }, [create, form, onClose])

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle facture" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Client</label>
          <select className="input mt-1" value={form.clientId ?? ''} onChange={e => setForm(f => ({ ...f, clientId: e.target.value || undefined }))}>
            <option value="">— Sans client —</option>
            {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Montant HT (€) *</label>
            <input type="number" step="0.01" min="0" required className="input mt-1"
              value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className="label">TVA (%)</label>
            <input type="number" step="0.1" min="0" max="100" className="input mt-1"
              value={form.taxRate ?? 20} onChange={e => setForm(f => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date d'émission *</label>
            <input type="date" required className="input mt-1" value={form.issueDate}
              onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">Date d'échéance *</label>
            <input type="date" required className="input mt-1" value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea rows={2} className="input mt-1" value={form.notes ?? ''}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value || undefined }))} />
        </div>
        {create.isError && <p className="text-sm text-red-600">Erreur lors de la création.</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={create.isPending}>Créer</Button>
        </div>
      </form>
    </Modal>
  )
}

function CreateRecurringModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: clients } = useClients()
  const create = useCreateRecurring()
  const [form, setForm] = useState<CreateRecurringDto>({
    clientId: '', frequency: 'MONTHLY', subtotal: 0, taxRate: 20,
    nextDueDate: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
  })

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    await create.mutateAsync(form)
    onClose()
  }, [create, form, onClose])

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle facture récurrente" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Client *</label>
          <select required className="input mt-1" value={form.clientId}
            onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
            <option value="">— Choisir un client —</option>
            {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Fréquence</label>
            <select className="input mt-1" value={form.frequency}
              onChange={e => setForm(f => ({ ...f, frequency: e.target.value as RecurringFrequency }))}>
              <option value="MONTHLY">Mensuelle</option>
              <option value="QUARTERLY">Trimestrielle</option>
              <option value="ANNUAL">Annuelle</option>
            </select>
          </div>
          <div>
            <label className="label">Prochaine échéance *</label>
            <input type="date" required className="input mt-1" value={form.nextDueDate}
              onChange={e => setForm(f => ({ ...f, nextDueDate: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Montant HT (€) *</label>
            <input type="number" step="0.01" min="0" required className="input mt-1"
              value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className="label">TVA (%)</label>
            <input type="number" step="0.1" min="0" max="100" className="input mt-1"
              value={form.taxRate ?? 20} onChange={e => setForm(f => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))} />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea rows={2} className="input mt-1" value={form.notes ?? ''}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value || undefined }))} />
        </div>
        {create.isError && <p className="text-sm text-red-600">Erreur lors de la création.</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={create.isPending}>Créer</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Recurring tab ─────────────────────────────────────────────────────────────

function RecurringTab() {
  const [createOpen, setCreateOpen] = useState(false)
  const { data, isLoading } = useRecurringInvoices()
  const toggle   = useUpdateRecurring()
  const remove   = useDeleteRecurring()
  const generate = useGenerateFromRecurring()

  const handleToggle   = useCallback((id: string, active: boolean) => toggle.mutate({ id, dto: { active } }), [toggle])
  const handleGenerate = useCallback((id: string) => generate.mutate(id), [generate])
  const handleDelete   = useCallback((id: string) => { if (confirm('Supprimer ce modèle récurrent ?')) remove.mutate(id) }, [remove])

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>+ Nouveau modèle récurrent</Button>
      </div>
      <div className="card overflow-hidden p-0">
        {isLoading ? <SkeletonTable rows={4} /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Client', 'Fréquence', 'Montant HT', 'Prochaine éch.', 'Statut', ''].map((h, i) => (
                    <th key={i} className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide ${i === 2 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.length ? data.map(rec => (
                  <RecurringRow key={rec.id} rec={rec} onToggle={handleToggle} onGenerate={handleGenerate} onDelete={handleDelete} />
                )) : (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">Aucune facture récurrente</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <CreateRecurringModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function BillingPage() {
  const [mainTab, setMainTab]   = useState<MainTab>('Factures')
  const [statusTab, setStatusTab] = useState<InvoiceStatus | 'ALL'>('ALL')
  const [modalOpen, setModalOpen] = useState(false)

  const { data, isLoading } = useInvoices(statusTab !== 'ALL' ? { status: statusTab } : undefined)
  const updateStatus = useUpdateInvoiceStatus()
  const deleteInv    = useDeleteInvoice()

  const handleStatus = useCallback((id: string, status: InvoiceStatus) => updateStatus.mutate({ id, status }), [updateStatus])
  const handleDelete = useCallback((id: string) => { if (confirm('Supprimer cette facture ?')) deleteInv.mutate(id) }, [deleteInv])

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Facturation</h2>
            <p className="mt-1 text-sm text-gray-500">Factures et modèles récurrents</p>
          </div>
          {mainTab === 'Factures' && (
            <Button onClick={() => setModalOpen(true)}>+ Nouvelle facture</Button>
          )}
        </div>

        {/* Main tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {MAIN_TABS.map(t => (
            <button key={t} onClick={() => setMainTab(t)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                mainTab === t ? 'border-forest-700 text-forest-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {mainTab === 'Récurrentes' ? (
          <RecurringTab />
        ) : (
          <>
            {/* Summary */}
            {data && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="card py-3">
                  <p className="text-xs text-gray-500">Total sélection</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(data.totalAmount)}</p>
                </div>
                <div className="card py-3">
                  <p className="text-xs text-gray-500">Encaissé</p>
                  <p className="mt-1 text-xl font-bold text-green-600">{formatCurrency(data.paidAmount)}</p>
                </div>
                <div className="card py-3">
                  <p className="text-xs text-gray-500">Factures</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{data.total}</p>
                </div>
                <div className="card py-3">
                  <p className="text-xs text-gray-500">Page</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{data.page} / {data.totalPages || 1}</p>
                </div>
              </div>
            )}

            {/* Status tabs */}
            <div className="flex gap-1 border-b border-gray-100">
              {STATUS_TABS.map(t => (
                <button key={t.key} onClick={() => setStatusTab(t.key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    statusTab === t.key ? 'border-forest-700 text-forest-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="card overflow-hidden p-0">
              {isLoading ? <SkeletonTable rows={6} /> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['N°', 'Client', 'Statut', 'Total TTC', 'Échéance', ''].map((h, i) => (
                          <th key={i} className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data?.items.length ? data.items.map(inv => (
                        <InvoiceRow key={inv.id} invoice={inv} onStatus={handleStatus} onDelete={handleDelete} />
                      )) : (
                        <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">Aucune facture</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <CreateInvoiceModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </ErrorBoundary>
  )
}
