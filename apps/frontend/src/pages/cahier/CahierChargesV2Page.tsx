import { useEffect, useRef, useState } from 'react'
import { usePdf } from '@/shared/hooks/usePdf'

export default function CahierChargesV2Page() {
  const { downloadCahierChargesV2 } = usePdf()
  const [status, setStatus] = useState<'generating' | 'done' | 'error'>('generating')
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true
    downloadCahierChargesV2()
      .then(() => setStatus('done'))
      .catch(() => setStatus('error'))
  }, [downloadCahierChargesV2])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-6 py-12 bg-white rounded-xl shadow-md">
        {status === 'generating' && (
          <>
            <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Génération en cours…</h1>
            <p className="text-sm text-gray-500">
              Préparation du Cahier des Charges v2.0 stratégique.<br />
              Cela peut prendre quelques secondes.
            </p>
          </>
        )}
        {status === 'done' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Téléchargement lancé</h1>
            <p className="text-sm text-gray-500 mb-6">
              Le fichier <strong>Athenis_CahierDesCharges_v2.0_Strategique.pdf</strong> a été
              téléchargé dans votre dossier Téléchargements.
            </p>
            <button
              onClick={() => { calledRef.current = false; setStatus('generating'); downloadCahierChargesV2().then(() => setStatus('done')).catch(() => setStatus('error')) }}
              className="text-sm text-green-700 underline hover:text-green-900"
            >
              Télécharger à nouveau
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Erreur de génération</h1>
            <p className="text-sm text-gray-500 mb-6">
              La génération du PDF a échoué. Veuillez réessayer.
            </p>
            <button
              onClick={() => { calledRef.current = false; setStatus('generating'); downloadCahierChargesV2().then(() => setStatus('done')).catch(() => setStatus('error')) }}
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
