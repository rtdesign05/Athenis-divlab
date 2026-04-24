import { useCurrency } from '@/hooks/useCurrency'
import { formatDate } from '@/shared/utils/date'
import { Badge } from '@/shared/components/ui/Badge'
import { AttachmentPanel } from '@/components/ui/AttachmentPanel'
import type { Expense, ExpenseCategory } from '@/services/expensesApi'

interface ExpenseDetailProps {
  expense:  Expense
  onClose:  () => void
  onDelete: (id: string) => void
}

const CAT_LABEL: Record<ExpenseCategory, string> = {
  SOFTWARE: 'Logiciels', TRAVEL: 'Déplacements', EQUIPMENT: 'Matériel',
  MARKETING: 'Marketing', CONSULTING: 'Consulting', SALARY: 'Salaires',
  RENT: 'Loyer', OTHER: 'Autres',
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="w-36 shrink-0 text-xs text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-800">{value ?? '—'}</span>
    </div>
  )
}

export function ExpenseDetail({ expense, onClose, onDelete }: ExpenseDetailProps) {
  const { fmt } = useCurrency()

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-gray-100 px-4 py-3 bg-gray-50">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900 truncate">{expense.description}</span>
            <Badge variant="neutral">{CAT_LABEL[expense.category]}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{formatDate(expense.date)}</p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-4">

          {/* Section 1 — Informations */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Informations</h3>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <InfoRow label="Catégorie"    value={CAT_LABEL[expense.category]} />
              <InfoRow label="Date"         value={formatDate(expense.date)} />
              <InfoRow label="Description"  value={expense.description} />
              <div className="my-2 border-t border-gray-100" />
              <InfoRow label="Montant HT"   value={<span className="font-bold text-gray-900">{fmt(Number(expense.amount))}</span>} />
              {expense.tva && Number(expense.tva) > 0 && (
                <InfoRow label="TVA déduite" value={fmt(Number(expense.tva))} />
              )}
            </div>
          </section>

          {/* Section 2 — Écriture comptable */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Écriture comptable</h3>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <InfoRow label="Compte débité"  value="604 — Achats de matières" />
              <InfoRow label="Compte crédité" value="401 — Fournisseurs" />
              <InfoRow label="Journal"        value="ACH — Achats" />
              <InfoRow label="Statut lettrage" value={<span className="text-amber-600">Non lettré</span>} />
            </div>
          </section>

          {/* Section 3 — Pièces justificatives */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Pièces justificatives</h3>
            <AttachmentPanel resourceType="expense" resourceId={expense.id} />
          </section>

          {/* Section 4 — Actions */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</h3>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => { if (confirm('Supprimer cette dépense ?')) onDelete(expense.id) }}
                className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors text-left"
              >
                🗑 Supprimer la dépense
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
