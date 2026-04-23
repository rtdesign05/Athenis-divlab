import { useState } from 'react'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { Button } from '@/shared/components/ui/Button'
import { api } from '@/lib/api'

const CURRENT_YEAR = new Date().getFullYear()

export function FECPage() {
  const [year, setYear]       = useState(CURRENT_YEAR)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`/accounting/fec`, {
        params:       { year },
        responseType: 'blob',
      })
      const blob     = new Blob([response.data as BlobPart], { type: 'text/plain' })
      const url      = URL.createObjectURL(blob)
      const a        = document.createElement('a')
      a.href         = url
      a.download     = `FEC_${year}_${new Date().toISOString().slice(0, 10)}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Erreur lors de la génération du FEC.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Export FEC</h2>
          <p className="mt-1 text-sm text-gray-500">Fichier des Écritures Comptables conforme DGFiP</p>
        </div>

        <div className="card max-w-lg space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Générer le fichier FEC</h3>
            <p className="text-sm text-gray-500">
              Le FEC (article L47 A du Livre des Procédures Fiscales) est exigible lors d'un contrôle fiscal.
              Il contient l'ensemble des écritures comptables de l'exercice.
            </p>
          </div>

          <div>
            <label className="label mb-1">Exercice fiscal</label>
            <select className="input max-w-xs" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 space-y-1">
            <p className="font-medium">Format généré :</p>
            <ul className="list-disc list-inside text-xs space-y-0.5">
              <li>Séparateur : pipe (|)</li>
              <li>Encodage : UTF-8</li>
              <li>Journaux : VTE (ventes), ACH (achats)</li>
              <li>Comptes PCG : 411, 706, 44571, 401, 607</li>
            </ul>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button onClick={handleDownload} loading={loading} className="w-full">
            Télécharger FEC_{year}.txt
          </Button>
        </div>

        <div className="card max-w-lg">
          <h3 className="font-semibold text-gray-900 mb-3">Structure du fichier FEC</h3>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Colonne', 'Description', 'Exemple'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {[
                  ['JournalCode', 'Code journal', 'VTE'],
                  ['EcritureNum', 'N° écriture', '000001'],
                  ['EcritureDate', 'Date AAAAMMJJ', '20240315'],
                  ['CompteNum', 'N° compte PCG', '411'],
                  ['EcritureLib', 'Libellé', 'Facture FA-2024-001'],
                  ['Debit', 'Débit (virgule)', '12000,00'],
                  ['Credit', 'Crédit (virgule)', '0,00'],
                  ['EcritureLet', 'Code lettrage', 'L0001'],
                ].map(([col, desc, ex]) => (
                  <tr key={col} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 text-forest-700">{col}</td>
                    <td className="px-3 py-1.5 text-gray-600 font-sans">{desc}</td>
                    <td className="px-3 py-1.5 text-gray-400">{ex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
