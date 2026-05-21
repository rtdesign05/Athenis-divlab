import { useState, useRef, useCallback, useMemo } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useTresorerie } from '@/contexts/TresorerieContext'
import { uploadBankStatement, type BankStatementResult } from '@/services/bankApi'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PieceJustificative {
  name: string
  url:  string   // blob: URL — valide pour la session courante
  type: string   // MIME
}

interface Operation {
  id:      string
  date:    string
  libelle: string
  montant: number
  piece?:  PieceJustificative
}

interface Compte {
  id: string
  banque: string
  intitule: string
  numero: string
  solde: number
  devise: string
  agence: string
  operations: Operation[]
}

// ── Données initiales ─────────────────────────────────────────────────────────

// ── Modal import relevé bancaire ──────────────────────────────────────────────

type ImportStep = 'pick' | 'loading' | 'preview' | 'error'

function ModalImportReleve({ compte, onImport, onClose }: {
  compte:   { banque: string; intitule: string; devise: string }
  onImport: (result: BankStatementResult) => void
  onClose:  () => void
}) {
  const { fmt } = useCurrency()
  const fileRef                   = useRef<HTMLInputElement>(null)
  const [step, setStep]           = useState<ImportStep>('pick')
  const [result, setResult]       = useState<BankStatementResult | null>(null)
  const [errorMsg, setErrorMsg]   = useState('')
  const [dragOver, setDragOver]   = useState(false)
  const [fileName, setFileName]   = useState('')

  const handleFile = useCallback(async (file: File) => {
    const ALLOWED = ['text/csv', 'application/pdf', 'application/octet-stream']
    const ext     = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED.includes(file.type) && !['csv', 'ofx', 'qfx', 'pdf'].includes(ext)) {
      setErrorMsg('Format non supporté — utilisez PDF, CSV ou OFX')
      setStep('error')
      return
    }
    setFileName(file.name)
    setStep('loading')
    try {
      const data = await uploadBankStatement(file)
      if (data.transactions.length === 0) {
        setErrorMsg('Aucune transaction trouvée dans ce fichier. Vérifiez le format.')
        setStep('error')
        return
      }
      setResult(data)
      setStep('preview')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion'
      setErrorMsg(msg.includes('422') || msg.includes('scanné')
        ? 'PDF image non supporté — exportez votre relevé en PDF texte ou CSV depuis votre espace bancaire en ligne.'
        : `Analyse échouée : ${msg}`)
      setStep('error')
    }
  }, [])

  const confColor = (c: number) =>
    c >= 75 ? 'text-green-700 bg-green-50 border-green-200'
    : c >= 40 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-red-700 bg-red-50 border-red-200'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-base">📊</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">Importer un relevé bancaire</p>
              <p className="text-xs text-gray-400">{compte.banque} — {compte.intitule}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Step: pick */}
        {step === 'pick' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all
                ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50'}`}
            >
              <span className="text-4xl">🏦</span>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">Glissez votre relevé ici</p>
                <p className="mt-0.5 text-xs text-gray-400">ou cliquez pour parcourir vos fichiers</p>
              </div>
              <div className="flex gap-2">
                {['PDF', 'CSV', 'OFX'].map(f => (
                  <span key={f} className="rounded-full bg-white border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">{f}</span>
                ))}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.csv,.ofx,.qfx,text/csv,application/pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = '' }} />
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-1.5">
              <p className="text-xs font-semibold text-blue-800">💡 Comment obtenir votre relevé</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-blue-700">
                {[
                  ['BICEC', 'Espace client → Relevés → Export PDF/CSV'],
                  ['UBA', 'MyUBA → Comptes → Télécharger relevé'],
                  ['Ecobank', 'Ecobank Online → Statement → PDF'],
                  ['Afriland', 'E-Afriland → Relevés → CSV'],
                ].map(([b, i]) => (
                  <div key={b} className="flex gap-1.5">
                    <span className="font-semibold shrink-0">{b}</span>
                    <span className="text-blue-500">{i}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step: loading */}
        {step === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-10">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
              <span className="absolute inset-0 flex items-center justify-center text-xl">📊</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">Analyse en cours…</p>
              <p className="mt-1 text-xs text-gray-400">{fileName}</p>
            </div>
            <div className="flex gap-3 text-xs text-gray-300">
              {['Extraction texte…', 'Détection transactions…', 'Structuration…'].map((t, i) => (
                <span key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.4}s` }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Step: preview */}
        {step === 'preview' && result && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Score confiance */}
            <div className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${confColor(result.confidence)}`}>
              <div className="flex items-center gap-2">
                <span>{result.confidence >= 75 ? '✅' : result.confidence >= 40 ? '⚠️' : '❌'}</span>
                <span className="text-xs font-semibold">
                  {result.confidence >= 75 ? 'Extraction fiable' : result.confidence >= 40 ? 'Extraction partielle — vérifiez' : 'Extraction incertaine'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {result.provider && <span className="text-xs opacity-70">{result.provider}</span>}
                <span className="text-xs font-bold">{result.confidence}% confiance</span>
              </div>
            </div>

            {/* Infos compte extrait */}
            {(result.bankName || result.accountNumber || result.periodStart) && (
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-700">🏦 Informations du relevé</p>
                </div>
                <div className="p-4 grid grid-cols-3 gap-3">
                  {[
                    ['Banque',      result.bankName],
                    ['N° compte',   result.accountNumber],
                    ['Titulaire',   result.accountHolder],
                    ['Période du',  result.periodStart],
                    ['au',          result.periodEnd],
                    ['Devise',      result.currency],
                  ].map(([label, val]) => val && (
                    <div key={label}>
                      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                      <p className="text-xs font-medium text-gray-800 truncate">{val}</p>
                    </div>
                  ))}
                </div>
                {(result.openingBalance != null || result.closingBalance != null) && (
                  <div className="px-4 pb-4 flex gap-4">
                    {result.openingBalance != null && (
                      <div className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs">
                        <span className="text-gray-500">Solde ouverture</span>
                        <span className="ml-2 font-semibold text-gray-800">{fmt(result.openingBalance)}</span>
                      </div>
                    )}
                    {result.closingBalance != null && (
                      <div className="rounded-lg bg-green-50 px-3 py-1.5 text-xs">
                        <span className="text-green-700">Solde clôture</span>
                        <span className="ml-2 font-bold text-green-800">{fmt(result.closingBalance)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tableau des transactions */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">📋 Transactions ({result.transactions.length})</p>
                <p className="text-xs text-gray-400">{fileName}</p>
              </div>
              <div className="overflow-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                    <tr className="text-left text-gray-500 font-semibold">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Libellé</th>
                      <th className="px-3 py-2 text-right">Débit</th>
                      <th className="px-3 py-2 text-right">Crédit</th>
                      {result.transactions.some(t => t.solde != null) && <th className="px-3 py-2 text-right">Solde</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.transactions.map((tx, i) => (
                      <tr key={i} className="hover:bg-gray-50/60">
                        <td className="px-3 py-2 whitespace-nowrap text-gray-400">
                          {new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-3 py-2 text-gray-700 max-w-[260px] truncate">{tx.libelle}</td>
                        <td className="px-3 py-2 text-right font-medium text-red-500">
                          {tx.debit != null ? fmt(tx.debit) : ''}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-green-600">
                          {tx.credit != null ? fmt(tx.credit) : ''}
                        </td>
                        {result.transactions.some(t => t.solde != null) && (
                          <td className="px-3 py-2 text-right text-gray-500">
                            {tx.solde != null ? fmt(tx.solde) : ''}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Step: error */}
        {step === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <span className="text-4xl">❌</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Import impossible</p>
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">{errorMsg}</p>
            </div>
            <button onClick={() => { setStep('pick'); setErrorMsg(''); setFileName('') }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
              Réessayer
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 flex items-center gap-2 border-t border-gray-100 px-5 py-3">
          <button onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <div className="flex-1" />
          {step === 'preview' && result && (
            <>
              <button onClick={() => { setStep('pick'); setResult(null); setFileName('') }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Changer de fichier
              </button>
              <button onClick={() => { onImport(result); onClose() }}
                className="flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-800">
                <span>✓</span> Importer {result.transactions.length} transaction{result.transactions.length > 1 ? 's' : ''}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modals ────────────────────────────────────────────────────────────────────

function ModalCompte({ onSave, onClose, defaultAgence }: {
  onSave: (c: Omit<Compte, 'id' | 'operations'>) => void
  onClose: () => void
  defaultAgence?: string
}) {
  const [form, setForm] = useState({ banque: '', intitule: '', numero: '', solde: '', devise: 'XAF', agence: defaultAgence ?? 'Siège' })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.banque || !form.intitule) return
    onSave({ ...form, solde: Number(form.solde.replace(/\s/g, '')) || 0 })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Nouveau compte bancaire</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Banque *</label>
              <input value={form.banque} onChange={set('banque')} required placeholder="ex: BICEC"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Devise</label>
              <select value={form.devise} onChange={set('devise')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                <option>XAF</option><option>EUR</option><option>USD</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Intitulé du compte *</label>
            <input value={form.intitule} onChange={set('intitule')} required placeholder="ex: Compte courant entreprise"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Numéro de compte</label>
            <input value={form.numero} onChange={set('numero')} placeholder="ex: CM 021 10023 00412876001 45"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Solde initial</label>
            <input value={form.solde} onChange={set('solde')} placeholder="0" type="number"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              className="flex-1 rounded-lg bg-green-700 py-2 text-sm font-medium text-white hover:bg-green-800">
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalOperation({ compte, initialOp, onSave, onClose }: {
  compte: Compte
  initialOp?: Operation
  onSave: (op: Omit<Operation, 'id'>) => void
  onClose: () => void
}) {
  const editing = !!initialOp
  const [form, setForm] = useState(() => ({
    date:    initialOp ? initialOp.date : new Date().toISOString().slice(0, 10),
    libelle: initialOp ? initialOp.libelle : '',
    montant: initialOp ? String(Math.abs(initialOp.montant)) : '',
    type:    initialOp ? (initialOp.montant >= 0 ? 'in' : 'out') : 'in',
  }))
  const [newFile, setNewFile]               = useState<File | null>(null)
  const [removePieceFlag, setRemovePieceFlag] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const displayPiece: { name: string } | null =
    removePieceFlag ? null : newFile ?? initialOp?.piece ?? null

  function handleFile(f: File | undefined) {
    if (!f) return
    setNewFile(f)
    setRemovePieceFlag(false)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const raw = Number(form.montant)
    if (!raw || !form.libelle) return
    let piece: PieceJustificative | undefined
    if (removePieceFlag) {
      if (initialOp?.piece) URL.revokeObjectURL(initialOp.piece.url)
    } else if (newFile) {
      if (initialOp?.piece) URL.revokeObjectURL(initialOp.piece.url)
      piece = { name: newFile.name, url: URL.createObjectURL(newFile), type: newFile.type }
    } else {
      piece = initialOp?.piece
    }
    const montant = form.type === 'out' ? -Math.abs(raw) : Math.abs(raw)
    onSave({ date: form.date, libelle: form.libelle, montant, ...(piece ? { piece } : {}) })
  }

  const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {editing ? "Modifier l'opération" : 'Saisir une opération'}
            </h2>
            <p className="text-xs text-gray-400">{compte.banque} — {compte.intitule}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <input type="date" value={form.date} onChange={set('date')} required className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
              <select value={form.type} onChange={set('type')} className={INPUT}>
                <option value="in">Crédit (entrée)</option>
                <option value="out">Débit (sortie)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Libellé *</label>
            <input value={form.libelle} onChange={set('libelle')} required placeholder="ex: Virement reçu client ACME" className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Montant ({compte.devise}) *</label>
            <input value={form.montant} onChange={set('montant')} required placeholder="0" type="number" min="0" className={INPUT} />
          </div>

          {/* Pièce justificative */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pièce justificative</label>
            {displayPiece ? (
              <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                <span className="text-base shrink-0">📎</span>
                <span className="text-xs text-blue-700 flex-1 truncate">{displayPiece.name}</span>
                <label className="text-xs text-blue-500 hover:text-blue-700 cursor-pointer underline shrink-0">
                  Remplacer
                  <input type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }} />
                </label>
                <button type="button" onClick={() => { setNewFile(null); setRemovePieceFlag(true) }}
                  className="shrink-0 text-gray-400 hover:text-red-500 text-base leading-none">×</button>
              </div>
            ) : (
              <label className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2.5 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                <span className="text-gray-400 text-base">📎</span>
                <span className="text-xs text-gray-500">Joindre une pièce justificative (PDF, image…)</span>
                <input type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }} />
              </label>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              className={`flex-1 rounded-lg py-2 text-sm font-medium text-white ${form.type === 'in' ? 'bg-green-700 hover:bg-green-800' : 'bg-red-600 hover:bg-red-700'}`}>
              {editing ? 'Enregistrer les modifications' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function BanquesPage() {
  const { fmt } = useCurrency()
  const { user } = useAuth()
  const agenceNom = user?.agenceNom ?? null
  const { addTransaction } = useTresorerie()

  const [comptes, setComptes] = useState<Compte[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [showAddCompte, setShowAddCompte] = useState(false)
  const [showAddOp, setShowAddOp] = useState(false)
  const [editingOp, setEditingOp] = useState<Operation | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importToast, setImportToast] = useState<string | null>(null)
  // Filtre par date sur les mouvements (yyyy-mm-dd, inclusif)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const comptesVisibles = agenceNom ? comptes.filter(c => c.agence === agenceNom) : comptes
  const selected = comptesVisibles.find(c => c.id === selectedId) ?? comptesVisibles[0]
  const totalSolde = comptesVisibles.reduce((s, c) => s + c.solde, 0)

  // Filtre par date sur les mouvements du compte sélectionné (avant tout early return)
  const filteredOperations = useMemo(() => {
    if (!selected) return []
    return selected.operations.filter(op => {
      if (dateFrom && op.date < dateFrom) return false
      if (dateTo   && op.date > dateTo)   return false
      return true
    })
  }, [selected, dateFrom, dateTo])

  // L'utilisateur est scopé à une agence qui n'a pas de comptes bancaires
  if (agenceNom && comptesVisibles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-3">🔒</p>
          <p className="text-sm font-semibold text-gray-700">Accès non autorisé</p>
          <p className="mt-1 text-xs text-gray-500">
            Votre agence <span className="font-medium text-amber-700">{agenceNom}</span> n'a pas accès aux comptes bancaires.
            Les comptes bancaires sont gérés au niveau du Siège.
          </p>
        </div>
      </div>
    )
  }

  if (!selected) return null

  const isFiltered = dateFrom !== '' || dateTo !== ''
  const filteredTotal = filteredOperations.reduce((s, o) => s + o.montant, 0)

  function addCompte(data: Omit<Compte, 'id' | 'operations'>) {
    const nc: Compte = { ...data, id: Date.now().toString(), operations: [] }
    setComptes(cs => [...cs, nc])
    setSelectedId(nc.id)
    setShowAddCompte(false)
  }

  function addOperation(op: Omit<Operation, 'id'>) {
    const newOp: Operation = { ...op, id: Date.now().toString() }
    setComptes(cs => cs.map(c =>
      c.id === selectedId
        ? { ...c, solde: c.solde + op.montant, operations: [newOp, ...c.operations] }
        : c
    ))
    // Propager vers le contexte trésorerie → visible dans Transactions comptabilité
    if (selected) {
      addTransaction(
        { date: op.date, libelle: op.libelle, montant: op.montant },
        `${selected.banque} — ${selected.intitule}`,
        'banque',
        selected.agence,
        op.piece?.name,
      )
    }
    setShowAddOp(false)
  }

  function updateOperation(updated: Omit<Operation, 'id'>) {
    if (!editingOp) return
    setComptes(cs => cs.map(c => {
      if (c.id !== selectedId) return c
      const diff = updated.montant - editingOp.montant
      return {
        ...c,
        solde: c.solde + diff,
        operations: c.operations.map(op =>
          op.id === editingOp.id ? { ...op, ...updated } : op
        ),
      }
    }))
    setEditingOp(null)
  }

  function deleteOperation(opId: string) {
    setComptes(cs => cs.map(c => {
      if (c.id !== selectedId) return c
      const op = c.operations.find(o => o.id === opId)
      if (!op) return c
      if (op.piece) URL.revokeObjectURL(op.piece.url)
      return {
        ...c,
        solde: c.solde - op.montant,
        operations: c.operations.filter(o => o.id !== opId),
      }
    }))
  }

  function attachPiece(opId: string, file: File) {
    const url = URL.createObjectURL(file)
    setComptes(cs => cs.map(c =>
      c.id === selectedId
        ? { ...c, operations: c.operations.map(op =>
            op.id === opId
              ? { ...op, piece: { name: file.name, url, type: file.type } }
              : op
          )}
        : c
    ))
  }

  function removePieceFromOp(opId: string) {
    setComptes(cs => cs.map(c => {
      if (c.id !== selectedId) return c
      return {
        ...c,
        operations: c.operations.map(op => {
          if (op.id !== opId) return op
          if (op.piece) URL.revokeObjectURL(op.piece.url)
          const { piece: _p, ...rest } = op
          return rest
        }),
      }
    }))
  }

  function importReleve(result: BankStatementResult) {
    const newOps: Operation[] = result.transactions.map((tx, i) => ({
      id:      `imp-${Date.now()}-${i}`,
      date:    tx.date,
      libelle: tx.libelle,
      montant: (tx.credit ?? 0) - (tx.debit ?? 0),
    }))
    setComptes(cs => cs.map(c => {
      if (c.id !== selectedId) return c
      // Calcul du solde : préférer le solde de clôture du relevé s'il est disponible
      const delta    = newOps.reduce((s, op) => s + op.montant, 0)
      const newSolde = result.closingBalance ?? c.solde + delta
      return {
        ...c,
        solde:      newSolde,
        operations: [...newOps, ...c.operations],
      }
    }))
    // Propager vers contexte trésorerie
    if (selected) {
      newOps.forEach(op => {
        addTransaction(
          { date: op.date, libelle: op.libelle, montant: op.montant },
          `${selected.banque} — ${selected.intitule}`,
          'banque',
          selected.agence,
        )
      })
    }
    setImportToast(`✅ ${newOps.length} opération${newOps.length > 1 ? 's' : ''} importée${newOps.length > 1 ? 's' : ''} depuis le relevé`)
    setTimeout(() => setImportToast(null), 5000)
  }

  return (
    <div className="h-full flex gap-3 overflow-hidden">

      {/* ── Liste des comptes (gauche) ─────────────────────────────────────── */}
      <div className="w-64 shrink-0 flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold text-gray-700">Comptes bancaires</p>
            <p className="text-[10px] text-gray-400">Total : {fmt(totalSolde)}</p>
          </div>
          <button onClick={() => setShowAddCompte(true)}
            title="Ajouter un compte"
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-green-700 text-white text-base font-bold hover:bg-green-800">
            +
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
          {comptesVisibles.map(c => (
            <button key={c.id} onClick={() => setSelectedId(c.id)}
              className={`w-full text-left px-3 py-2.5 transition-colors ${c.id === selectedId ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
              <p className={`text-xs font-semibold ${c.id === selectedId ? 'text-green-800' : 'text-gray-800'}`}>{c.banque}</p>
              <p className="text-[11px] text-gray-500 truncate">{c.intitule}</p>
              <p className={`text-sm font-bold mt-0.5 ${c.id === selectedId ? 'text-green-700' : 'text-gray-900'}`}>{fmt(c.solde)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Détail du compte sélectionné (droite) ─────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">

        {/* En-tête compte */}
        <div className="shrink-0 rounded-xl bg-green-900 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-green-400">{selected.banque} · {selected.devise}</p>
            <p className="text-sm font-semibold text-white mt-0.5">{selected.intitule}</p>
            <p className="text-[11px] font-mono text-green-400 mt-0.5">{selected.numero || '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-green-400">Solde actuel</p>
            <p className="text-2xl font-black text-white">{fmt(selected.solde)}</p>
          </div>
        </div>

        {/* Opérations */}
        <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-100 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-gray-900">
              Opérations
              <span className="ml-2 text-xs font-normal text-gray-400">
                {isFiltered
                  ? `${filteredOperations.length} / ${selected.operations.length}`
                  : selected.operations.length} mouvement{(isFiltered ? filteredOperations.length : selected.operations.length) !== 1 ? 's' : ''}
              </span>
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtre par date */}
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1">
                <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Du</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="text-xs bg-transparent focus:outline-none text-gray-700"
                />
                <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">au</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="text-xs bg-transparent focus:outline-none text-gray-700"
                />
                {isFiltered && (
                  <button
                    onClick={() => { setDateFrom(''); setDateTo('') }}
                    title="Réinitialiser le filtre"
                    className="ml-0.5 rounded text-gray-400 hover:text-red-500 px-1 text-sm leading-none"
                  >×</button>
                )}
              </div>
              <button onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                📂 Importer relevé
              </button>
              <button onClick={() => setShowAddOp(true)}
                className="flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
                <span className="text-base leading-none">+</span> Saisir
              </button>
            </div>
          </div>

          {filteredOperations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              {selected.operations.length === 0
                ? 'Aucune opération enregistrée'
                : `Aucune opération entre ${dateFrom || '—'} et ${dateTo || '—'}`}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Libellé</th>
                    <th className="px-4 py-2.5 text-right">Débit</th>
                    <th className="px-4 py-2.5 text-right">Crédit</th>
                    <th className="px-2 py-2.5 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOperations.map(op => (
                    <tr key={op.id} className="group hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(op.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        <button onClick={() => setEditingOp(op)}
                          className="text-left hover:text-green-700 hover:underline transition-colors"
                          title="Modifier cette opération">
                          {op.libelle}
                        </button>
                        {op.piece && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <a href={op.piece.url} target="_blank" rel="noreferrer"
                              title={op.piece.name}
                              className="flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-800 hover:underline max-w-[180px]">
                              <span>📎</span>
                              <span className="truncate">{op.piece.name}</span>
                            </a>
                            <button onClick={() => removePieceFromOp(op.id)} title="Retirer la pièce"
                              className="text-gray-300 hover:text-red-500 text-xs leading-none transition-colors">×</button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-red-500">
                        {op.montant < 0 ? fmt(op.montant) : ''}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-green-600">
                        {op.montant >= 0 ? fmt(op.montant) : ''}
                      </td>
                      <td className="px-2 py-2.5 w-20">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <label title="Joindre une pièce justificative"
                            className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:bg-blue-50 hover:text-blue-600 cursor-pointer text-xs">
                            <input type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.webp"
                              onChange={e => { const f = e.target.files?.[0]; if (f) attachPiece(op.id, f); e.target.value = '' }} />
                            📎
                          </label>
                          <button onClick={() => setEditingOp(op)} title="Modifier"
                            className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:bg-blue-50 hover:text-blue-600 text-xs">
                            ✎
                          </button>
                          <button onClick={() => deleteOperation(op.id)} title="Supprimer"
                            className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500 text-sm font-bold">
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isFiltered && filteredOperations.length > 0 && (
            <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs">
              <span className="text-gray-500">
                Total période : <strong className="text-gray-700">{filteredOperations.length}</strong> opération{filteredOperations.length > 1 ? 's' : ''}
              </span>
              <span className={`font-semibold ${filteredTotal >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                Solde net : {fmt(filteredTotal)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddCompte && <ModalCompte onSave={addCompte} onClose={() => setShowAddCompte(false)} {...(agenceNom ? { defaultAgence: agenceNom } : {})} />}
      {showAddOp && <ModalOperation compte={selected} onSave={addOperation} onClose={() => setShowAddOp(false)} />}
      {editingOp && <ModalOperation compte={selected} initialOp={editingOp} onSave={updateOperation} onClose={() => setEditingOp(null)} />}
      {showImport && (
        <ModalImportReleve
          compte={selected}
          onImport={importReleve}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Toast import */}
      {importToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {importToast}
        </div>
      )}
    </div>
  )
}
