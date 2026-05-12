import { useEffect, useRef, useState } from 'react'
import { usePdf } from '@/shared/hooks/usePdf'

export default function InvestorDeckPage() {
  const { downloadInvestorDeck } = usePdf()
  const [status, setStatus] = useState<'generating' | 'done' | 'error'>('generating')
  const calledRef = useRef(false)

  const run = () => {
    calledRef.current = true
    setStatus('generating')
    downloadInvestorDeck()
      .then(() => setStatus('done'))
      .catch(() => setStatus('error'))
  }

  useEffect(() => {
    if (calledRef.current) return
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-950 to-green-800">
      <div className="text-center max-w-lg px-8 py-14 bg-white rounded-2xl shadow-2xl">
        {status === 'generating' && (
          <>
            <div className="w-14 h-14 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Génération en cours…</h1>
            <p className="text-sm text-gray-500">
              Compilation des 29 captures d'écran + contenu<br />
              <strong>Athenis Investor Deck 2026</strong><br />
              Cela peut prendre 15–30 secondes.
            </p>
          </>
        )}
        {status === 'done' && (
          <>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Investor Deck généré ✅</h1>
            <p className="text-sm text-gray-500 mb-2">
              Fichier téléchargé :
            </p>
            <p className="text-sm font-bold text-green-700 mb-6">
              Athenis_InvestorDeck_2026_Confidentiel.pdf
            </p>
            <button onClick={run} className="text-sm text-green-700 underline hover:text-green-900">
              Télécharger à nouveau
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Erreur</h1>
            <p className="text-sm text-gray-500 mb-6">La génération a échoué. Vérifiez que le serveur frontend est bien actif sur le port 5173.</p>
            <button onClick={run} className="px-5 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
              Réessayer
            </button>
          </>
        )}
      </div>
    </div>
  )
}
