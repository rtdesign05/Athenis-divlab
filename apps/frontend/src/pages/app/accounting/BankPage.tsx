import React, { useRef, useState, useCallback } from 'react'
import {
  useBankStats,
  useBankTransactions,
  useImportBank,
  useAutoReconcile,
  useSetBankTxStatus,
  useDeleteBankTx,
} from '@/hooks/useAccounting'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { SkeletonTable } from '@/shared/components/feedback/Skeleton'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { useCurrency } from '@/hooks/useCurrency'
import { formatDate } from '@/shared/utils/date'
import type { BankTransaction } from '@/services/accountingApi'

type StatusFilter = 'UNMATCHED' | 'MATCHED' | 'IGNORED' | 'ALL'

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
  MATCHED:   'success',
  UNMATCHED: 'warning',
  IGNORED:   'neutral',
}
const STATUS_LABEL: Record<string, string> = {
  MATCHED:   'Lettré',
  UNMATCHED: 'Non rapproché',
  IGNORED:   'Ignoré',
}

function TxRow({
  tx,
  onIgnore,
  onUnmatch,
  onDelete,
}: {
  tx: BankTransaction
  onIgnore: (id: string) => void
  onUnmatch: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { fmt } = useCurrency()
  return (
    <tr className="hover:bg-gray-50 text-sm">
      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{formatDate(tx.date)}</td>
      <td className="px-4 py-2.5 text-gray-800 max-w-xs truncate">{tx.label}</td>
      <td className={`px-4 py-2.5 text-right font-medium tabular-nums ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
        {tx.type === 'CREDIT' ? '+' : '−'}{fmt(tx.amount)}
      </td>
      <td className="px-4 py-2.5">
        <Badge variant={STATUS_BADGE[tx.status]}>{STATUS_LABEL[tx.status]}</Badge>
      </td>
      <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{tx.lettrage ?? '—'}</td>
      <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[160px] truncate">
        {tx.invoice
          ? `Facture ${tx.invoice.number}`
          : tx.expense
          ? `Dépense ${tx.expense.description.slice(0, 20)}`
          : '—'}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex gap-2 justify-end">
          {tx.status === 'UNMATCHED' && (
            <button onClick={() => onIgnore(tx.id)} className="text-xs text-gray-400 hover:text-gray-600 font-medium">Ignorer</button>
          )}
          {tx.status === 'MATCHED' && (
            <button onClick={() => onUnmatch(tx.id)} className="text-xs text-amber-500 hover:text-amber-700 font-medium">Délettrer</button>
          )}
          {tx.status === 'IGNORED' && (
            <button onClick={() => onUnmatch(tx.id)} className="text-xs text-forest-600 hover:text-forest-800 font-medium">Réactiver</button>
          )}
          <button onClick={() => onDelete(tx.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">Suppr.</button>
        </div>
      </td>
    </tr>
  )
}

function ImportPanel() {
  const fileRef  = useRef<HTMLInputElement>(null)
  const importFn = useImportBank()
  const [format, setFormat] = useState<'CSV' | 'OFX'>('CSV')
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<string | null>(null)

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const content = ev.target?.result as string
      try {
        const res = await importFn.mutateAsync({ format, content })
        setResult(`✓ ${res.imported} transaction(s) importée(s)`)
        if (fileRef.current) fileRef.current.value = ''
        setFileName('')
      } catch {
        setResult('Erreur lors de l\'import.')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }, [importFn, format])

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-gray-900">Importer un relevé bancaire</h3>
      <div className="flex gap-3 items-center flex-wrap">
        <div>
          <label className="label mb-1">Format</label>
          <select className="input" value={format} onChange={e => setFormat(e.target.value as 'CSV' | 'OFX')}>
            <option value="CSV">CSV (banque française)</option>
            <option value="OFX">OFX / QFX</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="label mb-1">Fichier</label>
          <label className="flex items-center gap-2 cursor-pointer input bg-white hover:bg-gray-50 transition-colors">
            <input ref={fileRef} type="file" accept=".csv,.ofx,.qfx,.txt" className="hidden" onChange={handleFile} />
            <span className="text-gray-400 text-sm">{fileName || 'Choisir un fichier…'}</span>
          </label>
        </div>
      </div>
      {importFn.isPending && <p className="text-sm text-gray-500 animate-pulse">Import en cours…</p>}
      {result && <p className={`text-sm font-medium ${result.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{result}</p>}
      <p className="text-xs text-gray-400">
        CSV attendu : Date;Libellé;Débit;Crédit (séparateurs ; ou ,). OFX : format standard STMTTRN.
      </p>
    </div>
  )
}

export function BankPage() {
  const [filter, setFilter] = useState<StatusFilter>('ALL')

  const { data: stats }  = useBankStats()
  const { data: txData, isLoading } = useBankTransactions(
    filter !== 'ALL' ? { status: filter } : undefined,
  )
  const autoReconcile = useAutoReconcile()
  const setStatus     = useSetBankTxStatus()
  const deleteTx      = useDeleteBankTx()

  const handleIgnore  = useCallback((id: string) => setStatus.mutate({ id, status: 'IGNORED' }), [setStatus])
  const handleUnmatch = useCallback((id: string) => setStatus.mutate({ id, status: 'UNMATCHED' }), [setStatus])
  const handleDelete  = useCallback((id: string) => { if (confirm('Supprimer cette transaction ?')) deleteTx.mutate(id) }, [deleteTx])

  const handleAutoReconcile = useCallback(async () => {
    const res = await autoReconcile.mutateAsync()
    alert(`Rapprochement automatique : ${res.matched} transaction(s) lettrée(s)`)
  }, [autoReconcile])

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'ALL',       label: 'Toutes' },
    { key: 'UNMATCHED', label: 'Non rapprochées' },
    { key: 'MATCHED',   label: 'Lettrées' },
    { key: 'IGNORED',   label: 'Ignorées' },
  ]

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Relevé bancaire & Rapprochement</h2>
            <p className="mt-1 text-sm text-gray-500">Import, lettrage et rapprochement automatique</p>
          </div>
          <Button onClick={handleAutoReconcile} loading={autoReconcile.isPending} variant="secondary">
            ⚡ Rapprochement automatique
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total transactions', value: stats.total, color: 'text-gray-900' },
              { label: 'Lettrées', value: stats.matched, color: 'text-green-600' },
              { label: 'Non rapprochées', value: stats.unmatched, color: 'text-amber-600' },
              { label: 'Taux de rapprochement', value: `${stats.reconciliationRate}%`, color: stats.reconciliationRate >= 80 ? 'text-green-600' : 'text-amber-600' },
            ].map((s) => (
              <div key={s.label} className="card py-3">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Import panel */}
        <ImportPanel />

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filter === f.key ? 'border-forest-700 text-forest-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card overflow-hidden p-0">
          {isLoading ? <SkeletonTable rows={8} /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Date', 'Libellé', 'Montant', 'Statut', 'Lettrage', 'Pièce liée', ''].map((h, i) => (
                      <th key={i} className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide ${i === 2 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {txData?.items.length ? txData.items.map((tx) => (
                    <TxRow key={tx.id} tx={tx} onIgnore={handleIgnore} onUnmatch={handleUnmatch} onDelete={handleDelete} />
                  )) : (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                      {filter === 'UNMATCHED' ? 'Aucune transaction en attente de rapprochement' : 'Aucune transaction'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
