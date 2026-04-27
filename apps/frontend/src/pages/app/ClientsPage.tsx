import React, { useState, useCallback } from 'react'
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { SkeletonTable } from '@/shared/components/feedback/Skeleton'
import { Button } from '@/shared/components/ui/Button'
import { Modal } from '@/shared/components/ui/Modal'
import type { Client, CreateClientDto } from '@/services/clientsApi'

function ReliabilityBadge({ score }: { score?: number }) {
  if (score === undefined) return null
  const color = score >= 80 ? 'text-green-600 bg-green-50' : score >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'
  const label = score >= 80 ? 'Fiable' : score >= 50 ? 'Moyen' : 'Risqué'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      <span className="font-bold">{score}</span>/100 · {label}
    </span>
  )
}

interface ClientCardProps { client: Client; onEdit: (c: Client) => void; onDelete: (id: string) => void }
const ClientCard = React.memo(function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  return (
    <div className="card hover:shadow-card-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{client.name}</p>
          {client.email && <p className="text-sm text-gray-500 truncate">{client.email}</p>}
          {client.phone && <p className="text-sm text-gray-400">{client.phone}</p>}
          {client.siren && <p className="text-xs text-gray-400 mt-1">SIREN : {client.siren}</p>}
        </div>
        <div className="flex gap-2 ml-4 shrink-0">
          <button onClick={() => onEdit(client)} className="text-xs text-forest-700 hover:text-forest-900 font-medium">Modifier</button>
          <button onClick={() => onDelete(client.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Supprimer</button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {client._count && (
          <p className="text-xs text-gray-400">{client._count.invoices} facture{client._count.invoices !== 1 ? 's' : ''}</p>
        )}
        {client.reliabilityScore !== undefined && <ReliabilityBadge score={client.reliabilityScore} />}
      </div>
    </div>
  )
})

const EMPTY_FORM: CreateClientDto = { name: '', email: '', phone: '', address: '', siren: '' }

function ClientModal({ open, initial, onClose }: { open: boolean; initial?: Client; onClose: () => void }) {
  const create = useCreateClient()
  const update = useUpdateClient()
  const [form, setForm] = useState<CreateClientDto>(() =>
    initial
      ? { name: initial.name, ...(initial.email    ? { email:   initial.email }   : {}),
                               ...(initial.phone    ? { phone:   initial.phone }   : {}),
                               ...(initial.address  ? { address: initial.address } : {}),
                               ...(initial.siren    ? { siren:   initial.siren }   : {}) }
      : { ...EMPTY_FORM }
  )

  const f = useCallback(<K extends keyof CreateClientDto>(k: K, v: CreateClientDto[K]) =>
    setForm(p => ({ ...p, [k]: v })), [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const dto = { ...form }
    if (initial) await update.mutateAsync({ id: initial.id, dto })
    else await create.mutateAsync(dto)
    onClose()
  }, [create, update, form, initial, onClose])

  const isPending = create.isPending || update.isPending
  const isError   = create.isError   || update.isError

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifier le client' : 'Nouveau client'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Raison sociale *</label>
          <input required className="input mt-1" value={form.name} onChange={e => f('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input mt-1" value={form.email ?? ''} onChange={e => f('email', e.target.value || undefined)} />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input className="input mt-1" value={form.phone ?? ''} onChange={e => f('phone', e.target.value || undefined)} />
          </div>
        </div>
        <div>
          <label className="label">Adresse</label>
          <input className="input mt-1" value={form.address ?? ''} onChange={e => f('address', e.target.value || undefined)} />
        </div>
        <div>
          <label className="label">SIREN</label>
          <input className="input mt-1" maxLength={9} placeholder="123456789" value={form.siren ?? ''} onChange={e => f('siren', e.target.value || undefined)} />
        </div>
        {isError && <p className="text-sm text-red-600">Une erreur est survenue.</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={isPending}>{initial ? 'Enregistrer' : 'Ajouter'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function ClientsPage() {
  const [search, setSearch]   = useState('')
  const [editing, setEditing] = useState<Client | undefined>()
  const [creating, setCreating] = useState(false)

  const { data: clients, isLoading } = useClients(search || undefined)
  const deleteClient = useDeleteClient()

  const handleDelete = useCallback((id: string) => {
    if (confirm('Supprimer ce client ? Les factures associées seront conservées.')) {
      deleteClient.mutate(id)
    }
  }, [deleteClient])

  const closeModal = useCallback(() => { setEditing(undefined); setCreating(false) }, [])

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
            <p className="mt-1 text-sm text-gray-500">{clients?.length ?? 0} client{(clients?.length ?? 0) !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => setCreating(true)}>+ Ajouter un client</Button>
        </div>

        <div className="relative">
          <input
            className="input pl-10 w-full sm:max-w-sm"
            placeholder="Rechercher par nom, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
          </svg>
        </div>

        {isLoading ? <SkeletonTable rows={5} /> : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients?.length ? clients.map(c => (
              <ClientCard key={c.id} client={c} onEdit={setEditing} onDelete={handleDelete} />
            )) : (
              <p className="col-span-3 py-12 text-center text-sm text-gray-400">Aucun client trouvé</p>
            )}
          </div>
        )}
      </div>

      <ClientModal open={creating || !!editing} {...(editing ? { initial: editing } : {})} onClose={closeModal} />
    </ErrorBoundary>
  )
}
