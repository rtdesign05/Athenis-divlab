import React, { useState, useRef, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { tokenStore } from '@/lib/tokenStore'

interface Message {
  id:      string
  role:    'user' | 'assistant'
  content: string
  pending?: boolean
}

interface Conversation {
  id:           string
  title:        string
  updatedAt:    string
  _count:       { messages: number }
}

const d = <T,>(r: { data: { data: T } }) => r.data.data

async function fetchConversations(): Promise<Conversation[]> {
  return api.get<{ data: Conversation[] }>('/ai/conversations').then(d)
}

async function fetchConversation(id: string): Promise<{ messages: Message[] }> {
  return api.get<{ data: { messages: Message[] } }>(`/ai/conversations/${id}`).then(d)
}


const SUGGESTED = [
  'Analyse mes factures en retard et donne-moi des conseils',
  'Quelles sont mes obligations légales prioritaires ce mois ?',
  'Comment améliorer mon score ESG rapidement ?',
  'Fais-moi un résumé de la situation RH de mon entreprise',
  'Quels sont mes risques financiers actuels ?',
  'Comment optimiser ma TVA sur le trimestre ?',
]

function MarkdownText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = []
  text.split('\n').forEach((line, li) => {
    if (li > 0) nodes.push(<br key={`br-${li}`} />)
    const display = line.startsWith('• ') ? line : line
    display.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).forEach((seg, si) => {
      const key = `${li}-${si}`
      if (seg.startsWith('**') && seg.endsWith('**')) nodes.push(<strong key={key}>{seg.slice(2, -2)}</strong>)
      else if (seg.startsWith('*') && seg.endsWith('*')) nodes.push(<em key={key}>{seg.slice(1, -1)}</em>)
      else nodes.push(<React.Fragment key={key}>{seg}</React.Fragment>)
    })
  })
  return <span>{nodes}</span>
}

export function AiWidget() {
  const [open, setOpen]           = useState(false)
  const [view, setView]           = useState<'chat' | 'history'>('chat')
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [convId, setConvId]       = useState<string | undefined>()
  const [conversations, setConvos]= useState<Conversation[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => {
    if (open && view === 'history') {
      fetchConversations().then(setConvos).catch((err: unknown) => {
        console.error('Failed to fetch conversations:', err)
      })
    }
  }, [open, view])

  const loadConversation = async (id: string) => {
    try {
      const conv = await fetchConversation(id)
      setMessages(conv.messages.map(m => ({ ...m, id: m.id ?? Math.random().toString() })))
      setConvId(id)
      setView('chat')
    } catch (err: unknown) {
      console.error('Failed to load conversation:', err)
    }
  }

  const newConversation = () => {
    setMessages([])
    setConvId(undefined)
    setView('chat')
  }

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')
    setLoading(true)

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text }
    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', pending: true }

    setMessages(prev => [...prev, userMsg, assistantMsg])

    try {
      const baseUrl = (api.defaults.baseURL ?? '').replace(/\/$/, '')
      const token   = tokenStore.get() ?? ''

      const response = await fetch(`${baseUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, conversationId: convId }),
      })

      if (!response.ok || !response.body) {
        throw new Error('Erreur serveur')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6))
              if (payload.token !== undefined) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + payload.token }
                    : m
                ))
              }
              if (payload.conversationId) {
                setConvId(payload.conversationId)
              }
            } catch {}
          }
        }
      }

      setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, pending: false } : m))
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === assistantMsg.id
          ? { ...m, content: 'Désolé, une erreur est survenue. Vérifiez que ANTHROPIC_API_KEY est configurée.', pending: false }
          : m
      ))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [loading, convId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 shadow-lg hover:bg-blue-700 transition-all"
        title="Assistant IA Athenis">
        {open ? (
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[600px] w-[420px] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <div>
                <p className="text-sm font-semibold text-white">Athénis IA</p>
                <p className="text-xs text-blue-200">Assistant intelligent</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setView(v => v === 'chat' ? 'history' : 'chat')}
                className="rounded-lg p-1.5 text-blue-200 hover:bg-blue-500 hover:text-white transition-colors"
                title={view === 'chat' ? 'Historique' : 'Chat'}>
                {view === 'chat' ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h8" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                )}
              </button>
              <button
                onClick={newConversation}
                className="rounded-lg p-1.5 text-blue-200 hover:bg-blue-500 hover:text-white transition-colors"
                title="Nouvelle conversation">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* History view */}
          {view === 'history' ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {conversations.length === 0 ? (
                <p className="text-center text-sm text-gray-400 mt-8">Aucun historique</p>
              ) : conversations.map(conv => (
                <button key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-left hover:bg-blue-50 hover:border-blue-200 transition-colors">
                  <p className="text-sm font-medium text-gray-800 truncate">{conv.title}</p>
                  <p className="text-xs text-gray-400">
                    {conv._count.messages} messages · {new Date(conv.updatedAt).toLocaleDateString('fr-FR')}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-blue-50 p-3">
                      <p className="text-sm font-medium text-blue-900">Bonjour ! Je suis Athénis ✨</p>
                      <p className="text-xs text-blue-700 mt-1">Je connais le contexte de votre entreprise en temps réel. Que puis-je faire pour vous ?</p>
                    </div>
                    <p className="text-xs font-medium text-gray-400">Suggestions :</p>
                    <div className="space-y-1.5">
                      {SUGGESTED.map(s => (
                        <button key={s} onClick={() => sendMessage(s)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-600 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map(msg => (
                  <div key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}>
                      {msg.pending && !msg.content ? (
                        <div className="flex gap-1 py-1">
                          <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <MarkdownText text={msg.content} />
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-100 p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Posez votre question… (Entrée pour envoyer)"
                    disabled={loading}
                    className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none disabled:opacity-50"
                    style={{ maxHeight: '120px' }}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={loading || !input.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <p className="mt-1.5 text-center text-xs text-gray-400">
                  Propulsé par Claude · Shift+Entrée pour saut de ligne
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
