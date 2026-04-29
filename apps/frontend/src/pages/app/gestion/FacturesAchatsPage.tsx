import { useMemo, useState } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion, type FactureAchatStatut } from '@/contexts/GestionContext'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'

const STATUT_STYLE: Record<FactureAchatStatut, string> = {
  'À valider': 'bg-amber-100 text-amber-700',
  'Validée':   'bg-blue-100 text-blue-700',
  'Payée':     'bg-green-100 text-green-700',
  'En retard': 'bg-red-100 text-red-600',
  'Annulée':   'bg-red-50 text-red-400',
}

const STATUTS: FactureAchatStatut[] = ['À valider', 'Validée', 'Payée', 'En retard', 'Annulée']
const AGENCES = ['Siège', 'Agence Douala — Akwa', 'Succursale Yaoundé — Centre', 'Agence Bafoussam']

// ── Modal nouvelle facture achat ──────────────────────────────────────────────

interface ModalFactureAchatProps {
  achats:    { id: string; fournisseur: string; agence: string; montant: number }[]
  agenceNom: string | null
  defaultVatRate: number
  onSave: (data: Omit<import('@/contexts/GestionContext').FactureAchat, 'id'>) => void
  onClose: () => void
}

function ModalFactureAchat({ achats, agenceNom, defaultVatRate, onSave, onClose }: ModalFactureAchatProps) {
  const today = new Date().toISOString().slice(0, 10)

  const availableAchats = useMemo(
    () => agenceNom ? achats.filter(a => a.agence === agenceNom) : achats,
    [achats, agenceNom],
  )

  const [form, setForm] = useState({
    commande:    availableAchats[0]?.id ?? '',
    fournisseur: availableAchats[0]?.fournisseur ?? '',
    agence:      agenceNom ?? availableAchats[0]?.agence ?? 'Siège',
    date:        today,
    echeance:    '',
    montantHT:   availableAchats[0]?.montant ? Math.round(availableAchats[0].montant / (1 + defaultVatRate / 100)) : 0,
    tva:         defaultVatRate,
    statut:      'À valider' as FactureAchatStatut,
  })

  const montantTTC = useMemo(
    () => Math.round(form.montantHT * (1 + form.tva / 100)),
    [form.montantHT, form.tva],
  )

  function handleCommandeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const cmd = availableAchats.find(a => a.id === e.target.value)
    setForm(f => ({
      ...f,
      commande:    e.target.value,
      fournisseur: cmd?.fournisseur ?? f.fournisseur,
      agence:      agenceNom ?? cmd?.agence ?? f.agence,
      montantHT:   cmd ? Math.round(cmd.montant / (1 + f.tva / 100)) : f.montantHT,
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fournisseur.trim() || form.montantHT <= 0 || !form.echeance) return
    onSave({
      commande:    form.commande,
      fournisseur: form.fournisseur.trim(),
      agence:      form.agence,
      date:        form.date,
      echeance:    form.echeance,
      montantHT:   form.montantHT,
      tva:         form.tva,
      montantTTC,
      statut:      form.statut,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Nouvelle facture achat</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Commande fournisseur</label>
            {availableAchats.length > 0 ? (
              <select value={form.commande} onChange={handleCommandeChange}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                <option value="">— saisie libre —</option>
                {availableAchats.map(a => (
                  <option key={a.id} value={a.id}>{a.id} — {a.fournisseur}</option>
                ))}
              </select>
            ) : (
              <input value={form.commande}
                onChange={e => setForm(f => ({ ...f, commande: e.target.value }))}
                placeholder="ACH-xxxx"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fournisseur *</label>
            <input value={form.fournisseur}
              onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))} required
              placeholder="Nom du fournisseur"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date facture *</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Échéance *</label>
              <input type="date" value={form.echeance}
                onChange={e => setForm(f => ({ ...f, echeance: e.target.value }))} required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Montant HT (XAF) *</label>
              <input type="number" min={1} value={form.montantHT}
                onChange={e => setForm(f => ({ ...f, montantHT: Number(e.target.value) }))} required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">TVA (%)</label>
              <input type="number" min={0} max={100} step={0.01} value={form.tva}
                onChange={e => setForm(f => ({ ...f, tva: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">Montant TTC calculé</span>
            <span className="text-sm font-semibold text-gray-900">{montantTTC.toLocaleString('fr-FR')} XAF</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Statut initial</label>
              <select value={form.statut}
                onChange={e => setForm(f => ({ ...f, statut: e.target.value as FactureAchatStatut }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                {STATUTS.filter(s => s !== 'En retard').map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Agence</label>
              {agenceNom ? (
                <input value={agenceNom} readOnly
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
              ) : (
                <select value={form.agence}
                  onChange={e => setForm(f => ({ ...f, agence: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                  {AGENCES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              className="flex-1 rounded-lg bg-green-700 py-2 text-xs font-semibold text-white hover:bg-green-800">
              Créer la facture
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function FacturesAchatsPage() {
  const { fmt, defaultVatRate } = useCurrency()
  const { user }                = useAuth()
  const { facturesAchats, achats, updateFactureAchatStatut, addFactureAchat } = useGestion()
  const { vatRate }             = useCompanySettings()

  const agenceNom = user?.agenceNom ?? null
  const [search,       setSearch]       = useState('')
  const [statutFilter, setStatutFilter] = useState<FactureAchatStatut | 'all'>('all')
  const [modal,        setModal]        = useState(false)

  const effectiveVat = vatRate ?? defaultVatRate

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

  const totalTTC = items.filter(f => f.statut !== 'Annulée').reduce((s, f) => s + f.montantTTC, 0)
  const payees   = items.filter(f => f.statut === 'Payée').length
  const enRetard = items.filter(f => f.statut === 'En retard').length
  const aValider = items.filter(f => f.statut === 'À valider').length

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
        <button onClick={() => setModal(true)}
          className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
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
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Fournisseur, N° facture…"
              className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <select value={statutFilter}
            onChange={e => setStatutFilter(e.target.value as FactureAchatStatut | 'all')}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30">
            <option value="all">Tous les statuts</option>
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
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
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Aucune facture trouvée</td></tr>
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
                    <select value={f.statut}
                      onChange={e => updateFactureAchatStatut(f.id, e.target.value as FactureAchatStatut)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer appearance-none ${STATUT_STYLE[f.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ModalFactureAchat
          achats={achats}
          agenceNom={agenceNom}
          defaultVatRate={effectiveVat}
          onSave={data => { addFactureAchat(data); setModal(false) }}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  )
}
