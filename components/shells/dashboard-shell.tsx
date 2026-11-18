'use client'

import type { LayoutSchema } from '@/lib/generative-engine'
import { GlassBlock, ListCard, blockSpan } from '@/components/glass-blocks'
import { ShellChrome } from '@/components/shells/shared'

export function DashboardShell({ schema, onLayoutChange }: {
  schema: LayoutSchema
  onLayoutChange: (layout: LayoutSchema) => void
}) {
  const indexedBlocks = schema.blocks.map((block, index) => ({ block, index }))
  const stats = indexedBlocks.filter(({ block }) => block.type === 'stat')
  const panels = indexedBlocks.filter(({ block }) => block.type !== 'stat')

  return (
    <ShellChrome>
      <div className="lumen-dashboard">
        {stats.length > 0 && (
          <div className="lumen-metrics" aria-label="Key metrics">
            {stats.map(({ block, index }) => <GlassBlock key={index} block={block} />)}
          </div>
        )}
        {panels.length > 0 && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {panels.map(({ block, index }) => (
              <div key={index} className={blockSpan(block)}>
                {block.type === 'list' ? <ListCard block={block} onChange={(itemIndex, done) => {
                  const items = block.items.map((item, position) => position === itemIndex ? { ...item, done } : item)
                  onLayoutChange({ ...schema, blocks: schema.blocks.map((item, position) => position === index ? { ...block, items } : item) })
                }} /> : <GlassBlock block={block} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </ShellChrome>
  )
}
