import { useState, useEffect } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { accountingApi, type FiscalYearSummary } from '@/services/accountingApi'

export function AccountingDashboard() {
  const { fmt, currencySymbol } = useCurrency()

  const [summary, setSummary] = useState<FiscalYearSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const year = new Date().getFullYear()

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(false)
      try {
        const years   = await accountingApi.listFiscalYears()
        const current = years.find(y => y.year === year) ?? years[0]
        if (current) {
          const s = await accountingApi.fiscalYearSummary(current.id)
          setSummary(s)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [year])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="shrink-0 flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Comptabilité</h1>
          <p className="text-xs text-gray-500">Exercice {year}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Données non disponibles — vérifiez que l'exercice comptable {year} est ouvert dans le module Comptabilité.
        </div>
      </div>
    )
  }

  const ca       = summary.ca
  const charges  = summary.charges
  const resultat = summary.resultatNet
  const maxVal   = Math.max(ca, charges, 1)

  const kpis = [
    { label: "Chiffre d'affaires", value: ca,       fmt: true,  pos: true,             delta: null },
    { label: 'Charges exploit.',   value: charges,  fmt: true,  pos: charges < ca,     delta: null },
    { label: 'Résultat net',       value: resultat, fmt: true,  pos: resultat >= 0,    delta: null },
    { label: 'Factures ouvertes',  value: summary.openInvoices ?? 0, fmt: false, pos: true, delta: null },
  ]

  const bars = [
    { label: "CA",       value: ca,       color: 'bg-forest-400', pct: Math.round((ca      / maxVal) * 100) },
    { label: 'Charges',  value: charges,  color: 'bg-red-400',    pct: Math.round((charges / maxVal) * 100) },
    { label: 'Résultat', value: Math.abs(resultat), color: resultat >= 0 ? 'bg-blue-400' : 'bg-orange-400',
      pct: Math.round((Math.abs(resultat) / maxVal) * 100) },
  ]

  return (
    <div className="h-full flex flex-col gap-3">

      <div className="shrink-0 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900">Comptabilité</h1>
        <p className="text-xs text-gray-500">Exercice {summary.year} — résultats consolidés</p>
      </div>

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs font-medium text-gray-500">{k.label}</p>
            <p className={`mt-1 text-xl font-bold ${k.pos ? 'text-gray-900' : 'text-red-600'}`}>
              {k.fmt ? fmt(k.value) : k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart — CA vs Charges vs Résultat */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-4">
        <h2 className="shrink-0 text-sm font-semibold text-gray-900">
          Résumé de l'exercice {summary.year} (k{currencySymbol})
        </h2>

        <div className="flex-1 flex flex-col justify-center gap-4">
          {bars.map(b => (
            <div key={b.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700">{b.label}</span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  {b.label === 'Résultat' && resultat < 0 && '−'}{fmt(b.value)}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-100">
                <div
                  className={`h-3 rounded-full ${b.color} transition-all duration-500`}
                  style={{ width: `${b.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Légende + ratio */}
        <div className="shrink-0 flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
          {bars.map(b => (
            <span key={b.label} className="flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-sm ${b.color}`} />
              {b.label}
            </span>
          ))}
          {ca > 0 && (
            <span className="ml-auto font-medium text-gray-700">
              Marge nette : {((resultat / ca) * 100).toFixed(1)} %
            </span>
          )}
        </div>
      </div>

    </div>
  )
}
