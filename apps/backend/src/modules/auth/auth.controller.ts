import type { Request, Response, NextFunction } from 'express'
import * as authService from './auth.service.js'

function clientIp(req: Request): string {
  return String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0]?.trim() ?? 'unknown'
}

function userAgent(req: Request): string {
  return req.headers['user-agent'] ?? 'unknown'
}

export async function acceptInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token    = String(req.params['token'])
    const password = String(req.body.password ?? '')
    if (!password || password.length < 8) {
      res.status(400).json({ success: false, error: 'Le mot de passe doit contenir au moins 8 caractères', code: 'PASSWORD_TOO_SHORT' })
      return
    }
    const { refreshToken, ...data } = await authService.acceptInvitation(token, password, clientIp(req), userAgent(req))
    authService.setRefreshCookie(res, refreshToken)
    res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { response, refreshToken, requiresEmailVerification } = await authService.register(req.body, clientIp(req), userAgent(req))
    if (refreshToken) authService.setRefreshCookie(res, refreshToken)
    res.status(201).json({ success: true, data: { ...response, requiresEmailVerification } })
  } catch (err) {
    next(err)
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = String(req.query['token'] ?? '')
    if (!token) {
      res.status(400).json({ success: false, error: 'Token manquant', code: 'TOKEN_MISSING' })
      return
    }
    const { response, refreshToken } = await authService.verifyEmail(token, clientIp(req), userAgent(req))
    // Phase de test : verifyEmail ne renvoie pas de token (l'admin doit approuver d'abord)
    if (refreshToken) authService.setRefreshCookie(res, refreshToken)
    res.json({ success: true, data: response })
  } catch (err) {
    next(err)
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = String(req.body.email ?? '')
    if (!email) {
      res.status(400).json({ success: false, error: 'Email requis', code: 'EMAIL_REQUIRED' })
      return
    }
    await authService.resendVerification(email)
    res.json({ success: true, data: null })
  } catch (err) {
    next(err)
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { response, refreshToken } = await authService.login(req.body, clientIp(req), userAgent(req))
    if (refreshToken) authService.setRefreshCookie(res, refreshToken)
    res.json({ success: true, data: response })
  } catch (err) {
    next(err)
  }
}

export async function loginVerifyTotp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { response, refreshToken } = await authService.loginVerifyTotp(
      req.body.tempToken,
      req.body.code,
      clientIp(req),
      userAgent(req),
    )
    authService.setRefreshCookie(res, refreshToken)
    res.json({ success: true, data: response })
  } catch (err) {
    next(err)
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken: string = req.cookies['refreshToken'] ?? ''
    if (!rawToken) {
      res.status(401).json({ success: false, error: 'No refresh token', code: 'TOKEN_MISSING' })
      return
    }
    const { refreshToken, ...data } = await authService.refreshAccessToken(rawToken)
    authService.setRefreshCookie(res, refreshToken)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken: string = req.cookies['refreshToken'] ?? ''
    await authService.logout(rawToken, req.user!.sub, req.user!.companyId, clientIp(req), userAgent(req))
    res.clearCookie('refreshToken', { path: '/api/auth' })
    res.json({ success: true, data: null })
  } catch (err) {
    next(err)
  }
}

export async function totpStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const enabled = await authService.getTotpStatus(req.user!.sub)
    res.json({ success: true, data: { enabled } })
  } catch (err) {
    next(err)
  }
}

export async function setupTotp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await authService.setupTotp(req.user!.sub)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function enableTotp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await authService.enableTotp(req.user!.sub, req.body, clientIp(req), userAgent(req))
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function disableTotp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.disableTotp(req.user!.sub, req.body, clientIp(req), userAgent(req))
    res.json({ success: true, data: null })
  } catch (err) {
    next(err)
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.changePassword(req.user!.sub, req.body, clientIp(req), userAgent(req))
    res.clearCookie('refreshToken', { path: '/api/auth' })
    res.json({ success: true, data: null })
  } catch (err) {
    next(err)
  }
}

// ── MFA multi-méthode (EMAIL / SMS) ──────────────────────────────────────────

export async function mfaStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await authService.getMfaStatus(req.user!.sub)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function setupEmailMfa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await authService.setupEmailMfa(req.user!.sub, clientIp(req), userAgent(req))
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function setupSmsMfa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const phone = String(req.body?.phone ?? '').trim()
    if (!phone) {
      res.status(400).json({ success: false, error: 'Numéro de téléphone requis', code: 'PHONE_REQUIRED' })
      return
    }
    const data = await authService.setupSmsMfa(req.user!.sub, phone, clientIp(req), userAgent(req))
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function verifyMfaSetup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const method = String(req.body?.method ?? '').toUpperCase()
    const code   = String(req.body?.code ?? '').trim()
    if (method !== 'EMAIL' && method !== 'SMS') {
      res.status(400).json({ success: false, error: 'Méthode invalide', code: 'INVALID_METHOD' })
      return
    }
    if (!/^\d{6}$/.test(code)) {
      res.status(400).json({ success: false, error: 'Code à 6 chiffres requis', code: 'INVALID_CODE_FORMAT' })
      return
    }
    const data = await authService.verifyMfaSetup(req.user!.sub, method as 'EMAIL' | 'SMS', code, clientIp(req), userAgent(req))
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function disableMfa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const password = String(req.body?.password ?? '')
    const code     = String(req.body?.code ?? '').trim()
    if (!password || !code) {
      res.status(400).json({ success: false, error: 'Mot de passe et code requis', code: 'MISSING_FIELDS' })
      return
    }
    await authService.disableMfa(req.user!.sub, password, code, clientIp(req), userAgent(req))
    res.json({ success: true, data: null })
  } catch (err) { next(err) }
}

export async function sendMfaLoginCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await authService.sendMfaLoginCode(req.user!.sub, clientIp(req), userAgent(req))
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function loginVerifyMfaCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tempToken = String(req.body?.tempToken ?? '')
    const code      = String(req.body?.code ?? '').trim()
    if (!tempToken || !/^\d{6}$/.test(code)) {
      res.status(400).json({ success: false, error: 'tempToken et code à 6 chiffres requis', code: 'BAD_REQUEST' })
      return
    }
    const { response, refreshToken } = await authService.loginVerifyMfaCode(tempToken, code, clientIp(req), userAgent(req))
    authService.setRefreshCookie(res, refreshToken)
    res.json({ success: true, data: response })
  } catch (err) { next(err) }
}
