'use client'

/**
 * Workspace blocks — the FUNCTIONAL cores of a generated interface.
 *
 *  - CodeStudio:  a working mini IDE. Gemini writes a real single-file app;
 *                 rendered live in a sandboxed iframe. Code is editable,
 *                 re-runnable, AI-revisable and downloadable.
 *  - ImageStudio: real image generation (Gemini image model) with an
 *                 editable prompt, regenerate and download.
 *  - MusicStudio: real composition (Gemini writes the notes) synthesized
 *                 live in the browser with WebAudio, with a piano-roll view.
 */

import { motion } from 'framer-motion'
import {
  Code2,
  Download,
  ImageIcon,
  Loader2,
  Music,
  Pause,
  Play,
  RefreshCw,
  Send,
  Wand2,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import type { CodeBlock, ImageBlock, MusicBlock } from '@/lib/generative-engine'

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */

function StudioShell({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: typeof Code2
  title: string
  badge: string
  children: React.ReactNode
}) {
  return (
    <div className="glass flex flex-col overflow-hidden rounded-3xl">
      <div className="flex items-center gap-2 border-b border-glass-border px-5 py-3.5">
        <Icon className="size-4 text-glow-cyan" aria-hidden="true" />
        <h3 className="min-w-0 truncate text-sm font-medium">{title}</h3>
        <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {badge}
        </span>
      </div>
      {children}
    </div>
  )
}

function LoadingPane({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 p-8">
      <Loader2 className="size-6 animate-spin text-glow-cyan" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function ErrorPane({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 p-8">
      <p className="text-center text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="glass-strong flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors hover:text-glow-cyan"
      >
        <RefreshCw className="size-3.5" aria-hidden="true" />
        Retry
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* CodeStudio — working mini IDE with live preview                      */
/* ------------------------------------------------------------------ */

export function CodeStudio({ block }: { block: CodeBlock }) {
  const [code, setCode] = useState('')
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [tab, setTab] = useState<'preview' | 'code'>('preview')
  const [instruction, setInstruction] = useState('')
  const [revising, setRevising] = useState(false)
  // Bumping the key remounts the iframe = clean re-run of the app.
  const [runKey, setRunKey] = useState(0)

  const generate = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec: block.spec }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const text = await res.text()
      setCode(text)
      setDraft(text)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [block.spec])

  useEffect(() => {
    generate()
  }, [generate])

  async function handleRevise(e: FormEvent) {
    e.preventDefault()
    const text = instruction.trim()
    if (!text || revising) return
    setRevising(true)
    try {
      const res = await fetch('/api/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec: block.spec, code, instruction: text }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const next = await res.text()
      setCode(next)
      setDraft(next)
      setRunKey((k) => k + 1)
      setInstruction('')
      setTab('preview')
    } catch {
      // keep old code; surface nothing destructive
    } finally {
      setRevising(false)
    }
  }

  function handleRun() {
    setCode(draft)
    setRunKey((k) => k + 1)
    setTab('preview')
  }

  function handleDownload() {
    const blob = new Blob([code], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${block.title.toLowerCase().replace(/\s+/g, '-')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <StudioShell icon={Code2} title={block.title} badge="Live IDE">
      {status === 'loading' ? (
        <LoadingPane label="Writing the code…" />
      ) : status === 'error' ? (
        <ErrorPane message="Code generation failed." onRetry={generate} />
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-1 border-b border-glass-border px-3 py-2">
            {(['preview', 'code'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 text-xs capitalize transition-colors ${
                  tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1">
              {tab === 'code' && draft !== code && (
                <button
                  type="button"
                  onClick={handleRun}
                  className="flex items-center gap-1.5 rounded-full bg-glow-cyan/15 px-3 py-1 text-xs text-glow-cyan"
                >
                  <Play className="size-3" aria-hidden="true" /> Run
                </button>
              )}
              <button
                type="button"
                onClick={() => setRunKey((k) => k + 1)}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Restart app"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Download code"
              >
                <Download className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Workbench */}
          <div className="h-96">
            {tab === 'preview' ? (
              <iframe
                key={runKey}
                srcDoc={code}
                sandbox="allow-scripts allow-pointer-lock"
                title={`${block.title} live preview`}
                className="size-full border-0 bg-[#0b0d12]"
              />
            ) : (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                spellCheck={false}
                aria-label="App source code"
                className="size-full resize-none bg-transparent p-4 font-mono text-xs leading-relaxed text-foreground/90 outline-none"
              />
            )}
          </div>

          {/* AI revision bar */}
          <form
            onSubmit={handleRevise}
            className="flex items-center gap-2 border-t border-glass-border p-3"
          >
            <Wand2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <label htmlFor={`revise-${block.title}`} className="sr-only">
              Ask the AI to change the app
            </label>
            <input
              id={`revise-${block.title}`}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Tell the AI what to change…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <motion.button
              type="submit"
              disabled={revising || !instruction.trim()}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
              whileTap={{ scale: 0.92 }}
              aria-label="Apply AI revision"
            >
              {revising ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-3.5" aria-hidden="true" />
              )}
            </motion.button>
          </form>
        </>
      )}
    </StudioShell>
  )
}

/* ------------------------------------------------------------------ */
/* ImageStudio — real image generation                                  */
/* ------------------------------------------------------------------ */

export function ImageStudio({ block }: { block: ImageBlock }) {
  const [prompt, setPrompt] = useState(block.spec)
  const [image, setImage] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('Image generation failed.')

  const generate = useCallback(async (p: string) => {
    setStatus('loading')
    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p }),
      })
      const data = (await res.json()) as { image?: string; detail?: string }
      if (!res.ok || !data.image) {
        setErrorMsg(data.detail ?? 'Image generation failed.')
        throw new Error('No image')
      }
      setImage(data.image)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    generate(block.spec)
  }, [generate, block.spec])

  function handleDownload() {
    const a = document.createElement('a')
    a.href = image
    a.download = `${block.title.toLowerCase().replace(/\s+/g, '-')}.png`
    a.click()
  }

  return (
    <StudioShell icon={ImageIcon} title={block.title} badge="Image Lab">
      {status === 'loading' ? (
        <LoadingPane label="Painting the image…" />
      ) : status === 'error' ? (
        <ErrorPane message={errorMsg} onRetry={() => generate(prompt)} />
      ) : (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image || '/placeholder.svg'} alt={prompt} className="w-full object-cover" />
          <button
            type="button"
            onClick={handleDownload}
            className="glass-strong absolute right-3 top-3 rounded-full p-2 text-foreground transition-colors hover:text-glow-cyan"
            aria-label="Download image"
          >
            <Download className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (prompt.trim() && status !== 'loading') generate(prompt.trim())
        }}
        className="flex items-center gap-2 border-t border-glass-border p-3"
      >
        <label htmlFor={`img-${block.title}`} className="sr-only">
          Image prompt
        </label>
        <input
          id={`img-${block.title}`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Describe the image…"
        />
        <motion.button
          type="submit"
          disabled={status === 'loading' || !prompt.trim()}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          whileTap={{ scale: 0.92 }}
          aria-label="Generate image"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
        </motion.button>
      </form>
    </StudioShell>
  )
}

/* ------------------------------------------------------------------ */
/* MusicStudio — real composition + WebAudio synth playback             */
/* ------------------------------------------------------------------ */

interface Note {
  p: number
  t: number
  d: number
}
interface Track {
  name: string
  wave: OscillatorType
  volume: number
  notes: Note[]
}
interface Composition {
  title: string
  bpm: number
  bars: number
  tracks: Track[]
}

const midiToFreq = (p: number) => 440 * Math.pow(2, (p - 69) / 12)

export function MusicStudio({ block }: { block: MusicBlock }) {
  const [comp, setComp] = useState<Composition | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<{ ctx: AudioContext; master: GainNode; timer: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const generate = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec: block.spec }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = (await res.json()) as { composition?: Composition }
      if (!data.composition) throw new Error('No composition')
      setComp(data.composition)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [block.spec])

  useEffect(() => {
    generate()
  }, [generate])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      window.clearTimeout(audio.timer)
      audio.master.gain.linearRampToValueAtTime(0, audio.ctx.currentTime + 0.15)
      const ctx = audio.ctx
      window.setTimeout(() => ctx.close(), 300)
      audioRef.current = null
    }
    setPlaying(false)
  }, [])

  // Schedule one full loop of the piece; re-schedule on loop boundary.
  const scheduleLoop = useCallback(
    (ctx: AudioContext, master: GainNode, c: Composition, startAt: number) => {
      const spb = 60 / c.bpm // seconds per beat
      for (const track of c.tracks) {
        for (const n of track.notes) {
          const t0 = startAt + n.t * spb
          const dur = Math.max(0.05, n.d * spb)
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = track.wave
          osc.frequency.value = midiToFreq(n.p)
          // Simple ADSR-ish envelope: quick attack, exponential release.
          gain.gain.setValueAtTime(0, t0)
          gain.gain.linearRampToValueAtTime(track.volume * 0.28, t0 + 0.02)
          gain.gain.setValueAtTime(track.volume * 0.28, t0 + dur * 0.6)
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
          osc.connect(gain)
          gain.connect(master)
          osc.start(t0)
          osc.stop(t0 + dur + 0.05)
        }
      }
    },
    [],
  )

  const play = useCallback(() => {
    if (!comp) return
    stop()
    const ctx = new AudioContext()
    const master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)

    const spb = 60 / comp.bpm
    const loopDur = comp.bars * 4 * spb

    const audio = { ctx, master, timer: 0 }
    audioRef.current = audio

    let nextStart = ctx.currentTime + 0.08
    const tick = () => {
      scheduleLoop(ctx, master, comp, nextStart)
      nextStart += loopDur
      // Re-arm just before the loop ends.
      audio.timer = window.setTimeout(tick, loopDur * 1000 - 250)
    }
    tick()
    setPlaying(true)
  }, [comp, scheduleLoop, stop])

  // Cleanup on unmount.
  useEffect(() => stop, [stop])

  // Piano-roll visualization.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !comp) return
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return
    const W = (canvas.width = canvas.offsetWidth * 2)
    const H = (canvas.height = canvas.offsetHeight * 2)
    ctx2d.clearRect(0, 0, W, H)

    const allNotes = comp.tracks.flatMap((t) => t.notes)
    if (allNotes.length === 0) return
    const minP = Math.min(...allNotes.map((n) => n.p)) - 2
    const maxP = Math.max(...allNotes.map((n) => n.p)) + 2
    const totalBeats = comp.bars * 4
    const colors = ['#5ec8e8', '#e8b45e', '#9fe0ff', '#d9e6f2']

    comp.tracks.forEach((track, ti) => {
      ctx2d.fillStyle = colors[ti % colors.length]
      for (const n of track.notes) {
        const x = (n.t / totalBeats) * W
        const w = Math.max(3, (n.d / totalBeats) * W - 2)
        const y = H - ((n.p - minP) / (maxP - minP)) * H
        ctx2d.globalAlpha = 0.85
        ctx2d.fillRect(x, y - 3, w, 6)
      }
    })
    ctx2d.globalAlpha = 1
  }, [comp])

  return (
    <StudioShell icon={Music} title={comp?.title ?? block.title} badge="Sound Studio">
      {status === 'loading' ? (
        <LoadingPane label="Composing the track…" />
      ) : status === 'error' || !comp ? (
        <ErrorPane message="Composition failed." onRetry={generate} />
      ) : (
        <>
          <div className="flex flex-col gap-4 p-5">
            {/* Piano roll */}
            <div className="glass-strong h-32 overflow-hidden rounded-xl">
              <canvas ref={canvasRef} className="size-full" aria-label="Piano roll of the composition" />
            </div>
            {/* Track chips + meta */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {comp.bpm} BPM · {comp.bars} bars
              </span>
              {comp.tracks.map((t, i) => (
                <span
                  key={i}
                  className="glass-strong rounded-full px-2.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {t.name} · {t.wave}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-glass-border p-3">
            <motion.button
              type="button"
              onClick={playing ? stop : play}
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              whileTap={{ scale: 0.95 }}
            >
              {playing ? (
                <>
                  <Pause className="size-4" aria-hidden="true" /> Stop
                </>
              ) : (
                <>
                  <Play className="size-4" aria-hidden="true" /> Play
                </>
              )}
            </motion.button>
            <button
              type="button"
              onClick={() => {
                stop()
                generate()
              }}
              className="glass-strong flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Recompose
            </button>
          </div>
        </>
      )}
    </StudioShell>
  )
}
