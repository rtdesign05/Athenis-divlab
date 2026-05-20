import { Router } from 'express'
import express from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import * as ctrl from './billing.controller.js'

export const billingRouter = Router()

// Webhooks publics — pas d'auth, vérification par signature
// IMPORTANT : Stripe a besoin du raw body pour vérifier la signature HMAC.
// On utilise express.raw() pour ne PAS parser en JSON sur cette route uniquement.
billingRouter.post('/webhook/stripe', express.raw({ type: 'application/json' }), ctrl.stripeWebhook)

// CinetPay envoie en x-www-form-urlencoded OU JSON selon config
billingRouter.post('/webhook/cinetpay', express.json({ limit: '50kb' }), express.urlencoded({ extended: true }), ctrl.cinetpayWebhook)

// Routes authentifiées
billingRouter.use(authenticate)

billingRouter.get('/status',           ctrl.getStatus)
billingRouter.post('/checkout',        ctrl.createCheckout)
billingRouter.post('/portal',          ctrl.getPortalUrl)
billingRouter.post('/cancel',          ctrl.cancelSubscription)
billingRouter.get('/verify-session',   ctrl.verifySession)
