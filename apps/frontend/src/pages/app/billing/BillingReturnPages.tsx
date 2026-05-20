import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { saasBillingApi } from '@/services/saasBillingApi'

// ── /billing/success ─────────────────────────────────────────────────────────

export function BillingSuccessPage() {
  const [searchParams] = useSearchParams()
  const [state, setState] = useState<'loading' | 'ok' | 'pending' | 'mock'>('loading')
  const navigate = useNavigate()
  const isMock = searchParams.get('mock') === '1'

  useEffect(() => {
    if (isMock) { setState('mock'); return }
    saasBillingApi.verifySession()
      .then((s) => setState(s.status === 'ACTIVE' || s.status === 'TRIALING' ? 'ok' : 'pending'))
      .catch(() => setState('pending'))
  }, [isMock])

  useEffect(() => {
    if (state === 'ok' || state === 'mock') {
      const t = setTimeout(() => navigate('/app/settings/facturation'), 5000)
      return () => clearTimeout(t)
    }
  }, [state, navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
        {state === 'loading' && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-forest-700 border-t-transparent" />
            <h1 className="text-lg font-semibold text-gray-900">Confirmation de votre paiement…</h1>
            <p className="mt-2 text-sm text-gray-500">Quelques secondes, on vérifie auprès du processeur de paiement.</p>
          </>
        )}

        {state === 'ok' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">✅</div>
            <h1 className="text-xl font-bold text-gray-900">Abonnement activé !</h1>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              Bienvenue dans la nouvelle ère de ta gestion. Tu reçois un mail de confirmation
              avec ta facture sous quelques minutes.
            </p>
            <p className="mt-4 text-xs text-gray-400">Redirection automatique vers la facturation dans 5 sec…</p>
            <Link to="/app/settings/facturation" className="mt-4 inline-flex items-center rounded-lg bg-forest-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-800">
              Voir mon abonnement
            </Link>
          </>
        )}

        {state === 'pending' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-3xl">⏳</div>
            <h1 className="text-lg font-semibold text-gray-900">Paiement en cours de traitement</h1>
            <p className="mt-2 text-sm text-gray-600">
              Ton paiement est en cours de validation par l'opérateur. Cela peut prendre
              jusqu'à quelques minutes (notamment pour les paiements Mobile Money).
            </p>
            <p className="mt-3 text-xs text-gray-400">
              Tu recevras un mail dès que ton abonnement sera activé.
            </p>
            <Link to="/app/settings/facturation" className="mt-4 inline-flex items-center rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Retour à la facturation
            </Link>
          </>
        )}

        {state === 'mock' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-3xl">🧪</div>
            <h1 className="text-lg font-semibold text-gray-900">Mode test détecté</h1>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              Le processeur de paiement n'est pas encore configuré côté serveur.
              Le flow de paiement marche, mais aucune transaction réelle n'a eu lieu.
            </p>
            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-left text-xs text-blue-900">
              <p className="font-semibold mb-1">Pour activer les vrais paiements :</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>Crée un compte Stripe (cards) et/ou CinetPay (Mobile Money)</li>
                <li>Ajoute les clés API dans /home/ubuntu/athenis/.env sur le VPS</li>
                <li>Redémarre le backend : <code className="bg-blue-100 px-1 rounded">docker compose up -d backend</code></li>
              </ol>
            </div>
            <Link to="/app/settings/facturation" className="mt-5 inline-flex items-center rounded-lg bg-forest-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-800">
              Retour à la facturation
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

// ── /billing/cancel ──────────────────────────────────────────────────────────

export function BillingCancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-3xl">↩️</div>
        <h1 className="text-lg font-semibold text-gray-900">Paiement annulé</h1>
        <p className="mt-3 text-sm text-gray-600">
          Aucun montant n'a été prélevé. Tu peux retenter quand tu veux depuis ta page facturation.
        </p>
        <Link to="/app/settings/facturation" className="mt-5 inline-flex items-center rounded-lg bg-forest-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-800">
          Retour à la facturation
        </Link>
      </div>
    </div>
  )
}
