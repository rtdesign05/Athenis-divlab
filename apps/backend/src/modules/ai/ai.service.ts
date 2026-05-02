import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../lib/prisma.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// In-memory conversation store (aiConversation/aiMessage models don't exist in v2 schema)
interface Message { role: 'user' | 'assistant'; content: string; createdAt: Date }
interface Conversation { id: string; companyId: string; title: string; messages: Message[]; createdAt: Date; updatedAt: Date }
const conversationStore = new Map<string, Conversation>()

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ── Company context builder ───────────────────────────────────────────────────
async function buildContext(companyId: string): Promise<string> {
  const now   = new Date()
  const y     = now.getFullYear()
  const m     = now.getMonth()
  const start = new Date(y, m, 1)
  const end   = new Date(y, m + 1, 0)

  const [company, invoices, overdueInvoices, employees] =
    await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { nom: true, secteur: true, taille: true } }),
      prisma.invoice.aggregate({
        where: { companyId, issuedAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
        _sum: { amountTTC: true }, _count: true,
      }),
      prisma.invoice.findMany({
        where: { companyId, status: 'OVERDUE' },
        select: { reference: true, amountTTC: true, dueAt: true },
        orderBy: { dueAt: 'asc' }, take: 5,
      }),
      prisma.employee.count({ where: { companyId, dateFinContrat: null } }),
    ])

  const caMonth  = Number(invoices._sum?.amountTTC ?? 0)
  const overdueTxt = overdueInvoices.length
    ? overdueInvoices.map((i) =>
        `  • ${i.reference} — ${Number(i.amountTTC).toFixed(2)} (échue le ${i.dueAt ? new Date(i.dueAt).toLocaleDateString('fr-FR') : 'N/A'})`).join('\n')
    : '  Aucune facture en retard'

  return `
=== CONTEXTE ENTREPRISE ===
Nom : ${company?.nom ?? 'N/A'}
Secteur : ${company?.secteur ?? 'N/A'} | Taille : ${company?.taille ?? 'N/A'}
Employés actifs : ${employees}

=== GESTION / FACTURATION ===
CA mois en cours (${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}) : ${caMonth.toFixed(2)} (${invoices._count} factures)
Factures en retard (${overdueInvoices.length}) :
${overdueTxt}
===========================`
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(context: string): string {
  return `Tu es Athénis, l'assistant IA intégré à la plateforme de gestion d'entreprise Athenis.
Tu aides les dirigeants et équipes à comprendre leurs données financières, RH, juridiques et ESG.

Règles :
- Réponds toujours en français, de manière concise et professionnelle.
- Utilise les données de contexte pour personnaliser tes réponses.
- Si tu n'as pas l'information dans le contexte, dis-le clairement sans inventer.
- Propose des actions concrètes et actionnables.
- Pour les questions comptables/fiscales, rappelle que tu ne remplace pas un expert-comptable.
- Pour les questions juridiques, rappelle que tu ne remplace pas un avocat.
- Tu peux faire des calculs simples à partir des données fournies.

${context}`
}

// ── Conversation CRUD (in-memory) ─────────────────────────────────────────────
export async function listConversations(companyId: string) {
  const convs = [...conversationStore.values()]
    .filter(c => c.companyId === companyId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 20)
  return convs.map(c => ({
    id: c.id, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt,
    _count: { messages: c.messages.length },
  }))
}

export async function getConversation(companyId: string, id: string) {
  const conv = conversationStore.get(id)
  if (!conv || conv.companyId !== companyId) return null
  return conv
}

export async function deleteConversation(companyId: string, id: string) {
  const conv = conversationStore.get(id)
  if (!conv || conv.companyId !== companyId) return null
  conversationStore.delete(id)
  return conv
}

// ── Chat (streaming) ──────────────────────────────────────────────────────────
export async function streamChat(
  companyId: string,
  conversationId: string | undefined,
  userMessage: string,
  onToken: (token: string) => void,
): Promise<{ conversationId: string; inputTokens: number; outputTokens: number }> {
  // Get or create conversation
  let conv: Conversation | undefined = conversationId ? conversationStore.get(conversationId) : undefined
  if (!conv || conv.companyId !== companyId) {
    conv = {
      id:        genId(),
      companyId,
      title:     userMessage.slice(0, 60) + (userMessage.length > 60 ? '…' : ''),
      messages:  [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    conversationStore.set(conv.id, conv)
  }

  // Build message history for API
  const history = conv.messages.slice(-20).map((m) => ({
    role:    m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Save user message
  conv.messages.push({ role: 'user', content: userMessage, createdAt: new Date() })
  conv.updatedAt = new Date()

  // Build context and system prompt
  const context = await buildContext(companyId)
  const system  = buildSystemPrompt(context)

  // Stream from Anthropic
  let fullResponse = ''
  let inputTokens  = 0
  let outputTokens = 0

  const stream = await client.messages.stream({
    model:      'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    system,
    messages: [
      ...history,
      { role: 'user', content: userMessage },
    ],
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullResponse += event.delta.text
      onToken(event.delta.text)
    }
    if (event.type === 'message_delta' && event.usage) {
      outputTokens = event.usage.output_tokens
    }
    if (event.type === 'message_start' && event.message.usage) {
      inputTokens = event.message.usage.input_tokens
    }
  }

  // Save assistant response
  conv.messages.push({ role: 'assistant', content: fullResponse, createdAt: new Date() })
  conv.updatedAt = new Date()

  return { conversationId: conv.id, inputTokens, outputTokens }
}
