'use client'
import { cn } from '@/lib/utils'
import type { Concept } from '@/types'

export interface RoadmapBranch {
  slug: string
  name: string
  color: string
  topics: Concept[]
}

// A learning domain (a Category.track): topics are segregated into Quantum
// Physics and Quantum Computing as independent tracks.
export interface RoadmapDomain {
  id: string
  label: string
  branches: RoadmapBranch[]
}

/**
 * The guided-tutor roadmap: every published topic laid out in learning order
 * (domain → branch → topic.order), with per-domain progress and the active
 * lesson highlighted. Clicking a topic hands it to `onPick`, which starts the
 * guided lesson.
 */
export default function GuidedRoadmap({
  domains,
  activeSlug,
  visited,
  onPick,
  disabled,
}: {
  domains: RoadmapDomain[]
  activeSlug?: string
  visited: Set<string>
  onPick: (topic: Concept) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-5">
      {domains.map((domain) => {
        const total = domain.branches.reduce((n, b) => n + b.topics.length, 0)
        const done = domain.branches.reduce(
          (n, b) => n + b.topics.filter((t) => visited.has(t.slug)).length,
          0
        )
        return (
          <div key={domain.id}>
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className="text-[11px] font-mono uppercase tracking-widest text-quantum-300">
                {domain.label}
              </h3>
              <span className="text-[10px] text-slate-600 tabular-nums">
                {done}/{total}
              </span>
            </div>

            <div className="space-y-3">
              {domain.branches.map((b) => (
                <div key={b.slug}>
                  <div className="flex items-center gap-2 px-1 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                    <span className="text-[10px] uppercase tracking-wide text-slate-500 truncate">
                      {b.name}
                    </span>
                  </div>
                  <ul className="space-y-0.5">
                    {b.topics.map((t, i) => {
                      const isActive = t.slug === activeSlug
                      const isDone = visited.has(t.slug)
                      return (
                        <li key={t.id}>
                          <button
                            disabled={disabled}
                            onClick={() => onPick(t)}
                            className={cn(
                              'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                              isActive
                                ? 'bg-quantum-500/15 text-quantum-200'
                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                            )}
                          >
                            <span
                              className={cn(
                                'w-4 text-center text-[10px] shrink-0 tabular-nums',
                                isDone ? 'text-quantum-400' : 'text-slate-600'
                              )}
                            >
                              {isDone ? '✓' : i + 1}
                            </span>
                            <span className="truncate">{t.title}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
