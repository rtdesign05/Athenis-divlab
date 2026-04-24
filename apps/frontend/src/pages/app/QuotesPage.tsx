import React, { useState, useCallback } from 'react'
import { useQuotes, useCreateQuote, useUpdateQuoteStatus, useConvertQuote, useDeleteQuote } from '@/hooks/useQuotes'
import { useClients } from '@/hooks/useClients'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { SkeletonTable } from '@/shared/components/feedback/Skeleton'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Modal } from '@/shared/components/ui/Modal'
import { useCurrency } from '@/hooks/useCurrency'
import { formatDate } from '@/shared/utils/date'
import type { QuoteStatus, Quote, CreateQuoteDto } from '@/services/billingApi'
import { PdfButton } from '@/shared/components/ui/PdfButton'
import { usePdf } from '@/shared/hooks/usePdf'

const STATUS_TABS: { key: QuoteStatus | 'ALL'; label: string }[] = [
  { key: 'ALL',      label: 'Tous' },
  { key: 'DRAFT',    label: 'Brouillons' },
  { key: 'SENT',     label: 'Envoyés' },
  { key: 'ACCEPTED', label: 'Acceptés' },
  { key: 'REJECTED', label: 'Refusés' },
  { key: 'CONVERTED',label: 'Convertis' },
]

const STATUS_BADGE: Record<QuoteStatus, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  ACCEPTED:  'success',
  SENT:      'info',
  DRAFT:     'neutral',
  REJECTED:  'danger',
  CONVERTED: 'warning',
}
const STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT:     'Brouillon',
  SENT:      'Envoyé',
  ACCEPTED:  'Accepté',
  REJECTED:  'Refusé',
  CONVERTED: 'Converti',
}

// ── Quote row ─────────────────────────────────────────────────────────────────

interface RowProps {
  quote: Quote
  onStatus:  (id: string, s: QuoteStatus) => void
  onConvert: (id: string) => void
  onDelete:  (id: string) => void
}

const QuoteRow = React.memo(function QuoteRow({ quote, onStatus, onConvert, onDelete }: RowProps) {
  const { fmt } = useCurrency()
  const { downloadDevis } = usePdf()
  const isExpired = quote.status === 'SENT' && new Date(quote.validUntil) < new Date()

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-forest-700">{quote.number}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{quote.client?.name ?? <span className="text-gray-400">—</span>}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Badge variant={STATUS_BADGE[quote.status]}>{STATUS_LABEL[quote.status]}</Badge>
          {isExpired && <Badge variant="danger">Expiré</Badge>}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{fmt(quote.total)}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(quote.validUntil)}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2 justify-end flex-wrap">
          <PdfButton onDownload={() => downloadDevis(quote)} label="PDF" className="text-xs text-gray-400 hover:text-forest-700 font-medium disabled:opacity-60" />
          {quote.status === 'DRAFT' && (
            <button onClick={() => onStatus(quote.id, 'SENT')} className="text-xs text-forest-700 hover:text-forest-900 font-medium">
              Envoyer
            </button>
          )}
          {quote.status === 'SENT' && (
            <>
              <button onClick={() => onStatus(quote.id, 'ACCEPTED')} className="text-xs text-green-600 hover:text-green-800 font-medium">
                Accepter
              </button>
              <button onClick={() => onStatus(quote.id, 'REJECTED')} className="text-xs text-red-500 hover:text-red-700 font-medium">
                Refuser
              </button>
            </>
          )}
          {quote.status === 'ACCEPTED' && (
            <button onClick={() => onConvert(quote.id)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              → Facture
            </button>
          )}
          {(quote.status === 'DRAFT' || quote.status === 'REJECTED') && (
            <button onClick={() => onDelete(quote.id)} className="text-xs text-gray-400 hover:text-red-600 font-medium">
              Suppr.
            </button>
          )}
        </div>
      </td>
    </tr>
  )
})

// ── Create modal ──────────────────────────────────────────────────────────────

function CreateQuoteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currencySymbol, defaultVatRate } = useCurrency()
  const { data: clients } = useClients()
  const create = useCreateQuote()
  const today  = new Date().toISOString().slice(0, 10)
  const in30   = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)

  const [form, setForm] = useState<CreateQuoteDto>({
    clientId: '', subtotal: 0, taxRate: defaultVatRate, issueDate: today, validUntil: in30,
  })

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    await create.mutateAsync(form)
    onClose()
  }, [create, form, onClose])

  return (
    <Modal open={open} onClose={onClose} title="Nouveau devis" size="lg">
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
            <label className="label">Montant HT ({currencySymbol}) *</label>
            <input type="number" step="0.01" min="0" required className="input mt-1"
              value={form.subtotal}
              onChange={e => setForm(f => ({ ...f, subtotal: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className="label">TVA (%)</label>
            <input type="number" step="0.1" min="0" max="100" className="input mt-1"
              value={form.taxRate ?? defaultVatRate}
              onChange={e => setForm(f => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date d'émission *</label>
            <input type="date" required className="input mt-1" value={form.issueDate}
              onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">Valide jusqu'au *</label>
            <input type="date" required className="input mt-1" value={form.validUntil}
              onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} />
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
          <Button type="submit" loading={create.isPending}>Créer le devis</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function QuotesPage() {
  const { fmt } = useCurrency()
  const [tab, setTab]         = useState<QuoteStatus | 'ALL'>('ALL')
  const [modalOpen, setModalOpen] = useState(false)

  const { data, isLoading } = useQuotes(tab !== 'ALL' ? { status: tab } : undefined)
  const updateStatus = useUpdateQuoteStatus()
  const convert      = useConvertQuote()
  const deleteQ      = useDeleteQuote()

  const handleStatus  = useCallback((id: string, status: QuoteStatus) => updateStatus.mutate({ id, status }), [updateStatus])
  const handleConvert = useCallback((id: string) => { if (confirm('Convertir ce devis en facture ?')) convert.mutate(id) }, [convert])
  const handleDelete  = useCallback((id: string) => { if (confirm('Supprimer ce devis ?')) deleteQ.mutate(id) }, [deleteQ])

  const totalAmount   = data?.items.reduce((s, q) => s + parseFloat(q.total), 0) ?? 0
  const acceptedCount = data?.items.filter(q => q.status === 'ACCEPTED').length ?? 0

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Devis</h2>
            <p className="mt-1 text-sm text-gray-500">Gérez vos devis et convertissez-les en factures</p>
          </div>
          <Button onClick={() => setModalOpen(true)}>+ Nouveau devis</Button>
        </div>

        {/* Summary */}
        {data && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="card py-3">
              <p className="text-xs text-gray-500">Total sélection</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{fmt(totalAmount)}</p>
            </div>
            <div className="card py-3">
              <p className="text-xs text-gray-500">Acceptés</p>
              <p className="mt-1 text-xl font-bold text-green-600">{acceptedCount}</p>
            </div>
            <div className="card py-3">
              <p className="text-xs text-gray-500">Total devis</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{data.total}</p>
            </div>
            <div className="card py-3">
              <p className="text-xs text-gray-500">Page</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{data.page} / {data.page || 1}</p>
            </div>
          </div>
        )}

        {/* Status tabs */}
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key ? 'border-forest-700 text-forest-700' : 'border-transparent text-gray-500 hover:text-gray-700'
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
                    {['N°', 'Client', 'Statut', 'Total TTC', 'Validité', ''].map((h, i) => (
                      <th key={i} className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.items.length ? data.items.map(q => (
                    <QuoteRow key={q.id} quote={q} onStatus={handleStatus} onConvert={handleConvert} onDelete={handleDelete} />
                  )) : (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">Aucun devis</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <CreateQuoteModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </ErrorBoundary>
  )
}
