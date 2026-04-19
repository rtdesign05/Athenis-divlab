export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
        <p className="mt-1 text-sm text-gray-500">Vue d'ensemble de votre situation financière</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(['Solde total', 'Revenus', 'Dépenses', 'Économies'] as const).map((label) => (
          <div key={label} className="card">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">—</p>
          </div>
        ))}
      </div>
    </div>
  )
}
