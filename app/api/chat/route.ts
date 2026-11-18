import { rejectRemote } from '@/lib/local-request'
import { chatgptError, complete } from '@/lib/chatgpt'

export const maxDuration = 100

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: Request) {
  const rejected = rejectRemote(req)
  if (rejected) return rejected

  let persona = ''
  let context = ''
  let messages: ChatMessage[] = []

  try {
    const body = await req.json()
    persona = typeof body?.persona === 'string' ? body.persona.slice(0, 2000) : ''
    context = typeof body?.context === 'string' ? body.context.slice(0, 500) : ''
    if (Array.isArray(body?.messages)) {
      messages = body.messages
        .filter(
          (m: unknown): m is ChatMessage =>
            !!m &&
            typeof m === 'object' &&
            ((m as ChatMessage).role === 'user' ||
              (m as ChatMessage).role === 'assistant') &&
            typeof (m as ChatMessage).content === 'string',
        )
        .slice(-20) // cap history to keep requests light
        .map((m: ChatMessage) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    }
  } catch {
    // validated below
  }

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return Response.json({ error: 'Missing user message' }, { status: 400 })
  }

  const system = `${persona || 'You are a helpful specialist assistant.'}

You are embedded inside a generated glass interface${context ? ` titled "${context}"` : ''}. Keep replies concise (1-4 short paragraphs, plain text — no markdown headings or code fences unless asked). Be concrete and genuinely useful in your specialty.`

  try {
    const text = await complete(req, messages, system)
    return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  } catch (error) {
    return chatgptError(error, 'ChatGPT could not answer. Try again.')
  }
}
