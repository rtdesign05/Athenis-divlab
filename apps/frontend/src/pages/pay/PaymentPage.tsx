/**
 * Page de paiement publique (pas d'auth requise)
 * URL : /pay/:token  où token = base64url(JSON)
 *
 * Méthodes supportées :
 *   - Carte bancaire (Visa / Mastercard)
 *   - MTN Mobile Money
 *   - Orange Money
 */

import { useState } from 'react'
import { useParams } from 'react-router-dom'

// ── Token ─────────────────────────────────────────────────────────────────────

export interface PaymentToken {
  ref:       string   // FAV-0011
  amountTTC: number   // montant en XAF
  currency:  string   // XAF
  client:    string   // ACME Corp
  company:   string   // Société Athenis
  desc:      string   // description courte
  dueDate:   string   // ISO date
}

export function encodePaymentToken(data: PaymentToken): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function decodePaymentToken(token: string): PaymentToken | null {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/') +
      '=='.slice(0, (4 - token.length % 4) % 4)
    return JSON.parse(decodeURIComponent(escape(atob(padded)))) as PaymentToken
  } catch { return null }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtXAF(n: number): string {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(n)
}

function fmtPhone(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 9)
}

function maskCard(n: string): string {
  return n.replace(/\D/g, '').slice(0, 16)
    .replace(/(.{4})/g, '$1 ').trim()
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Method  = 'card' | 'mtn' | 'orange'
type Step    = 'choose' | 'fill' | 'processing' | 'success' | 'error'

// ── Component ─────────────────────────────────────────────────────────────────

export function PaymentPage() {
  const { token } = useParams<{ token: string }>()
  const data = token ? decodePaymentToken(token) : null

  const [method,  setMethod]  = useState<Method>('card')
  const [step,    setStep]    = useState<Step>('choose')

  // Card fields
  const [cardNum,    setCardNum]    = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv,    setCardCvv]    = useState('')
  const [cardName,   setCardName]   = useState('')

  // Mobile money fields
  const [phone, setPhone] = useState('')
  const [otp,   setOtp]   = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const [errorMsg, setErrorMsg] = useState('')

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Lien invalide</h2>
          <p className="text-sm text-gray-500">Ce lien de paiement est invalide ou expiré. Contactez l'émetteur de la facture.</p>
        </div>
      </div>
    )
  }

  // ── Submit handler ─────────────────────────────────────────────────────────

  function handlePay() {
    setErrorMsg('')

    if (method === 'card') {
      if (cardNum.replace(/\s/g, '').length < 16) { setErrorMsg('Numéro de carte invalide.'); return }
      if (cardExpiry.length < 5)                   { setErrorMsg('Date d\'expiration invalide.'); return }
      if (cardCvv.length < 3)                      { setErrorMsg('Code CVV invalide.'); return }
      if (!cardName.trim())                         { setErrorMsg('Nom du titulaire requis.'); return }
    } else {
      if (!otpSent)                       { setErrorMsg('Envoyez d\'abord le code de confirmation.'); return }
      if (otp.replace(/\D/g, '').length < 4) { setErrorMsg('Code de confirmation invalide.'); return }
    }

    setStep('processing')
    setTimeout(() => setStep('success'), 2800)
  }

  function handleSendOtp() {
    if (phone.length < 9) { setErrorMsg('Numéro de téléphone invalide (9 chiffres requis).'); return }
    setErrorMsg('')
    setOtpSent(true)
  }

  // ── Expiry auto-formatting ─────────────────────────────────────────────────

  function handleExpiry(v: string) {
    const digits = v.replace(/\D/g, '').slice(0, 4)
    if (digits.length >= 3) setCardExpiry(digits.slice(0, 2) + '/' + digits.slice(2))
    else setCardExpiry(digits)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex flex-col items-center justify-center p-4">

      {/* ── Header logo ─────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-[#1a3a2a] flex items-center justify-center">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <span className="font-bold text-lg text-gray-800">Athenis</span>
      </div>

      <div className="w-full max-w-md">

        {/* ── Invoice summary card ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">
                Facture à régler
              </p>
              <p className="text-base font-bold text-gray-900">{data.company}</p>
              <p className="text-sm text-gray-500">Client : {data.client}</p>
              <p className="text-xs text-gray-400 mt-0.5">Réf. <span className="font-mono">{data.ref}</span> — échéance {new Date(data.dueDate).toLocaleDateString('fr-FR')}</p>
              {data.desc && <p className="text-xs text-gray-500 mt-1 italic">{data.desc}</p>}
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-2xl font-bold text-gray-900">{fmtXAF(data.amountTTC)}</p>
              <p className="text-xs text-gray-400">{data.currency}</p>
            </div>
          </div>
        </div>

        {/* ── Main card ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

          {/* SUCCESS */}
          {step === 'success' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Paiement effectué !</h2>
              <p className="text-sm text-gray-600 mb-1">
                {fmtXAF(data.amountTTC)} ont été débités avec succès.
              </p>
              <p className="text-xs text-gray-400 mb-6">
                Référence de transaction : <span className="font-mono">{data.ref}-{Date.now().toString(36).toUpperCase()}</span>
              </p>
              <div className="rounded-xl bg-green-50 border border-green-100 p-4 text-left text-sm text-green-800">
                <p className="font-semibold mb-1">Récapitulatif</p>
                <p>Montant : <strong>{fmtXAF(data.amountTTC)}</strong></p>
                <p>Facture : <strong className="font-mono">{data.ref}</strong></p>
                <p>Client : {data.client}</p>
                <p>Méthode : {method === 'card' ? 'Carte bancaire' : method === 'mtn' ? 'MTN Mobile Money' : 'Orange Money'}</p>
              </div>
              <p className="text-xs text-gray-400 mt-4">Un reçu sera envoyé par e-mail.</p>
            </div>
          )}

          {/* PROCESSING */}
          {step === 'processing' && (
            <div className="text-center py-10">
              <div className="inline-block w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-6"></div>
              <p className="font-semibold text-gray-800">Traitement en cours…</p>
              <p className="text-sm text-gray-500 mt-1">Veuillez patienter, ne fermez pas cette page.</p>
            </div>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">❌</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Paiement refusé</h2>
              <p className="text-sm text-gray-500 mb-4">Votre paiement n'a pas pu être traité. Vérifiez vos informations et réessayez.</p>
              <button onClick={() => setStep('fill')} className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700">
                Réessayer
              </button>
            </div>
          )}

          {/* CHOOSE METHOD */}
          {(step === 'choose' || step === 'fill') && (
            <>
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                {step === 'choose' ? 'Choisissez votre moyen de paiement' : 'Informations de paiement'}
              </h2>

              {/* Method selector */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {([
                  { id: 'card',   label: 'Carte bancaire', icon: '💳',  color: 'border-blue-200 bg-blue-50 text-blue-700' },
                  { id: 'mtn',    label: 'MTN MoMo',       icon: '📱',  color: 'border-yellow-200 bg-yellow-50 text-yellow-700' },
                  { id: 'orange', label: 'Orange Money',   icon: '🟠',  color: 'border-orange-200 bg-orange-50 text-orange-700' },
                ] as const).map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setMethod(m.id); setStep('fill'); setErrorMsg(''); setOtpSent(false); setOtp('') }}
                    className={`rounded-xl border-2 p-3 text-center transition-all ${
                      method === m.id && step === 'fill'
                        ? m.color + ' border-current shadow-sm'
                        : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    <div className="text-2xl mb-1">{m.icon}</div>
                    <div className="text-[11px] font-semibold leading-tight">{m.label}</div>
                  </button>
                ))}
              </div>

              {/* ── Card form ─────────────────────────────────────────────── */}
              {step === 'fill' && method === 'card' && (
                <div className="space-y-3">
                  {/* Visual card */}
                  <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-5 text-white shadow-lg mb-4 select-none">
                    <div className="flex justify-between items-start mb-8">
                      <span className="text-xs font-medium opacity-60">CARTE BANCAIRE</span>
                      <span className="text-lg">{cardNum.startsWith('5') ? '🟡' : cardNum.startsWith('4') ? '🔵' : '💳'}</span>
                    </div>
                    <p className="font-mono text-lg tracking-widest mb-3">
                      {cardNum || '•••• •••• •••• ••••'}
                    </p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] opacity-50 uppercase">Titulaire</p>
                        <p className="text-sm font-medium">{cardName || 'VOTRE NOM'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] opacity-50 uppercase">Expiration</p>
                        <p className="text-sm font-medium">{cardExpiry || 'MM/AA'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Numéro de carte</label>
                    <input
                      type="text" inputMode="numeric" placeholder="1234 5678 9012 3456"
                      value={cardNum} onChange={e => setCardNum(maskCard(e.target.value))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Expiration</label>
                      <input
                        type="text" inputMode="numeric" placeholder="MM/AA" maxLength={5}
                        value={cardExpiry} onChange={e => handleExpiry(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">CVV</label>
                      <input
                        type="password" inputMode="numeric" placeholder="•••" maxLength={4}
                        value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nom du titulaire</label>
                    <input
                      type="text" placeholder="JEAN DUPONT"
                      value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-green-500/30"
                    />
                  </div>
                </div>
              )}

              {/* ── Mobile Money form ─────────────────────────────────────── */}
              {step === 'fill' && (method === 'mtn' || method === 'orange') && (
                <div className="space-y-3">
                  <div className={`rounded-2xl p-4 flex items-center gap-3 mb-2 ${
                    method === 'mtn' ? 'bg-yellow-50 border border-yellow-100' : 'bg-orange-50 border border-orange-100'
                  }`}>
                    <span className="text-3xl">{method === 'mtn' ? '📱' : '🟠'}</span>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {method === 'mtn' ? 'MTN Mobile Money' : 'Orange Money'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {method === 'mtn'
                          ? 'Numéros MTN : 670, 671, 672, 673, 674, 676, 677, 678, 679'
                          : 'Numéros Orange : 655, 656, 657, 658, 659, 690, 692, 694, 695, 698, 699'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Numéro de téléphone</label>
                    <div className="flex gap-2">
                      <span className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 shrink-0">
                        🇨🇲 +237
                      </span>
                      <input
                        type="tel" inputMode="numeric" placeholder="6XX XXX XXX"
                        value={phone} onChange={e => setPhone(fmtPhone(e.target.value))}
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30"
                      />
                    </div>
                  </div>

                  {!otpSent ? (
                    <button
                      onClick={handleSendOtp}
                      className={`w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors ${
                        method === 'mtn' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-orange-500 hover:bg-orange-600'
                      }`}
                    >
                      Recevoir le code par SMS
                    </button>
                  ) : (
                    <>
                      <div className={`rounded-xl p-3 text-xs text-center ${
                        method === 'mtn' ? 'bg-yellow-50 text-yellow-800' : 'bg-orange-50 text-orange-800'
                      }`}>
                        ✅ Code envoyé au +237 {phone} — Vérifiez vos messages
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Code de confirmation</label>
                        <input
                          type="text" inputMode="numeric" placeholder="• • • •" maxLength={6}
                          value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-green-500/30"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Error ──────────────────────────────────────────────────── */}
              {errorMsg && (
                <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-xs text-red-600">{errorMsg}</p>
              )}

              {/* ── CTA ────────────────────────────────────────────────────── */}
              {step === 'fill' && (
                <button
                  onClick={handlePay}
                  className="mt-5 w-full rounded-xl bg-[#1a3a2a] py-3.5 text-sm font-bold text-white hover:bg-[#234d39] transition-colors shadow-md"
                >
                  💳 Payer {fmtXAF(data.amountTTC)}
                </button>
              )}

              {/* ── Security badges ─────────────────────────────────────────── */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
                <span>🔒 Paiement sécurisé SSL</span>
                <span>•</span>
                <span>🛡️ Données chiffrées</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Propulsé par <strong>Athenis</strong> — Paiement sécurisé
        </p>
      </div>
    </div>
  )
}
