import { useNavigate, Link } from 'react-router-dom'
import type { AccountType } from '@athenis/shared-types'

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="40" height="40" viewBox="0 0 100 100" className="text-green-400">
        <polygon points="50,10 90,90 10,90" fill="currentColor" opacity="0.9" />
        <polygon points="50,25 75,90 25,90" fill="white" opacity="0.15" />
      </svg>
      <span className="text-2xl font-bold text-white">Athenis</span>
    </div>
  )
}

interface CardProps {
  type: AccountType
  icon: string
  title: string
  subtitle: string
  features: string[]
  color: string
  onClick: () => void
}

function Card({ icon, title, subtitle, features, color, onClick }: CardProps) {
  return (
    <button
      onClick={onClick}
      className="group w-full bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all border border-gray-100 text-left cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <div className={`w-14 h-14 flex items-center justify-center rounded-xl text-2xl shrink-0 ${color}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mb-3">{subtitle}</p>
            <ul className="text-sm text-gray-600 space-y-1">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="text-green-500 text-xs">✔</span> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <span className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all text-lg mt-1 shrink-0">
          →
        </span>
      </div>
    </button>
  )
}

const CARDS: Omit<CardProps, 'onClick'>[] = [
  {
    type: 'PERSONAL',
    icon: '👤',
    title: 'Personne physique',
    subtitle: 'Gérez vos finances personnelles',
    color: 'bg-purple-100 text-purple-600',
    features: ['Budget personnel', 'Suivi des dépenses', 'Épargne et objectifs', 'Revenus et patrimoine'],
  },
  {
    type: 'COMPANY',
    icon: '🏢',
    title: 'PME / Entreprise',
    subtitle: 'Pilotez votre entreprise avec précision',
    color: 'bg-blue-100 text-blue-600',
    features: ['Gestion financière complète', 'Facturation & devis', 'Suivi de trésorerie', 'Tableaux de bord avancés'],
  },
  {
    type: 'CABINET',
    icon: '⚖️',
    title: 'Cabinet comptable',
    subtitle: 'Gérez plusieurs clients efficacement',
    color: 'bg-orange-100 text-orange-600',
    features: ['Gestion multi-clients', 'Dossiers & collaborateurs', 'Automatisation comptable', 'Reporting & conformité'],
  },
]

export function AccountTypePage() {
  const navigate = useNavigate()

  function select(type: AccountType) {
    navigate(`/auth/register/form?type=${type}`)
  }

  return (
    <div className="athenis-auth-page min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-green-950 via-green-900 to-green-800 text-white px-6 py-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.15),transparent)]" />
        <div className="relative max-w-2xl mx-auto">
          <Logo />
          <h1 className="text-3xl md:text-4xl font-bold mt-6">
            Quel type de compte souhaitez-vous créer ?
          </h1>
          <p className="text-green-200 mt-2">
            Choisissez la solution la plus adaptée à vos besoins
          </p>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Cards */}
      <div className="max-w-2xl mx-auto -mt-4 px-6 pb-10 space-y-4">

        {CARDS.map((card) => (
          <Card key={card.type} {...card} onClick={() => select(card.type)} />
        ))}

        {/* Login CTA */}
        <div className="text-center pt-4">
          <p className="text-gray-500 text-sm">
            Déjà un compte ?{' '}
            <Link to="/auth/login" className="text-green-700 font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>

        {/* Trust footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 text-sm text-gray-500 text-center">
          <div>🔒 Sécurisé</div>
          <div>🛡️ Données protégées</div>
          <div>🎧 Support 24/7</div>
          <div>🌍 Conformité OHADA / GDPR</div>
        </div>
      </div>
    </div>
  )
}
