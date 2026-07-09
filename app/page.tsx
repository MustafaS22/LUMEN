'use client'

/**
 * Application Shell — one continuous scene, no screen swap.
 *
 *   idle      → centered blob + floating prompt field
 *   thinking  → blob agitates while Gemini designs the layout
 *   generated → the blob SPLITS: its core collapses as glass shards fly
 *               outward and keep floating behind the generated panels.
 *               The UI materializes in the space the blob vacated.
 *
 * The 3D layer is never unmounted and never faded out — the shards remain
 * live and pointer-reactive behind the interface, so the generated UI reads
 * as being made from the blob's own glass.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import type { LayoutSchema } from '@/lib/generative-engine'
import { generateLayout } from '@/lib/generative-engine'
import { ShellRouter } from '@/components/shells/shell-router'
import { PromptField } from '@/components/prompt-field'
import type { BlobPhase } from '@/components/glass-blob'

// R3F canvas is client-only; skip SSR to avoid hydration overhead.
const GlassBlob = dynamic(
  () => import('@/components/glass-blob').then((m) => m.GlassBlob),
  { ssr: false },
)

type AppState = 'idle' | 'thinking' | 'generated'

export default function Home() {
  const [state, setState] = useState<AppState>('idle')
  const [schema, setSchema] = useState<LayoutSchema | null>(null)
  const [source, setSource] = useState<'gemini' | 'fallback'>('gemini')
  const [refining, setRefining] = useState(false)

  const handleSubmit = useCallback(async (prompt: string) => {
    setState('thinking')
    setSchema(null)
    const result = await generateLayout(prompt) // researched + designed by Gemini
    setSchema(result.layout)
    setSource(result.source)
    setState('generated')
  }, [])

  // Follow-up prompts REFINE the current UI (blob stays split, panels swap).
  const handleRefine = useCallback(
    async (prompt: string) => {
      if (!schema || refining) return
      setRefining(true)
      const result = await generateLayout(prompt, schema)
      setSchema(result.layout)
      setSource(result.source)
      setRefining(false)
    },
    [schema, refining],
  )

  const handleReset = useCallback(() => {
    setState('idle')
    setSchema(null)
  }, [])

  const blobPhase: BlobPhase =
    state === 'generated' ? 'split' : state === 'thinking' ? 'thinking' : 'idle'

  return (
    <main className="relative min-h-svh overflow-hidden">
      {/* Ambient accent glows behind everything */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="absolute left-[12%] top-[18%] size-[36rem] rounded-full bg-glow-cyan opacity-[0.14] blur-[140px]" />
        <div className="absolute bottom-[8%] right-[10%] size-[30rem] rounded-full bg-glow-amber opacity-[0.10] blur-[140px]" />
      </div>

      {/* The persistent 3D layer — the blob splits into shards that stay
          floating (and pointer-reactive) behind the generated panels. */}
      <div className="fixed inset-0">
        <GlassBlob phase={blobPhase} />
      </div>

      {/* Landing overlay: brand mark + centered prompt under the blob */}
      <AnimatePresence>
        {state !== 'generated' && (
          <motion.div
            key="landing"
            className="relative z-10 flex min-h-svh flex-col items-center justify-end pb-[16svh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.8 } }}
            exit={{
              opacity: 0,
              filter: 'blur(8px)',
              transition: { duration: 0.45, ease: 'easeIn' },
            }}
          >
            <motion.header
              className="absolute top-8 flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.9 }}
            >
              <p className="font-mono text-xs uppercase tracking-[0.4em] text-muted-foreground">
                Lumen
              </p>
              <h2 className="text-center text-2xl font-light tracking-tight text-balance md:text-3xl">
                An interface that builds itself
              </h2>
            </motion.header>

            <PromptField
              onSubmit={handleSubmit}
              loading={state === 'thinking'}
              docked={false}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated UI — materializes where the blob used to be. Delayed
          slightly so the shard scatter reads first, then panels form. */}
      <AnimatePresence mode="wait">
        {state === 'generated' && schema && (
          <ShellRouter
            key={schema.title}
            schema={schema}
            source={source}
            onReset={handleReset}
          />
        )}
      </AnimatePresence>

      {state === 'generated' && (
        <motion.div
          className="fixed inset-x-0 bottom-6 z-20 flex justify-center px-4"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.6 }}
        >
          <PromptField onSubmit={handleRefine} loading={refining} docked />
        </motion.div>
      )}
    </main>
  )
}
