import { useState } from 'react'
import { useCsrdReport } from '@/hooks/useEsg'
import { PdfButton } from '@/shared/components/ui/PdfButton'
import { usePdf } from '@/shared/hooks/usePdf'

type Referentiel = 'CSRD' | 'GRI' | 'DPEF'

const SECTIONS = [
  { esrs: 'ESRS 1', titre: 'Exigences générales',           statut: 'complet',    pct: 100 },
  { esrs: 'ESRS 2', titre: 'Informations générales',         statut: 'complet',    pct: 100 },
  { esrs: 'ESRS E1', titre: 'Changement climatique',         statut: 'partiel',    pct: 72  },
  { esrs: 'ESRS E3', titre: 'Ressources en eau',             statut: 'partiel',    pct: 55  },
  { esrs: 'ESRS E5', titre: 'Ressources et économie circulaire', statut: 'partiel', pct: 48 },
  { esrs: 'ESRS S1', titre: 'Personnel de l\'entreprise',    statut: 'complet',    pct: 90  },
  { esrs: 'ESRS S2', titre: 'Travailleurs chaîne de valeur', statut: 'partiel',    pct: 40  },
  { esrs: 'ESRS G1', titre: 'Conduite des affaires',         statut: 'complet',    pct: 85  },
]

export function RapportPage() {
  const [year, setYear] = useState(new Date().getFullYear() - 1)
  const [referentiel, setReferentiel] = useState<Referentiel>('CSRD')
  const report = useCsrdReport(year)
  const { downloadEsgRapport } = usePdf()

  const overall = Math.round(SECTIONS.reduce((s, r) => s + r.pct, 0) / SECTIONS.length)

  const STATUS_CLS: Record<string, string> = {
    complet: 'bg-green-100 text-green-700',
    partiel: 'bg-amber-100 text-amber-700',
    manquant: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Rapport ESG</h1>
          <p className="mt-1 text-sm text-gray-500">Rapport de durabilité — exercice {year}</p>
        </div>
        <div className="flex gap-2">
          <select
            value={referentiel}
            onChange={(e) => setReferentiel(e.target.value as Referentiel)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            <option value="CSRD">CSRD / ESRS</option>
            <option value="GRI">GRI Standards</option>
            <option value="DPEF">DPEF</option>
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            {[2023, 2024, 2025].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <PdfButton
            onDownload={() => downloadEsgRapport({ year, referentiel })}
            label="Exporter PDF"
            className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors disabled:opacity-60"
          />
        </div>
      </div>

      {/* Progression globale */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Complétude du rapport {referentiel}</p>
          <span className={`text-lg font-bold ${overall >= 80 ? 'text-green-600' : overall >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{overall}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-forest-500 transition-all" style={{ width: `${overall}%` }} />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {SECTIONS.filter((s) => s.statut === 'complet').length} sections complètes ·{' '}
          {SECTIONS.filter((s) => s.statut === 'partiel').length} partielles ·{' '}
          {SECTIONS.filter((s) => s.statut === 'manquant').length} manquantes
        </p>
      </div>

      {/* Sections */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Sections du rapport {referentiel}</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {SECTIONS.map((s, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <div className="w-24 shrink-0">
                <span className="rounded bg-forest-100 px-2 py-0.5 text-xs font-mono font-medium text-forest-800">{s.esrs}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">{s.titre}</p>
                <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all ${s.pct >= 80 ? 'bg-green-500' : s.pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">{s.pct}%</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[s.statut]}`}>
                  {s.statut.charAt(0).toUpperCase() + s.statut.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {report.isLoading && (
        <p className="text-center text-sm text-gray-400">Chargement des données du rapport…</p>
      )}
    </div>
  )
}
