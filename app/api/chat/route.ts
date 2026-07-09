/**
 * POST /api/chat
 * --------------
 * Streaming backend for the live "chat" blocks that Gemini embeds in
 * generated layouts. Each chat block carries a `persona` — the specialist
 * system prompt Gemini wrote for that exact interface — so every embedded
 * assistant is a true domain expert, not a generic bot.
 *
 * Returns a plain text stream the client appends token-by-token.
 */

import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { withGeminiModel } from '@/lib/gemini'

export const maxDuration = 60

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: Request) {
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

  // generateText (not streamText) so quota errors surface BEFORE we commit
  // to a response, letting the model chain retry on flash-lite. The client
  // reads the body as a stream either way — it just arrives as one chunk.
  try {
    const { text } = await withGeminiModel((modelId) =>
      generateText({
        model: google(modelId),
        system,
        messages,
        maxRetries: 0,
      }),
    )

    return new Response(text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error) {
    console.error('Chat generation failed:', error)
    return Response.json({ error: 'Chat unavailable' }, { status: 500 })
  }
}
