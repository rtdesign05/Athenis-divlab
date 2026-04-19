export function PersonalDashboard() {

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Bonjour 👋
        </h2>
        <p className="mt-1 text-sm text-gray-500">Votre situation financière personnelle</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Solde estimé', value: '—', color: 'text-gray-900' },
          { label: 'Revenus du mois', value: '—', color: 'text-green-600' },
          { label: 'Dépenses du mois', value: '—', color: 'text-red-500' },
          { label: 'Taux d\'épargne', value: '—', color: 'text-forest-700' },
        ].map((kpi) => (
          <div key={kpi.label} className="card">
            <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
            <p className={`mt-2 text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <p className="text-sm text-gray-500">
          Les modules budget seront disponibles prochainement. Commencez par renseigner vos revenus et dépenses.
        </p>
      </div>
    </div>
  )
}
