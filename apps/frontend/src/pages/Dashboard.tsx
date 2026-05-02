import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Invoice } from '@/services/billingApi'

// ── Types (shape réelle du backend) ──────────────────────────────────────────

interface CRData {
  year: number
  produits: { chiffreAffaires: number; tvaCollectee: number; totalProduits: number }
  charges:  { chargesExploitation: number; masseSalariale: number; chargesTotal: number }
  resultatBrut: number
  margeNette:   number
}

interface BillingKpis {
  encaisse:    number
  enAttente:   number
  enRetard:    number
  invoiceCount: number
}

interface MonthBar { label: string; value: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtNum = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)

const fmtMoney = (n: number) => `${fmtNum(n)} €`

function buildMonthlyBars(invoices: Invoice[]): MonthBar[] {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d     = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const year  = d.getFullYear()
    const month = d.getMonth()
    const label = d.toLocaleDateString('fr-FR', { month: 'short' })
    const value = invoices
      .filter(inv => {
        const dt = new Date(inv.issueDate)
        return dt.getFullYear() === year && dt.getMonth() === month
      })
      .reduce((s, inv) => s + parseFloat(inv.total), 0)
    return { label: label.charAt(0).toUpperCase() + label.slice(1, 4), value }
  })
}

function d<T>(r: { data: { data: T } }): T { return r.data.data }

// ── SIG mini-bar (barre horizontale proportionnelle) ─────────────────────────

function SigRow({
  label, sub, value, max, color,
}: {
  label: string; sub?: string; value: number; max: number; color: string
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  const negative = value < 0
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs font-medium text-gray-700">{label}</span>
          {sub && <span className="ml-1.5 text-[10px] text-gray-400">{sub}</span>}
        </div>
        <span className={`shrink-0 text-sm font-semibold tabular-nums ${negative ? 'text-red-600' : 'text-gray-900'}`}>
          {negative ? '−' : ''}{fmtMoney(Math.abs(value))}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div
          className={`h-1.5 rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Graphique CA mensuel (SVG natif) ──────────────────────────────────────────

function BarChart({ bars }: { bars: MonthBar[] }) {
  const H   = 100
  const W   = 100
  const PAD = { top: 8, bottom: 22, left: 0, right: 0 }
  const innerH = H - PAD.top - PAD.bottom
  const innerW = W
  const n     = bars.length
  const barW  = (innerW / n) * 0.55
  const gap   = innerW / n
  const max   = Math.max(...bars.map(b => b.value), 1)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 110 }}
      aria-label="Revenus encaissés par mois"
    >
      {/* Grille horizontale légère */}
      {[0, 0.5, 1].map((f) => (
        <line
          key={f}
          x1={0} y1={PAD.top + innerH * (1 - f)}
          x2={W} y2={PAD.top + innerH * (1 - f)}
          stroke="#f0f0f0" strokeWidth="0.5"
        />
      ))}

      {bars.map((bar, i) => {
        const x    = gap * i + gap / 2 - barW / 2
        const pct  = bar.value / max
        const barH = Math.max(pct * innerH, bar.value > 0 ? 1.5 : 0)
        const y    = PAD.top + innerH - barH
        const isCurrentMonth = i === bars.length - 1

        return (
          <g key={i}>
            <rect
              x={x} y={y}
              width={barW} height={barH}
              rx="1.5"
              fill={isCurrentMonth ? '#1a3a2a' : '#4ade80'}
              opacity={isCurrentMonth ? 1 : 0.65}
            />
            <text
              x={x + barW / 2}
              y={H - 2}
              textAnchor="middle"
              fontSize="5.5"
              fill="#9ca3af"
            >
              {bar.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

const INVOICE_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon', SENT: 'Envoyée', PAID: 'Payée', OVERDUE: 'En retard', CANCELLED: 'Annulée',
}
const INVOICE_STATUS_COLOR: Record<string, string> = {
  DRAFT:     'bg-gray-100 text-gray-600',
  SENT:      'bg-blue-100 text-blue-700',
  PAID:      'bg-emerald-100 text-emerald-700',
  OVERDUE:   'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-400',
}

export function Dashboard() {
  const currentYear = new Date().getFullYear()

  const [billing, setBilling]   = useState<BillingKpis | null>(null)
  const [cr, setCr]             = useState<CRData | null>(null)
  const [bars, setBars]         = useState<MonthBar[]>([])
  const [recent, setRecent]     = useState<Invoice[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/invoices', { params: { status: 'PAID',    limit: 200 } }).then(d),
      api.get('/invoices', { params: { status: 'SENT',    limit: 100 } }).then(d),
      api.get('/invoices', { params: { status: 'OVERDUE', limit: 100 } }).then(d),
      api.get('/accounting/compte-de-resultat', { params: { year: currentYear } }).then(d),
      api.get('/invoices', { params: { limit: 6, page: 1 } }).then(d),
    ])
      .then(([paid, sent, overdue, crData, recentData]) => {
        const paidItems    = (paid    as { items: Invoice[] }).items
        const sentItems    = (sent    as { items: Invoice[] }).items
        const overdueItems = (overdue as { items: Invoice[] }).items
        const recentItems  = (recentData as { items: Invoice[] }).items

        const sum = (items: Invoice[]) =>
          items.reduce((acc, inv) => acc + parseFloat(inv.total), 0)

        setBilling({
          encaisse:     sum(paidItems),
          enAttente:    sum(sentItems),
          enRetard:     sum(overdueItems),
          invoiceCount: paidItems.length + sentItems.length + overdueItems.length,
        })
        setCr(crData as unknown as CRData)
        setBars(buildMonthlyBars(paidItems))
        setRecent(recentItems)
      })
      .catch(() => setError('Impossible de charger le tableau de bord'))
      .finally(() => setLoading(false))
  }, [currentYear])

  // ── Calcul des SIG ──────────────────────────────────────────────────────────
  const sig = useMemo(() => {
    if (!cr) return null
    const ca  = cr.produits.chiffreAffaires
    // Valeur Ajoutée ≈ CA − consommations intermédiaires (achats + services ext., hors personnel)
    const va  = ca - cr.charges.chargesExploitation
    // Excédent Brut d'Exploitation = VA − charges de personnel − impôts & taxes
    const ebe = va - cr.charges.masseSalariale
    // Résultat net (avant IS, car IS non ventilé dans ce rapport)
    const rn  = cr.resultatBrut
    return { ca, va, ebe, rn, marge: cr.margeNette }
  }, [cr])

  const moisFr = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const sigMax = sig ? Math.max(sig.ca, 1) : 1

  // ── Rendu ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Vue d'ensemble · <span className="capitalize">{moisFr}</span>
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-forest-900 border-t-transparent" />
          Chargement…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* ── KPI facturation ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card">
              <p className="text-xs font-medium text-gray-500">Encaissé</p>
              <p className="mt-1.5 text-2xl font-bold text-emerald-700">
                {billing ? fmtMoney(billing.encaisse) : '—'}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">Factures payées</p>
            </div>
            <div className="card">
              <p className="text-xs font-medium text-gray-500">En attente</p>
              <p className="mt-1.5 text-2xl font-bold text-amber-600">
                {billing ? fmtMoney(billing.enAttente) : '—'}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">Factures envoyées</p>
            </div>
            <div className="card">
              <p className="text-xs font-medium text-gray-500">En retard</p>
              <p className={`mt-1.5 text-2xl font-bold ${billing && billing.enRetard > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {billing ? fmtMoney(billing.enRetard) : '—'}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">Impayées échues</p>
            </div>
            <div className="card">
              <p className="text-xs font-medium text-gray-500">Nb factures</p>
              <p className="mt-1.5 text-2xl font-bold text-gray-900">
                {billing ? billing.invoiceCount : '—'}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">Actives (hors brouillon)</p>
            </div>
          </div>

          {/* ── Graphique + SIG ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

            {/* Graphique mensuel (3/5) */}
            <div className="card lg:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Revenus encaissés</p>
                  <p className="text-xs text-gray-400">6 derniers mois · HT</p>
                </div>
                {bars.length > 0 && (bars[bars.length - 1]?.value ?? 0) > 0 && (
                  <span className="text-sm font-semibold text-forest-700">
                    {fmtMoney(bars[bars.length - 1]!.value)} ce mois
                  </span>
                )}
              </div>
              <BarChart bars={bars} />
            </div>

            {/* Soldes Intermédiaires de Gestion (2/5) */}
            <div className="card lg:col-span-2">
              <p className="mb-4 text-sm font-semibold text-gray-800">
                Soldes intermédiaires de gestion
                <span className="ml-1.5 text-xs font-normal text-gray-400">{currentYear}</span>
              </p>

              {sig ? (
                <div className="space-y-4">
                  <SigRow
                    label="Chiffre d'affaires"
                    sub="Produits encaissés HT"
                    value={sig.ca}
                    max={sigMax}
                    color="bg-forest-700"
                  />
                  <SigRow
                    label="Valeur ajoutée"
                    sub="CA − consommations ext."
                    value={sig.va}
                    max={sigMax}
                    color="bg-forest-500"
                  />
                  <SigRow
                    label="EBE"
                    sub="VA − charges personnel"
                    value={sig.ebe}
                    max={sigMax}
                    color="bg-emerald-500"
                  />
                  <SigRow
                    label="Résultat net"
                    sub="Avant IS"
                    value={sig.rn}
                    max={sigMax}
                    color={sig.rn >= 0 ? 'bg-emerald-600' : 'bg-red-500'}
                  />

                  {/* Taux de marge */}
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-xs text-gray-500">Taux de marge nette</span>
                    <span className={`text-sm font-bold ${sig.marge >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {sig.marge >= 0 ? '+' : ''}{sig.marge.toFixed(1)} %
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  Aucune écriture comptable pour {currentYear}.
                </p>
              )}
            </div>
          </div>

          {/* ── Dernières factures ───────────────────────────────────────────── */}
          {recent.length > 0 && (
            <div className="card overflow-hidden p-0">
              <div className="flex items-center justify-between px-5 py-3">
                <p className="text-sm font-semibold text-gray-800">Dernières factures</p>
                <Link to="/app/billing" className="text-xs text-forest-700 hover:underline">
                  Voir tout →
                </Link>
              </div>
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    {['Référence', 'Client', 'Montant TTC', 'Échéance', 'Statut'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recent.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{inv.number}</td>
                      <td className="px-4 py-2.5 text-gray-700">{inv.client?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{fmtMoney(parseFloat(inv.total))}</td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${INVOICE_STATUS_COLOR[inv.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {INVOICE_STATUS_LABEL[inv.status] ?? inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
