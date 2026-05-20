import type { Request, Response, NextFunction } from 'express'
import * as billingService from './billing.service.js'
import { AppError } from '../../middleware/errorHandler.js'
import { prisma } from '../../lib/prisma.js'

function requireCompanyId(req: Request): string {
  const companyId = req.user?.companyId
  if (!companyId) throw new AppError('Aucune entreprise rattachée à ce compte.', 400, 'NO_COMPANY')
  return companyId
}

export async function getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await billingService.getBillingStatus(requireCompanyId(req))
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function createCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = requireCompanyId(req)
    const { plan, interval, provider } = req.body as { plan?: string; interval?: string; provider?: string }

    if (plan !== 'STARTER' && plan !== 'PRO' && plan !== 'PREMIUM') {
      res.status(400).json({ success: false, error: 'Plan invalide', code: 'INVALID_PLAN' }); return
    }
    if (interval !== 'MONTHLY' && interval !== 'YEARLY') {
      res.status(400).json({ success: false, error: 'Intervalle invalide', code: 'INVALID_INTERVAL' }); return
    }
    if (provider !== 'STRIPE' && provider !== 'CINETPAY') {
      res.status(400).json({ success: false, error: 'Provider invalide', code: 'INVALID_PROVIDER' }); return
    }

    // Récupère l'email + nom du user pour pré-remplir le checkout
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.sub },
      select: { email: true, nom: true, prenom: true },
    })

    const result = await billingService.createCheckout({
      companyId,
      plan, interval, provider,
      customerEmail: user.email,
      customerName:  `${user.nom}${user.prenom ? ' ' + user.prenom : ''}`,
      customerPhone: typeof req.body.phone === 'string' ? req.body.phone : undefined,
    })

    res.json({ success: true, data: result })
  } catch (err) { next(err) }
}

export async function getPortalUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await billingService.getCustomerPortalUrl(requireCompanyId(req))
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await billingService.cancelSubscription(requireCompanyId(req))
    res.json({ success: true, data: null })
  } catch (err) { next(err) }
}

// ── Webhooks (public — pas de auth, vérification par signature) ─────────────

export async function stripeWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sig = req.headers['stripe-signature'] as string | undefined
    if (!sig) { res.status(400).send('Missing signature'); return }
    // req.body doit être le raw body (pas parsé en JSON) — voir router
    const result = await billingService.handleStripeWebhook(req.body, sig)
    res.json(result)
  } catch (err) { next(err) }
}

export async function cinetpayWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const result = await billingService.handleCinetpayWebhook(payload, rawBody)
    res.json(result)
  } catch (err) { next(err) }
}

// ── Vérification post-redirect (le user revient sur /billing/success) ──────

export async function verifySession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = await billingService.getBillingStatus(requireCompanyId(req))
    res.json({ success: true, data: status })
  } catch (err) { next(err) }
}
