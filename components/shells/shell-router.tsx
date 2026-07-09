'use client'

/**
 * ShellRouter — the shape-shifting heart of Lumen.
 *
 * Picks which PROFESSIONAL APP the workspace becomes based on the layout's
 * shell field (chosen by Gemini, or derived from content). Each shell is a
 * completely different interface — an IDE, a DAW, an answer engine, a
 * design studio, a publisher, or a data terminal — not a themed variant.
 */

import { motion } from 'framer-motion'
import type { LayoutSchema } from '@/lib/generative-engine'
import { deriveShell } from '@/lib/layout-schema'
import { IdeShell } from '@/components/shells/ide-shell'
import { MusicShell } from '@/components/shells/music-shell'
import { AnswerShell } from '@/components/shells/answer-shell'
import { GalleryShell } from '@/components/shells/gallery-shell'
import { PublisherShell } from '@/components/shells/publisher-shell'
import { DashboardShell } from '@/components/shells/dashboard-shell'

export function ShellRouter({
  schema,
  source = 'gemini',
  onReset,
}: {
  schema: LayoutSchema
  source?: 'gemini' | 'fallback'
  onReset: () => void
}) {
  const shell = schema.shell ?? deriveShell(schema.blocks)
  const props = { schema, source, onReset }

  return (
    <motion.div
      key={schema.title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.35 } }}
      exit={{ opacity: 0, scale: 0.97, filter: 'blur(8px)', transition: { duration: 0.25 } }}
      className="relative z-10 mx-auto h-[calc(100dvh-8.5rem)] w-full max-w-7xl px-3 pt-16 md:px-6"
    >
      {shell === 'ide' && <IdeShell {...props} />}
      {shell === 'music' && <MusicShell {...props} />}
      {shell === 'answer' && <AnswerShell {...props} />}
      {shell === 'gallery' && <GalleryShell {...props} />}
      {shell === 'publisher' && <PublisherShell {...props} />}
      {shell === 'dashboard' && <DashboardShell {...props} />}
    </motion.div>
  )
}
