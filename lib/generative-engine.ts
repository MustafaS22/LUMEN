import { layoutSchema, type LayoutSchema } from '@/lib/layout-schema'
import { postLocal, responseError } from '@/lib/api-client'

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
  if (/\b(compose|song|music|melody|beat|jingle|soundtrack|synthwave|lo-?fi)\b/.test(p)) return 'music'
  if (/\b(image|logo|poster|illustration|draw|paint|picture|wallpaper|icon)\b/.test(p)) return 'image'
  if (/\b(game|app|code|build|develop|simulator|website|calculator|clock|timer)\b/.test(p)) return 'code'
  return 'chat'
}

function titleCase(prompt: string): string {
  const words = prompt.trim().split(/\s+/).slice(0, 6).join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const BLUEPRINTS: Record<Intent, (prompt: string) => LayoutSchema> = {
  music: (prompt) => ({
    title: titleCase(prompt),
    summary: 'Music studio with your description loaded.',
    blocks: [
      { type: 'music', title: titleCase(prompt), spec: prompt },
      {
        type: 'chat',
        title: 'Producer',
        persona: `You are an expert music producer helping with this request: "${prompt}". Give concrete advice on arrangement, sound design, chord progressions, and mixing. Keep replies short and practical.`,
        placeholder: 'Ask about the track…',
        intro: 'Ask about mood, tempo, or instrumentation.',
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
        intro: 'Ask about style or composition.',
      },
    ],
  }),

  code: (prompt) => ({
    title: titleCase(prompt),
    summary: 'Code studio with your description loaded.',
    blocks: [
      { type: 'code', title: titleCase(prompt), spec: prompt },
      {
        type: 'chat',
        title: 'Engineer',
        persona: `You are an expert software engineer pairing on this request: "${prompt}". Explain how it works, suggest features, and help debug. Keep replies short and concrete.`,
        placeholder: 'Ask about the build…',
        intro: 'Ask about the build or the code.',
      },
    ],
  }),

  chat: (prompt) => ({
    title: titleCase(prompt),
    summary: 'Conversation workspace for this topic.',
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

/** Local starter layout for signed-out use. */
export function fallbackLayout(prompt: string): LayoutSchema {
  return BLUEPRINTS[classify(prompt)](prompt)
}

export type WorkspaceSource = 'chatgpt' | 'fallback' | 'example'

export interface GenerateResult {
  layout: LayoutSchema
  source: WorkspaceSource
}

export async function generateLayout(prompt: string, current?: LayoutSchema, signal?: AbortSignal): Promise<GenerateResult> {
  const response = await postLocal('/api/generate', { prompt, ...(current ? { current } : {}) }, signal)
  if (!response.ok) throw await responseError(response, 'ChatGPT could not build this workspace.')
  const data = await response.json()
  return { layout: layoutSchema.parse(data.layout), source: 'chatgpt' }
}
