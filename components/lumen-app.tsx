'use client'

import { ArrowDown, ArrowRight, BookOpen, Code2, ExternalLink, History, LayoutGrid, Plus, Sparkles, UserRound } from 'lucide-react'
import dynamic from 'next/dynamic'
import { MotionConfig, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { examples, focusTimerCode } from '@/lib/examples'
import { fallbackLayout, generateLayout, type GenerateResult } from '@/lib/generative-engine'
import { layoutSchema } from '@/lib/layout-schema'
import { ChatGPTAccount, useChatGPTAccount } from './chatgpt-account'

const ShellRouter = dynamic(() => import('./shells/shell-router').then((mod) => mod.ShellRouter))
const GlassBlob = dynamic(() => import('./glass-blob').then((mod) => mod.GlassBlob), { ssr: false })
const storageKey = 'lumen.workspaces.v1'
const icons = [LayoutGrid, Code2, BookOpen]

type Workspace = GenerateResult & { id: string; example?: string }
type Pending = 'generate' | 'refine' | null

export function LumenApp() {
  const account = useChatGPTAccount()
  const live = account.session.sharing
  const accountDialog = useRef<HTMLDialogElement>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [recent, setRecent] = useState<Workspace[]>([])
  const [prompt, setPrompt] = useState('')
  const [refinement, setRefinement] = useState('')
  const [pending, setPending] = useState<Pending>(null)
  const [notice, setNotice] = useState('')
  const request = useRef<AbortController | null>(null)
  const history = useRef<HTMLDialogElement>(null)
  const promptInput = useRef<HTMLTextAreaElement>(null)
  const workspaceHeading = useRef<HTMLHeadingElement>(null)
  const reducedMotion = useReducedMotion()
  const [webgl, setWebgl] = useState(false)

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
      if (Array.isArray(saved)) {
        setRecent(saved.flatMap((item) => {
          const parsed = layoutSchema.safeParse(item?.layout)
          if (!parsed.success || typeof item.id !== 'string' || !['chatgpt', 'fallback', 'example'].includes(item.source)) return []
          return [{ ...item, layout: parsed.data } as Workspace]
        }).slice(0, 8))
      }
    } catch {
      // Storage can be disabled or contain data from an old build.
    }
    try {
      const context = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true })
      setWebgl(Boolean(context))
      context?.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      // The CSS artwork stays available without WebGL.
    }
    return () => request.current?.abort()
  }, [])

  useEffect(() => {
    if (workspace) workspaceHeading.current?.focus()
  }, [workspace?.id]) // Focus on open while keeping focus in the form during refinement.

  function remember(item: Workspace) {
    const next = [item, ...recent.filter((entry) => entry.id !== item.id)].slice(0, 8)
    setRecent(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      setNotice('Browser storage is unavailable. Recent workspaces are available until you reload.')
    }
  }

  function open(item: Workspace) {
    request.current?.abort()
    request.current = null
    setPending(null)
    history.current?.close()
    setNotice('')
    setRefinement('')
    setWorkspace(item)
    remember(item)
  }

  function reset() {
    request.current?.abort()
    request.current = null
    setPending(null)
    setWorkspace(null)
    setNotice('')
    setRefinement('')
    requestAnimationFrame(() => promptInput.current?.focus())
  }

  async function submit(event: FormEvent, kind: Exclude<Pending, null>) {
    event.preventDefault()
    if (request.current) return
    const value = (kind === 'refine' ? refinement : prompt).trim()
    if (!value) return
    const current = kind === 'refine' ? workspace : null
    if (current && !live) return
    const controller = new AbortController()
    request.current = controller
    setPending(kind)
    setNotice('')
    try {
      const result: GenerateResult = live
        ? await generateLayout(value, current?.layout, controller.signal)
        : { layout: fallbackLayout(value), source: 'fallback' }
      if (controller.signal.aborted) return
      if (result.source === 'fallback') {
        setNotice('You opened a local starter. Connect ChatGPT to use live tools and generate tailored layouts.')
      }
      const item = { ...result, id: current?.id ?? crypto.randomUUID() }
      setWorkspace(item)
      remember(item)
      if (kind === 'generate') setPrompt('')
      else setRefinement('')
    } catch (error) {
      if (!controller.signal.aborted) {
        setNotice(error instanceof Error ? error.message : 'ChatGPT did not complete the request. Try again.')
      }
    } finally {
      if (request.current === controller) {
        request.current = null
        setPending(null)
      }
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="lumen-app">
        <header className="lumen-header">
          <button type="button" className="lumen-wordmark" onClick={reset} aria-label="Lumen home">
            <span className="lumen-mark" aria-hidden="true"><Sparkles size={17} /></span>
            LUMEN
          </button>
          <nav className="lumen-nav" aria-label="Workspace navigation">
            <button type="button" onClick={() => accountDialog.current?.showModal()}>
              <UserRound size={16} aria-hidden="true" /><span>{live ? 'ChatGPT connected' : 'Connect ChatGPT'}</span>
            </button>
            <button type="button" aria-label="Recent" className="lumen-nav-recent" onClick={() => history.current?.showModal()} disabled={pending === 'generate'}>
              <History size={16} aria-hidden="true" /><span>Recent</span>
            </button>
            <a href="https://github.com/MustafaS22/LUMEN" target="_blank" rel="noreferrer" aria-label="Lumen on GitHub">
              <ExternalLink size={17} aria-hidden="true" />
            </a>
          </nav>
        </header>

        <main className={workspace ? 'lumen-workspace' : 'lumen-home'}>
          {!workspace ? (
            <>
              <section className="lumen-hero" aria-labelledby="lumen-title">
                <div className="lumen-intro">
                  <div className="lumen-mode"><i aria-hidden="true" />{live ? 'Using ChatGPT plan' : 'Demo mode'}</div>
                  <h1 id="lumen-title">Give an idea<br />its own <em>interface.</em></h1>
                  <p className="lumen-lede">Describe what you want to do. Lumen builds a workspace around it, from data dashboards to creative studios.</p>
                  <form className="lumen-composer" onSubmit={(event) => submit(event, 'generate')}>
                    <label htmlFor="lumen-prompt">What do you want to make?</label>
                    <textarea ref={promptInput} id="lumen-prompt" value={prompt} maxLength={500} rows={2} onChange={(event) => setPrompt(event.target.value)} placeholder="A dashboard to track my studio’s launch…" disabled={pending !== null} />
                    <div className="lumen-composer-footer">
                      <span>{prompt.length} / 500</span>
                      <button type="submit" className="lumen-primary" disabled={!prompt.trim() || pending !== null}>
                        {pending ? 'Building…' : 'Build workspace'} <ArrowRight size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </form>
                  <p className="lumen-note" role="status">{notice || (pending ? 'Preparing your workspace…' : live ? 'Start from a prompt or open a ready-to-use example.' : 'Try an example or connect ChatGPT to generate from a prompt.')}</p>
                </div>

                <div className="lumen-art" aria-hidden="true">
                  <div className="lumen-orbit lumen-orbit-outer" />
                  <div className="lumen-orbit lumen-orbit-inner" />
                  <div className="lumen-orbit-axis" />
                  <div className="lumen-orb" />
                  {webgl && !reducedMotion && <GlassBlob phase={pending ? 'thinking' : 'idle'} />}
                  <div className="lumen-art-corner top-left" />
                  <div className="lumen-art-corner bottom-right" />
                </div>
              </section>

              <section className="lumen-examples" aria-labelledby="example-heading">
                <div className="lumen-section-heading">
                  <h2 id="example-heading">Start with an example</h2>
                  <ArrowDown size={16} aria-hidden="true" />
                </div>
                <div className="lumen-example-grid">
                  {examples.map((example, index) => {
                    const Icon = icons[index]
                    return (
                      <button type="button" key={example.id} disabled={pending !== null} className="lumen-example" onClick={() => {
                        const id = `example-${example.id}`
                        open(recent.find((item) => item.id === id) ?? { id, example: example.id, layout: example.layout, source: 'example' })
                      }}>
                        <span className="lumen-example-icon"><Icon size={18} aria-hidden="true" /></span>
                        <span className="lumen-example-text">
                          <small>{example.category}</small>
                          <strong>{example.layout.title}</strong>
                          <span>{example.description}</span>
                        </span>
                        <ArrowRight className="lumen-example-arrow" size={16} aria-hidden="true" />
                      </button>
                    )
                  })}
                </div>
              </section>
            </>
          ) : (
            <>
              <div className="lumen-workspace-title">
                <div>
                  <small>{workspace.source === 'example' ? 'Example workspace' : workspace.source === 'chatgpt' ? 'ChatGPT workspace' : 'Local starter'}</small>
                  <h1 ref={workspaceHeading} tabIndex={-1}>{workspace.layout.title}</h1>
                </div>
                <button type="button" onClick={reset} className="lumen-secondary"><Plus size={16} aria-hidden="true" /> New workspace</button>
              </div>
              <ShellRouter key={workspace.id} onLayoutChange={(layout) => {
                if (pending === 'refine') {
                  request.current?.abort()
                  request.current = null
                  setPending(null)
                  setNotice('Your edit was saved. Submit the refinement again to include it.')
                }
                const updated = { ...workspace, layout }
                setWorkspace(updated)
                remember(updated)
              }} schema={workspace.layout} source={workspace.source} onReset={reset} live={live} initialCode={workspace.example === 'timer' ? focusTimerCode : undefined} />
              <form className="lumen-refine" onSubmit={(event) => submit(event, 'refine')}>
                <label htmlFor="refinement" className="sr-only">Refine this workspace</label>
                <input id="refinement" value={refinement} onChange={(event) => setRefinement(event.target.value)} maxLength={500} placeholder={live ? 'Describe a change to this workspace…' : 'Connect ChatGPT to refine'} disabled={!live || pending !== null} />
                <button type="submit" className="lumen-primary" disabled={!live || !refinement.trim() || pending !== null}>{pending === 'refine' ? 'Updating…' : 'Refine'} <ArrowRight size={16} aria-hidden="true" /></button>
              </form>
              {notice && <p className="lumen-note" role="status">{notice}</p>}
            </>
          )}
        </main>

        <dialog ref={accountDialog} className="lumen-history" aria-labelledby="account-title">
          <div className="lumen-section-heading">
            <h2 id="account-title">ChatGPT connection</h2>
            <button type="button" className="lumen-secondary" onClick={() => accountDialog.current?.close()}>Close</button>
          </div>
          <ChatGPTAccount account={account} />
        </dialog>

        <dialog ref={history} className="lumen-history" aria-labelledby="history-title">
          <div className="lumen-section-heading">
            <h2 id="history-title">Recent workspaces</h2>
            <button type="button" className="lumen-secondary" onClick={() => history.current?.close()}>Close</button>
          </div>
          <p className="lumen-note">Layouts are saved in this browser.</p>
          {recent.length === 0 ? <p className="lumen-empty">Open an example or build your first workspace to see it here.</p> : (
            <ul>
              {recent.map((item) => <li key={item.id}>
                <button type="button" onClick={() => open(item)}>
                  {item.layout.title}<ArrowRight size={16} aria-hidden="true" />
                </button>
              </li>)}
            </ul>
          )}
        </dialog>
      </div>
    </MotionConfig>
  )
}
