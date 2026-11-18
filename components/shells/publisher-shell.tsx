'use client'

import { BookOpen, Download } from 'lucide-react'
import { useState } from 'react'
import type { LayoutSchema, TextBlock } from '@/lib/generative-engine'
import { downloadFile, safeFilename } from '@/lib/download'
import { GlassBlock } from '@/components/glass-blocks'
import { ShellChrome } from '@/components/shells/shared'

export function PublisherShell({ schema, onLayoutChange }: {
  schema: LayoutSchema
  onLayoutChange: (layout: LayoutSchema) => void
}) {
  const sections = schema.blocks.flatMap((block, index) => block.type === 'text' ? [{ block, index }] : [])
  const tools = schema.blocks.filter((block) => block.type !== 'text')
  const [current, setCurrent] = useState(0)
  const selected = sections[current] ?? sections[0]

  function edit(field: 'title' | 'body', value: string) {
    const blocks = schema.blocks.map((block, index) =>
      index === selected.index ? { ...block as TextBlock, [field]: value } : block)
    onLayoutChange({ ...schema, blocks })
  }

  function exportDocument() {
    const text = [schema.title, schema.summary, ...sections.map(({ block }) => `${block.title}\n${block.body}`)].join('\n\n')
    downloadFile(`${safeFilename(schema.title)}.txt`, text, 'text/plain;charset=utf-8')
  }

  return (
    <ShellChrome>
      <div className="lumen-ide-header">
        <BookOpen size={17} aria-hidden="true" />
        <span>Document studio</span>
        <button type="button" className="lumen-secondary ml-auto" onClick={exportDocument}><Download size={16} aria-hidden="true" /> Export text</button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {sections.length > 0 && <nav aria-label="Document sections" className="flex shrink-0 gap-2 overflow-x-auto border-b border-glass-border p-3 md:w-52 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
          {sections.map(({ block, index }, position) => (
            <button key={index} type="button" onClick={() => setCurrent(position)} aria-current={selected?.index === index ? 'true' : undefined}
              className="min-w-30 rounded-lg border border-glass-border px-3 py-2 text-left text-sm text-muted-foreground aria-[current=true]:bg-glow-cyan/10 aria-[current=true]:text-foreground">
              {block.title || 'Untitled section'}
            </button>
          ))}
        </nav>}
        <div className="min-w-0 flex-1 overflow-y-auto px-3 py-5 md:p-8">
          <article className="mx-auto mb-4 max-w-3xl rounded-md bg-[#eef4ec] p-5 text-[#263638] sm:p-9">
            <p className="mb-6 text-sm italic text-[#445759]">{schema.summary}</p>
            {selected ? <>
              <label className="sr-only" htmlFor="document-section-title">Section title</label>
              <input id="document-section-title" className="mb-4 w-full border-b border-[#8bacaa] p-1 font-serif text-xl font-semibold sm:text-3xl" value={selected.block.title} maxLength={180} onChange={(event) => edit('title', event.target.value)} />
              <label className="sr-only" htmlFor="document-section-body">Section text</label>
              <textarea id="document-section-body" rows={7} className="block w-full resize-y rounded p-1 font-serif text-base leading-relaxed sm:text-lg" value={selected.block.body} maxLength={10000} onChange={(event) => edit('body', event.target.value)} />
            </> : <p className="text-sm">Refine this workspace to add a document section.</p>}
          </article>
          {tools.map((block, index) => <div className="mx-auto mb-3 max-w-3xl" key={index}><GlassBlock block={block} /></div>)}
        </div>
      </div>
    </ShellChrome>
  )
}
