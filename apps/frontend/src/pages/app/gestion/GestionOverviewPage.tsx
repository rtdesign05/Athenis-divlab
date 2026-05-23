import { useMemo }          from 'react'
import { Link }             from 'react-router-dom'
import { useCurrency }      from '@/hooks/useCurrency'
import { useAuth }          from '@/features/auth/useAuth'
import { useTresorerie }    from '@/contexts/TresorerieContext'
import { useGestion }       from '@/contexts/GestionContext'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import { PeriodBar, usePeriod, MONTH_LABELS } from '@/shared/components/ui/PeriodBar'

// ── Styles statut ─────────────────────────────────────────────────────────────

const STATUT_VENTE: Record<string, string> = {
  'En cours':   'bg-blue-100 text-blue-700',
  'Livrée':     'bg-green-100 text-green-700',
  'En attente': 'bg-amber-100 text-amber-700',
  'Annulée':    'bg-red-100 text-red-600',
}

const STATUT_ACHAT: Record<string, string> = {
  'Reçue':      'bg-green-100 text-green-700',
  'En cours':   'bg-blue-100 text-blue-700',
  'En attente': 'bg-amber-100 text-amber-700',
  'Annulée':    'bg-red-100 text-red-600',
}

const TYPE_ICON: Record<string, string> = {
  banque:         '🏦',
  'mobile-money': '📱',
  caisse:         '💵',
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: 'green' | 'blue' | 'amber' | 'red'
}) {
  const bar: Record<string, string> = {
    green: 'bg-green-500', blue: 'bg-blue-500', amber: 'bg-amber-400', red: 'bg-red-500',
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-1 relative overflow-hidden">
      {accent && <div className={`absolute top-0 left-0 right-0 h-0.5 ${bar[accent]}`} />}
      <p className="text-[11px] font-medium text-gray-500 truncate">{label}</p>
      <p className="text-xl font-black text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function GestionOverviewPage() {
  const { fmt, currencyCode, defaultVatRate } = useCurrency()
  const { user }                              = useAuth()
  const { commandes: allCommandes, achats: allAchats, facturesVentes: allFactures } = useGestion()
  const { balances, totalSolde }              = useTresorerie()
  const { agences, country }                  = useCompanySettings()

  const agenceNom   = user?.agenceNom ?? null
  const now         = new Date()
  const currentYear = now.getFullYear()

  // ── Sélecteur de période ────────────────────────────────────────────────────
  const period = usePeriod(currentYear)
  const { selectedYear, periodMode, selectedMonth, weekStart, periodFrom, periodTo } = period

  // ── Label dynamique de la période ──────────────────────────────────────────
  const periodLabel = useMemo(() => {
    if (periodMode === 'full')  return `Exercice ${selectedYear}`
    if (periodMode === 'month') return `${MONTH_LABELS[selectedMonth - 1]} ${selectedYear}`
    return 'cette semaine'
  }, [periodMode, selectedYear, selectedMonth])

  // ── Filtre commandes et achats sur la période ────────────────────────────────
  const inPeriod = (date: string) => date >= periodFrom && date <= periodTo

  const allVisibleCommandes = agenceNom
    ? allCommandes.filter(v => v.agence === agenceNom)
    : allCommandes

  const allVisibleAchats = agenceNom
    ? allAchats.filter(a => a.agence === agenceNom)
    : allAchats

  // Pour les KPIs : toutes les données de la période sélectionnée
  const commandesPeriode = allVisibleCommandes.filter(v => inPeriod(v.date))
  const achatsPeriode    = allVisibleAchats.filter(a => inPeriod(a.date))

  // Factures de vente visibles par agence + période. Le CA est calculé sur les
  // factures Envoyée / Payée / En retard (conforme SYSCOHADA — reconnaissance
  // à l'émission). Les brouillons sont exclus comme dans le tableau de bord.
  const visibleFactures = agenceNom ? allFactures.filter(f => f.agence === agenceNom) : allFactures
  const facturesPeriode = visibleFactures.filter(f =>
    inPeriod(f.date) &&
    (f.statut === 'Envoyée' || f.statut === 'Payée' || f.statut === 'En retard'),
  )

  // Pour les listes récentes : les 5 plus récentes (toutes périodes confondues)
  const commandesRecentes = allVisibleCommandes.slice(0, 5)
  const achatsRecents     = allVisibleAchats.slice(0, 5)

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const tresors          = agenceNom ? balances.filter(b => b.agence === agenceNom) : balances
  const tresoNette       = tresors.reduce((s, t) => s + t.solde, 0)
  // CA = commandes (montant prévisionnel) + factures émises (montant facturé).
  // Inclut les deux sources car certaines ventes passent par commande, d'autres
  // directement par facture sans commande préalable.
  const caCommandes      = commandesPeriode.reduce((s, v) => s + v.montant, 0)
  const caFactures       = facturesPeriode.reduce((s, f) => s + f.montantHT, 0)
  const caPeriode        = caCommandes + caFactures
  const commandesActives = commandesPeriode.filter(v => v.statut === 'En cours').length
  const achatsPeriodeCA  = achatsPeriode.reduce((s, a) => s + a.montant, 0)
  const enAttente        = achatsPeriode.filter(a => a.statut === 'En attente' || a.statut === 'En cours').length
  const encours          = commandesPeriode.filter(v => v.statut === 'En cours').reduce((s, v) => s + v.montant, 0)

  return (
    <div className="h-full flex flex-col gap-3">

      {/* Bannière agence */}
      {agenceNom && (
        <div className="shrink-0 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <span className="text-sm">🏢</span>
          <p className="text-xs text-amber-800">
            Vue restreinte — vous ne consultez que les données de l'agence
            <span className="font-semibold"> {agenceNom}</span>
          </p>
        </div>
      )}

      {/* ── Bandeau Paramètres connectés ─────────────────────────────────── */}
      {!agenceNom && (
        <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">🔗 Paramètres actifs</span>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Devise :</span>
            <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[11px] font-bold text-forest-800">{currencyCode}</span>
            <Link to="/app/settings/localisation" className="text-[10px] text-gray-400 hover:text-forest-600 transition-colors">
              Localisation →
            </Link>
          </div>

          <span className="text-gray-200 text-xs">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Pays :</span>
            <span className="text-xs font-medium text-gray-700">{country}</span>
          </div>

          <span className="text-gray-200 text-xs">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">TVA :</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">{defaultVatRate}%</span>
            <Link to="/app/settings/fiscalite" className="text-[10px] text-gray-400 hover:text-forest-600 transition-colors">
              Fiscalité →
            </Link>
          </div>

          <span className="text-gray-200 text-xs">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Agences :</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
              {agences.filter(a => a.isActive).length} actives
            </span>
            <Link to="/app/settings/agences" className="text-[10px] text-gray-400 hover:text-forest-600 transition-colors">
              Paramètres →
            </Link>
          </div>
        </div>
      )}

      {/* ── Sélecteur exercice / période ─────────────────────────────────── */}
      <PeriodBar
        selectedYear={selectedYear}
        currentYear={currentYear}
        onYearChange={y => period.setSelectedYear(y)}
        mode={periodMode}
        onModeChange={m => { period.setPeriodMode(m) }}
        selectedMonth={selectedMonth}
        onMonthChange={period.setSelectedMonth}
        weekStart={weekStart}
        onWeekShift={period.shiftWeek}
      />

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-6 gap-3">
        <KpiCard
          label={`CA — ${periodLabel}`}
          value={fmt(caPeriode)}
          sub="Ventes de la période"
          accent="green"
        />
        <KpiCard
          label="Encours clients"
          value={fmt(encours)}
          sub={`${commandesActives} cmd en cours`}
          accent="blue"
        />
        <KpiCard
          label="Commandes livrées"
          value={String(commandesPeriode.filter(v => v.statut === 'Livrée').length)}
          sub="sur la période"
          accent="green"
        />
        <KpiCard
          label={`Achats — ${periodLabel}`}
          value={fmt(achatsPeriodeCA)}
          sub="Dépenses fournisseurs"
          accent="amber"
        />
        <KpiCard
          label="Cmdes fournisseurs"
          value={String(enAttente)}
          sub="en transit / commandées"
          accent="amber"
        />
        <KpiCard
          label="Trésorerie nette"
          value={fmt(agenceNom ? tresoNette : totalSolde)}
          sub="Banques + caisses + MoMo"
          accent="green"
        />
      </div>

      {/* ── Corps 3 colonnes ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-3 gap-3">

        {/* Ventes récentes */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Ventes récentes</h2>
            <Link to="/app/gestion/ventes" className="text-[11px] text-green-700 font-medium hover:underline">
              Voir tout →
            </Link>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
            {commandesRecentes.length === 0
              ? <p className="px-4 py-6 text-center text-sm text-gray-400">Aucune vente pour cette agence</p>
              : commandesRecentes.map(v => (
                <div key={v.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400 shrink-0">{v.id}</span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUT_VENTE[v.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                        {v.statut}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 truncate mt-0.5">{v.client}</p>
                    <p className="text-[10px] text-gray-400">{new Date(v.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-gray-900">{fmt(v.montant)}</p>
                </div>
              ))
            }
          </div>
        </div>

        {/* Achats récents */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Achats récents</h2>
            <Link to="/app/gestion/achats" className="text-[11px] text-green-700 font-medium hover:underline">
              Voir tout →
            </Link>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
            {achatsRecents.length === 0
              ? <p className="px-4 py-6 text-center text-sm text-gray-400">Aucun achat pour cette agence</p>
              : achatsRecents.map(a => (
                <div key={a.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400 shrink-0">{a.id}</span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUT_ACHAT[a.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                        {a.statut}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 truncate mt-0.5">{a.fournisseur}</p>
                    <p className="text-[10px] text-gray-400">{new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-gray-900">{fmt(a.montant)}</p>
                </div>
              ))
            }
          </div>
        </div>

        {/* Trésorerie */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Trésorerie</h2>
            <Link to="/app/gestion/tresorerie" className="text-[11px] text-green-700 font-medium hover:underline">
              Détail →
            </Link>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
            {tresors.length === 0
              ? <p className="px-4 py-6 text-center text-sm text-gray-400">Aucun compte pour cette agence</p>
              : tresors.map((t) => (
                <div key={t.name} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="text-base shrink-0">{TYPE_ICON[t.type] ?? '💰'}</span>
                  <p className="flex-1 min-w-0 text-sm text-gray-700 truncate">{t.label}</p>
                  <p className="shrink-0 text-sm font-bold text-gray-900">{fmt(t.solde)}</p>
                </div>
              ))
            }
          </div>
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-green-900">
            <p className="text-xs font-medium text-green-300">Total</p>
            <p className="text-sm font-black text-white">{fmt(agenceNom ? tresoNette : totalSolde)}</p>
          </div>
        </div>

      </div>
    </div>
  )
}
