import { rejectRemote } from '@/lib/local-request'
import { chatgpt, chatgptError, clearModelCatalog, modelsForProfile } from '@/lib/chatgpt'

export const maxDuration = 600

export async function POST(req: Request) {
  const rejected = rejectRemote(req)
  if (rejected) return rejected

  const body = await req.json().catch(() => null)
  const action = body?.action
  if (!['status', 'connect', 'cancel', 'disconnect', 'models'].includes(action)) {
    return Response.json({ error: 'Unknown account action.' }, { status: 400 })
  }

  try {
    const client = chatgpt()
    if (action === 'connect') {
      const current = await client.getSession()
      await client.signIn({ signal: req.signal, reconsent: current.status === 'connected' && !current.sharing })
      clearModelCatalog()
    } else if (action === 'cancel') {
      client.cancelSignIn()
    } else if (action === 'disconnect') {
      clearModelCatalog()
      await client.disconnect()
    } else if (action === 'models') {
      return Response.json({ models: await modelsForProfile(req.signal) }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const { status, sharing, identity, error } = await client.getSession()
    return Response.json({
      status, sharing, account: identity?.email ?? identity?.name, error: error?.message,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return chatgptError(error, 'ChatGPT connection failed. Check that the system credential store is available.')
  }
}
