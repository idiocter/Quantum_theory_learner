'use client'
import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import AuthGuard from '@/components/auth/AuthGuard'
import { aiApi } from '@/lib/api/ai'
import { useAllConcepts, useBranches } from '@/lib/hooks/useConcepts'
import { useConceptsStore } from '@/lib/store/concepts'
import GuidedRoadmap, { type RoadmapDomain } from '@/components/tutor/GuidedRoadmap'
import { relativeTime, cn } from '@/lib/utils'
import type { Conversation, Message, Concept } from '@/types'

const POLL_INTERVAL = 1500
const MAX_POLLS = 40 // 60s timeout

// Guided mode segregates topics into two independent learning domains.
const GUIDED_TRACKS = [
  { id: 'quantum-physics', label: 'Quantum Physics' },
  { id: 'quantum-computing', label: 'Quantum Computing' },
] as const

function KatexMessage({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    import('katex').then((katex) => {
      const html = content.replace(/\$\$(.+?)\$\$/gs, (_, tex) => {
        try {
          return `<div class="katex-display">${katex.default.renderToString(tex, { displayMode: true, throwOnError: false })}</div>`
        } catch { return `<div class="katex-display">${tex}</div>` }
      }).replace(/\$(.+?)\$/g, (_, tex) => {
        try {
          return katex.default.renderToString(tex, { throwOnError: false })
        } catch { return tex }
      })
      if (ref.current) ref.current.innerHTML = html
    })
  }, [content])

  return <div ref={ref} className="prose-quantum text-sm leading-relaxed" />
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono shrink-0 mt-0.5',
        isUser ? 'bg-quantum-500/20 text-quantum-300 border border-quantum-500/30' : 'bg-plasma-500/20 text-plasma-300 border border-plasma-500/30'
      )}>
        {isUser ? 'U' : 'Ψ'}
      </div>
      <div className={cn('max-w-[80%] rounded-xl px-4 py-3', isUser ? 'bg-quantum-500/10 border border-quantum-500/20' : 'bg-void-800 border border-plasma-500/15')}>
        {msg.status === 'pending' ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <span className="w-4 h-4 border-2 border-plasma-500/30 border-t-plasma-400 rounded-full animate-spin" />
            Computing response...
          </div>
        ) : msg.role === 'assistant' ? (
          <KatexMessage content={msg.content} />
        ) : (
          <p className="text-sm text-slate-200 whitespace-pre-wrap">{msg.content}</p>
        )}
        {msg.status !== 'pending' && (
          <div className="text-xs text-slate-600 mt-2">{relativeTime(msg.created_at)}</div>
        )}
      </div>
    </div>
  )
}

function TutorUI() {
  const searchParams = useSearchParams()
  const conceptId = searchParams.get('concept')
  const qc = useQueryClient()

  const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const
  type Level = (typeof DIFFICULTIES)[number]
  const diffParam = searchParams.get('difficulty')
  const initialDiff: Level = (DIFFICULTIES as readonly string[]).includes(diffParam ?? '')
    ? (diffParam as Level)
    : 'intermediate'

  const [difficulty, setDifficulty] = useState<Level>(initialDiff)
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [pendingMsgId, setPendingMsgId] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  const [mode, setMode] = useState<'chat' | 'guided'>(
    searchParams.get('mode') === 'guided' ? 'guided' : 'chat'
  )
  const [guidedSlug, setGuidedSlug] = useState<string | null>(null)

  // Roadmap data for guided mode (public topic list grouped by track → branch → order).
  const { data: topicsPage } = useAllConcepts()
  const { data: branches } = useBranches()
  const visitedTopics = useConceptsStore((s) => s.visitedTopics)
  const visitedSet = useMemo(() => new Set(visitedTopics), [visitedTopics])

  const domains = useMemo<RoadmapDomain[]>(() => {
    const topics = topicsPage?.results ?? []
    const bs = branches ?? []
    return GUIDED_TRACKS.map(({ id, label }) => ({
      id,
      label,
      branches: bs
        .filter((b) => (b.track ?? 'quantum-physics') === id)
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((b) => ({
          slug: b.slug,
          name: b.name,
          color: b.color,
          topics: topics
            .filter((t) => t.category?.slug === b.slug)
            .slice()
            .sort((x, y) => (x.order ?? 0) - (y.order ?? 0)),
        }))
        .filter((b) => b.topics.length > 0),
    })).filter((d) => d.branches.length > 0)
  }, [topicsPage, branches])

  const orderedTopics = useMemo(
    () => domains.flatMap((d) => d.branches.flatMap((b) => b.topics)),
    [domains]
  )

  const { data: convList } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => aiApi.listConversations().then((r) => r.data.results),
  })

  const { data: activeConv } = useQuery({
    queryKey: ['conversation', activeConvId],
    queryFn: () => aiApi.getConversation(activeConvId!).then((r) => r.data),
    enabled: !!activeConvId,
    refetchInterval: pendingMsgId ? POLL_INTERVAL : false,
  })

  // Detect when pending message completes
  useEffect(() => {
    if (!pendingMsgId || !activeConv?.messages) return
    const msg = activeConv.messages.find((m) => m.id === pendingMsgId)
    if (msg && msg.status !== 'pending') {
      setPendingMsgId(null)
      setPollCount(0)
    } else {
      setPollCount((c) => {
        if (c >= MAX_POLLS) {
          setPendingMsgId(null)
          toast.error('Response timed out. Please try again.')
          return 0
        }
        return c + 1
      })
    }
  }, [activeConv, pendingMsgId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages])

  const createConv = useMutation({
    mutationFn: () =>
      aiApi.createConversation({ concept: conceptId ?? undefined, difficulty }).then((r) => r.data),
    onSuccess: (conv) => {
      setActiveConvId(conv.id)
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const sendMsg = useMutation({
    mutationFn: async (content: string) => {
      let convId = activeConvId
      if (!convId) {
        const conv = await aiApi.createConversation({ concept: conceptId ?? undefined, difficulty }).then((r) => r.data)
        setActiveConvId(conv.id)
        convId = conv.id
        qc.invalidateQueries({ queryKey: ['conversations'] })
      }
      return aiApi.sendMessage(convId, content).then((r) => r.data)
    },
    onSuccess: (data) => {
      setPendingMsgId(data.assistant_message_id)
      qc.invalidateQueries({ queryKey: ['conversation', activeConvId] })
    },
    onError: () => toast.error('Failed to send message. Please try again.'),
  })

  // Guided mode: start (or restart) a lesson on a roadmap topic. Seeds a
  // concept-scoped conversation and sends a step-by-step teaching prompt.
  const startGuided = useCallback(
    async (topic: Concept) => {
      if (pendingMsgId || sendMsg.isPending || createConv.isPending) return
      setGuidedSlug(topic.slug)
      try {
        const conv = await aiApi
          .createConversation({ concept: topic.id, difficulty })
          .then((r) => r.data)
        setActiveConvId(conv.id)
        qc.invalidateQueries({ queryKey: ['conversations'] })
        const prompt = `Guide me through the topic "${topic.title}" at a ${difficulty} level. Teach it step by step: start from what I need to know first, then the core idea, a short derivation where it helps, and a concrete example.`
        const res = await aiApi.sendMessage(conv.id, prompt).then((r) => r.data)
        setPendingMsgId(res.assistant_message_id)
        qc.invalidateQueries({ queryKey: ['conversation', conv.id] })
      } catch {
        toast.error('Could not start the guided lesson. Please try again.')
      }
    },
    [pendingMsgId, sendMsg.isPending, createConv.isPending, difficulty, qc]
  )

  const guidedIndex = orderedTopics.findIndex((t) => t.slug === guidedSlug)
  const nextTopic = guidedIndex >= 0 ? orderedTopics[guidedIndex + 1] : undefined

  const handleSend = useCallback(() => {
    const content = input.trim()
    if (!content || sendMsg.isPending || !!pendingMsgId) return
    setInput('')
    sendMsg.mutate(content)
  }, [input, sendMsg, pendingMsgId])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar — mode toggle + conversation list / guided roadmap */}
      <aside className="w-64 border-r border-quantum-800/20 flex flex-col bg-void-950/60 shrink-0 hidden md:flex">
        <div className="p-3 border-b border-quantum-800/20 grid grid-cols-2 gap-1">
          {(['chat', 'guided'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'py-1.5 rounded-md text-xs font-medium capitalize transition-colors',
                mode === m ? 'bg-quantum-500/15 text-quantum-300' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === 'chat' ? (
          <>
            <div className="p-4 border-b border-quantum-800/20">
              <button
                onClick={() => createConv.mutate()}
                disabled={createConv.isPending}
                className="btn-quantum w-full text-xs py-2"
              >
                + New conversation
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {convList?.map((c: Conversation) => (
                <button
                  key={c.id}
                  onClick={() => setActiveConvId(c.id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all',
                    c.id === activeConvId
                      ? 'bg-quantum-500/10 border border-quantum-500/20 text-quantum-300'
                      : 'text-slate-500 hover:bg-void-800 hover:text-slate-300'
                  )}
                >
                  <div className="font-medium truncate">{c.title || 'Untitled conversation'}</div>
                  <div className="text-slate-600 mt-0.5">{relativeTime(c.updated_at)}</div>
                </button>
              ))}
              {!convList?.length && (
                <p className="text-xs text-slate-700 text-center mt-4 px-3">
                  No conversations yet. Ask the AI tutor something!
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Pick a topic — the tutor teaches it step by step, then walks you to the next one.
            </p>
            <GuidedRoadmap
              domains={domains}
              activeSlug={guidedSlug ?? undefined}
              visited={visitedSet}
              onPick={startGuided}
              disabled={!!pendingMsgId || sendMsg.isPending}
            />
          </div>
        )}
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeConv ? (
          <>
            {mode === 'guided' && guidedSlug && (
              <div className="border-b border-quantum-800/20 px-6 py-2.5 flex items-center justify-between gap-3 bg-void-950/60">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-widest text-slate-600">Guided lesson</span>
                  <div className="text-sm text-quantum-200 font-medium truncate">
                    {orderedTopics[guidedIndex]?.title ?? 'Lesson'}
                  </div>
                </div>
                {nextTopic && (
                  <button
                    onClick={() => startGuided(nextTopic)}
                    disabled={!!pendingMsgId || sendMsg.isPending}
                    className="btn-ghost text-xs shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next: {nextTopic.title} →
                  </button>
                )}
              </div>
            )}
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {activeConv.messages?.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-quantum-800/20 p-4 bg-void-950/80">
              <div className="flex gap-3 max-w-3xl mx-auto">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  rows={2}
                  disabled={!!pendingMsgId || sendMsg.isPending}
                  placeholder="Ask about quantum mechanics... (Enter to send, Shift+Enter for newline)"
                  className="input-quantum flex-1 resize-none py-2.5 text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || !!pendingMsgId || sendMsg.isPending}
                  className="btn-quantum px-4 py-2 self-end disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            </div>
          </>
        ) : mode === 'guided' ? (
          // Guided empty state — prompt to pick a topic from the roadmap
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
            <div className="text-5xl text-quantum-400/30">◈</div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Guided learning path</h2>
              <p className="text-sm text-slate-500 max-w-sm">
                Choose a topic from the roadmap on the left. The tutor teaches it step by step and
                then guides you to the next — Quantum Physics and Quantum Computing tracked separately.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Teach at this level</span>
              <div className="flex gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all',
                      difficulty === d
                        ? 'border-quantum-500/50 bg-quantum-500/10 text-quantum-300'
                        : 'border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
            <div className="text-6xl font-serif text-plasma-400/30">Ψ</div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">AI Quantum Tutor</h2>
              <p className="text-sm text-slate-500 max-w-sm">
                Ask anything about quantum mechanics. Responses include LaTeX math rendered inline.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {[
                'What is the uncertainty principle?',
                'Explain wave-particle duality',
                'Derive the particle-in-a-box energy levels',
                'What is quantum entanglement?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-xs px-3 py-2 rounded-lg border border-plasma-500/20 text-plasma-400 hover:border-plasma-500/40 hover:bg-plasma-500/5 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Explain at this level</span>
              <div className="flex gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all',
                      difficulty === d
                        ? 'border-quantum-500/50 bg-quantum-500/10 text-quantum-300'
                        : 'border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => createConv.mutate()} className="btn-plasma">
              Start conversation
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TutorPage() {
  return (
    <AuthGuard>
      <Suspense>
        <TutorUI />
      </Suspense>
    </AuthGuard>
  )
}
