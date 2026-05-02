import { useAuth } from '@/hooks/useAuth'

const FEATURES = [
  { icon: '💼', label: 'Portefeuille clients illimité' },
  { icon: '🔑', label: 'Gestion des mandats multi-entreprises' },
  { icon: '📊', label: 'Tableaux de bord consolidés' },
  { icon: '⚠', label: 'Alertes factures en temps réel' },
  { icon: '👥', label: 'Vue employés multi-sociétés' },
  { icon: '🔒', label: 'Accès cloisonné par mandat' },
  { icon: '📧', label: 'Support prioritaire par e-mail' },
  { icon: '🔄', label: 'Synchronisation automatique des données' },
]

export function CabinetBilling() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Facturation & Abonnement</h2>
        <p className="mt-1 text-sm text-gray-500">
          Détails de votre abonnement cabinet
        </p>
      </div>

      {/* Current plan card */}
      <div className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full bg-amber-100 px-3 py-0.5 text-sm font-semibold text-amber-800">
                ⭐ Plan Premium Cabinet
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">Accès illimité</p>
            <p className="mt-1 text-sm text-gray-500">
              Compte cabinet · {user?.email}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Renouvellement</p>
            <p className="mt-1 text-sm font-semibold text-gray-700">Contacter le support</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-amber-200 bg-amber-50/60 px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
            Fonctionnalités incluses
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon, label }) => (
              <div key={label} className="flex items-start gap-2">
                <span className="mt-0.5 text-base leading-none">{icon}</span>
                <p className="text-sm text-gray-700">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Type de compte</p>
          <p className="mt-2 text-lg font-bold text-gray-900">Cabinet comptable</p>
          <p className="mt-0.5 text-xs text-gray-500">Accès multi-entreprises avec gestion des mandats</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Clients max</p>
          <p className="mt-2 text-lg font-bold text-gray-900">Illimité</p>
          <p className="mt-0.5 text-xs text-gray-500">Aucune limite sur le nombre d'entreprises</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Support</p>
          <p className="mt-2 text-lg font-bold text-gray-900">Prioritaire</p>
          <p className="mt-0.5 text-xs text-gray-500">Réponse sous 24h ouvrées</p>
        </div>
      </div>

      {/* Contact support */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-900">Besoin d'aide ou de modifier votre abonnement ?</p>
            <p className="mt-0.5 text-sm text-gray-500">
              Notre équipe est disponible pour vous accompagner.
            </p>
          </div>
          <a
            href="mailto:support@athenis.com"
            className="btn-primary shrink-0"
          >
            Contacter le support
          </a>
        </div>
      </div>

    </div>
  )
}
