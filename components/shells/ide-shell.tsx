'use client'

import { Code2, Download, Play, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { LayoutSchema } from '@/lib/generative-engine'
import { downloadFile, safeFilename } from '@/lib/download'
import { previewDocument } from '@/lib/preview'
import { ShellChrome, useCodeGen } from '@/components/shells/shared'

export function IdeShell({ schema, initialCode, live }: {
  schema: LayoutSchema
  initialCode?: string
  live: boolean
}) {
  const codeBlock = schema.blocks.find((block) => block.type === 'code')
  const spec = codeBlock?.spec ?? schema.title
  const fileName = `${safeFilename(codeBlock?.title ?? schema.title)}.html`
  const { code, setCode, status, error, revising, generate } = useCodeGen(spec, live, initialCode)
  const [render, setRender] = useState({ code: initialCode ?? '', revision: 0 })
  const [view, setView] = useState<'source' | 'preview'>('preview')
  const [instruction, setInstruction] = useState('')
  const building = status === 'loading'
  const changed = render.code !== code

  function run() {
    setRender((previous) => ({ code, revision: previous.revision + 1 }))
    setView('preview')
  }

  async function revise(event: FormEvent) {
    event.preventDefault()
    const value = instruction.trim()
    if (!value || revising) return
    if (await generate(value)) setInstruction('')
  }

  return (
    <ShellChrome>
      <div className="lumen-ide-header">
        <Code2 size={17} aria-hidden="true" />
        <span className="min-w-0 truncate">{fileName}</span>
        <button className="lumen-secondary ml-auto" type="button" disabled={!code.trim() || building} onClick={run}>
          <Play size={14} aria-hidden="true" /> Run
        </button>
        <button className="lumen-secondary" type="button" disabled={!code.trim() || building} onClick={() => downloadFile(fileName, code, 'text/html')}>
          <Download size={15} aria-hidden="true" /> <span className="hidden sm:inline">Download</span><span className="sr-only sm:hidden">Download HTML</span>
        </button>
      </div>
      <div className="lumen-ide-tabs" aria-label="Editor view">
        <button type="button" aria-pressed={view === 'source'} onClick={() => setView('source')}>HTML source</button>
        <button type="button" aria-pressed={view === 'preview'} onClick={() => setView('preview')}>Preview</button>
      </div>
      <div className="lumen-ide-panels">
        <div className={`lumen-editor-panel ${view === 'source' ? 'is-active' : ''}`}>
          <div className="lumen-editor-label"><label htmlFor="lumen-editor">HTML source</label>{changed && <span>Run to apply changes</span>}</div>
          <textarea id="lumen-editor" spellCheck={false} value={code} onChange={(event) => setCode(event.target.value)} placeholder="Write or paste HTML…" disabled={building || revising} />
        </div>
        <div className={`lumen-preview-panel ${view === 'preview' ? 'is-active' : ''}`}>
          <div className="lumen-editor-label">Sandboxed preview</div>
          {render.code ? (
            <iframe key={render.revision} title={`${schema.title} preview`} sandbox="allow-scripts" srcDoc={previewDocument(render.code)} />
          ) : (
            <div className="lumen-ide-empty">
              <p>{building ? 'ChatGPT is writing the app…' : code ? 'Run the HTML to open a preview.' : 'Run your HTML or build from the workspace prompt.'}</p>
              {!code && <button type="button" className="lumen-primary" disabled={!live || building} onClick={() => generate()}><Sparkles size={15} aria-hidden="true" /> Build with ChatGPT</button>}
            </div>
          )}
        </div>
      </div>
      <form className="lumen-ide-revision" onSubmit={revise}>
        <label className="sr-only" htmlFor="lumen-code-instruction">Describe a code change</label>
        <input id="lumen-code-instruction" placeholder={live ? 'Describe a code change…' : 'Connect ChatGPT for code generation and revisions'} value={instruction} maxLength={1000} onChange={(event) => setInstruction(event.target.value)} disabled={!live || !code || revising || building} />
        <button type="submit" className="lumen-secondary" disabled={!live || !instruction.trim() || !code || revising || building}>{revising ? 'Revising…' : 'Revise code'}</button>
      </form>
      {error && <p role="status" className="px-4 pb-3 text-sm text-destructive">{error}</p>}
    </ShellChrome>
  )
}
