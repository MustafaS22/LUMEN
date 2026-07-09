'use client'

/**
 * Shared functional cores for the app shells.
 *
 * Every shell (IDE, DAW, answer engine, gallery, publisher) is a different
 * INTERFACE over the same real capabilities. These hooks own the API calls
 * and state; the shells own the look.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'

/* ------------------------------------------------------------------ */
/* Shared chrome                                                        */
/* ------------------------------------------------------------------ */

/** Full-height app frame every shell renders into. */
export function ShellChrome({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45 }}
      className="glass flex h-full min-h-0 flex-col overflow-hidden rounded-2xl"
    >
      {children}
    </motion.div>
  )
}

/** Tiny badge showing whether Gemini or the local fallback built the app. */
export function SourceBadge({ source }: { source: 'gemini' | 'fallback' }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
        source === 'gemini'
          ? 'border-glow-cyan/40 text-glow-cyan'
          : 'border-glass-border text-muted-foreground'
      }`}
    >
      {source === 'gemini' ? 'Gemini' : 'Offline'}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Chat session — real Gemini conversation via /api/chat                */
/* ------------------------------------------------------------------ */

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function useChatSession(persona: string, intro?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    intro ? [{ role: 'assistant', content: intro }] : [],
  )
  const [busy, setBusy] = useState(false)

  const send = useCallback(
    async (text: string) => {
      const content = text.trim()
      if (!content || busy) return
      setBusy(true)
      setMessages((prev) => [...prev, { role: 'user', content }])
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            persona,
            messages: [...messages, { role: 'user', content }],
          }),
        })
        if (!res.ok) throw new Error(`API ${res.status}`)
        const reply = await res.text()
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Connection hiccup — try that again.' },
        ])
      } finally {
        setBusy(false)
      }
    },
    [busy, messages, persona],
  )

  return { messages, busy, send }
}

/* ------------------------------------------------------------------ */
/* Code generation — real app writing via /api/code                     */
/* ------------------------------------------------------------------ */

export function useCodeGen(spec: string) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [revising, setRevising] = useState(false)

  const generate = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      setCode(await res.text())
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [spec])

  useEffect(() => {
    generate()
  }, [generate])

  const revise = useCallback(
    async (instruction: string): Promise<boolean> => {
      if (revising) return false
      setRevising(true)
      try {
        const res = await fetch('/api/code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spec, code, instruction }),
        })
        if (!res.ok) throw new Error(`API ${res.status}`)
        setCode(await res.text())
        return true
      } catch {
        return false
      } finally {
        setRevising(false)
      }
    },
    [code, revising, spec],
  )

  return { code, setCode, status, revising, generate, revise }
}

/* ------------------------------------------------------------------ */
/* Music composition + WebAudio synth playback                          */
/* ------------------------------------------------------------------ */

export interface Note {
  p: number
  t: number
  d: number
}
export interface Track {
  name: string
  wave: OscillatorType
  volume: number
  notes: Note[]
}
export interface Composition {
  title: string
  bpm: number
  bars: number
  tracks: Track[]
}

const midiToFreq = (p: number) => 440 * Math.pow(2, (p - 69) / 12)

export function useMusicGen(spec: string) {
  const [comp, setComp] = useState<Composition | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [playing, setPlaying] = useState(false)
  const [beat, setBeat] = useState(0) // playhead in beats, for UI
  const audioRef = useRef<{
    ctx: AudioContext
    master: GainNode
    timer: number
    raf: number
    startedAt: number
  } | null>(null)

  const generate = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = (await res.json()) as { composition?: Composition }
      if (!data.composition) throw new Error('No composition')
      setComp(data.composition)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [spec])

  useEffect(() => {
    generate()
  }, [generate])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      window.clearTimeout(audio.timer)
      window.cancelAnimationFrame(audio.raf)
      audio.master.gain.linearRampToValueAtTime(0, audio.ctx.currentTime + 0.15)
      const ctx = audio.ctx
      window.setTimeout(() => ctx.close(), 300)
      audioRef.current = null
    }
    setPlaying(false)
    setBeat(0)
  }, [])

  const scheduleLoop = useCallback(
    (ctx: AudioContext, master: GainNode, c: Composition, startAt: number) => {
      const spb = 60 / c.bpm
      for (const track of c.tracks) {
        for (const n of track.notes) {
          const t0 = startAt + n.t * spb
          const dur = Math.max(0.05, n.d * spb)
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = track.wave
          osc.frequency.value = midiToFreq(n.p)
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
    const audio = { ctx, master, timer: 0, raf: 0, startedAt: ctx.currentTime + 0.08 }
    audioRef.current = audio

    let nextStart = audio.startedAt
    const tick = () => {
      scheduleLoop(ctx, master, comp, nextStart)
      nextStart += loopDur
      audio.timer = window.setTimeout(tick, loopDur * 1000 - 250)
    }
    tick()

    // Playhead tracking for the shell UI.
    const trackBeat = () => {
      if (!audioRef.current) return
      const elapsed = ctx.currentTime - audio.startedAt
      const beats = comp.bars * 4
      setBeat(((elapsed / spb) % beats + beats) % beats)
      audio.raf = window.requestAnimationFrame(trackBeat)
    }
    audio.raf = window.requestAnimationFrame(trackBeat)
    setPlaying(true)
  }, [comp, scheduleLoop, stop])

  useEffect(() => stop, [stop])

  return { comp, status, playing, beat, generate, play, stop }
}

/* ------------------------------------------------------------------ */
/* Image generation                                                     */
/* ------------------------------------------------------------------ */

export function useImageGen(initialPrompt: string) {
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
    generate(initialPrompt)
  }, [generate, initialPrompt])

  return { image, status, errorMsg, generate }
}
