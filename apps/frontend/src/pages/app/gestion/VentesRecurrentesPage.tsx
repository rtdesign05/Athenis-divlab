import { useState, useMemo, Component, type ReactNode, type ErrorInfo } from 'react'
import { useCurrency }      from '@/hooks/useCurrency'
import { useAuth }          from '@/features/auth/useAuth'
import {
  useGestion,
  type VenteRecurrente,
  type VenteRecurrenteFrequence,
  type VenteRecurrenteStatut,
  type LigneFacture,
} from '@/contexts/GestionContext'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import { PeriodFilter, filterByDateRange } from '@/components/gestion/PeriodFilter'

// ── Fallback pour erreurs de rendu ────────────────────────────────────────────

class PageErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  override state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  override componentDidCatch(e: Error, info: ErrorInfo) {
    console.error('[VentesRecurrentesPage]', e, info.componentStack)
  }
  override render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-semibold text-red-700">Erreur lors du chargement de la page</p>
          <p className="text-sm text-red-500 mt-1">{this.state.error}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUT_STYLE: Record<VenteRecurrenteStatut, string> = {
  'Actif':    'bg-green-100 text-green-700',
  'En pause': 'bg-amber-100 text-amber-700',
  'Annulé':   'bg-red-100  text-red-600',
  'Expiré':   'bg-gray-100 text-gray-500',
}

const STATUTS: VenteRecurrenteStatut[] = ['Actif', 'En pause', 'Annulé', 'Expiré']

const FREQUENCE_LABEL: Record<VenteRecurrenteFrequence, string> = {
  mensuel:      'Mensuel',
  trimestriel:  'Trimestriel',
  semestriel:   'Semestriel',
  annuel:       'Annuel',
}

const FREQUENCE_MOIS: Record<VenteRecurrenteFrequence, number> = {
  mensuel: 1, trimestriel: 3, semestriel: 6, annuel: 12,
}

const FREQUENCES: VenteRecurrenteFrequence[] = ['mensuel', 'trimestriel', 'semestriel', 'annuel']

const CONDITIONS_PAIEMENT = [
  'Paiement comptant',
  'Paiement à 8 jours',
  'Paiement à 15 jours',
  'Paiement à 30 jours',
  'Virement bancaire à 30 jours',
  'Acompte 30% à la commande — solde à livraison',
]

const UNITES = ['pièce', 'kg', 'litre', 'm²', 'heure', 'forfait', 'jours', 'mois']

// ── Helpers ───────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

function daysUntil(iso: string): number {
  const now  = new Date(); now.setHours(0, 0, 0, 0)
  const then = new Date(iso)
  return Math.ceil((then.getTime() - now.getTime()) / 86_400_000)
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

// ── Formulaire abonnement (état) ──────────────────────────────────────────────

interface FormState {
  client:             string
  agence:             string
  description:        string
  frequence:          VenteRecurrenteFrequence
  dateDebut:          string
  dateFin:            string
  prochaineEcheance:  string
  statut:             VenteRecurrenteStatut
  tvaRate:            string
  conditionsPaiement: string
  notes:              string
  lignes:             LigneFacture[]
}

function emptyForm(): FormState {
  const d = today()
  return {
    client: '', agence: '', description: '', frequence: 'mensuel',
    dateDebut: d, dateFin: '', prochaineEcheance: addMonths(d, 1),
    statut: 'Actif', tvaRate: '19.25', conditionsPaiement: 'Paiement à 30 jours',
    notes: '',
    lignes: [{ id: uid(), description: '', quantite: 1, unite: 'forfait', prixUnitaireHT: 0, tvaRate: 19.25, montantHT: 0 }],
  }
}

function formFromVR(vr: VenteRecurrente): FormState {
  return {
    client:             vr.client,
    agence:             vr.agence,
    description:        vr.description,
    frequence:          vr.frequence,
    dateDebut:          vr.dateDebut,
    dateFin:            vr.dateFin ?? '',
    prochaineEcheance:  vr.prochaineEcheance,
    statut:             vr.statut,
    tvaRate:            String(vr.tvaRate),
    conditionsPaiement: vr.conditionsPaiement,
    notes:              vr.notes,
    lignes:             vr.lignes.map(l => ({ ...l })),
  }
}

// ── Page principale ───────────────────────────────────────────────────────────

export function VentesRecurrentesPage() {
  return (
    <PageErrorBoundary>
      <VentesRecurrentesPageInner />
    </PageErrorBoundary>
  )
}

function VentesRecurrentesPageInner() {
  const { fmt } = useCurrency()
  const { user } = useAuth()
  const { agences: agencesList } = useCompanySettings()
  const {
    ventesRecurrentes,
    addVenteRecurrente,
    updateVenteRecurrente,
    updateVenteRecurrenteStatut,
    addFactureVente,
    clients,
  } = useGestion()

  const userAgence    = user?.agenceNom ?? 'Siège'
  const agenceNames   = agencesList.map(a => a.nom)

  // ── Filtres ──────────────────────────────────────────────────────────────────

  const [filterStatut,  setFilterStatut]  = useState<VenteRecurrenteStatut | ''>('')
  const [filterClient,  setFilterClient]  = useState('')
  const [filterFreq,    setFilterFreq]    = useState<VenteRecurrenteFrequence | ''>('')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [dateFrom,      setDateFrom]      = useState('')
  const [dateTo,        setDateTo]        = useState('')

  const filtered = useMemo(() => {
    let list = ventesRecurrentes.filter(vr => {
      if (filterStatut && vr.statut !== filterStatut) return false
      if (filterFreq   && vr.frequence !== filterFreq) return false
      if (filterClient && vr.client !== filterClient) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!vr.description.toLowerCase().includes(q) && !vr.client.toLowerCase().includes(q)) return false
      }
      return true
    })
    // Filtre période sur la prochaine échéance
    list = filterByDateRange(list, vr => vr.prochaineEcheance, dateFrom, dateTo)
    return list
  }, [ventesRecurrentes, filterStatut, filterClient, filterFreq, searchQuery, dateFrom, dateTo])
  const isFiltered = dateFrom !== '' || dateTo !== ''

  // ── KPIs ─────────────────────────────────────────────────────────────────────

  const actifs = useMemo(() => ventesRecurrentes.filter(vr => vr.statut === 'Actif'), [ventesRecurrentes])

  const mrr = useMemo(() => {
    return actifs.reduce((sum, vr) => {
      const mois = FREQUENCE_MOIS[vr.frequence]
      return sum + vr.montantHT / mois
    }, 0)
  }, [actifs])

  const prochainesEcheances = useMemo(() => {
    return actifs
      .filter(vr => daysUntil(vr.prochaineEcheance) <= 30)
      .sort((a, b) => a.prochaineEcheance.localeCompare(b.prochaineEcheance))
  }, [actifs])

  // ── Modal Créer / Éditer ─────────────────────────────────────────────────────

  const [modalOpen,   setModalOpen]   = useState(false)
  const [editTarget,  setEditTarget]  = useState<VenteRecurrente | null>(null)
  const [form,        setForm]        = useState<FormState>(emptyForm)
  const [formError,   setFormError]   = useState('')
  const [saving,      setSaving]      = useState(false)

  function openCreate() {
    setEditTarget(null)
    setForm(emptyForm())
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(vr: VenteRecurrente) {
    setEditTarget(vr)
    setForm(formFromVR(vr))
    setFormError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditTarget(null)
  }

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
    setFormError('')
  }

  // ── Lignes ───────────────────────────────────────────────────────────────────

  function addLigne() {
    setForm(prev => ({
      ...prev,
      lignes: [...prev.lignes, {
        id: uid(), description: '', quantite: 1, unite: 'forfait',
        prixUnitaireHT: 0, tvaRate: parseFloat(prev.tvaRate) || 19.25, montantHT: 0,
      }],
    }))
  }

  function removeLigne(id: string) {
    setForm(prev => ({ ...prev, lignes: prev.lignes.filter(l => l.id !== id) }))
  }

  function updateLigne(id: string, patch: Partial<LigneFacture>) {
    setForm(prev => ({
      ...prev,
      lignes: prev.lignes.map(l => {
        if (l.id !== id) return l
        const updated = { ...l, ...patch }
        updated.montantHT = updated.quantite * updated.prixUnitaireHT
        return updated
      }),
    }))
  }

  const totalHT  = form.lignes.reduce((s, l) => s + l.montantHT, 0)
  const tvaRate  = parseFloat(form.tvaRate) || 0
  const totalTTC = totalHT * (1 + tvaRate / 100)

  // ── Sauvegarde ───────────────────────────────────────────────────────────────

  function handleSave() {
    if (!form.client.trim())      { setFormError('Le client est obligatoire.');            return }
    if (!form.description.trim()) { setFormError('La description est obligatoire.');       return }
    if (form.lignes.length === 0) { setFormError('Ajoutez au moins une ligne.');           return }
    if (totalHT <= 0)             { setFormError('Le montant total doit être supérieur à zéro.'); return }

    setSaving(true)
    const payload = {
      client:             form.client.trim(),
      agence:             form.agence.trim() || userAgence,
      description:        form.description.trim(),
      montantHT:          totalHT,
      tvaRate,
      montantTTC:         totalTTC,
      frequence:          form.frequence,
      dateDebut:          form.dateDebut,
      dateFin:            form.dateFin.trim() || null,
      prochaineEcheance:  form.prochaineEcheance || addMonths(form.dateDebut, FREQUENCE_MOIS[form.frequence]),
      statut:             form.statut,
      lignes:             form.lignes,
      conditionsPaiement: form.conditionsPaiement,
      notes:              form.notes,
    }

    if (editTarget) {
      updateVenteRecurrente(editTarget.id, payload)
    } else {
      addVenteRecurrente(payload)
    }

    setSaving(false)
    closeModal()
  }

  // ── Générer facture ───────────────────────────────────────────────────────────

  const [generatedId, setGeneratedId] = useState<string | null>(null)

  async function handleGenerate(vr: VenteRecurrente) {
    const facture = await addFactureVente({
      modele:             'standard',
      commande:           vr.id,
      client:             vr.client,
      agence:             vr.agence,
      date:               today(),
      echeance:           addMonths(today(), 1),
      montantHT:          vr.montantHT,
      tva:                vr.tvaRate,
      montantTTC:         vr.montantTTC,
      statut:             'Brouillon',
      lignes:             vr.lignes,
      notes:              `Facture récurrente — ${vr.description} (${FREQUENCE_LABEL[vr.frequence]})`,
      conditionsPaiement: vr.conditionsPaiement,
    })
    // Incrémenter le compteur et avancer la prochaine échéance
    updateVenteRecurrente(vr.id, {
      facturesGenerees:  vr.facturesGenerees + 1,
      prochaineEcheance: addMonths(vr.prochaineEcheance, FREQUENCE_MOIS[vr.frequence]),
    })
    setGeneratedId(facture.id)
    setTimeout(() => setGeneratedId(null), 4000)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* ── Bannière facture générée ── */}
      {generatedId && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-3">
          <span className="text-green-600 text-lg">✓</span>
          <span className="text-sm text-green-700 font-medium">
            Facture <span className="font-mono">{generatedId}</span> créée en brouillon dans Factures ventes.
          </span>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon="📈"
          label="MRR (revenus mensuels récurrents)"
          value={fmt(mrr)}
          sub="HT — abonnements actifs"
          color="text-green-700"
        />
        <KpiCard
          icon="🔄"
          label="Abonnements actifs"
          value={String(actifs.length)}
          sub={`sur ${ventesRecurrentes.length} au total`}
          color="text-blue-700"
        />
        <KpiCard
          icon="📅"
          label="Échéances sous 30 j"
          value={String(prochainesEcheances.length)}
          sub="à facturer prochainement"
          color={prochainesEcheances.length > 0 ? 'text-amber-600' : 'text-gray-500'}
        />
        <KpiCard
          icon="🧾"
          label="Factures générées"
          value={String(ventesRecurrentes.reduce((s, v) => s + v.facturesGenerees, 0))}
          sub="depuis le début"
          color="text-purple-700"
        />
      </div>

      {/* ── Barre d'actions ── */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30 w-44"
        />

        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value as VenteRecurrenteStatut | '')}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filterFreq}
          onChange={e => setFilterFreq(e.target.value as VenteRecurrenteFrequence | '')}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
        >
          <option value="">Toutes fréquences</option>
          {FREQUENCES.map(f => <option key={f} value={f}>{FREQUENCE_LABEL[f]}</option>)}
        </select>

        <select
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
        >
          <option value="">Tous les clients</option>
          {[...new Set(ventesRecurrentes.map(v => v.client))].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <PeriodFilter
          label="Prochaine éch."
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={r => { setDateFrom(r.dateFrom); setDateTo(r.dateTo) }}
          count={isFiltered ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}` : null}
        />

        <div className="ml-auto">
          <button
            onClick={openCreate}
            className="rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] transition-colors"
          >
            + Nouvel abonnement
          </button>
        </div>
      </div>

      {/* ── Tableau ── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">🔄</p>
          <p className="font-medium">Aucun abonnement trouvé</p>
          <p className="text-sm mt-1">Modifiez les filtres ou créez un nouvel abonnement.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Description</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Fréquence</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Montant HT</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Prochaine échéance</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Factures</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(vr => {
                const jours = daysUntil(vr.prochaineEcheance)
                const urgente = vr.statut === 'Actif' && jours <= 7
                return (
                  <tr key={vr.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{vr.client}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{vr.description}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {FREQUENCE_LABEL[vr.frequence]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                      {fmt(vr.montantHT)}
                    </td>
                    <td className="px-4 py-3">
                      {vr.statut === 'Actif' ? (
                        <span className={urgente ? 'font-semibold text-red-600' : 'text-gray-700'}>
                          {fmtDate(vr.prochaineEcheance)}
                          {urgente && <span className="ml-1 text-xs text-red-500">({jours}j)</span>}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={vr.statut}
                        onChange={e => updateVenteRecurrenteStatut(vr.id, e.target.value as VenteRecurrenteStatut)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1b4332]/20 ${STATUT_STYLE[vr.statut]}`}
                      >
                        {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{vr.facturesGenerees}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {vr.statut === 'Actif' && (
                          <button
                            onClick={() => handleGenerate(vr)}
                            title="Générer une facture"
                            className="rounded-lg px-2 py-1 text-xs font-medium text-white bg-[#1b4332] hover:bg-[#2d6a4f] transition-colors"
                          >
                            🧾 Facturer
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(vr)}
                          title="Modifier"
                          className="rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          ✏️
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Créer / Éditer ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            {/* En-tête */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {editTarget ? 'Modifier l\'abonnement' : 'Nouvel abonnement récurrent'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

              {/* Client + Agence */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                    Client <span className="text-red-500">*</span>
                  </label>
                  <input
                    list="clients-list"
                    value={form.client}
                    onChange={e => setField('client', e.target.value)}
                    placeholder="Nom du client"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
                  />
                  <datalist id="clients-list">
                    {clients.map(c => <option key={c.id} value={c.nom} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Agence</label>
                  <select
                    value={form.agence || userAgence}
                    onChange={e => setField('agence', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
                  >
                    {(agenceNames.length > 0 ? agenceNames : [userAgence]).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  placeholder="Ex : Contrat maintenance mensuelle"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
                />
              </div>

              {/* Fréquence + Statut */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Fréquence</label>
                  <select
                    value={form.frequence}
                    onChange={e => {
                      const f = e.target.value as VenteRecurrenteFrequence
                      setField('frequence', f)
                      setField('prochaineEcheance', addMonths(form.dateDebut, FREQUENCE_MOIS[f]))
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
                  >
                    {FREQUENCES.map(f => <option key={f} value={f}>{FREQUENCE_LABEL[f]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Statut</label>
                  <select
                    value={form.statut}
                    onChange={e => setField('statut', e.target.value as VenteRecurrenteStatut)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
                  >
                    {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Date de début</label>
                  <input
                    type="date"
                    value={form.dateDebut}
                    onChange={e => {
                      setField('dateDebut', e.target.value)
                      setField('prochaineEcheance', addMonths(e.target.value, FREQUENCE_MOIS[form.frequence]))
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Date de fin</label>
                  <input
                    type="date"
                    value={form.dateFin}
                    onChange={e => setField('dateFin', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
                    placeholder="Laisser vide si indéfini"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Prochaine échéance</label>
                  <input
                    type="date"
                    value={form.prochaineEcheance}
                    onChange={e => setField('prochaineEcheance', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
                  />
                </div>
              </div>

              {/* TVA + Conditions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">TVA (%)</label>
                  <input
                    type="number"
                    min="0" max="100" step="0.01"
                    value={form.tvaRate}
                    onChange={e => setField('tvaRate', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Conditions de paiement</label>
                  <select
                    value={form.conditionsPaiement}
                    onChange={e => setField('conditionsPaiement', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
                  >
                    {CONDITIONS_PAIEMENT.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Lignes */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                  Lignes de prestations <span className="text-red-500">*</span>
                </label>

                <div className="space-y-2">
                  {form.lignes.map((ligne, idx) => (
                    <div key={ligne.id} className="grid grid-cols-12 gap-2 items-start">
                      {/* Description */}
                      <div className="col-span-5">
                        {idx === 0 && <label className="block text-[10px] text-gray-400 mb-1">Description</label>}
                        <input
                          value={ligne.description}
                          onChange={e => updateLigne(ligne.id, { description: e.target.value })}
                          placeholder="Description"
                          className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
                        />
                      </div>
                      {/* Qté */}
                      <div className="col-span-1">
                        {idx === 0 && <label className="block text-[10px] text-gray-400 mb-1">Qté</label>}
                        <input
                          type="number" min="0"
                          value={ligne.quantite}
                          onChange={e => updateLigne(ligne.id, { quantite: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
                        />
                      </div>
                      {/* Unité */}
                      <div className="col-span-2">
                        {idx === 0 && <label className="block text-[10px] text-gray-400 mb-1">Unité</label>}
                        <select
                          value={ligne.unite}
                          onChange={e => updateLigne(ligne.id, { unite: e.target.value })}
                          className="w-full rounded border border-gray-200 px-1 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
                        >
                          {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      {/* PU HT */}
                      <div className="col-span-3">
                        {idx === 0 && <label className="block text-[10px] text-gray-400 mb-1">Prix unit. HT</label>}
                        <input
                          type="number" min="0"
                          value={ligne.prixUnitaireHT}
                          onChange={e => updateLigne(ligne.id, { prixUnitaireHT: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
                        />
                      </div>
                      {/* Supprimer */}
                      <div className="col-span-1 flex justify-center">
                        {idx === 0 && <label className="block text-[10px] text-gray-400 mb-1">&nbsp;</label>}
                        <button
                          type="button"
                          onClick={() => removeLigne(ligne.id)}
                          disabled={form.lignes.length === 1}
                          className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addLigne}
                  className="mt-2 flex items-center gap-1 text-xs text-[#1b4332] hover:text-[#2d6a4f] font-medium"
                >
                  <span className="text-base leading-none">+</span> Ajouter une ligne
                </button>

                {/* Totaux */}
                <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 flex gap-8 justify-end text-sm">
                  <div className="text-gray-500">
                    Total HT : <span className="font-semibold text-gray-900 ml-1">{fmt(totalHT)}</span>
                  </div>
                  <div className="text-gray-500">
                    TVA {tvaRate}% : <span className="font-semibold text-gray-900 ml-1">{fmt(totalHT * tvaRate / 100)}</span>
                  </div>
                  <div className="text-gray-500">
                    Total TTC : <span className="font-semibold text-[#1b4332] text-base ml-1">{fmt(totalTTC)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Notes internes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  rows={2}
                  placeholder="Conditions particulières, notes de suivi…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30 resize-none"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-500 rounded-lg bg-red-50 px-3 py-2">{formError}</p>
              )}
            </div>

            {/* Pied de modal */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[#1b4332] px-5 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : editTarget ? 'Mettre à jour' : 'Créer l\'abonnement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sous-composants ────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string; sub: string; color: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-gray-500 font-medium leading-tight">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}
