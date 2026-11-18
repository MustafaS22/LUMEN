'use client'

/**
 * GalleryShell — Lumen as a visual creation studio (design-app style):
 * dark canvas center stage, left tool rail, right inspector panel with
 * the live prompt, style quick-actions and an AI art director chat.
 * Image generation is REAL via /api/image.
 */

import { motion } from 'framer-motion'
import {
  Bot,
  Download,
  Loader2,
  Palette,
  RefreshCw,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import type { LayoutSchema, ImageBlock, ChatBlock } from '@/lib/generative-engine'
import { useChatSession, useImageGen } from '@/components/shells/shared'

const STYLE_PRESETS = ['Photorealistic', 'Watercolor', 'Neon noir', 'Minimal vector', 'Oil painting']

export function GalleryShell({
  schema,
  onReset,
}: {
  schema: LayoutSchema
  onReset: () => void
}) {
  const imageBlock = schema.blocks.find((b): b is ImageBlock => b.type === 'image')
  const chatBlock = schema.blocks.find((b): b is ChatBlock => b.type === 'chat')
  const initialPrompt = imageBlock?.spec ?? schema.title

  const [prompt, setPrompt] = useState(initialPrompt)
  const { image, status, errorMsg, generate } = useImageGen(initialPrompt)
  const [tab, setTab] = useState<'inspector' | 'chat'>('inspector')
  const [chatInput, setChatInput] = useState('')
  const chat = useChatSession(
    chatBlock?.persona ??
      `You are an expert art director working on: "${initialPrompt}". Suggest concrete improvements to composition, style, color and mood, and offer improved prompts.`,
    chatBlock?.intro,
  )

  function handleDownload() {
    const a = document.createElement('a')
    a.href = image
    a.download = `${schema.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`
    a.click()
  }

  return (
    <motion.section
      className="flex h-full min-h-0 flex-col lumen-workbench rounded-xl overflow-hidden font-sans text-[#dddddd]"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: 0.5, delay: 0.35 } }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.25 } }}
      aria-label={`Design studio: ${schema.title}`}
    >
      {/* Top bar */}
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-black/60 bg-white/8 px-3 text-xs">
        <Palette className="size-4 text-[#c792ea]" aria-hidden="true" />
        <span className="font-medium">Lumen Studio</span>
        <span className="text-[#8a8a8a]">— {schema.title}</span>
        <button
          type="button"
          onClick={onReset}
          className="ml-auto flex items-center gap-1.5 rounded px-2.5 py-1 text-[#8a8a8a] hover:bg-white/5 hover:text-white"
        >
          <X className="size-3.5" aria-hidden="true" /> Close
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        {/* Canvas */}
        <div
          className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-6"
          style={{
            backgroundImage:
              'repeating-conic-gradient(#1d1d1d 0% 25%, #212121 0% 50%)',
            backgroundSize: '24px 24px',
          }}
        >
          {status === 'loading' ? (
            <div className="flex flex-col items-center gap-3 text-[#8a8a8a]">
              <Loader2 className="size-7 animate-spin text-[#c792ea]" aria-hidden="true" />
              <p className="text-sm">Rendering your image…</p>
            </div>
          ) : status === 'error' ? (
            <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl bg-[#222222] p-6 text-center">
              <p className="text-sm text-[#aaaaaa]">{errorMsg}</p>
              <button
                type="button"
                onClick={() => generate(prompt)}
                className="flex items-center gap-2 rounded-md bg-[#c792ea] px-4 py-1.5 text-sm text-black"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" /> Retry
              </button>
            </div>
          ) : (
            <div className="relative flex h-full w-full max-w-xl items-center justify-center overflow-hidden rounded shadow-2xl shadow-black/60 ring-1 ring-black/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image || '/placeholder.svg'} alt={prompt} className="h-full w-full object-contain" />
              <button
                type="button"
                onClick={handleDownload}
                className="absolute right-3 top-3 rounded-md bg-black/60 p-2 text-white backdrop-blur hover:bg-black/80"
                aria-label="Download SVG artwork"
              >
                <Download className="size-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {/* Inspector */}
        <aside className="flex h-1/2 min-h-0 shrink-0 flex-col border-t border-black/60 bg-[#111a2d78] sm:h-full sm:w-72 sm:border-l sm:border-t-0">
          <div className="flex h-9 shrink-0 items-center border-b border-black/60 text-xs">
            <button
              type="button"
              onClick={() => setTab('inspector')}
              className={`h-full px-4 ${tab === 'inspector' ? 'border-b-2 border-[#c792ea] text-white' : 'text-[#8a8a8a]'}`}
            >
              Inspector
            </button>
            <button
              type="button"
              onClick={() => setTab('chat')}
              className={`h-full px-4 ${tab === 'chat' ? 'border-b-2 border-[#c792ea] text-white' : 'text-[#8a8a8a]'}`}
            >
              <span className="flex items-center gap-1.5">
                <Bot className="size-3.5" aria-hidden="true" /> Art Director
              </span>
            </button>
          </div>

          {tab === 'inspector' ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div>
                <label htmlFor="gallery-prompt" className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#8a8a8a]">
                  Prompt
                </label>
                <textarea
                  id="gallery-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  className="w-full resize-none rounded-md bg-black/30 p-3 text-xs leading-relaxed outline-none ring-1 ring-black/60 focus:ring-[#c792ea]/60"
                />
              </div>
              <button
                type="button"
                onClick={() => generate(prompt)}
                disabled={status === 'loading' || !prompt.trim()}
                className="flex items-center justify-center gap-2 rounded-md bg-[#c792ea] px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
              >
                <Wand2 className="size-4" aria-hidden="true" /> Generate
              </button>
              <div>
                <p className="mb-1.5 text-[10px] uppercase tracking-wider text-[#8a8a8a]">Style</p>
                <div className="flex flex-wrap gap-1.5">
                  {STYLE_PRESETS.map((style) => (
                    <button
                      key={style}
                      type="button"
                      disabled={status === 'loading'}
                      onClick={() => {
                        const next = `${prompt.replace(/, in .*? style$/i, '')}, in ${style.toLowerCase()} style`
                        setPrompt(next)
                      }}
                      className="rounded-full bg-black/30 px-2.5 py-1 text-[11px] text-[#aaaaaa] ring-1 ring-black/60 hover:text-white"
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-xs leading-relaxed">
                {chat.messages.map((m, i) => (
                  <div
                    key={i}
                    className={
                      m.role === 'user'
                        ? 'ml-6 rounded-lg bg-[#c792ea]/20 px-2.5 py-1.5 text-[#e5d0f2]'
                        : 'mr-6 rounded-lg bg-black/25 px-2.5 py-1.5'
                    }
                  >
                    {m.content}
                  </div>
                ))}
                {chat.busy && <p className="animate-pulse text-[#8a8a8a]">thinking…</p>}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  chat.send(chatInput)
                  setChatInput('')
                }}
                className="shrink-0 border-t border-black/60 p-2"
              >
                <label htmlFor="gallery-chat" className="sr-only">
                  Ask the art director
                </label>
                <input
                  id="gallery-chat"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={chatBlock?.placeholder ?? 'Refine the concept…'}
                  className="w-full rounded-md bg-black/30 px-3 py-2 text-xs outline-none ring-1 ring-black/60 placeholder:text-[#8a8a8a]"
                />
              </form>
            </>
          )}
        </aside>
      </div>
    </motion.section>
  )
}
