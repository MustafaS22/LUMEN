/**
 * POST /api/music — REAL music composition.
 *
 * Gemini composes a structured multi-track piece (tempo, tracks, notes as
 * MIDI pitch + beat timings). The client synthesizes it live with WebAudio.
 *
 * Body: { spec: string }
 * Returns: { composition: Composition }
 */

import { generateText, Output } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { withGeminiModel } from '@/lib/gemini'

export const maxDuration = 60

const noteSchema = z.object({
  p: z.coerce.number().describe('MIDI pitch 21-108 (60 = middle C)'),
  t: z.coerce.number().describe('Start time in beats from 0'),
  d: z.coerce.number().describe('Duration in beats'),
})

const trackSchema = z.object({
  name: z.string().describe('Track role, e.g. "Lead", "Bass", "Arp"'),
  wave: z
    .enum(['sine', 'square', 'sawtooth', 'triangle'])
    .describe('Oscillator timbre'),
  volume: z.coerce.number().describe('0.1 to 1'),
  notes: z.array(noteSchema).describe('The actual notes of this track'),
})

const compositionSchema = z.object({
  title: z.string(),
  bpm: z.coerce.number().describe('Tempo, 60-180'),
  bars: z.coerce.number().describe('Length in 4-beat bars, 4-16'),
  tracks: z.array(trackSchema).describe('2-4 tracks'),
})

export type Composition = z.infer<typeof compositionSchema>

const SYSTEM = `You are a skilled composer. Compose a REAL piece of music as structured note data.

Composition craft:
- Write in a coherent key and scale. Use interesting chord progressions (e.g. i-VI-III-VII for moody, I-V-vi-IV for uplifting).
- 3 tracks minimum: a melodic lead with phrasing (not constant eighth notes — use rests and varied durations), a bass line following the chord roots, and a harmony/arp track.
- The piece should loop cleanly: end where it can restart naturally.
- Match the requested genre and mood through tempo, scale, timbre, and rhythm.
- 8 bars minimum. Fill ALL bars with notes — no empty stretches.
- Keep total notes under 220.`

export async function POST(req: Request) {
  let body: { spec?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const spec = typeof body.spec === 'string' ? body.spec.trim().slice(0, 1000) : ''
  if (!spec) {
    return Response.json({ error: 'Missing spec' }, { status: 400 })
  }

  try {
    const { output } = await withGeminiModel((modelId) =>
      generateText({
        model: google(modelId),
        output: Output.object({ schema: compositionSchema }),
        system: SYSTEM,
        prompt: `Compose: ${spec}`,
        maxRetries: 0,
      }),
    )

    // Sanity clamp — keep playback well-behaved regardless of model output.
    const composition: Composition = {
      title: output.title,
      bpm: Math.min(200, Math.max(50, output.bpm)),
      bars: Math.min(16, Math.max(2, output.bars)),
      tracks: output.tracks.slice(0, 4).map((tr) => ({
        name: tr.name,
        wave: tr.wave,
        volume: Math.min(1, Math.max(0.05, tr.volume)),
        notes: tr.notes
          .filter((n) => Number.isFinite(n.p) && Number.isFinite(n.t) && n.d > 0)
          .slice(0, 300)
          .map((n) => ({
            p: Math.min(108, Math.max(21, Math.round(n.p))),
            t: Math.max(0, n.t),
            d: Math.min(8, Math.max(0.05, n.d)),
          })),
      })),
    }

    if (!composition.tracks.some((t) => t.notes.length > 0)) {
      throw new Error('Empty composition')
    }

    return Response.json({ composition })
  } catch (error) {
    console.error('Music composition failed:', error)
    return Response.json({ error: 'Composition unavailable' }, { status: 500 })
  }
}
