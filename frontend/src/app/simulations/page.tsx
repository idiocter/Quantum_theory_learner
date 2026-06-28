'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TOPICS, type Difficulty } from '@/data/topics'

const DIFF_LABEL: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export default function SimulationsPage() {
  // Serial walkthrough: one topic expanded at a time. First topic open by default.
  const [openId, setOpenId] = useState<string | null>(TOPICS[0].id)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Quantum Simulations</h1>
        <p className="text-sm text-slate-500">
          Work through each quantum topic in order. Click a topic to reveal its explanation and a
          live, interactive animation.
        </p>
      </div>

      <ol className="space-y-4">
        {TOPICS.map((topic, i) => {
          const isOpen = openId === topic.id
          return (
            <li key={topic.id}>
              <div
                className={cn(
                  'card-quantum overflow-hidden transition-all duration-300',
                  isOpen ? 'shadow-quantum-glow border-quantum-500/40' : 'border-white/5'
                )}
              >
                {/* Clickable topic header */}
                <button
                  onClick={() => setOpenId(isOpen ? null : topic.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-4 p-5 text-left transition-colors hover:bg-white/[0.02]"
                >
                  {/* Serial number badge */}
                  <span
                    className={cn(
                      'flex items-center justify-center w-9 h-9 rounded-full font-mono text-sm shrink-0 border transition-colors',
                      isOpen
                        ? 'border-quantum-500/50 bg-quantum-500/10 text-quantum-300'
                        : 'border-white/10 text-slate-500'
                    )}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <span
                    className={cn(
                      'text-2xl font-mono shrink-0 transition-colors',
                      isOpen ? 'text-quantum-400' : 'text-slate-600'
                    )}
                  >
                    {topic.icon}
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold text-white">{topic.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded badge-${topic.difficulty}`}>
                        {DIFF_LABEL[topic.difficulty]}
                      </span>
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">{topic.tagline}</span>
                  </span>

                  <span
                    className={cn(
                      'text-slate-500 transition-transform duration-300 shrink-0',
                      isOpen && 'rotate-180'
                    )}
                  >
                    ▾
                  </span>
                </button>

                {/* Expanded panel: explanation + live animation */}
                {isOpen && (
                  <div className="px-5 pb-6 border-t border-white/5">
                    {topic.equation && (
                      <div className="pt-4">
                        <code className="inline-block text-sm font-mono text-quantum-300 bg-quantum-500/5 border border-quantum-500/20 rounded-lg px-3 py-1.5">
                          {topic.equation}
                        </code>
                      </div>
                    )}

                    <div className="grid md:grid-cols-[1.1fr_1fr] gap-6 pt-5">
                      <div className="space-y-3">
                        {topic.explanation.map((para, p) => (
                          <p key={p} className="text-sm text-slate-300 leading-relaxed">
                            {para}
                          </p>
                        ))}
                      </div>
                      <div>
                        <h3 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mb-3">
                          Key ideas
                        </h3>
                        <ul className="space-y-2">
                          {topic.keyPoints.map((point, k) => (
                            <li key={k} className="flex gap-2 text-sm text-slate-400">
                              <span className="text-quantum-400 shrink-0">▸</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="h-px flex-1 bg-white/5" />
                        <span className="text-[11px] font-mono uppercase tracking-widest text-quantum-400">
                          Live animation
                        </span>
                        <span className="h-px flex-1 bg-white/5" />
                      </div>
                      {topic.render()}
                    </div>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
