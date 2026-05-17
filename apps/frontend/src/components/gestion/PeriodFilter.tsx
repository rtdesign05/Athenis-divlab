/**
 * PeriodFilter — barre de filtre de période réutilisable pour les pages
 * Gestion (Ventes / Achats). Combine :
 *   - 3 boutons rapides : "Mois en cours", "Trimestre en cours", "Année en cours"
 *   - 2 sélecteurs date "Du" / "au" pour une plage personnalisée
 *   - 1 bouton "×" pour effacer le filtre
 *
 * Convention : les dates sont au format YYYY-MM-DD (string).
 * Quand `dateFrom` et `dateTo` sont vides → pas de filtre.
 */

interface PeriodFilterProps {
  dateFrom:   string
  dateTo:     string
  onChange:   (range: { dateFrom: string; dateTo: string }) => void
  /** Libellé optionnel à gauche (par défaut "Période") */
  label?:     string
  /** Compteur affiché à droite (ex. "12 / 48 lignes") */
  count?:     string | null
  /** Classes CSS additionnelles sur le conteneur */
  className?: string
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), q * 3, 1)
}
function endOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), q * 3 + 3, 0)
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1)
}
function endOfYear(d: Date) {
  return new Date(d.getFullYear(), 11, 31)
}
/** Convertit une Date en string YYYY-MM-DD en respectant la timezone locale
 *  (évite le décalage de jour quand on utilise toISOString()). */
function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function PeriodFilter({ dateFrom, dateTo, onChange, label, count, className }: PeriodFilterProps) {
  const isFiltered = dateFrom !== '' || dateTo !== ''

  function quickRange(kind: 'month' | 'quarter' | 'year') {
    const now = new Date()
    const start = kind === 'month' ? startOfMonth(now) : kind === 'quarter' ? startOfQuarter(now) : startOfYear(now)
    const end   = kind === 'month' ? endOfMonth(now)   : kind === 'quarter' ? endOfQuarter(now)   : endOfYear(now)
    onChange({ dateFrom: toISO(start), dateTo: toISO(end) })
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className ?? ''}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {label ?? 'Période'}
      </span>

      {/* Plages rapides */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => quickRange('month')}
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          Mois
        </button>
        <button
          type="button"
          onClick={() => quickRange('quarter')}
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          Trimestre
        </button>
        <button
          type="button"
          onClick={() => quickRange('year')}
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          Année
        </button>
      </div>

      {/* Plage personnalisée */}
      <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1">
        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Du</span>
        <input
          type="date"
          value={dateFrom}
          onChange={e => onChange({ dateFrom: e.target.value, dateTo })}
          className="text-xs bg-transparent focus:outline-none text-gray-700"
        />
        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">au</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => onChange({ dateFrom, dateTo: e.target.value })}
          className="text-xs bg-transparent focus:outline-none text-gray-700"
        />
        {isFiltered && (
          <button
            onClick={() => onChange({ dateFrom: '', dateTo: '' })}
            title="Effacer le filtre"
            className="ml-0.5 rounded text-gray-400 hover:text-red-500 px-1 text-sm leading-none"
          >×</button>
        )}
      </div>

      {count && (
        <span className="text-[11px] text-gray-500 ml-1">
          {count}
        </span>
      )}
    </div>
  )
}

/**
 * Helper : filtre un tableau d'éléments par une plage de dates inclusive.
 * Compare la date string YYYY-MM-DD (lexicographique = chronologique).
 */
export function filterByDateRange<T>(
  items:    T[],
  getDate:  (item: T) => string | null | undefined,
  dateFrom: string,
  dateTo:   string,
): T[] {
  if (!dateFrom && !dateTo) return items
  return items.filter(it => {
    const d = getDate(it)
    if (!d) return false
    const dateStr = d.length >= 10 ? d.slice(0, 10) : d
    if (dateFrom && dateStr < dateFrom) return false
    if (dateTo   && dateStr > dateTo)   return false
    return true
  })
}
