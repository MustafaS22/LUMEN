/**
 * POST /api/code — writes a REAL runnable app.
 *
 * Body: { spec: string, code?: string, instruction?: string }
 *  - spec only:            generate a complete single-file web app from scratch
 *  - code + instruction:   modify the existing code per the instruction
 *
 * Returns text/plain: a complete HTML document, renderable directly in a
 * sandboxed <iframe srcDoc>. Single-file keeps it instantly previewable.
 */

import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { withGeminiModel } from '@/lib/gemini'

export const maxDuration = 60

const SYSTEM = `You are an expert web developer. You write COMPLETE, WORKING, self-contained single-file web apps.

Hard rules:
- Output ONLY the code: a full HTML document starting with <!DOCTYPE html>. No markdown fences, no commentary.
- Everything inline: <style> for CSS, <script> for JS. No external resources, libraries, CDNs, fonts, or images (draw with CSS/canvas/SVG/emoji instead).
- The app must actually work on first load. Wire up ALL interactions. No placeholders, no TODOs.
- Games: implement the full loop — input (support both keyboard AND touch buttons), update, render, score, game-over, restart.
- Make it look genuinely good: dark background (#0b0d12), modern spacing, rounded corners, cyan (#5ec8e8) accents. It renders inside a dark glass UI.
- Keep it under 400 lines. Prefer canvas for games.`

export async function POST(req: Request) {
  let body: { spec?: string; code?: string; instruction?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const spec = typeof body.spec === 'string' ? body.spec.slice(0, 2000) : ''
  const code = typeof body.code === 'string' ? body.code.slice(0, 60000) : ''
  const instruction =
    typeof body.instruction === 'string' ? body.instruction.slice(0, 1000) : ''

  if (!spec && !(code && instruction)) {
    return Response.json({ error: 'Missing spec' }, { status: 400 })
  }

  const prompt =
    code && instruction
      ? `Here is the current app code:\n\n${code}\n\nModify it per this instruction, returning the COMPLETE updated file: ${instruction}`
      : `Build this app: ${spec}`

  try {
    const { text } = await withGeminiModel((modelId) =>
      generateText({
        model: google(modelId),
        system: SYSTEM,
        prompt,
        maxRetries: 0,
      }),
    )

    // Strip accidental markdown fences and anything before <!DOCTYPE.
    let out = text.trim()
    out = out.replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '')
    const docStart = out.search(/<!DOCTYPE html/i)
    if (docStart > 0) out = out.slice(docStart)
    if (!/^<!DOCTYPE html/i.test(out) && !/^<html/i.test(out)) {
      throw new Error('Model did not return an HTML document')
    }

    return new Response(out, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error) {
    console.error('Code generation failed:', error)
    return Response.json({ error: 'Code generation unavailable' }, { status: 500 })
  }
}
