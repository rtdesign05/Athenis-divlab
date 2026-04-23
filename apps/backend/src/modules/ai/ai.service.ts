import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../lib/prisma.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Company context builder ───────────────────────────────────────────────────
async function buildContext(companyId: string): Promise<string> {
  const now   = new Date()
  const y     = now.getFullYear()
  const m     = now.getMonth()
  const start = new Date(y, m, 1)
  const end   = new Date(y, m + 1, 0)

  const [company, invoices, overdueInvoices, pendingLeaves, openAlerts, employees, esgData] =
    await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { name: true, secteur: true, taille: true } }),
      prisma.invoice.aggregate({
        where: { companyId, issueDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
        _sum: { total: true }, _count: true,
      }),
      prisma.invoice.findMany({
        where: { companyId, status: 'OVERDUE' },
        select: { number: true, total: true, dueDate: true },
        orderBy: { dueDate: 'asc' }, take: 5,
      }),
      prisma.leaveRequest.count({ where: { companyId, status: 'PENDING' } }),
      prisma.legalAlert.findMany({
        where: { companyId, status: 'OPEN' },
        select: { title: true, severity: true },
        orderBy: { severity: 'desc' }, take: 5,
      }),
      prisma.employee.count({ where: { companyId, endDate: null } }),
      prisma.eSGData.findFirst({ where: { companyId }, orderBy: { year: 'desc' }, select: { year: true, scope1Total: true, scope2Total: true, scope3Total: true } }),
    ])

  const caMonth  = Number(invoices._sum.total ?? 0)
  const overdueTxt = overdueInvoices.length
    ? overdueInvoices.map(i => `  • ${i.number} — ${Number(i.total).toFixed(2)} € (échue le ${new Date(i.dueDate).toLocaleDateString('fr-FR')})`).join('\n')
    : '  Aucune facture en retard'

  const alertsTxt = openAlerts.length
    ? openAlerts.map(a => `  • [${a.severity}] ${a.title}`).join('\n')
    : '  Aucune alerte ouverte'

  const co2 = esgData
    ? `${(Number(esgData.scope1Total ?? 0) + Number(esgData.scope2Total ?? 0) + Number(esgData.scope3Total ?? 0)).toFixed(1)} tCO2e (${esgData.year})`
    : 'Non renseigné'

  return `
=== CONTEXTE ENTREPRISE ===
Nom : ${company?.name ?? 'N/A'}
Secteur : ${company?.secteur ?? 'N/A'} | Taille : ${company?.taille ?? 'N/A'}
Employés actifs : ${employees}

=== GESTION / FACTURATION ===
CA mois en cours (${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}) : ${caMonth.toFixed(2)} € (${invoices._count} factures)
Factures en retard (${overdueInvoices.length}) :
${overdueTxt}

=== RH ===
Demandes de congés en attente : ${pendingLeaves}

=== JURIDIQUE ===
Alertes juridiques ouvertes (${openAlerts.length}) :
${alertsTxt}

=== ESG ===
Empreinte carbone totale : ${co2}
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

// ── Conversation CRUD ─────────────────────────────────────────────────────────
export async function listConversations(companyId: string) {
  return prisma.aiConversation.findMany({
    where: { companyId },
    select: {
      id: true, title: true, createdAt: true, updatedAt: true,
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  })
}

export async function getConversation(companyId: string, id: string) {
  return prisma.aiConversation.findFirst({
    where: { id, companyId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
}

export async function deleteConversation(companyId: string, id: string) {
  const existing = await prisma.aiConversation.findFirst({ where: { id, companyId } })
  if (!existing) return null
  return prisma.aiConversation.delete({ where: { id } })
}

// ── Chat (streaming) ──────────────────────────────────────────────────────────
export async function streamChat(
  companyId: string,
  conversationId: string | undefined,
  userMessage: string,
  onToken: (token: string) => void,
): Promise<{ conversationId: string; inputTokens: number; outputTokens: number }> {
  // Get or create conversation
  let conv = conversationId
    ? await prisma.aiConversation.findFirst({ where: { id: conversationId, companyId }, include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } } })
    : null

  if (!conv) {
    conv = await prisma.aiConversation.create({
      data: {
        companyId,
        title: userMessage.slice(0, 60) + (userMessage.length > 60 ? '…' : ''),
      },
      include: { messages: true },
    })
  }

  // Build message history for API
  const history = (conv.messages ?? []).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Save user message
  await prisma.aiMessage.create({
    data: { conversationId: conv.id, role: 'user', content: userMessage },
  })

  // Build context and system prompt
  const context = await buildContext(companyId)
  const system  = buildSystemPrompt(context)

  // Stream from Anthropic
  let fullResponse = ''
  let inputTokens  = 0
  let outputTokens = 0

  const stream = await client.messages.stream({
    model:      'claude-haiku-4-5-20251001',
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
  await prisma.aiMessage.create({
    data: {
      conversationId: conv.id,
      role:         'assistant',
      content:      fullResponse,
      inputTokens,
      outputTokens,
    },
  })

  // Update conversation title from first exchange if still default
  if (conv.title === 'Nouvelle conversation' || (conv.messages ?? []).length === 0) {
    await prisma.aiConversation.update({
      where: { id: conv.id },
      data:  { title: userMessage.slice(0, 60) + (userMessage.length > 60 ? '…' : '') },
    })
  }

  return { conversationId: conv.id, inputTokens, outputTokens }
}
