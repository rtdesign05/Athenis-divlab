import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface UserRow {
  id: string
  email: string
  accountType: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  platformRole: string
  companyId: string | null
  cabinetId: string | null
}

interface UserListData {
  items: UserRow[]
  total: number
  page: number
  totalPages: number
}

const TYPE_BADGE: Record<string, string> = {
  PERSONAL: 'bg-gray-100 text-gray-600',
  COMPANY:  'bg-blue-100 text-blue-700',
  CABINET:  'bg-purple-100 text-purple-700',
}

const fetchUsers = (page: number, search: string) =>
  api.get<{ success: true; data: UserListData }>('/admin/users', {
    params: { page, limit: 20, ...(search ? { q: search } : {}) },
  }).then(r => r.data.data)

export function UsersPage() {
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, debouncedSearch],
    queryFn: () => fetchUsers(page, debouncedSearch),
    placeholderData: (prev) => prev,
  })

  function handleSearch(v: string) {
    setSearch(v)
    clearTimeout((window as unknown as { _st?: ReturnType<typeof setTimeout> })._st)
    ;(window as unknown as { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => {
      setDebouncedSearch(v)
      setPage(1)
    }, 300)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data ? `${data.total} comptes enregistrés` : 'Chargement…'}
          </p>
        </div>
        <input
          type="search"
          placeholder="Rechercher par email…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-56"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Rôle</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Dernière connexion</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Inscrit le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.items.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {u.email}
                    {u.platformRole === 'SUPER_ADMIN' && (
                      <span className="ml-1.5 rounded bg-green-100 px-1 py-0.5 text-[10px] font-bold text-green-700">SA</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_BADGE[u.accountType] ?? 'bg-gray-100 text-gray-600'}`}>
                      {u.accountType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.platformRole === 'SUPER_ADMIN' ? 'Super Admin' : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                      {u.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('fr') : <span className="text-gray-300">Jamais</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString('fr')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {data.page} / {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={data.page <= 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              ← Précédent
            </button>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={data.page >= data.totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Suivant →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
