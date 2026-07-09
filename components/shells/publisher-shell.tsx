'use client'

/**
 * PUBLISHER SHELL — a document workspace in the spirit of Affinity
 * Publisher / a modern writing app: a pages sidebar on the left, a bright
 * paper page in the center (deliberately NOT glass — real documents are
 * paper-white), and typography/structure inspectors on the right.
 */

import { motion } from 'framer-motion'
import { BookOpen, ChevronLeft, FileText, Type } from 'lucide-react'
import type { Block, LayoutSchema } from '@/lib/generative-engine'
import { GlassBlock } from '@/components/glass-blocks'
import { ShellChrome, SourceBadge } from '@/components/shells/shared'

export function PublisherShell({
  schema,
  source,
  onReset,
}: {
  schema: LayoutSchema
  source: 'gemini' | 'fallback'
  onReset: () => void
}) {
  const textBlocks = schema.blocks.filter((b) => b.type === 'text')
  const otherBlocks = schema.blocks.filter((b) => b.type !== 'text')

  return (
    <ShellChrome>
      {/* Top bar — app menu strip */}
      <div className="glass-strong flex items-center gap-3 rounded-t-2xl border-b border-glass-border px-4 py-2.5">
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          Close
        </button>
        <span className="h-4 w-px bg-glass-border" aria-hidden="true" />
        <BookOpen className="size-4 text-glow-amber" aria-hidden="true" />
        <h1 className="truncate text-sm font-semibold">{schema.title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <SourceBadge source={source} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Pages sidebar */}
        <aside className="hidden w-44 flex-col gap-2 border-r border-glass-border p-3 md:flex">
          <span className="px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Pages
          </span>
          {textBlocks.map((b, i) => (
            <div
              key={i}
              className={`flex flex-col gap-1 rounded-lg border p-2 text-left ${
                i === 0 ? 'border-glow-amber/40 bg-glow-amber/5' : 'border-glass-border'
              }`}
            >
              <div className="flex aspect-[3/4] flex-col gap-1 rounded-sm bg-foreground/90 p-1.5">
                <span className="h-1 w-3/4 rounded-full bg-background/50" />
                <span className="h-0.5 w-full rounded-full bg-background/30" />
                <span className="h-0.5 w-full rounded-full bg-background/30" />
                <span className="h-0.5 w-2/3 rounded-full bg-background/30" />
              </div>
              <span className="truncate text-[10px] text-muted-foreground">
                {i + 1}. {(b as Extract<Block, { type: 'text' }>).title}
              </span>
            </div>
          ))}
        </aside>

        {/* Paper canvas */}
        <div className="flex min-w-0 flex-1 justify-center overflow-y-auto bg-black/20 p-4 md:p-8">
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="h-fit w-full max-w-2xl rounded-sm bg-foreground p-8 text-background shadow-2xl md:p-12"
          >
            <h2 className="mb-2 font-serif text-3xl font-bold text-balance">{schema.title}</h2>
            <p className="mb-8 text-sm italic opacity-60">{schema.summary}</p>
            {textBlocks.map((b, i) => {
              const block = b as Extract<Block, { type: 'text' }>
              return (
                <section key={i} className="mb-8">
                  <h3 className="mb-2 font-serif text-xl font-semibold">{block.title}</h3>
                  <p className="text-sm leading-relaxed opacity-80">{block.body}</p>
                </section>
              )
            })}
            {textBlocks.length === 0 && (
              <p className="text-sm italic opacity-60">
                Use the assistant to draft your document content.
              </p>
            )}
          </motion.article>
        </div>

        {/* Inspector rail */}
        {otherBlocks.length > 0 && (
          <aside className="hidden w-80 flex-col gap-3 overflow-y-auto border-l border-glass-border p-3 lg:flex">
            <span className="flex items-center gap-1.5 px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <Type className="size-3" aria-hidden="true" />
              Studio Tools
            </span>
            {otherBlocks.map((block, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
              >
                <GlassBlock block={block} />
              </motion.div>
            ))}
          </aside>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 rounded-b-2xl border-t border-glass-border px-4 py-1.5 font-mono text-[10px] text-muted-foreground">
        <FileText className="size-3" aria-hidden="true" />
        <span>{textBlocks.length} sections</span>
        <span className="ml-auto">Lumen Publisher</span>
      </div>
    </ShellChrome>
  )
}
