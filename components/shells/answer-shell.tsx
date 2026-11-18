'use client'

/**
 * AnswerShell — Lumen as a conversational answer engine (Google AI mode
 * style): centered column, query pill up top, sparkle-branded AI answer,
 * inline knowledge cards, and follow-up input at the bottom.
 */

import { motion } from 'framer-motion'
import { ArrowUp, Loader2, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { LayoutSchema, ChatBlock, Block } from '@/lib/generative-engine'
import { useChatSession } from '@/components/shells/shared'

/** Compact knowledge cards for any data blocks ChatGPT attached to the answer. */
function KnowledgeCard({ block }: { block: Block }) {
  switch (block.type) {
    case 'text':
      return (
        <div className="rounded-2xl border border-[#3c4043] bg-[#28292c] p-4">
          <h3 className="mb-1 text-sm font-medium text-[#e8eaed]">{block.title}</h3>
          <p className="text-[13px] leading-relaxed text-[#bdc1c6]">{block.body}</p>
        </div>
      )
    case 'list':
      return (
        <div className="rounded-2xl border border-[#3c4043] bg-[#28292c] p-4">
          <h3 className="mb-2 text-sm font-medium text-[#e8eaed]">{block.title}</h3>
          <ul className="space-y-1.5">
            {block.items.map((item, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="text-[#bdc1c6]">{item.title}</span>
                <span className="shrink-0 text-xs text-[#9aa0a6]">{item.meta}</span>
              </li>
            ))}
          </ul>
        </div>
      )
    case 'table':
      return (
        <div className="overflow-x-auto rounded-2xl border border-[#3c4043] bg-[#28292c] p-4">
          <h3 className="mb-2 text-sm font-medium text-[#e8eaed]">{block.title}</h3>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr>
                {block.columns.map((c, i) => (
                  <th key={i} className="pb-1.5 pr-4 font-medium text-[#9aa0a6]">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-t border-[#3c4043]">
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-1.5 pr-4 text-[#bdc1c6]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'stat':
      return (
        <div className="rounded-2xl border border-[#3c4043] bg-[#28292c] p-4">
          <p className="text-xs text-[#9aa0a6]">{block.label}</p>
          <p className="text-xl font-medium text-[#e8eaed]">{block.value}</p>
          <p className={`text-xs ${block.positive ? 'text-[#81c995]' : 'text-[#f28b82]'}`}>
            {block.delta}
          </p>
        </div>
      )
    case 'timeline':
      return (
        <div className="rounded-2xl border border-[#3c4043] bg-[#28292c] p-4">
          <h3 className="mb-2 text-sm font-medium text-[#e8eaed]">{block.title}</h3>
          <ol className="space-y-2">
            {block.events.map((ev, i) => (
              <li key={i} className="flex gap-3 text-[13px]">
                <span className="w-20 shrink-0 text-xs text-[#8ab4f8]">{ev.time}</span>
                <span className="text-[#bdc1c6]">
                  <span className="text-[#e8eaed]">{ev.title}</span> — {ev.detail}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )
    default:
      return null
  }
}

export function AnswerShell({
  schema,
  onReset,
}: {
  schema: LayoutSchema
  onReset: () => void
}) {
  const chatBlock = schema.blocks.find((b): b is ChatBlock => b.type === 'chat')
  const cards = schema.blocks.filter((b) => b.type !== 'chat')

  const chat = useChatSession(
    chatBlock?.persona ??
      `You are a world-class expert answering questions about: "${schema.title}". Be accurate, concise, and helpful.`,
    chatBlock?.intro ?? schema.summary,
  )
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chat.messages.length > 1) bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
  }, [chat.messages.length, chat.busy])

  return (
    <motion.section
      className="flex h-full min-h-0 flex-col lumen-workbench rounded-xl overflow-hidden font-sans text-[#e8eaed]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.5, delay: 0.35 } }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      aria-label={`AI answers: ${schema.title}`}
    >
      {/* Top app bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 px-4 md:px-6">
        <Sparkles className="size-5 text-[#8ab4f8]" aria-hidden="true" />
        <span className="text-sm font-medium">
          Lumen <span className="text-[#9aa0a6]">AI Mode</span>
        </span>
        <button
          type="button"
          onClick={onReset}
          className="ml-auto flex items-center gap-1.5 rounded-full border border-[#3c4043] px-3 py-1.5 text-xs text-[#9aa0a6] hover:bg-[#28292c] hover:text-white"
        >
          <X className="size-3.5" aria-hidden="true" /> New search
        </button>
      </header>

      {/* Answer column */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 pb-32 pt-2">
          {/* Conversation */}
          <div className="mt-6 space-y-5">
            {chat.messages.map((m, i) =>
              m.role === 'user' ? (
                <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl bg-[#28292c] px-4 py-2.5 text-[15px]">
                  {m.content}
                </p>
              ) : (
                <div key={i} className="text-[15px] leading-relaxed text-[#e8eaed]">
                  {m.content.split('\n').map(
                    (para, pi) =>
                      para.trim() && (
                        <p key={pi} className="mb-3">
                          {para}
                        </p>
                      ),
                  )}
                </div>
              ),
            )}
            {chat.busy && (
              <div className="flex items-center gap-2 text-sm text-[#9aa0a6]">
                <Loader2 className="size-4 animate-spin text-[#8ab4f8]" aria-hidden="true" />
                Thinking…
              </div>
            )}
          </div>

          {/* Knowledge cards */}
          {cards.length > 0 && (
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {cards.map((block, i) => (
                <div key={i} className={block.type === 'table' || block.type === 'timeline' ? 'sm:col-span-2' : ''}>
                  <KnowledgeCard block={block} />
                </div>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Follow-up bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1f2125] via-[#1f2125]/90 to-transparent pb-5 pt-10">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            chat.send(input)
            setInput('')
          }}
          className="pointer-events-auto mx-auto flex w-full max-w-2xl items-center gap-2 rounded-full border border-[#3c4043] bg-[#28292c] py-1.5 pl-5 pr-1.5 shadow-lg"
        >
          <label htmlFor="answer-followup" className="sr-only">
            Ask a follow-up
          </label>
          <input
            id="answer-followup"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={chatBlock?.placeholder ?? 'Ask a follow-up…'}
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#9aa0a6]"
          />
          <button
            type="submit"
            disabled={chat.busy || !input.trim()}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#8ab4f8] text-[#1f2125] disabled:opacity-40"
            aria-label="Send follow-up"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </motion.section>
  )
}
