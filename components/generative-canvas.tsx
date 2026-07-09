'use client'

/**
 * GenerativeCanvas — renders a LayoutSchema as an orchestrated glass UI.
 *
 * Motion design:
 * - The container staggers children (0.08s apart) so panels materialize in
 *   a pleasing cascade rather than all at once.
 * - Each panel enters with a spring (stiffness 260 / damping 24) from a
 *   slightly scaled-down, blurred, lower position → weighty and tactile.
 * - Exit reverses the effect so regenerations feel like the glass dissolving
 *   back into the blob.
 */

import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import type { LayoutSchema } from '@/lib/generative-engine'
import { GlassBlock, blockSpan } from '@/components/glass-blocks'

const container = {
  hidden: {},
  show: {
    // delayChildren gives the blob's shard-scatter a beat to read first,
    // so the panels appear to form FROM the dispersing glass.
    transition: { staggerChildren: 0.08, delayChildren: 0.45 },
  },
  exit: {
    transition: { staggerChildren: 0.04, staggerDirection: -1 },
  },
}

const panel = {
  hidden: { opacity: 0, y: 48, scale: 0.92, filter: 'blur(12px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring' as const, stiffness: 260, damping: 24, mass: 0.9 },
  },
  exit: {
    opacity: 0,
    y: -24,
    scale: 0.94,
    filter: 'blur(8px)',
    transition: { duration: 0.25, ease: 'easeIn' as const },
  },
}

export function GenerativeCanvas({
  schema,
  source = 'gemini',
  onReset,
}: {
  schema: LayoutSchema
  source?: 'gemini' | 'fallback'
  onReset: () => void
}) {
  return (
    <motion.section
      key={schema.title}
      variants={container}
      initial="hidden"
      animate="show"
      exit="exit"
      className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-24 pb-40 md:px-8"
      aria-label="Generated interface"
    >
      {/* Glass header bar */}
      <motion.header
        variants={panel}
        className="glass-strong mb-6 flex items-center justify-between gap-4 rounded-3xl px-6 py-5"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">
              {schema.title}
            </h1>
            <span className="glass shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {source === 'gemini' ? 'Gemini' : 'Offline'}
            </span>
          </div>
          <p className="truncate text-sm text-muted-foreground">{schema.summary}</p>
        </div>
        <motion.button
          type="button"
          onClick={onReset}
          className="glass flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset
        </motion.button>
      </motion.header>

      {/* Auto-arranged masonry-ish grid of generated blocks */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {schema.blocks.map((block, i) => (
          <motion.div key={i} variants={panel} className={blockSpan(block)}>
            <GlassBlock block={block} />
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
