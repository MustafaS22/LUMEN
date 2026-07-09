/**
 * Generative Layout Engine
 * ------------------------
 * `generateLayout` calls the real Gemini backend (/api/generate). If the
 * backend is unreachable, the local blueprint engine below produces a
 * sensible layout so the experience never breaks.
 *
 * The canonical schema types live in lib/layout-schema.ts (zod), shared by
 * the API route and the renderer.
 */

import type { LayoutSchema } from '@/lib/layout-schema'

export type {
  Block,
  StatBlock,
  ChartBlock,
  ListBlock,
  TextBlock,
  GridBlock,
  ActionBlock,
  TableBlock,
  BracketBlock,
  TimelineBlock,
  ChatBlock,
  PreviewBlock,
  CodeBlock,
  ImageBlock,
  MusicBlock,
  LayoutSchema,
} from '@/lib/layout-schema'

/* ------------------------------------------------------------------ */
/* Capability routing                                                   */
/*                                                                      */
/* When the layout-designer call fails (quota, network), we do NOT show */
/* canned fake data. The studio blocks (code/image/music) and the chat  */
/* block are REAL tools that make their own API calls — so the fallback */
/* simply routes the request to the right working tool.                 */
/* ------------------------------------------------------------------ */

type Intent = 'code' | 'image' | 'music' | 'chat'

function classify(prompt: string): Intent {
  const p = prompt.toLowerCase()
  if (/(compose|song|music|track|melody|beat|jingle|soundtrack|synthwave|lo-?fi)/.test(p))
    return 'music'
  if (/(image|logo|poster|illustration|draw|paint|art|picture|wallpaper|icon)/.test(p))
    return 'image'
  if (/(game|app|code|build|make|create|develop|tool|simulator|website|calculator|clock|timer)/.test(p))
    return 'code'
  return 'chat'
}

/* ------------------------------------------------------------------ */
/* Capability blueprints — every fallback is a WORKING tool             */
/* ------------------------------------------------------------------ */

function titleCase(prompt: string): string {
  const words = prompt.trim().split(/\s+/).slice(0, 6).join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const BLUEPRINTS: Record<Intent, (prompt: string) => LayoutSchema> = {
  music: (prompt) => ({
    title: titleCase(prompt),
    summary: 'Opened the music studio and started composing your request.',
    blocks: [
      { type: 'music', title: titleCase(prompt), spec: prompt },
      {
        type: 'chat',
        title: 'Producer',
        persona: `You are an expert music producer helping with this request: "${prompt}". Give concrete advice on arrangement, sound design, chord progressions, and mixing. Keep replies short and practical.`,
        placeholder: 'Ask about the track…',
        intro: 'The studio is composing. Want to tweak the mood, tempo, or instrumentation?',
      },
    ],
  }),

  image: (prompt) => ({
    title: titleCase(prompt),
    summary: 'Opened the image lab with your prompt loaded.',
    blocks: [
      { type: 'image', title: titleCase(prompt), spec: prompt },
      {
        type: 'chat',
        title: 'Art Director',
        persona: `You are an expert art director helping with this request: "${prompt}". Help refine composition, style, color, and mood, and suggest improved image prompts. Keep replies short.`,
        placeholder: 'Refine the concept…',
        intro: 'Generating your image. Want to adjust the style or composition?',
      },
    ],
  }),

  code: (prompt) => ({
    title: titleCase(prompt),
    summary: 'Opened a live IDE and started building your request.',
    blocks: [
      { type: 'code', title: titleCase(prompt), spec: prompt },
      {
        type: 'chat',
        title: 'Engineer',
        persona: `You are an expert software engineer pairing on this request: "${prompt}". Explain how it works, suggest features, and help debug. Keep replies short and concrete.`,
        placeholder: 'Ask about the build…',
        intro: 'The IDE is writing your code. Ask me anything about how it works.',
      },
    ],
  }),

  chat: (prompt) => ({
    title: titleCase(prompt),
    summary: 'Connected you with a specialist for this topic.',
    blocks: [
      {
        type: 'chat',
        title: 'Specialist',
        persona: `You are a world-class expert on this topic: "${prompt}". Answer thoroughly but concisely, with real facts and actionable guidance. If the user wants something built, describe it and offer next steps.`,
        placeholder: 'Ask anything…',
        intro: `Let's dig into "${prompt.slice(0, 80)}". What would you like to know first?`,
      },
    ],
  }),
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

/** Synchronous local blueprint — used server-side as the Gemini fallback. */
export function fallbackLayout(prompt: string): LayoutSchema {
  return BLUEPRINTS[classify(prompt)](prompt)
}

export interface GenerateResult {
  layout: LayoutSchema
  /** 'gemini' when the live model designed it, 'fallback' otherwise */
  source: 'gemini' | 'fallback'
}

/**
 * Calls the real AI backend. Pass `current` to REFINE the layout the user is
 * looking at instead of generating from scratch. Falls back to the local
 * blueprint engine if the request itself fails so the UI always renders.
 */
export async function generateLayout(
  prompt: string,
  current?: LayoutSchema,
): Promise<GenerateResult> {
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, ...(current ? { current } : {}) }),
    })
    if (!res.ok) throw new Error(`API responded ${res.status}`)
    const data = (await res.json()) as GenerateResult
    if (!data?.layout?.blocks?.length) throw new Error('Empty layout')
    return data
  } catch {
    return { layout: fallbackLayout(prompt), source: 'fallback' }
  }
}
