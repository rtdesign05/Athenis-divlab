import { useState } from 'react'
import { useEsgBenchmark, useEsgYears } from '@/hooks/useEsg'

function Bar({ value, bench, lowerBetter }: { value: number; bench: number; lowerBetter: boolean }) {
  const max = Math.max(value, bench) * 1.2 || 1
  const companyWidth = Math.min(100, (value / max) * 100)
  const benchWidth   = Math.min(100, (bench  / max) * 100)
  const better = lowerBetter ? value <= bench : value >= bench

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="w-16 text-xs text-gray-500">Vous</span>
        <div className="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-4 rounded-full ${better ? 'bg-green-500' : 'bg-red-400'}`}
            style={{ width: `${companyWidth}%` }}
          />
        </div>
        <span className={`w-14 text-right text-xs font-semibold ${better ? 'text-green-700' : 'text-red-600'}`}>{value.toFixed(1)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-16 text-xs text-gray-400">Secteur</span>
        <div className="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-4 rounded-full bg-gray-400" style={{ width: `${benchWidth}%` }} />
        </div>
        <span className="w-14 text-right text-xs text-gray-500">{bench.toFixed(1)}</span>
      </div>
    </div>
  )
}

function ScoreCompare({ label, company, sector }: { label: string; company: number; sector: number }) {
  const delta = company - sector
  const better = delta >= 0
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-gray-900">{company}</p>
        <div className="text-right">
          <p className="text-xs text-gray-400">Secteur</p>
          <p className="text-lg font-semibold text-gray-500">{sector}</p>
        </div>
      </div>
      <p className={`mt-1 text-xs font-medium ${better ? 'text-green-600' : 'text-red-600'}`}>
        {better ? '+' : ''}{delta} pts vs secteur
      </p>
    </div>
  )
}

export function BenchmarkPage() {
  const years = useEsgYears()
  const [year, setYear] = useState(new Date().getFullYear())
  const bench = useEsgBenchmark(year)

  const yearOptions = years.data?.length ? years.data : [year]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Benchmark sectoriel</h1>
          <p className="text-sm text-gray-500">Comparaison avec les médianes PME françaises (ADEME)</p>
        </div>
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={year} onChange={e => setYear(Number(e.target.value))}>
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {bench.isError ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
          Aucune donnée pour {year} — saisissez vos indicateurs d'abord.
        </div>
      ) : bench.isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">Chargement…</div>
      ) : bench.data && (
        <>
          {/* Score comparison */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ScoreCompare label="Score Global"       company={bench.data.company.global}        sector={bench.data.sector.global} />
            <ScoreCompare label="Environnement (E)"  company={bench.data.company.environnement}  sector={bench.data.sector.environnement} />
            <ScoreCompare label="Social (S)"         company={bench.data.company.social}         sector={bench.data.sector.social} />
            <ScoreCompare label="Gouvernance (G)"    company={bench.data.company.gouvernance}    sector={bench.data.sector.gouvernance} />
          </div>

          {/* Indicator bars */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-5 text-sm font-semibold text-gray-700">Indicateurs détaillés vs médiane sectorielle</h2>
            <div className="space-y-6">
              {bench.data.indicators.map(ind => (
                <div key={ind.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{ind.label}</span>
                    <span className="text-xs text-gray-400">{ind.unit}</span>
                  </div>
                  <Bar value={ind.company} bench={ind.bench} lowerBetter={ind.lowerBetter} />
                  <p className="mt-1 text-xs text-gray-400">
                    {ind.lowerBetter
                      ? ind.company <= ind.bench ? '✓ En dessous de la médiane (favorable)' : '✗ Au-dessus de la médiane (à améliorer)'
                      : ind.company >= ind.bench ? '✓ Au-dessus de la médiane (favorable)' : '✗ En dessous de la médiane (à améliorer)'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Sources : ADEME, INSEE, Bpifrance. Benchmarks secteur services / PME françaises ({year}). Ces données sont indicatives.
          </p>
        </>
      )}
    </div>
  )
}
