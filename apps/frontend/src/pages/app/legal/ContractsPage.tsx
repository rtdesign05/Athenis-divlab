import { useState } from 'react'
import {
  useContracts, useCreateContract, useUpdateContract, useDeleteContract, useSendSignature,
} from '@/hooks/useLegal'
import type { ContractType, ContractStatus, ContractParty, LegalContract } from '@/services/legalApi'

const TYPE_LABEL: Record<ContractType, string> = {
  EMPLOYMENT: 'Contrat de travail', SERVICE: 'Prestation de services',
  NDA: 'NDA / Confidentialité', PARTNERSHIP: 'Partenariat',
  LEASE: 'Bail', SUPPLIER: 'Fournisseur', CLIENT: 'Client', OTHER: 'Autre',
}

const STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: 'Brouillon', PENDING_SIGNATURE: 'En attente de signature',
  SIGNED: 'Signé', EXPIRED: 'Expiré', TERMINATED: 'Résilié',
}

const STATUS_BADGE: Record<ContractStatus, string> = {
  DRAFT:             'bg-gray-100 text-gray-600',
  PENDING_SIGNATURE: 'bg-yellow-100 text-yellow-700',
  SIGNED:            'bg-green-100 text-green-700',
  EXPIRED:           'bg-red-100 text-red-600',
  TERMINATED:        'bg-gray-200 text-gray-500',
}

// ── Create modal ──────────────────────────────────────────────────────────────
function CreateModal({ onClose }: { onClose: () => void }) {
  const create = useCreateContract()
  const [title, setTitle]     = useState('')
  const [type, setType]       = useState<ContractType>('SERVICE')
  const [expiresAt, setExpiresAt] = useState('')
  const [notes, setNotes]     = useState('')
  const [parties, setParties] = useState<ContractParty[]>([{ name: '', email: '', role: '' }])

  const addParty = () => setParties(p => [...p, { name: '', email: '', role: '' }])
  const updateParty = (i: number, field: keyof ContractParty, val: string) =>
    setParties(p => p.map((x, j) => j === i ? { ...x, [field]: val } : x))
  const removeParty = (i: number) => setParties(p => p.filter((_, j) => j !== i))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await create.mutateAsync({
      title, type,
      parties: parties.filter(p => p.name && p.email),
      ...(expiresAt ? { expiresAt } : {}),
      ...(notes ? { notes } : {}),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Nouveau contrat</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Titre</label>
            <input required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex : Contrat de prestation client X" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={type} onChange={e => setType(e.target.value as ContractType)}>
              {(Object.entries(TYPE_LABEL) as [ContractType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date d'expiration</label>
            <input type="date" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>
          {/* Parties */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Parties</label>
              <button type="button" onClick={addParty}
                className="text-xs font-medium text-blue-600 hover:text-blue-700">+ Ajouter</button>
            </div>
            <div className="space-y-2">
              {parties.map((p, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-3 gap-1">
                    <input placeholder="Nom" className="rounded border border-gray-300 px-2 py-1 text-xs"
                      value={p.name} onChange={e => updateParty(i, 'name', e.target.value)} />
                    <input placeholder="Email" className="rounded border border-gray-300 px-2 py-1 text-xs"
                      value={p.email} onChange={e => updateParty(i, 'email', e.target.value)} />
                    <input placeholder="Rôle" className="rounded border border-gray-300 px-2 py-1 text-xs"
                      value={p.role ?? ''} onChange={e => updateParty(i, 'role', e.target.value)} />
                  </div>
                  {parties.length > 1 && (
                    <button type="button" onClick={() => removeParty(i)}
                      className="text-xs text-red-400 hover:text-red-600 mt-1">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={create.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              {create.isPending ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Signature modal ───────────────────────────────────────────────────────────
function SignatureModal({ contract, onClose }: { contract: LegalContract; onClose: () => void }) {
  const send = useSendSignature()
  const [signerName, setSignerName]   = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [signerRole, setSignerRole]   = useState('')
  const [linkGenerated, setLinkGenerated] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await send.mutateAsync({
      id: contract.id,
      dto: { signerName, signerEmail, ...(signerRole ? { signerRole } : {}) },
    })
    setLinkGenerated(result.signLink)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Demande de signature</h2>
        <p className="mb-4 text-sm text-gray-500">{contract.title}</p>

        {linkGenerated ? (
          <div className="space-y-3">
            <p className="text-sm text-green-700 font-medium">Lien de signature généré :</p>
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 break-all">{window.location.origin}{linkGenerated}</div>
            <p className="text-xs text-gray-400">Partagez ce lien avec le signataire. Il peut signer directement sans compte.</p>
            <button onClick={onClose}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom du signataire</label>
              <input required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={signerName} onChange={e => setSignerName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={signerEmail} onChange={e => setSignerEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Rôle / qualité (optionnel)</label>
              <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={signerRole} onChange={e => setSignerRole(e.target.value)} placeholder="Ex : Directeur général" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
              <button type="submit" disabled={send.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                {send.isPending ? 'Envoi…' : 'Générer le lien'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function ContractsPage() {
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'ALL'>('ALL')
  const [showCreate, setShowCreate]     = useState(false)
  const [signContract, setSignContract] = useState<LegalContract | null>(null)

  const contracts   = useContracts(statusFilter !== 'ALL' ? { status: statusFilter } : undefined)
  const updateCtr   = useUpdateContract()
  const deleteCtr   = useDeleteContract()

  const statuses: (ContractStatus | 'ALL')[] = ['ALL', 'DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'EXPIRED', 'TERMINATED']

  const kpis = [
    { label: 'Total',      value: contracts.data?.length ?? '—',                                            color: 'text-gray-900' },
    { label: 'Signés',     value: contracts.data?.filter(c => c.status === 'SIGNED').length ?? '—',         color: 'text-green-600' },
    { label: 'En attente', value: contracts.data?.filter(c => c.status === 'PENDING_SIGNATURE').length ?? '—', color: 'text-yellow-600' },
    { label: 'Expirés',    value: contracts.data?.filter(c => c.status === 'EXPIRED').length ?? '—',        color: 'text-red-600' },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrats</h1>
          <p className="text-sm text-gray-500">Bibliothèque et workflow de signature</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Nouveau contrat
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {statuses.map(s => (
          <button key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {s === 'ALL' ? 'Tous' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        {contracts.isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : contracts.data?.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucun contrat</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Titre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Parties</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Expiration</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contracts.data?.map(c => {
                const expSoon = c.expiresAt && new Date(c.expiresAt) < new Date(Date.now() + 30 * 86_400_000)
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.title}</p>
                      {(c._count?.alerts ?? 0) > 0 && (
                        <span className="text-xs text-red-500">{c._count!.alerts} alerte(s)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{TYPE_LABEL[c.type]}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {(c.parties as ContractParty[]).map((p, i) => (
                          <p key={i} className="text-xs text-gray-600">{p.name}{p.role ? ` (${p.role})` : ''}</p>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.expiresAt ? (
                        <span className={`text-xs ${expSoon ? 'font-medium text-red-600' : 'text-gray-500'}`}>
                          {expSoon ? '⚠ ' : ''}{new Date(c.expiresAt).toLocaleDateString('fr-FR')}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {c.status === 'DRAFT' && (
                          <button onClick={() => setSignContract(c)}
                            className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
                            Signer
                          </button>
                        )}
                        {c.status === 'SIGNED' && (
                          <button
                            onClick={() => updateCtr.mutate({ id: c.id, dto: { status: 'TERMINATED' } })}
                            className="rounded px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50">
                            Résilier
                          </button>
                        )}
                        <button
                          onClick={() => { if (confirm('Supprimer ce contrat ?')) deleteCtr.mutate(c.id) }}
                          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                          Suppr.
                        </button>
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
      {signContract && <SignatureModal contract={signContract} onClose={() => setSignContract(null)} />}
    </div>
  )
}
