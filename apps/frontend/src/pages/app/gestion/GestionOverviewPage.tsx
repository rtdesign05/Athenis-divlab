import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { Link } from 'react-router-dom'

// ── Mock data ─────────────────────────────────────────────────────────────────

const VENTES_RECENTES = [
  { id: 'CMD-0051', client: 'ACME Corp',          agence: 'Siège',                       montant:  8_400_000, statut: 'En cours',   date: '25 avr.' },
  { id: 'CMD-0050', client: 'TechX Sarl',          agence: 'Agence Douala — Akwa',        montant:  4_200_000, statut: 'Livrée',     date: '24 avr.' },
  { id: 'CMD-0049', client: 'Groupe Delta',        agence: 'Siège',                       montant: 12_000_000, statut: 'En cours',   date: '23 avr.' },
  { id: 'CMD-0048', client: 'Sodiko Distribution', agence: 'Succursale Yaoundé — Centre', montant:  3_150_000, statut: 'En attente', date: '22 avr.' },
  { id: 'CMD-0047', client: 'Mengueme & Fils',     agence: 'Agence Douala — Akwa',        montant:  1_890_000, statut: 'Livrée',     date: '21 avr.' },
]

const ACHATS_RECENTS = [
  { id: 'ACH-0034', fournisseur: 'Import Express',     agence: 'Siège',                       montant: 5_600_000, statut: 'Reçu',       date: '25 avr.' },
  { id: 'ACH-0033', fournisseur: 'Ebobolo SARL',       agence: 'Agence Douala — Akwa',        montant: 2_800_000, statut: 'En transit',  date: '24 avr.' },
  { id: 'ACH-0032', fournisseur: 'Africa Tech Supply',  agence: 'Siège',                       montant: 9_200_000, statut: 'Commandé',    date: '23 avr.' },
  { id: 'ACH-0031', fournisseur: 'Manutention Pro',    agence: 'Succursale Yaoundé — Centre', montant: 1_450_000, statut: 'Reçu',       date: '22 avr.' },
  { id: 'ACH-0030', fournisseur: 'Intertrans Cm',      agence: 'Agence Douala — Akwa',        montant: 3_300_000, statut: 'En transit',  date: '20 avr.' },
]

const TRESORERIE = [
  { label: 'BICEC — Compte courant', solde: 28_450_000, type: 'bank', agence: 'Siège' },
  { label: 'UBA — Épargne',          solde: 14_200_000, type: 'bank', agence: 'Siège' },
  { label: 'Ecobank — Devises',      solde:  5_600_000, type: 'bank', agence: 'Siège' },
  { label: 'MTN Mobile Money',       solde:  3_850_000, type: 'momo', agence: 'Siège' },
  { label: 'Orange Money',           solde:  1_620_000, type: 'momo', agence: 'Siège' },
  { label: 'Caisse Siège',           solde:  1_335_000, type: 'cash', agence: 'Siège' },
  { label: 'Caisse Agence Douala',   solde:    420_000, type: 'cash', agence: 'Agence Douala — Akwa' },
]

const STATUT_VENTE: Record<string, string> = {
  'En cours':   'bg-blue-100 text-blue-700',
  'Livrée':     'bg-green-100 text-green-700',
  'En attente': 'bg-amber-100 text-amber-700',
  'Annulée':    'bg-red-100 text-red-600',
}

const STATUT_ACHAT: Record<string, string> = {
  'Reçu':       'bg-green-100 text-green-700',
  'En transit': 'bg-blue-100 text-blue-700',
  'Commandé':   'bg-amber-100 text-amber-700',
  'Annulé':     'bg-red-100 text-red-600',
}

const TYPE_ICON: Record<string, string> = {
  bank: '🏦',
  momo: '📱',
  cash: '💵',
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
  const { fmt } = useCurrency()
  const { user } = useAuth()

  const agenceNom = user?.agenceNom ?? null

  const ventes  = agenceNom ? VENTES_RECENTES.filter(v => v.agence === agenceNom) : VENTES_RECENTES
  const achats  = agenceNom ? ACHATS_RECENTS.filter(a => a.agence === agenceNom)  : ACHATS_RECENTS
  const tresors = agenceNom ? TRESORERIE.filter(t => t.agence === agenceNom)       : TRESORERIE

  const caMois           = ventes.reduce((s, v) => s + v.montant, 0)
  const commandesActives = ventes.filter(v => v.statut === 'En cours').length
  const achatsMois       = achats.reduce((s, a) => s + a.montant, 0)
  const tresoNette       = tresors.reduce((s, t) => s + t.solde, 0)
  const enAttente        = achats.filter(a => a.statut === 'Commandé' || a.statut === 'En transit').length
  const encours          = ventes.filter(v => v.statut === 'En cours').reduce((s, v) => s + v.montant, 0)

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

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-6 gap-3">
        <KpiCard label="CA — Avril 2026"       value={fmt(caMois)}          sub="Ventes du mois"           accent="green" />
        <KpiCard label="Encours clients"        value={fmt(encours)}         sub={`${commandesActives} cmd en cours`} accent="blue" />
        <KpiCard label="Commandes livrées"      value={String(ventes.filter(v => v.statut === 'Livrée').length)}
                                                sub="ce mois"               accent="green" />
        <KpiCard label="Achats — Avril 2026"   value={fmt(achatsMois)}      sub="Dépenses fournisseurs"    accent="amber" />
        <KpiCard label="Cmdes fournisseurs"     value={String(enAttente)}    sub="en transit / commandées"  accent="amber" />
        <KpiCard label="Trésorerie nette"       value={fmt(tresoNette)}      sub="Banques + caisses + MoMo" accent="green" />
      </div>

      {/* ── Corps 3 colonnes ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-3 gap-3">

        {/* Ventes */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Ventes récentes</h2>
            <Link to="/app/gestion/ventes" className="text-[11px] text-green-700 font-medium hover:underline">
              Voir tout →
            </Link>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
            {ventes.length === 0
              ? <p className="px-4 py-6 text-center text-sm text-gray-400">Aucune vente pour cette agence</p>
              : ventes.map(v => (
                <div key={v.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400 shrink-0">{v.id}</span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUT_VENTE[v.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                        {v.statut}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 truncate mt-0.5">{v.client}</p>
                    <p className="text-[10px] text-gray-400">{v.date}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-gray-900">{fmt(v.montant)}</p>
                </div>
              ))
            }
          </div>
        </div>

        {/* Achats */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Achats récents</h2>
            <Link to="/app/gestion/achats" className="text-[11px] text-green-700 font-medium hover:underline">
              Voir tout →
            </Link>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
            {achats.length === 0
              ? <p className="px-4 py-6 text-center text-sm text-gray-400">Aucun achat pour cette agence</p>
              : achats.map(a => (
                <div key={a.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400 shrink-0">{a.id}</span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUT_ACHAT[a.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                        {a.statut}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 truncate mt-0.5">{a.fournisseur}</p>
                    <p className="text-[10px] text-gray-400">{a.date}</p>
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
              : tresors.map((t, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="text-base shrink-0">{TYPE_ICON[t.type]}</span>
                  <p className="flex-1 min-w-0 text-sm text-gray-700 truncate">{t.label}</p>
                  <p className="shrink-0 text-sm font-bold text-gray-900">{fmt(t.solde)}</p>
                </div>
              ))
            }
          </div>
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-green-900">
            <p className="text-xs font-medium text-green-300">Total</p>
            <p className="text-sm font-black text-white">{fmt(tresoNette)}</p>
          </div>
        </div>

      </div>
    </div>
  )
}
