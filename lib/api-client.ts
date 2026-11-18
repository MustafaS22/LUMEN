export const modelStorageKey = 'lumen.chatgpt-model'

export function postLocal(path: string, body: unknown, signal?: AbortSignal) {
  let model = ''
  try { model = localStorage.getItem(modelStorageKey) ?? '' } catch {}
  return fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Lumen-Request': 'local',
      ...(model && /^[a-z0-9._-]{1,200}$/i.test(model) ? { 'X-Lumen-Model': model } : {}),
    },
    body: JSON.stringify(body),
    signal,
  })
}

export async function responseError(response: Response, fallback: string) {
  const data = await response.json().catch(() => null)
  return new Error(typeof data?.error === 'string' ? data.error : fallback)
}
