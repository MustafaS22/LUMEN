'use client'

import { useEffect, useState } from 'react'
import { modelStorageKey, postLocal, responseError } from '@/lib/api-client'

type AccountSession = {
  status: 'disconnected' | 'connecting' | 'connected' | 'reauth_required'
  sharing: boolean
  account?: string
  error?: string
}
type Model = { slug: string; displayName: string }

async function accountAction<T>(action: string, signal?: AbortSignal): Promise<T> {
  const result = await postLocal('/api/account', { action }, signal)
  if (!result.ok) throw await responseError(result, 'The local account service is unavailable.')
  return result.json()
}

export function useChatGPTAccount() {
  const [session, setSession] = useState<AccountSession>({ status: 'disconnected', sharing: false })
  const [busy, setBusy] = useState(false)
  const [models, setModels] = useState<Model[]>([])
  const [model, setModel] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    accountAction<AccountSession>('status', controller.signal).then(setSession).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.message)
    })
    try { setModel(localStorage.getItem(modelStorageKey) ?? '') } catch {}
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!session.sharing) return
    const controller = new AbortController()
    accountAction<{ models: Model[] }>('models', controller.signal)
      .then((data) => setModels(data.models))
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message) })
    return () => controller.abort()
  }, [session.sharing, session.account])

  async function change(action: 'connect' | 'disconnect' | 'cancel') {
    if (action !== 'cancel') setBusy(true)
    setError('')
    try {
      const next = await accountAction<AccountSession>(action)
      setSession(next)
      if (action === 'disconnect') setModels([])
      if (next.error) setError(next.error)
    } catch (failure) {
      const updated = await accountAction<AccountSession>('status').catch(() => null)
      if (updated) setSession(updated)
      if (failure instanceof Error && !/cancelled/i.test(failure.message)) setError(failure.message)
    } finally {
      if (action !== 'cancel') setBusy(false)
    }
  }

  function select(value: string) {
    setModel(value)
    try { localStorage.setItem(modelStorageKey, value) } catch {}
  }

  return { session, busy, models, model, error, change, select }
}

export function ChatGPTAccount({ account }: { account: ReturnType<typeof useChatGPTAccount> }) {
  const { session, busy, models, model, error, change, select } = account
  const connected = session.status === 'connected'
  const signingIn = busy && !session.sharing
  return (
    <>
      <p className="lumen-account-status">
        {session.sharing ? <>Using your ChatGPT plan{session.account ? <> as <strong>{session.account}</strong></> : null}.</>
          : connected ? <>Signed in{session.account ? <> as <strong>{session.account}</strong></> : null}. Allow plan usage to turn on generation.</>
          : 'Connect your ChatGPT account to build and refine workspaces with your eligible plan.'}
      </p>
      {session.sharing && models.length > 0 && (
        <label className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          Model
          <select className="rounded-md border border-glass-border bg-background px-2 py-1" value={models.some((item) => item.slug === model) ? model : ''} onChange={(event) => select(event.target.value)}>
            <option value="">Automatic</option>
            {models.map((item) => <option value={item.slug} key={item.slug}>{item.displayName}</option>)}
          </select>
        </label>
      )}
      <div className="lumen-account-actions">
        {!session.sharing && <button type="button" className="lumen-primary" data-oai-siwc-button onClick={() => change('connect')} disabled={busy}>
          {signingIn ? 'Waiting for ChatGPT…' : connected ? 'Allow ChatGPT plan usage' : 'Continue with ChatGPT'}
        </button>}
        {signingIn && <button type="button" className="lumen-secondary" onClick={() => change('cancel')}>Cancel sign-in</button>}
        {connected && <button type="button" className="lumen-secondary" disabled={busy} onClick={() => change('disconnect')}>Disconnect</button>}
        {session.sharing && <a href="https://chatgpt.com/settings/usage" target="_blank" rel="noreferrer">Manage usage</a>}
      </div>
      <p className="lumen-note" role="status">{error || (signingIn ? 'Complete sign-in in the browser window opened by LUMEN.' : '')}</p>
    </>
  )
}
