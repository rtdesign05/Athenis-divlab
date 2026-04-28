import { useMemo, useState } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion, type FactureAchatStatut } from '@/contexts/GestionContext'

const STATUT_STYLE: Record<FactureAchatStatut, string> = {
  'À valider': 'bg-amber-100 text-amber-700',
  'Validée':   'bg-blue-100 text-blue-700',
  'Payée':     'bg-green-100 text-green-700',
  'En retard': 'bg-red-100 text-red-600',
  'Annulée':   'bg-red-50 text-red-400',
}

const STATUTS: FactureAchatStatut[] = ['À valider', 'Validée', 'Payée', 'En retard', 'Annulée']

export function FacturesAchatsPage() {
  const { fmt }  = useCurrency()
  const { user } = useAuth()
  const { facturesAchats, updateFactureAchatStatut } = useGestion()

  const agenceNom = user?.agenceNom ?? null

  const [search,       setSearch]       = useState('')
  const [statutFilter, setStatutFilter] = useState<FactureAchatStatut | 'all'>('all')

  const items = useMemo(() => {
    let list = agenceNom ? facturesAchats.filter(f => f.agence === agenceNom) : facturesAchats
    if (statutFilter !== 'all') list = list.filter(f => f.statut === statutFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(f =>
        f.fournisseur.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q),
      )
    }
    return list
  }, [facturesAchats, agenceNom, statutFilter, search])

  const totalTTC  = items.filter(f => f.statut !== 'Annulée').reduce((s, f) => s + f.montantTTC, 0)
  const payees    = items.filter(f => f.statut === 'Payée').length
  const enRetard  = items.filter(f => f.statut === 'En retard').length
  const aValider  = items.filter(f => f.statut === 'À valider').length

  return (
    <div className="h-full flex flex-col gap-3">

      {/* En-tête */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-gray-900">Factures achats</h1>
          {agenceNom && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              🏢 {agenceNom}
            </span>
          )}
        </div>
        <button className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
          + Nouvelle facture
        </button>
      </div>

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Montant TTC total</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{fmt(totalTTC)}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-xs text-green-600">Payées</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{payees}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-600">En retard</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{enRetard}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-600">À valider</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{aValider}</p>
        </div>
      </div>

      {/* Tableau */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="shrink-0 flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Fournisseur, N° facture…"
              className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
          </div>
          <select
            value={statutFilter}
            onChange={e => setStatutFilter(e.target.value as FactureAchatStatut | 'all')}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30"
          >
            <option value="all">Tous les statuts</option>
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="px-4 py-2.5">N° facture</th>
                <th className="px-4 py-2.5">Commande</th>
                <th className="px-4 py-2.5">Fournisseur</th>
                {!agenceNom && <th className="px-4 py-2.5">Agence</th>}
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Échéance</th>
                <th className="px-4 py-2.5 text-right">Montant TTC</th>
                <th className="px-4 py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                    Aucune facture trouvée
                  </td>
                </tr>
              ) : items.map(f => (
                <tr key={f.id} className="hover:bg-gray-50/60 cursor-pointer">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-green-700">{f.id}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{f.commande}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{f.fournisseur}</td>
                  {!agenceNom && <td className="px-4 py-2.5 text-[11px] text-gray-500">{f.agence}</td>}
                  <td className="px-4 py-2.5 text-gray-500">{new Date(f.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2.5 text-gray-500">{new Date(f.echeance).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmt(f.montantTTC)}</td>
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    <select
                      value={f.statut}
                      onChange={e => updateFactureAchatStatut(f.id, e.target.value as FactureAchatStatut)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer appearance-none ${STATUT_STYLE[f.statut] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
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
