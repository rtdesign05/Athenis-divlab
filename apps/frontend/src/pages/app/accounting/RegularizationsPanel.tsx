/**
 * RegularizationsPanel — Régularisations d'inventaire SYSCOHADA / PCG
 *
 *   CCA  Charges Constatées d'Avance       → 486 (PCG) / 476 (OHADA)
 *   PCA  Produits Constatés d'Avance       → 487 (PCG) / 477 (OHADA)
 *   FNP  Factures Non Parvenues            → 408
 *   FAE  Factures à Établir                → 418
 *
 * Le formulaire génère automatiquement les deux lignes équilibrées (D = C)
 * dans le journal OD, avec une référence séquentielle REG-XXX-YYYY-0001.
 * Optionnellement, la contre-passation est créée au 1er jour de l'exercice N+1.
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingApi } from '@/services/accountingApi'
import { useCurrency } from '@/hooks/useCurrency'
import { CompteCombobox, type CompteOption } from '@/components/accounting/CompteCombobox'
import type { Regularization, RegularizationType } from '@/services/accountingApi'

interface Props {
  fiscalYearId: string
  fyYear:       number
  fyStartDate:  string
  fyEndDate:    string
  fyStatus:     string  // OPEN | LOCKED | CLOSED
}

// ── Métadonnées de type ─────────────────────────────────────────────────────

interface TypeMeta {
  type:         RegularizationType
  label:        string
  description:  string
  counterClass: '6' | '7'                 // classe attendue du compte de contrepartie
  example:      string
  color:        { bg: string; text: string; ring: string }
}

const TYPE_META: TypeMeta[] = [
  {
    type:         'CCA',
    label:        'Charges Constatées d\'Avance',
    description:  'Charge payée mais portant sur l\'exercice suivant (ex : assurance annuelle réglée en novembre)',
    counterClass: '6',
    example:      'D : 476/486 — C : 6xx',
    color:        { bg: 'bg-blue-50',   text: 'text-blue-700',   ring: 'ring-blue-200'   },
  },
  {
    type:         'PCA',
    label:        'Produits Constatés d\'Avance',
    description:  'Produit encaissé mais portant sur l\'exercice suivant (ex : loyer reçu d\'avance)',
    counterClass: '7',
    example:      'D : 7xx — C : 477/487',
    color:        { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200' },
  },
  {
    type:         'FNP',
    label:        'Factures Non Parvenues',
    description:  'Charge engagée dans l\'exercice mais facture pas encore reçue du fournisseur',
    counterClass: '6',
    example:      'D : 6xx — C : 408',
    color:        { bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-200'  },
  },
  {
    type:         'FAE',
    label:        'Factures à Établir',
    description:  'Produit acquis dans l\'exercice mais facture pas encore émise au client',
    counterClass: '7',
    example:      'D : 418 — C : 7xx',
    color:        { bg: 'bg-green-50',  text: 'text-green-700',  ring: 'ring-green-200'  },
  },
  {
    type:         'CAP',
    label:        'Charges à Payer',
    description:  'Charge engagée (personnel, social, fiscal, autres) — hors FNP fournisseurs',
    counterClass: '6',
    example:      'D : 6xx — C : 468/4686',
    color:        { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200' },
  },
  {
    type:         'PAR',
    label:        'Produits à Recevoir',
    description:  'Produit acquis dans l\'exercice (intérêts, redevances) — hors FAE clients',
    counterClass: '7',
    example:      'D : 4687 — C : 7xx',
    color:        { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  },
  {
    type:         'CD',
    label:        'Créances Douteuses (provision)',
    description:  'Dotation aux dépréciations sur client présentant un risque de non-recouvrement',
    counterClass: '6',
    example:      'D : 681x — C : 491',
    color:        { bg: 'bg-rose-50',   text: 'text-rose-700',   ring: 'ring-rose-200'   },
  },
]

function metaFor(type: RegularizationType | 'XXX'): TypeMeta | undefined {
  return TYPE_META.find(t => t.type === type)
}

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ── Modal de création ──────────────────────────────────────────────────────

interface ModalProps {
  fiscalYearId: string
  fyYear:       number
  fyStartDate:  string
  fyEndDate:    string
  onClose:      () => void
  onCreated:    (reference: string, hasExt: boolean) => void
}

function CreateRegModal({ fiscalYearId, fyYear, fyStartDate, fyEndDate, onClose, onCreated }: ModalProps) {
  const qc = useQueryClient()
  const [type,                setType]                = useState<RegularizationType>('CCA')
  const [date,                setDate]                = useState(fyEndDate.slice(0, 10))
  const [contrepartie,        setContrepartie]        = useState('')
  const [contrepartieRaw,     setContrepartieRaw]     = useState('')
  const [libelle,             setLibelle]             = useState('')
  const [montant,             setMontant]             = useState('')
  const [autoContrepassation, setAutoContrepassation] = useState(true)
  const [error,               setError]               = useState<string | null>(null)

  const meta = metaFor(type)!

  const mutation = useMutation({
    mutationFn: () => accountingApi.createRegularization({
      fiscalYearId,
      type,
      date,
      contrepartie: contrepartie.trim(),
      libelle:      libelle.trim(),
      montant:      Number(montant),
      autoContrepassation,
    }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['regularizations',  fiscalYearId] })
      qc.invalidateQueries({ queryKey: ['journal',          fiscalYearId] })
      qc.invalidateQueries({ queryKey: ['grand-livre-journal'] })
      qc.invalidateQueries({ queryKey: ['balance-journal'] })
      onCreated(data.reference, !!data.extourne)
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string; message?: string } }; message?: string }
      setError(err.response?.data?.error ?? err.response?.data?.message ?? err.message ?? 'Erreur')
    },
  })

  const montantNum = Number(montant)
  const validForm =
    !!type &&
    !!date &&
    contrepartie.trim().length >= 2 &&
    libelle.trim().length >= 2 &&
    montantNum > 0 &&
    contrepartie.trim().startsWith(meta.counterClass)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validForm) {
      if (!contrepartie.trim().startsWith(meta.counterClass)) {
        setError(`Le compte de contrepartie doit commencer par ${meta.counterClass} (classe ${meta.counterClass === '6' ? 'charge' : 'produit'})`)
      }
      return
    }
    mutation.mutate()
  }

  function handleSelectCompte(opt: CompteOption) {
    setContrepartie(opt.code)
    setContrepartieRaw(opt.code)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form onSubmit={handleSubmit} className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#1b4332] shrink-0">
          <h2 className="text-sm font-semibold text-white">Nouvelle régularisation d'inventaire</h2>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">

          {/* Type */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TYPE_META.map(t => {
                const active = type === t.type
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => { setType(t.type); setError(null) }}
                    className={`text-left rounded-lg border-2 px-3 py-2 transition-all ${
                      active ? `${t.color.bg} ${t.color.ring} ring-2 border-transparent`
                             : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`text-sm font-semibold ${active ? t.color.text : 'text-gray-700'}`}>
                      {t.type} — {t.label}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{t.description}</p>
                    <p className={`text-[10px] mt-1 font-mono ${active ? t.color.text : 'text-gray-400'}`}>
                      {t.example}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Date</label>
              <input
                type="date"
                value={date}
                min={fyStartDate.slice(0, 10)}
                max={fyEndDate.slice(0, 10)}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">
                Exercice {fyYear} ({fmtDate(fyStartDate)} → {fmtDate(fyEndDate)})
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Montant</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={montant}
                onChange={e => setMontant(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-right font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
              />
            </div>
          </div>

          {/* Compte de contrepartie */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Compte de contrepartie {meta.counterClass === '6' ? '(charge)' : '(produit)'}
            </label>
            <CompteCombobox
              value={contrepartieRaw}
              onChange={v => { setContrepartieRaw(v); setContrepartie(v) }}
              onSelect={handleSelectCompte}
              placeholder={meta.counterClass === '6'
                ? 'Ex : 601 — Achats marchandises'
                : 'Ex : 706 — Services vendus'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">
              Doit être un compte de classe {meta.counterClass} ({meta.counterClass === '6' ? 'charge' : 'produit'})
            </p>
          </div>

          {/* Libellé */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Libellé</label>
            <input
              type="text"
              value={libelle}
              onChange={e => setLibelle(e.target.value)}
              placeholder="Ex : Assurance véhicule — quote-part exercice suivant"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
            />
          </div>

          {/* Auto contre-passation */}
          <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={autoContrepassation}
              onChange={e => setAutoContrepassation(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-[#1b4332] focus:ring-[#1b4332]/30"
            />
            <div>
              <span className="block text-sm font-medium text-gray-800">
                Générer la contre-passation au 1er jour de l'exercice {fyYear + 1}
              </span>
              <span className="block text-[11px] text-gray-500 mt-0.5">
                Inverse automatiquement l'écriture (D ↔ C) — recommandé pour CCA / PCA / FNP / FAE.
                L'exercice {fyYear + 1} doit exister et ne pas être clôturé.
              </span>
            </div>
          </label>

          {/* Prévisualisation des écritures */}
          {validForm && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-700 mb-1">Aperçu de l'écriture</p>
              <PreviewLines type={type} montant={montantNum} counter={contrepartie.trim()} libelle={libelle.trim() || '—'} />
              {autoContrepassation && (
                <>
                  <p className="text-xs font-semibold text-gray-700 mt-3 mb-1">
                    Contre-passation au 01/01/{fyYear + 1} (exercice {fyYear + 1})
                  </p>
                  <PreviewLines type={type} montant={montantNum} counter={contrepartie.trim()} libelle={`Contre-passation — ${libelle.trim() || '—'}`} reverse />
                </>
              )}
            </div>
          )}

          {/* Erreur API */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button type="button" onClick={onClose} disabled={mutation.isPending}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-white transition-colors disabled:opacity-50">
            Annuler
          </button>
          <button type="submit" disabled={!validForm || mutation.isPending}
            className="flex-1 rounded-lg bg-[#1b4332] py-2.5 text-sm font-semibold text-white hover:bg-[#2d6a4f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {mutation.isPending ? (
              <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Création…</>
            ) : (
              <>✓ Générer l'écriture</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Aperçu (preview) ────────────────────────────────────────────────────────

function PreviewLines({
  type, montant, counter, libelle, reverse = false,
}: {
  type: RegularizationType; montant: number; counter: string; libelle: string; reverse?: boolean
}) {
  // Compte de régularisation par type — affichage OHADA par défaut.
  // (Le serveur choisira automatiquement le bon code selon la zone.)
  const regAccount = ({
    CCA: '476', PCA: '477', FNP: '408', FAE: '418',
    CAP: '468', PAR: '4687', CD: '491',
  } as const)[type]
  // Sens du compte de régularisation par défaut (cf. backend)
  const baseRegSide: 'D' | 'C' = type === 'CCA' || type === 'FAE' || type === 'PAR' ? 'D' : 'C'
  const regSide:    'D' | 'C' = reverse ? (baseRegSide === 'D' ? 'C' : 'D') : baseRegSide
  const ctrSide:    'D' | 'C' = regSide === 'D' ? 'C' : 'D'

  const fmtAmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <table className="w-full text-xs">
      <tbody>
        <tr>
          <td className="font-mono text-[#1b4332] py-0.5 w-16">{regAccount}</td>
          <td className="text-gray-600 truncate max-w-xs">{libelle}</td>
          <td className="text-right font-mono w-20">{regSide === 'D' ? fmtAmt(montant) : ''}</td>
          <td className="text-right font-mono w-20">{regSide === 'C' ? fmtAmt(montant) : ''}</td>
        </tr>
        <tr>
          <td className="font-mono text-[#1b4332] py-0.5">{counter}</td>
          <td className="text-gray-600 truncate max-w-xs">{libelle}</td>
          <td className="text-right font-mono">{ctrSide === 'D' ? fmtAmt(montant) : ''}</td>
          <td className="text-right font-mono">{ctrSide === 'C' ? fmtAmt(montant) : ''}</td>
        </tr>
      </tbody>
    </table>
  )
}

// ── Composant principal ────────────────────────────────────────────────────

export function RegularizationsPanel({ fiscalYearId, fyYear, fyStartDate, fyEndDate, fyStatus }: Props) {
  const { fmt: fmtAmount } = useCurrency()
  const qc = useQueryClient()

  const isReadOnly = fyStatus === 'CLOSED'

  const [showModal, setShowModal] = useState(false)
  const [filter,    setFilter]    = useState<RegularizationType | 'ALL'>('ALL')
  const [toast,     setToast]     = useState<string | null>(null)

  const { data: regs = [], isLoading } = useQuery({
    queryKey: ['regularizations', fiscalYearId],
    queryFn:  () => accountingApi.listRegularizations(fiscalYearId),
    staleTime: 15_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (pieceId: string) => accountingApi.deleteRegularization(pieceId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['regularizations',  fiscalYearId] })
      qc.invalidateQueries({ queryKey: ['journal',          fiscalYearId] })
      qc.invalidateQueries({ queryKey: ['grand-livre-journal'] })
      setToast(`✓ ${data.deleted} ligne(s) supprimée(s)${data.deletedExtourne > 0 ? ` + ${data.deletedExtourne} contre-passation` : ''}`)
      setTimeout(() => setToast(null), 4000)
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } }
      setToast(`⚠️ ${err.response?.data?.error ?? 'Erreur de suppression'}`)
      setTimeout(() => setToast(null), 6000)
    },
  })

  const filteredRegs: Regularization[] = useMemo(() => {
    if (filter === 'ALL') return regs
    return regs.filter(r => r.type === filter)
  }, [regs, filter])

  // Stats par type
  const stats = useMemo(() => {
    const m: Record<RegularizationType, { count: number; montant: number }> = {
      CCA: { count: 0, montant: 0 },
      PCA: { count: 0, montant: 0 },
      FNP: { count: 0, montant: 0 },
      FAE: { count: 0, montant: 0 },
      CAP: { count: 0, montant: 0 },
      PAR: { count: 0, montant: 0 },
      CD:  { count: 0, montant: 0 },
    }
    for (const r of regs) {
      if (r.type !== 'XXX' && m[r.type]) {
        m[r.type].count++
        m[r.type].montant += r.montant
      }
    }
    return m
  }, [regs])

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`rounded-lg border px-4 py-2.5 text-sm flex items-center justify-between ${
          toast.startsWith('✓')
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-lg leading-none opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* Header + bouton création */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Régularisations d'inventaire — Exercice {fyYear}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            CCA, PCA, FNP, FAE — Génération automatique avec contre-passation au début de l'exercice suivant
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] transition-colors"
          >
            + Nouvelle régularisation
          </button>
        )}
      </div>

      {isReadOnly && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
          🔒 Exercice {fyYear} clôturé — consultation seule
        </div>
      )}

      {/* Cartes de statistiques par type */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {TYPE_META.map(t => {
          const s = stats[t.type]
          const active = filter === t.type
          return (
            <button
              key={t.type}
              onClick={() => setFilter(active ? 'ALL' : t.type)}
              className={`text-left rounded-xl border-2 p-3 transition-all ${
                active ? `${t.color.bg} ${t.color.ring} ring-2 border-transparent`
                       : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${active ? t.color.text : 'text-gray-700'}`}>{t.type}</span>
                <span className={`text-[10px] rounded-full px-1.5 ${active ? `${t.color.text} bg-white/60` : 'bg-gray-100 text-gray-500'}`}>
                  {s.count}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-tight line-clamp-2">{t.label}</p>
              <p className={`mt-1.5 text-sm font-bold tabular-nums ${active ? t.color.text : 'text-gray-800'}`}>
                {fmtAmount(s.montant)}
              </p>
            </button>
          )
        })}
      </div>

      {filter !== 'ALL' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Filtre actif :</span>
          <span className="rounded-full bg-[#1b4332]/10 text-[#1b4332] px-2.5 py-0.5 text-xs font-semibold">
            {filter}
          </span>
          <button onClick={() => setFilter('ALL')} className="text-xs text-gray-500 hover:text-gray-700 underline">
            Voir tout
          </button>
        </div>
      )}

      {/* Tableau des régularisations */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
        </div>
      ) : filteredRegs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
          <p className="text-4xl">📋</p>
          <p className="text-sm font-medium">
            {regs.length === 0
              ? 'Aucune régularisation enregistrée sur cet exercice'
              : `Aucune régularisation de type ${filter}`}
          </p>
          {!isReadOnly && regs.length === 0 && (
            <button onClick={() => setShowModal(true)} className="mt-2 text-sm text-[#1b4332] underline">
              Créer la première régularisation
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                <th className="px-4 py-2.5 w-16">Type</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Référence</th>
                <th className="px-3 py-2.5">Libellé</th>
                <th className="px-3 py-2.5">Comptes</th>
                <th className="px-3 py-2.5 text-right">Montant</th>
                <th className="px-3 py-2.5 text-center w-24">Extourne</th>
                {!isReadOnly && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRegs.map(r => {
                const m = metaFor(r.type)
                return (
                  <tr key={r.pieceId} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5">
                      {m ? (
                        <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold ${m.color.bg} ${m.color.text}`}>
                          {r.type}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">{r.type}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.date)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-600">{r.reference}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 max-w-xs truncate" title={r.libelle}>{r.libelle}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <div className="flex flex-col gap-0.5">
                        {r.lignes.map(l => (
                          <div key={l.id} className="font-mono">
                            <span className="text-[#1b4332]">{l.compte}</span>
                            <span className="text-gray-400 ml-1.5">
                              {l.debit > 0 ? `D ${fmtAmount(l.debit)}` : `C ${fmtAmount(l.credit)}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm font-semibold tabular-nums">
                      {fmtAmount(r.montant)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.hasContrepassation ? (
                        <span title="Contre-passation générée dans l'exercice suivant"
                              className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-semibold">
                          ✓ {fyYear + 1}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">—</span>
                      )}
                    </td>
                    {!isReadOnly && (
                      <td className="px-2 py-2.5 text-center">
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer la régularisation ${r.reference} ?${r.hasContrepassation ? '\n\nLa contre-passation associée sera également supprimée.' : ''}`)) {
                              deleteMutation.mutate(r.pieceId)
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          title="Supprimer"
                          className="flex h-6 w-6 mx-auto items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors text-xs"
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de création */}
      {showModal && (
        <CreateRegModal
          fiscalYearId={fiscalYearId}
          fyYear={fyYear}
          fyStartDate={fyStartDate}
          fyEndDate={fyEndDate}
          onClose={() => setShowModal(false)}
          onCreated={(ref, hasExt) => {
            setShowModal(false)
            setToast(`✓ Régularisation ${ref} créée${hasExt ? ' + contre-passation' : ''}`)
            setTimeout(() => setToast(null), 4000)
          }}
        />
      )}
    </div>
  )
}
