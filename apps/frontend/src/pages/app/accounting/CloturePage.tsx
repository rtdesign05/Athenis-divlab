import { useState, useCallback } from 'react'
import { useClotureStatus, useCloseExercise } from '@/hooks/useAccounting'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import { Button } from '@/shared/components/ui/Button'
import { useCurrency } from '@/hooks/useCurrency'
import { formatDate } from '@/shared/utils/date'

const CURRENT_YEAR = new Date().getFullYear()

const CHECKLIST = [
  'Toutes les factures de l\'exercice sont encaissées ou annulées',
  'Les notes de frais sont saisies et justifiées',
  'Le rapprochement bancaire est à jour',
  'Les provisions éventuelles sont comptabilisées',
  'La liasse fiscale est prête (liasse IS ou BIC/BNC)',
]

export function CloturePage() {
  const { fmt } = useCurrency()
  const [year, setYear]       = useState(CURRENT_YEAR - 1)
  const [notes, setNotes]     = useState('')
  const [checks, setChecks]   = useState<boolean[]>(CHECKLIST.map(() => false))
  const [confirmed, setConfirmed] = useState(false)

  const { data: status, isLoading } = useClotureStatus(year)
  const close = useCloseExercise()

  const allChecked  = checks.every(Boolean)
  const canProceed  = allChecked && confirmed && (status?.canClose ?? false)

  const toggleCheck = (i: number) =>
    setChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)))

  const handleClose = useCallback(async () => {
    if (!confirm(`Confirmer la clôture définitive de l'exercice ${year} ?\nCette opération est irréversible.`)) return
    await close.mutateAsync({ year, notes: notes || undefined })
  }, [close, year, notes])

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clôture d'exercice</h2>
          <p className="mt-1 text-sm text-gray-500">Assistant de clôture comptable annuelle</p>
        </div>

        {/* Year picker */}
        <div className="flex gap-3 items-center">
          <div>
            <label className="label mb-1">Exercice à clôturer</label>
            <select className="input" value={year} onChange={e => { setYear(Number(e.target.value)); setChecks(CHECKLIST.map(() => false)); setConfirmed(false) }}>
              {[CURRENT_YEAR - 3, CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status card */}
        {isLoading ? (
          <div className="h-32 animate-pulse bg-gray-100 rounded-lg" />
        ) : status ? (
          <div className={`card space-y-4 ${status.alreadyClosed ? 'border-l-4 border-l-green-400' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">Exercice {status.year}</h3>
                {status.alreadyClosed && status.closedAt && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Clôturé le {formatDate(status.closedAt)}
                  </p>
                )}
                {!status.alreadyClosed && (
                  <p className="text-sm text-gray-500 mt-1">En cours — non clôturé</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Résultat net</p>
                <p className={`text-xl font-bold mt-0.5 ${status.resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(status.resultatNet)}
                </p>
              </div>
            </div>

            {status.blockers.length > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 space-y-1">
                <p className="text-sm font-medium text-red-800">Points bloquants :</p>
                {status.blockers.map((b, i) => (
                  <p key={i} className="text-sm text-red-700">• {b}</p>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Checklist */}
        {status && !status.alreadyClosed && (
          <div className="card space-y-4">
            <h3 className="font-semibold text-gray-900">Liste de contrôle avant clôture</h3>
            <ul className="space-y-3">
              {CHECKLIST.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={`check-${i}`}
                    checked={checks[i]}
                    onChange={() => toggleCheck(i)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-forest-600 accent-forest-700"
                  />
                  <label htmlFor={`check-${i}`} className={`text-sm cursor-pointer ${checks[i] ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item}
                  </label>
                </li>
              ))}
            </ul>

            <div>
              <label className="label mb-1">Notes de clôture (optionnel)</label>
              <textarea
                rows={3}
                className="input"
                placeholder="Observations, provisions particulières, informations pour l'expert-comptable…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-forest-700"
              />
              <span className="text-sm text-gray-700 font-medium">
                Je confirme que toutes les vérifications ont été effectuées et que je souhaite clôturer définitivement l'exercice {year}.
              </span>
            </label>

            {!allChecked && (
              <p className="text-xs text-amber-600">Veuillez cocher tous les points de contrôle avant de clôturer.</p>
            )}

            {close.isError && (
              <p className="text-sm text-red-600">Erreur lors de la clôture. Vérifiez les points bloquants.</p>
            )}

            <Button
              onClick={handleClose}
              loading={close.isPending}
              disabled={!canProceed}
              className="w-full"
            >
              Clôturer définitivement l'exercice {year}
            </Button>
          </div>
        )}

        {status?.alreadyClosed && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-800">
            <p className="font-medium">✓ L'exercice {status.year} est clôturé.</p>
            <p className="mt-1 text-green-700">Résultat net comptabilisé : {fmt(status.resultatNet)}</p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
