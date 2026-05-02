import { useState } from 'react'
import { mailApi } from '@/services/mailApi'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SendEmailModalProps {
  open:         boolean
  onClose:      () => void
  /** Adresse e-mail pré-remplie (modifiable par l'utilisateur) */
  to:           string
  /** Objet pré-rempli (modifiable) */
  subject:      string
  /** Corps HTML de l'e-mail généré automatiquement */
  bodyHtml:     string
  /** Référence du document (ex : FAV-0011, BL-0008) */
  documentRef:  string
  /** Type lisible (ex : 'Facture', 'Bon de livraison') */
  documentType: string
  /** Nom du client destinataire */
  clientName:   string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SendEmailModal({
  open,
  onClose,
  to: initialTo,
  subject: initialSubject,
  bodyHtml,
  documentRef,
  documentType,
  clientName,
}: SendEmailModalProps) {
  const [to,      setTo]      = useState(initialTo)
  const [subject, setSubject] = useState(initialSubject)
  const [message, setMessage] = useState('')
  const [status,  setStatus]  = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [error,   setError]   = useState('')

  if (!open) return null

  async function handleSend() {
    if (!to.trim()) { setError("L'adresse e-mail du destinataire est requise."); return }
    setError('')
    setStatus('sending')
    try {
      // Ajouter le message personnalisé au corps HTML si renseigné
      const finalHtml = message.trim()
        ? bodyHtml.replace(
            '<!--CUSTOM_MESSAGE-->',
            `<div style="margin:16px 0;padding:14px 18px;background:#f0fdf4;border-left:3px solid #16a34a;border-radius:6px;font-size:14px;color:#166534">
              ${message.trim().replace(/\n/g, '<br>')}
            </div>`
          )
        : bodyHtml.replace('<!--CUSTOM_MESSAGE-->', '')

      await mailApi.sendDocument({ to: to.trim(), subject: subject.trim(), html: finalHtml })
      setStatus('success')
    } catch {
      setStatus('error')
      setError("L'envoi a échoué. Vérifiez la configuration SMTP ou réessayez.")
    }
  }

  function handleClose() {
    setStatus('idle')
    setError('')
    setMessage('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              ✉️ Envoyer par e-mail
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {documentType} <span className="font-mono">{documentRef}</span> — {clientName}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {status === 'success' ? (
          <div className="px-6 py-10 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-gray-800">E-mail envoyé avec succès</p>
            <p className="text-sm text-gray-500 mt-1">Le document a été transmis à <strong>{to}</strong>.</p>
            <button
              onClick={handleClose}
              className="mt-6 rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {/* À */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Destinataire</label>
              <input
                type="email"
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="client@exemple.cm"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>

            {/* Objet */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Objet</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>

            {/* Message personnalisé */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Message additionnel <span className="font-normal text-gray-400">(optionnel)</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                placeholder="Bonjour, veuillez trouver ci-joint votre document…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
              />
            </div>

            {/* Aperçu */}
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              📎 Le document {documentType.toLowerCase()} <strong className="font-mono">{documentRef}</strong> sera inclus dans le corps de l'e-mail.
            </p>

            {/* Erreur */}
            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>
        )}

        {/* Footer */}
        {status !== 'success' && (
          <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              onClick={handleClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSend}
              disabled={status === 'sending'}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {status === 'sending' ? 'Envoi…' : '✉️ Envoyer'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
