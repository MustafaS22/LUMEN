/**
 * POST /api/generate
 * ------------------
 * Two-step generative pipeline:
 *
 *  1. RESEARCH — Gemini with Google Search grounding gathers real, current
 *     facts about the user's request (actual team names, real scores, true
 *     specs). This is what makes the output useful instead of invented.
 *  2. DESIGN — Gemini structured-output turns the research notes into a
 *     purpose-fit `LayoutSchema`: brackets for tournaments, tables for
 *     standings, a live chat + wireframe preview for app requests, etc.
 *
 * Refinement: the client may send the `current` layout — then the prompt is
 * treated as a modification request and the design step evolves the existing
 * UI instead of starting over.
 *
 * Resilience: research failures degrade to design-only; design failures fall
 * back to the local blueprint engine. The response `source` tells the client
 * which path produced the layout.
 */

import { generateText, Output } from 'ai'
import { google } from '@ai-sdk/google'
import { fallbackLayout } from '@/lib/generative-engine'
import { withGeminiModel } from '@/lib/gemini'
import { geminiLayoutSchema, normalizeLayout } from '@/lib/layout-schema'

export const maxDuration = 60

const RESEARCH_PROMPT = `You are the research stage of a system that builds a specialized working tool for ANY task a user asks for. Your job: gather whatever real knowledge that tool needs to be genuinely useful.

First identify what KIND of task this is, then gather accordingly:
- Current events / live domains (sports, markets, elections, releases): use search — real names, numbers, dates, scores, prices, current state, and what happens next.
- Stable knowledge (science, history, cooking, medicine, law, language): the established facts, key entities, correct steps, common pitfalls.
- Personal/practical tasks (planning, budgeting, learning, fitness, travel): the expert-recommended structure — phases, categories, benchmarks, rules of thumb.
- Creative/open-ended tasks (writing, brainstorming, design): the frameworks and reference points an expert would use.

Return concise bullet notes only — no prose, no preamble. Maximum 20 bullets.
If something is unknowable or you are unsure, write "unknown" rather than inventing it.`

const DESIGN_PROMPT = `You are Lumen, a generative UI engine that can specialize itself for ANY task. You do not have preset app types. For every request, reason from first principles:

1. Who is the ideal expert for this task? (Could be anyone: cardiologist, chess coach, tax advisor, sommelier, physicist, novelist…)
2. If that expert built a dedicated software tool for exactly this request, what would be on its screen? What would the user DO with it?
3. Pick the SHELL — which professional application Lumen physically becomes. Each shell is a completely different interface, like different apps on a desktop:
   - "ide": a full code workbench (file tree, editor tabs, live preview pane) — for building apps, games, tools, websites, simulations.
   - "music": a DAW (transport bar, track lanes, piano-roll) — for composing music, jingles, soundtracks.
   - "answer": a conversational answer engine (large answer column, follow-up input, context cards) — for questions, advice, learning, explanations, simple queries.
   - "gallery": a visual design studio (canvas, layers, inspector) — for creating images, logos, posters, concept art.
   - "publisher": a document workspace (paper pages, section navigator) — for writing books, essays, documents, structured plans.
   - "dashboard": a data terminal (dense panel wall) — for analytics, sports, standings, tracking, comparisons, live events.
4. Compose that tool from the blocks below. The interface must serve the user's actual goal — not decorate it.

Every block object has a "type" plus ONLY the fields for that type (set all unused fields to null):
- "stat": label, value, delta, positive — one KPI card.
- "chart": title, kind ("bar"/"line"), data (numbers), labels (same length) — trends, comparisons, distributions.
- "list": title, items ({title, meta, done}) — feeds, tasks, rankings, steps. done is null unless it's a checklist.
- "text": title, body — brief expert context. Use at most ONE.
- "grid": title, tiles ({label, value}) — categories, options, galleries, vocab.
- "action": actions (2-4 button labels).
- "table": title, columns, rows (each row = {cells: [one string per column]}) — any structured records: standings, comparisons, schedules, specs, ingredients, conjugations.
- "bracket": title, rounds ([{name, matches: [{a, b, scoreA, scoreB, winner}]}]) — any elimination/tournament structure, earliest round first. "-" scores and winner "tbd" for undecided.
- "timeline": title, events ({time, title, detail}) — anything sequential: schedules, histories, itineraries, curricula, workflows.
- "chat": title, persona, placeholder, intro — a LIVE working AI assistant embedded in the tool. The persona field is its system prompt: write a detailed one that makes it a true specialist for THIS exact task (its expertise, tone, and what it helps the user do). This block does real work — treat it as the interactive core whenever the task involves ongoing dialogue, judgment, creativity, or open-ended help.
- "preview": title, device ("phone"/"browser"), elements ([{kind, label}] with kind in nav/heading/text/image/button/input/list) — a wireframe mockup, ONLY when the user is designing/building a product or screen.
- "code": title, spec — a WORKING mini IDE: a real app/game is coded live from your spec and runs in the tool with an editor and AI revisions. Use when the user wants an app, game, tool, simulation, or visualization BUILT. The spec must be a complete brief: features, controls, rules, win/lose conditions, visual style.
- "image": title, spec — REAL image generation rendered in the tool with an editable prompt. Use when the user wants visuals created: logos, posters, concept art, illustrations, moodboards. The spec is the full image prompt: subject, composition, style, mood, palette.
- "music": title, spec — REAL music: a multi-track piece is composed from your spec and played live with synths and a piano-roll. Use when the user wants music, a theme, a jingle, or a soundtrack. The spec covers genre, mood, tempo feel, and instrumentation.

Composition principles (not recipes — derive the right mix from the task itself):
- Match structure to the domain's native shape: eliminations → bracket, records → table, sequences → timeline, quantities → stat/chart, collections → grid/list.
- Interactive tasks need the chat block as the working core; data tasks need the data blocks as the core.
- CREATION tasks need a maker block as the core: build/code something → "code", visual assets → "image", audio → "music". Prefer these over "preview" when the user wants the real thing, not a mockup. Use at most one "code" and one "music" block per layout; support them with a few relevant data/context blocks, not another giant block.
- A great layout answers the user's need at a glance AND gives them something to do next.
- Never pad with filler blocks. Never include a block the expert wouldn't put there.

Rules:
- Ground every fact in the research notes when provided. If notes say "unknown", show "-" or "TBD" — never invent specifics.
- Keep copy tight: labels under 4 words, values compact ("$83.2k").
- 3 to 7 blocks. Every block must earn its place.`

interface GenerateBody {
  prompt?: unknown
  current?: unknown
}

export async function POST(req: Request) {
  let prompt = ''
  let current: string | null = null
  try {
    const body = (await req.json()) as GenerateBody
    prompt = typeof body?.prompt === 'string' ? body.prompt.slice(0, 500) : ''
    if (body?.current && typeof body.current === 'object') {
      current = JSON.stringify(body.current).slice(0, 8000)
    }
  } catch {
    // fall through to validation below
  }

  if (!prompt.trim()) {
    return Response.json({ error: 'Missing prompt' }, { status: 400 })
  }

  // Step 1 — research with live Google Search grounding (best-effort).
  // maxRetries: 0 — retrying a daily-quota 429 only burns more quota; the
  // model chain in withGeminiModel handles moving to a model that works.
  let notes = ''
  if (!current) {
    try {
      const research = await withGeminiModel((modelId) =>
        generateText({
          model: google(modelId),
          tools: { google_search: google.tools.googleSearch({}) },
          system: RESEARCH_PROMPT,
          prompt: `Topic: ${prompt}`,
          maxRetries: 0,
        }),
      )
      notes = research.text.slice(0, 4000)
    } catch (error) {
      console.error('Research step failed, designing without grounding:', error)
    }
  }

  // Step 2 — design the layout as structured output.
  try {
    const designPrompt = current
      ? `The user is looking at this interface:\n${current}\n\nModify it per this request, keeping everything that still serves the user: ${prompt}`
      : `Design an interface for: ${prompt}${notes ? `\n\nResearch notes (real facts — use these, do not invent):\n${notes}` : ''}`

    const { output } = await withGeminiModel((modelId) =>
      generateText({
        model: google(modelId),
        output: Output.object({ schema: geminiLayoutSchema }),
        system: DESIGN_PROMPT,
        prompt: designPrompt,
        maxRetries: 0,
      }),
    )

    const layout = normalizeLayout(output)
    if (!layout) throw new Error('Normalized layout had too few usable blocks')

    return Response.json({ layout, source: 'gemini' })
  } catch (error) {
    console.error('Gemini generation failed, using fallback:', error)
    return Response.json({ layout: fallbackLayout(prompt), source: 'fallback' })
  }
}
