'use client'

/**
 * MusicShell — Lumen as a DAW (GarageBand-style).
 *
 * Transport bar with LCD display, track headers on the left, note-lane
 * timeline with a moving playhead, and an AI producer chat drawer.
 * The composition is REAL: ChatGPT writes the notes, WebAudio plays them.
 */

import { motion } from 'framer-motion'
import {
  Bot,
  Loader2,
  Music2,
  Pause,
  Play,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { LayoutSchema, MusicBlock, ChatBlock } from '@/lib/generative-engine'
import { useChatSession, useMusicGen, type Track } from '@/components/shells/shared'

const TRACK_COLORS = ['#30b0c7', '#8e5bd4', '#e0a03c', '#4fae54', '#d45b7a', '#5b7dd4']

function TrackLane({ track, color, bars }: { track: Track; color: string; bars: number }) {
  const totalBeats = bars * 4
  const { minP, range } = useMemo(() => {
    const ps = track.notes.map((n) => n.p)
    const min = Math.min(...ps, 60)
    const max = Math.max(...ps, min + 1)
    return { minP: min, range: max - min || 1 }
  }, [track.notes])

  return (
    <div className="relative h-full w-full">
      {track.notes.map((n, i) => (
        <div
          key={i}
          className="absolute rounded-[2px]"
          style={{
            left: `${(n.t / totalBeats) * 100}%`,
            width: `max(0.5%, ${(n.d / totalBeats) * 100 - 0.2}%)`,
            top: `${86 - ((n.p - minP) / range) * 72}%`,
            height: '12%',
            backgroundColor: color,
            opacity: 0.92,
          }}
        />
      ))}
    </div>
  )
}

export function MusicShell({
  schema,
}: {
  schema: LayoutSchema
}) {
  const musicBlock = schema.blocks.find((b): b is MusicBlock => b.type === 'music')
  const chatBlock = schema.blocks.find((b): b is ChatBlock => b.type === 'chat')
  const spec = musicBlock?.spec ?? schema.title

  const { comp, status, playing, beat, generate, play, stop } = useMusicGen(spec)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const chat = useChatSession(
    chatBlock?.persona ??
      `You are an expert music producer working on: "${spec}". Give short, concrete advice on arrangement, sound design and mixing.`,
    chatBlock?.intro,
  )

  const totalBeats = (comp?.bars ?? 8) * 4
  const playheadPct = (beat / totalBeats) * 100

  return (
    <motion.section
      className="flex h-full min-h-0 flex-col lumen-workbench rounded-xl overflow-hidden font-sans text-[#d8d9dd]"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: 0.5, delay: 0.35 } }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.25 } }}
      aria-label={`Music studio: ${schema.title}`}
    >
      {/* Transport bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-black/40 bg-white/8 px-2 sm:px-4">
        <Music2 className="hidden size-4 text-[#30b0c7] sm:block" aria-hidden="true" />
        <span className="hidden text-sm font-medium sm:block">Lumen Studio</span>

        {/* Transport controls */}
        <div className="mx-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={playing ? stop : play}
            disabled={status !== 'ready'}
            className="flex size-10 items-center justify-center rounded-full bg-gradient-to-b from-[#4a4b52] to-[#37383e] text-white shadow-inner ring-1 ring-black/50 transition-transform hover:scale-105 disabled:opacity-40"
            aria-label={playing ? 'Stop playback' : 'Play composition'}
          >
            {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="ml-0.5 size-4" aria-hidden="true" />}
          </button>

          {/* LCD display */}
          <div className="flex h-10 min-w-26 items-center justify-center gap-2 sm:min-w-44 sm:gap-4 rounded-md bg-[#1c2b20] px-4 font-mono text-[#7de89a] shadow-inner ring-1 ring-black/60">
            {status === 'loading' ? (
              <span className="animate-pulse text-xs">COMPOSING…</span>
            ) : (
              <>
                <span className="text-sm tabular-nums">
                  {String(Math.floor(beat / 4) + 1).padStart(2, '0')}.{String(Math.floor(beat % 4) + 1)}
                </span>
                <span className="hidden text-[10px] opacity-70 sm:inline">BAR.BEAT</span>
                <span className="text-sm tabular-nums">{comp?.bpm ?? '--'}</span>
                <span className="text-[10px] opacity-70">BPM</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              stop()
              generate()
            }}
            className="flex size-10 items-center justify-center rounded-full bg-gradient-to-b from-[#4a4b52] to-[#37383e] text-[#d8d9dd] ring-1 ring-black/50 transition-transform hover:scale-105"
            aria-label="Recompose track"
            disabled={status === 'loading'}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs ring-1 ring-black/40 ${drawerOpen ? 'bg-[#30b0c7] text-black' : 'bg-[#37383e] text-[#d8d9dd]'}`}
        >
          <Bot className="size-3.5" aria-hidden="true" /> Producer
        </button>
      </header>

      {/* Track area */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {/* Ruler */}
          <div className="sticky top-0 z-10 flex h-7 shrink-0 border-b border-black/40 bg-[#232428] pl-44">
            <div className="relative flex-1">
              {Array.from({ length: comp?.bars ?? 8 }, (_, i) => (
                <span
                  key={i}
                  className="absolute top-1 font-mono text-[10px] text-[#7d7e85]"
                  style={{ left: `${(i / (comp?.bars ?? 8)) * 100}%` }}
                >
                  {i + 1}
                </span>
              ))}
              {playing && (
                <div
                  className="absolute inset-y-0 w-px bg-white"
                  style={{ left: `${playheadPct}%` }}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>

          {status === 'loading' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[#7d7e85]">
              <Loader2 className="size-6 animate-spin text-[#30b0c7]" aria-hidden="true" />
              <p className="text-sm">ChatGPT is composing “{schema.title}”…</p>
            </div>
          ) : status === 'error' || !comp ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <p className="text-sm text-[#7d7e85]">Composition failed.</p>
              <button
                type="button"
                onClick={generate}
                className="rounded-md bg-[#30b0c7] px-4 py-1.5 text-sm text-black"
              >
                Retry
              </button>
            </div>
          ) : (
            comp.tracks.map((track, ti) => {
              const color = TRACK_COLORS[ti % TRACK_COLORS.length]
              return (
                <div key={ti} className="flex h-20 shrink-0 border-b border-black/30">
                  {/* Track header */}
                  <div
                    className="flex w-44 shrink-0 flex-col justify-center gap-1 border-r border-black/40 bg-[#313237] px-3"
                    style={{ boxShadow: `inset 3px 0 0 ${color}` }}
                  >
                    <span className="truncate text-xs font-medium">{track.name}</span>
                    <span className="flex items-center gap-1 text-[10px] text-[#7d7e85]">
                      <SlidersHorizontal className="size-3" aria-hidden="true" />
                      {track.wave} · vol {Math.round(track.volume * 100)}
                    </span>
                  </div>
                  {/* Note lane */}
                  <div className="relative min-w-0 flex-1 bg-[#232428]">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 12.5%)',
                      }}
                    />
                    <TrackLane track={track} color={color} bars={comp.bars} />
                    {playing && (
                      <div
                        className="absolute inset-y-0 w-px bg-white/80"
                        style={{ left: `${playheadPct}%` }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>
              )
            })
          )}
          {status === 'ready' && (
            <p className="px-4 py-3 text-[11px] text-[#7d7e85]">
              “{comp?.title}” — composed by ChatGPT · {comp?.bars} bars · loops on play
            </p>
          )}
        </div>

        {/* Producer chat drawer */}
        {drawerOpen && (
          <aside className="flex w-72 shrink-0 flex-col border-l border-black/40 bg-[#111a2d78]">
            <div className="flex h-9 shrink-0 items-center gap-2 border-b border-black/40 px-3 text-xs font-medium">
              <Bot className="size-3.5 text-[#30b0c7]" aria-hidden="true" />
              AI Producer
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="ml-auto text-[#7d7e85] hover:text-white"
                aria-label="Close producer chat"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-xs leading-relaxed">
              {chat.messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === 'user'
                      ? 'ml-6 rounded-lg bg-[#30b0c7]/20 px-2.5 py-1.5 text-[#bfe9f2]'
                      : 'mr-6 rounded-lg bg-black/25 px-2.5 py-1.5'
                  }
                >
                  {m.content}
                </div>
              ))}
              {chat.busy && <p className="animate-pulse text-[#7d7e85]">thinking…</p>}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                chat.send(chatInput)
                setChatInput('')
              }}
              className="shrink-0 border-t border-black/40 p-2"
            >
              <label htmlFor="producer-chat" className="sr-only">
                Ask the producer
              </label>
              <input
                id="producer-chat"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={chatBlock?.placeholder ?? 'Ask about the track…'}
                className="w-full rounded-md bg-black/30 px-3 py-2 text-xs outline-none ring-1 ring-black/40 placeholder:text-[#7d7e85]"
              />
            </form>
          </aside>
        )}
      </div>
    </motion.section>
  )
}
