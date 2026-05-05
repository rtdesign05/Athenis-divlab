import { useContracts } from '@/hooks/useLegal'

const TYPE_LABEL: Record<string, string> = {
  EMPLOYMENT: 'Contrat de travail', SERVICE: 'Prestation de services',
  NDA: 'NDA / Confidentialité', PARTNERSHIP: 'Partenariat',
  LEASE: 'Bail', SUPPLIER: 'Fournisseur', CLIENT: 'Client', OTHER: 'Autre',
}

const TYPE_COLOR: Record<string, string> = {
  EMPLOYMENT: 'bg-blue-100 text-blue-700',
  SERVICE:    'bg-purple-100 text-purple-700',
  NDA:        'bg-gray-100 text-gray-600',
  PARTNERSHIP:'bg-green-100 text-green-700',
  LEASE:      'bg-orange-100 text-orange-700',
  SUPPLIER:   'bg-red-100 text-red-700',
  CLIENT:     'bg-teal-100 text-teal-700',
  OTHER:      'bg-gray-100 text-gray-600',
}

export function ContratsExpiresPage() {
  const { data: contracts = [], isLoading } = useContracts()

  const expired = contracts
    .filter((c) => c.status === 'EXPIRED' || c.status === 'TERMINATED')
    .sort((a, b) => {
      const da = a.expiresAt ?? a.createdAt
      const db = b.expiresAt ?? b.createdAt
      return db.localeCompare(da)
    })

  const byType: Record<string, number> = {}
  for (const c of expired) byType[c.type] = (byType[c.type] ?? 0) + 1

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-forest-900 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrats expirés</h1>
          <p className="mt-1 text-sm text-gray-500">Historique des contrats expirés et résiliés</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-bold text-gray-800">{expired.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">contrat{expired.length !== 1 ? 's' : ''} archivé{expired.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Stats par type */}
      {expired.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byType).map(([type, count]) => (
            <span key={type} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${TYPE_COLOR[type] ?? 'bg-gray-100 text-gray-600'}`}>
              {TYPE_LABEL[type] ?? type}
              <span className="rounded-full bg-white/60 px-1.5 font-semibold">{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {expired.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-4xl mb-3">📁</p>
            <p className="text-sm font-semibold text-gray-500">Aucun contrat expiré</p>
            <p className="text-xs text-gray-400 mt-1">Les contrats expirés ou résiliés apparaîtront ici</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Titre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Parties</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiration</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expired.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.title}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[c.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABEL[c.type] ?? c.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.parties?.map((p) => p.name).join(', ') ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.status === 'TERMINATED' ? (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-700">Résilié</span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600">Expiré</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
