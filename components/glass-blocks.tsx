'use client'

/**
 * Glass Component Registry
 * ------------------------
 * Each block type from the LayoutSchema maps to one of these components.
 * All panels share the `.glass` utility (see globals.css) for a consistent
 * frosted-pane look; charts are hand-rolled SVG so they inherit the glass
 * aesthetic with zero chart-library weight.
 */

import { motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ImageIcon,
  Loader2,
  Menu,
  Send,
  Sparkles,
  Trophy,
} from 'lucide-react'
import type {
  ActionBlock,
  Block,
  BracketBlock,
  ChartBlock,
  ChatBlock,
  GridBlock,
  ListBlock,
  PreviewBlock,
  StatBlock,
  TableBlock,
  TextBlock,
  TimelineBlock,
} from '@/lib/generative-engine'
import { useEffect, useRef, useState, type ComponentType, type FormEvent } from 'react'
import { CodeStudio, ImageStudio, MusicStudio } from '@/components/workspace-blocks'

/* ------------------------------------------------------------------ */
/* Individual glass blocks                                              */
/* ------------------------------------------------------------------ */

function StatCard({ block }: { block: StatBlock }) {
  return (
    <div className="glass flex flex-col gap-2 rounded-3xl p-6">
      <span className="text-sm text-muted-foreground">{block.label}</span>
      <span className="text-3xl font-semibold tracking-tight">{block.value}</span>
      <span
        className={`flex items-center gap-1 text-sm ${
          block.positive ? 'text-glow-cyan' : 'text-glow-amber'
        }`}
      >
        {block.positive ? (
          <ArrowUpRight className="size-4" aria-hidden="true" />
        ) : (
          <ArrowDownRight className="size-4" aria-hidden="true" />
        )}
        {block.delta}
      </span>
    </div>
  )
}

function ChartCard({ block }: { block: ChartBlock }) {
  const max = Math.max(...block.data)
  const W = 280
  const H = 96

  return (
    <div className="glass flex flex-col gap-4 rounded-3xl p-6">
      <h3 className="text-sm font-medium text-muted-foreground">{block.title}</h3>
      {block.kind === 'bar' ? (
        <div className="flex h-28 items-end gap-2" role="img" aria-label={`Bar chart: ${block.title}`}>
          {block.data.map((v, i) => (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              {/* Bars animate height with a spring for a tactile build-in */}
              <motion.div
                className="w-full rounded-t-md bg-glow-cyan/60 shadow-[0_0_16px_-2px_var(--glow-cyan)]"
                initial={{ height: 0 }}
                animate={{ height: `${(v / max) * 100}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 18, delay: i * 0.05 }}
              />
              <span className="truncate text-[10px] text-muted-foreground">{block.labels[i]}</span>
            </div>
          ))}
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-28 w-full"
          role="img"
          aria-label={`Line chart: ${block.title}`}
        >
          {(() => {
            const pts = block.data.map((v, i) => ({
              x: (i / (block.data.length - 1)) * (W - 8) + 4,
              y: H - 8 - (v / max) * (H - 20),
            }))
            const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
            return (
              <>
                {/* Soft area fill under the line */}
                <path
                  d={`${path} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`}
                  fill="var(--glow-cyan)"
                  opacity={0.12}
                />
                <motion.path
                  d={path}
                  fill="none"
                  stroke="var(--glow-cyan)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                />
                {pts.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--glow-cyan)" />
                ))}
              </>
            )
          })()}
        </svg>
      )}
    </div>
  )
}

function ListCard({ block }: { block: ListBlock }) {
  return (
    <div className="glass flex flex-col gap-3 rounded-3xl p-6">
      <h3 className="text-sm font-medium text-muted-foreground">{block.title}</h3>
      <ul className="flex flex-col">
        {block.items.map((item, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 border-b border-glass-border py-3 last:border-b-0"
          >
            <span className="flex items-center gap-2.5 text-sm">
              {item.done !== undefined && (
                <span
                  className={`flex size-4 items-center justify-center rounded-full border ${
                    item.done
                      ? 'border-glow-cyan/50 bg-glow-cyan/20 text-glow-cyan'
                      : 'border-glass-border'
                  }`}
                >
                  {item.done && <Check className="size-2.5" aria-hidden="true" />}
                </span>
              )}
              <span className={item.done ? 'text-muted-foreground line-through' : ''}>
                {item.title}
              </span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{item.meta}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TextCard({ block }: { block: TextBlock }) {
  return (
    <div className="glass flex flex-col gap-3 rounded-3xl p-6">
      <h3 className="text-lg font-semibold tracking-tight text-balance">{block.title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{block.body}</p>
    </div>
  )
}

function GridCard({ block }: { block: GridBlock }) {
  return (
    <div className="glass flex flex-col gap-4 rounded-3xl p-6">
      <h3 className="text-sm font-medium text-muted-foreground">{block.title}</h3>
      <div className="grid grid-cols-2 gap-3">
        {block.tiles.map((tile, i) => (
          <motion.div
            key={i}
            className="glass-strong flex flex-col gap-1 rounded-2xl p-4"
            whileHover={{ scale: 1.04, y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <span className="text-sm font-medium">{tile.label}</span>
            <span className="text-xs text-muted-foreground">{tile.value}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function ActionCard({ block }: { block: ActionBlock }) {
  return (
    <div className="glass flex flex-wrap items-center gap-3 rounded-3xl p-6">
      <Sparkles className="size-4 text-glow-cyan" aria-hidden="true" />
      {block.actions.map((label, i) => (
        <motion.button
          key={i}
          type="button"
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            i === 0
              ? 'bg-primary text-primary-foreground'
              : 'glass-strong text-foreground hover:text-glow-cyan'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
          {label}
        </motion.button>
      ))}
    </div>
  )
}

function TableCard({ block }: { block: TableBlock }) {
  return (
    <div className="glass flex flex-col gap-4 overflow-hidden rounded-3xl p-6">
      <h3 className="text-sm font-medium text-muted-foreground">{block.title}</h3>
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-full text-sm">
          <thead>
            <tr>
              {block.columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  className="whitespace-nowrap px-2 pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r} className="border-t border-glass-border">
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className={`whitespace-nowrap px-2 py-2.5 ${
                      c === 0 ? 'font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BracketCard({ block }: { block: BracketBlock }) {
  return (
    <div className="glass flex flex-col gap-4 overflow-hidden rounded-3xl p-6">
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Trophy className="size-4 text-glow-amber" aria-hidden="true" />
        {block.title}
      </h3>
      {/* Rounds as columns; each later round has fewer, vertically-centered matches */}
      <div className="-mx-2 flex items-stretch gap-4 overflow-x-auto px-2 pb-2">
        {block.rounds.map((round, r) => (
          <div key={r} className="flex min-w-40 flex-1 flex-col">
            <span className="mb-3 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {round.name}
            </span>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {round.matches.map((m, i) => (
                <div key={i} className="glass-strong flex flex-col rounded-xl p-2 text-xs">
                  {(['a', 'b'] as const).map((side) => {
                    const won = m.winner === side
                    const lost = m.winner !== 'tbd' && !won
                    return (
                      <div
                        key={side}
                        className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${
                          won ? 'bg-glow-cyan/15 text-glow-cyan' : lost ? 'text-muted-foreground/60' : ''
                        }`}
                      >
                        <span className="truncate">{side === 'a' ? m.a : m.b}</span>
                        <span className="shrink-0 font-mono">
                          {side === 'a' ? m.scoreA : m.scoreB}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TimelineCard({ block }: { block: TimelineBlock }) {
  return (
    <div className="glass flex flex-col gap-4 rounded-3xl p-6">
      <h3 className="text-sm font-medium text-muted-foreground">{block.title}</h3>
      <ol className="flex flex-col">
        {block.events.map((event, i) => (
          <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
            {/* Rail + node */}
            <div className="flex flex-col items-center">
              <span className="mt-1 size-2.5 shrink-0 rounded-full bg-glow-cyan shadow-[0_0_8px_var(--glow-cyan)]" />
              {i < block.events.length - 1 && (
                <span className="mt-1 w-px flex-1 bg-glass-border" />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {event.time}
              </span>
              <span className="text-sm font-medium">{event.title}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {event.detail}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** A LIVE chat assistant — streams real replies from /api/chat (Gemini). */
function ChatCard({ block }: { block: ChatBlock }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: block.intro },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy) return

    const history = [...messages, { role: 'user' as const, content: text }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setBusy(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: block.persona,
          context: block.title,
          messages: history,
        }),
      })
      if (!res.ok || !res.body) throw new Error('Chat request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      // Append streamed tokens to the placeholder assistant message.
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        const snapshot = acc
        setMessages([...history, { role: 'assistant', content: snapshot }])
      }
      if (!acc.trim()) throw new Error('Empty reply')
    } catch {
      setMessages([
        ...history,
        { role: 'assistant', content: 'I hit a connection snag — try that again.' },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="glass flex h-96 flex-col overflow-hidden rounded-3xl">
      <div className="flex items-center gap-2 border-b border-glass-border px-5 py-3.5">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-glow-cyan opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-glow-cyan" />
        </span>
        <h3 className="text-sm font-medium">{block.title}</h3>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Live
        </span>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'self-end bg-primary text-primary-foreground'
                : 'glass-strong self-start'
            }`}
          >
            {m.content || (
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Thinking" />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-glass-border p-3">
        <label htmlFor={`chat-${block.title}`} className="sr-only">
          Message {block.title}
        </label>
        <input
          id={`chat-${block.title}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={block.placeholder}
          className="glass-strong min-w-0 flex-1 rounded-full px-4 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-glow-cyan/50"
        />
        <motion.button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          whileTap={{ scale: 0.92 }}
          aria-label="Send message"
        >
          <Send className="size-4" aria-hidden="true" />
        </motion.button>
      </form>
    </div>
  )
}

/** Wireframe app mockup inside a phone or browser frame. */
function PreviewCard({ block }: { block: PreviewBlock }) {
  const phone = block.device === 'phone'
  return (
    <div className="glass flex flex-col gap-4 rounded-3xl p-6">
      <h3 className="text-sm font-medium text-muted-foreground">{block.title}</h3>
      <div className="flex justify-center">
        <div
          className={`glass-strong flex flex-col overflow-hidden ${
            phone ? 'w-52 rounded-[2rem] border-4' : 'w-full rounded-xl border'
          } border-glass-border`}
        >
          {/* Device chrome */}
          {phone ? (
            <div className="flex justify-center pt-2 pb-1">
              <span className="h-1.5 w-16 rounded-full bg-glass-border" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 border-b border-glass-border px-3 py-2">
              <span className="size-2 rounded-full bg-glow-amber/60" />
              <span className="size-2 rounded-full bg-muted-foreground/40" />
              <span className="size-2 rounded-full bg-glow-cyan/60" />
              <span className="ml-2 h-3 flex-1 rounded-full bg-glass-border/50" />
            </div>
          )}
          {/* Wireframe elements */}
          <div className="flex flex-col gap-2.5 p-3.5">
            {block.elements.map((el, i) => {
              switch (el.kind) {
                case 'nav':
                  return (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold">{el.label}</span>
                      <Menu className="size-3 text-muted-foreground" aria-hidden="true" />
                    </div>
                  )
                case 'heading':
                  return (
                    <span key={i} className="text-xs font-semibold leading-snug text-balance">
                      {el.label}
                    </span>
                  )
                case 'text':
                  return (
                    <div key={i} className="flex flex-col gap-1">
                      <span className="h-1.5 w-full rounded-full bg-glass-border" />
                      <span className="h-1.5 w-4/5 rounded-full bg-glass-border" />
                      <span className="sr-only">{el.label}</span>
                    </div>
                  )
                case 'image':
                  return (
                    <div
                      key={i}
                      className="flex h-16 items-center justify-center rounded-lg bg-glass-border/40"
                    >
                      <ImageIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                      <span className="sr-only">{el.label}</span>
                    </div>
                  )
                case 'button':
                  return (
                    <span
                      key={i}
                      className="self-start rounded-full bg-primary px-3 py-1 text-[10px] font-medium text-primary-foreground"
                    >
                      {el.label}
                    </span>
                  )
                case 'input':
                  return (
                    <span
                      key={i}
                      className="rounded-full border border-glass-border px-3 py-1.5 text-[10px] text-muted-foreground"
                    >
                      {el.label}
                    </span>
                  )
                case 'list':
                  return (
                    <div key={i} className="flex flex-col gap-1.5">
                      {[0, 1, 2].map((row) => (
                        <div key={row} className="flex items-center gap-2">
                          <span className="size-4 shrink-0 rounded-md bg-glass-border/60" />
                          <span className="h-1.5 flex-1 rounded-full bg-glass-border" />
                        </div>
                      ))}
                      <span className="sr-only">{el.label}</span>
                    </div>
                  )
              }
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Registry + dispatcher                                                */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY: Record<Block['type'], ComponentType<{ block: any }>> = {
  stat: StatCard,
  chart: ChartCard,
  list: ListCard,
  text: TextCard,
  grid: GridCard,
  action: ActionCard,
  table: TableCard,
  bracket: BracketCard,
  timeline: TimelineCard,
  chat: ChatCard,
  preview: PreviewCard,
  code: CodeStudio,
  image: ImageStudio,
  music: MusicStudio,
}

/** Renders any schema block by looking up its component in the registry. */
export function GlassBlock({ block }: { block: Block }) {
  const Component = REGISTRY[block.type]
  return <Component block={block} />
}

/** Column-span hints so the masonry grid feels intentionally composed. */
export function blockSpan(block: Block): string {
  switch (block.type) {
    case 'chart':
    case 'text':
    case 'table':
    case 'chat':
    case 'music':
      return 'md:col-span-2'
    case 'list':
      return 'md:col-span-2 lg:col-span-2'
    case 'image':
      return 'md:col-span-1 lg:col-span-2'
    case 'bracket':
    case 'action':
      return 'md:col-span-2 lg:col-span-3'
    case 'code':
      return 'md:col-span-2 lg:col-span-3'
    default:
      return ''
  }
}
