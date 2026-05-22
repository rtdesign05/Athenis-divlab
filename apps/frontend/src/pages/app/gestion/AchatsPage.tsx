import { useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import {
  useGestion,
  type Achat,
  type AchatStatut,
  type LigneAchat,
} from '@/contexts/GestionContext'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import { printDocument } from '@/lib/printDocument'
import { PeriodFilter, filterByDateRange } from '@/components/gestion/PeriodFilter'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUT_STYLE: Record<AchatStatut, string> = {
  'En cours':   'bg-blue-100 text-blue-700',
  'Reçue':      'bg-green-100 text-green-700',
  'En attente': 'bg-amber-100 text-amber-700',
  'Annulée':    'bg-red-100 text-red-600',
}

const AGENCES_DEFAULT = ['Siège']

let _ligneCounter = 1
function newLigneId() { return `new-${_ligneCounter++}` }

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Modal création / édition Bon de commande ──────────────────────────────────

interface ModalBCProps {
  fournisseurs: { nom: string }[]
  agenceNom:   string | null
  agences:     string[]
  initial?:    Achat
  onSave:      (data: Omit<Achat, 'id'>) => void
  onClose:     () => void
}

function ModalBC({ fournisseurs, agenceNom, agences, initial, onSave, onClose }: ModalBCProps) {
  const today  = new Date().toISOString().slice(0, 10)
  const isEdit = !!initial

  const [form, setForm] = useState({
    fournisseur:       initial?.fournisseur        ?? '',
    agence:            initial?.agence             ?? agenceNom ?? (agences[0] ?? 'Siège'),
    date:              initial?.date               ?? today,
    montant:           initial?.montant            ?? 0,
    statut:            initial?.statut             ?? ('En cours' as AchatStatut),
    reception:         initial?.reception          ?? '',
    objet:             initial?.objet              ?? '',
    notes:             initial?.notes              ?? '',
    conditionsPaiement:initial?.conditionsPaiement ?? 'Paiement à 30 jours',
  })
  const [lignes, setLignes] = useState<LigneAchat[]>(
    initial?.lignes ?? [{ id: newLigneId(), reference: '', designation: '', quantite: 1, unite: 'pièce', prixUnitaireHT: 0, montantHT: 0 }]
  )

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function addLigne() {
    setLignes(l => [...l, { id: newLigneId(), reference: '', designation: '', quantite: 1, unite: 'pièce', prixUnitaireHT: 0, montantHT: 0 }])
  }
  function removeLigne(id: string) {
    setLignes(l => l.filter(x => x.id !== id))
  }
  function updateLigne(id: string, k: keyof LigneAchat, v: string | number) {
    setLignes(l => l.map(x => {
      if (x.id !== id) return x
      const updated = { ...x, [k]: v }
      if (k === 'quantite' || k === 'prixUnitaireHT') {
        updated.montantHT = (k === 'quantite' ? Number(v) : x.quantite) * (k === 'prixUnitaireHT' ? Number(v) : x.prixUnitaireHT)
      }
      return updated
    }))
  }

  const totalHT = lignes.reduce((s, l) => s + l.montantHT, 0)
  const tva     = totalHT * 0.1925
  const totalTTC = totalHT + tva

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fournisseur.trim() || lignes.length === 0) return
    onSave({
      fournisseur:        form.fournisseur.trim(),
      agence:             form.agence,
      date:               form.date,
      montant:            totalTTC,
      statut:             form.statut,
      reception:          form.reception || null,
      objet:              form.objet.trim(),
      notes:              form.notes.trim(),
      conditionsPaiement: form.conditionsPaiement.trim(),
      lignes,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl my-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            {isEdit ? `Modifier — ${initial?.id}` : 'Nouveau bon de commande'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* Infos générales */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fournisseur *</label>
              <input list="bc-fournisseurs-list" value={form.fournisseur} onChange={set('fournisseur')} required
                placeholder="Nom du fournisseur…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
              <datalist id="bc-fournisseurs-list">
                {fournisseurs.map(f => <option key={f.nom} value={f.nom} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Agence</label>
              {agenceNom ? (
                <input value={agenceNom} readOnly
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
              ) : (
                <select value={form.agence} onChange={set('agence')}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                  {agences.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <input type="date" value={form.date} onChange={set('date')} required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Réception prévue</label>
              <input type="date" value={form.reception} onChange={set('reception')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
              <select value={form.statut} onChange={set('statut')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                <option value="En cours">En cours</option>
                <option value="En attente">En attente</option>
                <option value="Reçue">Reçue</option>
                <option value="Annulée">Annulée</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Conditions de paiement</label>
              <input value={form.conditionsPaiement} onChange={set('conditionsPaiement')}
                placeholder="Paiement à 30 jours…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Objet de la commande</label>
            <input value={form.objet} onChange={set('objet')}
              placeholder="Objet / description générale…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>

          {/* Lignes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Lignes de commande</span>
              <button type="button" onClick={addLigne}
                className="text-xs text-green-700 hover:text-green-800 font-medium">+ Ajouter ligne</button>
            </div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr className="text-left text-[11px] font-semibold text-gray-500">
                    <th className="px-2 py-2">Réf.</th>
                    <th className="px-2 py-2">Désignation</th>
                    <th className="px-2 py-2 text-right">Qté</th>
                    <th className="px-2 py-2">Unité</th>
                    <th className="px-2 py-2 text-right">P.U. HT</th>
                    <th className="px-2 py-2 text-right">Montant HT</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lignes.map(l => (
                    <tr key={l.id}>
                      <td className="px-2 py-1.5">
                        <input value={l.reference} onChange={e => updateLigne(l.id, 'reference', e.target.value)}
                          placeholder="REF-001"
                          className="w-20 rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={l.designation} onChange={e => updateLigne(l.id, 'designation', e.target.value)}
                          placeholder="Désignation…" required
                          className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min={0} step="0.01" placeholder="0" value={l.quantite || ''}
                          onChange={e => updateLigne(l.id, 'quantite', parseFloat(e.target.value) || 0)}
                          className="w-16 rounded border border-gray-200 px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={l.unite} onChange={e => updateLigne(l.id, 'unite', e.target.value)}
                          placeholder="pièce"
                          className="w-16 rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min={0} step="1" placeholder="0" value={l.prixUnitaireHT || ''}
                          onChange={e => updateLigne(l.id, 'prixUnitaireHT', parseFloat(e.target.value) || 0)}
                          className="w-24 rounded border border-gray-200 px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold text-gray-700 whitespace-nowrap">
                        {l.montantHT.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-2 py-1.5">
                        <button type="button" onClick={() => removeLigne(l.id)}
                          className="text-red-400 hover:text-red-600 text-base leading-none">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-right text-xs text-gray-500 space-y-0.5 pr-2">
              <div>Total HT : <span className="font-semibold text-gray-800">{totalHT.toLocaleString('fr-FR')} XAF</span></div>
              <div>TVA 19,25 % : <span className="font-semibold text-gray-800">{Math.round(tva).toLocaleString('fr-FR')} XAF</span></div>
              <div className="text-sm font-bold text-gray-900">Total TTC : {Math.round(totalTTC).toLocaleString('fr-FR')} XAF</div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2}
              placeholder="Remarques, instructions particulières…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              className="flex-1 rounded-lg bg-green-700 py-2 text-xs font-semibold text-white hover:bg-green-800">
              {isEdit ? 'Enregistrer les modifications' : 'Créer le bon de commande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Confirmation annulation ───────────────────────────────────────────────────

function ConfirmAnnulModal({ id, onConfirm, onClose }: { id: string; onConfirm(): void; onClose(): void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Annuler le bon de commande</h2>
        <p className="text-xs text-gray-500 mb-5">
          Voulez-vous vraiment annuler le bon de commande <strong>{id}</strong> ?
          Cette action passera le statut à « Annulée ».
        </p>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
            Non, garder
          </button>
          <button onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700">
            Oui, annuler
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Vue BON DE COMMANDE (document) ────────────────────────────────────────────

interface BCViewProps {
  bc:          Achat
  companyName: string
  address:     string
  city:        string
  fmtCurrency: (n: number) => string
  onClose:     () => void
  onEdit:      () => void
  onAnnuler:   () => void
}

function BCView({ bc, companyName, address, city, fmtCurrency, onClose, onEdit, onAnnuler }: BCViewProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const totalHT  = (bc.lignes ?? []).reduce((s, l) => s + l.montantHT, 0)
  const tva      = totalHT * 0.1925
  const totalTTC = totalHT + tva

  const statutBadge = STATUT_STYLE[bc.statut] ?? 'bg-gray-100 text-gray-600'

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
            ← Retour
          </button>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statutBadge}`}>{bc.statut}</span>
        </div>
        <div className="flex items-center gap-2">
          {bc.statut !== 'Annulée' && (
            <button onClick={onAnnuler}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
              Annuler la commande
            </button>
          )}
          <button onClick={onEdit}
            className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50">
            ✏️ Modifier
          </button>
          <button onClick={() => printDocument(printRef.current, `BON DE COMMANDE ${bc.id}`)}
            className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800">
            🖨️ Imprimer / PDF
          </button>
        </div>
      </div>

      {/* Document */}
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div ref={printRef} className="mx-auto max-w-2xl bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {/* En-tête société */}
          <div className="bg-[#1a3a2a] px-8 py-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xl font-bold text-white">{companyName}</p>
                {address && <p className="mt-1 text-xs text-white/70">{address}</p>}
                {city && <p className="text-xs text-white/70">{city}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-white/80 uppercase tracking-wider">Bon de Commande</p>
                <p className="mt-1 text-lg font-mono font-bold text-white">{bc.id}</p>
                <p className="mt-1 text-xs text-white/70">Date : {fmtDate(bc.date)}</p>
              </div>
            </div>
          </div>

          {/* Corps */}
          <div className="px-8 py-6 space-y-6">

            {/* Infos fournisseur + commande */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Fournisseur</p>
                <p className="text-sm font-bold text-gray-900">{bc.fournisseur}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Détails commande</p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Agence</span>
                  <span className="font-medium text-gray-800">{bc.agence}</span>
                </div>
                {bc.reception && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Réception prévue</span>
                    <span className="font-medium text-gray-800">{fmtDate(bc.reception)}</span>
                  </div>
                )}
                {bc.conditionsPaiement && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Conditions paiement</span>
                    <span className="font-medium text-gray-800">{bc.conditionsPaiement}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Objet */}
            {bc.objet && (
              <div className="rounded-lg border border-gray-200 px-4 py-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Objet : </span>
                <span className="text-sm text-gray-800">{bc.objet}</span>
              </div>
            )}

            {/* Table lignes */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-3 py-2.5">N°</th>
                    <th className="px-3 py-2.5">Réf.</th>
                    <th className="px-3 py-2.5">Désignation</th>
                    <th className="px-3 py-2.5 text-right">Qté</th>
                    <th className="px-3 py-2.5">Unité</th>
                    <th className="px-3 py-2.5 text-right">P.U. HT</th>
                    <th className="px-3 py-2.5 text-right">Montant HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(bc.lignes ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-xs text-gray-400">
                        Aucune ligne de commande
                      </td>
                    </tr>
                  ) : (bc.lignes ?? []).map((l, i) => (
                    <tr key={l.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{l.reference || '—'}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-900">{l.designation}</td>
                      <td className="px-3 py-2.5 text-right text-sm text-gray-700">{l.quantite}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{l.unite}</td>
                      <td className="px-3 py-2.5 text-right text-sm text-gray-700">
                        {l.prixUnitaireHT.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                        {l.montantHT.toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totaux */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Total HT</span>
                  <span className="font-medium">{totalHT.toLocaleString('fr-FR')} XAF</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>TVA 19,25 %</span>
                  <span className="font-medium">{Math.round(tva).toLocaleString('fr-FR')} XAF</span>
                </div>
                <div className="border-t border-gray-200 pt-1.5 flex justify-between text-sm font-bold text-gray-900">
                  <span>Total TTC</span>
                  <span>{fmtCurrency(Math.round(totalTTC))}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {bc.notes && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1">Notes</p>
                <p className="text-xs text-gray-700">{bc.notes}</p>
              </div>
            )}

            {/* Pied de page */}
            <div className="border-t border-gray-100 pt-4 text-center">
              <p className="text-[11px] text-gray-400">
                © {new Date().getFullYear()} {companyName} — Document généré par Athenis
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function AchatsPage() {
  const { fmt }  = useCurrency()
  const { user } = useAuth()
  const { achats: allAchats, fournisseurs, updateAchat, updateAchatStatut, addAchat } = useGestion()
  const { company, agences } = useCompanySettings()
  const activeAgences = useMemo(() => agences.filter(a => a.isActive), [agences])
  const agencesList   = useMemo(
    () => activeAgences.length > 0 ? activeAgences.map(a => a.nom) : AGENCES_DEFAULT,
    [activeAgences],
  )

  const agenceNom = user?.agenceNom ?? null

  const [agenceFilter, setAgenceFilter] = useState<string>('all')
  const [search,       setSearch]       = useState('')
  const [selected,     setSelected]     = useState<Achat | null>(null)
  const [modal,        setModal]        = useState<'create' | 'edit' | null>(null)
  const [confirmAnnul, setConfirmAnnul] = useState(false)
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')

  const achats = useMemo(() => {
    let list = agenceNom ? allAchats.filter(a => a.agence === agenceNom) : allAchats
    if (!agenceNom && agenceFilter !== 'all') list = list.filter(a => a.agence === agenceFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.id.toLowerCase().includes(q) ||
        a.fournisseur.toLowerCase().includes(q) ||
        (a.objet ?? '').toLowerCase().includes(q)
      )
    }
    list = filterByDateRange(list, a => a.date, dateFrom, dateTo)
    return list
  }, [allAchats, agenceNom, agenceFilter, search, dateFrom, dateTo])
  const isFiltered = dateFrom !== '' || dateTo !== ''

  // Sync selected with live state
  const selectedLive = useMemo(
    () => selected ? (allAchats.find(a => a.id === selected.id) ?? null) : null,
    [selected, allAchats],
  )

  const totalAchats = achats.filter(c => c.statut !== 'Annulée').reduce((s, c) => s + c.montant, 0)
  const enCours     = achats.filter(c => c.statut === 'En cours').length
  const recues      = achats.filter(c => c.statut === 'Reçue').length
  const enAttente   = achats.filter(c => c.statut === 'En attente').length

  const companyName = company?.name    ?? 'Mon Entreprise'
  const address     = company?.address ?? ''
  const city        = company?.city    ?? ''

  async function handleCreate(data: Omit<Achat, 'id'>) {
    const created = await addAchat(data)
    setModal(null)
    setSelected(created)
  }

  function handleEdit(data: Omit<Achat, 'id'>) {
    if (!selectedLive) return
    updateAchat(selectedLive.id, data)
    setModal(null)
  }

  function handleAnnuler() {
    if (!selectedLive) return
    updateAchat(selectedLive.id, { statut: 'Annulée' })
    setConfirmAnnul(false)
  }

  return (
    <div className="h-full flex flex-col gap-3">

      {/* En-tête */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-gray-900">Bons de commande</h1>
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
              <select value={agenceFilter} onChange={e => setAgenceFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30">
                <option value="all">Toutes ({activeAgences.length})</option>
                {activeAgences.map(a => <option key={a.id} value={a.nom}>{a.nom}</option>)}
              </select>
              <Link to="/app/settings/agences" className="text-[10px] text-gray-400 hover:text-green-700 transition-colors" title="Gérer les agences">⚙️</Link>
            </div>
          )}
          <button onClick={() => setModal('create')}
            className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
            + Nouveau bon de commande
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

      {/* Contenu principal */}
      <div className="flex-1 min-h-0 flex gap-3">

        {/* Liste */}
        <div className={`flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden transition-all ${selectedLive ? 'w-80 shrink-0' : 'flex-1'}`}>
          <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-4 py-2.5 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-gray-900">
              Commandes
              {agenceFilter !== 'all' && !agenceNom && (
                <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">{agenceFilter}</span>
              )}
            </h2>
            <PeriodFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={r => { setDateFrom(r.dateFrom); setDateTo(r.dateTo) }}
              count={isFiltered ? `${achats.length} résultat${achats.length > 1 ? 's' : ''}` : null}
            />
            <input type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30 w-36" />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {selectedLive ? (
              /* Mode liste compacte (panneau gauche) */
              <div className="divide-y divide-gray-50">
                {achats.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-gray-400">Aucun bon de commande</p>
                ) : achats.map(a => (
                  <button key={a.id} onClick={() => setSelected(a)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50/80 transition-colors ${selectedLive?.id === a.id ? 'bg-green-50 border-l-2 border-green-600' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold text-green-700">{a.id}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${STATUT_STYLE[a.statut]}`}>{a.statut}</span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-gray-900 truncate">{a.fournisseur}</p>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">{new Date(a.date).toLocaleDateString('fr-FR')}</span>
                      <span className="text-[11px] font-semibold text-gray-700">{fmt(a.montant)}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              /* Mode tableau complet */
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                    <th className="px-4 py-2.5">N° commande</th>
                    <th className="px-4 py-2.5">Fournisseur</th>
                    <th className="px-4 py-2.5">Agence</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5 text-right">Montant</th>
                    <th className="px-4 py-2.5">Articles</th>
                    <th className="px-4 py-2.5">Réception prévue</th>
                    <th className="px-4 py-2.5">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {achats.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                        Aucun bon de commande
                      </td>
                    </tr>
                  ) : achats.map(a => (
                    <tr key={a.id}
                      onClick={() => setSelected(a)}
                      className="hover:bg-green-50/40 cursor-pointer transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-green-700">{a.id}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{a.fournisseur}</td>
                      <td className="px-4 py-2.5 text-[11px] text-gray-500">{a.agence}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{new Date(a.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmt(a.montant)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {(a.lignes ?? []).length > 0
                          ? `${(a.lignes ?? []).length} article${(a.lignes ?? []).length !== 1 ? 's' : ''}`
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {a.reception ? new Date(a.reception).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                        <select value={a.statut}
                          onChange={e => updateAchatStatut(a.id, e.target.value as AchatStatut)}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer appearance-none ${STATUT_STYLE[a.statut]}`}>
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
            )}
          </div>
        </div>

        {/* Document BON DE COMMANDE */}
        {selectedLive && (
          <BCView
            bc={selectedLive}
            companyName={companyName}
            address={address}
            city={city}
            fmtCurrency={fmt}
            onClose={() => setSelected(null)}
            onEdit={() => setModal('edit')}
            onAnnuler={() => setConfirmAnnul(true)}
          />
        )}
      </div>

      {/* Modals */}
      {modal === 'create' && (
        <ModalBC
          fournisseurs={fournisseurs}
          agenceNom={agenceNom}
          agences={agencesList}
          onSave={handleCreate}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'edit' && selectedLive && (
        <ModalBC
          fournisseurs={fournisseurs}
          agenceNom={agenceNom}
          agences={agencesList}
          initial={selectedLive}
          onSave={handleEdit}
          onClose={() => setModal(null)}
        />
      )}
      {confirmAnnul && selectedLive && (
        <ConfirmAnnulModal
          id={selectedLive.id}
          onConfirm={handleAnnuler}
          onClose={() => setConfirmAnnul(false)}
        />
      )}
    </div>
  )
}
