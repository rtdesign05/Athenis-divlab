/**
 * ScanAI — Modal d'OCR de factures fournisseurs
 * Workflow : sélection image → aperçu → analyse Claude Vision → données extraites → pré-remplissage
 */
import { useRef, useState, useCallback } from 'react'
import { scanInvoice, type ScannedInvoice } from '@/services/scanApi'

interface ScanAiModalProps {
  onResult: (data: ScannedInvoice) => void
  onClose:  () => void
}

type Step = 'pick' | 'preview' | 'scanning' | 'result' | 'error'

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif'
const MAX_MB   = 5

export function ScanAiModal({ onResult, onClose }: ScanAiModalProps) {
  const fileRef                           = useRef<HTMLInputElement>(null)
  const [step, setStep]                   = useState<Step>('pick')
  const [file, setFile]                   = useState<File | null>(null)
  const [previewUrl, setPreviewUrl]       = useState<string>('')
  const [result, setResult]               = useState<ScannedInvoice | null>(null)
  const [errorMsg, setErrorMsg]           = useState('')

  /* ── Sélection d'image ──────────────────────────────────────────────────── */

  const pickFile = useCallback((f: File) => {
    if (f.size > MAX_MB * 1024 * 1024) {
      setErrorMsg(`Image trop volumineuse (max ${MAX_MB} Mo)`)
      setStep('error')
      return
    }
    if (!f.type.startsWith('image/')) {
      setErrorMsg('Format non supporté — utilisez JPG, PNG ou WebP')
      setStep('error')
      return
    }
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setStep('preview')
  }, [])

  const handleFileInput  = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) pickFile(e.target.files[0])
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0])
  }

  /* ── Analyse OCR ────────────────────────────────────────────────────────── */

  async function analyse() {
    if (!file) return
    setStep('scanning')
    try {
      const data = await scanInvoice(file)
      setResult(data)
      setStep('result')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion'
      // Cas clé manquante
      if (msg.includes('503') || msg.includes('non configuré')) {
        setErrorMsg('ScanAI non configuré — ajoutez ANTHROPIC_API_KEY dans le fichier .env du backend')
      } else {
        setErrorMsg(`Analyse échouée : ${msg}`)
      }
      setStep('error')
    }
  }

  /* ── Utiliser les données ──────────────────────────────────────────────── */

  function useData() {
    if (result) {
      onResult(result)
      onClose()
    }
  }

  /* ── Helpers affichage ─────────────────────────────────────────────────── */

  const val = (v: string | number | null | undefined, suffix = '') =>
    v != null && v !== '' ? `${v}${suffix}` : <span className="text-gray-300 italic">—</span>

  const confColor = (c: number) =>
    c >= 80 ? 'text-green-700 bg-green-50 border-green-200'
    : c >= 50 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-red-700 bg-red-50 border-red-200'

  /* ── Rendu ──────────────────────────────────────────────────────────────── */

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 text-base">📷</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">ScanAI — OCR facture</p>
              <p className="text-xs text-gray-400">Analyse par Claude Vision · Anthropic</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors">×</button>
        </div>

        {/* Corps — étape pick */}
        {step === 'pick' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-10 cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-all"
            >
              <span className="text-4xl">🧾</span>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">Déposez votre facture ici</p>
                <p className="mt-0.5 text-xs text-gray-400">ou cliquez pour parcourir vos fichiers</p>
              </div>
              <div className="flex gap-2">
                {['JPG', 'PNG', 'WebP'].map(f => (
                  <span key={f} className="rounded-full bg-white border border-violet-200 px-2.5 py-0.5 text-xs font-medium text-violet-700">{f}</span>
                ))}
              </div>
              <p className="text-xs text-gray-300">Taille max {MAX_MB} Mo</p>
              <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileInput} />
            </div>

            <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 space-y-2">
              <p className="text-xs font-semibold text-violet-800">✦ Ce que ScanAI extrait automatiquement</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                  'Nom & NIU fournisseur', 'Numéro de facture',
                  'Date & échéance',        'Lignes d\'articles',
                  'Montant HT',             'Taux & montant TVA',
                  'Total TTC',              'Devise (XAF / EUR)',
                ].map(item => (
                  <div key={item} className="flex items-center gap-1.5 text-xs text-violet-700">
                    <span className="text-violet-400">›</span>{item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Aperçu image */}
        {step === 'preview' && file && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <img src={previewUrl} alt="Aperçu facture" className="w-full max-h-72 object-contain" />
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2.5">
              <span className="text-lg">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} Ko · {file.type}</p>
              </div>
              <button onClick={() => { setStep('pick'); setFile(null); setPreviewUrl('') }}
                className="text-xs text-gray-400 hover:text-gray-600 underline shrink-0">
                Changer
              </button>
            </div>
          </div>
        )}

        {/* Analyse en cours */}
        {step === 'scanning' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-10">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin" />
              <span className="absolute inset-0 flex items-center justify-center text-xl">🔍</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">Analyse en cours…</p>
              <p className="mt-1 text-xs text-gray-400">Claude Vision lit votre facture</p>
            </div>
            <div className="flex gap-2 text-xs text-gray-300">
              {['Détection texte…', 'Extraction données…', 'Structuration JSON…'].map((t, i) => (
                <span key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Résultat */}
        {step === 'result' && result && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Score confiance */}
            <div className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${confColor(result.confidence)}`}>
              <div className="flex items-center gap-2">
                <span>{result.confidence >= 80 ? '✅' : result.confidence >= 50 ? '⚠️' : '❌'}</span>
                <span className="text-xs font-semibold">
                  {result.confidence >= 80 ? 'Extraction fiable' : result.confidence >= 50 ? 'Extraction partielle' : 'Extraction incertaine'}
                </span>
              </div>
              <span className="text-xs font-bold">{result.confidence}% confiance</span>
            </div>

            {/* Données fournisseur */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700">🏢 Fournisseur</p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <Field label="Nom"     value={result.vendorName} />
                <Field label="NIU"     value={result.vendorNiu} />
                <Field label="Tél."    value={result.vendorPhone} />
                <Field label="Adresse" value={result.vendorAddress} />
              </div>
            </div>

            {/* Données facture */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700">📋 Facture</p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <Field label="N° facture" value={result.invoiceNumber} />
                <Field label="Devise"     value={result.currency} />
                <Field label="Date"       value={result.invoiceDate} />
                <Field label="Échéance"   value={result.dueDate} />
              </div>
            </div>

            {/* Montants */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700">💰 Montants</p>
              </div>
              <div className="p-4 grid grid-cols-3 gap-3">
                <Field label="HT" value={result.subtotal != null ? result.subtotal.toLocaleString('fr-FR') : null} />
                <Field label={`TVA (${result.taxRate ?? '—'}%)`} value={result.taxAmount != null ? result.taxAmount.toLocaleString('fr-FR') : null} />
                <Field label="TTC" value={result.total != null ? result.total.toLocaleString('fr-FR') : null} highlight />
              </div>
            </div>

            {/* Lignes d'articles */}
            {result.items.length > 0 && (
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-700">📦 Lignes ({result.items.length})</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {result.items.map((item, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{item.description}</p>
                        <p className="text-xs text-gray-400">
                          {item.quantity} × {(item.unitPrice ?? 0).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-gray-700 shrink-0">
                        {(item.total ?? 0).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.notes && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-2.5">
                <p className="text-xs text-amber-800"><span className="font-semibold">Notes :</span> {result.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Erreur */}
        {step === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <span className="text-4xl">❌</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Analyse impossible</p>
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">{errorMsg}</p>
            </div>
            <button
              onClick={() => { setStep('pick'); setFile(null); setPreviewUrl(''); setErrorMsg('') }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 flex items-center gap-2 border-t border-gray-100 px-5 py-3">
          <button onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <div className="flex-1" />

          {step === 'preview' && (
            <button onClick={analyse}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-colors">
              <span>🔍</span> Analyser avec ScanAI
            </button>
          )}

          {step === 'result' && result && (
            <>
              <button
                onClick={() => { setStep('pick'); setFile(null); setPreviewUrl(''); setResult(null) }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Rescanner
              </button>
              <button onClick={useData}
                className="flex items-center gap-2 rounded-lg bg-green-700 px-5 py-2 text-xs font-semibold text-white hover:bg-green-800 transition-colors">
                <span>✓</span> Utiliser ces données
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Composant Field ─────────────────────────────────────────────────────────── */

function Field({ label, value, highlight = false }: { label: string; value: string | number | null | undefined; highlight?: boolean }) {
  const isEmpty = value == null || value === ''
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-xs font-medium truncate ${highlight ? 'text-green-700' : 'text-gray-800'} ${isEmpty ? 'text-gray-300 italic' : ''}`}>
        {isEmpty ? '—' : String(value)}
      </p>
    </div>
  )
}
