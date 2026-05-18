import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { logger } from './logger.js'

// V13 : helper d'échappement HTML pour les variables interpolées dans les
//       templates d'email. Empêche un user d'injecter du HTML dans un nom
//       de signataire / titre de contrat → phishing avec réputation SPF/DKIM
//       du domaine Athenis.
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Transporter ───────────────────────────────────────────────────────────────

function createTransporter() {
  if (!env.smtpHost) return null

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
  })
}

const transporter = createTransporter()

// ── Send helpers ──────────────────────────────────────────────────────────────

interface MailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendMail(opts: MailOptions): Promise<void> {
  if (!transporter) {
    // Dev mode: log to console instead of sending
    logger.info('📧 [EMAIL — not sent, no SMTP configured]', {
      to: opts.to,
      subject: opts.subject,
      text: opts.text ?? opts.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    })
    return
  }

  await transporter.sendMail({ from: env.smtpFrom, ...opts })
}

// ── Email templates ───────────────────────────────────────────────────────────

export async function sendCabinetInvitationEmail(
  to: string,
  opts: { cabinetName: string; companyName: string; type: string; token: string; expiresAt: Date },
): Promise<void> {
  const url    = `${env.frontendUrl}/invitation/cabinet?token=${opts.token}`
  const expire = opts.expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const typeLabels: Record<string, string> = {
    COMPLET:      'Mission complète',
    COMPTABILITE: 'Comptabilité',
    GESTION:      'Gestion',
    FISCAL:       'Fiscalité',
    DECLARATIONS: 'Déclarations',
    PARTIEL:      'Mission partielle',
  }
  const typeLabel = typeLabels[opts.type] ?? opts.type
  // V13 : échappement HTML des variables interpolées
  const safeCabinet  = escapeHtml(opts.cabinetName)
  const safeCompany2 = escapeHtml(opts.companyName)
  const safeType     = escapeHtml(typeLabel)
  const safeUrl2     = escapeHtml(url)
  const safeExpire2  = escapeHtml(expire)

  await sendMail({
    to,
    subject: `${opts.cabinetName} souhaite gérer votre comptabilité — Athenis`,
    text: `Bonjour,\n\nLe cabinet ${opts.cabinetName} vous invite à lui confier la gestion de ${opts.companyName} sur Athenis.\n\nType de mission : ${typeLabel}\n\nAcceptez ou refusez cette invitation en cliquant sur le lien suivant (valable jusqu'au ${expire}) :\n${url}\n\nSi vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail.`,
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <tr><td style="background:#1a3a2a;padding:32px 40px;text-align:center">
          <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-.5px">Athenis</span>
        </td></tr>
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 8px;font-size:20px;color:#111827">Invitation d'un cabinet comptable</h1>
          <p style="margin:0 0 24px;color:#6b7280;line-height:1.6">
            Le cabinet <strong style="color:#111827">${safeCabinet}</strong> souhaite gérer la comptabilité de
            <strong style="color:#111827">${safeCompany2}</strong> sur Athenis.
          </p>

          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:28px">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">Type de mission</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#111827">${safeType}</p>
          </div>

          <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6">
            Consultez les détails de cette invitation et acceptez-la ou refusez-la en cliquant sur le bouton ci-dessous.
            Cette invitation expire le <strong>${safeExpire2}</strong>.
          </p>

          <div style="text-align:center;margin:32px 0">
            <a href="${safeUrl2}" style="display:inline-block;background:#1a3a2a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px">
              Voir l'invitation
            </a>
          </div>

          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px">
            Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail en toute sécurité.<br>
            Lien : <a href="${safeUrl2}" style="color:#1a3a2a">${safeUrl2}</a>
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;color:#9ca3af;font-size:12px">© ${new Date().getFullYear()} Athenis. Tous droits réservés.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

// ── Signature électronique ────────────────────────────────────────────────────

export async function sendSignatureRequestEmail(
  to: string,
  opts: {
    signerName:    string
    contractTitle: string
    companyName:   string
    signUrl:       string
    expiresAt?:    Date
  },
): Promise<void> {
  const expire = opts.expiresAt
    ? opts.expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  // V13 : pré-échappement HTML des variables interpolées. Le `subject` et le
  //       `text` n'ont pas besoin d'escape (envoyés en texte brut), seul le
  //       template HTML en a besoin.
  const safeName     = escapeHtml(opts.signerName)
  const safeTitle    = escapeHtml(opts.contractTitle)
  const safeCompany  = escapeHtml(opts.companyName)
  const safeUrl      = escapeHtml(opts.signUrl)
  const safeExpire   = expire ? escapeHtml(expire) : null

  await sendMail({
    to,
    subject: `Action requise : signature du document "${opts.contractTitle}" — ${opts.companyName}`,
    text: [
      `Bonjour ${opts.signerName},`,
      '',
      `${opts.companyName} vous invite à signer le document suivant de façon électronique :`,
      `« ${opts.contractTitle} »`,
      '',
      `Cliquez sur le lien ci-dessous pour parcourir le document et apposer votre signature :`,
      opts.signUrl,
      '',
      expire ? `Ce lien est valable jusqu'au ${expire}.` : '',
      '',
      'Aucun compte Athenis n\'est requis pour signer.',
      '',
      'Si vous n\'êtes pas concerné par ce document, ignorez cet e-mail.',
    ].filter(l => l !== undefined).join('\n'),
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">

        <!-- Header -->
        <tr><td style="background:#1a3a2a;padding:32px 40px;text-align:center">
          <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-.5px">Athenis</span>
          <p style="color:#86efac;margin:6px 0 0;font-size:13px">Signature électronique sécurisée</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px">
          <p style="margin:0 0 6px;color:#6b7280;font-size:14px">Bonjour <strong style="color:#111827">${safeName}</strong>,</p>
          <h1 style="margin:0 0 20px;font-size:20px;color:#111827;line-height:1.3">
            Vous avez un document à signer
          </h1>

          <!-- Document card -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 24px;margin-bottom:28px">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#16a34a">Document</p>
            <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:#111827">« ${safeTitle} »</p>
            <p style="margin:0;font-size:13px;color:#374151">Envoyé par <strong>${safeCompany}</strong></p>
          </div>

          <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6">
            Cliquez sur le bouton ci-dessous pour consulter le document et apposer votre signature électronique.
            ${safeExpire ? `<br>Ce lien est valable jusqu'au <strong>${safeExpire}</strong>.` : ''}
          </p>

          <!-- CTA -->
          <div style="text-align:center;margin:32px 0">
            <a href="${safeUrl}"
               style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:700;font-size:16px;letter-spacing:.01em">
              ✍️ Signer le document
            </a>
          </div>

          <!-- Security note -->
          <div style="background:#f9fafb;border-left:3px solid #d1fae5;padding:12px 16px;margin:24px 0;border-radius:0 6px 6px 0">
            <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5">
              🔒 <strong>Signature électronique avancée (AES)</strong> — Ce processus est conforme aux dispositions
              de l'Acte Uniforme OHADA sur le Droit Commercial Général (2010) et à la Loi n°2010/021 du Cameroun
              relative au commerce électronique. Votre adresse IP et la date/heure de signature seront enregistrées.
            </p>
          </div>

          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px">
            Aucun compte n'est requis pour signer. Si vous n'êtes pas concerné, ignorez cet e-mail.<br>
            Lien direct : <a href="${safeUrl}" style="color:#15803d;word-break:break-all">${safeUrl}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;color:#9ca3af;font-size:12px">
            © ${new Date().getFullYear()} Athenis · Plateforme de gestion d'entreprise · Signature électronique sécurisée
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendSignatureCompletedEmail(
  to: string,
  opts: { companyName: string; contractTitle: string; certificateUrl: string },
): Promise<void> {
  // V13 : échappement HTML
  const safeTitle = escapeHtml(opts.contractTitle)
  const safeCertUrl = escapeHtml(opts.certificateUrl)
  await sendMail({
    to,
    subject: `✅ Document signé : "${opts.contractTitle}" — ${opts.companyName}`,
    text: `Bonjour,\n\nTous les signataires ont complété la signature du document "${opts.contractTitle}".\n\nTéléchargez le certificat de réalisation ici :\n${opts.certificateUrl}\n\nCordialement,\nAthenis`,
    html: `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <tr><td style="background:#15803d;padding:32px 40px;text-align:center">
          <span style="color:#fff;font-size:22px;font-weight:700">Athenis</span>
          <p style="color:#bbf7d0;margin:6px 0 0;font-size:13px">✅ Document entièrement signé</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 16px;font-size:20px;color:#111827">Signature complète !</h1>
          <p style="color:#6b7280;font-size:14px;line-height:1.6">
            Le document <strong>« ${safeTitle} »</strong> a été signé par tous les signataires.
          </p>
          <div style="text-align:center;margin:32px 0">
            <a href="${safeCertUrl}"
               style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600">
              📄 Télécharger le certificat
            </a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  })
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${env.frontendUrl}/auth/verify-email?token=${token}`
  const safeUrl3 = escapeHtml(url)

  await sendMail({
    to,
    subject: 'Confirmez votre adresse e-mail — Athenis',
    text: `Bienvenue sur Athenis !\n\nCliquez sur ce lien pour confirmer votre adresse e-mail :\n${url}\n\nCe lien est valable 24 heures.\n\nSi vous n'avez pas créé de compte, ignorez cet e-mail.`,
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <!-- Header -->
        <tr><td style="background:#1a3a2a;padding:32px 40px;text-align:center">
          <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-.5px">Athenis</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 12px;font-size:20px;color:#111827">Confirmez votre adresse e-mail</h1>
          <p style="margin:0 0 24px;color:#6b7280;line-height:1.6">
            Bienvenue ! Pour terminer la création de votre compte, veuillez confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous.
          </p>
          <div style="text-align:center;margin:32px 0">
            <a href="${safeUrl3}" style="display:inline-block;background:#1a3a2a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px">
              Confirmer mon adresse e-mail
            </a>
          </div>
          <p style="margin:0 0 8px;color:#9ca3af;font-size:13px">
            Ce lien est valable <strong>24 heures</strong>. Si vous n'avez pas créé de compte sur Athenis, ignorez cet e-mail.
          </p>
          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;word-break:break-all">
            Lien : <a href="${safeUrl3}" style="color:#1a3a2a">${safeUrl3}</a>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;color:#9ca3af;font-size:12px">© ${new Date().getFullYear()} Athenis. Tous droits réservés.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
