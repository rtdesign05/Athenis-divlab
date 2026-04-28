/**
 * VentesPage — Fix #1 : filtre agences depuis Paramètres
 *
 * Le sélecteur "Agence" est maintenant alimenté par la liste réelle
 * des agences configurées dans Paramètres → Agences.
 *
 * Exemple :
 *   - Créer "Agence Garoua" dans Paramètres → Agences
 *   - Revenir ici → "Agence Garoua" apparaît dans le filtre
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion } from '@/contexts/GestionContext'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'

const STATUT_STYLE: Record<string, string> = {
  'En cours':   'bg-blue-100 text-blue-700',
  'Livrée':     'bg-green-100 text-green-700',
  'En attente': 'bg-amber-100 text-amber-700',
  'Annulée':    'bg-red-100 text-red-600',
}

export function VentesPage() {
  const { fmt }          = useCurrency()
  const { user }         = useAuth()
  const { commandes: allCommandes } = useGestion()

  // Agences depuis Paramètres (réactif — mis à jour sans rechargement)
  const { agences } = useCompanySettings()
  const activeAgences = useMemo(() => agences.filter(a => a.isActive), [agences])

  // Restriction JWT : utilisateur lié à une agence spécifique
  const agenceNom = user?.agenceNom ?? null

  // Filtre agence sélectionné dans le dropdown (admin uniquement)
  const [agenceFilter, setAgenceFilter] = useState<string>('all')

  const commandes = useMemo(() => {
    // Restriction JWT (prioritaire)
    let list = agenceNom ? allCommandes.filter(c => c.agence === agenceNom) : allCommandes
    // Filtre UI (admin seulement)
    if (!agenceNom && agenceFilter !== 'all') list = list.filter(c => c.agence === agenceFilter)
    return list
  }, [allCommandes, agenceNom, agenceFilter])

  const totalCA   = commandes.filter(c => c.statut !== 'Annulée').reduce((s, c) => s + c.montant, 0)
  const enCours   = commandes.filter(c => c.statut === 'En cours').length
  const livrees   = commandes.filter(c => c.statut === 'Livrée').length
  const enAttente = commandes.filter(c => c.statut === 'En attente').length

  return (
    <div className="h-full flex flex-col gap-3">

      {/* ── En-tête ── */}
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-base font-semibold text-gray-900">Commandes clients</h1>
          {agenceNom && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              🏢 {agenceNom}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filtre agence — admin uniquement, alimenté par Paramètres */}
          {!agenceNom && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 shrink-0">🔗 Agence :</span>
              <select
                value={agenceFilter}
                onChange={e => setAgenceFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                title="Agences depuis Paramètres → Agences"
              >
                <option value="all">Toutes ({activeAgences.length})</option>
                {activeAgences.map(a => (
                  <option key={a.id} value={a.nom}>{a.nom}</option>
                ))}
              </select>
              <Link
                to="/app/settings/agences"
                className="text-[10px] text-gray-400 hover:text-green-700 transition-colors"
                title="Gérer les agences dans Paramètres"
              >
                ⚙️
              </Link>
            </div>
          )}

          <button className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
            + Nouvelle commande
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="shrink-0 grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">CA commandes</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{fmt(totalCA)}</p>
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
          <p className="text-xs text-green-600">Livrées</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{livrees}</p>
        </div>
      </div>

      {/* ── Tableau ── */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-gray-900">
            Commandes récentes
            {agenceFilter !== 'all' && !agenceNom && (
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                {agenceFilter}
              </span>
            )}
          </h2>
          <input
            type="search"
            placeholder="Rechercher…"
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                <th className="px-4 py-2.5">N° commande</th>
                <th className="px-4 py-2.5">Client</th>
                {!agenceNom && <th className="px-4 py-2.5">Agence</th>}
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5 text-right">Montant</th>
                <th className="px-4 py-2.5">Livraison prévue</th>
                <th className="px-4 py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {commandes.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                      {agenceFilter !== 'all' && !agenceNom
                        ? `Aucune commande pour « ${agenceFilter} »`
                        : 'Aucune commande pour cette agence'}
                    </td>
                  </tr>
                )
                : commandes.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/60 cursor-pointer">
                    <td className="px-4 py-2.5 font-mono text-xs font-medium text-green-700">{c.id}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{c.client}</td>
                    {!agenceNom && (
                      <td className="px-4 py-2.5 text-[11px] text-gray-500">{c.agence}</td>
                    )}
                    <td className="px-4 py-2.5 text-gray-500">{new Date(c.date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmt(c.montant)}</td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {c.livraison ? new Date(c.livraison).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_STYLE[c.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                        {c.statut}
                      </span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
