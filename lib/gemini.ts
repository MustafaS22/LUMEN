/**
 * Quota-aware Gemini model selection.
 * -----------------------------------
 * Free-tier Gemini keys have small PER-MODEL daily quotas (e.g. 20/day for
 * gemini-2.5-flash) but each model has its OWN bucket — flash-lite's free
 * quota is an order of magnitude larger. So instead of dying when one model
 * is exhausted, we walk a chain: flash → flash-lite.
 *
 * We also remember (in-process) that a model is quota-exhausted so later
 * requests skip straight to a working model instead of burning a failed
 * call first. The marker expires after 10 minutes in case the quota resets
 * or the user upgrades their key.
 */

export const MODEL_CHAIN = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'] as const
export type GeminiModelId = (typeof MODEL_CHAIN)[number]

const exhaustedUntil = new Map<GeminiModelId, number>()
const EXHAUSTED_TTL_MS = 10 * 60 * 1000

function isQuotaError(error: unknown): boolean {
  const seen = new Set<unknown>()
  let cur: unknown = error
  // AI_RetryError wraps the real APICallError; walk the chain.
  while (cur && typeof cur === 'object' && !seen.has(cur)) {
    seen.add(cur)
    const e = cur as { statusCode?: number; message?: string; lastError?: unknown; cause?: unknown }
    if (e.statusCode === 429) return true
    if (typeof e.message === 'string' && /quota|RESOURCE_EXHAUSTED|rate limit/i.test(e.message)) {
      return true
    }
    cur = e.lastError ?? e.cause
  }
  return false
}

/**
 * Runs `task` against each model in the chain until one succeeds.
 * Quota errors advance the chain (and mark the model exhausted);
 * any other error from the LAST model is rethrown.
 */
export async function withGeminiModel<T>(
  task: (modelId: GeminiModelId) => Promise<T>,
): Promise<T> {
  const now = Date.now()
  const candidates = MODEL_CHAIN.filter((m) => (exhaustedUntil.get(m) ?? 0) < now)
  // If everything is marked exhausted, try the full chain anyway — the
  // marker may be stale.
  const chain = candidates.length > 0 ? candidates : [...MODEL_CHAIN]

  let lastError: unknown
  for (let i = 0; i < chain.length; i++) {
    const modelId = chain[i]
    try {
      return await task(modelId)
    } catch (error) {
      lastError = error
      if (isQuotaError(error)) {
        exhaustedUntil.set(modelId, Date.now() + EXHAUSTED_TTL_MS)
        continue // next model in the chain
      }
      throw error // non-quota error: don't mask it
    }
  }
  throw lastError
}
