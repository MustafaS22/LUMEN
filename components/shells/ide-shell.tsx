'use client'

/**
 * IdeShell — Lumen as a full code workbench (VS Code-style).
 *
 * Layout: title bar / activity bar / explorer sidebar / editor + live
 * preview split / AI terminal panel / status bar. The code is REAL:
 * written by Gemini via /api/code, editable, re-runnable, revisable.
 */

import { motion } from 'framer-motion'
import {
  Bot,
  Files,
  GitBranch,
  Loader2,
  Play,
  Search,
  Settings,
  SplitSquareHorizontal,
  Terminal,
  X,
  Zap,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { LayoutSchema, CodeBlock, ChatBlock } from '@/lib/generative-engine'
import { useChatSession, useCodeGen } from '@/components/shells/shared'

export function IdeShell({
  schema,
  onReset,
}: {
  schema: LayoutSchema
  onReset: () => void
}) {
  const codeBlock = schema.blocks.find((b): b is CodeBlock => b.type === 'code')
  const chatBlock = schema.blocks.find((b): b is ChatBlock => b.type === 'chat')

  const spec = codeBlock?.spec ?? schema.title
  const fileName = `${(codeBlock?.title ?? schema.title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`

  const { code, setCode, status, revising, generate, revise } = useCodeGen(spec)
  const [runKey, setRunKey] = useState(0)
  const [showPreview, setShowPreview] = useState(true)
  const [panelTab, setPanelTab] = useState<'ai' | 'chat'>('ai')
  const [instruction, setInstruction] = useState('')
  const [log, setLog] = useState<string[]>([
    `lumen: workspace initialized for "${schema.title}"`,
    'gemini: writing code…',
  ])

  const chat = useChatSession(
    chatBlock?.persona ??
      `You are an expert software engineer pairing on: "${spec}". Keep replies short and concrete.`,
    chatBlock?.intro,
  )
  const [chatInput, setChatInput] = useState('')

  async function handleRevise(e: FormEvent) {
    e.preventDefault()
    const text = instruction.trim()
    if (!text || revising) return
    setLog((l) => [...l, `you: ${text}`, 'gemini: revising…'])
    setInstruction('')
    const ok = await revise(text)
    setLog((l) => [...l, ok ? 'gemini: done — app reloaded' : 'gemini: revision failed'])
    if (ok) setRunKey((k) => k + 1)
  }

  const lines = code.split('\n')

  return (
    <motion.section
      className="fixed inset-0 z-10 flex flex-col overflow-hidden bg-[#1e1e1e] font-sans text-[#cccccc]"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: 0.5, delay: 0.35 } }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.25 } }}
      aria-label={`Code workbench: ${schema.title}`}
    >
      {/* Title bar */}
      <header className="flex h-9 shrink-0 items-center gap-3 border-b border-[#2b2b2b] bg-[#323233] px-3 text-xs">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <button
            type="button"
            onClick={onReset}
            className="size-3 rounded-full bg-[#ff5f57] transition-transform hover:scale-110"
            aria-label="Close workspace"
          />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="flex items-center gap-1.5 text-[#9d9d9d]">
          <Zap className="size-3 text-[#4fc3f7]" aria-hidden="true" />
          Lumen IDE — {schema.title}
        </span>
        <span className="ml-auto rounded bg-[#4fc3f7]/15 px-2 py-0.5 text-[10px] text-[#4fc3f7]">
          Gemini
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Activity bar */}
        <nav
          className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-[#2b2b2b] bg-[#333333] py-2"
          aria-label="Activity bar"
        >
          <button type="button" className="rounded p-2.5 text-white" aria-label="Explorer">
            <Files className="size-5" aria-hidden="true" />
          </button>
          <button type="button" className="rounded p-2.5 text-[#858585] hover:text-white" aria-label="Search">
            <Search className="size-5" aria-hidden="true" />
          </button>
          <button type="button" className="rounded p-2.5 text-[#858585] hover:text-white" aria-label="Source control">
            <GitBranch className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setPanelTab(panelTab === 'ai' ? 'chat' : 'ai')}
            className="rounded p-2.5 text-[#858585] hover:text-white"
            aria-label="AI assistant"
          >
            <Bot className="size-5" aria-hidden="true" />
          </button>
          <button type="button" className="mt-auto rounded p-2.5 text-[#858585] hover:text-white" aria-label="Settings">
            <Settings className="size-5" aria-hidden="true" />
          </button>
        </nav>

        {/* Explorer */}
        <aside className="hidden w-52 shrink-0 flex-col border-r border-[#2b2b2b] bg-[#252526] md:flex">
          <p className="px-4 pb-1 pt-3 text-[10px] uppercase tracking-wider text-[#858585]">
            Explorer
          </p>
          <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#cccccc]">
            {schema.title}
          </p>
          <button
            type="button"
            className="mx-1 flex items-center gap-2 rounded bg-[#37373d] px-3 py-1 text-left text-[13px] text-white"
          >
            <span className="text-[#e8ab53]">{'<>'}</span> {fileName}
          </button>
          <div className="mt-4 border-t border-[#2b2b2b] px-4 pt-3">
            <p className="pb-2 text-[10px] uppercase tracking-wider text-[#858585]">Spec</p>
            <p className="text-[11px] leading-relaxed text-[#9d9d9d]">{spec.slice(0, 280)}</p>
          </div>
        </aside>

        {/* Editor + preview */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Tabs */}
          <div className="flex h-9 shrink-0 items-center border-b border-[#2b2b2b] bg-[#252526]">
            <div className="flex h-full items-center gap-2 border-r border-[#2b2b2b] bg-[#1e1e1e] px-4 text-[13px] text-white">
              <span className="text-[#e8ab53]">{'<>'}</span>
              {fileName}
              <X className="size-3.5 text-[#858585]" aria-hidden="true" />
            </div>
            <div className="ml-auto flex items-center gap-1 px-2">
              <button
                type="button"
                onClick={() => setRunKey((k) => k + 1)}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[#89d185] hover:bg-[#2a2d2e]"
                aria-label="Run app"
              >
                <Play className="size-3.5" aria-hidden="true" /> Run
              </button>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="rounded p-1.5 text-[#858585] hover:bg-[#2a2d2e] hover:text-white"
                aria-label="Toggle preview panel"
              >
                <SplitSquareHorizontal className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1">
            {/* Code editor with line numbers */}
            <div className={`relative min-w-0 ${showPreview ? 'hidden flex-1 lg:block' : 'flex-1'}`}>
              {status === 'loading' ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-[#858585]">
                  <Loader2 className="size-5 animate-spin text-[#4fc3f7]" aria-hidden="true" />
                  <p className="text-xs">Gemini is writing {fileName}…</p>
                </div>
              ) : status === 'error' ? (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <p className="text-xs text-[#858585]">Generation failed.</p>
                  <button
                    type="button"
                    onClick={generate}
                    className="rounded bg-[#0e639c] px-3 py-1.5 text-xs text-white hover:bg-[#1177bb]"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="flex h-full overflow-hidden">
                  <div
                    aria-hidden="true"
                    className="w-12 shrink-0 select-none overflow-hidden bg-[#1e1e1e] pt-2 text-right font-mono text-[11px] leading-[1.5] text-[#6e7681]"
                  >
                    {lines.slice(0, 999).map((_, i) => (
                      <div key={i} className="pr-3">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <label htmlFor="lumen-editor" className="sr-only">
                    Source code editor
                  </label>
                  <textarea
                    id="lumen-editor"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    spellCheck={false}
                    className="h-full min-w-0 flex-1 resize-none bg-[#1e1e1e] pt-2 font-mono text-[11px] leading-[1.5] text-[#d4d4d4] outline-none"
                  />
                </div>
              )}
            </div>

            {/* Live preview */}
            {showPreview && (
              <div className="flex min-w-0 flex-1 flex-col border-l border-[#2b2b2b]">
                <div className="flex h-7 shrink-0 items-center gap-2 bg-[#252526] px-3 text-[10px] uppercase tracking-wider text-[#858585]">
                  Live Preview
                  <span className="ml-auto size-1.5 rounded-full bg-[#89d185]" aria-hidden="true" />
                </div>
                {status === 'ready' ? (
                  <iframe
                    key={runKey}
                    srcDoc={code}
                    sandbox="allow-scripts allow-pointer-lock"
                    title={`${schema.title} live preview`}
                    className="min-h-0 flex-1 border-0 bg-white"
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-center bg-[#161616]">
                    <Loader2 className="size-5 animate-spin text-[#4fc3f7]" aria-hidden="true" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom panel: AI terminal / pair chat */}
          <div className="flex h-44 shrink-0 flex-col border-t border-[#2b2b2b] bg-[#1e1e1e]">
            <div className="flex h-8 shrink-0 items-center gap-4 border-b border-[#2b2b2b] px-4 text-[11px] uppercase tracking-wide">
              <button
                type="button"
                onClick={() => setPanelTab('ai')}
                className={panelTab === 'ai' ? 'border-b border-white pb-1.5 pt-2 text-white' : 'pb-1.5 pt-2 text-[#858585]'}
              >
                <span className="flex items-center gap-1.5">
                  <Terminal className="size-3.5" aria-hidden="true" /> AI Terminal
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPanelTab('chat')}
                className={panelTab === 'chat' ? 'border-b border-white pb-1.5 pt-2 text-white' : 'pb-1.5 pt-2 text-[#858585]'}
              >
                <span className="flex items-center gap-1.5">
                  <Bot className="size-3.5" aria-hidden="true" /> Pair Chat
                </span>
              </button>
            </div>

            {panelTab === 'ai' ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 font-mono text-[11px] leading-relaxed text-[#9d9d9d]">
                  {log.map((line, i) => (
                    <p key={i} className={line.startsWith('you:') ? 'text-[#4fc3f7]' : ''}>
                      {line}
                    </p>
                  ))}
                  {revising && <p className="animate-pulse text-[#e8ab53]">gemini is editing the code…</p>}
                </div>
                <form onSubmit={handleRevise} className="flex shrink-0 items-center gap-2 border-t border-[#2b2b2b] px-4 py-1.5">
                  <span className="font-mono text-[11px] text-[#89d185]" aria-hidden="true">
                    ❯
                  </span>
                  <label htmlFor="ide-instruction" className="sr-only">
                    Tell the AI what to change
                  </label>
                  <input
                    id="ide-instruction"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Tell Gemini what to change — e.g. add a score multiplier"
                    className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-white outline-none placeholder:text-[#6e7681]"
                  />
                  {revising && <Loader2 className="size-3.5 animate-spin text-[#e8ab53]" aria-hidden="true" />}
                </form>
              </>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 text-[12px] leading-relaxed">
                  {chat.messages.map((m, i) => (
                    <p key={i} className={m.role === 'user' ? 'text-[#4fc3f7]' : 'text-[#cccccc]'}>
                      <span className="font-semibold">{m.role === 'user' ? 'you' : 'gemini'}</span>: {m.content}
                    </p>
                  ))}
                  {chat.busy && <p className="animate-pulse text-[#858585]">gemini is thinking…</p>}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    chat.send(chatInput)
                    setChatInput('')
                  }}
                  className="flex shrink-0 items-center gap-2 border-t border-[#2b2b2b] px-4 py-1.5"
                >
                  <label htmlFor="ide-chat" className="sr-only">
                    Ask the pair programmer
                  </label>
                  <input
                    id="ide-chat"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={chatBlock?.placeholder ?? 'Ask about the code…'}
                    className="min-w-0 flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-[#6e7681]"
                  />
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <footer className="flex h-6 shrink-0 items-center gap-4 bg-[#0e639c] px-3 text-[11px] text-white">
        <span className="flex items-center gap-1">
          <GitBranch className="size-3" aria-hidden="true" /> main
        </span>
        <span>{status === 'ready' ? `${lines.length} lines` : 'generating…'}</span>
        <span className="ml-auto">HTML · UTF-8 · Powered by Gemini</span>
      </footer>
    </motion.section>
  )
}
