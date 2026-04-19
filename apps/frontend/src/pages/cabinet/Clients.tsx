export function CabinetClients() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Portefeuille clients</h2>
          <p className="mt-1 text-sm text-gray-500">Entreprises gérées par votre cabinet</p>
        </div>
        <button className="btn-primary">+ Inviter une entreprise</button>
      </div>
      <div className="card">
        <p className="text-sm text-gray-500">Aucun client pour l'instant. Invitez vos premières entreprises.</p>
      </div>
    </div>
  )
}
