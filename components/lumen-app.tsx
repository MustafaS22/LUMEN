'use client'

import { ArrowRight, ArrowUp, BookOpen, Code2, ExternalLink, History, LayoutGrid, Menu, Plus, Settings2, X } from 'lucide-react'
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
  const navigation = useRef<HTMLDialogElement>(null)
  const promptInput = useRef<HTMLTextAreaElement>(null)
  const workspaceHeading = useRef<HTMLHeadingElement>(null)
  const reducedMotion = useReducedMotion()
  const [webgl, setWebgl] = useState(false)
  const [glassReady, setGlassReady] = useState(false)

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
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const context = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true })
        setWebgl(Boolean(context))
        context?.getExtension('WEBGL_lose_context')?.loseContext()
      }
    } catch {
      // A still of the glass scene stays available without WebGL.
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
    navigation.current?.close()
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
    navigation.current?.close()
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

  function openExample(example: (typeof examples)[number]) {
    const id = `example-${example.id}`
    open(recent.find((item) => item.id === id) ?? { id, example: example.id, layout: example.layout, source: 'example' })
  }

  function showAccount() {
    navigation.current?.close()
    accountDialog.current?.showModal()
  }

  const library = (
    <>
      <button type="button" className="lumen-new" onClick={reset}>
        <Plus size={17} aria-hidden="true" /> New workspace
      </button>
      <nav className="lumen-library" aria-label="Workspace library">
        <div className="lumen-library-group" role="group" aria-label="Examples">
          <h2>Examples</h2>
          {examples.map((example, index) => {
            const Icon = icons[index]
            return (
              <button key={example.id} type="button" className="lumen-library-item" onClick={() => openExample(example)}
                aria-current={workspace?.example === example.id ? 'page' : undefined}>
                <Icon size={16} aria-hidden="true" /><span>{example.layout.title}</span>
              </button>
            )
          })}
        </div>
        <div className="lumen-library-group" role="group" aria-label="Recent">
          <h2>Recent</h2>
          {recent.length ? recent.map((item) => (
            <button key={item.id} type="button" className="lumen-library-item" onClick={() => open(item)}
              aria-current={workspace?.id === item.id && !workspace.example ? 'page' : undefined}>
              <History size={15} aria-hidden="true" /><span>{item.layout.title}</span>
            </button>
          )) : <p>Opened workspaces appear here.</p>}
        </div>
      </nav>
      <div className="lumen-rail-footer">
        <button type="button" onClick={showAccount} className="lumen-account-button" aria-label={live ? 'ChatGPT connected' : 'Connect ChatGPT'}>
          <span className="lumen-account-icon"><Settings2 size={16} aria-hidden="true" /></span>
          <span><strong>ChatGPT</strong><small>{live ? 'Plan connected' : 'Connect account'}</small></span>
        </button>
        <a href="https://github.com/MustafaS22/LUMEN" target="_blank" rel="noreferrer" className="lumen-icon-button" aria-label="Lumen on GitHub">
          <ExternalLink size={16} aria-hidden="true" />
        </a>
      </div>
    </>
  )

  return (
    <MotionConfig reducedMotion="user">
      <div className="lumen-app">
        <aside className="lumen-sidebar">
          <button type="button" className="lumen-wordmark" onClick={reset} aria-label="Lumen home">
            <img src="/icon.svg" alt="" width="28" height="28" /> Lumen
          </button>
          {library}
        </aside>

        <div className="lumen-stage">
          <header className="lumen-header">
            <button type="button" className="lumen-icon-button lumen-menu" onClick={() => navigation.current?.showModal()} aria-label="Open workspace library">
              <Menu size={20} aria-hidden="true" />
            </button>
            <div className="lumen-location">
              <span>Workspace</span>
              <span className="lumen-location-divider" aria-hidden="true">/</span>
              <span className="lumen-location-current">{workspace ? workspace.layout.title : 'New'}</span>
            </div>
            <button type="button" className="lumen-connection" onClick={showAccount} aria-label={live ? 'Manage ChatGPT connection' : 'Connect ChatGPT from demo mode'}>
              <i data-live={live} aria-hidden="true" /> {live ? 'ChatGPT connected' : 'Demo mode'}
            </button>
          </header>
          <div className={`lumen-scene ${workspace ? 'is-split' : ''}`} aria-hidden="true">
            <div className="lumen-still" data-live={glassReady && !reducedMotion} />
            {webgl && !reducedMotion && <GlassBlob phase={workspace ? 'split' : pending ? 'thinking' : 'idle'} onReady={() => setGlassReady(true)} />}
          </div>

          <main className={workspace ? 'lumen-workspace' : 'lumen-home'}>
            {!workspace ? (
              <section className="lumen-launch" aria-labelledby="lumen-title">
                <h1 id="lumen-title">An interface that builds itself.</h1>
                <p className="lumen-launch-description">Describe a workspace to get started.</p>
                <form className="lumen-composer" aria-busy={pending === 'generate'} onSubmit={(event) => submit(event, 'generate')}>
                  <label htmlFor="lumen-prompt" className="sr-only">What do you want to make?</label>
                  <textarea ref={promptInput} id="lumen-prompt" value={prompt} maxLength={500} rows={2}
                    onChange={(event) => setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                        event.preventDefault()
                        event.currentTarget.form?.requestSubmit()
                      }
                    }}
                    placeholder="A dashboard to track my studio’s launch…" disabled={pending !== null} />
                  <div className="lumen-composer-footer">
                    {prompt.length >= 440 && <span aria-live="polite">{prompt.length} / 500</span>}
                    <button type="submit" className="lumen-primary" disabled={!prompt.trim() || pending !== null}>
                      {pending ? 'Building…' : 'Build workspace'} <ArrowUp size={16} aria-hidden="true" />
                    </button>
                  </div>
                </form>
                {notice && <p className="lumen-note" role="status">{notice}</p>}
                {!notice && pending && <p className="lumen-note" role="status">Preparing your workspace…</p>}
                <button type="button" className="lumen-mobile-examples" onClick={() => navigation.current?.showModal()}>Browse examples <ArrowRight size={14} aria-hidden="true" /></button>
              </section>
            ) : (
              <>
                <div className="lumen-workspace-title">
                  <div>
                    <h1 ref={workspaceHeading} tabIndex={-1}>{workspace.layout.title}</h1>
                    {workspace.layout.shell !== 'publisher' && <p>{workspace.layout.summary}</p>}
                  </div>
                  <span className="lumen-workspace-source">{workspace.source === 'example' ? 'Example' : workspace.source === 'chatgpt' ? 'ChatGPT' : 'Local starter'}</span>
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
                }} schema={workspace.layout} onReset={reset} live={live} initialCode={workspace.example === 'timer' ? focusTimerCode : undefined} />
                <form className="lumen-refine" onSubmit={(event) => submit(event, 'refine')}>
                  <label htmlFor="refinement" className="sr-only">Refine this workspace</label>
                  <input id="refinement" value={refinement} onChange={(event) => setRefinement(event.target.value)} maxLength={500}
                    placeholder={live ? 'Describe a change to this workspace…' : 'Connect ChatGPT to refine'} disabled={!live || pending !== null} />
                  {live ? <button type="submit" className="lumen-primary" disabled={!refinement.trim() || pending !== null}>
                    {pending === 'refine' ? 'Updating…' : 'Refine'} <ArrowUp size={16} aria-hidden="true" />
                  </button> : <button type="button" className="lumen-secondary" onClick={showAccount}>Connect</button>}
                </form>
                {notice && <p className="lumen-note" role="status">{notice}</p>}
              </>
            )}
          </main>
        </div>

        <dialog ref={accountDialog} className="lumen-dialog" aria-labelledby="account-title">
          <div className="lumen-dialog-heading">
            <h2 id="account-title">ChatGPT connection</h2>
            <button type="button" className="lumen-icon-button" aria-label="Close" onClick={() => accountDialog.current?.close()}><X size={19} aria-hidden="true" /></button>
          </div>
          <ChatGPTAccount account={account} />
        </dialog>

        <dialog ref={navigation} className="lumen-drawer" aria-labelledby="navigation-title">
          <div className="lumen-drawer-heading">
            <h2 id="navigation-title" className="lumen-wordmark"><img src="/icon.svg" alt="" width="28" height="28" /> Lumen</h2>
            <button type="button" className="lumen-icon-button" aria-label="Close workspace library" onClick={() => navigation.current?.close()}><X size={19} aria-hidden="true" /></button>
          </div>
          {library}
        </dialog>
      </div>
    </MotionConfig>
  )
}
