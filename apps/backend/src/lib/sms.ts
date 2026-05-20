/**
 * Abstraction SMS — supporte Twilio, Africa's Talking, Vonage, ou aucun.
 *
 * Activation via variables d'environnement :
 *   SMS_PROVIDER=twilio
 *     TWILIO_ACCOUNT_SID=ACxxx
 *     TWILIO_AUTH_TOKEN=xxx
 *     TWILIO_FROM=+12025551234     (numéro Twilio acheté)
 *
 *   SMS_PROVIDER=africastalking
 *     AT_USERNAME=sandbox            (ou nom de l'app prod)
 *     AT_API_KEY=xxx
 *     AT_FROM=AthenisCM              (sender ID, doit être pré-approuvé)
 *
 *   SMS_PROVIDER=vonage
 *     VONAGE_API_KEY=xxx
 *     VONAGE_API_SECRET=xxx
 *     VONAGE_FROM=Athenis            (sender ID alphanumérique)
 *
 * Si SMS_PROVIDER n'est pas défini ou vaut 'none', les SMS sont
 * logués en console (mode dev / phase de test).
 */
import { logger } from './logger.js'

export interface SmsSendResult {
  success:   boolean
  messageId: string | null
  error?:    string
  provider?: string
}

export interface SmsProvider {
  name: string
  configured: boolean
  send: (to: string, message: string) => Promise<SmsSendResult>
}

// ── Provider : console (dev / pas configuré) ─────────────────────────────────

const consoleProvider: SmsProvider = {
  name:       'console',
  configured: false,
  async send(to, message) {
    logger.info('📱 [SMS — not sent, no provider configured]', { to, message })
    return { success: true, messageId: 'console-' + Date.now(), provider: 'console' }
  },
}

// ── Provider : Twilio ────────────────────────────────────────────────────────

function twilioProvider(): SmsProvider | null {
  const sid   = process.env['TWILIO_ACCOUNT_SID']
  const token = process.env['TWILIO_AUTH_TOKEN']
  const from  = process.env['TWILIO_FROM']
  if (!sid || !token || !from) return null

  return {
    name:       'twilio',
    configured: true,
    async send(to, body) {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
      const params = new URLSearchParams({ To: to, From: from, Body: body })
      const auth = Buffer.from(`${sid}:${token}`).toString('base64')
      try {
        const res = await fetch(url, {
          method:  'POST',
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    params.toString(),
        })
        const data = await res.json() as { sid?: string; message?: string; code?: number }
        if (!res.ok) {
          logger.error('Twilio SMS failed', { status: res.status, code: data.code, message: data.message })
          return { success: false, messageId: null, provider: 'twilio', error: data.message ?? `HTTP ${res.status}` }
        }
        return { success: true, messageId: data.sid ?? null, provider: 'twilio' }
      } catch (e) {
        logger.error('Twilio SMS network error', { error: e })
        return { success: false, messageId: null, provider: 'twilio', error: 'Network error' }
      }
    },
  }
}

// ── Provider : Africa's Talking ──────────────────────────────────────────────

function africasTalkingProvider(): SmsProvider | null {
  const username = process.env['AT_USERNAME']
  const apiKey   = process.env['AT_API_KEY']
  const from     = process.env['AT_FROM']
  if (!username || !apiKey) return null

  return {
    name:       'africastalking',
    configured: true,
    async send(to, body) {
      const url = username === 'sandbox'
        ? 'https://api.sandbox.africastalking.com/version1/messaging'
        : 'https://api.africastalking.com/version1/messaging'

      const params = new URLSearchParams({ username, to, message: body })
      if (from) params.set('from', from)

      try {
        const res = await fetch(url, {
          method:  'POST',
          headers: { apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    params.toString(),
        })
        const data = await res.json() as { SMSMessageData?: { Recipients?: Array<{ status?: string; messageId?: string }> } }
        const recipient = data.SMSMessageData?.Recipients?.[0]
        if (!res.ok || recipient?.status !== 'Success') {
          const status = recipient?.status ?? `HTTP ${res.status}`
          logger.error("Africa's Talking SMS failed", { status })
          return { success: false, messageId: null, provider: 'africastalking', error: status }
        }
        return { success: true, messageId: recipient.messageId ?? null, provider: 'africastalking' }
      } catch (e) {
        logger.error("Africa's Talking SMS network error", { error: e })
        return { success: false, messageId: null, provider: 'africastalking', error: 'Network error' }
      }
    },
  }
}

// ── Provider : Vonage / Nexmo ────────────────────────────────────────────────

function vonageProvider(): SmsProvider | null {
  const apiKey    = process.env['VONAGE_API_KEY']
  const apiSecret = process.env['VONAGE_API_SECRET']
  const from      = process.env['VONAGE_FROM'] ?? 'Athenis'
  if (!apiKey || !apiSecret) return null

  return {
    name:       'vonage',
    configured: true,
    async send(to, text) {
      const url    = 'https://rest.nexmo.com/sms/json'
      const params = new URLSearchParams({ api_key: apiKey, api_secret: apiSecret, to, from, text })
      try {
        const res = await fetch(url, {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    params.toString(),
        })
        const data = await res.json() as { messages?: Array<{ status?: string; 'message-id'?: string; 'error-text'?: string }> }
        const msg = data.messages?.[0]
        if (msg?.status !== '0') {
          logger.error('Vonage SMS failed', { status: msg?.status, error: msg?.['error-text'] })
          return { success: false, messageId: null, provider: 'vonage', error: msg?.['error-text'] ?? `status ${msg?.status}` }
        }
        return { success: true, messageId: msg['message-id'] ?? null, provider: 'vonage' }
      } catch (e) {
        logger.error('Vonage SMS network error', { error: e })
        return { success: false, messageId: null, provider: 'vonage', error: 'Network error' }
      }
    },
  }
}

// ── Sélection du provider actif ──────────────────────────────────────────────

function pickProvider(): SmsProvider {
  const requested = (process.env['SMS_PROVIDER'] ?? '').toLowerCase()
  switch (requested) {
    case 'twilio':         return twilioProvider()         ?? consoleProvider
    case 'africastalking':
    case 'at':             return africasTalkingProvider() ?? consoleProvider
    case 'vonage':
    case 'nexmo':          return vonageProvider()         ?? consoleProvider
    default:               return consoleProvider
  }
}

const provider = pickProvider()

// ── API publique ─────────────────────────────────────────────────────────────

export async function sendSms(to: string, message: string): Promise<SmsSendResult> {
  // Validation E.164 basique
  if (!/^\+\d{8,15}$/.test(to)) {
    logger.warn('sendSms: invalid phone format (expected E.164)', { to })
    return { success: false, messageId: null, error: 'INVALID_PHONE_FORMAT' }
  }
  return provider.send(to, message)
}

export function isSmsConfigured(): boolean {
  return provider.configured
}

export function smsProviderName(): string {
  return provider.name
}
