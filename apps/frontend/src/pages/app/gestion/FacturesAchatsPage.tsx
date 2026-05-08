import { useMemo, useState, useRef, useEffect } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion, type FactureAchatStatut, type FactureAchat } from '@/contexts/GestionContext'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import { printDocument } from '@/lib/printDocument'
import { generateQRDataUrl, buildFactureAchatQR } from '@/lib/qrCode'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUT_STYLE: Record<FactureAchatStatut, string> = {
  'À valider': 'bg-amber-100 text-amber-700',
  'Validée':   'bg-blue-100 text-blue-700',
  'Payée':     'bg-green-100 text-green-700',
  'En retard': 'bg-red-100 text-red-600',
  'Annulée':   'bg-red-50 text-red-400',
}

const STATUTS: FactureAchatStatut[] = ['À valider', 'Validée', 'Payée', 'En retard', 'Annulée']
const AGENCES = ['Siège', 'Agence Douala — Akwa', 'Succursale Yaoundé — Centre', 'Agence Bafoussam']

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Import CSV ────────────────────────────────────────────────────────────────

const CSV_TEMPLATE = [
  'fournisseur;commande;date;echeance;montantHT;tva;agence;statut',
  'Import Express;ACH-0034;2026-04-25;2026-05-25;4696652;19.25;Siège;À valider',
  'Tech Matériaux;ACH-0035;2026-04-26;2026-05-26;1000000;19.25;Agence Douala — Akwa;Validée',
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
                          <td className="px-3 py-2 font-semibold text-gray-900">{fmt(r.montantTTC)} XAF</td>
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

interface ModalFactureAchatProps {
  achats:         { id: string; fournisseur: string; agence: string; montant: number }[]
  agenceNom:      string | null
  defaultVatRate: number
  onSave:         (data: Omit<FactureAchat, 'id'>) => void
  onClose:        () => void
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
    notes:       '',
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
      lignes:      [],
      notes:       form.notes.trim(),
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
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              placeholder="Remarques…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500/30" />
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

// ── Vue FACTURE ACHAT (document) ──────────────────────────────────────────────

interface FAViewProps {
  fa:          FactureAchat
  companyName: string
  address:     string
  fmtCurrency: (n: number) => string
  onClose:     () => void
  onChangeStatut: (statut: FactureAchatStatut) => void
}

function FAView({ fa, companyName, address, fmtCurrency, onClose, onChangeStatut }: FAViewProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  useEffect(() => {
    generateQRDataUrl(buildFactureAchatQR({
      id:         fa.id,
      fournisseur: fa.fournisseur,
      date:       fa.date,
      echeance:   fa.echeance,
      montantHT:  fa.montantHT,
      tva:        fa.tva,
      montantTTC: fa.montantTTC,
      statut:     fa.statut,
    })).then(setQrDataUrl).catch(() => setQrDataUrl(''))
  }, [fa.id, fa.statut])

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

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
            ← Retour
          </button>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statutBadge}`}>{fa.statut}</span>
          <select value={fa.statut} onChange={e => onChangeStatut(e.target.value as FactureAchatStatut)}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30">
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => printDocument(printRef.current, `FACTURE ACHAT ${fa.id}`)}
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
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-white/80 uppercase tracking-wider">Facture Achat</p>
                <p className="mt-1 text-lg font-mono font-bold text-white">{fa.id}</p>
                <p className="mt-1 text-xs text-white/70">Date : {fmtDate(fa.date)}</p>
              </div>
            </div>
          </div>

          {/* Corps */}
          <div className="px-8 py-6 space-y-6">

            {/* Infos fournisseur + facture */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Fournisseur</p>
                <p className="text-sm font-bold text-gray-900">{fa.fournisseur}</p>
                <p className="text-xs text-gray-500 mt-1">{fa.agence}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Détails facture</p>
                {fa.commande && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Commande réf.</span>
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
              </div>
            </div>

            {/* Table lignes */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-3 py-2.5">N°</th>
                    <th className="px-3 py-2.5">Description</th>
                    <th className="px-3 py-2.5 text-right">Qté</th>
                    <th className="px-3 py-2.5">Unité</th>
                    <th className="px-3 py-2.5 text-right">P.U. HT</th>
                    <th className="px-3 py-2.5 text-right">TVA %</th>
                    <th className="px-3 py-2.5 text-right">Montant HT</th>
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
                      <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-900">{l.description}</td>
                      <td className="px-3 py-2.5 text-right text-sm text-gray-700">{l.quantite}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{l.unite}</td>
                      <td className="px-3 py-2.5 text-right text-sm text-gray-700">
                        {l.prixUnitaireHT.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-gray-500">{l.tvaRate} %</td>
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
                  <span>TVA {fa.tva} %</span>
                  <span className="font-medium">{Math.round(tvaMontant).toLocaleString('fr-FR')} XAF</span>
                </div>
                <div className="border-t border-gray-200 pt-1.5 flex justify-between text-sm font-bold text-gray-900">
                  <span>Total TTC</span>
                  <span>{fmtCurrency(fa.montantTTC)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {fa.notes && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1">Notes</p>
                <p className="text-xs text-gray-700">{fa.notes}</p>
              </div>
            )}

            {/* Pied de page + QR Code */}
            <div className="mt-8 pt-4 border-t border-gray-100 flex items-end justify-between gap-4">
              <p className="text-xs text-gray-400">
                © {new Date().getFullYear()} {companyName} — {address} — Document généré par Athenis
              </p>
              {qrDataUrl && (
                <div className="flex flex-col items-center shrink-0">
                  <img src={qrDataUrl} alt="QR Code" className="w-20 h-20 border border-gray-200 rounded p-0.5" />
                  <p className="mt-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Vérification</p>
                  <p className="text-[10px] text-gray-400 font-mono">{fa.id}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function FacturesAchatsPage() {
  const { fmt, defaultVatRate } = useCurrency()
  const { user }                = useAuth()
  const { facturesAchats, achats, updateFactureAchatStatut, addFactureAchat } = useGestion()
  const { vatRate, company }    = useCompanySettings()

  const agenceNom = user?.agenceNom ?? null
  const [search,       setSearch]       = useState('')
  const [statutFilter, setStatutFilter] = useState<FactureAchatStatut | 'all'>('all')
  const [modal,        setModal]        = useState(false)
  const [importModal,  setImportModal]  = useState(false)
  const [importToast,  setImportToast]  = useState<string | null>(null)
  const [selected,     setSelected]     = useState<FactureAchat | null>(null)

  function handleImport(rows: Omit<FactureAchat, 'id'>[]) {
    rows.forEach(r => addFactureAchat(r))
    setImportToast(`${rows.length} facture${rows.length > 1 ? 's' : ''} importée${rows.length > 1 ? 's' : ''} avec succès`)
    setTimeout(() => setImportToast(null), 4000)
  }

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
          <button onClick={() => setImportModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Importer
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
          <div className="shrink-0 flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
            <div className="relative flex-1 min-w-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Fournisseur, N° facture…"
                className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
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
                    <th className="px-4 py-2.5">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Aucune facture trouvée</td></tr>
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

        {/* Document FACTURE ACHAT */}
        {selectedLive && (
          <FAView
            fa={selectedLive}
            companyName={companyName}
            address={address}
            fmtCurrency={fmt}
            onClose={() => setSelected(null)}
            onChangeStatut={s => updateFactureAchatStatut(selectedLive.id, s)}
          />
        )}
      </div>

      {/* Modals */}
      {modal && (
        <ModalFactureAchat
          achats={achats}
          agenceNom={agenceNom}
          defaultVatRate={effectiveVat}
          onSave={data => { addFactureAchat(data); setModal(false) }}
          onClose={() => setModal(false)}
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
