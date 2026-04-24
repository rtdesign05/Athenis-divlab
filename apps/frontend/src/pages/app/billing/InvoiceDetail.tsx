import { useCurrency } from '@/hooks/useCurrency'
import { formatDate } from '@/shared/utils/date'
import { Badge } from '@/shared/components/ui/Badge'
import { AttachmentPanel } from '@/components/ui/AttachmentPanel'
import type { Invoice, InvoiceStatus } from '@/services/billingApi'
import { PdfButton } from '@/shared/components/ui/PdfButton'
import { usePdf } from '@/shared/hooks/usePdf'

interface InvoiceDetailProps {
  invoice:  Invoice
  onClose:  () => void
  onStatus: (id: string, status: InvoiceStatus) => void
  onDelete: (id: string) => void
}

const STATUS_BADGE: Record<InvoiceStatus, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  PAID: 'success', SENT: 'info', DRAFT: 'neutral', OVERDUE: 'danger', CANCELLED: 'neutral',
}
const STATUS_LABEL: Record<InvoiceStatus, string> = {
  PAID: 'Payée', SENT: 'Envoyée', DRAFT: 'Brouillon', OVERDUE: 'En retard', CANCELLED: 'Annulée',
}

interface TimelineEvent {
  label: string
  done:  boolean
  date:  string | null
}

function buildTimeline(inv: Invoice): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { label: 'Créée', done: true, date: inv.createdAt },
  ]
  if (inv.status !== 'DRAFT') {
    events.push({ label: 'Envoyée', done: true, date: inv.updatedAt })
  }
  if (inv.status === 'PAID') {
    events.push({ label: 'Paiement reçu', done: true, date: inv.paidAt })
  } else if (inv.status === 'OVERDUE') {
    events.push({ label: 'En retard depuis', done: false, date: inv.dueDate })
  } else if (inv.status === 'SENT') {
    events.push({ label: 'En attente de paiement', done: false, date: null })
  }
  return events
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="w-36 shrink-0 text-xs text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-800">{value ?? '—'}</span>
    </div>
  )
}

export function InvoiceDetail({ invoice, onClose, onStatus, onDelete }: InvoiceDetailProps) {
  const { fmt } = useCurrency()
  const timeline = buildTimeline(invoice)
  const { downloadInvoice } = usePdf()

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-gray-100 px-4 py-3 bg-gray-50">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900">{invoice.number}</span>
            <Badge variant={STATUS_BADGE[invoice.status]}>{STATUS_LABEL[invoice.status]}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{invoice.client?.name ?? 'Sans client'}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <PdfButton onDownload={() => downloadInvoice(invoice)} label="PDF" className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60" />
          {invoice.status === 'DRAFT' && (
            <button
              onClick={() => onStatus(invoice.id, 'SENT')}
              className="rounded-lg bg-forest-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-forest-700 transition-colors"
            >
              📧 Envoyer
            </button>
          )}
          {invoice.status === 'SENT' && (
            <button
              onClick={() => onStatus(invoice.id, 'PAID')}
              className="rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
            >
              ✓ Marquer payée
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-4">

          {/* Section 1 — Informations */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Informations</h3>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              {invoice.client && (
                <>
                  <InfoRow label="Client" value={invoice.client.name} />
                  {invoice.client.email && <InfoRow label="Email" value={invoice.client.email} />}
                </>
              )}
              <InfoRow label="Date d'émission"  value={formatDate(invoice.issueDate)} />
              <InfoRow label="Date d'échéance"  value={formatDate(invoice.dueDate)} />
              {invoice.paidAt && <InfoRow label="Date de paiement" value={formatDate(invoice.paidAt)} />}
              <div className="my-2 border-t border-gray-100" />
              <InfoRow label="Montant HT"   value={fmt(Number(invoice.subtotal))} />
              <InfoRow label="TVA"          value={`${invoice.taxRate} % (${fmt(Number(invoice.taxAmount))})`} />
              <InfoRow label="Total TTC"    value={<span className="font-bold text-gray-900">{fmt(Number(invoice.total))}</span>} />
              {invoice.notes && (
                <>
                  <div className="my-2 border-t border-gray-100" />
                  <InfoRow label="Notes" value={invoice.notes} />
                </>
              )}
            </div>
          </section>

          {/* Section 2 — Timeline */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Historique</h3>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 space-y-2">
              {timeline.map((ev, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`mt-0.5 text-sm ${ev.done ? 'text-green-500' : 'text-amber-400'}`}>
                    {ev.done ? '✓' : '⏳'}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{ev.label}</p>
                    {ev.date !== null && (
                      <p className="text-xs text-gray-400">{formatDate(ev.date)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3 — Pièces justificatives */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Pièces justificatives</h3>
            <AttachmentPanel resourceType="invoice" resourceId={invoice.id} />
          </section>

          {/* Section 4 — Actions rapides */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Actions rapides</h3>
            <div className="flex flex-col gap-1.5">
              {invoice.status === 'SENT' && (
                <button
                  onClick={() => onStatus(invoice.id, 'PAID')}
                  className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors text-left"
                >
                  ✓ Marquer comme payée
                </button>
              )}
              {invoice.status === 'DRAFT' && (
                <button
                  onClick={() => onStatus(invoice.id, 'SENT')}
                  className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors text-left"
                >
                  📧 Envoyer une relance
                </button>
              )}
              {invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
                <button
                  onClick={() => { if (confirm('Annuler cette facture ?')) onStatus(invoice.id, 'CANCELLED') }}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors text-left"
                >
                  ✕ Annuler la facture
                </button>
              )}
              {invoice.status === 'DRAFT' && (
                <button
                  onClick={() => { if (confirm('Supprimer définitivement cette facture ?')) onDelete(invoice.id) }}
                  className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors text-left"
                >
                  🗑 Supprimer la facture
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
