import { useState } from 'react'
import { useLiasse } from '@/hooks/useFiscal'

const YEARS = [2024, 2025, 2026]

const SOURCE_LABEL: Record<string, string> = {
  comptabilite: 'Module Comptabilité',
  fiscal: 'Module Fiscalité',
  rh: 'Module RH',
}

export function LiassePage() {
  const [year, setYear] = useState(2025)
  const { data, isLoading } = useLiasse(year)

  if (isLoading) return <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Liasse fiscale</h1>
        <p className="mt-0.5 text-sm text-gray-500">Documents fiscaux obligatoires à joindre à la DSF · DGI Cameroun</p>
      </div>

      {/* Year selector */}
      <div className="flex gap-2">
        {YEARS.map(y => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${y === year ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Progression : {data.done}/{data.total} documents</p>
          <span className="text-sm font-bold text-blue-700">{data.progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${data.progress}%` }}
          />
        </div>
      </div>

      {/* Documents list */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-800">Documents obligatoires — Exercice {year}</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {data.documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-4 px-5 py-4">
              <div className={`flex h-5 w-5 items-center justify-center rounded text-sm ${doc.available ? 'text-green-600' : 'text-gray-300'}`}>
                {doc.available ? '☑' : '☐'}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${doc.available ? 'text-gray-900' : 'text-gray-500'}`}>
                  {doc.label}
                  {doc.required && <span className="ml-1 text-xs text-gray-400">*</span>}
                </p>
                <p className="text-xs text-gray-400">{SOURCE_LABEL[doc.source] ?? doc.source}</p>
              </div>
              <div className="flex gap-2">
                {doc.available ? (
                  <>
                    <button className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">Voir</button>
                    <button className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">Télécharger</button>
                  </>
                ) : (
                  <button className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50">Générer</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assemble button */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-sm font-semibold text-blue-900">Assembler la liasse complète PDF</p>
        <p className="mt-1 text-sm text-blue-700">Génère un PDF unique avec tous les documents disponibles dans l'ordre DGI</p>
        <button className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Générer la liasse ({data.done} documents)
        </button>
      </div>
    </div>
  )
}
