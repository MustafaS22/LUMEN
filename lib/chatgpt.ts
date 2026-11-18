import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { AsyncEntry } from '@napi-rs/keyring'
import {
  ChatGPTError, createChatGPT, type ChatGPTClient, type ChatGPTModel, type StreamResponseOptions,
} from '@/vendor/siwc-local/src/index'

const service = 'com.mustafas22.lumen'
const globals = globalThis as typeof globalThis & { lumenChatGPT?: ChatGPTClient }

function makeClient() {
  const entry = new AsyncEntry(service, 'chatgpt-credential-key')
  async function getKey(create = false) {
    const saved = await entry.getPassword()
    if (saved) {
      const key = Buffer.from(saved, 'base64')
      if (key.length !== 32) throw new Error('Invalid LUMEN encryption key')
      return key
    }
    if (!create) throw new Error('LUMEN encryption key is missing from the system keyring')
    const key = randomBytes(32)
    await entry.setPassword(key.toString('base64'))
    return key
  }

  return createChatGPT({
    appName: 'LUMEN',
    appId: service,
    redirectPort: 0,
    storageDir: process.env.LUMEN_AUTH_DIR,
    sendHostId: true,
    credentialEncryption: {
      id: 'keyring-aes-256-gcm-v1',
      async isAvailable() {
        try { await entry.getPassword(); return true } catch { return false }
      },
      async encrypt(plaintext) {
        const iv = randomBytes(12)
        const cipher = createCipheriv('aes-256-gcm', await getKey(true), iv)
        const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
        return Buffer.concat([iv, cipher.getAuthTag(), ciphertext])
      },
      async decrypt(bytes) {
        const data = Buffer.from(bytes)
        if (data.length < 28) throw new Error('Invalid credential envelope')
        const decipher = createDecipheriv('aes-256-gcm', await getKey(), data.subarray(0, 12))
        decipher.setAuthTag(data.subarray(12, 28))
        return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8')
      },
    },
  })
}

export function chatgpt() {
  return (globals.lumenChatGPT ??= makeClient())
}

let catalog: { profileId: string; expires: number; models: ChatGPTModel[] } | undefined

export function clearModelCatalog() {
  catalog = undefined
}

export async function modelsForProfile(signal?: AbortSignal) {
  const client = chatgpt()
  const session = await client.getSession()
  if (!session.sharing || !session.profileId) {
    throw new ChatGPTError('sign_in_required', 'Connect ChatGPT and allow plan usage to use this feature.')
  }
  if (catalog?.profileId === session.profileId && catalog.expires > Date.now()) return catalog.models
  const models = await client.listModels({ signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000) })
  if (!models.length) throw new ChatGPTError('no_models', 'Your ChatGPT connection has no available models.')
  catalog = { profileId: session.profileId, models, expires: Date.now() + 5 * 60_000 }
  return models
}

export async function complete(req: Request, input: StreamResponseOptions['input'], instructions: string) {
  const signal = AbortSignal.any([req.signal, AbortSignal.timeout(90_000)])
  const options = await modelsForProfile(signal)
  const preferred = req.headers.get('x-lumen-model')
  const model = options.find((entry) => entry.slug === preferred) ?? options[0]
  const result = await chatgpt().streamResponse({ model: model.slug, input, instructions, signal })
  if (!result.text.trim()) throw new Error('The model did not return text')
  return result.text.trim()
}

export function parseModelJSON(text: string): unknown {
  return JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
}

export function chatgptError(error: unknown, fallback: string) {
  if (error instanceof ChatGPTError) {
    const status = /limit|quota/.test(error.code) ? 429 :
      /sign_in|sharing_not_enabled|reauth/.test(error.code) ? 401 : 502
    return Response.json({ error: error.message, code: error.code }, { status })
  }
  return Response.json({ error: fallback }, { status: 502 })
}
