import { useState } from 'react'
import { useEsgScore, useEsgYears, useActionStats } from '@/hooks/useEsg'

function ScoreGauge({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 48
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="120" height="70" viewBox="0 0 120 70">
        {/* Track */}
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#e5e7eb" strokeWidth="10" />
        {/* Score arc */}
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${(score / 100) * 157} 157`}
          strokeLinecap="round"
        />
        <text x="60" y="55" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#111827">{score}</text>
      </svg>
      <span className="text-sm font-medium text-gray-600">{label}</span>
    </div>
  )
}

function ScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Bon'
  if (score >= 40) return 'Moyen'
  return 'Insuffisant'
}

function ScoreColor(score: number): string {
  if (score >= 80) return '#16a34a'
  if (score >= 60) return '#2563eb'
  if (score >= 40) return '#d97706'
  return '#dc2626'
}

export function EsgDashboard() {
  const years   = useEsgYears()
  const [year, setYear] = useState(new Date().getFullYear())
  const score   = useEsgScore(year)
  const actions = useActionStats()

  const currentYear = new Date().getFullYear()
  const yearOptions = years.data?.length ? years.data : [currentYear]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord ESG</h1>
          <p className="text-sm text-gray-500">Score global & indicateurs environnementaux, sociaux, gouvernance</p>
        </div>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={year}
          onChange={e => setYear(Number(e.target.value))}>
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {score.isError ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400">
          <p className="text-lg font-medium mb-2">Aucune donnée pour {year}</p>
          <p className="text-sm">Saisissez vos indicateurs dans la page <strong>Saisie Scopes</strong> pour calculer votre score.</p>
        </div>
      ) : score.isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">Calcul du score…</div>
      ) : score.data && (
        <>
          {/* Score global */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-medium text-gray-500">Score ESG Global {year}</p>
                <p className="text-5xl font-black text-gray-900">{score.data.scores.global}<span className="text-2xl text-gray-400">/100</span></p>
                <span className={`mt-1 inline-block text-sm font-medium`}
                  style={{ color: ScoreColor(score.data.scores.global) }}>
                  {ScoreLabel(score.data.scores.global)}
                </span>
              </div>
              <div className="flex gap-8">
                <ScoreGauge score={score.data.scores.environnement} label="Environnement" color="#16a34a" />
                <ScoreGauge score={score.data.scores.social}        label="Social"        color="#2563eb" />
                <ScoreGauge score={score.data.scores.gouvernance}   label="Gouvernance"   color="#7c3aed" />
              </div>
            </div>

            {/* Progress bars */}
            {[
              { label: 'Environnement (E)', score: score.data.scores.environnement, color: 'bg-green-500' },
              { label: 'Social (S)',         score: score.data.scores.social,        color: 'bg-blue-500' },
              { label: 'Gouvernance (G)',    score: score.data.scores.gouvernance,   color: 'bg-purple-500' },
            ].map(({ label, score: s, color }) => (
              <div key={label} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{label}</span>
                  <span className="text-sm font-medium text-gray-800">{s}/100</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${s}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* CO2 breakdown */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Scope 1 (direct)', value: score.data.co2.scope1, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
              { label: 'Scope 2 (électricité)', value: score.data.co2.scope2, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
              { label: 'Scope 3 (indirect)', value: score.data.co2.scope3, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
              { label: 'Total CO₂ (tCO2e)', value: score.data.co2.total, color: 'text-gray-900', bg: 'bg-gray-50 border-gray-200' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value.toFixed(1)}</p>
                <p className="text-xs text-gray-400">tCO2e</p>
              </div>
            ))}
          </div>

          {/* Key indicators grid */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Indicateurs clés</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { label: 'Énergie', value: score.data.indicators.energyKwh != null ? `${(score.data.indicators.energyKwh/1000).toFixed(0)} MWh` : '—' },
                { label: 'EnR (%)', value: score.data.indicators.renewableRatio != null ? `${score.data.indicators.renewableRatio} %` : '—' },
                { label: 'Déchets', value: score.data.indicators.wasteKg != null ? `${(score.data.indicators.wasteKg/1000).toFixed(1)} t` : '—' },
                { label: 'Écart H/F', value: score.data.indicators.genderPayGap != null ? `${score.data.indicators.genderPayGap} %` : '—' },
                { label: 'Formation', value: score.data.indicators.trainingHours != null ? `${score.data.indicators.trainingHours} h` : '—' },
                { label: 'Absentéisme', value: score.data.indicators.absenteeismRate != null ? `${score.data.indicators.absenteeismRate} %` : '—' },
                { label: 'Femmes CA', value: score.data.indicators.boardFemaleRatio != null ? `${score.data.indicators.boardFemaleRatio} %` : '—' },
                { label: 'Code éthique', value: score.data.indicators.hasEthicsCode ? '✓ Oui' : '✗ Non' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-semibold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action plan summary */}
          {actions.data && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Plan d'action ESG</h2>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'À faire',      value: actions.data.todo,       color: 'text-gray-600' },
                  { label: 'En cours',     value: actions.data.inProgress,  color: 'text-blue-600' },
                  { label: 'Terminées',    value: actions.data.done,        color: 'text-green-600' },
                  { label: 'CO₂ évité',   value: `${actions.data.co2Saving.toFixed(1)} t`, color: 'text-green-700' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
