/**
 * Shared zod schema for the generated UI layout.
 *
 * This is the single contract between:
 *  - the ChatGPT backend (app/api/generate/route.ts) which uses it to
 *    constrain + validate the model's structured output, and
 *  - the renderer (components/shells/shell-router.tsx) which walks the
 *    parsed result and maps block types to glass components.
 */

import { z } from 'zod'

export const statBlockSchema = z.object({
  type: z.literal('stat'),
  label: z.string().describe('Short KPI label, e.g. "Active Users"'),
  value: z.string().describe('The headline value, e.g. "24,801" or "$83.2k"'),
  delta: z.string().describe('Short change indicator, e.g. "+12.4%"'),
  positive: z.boolean().describe('Whether the delta is good news'),
})

export const chartBlockSchema = z.object({
  type: z.literal('chart'),
  title: z.string(),
  kind: z.enum(['bar', 'line']),
  data: z.array(z.number()).min(4).max(10).describe('4-10 data points'),
  labels: z.array(z.string()).describe('One short label per data point'),
})

export const listBlockSchema = z.object({
  type: z.literal('list'),
  title: z.string(),
  items: z
    .array(
      z.object({
        title: z.string(),
        meta: z.string().describe('Short secondary text, e.g. time or amount'),
        done: z.boolean().optional(),
      }),
    )
    .min(2)
    .max(6),
})

export const textBlockSchema = z.object({
  type: z.literal('text'),
  title: z.string(),
  body: z.string().describe('1-3 sentences of useful content'),
})

export const gridBlockSchema = z.object({
  type: z.literal('grid'),
  title: z.string(),
  tiles: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .min(2)
    .max(6),
})

export const actionBlockSchema = z.object({
  type: z.literal('action'),
  actions: z.array(z.string()).min(2).max(4).describe('Short button labels'),
})

/** Structured data table — standings, match overviews, comparisons, specs. */
export const tableBlockSchema = z.object({
  type: z.literal('table'),
  title: z.string(),
  columns: z.array(z.string()).min(2).max(6),
  rows: z.array(z.array(z.string())).min(2).max(10),
})

/** Knockout / tournament bracket rendered as round columns. */
export const bracketMatchSchema = z.object({
  a: z.string().describe('First competitor'),
  b: z.string().describe('Second competitor'),
  scoreA: z.string().describe('Score or "-" if not played'),
  scoreB: z.string().describe('Score or "-" if not played'),
  winner: z.enum(['a', 'b', 'tbd']),
})

export const bracketBlockSchema = z.object({
  type: z.literal('bracket'),
  title: z.string(),
  rounds: z
    .array(
      z.object({
        name: z.string().describe('e.g. "Quarter-finals"'),
        matches: z.array(bracketMatchSchema).min(1).max(8),
      }),
    )
    .min(2)
    .max(5),
})

/** Chronological events — schedules, histories, roadmaps. */
export const timelineBlockSchema = z.object({
  type: z.literal('timeline'),
  title: z.string(),
  events: z
    .array(
      z.object({
        time: z.string().describe('Date, time or step label'),
        title: z.string(),
        detail: z.string().describe('One short sentence'),
      }),
    )
    .min(2)
    .max(6),
})

/** LIVE chat assistant — rendered as a working chatbot wired to /api/chat. */
export const chatBlockSchema = z.object({
  type: z.literal('chat'),
  title: z.string().describe('Assistant name, e.g. "Recipe Copilot"'),
  persona: z
    .string()
    .describe('System prompt defining the specialist the assistant should be'),
  placeholder: z.string().describe('Input placeholder text'),
  intro: z.string().describe('The assistant\u2019s opening message'),
})

/** Wireframe preview of an app/screen inside a device frame. */
export const previewElementSchema = z.object({
  kind: z.enum(['nav', 'heading', 'text', 'image', 'button', 'input', 'list']),
  label: z.string().describe('Visible label or short content for the element'),
})

export const previewBlockSchema = z.object({
  type: z.literal('preview'),
  title: z.string().describe('What is being previewed, e.g. "Home Screen"'),
  device: z.enum(['phone', 'browser']),
  elements: z.array(previewElementSchema).min(3).max(8),
})

/**
 * WORKING mini IDE — ChatGPT writes a real, runnable single-file web app
 * from `spec`; the block renders an editor + live sandboxed preview.
 */
export const codeBlockSchema = z.object({
  type: z.literal('code'),
  title: z.string().describe('What is being built, e.g. "Snake Game"'),
  spec: z
    .string()
    .describe('Detailed brief of the app/game to code: features, controls, visuals'),
})

/** REAL image generation — `spec` is the image prompt sent to the image model. */
export const imageBlockSchema = z.object({
  type: z.literal('image'),
  title: z.string().describe('What the image is, e.g. "Logo Concept"'),
  spec: z
    .string()
    .describe('Detailed image-generation prompt: subject, style, mood, colors'),
})

/** REAL music composition — ChatGPT composes notes, played via WebAudio. */
export const musicBlockSchema = z.object({
  type: z.literal('music'),
  title: z.string().describe('Track name, e.g. "Midnight Drive"'),
  spec: z
    .string()
    .describe('Detailed music brief: genre, mood, tempo, instrumentation'),
})

export const blockSchema = z.discriminatedUnion('type', [
  statBlockSchema,
  chartBlockSchema,
  listBlockSchema,
  textBlockSchema,
  gridBlockSchema,
  actionBlockSchema,
  tableBlockSchema,
  bracketBlockSchema,
  timelineBlockSchema,
  chatBlockSchema,
  previewBlockSchema,
  codeBlockSchema,
  imageBlockSchema,
  musicBlockSchema,
])

/**
 * The APP SHELL — which professional application Lumen turns itself into.
 * Each shell is a completely different interface, not a themed variant:
 *  - ide:       full code editor workbench (like VS Code) for building software
 *  - music:     DAW with transport + track lanes (like GarageBand)
 *  - answer:    conversational answer engine (like Google AI mode) for questions
 *  - gallery:   visual creation studio with canvas + inspector (like a design app)
 *  - publisher: document workspace with paper pages (like a publishing app)
 *  - dashboard: data workspace with panels (for analytics/monitoring tasks)
 */
export const shellSchema = z.enum([
  'ide',
  'music',
  'answer',
  'gallery',
  'publisher',
  'dashboard',
])
export type Shell = z.infer<typeof shellSchema>

export const layoutSchema = z.object({
  title: z.string().describe('Short title for the generated interface'),
  summary: z
    .string()
    .describe('One sentence describing what was generated and why'),
  shell: shellSchema.optional(),
  blocks: z
    .array(blockSchema)
    .min(1)
    .max(9)
    .describe('Ordered UI blocks; mix types for visual variety'),
})

export type StatBlock = z.infer<typeof statBlockSchema>
export type ChartBlock = z.infer<typeof chartBlockSchema>
export type ListBlock = z.infer<typeof listBlockSchema>
export type TextBlock = z.infer<typeof textBlockSchema>
export type GridBlock = z.infer<typeof gridBlockSchema>
export type ActionBlock = z.infer<typeof actionBlockSchema>
export type TableBlock = z.infer<typeof tableBlockSchema>
export type BracketBlock = z.infer<typeof bracketBlockSchema>
export type TimelineBlock = z.infer<typeof timelineBlockSchema>
export type ChatBlock = z.infer<typeof chatBlockSchema>
export type PreviewBlock = z.infer<typeof previewBlockSchema>
export type CodeBlock = z.infer<typeof codeBlockSchema>
export type ImageBlock = z.infer<typeof imageBlockSchema>
export type MusicBlock = z.infer<typeof musicBlockSchema>
export type Block = z.infer<typeof blockSchema>
export type LayoutSchema = z.infer<typeof layoutSchema>

/* ------------------------------------------------------------------ */
/* ChatGPT-facing schema                                                 */
/* ------------------------------------------------------------------ */
// Normalize the model-facing layout before using the stricter renderer schema.
const flatItemSchema = z.object({
  title: z.string().describe('Item title'),
  meta: z.string().describe('Short secondary text: time, amount, status'),
  done: z.boolean().nullish().describe('Only for task items; else null'),
})

const flatTileSchema = z.object({
  label: z.string(),
  value: z.string(),
})

const flatRowSchema = z.object({
  cells: z.array(z.string()).describe('One cell per column, same order'),
})

const flatMatchSchema = z.object({
  a: z.string(),
  b: z.string(),
  scoreA: z.string().describe('Score for a, or "-" if not played yet'),
  scoreB: z.string().describe('Score for b, or "-" if not played yet'),
  winner: z.enum(['a', 'b', 'tbd']),
})

const flatRoundSchema = z.object({
  name: z.string().describe('Round name, e.g. "Semi-finals"'),
  matches: z.array(flatMatchSchema),
})

const flatEventSchema = z.object({
  time: z.string(),
  title: z.string(),
  detail: z.string(),
})

const flatElementSchema = z.object({
  kind: z.enum(['nav', 'heading', 'text', 'image', 'button', 'input', 'list']),
  label: z.string(),
})

export const modelBlockSchema = z.object({
  type: z
    .enum([
      'stat',
      'chart',
      'list',
      'text',
      'grid',
      'action',
      'table',
      'bracket',
      'timeline',
      'chat',
      'preview',
      'code',
      'image',
      'music',
    ])
    .describe('Which UI block to render'),
  label: z.string().nullish().describe('stat only: short KPI label'),
  value: z.string().nullish().describe('stat only: headline value like "$83.2k"'),
  delta: z.string().nullish().describe('stat only: change like "+12.4%"'),
  positive: z.boolean().nullish().describe('stat only: is the delta good news'),
  title: z
    .string()
    .nullish()
    .describe('block title (all types except stat and action)'),
  kind: z.enum(['bar', 'line']).nullish().describe('chart only'),
  data: z.array(z.coerce.number()).nullish().describe('chart only: 4-10 numbers'),
  labels: z
    .array(z.string())
    .nullish()
    .describe('chart only: one short label per data point'),
  items: z.array(flatItemSchema).nullish().describe('list only: 2-6 items'),
  body: z.string().nullish().describe('text only: 1-3 sentences'),
  tiles: z.array(flatTileSchema).nullish().describe('grid only: 2-6 tiles'),
  actions: z
    .array(z.string())
    .nullish()
    .describe('action only: 2-4 short button labels'),
  columns: z
    .array(z.string())
    .nullish()
    .describe('table only: 2-6 column headers'),
  rows: z
    .array(flatRowSchema)
    .nullish()
    .describe('table only: 2-10 rows, each with one cell per column'),
  rounds: z
    .array(flatRoundSchema)
    .nullish()
    .describe('bracket only: rounds from earliest to final'),
  events: z
    .array(flatEventSchema)
    .nullish()
    .describe('timeline only: 2-6 chronological events'),
  persona: z
    .string()
    .nullish()
    .describe('chat only: system prompt defining the specialist assistant'),
  placeholder: z.string().nullish().describe('chat only: input placeholder'),
  intro: z.string().nullish().describe('chat only: assistant opening message'),
  device: z.enum(['phone', 'browser']).nullish().describe('preview only'),
  elements: z
    .array(flatElementSchema)
    .nullish()
    .describe('preview only: 3-8 wireframe elements top to bottom'),
  spec: z
    .string()
    .nullish()
    .describe(
      'code/image/music only: the DETAILED creative brief. code: full app spec with features and controls. image: full image prompt with style. music: genre, mood, tempo, instruments.',
    ),
})

export const modelLayoutSchema = z.object({
  title: z.string().describe('Short title for the generated interface'),
  summary: z.string().describe('One sentence describing what was generated'),
  shell: shellSchema
    .nullish()
    .describe(
      'Which app to become: ide (code workbench for building software/games), music (DAW for composing), answer (conversational answer engine for questions/advice/learning), gallery (visual studio for image creation), publisher (document workspace for writing/books/plans), dashboard (data panels for analytics/tracking/live events)',
    ),
  blocks: z.array(modelBlockSchema).min(1).max(9),
})

export type ModelLayout = z.infer<typeof modelLayoutSchema>

/** Converts ChatGPT's flat blocks into strict internal blocks, dropping any that are unusable. */
export function normalizeLayout(raw: ModelLayout): LayoutSchema | null {
  const blocks: Block[] = []

  for (const b of raw.blocks) {
    switch (b.type) {
      case 'stat':
        if (b.label && b.value) {
          blocks.push({
            type: 'stat',
            label: b.label,
            value: b.value,
            delta: b.delta ?? '',
            positive: b.positive ?? true,
          })
        }
        break
      case 'chart':
        if (b.data && b.data.length >= 2 && b.data.every((n) => Number.isFinite(n))) {
          const data = b.data.slice(0, 10)
          const labels = (b.labels ?? []).slice(0, data.length)
          while (labels.length < data.length) labels.push(String(labels.length + 1))
          blocks.push({
            type: 'chart',
            title: b.title ?? 'Chart',
            kind: b.kind ?? 'bar',
            data,
            labels,
          })
        }
        break
      case 'list':
        if (b.items && b.items.length >= 1) {
          blocks.push({
            type: 'list',
            title: b.title ?? 'List',
            items: b.items.slice(0, 6).map((i) => ({
              title: i.title,
              meta: i.meta ?? '',
              ...(i.done === null ? {} : { done: i.done }),
            })),
          })
        }
        break
      case 'text':
        if (b.body) {
          blocks.push({ type: 'text', title: b.title ?? 'About', body: b.body })
        }
        break
      case 'grid':
        if (b.tiles && b.tiles.length >= 2) {
          blocks.push({
            type: 'grid',
            title: b.title ?? 'Overview',
            tiles: b.tiles.slice(0, 6),
          })
        }
        break
      case 'action':
        if (b.actions && b.actions.length >= 1) {
          blocks.push({ type: 'action', actions: b.actions.slice(0, 4) })
        }
        break
      case 'table':
        if (b.columns && b.columns.length >= 2 && b.rows && b.rows.length >= 1) {
          const columns = b.columns.slice(0, 6)
          blocks.push({
            type: 'table',
            title: b.title ?? 'Table',
            columns,
            rows: b.rows.slice(0, 10).map((r) => {
              const cells = r.cells.slice(0, columns.length)
              while (cells.length < columns.length) cells.push('')
              return cells
            }),
          })
        }
        break
      case 'bracket':
        if (
          b.rounds &&
          b.rounds.length >= 2 &&
          b.rounds.every((r) => r.matches.length >= 1)
        ) {
          blocks.push({
            type: 'bracket',
            title: b.title ?? 'Bracket',
            rounds: b.rounds.slice(0, 5).map((r) => ({
              name: r.name,
              matches: r.matches.slice(0, 8),
            })),
          })
        }
        break
      case 'timeline':
        if (b.events && b.events.length >= 2) {
          blocks.push({
            type: 'timeline',
            title: b.title ?? 'Timeline',
            events: b.events.slice(0, 6),
          })
        }
        break
      case 'chat':
        if (b.persona) {
          blocks.push({
            type: 'chat',
            title: b.title ?? 'Assistant',
            persona: b.persona,
            placeholder: b.placeholder ?? 'Ask anything…',
            intro: b.intro ?? 'Hi! How can I help?',
          })
        }
        break
      case 'preview':
        if (b.elements && b.elements.length >= 3) {
          blocks.push({
            type: 'preview',
            title: b.title ?? 'Preview',
            device: b.device ?? 'phone',
            elements: b.elements.slice(0, 8),
          })
        }
        break
      case 'code':
        if (b.spec) {
          blocks.push({ type: 'code', title: b.title ?? 'App', spec: b.spec })
        }
        break
      case 'image':
        if (b.spec) {
          blocks.push({ type: 'image', title: b.title ?? 'Image', spec: b.spec })
        }
        break
      case 'music':
        if (b.spec) {
          blocks.push({ type: 'music', title: b.title ?? 'Track', spec: b.spec })
        }
        break
    }
  }

  // Creator-centric layouts (a lone IDE or chat) are valid with one block.
  if (blocks.length < 1) return null
  return {
    title: raw.title,
    summary: raw.summary,
    shell: blocks.some((block) => ['code', 'image', 'music'].includes(block.type))
      ? deriveShell(blocks)
      : raw.shell && !['ide', 'gallery', 'music'].includes(raw.shell) ? raw.shell : deriveShell(blocks),
    blocks,
  }
}

/** Content-based shell fallback for when ChatGPT omits the shell field. */
export function deriveShell(blocks: Block[]): Shell {
  if (blocks.some((b) => b.type === 'code')) return 'ide'
  if (blocks.some((b) => b.type === 'music')) return 'music'
  if (blocks.some((b) => b.type === 'image')) return 'gallery'
  const hasData = blocks.some((b) =>
    ['stat', 'chart', 'bracket', 'table', 'grid', 'timeline'].includes(b.type),
  )
  if (hasData) return 'dashboard'
  const textHeavy =
    blocks.filter((b) => b.type === 'text').length >= 2 && !blocks.some((b) => b.type === 'chat')
  if (textHeavy) return 'publisher'
  return 'answer'
}
