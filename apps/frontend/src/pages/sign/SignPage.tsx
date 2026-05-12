/**
 * Page de signature électronique publique
 * Accessible sans authentification via /sign/:token
 *
 * Conformité AES (OHADA / Loi 2010/021 Cameroun / UEMOA) :
 *  - Affichage intégral du document avant signature
 *  - Capture du paraphe dessiné (canvas)
 *  - Consentement explicite (case à cocher)
 *  - IP + User-Agent enregistrés côté serveur
 *  - Horodatage certifié
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SignerInfo {
  id:           string
  signerName:   string
  signerEmail:  string
  signerRole:   string | null
  status:       'PENDING' | 'SIGNED' | 'REFUSED'
  signingOrder: number
  signedAt:     string | null
  contract: {
    id:       string
    title:    string
    type:     string
    status:   string
    content:  string | null
    fileName: string | null
    fileMime: string | null
    fileHash: string | null
    notes:    string | null
    parties:  { name: string; email: string; role?: string }[]
    expiresAt: string | null
    company:  { name: string }
    signatures: {
      signerName:   string
      signerEmail:  string
      signerRole:   string | null
      status:       string
      signedAt:     string | null
      signingOrder: number
    }[]
  }
}

// ── Signature Canvas ──────────────────────────────────────────────────────────

function SignatureCanvas({
  onSave,
  onClear,
}: {
  onSave: (dataUrl: string) => void
  onClear: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)
  const hasDrawn  = useRef(false)

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0]!.clientX - rect.left, y: e.touches[0]!.clientY - rect.top }
    }
    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    // Fond blanc
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1a3a2a'
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      drawing.current = true
      const pos = getPos(e, canvas)
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
    const draw = (e: MouseEvent | TouchEvent) => {
      if (!drawing.current) return
      e.preventDefault()
      hasDrawn.current = true
      const pos = getPos(e, canvas)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
    const stop = () => {
      drawing.current = false
      if (hasDrawn.current) {
        onSave(canvas.toDataURL('image/png'))
      }
    }

    canvas.addEventListener('mousedown',  start)
    canvas.addEventListener('mousemove',  draw)
    canvas.addEventListener('mouseup',    stop)
    canvas.addEventListener('mouseleave', stop)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove',  draw,  { passive: false })
    canvas.addEventListener('touchend',   stop)

    return () => {
      canvas.removeEventListener('mousedown',  start)
      canvas.removeEventListener('mousemove',  draw)
      canvas.removeEventListener('mouseup',    stop)
      canvas.removeEventListener('mouseleave', stop)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove',  draw)
      canvas.removeEventListener('touchend',   stop)
    }
  }, [onSave])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    hasDrawn.current = false
    onClear()
  }, [onClear])

  return (
    <div className="space-y-2">
      <div className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={520}
          height={160}
          className="w-full touch-none cursor-crosshair"
          style={{ maxHeight: '160px' }}
        />
        <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-300 pointer-events-none select-none">
          Signez ici avec la souris ou votre doigt
        </p>
      </div>
      <button
        type="button"
        onClick={clear}
        className="text-xs text-gray-500 hover:text-gray-700 underline"
      >
        Effacer et recommencer
      </button>
    </div>
  )
}

// ── Document Viewer ───────────────────────────────────────────────────────────

function DocumentViewer({ token, fileName, fileMime }: { token: string; fileName: string | null; fileMime: string | null }) {
  const [docData, setDocData] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL ?? '/api'
    axios.get(`${API}/legal/sign/${token}/document`)
      .then(r => setDocData(r.data.data?.fileData ?? null))
      .catch(() => setDocData(null))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
      <div className="text-gray-400 text-sm">Chargement du document…</div>
    </div>
  )

  if (!docData) return (
    <div className="flex items-center justify-center h-32 bg-gray-50 rounded-xl border border-dashed border-gray-300">
      <p className="text-sm text-gray-400">
        📄 {fileName ? `Document: ${fileName}` : 'Aucun fichier joint — le contenu est affiché ci-dessous'}
      </p>
    </div>
  )

  const isPdf = fileMime === 'application/pdf'
  const isImg = fileMime?.startsWith('image/')

  if (isPdf) {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200 bg-white" style={{ height: '520px' }}>
        <embed
          src={`data:application/pdf;base64,${docData}`}
          type="application/pdf"
          className="w-full h-full"
        />
      </div>
    )
  }

  if (isImg) {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200 bg-white p-4">
        <img
          src={`data:${fileMime};base64,${docData}`}
          alt={fileName ?? 'Document'}
          className="max-w-full mx-auto rounded"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-32 bg-gray-50 rounded-xl border border-dashed">
      <p className="text-sm text-gray-500">Format {fileMime} — téléchargez pour visualiser</p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Step = 'loading' | 'review' | 'sign' | 'done' | 'refused' | 'error' | 'already'

export function SignPage() {
  const { token }     = useParams<{ token: string }>()
  const [step, setStep]           = useState<Step>('loading')
  const [info, setInfo]           = useState<SignerInfo | null>(null)
  const [error, setError]         = useState('')
  const [signatureData, setSig]   = useState<string | null>(null)
  const [consent, setConsent]     = useState(false)
  const [refuseNote, setRefuseNote] = useState('')
  const [showRefuse, setShowRefuse] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const API = import.meta.env.VITE_API_URL ?? '/api'

  // Charger les infos du contrat
  useEffect(() => {
    if (!token) { setStep('error'); return }
    axios.get(`${API}/legal/sign/${token}`)
      .then(r => {
        const data: SignerInfo = r.data.data
        setInfo(data)
        if (data.status === 'SIGNED')  { setStep('already'); return }
        if (data.status === 'REFUSED') { setStep('already'); return }
        if (data.contract.status === 'SIGNED') { setStep('already'); return }
        setStep('review')
      })
      .catch(() => { setStep('error') })
  }, [token, API])

  const handleSign = async () => {
    if (!signatureData) { setError('Veuillez apposer votre signature dans le cadre ci-dessus.'); return }
    if (!consent) { setError('Veuillez cocher la case de consentement.'); return }
    setSubmitting(true)
    setError('')
    try {
      await axios.post(`${API}/legal/sign/${token}`, {
        action: 'sign',
        signatureData: signatureData.replace(/^data:image\/png;base64,/, ''),
      })
      setStep('done')
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRefuse = async () => {
    setSubmitting(true)
    setError('')
    try {
      await axios.post(`${API}/legal/sign/${token}`, {
        action: 'refuse',
        note: refuseNote,
      })
      setStep('refused')
    } catch {
      setError('Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  // ── États ─────────────────────────────────────────────────────────────────

  if (step === 'loading') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Chargement du document…</p>
      </div>
    </div>
  )

  if (step === 'error') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Lien invalide ou expiré</h1>
        <p className="text-gray-500 text-sm">Ce lien de signature est invalide ou a déjà été utilisé. Contactez l'expéditeur pour obtenir un nouveau lien.</p>
      </div>
    </div>
  )

  if (step === 'already') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="text-5xl mb-4">{info?.status === 'REFUSED' ? '🚫' : '✅'}</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {info?.status === 'REFUSED' ? 'Signature refusée' : 'Déjà signé'}
        </h1>
        <p className="text-gray-500 text-sm">
          {info?.status === 'SIGNED'
            ? `Vous avez déjà signé ce document le ${fmtDate(info.signedAt)}.`
            : 'Ce document a été refusé.'}
        </p>
      </div>
    </div>
  )

  if (step === 'done') return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Document signé !</h1>
        <p className="text-gray-500 text-sm mb-6">
          Votre signature électronique a été enregistrée avec succès.
          Un certificat de réalisation vous sera envoyé une fois que tous les signataires auront signé.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1 text-xs text-gray-500">
          <p>📄 Document : <strong className="text-gray-700">{info?.contract.title}</strong></p>
          <p>🏢 Expéditeur : <strong className="text-gray-700">{info?.contract.company.name}</strong></p>
          <p>⏰ Signé le : <strong className="text-gray-700">{fmtDate(new Date().toISOString())}</strong></p>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Signature conforme à la Loi n°2010/021 du Cameroun · OHADA 2010 · UEMOA ASA.20110
        </p>
      </div>
    </div>
  )

  if (step === 'refused') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Signature refusée</h1>
        <p className="text-gray-500 text-sm">Vous avez refusé de signer ce document. L'expéditeur en a été informé.</p>
      </div>
    </div>
  )

  // ── Vue principale : review + sign ─────────────────────────────────────────
  const contract = info!.contract
  const allSigners = contract.signatures

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1a3a2a] text-white px-6 py-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">Athenis</span>
            <span className="text-green-300 text-sm hidden sm:block">· Signature électronique sécurisée</span>
          </div>
          <div className="text-xs text-green-300 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full inline-block animate-pulse" />
            Connexion sécurisée
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Infos du document */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Document à signer</p>
              <h1 className="text-xl font-bold text-gray-900">{contract.title}</h1>
              <p className="text-sm text-gray-500 mt-1">Envoyé par <strong>{contract.company.name}</strong></p>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-full">
                En attente de signature
              </span>
              {contract.expiresAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Expire le {new Date(contract.expiresAt).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </div>

          {/* Signataires */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">Signataires ({allSigners.length})</p>
            <div className="space-y-1">
              {allSigners.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    s.status === 'SIGNED'  ? 'bg-green-100 text-green-700' :
                    s.status === 'REFUSED' ? 'bg-red-100 text-red-700'    :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {s.status === 'SIGNED' ? '✓' : s.status === 'REFUSED' ? '✗' : s.signingOrder}
                  </span>
                  <span className={s.signerEmail === info!.signerEmail ? 'font-semibold text-gray-900' : 'text-gray-600'}>
                    {s.signerName}
                    {s.signerRole && <span className="text-gray-400"> · {s.signerRole}</span>}
                    {s.signerEmail === info!.signerEmail && <span className="text-green-600 text-xs ml-1">(vous)</span>}
                  </span>
                  {s.status === 'SIGNED' && s.signedAt && (
                    <span className="ml-auto text-xs text-green-600">{fmtDate(s.signedAt)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contenu textuel (si pas de fichier) */}
        {contract.content && (
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Contenu du document</p>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap font-mono text-sm leading-relaxed border border-gray-100 rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
              {contract.content}
            </div>
          </div>
        )}

        {/* Visionneuse PDF/Image */}
        {(contract.fileName || contract.fileMime) && (
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
              📎 {contract.fileName ?? 'Document joint'}
            </p>
            <DocumentViewer token={token!} fileName={contract.fileName} fileMime={contract.fileMime} />
            {contract.fileHash && (
              <p className="mt-2 text-xs text-gray-400 font-mono">
                SHA-256 : {contract.fileHash}
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        {contract.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-1">📝 Notes de l'expéditeur</p>
            <p className="text-sm text-amber-800">{contract.notes}</p>
          </div>
        )}

        {/* Zone de signature */}
        {step === 'review' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Votre signature</p>
              <p className="text-sm text-gray-600">
                <strong>{info!.signerName}</strong>{info!.signerRole ? ` · ${info!.signerRole}` : ''}
                <span className="text-gray-400 ml-2">({info!.signerEmail})</span>
              </p>
            </div>

            {/* Canvas signature */}
            <SignatureCanvas
              onSave={data => setSig(data)}
              onClear={() => setSig(null)}
            />

            {/* Consentement légal */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-xs text-gray-600 leading-relaxed">
                Je confirme avoir lu et pris connaissance du document ci-dessus dans son intégralité.
                En signant électroniquement, j'accepte que cette signature ait la même valeur juridique
                qu'une signature manuscrite, conformément à la Loi n°2010/021 du Cameroun sur le commerce
                électronique et aux dispositions de l'Acte Uniforme OHADA (2010). Je consens à ce que
                mon adresse IP et la date/heure de signature soient enregistrées dans la piste d'audit.
              </span>
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Boutons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleSign}
                disabled={submitting || !signatureData || !consent}
                className="flex-1 bg-[#15803d] text-white font-semibold py-3 px-6 rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {submitting ? '⏳ Signature en cours…' : '✍️ Signer le document'}
              </button>
              <button
                onClick={() => setShowRefuse(v => !v)}
                disabled={submitting}
                className="sm:w-auto border border-gray-300 text-gray-600 font-medium py-3 px-5 rounded-xl hover:bg-gray-50 disabled:opacity-40 text-sm"
              >
                Refuser
              </button>
            </div>

            {/* Formulaire de refus */}
            {showRefuse && (
              <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-red-700">Motif de refus (optionnel)</p>
                <textarea
                  rows={3}
                  value={refuseNote}
                  onChange={e => setRefuseNote(e.target.value)}
                  placeholder="Ex : Clauses non conformes à l'accord préalable…"
                  className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                />
                <button
                  onClick={handleRefuse}
                  disabled={submitting}
                  className="bg-red-600 text-white font-medium py-2 px-5 rounded-lg hover:bg-red-700 disabled:opacity-40 text-sm"
                >
                  {submitting ? 'Envoi…' : 'Confirmer le refus'}
                </button>
              </div>
            )}

            {/* Mention légale */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <span className="text-green-600 text-lg">🔒</span>
              <p className="text-xs text-gray-400 leading-relaxed">
                Signature électronique avancée (AES) · Conforme OHADA 2010 · Loi Cameroun 2010/021 · UEMOA ASA.20110
                · Piste d'audit horodatée et archivée · IP et navigateur enregistrés
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
