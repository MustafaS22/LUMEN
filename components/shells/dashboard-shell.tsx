'use client'

/**
 * DASHBOARD SHELL — a mission-control data workspace (think Grafana /
 * Bloomberg terminal): a slim command toolbar, a dense panel wall with
 * section rails, and a live status footer. Used for analytics, sports,
 * tracking, research data — anything whose native shape is panels of data.
 */

import { motion } from 'framer-motion'
import { Activity, LayoutGrid, RotateCcw } from 'lucide-react'
import type { LayoutSchema } from '@/lib/generative-engine'
import { GlassBlock, ListCard, blockSpan } from '@/components/glass-blocks'
import { ShellChrome, SourceBadge } from '@/components/shells/shared'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.35 } },
}

const panel = {
  hidden: { opacity: 0, y: 32, scale: 0.95, filter: 'blur(10px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring' as const, stiffness: 260, damping: 24 },
  },
}

export function DashboardShell({
  schema,
  source,
  onReset,
  onLayoutChange,
}: {
  schema: LayoutSchema
  source: 'chatgpt' | 'fallback' | 'example'
  onReset: () => void
  onLayoutChange: (layout: LayoutSchema) => void
}) {
  return (
    <ShellChrome>
      {/* Command toolbar */}
      <div className="glass-strong flex items-center gap-3 rounded-t-2xl border-b border-glass-border px-4 py-2.5">
        <LayoutGrid className="size-4 text-glow-cyan" aria-hidden="true" />
        <h2 className="truncate text-sm font-semibold">Dashboard</h2>
        <span className="hidden truncate text-xs text-muted-foreground md:inline">
          {schema.summary}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <SourceBadge source={source} />
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      {/* Panel wall */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="min-h-0 flex-1 overflow-y-auto p-4"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {schema.blocks.map((block, i) => (
            <motion.div key={i} variants={panel} className={block.type === 'list' ? 'md:col-span-2 lg:col-span-1' : blockSpan(block)}>
              {block.type === 'list' ? <ListCard block={block} onChange={(itemIndex, done) => {
                const items = block.items.map((item, index) => index === itemIndex ? { ...item, done } : item)
                onLayoutChange({ ...schema, blocks: schema.blocks.map((item, index) => index === i ? { ...block, items } : item) })
              }} /> : <GlassBlock block={block} />}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Status footer */}
      <div className="flex items-center gap-3 rounded-b-2xl border-t border-glass-border px-4 py-1.5 font-mono text-[10px] text-muted-foreground">
        <Activity className="size-3 text-glow-cyan" aria-hidden="true" />
        <span>{schema.blocks.length} panels</span>
        <span className="ml-auto">Lumen Terminal</span>
      </div>
    </ShellChrome>
  )
}
