import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function CabinetDashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tableau de bord cabinet</h2>
        <p className="mt-1 text-sm text-gray-500">Vue d'ensemble de votre portefeuille clients</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Clients actifs', value: '—', path: '/cabinet/clients' },
          { label: 'Mandats actifs', value: '—', path: '/cabinet/access' },
          { label: 'Alertes', value: '—', path: '/cabinet/clients' },
        ].map((kpi) => (
          <Link key={kpi.label} to={kpi.path} className="card transition-shadow hover:shadow-card-md">
            <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{kpi.value}</p>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Accès rapide — clients</h3>
          <Link to="/cabinet/clients" className="text-sm font-medium text-forest-700 hover:text-forest-900">
            Voir tout →
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          Connecté en tant que <strong>{user?.email}</strong> · Forfait Premium · Accès illimité
        </p>
      </div>
    </div>
  )
}
