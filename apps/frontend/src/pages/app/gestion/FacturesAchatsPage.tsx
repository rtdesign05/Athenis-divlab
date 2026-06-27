import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion, type FactureAchatStatut, type FactureAchat } from '@/contexts/GestionContext'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import { ScanAiModal } from '@/features/scan/ScanAiModal'
import { uploadFileForScan, type ScannedInvoice } from '@/services/scanApi'
import { PeriodFilter, filterByDateRange } from '@/components/gestion/PeriodFilter'
import { ArticleCombobox } from '@/components/gestion/ArticleCombobox'
import { attachmentsApi } from '@/services/attachmentsApi'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUT_STYLE: Record<FactureAchatStatut, string> = {
  'À valider': 'bg-amber-100 text-amber-700',
  'Validée':   'bg-blue-100 text-blue-700',
  'Payée':     'bg-green-100 text-green-700',
  'En retard': 'bg-red-100 text-red-600',
  'Annulée':   'bg-red-50 text-red-400',
}

const STATUTS: FactureAchatStatut[] = ['À valider', 'Validée', 'Payée', 'En retard', 'Annulée']

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Cellule inline pièce justificative ────────────────────────────────────────
// • Si une pièce est attachée → lien direct vers le PDF/image (nouvel onglet).
// • Sinon → bouton qui déclenche le sélecteur de fichier via ref (plus fiable
//   qu'un <label> avec sr-only, insensible aux stopPropagation parents).
// L'icône inline NE PERMET QUE D'AJOUTER : remplacement/suppression d'une pièce
// existante passe obligatoirement par la fiche détail (bouton Retirer) — évite
// l'écrasement involontaire d'un justificatif déjà attaché en production.

interface PieceInlineCellProps {
  pieceUrl?: string | undefined
  pieceName?: string | undefined
  onPick:    (file: File) => void
}

function PieceInlineCell({ pieceUrl, pieceName, onPick }: PieceInlineCellProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  if (pieceUrl) {
    return (
      <button type="button"
        title={`Ouvrir : ${pieceName ?? 'pièce jointe'}`}
        onClick={() => {
          attachmentsApi.openInNewTab(pieceUrl).catch(err => {
            console.error('[FA] open piece failed', err)
            alert("Impossible d'ouvrir le justificatif (session expirée ?)")
          })
        }}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
        📎
      </button>
    )
  }
  return (
    <>
      <input ref={inputRef} type="file" hidden
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        onChange={ev => {
          const file = ev.target.files?.[0]
          if (file) onPick(file)
          ev.target.value = ''
        }} />
      <button type="button"
        title="Joindre la facture reçue du fournisseur (PDF, image)"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-blue-300 text-blue-500 hover:bg-blue-50 hover:border-blue-500 transition-colors">
        +
      </button>
    </>
  )
}

// ── Import CSV ────────────────────────────────────────────────────────────────

const CSV_TEMPLATE = [
  'fournisseur;commande;date;echeance;montantHT;tva;agence;statut',
  'Nom Fournisseur SARL;ACH-0001;2026-01-15;2026-02-15;100000;19.25;Siège;À valider',
].join('\n')

type ImportRow = Omit<FactureAchat, 'id'> & { _error?: string }

function parseCSV(text: string, defaultVat: number, defaultAgence: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const firstLine = lines[0] ?? ''
  const sep = firstLine.includes(';') ? ';' : ','
  const headers = firstLine.split(sep).map(h => h.trim().toLowerCase()
    .replace(/é|è|ê/g, 'e').replace(/à/g, 'a').replace(/[^a-z]/g, ''))

  const idx = (name: string) => headers.indexOf(name)

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''))
    const get = (name: string, fallback = '') => cols[idx(name)] ?? fallback

    const fournisseur = get('fournisseur')
    const date        = get('date')
    const echeance    = get('echeance')
    const montantHT   = parseFloat(get('montantht', '0').replace(/\s/g, '').replace(',', '.'))
    const tva         = parseFloat(get('tva', String(defaultVat)).replace(',', '.'))
    const agence      = get('agence', defaultAgence) || defaultAgence
    const statut      = (get('statut', 'À valider') || 'À valider') as FactureAchatStatut
    const commande    = get('commande', '')

    const errors: string[] = []
    if (!fournisseur) errors.push('Fournisseur manquant')
    if (!date || isNaN(Date.parse(date))) errors.push('Date invalide')
    if (!echeance || isNaN(Date.parse(echeance))) errors.push('Échéance invalide')
    if (isNaN(montantHT) || montantHT <= 0) errors.push('Montant HT invalide')

    const montantTTC = Math.round(montantHT * (1 + tva / 100))

    return {
      commande, fournisseur, agence, date, echeance,
      montantHT: Math.round(montantHT), tva, montantTTC, statut,
      lignes: [], notes: '',
      ...( errors.length ? { _error: errors.join(' · ') } : {} ),
    }
  })
}

interface ImportModalProps {
  defaultVat:    number
  defaultAgence: string
  onImport:      (rows: Omit<FactureAchat, 'id'>[]) => void
  onClose:       () => void
}

function ImportModal({ defaultVat, defaultAgence, onImport, onClose }: ImportModalProps) {
  const fileRef            = useRef<HTMLInputElement>(null)
  const [rows, setRows]    = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [step, setStep]    = useState<'upload' | 'preview'>('upload')

  const fmt = (n: number) => n.toLocaleString('fr-FR')

  function handleFile(file: File) {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text, defaultVat, defaultAgence)
      setRows(parsed)
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const validRows   = rows.filter(r => !r._error)
  const invalidRows = rows.filter(r => r._error)

  function downloadTemplate() {
    const blob = new Blob(['﻿' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'modele_factures_achats.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">📥</span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Importer des factures achats</h2>
              <p className="text-xs text-gray-400">Fichier CSV (séparateur ; ou ,)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {step === 'upload' ? (
            <div className="p-5 space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-10 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
              >
                <span className="text-3xl">📂</span>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">Glissez votre fichier CSV ici</p>
                  <p className="mt-0.5 text-xs text-gray-400">ou cliquez pour parcourir</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="mb-2 text-xs font-semibold text-gray-600">Colonnes attendues dans le CSV</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  {[
                    ['fournisseur', 'Obligatoire'],
                    ['date',        'Obligatoire — format YYYY-MM-DD'],
                    ['echeance',    'Obligatoire — format YYYY-MM-DD'],
                    ['montantHT',   'Obligatoire — montant hors TVA'],
                    ['commande',    'Optionnel — référence commande'],
                    ['tva',         `Optionnel — défaut ${defaultVat} %`],
                    ['agence',      `Optionnel — défaut "${defaultAgence}"`],
                    ['statut',      'Optionnel — défaut "À valider"'],
                  ].map(([col, desc]) => (
                    <div key={col} className="flex gap-1.5">
                      <span className="font-mono text-green-700 shrink-0">{col}</span>
                      <span className="text-gray-400">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-xs text-green-700 hover:underline">
                ⬇ Télécharger un modèle CSV
              </button>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2.5">
                <span className="text-sm text-gray-600 font-medium">{fileName}</span>
                <span className="ml-auto text-xs text-emerald-700 font-semibold">{validRows.length} ligne{validRows.length > 1 ? 's' : ''} valide{validRows.length > 1 ? 's' : ''}</span>
                {invalidRows.length > 0 && (
                  <span className="text-xs text-red-600 font-semibold">{invalidRows.length} erreur{invalidRows.length > 1 ? 's' : ''}</span>
                )}
                <button onClick={() => { setStep('upload'); setRows([]) }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline">
                  Changer
                </button>
              </div>
              {invalidRows.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                  <p className="text-xs font-semibold text-red-700">Lignes ignorées (erreurs)</p>
                  {invalidRows.map((r, i) => (
                    <p key={i} className="text-xs text-red-600">
                      <span className="font-medium">{r.fournisseur || '—'}</span> : {r._error}
                    </p>
                  ))}
                </div>
              )}
              {validRows.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
                  <p className="text-sm text-gray-500">Aucune ligne valide à importer.</p>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-100 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-semibold">
                      <tr>
                        {['Fournisseur', 'Commande', 'Date', 'Échéance', 'Montant TTC', 'Statut'].map(h => (
                          <th key={h} className="px-3 py-2 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {validRows.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{r.fournisseur}</td>
                          <td className="px-3 py-2 font-mono text-gray-500">{r.commande || '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{r.date}</td>
                          <td className="px-3 py-2 text-gray-600">{r.echeance}</td>
                          <td className="px-3 py-2 font-semibold text-gray-900">{fmt(r.montantTTC)}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 font-medium ${STATUT_STYLE[r.statut] ?? 'bg-gray-100 text-gray-600'}`}>{r.statut}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0 flex items-center justify-between gap-2 border-t border-gray-100 px-5 py-3">
          <button onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          {step === 'preview' && validRows.length > 0 && (
            <button onClick={() => { onImport(validRows); onClose() }}
              className="rounded-lg bg-green-700 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800">
              Importer {validRows.length} facture{validRows.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal nouvelle facture achat ──────────────────────────────────────────────

/** Type de ligne d'achat :
 *  - 'article' : référence un article du catalogue (déstockage si suivi).
 *  - 'libre'   : saisie libre (services généraux, frais divers, prestations
 *                hors catalogue). Le compte de charge est à saisir manuellement. */
type PurchaseLineKind = 'article' | 'libre'

interface LineForm {
  id:             string
  kind:           PurchaseLineKind
  articleId:      string
  description:    string
  quantite:       string
  unite:          string
  prixUnitaireHT: string
  /** Compte de charge 6XXX — obligatoire pour les lignes libres, optionnel pour
   *  les lignes article (hérité du compteAchat de l'article si non saisi). */
  compteAchat:    string
}

interface ModalFactureAchatProps {
  achats:         { id: string; fournisseur: string; agence: string; montant: number }[]
  agenceNom:      string | null
  defaultVatRate: number
  initialScan?:   ScannedInvoice
  onSave:         (data: Omit<FactureAchat, 'id'>) => void
  onClose:        () => void
}

function ModalFactureAchat({ achats, agenceNom, defaultVatRate, initialScan, onSave, onClose }: ModalFactureAchatProps) {
  const today = new Date().toISOString().slice(0, 10)
  const { articles, fournisseurs } = useGestion()
  const { agences } = useCompanySettings()
  const { fmt } = useCurrency()
  // achats prop reste passé pour compat (lien éventuel à un bon de commande dans le futur)
  void achats

  const [showScan, setShowScan] = useState(false)
  /** Si true → la facture est immédiatement validée à la création
   *  (statut Validée → comptabilisation auto journal ACH + mouvement stock) */
  const [validateOnCreate, setValidateOnCreate] = useState(true)

  const [form, setForm] = useState(() => {
    const base = {
      numeroFacture: '',                                            // numéro saisi par l'utilisateur (du fournisseur)
      commande:    '',
      fournisseur: initialScan?.vendorName ?? '',
      agence:      agenceNom ?? 'Siège',
      date:        initialScan?.invoiceDate ?? today,
      echeance:    initialScan?.dueDate     ?? '',
      tva:         initialScan?.taxRate     ?? defaultVatRate,
      statut:      'À valider' as FactureAchatStatut,
      notes:       [initialScan?.vendorNiu ? `NIU : ${initialScan.vendorNiu}` : '', initialScan?.notes ?? '']
                     .filter(Boolean).join(' · '),
    }
    return base
  })

  const [lignes, setLignes] = useState<LineForm[]>([
    { id: `ln-${Date.now()}`, kind: 'article', articleId: '', description: '', quantite: '1', unite: 'pièce', prixUnitaireHT: '', compteAchat: '' },
  ])

  /** Pré-remplissage depuis ScanAI */
  function applyScan(data: ScannedInvoice) {
    setForm(f => ({
      ...f,
      fournisseur: data.vendorName  ?? f.fournisseur,
      date:        data.invoiceDate ?? f.date,
      echeance:    data.dueDate     ?? f.echeance,
      tva:         data.taxRate     ?? f.tva,
      notes:       [data.vendorNiu ? `NIU : ${data.vendorNiu}` : '', data.notes ?? '']
                     .filter(Boolean).join(' · ') || f.notes,
    }))
    // Si le scan donne un total HT, créer une ligne par défaut
    if (data.subtotal != null && data.subtotal > 0) {
      setLignes([{
        id: `ln-${Date.now()}`,
        kind: 'libre',                    // scan d'une facture externe → ligne libre par défaut
        articleId: '',
        description: data.notes ?? 'Facture importée',
        quantite: '1', unite: 'pièce',
        prixUnitaireHT: String(Math.round(data.subtotal)),
        compteAchat: '',
      }])
    }
  }

  // Totaux calculés depuis les lignes
  const montantHT = useMemo(
    () => lignes.reduce((s, l) => s + (parseFloat(l.quantite) || 0) * (parseFloat(l.prixUnitaireHT) || 0), 0),
    [lignes],
  )
  const montantTTC = useMemo(() => Math.round(montantHT * (1 + form.tva / 100)), [montantHT, form.tva])

  function updateLigne(idx: number, patch: Partial<LineForm>) {
    setLignes(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }
  function addLigne(kind: PurchaseLineKind = 'article') {
    setLignes(prev => [...prev, {
      id: `ln-${Date.now()}-${prev.length}`,
      kind, articleId: '', description: '',
      quantite: '1', unite: 'pièce', prixUnitaireHT: '', compteAchat: '',
    }])
  }
  function removeLigne(idx: number) {
    setLignes(prev => prev.filter((_, i) => i !== idx))
  }
  function selectArticle(idx: number, art: import('@/contexts/GestionContext').Article) {
    updateLigne(idx, {
      articleId: art.id,
      description: art.nom,
      unite: art.unite,
      prixUnitaireHT: String(art.prixAchatHT || art.prixVenteHT),
    })
  }

  // Validation — règles distinctes selon le type de ligne :
  // - 'article' : articleId requis (sélection depuis la liste du catalogue)
  // - 'libre'   : description manuelle + compte de charge 6XXX requis
  // - Tous types : quantité > 0 et prix unitaire > 0
  const lineErrors: { idx: number; msg: string }[] = []
  lignes.forEach((l, idx) => {
    const qty = parseFloat(l.quantite) || 0
    const pu  = parseFloat(l.prixUnitaireHT) || 0
    if (qty <= 0) { lineErrors.push({ idx, msg: 'Quantité requise' }); return }
    if (pu <= 0)  { lineErrors.push({ idx, msg: 'Prix unitaire requis' }); return }
    if (l.kind === 'article') {
      if (!l.articleId) lineErrors.push({ idx, msg: 'Article non sélectionné' })
    } else {
      if (!l.description.trim()) lineErrors.push({ idx, msg: 'Désignation requise' })
      else if (!l.compteAchat.trim() || !/^6\d{1,8}$/.test(l.compteAchat.trim())) {
        lineErrors.push({ idx, msg: 'Compte de charge (6XXX) requis' })
      }
    }
  })
  const hasErrors = lineErrors.length > 0
                 || !form.fournisseur.trim()
                 || !form.numeroFacture.trim()
                 || !form.echeance
                 || lignes.length === 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (hasErrors) return
    // Si "Valider et comptabiliser" est coché, on force le statut 'Validée'
    // → déclenche le posting backend (journal ACH + mouvement stock)
    const statut: FactureAchatStatut = validateOnCreate ? 'Validée' : form.statut
    onSave({
      // Le numéro de facture fournisseur est stocké dans 'commande' (sert de reference backend)
      commande:    form.numeroFacture.trim(),
      fournisseur: form.fournisseur.trim(),
      agence:      form.agence,
      date:        form.date,
      echeance:    form.echeance,
      montantHT,
      tva:         form.tva,
      montantTTC,
      statut,
      lignes:      lignes.map((l, i) => ({
        id:             `l${i + 1}`,
        // Article : ID conservé, déclenche l'éventuel déstockage si tracé.
        // Libre   : pas d'articleId, comptabilisation sur le compte saisi.
        ...(l.kind === 'article' && l.articleId ? { articleId: l.articleId } : {}),
        ...(l.compteAchat.trim() ? { compteAchat: l.compteAchat.trim() } : {}),
        description:    l.description,
        quantite:       parseFloat(l.quantite) || 0,
        unite:          l.unite,
        prixUnitaireHT: parseFloat(l.prixUnitaireHT) || 0,
        tvaRate:        form.tva,
        montantHT:      (parseFloat(l.quantite) || 0) * (parseFloat(l.prixUnitaireHT) || 0),
      })),
      notes:       form.notes.trim(),
    })
  }

  return (
    <>
    {showScan && (
      <ScanAiModal
        onResult={(data) => { applyScan(data); setShowScan(false) }}
        onClose={() => setShowScan(false)}
      />
    )}
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            {initialScan ? '🤖 Vérification OCR' : 'Nouvelle facture achat'}
          </h2>
          <div className="flex items-center gap-2">
            {!initialScan && (
              <button
                type="button"
                onClick={() => setShowScan(true)}
                title="Scanner une facture avec ScanAI"
                className="flex items-center gap-1.5 rounded-lg bg-violet-50 border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
              >
                📷 ScanAI
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
        </div>
        {initialScan && (
          <div className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-amber-50 border-b border-amber-100">
            <span className="text-amber-500">⚠️</span>
            <p className="text-xs text-amber-800">
              Confiance OCR : <span className="font-semibold">{initialScan.confidence}%</span> — vérifiez les données avant de créer la facture.
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* Numéro fournisseur + Date + Échéance */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">N° facture fournisseur *</label>
              <input
                value={form.numeroFacture}
                onChange={e => setForm(f => ({ ...f, numeroFacture: e.target.value }))}
                required
                placeholder="ex. F2026-1234"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
              <p className="mt-1 text-[10px] text-gray-400">À reporter du numéro fourni par le fournisseur — pas d'auto-incrément</p>
            </div>
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
          </div>

          {/* Fournisseur — sélection obligatoire depuis la liste existante.
              Conformité contrôle interne (PCG art. 911-1 / SYSCOHADA art. 17) :
              la création d'un tiers doit passer par le référentiel Fournisseurs
              pour permettre la centralisation comptable et l'unicité du
              compte 401XXX. La création inline est désactivée. */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fournisseur *</label>
            {fournisseurs.filter(fo => !agenceNom || fo.agence === agenceNom).length > 0 ? (
              <select value={form.fournisseur}
                onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                <option value="">— Sélectionner un fournisseur —</option>
                {fournisseurs
                  .filter(fo => !agenceNom || fo.agence === agenceNom)
                  .map(fo => (
                    <option key={fo.id} value={fo.nom}>{fo.nom}</option>
                  ))}
              </select>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                Aucun fournisseur enregistré.{' '}
                <a href="/app/gestion/achats/fournisseurs" className="font-semibold underline hover:text-amber-900">
                  Créer un fournisseur →
                </a>
              </div>
            )}
          </div>

          {/* Lignes — deux types possibles selon SYSCOHADA art. 17 :
              • Article : référence catalogue avec déstockage si suivi
              • Libre   : services généraux / frais divers — saisie + compte 6XXX */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Lignes d'achat</p>
            <div className="rounded-lg border border-gray-200 overflow-visible">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-gray-500">
                    <th className="px-2 py-2 font-semibold w-24">Type</th>
                    <th className="px-3 py-2 font-semibold min-w-[280px]">Désignation / Article</th>
                    <th className="px-2 py-2 font-semibold w-20">Compte</th>
                    <th className="px-2 py-2 font-semibold w-14">Qté</th>
                    <th className="px-2 py-2 font-semibold w-20">Unité</th>
                    <th className="px-2 py-2 font-semibold w-24">P.U. HT</th>
                    <th className="px-2 py-2 font-semibold w-24 text-right">Total HT</th>
                    <th className="px-2 py-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lignes.map((l, idx) => {
                    const lineError = lineErrors.find(e => e.idx === idx)
                    const qtyNum = parseFloat(l.quantite) || 0
                    const total  = qtyNum * (parseFloat(l.prixUnitaireHT) || 0)
                    const isFree = l.kind === 'libre'
                    return (
                      <tr key={l.id} className={lineError ? 'bg-red-50/30' : ''}>
                        <td className="px-2 py-1.5">
                          <select value={l.kind}
                            onChange={e => {
                              const newKind = e.target.value as PurchaseLineKind
                              // Bascule article→libre : on garde la description (texte affiché)
                              //   mais on efface l'articleId pour éviter un déstockage involontaire.
                              // Bascule libre→article : on efface description + compte pour
                              //   forcer une nouvelle sélection propre depuis le catalogue.
                              updateLigne(idx, newKind === 'libre'
                                ? { kind: 'libre', articleId: '' }
                                : { kind: 'article', description: '', compteAchat: '' })
                            }}
                            className="w-full rounded border border-gray-200 px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-green-500/30">
                            <option value="article">📦 Article</option>
                            <option value="libre">📝 Libre</option>
                          </select>
                        </td>
                        <td className="px-3 py-1.5 pb-5">
                          {isFree ? (
                            <input type="text"
                              value={l.description}
                              onChange={e => updateLigne(idx, { description: e.target.value })}
                              placeholder="Ex : Loyer mai 2026, Honoraires consultant, Fournitures bureau…"
                              className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                          ) : (
                            <ArticleCombobox
                              articles={articles}
                              selectedId={l.articleId}
                              text={l.description}
                              quantite={qtyNum}
                              onSelect={art => selectArticle(idx, art)}
                              onTextChange={t => updateLigne(idx, { description: t, articleId: '' })}
                              placeholder="Tapez les premières lettres…"
                              compact
                              mode="purchase"
                            />
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {isFree ? (
                            <input type="text"
                              value={l.compteAchat}
                              onChange={e => updateLigne(idx, { compteAchat: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                              placeholder="6XXX"
                              title="Compte de charge SYSCOHADA classe 6 (ex : 6041 sous-traitance, 613 locations, 622 honoraires…)"
                              className="w-full rounded border border-gray-200 px-1.5 py-1 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                          ) : (
                            <span className="text-[11px] text-gray-400 italic" title="Le compte est défini sur la fiche article">
                              auto
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min={0} step="any" placeholder="0" value={l.quantite || ''}
                            onChange={e => updateLigne(idx, { quantite: e.target.value })}
                            className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={l.unite}
                            onChange={e => updateLigne(idx, { unite: e.target.value })}
                            className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30">
                            {['pièce', 'kg', 'litre', 'm²', 'heure', 'forfait', 'mois'].map(u => <option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min={0} step="any" value={l.prixUnitaireHT || ''}
                            onChange={e => updateLigne(idx, { prixUnitaireHT: e.target.value })}
                            placeholder="0"
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30" />
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium text-gray-700 tabular-nums">
                          {total.toLocaleString('fr-FR')}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button type="button" onClick={() => removeLigne(idx)}
                            className="text-gray-400 hover:text-red-500" title="Supprimer">🗑</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-3">
                <button type="button" onClick={() => addLigne('article')}
                  className="text-xs text-green-700 font-medium hover:text-green-800">
                  + Ligne article
                </button>
                <span className="text-gray-300">·</span>
                <button type="button" onClick={() => addLigne('libre')}
                  className="text-xs text-blue-700 font-medium hover:text-blue-800">
                  + Ligne libre (service, frais)
                </button>
              </div>
            </div>
          </div>

          {/* Totaux + TVA */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">TVA (%)</label>
              <input type="number" min={0} max={100} step={0.01} value={form.tva}
                onChange={e => setForm(f => ({ ...f, tva: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div className="col-span-2 flex items-center gap-4 rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-xs text-gray-500">Total HT</span>
              <span className="text-sm font-medium text-gray-700 tabular-nums">{fmt(montantHT)}</span>
              <span className="ml-auto text-xs text-gray-500">TTC</span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">{fmt(montantTTC)}</span>
            </div>
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
                  {agences.length === 0
                    ? <option value="Siège">Siège</option>
                    : agences.map(a => <option key={a.id} value={a.nom}>{a.nom}{a.isSiege ? ' (Siège)' : ''}</option>)}
                </select>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              placeholder="Remarques…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-100 px-5 py-4 space-y-3">
          {lineErrors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <span className="font-semibold">Impossible de créer la facture — </span>
              {lineErrors.map(e => `Ligne ${e.idx + 1} : ${e.msg}`).join(' · ')}
            </div>
          )}
          {!form.fournisseur.trim() && (
            <p className="text-xs text-red-600">⚠ Sélectionner ou créer un fournisseur</p>
          )}
          {!form.numeroFacture.trim() && (
            <p className="text-xs text-red-600">⚠ Saisir le N° de facture fournisseur</p>
          )}
          {/* Toggle Valider et comptabiliser */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={validateOnCreate}
              onChange={e => setValidateOnCreate(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-green-700"
            />
            <span className="text-xs text-gray-700 leading-snug">
              <strong className="text-gray-800">Valider et comptabiliser immédiatement</strong>
              <span className="block text-[11px] text-gray-500">
                La facture passe en statut <em>Validée</em> et sera enregistrée dans le journal des achats (ACH) avec mouvement de stock.
                Décochez pour la conserver en <em>À valider</em> (modifiable, non comptabilisée).
              </span>
            </span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={hasErrors}
              className="flex-1 rounded-lg bg-green-700 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed">
              {validateOnCreate ? 'Créer et comptabiliser' : 'Enregistrer en brouillon'}
            </button>
          </div>
        </div>
        </form>
      </div>
    </div>
    </>
  )
}

// ── Fiche de saisie d'une facture fournisseur (vue back-office) ──────────────
// IMPORTANT : Cette vue n'imprime AUCUN document. La facture d'achat légale
// doit être émise exclusivement par le fournisseur (art. 153 CGI Cameroun /
// art. 289 CGI France). Notre rôle se limite à :
//   1. Enregistrer comptablement les informations de la facture reçue
//   2. Permettre à l'utilisateur d'attacher le PDF original du fournisseur
// La vue est volontairement traitée comme un formulaire administratif sans
// mise en forme « document » pour éviter toute confusion avec une facture.

interface FAViewProps {
  fa:           FactureAchat
  fournisseur?: { nom: string; adresse?: string; telephone?: string; email?: string; siren?: string; vatNumber?: string } | null
  // companyName et address ne sont pas affichés sur la vue — l'acquéreur
  // n'a pas à figurer sur sa propre saisie comptable. On les garde dans
  // l'interface pour rétro-compatibilité d'appel.
  companyName:  string
  address:      string
  fmtCurrency:  (n: number) => string
  onClose:      () => void
  onChangeStatut: (statut: FactureAchatStatut) => void
  onAttachPiece?: (file: File) => Promise<void>
  onRemovePiece?: () => Promise<void>
  /** Persistance d'une modification (date, échéance, TVA, montants, notes,
   *  N° facture fournisseur). Si non fourni → mode lecture seule. */
  onUpdate?:    (patch: Partial<Omit<FactureAchat, 'id'>>) => void
}

function FAView({ fa, fournisseur, fmtCurrency, onClose, onChangeStatut, onAttachPiece, onRemovePiece, onUpdate }: FAViewProps) {
  const lignes  = fa.lignes ?? []
  const totalHT = lignes.length > 0
    ? lignes.reduce((s, l) => s + l.montantHT, 0)
    : fa.montantHT
  const tvaMontant = fa.tva > 0
    ? (lignes.length > 0
        ? lignes.reduce((s, l) => s + l.montantHT * (l.tvaRate / 100), 0)
        : fa.montantHT * (fa.tva / 100))
    : 0

  const statutBadge = STATUT_STYLE[fa.statut] ?? 'bg-gray-100 text-gray-600'
  const hasPiece    = !!fa.pieceUrl

  // ── Mode édition ─────────────────────────────────────────────────────────
  // Lecture seule par défaut. Bouton « ✏️ Modifier » dans la toolbar bascule
  // en édition. « Enregistrer » valide les changements via onUpdate (persisté
  // côté API par GestionContext.updateFactureAchat — aucune donnée écrasée
  // tant qu'on n'a pas validé). « Annuler » revient à l'état initial.
  // Les lignes restent lecture seule pour éviter de casser la cohérence
  // articleId/stock — pour modifier les lignes, l'utilisateur peut créer
  // une nouvelle facture et annuler l'ancienne.
  const [isEditing, setIsEditing] = useState(false)
  const [editForm,  setEditForm]  = useState({
    commande:   fa.commande   ?? '',
    date:       fa.date,
    echeance:   fa.echeance,
    tva:        fa.tva,
    montantHT:  fa.montantHT,
    montantTTC: fa.montantTTC,
    notes:      fa.notes      ?? '',
  })
  // Sync editForm si la facture change (ex : refetch après save).
  useEffect(() => {
    setEditForm({
      commande:   fa.commande ?? '',
      date:       fa.date,
      echeance:   fa.echeance,
      tva:        fa.tva,
      montantHT:  fa.montantHT,
      montantTTC: fa.montantTTC,
      notes:      fa.notes ?? '',
    })
  }, [fa.id, fa.commande, fa.date, fa.echeance, fa.tva, fa.montantHT, fa.montantTTC, fa.notes])

  function startEdit() { setIsEditing(true) }
  function cancelEdit() {
    setEditForm({
      commande:   fa.commande ?? '',
      date:       fa.date,
      echeance:   fa.echeance,
      tva:        fa.tva,
      montantHT:  fa.montantHT,
      montantTTC: fa.montantTTC,
      notes:      fa.notes ?? '',
    })
    setIsEditing(false)
  }
  function saveEdit() {
    if (!onUpdate) return
    // N'envoie que les champs réellement modifiés — préserve les autres données.
    const patch: Partial<Omit<FactureAchat, 'id'>> = {}
    if (editForm.commande   !== (fa.commande ?? '')) patch.commande   = editForm.commande
    if (editForm.date       !==  fa.date)            patch.date       = editForm.date
    if (editForm.echeance   !==  fa.echeance)        patch.echeance   = editForm.echeance
    if (editForm.tva        !==  fa.tva)             patch.tva        = editForm.tva
    if (editForm.montantHT  !==  fa.montantHT)       patch.montantHT  = editForm.montantHT
    if (editForm.montantTTC !==  fa.montantTTC)      patch.montantTTC = editForm.montantTTC
    if (editForm.notes      !== (fa.notes ?? ''))    patch.notes      = editForm.notes
    if (Object.keys(patch).length > 0) onUpdate(patch)
    setIsEditing(false)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">

      {/* ── Toolbar (pas de bouton imprimer — voir commentaire au-dessus) ── */}
      <div className="shrink-0 flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
            ← Retour
          </button>
          <span className="text-xs text-gray-400 font-mono">{fa.id}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statutBadge}`}>{fa.statut}</span>
          {!isEditing && (
            <select value={fa.statut} onChange={e => onChangeStatut(e.target.value as FactureAchatStatut)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30">
              {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
        {/* Actions édition */}
        {onUpdate && (
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button onClick={startEdit}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                ✏️ Modifier
              </button>
            ) : (
              <>
                <button onClick={cancelEdit}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button onClick={saveEdit}
                  className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800">
                  💾 Enregistrer
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Corps fiche ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-4">

          {/* ── Bandeau réglementaire ───────────────────────────────────── */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs text-amber-900 leading-relaxed">
              <span className="font-semibold">📋 Enregistrement comptable d'une facture reçue.</span>{' '}
              Conformément à l'art. 153 CGI Cameroun / art. 289 CGI France, la facture d'achat est obligatoirement
              émise par le fournisseur. Cette vue ne génère <strong>aucun document à valeur légale</strong> — elle
              sert uniquement à enregistrer les informations de la facture reçue et à conserver le justificatif
              transmis par le fournisseur.
            </p>
          </div>

          {/* ── Zone pièce justificative (très visible) ─────────────────── */}
          {hasPiece ? (
            <div className="rounded-xl border border-green-300 bg-green-50/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">📎</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-green-700">Justificatif fournisseur attaché</p>
                    <button type="button"
                      onClick={() => {
                        attachmentsApi.openInNewTab(fa.pieceUrl!).catch(err => {
                          console.error('[FA] open piece failed', err)
                          alert("Impossible d'ouvrir le justificatif (session expirée ?)")
                        })
                      }}
                      className="text-sm font-medium text-green-800 hover:underline truncate block text-left">
                      {fa.pieceName ?? 'Pièce jointe'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button"
                    onClick={() => {
                      attachmentsApi.openInNewTab(fa.pieceUrl!).catch(err => {
                        console.error('[FA] open piece failed', err)
                        alert("Impossible d'ouvrir le justificatif (session expirée ?)")
                      })
                    }}
                    className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50">
                    Ouvrir
                  </button>
                  {onRemovePiece && (
                    <button onClick={() => {
                      if (confirm(`Retirer la pièce "${fa.pieceName}" ? La saisie comptable est conservée.`)) {
                        void onRemovePiece()
                      }
                    }}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                      Retirer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : onAttachPiece ? (
            <label className="block rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/40 p-6 cursor-pointer hover:bg-blue-50 transition-colors">
              <input type="file" className="sr-only"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={ev => {
                  const f = ev.target.files?.[0]
                  if (f) void onAttachPiece(f)
                  ev.target.value = ''
                }} />
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-3xl">📎</span>
                <p className="text-sm font-semibold text-blue-800">Joindre la facture du fournisseur</p>
                <p className="text-xs text-blue-700">
                  Cliquez pour téléverser le PDF, l'image ou le scan transmis par le fournisseur.<br />
                  Vous pouvez l'attacher dès maintenant ou plus tard, à votre rythme.
                </p>
                <p className="text-[10px] text-blue-500 mt-1">PDF · PNG · JPG · WEBP</p>
              </div>
            </label>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-400">
              ⚠ Aucun justificatif fournisseur — en attente de transmission
            </div>
          )}

          {/* ── Informations de saisie (cards) ──────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Fournisseur</p>
              <p className="text-sm font-semibold text-gray-900">{fournisseur?.nom ?? fa.fournisseur}</p>
              {fournisseur?.adresse && <p className="text-xs text-gray-500">{fournisseur.adresse}</p>}
              {(fournisseur?.telephone || fournisseur?.email) && (
                <p className="text-[11px] text-gray-500">
                  {fournisseur?.telephone}{fournisseur?.telephone && fournisseur?.email ? ' · ' : ''}{fournisseur?.email}
                </p>
              )}
              <p className="text-[11px] text-gray-400 pt-1">Agence : {fa.agence}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Données saisies</p>
              {isEditing ? (
                <>
                  <label className="flex justify-between items-center text-xs gap-2">
                    <span className="text-gray-500">N° facture fournisseur</span>
                    <input value={editForm.commande}
                      onChange={e => setEditForm(f => ({ ...f, commande: e.target.value }))}
                      placeholder="ex : FA-2026-001"
                      className="w-40 rounded border border-gray-200 px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                  </label>
                  <label className="flex justify-between items-center text-xs gap-2">
                    <span className="text-gray-500">Date facture</span>
                    <input type="date" value={editForm.date}
                      onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                      className="w-40 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                  </label>
                  <label className="flex justify-between items-center text-xs gap-2">
                    <span className="text-gray-500">Échéance</span>
                    <input type="date" value={editForm.echeance}
                      onChange={e => setEditForm(f => ({ ...f, echeance: e.target.value }))}
                      className="w-40 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                  </label>
                  <label className="flex justify-between items-center text-xs gap-2">
                    <span className="text-gray-500">TVA (%)</span>
                    <input type="number" step="0.01" min="0" max="100" value={editForm.tva}
                      onChange={e => setEditForm(f => ({ ...f, tva: Number(e.target.value) }))}
                      className="w-40 rounded border border-gray-200 px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                  </label>
                  <label className="flex justify-between items-center text-xs gap-2">
                    <span className="text-gray-500">Montant HT</span>
                    <input type="number" step="0.01" min="0" value={editForm.montantHT}
                      onChange={e => setEditForm(f => ({ ...f, montantHT: Number(e.target.value) }))}
                      className="w-40 rounded border border-gray-200 px-2 py-1 text-xs text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                  </label>
                  <label className="flex justify-between items-center text-xs gap-2">
                    <span className="text-gray-500">Montant TTC</span>
                    <input type="number" step="0.01" min="0" value={editForm.montantTTC}
                      onChange={e => setEditForm(f => ({ ...f, montantTTC: Number(e.target.value) }))}
                      className="w-40 rounded border border-gray-200 px-2 py-1 text-xs text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                  </label>
                </>
              ) : (
                <>
                  {fa.commande && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">N° facture fournisseur</span>
                      <span className="font-mono font-medium text-gray-800">{fa.commande}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Date facture</span>
                    <span className="font-medium text-gray-800">{fmtDate(fa.date)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Échéance</span>
                    <span className="font-medium text-gray-800">{fmtDate(fa.echeance)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">TVA</span>
                    <span className="font-medium text-gray-800">{fa.tva} %</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Avertissement si édition ────────────────────────────────── */}
          {isEditing && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5">
              <p className="text-[11px] text-blue-900">
                💡 Édition activée — les <strong>lignes de saisie</strong> ne sont pas modifiables ici
                (création/annulation seulement) pour préserver la cohérence avec le stock et la
                comptabilité. Pour modifier les lignes, annulez cette facture puis créez-en une nouvelle.
              </p>
            </div>
          )}

          {/* ── Lignes de saisie ────────────────────────────────────────── */}
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Lignes saisies</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-2 w-10">N°</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2 text-right w-16">Qté</th>
                  <th className="px-3 py-2 w-16">Unité</th>
                  <th className="px-3 py-2 text-right w-24">P.U. HT</th>
                  <th className="px-3 py-2 text-right w-16">TVA %</th>
                  <th className="px-3 py-2 text-right w-28">Montant HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lignes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-xs text-gray-400">
                      Aucune ligne de détail — montant global : {fmtCurrency(fa.montantHT)} HT
                    </td>
                  </tr>
                ) : lignes.map((l, i) => (
                  <tr key={l.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{l.description}</td>
                    <td className="px-3 py-2 text-right text-sm text-gray-700">{l.quantite}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{l.unite}</td>
                    <td className="px-3 py-2 text-right text-sm text-gray-700 tabular-nums">
                      {l.prixUnitaireHT.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-gray-500">{l.tvaRate} %</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900 tabular-nums">
                      {l.montantHT.toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Totaux dans la même card */}
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 flex justify-end">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Total HT</span>
                  <span className="font-medium tabular-nums">{fmtCurrency(totalHT)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>TVA {fa.tva} %</span>
                  <span className="font-medium tabular-nums">{fmtCurrency(Math.round(tvaMontant))}</span>
                </div>
                <div className="border-t border-gray-300 pt-1.5 flex justify-between text-sm font-bold text-gray-900">
                  <span>Total TTC</span>
                  <span className="tabular-nums">{fmtCurrency(fa.montantTTC)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Notes internes (éditables) ───────────────────────────────── */}
          {(isEditing || fa.notes) && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Notes internes</p>
              {isEditing ? (
                <textarea value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Annotations internes, références, références bancaires…"
                  className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30" />
              ) : (
                <p className="text-xs text-gray-700 whitespace-pre-wrap">{fa.notes}</p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function FacturesAchatsPage() {
  const { fmt, defaultVatRate } = useCurrency()
  const { user }                = useAuth()
  const { facturesAchats, achats, fournisseurs, updateFactureAchatStatut, attachPieceToFactureAchat, addFactureAchat, updateFactureAchat } = useGestion()
  const { vatRate, company }    = useCompanySettings()

  const agenceNom    = user?.agenceNom ?? null
  const effectiveVat = vatRate ?? defaultVatRate

  const [search,       setSearch]       = useState('')
  const [statutFilter, setStatutFilter] = useState<FactureAchatStatut | 'all'>('all')
  const [modal,        setModal]        = useState(false)
  const [importModal,  setImportModal]  = useState(false)
  const [importToast,  setImportToast]  = useState<string | null>(null)
  const [selected,     setSelected]     = useState<FactureAchat | null>(null)
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')

  // ── OCR auto-import ──────────────────────────────────────────────────────────
  const ocrFileRef                              = useRef<HTMLInputElement>(null)
  const [ocrScanning,  setOcrScanning]          = useState(false)
  const [ocrPreFill,   setOcrPreFill]           = useState<ScannedInvoice | null>(null)
  const [ocrReviewModal, setOcrReviewModal]     = useState(false)
  const [ocrDragOver,  setOcrDragOver]          = useState(false)

  const handleOcrFile = useCallback(async (file: File) => {
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    if (!ALLOWED.includes(file.type)) {
      setImportToast('❌ Format non supporté — JPG, PNG, WebP ou PDF uniquement')
      setTimeout(() => setImportToast(null), 4000)
      return
    }
    setOcrScanning(true)
    try {
      const data = await uploadFileForScan(file)
      if (data.confidence >= 75) {
        // ✅ Confiance suffisante : enregistrement automatique
        const today     = new Date().toISOString().slice(0, 10)
        const montantHT = data.subtotal ?? 0
        const tva       = data.taxRate  ?? effectiveVat
        // Préférer le montant TTC extrait par l'OCR s'il est disponible et non nul
        const montantTTC = data.total && data.total > 0
          ? Math.round(data.total)
          : Math.round(montantHT * (1 + tva / 100))
        addFactureAchat({
          commande:    '',
          fournisseur: data.vendorName  ?? 'Fournisseur inconnu',
          agence:      agenceNom ?? 'Siège',
          date:        data.invoiceDate ?? today,
          echeance:    data.dueDate     ?? today,
          montantHT:   Math.round(montantHT),
          tva,
          montantTTC,
          statut:      'À valider' as FactureAchatStatut,
          lignes:      [],
          notes:       [data.vendorNiu ? `NIU : ${data.vendorNiu}` : '', data.notes ?? '']
                         .filter(Boolean).join(' · ') || '',
        })
        setImportToast(`✅ Facture « ${data.vendorName ?? 'Inconnue'} » enregistrée automatiquement (${data.confidence}% confiance)`)
        setTimeout(() => setImportToast(null), 5000)
      } else {
        // ⚠️ Confiance insuffisante : ouvrir le formulaire pré-rempli pour vérification
        setOcrPreFill(data)
        setOcrReviewModal(true)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setImportToast(`❌ Analyse OCR échouée : ${msg}`)
      setTimeout(() => setImportToast(null), 5000)
    } finally {
      setOcrScanning(false)
    }
  }, [addFactureAchat, agenceNom, effectiveVat])

  // ── Upload pièce justificative pour une facture d'achat ─────────────────────
  // Réutilisable depuis l'icône inline du tableau ET depuis la fiche FAView.
  // N'écrase JAMAIS de pièce existante sans confirmation explicite via le
  // bouton Retirer de la fiche — préserve les données déjà attachées.
  const uploadAndAttachFA = useCallback(async (faId: string, file: File): Promise<void> => {
    const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
    if (!ALLOWED.includes(file.type)) {
      alert('Format non supporté — PDF, PNG, JPG ou WEBP uniquement')
      return
    }
    try {
      const [att] = await attachmentsApi.upload([file], {})
      if (!att) throw new Error('Upload failed')
      await attachPieceToFactureAchat(
        faId,
        attachmentsApi.fileUrl(att.id),
        att.fileName,
      )
    } catch (e) {
      console.error('[FA] attach piece failed', e)
      alert("Échec de l'upload de la pièce")
    }
  }, [attachPieceToFactureAchat])

  function handleImport(rows: Omit<FactureAchat, 'id'>[]) {
    rows.forEach(r => addFactureAchat(r))
    setImportToast(`${rows.length} facture${rows.length > 1 ? 's' : ''} importée${rows.length > 1 ? 's' : ''} avec succès`)
    setTimeout(() => setImportToast(null), 4000)
  }

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
    list = filterByDateRange(list, f => f.date, dateFrom, dateTo)
    return list
  }, [facturesAchats, agenceNom, statutFilter, search, dateFrom, dateTo])
  const isFiltered = dateFrom !== '' || dateTo !== ''

  // Sync selected with live state
  const selectedLive = useMemo(
    () => selected ? (facturesAchats.find(f => f.id === selected.id) ?? null) : null,
    [selected, facturesAchats],
  )

  const totalTTC = items.filter(f => f.statut !== 'Annulée').reduce((s, f) => s + f.montantTTC, 0)
  const payees   = items.filter(f => f.statut === 'Payée').length
  const enRetard = items.filter(f => f.statut === 'En retard').length
  const aValider = items.filter(f => f.statut === 'À valider').length

  const companyName = company?.name    ?? 'Mon Entreprise'
  const address     = company?.address ?? ''

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
        <div className="flex items-center gap-2">
          {/* Bouton OCR auto-import */}
          <div
            onDragOver={e => { e.preventDefault(); setOcrDragOver(true) }}
            onDragLeave={() => setOcrDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setOcrDragOver(false)
              const f = e.dataTransfer.files[0]
              if (f) handleOcrFile(f)
            }}
          >
            <button
              onClick={() => ocrFileRef.current?.click()}
              disabled={ocrScanning}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors
                ${ocrDragOver
                  ? 'border-violet-400 bg-violet-100 text-violet-800'
                  : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'}
                disabled:opacity-60 disabled:cursor-wait`}
            >
              {ocrScanning ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                  Analyse OCR…
                </>
              ) : (
                <>🤖 OCR auto-import</>
              )}
            </button>
          </div>
          <input
            ref={ocrFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { handleOcrFile(f); e.target.value = '' } }}
          />

          <button onClick={() => setImportModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Importer CSV
          </button>
          <button onClick={() => setModal(true)}
            className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
            + Nouvelle facture
          </button>
        </div>
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

      {/* Contenu principal */}
      <div className="flex-1 min-h-0 flex gap-3">

        {/* Liste */}
        <div className={`flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden transition-all ${selectedLive ? 'w-80 shrink-0' : 'flex-1'}`}>
          <div className="shrink-0 flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 flex-wrap">
            <div className="relative flex-1 min-w-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Fournisseur, N° facture…"
                className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            {!selectedLive && (
              <PeriodFilter
                dateFrom={dateFrom}
                dateTo={dateTo}
                onChange={r => { setDateFrom(r.dateFrom); setDateTo(r.dateTo) }}
                count={isFiltered ? `${items.length} résultat${items.length > 1 ? 's' : ''}` : null}
              />
            )}
            {!selectedLive && (
              <select value={statutFilter}
                onChange={e => setStatutFilter(e.target.value as FactureAchatStatut | 'all')}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30">
                <option value="all">Tous</option>
                {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {selectedLive ? (
              /* Mode compact (panneau latéral) */
              <div className="divide-y divide-gray-50">
                {items.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-gray-400">Aucune facture</p>
                ) : items.map(f => (
                  <button key={f.id} onClick={() => setSelected(f)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50/80 transition-colors ${selectedLive?.id === f.id ? 'bg-green-50 border-l-2 border-green-600' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold text-green-700">{f.id}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${STATUT_STYLE[f.statut]}`}>{f.statut}</span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-gray-900 truncate">{f.fournisseur}</p>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">{new Date(f.date).toLocaleDateString('fr-FR')}</span>
                      <span className="text-[11px] font-semibold text-gray-700">{fmt(f.montantTTC)}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              /* Mode tableau complet */
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
                    <th className="px-2 py-2.5 text-center w-14" title="Pièce justificative (facture reçue du fournisseur)">📎</th>
                    <th className="px-4 py-2.5">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.length === 0 ? (
                    <tr><td colSpan={agenceNom ? 8 : 9} className="px-4 py-8 text-center text-sm text-gray-400">Aucune facture trouvée</td></tr>
                  ) : items.map(f => (
                    <tr key={f.id}
                      onClick={() => setSelected(f)}
                      className="hover:bg-green-50/40 cursor-pointer transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-green-700">{f.id}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{f.commande || '—'}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{f.fournisseur}</td>
                      {!agenceNom && <td className="px-4 py-2.5 text-[11px] text-gray-500">{f.agence}</td>}
                      <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(f.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(f.echeance).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmt(f.montantTTC)}</td>
                      {/* ── Pièce justificative inline ── */}
                      {/* PieceInlineCell utilise un bouton + ref (plus fiable cross-browser
                          que label+sr-only ; insensible aux stopPropagation parents). */}
                      <td className="px-2 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                        <PieceInlineCell
                          pieceUrl={f.pieceUrl}
                          pieceName={f.pieceName}
                          onPick={file => uploadAndAttachFA(f.id, file)}
                        />
                      </td>
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
            )}
          </div>
        </div>

        {/* Fiche back-office d'enregistrement de la facture reçue */}
        {selectedLive && (
          <FAView
            fa={selectedLive}
            fournisseur={fournisseurs.find(f => f.nom === selectedLive.fournisseur) ?? null}
            companyName={companyName}
            address={address}
            fmtCurrency={fmt}
            onClose={() => setSelected(null)}
            onChangeStatut={s => updateFactureAchatStatut(selectedLive.id, s)}
            onAttachPiece={file => uploadAndAttachFA(selectedLive.id, file)}
            onRemovePiece={() => attachPieceToFactureAchat(selectedLive.id, null, null)}
            onUpdate={patch => updateFactureAchat(selectedLive.id, patch)}
          />
        )}
      </div>

      {/* Modals */}
      {modal && (
        <ModalFactureAchat
          achats={achats}
          agenceNom={agenceNom}
          defaultVatRate={effectiveVat}
          onSave={async data => {
            try {
              const result = await addFactureAchat(data)
              // Si statut !== 'À valider', déclencher la comptabilisation backend
              if (data.statut && data.statut !== 'À valider') {
                updateFactureAchatStatut(result.id, data.statut)
              }
              setModal(false)
            } catch (e) {
              console.error('Création facture échouée', e)
              alert("Échec de la création de la facture. Vérifiez les données et réessayez.")
            }
          }}
          onClose={() => setModal(false)}
        />
      )}
      {ocrReviewModal && ocrPreFill && (
        <ModalFactureAchat
          achats={achats}
          agenceNom={agenceNom}
          defaultVatRate={effectiveVat}
          initialScan={ocrPreFill}
          onSave={async data => {
            try {
              const result = await addFactureAchat(data)
              if (data.statut && data.statut !== 'À valider') {
                updateFactureAchatStatut(result.id, data.statut)
              }
              setOcrReviewModal(false); setOcrPreFill(null)
            } catch (e) {
              console.error('Création facture (OCR) échouée', e)
              alert("Échec de la création de la facture.")
            }
          }}
          onClose={() => { setOcrReviewModal(false); setOcrPreFill(null) }}
        />
      )}
      {importModal && (
        <ImportModal
          defaultVat={effectiveVat}
          defaultAgence={agenceNom ?? 'Siège'}
          onImport={handleImport}
          onClose={() => setImportModal(false)}
        />
      )}

      {/* Toast succès import */}
      {importToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-medium text-white shadow-lg">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {importToast}
        </div>
      )}
    </div>
  )
}
