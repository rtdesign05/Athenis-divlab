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
  // Garde-fou : nodemailer renvoie "No recipients defined" si `to` est falsy,
  // ce qui rend l'erreur Sentry illisible. On valide ici avec contexte pour
  // identifier la source.
  const recipient = (opts.to ?? '').trim()
  if (!recipient) {
    logger.warn('[email] sendMail called with empty recipient — skipped', {
      subject: opts.subject,
      hasText: !!opts.text,
      htmlLen: opts.html.length,
    })
    return
  }
  // Validation basique du format (évite que des données corrompues — ex: nom
  // d'utilisateur dans `to` au lieu de email — atteignent SMTP)
  if (!recipient.includes('@')) {
    logger.warn('[email] sendMail called with invalid recipient — skipped', {
      to: recipient,
      subject: opts.subject,
    })
    return
  }

  if (!transporter) {
    // Dev mode: log to console instead of sending
    logger.info('📧 [EMAIL — not sent, no SMTP configured]', {
      to: recipient,
      subject: opts.subject,
      text: opts.text ?? opts.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    })
    return
  }

  await transporter.sendMail({ from: env.smtpFrom, ...opts, to: recipient })
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

// ── Invitation user (chef d'agence, comptable interne, etc.) ─────────────────

export async function sendUserInvitationEmail(
  to: string,
  opts: {
    token:        string
    companyName:  string
    inviterName?: string
    roleName?:    string
    agenceNames?: string[]
    expiresAt:    Date
  },
): Promise<void> {
  const url    = `${env.frontendUrl}/invitation/user?token=${opts.token}`
  const expire = opts.expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const safeCompany   = escapeHtml(opts.companyName)
  const safeUrl       = escapeHtml(url)
  const safeExpire    = escapeHtml(expire)
  const safeInviter   = opts.inviterName ? escapeHtml(opts.inviterName) : null
  const safeRole      = opts.roleName    ? escapeHtml(opts.roleName)    : null
  const agenceText    = opts.agenceNames && opts.agenceNames.length > 0
    ? opts.agenceNames.map(escapeHtml).join(', ')
    : null

  const roleLine = safeRole
    ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-bottom:12px"><p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">Rôle</p><p style="margin:0;font-size:14px;font-weight:600;color:#111827">${safeRole}</p></div>`
    : ''
  const agenceLine = agenceText
    ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-bottom:24px"><p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">Agence(s) attribuée(s)</p><p style="margin:0;font-size:14px;font-weight:600;color:#111827">${agenceText}</p></div>`
    : ''

  const inviterIntro = safeInviter
    ? `${safeInviter} vous invite à rejoindre`
    : 'Vous avez été invité(e) à rejoindre'

  await sendMail({
    to,
    subject: `Vous êtes invité(e) à rejoindre ${opts.companyName} sur Athenis`,
    text: `Bonjour,\n\n${opts.inviterName ?? "Un administrateur"} vous invite à rejoindre l'entreprise ${opts.companyName} sur Athenis.\n${opts.roleName ? `Rôle : ${opts.roleName}\n` : ''}${opts.agenceNames && opts.agenceNames.length > 0 ? `Agence(s) : ${opts.agenceNames.join(', ')}\n` : ''}\nCliquez sur le lien suivant pour créer votre mot de passe et accéder à l'application (valable jusqu'au ${expire}) :\n${url}\n\nSi vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail.`,
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
          <h1 style="margin:0 0 8px;font-size:20px;color:#111827">Invitation à rejoindre une entreprise</h1>
          <p style="margin:0 0 24px;color:#6b7280;line-height:1.6">
            ${inviterIntro} <strong style="color:#111827">${safeCompany}</strong> sur Athenis.
          </p>

          ${roleLine}
          ${agenceLine}

          <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6">
            Cliquez sur le bouton ci-dessous pour créer votre mot de passe et accéder à l'application.
            Ce lien est valable jusqu'au <strong>${safeExpire}</strong>.
          </p>

          <div style="text-align:center;margin:32px 0">
            <a href="${safeUrl}" style="display:inline-block;background:#1a3a2a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px">
              Activer mon compte
            </a>
          </div>

          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px">
            Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail en toute sécurité.<br>
            Lien : <a href="${safeUrl}" style="color:#1a3a2a">${safeUrl}</a>
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

// ── Layout commun pour tous les emails Athenis ────────────────────────────────

function emailLayout(opts: {
  preheader?: string
  headerColor?: string
  headerSubtitle?: string
  bodyHtml: string
}): string {
  const headerColor = opts.headerColor ?? '#1a3a2a'
  const preheader = opts.preheader ? escapeHtml(opts.preheader) : ''
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Athenis</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827">
  ${preheader ? `<div style="display:none;font-size:1px;color:#f9fafb;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9fafb;padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr><td style="background:${headerColor};padding:28px 40px;text-align:center">
          <span style="color:#fff;font-size:24px;font-weight:700;letter-spacing:-.5px">Athenis</span>
          ${opts.headerSubtitle ? `<p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:13px">${escapeHtml(opts.headerSubtitle)}</p>` : ''}
        </td></tr>
        <tr><td style="padding:36px 40px">
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0 0 4px;color:#9ca3af;font-size:12px">© ${new Date().getFullYear()} Athenis · Plateforme de gestion d'entreprise</p>
          <p style="margin:0;color:#9ca3af;font-size:11px">Cet e-mail vous a été envoyé automatiquement, ne pas répondre directement.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function ctaButton(url: string, label: string, color: string = '#1a3a2a'): string {
  return `<div style="text-align:center;margin:32px 0">
    <a href="${escapeHtml(url)}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px">${escapeHtml(label)}</a>
  </div>`
}

// ── 1. Vérification d'email (envoyé immédiatement après signup) ───────────────

export async function sendVerificationEmail(to: string, opts: { token: string; firstName?: string | null }): Promise<void> {
  const url = `${env.frontendUrl}/auth/verify-email?token=${opts.token}`
  const safeUrl = escapeHtml(url)
  const greeting = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : 'Bonjour,'

  await sendMail({
    to,
    subject: 'Confirmez votre adresse e-mail — Athenis',
    text: [
      `Bienvenue sur Athenis !`,
      ``,
      `Cliquez sur ce lien pour confirmer votre adresse e-mail :`,
      url,
      ``,
      `Ce lien est valable 24 heures.`,
      ``,
      `Après confirmation, votre compte devra être validé par notre équipe avant que vous puissiez vous connecter (phase de test).`,
      ``,
      `Si vous n'avez pas créé de compte sur Athenis, ignorez cet e-mail.`,
    ].join('\n'),
    html: emailLayout({
      preheader: 'Confirmez votre adresse e-mail pour activer votre compte Athenis.',
      bodyHtml: `
        <p style="margin:0 0 8px;color:#374151;font-size:15px">${greeting}</p>
        <h1 style="margin:0 0 12px;font-size:22px;color:#111827;line-height:1.3">Confirmez votre adresse e-mail</h1>
        <p style="margin:0 0 24px;color:#6b7280;line-height:1.6;font-size:14px">
          Bienvenue sur <strong>Athenis</strong> ! Pour activer votre compte, confirmez votre adresse e-mail
          en cliquant sur le bouton ci-dessous.
        </p>
        ${ctaButton(url, 'Confirmer mon adresse e-mail')}
        <div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:12px 16px;margin:24px 0;border-radius:0 6px 6px 0">
          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5">
            <strong>Phase de test :</strong> après confirmation de votre e-mail, votre compte sera examiné
            par notre équipe avant activation finale. Vous recevrez un e-mail dès que ce sera fait.
          </p>
        </div>
        <p style="margin:8px 0 0;color:#9ca3af;font-size:13px">
          Ce lien est valable <strong>24 heures</strong>. Si vous n'avez pas créé de compte, ignorez cet e-mail.
        </p>
        <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;word-break:break-all">
          Lien : <a href="${safeUrl}" style="color:#1a3a2a">${safeUrl}</a>
        </p>
      `,
    }),
  })
}

// ── 2. Email vérifié, en attente de validation admin ──────────────────────────

export async function sendPendingApprovalEmail(to: string, opts: { firstName?: string | null }): Promise<void> {
  const greeting = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : 'Bonjour,'

  await sendMail({
    to,
    subject: 'Compte en attente de validation — Athenis',
    text: [
      `Bonjour,`,
      ``,
      `Votre adresse e-mail a bien été confirmée. Merci !`,
      ``,
      `Athenis est actuellement en phase de test fermée. Votre compte est désormais en attente de validation par notre équipe — nous examinons chaque inscription manuellement pour garantir la qualité du service.`,
      ``,
      `Vous recevrez un nouvel e-mail dès que votre compte sera activé (généralement sous 24-48h ouvrées).`,
      ``,
      `Merci de votre patience !`,
      `L'équipe Athenis`,
    ].join('\n'),
    html: emailLayout({
      preheader: 'Votre adresse e-mail est confirmée. Votre compte est en attente de validation par notre équipe.',
      headerColor: '#0369a1',
      headerSubtitle: '⏳ Compte en attente de validation',
      bodyHtml: `
        <p style="margin:0 0 8px;color:#374151;font-size:15px">${greeting}</p>
        <h1 style="margin:0 0 16px;font-size:22px;color:#111827;line-height:1.3">
          Votre e-mail est confirmé ✅
        </h1>
        <p style="margin:0 0 20px;color:#6b7280;line-height:1.6;font-size:14px">
          Merci d'avoir confirmé votre adresse e-mail.
          Athenis est actuellement en <strong>phase de test fermée</strong> — chaque inscription est examinée
          manuellement par notre équipe.
        </p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:18px 22px;margin:24px 0">
          <p style="margin:0 0 8px;font-weight:600;color:#1e40af;font-size:14px">Prochaine étape</p>
          <p style="margin:0;color:#1e3a8a;font-size:14px;line-height:1.6">
            Vous recevrez un e-mail dès que votre compte sera validé. Cela prend généralement
            <strong>moins de 24 heures</strong>.
          </p>
        </div>
        <p style="margin:8px 0 0;color:#6b7280;font-size:13px;line-height:1.6">
          Vous n'avez rien à faire pour le moment. Pas besoin de vous reconnecter — nous vous écrirons.
        </p>
        <p style="margin:24px 0 0;color:#9ca3af;font-size:13px">
          Merci de votre patience !<br>
          L'équipe Athenis
        </p>
      `,
    }),
  })
}

// ── 3. Compte approuvé : bienvenue avec présentation exhaustive ──────────────

export async function sendWelcomeEmail(
  to: string,
  opts: {
    firstName?: string | null
    companyName?: string | null
    accountType?: 'PERSONAL' | 'COMPANY' | 'CABINET' | null
  },
): Promise<void> {
  const loginUrl     = `${env.frontendUrl}/auth/login`
  const safeLoginUrl = escapeHtml(loginUrl)
  const greeting     = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : 'Bonjour,'
  const accountType  = opts.accountType ?? 'COMPANY'

  // Liste des modules à mettre en avant selon le type de compte
  const moduleSections: Array<{ icon: string; title: string; desc: string; features: string[] }> =
    accountType === 'PERSONAL'
      ? [
          {
            icon:  '💰',
            title: 'Gestion personnelle',
            desc:  'Gérez vos revenus, dépenses et épargne au quotidien.',
            features: [
              'Suivi de vos revenus (salaire, freelance, autres)',
              'Catégorisation automatique des dépenses',
              'Objectifs d\'épargne avec graphiques de progression',
              'Comptes multiples (banque, mobile money, espèces)',
            ],
          },
          {
            icon:  '📊',
            title: 'Tableau de bord',
            desc:  'Vue d\'ensemble de votre situation financière.',
            features: [
              'Bilan mensuel revenus / dépenses',
              'Top 5 des postes de dépense',
              'Évolution de votre épargne sur 12 mois',
            ],
          },
        ]
      : accountType === 'CABINET'
      ? [
          {
            icon:  '🏛️',
            title: 'Espace cabinet',
            desc:  'Gérez les comptabilités de vos clients depuis un point unique.',
            features: [
              'Tableau de bord multi-clients',
              'Bascule rapide entre les dossiers clients',
              'Invitations et délégations de missions',
              'Facturation des honoraires',
            ],
          },
          {
            icon:  '📒',
            title: 'Comptabilité complète',
            desc:  'SYSCOHADA Révisé 2017 + Plan Comptable Général français.',
            features: [
              'Journal, grand livre, balance',
              'États financiers normés (Bilan, CR, TAFIRE)',
              'Révision comptable assistée',
              'Exports FEC / DSF / fiscaux',
            ],
          },
        ]
      : [
          // COMPANY — le cas le plus riche
          {
            icon:  '🧾',
            title: 'Gestion commerciale',
            desc:  'Tout votre cycle de vente, multi-devises.',
            features: [
              'Devis → factures → encaissements',
              'Clients et fournisseurs centralisés',
              'Articles, stocks, bons de livraison',
              'Achats et factures fournisseurs',
              'Trésorerie en temps réel (banque, caisse, mobile money)',
            ],
          },
          {
            icon:  '📒',
            title: 'Comptabilité',
            desc:  'SYSCOHADA Révisé 2017 (OHADA) ou PCG (France).',
            features: [
              'Écritures automatiques depuis ventes/achats',
              'Journal, grand livre, balance interactifs',
              'États financiers : Bilan, Compte de résultat, TAFIRE',
              'Révision comptable et clôture annuelle',
              'Exports FEC, DSF et déclarations fiscales',
            ],
          },
          {
            icon:  '👥',
            title: 'Ressources humaines',
            desc:  'Tout le parcours employé, paie incluse.',
            features: [
              'Fiches employés, contrats, planning, congés',
              'Bulletins de paie (CNPS Cameroun ou URSSAF France)',
              'Déclarations sociales automatisées',
              'Organigramme et historique des évaluations',
            ],
          },
          {
            icon:  '⚖️',
            title: 'Juridique',
            desc:  'Conformité et gestion des contrats.',
            features: [
              'Bibliothèque de contrats avec versions',
              'Signature électronique conforme OHADA',
              'Suivi RGPD / protection des données',
              'Alertes de conformité (échéances légales)',
            ],
          },
          {
            icon:  '🌿',
            title: 'ESG / CSRD',
            desc:  'Reporting environnemental et social.',
            features: [
              'Bilan carbone (Scope 1, 2, 3)',
              'Indicateurs sociaux et de gouvernance',
              'Benchmark sectoriel',
              'Rapport DPEF / CSRD exportable PDF',
            ],
          },
        ]

  const moduleHtml = moduleSections.map((m) => `
    <div style="margin:0 0 18px;padding:18px 20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px">
      <p style="margin:0 0 6px;font-size:15px;color:#111827;font-weight:700">
        ${m.icon} ${escapeHtml(m.title)}
      </p>
      <p style="margin:0 0 10px;font-size:13px;color:#6b7280">
        ${escapeHtml(m.desc)}
      </p>
      <ul style="margin:0;padding:0 0 0 16px;color:#374151;font-size:13px;line-height:1.6">
        ${m.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
      </ul>
    </div>
  `).join('')

  // Récap text pour les clients mail non-HTML
  const textFeatures = moduleSections.map((m) =>
    `• ${m.title} : ${m.desc}\n  ${m.features.map(f => `    - ${f}`).join('\n  ')}`,
  ).join('\n\n')

  await sendMail({
    to,
    subject: '🎉 Votre compte Athenis est activé — Bienvenue !',
    text: [
      `Bienvenue sur Athenis !`,
      ``,
      `Excellente nouvelle : votre compte ${opts.companyName ? `pour ${opts.companyName} ` : ''}vient d'être validé par notre équipe.`,
      `Vous pouvez désormais vous connecter et accéder à toutes les fonctionnalités.`,
      ``,
      `Connectez-vous : ${loginUrl}`,
      ``,
      `═══════════════════════════════════════════════════════════════`,
      `CE QUE VOUS POUVEZ FAIRE SUR ATHENIS`,
      `═══════════════════════════════════════════════════════════════`,
      ``,
      textFeatures,
      ``,
      `═══════════════════════════════════════════════════════════════`,
      `VOS 7 PREMIERS JOURS — Parcours conseillé`,
      `═══════════════════════════════════════════════════════════════`,
      ``,
      `Jour 1  → Connexion, tour de l'interface, paramétrage du profil`,
      `Jour 2  → Activez le 2FA (Paramètres → Sécurité) pour protéger votre compte`,
      `Jour 3  → Créez vos 3-5 premiers clients et fournisseurs`,
      `Jour 4  → Émettez votre 1ère facture (Gestion → Factures de vente)`,
      `Jour 5  → Importez vos employés et créez leurs contrats`,
      `Jour 6  → Paramétrez votre exercice fiscal et zone comptable`,
      `Jour 7  → Invitez vos collaborateurs (Paramètres → Utilisateurs)`,
      ``,
      `═══════════════════════════════════════════════════════════════`,
      ``,
      `Un souci, une question, une idée ? Répondez simplement à cet e-mail.`,
      `Notre équipe lit chaque message — promis.`,
      ``,
      `Excellente prise en main,`,
      `L'équipe Athenis`,
    ].join('\n'),
    html: emailLayout({
      preheader: 'Votre compte Athenis est activé. Voici un tour d\'horizon complet de ce que vous pouvez faire.',
      headerColor: '#15803d',
      headerSubtitle: '✅ Compte activé',
      bodyHtml: `
        <p style="margin:0 0 8px;color:#374151;font-size:15px">${greeting}</p>
        <h1 style="margin:0 0 12px;font-size:26px;color:#111827;line-height:1.2;font-weight:800">
          🎉 Bienvenue sur Athenis !
        </h1>
        <p style="margin:0 0 22px;color:#6b7280;line-height:1.6;font-size:15px">
          Excellente nouvelle — votre compte ${opts.companyName ? `pour <strong>${escapeHtml(opts.companyName)}</strong> ` : ''}vient d'être validé par notre équipe.
          Vous pouvez désormais vous connecter et accéder à toutes les fonctionnalités.
        </p>

        ${ctaButton(loginUrl, 'Me connecter à Athenis →', '#15803d')}

        <h2 style="margin:36px 0 14px;font-size:18px;color:#111827;font-weight:700">
          Ce que vous pouvez faire sur Athenis
        </h2>
        <p style="margin:0 0 18px;color:#6b7280;font-size:14px;line-height:1.6">
          Athenis regroupe tous les outils dont une PME a besoin pour piloter son activité, en un seul logiciel.
        </p>

        ${moduleHtml}

        <h2 style="margin:36px 0 12px;font-size:18px;color:#111827;font-weight:700">
          📅 Vos 7 premiers jours — parcours conseillé
        </h2>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:8px">
          <tr><td style="padding:10px 16px;font-size:13px;color:#78350f"><strong>Jour 1</strong> · Connexion + tour de l'interface + paramétrage du profil</td></tr>
          <tr><td style="padding:10px 16px;font-size:13px;color:#78350f;border-top:1px solid #fde68a"><strong>Jour 2</strong> · 🔒 Activer le 2FA (Paramètres → Sécurité)</td></tr>
          <tr><td style="padding:10px 16px;font-size:13px;color:#78350f;border-top:1px solid #fde68a"><strong>Jour 3</strong> · Créer vos 3-5 premiers clients et fournisseurs</td></tr>
          <tr><td style="padding:10px 16px;font-size:13px;color:#78350f;border-top:1px solid #fde68a"><strong>Jour 4</strong> · Émettre votre 1ère facture (Gestion → Factures de vente)</td></tr>
          <tr><td style="padding:10px 16px;font-size:13px;color:#78350f;border-top:1px solid #fde68a"><strong>Jour 5</strong> · Importer vos employés et créer leurs contrats</td></tr>
          <tr><td style="padding:10px 16px;font-size:13px;color:#78350f;border-top:1px solid #fde68a"><strong>Jour 6</strong> · Paramétrer votre exercice fiscal + zone comptable (OHADA / France)</td></tr>
          <tr><td style="padding:10px 16px;font-size:13px;color:#78350f;border-top:1px solid #fde68a"><strong>Jour 7</strong> · Inviter vos collaborateurs (Paramètres → Utilisateurs)</td></tr>
        </table>

        <h2 style="margin:36px 0 12px;font-size:18px;color:#111827;font-weight:700">
          💡 Astuces pour démarrer rapidement
        </h2>
        <ul style="margin:0 0 20px;padding-left:20px;color:#374151;font-size:14px;line-height:1.7">
          <li><strong>Multi-devises</strong> : vos factures s'affichent automatiquement dans la devise de votre pays (F CFA, €, $…).</li>
          <li><strong>Imprimer / PDF</strong> : tous les documents (factures, bulletins, états financiers) sont exportables en PDF.</li>
          <li><strong>Recherche globale</strong> : tapez <kbd style="background:#f3f4f6;padding:1px 6px;border-radius:4px;font-size:11px">Ctrl + K</kbd> n'importe où pour chercher un client, une facture, un employé…</li>
          <li><strong>App mobile</strong> : Athenis est aussi une PWA — ajoutez-la à l'écran d'accueil de votre téléphone.</li>
        </ul>

        <div style="background:#f0fdf4;border-left:3px solid #16a34a;padding:16px 20px;margin:28px 0;border-radius:0 8px 8px 0">
          <p style="margin:0 0 4px;font-size:14px;color:#14532d;font-weight:600">
            👋 Une question ? Une idée ? Un bug ?
          </p>
          <p style="margin:0;font-size:13px;color:#166534;line-height:1.5">
            Répondez simplement à cet e-mail — notre équipe lit et répond à chaque message.
          </p>
        </div>

        <p style="margin:24px 0 0;color:#9ca3af;font-size:13px">
          Excellente prise en main,<br>
          L'équipe Athenis
        </p>
        <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;word-break:break-all">
          Lien de connexion : <a href="${safeLoginUrl}" style="color:#15803d">${safeLoginUrl}</a>
        </p>
      `,
    }),
  })
}

// ── 4. Compte refusé ──────────────────────────────────────────────────────────

export async function sendRejectionEmail(to: string, opts: { firstName?: string | null; reason?: string | null }): Promise<void> {
  const greeting = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : 'Bonjour,'
  const reason = opts.reason?.trim()

  await sendMail({
    to,
    subject: 'Votre demande d\'inscription Athenis — Information',
    text: [
      `Bonjour,`,
      ``,
      `Après examen de votre demande d'inscription sur Athenis, nous ne sommes pas en mesure d'activer votre compte pour le moment.`,
      reason ? `\nRaison : ${reason}\n` : '',
      `Athenis est en phase de test fermée et nous limitons les nouveaux comptes pour garantir un service de qualité. Vous pouvez nous recontacter ultérieurement.`,
      ``,
      `Cordialement,`,
      `L'équipe Athenis`,
    ].filter(Boolean).join('\n'),
    html: emailLayout({
      preheader: 'Information concernant votre demande d\'inscription sur Athenis.',
      headerColor: '#6b7280',
      bodyHtml: `
        <p style="margin:0 0 8px;color:#374151;font-size:15px">${greeting}</p>
        <h1 style="margin:0 0 16px;font-size:20px;color:#111827;line-height:1.3">
          Concernant votre demande d'inscription
        </h1>
        <p style="margin:0 0 20px;color:#6b7280;line-height:1.6;font-size:14px">
          Après examen, nous ne sommes pas en mesure d'activer votre compte sur Athenis pour le moment.
        </p>
        ${reason ? `
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:24px 0">
          <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">Raison</p>
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6">${escapeHtml(reason)}</p>
        </div>
        ` : ''}
        <p style="margin:0 0 20px;color:#6b7280;line-height:1.6;font-size:14px">
          Athenis est en <strong>phase de test fermée</strong>. Nous limitons volontairement les nouvelles inscriptions
          pour garantir un service de qualité. Vous pouvez nous recontacter ultérieurement, lorsque la plateforme
          sera ouverte à un public plus large.
        </p>
        <p style="margin:24px 0 0;color:#9ca3af;font-size:13px">
          Cordialement,<br>
          L'équipe Athenis
        </p>
      `,
    }),
  })
}

// ── Code MFA (envoyé à chaque connexion si méthode = EMAIL) ──────────────────
//
// Doit être minimaliste, ultra-clair, code en évidence. L'utilisateur le lit
// dans Gmail, copie le code, retourne sur Athenis. Pas de fioritures.

export async function sendMfaCodeEmail(
  to: string,
  opts: {
    code:      string
    purpose?:  'login' | 'setup'
    expiresInMinutes?: number
    ip?:       string | null
  },
): Promise<void> {
  const code      = opts.code
  const purpose   = opts.purpose ?? 'login'
  const minutes   = opts.expiresInMinutes ?? 10
  const safeCode  = escapeHtml(code)
  const safeIp    = opts.ip ? escapeHtml(opts.ip) : null

  const subjectByPurpose = {
    login: `Code de connexion Athenis : ${code}`,
    setup: `Code de configuration Athenis : ${code}`,
  }

  const titleByPurpose = {
    login: 'Code de connexion',
    setup: 'Code de vérification de votre adresse e-mail',
  }

  const explainByPurpose = {
    login: 'Saisissez ce code sur la page de connexion pour finaliser votre authentification.',
    setup: 'Saisissez ce code pour confirmer que vous souhaitez utiliser cet e-mail comme méthode d\'authentification à deux facteurs.',
  }

  await sendMail({
    to,
    subject: subjectByPurpose[purpose],
    text: [
      `Votre code Athenis : ${code}`,
      ``,
      explainByPurpose[purpose],
      ``,
      `Ce code expire dans ${minutes} minutes.`,
      opts.ip ? `Origine : ${opts.ip}` : '',
      ``,
      `Si vous n'avez pas demandé ce code, ignorez ce message. Si vous voyez plusieurs codes apparaître sans demande de votre part, changez immédiatement votre mot de passe.`,
      ``,
      `L'équipe Athenis`,
    ].filter(Boolean).join('\n'),
    html: emailLayout({
      preheader: `Votre code Athenis : ${code} — valable ${minutes} minutes`,
      headerColor: '#1a3a2a',
      headerSubtitle: purpose === 'login' ? '🔐 Connexion en cours' : '✉️ Vérification e-mail',
      bodyHtml: `
        <h1 style="margin:0 0 8px;font-size:20px;color:#111827">${titleByPurpose[purpose]}</h1>
        <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">
          ${explainByPurpose[purpose]}
        </p>

        <div style="text-align:center;margin:28px 0">
          <div style="display:inline-block;background:#f0fdf4;border:2px solid #16a34a;border-radius:14px;padding:22px 36px">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#166534">Votre code</p>
            <p style="margin:0;font-family:'SF Mono','Monaco','Cascadia Code',monospace;font-size:38px;font-weight:700;letter-spacing:.4em;color:#14532d">${safeCode}</p>
          </div>
        </div>

        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-align:center">
          Ce code expire dans <strong style="color:#111827">${minutes} minutes</strong>.
        </p>

        ${safeIp ? `
        <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;text-align:center">
          Demande effectuée depuis l'adresse <code style="background:#f3f4f6;padding:1px 6px;border-radius:4px;font-family:monospace;font-size:11px">${safeIp}</code>
        </p>
        ` : ''}

        <div style="background:#fef2f2;border-left:3px solid #dc2626;padding:12px 18px;margin:24px 0;border-radius:0 6px 6px 0">
          <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.5">
            <strong>⚠️ Vous n'avez pas demandé ce code ?</strong>
            Ignorez ce message. Si vous recevez plusieurs codes inattendus, changez immédiatement votre mot de passe Athenis.
          </p>
        </div>

        <p style="margin:24px 0 0;color:#9ca3af;font-size:12px">
          L'équipe Athenis
        </p>
      `,
    }),
  })
}

// ── 5. Première connexion ─────────────────────────────────────────────────────
// Déclenché à la 1ère connexion réussie (lastLoginAt était null avant).
// Plus court et plus actionnable que le welcome mail : "tu es là, voici TES
// 3 premières actions concrètes maintenant".

export async function sendFirstLoginEmail(
  to: string,
  opts: {
    firstName?: string | null
    accountType?: 'PERSONAL' | 'COMPANY' | 'CABINET' | null
    companyName?: string | null
  },
): Promise<void> {
  const greeting    = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : 'Bonjour,'
  const accountType = opts.accountType ?? 'COMPANY'

  // 3 premières actions concrètes selon le profil
  const firstSteps: Array<{ emoji: string; title: string; desc: string; path: string }> =
    accountType === 'PERSONAL'
      ? [
          { emoji: '💸', title: 'Ajoutez votre premier revenu', desc: 'Salaire, freelance, ou autre source. Athenis catégorise ensuite tout automatiquement.', path: '/personal/income' },
          { emoji: '📊', title: 'Définissez un objectif d\'épargne', desc: 'Un projet, une vacance, un fonds de sécurité — Athenis suit votre progression.', path: '/personal/savings' },
          { emoji: '🔒', title: 'Activez le 2FA', desc: 'Protégez vos données financières avec une authentification à 2 facteurs.', path: '/app/settings/securite' },
        ]
      : accountType === 'CABINET'
      ? [
          { emoji: '👥', title: 'Invitez vos premiers clients', desc: 'Envoyez une invitation au gérant d\'une PME — il accepte et vous accédez à sa compta.', path: '/cabinet/clients' },
          { emoji: '🔒', title: 'Sécurisez votre cabinet', desc: 'Activez le 2FA et configurez la politique de mots de passe pour votre équipe.', path: '/app/settings/securite' },
          { emoji: '📒', title: 'Familiarisez-vous avec la vue client', desc: 'Choisissez un dossier de test, naviguez dans les modules comptabilité/gestion.', path: '/cabinet/dashboard' },
        ]
      : [
          { emoji: '🏢', title: 'Renseignez votre entreprise', desc: 'Coordonnées, RCCM/SIRET, NIU, devise — base pour vos factures et déclarations.', path: '/app/settings' },
          { emoji: '🧾', title: 'Créez votre 1ère facture', desc: 'Ajoutez un client, un article, et émettez votre facture en 2 minutes.', path: '/app/billing' },
          { emoji: '🔒', title: 'Activez le 2FA', desc: 'Protégez votre compte avec une authentification à 2 facteurs.', path: '/app/settings/securite' },
        ]

  const stepsHtml = firstSteps.map((s, i) => {
    const url = `${env.frontendUrl}${s.path}`
    return `
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 12px;background:#fff;border:1px solid #e5e7eb;border-radius:10px">
        <tr>
          <td width="50" style="padding:18px 0 18px 18px;vertical-align:top">
            <div style="width:34px;height:34px;border-radius:50%;background:#15803d;color:#fff;text-align:center;line-height:34px;font-weight:700;font-size:14px">${i + 1}</div>
          </td>
          <td style="padding:14px 18px;vertical-align:top">
            <p style="margin:0 0 4px;font-size:15px;color:#111827;font-weight:700">${s.emoji} ${escapeHtml(s.title)}</p>
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.5">${escapeHtml(s.desc)}</p>
            <a href="${escapeHtml(url)}" style="display:inline-block;font-size:13px;color:#15803d;font-weight:600;text-decoration:none">→ Aller à cette étape</a>
          </td>
        </tr>
      </table>
    `
  }).join('')

  const stepsText = firstSteps.map((s, i) => `${i + 1}. ${s.title}\n   ${s.desc}\n   → ${env.frontendUrl}${s.path}`).join('\n\n')

  await sendMail({
    to,
    subject: `👋 Heureux de vous revoir sur Athenis !`,
    text: [
      `${opts.firstName ? `${opts.firstName}, b` : 'B'}ienvenue dans votre espace !`,
      ``,
      `Vous venez de vous connecter pour la première fois${opts.companyName ? ` pour ${opts.companyName}` : ''}. Pour bien démarrer, voici 3 actions concrètes à réaliser dès maintenant :`,
      ``,
      stepsText,
      ``,
      `Besoin d'aide ? Répondez à cet e-mail.`,
      ``,
      `Bon démarrage,`,
      `L'équipe Athenis`,
    ].join('\n'),
    html: emailLayout({
      preheader: 'Trois actions concrètes pour bien démarrer sur Athenis.',
      headerColor: '#15803d',
      headerSubtitle: '👋 Première connexion',
      bodyHtml: `
        <p style="margin:0 0 8px;color:#374151;font-size:15px">${greeting}</p>
        <h1 style="margin:0 0 14px;font-size:22px;color:#111827;line-height:1.3">
          Heureux de vous revoir sur Athenis !
        </h1>
        <p style="margin:0 0 24px;color:#6b7280;line-height:1.6;font-size:14px">
          Vous venez de vous connecter pour la première fois${opts.companyName ? ` pour <strong>${escapeHtml(opts.companyName)}</strong>` : ''}.
          Pour démarrer du bon pied, voici <strong>3 actions concrètes</strong> à réaliser dès maintenant :
        </p>

        ${stepsHtml}

        <div style="background:#eff6ff;border-left:3px solid #2563eb;padding:14px 18px;margin:24px 0;border-radius:0 8px 8px 0">
          <p style="margin:0;font-size:13px;color:#1e3a8a;line-height:1.5">
            💡 <strong>Astuce</strong> : tapez <kbd style="background:#dbeafe;padding:1px 6px;border-radius:4px;font-size:11px">Ctrl + K</kbd>
            (ou <kbd style="background:#dbeafe;padding:1px 6px;border-radius:4px;font-size:11px">Cmd + K</kbd> sur Mac) pour
            ouvrir la recherche globale depuis n'importe où.
          </p>
        </div>

        <p style="margin:24px 0 0;color:#9ca3af;font-size:13px">
          Besoin d'un coup de main ? Répondez à cet e-mail, on vous accompagne.<br><br>
          Bon démarrage,<br>
          L'équipe Athenis
        </p>
      `,
    }),
  })
}

// ── 6. Mot de passe modifié — alerte sécurité ────────────────────────────────

// ── Demande de réinitialisation de mot de passe ───────────────────────────────

export async function sendPasswordResetEmail(
  to: string,
  opts: { token: string; firstName?: string | null },
): Promise<void> {
  const url      = `${env.frontendUrl}/auth/reset-password?token=${opts.token}`
  const safeUrl  = escapeHtml(url)
  const greeting = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : 'Bonjour,'

  await sendMail({
    to,
    subject: 'Réinitialisation de votre mot de passe — Athenis',
    text: [
      `Vous avez demandé à réinitialiser le mot de passe de votre compte Athenis.`,
      ``,
      `Cliquez sur ce lien pour choisir un nouveau mot de passe :`,
      url,
      ``,
      `Ce lien est valable 1 heure et ne peut être utilisé qu'une seule fois.`,
      ``,
      `Si vous n'êtes pas à l'origine de cette demande, ignorez ce message — votre mot de passe ne sera pas modifié.`,
    ].join('\n'),
    html: emailLayout({
      preheader: 'Suivez le lien pour choisir un nouveau mot de passe.',
      bodyHtml: `
        <p style="margin:0 0 8px;color:#374151;font-size:15px">${greeting}</p>
        <h1 style="margin:0 0 12px;font-size:22px;color:#111827;line-height:1.3">Réinitialiser votre mot de passe</h1>
        <p style="margin:0 0 24px;color:#6b7280;line-height:1.6;font-size:14px">
          Vous avez demandé à réinitialiser le mot de passe de votre compte <strong>Athenis</strong>.
          Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
        </p>
        ${ctaButton(url, 'Choisir un nouveau mot de passe')}
        <div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:12px 16px;margin:24px 0;border-radius:0 6px 6px 0">
          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5">
            <strong>Lien à usage unique :</strong> ce lien est valable <strong>1 heure</strong> et ne peut être utilisé qu'une seule fois.
          </p>
        </div>
        <p style="margin:8px 0 0;color:#9ca3af;font-size:13px">
          Si vous n'êtes pas à l'origine de cette demande, ignorez ce message — votre mot de passe ne sera pas modifié.
        </p>
        <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;word-break:break-all">
          Lien : <a href="${safeUrl}" style="color:#1a3a2a">${safeUrl}</a>
        </p>
      `,
    }),
  })
}

export async function sendPasswordChangedEmail(
  to: string,
  opts: {
    firstName?: string | null
    ip?: string | null
    userAgent?: string | null
    changedAt?: Date | null
  },
): Promise<void> {
  const greeting = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : 'Bonjour,'
  const when     = (opts.changedAt ?? new Date()).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })
  const ip       = opts.ip       ? escapeHtml(opts.ip)       : 'inconnue'
  const device   = opts.userAgent ? escapeHtml(opts.userAgent.slice(0, 120)) : 'inconnu'

  await sendMail({
    to,
    subject: '🔐 Votre mot de passe Athenis a été modifié',
    text: [
      `Bonjour,`,
      ``,
      `Le mot de passe de votre compte Athenis vient d'être modifié.`,
      ``,
      `Date     : ${when}`,
      `Adresse  : ${ip}`,
      `Appareil : ${opts.userAgent ?? 'inconnu'}`,
      ``,
      `Si c'est bien vous, vous pouvez ignorer cet e-mail.`,
      ``,
      `⚠️ SI CE N'EST PAS VOUS :`,
      `Quelqu'un a probablement accès à votre compte. Agissez immédiatement :`,
      `1. Contactez-nous en répondant à cet e-mail`,
      `2. Si vous avez le 2FA, désactivez puis réactivez-le`,
      `3. Vérifiez vos sessions actives dans Paramètres → Sécurité`,
      ``,
      `Pour votre sécurité, toutes les autres sessions ont été automatiquement déconnectées.`,
      ``,
      `L'équipe Athenis`,
    ].join('\n'),
    html: emailLayout({
      preheader: 'Confirmation de modification du mot de passe — si ce n\'est pas vous, agissez vite.',
      headerColor: '#0f766e',
      headerSubtitle: '🔐 Notification de sécurité',
      bodyHtml: `
        <p style="margin:0 0 8px;color:#374151;font-size:15px">${greeting}</p>
        <h1 style="margin:0 0 14px;font-size:20px;color:#111827;line-height:1.3">
          Votre mot de passe a été modifié
        </h1>
        <p style="margin:0 0 18px;color:#6b7280;line-height:1.6;font-size:14px">
          Voici les détails de la modification — vérifiez qu'elle vient bien de vous.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:16px 0">
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280">Date et heure</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;font-weight:600">${escapeHtml(when)}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280">Adresse IP</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;font-family:monospace">${ip}</td></tr>
          <tr><td style="padding:12px 16px;font-size:13px;color:#6b7280">Appareil</td><td style="padding:12px 16px;font-size:13px;color:#374151;line-height:1.4">${device}</td></tr>
        </table>

        <div style="background:#f0fdf4;border-left:3px solid #16a34a;padding:12px 18px;margin:20px 0;border-radius:0 6px 6px 0">
          <p style="margin:0;font-size:13px;color:#14532d;line-height:1.5">
            ✓ <strong>C'est bien vous ?</strong> Aucune action n'est requise. Toutes vos autres sessions ont été déconnectées par sécurité.
          </p>
        </div>

        <div style="background:#fef2f2;border-left:3px solid #dc2626;padding:14px 18px;margin:20px 0;border-radius:0 6px 6px 0">
          <p style="margin:0 0 6px;font-size:14px;color:#7f1d1d;font-weight:700">⚠️ Ce n'est pas vous ?</p>
          <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.5">
            Quelqu'un a probablement compromis votre compte. Agissez vite :
          </p>
          <ol style="margin:8px 0 0;padding-left:18px;color:#991b1b;font-size:13px;line-height:1.6">
            <li>Répondez à cet e-mail pour nous prévenir</li>
            <li>Si vous avez le 2FA, désactivez puis réactivez-le</li>
            <li>Vérifiez les actions récentes dans Paramètres → Sécurité</li>
          </ol>
        </div>

        <p style="margin:20px 0 0;color:#9ca3af;font-size:13px">
          L'équipe Athenis
        </p>
      `,
    }),
  })
}

// ── 7. 2FA activé — confirmation sécurité ────────────────────────────────────

export async function sendTwoFactorEnabledEmail(
  to: string,
  opts: {
    firstName?: string | null
    enabledAt?: Date | null
  },
): Promise<void> {
  const greeting = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : 'Bonjour,'
  const when     = (opts.enabledAt ?? new Date()).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })

  await sendMail({
    to,
    subject: '🔒 Authentification à 2 facteurs activée — Athenis',
    text: [
      `Bonjour,`,
      ``,
      `L'authentification à deux facteurs (2FA) vient d'être activée sur votre compte Athenis le ${when}.`,
      ``,
      `À chaque connexion, vous devrez désormais saisir un code à 6 chiffres généré par votre application d'authentification, en plus de votre mot de passe.`,
      ``,
      `Important :`,
      `- Conservez vos 8 codes de récupération dans un endroit sûr.`,
      `- En cas de perte de votre téléphone, ces codes vous permettent de vous reconnecter.`,
      `- Chaque code ne fonctionne qu'une seule fois.`,
      ``,
      `Si vous n'êtes pas à l'origine de cette activation, contactez-nous immédiatement en répondant à cet e-mail.`,
      ``,
      `L'équipe Athenis`,
    ].join('\n'),
    html: emailLayout({
      preheader: 'Votre compte Athenis est désormais protégé par une authentification à 2 facteurs.',
      headerColor: '#15803d',
      headerSubtitle: '🔒 Sécurité renforcée',
      bodyHtml: `
        <p style="margin:0 0 8px;color:#374151;font-size:15px">${greeting}</p>
        <h1 style="margin:0 0 14px;font-size:22px;color:#111827;line-height:1.3">
          🔒 Le 2FA est activé sur votre compte
        </h1>
        <p style="margin:0 0 16px;color:#6b7280;line-height:1.6;font-size:14px">
          Bravo — votre compte est désormais protégé par une authentification à deux facteurs.
          À chaque connexion, vous devrez saisir un <strong>code à 6 chiffres</strong> généré par votre application
          d'authentification, en plus de votre mot de passe.
        </p>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:20px 0">
          <p style="margin:0 0 6px;font-size:13px;color:#14532d;font-weight:600">
            ✓ Activé le ${escapeHtml(when)}
          </p>
          <p style="margin:0;font-size:12px;color:#166534">
            Vos 8 codes de récupération vous ont été affichés au moment de l'activation. Conservez-les.
          </p>
        </div>

        <h2 style="margin:24px 0 10px;font-size:15px;color:#111827;font-weight:700">📋 À retenir</h2>
        <ul style="margin:0 0 20px;padding-left:20px;color:#374151;font-size:13px;line-height:1.7">
          <li><strong>Codes de récupération</strong> : gardez-les dans un gestionnaire de mots de passe ou imprimés dans un endroit sûr</li>
          <li><strong>Perte du téléphone</strong> ? Utilisez un code de récupération pour vous reconnecter, puis réinitialisez le 2FA</li>
          <li><strong>Chaque code de récupération ne fonctionne qu'une seule fois</strong></li>
          <li>Pour désactiver le 2FA : Paramètres → Sécurité (mot de passe + code 2FA requis)</li>
        </ul>

        <div style="background:#fef2f2;border-left:3px solid #dc2626;padding:12px 18px;margin:20px 0;border-radius:0 6px 6px 0">
          <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.5">
            ⚠️ <strong>Ce n'est pas vous ?</strong> Répondez immédiatement à cet e-mail pour nous prévenir.
            Nous pourrons désactiver le 2FA manuellement et sécuriser votre compte.
          </p>
        </div>

        <p style="margin:24px 0 0;color:#9ca3af;font-size:13px">
          L'équipe Athenis
        </p>
      `,
    }),
  })
}

// ── 8. Compte verrouillé après tentatives ratées ──────────────────────────────

export async function sendAccountLockedEmail(
  to: string,
  opts: {
    firstName?: string | null
    lockedUntil: Date
    ip?: string | null
  },
): Promise<void> {
  const greeting = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : 'Bonjour,'
  const until    = opts.lockedUntil.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })
  const ip       = opts.ip ? escapeHtml(opts.ip) : 'inconnue'

  await sendMail({
    to,
    subject: '⚠️ Tentatives de connexion suspectes — votre compte est temporairement verrouillé',
    text: [
      `Bonjour,`,
      ``,
      `Nous avons détecté 5 tentatives de connexion infructueuses sur votre compte Athenis depuis l'adresse ${opts.ip ?? 'inconnue'}.`,
      ``,
      `Par sécurité, votre compte est temporairement verrouillé jusqu'au ${until}.`,
      ``,
      `Aucune action n'est requise de votre part. Vous pourrez retenter une connexion à la fin de la période de verrouillage.`,
      ``,
      `Si vous n'êtes pas à l'origine de ces tentatives, c'est probablement quelqu'un qui essaie de deviner votre mot de passe. Recommandations :`,
      `- Changez votre mot de passe dès que possible`,
      `- Activez le 2FA si ce n'est pas déjà fait`,
      `- Vérifiez vos sessions actives dans Paramètres → Sécurité`,
      ``,
      `L'équipe Athenis`,
    ].join('\n'),
    html: emailLayout({
      preheader: 'Votre compte est verrouillé pour 30 minutes suite à des tentatives de connexion infructueuses.',
      headerColor: '#b45309',
      headerSubtitle: '⚠️ Alerte sécurité',
      bodyHtml: `
        <p style="margin:0 0 8px;color:#374151;font-size:15px">${greeting}</p>
        <h1 style="margin:0 0 14px;font-size:20px;color:#111827;line-height:1.3">
          Tentatives de connexion suspectes détectées
        </h1>
        <p style="margin:0 0 18px;color:#6b7280;line-height:1.6;font-size:14px">
          Nous avons détecté <strong>5 tentatives de connexion infructueuses</strong> consécutives sur votre compte Athenis.
          Par sécurité, votre compte est temporairement verrouillé.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;margin:16px 0">
          <tr><td style="padding:12px 16px;border-bottom:1px solid #fde68a;font-size:13px;color:#92400e;font-weight:600">Verrouillé jusqu'au</td><td style="padding:12px 16px;border-bottom:1px solid #fde68a;font-size:13px;color:#78350f">${escapeHtml(until)}</td></tr>
          <tr><td style="padding:12px 16px;font-size:13px;color:#92400e;font-weight:600">Origine</td><td style="padding:12px 16px;font-size:13px;color:#78350f;font-family:monospace">${ip}</td></tr>
        </table>

        <div style="background:#f0fdf4;border-left:3px solid #16a34a;padding:12px 18px;margin:20px 0;border-radius:0 6px 6px 0">
          <p style="margin:0;font-size:13px;color:#14532d;line-height:1.5">
            ✓ <strong>C'est vous qui avez oublié votre mot de passe ?</strong>
            Réessayez à partir de la fin du verrouillage. Aucune autre action n'est nécessaire.
          </p>
        </div>

        <div style="background:#fef2f2;border-left:3px solid #dc2626;padding:14px 18px;margin:20px 0;border-radius:0 6px 6px 0">
          <p style="margin:0 0 6px;font-size:14px;color:#7f1d1d;font-weight:700">⚠️ Ce n'est pas vous ?</p>
          <p style="margin:0 0 8px;font-size:13px;color:#991b1b;line-height:1.5">
            Quelqu'un essaie probablement de deviner votre mot de passe. Recommandations :
          </p>
          <ol style="margin:0;padding-left:18px;color:#991b1b;font-size:13px;line-height:1.6">
            <li>Changez votre mot de passe dès que possible</li>
            <li>Activez le 2FA si ce n'est pas déjà fait</li>
            <li>Vérifiez vos sessions actives dans Paramètres → Sécurité</li>
          </ol>
        </div>

        <p style="margin:20px 0 0;color:#9ca3af;font-size:13px">
          L'équipe Athenis
        </p>
      `,
    }),
  })
}

// ── 8b. Compte désactivé par un admin ────────────────────────────────────────

export async function sendAccountDeactivatedEmail(
  to: string,
  opts: { firstName?: string | null; reason?: string | null },
): Promise<void> {
  const greeting = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : 'Bonjour,'
  const reason   = opts.reason?.trim()

  await sendMail({
    to,
    subject: 'Votre compte Athenis a été désactivé',
    text: [
      `Bonjour,`,
      ``,
      `Votre compte Athenis a été désactivé par notre équipe.`,
      reason ? `\nRaison : ${reason}\n` : '',
      `Vous ne pouvez plus vous connecter pour le moment. Toutes vos sessions actives ont été fermées.`,
      ``,
      `Vos données restent conservées et seront restaurées si votre compte est réactivé.`,
      ``,
      `Pour toute question ou pour demander la réactivation, écrivez à contact@athenis360.com.`,
      ``,
      `L'équipe Athenis`,
    ].filter(Boolean).join('\n'),
    html: emailLayout({
      preheader: 'Votre compte Athenis a été désactivé. Vos données restent conservées.',
      headerColor: '#b45309',
      headerSubtitle: '⚠️ Compte désactivé',
      bodyHtml: `
        <p style="margin:0 0 8px;color:#374151;font-size:15px">${greeting}</p>
        <h1 style="margin:0 0 14px;font-size:20px;color:#111827;line-height:1.3">
          Votre compte a été désactivé
        </h1>
        <p style="margin:0 0 16px;color:#6b7280;line-height:1.6;font-size:14px">
          Votre compte Athenis a été désactivé par notre équipe.
          Vous ne pouvez plus vous connecter pour le moment et toutes vos sessions actives ont été fermées.
        </p>
        ${reason ? `
        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin:20px 0">
          <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#92400e">Raison</p>
          <p style="margin:0;font-size:14px;color:#78350f;line-height:1.6">${escapeHtml(reason)}</p>
        </div>
        ` : ''}
        <div style="background:#f0fdf4;border-left:3px solid #16a34a;padding:14px 18px;margin:20px 0;border-radius:0 6px 6px 0">
          <p style="margin:0;font-size:13px;color:#14532d;line-height:1.5">
            ℹ️ <strong>Vos données restent conservées.</strong> Si votre compte est réactivé,
            vous retrouverez votre espace exactement comme vous l'avez laissé.
          </p>
        </div>
        <p style="margin:20px 0 0;color:#6b7280;font-size:14px;line-height:1.6">
          Pour toute question ou demande de réactivation, écrivez-nous à
          <a href="mailto:contact@athenis360.com" style="color:#1a3a2a">contact@athenis360.com</a>.
        </p>
        <p style="margin:20px 0 0;color:#9ca3af;font-size:13px">
          L'équipe Athenis
        </p>
      `,
    }),
  })
}

// ── 8c. Compte supprimé définitivement ───────────────────────────────────────

export async function sendAccountDeletedEmail(
  to: string,
  opts: { firstName?: string | null; reason?: string | null },
): Promise<void> {
  const greeting = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : 'Bonjour,'
  const reason   = opts.reason?.trim()

  await sendMail({
    to,
    subject: 'Confirmation : votre compte Athenis a été supprimé',
    text: [
      `Bonjour,`,
      ``,
      `Votre compte Athenis a été définitivement supprimé.`,
      reason ? `\nRaison : ${reason}\n` : '',
      `Toutes vos données personnelles ont été effacées de nos systèmes.`,
      `Conformément à nos obligations légales OHADA et françaises, les données comptables sont conservées 10 ans dans un format anonymisé.`,
      ``,
      `Nous sommes désolés de vous voir partir. Si vous avez un retour à nous faire pour améliorer Athenis, écrivez à contact@athenis360.com.`,
      ``,
      `L'équipe Athenis`,
    ].filter(Boolean).join('\n'),
    html: emailLayout({
      preheader: 'Confirmation de la suppression de votre compte Athenis.',
      headerColor: '#6b7280',
      headerSubtitle: 'Suppression de compte',
      bodyHtml: `
        <p style="margin:0 0 8px;color:#374151;font-size:15px">${greeting}</p>
        <h1 style="margin:0 0 14px;font-size:20px;color:#111827;line-height:1.3">
          Votre compte a été supprimé
        </h1>
        <p style="margin:0 0 16px;color:#6b7280;line-height:1.6;font-size:14px">
          Conformément à votre demande ou à notre politique, votre compte Athenis a été
          <strong>définitivement supprimé</strong> de nos systèmes.
        </p>
        ${reason ? `
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:20px 0">
          <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">Raison</p>
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6">${escapeHtml(reason)}</p>
        </div>
        ` : ''}
        <div style="background:#eff6ff;border-left:3px solid #2563eb;padding:14px 18px;margin:20px 0;border-radius:0 6px 6px 0">
          <p style="margin:0 0 6px;font-size:13px;color:#1e3a8a;font-weight:600">📋 Conservation légale des données comptables</p>
          <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.5">
            Conformément aux obligations légales OHADA (Acte uniforme révisé 2017) et françaises
            (Code de commerce, art. L123-22), vos données comptables sont conservées
            <strong>10 ans dans un format anonymisé</strong> et chiffré. Vos données personnelles
            (e-mail, téléphone, etc.) ont été effacées immédiatement.
          </p>
        </div>
        <p style="margin:20px 0 0;color:#6b7280;font-size:14px;line-height:1.6">
          Nous sommes désolés de vous voir partir. Si vous avez un retour à nous faire pour améliorer
          Athenis — réponse ou suggestion — écrivez-nous à
          <a href="mailto:contact@athenis360.com" style="color:#1a3a2a">contact@athenis360.com</a>.
        </p>
        <p style="margin:20px 0 0;color:#9ca3af;font-size:13px">
          Bonne continuation,<br>
          L'équipe Athenis
        </p>
      `,
    }),
  })
}

// ── 8d. Impersonation d\'un compte par un SUPER_ADMIN ─────────────────────────
// Transparence RGPD : le user est notifié quand un admin se connecte avec son compte.

export async function sendImpersonationStartedEmail(
  to: string,
  opts: { firstName?: string | null; adminEmail: string; startedAt: Date },
): Promise<void> {
  const greeting = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : 'Bonjour,'
  const when     = opts.startedAt.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })
  const admin    = escapeHtml(opts.adminEmail)

  await sendMail({
    to,
    subject: 'Accès administrateur à votre compte Athenis',
    text: [
      `Bonjour,`,
      ``,
      `Pour des raisons techniques (support, vérification de configuration), un administrateur Athenis vient d'accéder temporairement à votre compte.`,
      ``,
      `Date    : ${when}`,
      `Admin   : ${opts.adminEmail}`,
      ``,
      `Cette session expire automatiquement après 30 minutes. Toutes les actions effectuées pendant cette période sont tracées dans le journal d'audit.`,
      ``,
      `Si vous estimez que cet accès n'est pas justifié, contactez-nous immédiatement à dpo@athenis360.com.`,
      ``,
      `L'équipe Athenis`,
    ].join('\n'),
    html: emailLayout({
      preheader: 'Un administrateur a accédé à votre compte pour des raisons techniques.',
      headerColor: '#0369a1',
      headerSubtitle: '🛡️ Accès administrateur',
      bodyHtml: `
        <p style="margin:0 0 8px;color:#374151;font-size:15px">${greeting}</p>
        <h1 style="margin:0 0 14px;font-size:20px;color:#111827;line-height:1.3">
          Un administrateur a accédé à votre compte
        </h1>
        <p style="margin:0 0 16px;color:#6b7280;line-height:1.6;font-size:14px">
          Pour des raisons techniques (support, vérification de configuration, debug),
          un administrateur Athenis vient d'accéder temporairement à votre compte.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin:16px 0">
          <tr><td style="padding:12px 16px;border-bottom:1px solid #bfdbfe;font-size:13px;color:#1e40af">Date</td><td style="padding:12px 16px;border-bottom:1px solid #bfdbfe;font-size:13px;color:#1e3a8a;font-weight:600">${escapeHtml(when)}</td></tr>
          <tr><td style="padding:12px 16px;font-size:13px;color:#1e40af">Administrateur</td><td style="padding:12px 16px;font-size:13px;color:#1e3a8a;font-family:monospace">${admin}</td></tr>
        </table>

        <div style="background:#f0fdf4;border-left:3px solid #16a34a;padding:14px 18px;margin:20px 0;border-radius:0 6px 6px 0">
          <p style="margin:0;font-size:13px;color:#14532d;line-height:1.5">
            ℹ️ <strong>Session limitée à 30 minutes</strong> — toutes les actions sont tracées dans
            notre journal d'audit. Vous restez le seul propriétaire de vos données.
          </p>
        </div>

        <div style="background:#fef2f2;border-left:3px solid #dc2626;padding:14px 18px;margin:20px 0;border-radius:0 6px 6px 0">
          <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.5">
            <strong>Vous n'avez pas demandé cet accès ?</strong> Écrivez immédiatement à
            <a href="mailto:dpo@athenis360.com" style="color:#7f1d1d;font-weight:600">dpo@athenis360.com</a>.
          </p>
        </div>

        <p style="margin:20px 0 0;color:#9ca3af;font-size:13px">
          L'équipe Athenis
        </p>
      `,
    }),
  })
}

// ── 9. Notification interne au SUPER_ADMIN ────────────────────────────────────

export async function sendAdminNewSignupNotification(opts: {
  adminEmail: string
  userEmail: string
  userFirstName: string
  accountType: string
  companyName?: string | null
  country?: string | null
}): Promise<void> {
  const pendingUrl = `${env.frontendUrl}/admin/users/pending`
  const safePending = escapeHtml(pendingUrl)
  const safeEmail   = escapeHtml(opts.userEmail)
  const safeName    = escapeHtml(opts.userFirstName)
  const safeCompany = escapeHtml(opts.companyName ?? '—')
  const safeCountry = escapeHtml(opts.country ?? '—')
  const safeType    = escapeHtml(opts.accountType)

  await sendMail({
    to: opts.adminEmail,
    subject: `[Athenis admin] Nouvelle inscription à valider : ${opts.userEmail}`,
    text: [
      `Nouvelle demande d'inscription en attente de validation :`,
      ``,
      `Email      : ${opts.userEmail}`,
      `Nom        : ${opts.userFirstName}`,
      `Type       : ${opts.accountType}`,
      `Entreprise : ${opts.companyName ?? '—'}`,
      `Pays       : ${opts.country ?? '—'}`,
      ``,
      `Valider depuis : ${pendingUrl}`,
    ].join('\n'),
    html: emailLayout({
      preheader: `Nouvelle inscription en attente : ${opts.userEmail}`,
      headerColor: '#7c3aed',
      headerSubtitle: '🔔 Action requise',
      bodyHtml: `
        <h1 style="margin:0 0 16px;font-size:18px;color:#111827">Nouvelle demande d'inscription</h1>
        <p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.6">
          Un nouvel utilisateur vient de confirmer son adresse e-mail et attend votre validation.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:16px 0">
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280">Email</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;font-weight:600">${safeEmail}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280">Nom</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827">${safeName}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280">Type de compte</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827">${safeType}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280">Entreprise</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827">${safeCompany}</td></tr>
          <tr><td style="padding:12px 16px;font-size:13px;color:#6b7280">Pays</td><td style="padding:12px 16px;font-size:13px;color:#111827">${safeCountry}</td></tr>
        </table>
        ${ctaButton(pendingUrl, 'Examiner la demande', '#7c3aed')}
        <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;word-break:break-all">
          Lien : <a href="${safePending}" style="color:#7c3aed">${safePending}</a>
        </p>
      `,
    }),
  })
}
