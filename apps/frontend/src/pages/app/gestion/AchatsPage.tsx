import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion, type AchatStatut } from '@/contexts/GestionContext'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'

// ── Styles statut achats ──────────────────────────────────────────────────────

const STATUT_STYLE: Record<string, string> = {
  'En cours':   'bg-blue-100 text-blue-700',
  'Reçue':      'bg-green-100 text-green-700',
  'En attente': 'bg-amber-100 text-amber-700',
  'Annulée':    'bg-red-100 text-red-600',
}

// ── Page principale ───────────────────────────────────────────────────────────

export function AchatsPage() {
  const { fmt }   = useCurrency()
  const { user }  = useAuth()
  const { achats: allAchats, updateAchatStatut } = useGestion()

  const { agences } = useCompanySettings()
  const activeAgences = useMemo(() => agences.filter(a => a.isActive), [agences])

  const agenceNom = user?.agenceNom ?? null
  const [agenceFilter, setAgenceFilter] = useState<string>('all')

  const achats = useMemo(() => {
    let list = agenceNom ? allAchats.filter(a => a.agence === agenceNom) : allAchats
    if (!agenceNom && agenceFilter !== 'all') list = list.filter(a => a.agence === agenceFilter)
    return list
  }, [allAchats, agenceNom, agenceFilter])

  const totalAchats = achats.filter(c => c.statut !== 'Annulée').reduce((s, c) => s + c.montant, 0)
  const enCours     = achats.filter(c => c.statut === 'En cours').length
  const recues      = achats.filter(c => c.statut === 'Reçue').length
  const enAttente   = achats.filter(c => c.statut === 'En attente').length

  return (
    <div className="h-full flex flex-col gap-3">

      {/* ── En-tête ── */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-gray-900">Réception fournisseurs</h1>
          {agenceNom && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              🏢 {agenceNom}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!agenceNom && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 shrink-0">🔗 Agence :</span>
              <select
                value={agenceFilter}
                onChange={e => setAgenceFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              >
                <option value="all">Toutes ({activeAgences.length})</option>
                {activeAgences.map(a => (
                  <option key={a.id} value={a.nom}>{a.nom}</option>
                ))}
              </select>
              <Link to="/app/settings/agences" className="text-[10px] text-gray-400 hover:text-green-700 transition-colors" title="Gérer les agences">⚙️</Link>
            </div>
          )}
          <button className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
            + Nouvelle commande
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Total achats</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{fmt(totalAchats)}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-600">En cours</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{enCours}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-600">En attente</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{enAttente}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-xs text-green-600">Reçues</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{recues}</p>
        </div>
      </div>

      {/* Tableau commandes */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-gray-900">
            Commandes récentes
            {agenceFilter !== 'all' && !agenceNom && (
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">{agenceFilter}</span>
            )}
          </h2>
          <input type="search" placeholder="Rechercher…"
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30" />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                <th className="px-4 py-2.5">N° commande</th>
                <th className="px-4 py-2.5">Fournisseur</th>
                <th className="px-4 py-2.5">Agence</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5 text-right">Montant</th>
                <th className="px-4 py-2.5">Réception prévue</th>
                <th className="px-4 py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {achats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                    {agenceFilter !== 'all' && !agenceNom ? `Aucun achat pour « ${agenceFilter} »` : 'Aucun achat pour cette agence'}
                  </td>
                </tr>
              ) : achats.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/60 cursor-pointer">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-green-700">{c.id}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{c.fournisseur}</td>
                  <td className="px-4 py-2.5 text-[11px] text-gray-500">{c.agence}</td>
                  <td className="px-4 py-2.5 text-gray-500">{new Date(c.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmt(c.montant)}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {c.reception ? new Date(c.reception).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    <select
                      value={c.statut}
                      onChange={e => updateAchatStatut(c.id, e.target.value as AchatStatut)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer appearance-none ${STATUT_STYLE[c.statut] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      <option value="En cours">En cours</option>
                      <option value="Reçue">Reçue</option>
                      <option value="En attente">En attente</option>
                      <option value="Annulée">Annulée</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
