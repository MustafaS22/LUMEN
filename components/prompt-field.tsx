'use client'

/**
 * PromptField — the minimalist floating glass input.
 * In the idle state it sits beneath the blob; after generation it docks to
 * the bottom of the viewport (the parent controls positioning via layout).
 */

import { motion } from 'framer-motion'
import { ArrowUp, Loader2 } from 'lucide-react'
import { useState } from 'react'

const SUGGESTIONS = [
  'teach me chess openings',
  'plan a trip to Kyoto',
  'champions league knockouts',
  'help me write a novel',
]

export function PromptField({
  onSubmit,
  loading,
  docked,
}: {
  onSubmit: (prompt: string) => void
  loading: boolean
  docked: boolean
}) {
  const [value, setValue] = useState('')

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || loading) return
    onSubmit(trimmed)
    setValue('')
  }

  return (
    <motion.div layout className="flex w-full max-w-xl flex-col items-center gap-4">
      <motion.form
        layout
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className={`flex w-full items-center gap-2 rounded-full py-2 pl-6 pr-2 transition-shadow duration-500 ${
          loading ? 'glass-strong glass-glow' : 'glass-strong'
        }`}
      >
        <label htmlFor="prompt" className="sr-only">
          Describe the interface you want
        </label>
        <input
          id="prompt"
          type="text"
          value={value}
          autoComplete="off"
          placeholder={loading ? 'Materializing your interface…' : 'Describe anything. Watch it build itself.'}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // CJK IME safety: don't submit while composing (229 = Safari quirk)
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              submit()
            }
          }}
          disabled={loading}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <motion.button
          type="submit"
          aria-label="Generate interface"
          disabled={loading || !value.trim()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowUp className="size-4" aria-hidden="true" />
          )}
        </motion.button>
      </motion.form>

      {/* Suggestion chips only in the landing state */}
      {!docked && !loading && (
        <motion.div
          className="flex flex-wrap items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSubmit(s)}
              className="glass rounded-full px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
