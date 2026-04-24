import { useCalendrier } from '@/hooks/useFiscal'
import type { CalendrierEvent } from '@/services/fiscalApi'

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const STATUS_CONFIG = {
  done:    { icon: '✅', cls: 'border-green-200 bg-green-50 text-green-800',  badge: 'bg-green-100 text-green-700',  label: 'Effectuée' },
  urgent:  { icon: '⚠️', cls: 'border-amber-200 bg-amber-50 text-amber-800',  badge: 'bg-amber-100 text-amber-700',  label: 'Urgent' },
  pending: { icon: '⏳', cls: 'border-gray-200 bg-gray-50 text-gray-700',    badge: 'bg-gray-100 text-gray-600',    label: 'À venir' },
  late:    { icon: '🔴', cls: 'border-red-200 bg-red-50 text-red-800',       badge: 'bg-red-100 text-red-700',      label: 'En retard' },
}

function groupByMonth(events: CalendrierEvent[]): Map<number, CalendrierEvent[]> {
  const map = new Map<number, CalendrierEvent[]>()
  for (const ev of events) {
    const m = new Date(ev.dueDate).getMonth()
    if (!map.has(m)) map.set(m, [])
    map.get(m)!.push(ev)
  }
  return map
}

export function CalendrierPage() {
  const year = new Date().getFullYear()
  const { data: events = [], isLoading } = useCalendrier(year)

  if (isLoading) return <div className="h-96 animate-pulse rounded-xl bg-gray-100" />

  const byMonth = groupByMonth(events)
  const months  = Array.from(byMonth.keys()).sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Calendrier fiscal {year}</h1>
          <p className="mt-0.5 text-sm text-gray-500">Toutes les échéances fiscales de l'exercice</p>
        </div>
        <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Exporter iCal / Google
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1">
            <span>{cfg.icon}</span> {cfg.label}
          </span>
        ))}
      </div>

      {/* Months */}
      <div className="space-y-6">
        {months.map(m => {
          const evs = byMonth.get(m) ?? []
          return (
            <div key={m}>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">{MONTHS_FR[m]} {year}</h2>
              <div className="space-y-2">
                {evs.map((ev, i) => {
                  const cfg = STATUS_CONFIG[ev.status]
                  return (
                    <div key={i} className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${cfg.cls}`}>
                      <span className="text-base">{cfg.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium">{ev.date}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>{cfg.label}</span>
                        </div>
                        <p className="text-sm font-medium">{ev.label}</p>
                      </div>
                      {ev.declaredAt && (
                        <p className="text-xs text-gray-400">
                          Déclarée le {new Date(ev.declaredAt).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
