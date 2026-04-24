export function ContratsHRPage() {
  const contrats = [
    { nom: 'Sophie Martin',   type: 'CDI',    poste: 'Responsable marketing', debut: '01/03/2022', fin: null,       statut: 'actif' },
    { nom: 'Thomas Bernard',  type: 'CDD',    poste: 'Développeur web',       debut: '01/01/2026', fin: '31/12/2026', statut: 'actif' },
    { nom: 'Camille Dubois',  type: 'CDI',    poste: 'Comptable',             debut: '15/09/2021', fin: null,       statut: 'actif' },
    { nom: 'Lucas Moreau',    type: 'Alternance', poste: 'Commercial junior', debut: '01/09/2025', fin: '31/08/2026', statut: 'actif' },
    { nom: 'Emma Petit',      type: 'Stage',  poste: 'UX Designer',           debut: '01/04/2026', fin: '30/09/2026', statut: 'actif' },
    { nom: 'Hugo Leroy',      type: 'CDD',    poste: 'Chef de projet',        debut: '01/06/2025', fin: '31/05/2026', statut: 'alerte' },
  ]

  const TYPE_COLOR: Record<string, string> = {
    CDI:        'bg-green-100 text-green-700',
    CDD:        'bg-blue-100 text-blue-700',
    Alternance: 'bg-purple-100 text-purple-700',
    Stage:      'bg-amber-100 text-amber-700',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Contrats</h1>
          <p className="mt-1 text-sm text-gray-500">Gestion des contrats de travail</p>
        </div>
        <button className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors">
          + Nouveau contrat
        </button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
        <span className="text-amber-600 text-lg">⚠</span>
        <p className="text-sm text-amber-800">
          <strong>1 renouvellement à traiter</strong> — Le CDD de Hugo Leroy expire le 31/05/2026.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
              <th className="px-5 py-3">Employé</th>
              <th className="px-5 py-3">Poste</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Début</th>
              <th className="px-5 py-3">Fin</th>
              <th className="px-5 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {contrats.map((c, i) => (
              <tr key={i} className={`hover:bg-gray-50/50 ${c.statut === 'alerte' ? 'bg-amber-50/40' : ''}`}>
                <td className="px-5 py-3 font-medium text-gray-900">{c.nom}</td>
                <td className="px-5 py-3 text-gray-600">{c.poste}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLOR[c.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {c.type}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600">{c.debut}</td>
                <td className="px-5 py-3 text-gray-600">{c.fin ?? '—'}</td>
                <td className="px-5 py-3">
                  {c.statut === 'alerte' ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">⚠ Renouveler</span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Actif</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
