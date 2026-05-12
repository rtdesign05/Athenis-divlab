/**
 * ContractsPage — Gestion des contrats avec signature électronique avancée (AES)
 * Upload document · Multi-signataires · Suivi temps réel · Certificat de réalisation
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import {
  useContracts, useCreateContract, useUpdateContract, useDeleteContract, useSendSignature,
} from '@/hooks/useLegal'
import { legalApi }    from '@/services/legalApi'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth }    from '@/features/auth/useAuth'
import type { ContractType, ContractStatus, ContractParty, LegalContract, CompletionCertificate } from '@/services/legalApi'
import {
  useContracts as useEmploymentContracts,
  type EmploymentContract,
  type ContractStatus as EmpStatus,
} from '@/contexts/ContractsContext'

const TYPE_LABEL: Record<ContractType, string> = {
  EMPLOYMENT: 'Contrat de travail', SERVICE: 'Prestation de services',
  NDA: 'NDA / Confidentialité',     PARTNERSHIP: 'Partenariat',
  LEASE: 'Bail',                    SUPPLIER: 'Fournisseur',
  CLIENT: 'Client',                 OTHER: 'Autre',
}

const STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT:             'Brouillon',
  PENDING_SIGNATURE: 'En attente de signature',
  SIGNED:            'Signé',
  EXPIRED:           'Expiré',
  TERMINATED:        'Résilié',
}

const STATUS_BADGE: Record<ContractStatus, string> = {
  DRAFT:             'bg-gray-100 text-gray-600',
  PENDING_SIGNATURE: 'bg-yellow-100 text-yellow-700',
  SIGNED:            'bg-green-100 text-green-700',
  EXPIRED:           'bg-red-100 text-red-600',
  TERMINATED:        'bg-gray-200 text-gray-500',
}

// ── Create modal ──────────────────────────────────────────────────────────────
function CreateModal({ onClose }: { onClose: () => void }) {
  const create = useCreateContract()
  const [title,    setTitle]    = useState('')
  const [type,     setType]     = useState<ContractType>('SERVICE')
  const [expiresAt, setExpires] = useState('')
  const [notes,    setNotes]    = useState('')
  const [parties,  setParties]  = useState<ContractParty[]>([{ name: '', email: '', role: '' }])

  const addParty    = () => setParties(p => [...p, { name: '', email: '', role: '' }])
  const removeParty = (i: number) => setParties(p => p.filter((_, j) => j !== i))
  const updateParty = (i: number, field: keyof ContractParty, val: string) =>
    setParties(p => p.map((x, j) => j === i ? { ...x, [field]: val } : x))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await create.mutateAsync({
      title, type,
      parties: parties.filter(p => p.name && p.email),
      ...(expiresAt ? { expiresAt } : {}),
      ...(notes     ? { notes }     : {}),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Nouveau contrat</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Titre</label>
            <input required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Ex : Contrat de prestation client X" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={type} onChange={e => setType(e.target.value as ContractType)}>
              {(Object.entries(TYPE_LABEL) as [ContractType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date d'expiration</label>
            <input type="date" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={expiresAt} onChange={e => setExpires(e.target.value)} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Parties</label>
              <button type="button" onClick={addParty}
                className="text-xs font-medium text-blue-600 hover:text-blue-700">+ Ajouter</button>
            </div>
            <div className="space-y-2">
              {parties.map((p, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-3 gap-1">
                    <input placeholder="Nom"   className="rounded border border-gray-300 px-2 py-1 text-xs"
                      value={p.name}       onChange={e => updateParty(i, 'name',  e.target.value)} />
                    <input placeholder="Email" className="rounded border border-gray-300 px-2 py-1 text-xs"
                      value={p.email}      onChange={e => updateParty(i, 'email', e.target.value)} />
                    <input placeholder="Rôle"  className="rounded border border-gray-300 px-2 py-1 text-xs"
                      value={p.role ?? ''} onChange={e => updateParty(i, 'role',  e.target.value)} />
                  </div>
                  {parties.length > 1 && (
                    <button type="button" onClick={() => removeParty(i)}
                      className="text-xs text-red-400 hover:text-red-600 mt-1">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={create.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              {create.isPending ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Upload Document modal ──────────────────────────────────────────────────────
function UploadModal({ contract, onClose }: { contract: LegalContract; onClose: () => void }) {
  const qc          = useQueryClient()
  const fileRef     = useRef<HTMLInputElement>(null)
  const [file, setFile]         = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  const handleFile = (f: File) => {
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png']
    if (!allowed.includes(f.type)) {
      setError('Format non supporté. Utilisez PDF, DOCX, JPG ou PNG.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('Fichier trop lourd (max 10 MB).')
      return
    }
    setFile(f)
    setError('')
  }

  const upload = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      await legalApi.contracts.uploadDocument(contract.id, file)
      await qc.invalidateQueries({ queryKey: ['legal', 'contracts'] })
      setDone(true)
    } catch {
      setError('Erreur lors de l\'upload. Veuillez réessayer.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Importer un document</h2>
        <p className="mb-4 text-sm text-gray-500">{contract.title}</p>

        {done ? (
          <div className="space-y-4 text-center">
            <div className="text-4xl">✅</div>
            <p className="text-sm font-medium text-green-700">Document importé avec succès !</p>
            <p className="text-xs text-gray-500">
              L'empreinte SHA-256 a été calculée et archivée pour garantir l'intégrité du document.
            </p>
            <button onClick={onClose}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              Fermer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Zone drag & drop */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              {file ? (
                <div>
                  <p className="text-2xl mb-1">📄</p>
                  <p className="text-sm font-medium text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-3xl mb-2">📎</p>
                  <p className="text-sm font-medium text-gray-600">Glissez votre document ici</p>
                  <p className="text-xs text-gray-400 mt-1">ou cliquez pour sélectionner</p>
                  <p className="text-xs text-gray-400">PDF, DOCX, JPG, PNG · max 10 MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                🔒 L'empreinte SHA-256 du document sera calculée et archivée.
                Toute modification ultérieure sera détectable (conformité AES).
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={upload} disabled={!file || uploading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                {uploading ? 'Import en cours…' : 'Importer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Mini canvas de signature (réutilisé dans la modale interne) ───────────────
function InlineSignatureCanvas({ onCapture }: { onCapture: (data: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const src    = 'touches' in e ? e.touches[0] : e
    return { x: (src.clientX - rect.left) * (canvas.width / rect.width),
             y: (src.clientY - rect.top)  * (canvas.height / rect.height) }
  }

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    drawing.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y)
  }
  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2; ctx.lineCap = 'round'
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y); ctx.stroke()
    onCapture(canvasRef.current!.toDataURL('image/png'))
  }
  const stop = () => { drawing.current = false }
  const clear = () => {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    onCapture(null)
  }

  return (
    <div>
      <canvas ref={canvasRef} width={460} height={120}
        className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-white touch-none cursor-crosshair"
        style={{ touchAction: 'none' }}
        onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchMove={move} onTouchEnd={stop} />
      <button type="button" onClick={clear}
        className="mt-1 text-xs text-gray-400 hover:text-gray-600 underline">
        Effacer et recommencer
      </button>
    </div>
  )
}

// ── Signature modal (multi-signataires + signature interne en 1 clic) ─────────
function SignatureModal({ contract, onClose }: { contract: LegalContract; onClose: () => void }) {
  const send    = useSendSignature()
  const { user } = useAuth()
  const qc      = useQueryClient()

  // Signataires externes (email)
  const [signers,    setSigners]    = useState([{ name: '', email: '', role: '' }])
  const [sequential, setSequential] = useState(false)

  // Signature interne (représentant de l'entreprise — DG, PDG…)
  const [selfSign,     setSelfSign]     = useState(false)
  const [selfRole,     setSelfRole]     = useState('Directeur Général')
  const [selfSigData,  setSelfSigData]  = useState<string | null>(null)
  const [selfConsent,  setSelfConsent]  = useState(false)

  // État envoi
  const [sent,    setSent]    = useState<{ name: string; email: string; signUrl: string; internal?: boolean }[]>([])
  const [sending, setSending] = useState(false)
  const [error,   setError]   = useState('')

  const addSigner    = () => setSigners(s => [...s, { name: '', email: '', role: '' }])
  const removeSigner = (i: number) => setSigners(s => s.filter((_, j) => j !== i))
  const updateSigner = (i: number, field: string, val: string) =>
    setSigners(s => s.map((x, j) => j === i ? { ...x, [field]: val } : x))

  const userFullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Utilisateur'
  const userEmail    = user?.email ?? ''

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const external = signers.filter(s => s.name && s.email)
    if (external.length === 0 && !selfSign) { setError('Ajoutez au moins un signataire ou activez la signature interne.'); return }
    if (selfSign && !selfSigData)  { setError('Dessinez votre signature avant de valider.'); return }
    if (selfSign && !selfConsent)  { setError('Veuillez accepter les conditions légales de signature.'); return }

    setSending(true); setError('')
    const results: typeof sent = []

    // 1. Invitations externes (email)
    for (const s of external) {
      try {
        const r = await send.mutateAsync({
          id: contract.id,
          dto: { signerName: s.name, signerEmail: s.email, ...(s.role ? { signerRole: s.role } : {}) },
        })
        results.push({ name: s.name, email: s.email, signUrl: r.signUrl ?? `${window.location.origin}${r.signLink}` })
      } catch { setError(`Erreur pour ${s.email}`) }
    }

    // 2. Signature interne — DG de l'entreprise signe directement sans email
    if (selfSign && selfSigData) {
      try {
        const r = await send.mutateAsync({
          id: contract.id,
          dto: { signerName: userFullName, signerEmail: userEmail, ...(selfRole ? { signerRole: selfRole } : {}) },
        })
        const token = r.signLink.split('/sign/')[1]
        await legalApi.sign.submit(token, { action: 'sign', signatureData: selfSigData })
        results.push({ name: userFullName, email: userEmail, internal: true, signUrl: '' })
        qc.invalidateQueries({ queryKey: ['legal', 'contracts'] })
      } catch (err) { setError('Erreur lors de la signature interne.') }
    }

    setSent(results)
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Demande de signature électronique</h2>
        <p className="mb-4 text-sm text-gray-500">{contract.title}</p>

        {/* Signatures existantes */}
        {contract.signatures && contract.signatures.length > 0 && (
          <div className="mb-4 bg-gray-50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-gray-500 mb-2">Signatures existantes</p>
            {contract.signatures.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  s.status === 'SIGNED'  ? 'bg-green-100 text-green-700' :
                  s.status === 'REFUSED' ? 'bg-red-100 text-red-700'    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {s.status === 'SIGNED' ? '✓' : s.status === 'REFUSED' ? '✗' : '…'}
                </span>
                <span className="text-gray-700">{s.signerName} · {s.signerEmail}</span>
                {s.signedAt && <span className="ml-auto text-gray-400">{new Date(s.signedAt).toLocaleDateString('fr-FR')}</span>}
              </div>
            ))}
          </div>
        )}

        {sent.length > 0 ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-800 mb-3">
                ✅ {sent.length} signature{sent.length > 1 ? 's' : ''} traitée{sent.length > 1 ? 's' : ''} !
              </p>
              <div className="space-y-2">
                {sent.map((s, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 border border-green-100">
                    <p className="text-xs font-medium text-gray-700">
                      {s.internal ? '🏢 ' : '📧 '}
                      {s.name} · {s.email}
                    </p>
                    {s.internal ? (
                      <p className="text-xs text-green-600 mt-1 font-medium">✅ Signé directement — aucun email requis</p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1 break-all">
                        🔗 <a href={s.signUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{s.signUrl}</a>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={onClose}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">

            {/* ── Bloc signature interne (DG / représentant de l'entreprise) ── */}
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <input type="checkbox" checked={selfSign} onChange={e => setSelfSign(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-emerald-600" />
                <div>
                  <span className="text-sm font-semibold text-emerald-800">
                    🏢 Je signe maintenant (représentant de l'entreprise)
                  </span>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Signature directe en app — aucun email envoyé, aucun lien requis
                  </p>
                </div>
              </label>

              {selfSign && (
                <div className="space-y-3 mt-3 pt-3 border-t border-emerald-200">
                  {/* Identité pré-remplie */}
                  <div className="bg-white rounded-lg p-3 border border-emerald-200 text-sm">
                    <p className="font-medium text-gray-800">{userFullName}</p>
                    <p className="text-gray-500 text-xs">{userEmail}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Qualité / Rôle</label>
                    <input value={selfRole} onChange={e => setSelfRole(e.target.value)}
                      placeholder="ex : Directeur Général, Président, Gérant…"
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Votre signature manuscrite numérique
                    </label>
                    <InlineSignatureCanvas onCapture={setSelfSigData} />
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={selfConsent} onChange={e => setSelfConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-emerald-600" />
                    <span className="text-xs text-gray-600 leading-relaxed">
                      Je confirme avoir lu le document et j'accepte que cette signature électronique
                      ait la même valeur juridique qu'une signature manuscrite, conformément à la
                      Loi n°2010/021 du Cameroun et à l'Acte Uniforme OHADA (2010).
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* ── Signataires externes (par email) ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Signataires externes · par email ({signers.length})
                </label>
                <button type="button" onClick={addSigner}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700">
                  + Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {signers.map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">
                        Signataire {i + 1}{sequential ? ` (ordre ${i + 1})` : ''}
                      </span>
                      {signers.length > 1 && (
                        <button type="button" onClick={() => removeSigner(i)}
                          className="text-xs text-red-400 hover:text-red-600">Retirer</button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <input placeholder="Nom complet *"
                        className="rounded border border-gray-300 px-2 py-1.5 text-sm w-full"
                        value={s.name} onChange={e => updateSigner(i, 'name', e.target.value)} />
                      <input type="email" placeholder="Email *"
                        className="rounded border border-gray-300 px-2 py-1.5 text-sm w-full"
                        value={s.email} onChange={e => updateSigner(i, 'email', e.target.value)} />
                      <input placeholder="Qualité / Rôle (ex : Directeur Général)"
                        className="rounded border border-gray-300 px-2 py-1.5 text-sm w-full"
                        value={s.role} onChange={e => updateSigner(i, 'role', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {signers.length > 1 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={sequential} onChange={e => setSequential(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                <span className="text-xs text-gray-600">
                  Signature séquentielle (chaque signataire reçoit le lien après le précédent)
                </span>
              </label>
            )}

            {!contract.fileName && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700">
                  💡 <strong>Conseil :</strong> importez votre document PDF pour que les signataires
                  puissent le visualiser avant de signer.
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                🔒 Chaque signature est horodatée avec IP et navigateur (conformité AES · OHADA 2010).
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
              <button type="submit" disabled={sending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                {sending ? 'Traitement…' : 'Confirmer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Certificate modal ─────────────────────────────────────────────────────────
function CertificateModal({ contract, onClose }: { contract: LegalContract; onClose: () => void }) {
  const [cert, setCert]   = useState<CompletionCertificate | null>(null)
  const [loading, setLoading] = useState(true)

  useState(() => {
    legalApi.contracts.certificate(contract.id)
      .then(setCert)
      .catch(() => setCert(null))
      .finally(() => setLoading(false))
  })

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : '—'

  const print = () => window.print()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-[#1a3a2a] text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div>
            <p className="text-xs text-green-300 uppercase tracking-wide">Certificat de réalisation</p>
            <h2 className="text-base font-bold">Signature électronique avancée (AES)</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={print}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors">
              🖨️ Imprimer
            </button>
            <button onClick={onClose}
              className="text-white/70 hover:text-white text-xl leading-none">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {loading && (
            <div className="text-center py-8 text-gray-400">Génération du certificat…</div>
          )}

          {!loading && !cert && (
            <div className="text-center py-8 text-red-500">Impossible de générer le certificat.</div>
          )}

          {cert && (
            <>
              {/* Identité */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Certificat</p>
                  <p className="text-sm font-mono text-gray-700">{cert.certificateId}</p>
                  <p className="text-xs text-gray-400 mt-1">Généré le {fmtDate(cert.generatedAt)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Émetteur</p>
                  <p className="text-sm font-medium text-gray-800">{cert.company.name}</p>
                  {cert.company.address && <p className="text-xs text-gray-400">{cert.company.address}</p>}
                </div>
              </div>

              {/* Document */}
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Document signé</p>
                <p className="text-sm font-semibold text-gray-900 mb-1">{cert.contract.title}</p>
                <p className="text-xs text-gray-500">Type : {TYPE_LABEL[cert.contract.type]}</p>
                {cert.contract.fileName && (
                  <p className="text-xs text-gray-500">Fichier : {cert.contract.fileName}</p>
                )}
                {cert.contract.fileHash && (
                  <div className="mt-2 bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-400">Empreinte SHA-256 (intégrité du document)</p>
                    <p className="text-xs font-mono text-gray-600 break-all">{cert.contract.fileHash}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Clôturé le {fmtDate(cert.contract.signedAt)}
                </p>
              </div>

              {/* Signatures */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Signatures</p>
                <div className="space-y-2">
                  {cert.signatures.map((s, i) => (
                    <div key={i} className={`rounded-lg p-3 border ${
                      s.status === 'SIGNED'  ? 'bg-green-50 border-green-200' :
                      s.status === 'REFUSED' ? 'bg-red-50 border-red-200'    :
                      'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {s.signerName}
                            {s.signerRole && <span className="text-gray-400 font-normal"> · {s.signerRole}</span>}
                          </p>
                          <p className="text-xs text-gray-500">{s.signerEmail}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          s.status === 'SIGNED'  ? 'bg-green-100 text-green-700' :
                          s.status === 'REFUSED' ? 'bg-red-100 text-red-700'    :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {s.status === 'SIGNED' ? '✓ Signé' : s.status === 'REFUSED' ? '✗ Refusé' : '⌛ En attente'}
                        </span>
                      </div>
                      {s.status === 'SIGNED' && (
                        <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                          <p>⏰ {fmtDate(s.signedAt)}</p>
                          {s.signingIp && <p>🌐 IP : {s.signingIp}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Piste d'audit */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Piste d'audit</p>
                <div className="space-y-1">
                  {cert.auditTrail.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                      <span className="text-gray-400 shrink-0 font-mono">
                        {new Date(log.timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })}
                      </span>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded font-medium ${
                        log.event === 'SIGNED'    ? 'bg-green-100 text-green-700' :
                        log.event === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        log.event === 'REFUSED'   ? 'bg-red-100 text-red-700'    :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {log.event}
                      </span>
                      {log.actorName  && <span className="text-gray-600">{log.actorName}</span>}
                      {log.actorEmail && <span className="text-gray-400">{log.actorEmail}</span>}
                      {log.actorIp   && <span className="text-gray-400 font-mono">{log.actorIp}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Mention légale */}
              <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 leading-relaxed border border-gray-200">
                <p className="font-semibold text-gray-600 mb-1">⚖️ Valeur juridique</p>
                <p>{cert.legalNote}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Employment contracts section ───────────────────────────────────────────────
const EMP_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: 'CDI — Temps plein', PART_TIME: 'CDI — Temps partiel',
  CONTRACT: 'CDD', INTERN: 'Convention de stage',
}
const EMP_STATUS_BADGE: Record<EmpStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600', SIGNED: 'bg-green-100 text-green-700', TERMINATED: 'bg-red-100 text-red-600',
}
const EMP_STATUS_LABEL: Record<EmpStatus, string> = {
  DRAFT: 'Brouillon', SIGNED: 'Signé', TERMINATED: 'Résilié',
}
const fmtDateEmp = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'

function EmploymentContractsSection({ contracts }: { contracts: EmploymentContract[] }) {
  if (contracts.length === 0) return null
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/30 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-b border-blue-200">
        <span className="text-blue-600 text-sm">👤</span>
        <h2 className="text-sm font-semibold text-blue-800">Contrats de travail — Module RH</h2>
        <span className="ml-auto text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{contracts.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 uppercase tracking-wide bg-white/50 border-b border-blue-100">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Employé</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-center font-medium">Début</th>
              <th className="px-4 py-2 text-center font-medium">Fin</th>
              <th className="px-4 py-2 text-center font-medium">Signé le</th>
              <th className="px-4 py-2 text-center font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50">
            {contracts.map(c => (
              <tr key={c.id} className="hover:bg-white/60 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{c.employeeName}</p>
                  <p className="text-xs text-gray-400">{c.poste} · {c.departement}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{EMP_TYPE_LABEL[c.contractType] ?? c.contractType}</td>
                <td className="px-4 py-3 text-center text-xs text-gray-600">{fmtDateEmp(c.startDate)}</td>
                <td className="px-4 py-3 text-center text-xs text-gray-600">{fmtDateEmp(c.endDate)}</td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">{fmtDateEmp(c.signedAt)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${EMP_STATUS_BADGE[c.status]}`}>
                    {EMP_STATUS_LABEL[c.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-xs text-blue-600 bg-blue-50 border-t border-blue-100">
        Ces contrats sont gérés dans le module <strong>RH → Contrats</strong>.
      </p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ContractsPage() {
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'ALL'>('ALL')
  const [showCreate,   setShowCreate]   = useState(false)
  const [uploadModal,  setUploadModal]  = useState<LegalContract | null>(null)
  const [signModal,    setSignModal]    = useState<LegalContract | null>(null)
  const [certModal,    setCertModal]    = useState<LegalContract | null>(null)

  const contracts    = useContracts(statusFilter !== 'ALL' ? { status: statusFilter } : undefined)
  const updateCtr    = useUpdateContract()
  const deleteCtr    = useDeleteContract()
  const empCtx       = useEmploymentContracts()
  const empContracts = empCtx.contracts

  const statuses: (ContractStatus | 'ALL')[] = ['ALL', 'DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'EXPIRED', 'TERMINATED']

  const kpis = [
    { label: 'Total',      value: (contracts.data?.length ?? 0) + empContracts.length, color: 'text-gray-900' },
    { label: 'Signés',     value: (contracts.data?.filter(c => c.status === 'SIGNED').length ?? 0) + empContracts.filter(c => c.status === 'SIGNED').length, color: 'text-green-600' },
    { label: 'En attente', value: contracts.data?.filter(c => c.status === 'PENDING_SIGNATURE').length ?? 0, color: 'text-yellow-600' },
    { label: 'RH',         value: empContracts.length, color: 'text-blue-600' },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrats</h1>
          <p className="text-sm text-gray-500">Gestion des contrats · Signature électronique AES</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Nouveau contrat
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Employment contracts */}
      <EmploymentContractsSection contracts={empContracts} />

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {s === 'ALL' ? 'Tous' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        {contracts.isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : contracts.data?.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-4xl mb-2">📄</p>
            <p>Aucun contrat. Créez-en un ou importez un document.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Document</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Signatures</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Expiration</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contracts.data?.map(c => {
                const expSoon = c.expiresAt && new Date(c.expiresAt) < new Date(Date.now() + 30 * 86_400_000)
                const allSigned = c.signatures?.length > 0 && c.signatures.every(s => s.status === 'SIGNED')
                const pendingSigs = c.signatures?.filter(s => s.status === 'PENDING').length ?? 0
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span className="text-lg mt-0.5">{c.fileName ? '📄' : '📝'}</span>
                        <div>
                          <p className="font-medium text-gray-900">{c.title}</p>
                          {c.fileName && (
                            <p className="text-xs text-blue-600">🔒 {c.fileName}</p>
                          )}
                          {(c._count?.alerts ?? c._count?.legalAlerts ?? 0) > 0 && (
                            <span className="text-xs text-red-500">
                              {c._count?.alerts ?? c._count?.legalAlerts} alerte(s)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{TYPE_LABEL[c.type]}</td>
                    <td className="px-4 py-3">
                      {c.signatures && c.signatures.length > 0 ? (
                        <div className="flex items-center gap-1">
                          {c.signatures.map((s, i) => (
                            <span key={i} title={`${s.signerName} · ${s.status}`}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                                s.status === 'SIGNED'  ? 'bg-green-100 border-green-300 text-green-700' :
                                s.status === 'REFUSED' ? 'bg-red-100 border-red-300 text-red-700'       :
                                'bg-yellow-100 border-yellow-300 text-yellow-700'
                              }`}>
                              {s.status === 'SIGNED' ? '✓' : s.status === 'REFUSED' ? '✗' : s.signingOrder}
                            </span>
                          ))}
                          {pendingSigs > 0 && (
                            <span className="text-xs text-yellow-600 ml-1">{pendingSigs} en attente</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.expiresAt ? (
                        <span className={`text-xs ${expSoon ? 'font-medium text-red-600' : 'text-gray-500'}`}>
                          {expSoon ? '⚠ ' : ''}{new Date(c.expiresAt).toLocaleDateString('fr-FR')}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {/* Import document */}
                        <button onClick={() => setUploadModal(c)}
                          title="Importer un document PDF"
                          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                            c.fileName
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-500 hover:bg-gray-100'
                          }`}>
                          {c.fileName ? '📄' : '📎'} {c.fileName ? 'Doc.' : 'Importer'}
                        </button>

                        {/* Envoyer pour signature */}
                        {c.status !== 'TERMINATED' && c.status !== 'EXPIRED' && (
                          <button onClick={() => setSignModal(c)}
                            className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
                            ✍️ Signer
                          </button>
                        )}

                        {/* Certificat */}
                        {(c.status === 'SIGNED' || allSigned) && (
                          <button onClick={() => setCertModal(c)}
                            className="rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50">
                            📜 Cert.
                          </button>
                        )}

                        {/* Résilier */}
                        {c.status === 'SIGNED' && (
                          <button
                            onClick={() => updateCtr.mutate({ id: c.id, dto: { status: 'TERMINATED' } })}
                            className="rounded px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50">
                            Résilier
                          </button>
                        )}

                        {/* Supprimer */}
                        <button
                          onClick={() => { if (confirm('Supprimer ce contrat ?')) deleteCtr.mutate(c.id) }}
                          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                          Suppr.
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Badge conformité */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="w-2 h-2 bg-green-500 rounded-full" />
        Signature électronique avancée (AES) · Conforme OHADA 2010 · Loi Cameroun 2010/021 · UEMOA ASA.20110
      </div>

      {/* Modals */}
      {showCreate   && <CreateModal onClose={() => setShowCreate(false)} />}
      {uploadModal  && <UploadModal  contract={uploadModal}  onClose={() => setUploadModal(null)}  />}
      {signModal    && <SignatureModal contract={signModal}   onClose={() => setSignModal(null)}    />}
      {certModal    && <CertificateModal contract={certModal} onClose={() => setCertModal(null)}   />}
    </div>
  )
}
