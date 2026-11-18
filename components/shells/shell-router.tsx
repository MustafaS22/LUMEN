'use client'

/**
 * ShellRouter — the shape-shifting heart of Lumen.
 *
 * Picks which PROFESSIONAL APP the workspace becomes based on the layout's
 * shell field (chosen by ChatGPT, or derived from content). Each shell is a
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
  onReset,
  onLayoutChange,
  initialCode,
  live,
}: {
  schema: LayoutSchema
  onReset: () => void
  onLayoutChange: (layout: LayoutSchema) => void
  initialCode?: string
  live: boolean
}) {
  const shell = schema.shell ?? deriveShell(schema.blocks)
  const props = { schema, onReset }

  return (
    <motion.div
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 1, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, scale: 0.97, filter: 'blur(8px)', transition: { duration: 0.25 } }}
      className={shell === 'dashboard' ? 'lumen-shell lumen-shell-dashboard' : 'lumen-shell'}
    >
      {shell === 'ide' && <IdeShell schema={schema} initialCode={initialCode} live={live} />}
      {shell === 'music' && <MusicShell {...props} />}
      {shell === 'answer' && <AnswerShell {...props} />}
      {shell === 'gallery' && <GalleryShell {...props} />}
      {shell === 'publisher' && <PublisherShell {...props} onLayoutChange={onLayoutChange} />}
      {shell === 'dashboard' && <DashboardShell schema={schema} onLayoutChange={onLayoutChange} />}
    </motion.div>
  )
}
