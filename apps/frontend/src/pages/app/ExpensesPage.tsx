import React, { useState, useCallback } from 'react'
import { useExpenses, useCreateExpense, useDeleteExpense } from '@/hooks/useExpenses'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { SkeletonTable } from '@/shared/components/feedback/Skeleton'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Modal } from '@/shared/components/ui/Modal'
import { SplitLayout } from '@/components/layout/SplitLayout'
import { ExpenseDetail } from '@/pages/app/expenses/ExpenseDetail'
import { useCurrency } from '@/hooks/useCurrency'
import { formatDate } from '@/shared/utils/date'
import type { Expense, ExpenseCategory, CreateExpenseDto } from '@/services/expensesApi'

const CATEGORIES: ExpenseCategory[] = ['SOFTWARE','TRAVEL','EQUIPMENT','MARKETING','CONSULTING','SALARY','RENT','OTHER']
const CAT_LABEL: Record<ExpenseCategory, string> = {
  SOFTWARE: 'Logiciels', TRAVEL: 'Déplacements', EQUIPMENT: 'Matériel',
  MARKETING: 'Marketing', CONSULTING: 'Consulting', SALARY: 'Salaires',
  RENT: 'Loyer', OTHER: 'Autres',
}

interface RowProps {
  expense:  Expense
  selected: boolean
  onSelect: (e: Expense) => void
  onDelete: (id: string) => void
}

const ExpenseRow = React.memo(function ExpenseRow({ expense, selected, onSelect, onDelete }: RowProps) {
  const { fmt } = useCurrency()
  return (
    <tr
      onClick={() => onSelect(expense)}
      className={`cursor-pointer transition-colors ${selected ? 'bg-forest-50 border-l-2 border-l-forest-600' : 'hover:bg-gray-50'}`}
    >
      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(expense.date)}</td>
      <td className="px-4 py-3">
        <Badge variant="neutral">{CAT_LABEL[expense.category]}</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{expense.description}</td>
      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{fmt(expense.amount)}</td>
      <td className="px-4 py-3 text-sm text-right text-gray-500">{fmt(expense.tva)}</td>
      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
        <button onClick={() => onDelete(expense.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Supprimer</button>
      </td>
    </tr>
  )
})

function CreateExpenseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currencySymbol } = useCurrency()
  const create = useCreateExpense()
  const [form, setForm] = useState<CreateExpenseDto>({
    date: new Date().toISOString().slice(0, 10),
    category: 'OTHER', description: '', amount: 0, tva: 0,
  })

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    await create.mutateAsync(form)
    onClose()
  }, [create, form, onClose])

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle dépense">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date *</label>
            <input type="date" required className="input mt-1" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Catégorie *</label>
            <select required className="input mt-1" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Description *</label>
          <input required className="input mt-1" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Montant HT ({currencySymbol}) *</label>
            <input type="number" step="0.01" min="0" required className="input mt-1"
              value={form.amount} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className="label">TVA ({currencySymbol})</label>
            <input type="number" step="0.01" min="0" className="input mt-1"
              value={form.tva ?? 0} onChange={e => setForm(f => ({ ...f, tva: parseFloat(e.target.value) || 0 }))} />
          </div>
        </div>
        {create.isError && <p className="text-sm text-red-600">Erreur lors de la création.</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={create.isPending}>Ajouter</Button>
        </div>
      </form>
    </Modal>
  )
}

export function ExpensesPage() {
  const { fmt } = useCurrency()
  const [catFilter, setCatFilter] = useState<ExpenseCategory | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected]   = useState<Expense | null>(null)

  const { data, isLoading } = useExpenses(catFilter)
  const deleteExpense = useDeleteExpense()

  const handleDelete = useCallback((id: string) => {
    if (confirm('Supprimer cette dépense ?')) {
      deleteExpense.mutate(id)
      if (selected?.id === id) setSelected(null)
    }
  }, [deleteExpense, selected])

  const handleSelect = useCallback((e: Expense) => {
    setSelected(s => s?.id === e.id ? null : e)
  }, [])

  const listPane = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dépenses</h2>
          <p className="mt-1 text-sm text-gray-500">Suivez vos charges et dépenses</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Ajouter</Button>
      </div>

      {data && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card py-3">
            <p className="text-xs text-gray-500">Total HT</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{fmt(data.totalHT)}</p>
          </div>
          <div className="card py-3">
            <p className="text-xs text-gray-500">TVA déductible</p>
            <p className="mt-1 text-xl font-bold text-gray-700">{fmt(data.totalTVA)}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCatFilter(undefined)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!catFilter ? 'bg-forest-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Toutes
        </button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCatFilter(c === catFilter ? undefined : c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${catFilter === c ? 'bg-forest-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {CAT_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? <SkeletonTable rows={6} /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Date','Catégorie','Description','Montant HT','TVA',''].map((h, i) => (
                    <th key={i} className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.items.length ? data.items.map(e => (
                  <ExpenseRow
                    key={e.id}
                    expense={e}
                    selected={selected?.id === e.id}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                  />
                )) : (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">Aucune dépense</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )

  const detailPane = selected ? (
    <ExpenseDetail
      expense={selected}
      onClose={() => setSelected(null)}
      onDelete={handleDelete}
    />
  ) : null

  return (
    <ErrorBoundary>
      <SplitLayout
        listContent={listPane}
        detailContent={detailPane}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
      />
      <CreateExpenseModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </ErrorBoundary>
  )
}
