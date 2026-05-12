import { useEffect, useState } from 'react'
import { usePdf } from '@/shared/hooks/usePdf'

export function CahierChargesDownloadPage() {
  const { downloadCahierCharges } = usePdf()
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')

  useEffect(() => {
    setStatus('generating')
    downloadCahierCharges()
      .then(() => setStatus('done'))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-6">
      <div className="bg-white rounded-2xl shadow-md p-10 flex flex-col items-center gap-4 max-w-sm w-full">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">📄</div>
        <h1 className="text-lg font-bold text-gray-900">Cahier des Charges</h1>

        {status === 'generating' && (
          <>
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 text-center">Génération du PDF en cours…<br/>Cela peut prendre quelques secondes.</p>
          </>
        )}

        {status === 'done' && (
          <>
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-xl">✓</div>
            <p className="text-sm text-green-700 font-medium text-center">PDF téléchargé avec succès !</p>
            <button
              onClick={() => { setStatus('generating'); downloadCahierCharges().then(() => setStatus('done')) }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Télécharger à nouveau
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xl">✕</div>
            <p className="text-sm text-red-600 text-center">Une erreur est survenue.</p>
            <button
              onClick={() => { setStatus('generating'); downloadCahierCharges().then(() => setStatus('done')).catch(() => setStatus('error')) }}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
            >
              Réessayer
            </button>
          </>
        )}
      </div>
    </div>
  )
}
