import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { aiLimiter } from '../../middleware/rateLimiter.js'
import { getCompanyId } from '../../lib/companyContext.js'
import * as svc from './ai.service.js'

export const aiRouter = Router()
aiRouter.use(authenticate)

// ── Conversations list ────────────────────────────────────────────────────────
aiRouter.get('/conversations', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.listConversations(getCompanyId(req)) })
  } catch (e) { next(e) }
})

aiRouter.get('/conversations/:id', async (req, res, next) => {
  try {
    const data = await svc.getConversation(getCompanyId(req), req.params.id!)
    if (!data) return res.status(404).json({ success: false, error: 'Not found' })
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

aiRouter.delete('/conversations/:id', async (req, res, next) => {
  try {
    await svc.deleteConversation(getCompanyId(req), req.params.id!)
    res.json({ success: true, data: null })
  } catch (e) { next(e) }
})

// ── Streaming chat (SSE) ──────────────────────────────────────────────────────
// N22 : limiteur dédié pour éviter qu'un user fasse exploser la facture Anthropic.
aiRouter.post('/chat', aiLimiter, async (req, res, next) => {
  try {
    const { message, conversationId } = req.body as { message: string; conversationId?: string }

    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: 'Message requis' })
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ success: false, error: 'ANTHROPIC_API_KEY non configurée' })
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    const { conversationId: convId, inputTokens, outputTokens } = await svc.streamChat(
      getCompanyId(req),
      conversationId,
      message.trim(),
      (token) => send('token', { token }),
    )

    send('done', { conversationId: convId, inputTokens, outputTokens })
    res.end()
  } catch (e) {
    // Try to send error via SSE if headers not yet sent
    if (!res.headersSent) return next(e)
    res.write(`event: error\ndata: ${JSON.stringify({ message: 'Erreur lors de la génération' })}\n\n`)
    res.end()
  }
})
